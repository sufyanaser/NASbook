import { contextBridge } from "electron";

const api = Object.freeze({
  app: Object.freeze({
    name: "NAS Notesbook",
    phase: "phase-1-scaffold",
  }),
});

contextBridge.exposeInMainWorld("nasNotesbook", api);
