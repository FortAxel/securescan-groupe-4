import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Card } from "../components/ui/card";
import { Shield, CheckCircle2, Loader2 } from "lucide-react";
import { getCurrentProjectId } from "../lib/flow";

interface ScanStep {
  id: string;
  label: string;
  status: "completed" | "in-progress" | "pending";
}

export function ScanProgress() {
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = getCurrentProjectId(location);

  useEffect(() => {
    if (projectId === null) navigate("/submit", { replace: true });
  }, [projectId, navigate]);

  const [steps, setSteps] = useState<ScanStep[]>([
    { id: "1", label: "Clone repository", status: "completed" },
    { id: "2", label: "Detect language", status: "completed" },
    { id: "3", label: "Running Semgrep", status: "in-progress" },
    { id: "4", label: "Running npm audit", status: "pending" },
    { id: "5", label: "Running TruffleHog", status: "pending" },
    { id: "6", label: "Mapping OWASP", status: "pending" },
    { id: "7", label: "Generating report", status: "pending" },
  ]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Simulate scan progress
    const stepDurations = [0, 0, 2000, 3000, 2000, 2000, 1500];
    let currentTime = 0;

    steps.forEach((step, index) => {
      if (step.status === "pending") {
        currentTime += stepDurations[index];
        const timer = setTimeout(() => {
          setSteps((prev) => {
            const newSteps = [...prev];
            if (index > 0) {
              newSteps[index - 1].status = "completed";
            }
            newSteps[index].status = "in-progress";
            return newSteps;
          });

          // Mark as completed after a delay
          const completeTimer = setTimeout(() => {
            setSteps((prev) => {
              const newSteps = [...prev];
              newSteps[index].status = "completed";
              return newSteps;
            });

            // Navigate to dashboard when all steps are complete
            if (index === steps.length - 1) {
              setTimeout(() => navigate("/dashboard"), 1000);
            }
          }, stepDurations[index]);
          timers.push(completeTimer);
        }, currentTime);
        timers.push(timer);
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [navigate]);

  if (projectId === null) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-[var(--primary)]" />
          </div>
          <h1 className="text-3xl mb-2">Scan in Progress</h1>
          <p className="text-muted-foreground">
            Analyzing your code for security vulnerabilities...
          </p>
        </div>

        <Card className="p-8 shadow-lg">
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-4">
                <div className="relative">
                  {step.status === "completed" && (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  )}
                  {step.status === "in-progress" && (
                    <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
                  )}
                  {step.status === "pending" && (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  )}
                  {index < steps.length - 1 && (
                    <div
                      className={`absolute left-1/2 top-8 w-0.5 h-8 -translate-x-1/2 ${
                        step.status === "completed"
                          ? "bg-green-600"
                          : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 pt-0.5">
                  <p
                    className={
                      step.status === "completed"
                        ? "text-foreground"
                        : step.status === "in-progress"
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-center text-muted-foreground">
              This typically takes 2-3 minutes depending on project size
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
