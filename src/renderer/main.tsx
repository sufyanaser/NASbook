import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { installEditorInteractionStability } from "./editorInteractionStability";
import "./styles/index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("NASbook root element was not found.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

installEditorInteractionStability();
