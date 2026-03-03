import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";

const container = document.getElementById("root")!;
// Réutiliser la même racine en HMR pour éviter les erreurs removeChild au hot reload
const root =
  (container as HTMLElement & { _reactRoot?: ReturnType<typeof createRoot> })
    ._reactRoot ?? createRoot(container);
(container as HTMLElement & { _reactRoot?: ReturnType<typeof createRoot> })._reactRoot = root;
root.render(<App />);
  