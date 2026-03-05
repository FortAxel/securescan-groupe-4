import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, Navigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Shield, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { getCurrentProjectId, getCurrentAnalysisId, setCurrentProjectId, setCurrentAnalysisId } from "../lib/flow";
import { setPendingScan, redirectToGitHubOAuth } from "../lib/githubAuth";
import { getApiBaseUrl } from "../api/client";
import { startProjectScan } from "../api/projects";

interface ScanStep {
  id: string;
  label: string;
  status: "completed" | "in-progress" | "pending";
}

const SCAN_LABELS = [
  "Clone du dépôt",
  "Détection du langage",
  "Exécution de Semgrep",
  "Exécution de npm audit",
  "Exécution de TruffleHog",
  "Mapping OWASP",
  "Génération du rapport",
];

export function ScanProgress() {
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = getCurrentProjectId(location);
  const analysisId = getCurrentAnalysisId(location);
  const mountedRef = useRef(true);

  const state = location.state as { scanning?: boolean; gitUrl?: string; name?: string } | undefined;
  const isRealScan = Boolean(state?.scanning && state?.gitUrl);

  const [scanError, setScanError] = useState<string | null>(null);
  const [steps, setSteps] = useState<ScanStep[]>(() =>
    SCAN_LABELS.map((label, i) => ({
      id: String(i + 1),
      label,
      status: i === 0 ? "in-progress" : ("pending" as const),
    }))
  );

  useEffect(() => {
    if (!isRealScan && projectId === null && analysisId === null) {
      navigate("/submit", { replace: true });
    }
  }, [isRealScan, projectId, analysisId, navigate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isRealScan || !state?.gitUrl) return;

    let cancelled = false;
    setScanError(null);

    startProjectScan({ url: state.gitUrl, name: state.name })
      .then((data) => {
        if (cancelled || !mountedRef.current) return;
        setCurrentProjectId(data.projectId);
        setCurrentAnalysisId(data.analysisId);
        setSteps((prev) => prev.map((s) => ({ ...s, status: "completed" as const })));
        const t = setTimeout(() => {
          if (mountedRef.current) {
            navigate("/dashboard", {
              state: { projectId: data.projectId, analysisId: data.analysisId },
              replace: true,
            });
          }
        }, 800);
        return () => clearTimeout(t);
      })
      .catch((err: unknown) => {
        if (cancelled || !mountedRef.current) return;
        const res = (err as { response?: { status?: number; data?: { error?: string; redirectTo?: string } } })?.response;
        if (res?.status === 401 && res.data?.error === "GitHub account not connected") {
          setPendingScan(state.gitUrl, state.name);
          redirectToGitHubOAuth(getApiBaseUrl(), "/api/githubAuth");
          return;
        }
        const msg =
          res?.data?.error ||
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          (err as { message?: string })?.message ||
          "Erreur lors du scan.";
        setScanError(msg);
      });

    return () => {
      cancelled = true;
    };
  }, [isRealScan, state?.gitUrl, navigate]);

  useEffect(() => {
    if (isRealScan || (projectId === null && analysisId === null)) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const stepDurations = [0, 0, 2000, 3000, 2000, 2000, 1500];
    let currentTime = 0;

    steps.forEach((step, index) => {
      if (step.status === "pending") {
        currentTime += stepDurations[index];
        const timer = setTimeout(() => {
          setSteps((prev) => {
            const newSteps = [...prev];
            if (index > 0) newSteps[index - 1] = { ...newSteps[index - 1], status: "completed" };
            newSteps[index] = { ...newSteps[index], status: "in-progress" };
            return newSteps;
          });
          const completeTimer = setTimeout(() => {
            setSteps((prev) => {
              const newSteps = [...prev];
              newSteps[index] = { ...newSteps[index], status: "completed" };
              return newSteps;
            });
            if (index === steps.length - 1) {
              timers.push(setTimeout(() => {
                if (mountedRef.current) navigate("/dashboard");
              }, 1000));
            }
          }, stepDurations[index]);
          timers.push(completeTimer);
        }, currentTime);
        timers.push(timer);
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [isRealScan, projectId, analysisId, navigate]);

  if (!isRealScan && projectId === null && analysisId === null) {
    return <Navigate to="/submit" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-[var(--primary)]" />
          </div>
          <h1 className="text-3xl mb-2">Scan en cours</h1>
          <p className="text-muted-foreground">
            {isRealScan
              ? "Clone du dépôt et analyse de sécurité en cours. Cela peut prendre 1 à 3 minutes."
              : "Analyse de votre code en cours…"}
          </p>
        </div>

        {scanError && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Erreur</p>
              <p className="text-sm">{scanError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => navigate("/submit", { replace: true })}
              >
                Retour à la soumission
              </Button>
            </div>
          </div>
        )}

        <Card className="p-8 shadow-lg">
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-4">
                <div className="relative w-6 h-6 shrink-0">
                  <span className={step.status === "completed" ? "inline-flex" : "hidden"} key={`${step.id}-done`}>
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </span>
                  <span className={step.status === "in-progress" ? "inline-flex" : "hidden"} key={`${step.id}-progress`}>
                    <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
                  </span>
                  <span className={step.status === "pending" ? "inline-flex" : "hidden"} key={`${step.id}-pending`}>
                    <span className="block w-6 h-6 rounded-full border-2 border-gray-300" />
                  </span>
                  <span className={index < steps.length - 1 ? "inline-block absolute left-1/2 top-8 w-0.5 h-8 -translate-x-1/2" : "hidden"} key={`${step.id}-connector`}>
                    <span
                      className={`block w-full h-full ${
                        step.status === "completed" ? "bg-green-600" : "bg-gray-300"
                      }`}
                    />
                  </span>
                </div>
                <div className="flex-1 pt-0.5">
                  <p
                    className={
                      step.status === "completed"
                        ? "text-foreground"
                        : step.status === "in-progress"
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-center text-muted-foreground">
              {isRealScan
                ? "Ne fermez pas cette page. Vous serez redirigé vers le tableau de bord à la fin."
                : "Comptez en général 2 à 3 minutes selon la taille du projet."}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
