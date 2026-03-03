import { useNavigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { SeverityBadge } from "../components/SeverityBadge";
import { Shield, AlertCircle, TrendingDown } from "lucide-react";
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
import { mockVulnerabilities, mockSecurityScore } from "../data/mockData";

export function Dashboard() {
  const navigate = useNavigate();

  const severityData = [
    {
      name: "Critical",
      value: mockSecurityScore.critical,
      color: "var(--severity-critical)",
    },
    {
      name: "High",
      value: mockSecurityScore.high,
      color: "var(--severity-high)",
    },
    {
      name: "Medium",
      value: mockSecurityScore.medium,
      color: "var(--severity-medium)",
    },
    {
      name: "Low",
      value: mockSecurityScore.low,
      color: "var(--severity-low)",
    },
  ];

  // Count OWASP categories
  const owaspCounts = mockVulnerabilities.reduce((acc, vuln) => {
    const category = vuln.owaspCategory.split(" - ")[0];
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const owaspData = Object.entries(owaspCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const topVulnerabilities = mockVulnerabilities.slice(0, 5);

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: "text-green-600",
      B: "text-green-500",
      C: "text-yellow-600",
      D: "text-orange-600",
      F: "text-red-600",
    };
    return colors[grade] || "text-gray-600";
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-[var(--primary)]" />
            <div>
              <h1 className="text-3xl">SecureScan Dashboard</h1>
              <p className="text-muted-foreground">
                Project: example-nodejs-app
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/findings")}
            className="bg-[var(--primary)] hover:bg-[var(--primary)]/90"
          >
            View All Findings
          </Button>
        </div>

        {/* Security Score Card */}
        <Card className="p-8 mb-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl mb-1">Security Score</h2>
              <p className="text-muted-foreground">
                Based on {mockSecurityScore.totalVulnerabilities} detected
                vulnerabilities
              </p>
            </div>
            <div className="text-center">
              <div
                className={`text-6xl mb-2 ${getGradeColor(
                  mockSecurityScore.grade
                )}`}
              >
                {mockSecurityScore.grade}
              </div>
              <div className="text-2xl text-muted-foreground">
                {mockSecurityScore.score}/100
              </div>
            </div>
          </div>
        </Card>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Severity Distribution */}
          <Card className="p-6 shadow-md">
            <h3 className="mb-4">Severity Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* OWASP Top 10 Distribution */}
          <Card className="p-6 shadow-md">
            <h3 className="mb-4">OWASP Top 10 Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={owaspData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Top Vulnerabilities */}
        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3>Top Vulnerabilities</h3>
            <AlertCircle className="w-5 h-5 text-[var(--severity-critical)]" />
          </div>
          <div className="space-y-3">
            {topVulnerabilities.map((vuln) => (
              <div
                key={vuln.id}
                className="flex items-center justify-between p-4 bg-card hover:bg-accent rounded-lg transition-colors cursor-pointer border"
                onClick={() => navigate("/findings")}
              >
                <div className="flex items-center gap-4 flex-1">
                  <SeverityBadge severity={vuln.severity} />
                  <div className="flex-1">
                    <p className="font-medium">{vuln.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {vuln.file}:{vuln.line}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {vuln.tool}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card className="p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[var(--severity-critical)]" />
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl">{mockSecurityScore.critical}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[var(--severity-high)]" />
              <div>
                <p className="text-sm text-muted-foreground">High</p>
                <p className="text-2xl">{mockSecurityScore.high}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[var(--severity-medium)]" />
              <div>
                <p className="text-sm text-muted-foreground">Medium</p>
                <p className="text-2xl">{mockSecurityScore.medium}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[var(--severity-low)]" />
              <div>
                <p className="text-sm text-muted-foreground">Low</p>
                <p className="text-2xl">{mockSecurityScore.low}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
