import type { CategoryRecord } from "./categories";
import type { AppSettings } from "./settings";

export interface AppInfo {
  readonly name: string;
  readonly version: string;
  readonly phase: "v05-foundation-stable";
  readonly databasePath: string;
  readonly dataDirectory: string;
  readonly settingsPath: string;
}

export interface NoteListItem {
  readonly id: number;
  readonly title: string;
  readonly preview: string;
  readonly categoryId: number | null;
  readonly isRtl: boolean;
  readonly isLocked: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface NoteRecord extends NoteListItem {
  readonly contentMarkdown: string;
  readonly contentHtml: string;
}

export interface NoteListOptions {
  readonly categoryId?: number | null;
  readonly includeTrash?: boolean;
  readonly searchQuery?: string;
}

export interface CreateNoteInput {
  readonly title?: string;
  readonly contentMarkdown?: string;
  readonly contentHtml?: string;
  readonly categoryId?: number | null;
  readonly isRtl?: boolean;
}

export interface UpdateNoteInput {
  readonly id: number;
  readonly title: string;
  readonly contentMarkdown: string;
  readonly contentHtml: string;
  readonly categoryId: number | null;
  readonly isRtl: boolean;
}

export interface UpdateCategoryInput {
  readonly id: number;
  readonly name: string;
  readonly icon: string;
}

export interface MarkdownImportResult {
  readonly ok: boolean;
  readonly canceled?: boolean;
  readonly filename?: string;
  readonly markdown?: string;
  readonly error?: string;
}

export interface MarkdownExportInput {
  readonly defaultFilename: string;
  readonly markdown: string;
}

export interface MarkdownExportResult {
  readonly ok: boolean;
  readonly canceled?: boolean;
  readonly path?: string;
  readonly error?: string;
}

export interface BackupStatus {
  readonly backupsFolder: string;
  readonly usesCustomFolder: boolean;
  readonly lastBackupAt: string | null;
  readonly lastBackupFileName: string | null;
  readonly backupCount: number;
  readonly autoBackupEnabled: boolean;
  readonly retentionCount: number;
  readonly frequency: AppSettings["backupFrequency"];
  readonly lastError: string | null;
}

export interface BackupResult {
  readonly success: boolean;
  readonly lastBackupAt?: string;
  readonly error?: string;
}

export interface BackupLocationResult {
  readonly ok: boolean;
  readonly canceled?: boolean;
  readonly path?: string;
  readonly error?: string;
}

export type GoogleAuthStatus =
  | "not_configured"
  | "unlinked"
  | "linked"
  | "token_storage_unavailable"
  | "error";

export interface GoogleAuthState {
  readonly configured: boolean;
  readonly linked: boolean;
  readonly status: GoogleAuthStatus;
  readonly email: string | null;
  readonly error: string | null;
  readonly message: string;
}

export type CloudBackupStatus =
  | "not_configured"
  | "not_linked"
  | "ready"
  | "uploading"
  | "success"
  | "error"
  | "token_storage_unavailable";

export interface CloudBackupInfo {
  readonly configured: boolean;
  readonly linked: boolean;
  readonly lastCloudBackupAt: string | null;
  readonly lastCloudBackupFileName: string | null;
  readonly lastError: string | null;
  readonly status: CloudBackupStatus;
  readonly email: string | null;
}

export interface CloudBackupUploadResult {
  readonly ok: boolean;
  readonly uploadedFiles: string[];
  readonly folderName: string;
  readonly uploadedAt: string;
  readonly error?: string;
}

export type GmailBackupStatus =
  | "not_configured"
  | "not_linked"
  | "permission_required"
  | "ready"
  | "sending"
  | "success"
  | "error"
  | "token_storage_unavailable";

export interface GmailBackupInfo {
  readonly configured: boolean;
  readonly linked: boolean;
  readonly authorized: boolean;
  readonly enabled: boolean;
  readonly email: string | null;
  readonly lastGmailBackupAt: string | null;
  readonly lastGmailBackupFileName: string | null;
  readonly lastError: string | null;
  readonly status: GmailBackupStatus;
}

export interface GmailBackupSendResult {
  readonly ok: boolean;
  readonly sentAt: string;
  readonly email: string | null;
  readonly attachmentFiles: string[];
  readonly error?: string;
}

export interface NasNotesbookApi {
  readonly app: {
    readonly getInfo: () => Promise<AppInfo>;
    readonly openDataFolder: () => Promise<void>;
  };
  readonly settings: {
    readonly get: () => Promise<AppSettings>;
    readonly update: (
      settings: Partial<AppSettings>,
    ) => Promise<AppSettings>;
  };
  readonly categories: {
    readonly list: () => Promise<readonly CategoryRecord[]>;
    readonly update: (input: UpdateCategoryInput) => Promise<CategoryRecord>;
  };
  readonly notes: {
    readonly list: (
      options?: NoteListOptions,
    ) => Promise<readonly NoteListItem[]>;
    readonly getById: (id: number) => Promise<NoteRecord | null>;
    readonly create: (input?: CreateNoteInput) => Promise<NoteRecord>;
    readonly update: (input: UpdateNoteInput) => Promise<NoteRecord>;
    readonly setLocked: (id: number, isLocked: boolean) => Promise<NoteRecord>;
    readonly deleteToTrash: (id: number) => Promise<void>;
    readonly restore: (id: number) => Promise<void>;
    readonly deletePermanent: (id: number) => Promise<void>;
  };
  readonly markdown: {
    readonly importFile: () => Promise<MarkdownImportResult>;
    readonly exportFile: (
      input: MarkdownExportInput,
    ) => Promise<MarkdownExportResult>;
  };
  readonly backup: {
    readonly create: () => Promise<BackupResult>;
    readonly getStatus: () => Promise<BackupStatus>;
    readonly openFolder: () => Promise<void>;
    readonly chooseFolder: () => Promise<BackupLocationResult>;
    readonly resetFolder: () => Promise<BackupLocationResult>;
  };
  readonly googleAuth: {
    readonly link: () => Promise<GoogleAuthState>;
    readonly unlink: () => Promise<void>;
    readonly getStatus: () => Promise<GoogleAuthState>;
  };
  readonly cloudBackup: {
    readonly getStatus: () => Promise<CloudBackupInfo>;
    readonly uploadLatest: () => Promise<CloudBackupUploadResult>;
  };
  readonly gmailBackup: {
    readonly getStatus: () => Promise<GmailBackupInfo>;
    readonly sendLatest: () => Promise<GmailBackupSendResult>;
  };
  readonly nasbk: {
    readonly saveFile: (input: NasbkSaveInput) => Promise<NasbkSaveResult>;
    readonly importFile: () => Promise<NasbkImportResult>;
    readonly getStartupFile: () => Promise<NasbkImportResult | null>;
    readonly onOpenFile: (callback: (fileData: NasbkImportResult) => void) => () => void;
  };
  readonly window: {
    readonly minimize: () => Promise<void>;
    readonly toggleMaximize: () => Promise<void>;
    readonly close: () => Promise<void>;
    readonly confirmClose: () => Promise<void>;
    readonly onCloseRequested: (callback: () => void) => () => void;
    readonly isMaximized: () => Promise<boolean>;
  };
}

export interface NasbkSaveInput {
  readonly title: string;
  readonly contentHtml: string;
  readonly contentText: string;
  readonly metadata: {
    readonly isRtl: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
  };
  readonly formatVersion: number;
  readonly filePath?: string;
}

export interface NasbkSaveResult {
  readonly ok: boolean;
  readonly canceled?: boolean;
  readonly path?: string;
  readonly error?: string;
}

export interface NasbkImportResult {
  readonly ok: boolean;
  readonly canceled?: boolean;
  readonly filePath?: string;
  readonly title?: string;
  readonly contentHtml?: string;
  readonly contentText?: string;
  readonly metadata?: {
    readonly isRtl: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
  };
  readonly formatVersion?: number;
  readonly error?: string;
}
