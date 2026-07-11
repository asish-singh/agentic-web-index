// Builds /agentic-web-index/index.html from panel.txt and results-2026-q3.csv
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const EDITION = 'Q3 2026';
const EDITION_DATE = 'July 2026';

// Sector per domain from panel.txt comments
const sectors = {};
let current = 'Other';
for (const line of fs.readFileSync(path.join(dir, 'panel.txt'), 'utf8').split('\n')) {
  const t = line.trim();
  if (t.startsWith('#')) {
    const label = t.replace(/^#+\s*/, '');
    if (!/panel|One URL|carry over|comparable|websites across/i.test(label) && label) current = label;
  } else if (t) {
    sectors[t] = current;
  }
}

// Parse CSV (simple parser handling quoted fields)
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const raw = parseCsv(fs.readFileSync(path.join(dir, 'results-2026-q3.csv'), 'utf8'));
const header = raw[0];
const idx = (name) => header.indexOf(name);
const rows = raw.slice(1).filter(r => r.length > 1 && r[0]);

const audited = [];
const unreachable = [];
for (const r of rows) {
  const target = r[idx('target')];
  const score = r[idx('score')];
  const entry = {
    target,
    sector: sectors[target] || 'Other',
    score: score === '' ? null : Number(score),
    grade: r[idx('grade')] || '',
    llms: Number(r[idx('llms-txt-present')]) > 0,
    robots: Number(r[idx('robots-ai-stance')]) >= 12,
    structured: Number(r[idx('structured-data')]) > 0,
    faq: Number(r[idx('answerability')]) >= 5,
    error: r[idx('error')] || ''
  };
  if (entry.score === null) unreachable.push(entry); else audited.push(entry);
}

audited.sort((a, b) => b.score - a.score || a.target.localeCompare(b.target));

const pct = (n, d) => Math.round((n / d) * 100);
const stats = {
  panel: rows.length,
  audited: audited.length,
  unreachable: unreachable.length,
  llms: pct(audited.filter(e => e.llms).length, audited.length),
  robots: pct(audited.filter(e => e.robots).length, audited.length),
  faq: pct(audited.filter(e => e.faq).length, audited.length),
  blocked: pct(unreachable.length, rows.length),
  median: audited[Math.floor(audited.length / 2)].score,
  top: audited[0]
};
const topScore = audited[0].score;
const topNames = audited.filter(e => e.score === topScore).map(e => e.target);
stats.topLabel = topNames.length > 1
  ? topNames.slice(0, -1).join(', ') + ' and ' + topNames[topNames.length - 1]
  : topNames[0];

// Sector table
const bySector = {};
for (const e of audited) {
  (bySector[e.sector] = bySector[e.sector] || []).push(e.score);
}
const sectorRows = Object.entries(bySector)
  .map(([s, scores]) => ({ s, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), n: scores.length }))
  .sort((a, b) => b.avg - a.avg);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const tableRows = audited.map((e, i) =>
  `<tr><td>${i + 1}</td><td class="idx-site">${esc(e.target)}</td><td class="idx-sector">${esc(e.sector)}</td><td class="idx-score">${e.score}</td><td><span class="grade grade-${e.grade.toLowerCase().replace('+', 'p')}">${e.grade}</span></td></tr>`
).join('\n');

const unreachableRows = unreachable.map(e =>
  `<li><strong>${esc(e.target)}</strong><span>${esc(e.sector)}</span></li>`
).join('\n');

const sectorTable = sectorRows.map(r =>
  `<tr><td>${esc(r.s)}</td><td>${r.n}</td><td class="idx-score">${r.avg}</td></tr>`
).join('\n');

// Horizontal bar chart of sector averages, single hue, theme aware via CSS vars.
const ROW_H = 36, LABEL_W = 240, CHART_W = 900, PLOT_W = CHART_W - LABEL_W - 60;
const chartH = sectorRows.length * ROW_H + 34;
const gridLines = [0, 25, 50, 75, 100].map(v => {
  const x = LABEL_W + (v / 100) * PLOT_W;
  return `<line x1="${x}" y1="6" x2="${x}" y2="${chartH - 28}" stroke="var(--line)" stroke-width="1"/>` +
    `<text x="${x}" y="${chartH - 10}" text-anchor="middle" font-size="12" fill="var(--muted)">${v}</text>`;
}).join('\n');
const bars = sectorRows.map((r, i) => {
  const y = i * ROW_H + 10;
  const w = Math.max((r.avg / 100) * PLOT_W, 3);
  return `<g class="sector-bar"><title>${esc(r.s)}, average ${r.avg}/100 across ${r.n} sites</title>` +
    `<text x="${LABEL_W - 12}" y="${y + 14}" text-anchor="end" font-size="13" fill="var(--ink)">${esc(r.s)}</text>` +
    `<rect x="${LABEL_W}" y="${y}" width="${w}" height="20" rx="4" fill="var(--accent)"/>` +
    `<text x="${LABEL_W + w + 8}" y="${y + 14}" font-size="12.5" fill="var(--muted)">${r.avg}</text></g>`;
}).join('\n');
const sectorChart =
  `<svg viewBox="0 0 ${CHART_W} ${chartH}" role="img" aria-label="Bar chart of average agent readiness score by sector, out of 100">\n` +
  `<g dominant-baseline="middle">\n${gridLines}\n${bars}\n</g>\n</svg>`;

const html = fs.readFileSync(path.join(dir, 'template.html'), 'utf8')
  .replaceAll('{{EDITION}}', EDITION)
  .replaceAll('{{EDITION_DATE}}', EDITION_DATE)
  .replaceAll('{{PANEL}}', stats.panel)
  .replaceAll('{{AUDITED}}', stats.audited)
  .replaceAll('{{LLMS}}', stats.llms)
  .replaceAll('{{ROBOTS}}', stats.robots)
  .replaceAll('{{FAQ}}', stats.faq)
  .replaceAll('{{BLOCKED}}', stats.blocked)
  .replaceAll('{{MEDIAN}}', stats.median)
  .replaceAll('{{TOPSITE}}', esc(stats.topLabel))
  .replaceAll('{{TOPSCORE}}', stats.top.score)
  .replaceAll('{{TABLE_ROWS}}', tableRows)
  .replaceAll('{{SECTOR_ROWS}}', sectorTable)
  .replaceAll('{{SECTOR_CHART}}', sectorChart)
  .replaceAll('{{UNREACHABLE_ROWS}}', unreachableRows)
  .replaceAll('{{UNREACHABLE_COUNT}}', stats.unreachable);

fs.writeFileSync(path.join(dir, '..', 'index.html'), html);
console.log('Built index.html:', stats.audited, 'ranked,', stats.unreachable, 'unreachable, median', stats.median);
