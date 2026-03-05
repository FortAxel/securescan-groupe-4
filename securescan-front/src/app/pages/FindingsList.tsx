import { useState, useEffect } from "react";
import { useNavigate, useLocation, Navigate } from "react-router";
import { getCurrentProjectId, getCurrentAnalysisId, setCurrentProjectId, setCurrentAnalysisId } from "../lib/flow";
import { getAnalysisResults } from "../api/analysis";
import { getProjectFindings } from "../api/projects";
import { applyCorrections } from "../api/apply";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { SeverityBadge } from "../components/SeverityBadge";
import { Shield, Search, ArrowLeft, Send, Loader2, AlertTriangle, ChevronRight } from "lucide-react";
import { shortFilePath } from "../lib/filePath";
import { owaspCategories, scanTools } from "../data/mockData";
import { getErrorMessage, GENERIC_ERROR_MESSAGE } from "../lib/errors";
import type { SeverityLevel } from "../constants/severity";
import { normalizeSeverity } from "../constants/severity";

type FindingItem = {
  id: string;
  severity: SeverityLevel;
  owaspCategory: string;
  file: string;
  line: number;
  tool: string;
  title: string;
  description: string;
};

export function FindingsList() {
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = getCurrentProjectId(location) ?? undefined;
  const analysisId = getCurrentAnalysisId(location) ?? undefined;
  console.log('[FindingsList] projectId:', projectId, 'analysisId:', analysisId);

  // Garder la session alignée avec le contexte (state ou session) pour rafraîchissement / autres navigations
  useEffect(() => {
    if (projectId != null) setCurrentProjectId(projectId);
    if (analysisId != null) setCurrentAnalysisId(analysisId);
  }, [projectId, analysisId]);

  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMessage, setApplyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (projectId === null && analysisId === null) return;
    const id = analysisId ?? projectId;
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    let cancelled = false;

    if (analysisId != null) {
      getAnalysisResults(analysisId)
        .then((data) => {
          if (cancelled) return;
          setFindings(
            data.findings.map((f) => ({
              id: String(f.id),
              severity: normalizeSeverity(f.severity),
              owaspCategory: f.owasp ?? "",
              file: f.file ?? "",
              line: f.line ?? 0,
              tool: f.tool ?? "",
              title: f.description?.slice(0, 80) ?? "Finding",
              description: f.description ?? "",
            }))
          );
        })
        .catch((err) => {
          if (!cancelled) setLoadError(getErrorMessage(err, GENERIC_ERROR_MESSAGE));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      getProjectFindings(id!)
        .then((data) => {
          if (cancelled) return;
          setFindings(
            data.findings.map((f) => ({
              id: String(f.id),
              severity: normalizeSeverity(f.severity),
              owaspCategory: f.owaspCategory ?? "",
              file: f.filePath ?? "",
              line: f.lineStart ?? 0,
              tool: f.tool ?? "",
              title: f.title ?? "",
              description: f.description ?? "",
            }))
          );
        })
        .catch((err) => {
          if (!cancelled) setLoadError(getErrorMessage(err, GENERIC_ERROR_MESSAGE));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [projectId, analysisId]);

  useEffect(() => {
    if (projectId === null && analysisId === null) navigate("/submit", { replace: true });
  }, [projectId, analysisId, navigate]);

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

  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [owaspFilter, setOwaspFilter] = useState<string>("all");
  const [toolFilter, setToolFilter] = useState<string>("all");

  const filteredFindings = findings.filter((vuln) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      vuln.title.toLowerCase().includes(q) ||
      vuln.file.toLowerCase().includes(q) ||
      vuln.description.toLowerCase().includes(q);
    const matchesSeverity = severityFilter === "all" || vuln.severity === severityFilter;
    const matchesOwasp = owaspFilter === "all" || vuln.owaspCategory.startsWith(owaspFilter) || vuln.owaspCategory.includes(owaspFilter);
    const matchesTool = toolFilter === "all" || vuln.tool.toLowerCase().includes(toolFilter.toLowerCase());
    return matchesSearch && matchesSeverity && matchesOwasp && matchesTool;
  });

  if (projectId === null && analysisId === null) return <Navigate to="/submit" replace />;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au tableau de bord
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <Shield className="w-8 h-8 text-[var(--primary)] shrink-0" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold">Vulnérabilités</h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  {loading ? "Chargement…" : `${filteredFindings.length} vulnérabilité(s) détectée(s)`}
                </p>
              </div>
            </div>
          </div>
          {analysisId != null && (
            <Button
              variant="secondary"
              onClick={handleApplyCorrections}
              disabled={applyLoading}
              className="gap-2 shrink-0"
            >
              {applyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Appliquer les modifs
            </Button>
          )}
        </div>

        {applyMessage && (
          <div
            className={`mb-6 p-3 rounded-lg text-sm ${applyMessage.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}
          >
            {applyMessage.text}
          </div>
        )}

        {loadError && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {loadError}
          </div>
        )}

        <Card className="shadow-md overflow-hidden">
          <div className="p-4 sm:p-6 border-b bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher (fichier, titre…)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Gravité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={owaspFilter} onValueChange={setOwaspFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="OWASP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {owaspCategories.map((category) => (
                    <SelectItem key={category} value={category.split(" - ")[0]}>
                      {category.split(" - ")[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={toolFilter} onValueChange={setToolFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Outil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {scanTools.map((tool) => (
                    <SelectItem key={tool} value={tool}>
                      {tool}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">Chargement des vulnérabilités…</div>
            ) : filteredFindings.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                Aucune vulnérabilité ne correspond aux filtres.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Gravité</TableHead>
                    <TableHead className="w-[90px]">OWASP</TableHead>
                    <TableHead className="min-w-[140px]">Fichier</TableHead>
                    <TableHead className="w-[60px] text-right">Ligne</TableHead>
                    <TableHead className="w-[100px]">Outil</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFindings.map((vuln) => (
                    <TableRow
                      key={vuln.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() =>
                        navigate(`/fix/${vuln.id}`, {
                          state: { finding: vuln, projectId: projectId ?? null, analysisId: analysisId ?? null },
                        })
                      }
                    >
                      <TableCell>
                        <SeverityBadge severity={vuln.severity} />
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {vuln.owaspCategory ? vuln.owaspCategory.replace(/^([A0-9]+).*/, "$1") : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs sm:text-sm truncate max-w-[180px]" title={vuln.file}>
                        {shortFilePath(vuln.file) || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{vuln.line || "—"}</TableCell>
                      <TableCell className="text-sm">{vuln.tool || "—"}</TableCell>
                      <TableCell className="text-sm max-w-md truncate" title={vuln.title}>
                        {vuln.title || vuln.description || "—"}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
