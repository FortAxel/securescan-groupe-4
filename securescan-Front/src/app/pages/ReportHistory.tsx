import { useState } from "react";
import { useNavigate } from "react-router";
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
import { mockScanReports } from "../data/scanReports";

type SortField = "date" | "score" | "projectName";
type SortDirection = "asc" | "desc";

export function ReportHistory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredAndSortedReports = mockScanReports
    .filter((report) => {
      const matchesSearch = report.projectName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || report.status === statusFilter;

      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "this-week" &&
          new Date(report.date).getTime() >
            Date.now() - 7 * 24 * 60 * 60 * 1000) ||
        (dateFilter === "this-month" &&
          new Date(report.date).getMonth() === new Date().getMonth());

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortField === "date") {
        comparison =
          new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === "score") {
        comparison = a.score - b.score;
      } else if (sortField === "projectName") {
        comparison = a.projectName.localeCompare(b.projectName);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

  // Calculate summary stats
  const completedScans = mockScanReports.filter(
    (r) => r.status === "completed"
  ).length;
  const avgScore =
    mockScanReports
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + r.score, 0) /
    (completedScans || 1);
  const totalVulnerabilities = mockScanReports
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + r.totalVulnerabilities, 0);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
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
          <Button
            onClick={() => navigate("/submit")}
            className="bg-[var(--primary)] hover:bg-[var(--primary)]/90"
          >
            Nouveau scan
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Total des scans
                </p>
                <p className="text-2xl">{mockScanReports.length}</p>
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
                      {report.status === "completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate("/dashboard")}
                        >
                          Voir le rapport
                        </Button>
                      )}
                      {report.status === "running" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate("/scan")}
                        >
                          Voir la progression
                        </Button>
                      )}
                      {report.status === "failed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                        >
                          Réessayer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredAndSortedReports.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">Aucun scan trouvé pour ces critères</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
