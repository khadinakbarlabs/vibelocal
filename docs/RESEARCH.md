# Research provenance and design decisions

Research date: 2026-10-11. GitHub star counts are dated popularity snapshots, not task success, retention, market size or evidence of ranking improvement. Queries covered Claude SEO/local SEO skills and marketing skills; they do not establish an exhaustive ranking of every repository.

## Open-source references reviewed

| Repository | Stars observed | License | Reviewed commit |
| --- | ---: | --- | --- |
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | 54,115 | MIT | `1efedbc5148b54b2f0f6c6c9fe0be62e151c7fff` |
| [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) | 18,675 | MIT | `4b99de2f7de7e7d5247042e5fb5b4ea9368ef734` |
| [garrettjsmith/localseoskills](https://github.com/garrettjsmith/localseoskills) | 121 | MIT | `405ce209775f8cb8f9dbaa511656594bb682cf9f` |

The broad marketing and Claude SEO repositories were the largest relevant star signals inspected. The smaller specialist repository supplied closer local SEO workflow context. Source reading focused on SEO-audit onboarding, Google Business Profile/local checklists, citations, multi-location content, local keyword research and reporting. Third-party files were read as reference data, not installed or executed.

VibeLocal's original implementation adopts useful patterns: reuse the business context; separate public observations from owner-confirmed facts; link a finding to a concrete action; preserve branch identity; pair content improvements with repeatable measurement; and put long procedures behind focused entry skills. It does not reproduce their code or skill prose. No promotional footer, unsupported factor weight, market statistic or claimed SEO uplift was imported. The resource-rich CLI, exact-budget approval, pinned Actor verification, unknown-start recovery and evidence-led snapshots are original to this package.

## Current primary contracts

- [Claude plugin manifest reference](https://code.claude.com/docs/en/plugins-reference): native identity/display name, file-based user configuration and contained paths.
- [Anthropic pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist) and [submission flow](https://claude.com/docs/plugins/submit): README, license, public policies, source validation, data disclosures and owner compliance acknowledgements.
- [Agent Plugins manifest schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json): separate portable edition for a private Plugin Creator save.
- [Apify Actor build contract](https://docs.apify.com/api/v2/actor-build-default-get), [run API](https://docs.apify.com/api/v2/actors-runs-post) and [dataset pagination](https://docs.apify.com/api/v2/dataset-items-get): public contract reads, exact build, event caps and raw offsets.
- [Google local ranking](https://support.google.com/business/answer/7091), [profile representation](https://support.google.com/business/answer/3038177), [review guidance](https://support.google.com/business/answer/3474122) and [LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business): accurate public facts, ethical reviews, privacy and restrained claims.

Seven public `khadinakbar` Actors were verified against metadata, successful default builds, input/dataset schemas and effective event prices. Their exact IDs, pins and hashes are in `skills/vibelocal/references/actors.json`. Public read checks do not establish paid cloud behavior; no live paid collection was run for this candidate.

## Outcome and limits

The requested target is a Claude Code CLI plugin, plus a separate private Plugin Creator edition. Browser-only execution, a new MCP service, automatic scheduling, Google account writes, contact enrichment, npm publication and other marketplace submissions are outside this release. The citation backend's four-country limit is surfaced rather than bypassed. This local release must still be approved by its owner, published to a verified public source and submitted to Anthropic's own validation/security/review process.
