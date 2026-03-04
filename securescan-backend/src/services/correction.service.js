/**
 * @file correction.service.js
 * @description Generates predefined correction templates based on finding type.
 *
 * Supported OWASP categories : A01, A02, A03, A04, A05, A06, A07, A08, A09, A10
 * Supported tools            : SEMGREP, NPM_AUDIT, TRUFFLEHOG
 */

// ─── Helpers internes ────────────────────────────────────────────────────────

/**
 * Tente de détecter le langage depuis le filePath ou le snippet.
 * @param {string} filePath
 * @param {string} snippet
 * @returns {"js"|"php"|"python"|"java"|"unknown"}
 */
function detectLanguage(filePath = "", snippet = "") {
  if (/\.(js|ts|jsx|tsx|mjs|cjs)$/i.test(filePath)) return "js";
  if (/\.php$/i.test(filePath))                       return "php";
  if (/\.(py)$/i.test(filePath))                      return "python";
  if (/\.(java|kt)$/i.test(filePath))                 return "java";

  // Fallback sur le contenu du snippet
  if (/require\(|import |const |let |var /.test(snippet))  return "js";
  if (/<\?php|echo\s/.test(snippet))                       return "php";
  if (/def |import |print\(/.test(snippet))                return "python";

  return "unknown";
}

/**
 * Construit un objet correction normalisé.
 */
function makeCorrection(type, original, fixed, explanation) {
  return {
    type,
    originalSnippet: original,
    fixedSnippet:    fixed,
    explanation,     // affiché dans l'UI / utile en soutenance
  };
}

// ─── Templates par catégorie OWASP ───────────────────────────────────────────

/**
 * A01 — Broken Access Control
 * Manque de vérification de rôle / ownership
 */
function templateA01(original, lang) {
  let fixed = original;

  if (lang === "js") {
    // Ajoute un guard middleware si absent
    if (!original.includes("req.user") && !original.includes("isAdmin")) {
      fixed = `if (!req.user || req.user.role !== 'admin') {\n  return res.status(403).json({ error: 'Forbidden' });\n}\n${original}`;
    }
  } else if (lang === "php") {
    if (!original.includes("$_SESSION")) {
      fixed = `if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {\n  http_response_code(403);\n  exit('Forbidden');\n}\n${original}`;
    }
  } else {
    fixed = `# Vérifier les droits avant d'exécuter cette action\n# ${original}`;
  }

  return makeCorrection(
    "SQL_INJECTION", // type le plus proche dispo dans l'enum — à étendre si besoin
    original,
    fixed,
    "A01 — Ajouter une vérification d'autorisation avant l'accès à la ressource."
  );
}

/**
 * A02 — Cryptographic Failures
 * Mot de passe en clair, hash MD5/SHA1, HTTP en dur
 */
function templateA02(original, lang) {
  let fixed = original;
  let type  = "PLAINTEXT_PASSWORD";

  // Mot de passe stocké en clair
  if (/password\s*=\s*['"][^'"]+['"]/i.test(original)) {
    if (lang === "js") {
      fixed = original.replace(
        /password\s*=\s*['"][^'"]+['"]/i,
        "password = await bcrypt.hash(plainPassword, 12)"
      );
      fixed = `const bcrypt = require('bcrypt');\n${fixed}`;
    } else if (lang === "php") {
      fixed = original.replace(
        /password\s*=\s*['"][^'"]+['"]/i,
        "password = password_hash($plainPassword, PASSWORD_BCRYPT)"
      );
    } else if (lang === "python") {
      fixed = `import bcrypt\n${original.replace(
        /password\s*=\s*['"][^'"]+['"]/i,
        "password = bcrypt.hashpw(plain_password.encode(), bcrypt.gensalt())"
      )}`;
    }
  }

  // MD5 / SHA1 → SHA256 minimum
  if (/md5\(|sha1\(/i.test(original)) {
    type  = "SECRET";
    if (lang === "js") {
      fixed = original
        .replace(/md5\(/gi,  "crypto.createHash('sha256').update(")
        .replace(/sha1\(/gi, "crypto.createHash('sha256').update(");
      fixed = `const crypto = require('crypto');\n${fixed}`;
    } else if (lang === "php") {
      fixed = original
        .replace(/md5\(/gi,  "hash('sha256', ")
        .replace(/sha1\(/gi, "hash('sha256', ");
    }
  }

  // URL HTTP en dur → HTTPS
  if (/http:\/\//i.test(original)) {
    fixed = original.replace(/http:\/\//gi, "https://");
  }

  return makeCorrection(type, original, fixed,
    "A02 — Utiliser bcrypt pour les mots de passe, SHA-256+ pour les hash, HTTPS pour les URLs."
  );
}

/**
 * A03 — Injection (SQL, commande, XSS)
 */
function templateA03(original, lang) {
  let fixed = original;
  let type  = "XSS";

  // XSS — sortie non échappée
  if (/innerHTML|document\.write|eval\(/.test(original)) {
    type  = "XSS";
    fixed = original
      .replace(/innerHTML\s*=\s*(.*)/,     "textContent = $1")
      .replace(/document\.write\((.*)\)/,  "// document.write supprimé — utiliser DOM API")
      .replace(/eval\((.*)\)/,             "// eval() supprimé — dangereux");
  }

  // XSS PHP
  if (lang === "php" && /echo\s+\$_(GET|POST|REQUEST)/i.test(original)) {
    type  = "XSS";
    fixed = original.replace(
      /echo\s+(\$_(GET|POST|REQUEST)\[.*?\])/i,
      "echo htmlspecialchars($1, ENT_QUOTES, 'UTF-8')"
    );
  }

  // SQL Injection — concaténation directe
  if (/query\(.*\+|query\(.*\$|execute\(.*\+/i.test(original)) {
    type  = "SQL_INJECTION";
    if (lang === "js") {
      fixed = original.replace(
        /query\((.*)\)/,
        "query('SELECT * FROM users WHERE id = ?', [userId])"
      );
    } else if (lang === "php") {
      fixed = original.replace(
        /query\((.*)\)/,
        "prepare('SELECT * FROM users WHERE id = ?'); $stmt->execute([$userId])"
      );
    } else if (lang === "python") {
      fixed = original.replace(
        /execute\((.*)\)/,
        "execute('SELECT * FROM users WHERE id = %s', (user_id,))"
      );
    }
  }

  // Injection de commande OS
  if (/exec\(|system\(|shell_exec\(|child_process/.test(original)) {
    type  = "SQL_INJECTION"; // type générique — à adapter si CorrectionType évolue
    fixed = `// ⚠️ Injection de commande détectée — éviter exec/system avec des entrées utilisateur\n`
          + `// Utiliser une liste blanche de commandes autorisées\n`
          + original.replace(/exec\(([^)]+)\)/, "execFile('/chemin/safe', [arg_valide])");
  }

  return makeCorrection(type, original, fixed,
    "A03 — Utiliser des requêtes paramétrées, échapper les sorties HTML, éviter eval/exec."
  );
}

/**
 * A04 — Insecure Design / Secrets hardcodés
 */
function templateA04(original) {
  const fixed = original
    .replace(/(['"])(?:sk-|ghp_|AKIA|xox[baprs]-)[A-Za-z0-9_\-]{8,}(['"])/g,
      "process.env.SECRET_KEY")
    .replace(/(['"])[A-Za-z0-9+/]{32,}={0,2}(['"])/g,
      "process.env.SECRET_KEY")
    .replace(/password\s*[:=]\s*['"][^'"]{4,}['"]/gi,
      "password: process.env.DB_PASSWORD")
    .replace(/apikey\s*[:=]\s*['"][^'"]{4,}['"]/gi,
      "apiKey: process.env.API_KEY")
    .replace(/secret\s*[:=]\s*['"][^'"]{4,}['"]/gi,
      "secret: process.env.SECRET_KEY");

  return makeCorrection("SECRET", original, fixed,
    "A04 — Ne jamais hardcoder de secrets. Utiliser des variables d'environnement (.env)."
  );
}

/**
 * A05 — Security Misconfiguration
 */
function templateA05(original, lang) {
  let fixed = original;

  // CORS trop permissif
  if (/cors\(\s*\{.*origin.*\*/.test(original) || /Access-Control.*\*/.test(original)) {
    fixed = original
      .replace(/origin\s*:\s*['"]?\*['"]?/, "origin: process.env.ALLOWED_ORIGIN")
      .replace(/Access-Control-Allow-Origin.*\*/,
        "Access-Control-Allow-Origin: https://votredomaine.com");
  }

  // Debug / stack trace exposé en prod
  if (/app\.use\(errorHandler\)|res\.send\(err\)|console\.error\(err\)/.test(original)) {
    fixed = original.replace(
      /res\.send\(err\)/,
      "res.status(500).json({ error: 'Internal Server Error' })"
    );
  }

  // Headers de sécurité manquants (Express)
  if (lang === "js" && /express\(\)/.test(original) && !original.includes("helmet")) {
    fixed = `const helmet = require('helmet');\n${original}\napp.use(helmet());`;
  }

  return makeCorrection("SQL_INJECTION", original, fixed,
    "A05 — Restreindre CORS, masquer les erreurs en prod, ajouter les headers de sécurité (helmet)."
  );
}

/**
 * A06 — Vulnerable and Outdated Components (NPM_AUDIT)
 */
function templateA06(original) {
  // rawOutput de npm audit contient souvent { name, version, fixAvailable }
  let fixed = original;

  const versionMatch = original.match(/"version"\s*:\s*"([^"]+)"/);
  const nameMatch    = original.match(/"name"\s*:\s*"([^"]+)"/);

  if (nameMatch && versionMatch) {
    fixed = `npm install ${nameMatch[1]}@latest\n# ou en package.json :\n"${nameMatch[1]}": "latest"`;
  } else {
    fixed = `npm audit fix\n# Pour les breaking changes :\nnpm audit fix --force`;
  }

  return makeCorrection("DEPENDENCY", original, fixed,
    "A06 — Mettre à jour la dépendance vers la version corrigée. Exécuter npm audit régulièrement."
  );
}

/**
 * A07 — Identification and Authentication Failures
 */
function templateA07(original, lang) {
  let fixed = original;

  // Pas de rate limiting sur /login
  if (/router\.(post|get)\(['"]\/login/.test(original) && !original.includes("rateLimit")) {
    if (lang === "js") {
      fixed = `const rateLimit = require('express-rate-limit');\n`
            + `const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });\n`
            + original.replace(
                /router\.(post|get)\((['"]\/login['"])/,
                "router.$1($2, loginLimiter,"
              );
    }
  }

  // JWT sans expiration
  if (/jwt\.sign\(/.test(original) && !/expiresIn/.test(original)) {
    fixed = original.replace(
      /jwt\.sign\((\{[^}]+\}),\s*([^,)]+)\)/,
      "jwt.sign($1, $2, { expiresIn: '1h' })"
    );
  }

  // Session sans httpOnly / secure
  if (/session\(\{/.test(original)) {
    if (!original.includes("httpOnly")) {
      fixed = original.replace(
        /cookie\s*:\s*\{/,
        "cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production',"
      );
    }
  }

  return makeCorrection("PLAINTEXT_PASSWORD", original, fixed,
    "A07 — Ajouter rate limiting, expiration JWT, flags httpOnly/secure sur les cookies."
  );
}

/**
 * A08 — Software and Data Integrity Failures
 */
function templateA08(original, lang) {
  let fixed = original;

  // Désérialisation non sécurisée
  if (/JSON\.parse\(|unserialize\(|pickle\.loads\(/.test(original)) {
    if (lang === "js") {
      fixed = `// Valider le schéma avant de parser\ntry {\n  const data = JSON.parse(input);\n  // Valider avec un schéma (ex: Joi, Zod)\n  schema.parse(data);\n} catch (e) {\n  throw new Error('Invalid input');\n}`;
    } else if (lang === "python") {
      fixed = `import json\n# Ne jamais utiliser pickle sur des données non fiables\ndata = json.loads(input_str)  # JSON uniquement`;
    }
  }

  return makeCorrection("DEPENDENCY", original, fixed,
    "A08 — Valider les données désérialisées, vérifier l'intégrité des packages (npm ci --ignore-scripts)."
  );
}

/**
 * A09 — Security Logging and Monitoring Failures
 */
function templateA09(original, lang) {
  let fixed = original;

  // Pas de log sur les erreurs d'auth
  if (/catch\s*\(/.test(original) && !/logger\.|console\.warn|console\.error/.test(original)) {
    if (lang === "js") {
      fixed = original.replace(
        /catch\s*\((\w+)\)\s*\{/,
        "catch ($1) {\n  logger.error({ err: $1, ip: req?.ip }, 'Security event');"
      );
    }
  }

  return makeCorrection("SQL_INJECTION", original, fixed,
    "A09 — Logger toutes les erreurs de sécurité avec contexte (IP, user, timestamp)."
  );
}

/**
 * A10 — Server-Side Request Forgery (SSRF)
 */
function templateA10(original, lang) {
  let fixed = original;

  if (/fetch\(|axios\.get\(|http\.get\(|curl/.test(original)) {
    if (lang === "js") {
      fixed = `// Valider l'URL avant la requête — bloquer les adresses internes\n`
            + `const { URL } = require('url');\n`
            + `const parsed = new URL(userInput);\n`
            + `if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {\n`
            + `  throw new Error('SSRF bloqué');\n`
            + `}\n`
            + original;
    } else if (lang === "php") {
      fixed = `// Valider l'URL\n$parsed = parse_url($userInput);\n`
            + `$blocked = ['localhost', '127.0.0.1'];\n`
            + `if (in_array($parsed['host'], $blocked)) { die('Forbidden'); }\n`
            + original;
    }
  }

  return makeCorrection("SECRET", original, fixed,
    "A10 — Valider et filtrer toutes les URLs fournies par l'utilisateur avant d'effectuer des requêtes."
  );
}

// ─── Templates par outil ─────────────────────────────────────────────────────

/**
 * TruffleHog — secret détecté dans le code
 */
function templateTrufflehog(original) {
  const fixed = original
    .replace(/(['"])[A-Za-z0-9+/]{20,}={0,2}(['"])/g, "process.env.SECRET_KEY")
    .replace(/(token|key|secret|password|api_key)\s*=\s*['"][^'"]{4,}['"]/gi,
      "$1 = process.env.SECRET_KEY");

  return makeCorrection("SECRET", original, fixed,
    "TruffleHog — Secret détecté dans le dépôt. Révoquer immédiatement et utiliser des variables d'environnement."
  );
}

/**
 * NPM Audit — dépendance vulnérable
 */
function templateNpmAudit(finding) {
  const raw      = finding.rawOutput || {};
  const pkgName  = raw.moduleName  || raw.name    || "package-inconnu";
  const fixedVer = raw.fixAvailable?.version || raw.patched_versions || "latest";

  const original = `"${pkgName}": "${raw.version || '*'}"`;
  const fixed    = `"${pkgName}": "${fixedVer}"\n# Puis : npm install`;

  return makeCorrection("DEPENDENCY", original, fixed,
    `NPM Audit — Mettre à jour ${pkgName} vers ${fixedVer} pour corriger la vulnérabilité.`
  );
}

// ─── Dispatcher principal ────────────────────────────────────────────────────

/**
 * Generates a predefined correction template based on finding type.
 *
 * @param {Object} finding - Finding object from database
 * @returns {Object|null} Generated correction object { type, originalSnippet, fixedSnippet, explanation }
 */
export function generateTemplateCorrection(finding) {
  const original = finding.rawOutput?.codeSnippet || "";
  const lang     = detectLanguage(finding.filePath || "", original);

  // Priorité outil — TruffleHog et NPM Audit ont leur propre logique
  if (finding.tool === "TRUFFLEHOG") return templateTrufflehog(original);
  if (finding.tool === "NPM_AUDIT")  return templateNpmAudit(finding);

  // Dispatch par catégorie OWASP
  switch (finding.owaspCategory) {
    case "A01": return templateA01(original, lang);
    case "A02": return templateA02(original, lang);
    case "A03": return templateA03(original, lang);
    case "A04": return templateA04(original);
    case "A05": return templateA05(original, lang);
    case "A06": return templateA06(original);
    case "A07": return templateA07(original, lang);
    case "A08": return templateA08(original, lang);
    case "A09": return templateA09(original, lang);
    case "A10": return templateA10(original, lang);
    default:    return null;
  }
}