# Google OAuth Credentials Setup Guide

This guide details how to configure Google OAuth credentials locally for **NAS Notesbook**, explains the security model, specifies the required API scopes, and provides a manual QA testing checklist.

---

## 1. Google Cloud Console Setup Steps

To enable Google Drive manual backups, you must set up a Google Cloud Project and obtain desktop application OAuth credentials.

### Step 1: Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with your Google account.
3. In the top navigation bar, click the project selection dropdown and select **New Project**.
4. Name the project `NAS Notesbook` (or similar) and click **Create**.
5. Select your newly created project from the dropdown.

### Step 2: Enable the Google Drive API
1. In the left navigation menu, go to **APIs & Services** > **Library**.
2. Search for `Google Drive API`.
3. Click on **Google Drive API** and click **Enable**.

### Step 3: Configure the OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select **User Type**:
   * Choose **External** (if you want to test with any Google account).
3. Click **Create**.
4. Fill in the **App information**:
   * **App name**: `NAS Notesbook`
   * **User support email**: Select your email address.
   * **Developer contact information**: Enter your email address.
5. Click **Save and Continue**.
6. On the **Scopes** page, click **Save and Continue** (we will request the minimal scopes dynamically in code).
7. On the **Test users** page:
   * **IMPORTANT**: You must add the Google account(s) you intend to use for testing under **Test users**. Click **Add Users**, enter your testing Gmail address, and click **Add**.
8. Click **Save and Continue** and review the summary.

### Step 4: Create OAuth Client Credentials
1. Go to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. Under **Application type**, choose **Desktop app**.
4. Set the name to `NAS Notesbook Client`.
5. Click **Create**.
6. A dialog will appear displaying your **Client ID** and **Client Secret**. Close the dialog.
7. Click the **Download JSON** button (downward arrow) next to your newly created Client ID under the *OAuth 2.0 Client IDs* table.

### Step 5: Configure Credentials in NAS Notesbook
1. Locate the downloaded JSON file (usually named `client_secret_xxxx.json`).
2. Create a copy of the template `google-credentials.json.template` located in the root of the project and rename the copy to `google-credentials.json`:
   ```bash
   C:\Projects\NAS Notesbook\google-credentials.json
   ```
3. Open `google-credentials.json` and copy the `client_id` and `client_secret` fields from the downloaded JSON file into it:
   ```json
   {
     "client_id": "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
     "client_secret": "YOUR_CLIENT_SECRET_HERE"
   }
   ```
4. **Git Safety Check**:
   * Confirm that `google-credentials.json` is ignored by Git. Check `.gitignore` (which includes `google-credentials.json`).
   * **Never** commit `google-credentials.json` containing actual keys.
   * The template `google-credentials.json.template` is safe to commit.

---

## 2. Required Scopes

NAS Notesbook strictly enforces the **Principle of Least Privilege**.

### Enabled Scope:
*   `https://www.googleapis.com/auth/drive.file`
    *   **Description**: Permits the app to view and manage Google Drive files and folders that *you open or create with this app*.
    *   **Usage**: The app creates a folder named `NAS Notesbook Backups` and uploads backup files into it. The app cannot access any other files on your Google Drive.
*   `https://www.googleapis.com/auth/userinfo.email`
    *   **Description**: Used to fetch the user's email address to display which account is currently linked in the settings panel.

### Future & Prohibited Scopes:
*   **Gmail/Email Backup Scopes**:
    *   **Do not** enable any Gmail scopes or request email sending/reading permissions.
    *   Gmail integration or backup delivery via email is not supported in the current phase. Keep all Gmail APIs disabled.

---

## 3. Safe Testing Flow (Manual QA Checklist)

Follow this checklist to manually test and QA the Google OAuth implementation.

### A. No Credentials Test
1. Delete or rename `google-credentials.json` in the project root if it exists.
2. Ensure the environment variables `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are not set.
3. Start the application:
   ```powershell
   npm run dev
   ```
4. Navigate to **Settings** (الإعدادات) → **Data** (البيانات).
5. Verify the Google Drive backup section displays:
   *   Status: **Google credentials are not configured** (لم يتم إعداد بيانات Google).
   *   Warning banner: **Add google-credentials.json to enable Google linking** (أضف ملف google-credentials.json لتفعيل الربط).
   *   The **Link** (ربط) button is disabled.
6. Verify the app runs and doesn't crash.

### B. Credentials Configured but Not Linked Test
1. Add a valid `google-credentials.json` file to the project root directory.
2. Start the application.
3. Navigate to **Settings** → **Data**.
4. Verify the Google Drive backup section displays:
   *   Status: **Google account is not linked** (حساب Google غير مرتبط).
   *   Warning banner: **Link your Google account first** (اربط حساب Google أولاً).
   *   The **Link** button is enabled.
   *   The **Upload** button is disabled.

### C. Account Linking Flow Test
1. In **Settings** → **Data**, click the **Link Google account** (ربط حساب Google) button.
2. Confirm that your system's default browser automatically opens the Google OAuth consent page.
3. Log in and approve access. (If you see a "Google hasn't verified this app" warning, click *Advanced* → *Go to NAS Notesbook (unsafe)*).
4. After approval, verify the browser page redirects to `http://127.0.0.1:<port>/callback` showing a success message.
5. Go back to the app and confirm:
   *   Status changes to: **Ready to upload to Google Drive** (جاهز للرفع إلى Google Drive).
   *   The display shows your linked Google email address.
   *   No raw access tokens or refresh tokens are printed in the console logs or CLI output.

### D. Manual Backup Upload Test
1. In the app settings under the **Data** tab, click **Backup database and settings** to generate a local backup first (if none exists).
2. Confirm the filename of the latest local backup is displayed correctly (e.g. `nas-notesbook-backup-YYYY-MM-DD-HHMMSS.db`).
3. Click the **Upload latest backup to Google Drive** (رفع آخر نسخة احتياطية إلى Google Drive) button.
4. Verify the status changes to **Uploading backup...** (جارٍ رفع النسخة الاحتياطية...) and controls are disabled.
5. Upon completion, confirm:
   *   A green success banner is displayed detailing the uploaded backup files.
   *   The **Last cloud backup** timestamp is updated to the current time.
6. Log into your Google Drive web interface and confirm:
   *   A folder named `NAS Notesbook Backups` has been created.
   *   The database backup, settings file, and metadata file are stored inside this folder.
7. Trigger the upload again. Confirm that the app updates/overwrites the files on Google Drive instead of creating duplicate files with identical names.

### E. Unlinking Flow Test
1. In **Settings** → **Data**, click **Unlink Google account** (إلغاء ربط حساب Google).
2. Verify that:
   *   Status reverts to **Google account is not linked**.
   *   The local session file (`google-session.json` in Electron's `userData` path) is deleted.
   *   The local memory caches of tokens are cleared.
   *   The **Upload** button becomes disabled.

### F. Restart & Persistence Test
1. Link your Google account successfully.
2. Close the application.
3. Restart the application:
   ```powershell
   npm run dev
   ```
4. Verify that the app remains in the **Ready** linked state and displays your email.
5. Unlink the account, close the app, and restart. Verify that the app remains in the **Unlinked** state.

---

## 4. Security Notes

*   **Credentials Security**: Never share or commit your `google-credentials.json` or client secrets. If you mistakenly commit them, immediately delete the client ID in the Google Cloud Console and generate a new one.
*   **Token Encryption**: All Google OAuth tokens (access & refresh tokens) are encrypted before writing to disk using Electron's native `safeStorage` API.
    *   On Windows, `safeStorage` uses DPAPI (Data Protection API) tied to the current Windows user credentials.
*   **SafeStorage Failures**: If DPAPI or Electron's encryption is unavailable (e.g. running on headless setups or containerized environments), the app fails gracefully by setting the state to `token_storage_unavailable`, showing an error banner, and preventing the storage of unencrypted tokens.
*   **Not a Sync Engine**: This feature performs manual backups only. It is not an automated/real-time cloud synchronization engine. Files are uploaded only when manually triggered by the user.
*   **Backup Privacy**: Backups contain the complete local SQLite database (including all notes, history, categories, and settings). Ensure your Google account is protected with strong passwords and multi-factor authentication (2FA).

---

## 5. Troubleshooting Section

### OAuth Redirect Failed / Local Port Blocked
*   *Cause*: The loopback port used for callback is blocked or in use.
*   *Solution*: The app dynamically grabs an available local port for the callback server. Ensure your local firewall allows inbound TCP connections for internal loopback addresses (`127.0.0.1`).

### Google credentials not configured (لم يتم إعداد بيانات Google)
*   *Cause*: The `google-credentials.json` file is missing, empty, or uses placeholders.
*   *Solution*: Ensure the file exists in `C:\Projects\NAS Notesbook\google-credentials.json` and contains your valid client ID and client secret.

### Invalid Client (خطأ العميل غير صالح)
*   *Cause*: The client ID or client secret inside `google-credentials.json` is incorrect or revoked in the console.
*   *Solution*: Verify the credentials match your Google Cloud Console exactly.

### Access Denied (تم رفض الوصول)
*   *Cause*: The Google account used to link the app is not registered in the OAuth Consent Screen's **Test users** list.
*   *Solution*: Add the target testing Gmail account to the **Test Users** list in the Google Cloud Console.

### Token Expired or Revoked (تم إلغاء الترخيص أو انتهاء الصلاحية)
*   *Cause*: The user revoked the app permissions from Google Account settings, or the refresh token expired.
*   *Solution*: Click **Unlink** in settings to clear local data, then click **Link** to sign in again.

### Network Unavailable (الشبكة غير متوفرة)
*   *Cause*: Host cannot connect to Google APIs.
*   *Solution*: Check internet connectivity and proxy configurations.

### Drive Quota Exceeded (تم تجاوز الحصة المحددة)
*   *Cause*: Google Drive storage is full.
*   *Solution*: Free up space in the linked Google account or use a different account.

### Backup Folder Not Created / Upload Failed
*   *Cause*: The application failed to query or create the backups folder.
*   *Solution*: Unlink and link the account again to ensure the token has appropriate permissions for the `drive.file` scope. Check logs for redacted error messages.
