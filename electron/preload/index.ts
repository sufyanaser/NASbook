import { contextBridge, ipcRenderer } from "electron";
import type {
  CreateNoteInput,
  NasNotesbookApi,
  NoteListOptions,
  UpdateNoteInput,
} from "../../src/shared/ipc";

const api: NasNotesbookApi = Object.freeze({
  app: Object.freeze({
    getInfo: () => ipcRenderer.invoke("app:getInfo"),
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
