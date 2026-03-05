import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Shield, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { setLoggedIn } from "../lib/auth";
import { register as apiRegister } from "../api/auth";

export function Inscription() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await apiRegister(email, username.trim() || email.split("@")[0] || "user", password);
      navigate("/");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string }; status?: number }; code?: string };
      const msg = ax.response?.data?.error ?? null;
      const isNetworkError = !ax.response || ax.code === "ERR_NETWORK";
      if (msg) {
        setError(msg);
      } else if (isNetworkError) {
        setLoggedIn({ email, username: username.trim() || email.split("@")[0] || "utilisateur" });
        navigate("/");
      } else {
        setError("Une erreur est survenue.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-12 items-center">
        {/* Left side - Illustration */}
        <div className="hidden md:flex flex-col items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl" />
            <div className="relative bg-white p-12 rounded-3xl shadow-2xl">
              <Shield className="w-48 h-48 text-[var(--primary)]" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-8 text-center">
            <h2 className="text-2xl mb-2">Rejoignez SecureScan</h2>
            <p className="text-muted-foreground max-w-md">
              Créez un compte pour enregistrer vos analyses et consulter votre historique.
            </p>
          </div>
        </div>

        {/* Right side - Sign up Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Shield className="w-10 h-10 text-[var(--primary)]" />
            </div>
            <h1 className="text-3xl mb-2">Créer un compte</h1>
            <p className="text-muted-foreground">Inscription à SecureScan</p>
          </div>

          <Card className="p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div
                key="inscription-error"
                className={error ? "p-3 rounded-lg bg-destructive/10 text-destructive text-sm" : "hidden"}
                aria-hidden={!error}
              >
                {error ?? ""}
              </div>

              <div>
                <label className="block mb-2 text-sm">Adresse email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="vous@entreprise.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm">Nom d&apos;utilisateur</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="jdupont"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Au moins 8 caractères
                </p>
              </div>

              <div>
                <label className="block mb-2 text-sm">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[var(--primary)] hover:bg-[var(--primary)]/90"
                disabled={loading}
              >
                {loading ? "Inscription..." : "S'inscrire"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Déjà un compte ?{" "}
              <Link to="/login" className="text-[var(--primary)] hover:underline font-medium">
                Se connecter
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
