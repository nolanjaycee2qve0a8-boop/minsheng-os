#!/usr/bin/env python3
"""Conservative collector for public NBS release pages.

It only writes raw files, manifests and logs. Parsing/REAL-record commit remains
inside Minsheng OS and requires manual review.
"""
from __future__ import annotations

import argparse, hashlib, json, re, sys, time
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Optional
from urllib.parse import urljoin, urlparse, urldefrag
from urllib.request import Request, urlopen

OFFICIAL_DOMAINS = {"stats.gov.cn", "www.stats.gov.cn"}
ARCHIVE_URL = "https://www.stats.gov.cn/sj/zxfb/"
TARGET_RULES = {
    # The order is intentional: broad comprehensive releases are tagged before
    # any component statistic.  Extraction, not discovery, decides which
    # indicators are actually present in the article.
    "macro_monthly_release": ("国民经济运行", "国民经济运行情况", "月份国民经济", "1—", "1-"),
    "industrial": ("规模以上工业增加值", "工业生产"),
    "retail_sales": ("社会消费品零售总额",),
    "property": ("房地产市场基本情况", "全国房地产市场基本情况", "房地产开发投资", "商品房销售", "房地产开发和销售"),
    "fixed_asset_investment": ("固定资产投资", "全国固定资产投资", "民间固定资产投资"),
}
REVIEW_CATEGORY_RULES = {"retail_sales": ("消费市场",)}
USER_AGENT = "MinshengOS-NBS-Release-Collector/0.9.4 (local research tool)"


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def canonical_url(url: str) -> str:
    return urldefrag(url)[0]


def is_official(url: str) -> bool:
    return urlparse(url).hostname in OFFICIAL_DOMAINS


def classify_title(title: str) -> tuple[str, bool]:
    for category, words in TARGET_RULES.items():
        # "1—" / "1-" alone is not a macro rule.  It is combined with the
        # national-economy anchor so normal component releases stay specific.
        if category == "macro_monthly_release":
            if ("国民经济" in title and any(word in title for word in words)):
                return category, False
        elif any(word in title for word in words):
            return category, False
    for category, words in REVIEW_CATEGORY_RULES.items():
        if any(word in title for word in words):
            return category, True
    return "unknown", False


def parse_date(text: str) -> Optional[str]:
    match = re.search(r"(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})", text)
    if not match:
        return None
    return f"{match.group(1)}-{int(match.group(2)):02d}-{int(match.group(3)):02d}"


def decode_html(body: bytes) -> str:
    """Decode using declared charset first; retain raw bytes unchanged on disk."""
    declared = re.search(br"charset\s*=\s*['\"]?([A-Za-z0-9_-]+)", body[:8192], re.I)
    encodings = [declared.group(1).decode("ascii", "ignore")] if declared else []
    encodings += ["utf-8", "gb18030"]
    for encoding in dict.fromkeys(encodings):
        try:
            return body.decode(encoding)
        except (LookupError, UnicodeDecodeError):
            continue
    return body.decode("utf-8", errors="replace")


def release_publication_date(body: bytes) -> Optional[str]:
    text = decode_html(body)
    meta = re.search(r"<meta[^>]+(?:name|property)\s*=\s*['\"]?(?:PubDate|publishDate|publicationDate)['\"]?[^>]+content\s*=\s*['\"]?([^'\">]+)", text, re.I)
    if not meta:
        meta = re.search(r"<meta[^>]+content\s*=\s*['\"]?([^'\">]+)[^>]+(?:name|property)\s*=\s*['\"]?(?:PubDate|publishDate|publicationDate)", text, re.I)
    return parse_date(meta.group(1)) if meta else None


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: List[Dict[str, str]] = []
        self._href: Optional[str] = None
        self._text: List[str] = []

    def handle_starttag(self, tag: str, attrs: List[tuple]) -> None:
        if tag.lower() == "a":
            self._href = dict(attrs).get("href")
            self._text = []

    def handle_data(self, data: str) -> None:
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self._href is not None:
            self.links.append({"href": self._href, "title": " ".join(self._text).strip()})
            self._href = None
            self._text = []


@dataclass
class FetchResponse:
    body: bytes
    status_code: int
    headers: Dict[str, str]


def http_fetch(url: str, timeout: int = 30) -> FetchResponse:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
    with urlopen(request, timeout=timeout) as response:
        return FetchResponse(response.read(), response.status, dict(response.headers.items()))


def discover_archive_links(html: bytes, archive_url: str) -> List[Dict[str, Optional[str]]]:
    parser = LinkParser()
    parser.feed(decode_html(html))
    found: List[Dict[str, Optional[str]]] = []
    seen = set()
    for link in parser.links:
        url = canonical_url(urljoin(archive_url, link["href"]))
        if not is_official(url) or url in seen:
            continue
        seen.add(url)
        title = link["title"]
        category, review_category = classify_title(title)
        if category == "unknown":
            continue
        found.append({"id": hashlib.sha256(url.encode()).hexdigest()[:16], "source": "nbs", "title": title, "url": url, "publication_date": parse_date(title) or parse_date(url), "category": category, "review_category": review_category, "status": "REVIEW_CATEGORY" if review_category else "DISCOVERED", "local_path": None, "sha256": None, "discovered_from_archive_url": archive_url})
    return found


def pagination_links(html: bytes, archive_url: str) -> Iterable[str]:
    parser = LinkParser(); parser.feed(decode_html(html))
    for link in parser.links:
        url = canonical_url(urljoin(archive_url, link["href"]))
        label = link["title"]
        # Old NBS archive templates use page_2.htm, index_2.html, ?page=2 and
        # sometimes only a numeric paging label.  A release URL is never added
        # merely because it is numeric: it must look like an archive/pager.
        is_pager = ("page" in url.lower() or "index_" in url.lower() or
                    re.search(r"[?&](?:page|p)=\d+", url, re.I) or
                    re.search(r"第\s*\d+\s*页|下一页|上一页", label))
        if is_official(url) and is_pager:
            yield url


def collect_archive_pages(archive_url: str, max_pages: int, start_year: int, end_year: int, fetcher: Callable[[str], FetchResponse] = http_fetch, delay: float = 1.0) -> Dict[str, object]:
    if not is_official(archive_url):
        raise ValueError("REJECT_NON_OFFICIAL_DOMAIN")
    queue, scanned, releases, errors = [canonical_url(archive_url)], set(), {}, []
    while queue and len(scanned) < max_pages:
        url = queue.pop(0)
        if url in scanned:
            continue
        scanned.add(url)
        try:
            response = fetcher(url)
            if response.status_code != 200:
                errors.append({"url": url, "error": "HTTP_ERROR", "status_code": response.status_code}); continue
            if not response.body:
                errors.append({"url": url, "error": "EMPTY_BODY"}); continue
            for release in discover_archive_links(response.body, url):
                year = int(release["publication_date"][:4]) if release["publication_date"] else None
                if year is None or start_year <= year <= end_year:
                    releases.setdefault(release["url"], release)
            for page in pagination_links(response.body, url):
                if page not in scanned and len(queue) + len(scanned) < max_pages:
                    queue.append(page)
        except Exception as error:  # Collector records failure; it never retries around access controls.
            errors.append({"url": url, "error": "HTTP_ERROR", "detail": str(error)})
        if queue and delay:
            time.sleep(delay)
    values = list(releases.values())
    # Same title/date on distinct official URLs is retained but cannot be
    # silently treated as independent evidence.
    groups: Dict[tuple, List[Dict[str, Optional[str]]]] = {}
    for release in values:
        groups.setdefault((release["title"], release["publication_date"]), []).append(release)
    for group in groups.values():
        if len(group) > 1:
            for release in group:
                release["possible_duplicate_release"] = True
                release["review_flags"] = sorted(set(release.get("review_flags", []) + ["POSSIBLE_DUPLICATE_RELEASE"]))
    return {"archive_pages": sorted(scanned), "releases": values, "errors": errors}


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "-", value).strip("-") or "release"


def download_release(entry: Dict[str, object], root: Path, fetcher: Callable[[str], FetchResponse] = http_fetch) -> Dict[str, object]:
    url = str(entry["url"])
    if not is_official(url):
        return {**entry, "status": "DOMAIN_REJECTED"}
    try:
        response = fetcher(url)
    except Exception as error:
        return {**entry, "status": "HTTP_ERROR", "error": str(error)}
    content_type = response.headers.get("Content-Type") or response.headers.get("content-type")
    if response.status_code != 200:
        return {**entry, "status": "HTTP_ERROR", "http": {"status_code": response.status_code, "content_type": content_type}}
    if not response.body:
        return {**entry, "status": "EMPTY_BODY"}
    if content_type and "html" not in content_type.lower():
        return {**entry, "status": "NON_HTML", "http": {"status_code": response.status_code, "content_type": content_type}}
    digest = hashlib.sha256(response.body).hexdigest()
    publication_date = entry.get("publication_date") or release_publication_date(response.body)
    date = publication_date or "undated"
    folder = root / "raw" / str(date)[:4] / str(entry["category"])
    folder.mkdir(parents=True, exist_ok=True)
    base = f"{date}__{entry['category']}__{safe_name(str(entry['id']))}"
    path = folder / f"{base}.html"
    version = 1
    while path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        version += 1; path = folder / f"{base}__v{version}.html"
    if not path.exists():
        path.write_bytes(response.body)
    return {**entry, "publication_date": publication_date, "status": "DOWNLOADED", "local_path": str(path), "sha256": digest, "version": version, "downloaded_at": now(), "http": {"status_code": response.status_code, "content_type": content_type, "etag": response.headers.get("ETag"), "last_modified": response.headers.get("Last-Modified")}}


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True); path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def apply_resume(releases: List[Dict[str, object]], manifest_path: Path) -> List[Dict[str, object]]:
    """Reuse verified, existing raw files by canonical URL; never silently redownload them."""
    if not manifest_path.exists():
        return releases
    try:
        prior = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return releases
    previous = {entry.get("url"): entry for entry in prior.get("releases", []) if entry.get("status") == "DOWNLOADED"}
    resumed = []
    for entry in releases:
        old = previous.get(entry.get("url"))
        if old and old.get("local_path") and Path(old["local_path"]).exists() and old.get("sha256"):
            repaired_date = old.get("publication_date")
            if not repaired_date:
                repaired_date = release_publication_date(Path(old["local_path"]).read_bytes())
            resumed.append({**entry, **{key: old.get(key) for key in ("status", "local_path", "sha256", "version", "downloaded_at", "http")}, "publication_date": repaired_date})
        else:
            resumed.append(entry)
    return resumed


def repair_manifest_metadata(manifest_path: Path) -> Dict[str, object]:
    """Repair missing publication dates from already-verified raw bytes only.

    It neither requests a URL nor renames an immutable legacy raw file.  The
    original storage path remains part of provenance and the repaired field is
    explicitly recorded in the manifest.
    """
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    repaired = 0
    for entry in manifest.get("releases", []):
        raw_path = entry.get("local_path")
        if entry.get("status") != "DOWNLOADED" or entry.get("publication_date") or not raw_path:
            continue
        path = Path(raw_path)
        if not path.exists():
            continue
        publication_date = release_publication_date(path.read_bytes())
        if publication_date:
            entry["publication_date"] = publication_date
            entry["metadata_repaired_at"] = now()
            entry["raw_storage_path_preserved"] = True
            repaired += 1
    manifest["metadata_repair"] = {"repaired": repaired, "at": now(), "network_requests": 0}
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect public NBS release HTML into a local, auditable manifest.")
    parser.add_argument("--archive-url", default=ARCHIVE_URL); parser.add_argument("--start-year", type=int, default=2018); parser.add_argument("--end-year", type=int, default=2026)
    parser.add_argument("--categories", default="", help="Comma-separated discovered categories; empty keeps all.")
    parser.add_argument("--max-pages", type=int, default=80); parser.add_argument("--delay", type=float, default=1.0); parser.add_argument("--root", type=Path, default=Path("sources/nbs"))
    parser.add_argument("--dry-run", action="store_true"); parser.add_argument("--download", action="store_true"); parser.add_argument("--resume", action="store_true"); parser.add_argument("--yes", action="store_true"); parser.add_argument("--repair-manifest", action="store_true", help="Repair missing publication dates from local raw HTML; no network request.")
    args = parser.parse_args(); started = now()
    manifest_path = args.root / "manifests" / "manifest.json"
    if args.repair_manifest:
        if not manifest_path.exists():
            print(json.dumps({"error": "MANIFEST_NOT_FOUND", "manifest": str(manifest_path)}, ensure_ascii=False)); return 1
        repaired = repair_manifest_metadata(manifest_path)
        write_json(manifest_path, repaired)
        write_json(args.root / "logs" / f"{repaired.get('collector_run_id', 'nbs_collect')}_metadata_repair.json", repaired)
        print(json.dumps({"metadata_repaired": repaired["metadata_repair"]["repaired"], "network_requests": 0, "manifest": str(manifest_path)}, ensure_ascii=False)); return 0
    result = collect_archive_pages(args.archive_url, args.max_pages, args.start_year, args.end_year, delay=args.delay)
    allowed = {part.strip() for part in args.categories.split(",") if part.strip()}
    releases = [item for item in result["releases"] if not allowed or item["category"] in allowed]
    releases = apply_resume(releases, manifest_path) if args.resume else releases
    by_year: Dict[str, Dict[str, int]] = {}
    for item in releases:
        year = (item.get("publication_date") or "undated")[:4]
        by_year.setdefault(year, {}).setdefault(str(item["category"]), 0)
        by_year[year][str(item["category"])] += 1
    coverage_warnings = []
    for year in range(args.start_year, args.end_year + 1):
        count = sum(by_year.get(str(year), {}).values())
        if count < 2:
            coverage_warnings.append({"year": year, "status": "DISCOVERY_COVERAGE_WARNING", "discovered": count})
    manifest = {"collector_run_id": f"nbs_collect_{datetime.now().strftime('%Y%m%d_%H%M%S')}", "started_at": started, "completed_at": now(), "config": vars(args) | {"root": str(args.root)}, "archive_pages": result["archive_pages"], "releases": releases, "year_category_summary": by_year, "coverage_warnings": coverage_warnings, "errors": result["errors"]}
    if args.download and not args.dry_run:
        print(f"About to download {len(manifest['releases'])} official NBS pages. Continue? [y/N]", end=" ")
        if not args.yes and input().strip().lower() != "y":
            print("Cancelled."); return 0
        manifest["releases"] = [entry if entry.get("status") == "DOWNLOADED" else download_release(entry, args.root) for entry in manifest["releases"]]
        manifest["completed_at"] = now()
    output_path = args.root / "manifests" / ("manifest_dry_run.json" if args.dry_run else "manifest.json")
    write_json(output_path, manifest)
    write_json(args.root / "logs" / f"{manifest['collector_run_id']}.json", manifest)
    print(json.dumps({"pages_scanned": len(manifest["archive_pages"]), "links_discovered": len(manifest["releases"]), "errors": len(manifest["errors"]), "coverage_warnings": len(coverage_warnings), "manifest": str(output_path)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
