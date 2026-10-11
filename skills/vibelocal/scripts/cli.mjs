import { parseArgs } from 'node:util';
import { resolve, join } from 'node:path';
import { actors, need, makePlan, verifyPlan } from './contracts.mjs';
import { ApifyClient, verifyLiveContract, livePlan, startRun, collectRun, reconcileRun } from './apify.mjs';
import { readJson, readToken, promptToken, writePrivateJson, writePrivateText } from './io.mjs';
import { renderReport, compareRanks, makeLocalSchema } from './report.mjs';
import { importSnapshot, demoSnapshots } from './workflow.mjs';

const help = `VibeLocal: GMB, Maps & Rankings — Node.js 22+, no installation or dependencies.
Commands return JSON. Paths are relative to your working folder unless absolute.
  actors
  contract --actor ALIAS
  plan --actor ALIAS --input INPUT.json --event-cap-usd N --out PLAN.json [--offline]
  auth --token-file YOUR_CHOSEN_PRIVATE_FILE   (run yourself; hidden terminal prompt)
  run --plan PLAN.json --approve FINGERPRINT --receipt NEW_JOB.json --token-file FILE
  collect --receipt JOB.json --out NEW_SNAPSHOT.json --token-file FILE
  reconcile --receipt JOB.json --run-id APIFY_RUN_ID --token-file FILE
  import --actor ALIAS --input RAW_ROWS.json --out SNAPSHOT.json [--expected N]
  report --snapshot SNAPSHOT.json [--snapshot MORE.json] --out REPORT.html [--business-name NAME]
  compare --before BEFORE.json --after AFTER.json [--out COMPARISON.json]
  schema --context CONTEXT.json --out DRAFT_SCHEMA.json
  demo --out NEW_FOLDER
Only run starts a paid Actor. Approve its exact live plan first. Do not retry an uncertain start.
Offline plans and fixtures cannot authorize paid runs. No environment credentials are read.
`;
const commandOptions = {
  help: [], actors: [], contract: ['actor'], plan: ['actor', 'input', 'event-cap-usd', 'out', 'offline'], auth: ['token-file'],
  run: ['plan', 'approve', 'receipt', 'token-file'], collect: ['receipt', 'out', 'token-file'], reconcile: ['receipt', 'run-id', 'token-file'],
  import: ['actor', 'input', 'out', 'expected'], report: ['snapshot', 'out', 'business-name'], compare: ['before', 'after', 'out'], schema: ['context', 'out'], demo: ['out']
};
function argumentsFor(command, args) {
  need(Object.hasOwn(commandOptions, command), 'Unknown command. Use help to see supported workflows.');
  const definitions = Object.fromEntries(commandOptions[command].map(k => [k, { type: k === 'offline' ? 'boolean' : 'string', multiple: k === 'snapshot' }]));
  try { return parseArgs({ args, options: definitions, allowPositionals: false, strict: true }).values; }
  catch { throw new Error('Unsupported or missing command option. Use help. Option values were not echoed.'); }
}
const required = (opts, key) => { need(opts[key] && String(opts[key]).trim(), `Missing --${key}. Use help.`); return opts[key]; };
const file = (opts, key) => resolve(required(opts, key));
async function privateClient(opts) { return new ApifyClient({ token: await readToken(file(opts, 'token-file')) }); }
async function main() {
  need(Number(process.versions.node.split('.')[0]) >= 22, 'Node.js 22 or later is required.');
  const [command = 'help', ...args] = process.argv.slice(2), opts = argumentsFor(command, args);
  if (command === 'help') { process.stdout.write(help); return; }
  let result;
  if (command === 'actors') result = Object.entries(actors).map(([alias, c]) => ({ alias, url: c.url, build: c.buildNumber, collectionBound: c.maxRows, platformUsagePaidByUser: c.platformUsagePaidByUser }));
  if (command === 'contract') result = await verifyLiveContract(new ApifyClient(), required(opts, 'actor'));
  if (command === 'plan') {
    const alias = required(opts, 'actor'), input = await readJson(file(opts, 'input')), options = { eventCapUsd: Number(required(opts, 'event-cap-usd')), offline: opts.offline === true };
    const plan = options.offline ? makePlan(alias, input, options) : await livePlan(new ApifyClient(), alias, input, options);
    const output = await writePrivateJson(file(opts, 'out'), plan);
    result = { planFile: output, ...plan, nextAction: opts.offline ? 'Offline planning only; create a fresh live plan before approval.' : 'Review the business, targets, input, price, event cap and separate platform costs. Approval must identify this fingerprint.' };
  }
  if (command === 'auth') {
    const destination = file(opts, 'token-file'), token = await promptToken();
    await writePrivateText(destination, token + '\n'); result = { state: 'saved', tokenFile: destination, note: 'Private file created. Token was not printed. Pass only its path to run, collect or reconcile.' };
  }
  if (command === 'run') {
    const plan = await readJson(file(opts, 'plan')); verifyPlan(plan, { approval: required(opts, 'approve'), live: true });
    result = await startRun(await privateClient(opts), plan, file(opts, 'receipt'), opts.approve);
  }
  if (command === 'collect') result = await collectRun(await privateClient(opts), file(opts, 'receipt'), file(opts, 'out'));
  if (command === 'reconcile') result = await reconcileRun(await privateClient(opts), file(opts, 'receipt'), required(opts, 'run-id'));
  if (command === 'import') {
    const expected = opts.expected === undefined ? null : Number(opts.expected), snapshot = importSnapshot(required(opts, 'actor'), await readJson(file(opts, 'input')), { expected });
    result = { state: 'imported', snapshotFile: await writePrivateJson(file(opts, 'out'), snapshot), coverage: snapshot.coverage, warnings: snapshot.warnings };
  }
  if (command === 'report') {
    need(Array.isArray(opts.snapshot) && opts.snapshot.length >= 1 && opts.snapshot.length <= 20, 'Provide 1–20 --snapshot paths.');
    const snapshots = await Promise.all(opts.snapshot.map(path => readJson(resolve(path))));
    result = { state: 'created', reportFile: await writePrivateText(file(opts, 'out'), renderReport(snapshots, { businessName: opts['business-name'] })) };
  }
  if (command === 'compare') {
    const comparison = compareRanks(await readJson(file(opts, 'before')), await readJson(file(opts, 'after')));
    result = opts.out ? { comparisonFile: await writePrivateJson(file(opts, 'out'), comparison), ...comparison } : comparison;
  }
  if (command === 'schema') {
    const draft = makeLocalSchema(await readJson(file(opts, 'context')));
    result = { draftFile: await writePrivateJson(file(opts, 'out'), draft), note: draft.note };
  }
  if (command === 'demo') {
    const directory = file(opts, 'out'), fixture = demoSnapshots();
    const before = await writePrivateJson(join(directory, 'before.json'), fixture.before), after = await writePrivateJson(join(directory, 'after.json'), fixture.after);
    await writePrivateJson(join(directory, 'supporting.json'), fixture.supporting);
    const report = await writePrivateText(join(directory, 'report.html'), renderReport([fixture.after, ...fixture.supporting], { businessName: 'Example Dental · illustrative report', generatedAt: '2026-10-11T08:00:00Z' }));
    result = { source: 'fictional_fixture', before, after, report, comparison: compareRanks(fixture.before, fixture.after), note: 'Created locally. No Actor ran, no external request was made and no cost was incurred.' };
  }
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
main().catch(error => {
  const code = typeof error.code === 'string' ? error.code : 'VIBELOCAL_ERROR';
  const message = ['ENOENT', 'EACCES', 'EPERM', 'ENOTDIR', 'ENAMETOOLONG', 'ELOOP'].includes(code) ? 'File operation failed. Check the selected path and permissions.' : error instanceof TypeError ? 'Invalid input or artifact. Use the documented JSON format.' : error.message;
  process.stderr.write(JSON.stringify({ error: { code, message } }) + '\n'); process.exitCode = 1;
});
