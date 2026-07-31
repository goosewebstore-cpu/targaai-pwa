/** Client-side report card used by model catalogue pages. */
export function ModelReportCard({ make, model, price, reliability, alternatives = [] }) {
  const query = encodeURIComponent(`${make} ${model}`);
  return `<article class="model-report-card"><h2>${make} ${model}</h2><p><strong>€ ${Number(price).toLocaleString('it-IT')}</strong> prezzo medio indicativo</p><p>Affidabilità: ${reliability}/10</p><a target="_blank" rel="noopener" href="https://www.subito.it/annunci-italia/vendita/auto/?q=${query}">Annunci reali su Subito.it</a><p>Alternative: ${alternatives.join(', ')}</p></article>`;
}
