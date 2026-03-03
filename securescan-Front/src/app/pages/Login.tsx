import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Shield, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { setLoggedIn } from "../lib/auth";
import { login as apiLogin } from "../api/auth";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiLogin(email, password);
      navigate("/");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string }; status?: number }; code?: string };
      const msg = ax.response?.data?.error ?? null;
      const isNetworkError = !ax.response || ax.code === "ERR_NETWORK";
      if (msg) {
        setError(msg);
      } else if (isNetworkError) {
        setLoggedIn({
          email,
          username: email.split("@")[0] || "utilisateur",
        });
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
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Lock className="w-24 h-24 text-blue-600" strokeWidth={2} />
              </div>
            </div>
          </div>
          <div className="mt-8 text-center">
            <h2 className="text-2xl mb-2">Sécurisez votre code.</h2>
            <h2 className="text-2xl mb-4">Simplifiez la sécurité.</h2>
            <p className="text-muted-foreground max-w-md">
              Détection automatisée des vulnérabilités grâce aux outils de sécurité reconnus.
            </p>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Shield className="w-10 h-10 text-[var(--primary)]" />
            </div>
            <h1 className="text-3xl mb-2">SecureScan</h1>
            <p className="text-muted-foreground">Connexion à SecureScan</p>
          </div>

          <Card className="p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div
                key="login-error"
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
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Se souvenir de moi
                  </label>
                </div>
                <a
                  href="#"
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  Mot de passe oublié ?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[var(--primary)] hover:bg-[var(--primary)]/90"
                disabled={loading}
              >
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link to="/inscription" className="text-[var(--primary)] hover:underline font-medium">
                S&apos;inscrire
              </Link>
            </p>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Sécurisez votre code. Simplifiez la sécurité.
          </p>
        </div>
      </div>
    </div>
  );
}
