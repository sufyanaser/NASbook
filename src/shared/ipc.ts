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

export interface NasNotesbookApi {
  readonly app: {
    readonly getInfo: () => Promise<AppInfo>;
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
}
