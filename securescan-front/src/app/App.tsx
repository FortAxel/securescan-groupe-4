import React from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { BackendGuard } from "./components/BackendGuard";

export default function App() {
  return (
    <BackendGuard>
      <RouterProvider router={router} />
    </BackendGuard>
  );
}