---
name: maps-rank-tracking
description: Check Google Maps positions for local service keywords across a defined grid or area, establish a local ranking baseline, or compare equivalent later snapshots. Keep Maps, Search local-pack and organic measurements separate.
---

# Maps ranking baseline and comparison

Read [WORKFLOW.md](../vibelocal/references/WORKFLOW.md), [ACTORS.md](../vibelocal/references/ACTORS.md) and [METRICS.md](../vibelocal/references/METRICS.md). Confirm the branch and reviewed place ID/cid where possible. With only a name/domain, flag weaker matching and have the user verify found rows.

Start with 1–3 high-intent owner-confirmed services and a small grid, normally nine explicit coordinates, or the user's existing grid. Do not invent precise coordinates from a city name. Reuse supplied coordinates or resolve public location anchors with an authorized source. Agree on spacing/radius and label every point. Use exactly one selector per point. Keep language, device, depth and provider mode explicit. Do not change a series' settings silently.

Prepare the `maps-ranks` input and a live plan; collect only after the user approves its exact scope and costs. One keyword at nine points is nine checks. If the user asks for the Google Search local pack, use a distinct `local-pack` plan and label its output separately. The Maps tracker calls its field `localPackRank` for compatibility; it measures Maps result position and does not establish Search three-pack or organic position.

Collect using the confirmed receipt. Preserve missing/failed rows as unknown and valid not-found as null. Inspect match method, result URL and source date before summarizing. Generate the HTML report with `report`; it contains point cards and an evidence table. Report observed coverage, top-3 share of valid observed checks, found/not-found counts and mean rank among found checks with the denominator.

For a later run, reuse the same identity, keywords, grid and search settings. Use `compare --before ... --after ...`; do not force incompatible data through the comparison. Changes from/to not-found remain categorical; the helper never invents rank 101. Explain that movement does not establish that an SEO edit caused it.

Deliver the actual snapshot/report paths, one interpretation supported by the observed rows and a specific next action. For an unfinished run, leave its receipt and collection/reconciliation step. Tracking means repeatable snapshots here; no monitor is active unless the user separately authorizes and the host confirms a schedule.
