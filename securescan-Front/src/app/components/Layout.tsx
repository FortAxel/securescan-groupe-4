import { Outlet } from "react-router";
import { Navigation } from "./Navigation";

export function Layout() {
  return (
    <div>
      <Navigation />
      <Outlet />
    </div>
  );
}
