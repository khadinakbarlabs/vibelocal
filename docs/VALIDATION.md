# Candidate validation — 2026-10-11

VibeLocal 0.1.0 is an owner-review candidate. Evidence states are deliberately separate.

| Check | Observed result |
| --- | --- |
| Behavior tests | 29 passed; synthetic records and mocked HTTP |
| Native Claude manifest | Strict validation passed on Claude Code 2.1.289; no errors/warnings |
| Component inventory | 9 skills, 0 commands, 0 agents; passes Plugin Builder's conservative local budget |
| Resource/credential checks | Source validator passed; contained references/imports, schema hashes and file bounds |
| Current backend contracts | 7 public metadata/build/schema/pricing readbacks passed without credentials or paid runs |
| Paid live Actor acceptance | Not run; no collection budget or token selected |
| Native model workflow smoke | Blocked before inference: local Claude OAuth session expired and could not refresh; reported cost $0 and 0 model tokens |
| Model baseline comparison / routing accuracy | Not run |
| Independent reviewer agent | Not run; this session used sequential source review and executable tests |
| Anthropic portal source validation / security scan / review | Not run |
| Public repository / directory availability | Pending owner approval |

The extracted archive checks and hashes are recorded in the release directory's evidence JSON. Private Plugin Creator save receipts are recorded separately and do not establish Claude host behavior or directory approval. The fictional report preview demonstrates local generation only.

Sequential source review added regressions for uncertain HTTP server errors, exact run identity, incomplete provider comparisons and distinct branches sharing a website domain. The review also corrected the reviews Actor's shared run cap and disclosed its separately billed fallback. This is not an independent security certification.

Before submission, publish the approved source under the authenticated GitHub owner, verify documentation/support/privacy/terms URLs, add them to the native manifest and read back the changed source. Inspect the actual portal's source/listing/data/compliance steps. Resolve native model verification through an owner-controlled Claude login where available; do not silently replace credentials. Anthropic's eventual source validation, automated scan and review are separate outcomes.
