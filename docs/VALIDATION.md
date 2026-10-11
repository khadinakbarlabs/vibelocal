# Release validation — 2026-10-11

VibeLocal 0.1.0 is an owner-approved source release. Evidence states are deliberately separate.

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
| Anthropic portal source validation / security scan / review | Separate portal checks; consult the developer portal for their current state |
| Public repository / support / privacy / terms | Published source and public URLs verified; directory availability is a separate external state |

The extracted archive checks and hashes are recorded in the release directory's evidence JSON. Private Plugin Creator save receipts are recorded separately and do not establish Claude host behavior or directory approval. The fictional report preview demonstrates local generation only.

Sequential source review added regressions for uncertain HTTP server errors, exact run identity, incomplete provider comparisons and distinct branches sharing a website domain. The review also corrected the reviews Actor's shared run cap and disclosed its separately billed fallback. This is not an independent security certification.

The source release includes verified public documentation/support/privacy/terms URLs. Directory source validation, scanning, review and availability must be verified in the actual developer portal. Resolve native model verification through an owner-controlled Claude login where available; do not silently replace credentials. Neither source publication nor the public contract reads establish paid Actor acceptance or native model quality.
