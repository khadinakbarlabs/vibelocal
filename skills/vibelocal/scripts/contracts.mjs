import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

export const actors = JSON.parse(readFileSync(new URL('../references/actors.json', import.meta.url), 'utf8'));
const schemas = Object.fromEntries(Object.keys(actors).map(alias => [alias, JSON.parse(readFileSync(new URL(`../references/schemas/${alias}.input.json`, import.meta.url), 'utf8'))]));
export const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
export const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
export const schemaHash = schema => createHash('sha256').update(JSON.stringify(schema)).digest('hex');
export const fingerprint = plan => digest(Object.fromEntries(Object.entries(plan).filter(([key]) => key !== 'fingerprint')));
export const need = (condition, message) => { if (!condition) throw new Error(message); };
const own = (value, key) => Object.hasOwn(value, key);

export function publicUrl(value) {
  let u; try { u = new URL(value); } catch { throw new Error('A valid public HTTPS URL is required.'); }
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  need(u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443'), 'Use a public HTTPS URL without credentials or custom ports.');
  need(host.includes('.') && !host.startsWith('[') && !isIP(host) && !/(^|\.)(localhost|local|internal|test|invalid)$/.test(host), 'URL must identify a public hostname, not a local or private network.');
  need(![...u.searchParams.keys()].some(k => /token|secret|password|api.?key|auth|session|signature|credential/i.test(k)), 'URL cannot contain credentials or authentication parameters.');
  need(!u.hash, 'URL cannot contain an authentication fragment.');
  return u.href;
}

export function locationKey(location) {
  const selectors = ['locationCode', 'locationName', 'locationCoordinate'].filter(k => location[k] !== undefined && location[k] !== null && location[k] !== '');
  need(selectors.length === 1, 'Each location needs exactly one selector: locationCode, locationName or locationCoordinate.');
  const field = selectors[0], value = location[field];
  if (field === 'locationCoordinate') {
    need(typeof value === 'string' && /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?(?:,\d+(?:\.\d+)?)?$/.test(value), 'Invalid coordinate format; use latitude,longitude[,radius].');
    const parts = value.split(',').map(Number);
    need(Math.abs(parts[0]) <= 90 && Math.abs(parts[1]) <= 180 && (parts.length === 2 || (parts[2] > 0 && parts[2] <= 50000)), 'Coordinate latitude, longitude or radius is outside bounds.');
    return field + ':' + parts.join(',');
  }
  if (field === 'locationCode') need(Number.isInteger(value) && value > 0, 'Invalid location code.');
  if (field === 'locationName') need(typeof value === 'string' && value.trim().length > 1, 'Invalid location name.');
  return field + ':' + (typeof value === 'string' ? value.trim() : value);
}

function validateSchema(value, schema, path = 'input') {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  const validType = type => type === undefined || (type === 'array' ? Array.isArray(value) : type === 'object' ? value && typeof value === 'object' && !Array.isArray(value)
    : type === 'integer' ? Number.isInteger(value) : type === 'null' ? value === null : typeof value === type);
  need(types.some(validType), `${path}: invalid type.`);
  if (schema.enum) need(schema.enum.includes(value), `${path}: value must match the documented enum.`);
  if (typeof value === 'number') {
    need(Number.isFinite(value), `${path}: finite number required.`);
    if (schema.minimum !== undefined) need(value >= schema.minimum, `${path}: below minimum ${schema.minimum}.`);
    if (schema.maximum !== undefined) need(value <= schema.maximum, `${path}: above maximum ${schema.maximum}.`);
  }
  if (typeof value === 'string') {
    need(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) && value.length <= 4000, `${path}: invalid or excessive text.`);
    if (schema.minLength !== undefined) need(value.length >= schema.minLength, `${path}: too short.`);
    if (schema.maxLength !== undefined) need(value.length <= schema.maxLength, `${path}: too long.`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined) need(value.length >= schema.minItems, `${path}: not enough items.`);
    if (schema.maxItems !== undefined) need(value.length <= schema.maxItems, `${path}: exceeds bound ${schema.maxItems}.`);
    value.forEach((v, i) => validateSchema(v, schema.items ?? {}, `${path}[${i}]`));
  } else if (value && typeof value === 'object') {
    for (const k of ['__proto__', 'prototype', 'constructor']) need(!own(value, k), `${path}: unsupported key.`);
    for (const k of schema.required ?? []) need(own(value, k), `${path}: missing ${k}.`);
    if (schema.properties) for (const [k, v] of Object.entries(value)) {
      need(own(schema.properties, k), `${path}: unknown field ${k}.`); validateSchema(v, schema.properties[k], `${path}.${k}`);
    }
  }
}

const denied = {
  places: ['includeWebsiteContacts'], reviews: ['searchQuery', 'location', 'proxyConfiguration'],
  website: ['proxyConfiguration', 'fetchMode'], serp: ['startUrls']
};
export function validateInput(alias, raw) {
  need(own(actors, alias), 'Unknown Actor alias. Use actors to see the seven supported backends.');
  need(raw && typeof raw === 'object' && !Array.isArray(raw), 'Input must be a JSON object.');
  const input = structuredClone(raw), schema = schemas[alias];
  for (const field of denied[alias] ?? []) {
    if ((field === 'includeWebsiteContacts' && input[field] === false) || (field === 'fetchMode' && input[field] === 'direct')) continue;
    need(!own(input, field), `Unsupported field ${field}; this workflow uses precise public targets and no contact enrichment or custom proxies.`);
  }
  for (const [k, v] of Object.entries(schema.properties)) if (!own(input, k) && v.default !== undefined && !['proxyConfiguration', 'queries'].includes(k)) input[k] = structuredClone(v.default);
  if (alias === 'maps-ranks' || alias === 'local-pack') {
    const keywords = input[alias === 'maps-ranks' ? 'keywords' : 'queries'];
    need(Array.isArray(keywords) && keywords.length >= 1 && keywords.length <= 20, 'Provide 1–20 distinct keywords.');
    need(new Set(keywords.map(k => String(k).trim())).size === keywords.length && keywords.every(k => typeof k === 'string' && k.trim()), 'Keywords must be distinct, non-empty strings.');
    need(Array.isArray(input.locations) && input.locations.length >= 1 && input.locations.length <= 25, 'Provide 1–25 locations.');
    const keys = input.locations.map(locationKey); need(new Set(keys).size === keys.length, 'Duplicate location points are not allowed.');
  }
  if (alias === 'maps-ranks' && input.targetDomain) {
    need(!input.targetDomain.includes('/') && !input.targetDomain.includes(':'), 'Target domain must be a hostname only.'); publicUrl('https://' + input.targetDomain);
  }
  if (alias === 'places') {
    need(Number.isInteger(input.maxResults) && input.maxResults <= 100, 'Place collection bound is 100 results.');
    const links = input.startUrls ?? [];
    need((links.length > 0) !== Boolean(input.searchQuery?.trim()), 'Choose precise Maps URLs or a search query, not both.');
    if (!links.length) need(input.location?.trim(), 'Place search needs an explicit location.');
  }
  if (alias === 'reviews') {
    need(input.includePersonalData !== true, 'Personal reviewer data is disabled.'); input.includePersonalData = false;
    const targets = ['startUrls', 'placeIds', 'dataIds'].filter(k => input[k]?.length);
    need(targets.length === 1, 'Review collection requires precise Maps URLs, place IDs or data IDs; choose one target type.');
    need(input[targets[0]].length <= 2, 'Review collection is limited to two precise places per run.');
    need(Number.isInteger(input.maxReviews) && input.maxReviews >= 1 && input.maxReviews <= 500, 'Review collection bound is 1–500 reviews shared across the run.');
    for (const field of ['placeIds', 'dataIds']) for (const id of input[field] ?? []) need(typeof id === 'string' && /^[A-Za-z0-9_:.-]{4,300}$/.test(id), 'Invalid place identifier.');
  }
  if (alias === 'places' || alias === 'reviews') for (const entry of input.startUrls ?? []) {
    const url = publicUrl(typeof entry === 'string' ? entry : entry.url), u = new URL(url);
    need(['www.google.com', 'google.com', 'maps.google.com'].includes(u.hostname) && (u.pathname.startsWith('/maps') || u.hostname === 'maps.google.com'), 'Use a precise, full Google Maps URL.');
  }
  if (alias === 'citations') {
    need(Array.isArray(input.businesses) && input.businesses.length >= 1 && input.businesses.length <= 10, 'Citation collection bound is 1–10 businesses.');
    input.maxBusinesses = input.businesses.length;
    for (const b of input.businesses) if (b.website) publicUrl(b.website);
  }
  if (alias === 'website') {
    need(input.respectRobotsTxt !== false, 'Website collection must respect robots.txt.'); input.respectRobotsTxt = true;
    need(input.maxPages >= 1 && input.maxPages <= 100 && input.startUrls?.length >= 1 && input.startUrls.length <= 5, 'Website collection bound is 1–100 pages from 1–5 seeds.');
    for (const entry of input.startUrls) publicUrl(typeof entry === 'string' ? entry : entry.url);
  }
  if (alias === 'serp') need(input.queries?.length >= 1 && input.queries.length <= 10 && input.maxResultsPages >= 1 && input.maxResultsPages <= 2, 'SERP bound is 1–10 queries and 1–2 result pages.');
  validateSchema(input, schema);
  return input;
}

export function unitBound(alias, input) {
  if (alias === 'maps-ranks' || alias === 'local-pack') return input[alias === 'maps-ranks' ? 'keywords' : 'queries'].length * input.locations.length;
  if (alias === 'places') return input.maxResults;
  if (alias === 'reviews') return input.maxReviews;
  if (alias === 'citations') return input.businesses.length;
  if (alias === 'website') return input.maxPages;
  return input.queries.length * input.maxResultsPages;
}

export function makePlan(alias, raw, options = {}) {
  const input = validateInput(alias, raw), contract = actors[alias];
  need(Number.isFinite(options.eventCapUsd) && options.eventCapUsd > 0 && options.eventCapUsd <= 100, 'A finite positive event cap of at most $100 is required.');
  const units = unitBound(alias, input), startUnits = Math.max(1, Math.ceil(contract.memoryMbytes / 1024));
  const eventEstimateUsd = units * contract.eventRates[contract.event] + startUnits * (contract.eventRates['apify-actor-start'] ?? 0);
  const plan = {
    format: 'vibelocal-plan/1', actor: alias, actorId: contract.id, actorUrl: contract.url,
    buildId: contract.buildId, schemaSha256: contract.schemaSha256,
    createdAt: options.now ?? new Date().toISOString(), contractVerifiedLive: options.offline !== true,
    input, units, eventCapUsd: options.eventCapUsd, eventEstimateUsd,
    eventRates: contract.eventRates, platformUsagePaidByUser: contract.platformUsagePaidByUser,
    additionalCostNote: contract.additionalCostNote ?? null,
    maxRows: Math.min(contract.maxRows, units), runOptions: { build: contract.buildNumber, timeoutSecs: contract.timeoutSecs, memoryMbytes: contract.memoryMbytes }
  };
  need(options.eventCapUsd >= eventEstimateUsd, `Event cap is below the conservative event estimate ($${eventEstimateUsd.toFixed(5)}). Reduce the collection or increase the approved event cap.`);
  return { ...plan, fingerprint: fingerprint(plan) };
}

export function verifyPlan(plan, { approval, now = Date.now(), live = false } = {}) {
  need(plan.format === 'vibelocal-plan/1' && /^[a-f0-9]{64}$/.test(plan.fingerprint ?? '') && fingerprint(plan) === plan.fingerprint, 'Plan fingerprint mismatch: the plan was modified.');
  const reconstructed = makePlan(plan.actor, plan.input, { eventCapUsd: plan.eventCapUsd, offline: !plan.contractVerifiedLive, now: plan.createdAt });
  need(fingerprint(reconstructed) === plan.fingerprint, 'Plan differs from the supported Actor contract. Create a new plan.');
  if (live) {
    need(plan.contractVerifiedLive, 'An offline plan cannot start a paid run.');
    need(approval === plan.fingerprint, 'Approve the exact plan fingerprint before a paid run.');
    const age = now - Date.parse(plan.createdAt); need(Number.isFinite(age) && age >= 0 && age <= 86400000, 'Plan has expired. Create and approve a fresh plan.');
  }
  return plan;
}
