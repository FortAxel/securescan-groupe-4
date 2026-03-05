import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Shield, Upload, GitBranch, AlertCircle, Github } from "lucide-react";
import { getApiBaseUrl } from "../api/client";
import { uploadProjectZip } from "../api/projects";
import { redirectToGitHubOAuth } from "../lib/githubAuth";

const GIT_URL_REGEX = /^(https?:\/\/[^\s]+|git@[^\s]+\.git)$/i;

export function SubmitProject() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [gitUrl, setGitUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const hasUrl = gitUrl.trim().length > 0;
  const hasZip = zipFile !== null;
  const canSubmit = hasUrl || hasZip;

  const validateAndGetError = (): string | null => {
    if (hasZip) return null;
    if (!hasUrl) return "Saisissez une URL de dépôt Git ou déposez un fichier ZIP.";
    const trimmed = gitUrl.trim();
    if (!GIT_URL_REGEX.test(trimmed)) {
      return "URL invalide. Utilisez une URL HTTPS ou SSH (ex: https://github.com/user/repo).";
    }
    if (trimmed.includes("private") || trimmed.includes("privé")) {
      return "Dépôt privé ou inaccessible. Utilisez un dépôt public ou vérifiez vos accès.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const submitError = validateAndGetError();
    if (submitError) {
      setError(submitError);
      return;
    }
    if (hasZip && zipFile) {
      setUploading(true);
      try {
        const data = await uploadProjectZip(zipFile);
        setUploading(false);
        navigate("/dashboard", {
          state: { projectId: data.projectId, analysisId: data.analysisId },
          replace: true,
        });
      } catch (err: unknown) {
        setUploading(false);
        const res = (err as { response?: { status?: number; data?: { error?: string; redirectTo?: string } } })?.response;
        if (res?.status === 401 && res.data?.redirectTo && res.data?.error === "GitHub account not connected") {
          redirectToGitHubOAuth(getApiBaseUrl(), res.data.redirectTo);
          return;
        }
        setError((res?.data?.error as string) || (err as Error)?.message || "Erreur lors de l’upload.");
      }
      return;
    }
    const url = gitUrl.trim();
    navigate("/scan", { state: { scanning: true, gitUrl: url, name: projectName.trim() || undefined }, replace: true });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    const file = files[0];
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Veuillez déposer un fichier ZIP.");
      return;
    }
    setZipFile(file);
    setGitUrl("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.name.toLowerCase().endsWith(".zip")) {
        setError("Veuillez sélectionner un fichier ZIP.");
        return;
      }
      setZipFile(file);
      setGitUrl("");
    } else {
      setZipFile(null);
    }
    e.target.value = "";
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGitUrl(e.target.value);
    if (e.target.value.trim()) setZipFile(null);
    setError(null);
  };

  const clearZip = () => {
    setZipFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-[var(--primary)]" />
          </div>
          <h1 className="text-3xl mb-2">Nouvelle analyse</h1>
          <p className="text-muted-foreground mb-4">
            Indiquez la source de votre projet pour lancer le scan de sécurité
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => redirectToGitHubOAuth(getApiBaseUrl(), "/auth/github")}
          >
            <Github className="w-4 h-4" />
            Connecter GitHub (pour dépôts privés et clone)
          </Button>
        </div>

        <Card className="p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div key="submit-error" className={error ? "" : "hidden"} aria-hidden={!error}>
              <Alert variant="destructive" className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <AlertTitle>Erreur</AlertTitle>
                  <AlertDescription>{error ?? ""}</AlertDescription>
                </div>
              </Alert>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Nom du projet (optionnel)</label>
              <Input
                type="text"
                placeholder="Mon projet"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="h-11"
                disabled={!!zipFile}
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
                  disabled={!!zipFile}
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileChange}
              />
              <div key="zip-preview" className={zipFile ? "" : "hidden"} aria-hidden={!zipFile}>
                <div className="border-2 border-green-200 bg-green-50/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Upload className="w-6 h-6 text-green-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{zipFile?.name ?? ""}</p>
                      <p className="text-sm text-muted-foreground">
                        {zipFile ? `${(zipFile.size / 1024).toFixed(1)} Ko` : ""}
                      </p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={clearZip}>
                    Retirer
                  </Button>
                </div>
              </div>
              <div
                key="zip-dropzone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={zipFile ? "hidden" : `border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-border hover:border-[var(--primary)]/50"
                }`}
                aria-hidden={!!zipFile}
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Glissez-déposez votre fichier ZIP</p>
                <p className="text-xs text-muted-foreground">ou cliquez pour parcourir</p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-[var(--primary)] hover:bg-[var(--primary)]/90"
              disabled={!canSubmit || uploading}
            >
              {uploading ? "Envoi en cours…" : "Lancer l'analyse"}
            </Button>
          </form>
        </Card>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-center text-muted-foreground">
            Node.js, Python, Java, Go et plus encore
          </p>
        </div>
      </div>
    </div>
  );
}
