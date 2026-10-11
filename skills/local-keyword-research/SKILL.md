---
name: local-keyword-research
description: Build a local service keyword map, find city and near-me query opportunities, map intent to real branch pages, or choose keywords for Google Maps rank checks. Use observed SERP questions and related queries without inventing volume or difficulty.
---

# Local service keyword map

Read [WORKFLOW.md](../vibelocal/references/WORKFLOW.md) and [ACTORS.md](../vibelocal/references/ACTORS.md). Reuse actual services, public service areas and the user's goal. Start with a useful local draft without paid data: service × locality × intent, distinguishing emergency, appointment, price/eligibility and information needs where those services are real.

Select a small representative `serp` sample only if search evidence is needed and its plan is approved. Preserve country, language, query, result page, timestamp and source URL. Related searches and People Also Ask are observed ideas. This Actor does not provide search volume, CPC or difficulty; leave these unknown. A city phrase is query wording, not precise device geolocation. Use the separate Maps grid workflow for location-based rank positions.

Produce a deduplicated map: keyword, intent, actual service, branch/service area, source/observed date, proposed existing page or justified new page, and validation method. Prioritize service fit, purchase intent, the owner's capacity and observed content gaps; label these qualitative judgments. Avoid duplicate city pages with swapped names, unsupported service claims, fake offices and keyword-stuffed business names.

Choose 1–3 baseline ranking queries and a small content improvement the owner can review. Do not turn all ideas into a paid ranking run automatically. If the user supplies Search Console or keyword-tool exports, keep their metrics and definitions separate from this scraper's observations.

Deliver the usable keyword/page map, assumptions and next action. Route a location-page implementation to `location-page-seo`; a request only for rankings goes to `maps-rank-tracking`.
