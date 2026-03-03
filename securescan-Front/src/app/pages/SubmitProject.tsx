import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Progress } from "../components/ui/progress";
import { Shield, Upload, GitBranch, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const GIT_URL_REGEX = /^(https?:\/\/[^\s]+|git@[^\s]+\.git)$/i;

const ANALYSIS_STEPS = [
  "Connexion au dépôt...",
  "Analyse des fichiers...",
  "Scan des dépendances...",
  "Détection des vulnérabilités...",
  "Génération du rapport...",
];

export function SubmitProject() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [gitUrl, setGitUrl] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);

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
    setIsAnalyzing(true);
    setAnalysisStep(0);
    setDetectedLanguage(hasZip ? "Détection en cours..." : "Node.js");

    // Simulate analysis steps
    const stepDuration = 800;
    for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
      setAnalysisStep(i + 1);
      await new Promise((r) => setTimeout(r, stepDuration));
    }
    if (hasZip) setDetectedLanguage("Node.js");

    // Brief pause then redirect to dashboard
    await new Promise((r) => setTimeout(r, 400));
    navigate("/dashboard");
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

  const progressPercent = (analysisStep / ANALYSIS_STEPS.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-[var(--primary)]" />
          </div>
          <h1 className="text-4xl mb-2">SecureScan</h1>
          <p className="text-muted-foreground">
            Analysez votre code pour détecter les vulnérabilités de sécurité
          </p>
        </div>

        <Card className="p-8 shadow-lg">
          {isAnalyzing ? (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-3 text-[var(--primary)]">
                <Loader2 className="w-8 h-8 animate-spin shrink-0" />
                <div>
                  <p className="font-medium">Analyse en cours</p>
                  <p className="text-sm text-muted-foreground">
                    {ANALYSIS_STEPS[analysisStep - 1] ?? "Terminé"}
                  </p>
                </div>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <ul className="space-y-2">
                {ANALYSIS_STEPS.map((step, i) => (
                  <li
                    key={step}
                    className={`flex items-center gap-2 text-sm ${
                      i < analysisStep
                        ? "text-green-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {i < analysisStep ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 shrink-0" />
                    )}
                    {step}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                Redirection vers le tableau de bord...
              </p>
            </div>
          ) : (
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

              <div>
                <label className="block mb-2">URL du dépôt Git</label>
                <div className="relative">
                  <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="https://github.com/username/repository"
                    value={gitUrl}
                    onChange={handleUrlChange}
                    className="pl-10 h-12"
                    disabled={!!zipFile}
                  />
                </div>
              </div>

              <div className="relative">
                <div className="text-center text-muted-foreground mb-2">OU</div>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {zipFile ? (
                  <div className="border-2 border-green-200 bg-green-50/50 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Upload className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="font-medium text-foreground">{zipFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(zipFile.size / 1024).toFixed(1)} Ko
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearZip}
                    >
                      Retirer
                    </Button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                      isDragging
                        ? "border-[var(--primary)] bg-[var(--primary)]/5"
                        : "border-border hover:border-[var(--primary)]/50"
                    }`}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="mb-2">Glissez-déposez votre fichier ZIP ici</p>
                    <p className="text-sm text-muted-foreground">
                      ou cliquez pour parcourir
                    </p>
                  </div>
                )}
              </div>

              {detectedLanguage && (
                <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm">
                    Langage détecté : <strong>{detectedLanguage}</strong>
                  </span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base bg-[var(--primary)] hover:bg-[var(--primary)]/90"
                disabled={!canSubmit}
              >
                Analyser
              </Button>
            </form>
          )}
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Node.js, Python, Java, Go et plus encore
        </p>
      </div>
    </div>
  );
}
