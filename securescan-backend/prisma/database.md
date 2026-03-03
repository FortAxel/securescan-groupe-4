# SecureScan — Database Documentation

**ORM:** Prisma  
**Database:** MySQL  

---

## Schema Overview

```
User ──< Project ──< Analysis ──< Finding
                          └──< FixBranch
```

---

## Tables

### `users`
Stores registered user accounts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `INT` PK | Auto-incremented identifier |
| `email` | `VARCHAR` UNIQUE | User email address |
| `username` | `VARCHAR` UNIQUE | Display name |
| `password` | `VARCHAR` | bcrypt hashed password |
| `createdAt` | `DATETIME` | Account creation date |
| `updatedAt` | `DATETIME` | Last update date |

---

### `projects`
Represents a submitted codebase to be scanned (Git URL or ZIP upload).

| Column | Type | Description |
|--------|------|-------------|
| `id` | `INT` PK | Auto-incremented identifier |
| `userId` | `INT` FK → `users.id` | Owner of the project |
| `name` | `VARCHAR` | Project display name |
| `sourceType` | `ENUM` | `GIT` or `ZIP` |
| `sourceUrl` | `VARCHAR` nullable | Git repository URL |
| `localPath` | `VARCHAR` nullable | Local path after clone/extraction |
| `language` | `VARCHAR` nullable | Auto-detected language (JS, PHP, Python...) |
| `framework` | `VARCHAR` nullable | Auto-detected framework |
| `status` | `ENUM` | `PENDING` `CLONING` `ANALYZING` `DONE` `ERROR` |
| `createdAt` | `DATETIME` | Creation date |
| `updatedAt` | `DATETIME` | Last update date |

---

### `analyses`
Represents one full scan run on a project.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `INT` PK | Auto-incremented identifier |
| `projectId` | `INT` FK → `projects.id` | Associated project |
| `startedAt` | `DATETIME` nullable | When the scan started |
| `finishedAt` | `DATETIME` nullable | When the scan completed |
| `score` | `INT` nullable | Security score 0–100 |
| `grade` | `VARCHAR` nullable | Letter grade: `A` `B` `C` `D` `F` |
| `status` | `ENUM` | `PENDING` `RUNNING` `DONE` `ERROR` |
| `errorMessage` | `TEXT` nullable | Error details if status is `ERROR` |
| `createdAt` | `DATETIME` | Creation date |

**Score formula**

| Severity | Penalty |
|----------|---------|
| `CRITICAL` | -20 pts |
| `HIGH` | -10 pts |
| `MEDIUM` | -5 pts |
| `LOW` | -2 pts |
| `INFO` | 0 pts |

**Grade thresholds**

| Score | Grade |
|-------|-------|
| ≥ 90 | A |
| ≥ 75 | B |
| ≥ 60 | C |
| ≥ 40 | D |
| < 40 | F |

---

### `findings`
One row per vulnerability detected by a security tool.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `INT` PK | Auto-incremented identifier |
| `analysisId` | `INT` FK → `analyses.id` | Parent analysis |
| `tool` | `ENUM` | `SEMGREP` `NPM_AUDIT` `TRUFFLEHOG` |
| `severity` | `ENUM` | `CRITICAL` `HIGH` `MEDIUM` `LOW` `INFO` |
| `owaspCategory` | `ENUM` nullable | OWASP Top 10 2025 category (`A01`–`A10`) |
| `title` | `VARCHAR` | Short finding title (rule ID or advisory name) |
| `description` | `TEXT` nullable | Detailed description of the vulnerability |
| `filePath` | `VARCHAR` nullable | Relative path to the affected file |
| `lineStart` | `INT` nullable | Start line of the vulnerability |
| `lineEnd` | `INT` nullable | End line of the vulnerability |
| `rawOutput` | `JSON` nullable | Raw output from the tool |
| `fixStatus` | `ENUM` | `PENDING` `ACCEPTED` `REJECTED` `APPLIED` |
| `fixTemplate` | `TEXT` nullable | Template-based auto fix suggestion |
| `fixAi` | `TEXT` nullable | AI-generated fix suggestion (bonus feature) |
| `createdAt` | `DATETIME` | Creation date |

---

### `fix_branches`
Tracks Git branches created to apply validated fixes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `INT` PK | Auto-incremented identifier |
| `analysisId` | `INT` FK → `analyses.id` | Parent analysis |
| `branchName` | `VARCHAR` | Git branch name (e.g. `fix/securescan-2026-03-05`) |
| `pushStatus` | `ENUM` | `PENDING` `PUSHED` `ERROR` |
| `reportPath` | `VARCHAR` nullable | Path to the generated HTML/PDF report |
| `createdAt` | `DATETIME` | Creation date |

---

## Enums

| Enum | Values |
|------|--------|
| `SourceType` | `GIT` `ZIP` |
| `ProjectStatus` | `PENDING` `CLONING` `ANALYZING` `DONE` `ERROR` |
| `AnalysisStatus` | `PENDING` `RUNNING` `DONE` `ERROR` |
| `ToolName` | `SEMGREP` `NPM_AUDIT` `TRUFFLEHOG` |
| `Severity` | `CRITICAL` `HIGH` `MEDIUM` `LOW` `INFO` |
| `OwaspCategory` | `A01` `A02` `A03` `A04` `A05` `A06` `A07` `A08` `A09` `A10` |
| `FixStatus` | `PENDING` `ACCEPTED` `REJECTED` `APPLIED` |
| `PushStatus` | `PENDING` `PUSHED` `ERROR` |

---

## Cascade Rules

All foreign keys use `onDelete: Cascade`:
- Deleting a **User** → deletes all their Projects
- Deleting a **Project** → deletes all its Analyses
- Deleting an **Analysis** → deletes all its Findings and FixBranches