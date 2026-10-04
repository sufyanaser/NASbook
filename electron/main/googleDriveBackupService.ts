import { existsSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { redactSensitive, isRecord, getErrorMessage } from "./googleAuthService";
import type { AppLanguage } from "../../src/shared/settings";
import type { GoogleAuthService } from "./googleAuthService";
import type { SettingsStore } from "./settingsStore";
import type { BackupService } from "./backupService";
import type { CloudBackupInfo, CloudBackupUploadResult, CloudBackupEntry, RestoreResult } from "../../src/shared/ipc";
import { t } from "../../src/shared/i18n";

export interface GoogleDriveBackupService {
  getStatus: () => Promise<CloudBackupInfo>;
  uploadLatest: () => Promise<CloudBackupUploadResult>;
  listCloudBackups: () => Promise<CloudBackupEntry[]>;
  restoreCloudBackup: (fileId: string) => Promise<RestoreResult>;
}

// Pure utility helper to find files in the latest backup group
export function getLatestBackupGroup(backupsFolder: string): { timestamp: string; files: string[] } | null {
  if (!existsSync(backupsFolder)) {
    return null;
  }
  const files = readdirSync(backupsFolder);
  const dbPattern = /^nas-notesbook-backup-(\d{4}-\d{2}-\d{2}-\d{6})\.db$/;
  const timestamps: string[] = [];
  for (const name of files) {
    const match = dbPattern.exec(name);
    if (match) {
      timestamps.push(match[1]);
    }
  }
  if (timestamps.length === 0) {
    return null;
  }
  timestamps.sort();
  const latestTs = timestamps[timestamps.length - 1];

  const groupFiles: string[] = [];
  const dbFile = `nas-notesbook-backup-${latestTs}.db`;
  const settingsFile = `nas-notesbook-settings-${latestTs}.json`;
  const metaFile = `nas-notesbook-backup-${latestTs}.meta.json`;

  if (existsSync(path.join(backupsFolder, dbFile))) {
    groupFiles.push(dbFile);
  }
  if (existsSync(path.join(backupsFolder, settingsFile))) {
    groupFiles.push(settingsFile);
  }
  if (existsSync(path.join(backupsFolder, metaFile))) {
    groupFiles.push(metaFile);
  }

  return {
    timestamp: latestTs,
    files: groupFiles,
  };
}

// Check if a file exists in folder
async function findFileInFolder(
  filename: string,
  folderId: string,
  accessToken: string
): Promise<string | null> {
  const query = `name = '${filename}' and '${folderId}' in parents and trashed = false`;
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", query);
  url.searchParams.set("fields", "files(id)");
  
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (response.ok) {
    const data = await response.json();
    if (
      isRecord(data) &&
      Array.isArray(data.files) &&
      data.files.length > 0 &&
      isRecord(data.files[0]) &&
      typeof data.files[0].id === "string"
    ) {
      return data.files[0].id;
    }
  }
  return null;
}

// Retrieve or create target Drive folder
async function getOrCreateFolder(
  folderName: string,
  accessToken: string
): Promise<string> {
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = new URL("https://www.googleapis.com/drive/v3/files");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("fields", "files(id, name)");
  
  const searchRes = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const errBody = await searchRes.text();
    throw new Error(`Failed to search Drive folder: ${searchRes.status} ${errBody}`);
  }

  const searchData = await searchRes.json();
  if (
    isRecord(searchData) &&
    Array.isArray(searchData.files) &&
    searchData.files.length > 0 &&
    isRecord(searchData.files[0]) &&
    typeof searchData.files[0].id === "string"
  ) {
    return searchData.files[0].id;
  }

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!createRes.ok) {
    const errBody = await createRes.text();
    throw new Error(`Failed to create Drive folder: ${createRes.status} ${errBody}`);
  }

  const createData = await createRes.json();
  if (isRecord(createData) && typeof createData.id === "string") {
    return createData.id;
  }
  throw new Error("Invalid response during folder creation");
}

// Upload a single file using multipart
async function uploadFile(
  filePath: string,
  filename: string,
  mimeType: string,
  folderId: string,
  accessToken: string
): Promise<string> {
  const content = readFileSync(filePath);
  const existingFileId = await findFileInFolder(filename, folderId, accessToken);

  const boundary = "nas_notesbook_boundary_" + Date.now();
  const metadata = {
    name: filename,
    parents: existingFileId ? undefined : [folderId],
  };

  const metadataPart = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    "",
  ].join("\r\n");

  const mediaHeader = [
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    "",
    "",
  ].join("\r\n");

  const mediaFooter = `\r\n--${boundary}--`;

  const bodyBuffer = Buffer.concat([
    Buffer.from(metadataPart, "utf8"),
    Buffer.from(mediaHeader, "utf8"),
    content,
    Buffer.from(mediaFooter, "utf8"),
  ]);

  let url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
  let method = "POST";

  if (existingFileId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
    method = "PATCH";
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(bodyBuffer.length),
    },
    body: bodyBuffer,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Failed to upload ${filename}: ${res.status} ${errBody}`);
  }

  const data = await res.json();
  if (isRecord(data) && typeof data.id === "string") {
    return data.id;
  }
  throw new Error("Invalid upload response");
}

// Helper to translate typical API/network errors into clear localized string.
export function getLocalizedUploadError(errStr: string, lang: AppLanguage): string {
  const lower = errStr.toLowerCase();
  if (lower.includes("quotaexceeded") || lower.includes("quota") || lower.includes("storage") || lower.includes("403")) {
    return t("googleQuotaExceeded", lang);
  }
  if (lower.includes("fetch failed") || lower.includes("network") || lower.includes("enotfound") || lower.includes("econnrefused")) {
    return t("googleNetworkUnavailable", lang);
  }
  if (lower.includes("invalid_grant") || lower.includes("revoked") || lower.includes("expired") || lower.includes("auth")) {
    return t("googlePermissionRevoked", lang);
  }
  return errStr;
}

export function createGoogleDriveBackupService(
  userDataPathOrBackupService: string | BackupService,
  googleAuthService: GoogleAuthService,
  settingsStore: SettingsStore
): GoogleDriveBackupService {
  const getBackupsFolder = (): string => {
    if (typeof userDataPathOrBackupService === "object" && "getBackupsFolder" in userDataPathOrBackupService) {
      return userDataPathOrBackupService.getBackupsFolder();
    }
    const configured = settingsStore.getSettings().backupDirectory;
    return configured || path.join(String(userDataPathOrBackupService), "backups");
  };
  const folderName = "NASbook Backups";

  let uploadInProgress = false;
  let lastUploadError: string | null = null;
  let lastUploadSuccess = false;

  const getStatus = async (): Promise<CloudBackupInfo> => {
    const authStatus = await googleAuthService.getStatus();
    const settings = settingsStore.getSettings();
    const lang = settings.language;

    let status: CloudBackupInfo["status"] = "ready";
    const lastError: string | null = lastUploadError || (authStatus.error ? getLocalizedUploadError(authStatus.error, lang) : null);

    if (!authStatus.configured) {
      status = "not_configured";
    } else if (authStatus.status === "token_storage_unavailable") {
      status = "token_storage_unavailable";
    } else if (!authStatus.linked) {
      status = "not_linked";
    } else if (uploadInProgress) {
      status = "uploading";
    } else if (lastError) {
      status = "error";
    } else if (lastUploadSuccess || settings.lastCloudBackupAt) {
      status = "success";
    }

    return {
      configured: authStatus.configured,
      linked: authStatus.linked,
      lastCloudBackupAt: settings.lastCloudBackupAt,
      lastCloudBackupFileName: settings.lastCloudBackupFileName,
      lastError,
      status,
      email: authStatus.email,
    };
  };

  const uploadLatest = async (): Promise<CloudBackupUploadResult> => {
    const lang = settingsStore.getSettings().language;
    
    // Check if configured and linked
    const authStatus = await googleAuthService.getStatus();
    if (!authStatus.configured) {
      return {
        ok: false,
        uploadedFiles: [],
        folderName,
        uploadedAt: new Date().toISOString(),
        error: t("googleStatusNotConfigured", lang),
      };
    }
    if (authStatus.status === "token_storage_unavailable") {
      return {
        ok: false,
        uploadedFiles: [],
        folderName,
        uploadedAt: new Date().toISOString(),
        error: t("googleStatusStorageUnavailable", lang),
      };
    }
    if (!authStatus.linked) {
      return {
        ok: false,
        uploadedFiles: [],
        folderName,
        uploadedAt: new Date().toISOString(),
        error: t("googleStatusNotLinked", lang),
      };
    }

    // Find latest backup group
    const currentBackupsFolder = getBackupsFolder();
    const backupGroup = getLatestBackupGroup(currentBackupsFolder);
    if (!backupGroup || backupGroup.files.length === 0) {
      return {
        ok: false,
        uploadedFiles: [],
        folderName,
        uploadedAt: new Date().toISOString(),
        error: t("googleNoLocalBackup", lang),
      };
    }

    uploadInProgress = true;
    lastUploadError = null;
    lastUploadSuccess = false;

    try {
      const accessToken = await googleAuthService.getAccessToken();
      if (!accessToken) {
        throw new Error("Failed to retrieve Google Access Token.");
      }

      // 1. Get or create target backups folder
      const folderId = await getOrCreateFolder(folderName, accessToken);

      // 2. Upload files in the latest backup group
      const uploadedFiles: string[] = [];
      for (const file of backupGroup.files) {
        const filePath = path.join(currentBackupsFolder, file);
        let mimeType = "application/octet-stream";
        if (file.endsWith(".json")) {
          mimeType = "application/json";
        }
        
        await uploadFile(filePath, file, mimeType, folderId, accessToken);
        uploadedFiles.push(file);
      }

      // Find the main db file that was uploaded in the group
      const dbFile = backupGroup.files.find((f) => f.endsWith(".db")) || backupGroup.files[0];

      // Update settings
      const now = new Date().toISOString();
      settingsStore.updateSettings({
        lastCloudBackupAt: now,
        lastCloudBackupFileName: dbFile,
      });

      lastUploadSuccess = true;

      return {
        ok: true,
        uploadedFiles,
        folderName,
        uploadedAt: now,
      };
    } catch (err: unknown) {
      const errMsg = getErrorMessage(err);
      const redactedMsg = redactSensitive(errMsg);
      const localizedError = getLocalizedUploadError(redactedMsg, lang);
      lastUploadError = localizedError;
      
      return {
        ok: false,
        uploadedFiles: [],
        folderName,
        uploadedAt: new Date().toISOString(),
        error: localizedError,
      };
    } finally {
      uploadInProgress = false;
    }
  };

  const listCloudBackups = async (): Promise<CloudBackupEntry[]> => {
    const authStatus = await googleAuthService.getStatus();
    if (!authStatus.configured || !authStatus.linked) {
      return [];
    }

    try {
      const accessToken = await googleAuthService.getAccessToken();
      if (!accessToken) return [];

      const folderId = await getOrCreateFolder(folderName, accessToken);
      const query = `'${folderId}' in parents and trashed = false and name contains '.db'`;
      const url = new URL("https://www.googleapis.com/drive/v3/files");
      url.searchParams.set("q", query);
      url.searchParams.set("fields", "files(id, name, size, modifiedTime)");
      url.searchParams.set("orderBy", "modifiedTime desc");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to list Drive files: ${res.status}`);
      }

      const data = await res.json();
      if (isRecord(data) && Array.isArray(data.files)) {
        return data.files.map((file) => {
          const rawSize = Number(file.size || 0);
          const sizeStr = rawSize > 0 ? `${Math.round(rawSize / 1024)} KB` : "0 KB";
          return {
            id: String(file.id || ""),
            name: String(file.name || ""),
            size: sizeStr,
            modifiedTime: String(file.modifiedTime || ""),
          };
        });
      }
      return [];
    } catch (err) {
      console.error("Failed to list cloud backups:", redactSensitive(getErrorMessage(err)));
      return [];
    }
  };

  const restoreCloudBackup = async (fileId: string): Promise<RestoreResult> => {
    const authStatus = await googleAuthService.getStatus();
    if (!authStatus.configured || !authStatus.linked) {
      return { success: false, error: "حساب Google غير مرتبط." };
    }

    try {
      const accessToken = await googleAuthService.getAccessToken();
      if (!accessToken) {
        return { success: false, error: "تعذر الحصول على رمز الوصول إلى Google." };
      }

      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const res = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error(`فشل تنزيل النسخة الاحتياطية من Google Drive: ${res.status}`);
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      const tempRestoreFolder = getBackupsFolder();
      const tempPath = path.join(tempRestoreFolder, `temp-cloud-restore-${Date.now()}.db`);
      writeFileSync(tempPath, buffer);

      if (typeof userDataPathOrBackupService === "object" && "restoreBackup" in userDataPathOrBackupService) {
        const restoreRes = await userDataPathOrBackupService.restoreBackup(tempPath);
        try {
          unlinkSync(tempPath);
        } catch (unlinkErr) {
          console.warn("Could not delete temporary cloud restore file:", unlinkErr);
        }
        return restoreRes;
      }

      try {
        unlinkSync(tempPath);
      } catch (unlinkErr) {
        console.warn("Could not delete temporary cloud restore file:", unlinkErr);
      }
      return { success: true };
    } catch (err) {
      const message = redactSensitive(getErrorMessage(err));
      return { success: false, error: message };
    }
  };

  return {
    getStatus,
    uploadLatest,
    listCloudBackups,
    restoreCloudBackup,
  };
}
