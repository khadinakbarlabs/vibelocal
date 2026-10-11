import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, chmod, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readToken, writePrivateJson, readJson } from '../skills/vibelocal/scripts/io.mjs';
import { ApifyClient, startRun, collectRun, reconcileRun } from '../skills/vibelocal/scripts/apify.mjs';
import { actors, makePlan } from '../skills/vibelocal/scripts/contracts.mjs';

const rankInput = { businessName: 'Example Dental', placeId: 'ChIJExampleDental', keywords: ['dentist'], locations: [{ label: 'Centre', locationCoordinate: '40,-74' }] };
const plan = () => makePlan('maps-ranks', rankInput, { eventCapUsd: 1 });
const temp = async t => { const dir = await mkdtemp(path.join(os.tmpdir(), 'vibelocal-test-')); t.after(() => rm(dir, { recursive: true, force: true })); return dir; };
const response = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
const baseMocks = async (url, init) => {
  const contract = actors['maps-ranks'];
  if (url.pathname.endsWith('/builds/default')) return response({ data: { id: contract.buildId, buildNumber: contract.buildNumber, status: 'SUCCEEDED', inputSchema: await readFile(new URL('../skills/vibelocal/references/schemas/maps-ranks.input.json', import.meta.url), 'utf8') } });
  if (url.pathname.endsWith('/acts/' + contract.id)) return response({ data: { id: contract.id, name: contract.slug, username: contract.owner, isPublic: true, pricingInfos: [{ startedAt: '2026-10-01', pricingPerEvent: { actorChargeEvents: Object.fromEntries(Object.entries(contract.eventRates).map(([k, v]) => [k, { eventPriceUsd: v }])) } }] } });
  if (init.method === 'POST') return response({ data: { id: 'RUNEXAMPLE123', actId: contract.id, buildId: contract.buildId, status: 'READY' } });
  throw new Error('Unexpected request');
};

test('private output uses exclusive creation and restrictive permissions', async t => {
  const dir = await temp(t), file = path.join(dir, 'receipt.json');
  await writePrivateJson(file, { status: 'planned' });
  assert.deepEqual(await readJson(file), { status: 'planned' });
  await assert.rejects(writePrivateJson(file, { status: 'overwrite' }), /exists|overwrite/i);
});
test('token must be explicitly selected, private and not a symlink', async t => {
  const dir = await temp(t), file = path.join(dir, 'selected.token');
  await writeFile(file, 'unit_test_credential', { mode: 0o600 });
  assert.equal(await readToken(file), 'unit_test_credential');
  await chmod(file, 0o644); await assert.rejects(readToken(file), /private|0600/i);
  await chmod(file, 0o600); await symlink(file, path.join(dir, 'linked.token'));
  await assert.rejects(readToken(path.join(dir, 'linked.token')), /symlink|symbolic/i);
});
test('client uses fixed API origin, header authentication and redacted errors', async () => {
  const seen = [], token = 'unit_test_credential';
  const client = new ApifyClient({ token, fetchImpl: async (url, init) => { seen.push({ url, init }); return new Response('secret ' + token, { status: 401 }); } });
  await assert.rejects(client.get('actor-runs/EXAMPLE123'), error => error.message.includes('401') && !error.message.includes(token));
  assert.equal(seen[0].url.origin, 'https://api.apify.com');
  assert.equal(seen[0].init.headers.Authorization, 'Bearer ' + token);
  assert.equal(seen[0].init.redirect, 'error'); assert.ok(!seen[0].url.href.includes(token));
  await assert.rejects(client.get('https://evil.example/x'), /endpoint/i);
});
test('paid start requires exact approval and only sends one POST', async t => {
  const dir = await temp(t), receipt = path.join(dir, 'job.json'), p = plan(); let posts = 0;
  const client = new ApifyClient({ token: 'unit_test_credential', fetchImpl: async (url, init) => { if (init.method === 'POST') posts++; return baseMocks(url, init); } });
  await assert.rejects(startRun(client, p, receipt, 'wrong'), /approve/i); assert.equal(posts, 0);
  const job = await startRun(client, p, receipt, p.fingerprint); assert.equal(job.state, 'running'); assert.equal(posts, 1);
  await assert.rejects(startRun(client, p, receipt, p.fingerprint), /exists|reconcile|duplicate/i); assert.equal(posts, 1);
});
test('uncertain start is persisted and cannot be replayed', async t => {
  const dir = await temp(t), receipt = path.join(dir, 'job.json'), p = plan(); let posts = 0;
  const client = new ApifyClient({ token: 'unit_test_credential', fetchImpl: async (url, init) => {
    if (init.method === 'POST') { posts++; throw new Error('timeout with unit_test_credential'); }
    return baseMocks(url, init);
  } });
  await assert.rejects(startRun(client, p, receipt, p.fingerprint), /uncertain|reconcile/i);
  const job = await readJson(receipt); assert.equal(job.state, 'unknown'); assert.ok(!JSON.stringify(job).includes('unit_test_credential'));
  await assert.rejects(startRun(client, p, receipt, p.fingerprint), /exists|reconcile|duplicate/i); assert.equal(posts, 1);
});
test('HTTP server errors remain unknown and require reconciliation', async t => {
  const dir = await temp(t), receipt = path.join(dir, 'job.json'), p = plan();
  const client = new ApifyClient({ token: 'unit_test_credential', fetchImpl: async (url, init) => init.method === 'POST' ? new Response('{}', { status: 503 }) : baseMocks(url, init) });
  await assert.rejects(startRun(client, p, receipt, p.fingerprint));
  assert.equal((await readJson(receipt)).state, 'unknown');
});
test('changed effective prices and Actor builds block before a paid start', async t => {
  const dir = await temp(t), p = plan(); let posts = 0;
  for (const change of ['price', 'build']) {
    const client = new ApifyClient({ token: 'unit_test_credential', fetchImpl: async (url, init) => {
      if (init.method === 'POST') posts++;
      const res = await baseMocks(url, init), body = await res.json();
      if (change === 'price' && body.data.pricingInfos) body.data.pricingInfos[0].pricingPerEvent.actorChargeEvents['local-rank-check'].eventPriceUsd = 5;
      if (change === 'build' && body.data.buildNumber) body.data.buildNumber = '0.1.26';
      return response(body);
    } });
    await assert.rejects(startRun(client, p, path.join(dir, change + '.json'), p.fingerprint), /pricing|contract|build/i);
  }
  assert.equal(posts, 0);
});
test('collection preserves raw offsets and marks truncated reads partial', async t => {
  const dir = await temp(t), receipt = path.join(dir, 'job.json'), out = path.join(dir, 'snapshot.json');
  const p = makePlan('maps-ranks', { ...rankInput, keywords: Array.from({ length: 20 }, (_, i) => 'service ' + i), locations: Array.from({ length: 25 }, (_, i) => ({ locationCoordinate: `${40 + i / 100},-74` })) }, { eventCapUsd: 31 }), offsets = [];
  await writePrivateJson(receipt, { format: 'vibelocal-job/1', state: 'running', runId: 'RUNEXAMPLE123', plan: p, startedAt: new Date().toISOString() });
  const client = new ApifyClient({ token: 'unit_test_credential', fetchImpl: async url => {
    if (url.pathname.includes('actor-runs')) return response({ data: { id: 'RUNEXAMPLE123', actId: p.actorId, buildId: p.buildId, status: 'SUCCEEDED', defaultDatasetId: 'DATAEXAMPLE123', defaultKeyValueStoreId: 'KVEXAMPLE123' } });
    if (url.pathname.endsWith('/items')) { const offset = Number(url.searchParams.get('offset')); offsets.push(offset); return response(Array.from({ length: 50 }, (_, i) => ({ rawIndex: offset + i }))); }
    if (url.pathname.includes('/datasets/')) return response({ data: { itemCount: 700 } });
    return response({ outcome: 'COMPLETE', itemsPushed: 700 });
  } });
  const s = await collectRun(client, receipt, out); assert.equal(s.records.length, 500); assert.equal(s.state, 'partial'); assert.equal(s.coverage.nextRawOffset, 500); assert.equal(s.coverage.truncated, true);
  assert.deepEqual(offsets, Array.from({ length: 10 }, (_, i) => i * 50));
});
test('SUCCEEDED with missing terminal evidence is partial and never complete', async t => {
  const dir = await temp(t), receipt = path.join(dir, 'job.json'), p = plan();
  await writePrivateJson(receipt, { format: 'vibelocal-job/1', state: 'running', runId: 'RUNEXAMPLE123', plan: p });
  const client = new ApifyClient({ token: 'unit_test_credential', fetchImpl: async url => {
    if (url.pathname.includes('actor-runs')) return response({ data: { id: 'RUNEXAMPLE123', actId: p.actorId, buildId: p.buildId, status: 'SUCCEEDED', defaultDatasetId: 'DATAEXAMPLE123', defaultKeyValueStoreId: 'KVEXAMPLE123' } });
    if (url.pathname.endsWith('/items')) return response([]);
    if (url.pathname.includes('/datasets/')) return response({ data: { itemCount: 0 } });
    return new Response('{}', { status: 404 });
  } });
  const s = await collectRun(client, receipt, path.join(dir, 'snapshot.json')); assert.equal(s.state, 'partial'); assert.ok(s.warnings.some(w => /terminal|OUTPUT/.test(w)));
});
test('reconciliation refuses a different Actor or mismatched input', async t => {
  const dir = await temp(t), file = path.join(dir, 'job.json'), p = plan();
  await writePrivateJson(file, { format: 'vibelocal-job/1', state: 'unknown', plan: p, startedAt: new Date().toISOString() });
  const client = new ApifyClient({ token: 'unit_test_credential', fetchImpl: async () => response({ data: { actId: 'WRONGACTOR123', buildId: p.buildId } }) });
  await assert.rejects(reconcileRun(client, file, 'RUNEXAMPLE123'), /Actor|match/i);
  assert.equal((await readJson(file)).state, 'unknown');
});
test('collection rejects a different run even when Actor and build match', async t => {
  const dir = await temp(t), receipt = path.join(dir, 'job.json'), p = plan();
  await writePrivateJson(receipt, { format: 'vibelocal-job/1', state: 'running', runId: 'RUNEXAMPLE123', plan: p });
  const client = new ApifyClient({ token: 'unit_test_credential', fetchImpl: async () => response({ data: { id: 'OTHEREXAMPLE123', actId: p.actorId, buildId: p.buildId, status: 'SUCCEEDED' } }) });
  await assert.rejects(collectRun(client, receipt, path.join(dir, 'snapshot.json')), /run.*identity|run.*match/i);
});
