import type { CategoryRecord } from "./categories";

export interface AppInfo {
  readonly name: string;
  readonly version: string;
  readonly phase: "phase-2-data-layer";
  readonly databasePath: string;
}

export interface NoteListItem {
  readonly id: number;
  readonly title: string;
  readonly categoryId: number | null;
  readonly isRtl: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface NasNotesbookApi {
  readonly app: {
    readonly getInfo: () => Promise<AppInfo>;
  };
  readonly categories: {
    readonly list: () => Promise<readonly CategoryRecord[]>;
  };
  readonly notes: {
    readonly list: () => Promise<readonly NoteListItem[]>;
  };
}
