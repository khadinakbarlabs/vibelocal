# Reviewer reproduction and evidence boundaries

Candidate: VibeLocal 0.1.0. Target: local Claude Code, skills-only with contained CLI helpers. Requirements: Node.js 22+, local file/shell access; network and a dedicated user-selected Apify token file only for approved live runs. No `npx`, `uvx`, installation hooks, remote executable downloads, MCP server or automatic execution is required.

## Safe reproduction

1. Validate `.claude-plugin/plugin.json` with `claude plugin validate . --strict --json` on a current Claude Code release.
2. Run `npm test` and `npm run validate`; npm is only a convenient local script runner and installs nothing.
3. Run `node skills/vibelocal/scripts/cli.mjs demo --out /your/new/private/folder`.
4. Open the returned HTML report. Every section is labelled an illustrative fixture; no Actor, network call or cost occurred. Compare its before/after snapshots using the returned paths.
5. Import a synthetic JSON review array using `import --actor reviews`; reviewer identity fields are removed and coverage remains unknown unless explicitly supplied.
6. Optionally read current public backend contracts with `contract --actor maps-ranks`; this operation has no token or paid start.

## Intended routing cases

| Request | Expected route/result |
| --- | --- |
| “Audit this Google Business Profile” | Profile evidence/checklist, not automatic paid collection |
| “Track my Maps rankings in the same nine-point grid” | Exact small rank plan, budget review and comparable settings |
| “Which local service pages should I improve?” | Keyword-to-service/page map and factual page drafts |
| “Summarize these reviews and draft replies” | Anonymous sample themes and owner reply drafts; no posting |
| “Check this branch's citations in Canada” | Canonical public facts, branch ID and reviewed citation plan |
| “Create a client local SEO report from these files” | Real local HTML artifact plus source-linked action summary |
| “Continue the incomplete rank run” | Collect/reconcile the current receipt; no blind replacement POST |

Near misses: generic code review, paid search ad management, writing unrelated social posts and product website SEO without a local business context should not select this product. Routing cases are specifications until a native model run is recorded; helper tests do not establish selection precision or retention.

## Remote processing review

Read PRIVACY.md and WORKFLOW.md. Live authentication uses a dedicated file explicitly selected by the user. The optional setting is its path, not its contents. No inherited environment/login/keychain/browser credentials are read. The user enters the token in their own hidden terminal prompt; an agent must not ask for it in chat or run that interactive setup on their behalf. Live API requests use a fixed `api.apify.com` HTTPS origin, header authentication and redirect rejection.

No Google profile/review/directory write is implemented. Actor schemas, exact builds and effective rates are checked before a paid start. The reviewed fingerprint and event cap are required; cap semantics include the possibility of separate platform charges. One paid POST is issued per receipt, without automatic retry. Unknown outcomes require identity/input/time reconciliation.

## Evidence states

Local test results, source/archive validation and public contract readbacks are recorded in the release evidence files. An illustrative demo is a demonstration of report generation, not live ranking data. A current schema/build read is not a paid Actor acceptance test. Local Claude validation is not Anthropic portal source validation or security review. Private Plugin Creator creation is not an Anthropic listing.

No paid live run, baseline-versus-plugin model evaluation, independent agent review, Anthropic security scan, directory approval or public availability is claimed for this owner-review candidate.
