import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Shield, Upload, GitBranch } from "lucide-react";

export function SubmitProject() {
  const navigate = useNavigate();
  const [gitUrl, setGitUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [detectedLanguage] = useState("Node.js");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/scan");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file drop
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-[var(--primary)]" />
          </div>
          <h1 className="text-4xl mb-2">SecureScan</h1>
          <p className="text-muted-foreground">
            Analyze your code for security vulnerabilities
          </p>
        </div>

        <Card className="p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block mb-2">Git Repository URL</label>
              <div className="relative">
                <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="https://github.com/username/repository"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>

            <div className="relative">
              <div className="text-center text-muted-foreground mb-2">OR</div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="mb-2">Drag & drop your project ZIP file here</p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
              <input
                type="file"
                accept=".zip"
                className="hidden"
                onChange={() => {}}
              />
            </div>

            <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-sm">
                Auto-detected language: <strong>{detectedLanguage}</strong>
              </span>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base bg-[var(--primary)] hover:bg-[var(--primary)]/90"
              disabled={!gitUrl}
            >
              Start Scan
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          We support Node.js, Python, Java, Go, and more
        </p>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground mb-2">Quick navigation for demo:</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => navigate("/scan")}
              className="text-xs text-primary hover:underline"
            >
              View Scan Progress
            </button>
            <span className="text-xs text-muted-foreground">|</span>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-xs text-primary hover:underline"
            >
              View Dashboard
            </button>
            <span className="text-xs text-muted-foreground">|</span>
            <button
              onClick={() => navigate("/findings")}
              className="text-xs text-primary hover:underline"
            >
              View Findings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}