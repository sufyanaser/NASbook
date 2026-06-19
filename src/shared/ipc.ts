import type { CategoryRecord } from "./categories";
import type { AppSettings } from "./settings";

export interface AppInfo {
  readonly name: string;
  readonly version: string;
  readonly phase: "phase-2-data-layer";
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
}

export interface CreateNoteInput {
  readonly title?: string;
  readonly contentMarkdown?: string;
  readonly categoryId?: number | null;
  readonly isRtl?: boolean;
}

export interface UpdateNoteInput {
  readonly id: number;
  readonly title: string;
  readonly contentMarkdown: string;
  readonly categoryId: number | null;
  readonly isRtl: boolean;
}

export interface BackupStatus {
  readonly backupsFolder: string;
  readonly lastBackupAt: string | null;
  readonly lastBackupFileName: string | null;
  readonly backupCount: number;
  readonly autoBackupEnabled: boolean;
  readonly retentionCount: number;
  readonly lastError: string | null;
}

export interface BackupResult {
  readonly success: boolean;
  readonly lastBackupAt?: string;
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
  };
  readonly notes: {
    readonly list: (
      options?: NoteListOptions,
    ) => Promise<readonly NoteListItem[]>;
    readonly getById: (id: number) => Promise<NoteRecord | null>;
    readonly create: (input?: CreateNoteInput) => Promise<NoteRecord>;
    readonly update: (input: UpdateNoteInput) => Promise<NoteRecord>;
    readonly deleteToTrash: (id: number) => Promise<void>;
    readonly restore: (id: number) => Promise<void>;
    readonly deletePermanent: (id: number) => Promise<void>;
  };
  readonly backup: {
    readonly create: () => Promise<BackupResult>;
    readonly getStatus: () => Promise<BackupStatus>;
    readonly openFolder: () => Promise<void>;
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
}
