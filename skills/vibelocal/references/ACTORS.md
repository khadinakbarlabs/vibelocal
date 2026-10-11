# Verified backend contracts

Public owner: `khadinakbar`. Checked 2026-10-11 against Apify public metadata, successful default builds, input schemas and dataset schemas. Machine-readable pins, hashes, prices and limits are in [actors.json](actors.json); schemas are in `schemas/`. Prices and builds can change: `plan` and `run` recheck them and stop on drift. Verification here was read-only; no live paid dataset was collected for this release.

| Alias | Public Actor / pinned build | Bound and purpose |
| --- | --- | --- |
| maps-ranks | [Local Rank Tracker](https://apify.com/khadinakbar/local-rank-tracker), 0.1.25 | 1–20 keywords × 1–25 points, at most 500 checks; Maps target positions |
| local-pack | [Google Local Pack API](https://apify.com/khadinakbar/google-local-pack-api), 0.2.3 | 1–20 queries × 1–25 points, at most 500 checks; Search local-pack snapshots |
| places | [Google Maps Extractor](https://apify.com/khadinakbar/google-maps-extractor), 1.0.5 | Up to 100 businesses; public profile and competitor discovery; contact enrichment disabled |
| reviews | [Google Maps Reviews Scraper](https://apify.com/khadinakbar/google-maps-reviews-scraper), 0.5.3 | Up to two precise places and 500 reviews shared per run; personal reviewer fields disabled and removed locally |
| citations | [Yext Alternative](https://apify.com/khadinakbar/yext-alternative), 0.1.6 | Up to ten branches; US, CA, GB, AU only; directory discovery and snippet-level name/address/phone evidence |
| website | [Website SEO Spider](https://apify.com/khadinakbar/website-seo-spider), 0.2.5 | Up to 100 pages from five public HTTPS seeds; direct HTML fetch, robots.txt respected |
| serp | [Scrape Google SERP](https://apify.com/khadinakbar/scrape-google-serp), 1.0.21 | Up to ten queries × two pages; regional organic results, related queries and questions |

Start with one branch and the minimum sample needed. Do not silently fall back to an unrelated Actor or request unbounded collection. Website/Maps links must be public HTTPS hostnames without credential-bearing query parameters. Private network and IP targets, custom proxies and broad personal/contact enrichment are unsupported.

## Inputs and joins

`maps-ranks`: `businessName`, `keywords`, `locations`; add the reviewed `placeId` or `cid` where available. A website domain is weaker for a multi-branch business. Use one of `locationCode`, `locationName` or `locationCoordinate` per point, never several. Coordinates are `latitude,longitude[,radius]`; use the same grid later. Defaults: standard provider mode, English, desktop, depth 100. Change language/device/depth deliberately and label the resulting series separately. A name-only match requires manual branch review.

`local-pack`: `queries`, the same location selector rules, `languageCode`, `device`, `maxLocalPackResults`. Keep it separate from the Maps tracker; the tracker's compatibility field `localPackRank` is a Maps result position, not proof of a Google Search three-pack position. Neither establishes organic position.

`places`: choose precise `startUrls` or `searchQuery` plus `location`; set `maxResults` ≤100 and keep `includeWebsiteContacts:false`. Match `place_id`, `google_maps_url`, public address/category and owner-confirmed branch before comparing. Similar names are not a reliable join.

`reviews`: choose exactly one of `placeIds`, `dataIds` or full Google Maps `startUrls`. Do not resolve an ambiguous search directly into a review sample. Set `maxReviews` as the shared saved-row cap and keep `includePersonalData:false`. Reviewer identifiers are excluded from stored normalized rows and the report; review text itself may contain personal information and still needs human redaction before sharing. The current Actor documentation says it may invoke `compass/crawler-google-places` using the caller's injected run credential as a separately billed fallback, with a $0.50 event-charge ceiling per fallback run plus possible proxy/platform usage. That child run is outside the primary event cap; show this disclosure in the approval plan.

`citations`: canonical `businessName`, public `phone`, `city`, country; optional verified public address/website and caller-owned `externalId` to preserve branch joins. Unsupported countries use a manual directory evidence sheet. Missing search hits do not establish a missing listing; absent address/phone snippets do not establish a mismatch. There is no directory write/sync API in this workflow.

`website`: public `startUrls`, `maxPages`, deliberate crawl scope. Initial seed can be one branch page with `maxPages:10`. Raw HTML can reveal fetched title, canonical, directives, headings, links and observed JSON-LD types; absence in raw HTML does not prove absence after rendering. Response time is not Core Web Vitals. Crawl indexability is not Search Console index status.

`serp`: `queries`, country/language and `maxResultsPages` ≤2. City/service wording is a query modifier, not precise geolocation. This backend does not supply keyword volume, CPC or keyword difficulty. Never manufacture these metrics from result counts.

## Terminal evidence

Maps, local-pack, places, citations and website declare `OUTPUT` and `RUN_SUMMARY`. The current reviews README also documents both, so both are required even though its storage declaration exposes only OUTPUT. SERP declares neither in the public build contract, so the collector uses run identity and dataset count/rows for ingestion and does not claim an OUTPUT/RUN_SUMMARY acceptance test. A successful ingestion still needs task-level source and coverage review.

Observed charge events are distinct from platform usage. The helper uses exact current event rates and a conservative count bound for planning; event estimates are not a total-invoice guarantee. Do not insert a customer's account balance, billing details or token into a report.
