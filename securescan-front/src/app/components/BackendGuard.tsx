import { useState, useEffect } from "react";
import { checkBackendHealth, type BackendHealth } from "../lib/backendHealth";
import { getApiBaseUrl } from "../api/client";
import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";

interface BackendGuardProps {
  children: React.ReactNode;
}

export function BackendGuard({ children }: BackendGuardProps) {
  const [health, setHealth] = useState<BackendHealth>("loading");

  const runCheck = () => {
    setHealth("loading");
    checkBackendHealth().then(setHealth);
  };

  useEffect(() => {
    runCheck();
  }, []);

  if (health === "ok") {
    return <>{children}</>;
  }

  if (health === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/20">
        <p className="text-sm text-muted-foreground">Vérification du backend…</p>
      </div>
    );
  }

  const baseUrl = getApiBaseUrl()?.trim() || "(non défini)";
  const isInvalidUrl = !baseUrl.startsWith("http://") && !baseUrl.startsWith("https://");

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="w-16 h-16 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Backend inaccessible
          </h1>
          <p className="text-sm text-muted-foreground mb-2">
            {isInvalidUrl
              ? "L'URL du backend dans le .env n'est pas valide (elle doit commencer par http:// ou https://)."
              : "Impossible de joindre le backend. Vérifiez que le serveur tourne et que l'URL est correcte."}
          </p>
          <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded mt-2 inline-block">
            VITE_BACKEND_URL = {baseUrl || "(vide)"}
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Fichier : <code className="bg-muted px-1 rounded">securescan-front/.env</code>
            <br />
            Exemple : <code className="bg-muted px-1 rounded">VITE_BACKEND_URL=http://localhost:3000</code>
          </p>
        </div>
        <Button onClick={runCheck} variant="outline">
          Réessayer
        </Button>
      </div>
    </div>
  );
}
