import { useState, useEffect } from "react";
import { useNavigate, Link, Navigate } from "react-router";
import { isLoggedIn } from "../lib/auth";
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
import { ScoreBadge } from "../components/ScoreBadge";
import { StatusBadge } from "../components/StatusBadge";
import { Shield, Search, ArrowUpDown, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { getMyScans, type ScanReportFromApi } from "../api/me";
import { setCurrentProjectId, setCurrentAnalysisId } from "../lib/flow";
import { getErrorMessage, GENERIC_ERROR_MESSAGE } from "../lib/errors";

type SortField = "date" | "score" | "projectName";
type SortDirection = "asc" | "desc";

export function ReportHistory() {
  const navigate = useNavigate();

  const [scans, setScans] = useState<ScanReportFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [allowed] = useState(() => isLoggedIn());

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!allowed) return;
    setLoading(true);
    setLoadError(null);
    getMyScans()
      .then(setScans)
      .catch((err) => {
        setScans([]);
        setLoadError(getErrorMessage(err, GENERIC_ERROR_MESSAGE));
      })
      .finally(() => setLoading(false));
  }, [allowed]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const reportDate = (r: ScanReportFromApi) =>
    r.createdAt ? new Date(r.createdAt).getTime() : new Date(r.date).getTime();

  const filteredAndSortedReports = scans
    .filter((report) => {
      const matchesSearch = report.projectName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || report.status === statusFilter;

      const ts = reportDate(report);
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "this-week" &&
          ts > Date.now() - 7 * 24 * 60 * 60 * 1000) ||
        (dateFilter === "this-month" &&
          new Date(ts).getMonth() === new Date().getMonth());

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = reportDate(a) - reportDate(b);
      } else if (sortField === "score") {
        comparison = a.score - b.score;
      } else if (sortField === "projectName") {
        comparison = a.projectName.localeCompare(b.projectName);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

  // Calculate summary stats
  const completedScans = scans.filter(
    (r) => r.status === "completed"
  ).length;
  const avgScore =
    scans
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + r.score, 0) /
    (completedScans || 1);
  const totalVulnerabilities = scans
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + r.totalVulnerabilities, 0);

  if (!allowed) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen p-6">
      <div
        key="history-loading"
        className={loading ? "fixed inset-0 z-10 flex items-center justify-center bg-background/80" : "hidden"}
        aria-hidden={!loading}
        aria-busy={loading}
      >
        <p className="text-muted-foreground">Chargement de l&apos;historique...</p>
      </div>
      <div className={loading ? "opacity-0 pointer-events-none select-none" : ""}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-[var(--primary)]" />
            <div>
              <h1 className="text-3xl">Historique des scans</h1>
              <p className="text-muted-foreground">
                Suivez vos analyses de sécurité dans le temps
              </p>
            </div>
          </div>
          <Button asChild className="bg-[var(--primary)] hover:bg-[var(--primary)]/90">
            <Link to="/submit">Nouveau scan</Link>
          </Button>
        </div>

        <div
          key="history-loadError"
          className={loadError ? "mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800" : "hidden"}
          aria-hidden={!loadError}
        >
          L’historique des scans sera affiché ici lorsque le backend exposera les données de votre compte. En attendant, vous pouvez lancer une analyse depuis Soumettre.
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Total des scans
                </p>
                <p className="text-2xl">{scans.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Terminés
                </p>
                <p className="text-2xl">{completedScans}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Score moyen
                </p>
                <p className="text-2xl">{avgScore.toFixed(0)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-lg text-blue-700">
                  {avgScore >= 80 ? "A" : avgScore >= 70 ? "B" : avgScore >= 60 ? "C" : "D"}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Vulnérabilités totales
                </p>
                <p className="text-2xl">{totalVulnerabilities}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
        </div>

        <Card className="shadow-md">
          {/* Filters */}
          <div className="p-6 border-b">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom de projet..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="running">En cours</SelectItem>
                  <SelectItem value="failed">Échoué</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tout</SelectItem>
                  <SelectItem value="this-week">Cette semaine</SelectItem>
                  <SelectItem value="this-month">Ce mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => handleSort("projectName")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Projet
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("date")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Date
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("score")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Score
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </TableHead>
                  <TableHead className="text-center">Critique</TableHead>
                  <TableHead className="text-center">Élevé</TableHead>
                  <TableHead className="text-center">Moyen</TableHead>
                  <TableHead className="text-center">Faible</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedReports.map((report) => (
                  <TableRow
                    key={report.id}
                    className="hover:bg-accent cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--primary)]"></div>
                        <span className="font-medium">{report.projectName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {report.date}
                    </TableCell>
                    <TableCell>
                      {report.status === "completed" ? (
                        <ScoreBadge grade={report.grade} score={report.score} />
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {report.status === "completed" ? (
                        <span
                          className={
                            report.critical > 0
                              ? "text-[var(--severity-critical)] font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {report.critical}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {report.status === "completed" ? (
                        <span
                          className={
                            report.high > 0
                              ? "text-[var(--severity-high)] font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {report.high}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {report.status === "completed" ? (
                        <span
                          className={
                            report.medium > 0
                              ? "text-[var(--severity-medium)] font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {report.medium}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {report.status === "completed" ? (
                        <span
                          className={
                            report.low > 0
                              ? "text-[var(--severity-low)] font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {report.low}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={report.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={report.status === "completed" ? "inline-flex" : "hidden"} key={`${report.id}-completed`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCurrentProjectId(report.projectId);
                            setCurrentAnalysisId(Number(report.id));
                            navigate("/dashboard", { state: { projectId: report.projectId, analysisId: Number(report.id) } });
                          }}
                        >
                          Voir le rapport
                        </Button>
                      </span>
                      <span className={report.status === "running" ? "inline-flex" : "hidden"} key={`${report.id}-running`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCurrentProjectId(report.projectId);
                            setCurrentAnalysisId(Number(report.id));
                            navigate("/dashboard", { state: { projectId: report.projectId, analysisId: Number(report.id) } });
                          }}
                        >
                          Voir la progression
                        </Button>
                      </span>
                      <span className={report.status === "failed" ? "inline-flex" : "hidden"} key={`${report.id}-failed`}>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          Réessayer
                        </Button>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div
            key="history-empty"
            className={filteredAndSortedReports.length === 0 && !loading ? "p-12 text-center space-y-2" : "hidden"}
            aria-hidden={!(filteredAndSortedReports.length === 0 && !loading)}
          >
            <p className="text-muted-foreground">
              {scans.length === 0 && !loadError
                ? "Aucun scan pour le moment. Lancez une analyse depuis Soumettre."
                : "Aucun scan trouvé pour ces critères."}
            </p>
            <span className={scans.length === 0 && !loadError ? "inline-flex" : "hidden"}>
              <Button
                variant="outline"
                onClick={() => navigate("/submit")}
                className="mt-2"
              >
                Lancer un scan
              </Button>
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
