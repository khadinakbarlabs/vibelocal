# VibeLocal 0.1.0 build plan

Owner request, 2026-10-11: build a skills-only CLI plugin using Khadin Akbar's Apify Actors, research leading open-source SEO plugins, prepare SEO listing metadata, obtain owner approval, then submit to Anthropic's plugin directory.

## Product

Display title: **VibeLocal: GMB, Maps & Rankings**. Stable identifier: `vibelocal`.
Google Business Profile (formerly Google My Business/GMB), Maps snapshots, Google Search local-pack results, local competitors, reviews, citation consistency, useful location pages, and progress reports form one local SEO workflow. Ranking improvements are goals, never guaranteed outcomes.

## Implementation

- One canonical skills corpus, nine focused entry points, readable dependency-free Node.js CLI helpers, and seven public Actors owned by `khadinakbar`.
- Native Claude manifest at the repository root; a separate Agent Plugins archive for private Plugin Creator creation. No MCP server, hooks, startup tasks, installers, or scheduler.
- Public API metadata and default-build schemas were checked on 2026-10-11. Pin the exact Actor build and schema for each collection plan. Paid Actor runs require a plan fingerprint and explicit event charge cap. Apify platform charges are disclosed separately where applicable.
- Authentication uses only an explicitly selected private token file or a user-entered hidden terminal prompt. Do not inspect existing environment credentials, Apify login files, browser storage, or the user's keychain. The Claude configuration requests a file path rather than exposing a secret in skill content.
- Preserve stable branch/place identity, location selectors, language, device, depth, timestamps, raw offsets, incomplete coverage, run IDs and terminal evidence. Never infer no ranking from missing data or turn absent reviews into a rating of zero.
- Public profile edits, review replies, citation corrections, website deployment, and schedule activation are owner actions. The package prepares drafts and handoffs.
- Citation Actor coverage is US, CA, GB and AU. Other countries use supplied evidence and manual citation review. Organic results and business outcome exports remain separate from Maps measurements.

## Validation

Write behavior tests first for input bounds, rank denominators, comparable snapshots, HTML escaping, credentials, bounded API reads, exact-build checking, uncertain starts, and duplicate-run prevention. Verify with offline fixtures, current public contract checks, strict Claude manifest validation, archive resource closure and a credential scan. A new paid live collection needs separately approved scope and spend; local tests do not prove live Actor behavior.

## Approval and submission

Create the complete local package and private Plugin Creator preview first. Present the exact listing and release for owner approval. After approval, publish the dedicated GitHub repository and policy pages, verify those URLs, import the exact commit into Anthropic's portal, resolve checks and present any required human attestations. Anthropic review acceptance and live publication are later, separate states.
