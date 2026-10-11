import { open, mkdir, lstat, link, rename, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { need } from './contracts.mjs';

export async function readText(file, maxBytes = 10 * 1024 * 1024) {
  const stat = await lstat(file); need(stat.isFile() && !stat.isSymbolicLink(), 'Select a regular file, not a symlink.');
  const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const info = await handle.stat(); need(info.isFile() && info.size <= maxBytes, 'Input file exceeds its size bound.');
    return await handle.readFile('utf8');
  } finally { await handle.close(); }
}
export async function readJson(file) {
  const text = await readText(file);
  try { return JSON.parse(text); } catch { throw new Error('Input must be valid JSON.'); }
}
export async function readToken(file) {
  need(typeof file === 'string' && file.length > 0, 'Choose your private token file explicitly; environment and existing login credentials are never read.');
  const info = await lstat(file);
  need(info.isFile() && !info.isSymbolicLink(), 'Token must be a regular file, not a symlink.');
  if (process.platform !== 'win32') {
    need((info.mode & 0o077) === 0 && (!process.getuid || info.uid === process.getuid()), 'Token file must be private to your user (0600).');
  }
  const token = (await readText(file, 1024)).trim();
  need(/^[A-Za-z0-9._-]{10,200}$/.test(token), 'Token file must contain only one Apify token.');
  return token;
}

export async function writePrivateText(file, text, { replace = false } = {}) {
  const destination = resolve(file), parent = dirname(destination);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  if (replace) {
    try { const info = await lstat(destination); need(info.isFile() && !info.isSymbolicLink(), 'Refusing to replace a symlink or non-file.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const temporary = join(parent, '.vibelocal-' + randomUUID());
  const handle = await open(temporary, 'wx', 0o600);
  try { await handle.writeFile(text, 'utf8'); await handle.sync(); }
  finally { await handle.close(); }
  try {
    if (replace) await rename(temporary, destination);
    else await link(temporary, destination);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('File already exists. Preserve the receipt and reconcile it; do not duplicate a paid run or overwrite an artifact.');
    throw error;
  } finally { await unlink(temporary).catch(() => {}); }
  return destination;
}
export const writePrivateJson = (file, value, options) => writePrivateText(file, JSON.stringify(value, null, 2) + '\n', options);

export async function promptToken() {
  need(process.stdin.isTTY && typeof process.stdin.setRawMode === 'function', 'Run auth in your own interactive terminal. Never paste a token into chat.');
  process.stderr.write('Enter your Apify token (hidden; saved only to the file you chose): ');
  const token = await new Promise((resolveToken, reject) => {
    let value = '';
    const done = error => { clearTimeout(timer); process.stdin.removeListener('data', onData); process.stdin.setRawMode(false); process.stdin.pause(); process.stderr.write('\n'); error ? reject(error) : resolveToken(value); };
    const onData = chunk => {
      for (const c of chunk.toString()) {
        if (c === '\u0003') return done(new Error('Authentication setup cancelled.'));
        if (c === '\r' || c === '\n') return done();
        if (c === '\u007f' || c === '\b') value = value.slice(0, -1);
        else if (/^[A-Za-z0-9._-]$/.test(c) && value.length < 200) value += c;
      }
    };
    const timer = setTimeout(() => done(new Error('Authentication prompt expired.')), 120000);
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.on('data', onData);
  });
  need(/^[A-Za-z0-9._-]{10,200}$/.test(token), 'A valid Apify token is required.');
  return token;
}
