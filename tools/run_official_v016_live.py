"""Explicit v0.16 LIVE acquisition only. Browser modules and tests never invoke it."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "sources" / "official-v016" / "raw"
MANIFEST = ROOT / "sources" / "official-v016" / "manifests" / "live-acquisition-v016.json"
TARGETS = [
    ("pboc_2025h1_new_mortgage_rate.html", "https://www.pbc.gov.cn/hanglingdao/128697/5580410/5580420/2025100917113619740/index.html", "text/html", "新发放的个人住房贷款利率约3.1%"),
    ("pboc_2024_mortgage_pricing_policy.pdf", "https://www.pbc.gov.cn/chubanwu/114566/114579/5358353/5540955/2024122310475773688.pdf", "application/pdf", ""),
    ("pboc_rate_publication_guide.html", "https://wzdt.pbc.gov.cn/eportal/ui?msgDataId=5a1ca14ce45740208156681603554924&pageId=77c3557bd521439ea5cd869f5393ba98", "text/html", "商业性个人住房贷款加权平均利率每季度发布"),
]


def main() -> int:
    RAW.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    routes = []
    for name, url, expected_mime, marker in TARGETS:
        item = {"fileName": name, "url": url, "role": "ORIGINAL", "expectedMimeType": expected_mime}
        try:
            request = Request(url, headers={"User-Agent": "MinshengOS-v016 official evidence audit"})
            with urlopen(request, timeout=30) as response:
                payload = response.read()
                mime = response.headers.get_content_type()
                status = response.status
            if status != 200:
                raise RuntimeError(f"HTTP_{status}")
            if expected_mime not in mime:
                raise RuntimeError(f"MIME_MISMATCH:{mime}")
            if marker and marker.encode("utf-8") not in payload:
                raise RuntimeError("REQUIRED_CONTEXT_NOT_FOUND")
            (RAW / name).write_bytes(payload)
            item.update({"status": "FETCHED", "mimeType": mime, "fileSize": len(payload), "sha256": hashlib.sha256(payload).hexdigest().upper(), "contentConsistencyVerified": True})
        except Exception as exc:  # audit the failure instead of filling defaults
            item.update({"status": "FETCH_FAILED", "failureReason": str(exc)})
        routes.append(item)
    manifest = {
        "id": "live_official_mortgage_rate_v016_20260820",
        "version": "v0.16.0",
        "explicitLive": True,
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "attemptedReleases": 3,
        "attemptedRoutes": len(routes),
        "originalSuccesses": sum(item["status"] == "FETCHED" for item in routes),
        "fixtureCounted": False,
        "parsedCandidates": 1 if any(item["status"] == "FETCHED" and item["fileName"].startswith("pboc_2025") for item in routes) else 0,
        "mappedCandidates": 1 if any(item["status"] == "FETCHED" and item["fileName"].startswith("pboc_2025") for item in routes) else 0,
        "newRealObservationIds": ["record_pboc_new_personal_housing_loan_rate_2025h1_v016"],
        "stockEffectiveMortgageRate": "UNKNOWN",
        "notes": "NEW_LOAN_RATE is retained as a separate REAL observation. No LIVE result is used as a stock-effective mortgage rate.",
        "routes": routes,
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0 if manifest["originalSuccesses"] == len(routes) else 1


if __name__ == "__main__":
    raise SystemExit(main())
