---
name: citation-audit
description: Audit local business directory citations for name, public address and phone conflicts, preserve multi-location branch identity, and prepare source-linked correction drafts. Supports an approved US, Canada, UK or Australia collection and manual evidence elsewhere.
---

# Citation and listing consistency audit

Read [WORKFLOW.md](../vibelocal/references/WORKFLOW.md) and [ACTORS.md](../vibelocal/references/ACTORS.md). Establish the owner-confirmed real name, public phone, city/country and public website. Include a public address only when appropriate for the business; never send a hidden home address. Assign `externalId` per branch, including for multi-location exports.

The `citations` Actor currently accepts US, CA, GB and AU. For other countries, complete a manual source table from user-provided links/exports or authorized browsing. Do not remap a country or silently substitute another backend. For supported countries, use one branch initially and approve the small plan before collection.

Discovery uses fixed directory domains and search/snippet evidence. A search miss is unobserved, not proof that no listing exists. A snippet with no phone/address is insufficient evidence, not incorrect. Inspect each observed directory URL and branch match before proposing a conflict. Distinguish observed mismatch, observed agreement, insufficient evidence and not observed. Avoid presenting the Actor's transparency score as a Google ranking score or a sync-completion measure.

Produce a correction queue: branch ID, directory/source URL, observed date, canonical field, observed field, evidence state, owner access needed and exact proposed correction. Preserve duplicates and conflicting branch matches for review; do not merge by similar name or row position. Prioritize material customer-facing errors with a reason.

This workflow does not write to Yext or any directory, claim listings or verify owner access. Provide owner-ready correction drafts and a reread checklist. Mark a correction verified only after actual source readback; drafting or selecting a listing is not proof of a saved edit.
