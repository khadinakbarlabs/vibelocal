# VibeLocal: GMB, Maps & Rankings

Audit Google Business Profile (GMB), track Google Maps rankings, compare local competitors, and turn reviews, citations and location-page evidence into a prioritized local SEO action plan.

VibeLocal is a skills-only plugin for **Claude Code**. Nine guided workflows share a dependency-free local CLI and seven public Apify Actors owned by Khadin Akbar. Use supplied exports without an account, or approve a small live collection when fresh evidence is needed. The result is a private HTML report, source-dated findings and concrete owner edit drafts.

## What you can do

- Audit public Google Business Profile facts and prepare a correction checklist.
- Establish a Google Maps ranking baseline across a defined grid and compare equivalent later snapshots.
- Compare relevant local competitors and map real services to search intent.
- Analyze sampled reviews and prepare factual reply drafts.
- Check directory citation evidence, preserving each branch's identity.
- Review authentic location pages and prepare restrained LocalBusiness schema drafts.
- Assemble owner/client reports with coverage, unknown results and next actions.

Maps positions, Search local-pack observations and organic results are kept separate. VibeLocal does not claim guaranteed rankings, keyword volumes, bookings or ROI from scraped data. Profile changes, replies and directory edits remain drafts; the CLI cannot post to Google or sync listings.

## Local preview and installation

Requires Node.js 22 or later and a host with local shell/file access. There are no package dependencies, install hooks, MCP servers or background jobs. Install Node through your usual trusted process if needed; VibeLocal does not install it.

From a downloaded source checkout:

```sh
node skills/vibelocal/scripts/cli.mjs help
node skills/vibelocal/scripts/cli.mjs demo --out .vibelocal/example
claude --plugin-dir /absolute/path/to/vibelocal
```

Open the returned report path. The demo is fictional and uses no network or paid Actor. In Claude Code, try `/vibelocal:vibelocal`, or ask “Audit this business's Google Business Profile.” Companion skill names include `/vibelocal:maps-rank-tracking` and `/vibelocal:local-seo-report`.

This source contains the native Claude manifest. The separate Agent Plugins ZIP is for a private Plugin Creator save on a compatible local host. It uses the same skills and helpers with a small host adapter. Do not mix the editions or copy one companion skill without its shared resources. Claude Code is the validated target; browser-only Claude and other hosts without local execution cannot run this CLI.

Public repository and directory installation links will be added after owner approval and verified publication. A local archive is not a directory listing.

## Import-first workflow

Start with one branch and the files already available. The CLI imports a JSON array of raw records from a supported Actor. It bounds the input, strips reviewer identity fields and labels provider execution/coverage as unverified. Add `--expected` only if a trusted source establishes the total.

```sh
node skills/vibelocal/scripts/cli.mjs import --actor reviews --input reviews.json --out .vibelocal/reviews.json
node skills/vibelocal/scripts/cli.mjs report --snapshot .vibelocal/reviews.json --out .vibelocal/review-report.html
```

Keep private exports, receipts, token files and reports outside the installed plugin and out of Git. Files are stored locally with restrictive permissions where supported, without encryption or automatic deletion. Review free-text personal information before sharing a report.

## Optional live collection and data handling

`actors` lists the seven backends. `contract` and `plan` read public Apify metadata/build/schema/pricing without a token or paid run. A live plan names the exact input, pinned build, row bound, estimated event charges and event cap. Review its scope and approve its fingerprint before `run`. Plans expire after 24 hours and offline plans cannot start live jobs.

For authentication, create a **dedicated private token file you explicitly choose**. Run `auth --token-file PATH` yourself in an interactive terminal: the hidden prompt creates a new file with mode 0600 on POSIX. Never paste a token into chat, command arguments or plugin settings. The optional Claude setting stores only this file path; paths are visible to the model. The helper reads only the selected file for `run`, `collect` or `reconcile`; it never discovers inherited environment, keychain, Apify CLI or other product credentials.

Live operations send the token only to `https://api.apify.com/v2/` in an Authorization header. Selected public business facts, URLs, queries and location settings go to Apify and the Actor's upstream search/crawl providers. No extra analytics, telemetry, outreach or product database is added. See [PRIVACY.md](PRIVACY.md) for fields, recipients and retention.

`maxTotalChargeUsd` caps the selected Actor's Apify charge events; it is **not a guaranteed total invoice cap** where separate platform usage or child runs apply. The reviews Actor may use a separately billed `compass/crawler-google-places` fallback; its documented $0.50 event ceiling per fallback run and possible proxy/platform costs are shown in the plan. The CLI stops on schema/build/price drift. One start attempt produces a receipt and one POST; it never retries a possibly charged start. Reconcile unknown outcomes before any new run. Collect reads run identity, declared terminal evidence and bounded raw dataset pages. Provider `SUCCEEDED` alone does not establish useful, complete evidence.

Examples and recovery: [operating workflow](skills/vibelocal/references/WORKFLOW.md), [backend contracts](skills/vibelocal/references/ACTORS.md), [metric definitions](skills/vibelocal/references/METRICS.md).

The citation backend currently supports US, Canada, UK and Australia. Other countries use manual evidence review. Website crawling inspects fetched HTML; it does not measure Core Web Vitals or prove rendered schema absence. SERP research has no search-volume or difficulty metrics. Review collection requires a precise place, disables personal reviewer fields and still requires redaction of sensitive free text.

## Development and review

```sh
npm test
npm run validate
claude plugin validate . --strict --json
```

Tests use synthetic records and mocked HTTP, including price/build drift, partial pagination, exact plan approval, unknown-start recovery, rank comparability, credential isolation and HTML escaping. Public backend contract reads are recorded separately. No paid live collection, independent model comparison, Anthropic security scan or directory approval is implied by these checks.

Read [research provenance](docs/RESEARCH.md), [reviewer instructions](docs/REVIEWER.md), [support](SUPPORT.md), [security](SECURITY.md) and [terms](TERMS.md). VibeLocal is independent of Google, Apify and Anthropic; product names identify compatible workflows, not endorsements.
