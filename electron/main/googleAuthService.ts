import { writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { shell, safeStorage } from "electron";
import type { AddressInfo } from "node:net";

export interface GoogleAuthState {
  readonly linked: boolean;
  readonly email: string | null;
  readonly error: string | null;
}

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

export function createGoogleAuthService(userDataPath: string): GoogleAuthService {
  const sessionPath = path.join(userDataPath, "google-session.json");
  const localCredentialsPath = path.join(process.cwd(), "google-credentials.json");

  let authState: GoogleAuthState = {
    linked: false,
    email: null,
    error: null,
  };

  // Safe encryption helpers
  const encrypt = (plain: string): string => {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.encryptString(plain).toString("hex");
      }
    } catch (err) {
      console.error("Encryption failed, falling back to base64:", err);
    }
    return Buffer.from(plain).toString("base64");
  };

  const decrypt = (encrypted: string): string => {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(Buffer.from(encrypted, "hex"));
      }
    } catch (err) {
      console.error("Decryption failed, falling back to base64:", err);
    }
    return Buffer.from(encrypted, "base64").toString("utf8");
  };

  // Load client credentials safely
  const loadCredentials = (): Credentials | null => {
    // 1. Check environment variables
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      return {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
      };
    }

    // 2. Check local credentials file in root directory
    if (existsSync(localCredentialsPath)) {
      try {
        const raw = readFileSync(localCredentialsPath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed.client_id && parsed.client_secret) {
          return {
            client_id: parsed.client_id,
            client_secret: parsed.client_secret,
          };
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
        const data = (await response.json()) as any;
        if (data && typeof data.email === "string") {
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
      throw new Error(`Token exchange failed: ${response.status} ${errBody}`);
    }

    return (await response.json()) as any;
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
      throw new Error(`Token refresh failed: ${response.status} ${errBody}`);
    }

    return (await response.json()) as any;
  };

  // Expose decrypted access token, automatically refreshing if expired
  const getAccessToken = async (): Promise<string | null> => {
    const session = loadSession();
    if (!session) return null;

    const creds = loadCredentials();
    if (!creds) return null;

    const refreshToken = decrypt(session.encryptedRefreshToken);
    const accessToken = decrypt(session.encryptedAccessToken);

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
      } catch (err: any) {
        console.error("Token refresh operation failed:", err);
        authState = {
          linked: true,
          email: session.email,
          error: `Refresh failed: ${err.message || String(err)}`,
        };
        return null;
      }
    }

    return accessToken;
  };

  const getStatus = async (): Promise<GoogleAuthState> => {
    const session = loadSession();
    if (!session) {
      return { linked: false, email: null, error: null };
    }

    // Attempt token validation / refresh to keep authState sync'd
    const token = await getAccessToken();
    if (!token) {
      return {
        linked: true,
        email: session.email,
        error: authState.error || "Token validation failed",
      };
    }

    return {
      linked: true,
      email: session.email,
      error: null,
    };
  };

  const unlink = async (): Promise<void> => {
    const session = loadSession();
    if (session) {
      const refreshToken = decrypt(session.encryptedRefreshToken);
      try {
        // Revoke token on Google servers
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      } catch (err) {
        console.error("Failed to revoke token remotely:", err);
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

    authState = {
      linked: false,
      email: null,
      error: null,
    };
  };

  const link = (): Promise<GoogleAuthState> => {
    return new Promise((resolve) => {
      const creds = loadCredentials();
      if (!creds) {
        resolve({
          linked: false,
          email: null,
          error: "Credentials missing. Set GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET or add google-credentials.json.",
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
          resolve({ linked: false, email: null, error: `Auth error: ${error}` });
          return;
        }

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h1>طلب غير صالح</h1>");
          server.close();
          resolve({ linked: false, email: null, error: "No code received" });
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
          res.end("<h1>تم ربط الحساب بنجاح!</h1><p>لقد قمت بربط حساب Google الخاص بك بتطبيق NAS Notesbook. يمكنك الآن إغلاق هذه الصفحة والعودة للتطبيق.</p>");
          
          server.close();
          
          authState = { linked: true, email, error: null };
          resolve(authState);
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h1>خطأ داخلي</h1><p>حدث خطأ أثناء تبادل الرموز.</p>");
          server.close();
          resolve({ linked: false, email: null, error: err.message || String(err) });
        }
      });

      server.listen(0, "127.0.0.1", async () => {
        const address = server.address() as AddressInfo;
        const port = address.port;
        const redirectUri = `http://127.0.0.1:${port}/callback`;

        // Scopes: drive.appdata and userinfo.email
        const scopes = [
          "https://www.googleapis.com/auth/drive.appdata",
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
        } catch (err: any) {
          server.close();
          resolve({
            linked: false,
            email: null,
            error: `Failed to open system browser: ${err.message || String(err)}`,
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
