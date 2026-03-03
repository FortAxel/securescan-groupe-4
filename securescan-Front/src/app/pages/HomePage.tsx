import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  Shield,
  Search,
  FileCheck,
  Zap,
  ArrowRight,
  Lock,
} from "lucide-react";

export function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.15),transparent)]" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] mb-6">
              <Shield className="w-8 h-8" strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              Sécurisez votre code.
              <br />
              <span className="text-[var(--primary)]">Simplifiez la sécurité.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Détection automatisée des vulnérabilités grâce aux outils de sécurité les plus reconnus du marché.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-primary-foreground h-12 px-8 text-base gap-2 shadow-lg shadow-blue-500/25"
              >
                <Link to="/submit">
                  Lancer un scan
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
                <Link to="/historique">Voir l'historique</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <h2 className="text-2xl font-semibold text-center mb-12 text-foreground">
          Pourquoi SecureScan ?
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-[var(--primary)] flex items-center justify-center mb-4">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Analyse approfondie</h3>
            <p className="text-sm text-muted-foreground">
              Scan complet de votre dépôt pour identifier les failles de sécurité et les dépendances vulnérables.
            </p>
          </Card>
          <Card className="p-6 border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-[var(--primary)] flex items-center justify-center mb-4">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Rapports clairs</h3>
            <p className="text-sm text-muted-foreground">
              Tableaux de bord et rapports détaillés avec niveaux de gravité et pistes de correction.
            </p>
          </Card>
          <Card className="p-6 border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-[var(--primary)] flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Rapide et simple</h3>
            <p className="text-sm text-muted-foreground">
              Soumettez votre projet en quelques clics et suivez l’avancement du scan en temps réel.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-100/80 border-y border-border">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <Lock className="w-12 h-12 text-[var(--primary)] mx-auto mb-4 opacity-90" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Prêt à sécuriser votre projet ?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Soumettez l’URL de votre dépôt Git et laissez SecureScan analyser votre code en quelques minutes.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 h-11 px-6 gap-2"
          >
            <Link to="/submit">
              Soumettre un projet
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer hint */}
      <footer className="py-8 text-center text-sm text-muted-foreground">
        <p>SecureScan — Détection automatisée des vulnérabilités</p>
      </footer>
    </div>
  );
}
