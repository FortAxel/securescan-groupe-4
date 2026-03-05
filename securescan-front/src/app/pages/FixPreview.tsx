import { useParams, useNavigate, useLocation, Navigate } from "react-router";
import { useEffect } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { SeverityBadge } from "../components/SeverityBadge";
import { ArrowLeft, Check, X, FileCode, Wrench, Info } from "lucide-react";
import { mockVulnerabilities } from "../data/mockData";
import { getCurrentProjectId, getCurrentAnalysisId } from "../lib/flow";

type FindingFromState = {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  owaspCategory: string;
  file: string;
  line: number;
  tool: string;
  title: string;
  description: string;
};

export function FixPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = getCurrentProjectId(location);
  const analysisId = getCurrentAnalysisId(location);
  const findingFromState = (location.state as { finding?: FindingFromState })?.finding;

  useEffect(() => {
    if (projectId === null && analysisId === null) navigate("/submit", { replace: true });
  }, [projectId, analysisId, navigate]);

  const mockVuln = mockVulnerabilities.find((v) => v.id === id);
  const hasFullFix = !!mockVuln?.codeSnippet && !!mockVuln?.fixedCode;
  const vulnerability = findingFromState ?? mockVuln;

  if (projectId === null && analysisId === null) return <Navigate to="/submit" replace />;

  if (!vulnerability) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Vulnérabilité introuvable.</p>
        <Button variant="outline" onClick={() => navigate("/findings")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux vulnérabilités
        </Button>
      </div>
    );
  }

  const severity = "severity" in vulnerability ? vulnerability.severity : "medium";
  const title = "title" in vulnerability ? vulnerability.title : (vulnerability as { title?: string }).title ?? "";
  const file = "file" in vulnerability ? vulnerability.file : (vulnerability as { file?: string }).file ?? "";
  const line = "line" in vulnerability ? vulnerability.line : (vulnerability as { line?: number }).line ?? 0;
  const owaspCategory = "owaspCategory" in vulnerability ? vulnerability.owaspCategory : (vulnerability as { owaspCategory?: string }).owaspCategory ?? "";
  const tool = "tool" in vulnerability ? vulnerability.tool : (vulnerability as { tool?: string }).tool ?? "";
  const description = "description" in vulnerability ? vulnerability.description : (vulnerability as { description?: string }).description ?? "";
  const codeSnippet = "codeSnippet" in vulnerability ? (vulnerability as { codeSnippet?: string }).codeSnippet : "";
  const fixedCode = "fixedCode" in vulnerability ? (vulnerability as { fixedCode?: string }).fixedCode : "";
  const fixExplanation = "fixExplanation" in vulnerability ? (vulnerability as { fixExplanation?: string }).fixExplanation : "";

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/findings")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux vulnérabilités
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-2xl font-semibold">Correctif suggéré</h1>
                <SeverityBadge severity={severity as "critical" | "high" | "medium" | "low" | "info"} />
              </div>
              <p className="text-muted-foreground text-sm">{title || "Détail de la vulnérabilité"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/findings")} className="gap-2">
              <X className="w-4 h-4" />
              Rejeter
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Check className="w-4 h-4" />
              Accepter
            </Button>
          </div>
        </div>

        <Card className="p-5 mb-6 shadow-sm border rounded-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Fichier</p>
                <p className="font-mono text-sm break-all">{file || "—"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Ligne</p>
              <p className="font-mono text-sm">{line || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">OWASP</p>
              <p className="text-sm">{owaspCategory || "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Outil</p>
                <p className="text-sm">{tool || "—"}</p>
              </div>
            </div>
          </div>
        </Card>

        {description && (
          <Card className="p-5 mb-6 shadow-sm border rounded-xl bg-muted/30">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Description
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </Card>
        )}

        {hasFullFix && fixExplanation && (
          <Card className="p-5 mb-6 shadow-sm border rounded-xl bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-medium mb-2">Ce qui est corrigé</h3>
            <p className="text-sm text-muted-foreground">{fixExplanation}</p>
          </Card>
        )}

        {hasFullFix && codeSnippet && fixedCode ? (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-sm overflow-hidden rounded-xl border-red-200 dark:border-red-900/50">
              <div className="bg-red-50 dark:bg-red-950/40 border-b px-4 py-2.5">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Avant (code vulnérable)</h3>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-xs font-mono text-red-900 dark:text-red-200 whitespace-pre-wrap break-words">
                  <code>{codeSnippet}</code>
                </pre>
              </div>
            </Card>
            <Card className="shadow-sm overflow-hidden rounded-xl border-emerald-200 dark:border-emerald-900/50">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b px-4 py-2.5">
                <h3 className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Après (code corrigé)</h3>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-xs font-mono text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap break-words">
                  <code>{fixedCode}</code>
                </pre>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="p-6 shadow-sm border rounded-xl bg-muted/20">
            <p className="text-sm text-muted-foreground text-center">
              Aucun correctif détaillé (avant/après) n’est disponible pour cette vulnérabilité. Consultez la description et le fichier indiqué pour appliquer les corrections manuellement.
            </p>
          </Card>
        )}

        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Button variant="outline" size="lg" onClick={() => navigate("/findings")} className="gap-2">
            <X className="w-5 h-5" />
            Rejeter le correctif
          </Button>
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            onClick={() => {
              navigate("/findings");
            }}
          >
            <Check className="w-5 h-5" />
            Accepter le correctif
          </Button>
        </div>
      </div>
    </div>
  );
}
