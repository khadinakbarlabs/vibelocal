import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInput, makePlan, verifyPlan, fingerprint } from '../skills/vibelocal/scripts/contracts.mjs';
import { summarizeRanks, compareRanks, renderReport, makeLocalSchema } from '../skills/vibelocal/scripts/report.mjs';

const input = {
  businessName: 'Example Dental', placeId: 'ChIJExampleDental',
  keywords: ['dentist near me'], locations: [{ label: 'Centre', locationCoordinate: '40.7128,-74.006,500' }],
  languageCode: 'en', device: 'desktop', depth: 100
};
const row = (rank, extra = {}) => ({
  ...input, keywords: undefined, locations: undefined,
  keyword: 'dentist near me', locationLabel: 'Centre', locationCoordinate: '40.7128,-74.006,500',
  checkedAt: '2026-10-11T08:00:00.000Z', localPackRank: rank,
  localPackFound: rank !== null, organicRank: null, organicFound: false,
  rankStatus: rank === null ? 'not_found' : 'local_pack', targetMatchMethod: rank === null ? null : 'place_id',
  providerMode: 'standard', checkUrl: 'https://www.google.com/search?q=dentist', ...extra
});
const snapshot = (records, extra = {}) => ({ actor: 'maps-ranks', source: 'import', records, coverage: { expected: records.length, collected: records.length, truncated: false }, ...extra });

test('rejects ambiguous location selectors and duplicate points', () => {
  assert.throws(() => validateInput('maps-ranks', { ...input, locations: [{ locationName: 'New York', locationCoordinate: '40,-74' }] }), /exactly one/);
  assert.throws(() => validateInput('maps-ranks', { ...input, locations: [input.locations[0], input.locations[0]] }), /duplicate/i);
});
test('rejects invalid coordinates and unbounded inputs', () => {
  assert.throws(() => validateInput('maps-ranks', { ...input, locations: [{ locationCoordinate: '91,-74' }] }), /coordinate/i);
  assert.throws(() => validateInput('maps-ranks', { ...input, keywords: Array(21).fill('dentist') }), /20|bound/);
  assert.throws(() => validateInput('maps-ranks', { ...input, providerToken: 'DO_NOT_SEND' }), /unknown|unsupported/i);
});
test('citations reject unsupported countries and preserve branch identity', () => {
  assert.throws(() => validateInput('citations', { businesses: [{ businessName: 'Example', phone: '1234567', city: 'Riyadh' }], country: 'SA' }), /country|enum/i);
  const valid = validateInput('citations', { businesses: [{ businessName: 'Example', phone: '+1 212 555 0100', city: 'New York', externalId: 'branch-001' }], country: 'US' });
  assert.equal(valid.businesses[0].externalId, 'branch-001');
});
test('reviews require precise targets, disable personal data and cap the sample', () => {
  assert.throws(() => validateInput('reviews', { searchQuery: 'dentists', maxReviews: 50 }), /precise|unsupported/i);
  assert.throws(() => validateInput('reviews', { placeIds: ['ChIJExample'], includePersonalData: true, maxReviews: 50 }), /personal/i);
  assert.throws(() => validateInput('reviews', { placeIds: ['ChIJExample'], maxReviews: 501 }), /500|bound/i);
});
test('blocks local/private URL targets and authentication-bearing URLs', () => {
  for (const url of ['http://localhost/a', 'https://127.0.0.1', 'https://[::1]', 'https://10.0.0.1', 'https://name:secret@example.com/', 'https://example.com/?token=secret']) {
    assert.throws(() => validateInput('website', { startUrls: [{ url }], maxPages: 10 }), /URL|public|credential/i);
  }
  assert.throws(() => validateInput('website', { startUrls: [{ url: 'https://example.com' }], respectRobotsTxt: false, maxPages: 10 }), /robots/i);
});
test('plan is bounded, deterministic and rejects mutation', () => {
  const plan = makePlan('maps-ranks', input, { eventCapUsd: 1, offline: true, now: '2026-10-11T08:00:00Z' });
  assert.equal(plan.units, 1); assert.equal(plan.runOptions.build, '0.1.25');
  assert.equal(plan.input.providerMode, 'standard'); assert.equal(plan.fingerprint, fingerprint(plan));
  assert.throws(() => verifyPlan({ ...plan, eventCapUsd: 500 }), /fingerprint|modified/i);
  assert.throws(() => makePlan('maps-ranks', input, { eventCapUsd: Infinity, offline: true }), /finite|cap/i);
});
test('review limits are shared per run and separately billed fallback is disclosed', () => {
  const plan = makePlan('reviews', { placeIds: ['ChIJExampleOne', 'ChIJExampleTwo'], maxReviews: 100 }, { eventCapUsd: 1, offline: true });
  assert.equal(plan.units, 100); assert.equal(plan.maxRows, 100);
  assert.match(plan.additionalCostNote, /separately billed/); assert.match(plan.additionalCostNote, /0\.50/);
});
test('missing checks stay unknown; not-found never becomes rank 101', () => {
  const a = summarizeRanks(snapshot([row(2), row(null, { locationCoordinate: '40.72,-74.006,500', locationLabel: 'North' })], { coverage: { expected: 3, collected: 2, truncated: false } }));
  assert.equal(a.validChecks, 2); assert.equal(a.missingChecks, 1); assert.equal(a.notFound, 1);
  assert.equal(a.averageRankWhenFound, 2); assert.equal(a.top3ShareOfObservedChecks, 0.5);
});
test('Maps organic compatibility fields cannot establish organic rankings', () => {
  assert.throws(() => summarizeRanks(snapshot([row(2, { organicRank: 3, organicFound: true })])), /Maps|organic/i);
});
test('rejects invalid ranks, duplicates and invalid status combinations', () => {
  assert.throws(() => summarizeRanks(snapshot([row(0)])), /rank/i);
  assert.throws(() => summarizeRanks(snapshot([row(2), row(2)])), /duplicate/i);
  assert.throws(() => summarizeRanks(snapshot([row(null, { localPackFound: true })])), /status|rank/i);
});
test('snapshot comparison checks geometry, identity, language, depth and chronology', () => {
  const before = snapshot([row(6)]), after = snapshot([row(2, { checkedAt: '2026-10-12T08:00:00Z' })]);
  const c = compareRanks(before, after); assert.equal(c.changes[0].positionsImproved, 4);
  for (const change of [{ locationCoordinate: '40.8,-74.006,500' }, { placeId: 'OtherPlace' }, { device: 'mobile' }, { languageCode: 'ar' }, { depth: 20 }]) {
    assert.throws(() => compareRanks(before, snapshot([row(2, { ...change, checkedAt: '2026-10-12T08:00:00Z' })])), /comparab|match|identity/i);
  }
  assert.throws(() => compareRanks(after, before), /later|chronolog/i);
});
test('comparison rejects incomplete provider evidence and distinct branches sharing a domain', () => {
  const before = snapshot([row(6, { placeId: null, targetDomain: 'example.com' })]);
  const after = snapshot([row(2, { placeId: null, targetDomain: 'example.com', checkedAt: '2026-10-12T08:00:00Z' })]);
  assert.throws(() => compareRanks(before, { ...after, source: 'apify', state: 'partial' }), /complete|comparab/i);
  assert.throws(() => compareRanks(before, { ...after, records: [{ ...after.records[0], businessName: 'Other branch' }] }), /identity|match|comparab/i);
});
test('report escapes fetched text and never includes reviewer identities', () => {
  const s = { actor: 'reviews', source: 'import', records: [{ rating: 2, text: '<script>alert(1)</script>', reviewerName: 'PRIVATE_NAME', reviewerUrl: 'PRIVATE_URL' }], coverage: { expected: 1, collected: 1 } };
  const html = renderReport([s], { businessName: '<img src=x onerror=alert(1)>', generatedAt: '2026-10-11' });
  assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('PRIVATE_NAME')); assert.ok(!html.includes('PRIVATE_URL'));
  assert.ok(html.includes('Content-Security-Policy')); assert.ok(html.includes('default-src'));
});
test('schema never publishes a hidden service-area address or fabricated review stars', () => {
  const r = makeLocalSchema({ businessName: 'Example Plumber', type: 'service-area', website: 'https://example.com/', serviceAreas: ['New York'], privateAddress: 'SECRET_HOME' });
  assert.equal(r.schema['@type'], 'LocalBusiness'); assert.ok(!r.schema.address);
  assert.ok(!JSON.stringify(r).includes('SECRET_HOME')); assert.ok(!r.schema.aggregateRating);
  assert.throws(() => makeLocalSchema({ businessName: 'Example', type: 'storefront', website: 'https://example.com/' }), /public address/i);
});
