import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Périmètre de secours pour les graphiques Recharts (évite crash insertBefore / DOM). */
export class ChartErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    console.warn("[ChartErrorBoundary]", err.message, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center h-full min-h-[200px] text-sm text-muted-foreground">
            Graphique indisponible
          </div>
        )
      );
    }
    return this.props.children;
  }
}
