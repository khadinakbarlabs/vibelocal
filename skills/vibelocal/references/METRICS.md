# Local visibility measurement

Every finding records branch identity, query, location selector, language, device, depth, provider mode, collection time and source. Report the metric's denominator and scope.

For Maps tracker rows, a valid found rank is an integer between 1 and configured depth with `rankStatus:local_pack` and `localPackFound:true`. A valid not-found row has null rank, `rankStatus:not_found` and `localPackFound:false`. Errors, missing rows and contradictory fields are unknown, never not-found. `organicRank:null` and `organicFound:false` are compatibility fields, not organic measurements.

Top-3 share = found rows ranked ≤3 / all valid observed checks, including valid not-found checks. Mean rank when found = sum of found positions / found checks; show the number found. Show observed/expected coverage separately; when expected coverage is unknown, say so. Do not replace not-found with depth+1, fabricate search-volume weights or call a scrape-based score Google's ranking score.

`compare` requires complete matching observation keys, untruncated coverage and later collection times. It matches place/cid/domain/name identity plus keyword, precise location selector, language, device, depth and provider mode. Both-found rows can show positions improved. Newly found and no longer found stay categorical. Do not compare a new grid, branch, language or depth as if it were a rank change; do not infer causation from before/after movement.

The HTML point cards are a grid summary, not a geographic basemap. Preserve grid coordinates in the snapshot and explain radius/spacing. Public competitor review count, rating and ranking are observed comparisons, not causal weights. Do not introduce unsupported rank-factor percentages.

Review themes use an explicitly bounded sample; show rating/date/sort/language coverage and exemplars. A sample response count is not the whole profile's response rate. Directory coverage is discovery coverage, not guaranteed listing absence or consistency. Search-related questions are content ideas, not observed search demand volumes.

Owner exports may add GBP performance, calls, website clicks, directions, Search Console impressions/clicks and attributed bookings. Keep each metric's platform definition, date range, source and attribution limits. Avoid mixing timezones or comparing unequal periods. Never equate rank movement with revenue.

Google describes local ranking in terms of relevance, distance and prominence, without publishing plugin-specific numerical weights: [Google local ranking guidance](https://support.google.com/business/answer/7091).
