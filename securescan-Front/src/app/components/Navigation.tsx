import { Link, useLocation } from "react-router";
import { Shield } from "lucide-react";

export function Navigation() {
  const location = useLocation();

  const links = [
    { path: "/", label: "Accueil" },
    { path: "/submit", label: "Submit" },
    { path: "/scan", label: "Scan" },
    { path: "/dashboard", label: "Dashboard" },
    { path: "/findings", label: "Findings" },
  ];

  return (
    <nav className="bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[var(--primary)]" />
            <span className="font-semibold">SecureScan</span>
          </Link>
          <div className="flex gap-1">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === link.path
                    ? "bg-[var(--primary)] text-white"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
