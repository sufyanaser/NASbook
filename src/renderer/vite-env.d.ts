/// <reference types="vite/client" />

import type { NasNotesbookApi } from "../shared/ipc";

declare global {
  interface Window {
    readonly nasNotesbook?: NasNotesbookApi;
  }
}

export {};
