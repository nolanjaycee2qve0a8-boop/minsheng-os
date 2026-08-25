"""Build a metadata-only local-source inventory for official Wave 1/2.

The manifest deliberately stores workspace-relative references, hashes and
provenance state. It never copies or changes the raw artifact itself.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "sources" / "official-v014" / "manifests" / "local-source-inventory.json"
EXTENSIONS = {".pdf", ".html", ".htm", ".xls", ".xlsx", ".csv", ".xml"}
SKIP = {".git", ".tools", "tests"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def classification(relative: str) -> tuple[str, str, str]:
    lower = relative.lower()
    if relative == "2026年上半年金融统计数据报告.html":
        return "PBOC", "OFFICIAL_ORIGINAL_CONFIRMED", "PBOC financial statistics / household loan flow"
    if relative.startswith("sources/nbs/raw/"):
        return "NBS", "OFFICIAL_ORIGINAL_CONFIRMED", "NBS release archive snapshot"
    if relative.startswith("sources/official-v014/raw/nbs_"):
        return "NBS", "OFFICIAL_ORIGINAL_CONFIRMED", "v0.14 live household-income snapshot"
    if relative.startswith("sources/official-v014/raw/pboc_"):
        return "PBOC", "OFFICIAL_ORIGINAL_CONFIRMED", "v0.14 live financial-statistics snapshot"
    if relative.startswith("sources/official-v015/raw/pboc_"):
        return "PBOC", "OFFICIAL_ORIGINAL_CONFIRMED", "v0.15 live property-credit snapshot"
    if relative.startswith("sources/official-v015/raw/mof_"):
        return "MOF", "OFFICIAL_ORIGINAL_CONFIRMED", "v0.15 live fiscal or legal-debt snapshot"
    if relative.startswith("sources/manul/nbs/"):
        return "NBS", "USER_SUPPLIED_OFFICIAL_EXPORT_UNVERIFIED", "NBS manual export; portal URL is not embedded"
    if relative.startswith("sources/manul/pboc/"):
        return "PBOC", "USER_SUPPLIED_OFFICIAL_FILE_UNVERIFIED", "PBOC manual workbook; source URL is not embedded"
    if "pboc" in lower or "金融统计" in relative:
        return "PBOC", "USER_SUPPLIED_OFFICIAL_CLAIM", "PBOC report or mirror requires document-level review"
    if "worldbank" in lower:
        return "WORLD_BANK", "USER_SUPPLIED_EXTERNAL_SOURCE", "External research document"
    if "imf" in lower:
        return "IMF", "USER_SUPPLIED_EXTERNAL_SOURCE", "External research document"
    return "UNKNOWN", "UNAUTHENTICATED", "No reliable institution marker in local path"


def known_processing(relative: str) -> tuple[bool, bool, str | None]:
    if relative == "2026年上半年金融统计数据报告.html":
        return True, True, "doc_pboc_2026_07_financial_stats"
    if relative.startswith("sources/manul/nbs/"):
        return True, True, "manual_nbs_export_registry"
    if relative.startswith("sources/nbs/raw/"):
        return True, False, "nbs_release_archive_manifest"
    if relative.startswith("sources/manul/pboc/"):
        return True, True, "pboc_m2_history_registry"
    return False, False, None


def main() -> None:
    artifacts = []
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in EXTENSIONS:
            continue
        relative = path.relative_to(ROOT).as_posix()
        if relative == "index.html" or any(part in SKIP for part in path.relative_to(ROOT).parts):
            continue
        institution, provenance_status, likely_indicator = classification(relative)
        parsed, mapped_real, locator = known_processing(relative)
        artifacts.append(
            {
                "relativePath": relative,
                "fileName": path.name,
                "fileType": path.suffix.lower().lstrip("."),
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
                "institution": institution,
                "provenanceStatus": provenance_status,
                "likelyIndicator": likely_indicator,
                "evidenceLocator": locator,
                "parsed": parsed,
                "mappedToRealRecord": mapped_real,
                "manualEditRisk": provenance_status not in {"OFFICIAL_ORIGINAL_CONFIRMED"},
            }
        )
    by_hash: dict[str, list[str]] = {}
    for item in artifacts:
        by_hash.setdefault(item["sha256"], []).append(item["relativePath"])
    for item in artifacts:
        item["duplicateOf"] = [path for path in by_hash[item["sha256"]] if path != item["relativePath"]]
    counts = {
        "artifactCount": len(artifacts),
        "authenticated": sum(item["provenanceStatus"] == "OFFICIAL_ORIGINAL_CONFIRMED" for item in artifacts),
        "unverifiedOrUnknown": sum(item["provenanceStatus"] != "OFFICIAL_ORIGINAL_CONFIRMED" for item in artifacts),
        "duplicates": sum(bool(item["duplicateOf"]) for item in artifacts),
        "parsed": sum(item["parsed"] for item in artifacts),
        "notParsed": sum(not item["parsed"] for item in artifacts),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "schemaVersion": "v0.15.0",
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "rootReference": ".",
                "metadataOnly": True,
                "counts": counts,
                "artifacts": artifacts,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
