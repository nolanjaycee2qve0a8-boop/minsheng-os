'use strict';
// Dedicated loopback demo: serves public UI assets and a fixed offline mock only.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createOfflineEvidenceAnalysis } = require('./offline-evidence-analysis');
const { createLimitedOfflineEvaluation } = require('./limited-offline-evaluation');
const root = path.resolve(__dirname, '../..');
const PORT = 4189;
const ORIGIN = 'http://127.0.0.1:' + PORT;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
function staticPath(url, origin = ORIGIN) {
  let name;
  try { name = decodeURIComponent(new URL(url, origin).pathname); } catch { return null; }
  if (name === '/') name = '/index.html';
  if (name.includes('..') || name.includes('\\') || name.includes('\0')) return null;
  const relative = name.slice(1);
  if (!/^(?:index\.html|app\.js|[^/]+\.css|(?:data|modules|config|assets|adapters)\/[a-zA-Z0-9_./-]+)$/.test(relative) ||
      !types[path.extname(relative)]) return null;
  const full = path.resolve(root, relative);
  return full.startsWith(root + path.sep) ? full : null;
}
function createServer(service = createOfflineEvidenceAnalysis(), liveGate = null, port = PORT,
  evaluation = createLimitedOfflineEvaluation()) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('LOCAL_PORT_INVALID');
  const origin = 'http://127.0.0.1:' + port;
  return http.createServer(async (req, res) => {
    const send = (status, body) => {
      if (res.writableEnded || res.destroyed) return;
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(body));
    };
    if (req.headers.host !== '127.0.0.1:' + port) return send(403, { status: 'HOST_DENIED' });
    if (req.url === '/api/analysis/offline/health' && req.method === 'GET')
      return send(200, { status: 'OFFLINE_MOCK_READY', providerUsed: false, externalRequests: 0 });
    if (req.url === '/api/analysis/evaluation/health' && req.method === 'GET')
      return send(200, { status: 'SYNTHETIC_EVALUATION_READY', providerUsed: false,
        externalRequests: 0 });
    if (req.url === '/api/analysis/live' && !liveGate)
      return send(403, { status: 'EXTERNAL_CALL_NOT_AUTHORIZED',
        providerUsed: false, externalRequests: 0 });
    if (req.url === '/api/analysis/offline' || req.url === '/api/analysis/live' ||
        req.url === '/api/analysis/evaluation') {
      if (req.method !== 'POST') return send(405, { status: 'METHOD_NOT_ALLOWED' });
      if (req.headers.origin !== origin || !/^application\/json(?:;\s*charset=utf-8)?$/i.test(req.headers['content-type'] || ''))
        return send(403, { status: 'ORIGIN_OR_CONTENT_TYPE_DENIED' });
      const chunks = []; let bytes = 0;
      try {
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 2048) return send(413, { status: 'REQUEST_TOO_LARGE' });
          chunks.push(chunk);
        }
        const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (req.url === '/api/analysis/evaluation') {
          if (!input || Object.keys(input).join() !== 'caseId' ||
              typeof input.caseId !== 'string') return send(400, { status: 'INVALID_REQUEST' });
          return send(200, evaluation.evaluate(input.caseId));
        }
        if (!input || Object.keys(input).join() !== 'question' ||
            typeof input.question !== 'string') return send(400, { status: 'INVALID_REQUEST' });
        const answer = await (req.url === '/api/analysis/live' ? liveGate : service).analyze(input);
        return send(200, answer);
      } catch { return send(400, { status: 'INVALID_REQUEST' }); }
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, { status: 'METHOD_NOT_ALLOWED' });
    const file = staticPath(req.url, origin);
    if (!file) return send(404, { status: 'NOT_FOUND' });
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile() || stat.size > 4 * 1024 * 1024) return send(404, { status: 'NOT_FOUND' });
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] + '; charset=utf-8',
        'Content-Length': stat.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    } catch { send(404, { status: 'NOT_FOUND' }); }
  });
}
if (require.main === module) {
  const port = process.env.MINSHENG_DEMO_PORT ? Number(process.env.MINSHENG_DEMO_PORT) : PORT;
  const server = createServer(undefined, null, port);
  server.on('error', () => { console.error('OFFLINE_ANALYSIS_DEMO_FAILED'); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port + '/#qa/analysis-offline'));
}
module.exports = { createServer, PORT, staticPath };
