import { useState, useEffect } from "react";
import { useNavigate, Link, Navigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Shield,
  Mail,
  Calendar,
  History,
  LogOut,
  Loader2,
  ChevronRight,
  FileSearch,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { isLoggedIn, logout, getStoredUser } from "../lib/auth";
import { getCurrentUser, type CurrentUser } from "../api/auth";
import { hasCurrentProject } from "../lib/flow";

function formatMemberSince(createdAt?: string): string | null {
  if (!createdAt) return null;
  try {
    const d = new Date(createdAt);
    return d.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function initials(username: string, email: string) {
  if (username?.trim()) {
    const parts = username.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  }
  if (email?.trim()) return email.slice(0, 2).toUpperCase();
  return "?";
}

export function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login", { replace: true });
      return;
    }
    setLoading(true);
    setError(null);
    getCurrentUser()
      .then(setUser)
      .catch(() => {
        const stored = getStoredUser();
        if (stored) {
          setUser({
            id: stored.id ?? 0,
            email: stored.email,
            username: stored.username,
          });
        } else {
          setError("Impossible de charger le profil.");
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-slate-50 via-white to-indigo-50/40">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  const memberSince = user ? formatMemberSince(user.createdAt) : null;
  const hasProject = hasCurrentProject();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/40">
      {/* Header avec avatar et infos */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-indigo-500/5" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-8 sm:pt-12 sm:pb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <Shield className="w-5 h-5 text-[var(--primary)]" />
            <span className="font-semibold">SecureScan</span>
          </Link>

          <div
            key="profile-error"
            className={error ? "mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-sm" : "hidden"}
            aria-hidden={!error}
          >
            {error ?? ""}
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8">
            <div className="relative group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-indigo-600 flex items-center justify-center shadow-lg shadow-[var(--primary)]/20 ring-4 ring-white">
                <span className="text-4xl sm:text-5xl font-bold text-white drop-shadow-sm">
                  {user ? initials(user.username, user.email) : "?"}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow border border-border">
                <Sparkles className="w-4 h-4 text-[var(--primary)]" />
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {user?.username ?? "—"}
              </h1>
              <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                <Mail className="w-4 h-4 shrink-0 opacity-70" />
                {user?.email ?? "—"}
              </p>
              <div
                key="profile-memberSince"
                className={memberSince ? "inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm" : "hidden"}
                aria-hidden={!memberSince}
              >
                <Calendar className="w-4 h-4" />
                Membre depuis {memberSince ?? ""}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Actions rapides
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Link to="/historique" key="historique">
              <Card className="p-4 sm:p-5 flex items-center gap-4 hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5 transition-all group cursor-pointer h-full">
                <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center group-hover:bg-[var(--primary)]/20 transition-colors">
                  <History className="w-6 h-6 text-[var(--primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">Historique des scans</p>
                  <p className="text-sm text-muted-foreground">Consulter vos analyses passées</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </Card>
            </Link>

            <Link to="/submit" key="submit">
              <Card className="p-4 sm:p-5 flex items-center gap-4 hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5 transition-all group cursor-pointer h-full">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <FileSearch className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">Nouvelle analyse</p>
                  <p className="text-sm text-muted-foreground">Soumettre un projet à scanner</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </Card>
            </Link>

            <div key="dashboard" className={hasProject ? "sm:col-span-2" : "sm:col-span-2 hidden"}>
              {hasProject ? (
                <Link to="/dashboard">
                  <Card className="p-4 sm:p-5 flex items-center gap-4 hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5 transition-all group cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                      <LayoutDashboard className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">Tableau de bord</p>
                      <p className="text-sm text-muted-foreground">Voir le rapport de l’analyse en cours</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </Card>
                </Link>
              ) : (
                <span aria-hidden className="hidden" />
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Compte
          </h2>
          <Card className="p-4 sm:p-5">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>Se déconnecter</span>
            </Button>
          </Card>
        </section>
      </main>
    </div>
  );
}
