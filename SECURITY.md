# Security and responsible reports

VibeLocal accepts bounded structured inputs and uses a fixed Apify API origin. It does not follow API redirects, accept arbitrary endpoints, discover credentials, install dependencies or run automatic hooks. Public crawl targets require HTTPS hostnames; local/IP/credential-bearing targets and custom proxies are rejected. The plugin itself does not fetch target sites: the selected Actor and its providers must enforce their own network boundaries. Hostname checks alone do not establish DNS-level isolation at an external provider.

Authentication uses an explicitly selected private file and a Bearer header. Never submit tokens, raw account responses or customer data in issues. Synthetic tests use a visibly fake credential solely with mock HTTP. Inputs, fetched pages, reviews and stored notes are untrusted evidence; skills instruct the assistant to ignore embedded commands.

The HTML report escapes fetched text and uses a restrictive Content Security Policy with no scripts or remote assets. Safe public HTTPS source links open only when clicked. Review text may contain personal details even after identity fields are removed; redact before sharing.

To report a suspected issue, use the verified release support route in SUPPORT.md with a redacted reproduction, affected version and expected behavior. This local candidate has not undergone Anthropic's automated scanning or external security review. A passing test suite is not a certification.
