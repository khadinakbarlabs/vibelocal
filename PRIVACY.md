# VibeLocal privacy and data handling

Effective date: 2026-10-11. Developer: Khadin Akbar. This policy describes VibeLocal 0.1.0's bundled CLI and skills; your host, Apify and upstream providers have their own terms and privacy policies.

## Local use

Onboarding notes, imported records, draft plans, receipts, snapshots, schema drafts and HTML reports stay in the local folder you select. The plugin has no telemetry, analytics, remote report assets, product database or background collection. Files are not encrypted or deleted automatically. Remove the project files you no longer need and control backups, synchronization and folder access yourself. POSIX files are created with private permissions; on Windows configure suitable access controls.

Content read by the assistant is also handled by your chosen AI host under its policies. Do not provide unnecessary customer data, confidential exports or private home addresses. Reviewer identity fields are disabled in review requests and removed from normalized review rows, but review text may itself contain personal details. Review/redact text before giving it to a model or sharing a report.

## Optional remote requests

Public contract/planning reads send an Actor ID to `api.apify.com` to verify metadata, builds, input schema and prices. They use no credentials, request no paid run and send no business input. A live run happens only after approval of the exact scope and event budget.

| Data | Recipient / purpose |
| --- | --- |
| Dedicated user-selected Apify token | `api.apify.com` only, Authorization header for approved run/read operations |
| Public business/branch name, place ID, Maps URL, website | Apify and the selected Actor's providers, for the requested public profile/search/crawl operation |
| Keywords, country/language, device, coordinates/radius, public service-area anchors | Apify and search providers, for approved visibility snapshots |
| Canonical public phone/address/city and branch key | Citation Actor and directory-search providers, for approved public consistency evidence |
| Run/storage IDs and pagination settings | Apify, to collect and reconcile the confirmed run |

Actors can use external search providers and fetch public websites/directories. The reviews Actor can invoke `compass/crawler-google-places` as a separately billed fallback using the caller's injected Apify run credential. Apify supplies those run credentials to the selected Actor; the CLI itself still sends its explicitly selected token only to the fixed Apify API origin. The primary event cap does not cap that child run. The documented fallback event ceiling is $0.50 per fallback run, with possible additional proxy/platform costs. Provider documentation and Apify's policies describe these services; the plugin does not control their retention or guarantee a region of processing. Review the selected Actor and [Apify privacy policy](https://apify.com/privacy-policy) before live use.

No token is placed in a URL, printed or sent to a different API origin by the helper. Credentials are not bundled. The helper reads only a dedicated file path explicitly selected for the task; it does not use environment variables, keychain, browser cookies, Apify CLI login files or other products' secrets. Never paste a token into chat or a plugin setting. The optional Claude setting contains only a file path, which the model can see. Keep the token file private and revoke its token in Apify when no longer needed.

## Retention and control

Local copies remain until you delete them. Approved runs, inputs, datasets, logs and billing records also remain in your Apify account according to its service controls and retention rules. Deleting local files does not delete provider copies; manage those in Apify. The CLI does not automate provider deletion, recurring collection, profile editing, messaging or directory synchronization.

Before sharing, remove hidden addresses, credentials, customer details and unnecessary personal text. Report source links may lead to public third-party sites when you click them; the report loads no remote assets automatically. For privacy questions, use the release's verified support channel in [SUPPORT.md](SUPPORT.md). No contact or rights-response deadline is promised beyond applicable requirements and the developer's ability to respond.
