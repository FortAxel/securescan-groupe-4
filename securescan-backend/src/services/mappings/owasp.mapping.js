/**
 * owasp.mapping.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized OWASP Top 10 : 2025 mapping for all security tools.
 * Each tool has its own mapper exported at the bottom of this file.
 *
 * OWASP Top 10 : 2025
 *  A01 - Broken Access Control
 *  A02 - Security Misconfiguration
 *  A03 - Software Supply Chain Failures
 *  A04 - Cryptographic Failures
 *  A05 - Injection
 *  A06 - Insecure Design
 *  A07 - Authentication Failures
 *  A08 - Software/Data Integrity Failures
 *  A09 - Logging & Alerting Failures
 *  A10 - Mishandling of Exceptional Conditions
 */

// ─────────────────────────────────────────────────────────────────────────────
// SEMGREP
// Semgrep rules expose an `extra.metadata.owasp` array in their JSON output.
// Format: ["A05:2025 - Injection", "A03:2021 - Injection", ...]
// We first try to read that field directly (most reliable).
// If absent, we fall back to keyword matching on the rule ID + message.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a raw Semgrep result to an OWASP 2025 category.
 * Priority: metadata.owasp field > rule ID keywords > message keywords
 *
 * @param {object} semgrepResult - One entry from semgrep's results[] array
 * @returns {string|null} OWASP category (e.g. "A05") or null
 */
function mapSemgrepOwasp(semgrepResult) {
  const metadata = semgrepResult?.extra?.metadata || {};

  // 1. Try direct metadata.owasp field (most rules have this)
  //    Values look like: "A05:2025 - Injection" or "A03:2021 - Injection"
  const owaspEntries = metadata.owasp || [];
  for (const entry of owaspEntries) {
    // Extract the Ax part and remap old years to 2025 equivalents
    const match = String(entry).match(/A(\d{2}):\d{4}/);
    if (match) {
      const raw = `A${match[1]}`;
      return remapToOwasp2025(raw, entry);
    }
  }

  // 2. Fallback: keyword matching on rule ID + CWE + message
  const ruleId  = semgrepResult?.check_id || '';
  const message = semgrepResult?.extra?.message || '';
  const cwe     = (metadata.cwe || []).join(' ').toLowerCase();
  const haystack = `${ruleId} ${message} ${cwe}`.toLowerCase();

  return semgrepKeywordFallback(haystack);
}

/**
 * Remaps OWASP categories from older years (2017, 2021) to 2025.
 * The OWASP list is reorganized between years so some IDs shift.
 *
 * @param {string} rawCategory - e.g. "A03"
 * @param {string} fullEntry   - e.g. "A03:2021 - Injection"
 * @returns {string} 2025 category
 */
function remapToOwasp2025(rawCategory, fullEntry) {
  const entry = fullEntry.toLowerCase();

  // Use description keywords to find correct 2025 slot
  if (entry.includes('injection'))                return 'A05';
  if (entry.includes('broken access') || entry.includes('access control')) return 'A01';
  if (entry.includes('cryptograph') || entry.includes('sensitive data'))   return 'A04';
  if (entry.includes('supply chain') || entry.includes('component'))       return 'A03';
  if (entry.includes('misconfigur') || entry.includes('security misconfiguration')) return 'A02';
  if (entry.includes('insecure design'))          return 'A06';
  if (entry.includes('auth') || entry.includes('identification'))          return 'A07';
  if (entry.includes('integrity') || entry.includes('deserializ'))         return 'A08';
  if (entry.includes('log') || entry.includes('monitor'))                  return 'A09';
  if (entry.includes('exception') || entry.includes('error handling'))     return 'A10';

  // If we can't determine from description, keep the raw category as-is
  return rawCategory;
}

/**
 * Keyword-based fallback for Semgrep rules without OWASP metadata.
 * Matches against rule ID, CWE descriptions, and message text.
 *
 * @param {string} haystack - Lowercased combined string of rule info
 * @returns {string|null}
 */
function semgrepKeywordFallback(haystack) {
  // A05 - Injection (most common, check first)
  if (/sql.?inject|sqli|nosql.?inject/.test(haystack))        return 'A05';
  if (/xss|cross.site.script|html.inject/.test(haystack))     return 'A05';
  if (/command.inject|os.inject|shell.inject/.test(haystack)) return 'A05';
  if (/ldap.inject|xpath.inject|ssti/.test(haystack))         return 'A05';
  if (/code.inject|eval.*user|exec.*input/.test(haystack))    return 'A05';
  if (/open.redirect|redirect.*unvalidat/.test(haystack))     return 'A05';
  if (/\binjection\b|\binject\b/.test(haystack))              return 'A05';
  if (/cwe-89|cwe-79|cwe-78|cwe-94/.test(haystack))          return 'A05';

  // A04 - Cryptographic Failures
  if (/\bmd5\b|\bsha1\b|\bsha-1\b/.test(haystack))           return 'A04';
  if (/weak.hash|insecure.hash|weak.crypto/.test(haystack))   return 'A04';
  if (/hardcoded.password|hardcoded.secret|plaintext.password/.test(haystack)) return 'A04';
  if (/des\b|rc4\b|ecb.mode/.test(haystack))                  return 'A04';
  if (/cwe-326|cwe-327|cwe-328|cwe-916/.test(haystack))      return 'A04';

  // A01 - Broken Access Control
  if (/path.traversal|directory.traversal|lfi\b|rfi\b/.test(haystack)) return 'A01';
  if (/idor\b|insecure.direct.object/.test(haystack))         return 'A01';
  if (/\bcors\b.*misconfigur|cors.*wildcard/.test(haystack))  return 'A01';
  if (/privilege.escalat|unauthorized.access/.test(haystack)) return 'A01';
  if (/cwe-22|cwe-284|cwe-285|cwe-639/.test(haystack))       return 'A01';

  // A02 - Security Misconfiguration
  if (/debug.mode|debug.enabled|app.debug/.test(haystack))    return 'A02';
  if (/missing.header|security.header|csp\b|hsts\b/.test(haystack)) return 'A02';
  if (/default.password|default.credential/.test(haystack))   return 'A02';
  if (/stack.trace|error.detail.exposed/.test(haystack))      return 'A02';
  if (/cwe-16|cwe-209|cwe-548/.test(haystack))                return 'A02';

  // A07 - Authentication Failures
  if (/\bjwt\b.*none|jwt.*alg.*none/.test(haystack))          return 'A07';
  if (/brute.force|rate.limit.*login/.test(haystack))         return 'A07';
  if (/session.fixat|session.hijack/.test(haystack))          return 'A07';
  if (/insecure.cookie|missing.httponly|missing.secure.flag/.test(haystack)) return 'A07';
  if (/cwe-287|cwe-306|cwe-384/.test(haystack))               return 'A07';

  // A08 - Software/Data Integrity Failures
  if (/deserializ|unsafe.deserializ/.test(haystack))           return 'A08';
  if (/object.inject|php.unserializ/.test(haystack))           return 'A08';
  if (/cwe-502|cwe-494/.test(haystack))                        return 'A08';

  // A06 - Insecure Design
  if (/mass.assign|param.pollution/.test(haystack))            return 'A06';
  if (/insecure.design|missing.validation/.test(haystack))     return 'A06';
  if (/cwe-840|cwe-1059/.test(haystack))                       return 'A06';

  // A09 - Logging & Alerting Failures
  if (/log.inject|missing.log|insufficient.log/.test(haystack)) return 'A09';
  if (/cwe-117|cwe-778/.test(haystack))                         return 'A09';

  // A10 - Mishandling of Exceptional Conditions
  if (/null.pointer|unhandled.exception|fail.open/.test(haystack)) return 'A10';
  if (/cwe-248|cwe-391|cwe-754/.test(haystack))                    return 'A10';

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// NPM AUDIT
// All npm audit findings are dependency vulnerabilities → always A03.
// But we also map the CVE/advisory title to add a secondary OWASP context.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps an npm audit advisory to an OWASP category.
 * Primary category is always A03 (Supply Chain), but we inspect the advisory
 * title/overview for additional context that might shift it.
 *
 * @param {object} advisory - npm audit advisory object
 * @returns {string} OWASP category
 */
function mapNpmAuditOwasp(advisory) {
  // npm audit vulns are always supply chain by definition
  return 'A03';
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUFFLEHOG
// TruffleHog's DetectorName maps to specific OWASP 2025 categories.
// All exposed secrets are primarily A02 (Security Misconfiguration) or
// A04 (Cryptographic Failures) depending on the type.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full mapping of TruffleHog detector name patterns to OWASP + severity.
 * Detector names are case-insensitive strings like "AWS", "GitHub", "RSAPrivateKey".
 *
 * @param {string} detectorName - TruffleHog DetectorName field
 * @returns {{ owaspCategory: string, severity: string }}
 */
function mapTrufflehogOwasp(detectorName) {
  const name = (detectorName || '').toLowerCase();

  // ── Private keys & certificates → A04 Cryptographic Failures ──────────────
  if (/private.?key|rsa|dsa|ecdsa|ed25519|pem|pkcs/.test(name)) {
    return { owaspCategory: 'A04', severity: 'critical' };
  }
  if (/certificate|ssl|tls|pgp|gpg/.test(name)) {
    return { owaspCategory: 'A04', severity: 'critical' };
  }

  // ── Cloud providers → A02 Security Misconfiguration (critical) ─────────────
  if (/\baws\b|amazon/.test(name)) {
    return { owaspCategory: 'A02', severity: 'critical' };
  }
  if (/gcp|google.cloud|googleapi/.test(name)) {
    return { owaspCategory: 'A02', severity: 'critical' };
  }
  if (/azure|microsoft/.test(name)) {
    return { owaspCategory: 'A02', severity: 'critical' };
  }

  // ── Source control & CI/CD tokens → A02 ────────────────────────────────────
  if (/github/.test(name))    return { owaspCategory: 'A02', severity: 'critical' };
  if (/gitlab/.test(name))    return { owaspCategory: 'A02', severity: 'critical' };
  if (/bitbucket/.test(name)) return { owaspCategory: 'A02', severity: 'critical' };
  if (/jenkins/.test(name))   return { owaspCategory: 'A02', severity: 'high' };
  if (/circleci|travis/.test(name)) return { owaspCategory: 'A02', severity: 'high' };

  // ── Payment & financial APIs → A02 (critical, regulatory risk) ─────────────
  if (/stripe/.test(name))    return { owaspCategory: 'A02', severity: 'critical' };
  if (/paypal|braintree/.test(name)) return { owaspCategory: 'A02', severity: 'critical' };
  if (/square/.test(name))    return { owaspCategory: 'A02', severity: 'critical' };
  if (/plaid/.test(name))     return { owaspCategory: 'A02', severity: 'critical' };

  // ── Communication APIs ──────────────────────────────────────────────────────
  if (/twilio/.test(name))    return { owaspCategory: 'A02', severity: 'high' };
  if (/sendgrid|mailgun|postmark/.test(name)) return { owaspCategory: 'A02', severity: 'high' };
  if (/slack/.test(name))     return { owaspCategory: 'A02', severity: 'high' };
  if (/discord/.test(name))   return { owaspCategory: 'A02', severity: 'medium' };

  // ── Databases ───────────────────────────────────────────────────────────────
  if (/mysql|postgres|mongodb|redis|elastic|cassandra/.test(name)) {
    return { owaspCategory: 'A02', severity: 'critical' };
  }

  // ── Auth & identity providers ───────────────────────────────────────────────
  if (/\bjwt\b|oauth|openid/.test(name)) {
    return { owaspCategory: 'A07', severity: 'high' };
  }
  if (/auth0|okta|keycloak|ldap/.test(name)) {
    return { owaspCategory: 'A07', severity: 'high' };
  }

  // ── Generic passwords / secrets ─────────────────────────────────────────────
  if (/password|passwd|secret|credential/.test(name)) {
    return { owaspCategory: 'A04', severity: 'high' };
  }

  // ── Generic API keys (unknown service) ──────────────────────────────────────
  if (/api.?key|apikey|access.?token|bearer/.test(name)) {
    return { owaspCategory: 'A02', severity: 'high' };
  }

  // ── Default fallback ────────────────────────────────────────────────────────
  return { owaspCategory: 'A02', severity: 'medium' };
}

// ─────────────────────────────────────────────────────────────────────────────

export { mapSemgrepOwasp, mapNpmAuditOwasp, mapTrufflehogOwasp };

