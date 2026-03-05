import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { Navigation } from "./Navigation";
import { getAndClearPendingScan } from "../lib/githubAuth";

export function Layout() {
  const navigate = useNavigate();

  useEffect(() => {
    const pending = getAndClearPendingScan();
    if (pending?.gitUrl) {
      navigate("/submit", { state: { pendingScan: { gitUrl: pending.gitUrl, name: pending.name } }, replace: true });
    }
  }, [navigate]);

  return (
    <div className="layout-root">
      <div className="layout-inner">
        <Navigation />
        <main className="outlet-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
