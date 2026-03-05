import { Link, useLocation, useNavigate } from "react-router";
import { Shield } from "lucide-react";
import { hasCurrentProject, clearCurrentProjectId } from "../lib/flow";
import { isLoggedIn, logout } from "../lib/auth";

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasProject = hasCurrentProject();

  const handleSubmitOrNew = () => {
    if (hasProject) clearCurrentProjectId();
    navigate("/submit", { replace: true });
  };

  const submitLabel = hasProject ? "Nouvelle analyse" : "Soumettre";
  const isSubmitActive = location.pathname === "/submit";
  const loggedIn = isLoggedIn();

  const linkClass = (path: string) =>
    `px-3 py-2 rounded-lg text-sm transition-colors ${
      location.pathname === path ? "bg-[var(--primary)] text-white" : "text-muted-foreground hover:bg-accent"
    }`;

  // Structure fixe : toujours les mêmes slots pour éviter l’erreur removeChild
  return (
    <nav className="bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Shield className="w-6 h-6 text-[var(--primary)]" />
            <span className="font-semibold">SecureScan</span>
          </Link>
          <div className="flex items-center gap-1 flex-wrap">
            <span key="nav-accueil" className="inline-flex">
              <Link to="/" className={linkClass("/")}>
                Accueil
              </Link>
            </span>
            <span key="nav-submit" className={loggedIn ? "inline-flex" : "hidden"}>
              <button
                type="button"
                onClick={handleSubmitOrNew}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  isSubmitActive ? "bg-[var(--primary)] text-white" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {submitLabel}
              </button>
            </span>
            <span key="nav-dashboard" className={hasProject ? "inline-flex" : "hidden"}>
              <Link to="/dashboard" className={linkClass("/dashboard")}>
                Tableau de bord
              </Link>
            </span>
            <span key="nav-findings" className={hasProject ? "inline-flex" : "hidden"}>
              <Link to="/findings" className={linkClass("/findings")}>
                Vulnérabilités
              </Link>
            </span>
            <span key="nav-historique" className={loggedIn ? "inline-flex" : "hidden"}>
              <Link to="/historique" className={linkClass("/historique")}>
                Historique
              </Link>
            </span>
            <span key="nav-profil" className={loggedIn ? "inline-flex" : "hidden"}>
              <Link to="/profil" className={linkClass("/profil")}>
                Profil
              </Link>
            </span>
            <span key="nav-auth-left" className="inline-flex">
              {loggedIn ? (
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
                <Link to="/inscription" className={linkClass("/inscription")}>
                  Inscription
                </Link>
              )}
            </span>
            <span key="nav-auth-right" className={loggedIn ? "hidden" : "inline-flex"}>
              <Link to="/login" className={linkClass("/login")}>
                Connexion
              </Link>
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
