import { Link, useLocation, useNavigate } from "react-router";
import { Shield } from "lucide-react";
import { hasCurrentProject, clearCurrentProjectId } from "../lib/flow";
import { isLoggedIn, logout } from "../lib/auth";

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasProject = hasCurrentProject();

  const handleNewAnalysis = () => {
    clearCurrentProjectId();
    navigate("/submit", { replace: true });
  };

  const baseLinks = [
    { path: "/", label: "Accueil" },
    { path: "/submit", label: "Soumettre" },
  ];

  const afterSubmitLinks = hasProject
    ? [
        { path: "/scan", label: "Scan" },
        { path: "/dashboard", label: "Tableau de bord" },
        { path: "/findings", label: "Vulnérabilités" },
      ]
    : [];

  const historyLink = isLoggedIn()
    ? [{ path: "/historique", label: "Historique" }]
    : [];

  const links = [...baseLinks, ...afterSubmitLinks, ...historyLink];

  return (
    <nav className="bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Shield className="w-6 h-6 text-[var(--primary)]" />
            <span className="font-semibold">SecureScan</span>
          </Link>
          <div className="flex items-center gap-1 flex-wrap">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  location.pathname === link.path
                    ? "bg-[var(--primary)] text-white"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {hasProject && (
              <button
                type="button"
                onClick={handleNewAnalysis}
                className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
              >
                Nouvelle analyse
              </button>
            )}
            {isLoggedIn() ? (
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
              >
                Déconnexion
              </button>
            ) : (
              <>
                <Link
                  to="/inscription"
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    location.pathname === "/inscription"
                      ? "bg-[var(--primary)] text-white"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  Inscription
                </Link>
                <Link
                  to="/login"
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    location.pathname === "/login"
                      ? "bg-[var(--primary)] text-white"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  Connexion
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
