/// <reference types="vite/client" />

interface Window {
  readonly nasNotesbook?: {
    readonly app: {
      readonly name: string;
      readonly phase: string;
    };
  };
}
