const http = require('http');
const fs = require('fs');
const path = require('path');
const { slugify, catalogo, modelliPopolari, makes } = require('./lib/catalogo');

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

function html(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
  res.end(body);
}

function layout(title, description, content) {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="https://goosewebstore-cpu.github.io/autoesperto${content.canonical}"><style>body{font-family:system-ui,-apple-system,sans-serif;line-height:1.55;margin:0;background:#f5f5f7;color:#171717}main{max-width:900px;margin:auto;padding:28px 20px 56px}a{color:#0769d8;text-decoration:none}.card{background:#fff;border-radius:16px;padding:22px;margin:16px 0;box-shadow:0 2px 12px #0001}.score{font-size:2.4rem;font-weight:800;color:#16803c}.price{font-size:2rem;font-weight:800}ul{padding-left:20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.muted{color:#61616b}</style></head><body><main><a href="/">← AutoEsperto</a>${content.body}</main></body></html>`;
}

function modelPage(item) {
  const makeSlug = slugify(item.make), modelSlug = slugify(item.model);
  const name = `${item.make} ${item.model}`;
  const canonical = `/valutazione/${makeSlug}/${modelSlug}`;
  const body = `<h1>Valutazione usato ${name}</h1><p class="muted">Prezzi di mercato, affidabilità e alternative per ${name}.</p><section class="card"><div class="price">€ ${item.price.toLocaleString('it-IT')}</div><p>Prezzo medio indicativo per un esemplare usato in buone condizioni. Confronta anno, chilometri e allestimento prima di acquistare.</p><p><a rel="noopener" target="_blank" href="https://www.subito.it/annunci-italia/vendita/auto/?q=${encodeURIComponent(name)}">Vedi gli annunci reali su Subito.it →</a></p></section><section class="card"><h2>Affidabilità: <span class="score">${item.reliability}/10</span></h2><p>Indice orientativo basato sulla tipologia del modello: verifica sempre manutenzione documentata, prova su strada e ispezione indipendente.</p></section><section class="card"><h2>Alternative da valutare</h2><ul>${item.alternatives.map(x => `<li>${item.make} ${x}</li>`).join('')}</ul></section><section class="card"><h2>Come leggere questa stima</h2><p>Il valore è una fascia informativa, non una perizia. Il prezzo effettivo può variare per condizioni, dotazione, città e storico dell'auto.</p></section>`;
  return layout(`Valutazione ${name}: prezzo e affidabilità | AutoEsperto`, `Scopri prezzo usato, affidabilità e alternative di ${name}.`, { canonical, body });
}

function makePage(make) {
  const rows = catalogo.filter(x => x.make === make);
  const canonical = `/valutazione/${slugify(make)}`;
  const body = `<h1>Valutazione auto usate ${make}</h1><p class="muted">Seleziona un modello ${make} per vedere prezzo indicativo, affidabilità e alternative.</p><div class="grid">${rows.map(x => `<a class="card" href="/valutazione/${slugify(x.make)}/${slugify(x.model)}"><strong>${x.model}</strong><br><span class="muted">da € ${x.price.toLocaleString('it-IT')} · affidabilità ${x.reliability}/10</span></a>`).join('')}</div>`;
  return layout(`Valutazione ${make} usate | AutoEsperto`, `Prezzi e modelli ${make} usati.`, { canonical, body });
}

function sitemap(res) {
  const host = 'https://goosewebstore-cpu.github.io/autoesperto';
  const paths = ['/', ...makes.map(m => `/valutazione/${slugify(m)}`), ...catalogo.map(x => `/valutazione/${slugify(x.make)}/${slugify(x.model)}`)];
  res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
  res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p => `<url><loc>${host}${p}</loc></url>`).join('')}</urlset>`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true, service: 'autoesperto-api', time: new Date().toISOString() });
  if (req.method === 'GET' && url.pathname === '/sitemap.xml') return sitemap(res);
  if (req.method === 'GET' && url.pathname.startsWith('/valutazione/')) {
    const parts = url.pathname.split('/').filter(Boolean).slice(1).map(decodeURIComponent);
    const make = makes.find(m => slugify(m) === parts[0]);
    if (!make) return html(res, layout('Pagina non trovata', 'Pagina non trovata', { canonical: url.pathname, body: '<h1>Pagina non trovata</h1>' }), 404);
    if (parts.length === 1) return html(res, makePage(make));
    const model = catalogo.find(x => x.make === make && slugify(x.model) === parts[1]);
    return model ? html(res, modelPage(model)) : html(res, layout('Pagina non trovata', 'Pagina non trovata', { canonical: url.pathname, body: '<h1>Pagina non trovata</h1>' }), 404);
  }
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
