import { readdir, lstat, readFile } from 'node:fs/promises';
import { resolve, join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { actors, schemaHash } from '../skills/vibelocal/scripts/contracts.mjs';

const root = resolve(process.argv[2] ?? fileURLToPath(new URL('..', import.meta.url)));
const errors = [], files = [];
const ignored = new Set(['.git', '.vibelocal', 'dist', 'node_modules', 'coverage']);
async function walk(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(folder, entry.name), stat = await lstat(path), name = relative(root, path);
    if (stat.isSymbolicLink()) { errors.push('Symlink is not distributable: ' + name); continue; }
    if (stat.isDirectory()) await walk(path);
    else {
      files.push(name);
      if (!stat.isFile() || stat.size > 256 * 1024) errors.push('Non-text or oversized source candidate: ' + name);
      if (/^(?:\.env(?:\..*)?|\.DS_Store)$|\.(?:token|key|pem|zip|sqlite|db)$/.test(entry.name)) errors.push('Private/generated file is not distributable: ' + name);
    }
  }
}
function check(condition, message) { if (!condition) errors.push(message); }
await walk(root);
check(files.length <= 512, 'Too many distributable files.');
for (const name of ['README.md', 'LICENSE', 'PRIVACY.md', 'TERMS.md', 'SUPPORT.md', 'SECURITY.md', 'assets/vibelocal.svg']) check(files.includes(name), 'Missing required file: ' + name);
check(!files.some(name => /(?:^|\/)(?:mcp\.json|\.mcp\.json|hooks\.json|settings\.json)$/.test(name)) && !files.some(name => name.startsWith('bin' + sep)), 'Skills-only package contains an unexpected runtime surface.');
const json = async path => JSON.parse(await readFile(join(root, path), 'utf8'));
const manifest = await json('.claude-plugin/plugin.json'), portable = await json('packaging/portable-manifest.json');
check(manifest.name === 'vibelocal' && manifest.version === '0.1.0', 'Unexpected native package identity.');
for (const key of ['name', 'version', 'description', 'license']) check(manifest[key] === portable[key], 'Manifest identity mismatch: ' + key);
check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.name) && manifest.name.length <= 64, 'Invalid package name.');
check(portable.extensions?.['com.openai']?.interface?.shortDescription.length <= 30, 'Portable subtitle exceeds 30 characters.');
check(!['skills', 'mcpServers', 'apps', 'interface'].some(k => Object.hasOwn(portable, k)), 'Unsupported portable root field.');
check(Object.keys(portable).every(k => ['$schema', 'name', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'keywords', 'extensions'].includes(k)), 'Portable manifest has unknown root fields.');
const skills = files.filter(name => /^skills\/[^/]+\/SKILL\.md$/.test(name));
check(skills.length === 9, 'Expected exactly nine focused skills.');
for (const name of skills) {
  const content = await readFile(join(root, name), 'utf8'), front = content.match(/^---\n([\s\S]+?)\n---\n/), id = name.split('/')[1];
  check(front && front[1].includes('name: ' + id) && /description: .{20,}/.test(front[1]), 'Invalid skill discovery metadata: ' + name);
  check(files.includes(`skills/${id}/agents/openai.yaml`), 'Missing skill adapter: ' + id);
  check(content.length < 12000, 'Skill entry is too large: ' + id);
}
for (const name of files.filter(name => /\.(?:md|mjs|json|yaml|svg)$/.test(name))) {
  const content = await readFile(join(root, name), 'utf8');
  check(!/(?:apify_api_[A-Za-z0-9]{20,}|sk-(?:proj-)?[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(content), 'Potential credential material: ' + name);
  if (name.endsWith('.md')) for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
    const dest = resolve(dirname(join(root, name)), target), inside = relative(root, dest);
    check(!inside.startsWith('..') && !resolve(dest).startsWith('/etc/') && files.includes(inside), 'Broken or escaping Markdown reference: ' + name + ' -> ' + target);
  }
  if (name.endsWith('.mjs')) for (const match of content.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
    const target = relative(root, resolve(dirname(join(root, name)), match[1]));
    check(!target.startsWith('..') && files.includes(target), 'Broken helper import: ' + name + ' -> ' + match[1]);
  }
}
for (const [alias, actor] of Object.entries(actors)) {
  const schema = await json('skills/vibelocal/references/schemas/' + alias + '.input.json');
  check(schemaHash(schema) === actor.schemaSha256, 'Input schema hash mismatch: ' + alias);
}
const publicFields = ['documentationUrl', 'supportUrl', 'privacyPolicyUrl', 'termsOfServiceUrl'];
const releaseBlocks = publicFields.filter(key => !manifest[key]).map(key => 'Public listing URL missing: ' + key);
releaseBlocks.push('Public URL availability, owner authorization and Anthropic portal checks must be verified separately from this local validator.');
process.stdout.write(JSON.stringify({ localPackage: errors.length ? 'FAIL' : 'PASS', identity: `${manifest.name}@${manifest.version}`, fileCount: files.length, skills: skills.length, commands: 0, agents: 0, runtimeDependencies: 0, errors, externalRelease: 'NOT_VERIFIED_BY_LOCAL_VALIDATOR', releaseBlocks }, null, 2) + '\n');
process.exitCode = errors.length ? 1 : 0;
