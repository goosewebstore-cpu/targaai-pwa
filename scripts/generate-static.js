const fs = require('fs');
const path = require('path');
const { catalogo, makes, slugify } = require('../lib/catalogo');
const root = path.resolve(__dirname, '..');
const host = 'https://goosewebstore-cpu.github.io/autoesperto';

function write(relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}
function page(title, description, body, canonical) {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="${host}${canonical}"><style>body{font-family:system-ui,-apple-system,sans-serif;line-height:1.55;margin:0;background:#f5f5f7;color:#171717}main{max-width:900px;margin:auto;padding:28px 20px 56px}a{color:#0769d8;text-decoration:none}.card{background:#fff;border-radius:16px;padding:22px;margin:16px 0;box-shadow:0 2px 12px #0001}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.price{font-size:2rem;font-weight:800}.score{font-weight:800;color:#16803c;font-size:1.5rem}.muted{color:#61616b}</style></head><body><main><a href="${host}/">← AutoEsperto</a>${body}</main></body></html>`;
}
function modelPage(item) {
  const name = `${item.make} ${item.model}`, canonical = `/valutazione/${slugify(item.make)}/${slugify(item.model)}/`;
  return page(`Valutazione ${name}: prezzo e affidabilità | AutoEsperto`, `Scopri prezzo usato, affidabilità e alternative di ${name}.`, `<h1>Valutazione usato ${name}</h1><p class="muted">Prezzi di mercato, affidabilità e alternative per ${name}.</p><section class="card"><div class="price">€ ${item.price.toLocaleString('it-IT')}</div><p>Prezzo medio indicativo per un esemplare usato in buone condizioni.</p><p><a target="_blank" rel="noopener" href="https://www.subito.it/annunci-italia/vendita/auto/?q=${encodeURIComponent(name)}">Vedi gli annunci reali su Subito.it →</a></p></section><section class="card"><h2>Affidabilità: <span class="score">${item.reliability}/10</span></h2><p>Verifica sempre manutenzione documentata, prova su strada e ispezione indipendente.</p></section><section class="card"><h2>Alternative da valutare</h2><p>${item.alternatives.map(x => `${item.make} ${x}`).join(' · ')}</p></section>`, canonical);
}
for (const make of makes) {
  const rows = catalogo.filter(x => x.make === make), slug = slugify(make);
  write(`valutazione/${slug}/index.html`, page(`Valutazione ${make} usate | AutoEsperto`, `Prezzi e modelli ${make} usati.`, `<h1>Valutazione auto usate ${make}</h1><div class="grid">${rows.map(x => `<a class="card" href="${host}/valutazione/${slug}/${slugify(x.model)}/"><strong>${x.model}</strong><br><span class="muted">da € ${x.price.toLocaleString('it-IT')} · affidabilità ${x.reliability}/10</span></a>`).join('')}</div>`, `/valutazione/${slug}/`));
}
for (const item of catalogo) write(`valutazione/${slugify(item.make)}/${slugify(item.model)}/index.html`, modelPage(item));
const urls = ['/', ...makes.map(x => `/valutazione/${slugify(x)}/`), ...catalogo.map(x => `/valutazione/${slugify(x.make)}/${slugify(x.model)}/`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(x => `<url><loc>${host}${x}</loc></url>`).join('')}</urlset>`);
console.log(`Generated ${catalogo.length} model pages and ${makes.length} make pages.`);
