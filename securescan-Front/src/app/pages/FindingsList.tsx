import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { SeverityBadge } from "../components/SeverityBadge";
import { Shield, Search, ArrowLeft, ExternalLink, X } from "lucide-react";
import {
  mockVulnerabilities,
  owaspCategories,
  scanTools,
  Vulnerability,
} from "../data/mockData";

export function FindingsList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [owaspFilter, setOwaspFilter] = useState<string>("all");
  const [toolFilter, setToolFilter] = useState<string>("all");
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);

  // Fermer le Sheet à la navigation pour éviter les erreurs removeChild (portail Radix)
  useEffect(() => {
    setSelectedVuln(null);
  }, [location.pathname]);

  const filteredVulnerabilities = mockVulnerabilities.filter((vuln) => {
    const matchesSearch =
      vuln.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vuln.file.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vuln.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity =
      severityFilter === "all" || vuln.severity === severityFilter;

    const matchesOwasp =
      owaspFilter === "all" || vuln.owaspCategory === owaspFilter;

    const matchesTool = toolFilter === "all" || vuln.tool === toolFilter;

    return matchesSearch && matchesSeverity && matchesOwasp && matchesTool;
  });

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <Shield className="w-8 h-8 text-[var(--primary)]" />
            <div>
              <h1 className="text-3xl">Security Findings</h1>
              <p className="text-muted-foreground">
                {filteredVulnerabilities.length} vulnerabilities found
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-md">
          {/* Filters */}
          <div className="p-6 border-b">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search findings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={owaspFilter} onValueChange={setOwaspFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="OWASP Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {owaspCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.split(" - ")[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={toolFilter} onValueChange={setToolFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tool" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tools</SelectItem>
                  {scanTools.map((tool) => (
                    <SelectItem key={tool} value={tool}>
                      {tool}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>OWASP Category</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">Line</TableHead>
                  <TableHead>Tool</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVulnerabilities.map((vuln) => (
                  <TableRow
                    key={vuln.id}
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => setSelectedVuln(vuln)}
                  >
                    <TableCell>
                      <SeverityBadge severity={vuln.severity} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {vuln.owaspCategory.split(" - ")[0]}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {vuln.file}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {vuln.line}
                    </TableCell>
                    <TableCell className="text-sm">{vuln.tool}</TableCell>
                    <TableCell className="text-sm max-w-md truncate">
                      {vuln.title}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Finding Details Drawer */}
      <Sheet open={!!selectedVuln} onOpenChange={() => setSelectedVuln(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedVuln && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  <span>Vulnerability Details</span>
                  <SeverityBadge severity={selectedVuln.severity} />
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Title and Location */}
                <div>
                  <h3 className="text-xl mb-2">{selectedVuln.title}</h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedVuln.file}:{selectedVuln.line}
                  </p>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-accent rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      OWASP Category
                    </p>
                    <p className="text-sm font-medium">
                      {selectedVuln.owaspCategory}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Detected by
                    </p>
                    <p className="text-sm font-medium">{selectedVuln.tool}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedVuln.description}
                  </p>
                </div>

                {/* Code Snippet */}
                <div>
                  <h4 className="mb-2">Vulnerable Code</h4>
                  <pre className="p-4 bg-red-50 rounded-lg overflow-x-auto text-sm border border-red-200">
                    <code>{selectedVuln.codeSnippet}</code>
                  </pre>
                </div>

                {/* Fix Explanation */}
                <div>
                  <h4 className="mb-2">Suggested Fix</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {selectedVuln.fixExplanation}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-[var(--primary)] hover:bg-[var(--primary)]/90"
                    onClick={() => navigate(`/fix/${selectedVuln.id}`)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Fix
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Accept
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Reject
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
