import { actors, need, makePlan, verifyPlan, canonical, schemaHash } from './contracts.mjs';
import { readJson, writePrivateJson } from './io.mjs';
import { minimizeRecords } from './workflow.mjs';
import { summarizeRanks } from './report.mjs';

export class ApiError extends Error {
  constructor(status) { super(`Apify API request returned HTTP ${status}. No provider body or credentials were printed.`); this.status = status; }
}
export class ApifyClient {
  constructor({ token = null, fetchImpl = fetch } = {}) { this.token = token; this.fetchImpl = fetchImpl; }
  async request(endpoint, { method = 'GET', query = {}, body, publicRead = false } = {}) {
    need(/^(?:acts|actor-runs|datasets|key-value-stores)\/[A-Za-z0-9_-]+(?:\/(?:runs|builds\/default|items|records\/[A-Z_]+))?$/.test(endpoint), 'Unsupported API endpoint.');
    need(method === 'GET' || (method === 'POST' && /^acts\/[A-Za-z0-9]+\/runs$/.test(endpoint)), 'Unsupported API operation.');
    const url = new URL(endpoint, 'https://api.apify.com/v2/');
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
    need(!url.searchParams.has('token'), 'Credentials are never sent in URLs.');
    const headers = { Accept: 'application/json' };
    if (this.token && !publicRead) headers.Authorization = 'Bearer ' + this.token;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let response;
    try { response = await this.fetchImpl(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(15000) }); }
    catch { throw new Error('Apify request timed out or could not be completed.'); }
    if (!response.ok) throw new ApiError(response.status);
    const reader = response.body.getReader(); let bytes = 0; const chunks = [];
    try {
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        bytes += value.byteLength; need(bytes <= 5 * 1024 * 1024, 'API response exceeded its size bound.'); chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new Error('Apify returned invalid JSON.'); }
  }
  async get(endpoint, options) { return this.request(endpoint, options); }
}

export async function verifyLiveContract(client, alias) {
  const c = actors[alias]; need(c, 'Unknown Actor alias.');
  const [metadata, build] = await Promise.all([
    client.get('acts/' + c.id, { publicRead: true }), client.get('acts/' + c.id + '/builds/default', { publicRead: true })
  ]);
  const m = metadata.data, b = build.data;
  need(m?.id === c.id && m.username === c.owner && m.name === c.slug && m.isPublic === true, 'Actor identity or public access changed. Contract refresh is required.');
  need(b?.id === c.buildId && b.buildNumber === c.buildNumber && b.status === 'SUCCEEDED', 'Actor build changed. Refresh and validate the contract before running it.');
  let schema = b.actorDefinition?.input;
  if (!schema) { try { schema = JSON.parse(b.inputSchema); } catch { throw new Error('Actor input schema is unavailable or invalid.'); } }
  need(schemaHash(schema) === c.schemaSha256, 'Actor input schema changed. Contract refresh is required.');
  const pricing = (m.pricingInfos ?? []).filter(p => Number.isFinite(Date.parse(p.startedAt)) && Date.parse(p.startedAt) <= Date.now()).sort((a, z) => Date.parse(a.startedAt) - Date.parse(z.startedAt)).at(-1);
  const rates = Object.fromEntries(Object.entries(pricing?.pricingPerEvent?.actorChargeEvents ?? {}).map(([k, v]) => [k, v.eventPriceUsd]));
  need(canonical(rates) === canonical(c.eventRates) && (pricing?.isPPEPlatformUsagePaidByUser === true) === c.platformUsagePaidByUser, 'Actor pricing changed. Review the current pricing and approve a new contract and plan.');
  return { actor: alias, buildId: b.id, buildNumber: b.buildNumber, schemaSha256: c.schemaSha256, eventRates: rates, platformUsagePaidByUser: c.platformUsagePaidByUser, checkedAt: new Date().toISOString() };
}
export async function livePlan(client, alias, input, options) {
  await verifyLiveContract(client, alias); return makePlan(alias, input, options);
}

export async function startRun(client, plan, receiptFile, approval) {
  verifyPlan(plan, { approval, live: true }); need(client.token, 'An explicitly selected Apify token file is required for a paid run.');
  await verifyLiveContract(client, plan.actor);
  let receipt = { format: 'vibelocal-job/1', state: 'starting', plan, startedAt: new Date().toISOString(), runId: null, warning: 'If a start is uncertain, reconcile it before any new paid start.' };
  await writePrivateJson(receiptFile, receipt);
  try {
    const response = await client.request('acts/' + plan.actorId + '/runs', {
      method: 'POST', body: plan.input,
      query: { build: plan.runOptions.build, timeout: plan.runOptions.timeoutSecs, memory: plan.runOptions.memoryMbytes, maxTotalChargeUsd: plan.eventCapUsd }
    });
    const run = response.data; need(/^[A-Za-z0-9]{5,32}$/.test(run?.id ?? '') && run.actId === plan.actorId && run.buildId === plan.buildId, 'Start response could not establish the exact Actor run identity.');
    receipt = { ...receipt, state: 'running', runId: run.id, runUrl: 'https://console.apify.com/actors/' + plan.actorId + '/runs/' + run.id };
    await writePrivateJson(receiptFile, receipt, { replace: true }); return receipt;
  } catch (error) {
    const definitelyRejected = error instanceof ApiError && [400, 401, 403, 404, 422, 429].includes(error.status);
    receipt = { ...receipt, state: definitelyRejected ? 'rejected' : 'unknown', httpStatus: error instanceof ApiError ? error.status : null };
    await writePrivateJson(receiptFile, receipt, { replace: true });
    throw new Error('Run start is uncertain or was rejected. The receipt is preserved. Inspect Apify and reconcile a matching run before making another paid start.');
  }
}

const safeId = id => { need(/^[A-Za-z0-9]{5,32}$/.test(id ?? ''), 'Missing or invalid provider identifier.'); return id; };
function checkRun(job, run, expectedRunId = job.runId) {
  verifyPlan(job.plan);
  need(run.actId === job.plan.actorId && run.buildId === job.plan.buildId, 'Run Actor or build does not match the approved receipt.');
  need(run.id === expectedRunId, 'Run identity does not match the confirmed receipt or reconciliation candidate.');
}
export async function reconcileRun(client, receiptFile, runId) {
  const job = await readJson(receiptFile); need(['unknown', 'starting'].includes(job.state), 'Only an uncertain start needs reconciliation.');
  const run = (await client.get('actor-runs/' + safeId(runId))).data; checkRun(job, run, runId);
  const input = await client.get('key-value-stores/' + safeId(run.defaultKeyValueStoreId) + '/records/INPUT');
  need(canonical(input) === canonical(job.plan.input), 'Run input does not match the approved plan.');
  const started = Date.parse(run.startedAt), intent = Date.parse(job.startedAt);
  need(Number.isFinite(started) && Number.isFinite(intent) && started >= intent - 30000 && started <= intent + 120000, 'Run timing does not match this start attempt.');
  const reconciled = { ...job, state: 'running', runId, reconciledAt: new Date().toISOString() };
  await writePrivateJson(receiptFile, reconciled, { replace: true }); return reconciled;
}

const hasFailures = o => o && (['PARTIAL', 'INVALID_INPUT', 'UPSTREAM_FAILED', 'CONFIG_ERROR', 'FAILED', 'ERROR'].includes(String(o.outcome ?? o.status ?? '').toUpperCase()) ||
  ['targetFailures', 'itemsFailed', 'invalidRecords', 'errors'].some(k => Array.isArray(o[k]) ? o[k].length > 0 : typeof o[k] === 'number' && o[k] > 0));
export async function collectRun(client, receiptFile, outputFile) {
  const job = await readJson(receiptFile); need(job.runId, 'No confirmed run ID. Reconcile an uncertain start first.');
  const run = (await client.get('actor-runs/' + safeId(job.runId))).data; checkRun(job, run);
  if (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(run.status)) return { state: 'running', runId: job.runId, nextAction: 'Collect again after this run is terminal; do not start another run.' };
  const c = actors[job.plan.actor], warnings = [], terminal = {};
  for (const key of c.terminalKeys) {
    try { terminal[key] = await client.get('key-value-stores/' + safeId(run.defaultKeyValueStoreId) + '/records/' + key); }
    catch (error) { if (!(error instanceof ApiError && error.status === 404)) throw error; warnings.push('Missing declared terminal evidence: ' + key + '.'); }
  }
  const datasetId = safeId(run.defaultDatasetId), metadata = (await client.get('datasets/' + datasetId)).data;
  need(Number.isInteger(metadata?.itemCount) && metadata.itemCount >= 0, 'Dataset count is unavailable; collection cannot establish coverage.');
  const records = [], total = metadata.itemCount; let offset = 0, interrupted = false;
  while (offset < total && offset < job.plan.maxRows) {
    const limit = Math.min(50, total - offset, job.plan.maxRows - offset);
    try {
      const page = await client.get('datasets/' + datasetId + '/items', { query: { offset, limit, clean: false, desc: false, format: 'json' } });
      need(Array.isArray(page) && page.length <= limit, 'Dataset page does not match the raw page bound.');
      if (!page.length) { warnings.push('Dataset ended before its reported total.'); interrupted = true; break; }
      records.push(...page); offset += page.length;
    } catch { warnings.push('Dataset read was interrupted. Preserved collected raw rows and offset.'); interrupted = true; break; }
  }
  const expected = ['maps-ranks', 'local-pack'].includes(job.plan.actor) ? Math.max(total, job.plan.units) : total;
  if (job.plan.actor === 'maps-ranks') {
    try { summarizeRanks({ actor: 'maps-ranks', records, coverage: { expected } }); }
    catch { warnings.push('Maps dataset contains invalid or non-comparable rows; manually review the saved raw records.'); }
  }
  if (Object.values(terminal).some(hasFailures)) warnings.push('Terminal records report incomplete or failed upstream processing.');
  const truncated = offset < total, incomplete = truncated || interrupted || records.length < expected || warnings.length > 0 || Object.values(terminal).some(hasFailures);
  const output = terminal.OUTPUT;
  if (Number.isInteger(output?.itemsPushed) && output.itemsPushed !== total) warnings.push('OUTPUT row count and dataset count differ.');
  const state = run.status !== 'SUCCEEDED' ? 'failed' : incomplete || warnings.length ? 'partial' : 'completed';
  const snapshot = {
    format: 'vibelocal-snapshot/1', actor: job.plan.actor, source: 'apify', state, runId: job.runId, buildId: run.buildId,
    collectedAt: new Date().toISOString(), input: job.plan.input,
    coverage: { expected, providerDatasetRows: total, requestedUpperBound: job.plan.units, collected: records.length, nextRawOffset: offset, truncated },
    billing: { apifyReportedUsageUsd: run.usageTotalUsd ?? null, chargedEventCounts: run.chargedEventCounts ?? null, eventCapUsd: job.plan.eventCapUsd, platformUsagePaidByUser: job.plan.platformUsagePaidByUser, note: 'Reported usage and event counts are separate observations. The event cap is not a guarantee against separately billed platform usage.' },
    terminal, warnings, records: minimizeRecords(job.plan.actor, records)
  };
  await writePrivateJson(outputFile, snapshot);
  await writePrivateJson(receiptFile, { ...job, state, snapshotFile: outputFile, coverage: snapshot.coverage, collectedAt: snapshot.collectedAt }, { replace: true });
  return snapshot;
}
