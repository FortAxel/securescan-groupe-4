/**
 * @file report.service.js
 * @description Generates an exportable HTML report from an analysis and its findings.
 */

/**
 * Returns a severity badge styled inline.
 * @param {string} severity
 */
function severityBadge(severity) {
  const colors = {
    critical: { bg: '#7c0000', text: '#fff' },
    high:     { bg: '#c0392b', text: '#fff' },
    medium:   { bg: '#e67e22', text: '#fff' },
    low:      { bg: '#f1c40f', text: '#000' },
    info:     { bg: '#2980b9', text: '#fff' },
  };
  const s   = severity.toLowerCase();
  const col = colors[s] || { bg: '#95a5a6', text: '#fff' };
  return `<span style="background:${col.bg};color:${col.text};padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;text-transform:uppercase;">${s}</span>`;
}

/**
 * Builds an HTML row for a finding.
 * @param {Object} f - Finding object
 * @param {number} index
 */
function findingRow(f, index) {
  return `
    <tr style="background:${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
      <td style="padding:10px 14px;border-bottom:1px solid #e9ecef;">${f.id}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e9ecef;">${severityBadge(f.severity)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e9ecef;">${f.owaspCategory || '—'}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e9ecef;">${f.tool}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e9ecef;">${f.title}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e9ecef;font-family:monospace;font-size:12px;color:#555;">${f.filePath || '—'}${f.lineStart ? `:${f.lineStart}` : ''}</td>
    </tr>`;
}

/**
 * Builds an HTML row for a validated correction.
 * @param {Object} c - Correction object
 * @param {number} index
 */
function correctionRow(c, index) {
  return `
    <tr style="background:${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
      <td style="padding:10px 14px;border-bottom:1px solid #e9ecef;">${c.findingId}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e9ecef;">${c.type.replace(/_/g, ' ')}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e9ecef;">
        <code style="background:#f1f3f5;padding:2px 6px;border-radius:3px;font-size:12px;color:#c0392b;">${escapeHtml(c.originalSnippet)}</code>
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #e9ecef;">
        <code style="background:#f1f3f5;padding:2px 6px;border-radius:3px;font-size:12px;color:#27ae60;">${escapeHtml(c.fixedSnippet)}</code>
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #e9ecef;font-size:12px;color:#555;">${c.validatedAt ? new Date(c.validatedAt).toLocaleDateString('fr-FR') : '—'}</td>
    </tr>`;
}

/**
 * Escapes special HTML characters to prevent XSS in the report.
 * @param {string} str
 */
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Builds the grade color for the score badge.
 * @param {string} grade
 */
function gradeColor(grade) {
  const map = { A: '#27ae60', B: '#2ecc71', C: '#f39c12', D: '#e67e22', F: '#c0392b' };
  return map[grade] || '#95a5a6';
}

/**
 * Generates a full HTML report for a given analysis.
 *
 * @param {Object} analysis  - Analysis record with project relation
 * @param {Array}  findings  - Array of finding records
 * @param {Array}  corrections - Array of validated correction records
 * @returns {string} Full HTML document as string
 */
export function generateHtmlReport(analysis, findings, corrections) {
  const project     = analysis.project;
  const reportDate  = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // ── Summary ──
  const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  findings.forEach(f => { summary[f.severity.toLowerCase()]++; });
  const totalFindings  = findings.length;
  const criticalCount  = summary.critical;
  const highCount      = summary.high;

  // ── OWASP breakdown ──
  const owaspMap = findings.reduce((acc, f) => {
    const cat = f.owaspCategory || 'N/A';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const owaspRows = Object.entries(owaspMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, count], i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
        <td style="padding:8px 14px;border-bottom:1px solid #e9ecef;font-weight:600;">${cat}</td>
        <td style="padding:8px 14px;border-bottom:1px solid #e9ecef;">${count}</td>
      </tr>`).join('');

  const validatedCorrections = corrections.filter(c => c.status === 'VALIDATED');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rapport SecureScan — ${escapeHtml(project.name)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; color: #2c3e50; }
    .page { max-width: 1100px; margin: 0 auto; background: #fff; }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
      color: #fff; padding: 40px 48px; display: flex;
      justify-content: space-between; align-items: flex-start;
    }
    .header-brand { font-size: 13px; letter-spacing: 2px; text-transform: uppercase;
                    color: #a0aec0; margin-bottom: 8px; }
    .header-title { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
    .header-sub   { font-size: 14px; color: #a0aec0; }
    .score-box {
      text-align: center; background: rgba(255,255,255,0.08);
      border-radius: 12px; padding: 20px 28px;
    }
    .score-grade {
      font-size: 52px; font-weight: 800; line-height: 1;
      color: ${gradeColor(analysis.grade)};
    }
    .score-value { font-size: 13px; color: #a0aec0; margin-top: 4px; }

    /* ── Sections ── */
    .section { padding: 36px 48px; border-bottom: 1px solid #e9ecef; }
    .section:last-of-type { border-bottom: none; }
    .section-title {
      font-size: 18px; font-weight: 700; color: #1a1a2e;
      margin-bottom: 20px; padding-bottom: 10px;
      border-bottom: 3px solid #0f3460; display: inline-block;
    }

    /* ── Meta grid ── */
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .meta-card {
      background: #f8f9fa; border-radius: 8px; padding: 16px 20px;
      border-left: 4px solid #0f3460;
    }
    .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6c757d; }
    .meta-value { font-size: 16px; font-weight: 600; margin-top: 4px; color: #1a1a2e; }

    /* ── Summary cards ── */
    .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
    .summary-card { border-radius: 8px; padding: 16px; text-align: center; }
    .summary-card .count { font-size: 32px; font-weight: 800; }
    .summary-card .label { font-size: 11px; text-transform: uppercase; margin-top: 2px; opacity: 0.85; }

    /* ── Table ── */
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    thead tr { background: #1a1a2e; color: #fff; }
    thead th { padding: 12px 14px; text-align: left; font-weight: 600;
               font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }

    /* ── Executive summary ── */
    .exec-box {
      background: #f8f9fa; border-left: 4px solid #0f3460;
      border-radius: 0 8px 8px 0; padding: 20px 24px; font-size: 15px; line-height: 1.7;
    }
    .exec-box strong { color: #c0392b; }

    /* ── Footer ── */
    .footer {
      background: #1a1a2e; color: #a0aec0;
      padding: 24px 48px; display: flex;
      justify-content: space-between; align-items: center; font-size: 13px;
    }
    .footer-brand { color: #fff; font-weight: 700; font-size: 15px; }
  </style>
</head>
<body>
<div class="page">

  <!-- ══ HEADER ══ -->
  <div class="header">
    <div>
      <div class="header-brand">SecureScan — Security Report</div>
      <div class="header-title">${escapeHtml(project.name)}</div>
      <div class="header-sub">Rapport généré le ${reportDate}</div>
    </div>
    <div class="score-box">
      <div class="score-grade">${analysis.grade || '—'}</div>
      <div class="score-value">Score ${analysis.score ?? '—'} / 100</div>
    </div>
  </div>

  <!-- ══ METADATA ══ -->
  <div class="section">
    <div class="section-title">Informations générales</div>
    <div class="meta-grid">
      <div class="meta-card">
        <div class="meta-label">Projet</div>
        <div class="meta-value">${escapeHtml(project.name)}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Analyse #</div>
        <div class="meta-value">${analysis.id}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Statut</div>
        <div class="meta-value">${analysis.status}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Démarrée le</div>
        <div class="meta-value">${analysis.startedAt ? new Date(analysis.startedAt).toLocaleDateString('fr-FR') : '—'}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Terminée le</div>
        <div class="meta-value">${analysis.finishedAt ? new Date(analysis.finishedAt).toLocaleDateString('fr-FR') : '—'}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Corrections validées</div>
        <div class="meta-value">${validatedCorrections.length} / ${corrections.length}</div>
      </div>
    </div>
  </div>

  <!-- ══ EXECUTIVE SUMMARY ══ -->
  <div class="section">
    <div class="section-title">Résumé exécutif</div>
    <div class="exec-box">
      L'analyse du projet <strong>${escapeHtml(project.name)}</strong> a révélé
      <strong>${totalFindings} finding${totalFindings > 1 ? 's' : ''}</strong> au total,
      dont <strong>${criticalCount} critique${criticalCount > 1 ? 's' : ''}</strong>
      et <strong>${highCount} haute${highCount > 1 ? 's' : ''}</strong> sévérité.
      Le score global de sécurité est de <strong>${analysis.score ?? '—'}/100</strong>
      (grade <strong>${analysis.grade || '—'}</strong>).
      ${validatedCorrections.length > 0
        ? `<br/><br/>${validatedCorrections.length} correction${validatedCorrections.length > 1 ? 's ont' : ' a'} été validée${validatedCorrections.length > 1 ? 's' : ''} et appliquée${validatedCorrections.length > 1 ? 's' : ''}.`
        : '<br/><br/>Aucune correction n\'a encore été validée.'}
    </div>

    <!-- Severity cards -->
    <div class="summary-grid" style="margin-top:24px;">
      <div class="summary-card" style="background:#7c0000;color:#fff;">
        <div class="count">${summary.critical}</div>
        <div class="label">Critical</div>
      </div>
      <div class="summary-card" style="background:#c0392b;color:#fff;">
        <div class="count">${summary.high}</div>
        <div class="label">High</div>
      </div>
      <div class="summary-card" style="background:#e67e22;color:#fff;">
        <div class="count">${summary.medium}</div>
        <div class="label">Medium</div>
      </div>
      <div class="summary-card" style="background:#f1c40f;color:#000;">
        <div class="count">${summary.low}</div>
        <div class="label">Low</div>
      </div>
      <div class="summary-card" style="background:#2980b9;color:#fff;">
        <div class="count">${summary.info}</div>
        <div class="label">Info</div>
      </div>
    </div>
  </div>

  <!-- ══ OWASP BREAKDOWN ══ -->
  <div class="section">
    <div class="section-title">Répartition OWASP</div>
    <table>
      <thead>
        <tr>
          <th>Catégorie OWASP</th>
          <th>Nombre de findings</th>
        </tr>
      </thead>
      <tbody>
        ${owaspRows || '<tr><td colspan="2" style="padding:16px;text-align:center;color:#6c757d;">Aucune donnée OWASP</td></tr>'}
      </tbody>
    </table>
  </div>

  <!-- ══ FINDINGS TABLE ══ -->
  <div class="section">
    <div class="section-title">Détail des findings (${totalFindings})</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Sévérité</th>
          <th>OWASP</th>
          <th>Outil</th>
          <th>Titre</th>
          <th>Fichier / Ligne</th>
        </tr>
      </thead>
      <tbody>
        ${findings.length
          ? findings.map((f, i) => findingRow(f, i)).join('')
          : '<tr><td colspan="6" style="padding:16px;text-align:center;color:#6c757d;">Aucun finding</td></tr>'}
      </tbody>
    </table>
  </div>

  <!-- ══ CORRECTIONS ══ -->
  <div class="section">
    <div class="section-title">Corrections appliquées (${validatedCorrections.length})</div>
    <table>
      <thead>
        <tr>
          <th>Finding #</th>
          <th>Type</th>
          <th>Code original</th>
          <th>Code corrigé</th>
          <th>Validée le</th>
        </tr>
      </thead>
      <tbody>
        ${validatedCorrections.length
          ? validatedCorrections.map((c, i) => correctionRow(c, i)).join('')
          : '<tr><td colspan="5" style="padding:16px;text-align:center;color:#6c757d;">Aucune correction validée</td></tr>'}
      </tbody>
    </table>
  </div>

  <!-- ══ FOOTER ══ -->
  <div class="footer">
    <div>
      <div class="footer-brand">SecureScan by CyberSafe</div>
      <div>Rapport confidentiel — usage interne uniquement</div>
    </div>
    <div style="text-align:right;">
      <div>Généré le ${reportDate}</div>
      <div>Analyse #${analysis.id} — Projet ${escapeHtml(project.name)}</div>
    </div>
  </div>

</div>
</body>
</html>`;
}