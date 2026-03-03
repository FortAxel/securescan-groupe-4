import React from "react";
import { useRouteError, isRouteErrorResponse, Link } from "react-router";
import { Button } from "./ui/button";

export function ErrorBoundary() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? error.statusText || error.data?.message
    : error instanceof Error
      ? error.message
      : "Une erreur inattendue s'est produite.";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        Erreur inattendue de l'application
      </h1>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        {message}
      </p>
      <Button asChild>
        <Link to="/">Retour à l'accueil</Link>
      </Button>
    </div>
  );
}
