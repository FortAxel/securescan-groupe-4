import React from "react";
import { createBrowserRouter } from "react-router";
import { HomePage } from "./pages/HomePage";
import { SubmitProject } from "./pages/SubmitProject";
import { ScanProgress } from "./pages/ScanProgress";
import { Dashboard } from "./pages/Dashboard";
import { FindingsList } from "./pages/FindingsList";
import { FixPreview } from "./pages/FixPreview";
import { Login } from "./pages/Login";
import { ReportHistory } from "./pages/ReportHistory";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: Layout,
    errorElement: React.createElement(ErrorBoundary),
    children: [
      {
        index: true,
        Component: HomePage,
      },
      {
        path: "submit",
        Component: SubmitProject,
      },
      {
        path: "scan",
        Component: ScanProgress,
      },
      {
        path: "dashboard",
        Component: Dashboard,
      },
      {
        path: "findings",
        Component: FindingsList,
      },
      {
        path: "fix/:id",
        Component: FixPreview,
      },
      {
        path: "historique",
        Component: ReportHistory,
      },
    ],
  },
]);