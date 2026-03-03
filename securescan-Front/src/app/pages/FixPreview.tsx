import { useParams, useNavigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { SeverityBadge } from "../components/SeverityBadge";
import { ArrowLeft, Check, X } from "lucide-react";
import { mockVulnerabilities } from "../data/mockData";

export function FixPreview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const vulnerability = mockVulnerabilities.find((v) => v.id === id);

  if (!vulnerability) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p>Vulnerability not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/findings")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Findings
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl">Fix Preview</h1>
                <SeverityBadge severity={vulnerability.severity} />
              </div>
              <p className="text-muted-foreground">{vulnerability.title}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/findings")}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Reject Fix
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 gap-2">
              <Check className="w-4 h-4" />
              Accept Fix
            </Button>
          </div>
        </div>

        {/* File Info */}
        <Card className="p-4 mb-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">File</p>
              <p className="font-mono">{vulnerability.file}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Line</p>
              <p className="font-mono">{vulnerability.line}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                OWASP Category
              </p>
              <p className="text-sm">{vulnerability.owaspCategory}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Detected by</p>
              <p className="text-sm">{vulnerability.tool}</p>
            </div>
          </div>
        </Card>

        {/* Fix Explanation */}
        <Card className="p-6 mb-6 shadow-md bg-blue-50">
          <h3 className="mb-3">What's being fixed</h3>
          <p className="text-muted-foreground">
            {vulnerability.fixExplanation}
          </p>
        </Card>

        {/* Side-by-side Diff */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Before */}
          <Card className="shadow-md overflow-hidden">
            <div className="bg-red-100 border-b border-red-200 px-6 py-3">
              <h3 className="text-red-700">Before (Vulnerable Code)</h3>
            </div>
            <div className="p-6">
              <pre className="text-sm overflow-x-auto">
                <code className="text-red-900">
                  {vulnerability.codeSnippet}
                </code>
              </pre>
            </div>
          </Card>

          {/* After */}
          <Card className="shadow-md overflow-hidden">
            <div className="bg-green-100 border-b border-green-200 px-6 py-3">
              <h3 className="text-green-700">After (Fixed Code)</h3>
            </div>
            <div className="p-6">
              <pre className="text-sm overflow-x-auto">
                <code className="text-green-900">
                  {vulnerability.fixedCode}
                </code>
              </pre>
            </div>
          </Card>
        </div>

        {/* Unified Diff View */}
        <Card className="mt-6 p-6 shadow-md">
          <h3 className="mb-4">Unified Diff</h3>
          <pre className="text-sm overflow-x-auto bg-gray-50 p-4 rounded-lg font-mono">
            <code>
              <span className="text-muted-foreground">
                {vulnerability.file}
              </span>
              {"\n"}
              <span className="text-muted-foreground">
                @@ -{vulnerability.line},
                {vulnerability.codeSnippet.split("\n").length} +
                {vulnerability.line},
                {vulnerability.fixedCode.split("\n").length} @@
              </span>
              {"\n"}
              {vulnerability.codeSnippet.split("\n").map((line, i) => (
                <span key={`before-${i}`} className="block">
                  <span className="text-red-600">-</span>{" "}
                  <span className="bg-red-50">{line}</span>
                  {"\n"}
                </span>
              ))}
              {vulnerability.fixedCode.split("\n").map((line, i) => (
                <span key={`after-${i}`} className="block">
                  <span className="text-green-600">+</span>{" "}
                  <span className="bg-green-50">{line}</span>
                  {"\n"}
                </span>
              ))}
            </code>
          </pre>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/findings")}
            className="gap-2"
          >
            <X className="w-5 h-5" />
            Reject Fix
          </Button>
          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 gap-2"
            onClick={() => {
              // In a real app, this would apply the fix
              alert("Fix accepted! In production, this would apply the changes to your codebase.");
              navigate("/findings");
            }}
          >
            <Check className="w-5 h-5" />
            Accept Fix
          </Button>
        </div>
      </div>
    </div>
  );
}
