import { useEffect, useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { SeverityBadge } from "../components/SeverityBadge";
import { ScoreBadge } from "../components/ScoreBadge";
import { Progress } from "../components/ui/progress";
import { Shield, AlertCircle, Send, Loader2, FileDown } from "lucide-react";
import {
  mockVulnerabilities,
  owaspCategories,
} from "../data/mockData";
import { getAnalysisResults, downloadAnalysisReport } from "../api/analysis";
import { applyCorrections } from "../api/apply";
import { getProjectFindings, type ProjectFindingsResponse } from "../api/projects";
import { getCurrentProjectId, getCurrentAnalysisId, setCurrentProjectId, setCurrentAnalysisId } from "../lib/flow";
import { ChartErrorBoundary } from "../components/ChartErrorBoundary";
import { getErrorMessage, GENERIC_ERROR_MESSAGE } from "../lib/errors";
import { shortFilePath } from "../lib/filePath";
import type { SeverityLevel } from "../constants/severity";
import { SEVERITY_LEVELS } from "../constants/severity";

// Couleurs par sévérité (alignées schema Prisma : CRITICAL, HIGH, MEDIUM, LOW, INFO)
const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: "var(--severity-critical)",
  high: "var(--severity-high)",
  medium: "var(--severity-medium)",
  low: "var(--severity-low)",
  info: "var(--severity-info)",
};

type SeverityCounts = {
  grade: string;
  score: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  totalVulnerabilities: number;
};

/** Total affiché = somme des gravités pour rester cohérent avec les cartes. */
function totalFromSummary(s: SeverityCounts & { info?: number }): number {
  return (s.critical ?? 0) + (s.high ?? 0) + (s.medium ?? 0) + (s.low ?? 0) + (s.info ?? 0);
}

const emptySummary: SeverityCounts = {
  grade: "—",
  score: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  totalVulnerabilities: 0,
};

function useFindingsData(projectId: number | undefined, analysisId: number | undefined) {
  const [summary, setSummary] = useState<SeverityCounts>(emptySummary);
  const [findings, setFindings] = useState<typeof mockVulnerabilities>([]);
  const [loading, setLoading] = useState(!!(projectId ?? analysisId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = analysisId ?? projectId;
    if (!id) {
      setSummary({
        grade: "—",
        score: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        totalVulnerabilities: 0,
      });
      setFindings([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadFromAnalysis = () =>
      getAnalysisResults(id).then((data) => {
        if (cancelled) return;
        const s = data.summary;
        const total = (s.critical ?? 0) + (s.high ?? 0) + (s.medium ?? 0) + (s.low ?? 0) + (s.info ?? 0);
        setSummary({
          grade: data.grade ?? "N/A",
          score: data.score ?? 0,
          critical: s.critical ?? 0,
          high: s.high ?? 0,
          medium: s.medium ?? 0,
          low: s.low ?? 0,
          totalVulnerabilities: total,
        });
        setFindings(
          data.findings.map((f) => ({
            id: String(f.id),
            severity: f.severity as SeverityLevel,
            owaspCategory: f.owasp ?? "",
            file: f.file ?? "",
            line: f.line ?? 0,
            tool: f.tool,
            title: f.description ?? "",
            description: f.description ?? "",
            codeSnippet: "",
            fixedCode: "",
            fixExplanation: "",
          }))
        );
      });

    const loadFromProject = () =>
      getProjectFindings(id).then((data: ProjectFindingsResponse) => {
        if (cancelled) return;
        setSummary({
          grade: data.grade,
          score: data.score,
          critical: data.critical,
          high: data.high,
          medium: data.medium,
          low: data.low,
          totalVulnerabilities: data.totalVulnerabilities ?? 0,
        });
        setFindings(
          data.findings.map((f) => ({
            id: String(f.id),
            severity: f.severity,
            owaspCategory: f.owaspCategory ?? "",
            file: f.filePath ?? "",
            line: f.lineStart ?? 0,
            tool: f.tool,
            title: f.title,
            description: f.description ?? "",
            codeSnippet: "",
            fixedCode: "",
            fixExplanation: "",
          }))
        );
      });

    // En cas d'erreur API : ne pas afficher les données de démo, garder 0 vulnérabilités + message d'erreur
    const setErrorState = () => {
      setSummary({
        grade: "—",
        score: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        totalVulnerabilities: 0,
      });
      setFindings([]);
    };

    if (analysisId != null) {
      loadFromAnalysis()
        .catch((err) => {
          if (!cancelled) {
            setError(getErrorMessage(err, GENERIC_ERROR_MESSAGE));
            setErrorState();
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      loadFromProject()
        .catch((err) => {
          if (!cancelled) {
            setError(getErrorMessage(err, GENERIC_ERROR_MESSAGE));
            setErrorState();
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [projectId, analysisId]);

  return { summary, findings, loading, error };
}

export function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = getCurrentProjectId(location) ?? undefined;
  const analysisId = getCurrentAnalysisId(location) ?? undefined;

  useEffect(() => {
    if (projectId != null) setCurrentProjectId(projectId);
  }, [projectId]);
  useEffect(() => {
    if (analysisId != null) setCurrentAnalysisId(analysisId);
  }, [analysisId]);

  useEffect(() => {
    if (projectId === null && analysisId === null) navigate("/submit", { replace: true });
  }, [projectId, analysisId, navigate]);

  const { summary, findings, loading, error } = useFindingsData(projectId, analysisId);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMessage, setApplyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const handleApplyCorrections = async () => {
    if (analysisId == null) return;
    setApplyMessage(null);
    setApplyLoading(true);
    try {
      const result = await applyCorrections(analysisId);
      if (result.pullRequestUrl) {
        setApplyMessage({ type: "success", text: "PR créée. Ouverture dans un nouvel onglet." });
        window.open(result.pullRequestUrl, "_blank");
      } else if (result.zipDownloaded) {
        setApplyMessage({ type: "success", text: "ZIP corrigé téléchargé." });
      } else if (result.correctionsApplied != null) {
        setApplyMessage({ type: "success", text: `${result.correctionsApplied} correction(s) appliquée(s).` });
      }
    } catch (err) {
      setApplyMessage({ type: "error", text: getErrorMessage(err, GENERIC_ERROR_MESSAGE) });
    } finally {
      setApplyLoading(false);
    }
  };

  const handleExportReportPdf = async () => {
    if (analysisId == null) return;
    setReportLoading(true);
    setApplyMessage(null);
    try {
      await downloadAnalysisReport(analysisId);
      setApplyMessage({ type: "success", text: "Rapport PDF téléchargé." });
    } catch (err) {
      setApplyMessage({ type: "error", text: getErrorMessage(err, "Impossible de télécharger le rapport.") });
    } finally {
      setReportLoading(false);
    }
  };

  const severityData = [
    { name: "Critique", value: summary.critical, color: "var(--severity-critical)" },
    { name: "Haute", value: summary.high, color: "var(--severity-high)" },
    { name: "Moyenne", value: summary.medium, color: "var(--severity-medium)" },
    { name: "Basse", value: summary.low, color: "var(--severity-low)" },
  ];

  // Données OWASP pour BarChart empilé : les 10 catégories (même à 0), par sévérité
  const owaspChartData = owaspCategories.map((fullLabel) => {
    const code = fullLabel.slice(0, 3);
    const label = fullLabel.replace(/:\d{4}\s*-\s*/, " - ");
    const categoryFindings = findings.filter(
      (f) => (f.owaspCategory || "").startsWith(code)
    );
    return {
      name: label,
      label,
      critical: categoryFindings.filter((f) => f.severity === "critical").length,
      high: categoryFindings.filter((f) => f.severity === "high").length,
      medium: categoryFindings.filter((f) => f.severity === "medium").length,
      low: categoryFindings.filter((f) => f.severity === "low").length,
      total: categoryFindings.filter((f) => SEVERITY_LEVELS.includes(f.severity)).length,
    };
  });

  const topVulnerabilities = findings.slice(0, 5);

  if (projectId === null && analysisId === null) return <Navigate to="/submit" replace />;

  const dashboardContent = (
    <>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-[var(--primary)] shrink-0" />
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl truncate">Tableau de bord SecureScan</h1>
              <p className="text-muted-foreground text-sm sm:text-base truncate">
                {projectId ? `Projet #${projectId}` : analysisId ? `Analyse #${analysisId}` : "example-nodejs-app"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                navigate("/findings", {
                  state: {
                    projectId: projectId ?? null,
                    analysisId: analysisId ?? null,
                  },
                })
              }
              className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 shrink-0"
            >
              Voir toutes les vulnérabilités
            </Button>
            {analysisId != null && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleExportReportPdf}
                  disabled={reportLoading}
                  className="gap-2 shrink-0"
                >
                  {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  Exporter le rapport PDF
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleApplyCorrections}
                  disabled={applyLoading}
                  className="gap-2 shrink-0"
                >
                  {applyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Appliquer les modifications
                </Button>
              </>
            )}
          </div>
        </div>

        {applyMessage && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${applyMessage.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}
          >
            {applyMessage.text}
          </div>
        )}

        <div
          key="dashboard-error"
          className={error ? "mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex flex-wrap items-center gap-3" : "hidden"}
          aria-hidden={!error}
        >
          <span className="flex-1">{error ?? ""}</span>
          <Button variant="outline" size="sm" className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100" onClick={() => navigate("/submit")}>
            Relancer une analyse
          </Button>
        </div>

        <div key="dashboard-loading" className={loading ? "" : "hidden"} aria-hidden={!loading}>
          <Card className="p-8 mb-6 shadow-md">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="h-12 w-48 bg-muted rounded" />
              <div className="h-4 w-64 bg-muted rounded" />
            </div>
          </Card>
        </div>
        <div key="dashboard-content" className={loading ? "hidden" : ""} aria-hidden={loading}>
          <>
            {/* Bloc résumé : badge grade, score/100, 4 compteurs, barre de progression */}
            <Card className="p-6 sm:p-8 mb-6 shadow-md">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">
                Résumé de l&apos;analyse
              </h2>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-4">
                    <ScoreBadge
                      grade={summary.grade}
                      score={summary.score}
                      className="text-xl px-4 py-2"
                    />
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-foreground">
                        {summary.score}
                        <span className="text-muted-foreground font-normal text-lg">
                          /100
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {totalFromSummary(summary)} vulnérabilité(s) détectée(s)
                      </p>
                    </div>
                  </div>
                  <div className="w-full max-w-xs sm:max-w-sm">
                    <p className="text-sm text-muted-foreground mb-2">Score</p>
                    <Progress value={summary.score} className="h-3" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-card min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: "var(--severity-critical)" }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Critique</p>
                      <p className="text-xl font-semibold tabular-nums">
                        {summary.critical}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-card min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: "var(--severity-high)" }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Haute</p>
                      <p className="text-xl font-semibold tabular-nums">
                        {summary.high}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-card min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: "var(--severity-medium)" }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Moyenne</p>
                      <p className="text-xl font-semibold tabular-nums">
                        {summary.medium}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-card min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: "var(--severity-low)" }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Basse</p>
                      <p className="text-xl font-semibold tabular-nums">
                        {summary.low}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Répartition par gravité et OWASP : affichage simple sans Recharts (évite erreur insertBefore) */}
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <Card className="p-4 sm:p-6 shadow-md overflow-hidden">
                <h3 className="mb-4">Répartition par gravité</h3>
                <ul className="space-y-3">
                  {severityData.map((entry, index) => (
                    <li key={index} className="flex items-center justify-between gap-4">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm flex-1 min-w-0">{entry.name}</span>
                      <span className="text-sm font-medium tabular-nums">{entry.value}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-4 sm:p-6 shadow-md overflow-hidden">
                <h3 className="mb-1 text-lg font-semibold">Distribution par catégorie OWASP</h3>
                <p className="text-xs text-muted-foreground mb-4">Top 10 OWASP — répartition par gravité</p>
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
                  {owaspChartData.map((row, index) => {
                    const total = (row.critical ?? 0) + (row.high ?? 0) + (row.medium ?? 0) + (row.low ?? 0);
                    const code = row.name?.slice(0, 3) ?? `A${String(index + 1).padStart(2, "0")}`;
                    return (
                      <div
                        key={index}
                        className="rounded-lg border border-border/60 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span
                            className="text-sm font-medium text-foreground truncate min-w-0"
                            title={row.label}
                          >
                            <span className="inline-block font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-2">
                              {code}
                            </span>
                            {row.label.length > 32 ? row.label.slice(0, 30) + "…" : row.label}
                          </span>
                          <span
                            className="shrink-0 tabular-nums text-sm font-semibold min-w-[1.75rem] text-right"
                            aria-label={`${total} vulnérabilité(s)`}
                          >
                            {total}
                          </span>
                        </div>
                        <div className="h-2.5 bg-muted/80 rounded-full overflow-hidden flex shadow-inner">
                          <div
                            className="h-full min-w-0 transition-[width] ease-out"
                            style={{ width: `${(100 * (row.critical ?? 0)) / (total || 1)}%`, backgroundColor: SEVERITY_COLORS.critical }}
                            title="Critique"
                          />
                          <div
                            className="h-full min-w-0 transition-[width] ease-out"
                            style={{ width: `${(100 * (row.high ?? 0)) / (total || 1)}%`, backgroundColor: SEVERITY_COLORS.high }}
                            title="Haute"
                          />
                          <div
                            className="h-full min-w-0 transition-[width] ease-out"
                            style={{ width: `${(100 * (row.medium ?? 0)) / (total || 1)}%`, backgroundColor: SEVERITY_COLORS.medium }}
                            title="Moyenne"
                          />
                          <div
                            className="h-full min-w-0 transition-[width] ease-out"
                            style={{ width: `${(100 * (row.low ?? 0)) / (total || 1)}%`, backgroundColor: SEVERITY_COLORS.low }}
                            title="Basse"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/60 text-[10px] text-muted-foreground">
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: SEVERITY_COLORS.critical }} /> Critique</span>
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: SEVERITY_COLORS.high }} /> Haute</span>
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: SEVERITY_COLORS.medium }} /> Moyenne</span>
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: SEVERITY_COLORS.low }} /> Basse</span>
                </div>
              </Card>
            </div>

            {/* Top vulnérabilités */}
            <Card className="p-4 sm:p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3>Vulnérabilités principales</h3>
                <AlertCircle
                  className="w-5 h-5 shrink-0"
                  style={{ color: "var(--severity-critical)" }}
                />
              </div>
              <div className="space-y-3">
                {topVulnerabilities.map((vuln) => (
                  <div
                    key={vuln.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 bg-card hover:bg-accent rounded-lg transition-colors cursor-pointer border"
                    onClick={() =>
                      navigate("/findings", {
                        state: { projectId: projectId ?? null, analysisId: analysisId ?? null },
                      })
                    }
                  >
                    <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                      <SeverityBadge severity={vuln.severity} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{vuln.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {shortFilePath(vuln.file)}:{vuln.line}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground shrink-0">
                      {vuln.tool}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        </div>
    </>
  );

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <ChartErrorBoundary
          fallback={
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Shield className="w-10 h-10 text-[var(--primary)] shrink-0" />
                  <div>
                    <h1 className="text-2xl sm:text-3xl">Tableau de bord SecureScan</h1>
                    <p className="text-muted-foreground text-sm">{projectId ? `Projet #${projectId}` : `Analyse #${analysisId}`}</p>
                  </div>
                </div>
                <Button
                  onClick={() =>
                    navigate("/findings", {
                      state: { projectId: projectId ?? null, analysisId: analysisId ?? null },
                    })
                  }
                  className="bg-[var(--primary)] hover:bg-[var(--primary)]/90"
                >
                  Voir toutes les vulnérabilités
                </Button>
              </div>
              <Card className="p-6">
                <p className="text-muted-foreground text-sm">
                  Une erreur d&apos;affichage s&apos;est produite. Utilisez le bouton ci-dessus pour accéder aux vulnérabilités, ou rechargez la page.
                </p>
              </Card>
            </div>
          }
        >
          {dashboardContent}
        </ChartErrorBoundary>
      </div>
    </div>
  );
}
