import { Outlet, useLocation } from "react-router";
import { Navigation } from "./Navigation";

export function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="layout-root">
      <Navigation />
      <div className="outlet-container" key={pathname}>
        <Outlet />
      </div>
    </div>
  );
}
