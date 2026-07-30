import { ipcMain } from "electron";
import {
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { UpdateNoteInput } from "../../src/shared/ipc";
import type { NotesbookDatabase } from "./db";

interface StoredLockState {
  readonly version: 1;
  readonly lockedNoteIds: readonly number[];
}

export interface EditorProductivityService {
  readonly getLockedNoteIds: () => readonly number[];
  readonly setLocked: (noteId: number, isLocked: boolean) => boolean;
  readonly isLocked: (noteId: number) => boolean;
}

function normalizeNoteId(noteId: number): number {
  if (!Number.isInteger(noteId) || noteId <= 0) {
    throw new Error("Invalid note id.");
  }
  return noteId;
}

function loadLockState(filePath: string): Set<number> {
  if (!existsSync(filePath)) {
    return new Set<number>();
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<StoredLockState>;
    const ids = Array.isArray(parsed.lockedNoteIds)
      ? parsed.lockedNoteIds.filter(
          (value): value is number => Number.isInteger(value) && value > 0,
        )
      : [];
    return new Set(ids);
  } catch (error) {
    console.error("Failed to load NASbook editor productivity state:", error);
    return new Set<number>();
  }
}

function persistLockState(filePath: string, lockedNoteIds: ReadonlySet<number>): void {
  const temporaryPath = `${filePath}.tmp`;
  const payload: StoredLockState = {
    version: 1,
    lockedNoteIds: [...lockedNoteIds].sort((left, right) => left - right),
  };

  writeFileSync(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, filePath);
}

export function installEditorProductivityService(
  userDataPath: string,
  database: NotesbookDatabase,
): EditorProductivityService {
  const statePath = path.join(userDataPath, "editor-productivity.json");
  const lockedNoteIds = loadLockState(statePath);

  const isLocked = (noteId: number): boolean =>
    lockedNoteIds.has(normalizeNoteId(noteId));

  const getLockedNoteIds = (): readonly number[] =>
    [...lockedNoteIds].sort((left, right) => left - right);

  const setLocked = (noteId: number, nextLocked: boolean): boolean => {
    const normalizedId = normalizeNoteId(noteId);
    if (!database.getNoteById(normalizedId)) {
      throw new Error("Note not found.");
    }

    if (nextLocked) {
      lockedNoteIds.add(normalizedId);
    } else {
      lockedNoteIds.delete(normalizedId);
    }
    persistLockState(statePath, lockedNoteIds);
    return nextLocked;
  };

  ipcMain.handle("editorProductivity:getLockedNoteIds", () => getLockedNoteIds());
  ipcMain.handle(
    "editorProductivity:setLocked",
    (_event, noteId: number, nextLocked: boolean) =>
      setLocked(noteId, Boolean(nextLocked)),
  );

  ipcMain.removeHandler("notes:update");
  ipcMain.handle("notes:update", (_event, input: UpdateNoteInput) => {
    if (isLocked(input.id)) {
      throw new Error("Locked notes are read-only. Unlock the note before editing.");
    }
    return database.updateNote(input);
  });

  ipcMain.removeHandler("notes:deleteToTrash");
  ipcMain.handle("notes:deleteToTrash", (_event, noteId: number) => {
    if (isLocked(noteId)) {
      throw new Error("Locked notes cannot be moved to Trash.");
    }
    database.deleteNoteToTrash(noteId);
  });

  ipcMain.removeHandler("notes:deletePermanent");
  ipcMain.handle("notes:deletePermanent", (_event, noteId: number) => {
    if (isLocked(noteId)) {
      throw new Error("Locked notes cannot be permanently deleted.");
    }
    database.deleteNotePermanent(noteId);
    lockedNoteIds.delete(noteId);
    persistLockState(statePath, lockedNoteIds);
  });

  return {
    getLockedNoteIds,
    setLocked,
    isLocked,
  };
}
