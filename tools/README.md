# NBS Official Release Archive Collector

> Maintenance path only. Historical research should prefer the user-exported
> official NBS "国家数据" CSV workflow in the Historical Series workspace.

The collector is deliberately narrow: it discovers and downloads only public HTML pages from `stats.gov.cn` / `www.stats.gov.cn`. It writes immutable raw files, a manifest and a run log; it never creates Minsheng OS data records.

```powershell
python tools/nbs_release_collector.py --start-year 2018 --end-year 2026 --dry-run
python tools/nbs_release_collector.py --start-year 2018 --end-year 2026 --categories industrial,retail_sales --download
python tools/nbs_release_collector.py --start-year 2018 --end-year 2026 --download --resume
python tools/nbs_release_collector.py --repair-manifest
```

`--dry-run` writes `sources/nbs/manifests/manifest_dry_run.json` and never replaces the operational manifest. It includes a per-year/category summary, discovery coverage warnings, and possible duplicate-release flags. Use `--yes` only after inspecting that manifest.

`--repair-manifest` is an offline repair for old manifests that lack a publication date even though the saved NBS HTML contains `PubDate`; it makes zero network requests and preserves the original raw-file path.

The supported categories are `industrial`, `retail_sales`, `property`, `fixed_asset_investment`, and `macro_monthly_release`. Broad “消费市场” title matches are marked `REVIEW_CATEGORY`; they are not silently accepted as an ordinary retail release.

Downloaded files belong under `sources/nbs/raw/`; import their manifest into Minsheng OS, parse the raw HTML, stage candidates with `MinshengNbsBatchReview`, and review before accepting records. `Accept All Valid` excludes ambiguities, conflicts, duplicate corroborating values, and methodology warnings.

## Official export workflow (v0.9.5)

Export the required series normally from the NBS portal, then use the in-app
Historical Series workspace. CSV is supported directly; XLS/XLSX must be
exported to CSV by the user. The intake stores the unmodified CSV text and
SHA-256, previews a suggested layout (LONG, WIDE_TIME, or VERTICAL_SERIES),
requires layout confirmation, then stages exact verified mappings for review.
