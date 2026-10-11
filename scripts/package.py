"""Build deterministic, isolated native Claude and private Agent Plugins archives."""
from pathlib import Path
import hashlib
import json
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEST = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else ROOT.parent / 'exports' / 'vibelocal-0.1.0'
if ROOT == DEST or ROOT in DEST.parents:
    raise SystemExit('Write archives outside the plugin source.')
DEST.mkdir(parents=True, exist_ok=True)
COMMON = ['skills', 'assets', 'docs', 'README.md', 'LICENSE', 'PRIVACY.md', 'TERMS.md', 'SUPPORT.md', 'SECURITY.md', 'CHANGELOG.md', 'THIRD-PARTY-NOTICES.md']
NATIVE = COMMON + ['.claude-plugin', 'packaging', 'scripts', 'tests', 'package.json', '.gitignore']

def payload(paths):
    result = {}
    for item in paths:
        path = ROOT / item
        entries = sorted(path.rglob('*')) if path.is_dir() else [path]
        for entry in entries:
            if entry.is_symlink():
                raise ValueError('Archive cannot contain symlinks.')
            if entry.is_file():
                if entry.stat().st_size > 256 * 1024:
                    raise ValueError('Non-image file exceeds release size bound.')
                result[entry.relative_to(ROOT).as_posix()] = entry.read_bytes()
    return result

def archive(edition, content):
    target = DEST / f'vibelocal-0.1.0-{edition}.zip'
    if target.exists():
        raise SystemExit('Archive exists; use a new output directory for a changed candidate.')
    with zipfile.ZipFile(target, 'x', compression=zipfile.ZIP_DEFLATED) as output:
        for name, data in sorted(content.items()):
            info = zipfile.ZipInfo('vibelocal/' + name, (2026, 10, 11, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            output.writestr(info, data)
    with zipfile.ZipFile(target) as output:
        if output.testzip() or len(output.namelist()) != len(content):
            raise ValueError('Archive round-trip failed.')
        for name, data in content.items():
            if output.read('vibelocal/' + name) != data:
                raise ValueError('Archive byte readback differs.')
    return {'edition': edition, 'path': str(target), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'files': len(content), 'bytes': target.stat().st_size}

native = payload(NATIVE)
portable = payload(COMMON)
portable['plugin.json'] = (ROOT / 'packaging/portable-manifest.json').read_bytes()
main = 'skills/vibelocal/SKILL.md'
text = portable[main].decode()
text = text[:text.index("Claude's optional configured token-file path")].rstrip() + '\n'
portable[main] = text.encode()
readme = portable['README.md'].decode()
readme = readme.replace('VibeLocal is a skills-only plugin for **Claude Code**.', 'This is the private Agent Plugins edition of VibeLocal for a local host with shell and file access.')
readme = readme.replace('claude --plugin-dir /absolute/path/to/vibelocal\n', '')
start = readme.index('Open the returned report path.')
end = readme.index('## Import-first workflow')
readme = readme[:start] + 'Open the returned report path. The demo is fictional and uses no network or paid Actor. Invoke `$vibelocal` or ask to audit a local business. This edition contains the root Agent Plugins manifest; the separate native Claude edition uses the same canonical skills and helpers. Browser-only hosts cannot execute this CLI. Companion skills require the shared `skills/vibelocal/` resources.\n\n' + readme[end:]
readme = readme[:readme.index('## Development and review')] + '## Verification and provenance\n\nThe separately maintained native source contains the local test suite and release validator. Tests use synthetic fixtures and mocked HTTP, not paid Actor runs. Public backend contract reads are a separate evidence state. Private account creation is not Anthropic submission or approval. See [research provenance](docs/RESEARCH.md), [support](SUPPORT.md), [privacy](PRIVACY.md) and [terms](TERMS.md). VibeLocal is independent of Google, Apify and Anthropic.\n'
portable['README.md'] = readme.encode()
manifest = {'format': 'vibelocal-release/1', 'version': '0.1.0', 'archives': [archive('claude', native), archive('agent-plugins', portable)], 'publicSubmission': 'external-state-recorded-separately'}
(DEST / 'release.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest, indent=2))
