import { contextBridge, ipcRenderer } from "electron";
import type {
  CreateNoteInput,
  MarkdownExportInput,
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
  markdown: Object.freeze({
    importFile: () => ipcRenderer.invoke("markdown:importFile"),
    exportFile: (input: MarkdownExportInput) =>
      ipcRenderer.invoke("markdown:exportFile", input),
  }),
  backup: Object.freeze({
    create: () => ipcRenderer.invoke("backup:create"),
    getStatus: () => ipcRenderer.invoke("backup:getStatus"),
    openFolder: () => ipcRenderer.invoke("backup:openFolder"),
  }),
  googleAuth: Object.freeze({
    link: () => ipcRenderer.invoke("googleAuth:link"),
    unlink: () => ipcRenderer.invoke("googleAuth:unlink"),
    getStatus: () => ipcRenderer.invoke("googleAuth:getStatus"),
  }),
  cloudBackup: Object.freeze({
    getStatus: () => ipcRenderer.invoke("cloudBackup:getStatus"),
    uploadLatest: () => ipcRenderer.invoke("cloudBackup:uploadLatest"),
  }),
  window: Object.freeze({
    minimize: () => ipcRenderer.invoke("window:minimize"),
    toggleMaximize: () => ipcRenderer.invoke("window:toggleMaximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  }),
});

contextBridge.exposeInMainWorld("nasNotesbook", api);
