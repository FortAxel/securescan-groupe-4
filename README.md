# SecureScan — Documentation technique (README)

SecureScan est une **plateforme web** développée pendant le **Hackathon IPSSI (2–6 mars 2026)** pour répondre au besoin de **CyberSafe Solutions** : centraliser l’analyse de sécurité de code, agréger les résultats, les **mapper sur l’OWASP Top 10: 2025**, puis proposer des **corrections automatisées** (avec intégration GitHub).

Ce dépôt contient :
- `securescan-front/` : frontend **React + Vite**
- `securescan-backend/` : backend **Node.js (Express) + Prisma + MySQL**

Les schémas/diagrammes (architecture, etc.) sont dans **`/docs/`**.

---

## Sommaire

- [Fonctionnalités & workflow](#fonctionnalités--workflow)
- [Architecture (texte)](#architecture-texte)
- [Prérequis](#prérequis)
- [Installation (dev) — étape par étape](#installation-dev--étape-par-étape)
- [Variables d’environnement](#variables-denvironnement)
- [Outils de sécurité (installation)](#outils-de-sécurité-installation)
- [Lancement en dev et en prod](#lancement-en-dev-et-en-prod)
- [Exemples de résultats](#exemples-de-résultats)
- [BDD — modèle & schéma](#bdd--modèle--schéma)
- [Mapping OWASP Top 10: 2025](#mapping-owasp-top-10-2025)

---

## Fonctionnalités & workflow

SecureScan couvre le workflow suivant :

- **Soumission de projet**
  - URL de repo GitHub (clone côté serveur)
  - ou upload d’une archive ZIP (extraction côté serveur)
- **Analyse automatique** via 3 outils orchestrés en CLI
  - Semgrep (SAST)
  - npm audit / pnpm audit (dépendances)
  - TruffleHog (secrets)
- **Normalisation** des résultats dans un modèle commun (`Finding`)
- **Mapping OWASP Top 10: 2025** (A01…A10)
- **Dashboard** (front) : score, sévérités, catégories OWASP, liste des findings + filtres
- **Corrections automatisées** (template-based) : proposées puis validées/rejetées
- **Application des corrections**
  - si source = GitHub : création branche, commit, push, **Pull Request**
  - si source = ZIP : renvoi d’un ZIP corrigé
- **Export rapport** : génération d’un **PDF** de synthèse

---

## Architecture (texte)

- Le **frontend** appelle l’API du backend (REST).
- Le **backend** :
  - récupère le code (clone Git / unzip),
  - lance les outils de sécurité via CLI,
  - parse et normalise les sorties en `Finding`,
  - stocke les données en base (MySQL via Prisma),
  - propose des corrections, puis les applique si validées,
  - peut automatiser GitHub (branche + PR) pour les repos Git.

Docs complémentaires dans `docs/` :
- `docs/git-workflow.md`

---

## Prérequis

### Obligatoires

- **Node.js ≥ 18**
- **npm ≥ 9**
- **MySQL 8+** (local ou distant)

### Selon les cas

- **pnpm** : requis uniquement si vous scannez un projet Node avec `pnpm-lock.yaml` (le backend tentera `pnpm audit --json`).
- **Python 3** : recommandé pour installer Semgrep via `pip` (cf. section outils).

---

## Installation (dev) — étape par étape

### 1) Cloner le projet

```bash
git clone https://github.com/FortAxel/securescan-groupe-4.git
cd securescan-groupe-4
```

### 2) Installer les outils de scan (Semgrep / TruffleHog)

Voir la section [Outils de sécurité (installation)](#outils-de-sécurité-installation).

### 3) Backend

```bash
cd securescan-backend
cp .env.example .env
npm install
```

Créer la base MySQL (si besoin) :

```sql
CREATE DATABASE securescan;
```

Migrer le schéma :

```bash
npx prisma migrate dev
```

Lancer l’API :

```bash
npm run dev
```

API : `http://localhost:3000`  
Healthcheck : `GET http://localhost:3000/health`

### 4) Frontend

```bash
cd ../securescan-front
cp .env.example .env
npm install
npm run dev
```

Front : `http://localhost:5173`

---

## Variables d’environnement

### Backend (`securescan-backend/.env`)

Fichier exemple : `securescan-backend/.env.example`

#### Configuration minimale

```env
DATABASE_URL="mysql://root:your_password@localhost:3306/securescan"
JWT_SECRET=change_this_to_a_long_random_secret_string
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

#### GitHub OAuth (requis pour le workflow Git + PR)

Créer une OAuth App GitHub :
- Homepage URL : `http://localhost:5173`
- Callback URL : `http://localhost:3000/api/githubAuth/callback`

Puis compléter :

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

#### Chemins des binaires (si pas dans le `PATH`)

```env
SEMGREP_BIN=semgrep
TRUFFLEHOG_BIN=trufflehog
```

### Frontend (`securescan-front/.env`)

Fichier exemple : `securescan-front/.env.example`

```env
VITE_BACKEND_URL=http://localhost:3000
```

---

## Outils de sécurité (installation)

### Semgrep (SAST)

Le repo fournit un `requirements.txt` à la racine (incluant `semgrep`).

```bash
cd /chemin/vers/securescan-groupe-4
python3 -m venv venv
source venv/bin/activate
venv/bin/pip install -r requirements.txt
semgrep --version
```

Si Semgrep n’est pas détecté par le backend, définir `SEMGREP_BIN` vers un chemin absolu (dans `securescan-backend/.env`).

### TruffleHog (secrets) — binaire

Installation officielle (Linux/Mac) :

```bash
curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh -s -- -b /usr/local/bin
trufflehog --version
```

Si installé ailleurs, renseigner `TRUFFLEHOG_BIN` (chemin absolu) dans `securescan-backend/.env`.

### npm audit / pnpm audit (dépendances)

- `npm audit` est utilisé si le projet scanné contient `package-lock.json`
- `pnpm audit` est utilisé si le projet scanné contient `pnpm-lock.yaml`

Installer pnpm si nécessaire :

```bash
npm i -g pnpm
pnpm --version
```

---

## Lancement en dev et en prod

### Dev

- Backend : `cd securescan-backend && npm run dev`
- Front : `cd securescan-front && npm run dev`

### Prod (mode production)

Backend :

```bash
cd securescan-backend
npm install --omit=dev
npm start
```

Frontend (build statique) :

```bash
cd securescan-front
npm install
npm run build
```

---

## Exemples de résultats

### Récupérer les résultats d’une analyse

```bash
curl "http://localhost:3000/api/analysis/<analysisId>/results" \
  -H "Authorization: Bearer <JWT>"
```

La réponse contient :
- `score` (0–100) + `grade` (A…F)
- un `summary` par sévérité
- une liste `findings[]` normalisée (fichier, ligne, description, sévérité, outil, OWASP)

### Export PDF

```bash
curl -L "http://localhost:3000/api/analysis/<analysisId>/report" \
  -H "Authorization: Bearer <JWT>" \
  -o securescan-report.pdf
```

---

## BDD — modèle & schéma

Le schéma Prisma est dans :
- `securescan-backend/prisma/schema.prisma`

La documentation BDD est dans :
- `securescan-backend/prisma/database.md`

### Modèle (résumé)

- `User` **1—N** `Project`
- `Project` **1—N** `Analysis`
- `Analysis` **1—N** `Finding`
- `Finding` **1—N** `Correction`
- `Analysis` **1—N** `FixBranch`

Tables principales :
- `users`, `projects`, `analyses`, `findings`, `corrections`, `fix_branches`

---

## Mapping OWASP Top 10: 2025

Le mapping central est implémenté dans :
- `securescan-backend/src/services/mappings/owasp.mapping.js`

Résumé :
- **Semgrep** : utilise `metadata.owasp` si dispo, sinon fallback mots-clés/CWE
- **npm audit / pnpm audit** : findings de dépendances → **A03**
- **TruffleHog** : mapping selon le type de secret (ex: clés privées → A04, tokens/keys → A02/A07 selon cas)