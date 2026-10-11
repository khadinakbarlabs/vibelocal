import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const exec = promisify(execFile);
const cli = fileURLToPath(new URL('../skills/vibelocal/scripts/cli.mjs', import.meta.url));
const run = (...args) => exec(process.execPath, [cli, ...args]);

test('CLI is discoverable and refuses unknown options without echoing values', async () => {
  const { stdout } = await run('help');
  assert.match(stdout, /plan[\s\S]*run[\s\S]*collect/);
  await assert.rejects(run('actors', '--token', 'NEVER_ECHO_THIS'), error => {
    assert.ok(!error.stderr.includes('NEVER_ECHO_THIS')); return true;
  });
  const { stdout: list } = await run('actors');
  assert.equal(JSON.parse(list).length, 7);
});
test('offline demo creates a safe report, receipts and a comparable later snapshot', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'vibelocal-cli-'));
  try {
    const { stdout } = await run('demo', '--out', join(folder, 'demo'));
    const result = JSON.parse(stdout);
    const html = await readFile(result.report, 'utf8');
    assert.match(html, /Illustrative fixture/); assert.match(html, /Example Dental/);
    const { stdout: comparison } = await run('compare', '--before', result.before, '--after', result.after);
    assert.equal(JSON.parse(comparison).changes.length, 9);
    await assert.rejects(run('demo', '--out', join(folder, 'demo')));
  } finally { await rm(folder, { recursive: true, force: true }); }
});
test('import strips reviewer identities and does not invent total coverage', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'vibelocal-cli-'));
  try {
    const input = join(folder, 'reviews.json'), output = join(folder, 'snapshot.json');
    await writeFile(input, JSON.stringify([{ rating: 2, text: 'Long wait', reviewerName: 'PRIVATE_NAME', reviewerUrl: 'PRIVATE_URL', reviewUrl: 'https://www.google.com/maps/reviews/example' }]));
    await run('import', '--actor', 'reviews', '--input', input, '--out', output);
    const snapshot = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(snapshot.source, 'import'); assert.equal(snapshot.coverage.expected, null);
    assert.ok(!JSON.stringify(snapshot).includes('PRIVATE_NAME')); assert.ok(!JSON.stringify(snapshot).includes('PRIVATE_URL'));
  } finally { await rm(folder, { recursive: true, force: true }); }
});
test('offline plans cannot start runs and authentication needs the user terminal', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'vibelocal-cli-'));
  try {
    const input = join(folder, 'input.json'), plan = join(folder, 'plan.json');
    await writeFile(input, JSON.stringify({ businessName: 'Example Dental', keywords: ['dentist'], locations: [{ locationName: 'New York,New York,United States' }] }));
    await run('plan', '--actor', 'maps-ranks', '--input', input, '--event-cap-usd', '1', '--offline', '--out', plan);
    const { fingerprint } = JSON.parse(await readFile(plan, 'utf8'));
    await assert.rejects(run('run', '--plan', plan, '--approve', fingerprint, '--receipt', join(folder, 'job.json'), '--token-file', join(folder, 'does-not-exist.token')), /offline plan/);
    await assert.rejects(run('auth', '--token-file', join(folder, 'apify.token')), /interactive terminal/);
  } finally { await rm(folder, { recursive: true, force: true }); }
});
