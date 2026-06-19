import { writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { shell, safeStorage } from "electron";
import type { AddressInfo } from "node:net";
import { t } from "../../src/shared/i18n";
import type { GoogleAuthState } from "../../src/shared/ipc";
import type { SettingsStore } from "./settingsStore";

export interface GoogleAuthService {
  getStatus: () => Promise<GoogleAuthState>;
  link: () => Promise<GoogleAuthState>;
  unlink: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

interface Credentials {
  client_id: string;
  client_secret: string;
}

interface SavedSession {
  encryptedRefreshToken: string;
  encryptedAccessToken: string;
  email: string | null;
  expiryTime: number; // timestamp in ms
}

// Redact any sensitive tokens/secrets/codes from log messages and errors
export function redactSensitive(text: string): string {
  if (!text) return text;
  return text
    .replace(/(access_token|refresh_token|id_token|client_secret|code)([:=]\s*["']?)[a-zA-Z0-9_./-]+/gi, "$1$2[REDACTED]")
    .replace(/(Bearer\s+)[a-zA-Z0-9_./-]+/gi, "$1[REDACTED]");
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createGoogleAuthService(
  userDataPath: string,
  settingsStore: SettingsStore
): GoogleAuthService {
  const sessionPath = path.join(userDataPath, "google-session.json");
  const localCredentialsPath = path.join(process.cwd(), "google-credentials.json");

  // Validate loaded credentials. Returns false if they are empty or match the template placeholders.
  const isValidCredentials = (creds: Credentials): boolean => {
    if (!creds.client_id || !creds.client_secret) return false;
    const cid = creds.client_id.trim();
    const sec = creds.client_secret.trim();
    if (cid === "" || sec === "") return false;
    if (cid.includes("YOUR_CLIENT_ID_HERE")) return false;
    if (sec.includes("YOUR_CLIENT_SECRET_HERE")) return false;
    return true;
  };

  const isSafeStorageAvailable = (): boolean => {
    try {
      return typeof safeStorage !== "undefined" && safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  };

  let authState: GoogleAuthState = {
    configured: false,
    linked: false,
    status: "not_configured",
    email: null,
    error: null,
    message: "",
  };

  // Safe encryption helpers
  const encrypt = (plain: string): string => {
    if (!isSafeStorageAvailable()) {
      throw new Error("safeStorage encryption is unavailable");
    }
    return safeStorage.encryptString(plain).toString("hex");
  };

  const decrypt = (encrypted: string): string => {
    if (!isSafeStorageAvailable()) {
      throw new Error("safeStorage encryption is unavailable");
    }
    return safeStorage.decryptString(Buffer.from(encrypted, "hex"));
  };

  // Load client credentials safely
  const loadCredentials = (): Credentials | null => {
    // 1. Check environment variables
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      const creds = {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
      };
      if (isValidCredentials(creds)) {
        return creds;
      }
    }

    // 2. Check local credentials file in root directory
    if (existsSync(localCredentialsPath)) {
      try {
        const raw = readFileSync(localCredentialsPath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed.client_id && parsed.client_secret) {
          const creds = {
            client_id: parsed.client_id,
            client_secret: parsed.client_secret,
          };
          if (isValidCredentials(creds)) {
            return creds;
          }
        }
      } catch (err) {
        console.error("Failed to parse google-credentials.json:", err);
      }
    }

    return null;
  };

  // Load session from disk
  const loadSession = (): SavedSession | null => {
    if (existsSync(sessionPath)) {
      try {
        const raw = readFileSync(sessionPath, "utf8");
        return JSON.parse(raw);
      } catch (err) {
        console.error("Failed to read google-session.json:", err);
      }
    }
    return null;
  };

  // Save session to disk
  const saveSession = (session: SavedSession): void => {
    try {
      writeFileSync(sessionPath, JSON.stringify(session, null, 2), "utf8");
    } catch (err) {
      console.error("Failed to save google-session.json:", err);
    }
  };

  // Fetch email using access token
  const fetchUserEmail = async (accessToken: string): Promise<string | null> => {
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (isRecord(data) && typeof data.email === "string") {
          return data.email;
        }
      }
    } catch (err) {
      console.error("Failed to fetch user email:", err);
    }
    return null;
  };

  // Perform token exchange with Google OAuth
  const exchangeCodeForTokens = async (
    code: string,
    redirectUri: string,
    creds: Credentials
  ): Promise<{ refresh_token: string; access_token: string; expires_in: number }> => {
    const params = new URLSearchParams({
      code,
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(redactSensitive(`Token exchange failed: ${response.status} ${errBody}`));
    }

    const data = await response.json();
    if (
      isRecord(data) &&
      typeof data.refresh_token === "string" &&
      typeof data.access_token === "string" &&
      typeof data.expires_in === "number"
    ) {
      return {
        refresh_token: data.refresh_token,
        access_token: data.access_token,
        expires_in: data.expires_in,
      };
    }
    throw new Error("Invalid token exchange response");
  };

  // Refresh access token
  const refreshAccessToken = async (
    refreshToken: string,
    creds: Credentials
  ): Promise<{ access_token: string; expires_in: number }> => {
    const params = new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(redactSensitive(`Token refresh failed: ${response.status} ${errBody}`));
    }

    const data = await response.json();
    if (
      isRecord(data) &&
      typeof data.access_token === "string" &&
      typeof data.expires_in === "number"
    ) {
      return {
        access_token: data.access_token,
        expires_in: data.expires_in,
      };
    }
    throw new Error("Invalid token refresh response");
  };

  // Expose decrypted access token, automatically refreshing if expired
  const getAccessToken = async (): Promise<string | null> => {
    const session = loadSession();
    if (!session) return null;

    const creds = loadCredentials();
    if (!creds) return null;

    if (!isSafeStorageAvailable()) {
      return null;
    }

    let refreshToken: string;
    let accessToken: string;
    try {
      refreshToken = decrypt(session.encryptedRefreshToken);
      accessToken = decrypt(session.encryptedAccessToken);
    } catch (err) {
      console.error("Failed to decrypt tokens:", err);
      return null;
    }

    const now = Date.now();
    // Refresh if token is expired or expiring in the next 2 minutes
    if (now >= session.expiryTime - 120000) {
      try {
        console.log("Access token is expiring soon, refreshing...");
        const refreshed = await refreshAccessToken(refreshToken, creds);
        
        session.encryptedAccessToken = encrypt(refreshed.access_token);
        session.expiryTime = Date.now() + refreshed.expires_in * 1000;
        saveSession(session);
        
        return refreshed.access_token;
      } catch (err: unknown) {
        const lang = settingsStore.getSettings().language;
        const errStr = getErrorMessage(err);
        const isPermissionError = errStr.includes("invalid_grant") || errStr.includes("revoked");
        const errMsg = isPermissionError
          ? t("googlePermissionRevoked", lang)
          : `${t("googleSignInFailed", lang)}: ${errStr}`;

        console.error("Token refresh operation failed:", redactSensitive(errStr));
        authState = {
          configured: true,
          linked: true,
          status: "error",
          email: session.email,
          error: redactSensitive(errMsg),
          message: redactSensitive(errMsg),
        };
        return null;
      }
    }

    return accessToken;
  };

  const getStatus = async (): Promise<GoogleAuthState> => {
    const lang = settingsStore.getSettings().language;
    const creds = loadCredentials();
    const isConfigured = creds !== null;

    if (!isSafeStorageAvailable()) {
      return {
        configured: isConfigured,
        linked: false,
        status: "token_storage_unavailable",
        email: null,
        error: "Google token storage unavailable",
        message: t("googleStatusStorageUnavailable", lang),
      };
    }

    if (!isConfigured) {
      return {
        configured: false,
        linked: false,
        status: "not_configured",
        email: null,
        error: null,
        message: t("googleStatusNotConfigured", lang),
      };
    }

    const session = loadSession();
    if (!session) {
      return {
        configured: true,
        linked: false,
        status: "unlinked",
        email: null,
        error: null,
        message: t("googleStatusNotLinked", lang),
      };
    }

    // Attempt token validation / refresh to keep authState sync'd
    try {
      const token = await getAccessToken();
      if (!token) {
        return authState;
      }
    } catch (err: unknown) {
      const errStr = getErrorMessage(err);
      const isPermissionError = errStr.includes("invalid_grant") || errStr.includes("revoked");
      const errMsg = isPermissionError
        ? t("googlePermissionRevoked", lang)
        : `${t("googleSignInFailed", lang)}: ${errStr}`;
      
      return {
        configured: true,
        linked: true,
        status: "error",
        email: session.email,
        error: redactSensitive(errMsg),
        message: redactSensitive(errMsg),
      };
    }

    return {
      configured: true,
      linked: true,
      status: "linked",
      email: session.email,
      error: null,
      message: t("googleStatusLinked", lang),
    };
  };

  const unlink = async (): Promise<void> => {
    const session = loadSession();
    if (session) {
      try {
        if (isSafeStorageAvailable()) {
          const refreshToken = decrypt(session.encryptedRefreshToken);
          // Revoke token on Google servers
          await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });
        }
      } catch (err) {
        console.error("Failed to revoke token remotely:", redactSensitive(err instanceof Error ? err.message : String(err)));
      }
    }

    // Delete session from disk
    if (existsSync(sessionPath)) {
      try {
        rmSync(sessionPath, { force: true });
      } catch (err) {
        console.error("Failed to delete session file:", err);
      }
    }

    const lang = settingsStore.getSettings().language;
    const isConfigured = loadCredentials() !== null;
    
    authState = {
      configured: isConfigured,
      linked: false,
      status: isConfigured ? "unlinked" : "not_configured",
      email: null,
      error: null,
      message: isConfigured ? t("googleStatusNotLinked", lang) : t("googleStatusNotConfigured", lang),
    };
  };

  const link = (): Promise<GoogleAuthState> => {
    return new Promise((resolve) => {
      const lang = settingsStore.getSettings().language;
      const creds = loadCredentials();
      const isConfigured = creds !== null;

      if (!isSafeStorageAvailable()) {
        resolve({
          configured: isConfigured,
          linked: false,
          status: "token_storage_unavailable",
          email: null,
          error: "Google token storage unavailable",
          message: t("googleStatusStorageUnavailable", lang),
        });
        return;
      }

      if (!creds) {
        resolve({
          configured: false,
          linked: false,
          status: "not_configured",
          email: null,
          error: "Google credentials not configured",
          message: t("googleStatusNotConfigured", lang),
        });
        return;
      }

      // Create an ephemeral HTTP callback server
      const server = http.createServer();

      server.on("request", async (req, res) => {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        
        if (url.pathname !== "/callback") {
          res.writeHead(404);
          res.end();
          return;
        }

        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h1>فشلت عملية الربط</h1><p>تم رفض الإذن أو حدث خطأ أثناء عملية الربط.</p>");
          server.close();
          const errMsg = error === "access_denied" ? t("googlePermissionRevoked", lang) : `${t("googleSignInFailed", lang)}: ${error}`;
          resolve({
            configured: true,
            linked: false,
            status: "error",
            email: null,
            error: redactSensitive(errMsg),
            message: redactSensitive(errMsg),
          });
          return;
        }

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h1>طلب غير صالح</h1>");
          server.close();
          resolve({
            configured: true,
            linked: false,
            status: "error",
            email: null,
            error: "No code received",
            message: t("googleSignInFailed", lang),
          });
          return;
        }

        try {
          const address = server.address() as AddressInfo;
          const redirectUri = `http://127.0.0.1:${address.port}/callback`;

          // Exchange code for tokens
          const tokens = await exchangeCodeForTokens(code, redirectUri, creds);
          
          // Fetch email
          const email = await fetchUserEmail(tokens.access_token);

          // Encrypt and save session
          const session: SavedSession = {
            encryptedRefreshToken: encrypt(tokens.refresh_token),
            encryptedAccessToken: encrypt(tokens.access_token),
            email,
            expiryTime: Date.now() + tokens.expires_in * 1000,
          };
          saveSession(session);

          // Success HTML page in browser
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h1>تم ربط الحساب بنجاح!</h1><p>لقد قمت بربط حساب Google الخاص بك بتطبيق NASbook. يمكنك الآن إغلاق هذه الصفحة والعودة للتطبيق.</p>");
          
          server.close();
          
          authState = {
            configured: true,
            linked: true,
            status: "linked",
            email,
            error: null,
            message: t("googleStatusLinked", lang),
          };
          resolve(authState);
        } catch (err: unknown) {
          res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h1>خطأ داخلي</h1><p>حدث خطأ أثناء تبادل الرموز.</p>");
          server.close();
          const errStr = getErrorMessage(err);
          const errMsg = `${t("googleSignInFailed", lang)}: ${errStr}`;
          resolve({
            configured: true,
            linked: false,
            status: "error",
            email: null,
            error: redactSensitive(errMsg),
            message: redactSensitive(errMsg),
          });
        }
      });

      server.listen(0, "127.0.0.1", async () => {
        const address = server.address() as AddressInfo;
        const port = address.port;
        const redirectUri = `http://127.0.0.1:${port}/callback`;

        // Scopes: drive.file and userinfo.email
        const scopes = [
          "https://www.googleapis.com/auth/drive.file",
          "https://www.googleapis.com/auth/userinfo.email",
        ];

        const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        oauthUrl.searchParams.set("client_id", creds.client_id);
        oauthUrl.searchParams.set("redirect_uri", redirectUri);
        oauthUrl.searchParams.set("response_type", "code");
        oauthUrl.searchParams.set("scope", scopes.join(" "));
        oauthUrl.searchParams.set("access_type", "offline");
        oauthUrl.searchParams.set("prompt", "consent");

        console.log(`Opening system browser for Google auth callback on port ${port}...`);
        try {
          await shell.openExternal(oauthUrl.toString());
        } catch (err: unknown) {
          server.close();
          const errStr = getErrorMessage(err);
          resolve({
            configured: true,
            linked: false,
            status: "error",
            email: null,
            error: redactSensitive(`Failed to open system browser: ${errStr}`),
            message: redactSensitive(`${t("googleSignInFailed", lang)}: ${errStr}`),
          });
        }
      });
    });
  };

  return {
    getStatus,
    link,
    unlink,
    getAccessToken,
  };
}
