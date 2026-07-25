import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type {
  GmailBackupInfo,
  GmailBackupSendResult,
} from "../../src/shared/ipc";
import type { BackupService } from "./backupService";
import { getLatestBackupGroup } from "./googleDriveBackupService";
import {
  getErrorMessage,
  redactSensitive,
  type GoogleAuthService,
} from "./googleAuthService";
import type { SettingsStore } from "./settingsStore";

const MAX_ATTACHMENT_BYTES = 18 * 1024 * 1024;

export interface GmailBackupService {
  getStatus: () => Promise<GmailBackupInfo>;
  sendLatest: () => Promise<GmailBackupSendResult>;
}

function wrapBase64(value: string): string {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? value;
}

function buildMimeMessage(
  email: string,
  timestamp: string,
  files: readonly { name: string; content: Buffer }[],
): string {
  const boundary = `nasbook_backup_${Date.now().toString(36)}`;
  const lines: string[] = [
    `From: NASbook Backup <${email}>`,
    `To: ${email}`,
    `Subject: NASbook backup ${timestamp}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    "This message was created by NASbook. It contains the latest local database backup and its settings manifest.",
    "",
  ];

  for (const file of files) {
    const mimeType = file.name.endsWith(".json")
      ? "application/json"
      : "application/octet-stream";
    lines.push(
      `--${boundary}`,
      `Content-Type: ${mimeType}; name=\"${file.name}\"`,
      `Content-Disposition: attachment; filename=\"${file.name}\"`,
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(file.content.toString("base64")),
      "",
    );
  }

  lines.push(`--${boundary}--`, "");
  return lines.join("\r\n");
}

export function createGmailBackupService(
  backupService: BackupService,
  googleAuthService: GoogleAuthService,
  settingsStore: SettingsStore,
): GmailBackupService {
  let sending = false;
  let lastError: string | null = null;
  let lastSuccess = false;
  let permissionRequired = false;

  const getStatus = async (): Promise<GmailBackupInfo> => {
    const auth = await googleAuthService.getStatus();
    const settings = settingsStore.getSettings();

    let status: GmailBackupInfo["status"] = "ready";
    if (!auth.configured) {
      status = "not_configured";
    } else if (auth.status === "token_storage_unavailable") {
      status = "token_storage_unavailable";
    } else if (!auth.linked) {
      status = "not_linked";
    } else if (permissionRequired) {
      status = "permission_required";
    } else if (sending) {
      status = "sending";
    } else if (lastError) {
      status = "error";
    } else if (lastSuccess || settings.lastGmailBackupAt) {
      status = "success";
    }

    return {
      configured: auth.configured,
      linked: auth.linked,
      authorized: auth.linked && !permissionRequired,
      enabled: settings.gmailBackupEnabled,
      email: auth.email,
      lastGmailBackupAt: settings.lastGmailBackupAt,
      lastGmailBackupFileName: settings.lastGmailBackupFileName,
      lastError,
      status,
    };
  };

  const sendLatest = async (): Promise<GmailBackupSendResult> => {
    const sentAt = new Date().toISOString();
    const auth = await googleAuthService.getStatus();

    if (!auth.configured || !auth.linked || !auth.email) {
      return {
        ok: false,
        sentAt,
        email: auth.email,
        attachmentFiles: [],
        error: "Link a Google account before using Gmail backup.",
      };
    }

    const backupGroup = getLatestBackupGroup(backupService.getBackupsFolder());
    if (!backupGroup || backupGroup.files.length === 0) {
      return {
        ok: false,
        sentAt,
        email: auth.email,
        attachmentFiles: [],
        error: "Create a local backup before sending it to Gmail.",
      };
    }

    const totalBytes = backupGroup.files.reduce((sum, fileName) => {
      return sum + statSync(path.join(backupService.getBackupsFolder(), fileName)).size;
    }, 0);
    if (totalBytes > MAX_ATTACHMENT_BYTES) {
      return {
        ok: false,
        sentAt,
        email: auth.email,
        attachmentFiles: [],
        error: "The latest backup is too large for safe Gmail delivery. Use Google Drive backup instead.",
      };
    }

    sending = true;
    lastError = null;
    lastSuccess = false;

    try {
      const accessToken = await googleAuthService.getAccessToken();
      if (!accessToken) {
        throw new Error("Unable to retrieve a Google access token.");
      }

      const files = backupGroup.files.map((fileName) => ({
        name: fileName,
        content: readFileSync(path.join(backupService.getBackupsFolder(), fileName)),
      }));
      const mimeMessage = buildMimeMessage(auth.email, backupGroup.timestamp, files);
      const raw = Buffer.from(mimeMessage, "utf8").toString("base64url");

      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw }),
        },
      );

      if (!response.ok) {
        const responseText = await response.text();
        if (response.status === 403) {
          permissionRequired = true;
          throw new Error(
            "Gmail permission is missing. Disconnect the Google account, reconnect it, and approve Gmail sending access.",
          );
        }
        throw new Error(
          redactSensitive(`Gmail send failed: ${response.status} ${responseText}`),
        );
      }

      const dbFile =
        backupGroup.files.find((fileName) => fileName.endsWith(".db")) ??
        backupGroup.files[0];
      settingsStore.updateSettings({
        lastGmailBackupAt: sentAt,
        lastGmailBackupFileName: dbFile,
      });
      permissionRequired = false;
      lastSuccess = true;

      return {
        ok: true,
        sentAt,
        email: auth.email,
        attachmentFiles: [...backupGroup.files],
      };
    } catch (error: unknown) {
      lastError = redactSensitive(getErrorMessage(error));
      return {
        ok: false,
        sentAt,
        email: auth.email,
        attachmentFiles: [],
        error: lastError,
      };
    } finally {
      sending = false;
    }
  };

  return { getStatus, sendLatest };
}
