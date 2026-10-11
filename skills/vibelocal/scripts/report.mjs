import { actors, need, canonical, locationKey, publicUrl } from './contracts.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const identity = row => row.placeId ? 'place:' + row.placeId : row.cid ? 'cid:' + row.cid : row.targetDomain ? 'domain:' + row.targetDomain.toLowerCase() + ':name:' + String(row.businessName ?? '').trim().toLowerCase() : 'name:' + String(row.businessName ?? '').trim().toLowerCase();
const observationKey = row => canonical([identity(row), row.keyword, locationKey(row), row.languageCode, row.device, row.depth, row.providerMode]);

export function summarizeRanks(snapshot) {
  need(snapshot.actor === 'maps-ranks' && Array.isArray(snapshot.records), 'Expected a Maps rank snapshot.');
  const seen = new Set();
  for (const row of snapshot.records) {
    need(typeof row.keyword === 'string' && row.keyword.trim() && typeof row.businessName === 'string' && row.businessName.trim() && ['desktop', 'mobile'].includes(row.device) && typeof row.languageCode === 'string' && row.languageCode.trim() && ['standard', 'live'].includes(row.providerMode) && Number.isInteger(row.depth) && row.depth >= 20 && row.depth <= 100, 'Maps row is missing comparable query, identity or search settings.');
    need(row.organicRank == null && row.organicFound !== true, 'Maps compatibility fields cannot establish organic rankings.');
    need(Number.isFinite(Date.parse(row.checkedAt)), 'Maps row needs a valid collection timestamp.');
    const key = observationKey(row); need(!seen.has(key), 'Duplicate Maps observations would bias the metrics.'); seen.add(key);
    const found = row.rankStatus === 'local_pack' && row.localPackFound === true && Number.isInteger(row.localPackRank) && row.localPackRank > 0 && row.localPackRank <= row.depth;
    const absent = row.rankStatus === 'not_found' && row.localPackFound === false && row.localPackRank === null;
    need(found || absent, 'Invalid Maps rank or contradictory rank status.');
  }
  const foundRows = snapshot.records.filter(r => r.localPackFound), n = snapshot.records.length;
  const expected = snapshot.coverage?.expected;
  need(expected == null || (Number.isInteger(expected) && expected >= n), 'Expected check count cannot be smaller than collected rows.');
  return {
    validChecks: n, foundChecks: foundRows.length, notFound: n - foundRows.length,
    expectedChecks: expected ?? null, missingChecks: expected == null ? null : expected - n,
    top3ShareOfObservedChecks: n ? snapshot.records.filter(r => r.localPackRank !== null && r.localPackRank <= 3).length / n : null,
    averageRankWhenFound: foundRows.length ? foundRows.reduce((sum, r) => sum + r.localPackRank, 0) / foundRows.length : null,
    nameOnlyMatches: foundRows.filter(r => r.targetMatchMethod === 'name' || !r.targetMatchMethod).length,
    rows: snapshot.records.map(r => ({ ...r, observationKey: observationKey(r) }))
  };
}

export function compareRanks(before, after) {
  need(![before, after].some(s => s.source === 'apify' && s.state !== 'completed'), 'Snapshots are not comparable: provider collection evidence must be complete.');
  const a = summarizeRanks(before), b = summarizeRanks(after);
  need(a.rows.length > 0 && a.rows.length === b.rows.length && a.missingChecks === 0 && b.missingChecks === 0 && !before.coverage?.truncated && !after.coverage?.truncated, 'Snapshots are not comparable: require complete, matching observed checks.');
  const previous = new Map(a.rows.map(r => [r.observationKey, r]));
  const changes = b.rows.map(row => {
    const old = previous.get(row.observationKey); need(old, 'Snapshots are not comparable: identity, grid geometry or search settings do not match.');
    need(Date.parse(row.checkedAt) > Date.parse(old.checkedAt), 'The comparison snapshot must be later chronologically.');
    return { keyword: row.keyword, location: row.locationLabel, before: old.localPackRank, after: row.localPackRank,
      positionsImproved: old.localPackRank !== null && row.localPackRank !== null ? old.localPackRank - row.localPackRank : null,
      transition: old.localPackRank === null ? row.localPackRank === null ? 'still_not_found' : 'newly_found' : row.localPackRank === null ? 'no_longer_found' : 'both_found' };
  });
  return { format: 'vibelocal-comparison/1', metric: 'Google Maps provider snapshots', changes,
    beforeTop3Share: a.top3ShareOfObservedChecks, afterTop3Share: b.top3ShareOfObservedChecks,
    caveat: 'Observed change does not prove that any SEO action caused the change. Not-found positions are never substituted with a numeric rank.' };
}

const cellContent = cell => {
  if (typeof cell === 'string' && cell.startsWith('https://')) {
    try { return `<a href="${escape(publicUrl(cell))}" target="_blank" rel="noopener noreferrer">${escape(cell)}</a>`; } catch { /* Unsafe values remain escaped text, never links. */ }
  }
  return escape(cell);
};
const table = (headers, rows) => `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cellContent(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
function rankSection(s) {
  const m = summarizeRanks(s);
  const pct = m.top3ShareOfObservedChecks == null ? 'Unknown' : (100 * m.top3ShareOfObservedChecks).toFixed(1) + '%';
  const cards = [['Observed checks', m.validChecks], ['Unknown checks', m.missingChecks ?? 'Unknown'], ['Top 3 / observed', pct], ['Mean rank / found', m.averageRankWhenFound?.toFixed(1) ?? 'Unknown']];
  const points = m.rows.map(r => `<div class="point ${r.localPackRank === null ? 'absent' : r.localPackRank <= 3 ? 'top' : 'other'}"><span>${escape(r.locationLabel || locationKey(r))}</span><b>${r.localPackRank ?? 'Not found'}</b><small>${escape(r.keyword)}</small></div>`).join('');
  return `<div class="metrics">${cards.map(([label, value]) => `<div><small>${escape(label)}</small><strong>${escape(value)}</strong></div>`).join('')}</div><p>Top-3 share uses valid observed checks, including valid not-found checks. Missing checks remain unknown. The mean uses found checks only.</p><div class="points">${points}</div>${table(['Query', 'Point', 'Maps rank', 'Match', 'Observed', 'Evidence'], m.rows.map(r => [r.keyword, r.locationLabel || locationKey(r), r.localPackRank ?? `Not found within depth ${r.depth}`, r.targetMatchMethod ?? 'Not matched', r.checkedAt, r.checkUrl]))}`;
}
function sectionContent(s) {
  const rows = s.records;
  if (s.actor === 'maps-ranks') return rankSection(s);
  if (s.actor === 'places') return table(['Business', 'Category', 'Rating', 'Review count', 'Public listing'], rows.slice(0, 100).map(r => [r.business_name, r.category, r.rating ?? 'Unknown', r.review_count ?? 'Unknown', r.google_maps_url]));
  if (s.actor === 'reviews') {
    const valid = rows.filter(r => Number.isFinite(r.rating) && r.rating >= 1 && r.rating <= 5), responded = valid.filter(r => r.ownerResponse);
    return `<p>${valid.length} sampled rated reviews; ${responded.length} include an owner response. This sample does not establish the whole profile's average rating or response rate.</p>${table(['Rating', 'Review excerpt', 'Owner response', 'Published', 'Review evidence'], rows.slice(0, 100).map(r => [r.rating ?? 'Unknown', String(r.text ?? '').slice(0, 400), r.ownerResponse ? 'Present' : 'Not observed', r.publishedAt ?? 'Unknown', r.reviewUrl ?? 'Not supplied']))}`;
  }
  if (s.actor === 'citations') return table(['Branch', 'Business', 'Directories checked', 'Observed conflicts', 'Insufficient evidence', 'Collected'], rows.map(r => [r.externalId ?? 'Unspecified', r.businessName, r.directoriesChecked ?? 'Unknown', r.directoriesWithObservedMismatch ?? 'Unknown', r.directoriesWithInsufficientEvidence ?? 'Unknown', r.collectedAt]));
  if (s.actor === 'website') return table(['Page', 'HTTP', 'Title', 'Observed issues', 'Fetched'], rows.slice(0, 100).map(r => [r.url, r.statusCode ?? 'Unknown', r.title ?? 'Unknown', Array.isArray(r.issueFlags) ? r.issueFlags.join(', ') : 'Unknown', r.scrapedAt]));
  if (s.actor === 'local-pack') return table(['Query', 'Point', 'Returned businesses', 'Local pack present', 'Observed', 'Evidence'], rows.map(r => [r.query, r.locationLabel, r.localPackSize ?? 'Unknown', r.localPackFound === true ? 'Yes' : r.localPackFound === false ? 'No in this snapshot' : 'Unknown', r.snapshotAt, r.checkUrl]));
  return table(['Query', 'Country', 'Organic results returned', 'Observed', 'Evidence'], rows.map(r => [r.search_query, r.country_code, r.organic_results?.length ?? 'Unknown', r.scraped_at, r.source_url]));
}

export function renderReport(snapshots, options = {}) {
  need(Array.isArray(snapshots) && snapshots.length >= 1 && snapshots.length <= 20, 'Report needs 1–20 snapshots.');
  const titles = { 'maps-ranks': 'Google Maps rankings', 'local-pack': 'Google Search local pack', places: 'Local competitors and profiles', reviews: 'Review evidence', citations: 'Listing and citation consistency', website: 'Location-page crawl', serp: 'Organic search research' };
  const sections = snapshots.map(s => {
    need(actors[s.actor] && Array.isArray(s.records) && s.records.length <= 1000, 'Invalid or unbounded snapshot.');
    const coverage = s.coverage ?? {};
    const source = s.source === 'fixture' ? 'Illustrative fixture — no live collection' : s.source === 'import' ? 'User import — not independently verified' : s.state === 'completed' ? 'Completed collection with terminal readback' : `Collection state: ${s.state ?? 'unknown'}`;
    return `<section><div class="section-head"><h2>${escape(titles[s.actor])}</h2><span class="badge">${escape(source)}</span></div><p class="muted">${s.records.length} rows collected. Expected: ${escape(coverage.expected ?? 'unknown')}. ${coverage.truncated ? 'Collection was limited; further rows may exist.' : ''}</p>${sectionContent(s)}<details><summary>Collection evidence</summary><pre>${escape(JSON.stringify({ runId: s.runId ?? null, buildId: s.buildId ?? null, coverage, warnings: s.warnings ?? [], billing: s.billing ?? null }, null, 2))}</pre></details></section>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; base-uri 'none'; form-action 'none'"><title>VibeLocal local SEO report</title><style>
  :root{font:16px/1.55 system-ui,sans-serif;color:#173834;background:#f4f7f4}*{box-sizing:border-box}body{margin:0}main{max-width:1180px;margin:auto;padding:32px 22px}header{padding:30px 0}h1{font-size:clamp(30px,5vw,52px);line-height:1.15;letter-spacing:-1.4px;margin:12px 0}h2{font-size:23px;margin:0}p{max-width:85ch}.eyebrow{font-size:13px;font-weight:750;letter-spacing:2px;color:#39746a}.muted,small{color:#5d726d}section{background:#fff;border:1px solid #dbe4df;border-radius:18px;padding:24px;margin:22px 0}.section-head{display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap}.badge{font-size:12px;border:1px solid #d3ddd5;border-radius:8px;padding:5px 9px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:24px 0}.metrics>div{padding:18px;border-radius:12px;background:#f1f6f3}.metrics strong{display:block;font-size:30px}.points{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:10px}.point{display:flex;flex-direction:column;padding:15px;border-radius:12px}.point b{font-size:27px}.top{background:#e1f0e8}.other{background:#faf0d8}.absent{background:#edf0f0}.table-wrap{overflow:auto;margin:22px 0}table{width:100%;border-collapse:collapse;text-align:left;font-size:14px}th,td{padding:12px;border-bottom:1px solid #e6ebe7;vertical-align:top;overflow-wrap:anywhere;min-width:105px}th{background:#f5f7f5}details{margin-top:14px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;background:#f5f7f5;padding:14px;border-radius:10px}.notice{border-left:4px solid #598575;padding:12px 18px;background:#eaf2ec;border-radius:0 10px 10px 0}footer{font-size:13px;color:#61766e;padding:18px 0}@media(max-width:640px){main{padding:20px 12px}section{padding:17px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.section-head{display:block}.badge{display:inline-block;margin-top:10px}}
  </style></head><body><main><header><div class="eyebrow">VIBELOCAL · LOCAL SEO</div><h1>${escape(options.businessName ?? 'Local visibility report')}</h1><p>Google Business Profile, Google Maps rankings and source-linked local search evidence.</p><small>Prepared ${escape(options.generatedAt ?? new Date().toISOString())}</small></header><div class="notice">Use these observations to choose the next change. Rankings depend on query, location, language, device, depth and time. Public search data does not establish calls, bookings, revenue, profile ownership or verification status.</div>${sections}<section><h2>Decide what to do next</h2><ol><li>Confirm that each listing matches the correct business and branch.</li><li>Resolve factual customer-facing errors, such as incorrect contact details or opening hours, with the owner.</li><li>Review source-linked website issues, citation conflicts and recurring review themes.</li><li>Assign a person and a verification date to each approved change.</li><li>Collect a comparable later snapshot and add owner-provided performance or conversion exports when measuring business outcomes.</li></ol><p>Profile changes, review replies, citation edits and website publishing remain drafts for the owner to approve and carry out.</p></section><footer>VibeLocal is independent of Google and Anthropic. This private report contains no remote assets, tracking or executable scripts.</footer></main></body></html>`;
}

export function makeLocalSchema(context) {
  need(context.businessName?.trim() && ['storefront', 'hybrid', 'service-area'].includes(context.type), 'Business name and an accurate business type are required.');
  const url = publicUrl(context.website), schema = { '@context': 'https://schema.org', '@type': 'LocalBusiness', '@id': url.replace(/#.*$/, '') + '#business', name: context.businessName.trim(), url };
  if (context.publicPhone) schema.telephone = context.publicPhone;
  if (context.type !== 'service-area') {
    need(context.publicAddress?.streetAddress && context.publicAddress?.addressLocality && context.publicAddress?.addressCountry, 'A verified public address is required for a storefront or hybrid location.');
    const allowed = ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode', 'addressCountry'];
    schema.address = { '@type': 'PostalAddress', ...Object.fromEntries(allowed.filter(k => context.publicAddress[k]).map(k => [k, context.publicAddress[k]])) };
  }
  if (Array.isArray(context.serviceAreas) && context.serviceAreas.length <= 20) schema.areaServed = context.serviceAreas;
  return { schema, note: context.type === 'service-area' ? 'Hidden addresses stay private. This draft does not meet the address requirement for Google LocalBusiness rich results. Validate against visible page facts before publishing.' : 'Draft only. Validate the rendered markup against visible page facts and Google requirements. Valid markup does not guarantee a rich result or better ranking.' };
}
