const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const ANALYSES_FILE = path.join(DATA_DIR, 'analyses.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ANALYSES_FILE)) fs.writeFileSync(ANALYSES_FILE, '[]\n', 'utf8');

function send(res, status, payload, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(payload));
}

function previewVehicle(plate, reason = 'Provider targa non configurato') {
  return {
    preview: true,
    lookupMode: 'preview',
    lookupMessage: `${reason}. Inserisci prezzo e chilometri per una stima preliminare; non sono dati ufficiali.`,
    CarMake: 'Veicolo',
    CarModel: 'da identificare',
    RegistrationYear: '',
    FuelType: '',
    Description: `Analisi preliminare ${plate}`,
  };
}

async function findVehicle(plate) {
  // Il provider può essere sostituito senza esporre chiavi nel frontend.
  // REGCHECK_USERNAME è usato solo come compatibilità con l'attuale demo.
  const username = process.env.REGCHECK_USERNAME;
  if (!username) return previewVehicle(plate);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const url = `https://www.regcheck.org.uk/api/reg.asmx/CheckItaly?RegistrationNumber=${encodeURIComponent(plate)}&username=${encodeURIComponent(username)}`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
    const xml = await response.text();
    const match = xml.match(/<vehicleJson>([\s\S]*?)<\/vehicleJson>/i);
    if (!match) throw new Error('Risposta provider non valida');
    const vehicle = JSON.parse(match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"'));
    return { ...vehicle, preview: false, lookupMode: 'verified' };
  } catch (error) {
    return previewVehicle(plate, 'Il provider targa non è momentaneamente disponibile');
  } finally {
    clearTimeout(timeout);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 100_000) reject(new Error('Richiesta troppo grande'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(requested).replace(/^([/\\])+/, '');
  const filePath = path.join(ROOT, safePath);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
  res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true, service: 'autoesperto-api', time: new Date().toISOString() });
  if (req.method === 'GET' && url.pathname === '/api/vehicle') {
    const plate = (url.searchParams.get('plate') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (plate.length < 5 || plate.length > 8) return send(res, 400, { error: 'Targa non valida' });
    return send(res, 200, { vehicle: await findVehicle(plate) });
  }
  if (req.method === 'POST' && url.pathname === '/api/analyses') {
    try {
      const entry = JSON.parse(await readBody(req));
      const analyses = JSON.parse(fs.readFileSync(ANALYSES_FILE, 'utf8'));
      const saved = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), ...entry };
      analyses.unshift(saved);
      fs.writeFileSync(ANALYSES_FILE, JSON.stringify(analyses.slice(0, 500), null, 2));
      return send(res, 201, { id: saved.id });
    } catch { return send(res, 400, { error: 'Analisi non valida' }); }
  }
  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, '0.0.0.0', () => console.log(`AutoEsperto MVP attivo su http://localhost:${PORT}`));
