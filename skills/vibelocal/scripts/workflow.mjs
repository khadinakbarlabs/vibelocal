import { actors, need } from './contracts.mjs';
import { summarizeRanks } from './report.mjs';

const reviewFields = ['reviewId', 'placeName', 'placeId', 'rating', 'text', 'ownerResponse', 'publishedAt', 'reviewUrl', 'scrapedAt'];
export function minimizeRecords(alias, records) {
  need(actors[alias] && Array.isArray(records) && records.length <= actors[alias].maxRows, 'Records exceed the supported Actor collection bound.');
  need(records.every(r => r && typeof r === 'object' && !Array.isArray(r)), 'Each imported record must be a JSON object.');
  return alias === 'reviews' ? records.map(r => Object.fromEntries(reviewFields.filter(k => Object.hasOwn(r, k)).map(k => [k, r[k]]))) : records;
}
export function importSnapshot(alias, raw, { expected = null } = {}) {
  const records = minimizeRecords(alias, raw);
  need(expected === null || Number.isInteger(expected) && expected >= records.length && expected <= 100000, 'Expected count must be an integer at least as large as the imported record count.');
  const snapshot = { format: 'vibelocal-snapshot/1', actor: alias, source: 'import', state: 'imported', collectedAt: new Date().toISOString(),
    coverage: { expected, collected: records.length, truncated: expected !== null && expected > records.length }, records,
    warnings: ['User import; provider execution, billing and total coverage have not been independently verified.'] };
  if (alias === 'maps-ranks') summarizeRanks(snapshot);
  return snapshot;
}

export function demoSnapshots() {
  const labels = ['Northwest', 'North', 'Northeast', 'West', 'Centre', 'East', 'Southwest', 'South', 'Southeast'];
  const beforeRanks = [9, 6, 10, 5, 3, 7, null, 11, 14], afterRanks = [7, 4, 8, 3, 1, 5, null, 9, 12];
  const rank = (ranks, checkedAt) => ({ format: 'vibelocal-snapshot/1', actor: 'maps-ranks', source: 'fixture', state: 'fixture',
    coverage: { expected: 9, collected: 9, truncated: false },
    records: ranks.map((value, i) => ({ businessName: 'Example Dental', placeId: 'ChIJFictionalExampleDental', keyword: 'dentist near me',
      locationLabel: labels[i], locationCoordinate: `${(40.7128 + (1 - Math.floor(i / 3)) * 0.006).toFixed(4)},${(-74.006 + (i % 3 - 1) * 0.008).toFixed(4)},500`,
      checkedAt, languageCode: 'en', device: 'desktop', depth: 100, providerMode: 'standard', localPackRank: value, localPackFound: value !== null,
      organicRank: null, organicFound: false, rankStatus: value === null ? 'not_found' : 'local_pack', targetMatchMethod: value === null ? null : 'place_id',
      checkUrl: 'https://www.google.com/search?q=illustrative+dentist+example' })),
    warnings: ['Fictional example, created locally. No Actor ran and no ranking was observed.'] });
  const fixture = (actor, records) => ({ format: 'vibelocal-snapshot/1', actor, source: 'fixture', state: 'fixture', records,
    coverage: { expected: records.length, collected: records.length, truncated: false }, warnings: ['Illustrative fixture only.'] });
  return { before: rank(beforeRanks, '2026-10-10T08:00:00Z'), after: rank(afterRanks, '2026-10-11T08:00:00Z'), supporting: [
    fixture('places', [{ business_name: 'Example Dental', category: 'Dentist', rating: 4.6, review_count: 128, google_maps_url: 'https://www.google.com/maps/search/Example+Dental' },
      { business_name: 'Fictional Family Dental', category: 'Dentist', rating: 4.7, review_count: 206, google_maps_url: 'https://www.google.com/maps/search/Fictional+Family+Dental' }]),
    fixture('reviews', [{ rating: 2, text: 'Waited longer than expected. The appointment reminder was helpful.', ownerResponse: 'Thank you for your feedback. Please contact our office to discuss your experience.', publishedAt: '2026-10-07', reviewUrl: 'https://example.com/illustrative-review/1' },
      { rating: 5, text: 'The team explained my options clearly.', ownerResponse: 'Thank you for sharing your experience.', publishedAt: '2026-10-08', reviewUrl: 'https://example.com/illustrative-review/2' },
      { rating: 4, text: 'Friendly service. Finding parking was difficult.', ownerResponse: null, publishedAt: '2026-10-09', reviewUrl: 'https://example.com/illustrative-review/3' }]),
    fixture('citations', [{ externalId: 'example-branch-001', businessName: 'Example Dental', directoriesChecked: 15, directoriesWithObservedMismatch: 1, directoriesWithInsufficientEvidence: 4, collectedAt: '2026-10-11T08:00:00Z' }]),
    fixture('website', [{ url: 'https://example.com/locations/example-dental', statusCode: 200, title: 'Example Dental | Dentist in Example City', issueFlags: ['missing_meta_description'], scrapedAt: '2026-10-11T08:00:00Z' }]),
    fixture('local-pack', [{ query: 'dentist near me', locationLabel: 'Centre', localPackSize: 3, localPackFound: true, snapshotAt: '2026-10-11T08:00:00Z', checkUrl: 'https://www.google.com/search?q=illustrative+dentist+example' }]),
    fixture('serp', [{ search_query: 'emergency dentist Example City', country_code: 'us', organic_results: [{ title: 'Fictional result', url: 'https://example.com/' }], scraped_at: '2026-10-11T08:00:00Z', source_url: 'https://www.google.com/search?q=illustrative+emergency+dentist+example' }])
  ] };
}
