import { contextBridge, ipcRenderer } from "electron";
import type {
  CreateNoteInput,
  NasNotesbookApi,
  NoteListOptions,
  UpdateNoteInput,
} from "../../src/shared/ipc";
import type { AppSettings } from "../../src/shared/settings";

const api: NasNotesbookApi = Object.freeze({
  app: Object.freeze({
    getInfo: () => ipcRenderer.invoke("app:getInfo"),
    openDataFolder: () => ipcRenderer.invoke("app:openDataFolder"),
  }),
  settings: Object.freeze({
    get: () => ipcRenderer.invoke("settings:get"),
    update: (settings: Partial<AppSettings>) =>
      ipcRenderer.invoke("settings:update", settings),
  }),
  categories: Object.freeze({
    list: () => ipcRenderer.invoke("categories:list"),
  }),
  notes: Object.freeze({
    list: (options?: NoteListOptions) =>
      ipcRenderer.invoke("notes:list", options),
    getById: (id: number) => ipcRenderer.invoke("notes:getById", id),
    create: (input?: CreateNoteInput) =>
      ipcRenderer.invoke("notes:create", input),
    update: (input: UpdateNoteInput) =>
      ipcRenderer.invoke("notes:update", input),
    deleteToTrash: (id: number) =>
      ipcRenderer.invoke("notes:deleteToTrash", id),
    restore: (id: number) => ipcRenderer.invoke("notes:restore", id),
    deletePermanent: (id: number) =>
      ipcRenderer.invoke("notes:deletePermanent", id),
  }),
});

contextBridge.exposeInMainWorld("nasNotesbook", api);
