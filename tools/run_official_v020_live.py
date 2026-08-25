"""Explicit v0.20 LIVE acquisition for the international comparison pack.

Raw third-party responses remain local research material.  This script records
the exact routes, HTTP result and SHA-256 in a reviewable manifest; it never
turns an aggregator response into a domestic official Chinese observation.
"""
from __future__ import annotations

import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "sources" / "official-v020" / "raw"
MANIFEST = ROOT / "sources" / "official-v020" / "manifests" / "live-acquisition-v020.json"
COUNTRIES = ["CHN", "USA", "JPN", "KOR", "DEU"]
WB_INDICATORS = {
    "NE.CON.PRVT.ZS": "household_npish_consumption_share_gdp",
    "NE.CON.PRVT.KD.ZG": "household_npish_real_consumption_growth",
    "FS.AST.PRVT.GD.ZS": "private_credit_gdp",
    "SI.POV.GINI": "gini_index",
}
BIS_SERIES = [f"Q.{code}.N.628" for code in ("CN", "US", "JP", "KR", "DE")]
OECD_SERIES = [f"{code}.HHDEBT.TOT.PC_NDI.A" for code in ("USA", "JPN", "KOR", "DEU")]
IMF_SERIES = [f"{code}.GGXWDG_NGDP.pcent_gdp" for code in COUNTRIES]
UA = {"User-Agent": "MinshengOS-v020 research client", "Accept": "application/json"}


def safe_name(value: str) -> str:
    return value.replace("/", "_").replace(":", "_").replace(".", "_")


def fetch(url: str, name: str, request_id: str, provider: str, upstream: str, kind: str) -> dict:
    route = {"requestId": request_id, "provider": provider, "upstreamProvider": upstream,
             "endpoint": url, "kind": kind, "retryCount": 0, "live": True}
    try:
        path = RAW / name
        if path.exists():
            body = path.read_bytes()
            route.update({"status": "CACHED_LOCAL_LIVE", "cacheHit": True, "httpStatus": 200,
                          "contentType": "application/json"})
        else:
            with urlopen(Request(url, headers=UA), timeout=45) as response:
                body = response.read()
                route.update({"httpStatus": response.status, "contentType": response.headers.get_content_type()})
            if route["httpStatus"] != 200:
                raise RuntimeError(f"HTTP_{route['httpStatus']}")
            path.write_bytes(body)
            route["status"] = "FETCHED"
        route.update({"fileName": name, "relativePath": str(path.relative_to(ROOT)).replace("\\", "/"),
                      "responseSize": len(body), "sha256": hashlib.sha256(body).hexdigest().upper()})
    except Exception as exc:  # The manifest is the audit artifact for a failed route too.
        route.update({"status": "FETCH_FAILED", "error": str(exc)})
    return route


def main() -> int:
    RAW.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    routes: list[dict] = []

    def take(url: str, name: str, provider: str, upstream: str, kind: str) -> None:
        routes.append(fetch(url, name, f"v020_{len(routes) + 1:02d}", provider, upstream, kind))
        time.sleep(0.2)

    wb = "https://api.worldbank.org/v2/"
    query = urlencode({"format": "json", "per_page": 3000, "date": "2018:2025", "source": "2"})
    take(f"{wb}country/{';'.join(country.lower() for country in COUNTRIES)}/indicator/{';'.join(WB_INDICATORS)}?{query}",
         "world_bank_comparison_2018_2025.json", "WORLD_BANK_API", "World Bank", "observations")
    for indicator in WB_INDICATORS:
        take(f"{wb}indicator/{indicator}?format=json&source=2", f"world_bank_indicator_{safe_name(indicator)}.json",
             "WORLD_BANK_API", "World Bank", "indicator_metadata")

    for provider in ("BIS", "OECD", "IMF"):
        take(f"https://api.db.nomics.world/v22/providers/{provider}", f"dbnomics_provider_{provider}.json",
             "DBNOMICS", provider, "provider_metadata")
    for provider, dataset in (("BIS", "WS_SPP"), ("OECD", "DP_LIVE"), ("IMF", "WEO:2025-04")):
        take(f"https://api.db.nomics.world/v22/series/{provider}/{dataset}?limit=1", f"dbnomics_dataset_{safe_name(provider)}_{safe_name(dataset)}.json",
             "DBNOMICS", provider, "dataset_metadata")
    for series in BIS_SERIES:
        take(f"https://api.db.nomics.world/v22/series/BIS/WS_SPP/{series}?observations=1",
             f"dbnomics_bis_ws_spp_{safe_name(series)}.json", "DBNOMICS", "BIS", "observations")
    for series in OECD_SERIES:
        take(f"https://api.db.nomics.world/v22/series/OECD/DP_LIVE/{series}?observations=1",
             f"dbnomics_oecd_dp_live_{safe_name(series)}.json", "DBNOMICS", "OECD", "observations")
    for series in IMF_SERIES:
        take(f"https://api.db.nomics.world/v22/series/IMF/WEO:2025-04/{series}?observations=1",
             f"dbnomics_imf_weo_2025_04_{safe_name(series)}.json", "DBNOMICS", "IMF", "observations")

    success = [route for route in routes if route["status"] in ("FETCHED", "CACHED_LOCAL_LIVE")]
    manifest = {
        "id": "live_international_comparison_v020_20260820", "version": "v0.20.0", "explicitLive": True,
        "completedAt": datetime.now(timezone.utc).isoformat(), "attemptedRequests": len(routes),
        "successfulRequests": len(success), "failedRequests": len(routes) - len(success), "fixtureCounted": False,
        "countries": COUNTRIES, "worldBankIndicators": WB_INDICATORS, "bisSeries": BIS_SERIES,
        "oecdSeries": OECD_SERIES, "imfSeries": IMF_SERIES,
        "notes": "DBnomics is an aggregator. BIS/OECD/IMF identities and definitions are retained separately. "
                 "WEO 2025-04 has no complete point-in-time vintage claim; periods after the release's actual boundary are UNKNOWN_STATUS, not actual. "
                 "Raw files are local and gitignored; no redistribution license is inferred.",
        "routes": routes,
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0 if len(success) == len(routes) else 1


if __name__ == "__main__":
    raise SystemExit(main())
