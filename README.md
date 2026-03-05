# SecureScan — Documentation technique (README)

> Plateforme d'analyse de sécurité de code — Hackathon IPSSI · 2–6 Mars 2026 · CyberSafe Solutions

SecureScan centralise l'analyse de sécurité de code source, agrège les résultats de plusieurs outils, les mappe automatiquement sur l'**OWASP Top 10 : 2025** et propose des corrections automatisées avec intégration GitHub.

---

## Sommaire

- [Stack technique](#stack-technique)
- [Workflow](#workflow)
- [Choix techniques justifiés](#choix-techniques-justifiés)
- [Architecture](#architecture)
- [Installation](#installation)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données](#base-de-données)
- [Mapping OWASP Top 10 : 2025](#mapping-owasp-top-10--2025)
- [Exemples API](#exemples-api)

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React + Vite (port 5173) |
| Backend | Node.js + Express (port 3000) |
| ORM | Prisma |
| Base de données | MySQL 8 |
| SAST | Semgrep |
| Dépendances | npm audit / pnpm audit |
| Secrets | TruffleHog |

---

## Workflow

1. **Soumission** — URL de repo GitHub ou archive ZIP
2. **Analyse** — Semgrep + npm/pnpm audit + TruffleHog orchestrés en CLI
3. **Normalisation** — résultats agrégés dans un modèle `Finding` commun
4. **Mapping OWASP** — chaque finding est classé A01…A10
5. **Dashboard** — score (0–100), grade (A…F), sévérités, findings filtrables
6. **Corrections** — propositions automatiques, validation manuelle
7. **Application** — Pull Request GitHub ou ZIP corrigé selon la source
8. **Export** — rapport PDF de synthèse

---

## Choix techniques justifiés

**React + Vite** — productivité élevée pour un dashboard dynamique, HMR quasi-instantané : décisif sur un hackathon de 4 jours.

**Node.js + Express** — orchestration naturelle de processus enfants (CLI des scanners) de façon non bloquante. Cohérence JS full-stack qui réduit la friction en équipe.

**Prisma + MySQL** — ORM typé avec migrations intégrées, évite les erreurs de schéma manuelles. MySQL robuste pour les relations 1-N multiples (User → Project → Analysis → Finding → Correction).

**Semgrep** — milliers de règles open source, support natif des métadonnées OWASP/CWE, exécution CLI facile à orchestrer depuis Node.js.

**npm/pnpm audit** — outil natif zéro configuration pour les vulnérabilités de dépendances (OWASP A06). Détection automatique du lockfile (package-lock.json vs pnpm-lock.yaml).

**TruffleHog** — spécialisé dans la détection de secrets et credentials exposés (clés API, tokens, certificats). Complète Semgrep sur OWASP A02 et A07.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        UTILISATEUR / NAVIGATEUR                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ HTTP / REST
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│               FRONTEND  —  React + Vite  (port 5173)                │
│   Dashboard · Soumission projet · Findings · Corrections · Export   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ REST API (JSON / JWT)
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              BACKEND  —  Node.js / Express  (port 3000)             │
│                                                                      │
│  ┌──────────────────┐   ┌──────────────────┐   ┌───────────────┐   │
│  │   Auth (JWT)     │   │  AnalysisService │   │   ReportSvc   │   │
│  └──────────────────┘   └────────┬─────────┘   └──────┬────────┘   │
│                                  │                     │ PDF        │
│             ┌────────────────────┼──────────────┐      │            │
│             ▼                    ▼              ▼      │            │
│  ┌────────────────┐  ┌──────────────┐  ┌───────────┐  │            │
│  │ Semgrep (SAST) │  │  npm/pnpm    │  │TruffleHog │  │            │
│  │   via CLI      │  │    audit     │  │ (secrets) │  │            │
│  └───────┬────────┘  └──────┬───────┘  └─────┬────┘  │            │
│          └──────────────────┴────────────────┘       │            │
│                              │ Normalisation Finding  │            │
│                              ▼                        │            │
│                   ┌─────────────────┐                 │            │
│                   │  OWASP Mapping  │                 │            │
│                   └────────┬────────┘                 │            │
│                            │                          │            │
│                            ▼                          ▼            │
│                   ┌──────────────────────────────────────────────┐ │
│                   │          Prisma ORM  →  MySQL 8               │ │
│                   └──────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  GitHub Integration : OAuth · Clone · Branch · Commit · PR   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Installation

### Prérequis

- Node.js ≥ 18 et npm ≥ 9
- MySQL 8+
- Python 3 (pour Semgrep)
- pnpm (uniquement si le projet scanné utilise `pnpm-lock.yaml`)

### 1 — Cloner le projet

```bash
git clone https://github.com/FortAxel/securescan-groupe-4.git
cd securescan-groupe-4
```

### 2 — Installer les outils de scan

**Semgrep** (via Python) :

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

**TruffleHog** (binaire Linux/Mac) :

```bash
curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh -s -- -b /usr/local/bin
```

### 3 — Backend

```bash
cd securescan-backend
cp .env.example .env      # éditer DATABASE_URL, JWT_SECRET, GITHUB_*
npm install
npx prisma migrate dev
npm run dev               # API sur http://localhost:3000
```

### 4 — Frontend

```bash
cd securescan-front
cp .env.example .env      # VITE_BACKEND_URL=http://localhost:3000
npm install
npm run dev               # Interface sur http://localhost:5173
```

### Prod

```bash
# Backend
cd securescan-backend && npm install --omit=dev && npm start

# Frontend
cd securescan-front && npm install && npm run build
```

---

## Variables d'environnement

### Backend (`securescan-backend/.env`)

```env
DATABASE_URL="mysql://root:your_password@localhost:3306/securescan"
JWT_SECRET=change_this_to_a_long_random_secret_string
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# GitHub OAuth (requis pour le workflow Git + PR)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Chemins binaires si hors PATH
SEMGREP_BIN=semgrep
TRUFFLEHOG_BIN=trufflehog
```

Créer une OAuth App GitHub avec :
- Homepage URL : `http://localhost:5173`
- Callback URL : `http://localhost:3000/api/githubAuth/callback`

### Frontend (`securescan-front/.env`)

```env
VITE_BACKEND_URL=http://localhost:3000
```

---

## Base de données

Schéma Prisma : `securescan-backend/prisma/schema.prisma`  
Documentation complète : `securescan-backend/prisma/database.md`

### MLD

![MLD](./docs/db/mld.png)

### Tables principales

| Table | Champs principaux | Relations |
|-------|-------------------|-----------|
| `users` | id, email, password_hash, name | 1 user → N projects |
| `projects` | id, user_id, name, repo_url | 1 project → N analyses |
| `analyses` | id, project_id, status, score, grade | 1 analysis → N findings, N fix_branches |
| `findings` | id, analysis_id, tool, file, line, severity, owasp_category | 1 finding → N corrections |
| `corrections` | id, finding_id, suggestion, status, applied_at | Résultat de correction automatique |
| `fix_branches` | id, analysis_id, branch_name, pr_url | Branche GitHub créée lors d'une correction |

---

## Mapping OWASP Top 10 : 2025

Implémenté dans `securescan-backend/src/services/mappings/owasp.mapping.js`.

**Logique de mapping :**
- **Semgrep** : utilise `metadata.owasp` si disponible dans la règle, sinon fallback par mots-clés / CWE
- **npm/pnpm audit** : toutes les vulnérabilités de dépendances → **A06**
- **TruffleHog** : clés privées → **A04** ; tokens / API keys → **A02** ou **A07** selon le contexte

| Catégorie | Vulnérabilité | Outil(s) SecureScan |
|-----------|---------------|---------------------|
| A01:2025 | Broken Access Control | Semgrep (règles RBAC, auth) |
| A02:2025 | Cryptographic Failures | Semgrep + TruffleHog (tokens API) |
| A03:2025 | Injection | Semgrep (SQLi, XSS, SSTI…) |
| A04:2025 | Insecure Design | Semgrep + TruffleHog (clés privées) |
| A05:2025 | Security Misconfiguration | Semgrep (configs, headers) |
| A06:2025 | Vulnerable Components | npm audit / pnpm audit |
| A07:2025 | Auth Failures | Semgrep + TruffleHog (tokens) |
| A08:2025 | Software & Data Integrity | npm audit (integrity check) |
| A09:2025 | Security Logging Failures | Semgrep (règles logging) |
| A10:2025 | Server-Side Request Forgery | Semgrep (SSRF patterns) |

---

## Exemples API

**Résultats d'une analyse :**

```bash
curl "http://localhost:3000/api/analysis/<analysisId>/results" \
  -H "Authorization: Bearer <JWT>"
```

Réponse : `score` (0–100), `grade` (A…F), `summary` par sévérité, liste `findings[]` (fichier, ligne, description, sévérité, outil, catégorie OWASP).

**Export rapport PDF :**

```bash
curl -L "http://localhost:3000/api/analysis/<analysisId>/report" \
  -H "Authorization: Bearer <JWT>" \
  -o securescan-report.pdf
```

---

*Hackathon IPSSI · SecureScan Groupe 4 · Mars 2026*