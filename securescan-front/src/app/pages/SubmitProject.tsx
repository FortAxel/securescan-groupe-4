import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Navigate } from "react-router";
import { Button } from "../components/ui/button";
import { isLoggedIn } from "../lib/auth";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Shield, Upload, GitBranch, AlertCircle, Loader2 } from "lucide-react";
import { uploadProjectZip, startProjectScan } from "../api/projects";
import { getAndClearPendingScan, setPendingScan } from "../lib/githubAuth";

const GIT_URL_REGEX = /^(https?:\/\/[^\s]+|git@[^\s]+\.git)$/i;

export function SubmitProject() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gitUrl, setGitUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  const hasUrl = gitUrl.trim().length > 0;
  const hasZip = zipFile !== null;
  const canSubmit = (hasUrl || hasZip) && !scanning;

  // ── Reprendre le scan après retour OAuth GitHub ──────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("github") !== "connected") return;

    const pending = getAndClearPendingScan();
    if (!pending) return;

    window.history.replaceState({}, "", "/submit");

    setScanning(true);
    setError(null);
    startProjectScan({ url: pending.gitUrl, name: pending.name })
      .then((data) => {
        navigate("/dashboard", {
          state: { projectId: data.projectId, analysisId: data.analysisId },
          replace: true,
        });
      })
      .catch((err: unknown) => {
        setScanning(false);
        const res = (err as { response?: { data?: { error?: string } } })?.response;
        setError(res?.data?.error || (err as Error)?.message || "Erreur lors du scan.");
      });
  }, []);

  const validateAndGetError = (): string | null => {
    if (hasZip) return null;
    if (!hasUrl) return "Saisissez une URL de dépôt Git ou déposez un fichier ZIP.";
    const trimmed = gitUrl.trim();
    if (!GIT_URL_REGEX.test(trimmed)) {
      return "URL invalide. Utilisez une URL HTTPS ou SSH (ex: https://github.com/user/repo).";
    }
    return null;
  };

  const runScan = async (url: string, name?: string) => {
    setError(null);
    setScanning(true);
    try {
      const data = await startProjectScan({ url, name });
      setScanning(false);
      navigate("/dashboard", {
        state: { projectId: data.projectId, analysisId: data.analysisId },
        replace: true,
      });
    } catch (err: unknown) {
      setScanning(false);
      const res = (err as { response?: { status?: number; data?: { error?: string; redirectTo?: string } } })?.response;
      if (res?.status === 401 && res.data?.error === "GitHub account not connected") {
        setPendingScan(url, name);
        return;
      }
    }
  };

  const pendingScanRan = useRef(false);
  useEffect(() => {
    const pending = (location.state as { pendingScan?: { gitUrl: string; name?: string } })?.pendingScan;
    if (!pending?.gitUrl || pendingScanRan.current) return;
    pendingScanRan.current = true;
    runScan(pending.gitUrl, pending.name);
    navigate(location.pathname, { replace: true, state: {} });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const submitError = validateAndGetError();
    if (submitError) {
      setError(submitError);
      return;
    }

    // ── ZIP ────────────────────────────────────────────────────────────────
    if (hasZip && zipFile) {
      setScanning(true);
      try {
        const data = await uploadProjectZip(zipFile);
        navigate("/dashboard", {
          state: { projectId: data.projectId, analysisId: data.analysisId },
          replace: true,
        });
      } catch (err: unknown) {
        setScanning(false);
        const res = (err as { response?: { data?: { error?: string } } })?.response;
        setError(res?.data?.error || (err as Error)?.message || "Erreur lors de l'upload.");
      }
      return;
    }

    // ── GIT ────────────────────────────────────────────────────────────────
    const url = gitUrl.trim();
    const name = projectName.trim() || undefined;

    setScanning(true);
    try {
      const data = await startProjectScan({ url, name });
      navigate("/dashboard", {
        state: { projectId: data.projectId, analysisId: data.analysisId },
        replace: true,
      });
    } catch (err: unknown) {
      setScanning(false);
      const res = (err as { response?: { status?: number; data?: { error?: string } } })?.response;

      if (res?.status === 401) {
        setPendingScan(url, name);
        return;
      }

      setError(res?.data?.error || (err as Error)?.message || "Erreur lors du scan.");
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false); setError(null);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) { setError("Veuillez déposer un fichier ZIP."); return; }
    setZipFile(file); setGitUrl("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) { setZipFile(null); return; }
    if (!file.name.toLowerCase().endsWith(".zip")) { setError("Veuillez sélectionner un fichier ZIP."); return; }
    setZipFile(file); setGitUrl("");
    e.target.value = "";
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGitUrl(e.target.value);
    if (e.target.value.trim()) setZipFile(null);
    setError(null);
  };

  const clearZip = () => { setZipFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-[var(--primary)]" />
          </div>
          <h1 className="text-3xl mb-2">Nouvelle analyse</h1>
          <p className="text-muted-foreground">
            Indiquez la source de votre projet pour lancer le scan de sécurité
          </p>
        </div>

        <Card className="p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <AlertTitle>Erreur</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </div>
              </Alert>
            )}

            {scanning && (
              <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg text-blue-700">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Analyse en cours, veuillez patienter…</span>
              </div>
            )}

            <div>
              <label className="block mb-2 text-sm font-medium">Nom du projet (optionnel)</label>
              <Input
                type="text"
                placeholder="Mon projet"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="h-11"
                disabled={!!zipFile || scanning}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">URL du dépôt Git</label>
              <div className="relative">
                <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="https://github.com/username/repository"
                  value={gitUrl}
                  onChange={handleUrlChange}
                  className="pl-10 h-11"
                  disabled={!!zipFile || scanning}
                />
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <div>
              <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleFileChange} />
              {zipFile ? (
                <div className="border-2 border-green-200 bg-green-50/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Upload className="w-6 h-6 text-green-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{zipFile.name}</p>
                      <p className="text-sm text-muted-foreground">{(zipFile.size / 1024).toFixed(1)} Ko</p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={clearZip} disabled={scanning}>Retirer</Button>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !scanning && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${scanning ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${
                    isDragging ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-border hover:border-[var(--primary)]/50"
                  }`}
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">Glissez-déposez votre fichier ZIP</p>
                  <p className="text-xs text-muted-foreground">ou cliquez pour parcourir</p>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-[var(--primary)] hover:bg-[var(--primary)]/90"
              disabled={!canSubmit}
            >
              {scanning ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyse en cours…
                </span>
              ) : (
                "Lancer l'analyse"
              )}
            </Button>
          </form>
        </Card>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-center text-muted-foreground">
            PHP, Node, Python
          </p>
        </div>
      </div>
    </div>
  );
}