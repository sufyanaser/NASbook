import { contextBridge, ipcRenderer } from "electron";
import type { NasNotesbookApi } from "../../src/shared/ipc";

const api: NasNotesbookApi = Object.freeze({
  app: Object.freeze({
    getInfo: () => ipcRenderer.invoke("app:getInfo"),
  }),
  categories: Object.freeze({
    list: () => ipcRenderer.invoke("categories:list"),
  }),
  notes: Object.freeze({
    list: () => ipcRenderer.invoke("notes:list"),
  }),
});

contextBridge.exposeInMainWorld("nasNotesbook", api);
