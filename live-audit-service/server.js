// Live audit endpoint for The Agentic Web Index.
// GET /api/audit?target=example.com -> JSON audit report.
// No framework, plain Node http, in memory rate limiting.

import http from 'node:http';
import { fetchSite, normalizeOrigin } from 'agent-readiness-auditor/dist/fetch-site.js';
import { audit } from 'agent-readiness-auditor/dist/audit.js';

const PORT = process.env.PORT || 3000;

// Rate limits: 5 audits per IP per hour, 60 per hour globally.
const perIp = new Map();
let globalCount = 0;
let windowStart = Date.now();
const HOUR = 60 * 60 * 1000;

function allowed(ip) {
  const now = Date.now();
  if (now - windowStart > HOUR) {
    perIp.clear();
    globalCount = 0;
    windowStart = now;
  }
  if (globalCount >= 60) return false;
  const n = perIp.get(ip) || 0;
  if (n >= 5) return false;
  perIp.set(ip, n + 1);
  globalCount++;
  return true;
}

const ORIGINS = ['https://asishsingh.in', 'https://www.asishsingh.in'];

function corsHeaders(req) {
  const origin = req.headers.origin;
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin'
  };
}

function send(req, res, code, body) {
  res.writeHead(code, Object.assign({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  }, corsHeaders(req)));
  res.end(JSON.stringify(body));
}

const inFlight = new Set();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    return res.end();
  }
  if (url.pathname === '/health') return send(req, res, 200, { ok: true });
  if (url.pathname !== '/api/audit') return send(req, res, 404, { error: 'not found' });

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (!allowed(ip)) {
    return send(req, res, 429, { error: 'Rate limit reached. Try again in an hour, or run npx agent-readiness-auditor yourself.' });
  }

  const target = (url.searchParams.get('target') || '').trim().slice(0, 200);
  if (!target || !/^[a-z0-9.-]+(\.[a-z]{2,})(\/.*)?$/i.test(target.replace(/^https?:\/\//i, ''))) {
    return send(req, res, 400, { error: 'Pass a domain like example.com' });
  }

  let origin;
  try {
    origin = normalizeOrigin(target);
  } catch {
    return send(req, res, 400, { error: 'That does not look like a valid domain.' });
  }

  // Block internal targets
  if (/localhost|127\.|0\.0\.0\.0|\.local|^\d+\.\d+\.\d+\.\d+/.test(new URL(origin).hostname)) {
    return send(req, res, 400, { error: 'Public websites only.' });
  }

  if (inFlight.size >= 3) return send(req, res, 503, { error: 'Busy, try again in a minute.' });
  inFlight.add(origin);
  try {
    const ctx = await fetchSite(origin);
    const report = audit(ctx);
    send(req, res, 200, report);
  } catch (e) {
    send(req, res, 502, { error: String(e && e.message || e).slice(0, 300) });
  } finally {
    inFlight.delete(origin);
  }
});

server.listen(PORT, () => console.log('live audit service on :' + PORT));
