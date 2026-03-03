import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { SeverityBadge } from "../components/SeverityBadge";
import { ScoreBadge } from "../components/ScoreBadge";
import { Progress } from "../components/ui/progress";
import { Shield, AlertCircle } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  mockVulnerabilities,
  mockSecurityScore,
  owaspCategories,
} from "../data/mockData";
import { getProjectFindings, type ProjectFindingsResponse } from "../api/projects";
import { getCurrentProjectId, setCurrentProjectId } from "../lib/flow";

// Constantes pour le graphique OWASP (spec: couleurs par sévérité)
const SEVERITY_COLORS = {
  critical: "var(--severity-critical)",
  high: "var(--severity-high)",
  medium: "var(--severity-medium)",
  low: "var(--severity-low)",
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

function useFindingsData(projectId: number | undefined) {
  const [summary, setSummary] = useState<SeverityCounts>({
    grade: mockSecurityScore.grade,
    score: mockSecurityScore.score,
    critical: mockSecurityScore.critical,
    high: mockSecurityScore.high,
    medium: mockSecurityScore.medium,
    low: mockSecurityScore.low,
    totalVulnerabilities: mockSecurityScore.totalVulnerabilities,
  });
  const [findings, setFindings] = useState(mockVulnerabilities);
  const [loading, setLoading] = useState(!!projectId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setSummary({
        grade: mockSecurityScore.grade,
        score: mockSecurityScore.score,
        critical: mockSecurityScore.critical,
        high: mockSecurityScore.high,
        medium: mockSecurityScore.medium,
        low: mockSecurityScore.low,
        totalVulnerabilities: mockSecurityScore.totalVulnerabilities,
      });
      setFindings(mockVulnerabilities);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProjectFindings(projectId)
      .then((data: ProjectFindingsResponse) => {
        if (cancelled) return;
        setSummary({
          grade: data.grade,
          score: data.score,
          critical: data.critical,
          high: data.high,
          medium: data.medium,
          low: data.low,
          totalVulnerabilities: data.totalVulnerabilities,
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
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? "Erreur lors du chargement");
          setSummary({
            grade: mockSecurityScore.grade,
            score: mockSecurityScore.score,
            critical: mockSecurityScore.critical,
            high: mockSecurityScore.high,
            medium: mockSecurityScore.medium,
            low: mockSecurityScore.low,
            totalVulnerabilities: mockSecurityScore.totalVulnerabilities,
          });
          setFindings(mockVulnerabilities);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return { summary, findings, loading, error };
}

export function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = getCurrentProjectId(location) ?? undefined;

  useEffect(() => {
    if (projectId) setCurrentProjectId(projectId);
  }, [projectId]);

  useEffect(() => {
    if (projectId === null) navigate("/submit", { replace: true });
  }, [projectId, navigate]);

  const { summary, findings, loading, error } = useFindingsData(projectId ?? undefined);

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
      total:
        categoryFindings.filter((f) =>
          ["critical", "high", "medium", "low"].includes(f.severity)
        ).length,
    };
  });

  const topVulnerabilities = findings.slice(0, 5);

  if (projectId === null) return null;

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-[var(--primary)] shrink-0" />
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl truncate">Tableau de bord SecureScan</h1>
              <p className="text-muted-foreground text-sm sm:text-base truncate">
                {projectId ? `Projet #${projectId}` : "example-nodejs-app"}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/findings")}
            className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 w-full sm:w-auto shrink-0"
          >
            Voir toutes les vulnérabilités
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            {error} — Données de démonstration affichées.
          </div>
        )}

        {loading ? (
          <Card className="p-8 mb-6 shadow-md">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="h-12 w-48 bg-muted rounded" />
              <div className="h-4 w-64 bg-muted rounded" />
            </div>
          </Card>
        ) : (
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
                        {summary.totalVulnerabilities} vulnérabilité(s) détectée(s)
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

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <Card className="p-4 sm:p-6 shadow-md overflow-hidden">
                <h3 className="mb-4">Répartition par gravité</h3>
                <div className="h-[260px] sm:h-[300px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="p-4 sm:p-6 shadow-md overflow-hidden">
                <h3 className="mb-4">
                  Distribution des résultats par catégorie OWASP
                </h3>
                <div className="h-[320px] sm:h-[380px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={owaspChartData}
                      layout="vertical"
                      margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        allowDecimals={false}
                        label={{
                          value: "Nombre de résultats",
                          position: "insideBottom",
                          offset: -4,
                        }}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={140}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) =>
                          v.length > 22 ? v.slice(0, 20) + "…" : v
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => [value, ""]}
                        labelFormatter={(label) => label}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) =>
                          value === "critical"
                            ? "Critique"
                            : value === "high"
                              ? "Haute"
                              : value === "medium"
                                ? "Moyenne"
                                : "Basse"
                        }
                      />
                      <Bar
                        dataKey="critical"
                        stackId="owasp"
                        fill={SEVERITY_COLORS.critical}
                        name="critical"
                      />
                      <Bar
                        dataKey="high"
                        stackId="owasp"
                        fill={SEVERITY_COLORS.high}
                        name="high"
                      />
                      <Bar
                        dataKey="medium"
                        stackId="owasp"
                        fill={SEVERITY_COLORS.medium}
                        name="medium"
                      />
                      <Bar
                        dataKey="low"
                        stackId="owasp"
                        fill={SEVERITY_COLORS.low}
                        name="low"
                      />
                    </BarChart>
                  </ResponsiveContainer>
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
                    onClick={() => navigate("/findings")}
                  >
                    <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                      <SeverityBadge severity={vuln.severity} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{vuln.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {vuln.file}:{vuln.line}
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
        )}
      </div>
    </div>
  );
}
