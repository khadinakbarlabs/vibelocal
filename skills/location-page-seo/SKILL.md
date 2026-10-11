---
name: location-page-seo
description: Audit or draft local service and branch landing pages, fix evidence-backed on-page SEO gaps, and prepare accurate LocalBusiness JSON-LD. Respect service-area privacy and avoid fabricated locations, testimonials or doorway pages.
---

# Authentic location-page SEO

Read [WORKFLOW.md](../vibelocal/references/WORKFLOW.md) and [ACTORS.md](../vibelocal/references/ACTORS.md). Reuse public branch/service-area facts and the keyword/page map. Start with the supplied page or local source files. A `website` plan can crawl a public HTTPS branch page with a small bound, normally 10 pages, while respecting robots.txt. Do not crawl private/authenticated pages or customer portals.

Check observed status, title, description, headings, canonical, visible contact/service details, internal links, accessibility of useful content and JSON-LD types. Distinguish raw response HTML from rendered content. Missing JSON-LD in a direct fetch needs rendered inspection before concluding it is absent. Crawl flags are leads for review; response time is not Core Web Vitals and crawl directives are not proof of Google's index status.

Draft the page around real services and a real branch or public service area: clear title/H1, useful service information, accurate hours/contact/booking route, verified access details, approved FAQs and a clear next action. Use distinct owner-provided local evidence. No invented office, landmarks, testimonials, awards, qualifications, prices or boilerplate pages with city swaps. A service-area page can describe service areas without publishing a hidden address.

Use `schema --context CONTEXT.json --out DRAFT_SCHEMA.json` for a restrained LocalBusiness draft. Storefront/hybrid schema requires a verified public address; service-area schema omits private addresses and explains that it lacks Google's required rich-result address. No self-serving aggregate review stars or fabricated ratings. Choose a more specific schema type only after checking it against the actual business and current requirements.

Validate draft markup against visible page facts and [Google LocalBusiness structured-data guidance](https://developers.google.com/search/docs/appearance/structured-data/local-business). Valid markup does not guarantee a rich result or ranking uplift. Deliver the reviewed issue table, concrete page/schema drafts and a verification plan. Local implementation may be authorized by the user's request; public publishing requires approval of the resulting change.
