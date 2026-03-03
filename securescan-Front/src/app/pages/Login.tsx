import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Shield, Eye, EyeOff, Mail, Lock, Github } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would authenticate the user
    navigate("/");
  };

  const handleGithubLogin = () => {
    // In a real app, this would initiate OAuth flow
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-12 items-center">
        {/* Left side - Illustration */}
        <div className="hidden md:flex flex-col items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
            <div className="relative bg-white p-12 rounded-3xl shadow-2xl">
              <Shield className="w-48 h-48 text-[var(--primary)]" strokeWidth={1.5} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Lock className="w-24 h-24 text-blue-600" strokeWidth={2} />
              </div>
            </div>
          </div>
          <div className="mt-8 text-center">
            <h2 className="text-2xl mb-2">Secure your code.</h2>
            <h2 className="text-2xl mb-4">Simplify your security.</h2>
            <p className="text-muted-foreground max-w-md">
              Automated vulnerability detection powered by industry-leading security tools
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
            <p className="text-muted-foreground">Sign in to SecureScan</p>
          </div>

          <Card className="p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block mb-2 text-sm">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm">Password</label>
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
                    Remember me
                  </label>
                </div>
                <a
                  href="#"
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[var(--primary)] hover:bg-[var(--primary)]/90"
              >
                Sign In
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-4 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 gap-2"
              onClick={handleGithubLogin}
            >
              <Github className="w-5 h-5" />
              Sign in with GitHub
            </Button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <a href="#" className="text-[var(--primary)] hover:underline">
                Sign up
              </a>
            </p>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Secure your code. Simplify your security.
          </p>
        </div>
      </div>
    </div>
  );
}
