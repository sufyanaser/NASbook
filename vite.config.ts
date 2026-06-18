import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  root: "src/renderer",
  plugins: [react()],
  publicDir: resolve(__dirname, "public"),
  build: {
    outDir: resolve(__dirname, "dist/renderer"),
    emptyOutDir: true,
    // Raise the chunk size warning limit to 800 kB.
    // Tiptap and ProseMirror are bundled in the renderer chunk and exceed the default 500 kB limit.
    // Since this is a local desktop Electron application, network transit sizes are not a constraint.
    chunkSizeWarningLimit: 800,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false,
  },
});

