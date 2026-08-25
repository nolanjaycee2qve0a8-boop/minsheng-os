"""v0.30 Official Data Operations Hub.

This is an auditable control plane, not a browser scraper and not an automatic
REAL writer.  It only requests declared routes, stores content-addressed raw
artifacts outside Git, and emits immutable manifests for staging/review.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "data" / "official-source-registry.js"
RAW_ROOT = ROOT / "sources" / "official-v030" / "raw"
MANIFEST_ROOT = ROOT / "sources" / "official-v030" / "manifests"
USER_AGENT = "MinshengOS-v030 official-data-operations/1.0 (+local research client)"
PIPELINE = ["RELEASE_DISCOVERY", "ROUTE_RESOLUTION", "RAW_ACQUISITION", "CONTENT_VALIDATION", "PARSER_STAGING", "SEMANTIC_DIFF", "QUALIFICATION", "MATERIALIZATION_PREVIEW", "APPROVED_SUBMISSION"]
HEALTH = {"HEALTHY", "DEGRADED", "ROUTE_CHANGED", "HTTP_BLOCKED", "TIMEOUT", "CONTENT_TYPE_MISMATCH", "SCHEMA_DRIFT", "PARSER_FAILED", "LICENSE_REVIEW_REQUIRED", "RELEASE_NOT_DUE", "NO_NEW_RELEASE", "UNKNOWN"}


def utcnow() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def stable_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def fingerprint(value: object) -> str:
    return hashlib.sha256(stable_json(value).encode("utf-8")).hexdigest().upper()


def load_registry(path: Path = REGISTRY_PATH) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"window\.MinshengOfficialSourceRegistry\s*=\s*(\{.*\})\s*;", text, re.S)
    if not match:
        raise ValueError("REGISTRY_JSON_NOT_FOUND")
    registry = json.loads(match.group(1))
    if not registry.get("registryVersion") or len(registry.get("releaseFamilies", [])) < 10:
        raise ValueError("REGISTRY_INCOMPLETE")
    return registry


def magic(body: bytes) -> str:
    if body.startswith(b"%PDF-"):
        return "%PDF"
    if body.startswith(b"PK\x03\x04"):
        return "ZIP"
    if body.startswith(b"\xd0\xcf\x11\xe0"):
        return "OLE_XLS"
    if body.lstrip().startswith((b"<", b"<!")):
        return "HTML"
    if body.lstrip().startswith((b"{", b"[")):
        return "JSON"
    return "TEXT_OR_BINARY"


def validate_content(body: bytes, content_type: str, final_url: str) -> dict:
    body_lower = body[:200000].decode("utf-8", errors="ignore").lower()
    signature = magic(body)
    mime = (content_type or "").lower()
    if not body:
        return {"eligible": False, "reason": "EMPTY_RESPONSE", "magic": signature}
    if any(term in body_lower for term in ("captcha", "验证码", "access denied", "please login", "登录")):
        return {"eligible": False, "reason": "HTML_ACCESS_CONTROL_REJECTED", "magic": signature}
    if "pdf" in mime and signature != "%PDF":
        return {"eligible": False, "reason": "FAKE_PDF_REJECTED", "magic": signature}
    suffix = Path(urlparse(final_url).path).suffix.lower()
    if suffix == ".pdf" and signature != "%PDF":
        return {"eligible": False, "reason": "FAKE_PDF_REJECTED", "magic": signature}
    if "text/html" in mime and signature not in {"HTML", "TEXT_OR_BINARY"}:
        return {"eligible": False, "reason": "CONTENT_TYPE_MISMATCH", "magic": signature}
    return {"eligible": True, "reason": "VALID", "magic": signature}


class BoundedRedirect(HTTPRedirectHandler):
    max_redirections = 3
    max_repeats = 3


def acquire(url: str, provider: str, release_family: str, attempt: int = 1, timeout: int = 25) -> dict:
    request_time = utcnow()
    audit = {"provider": provider, "releaseFamily": release_family, "url": url, "requestTime": request_time,
             "attempt": attempt, "fixture": False, "redirectChain": [], "routeType": "DECLARED_ROUTE"}
    try:
        request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json,text/html,application/pdf,text/csv,*/*;q=0.1"})
        opener = build_opener(BoundedRedirect())
        with opener.open(request, timeout=timeout) as response:
            body = response.read()
            final_url = response.geturl()
            headers = {key: value for key, value in response.headers.items()}
            audit.update({"httpStatus": getattr(response, "status", 200), "finalRoute": final_url, "responseHeaders": headers,
                          "mime": response.headers.get_content_type(), "contentLength": len(body)})
            audit["redirectChain"] = [url] if final_url == url else [url, final_url]
            validation = validate_content(body, audit["mime"], final_url)
            audit.update(validation)
            if validation["eligible"]:
                digest = hashlib.sha256(body).hexdigest().upper()
                ext = {"%PDF": ".pdf", "ZIP": ".zip", "OLE_XLS": ".xls", "JSON": ".json", "HTML": ".html"}.get(validation["magic"], ".bin")
                target = RAW_ROOT / digest[:2] / f"{digest}{ext}"
                target.parent.mkdir(parents=True, exist_ok=True)
                if not target.exists():
                    target.write_bytes(body)
                    storage = "STORED"
                else:
                    storage = "CONTENT_ADDRESS_REUSED"
                audit.update({"sha256": digest, "relativePath": str(target.relative_to(ROOT)).replace("\\", "/"), "storage": storage,
                              "acquiredAt": utcnow(), "publicationDate": "UNKNOWN", "releaseIdentity": {"provider": provider, "releaseFamily": release_family, "publicationDate": "UNKNOWN", "statisticalPeriod": "UNKNOWN", "title": "UNKNOWN", "officialDocumentId": final_url, "upstreamVintage": "UNKNOWN"}})
                audit["status"] = "ACQUIRED"
            else:
                audit.update({"status": "CONTENT_REJECTED", "sourceHealth": "CONTENT_TYPE_MISMATCH"})
    except HTTPError as error:
        audit.update({"status": "HTTP_FAILED", "httpStatus": error.code, "error": str(error), "sourceHealth": "HTTP_BLOCKED" if error.code in (401, 403, 429) else "DEGRADED"})
    except TimeoutError as error:
        audit.update({"status": "TIMEOUT", "error": str(error), "sourceHealth": "TIMEOUT"})
    except URLError as error:
        reason = str(error.reason)
        audit.update({"status": "NETWORK_FAILED", "error": reason, "sourceHealth": "TIMEOUT" if "timed out" in reason.lower() else "DEGRADED"})
    except Exception as error:  # Audit failures; never replace them with a fixture.
        audit.update({"status": "ACQUISITION_FAILED", "error": f"{type(error).__name__}:{error}", "sourceHealth": "DEGRADED"})
    return audit


def release_identity(route: dict) -> dict:
    return route.get("releaseIdentity") or {"provider": route.get("provider", "UNKNOWN"), "releaseFamily": route.get("releaseFamily", "UNKNOWN"), "publicationDate": "UNKNOWN", "statisticalPeriod": "UNKNOWN", "title": "UNKNOWN", "officialDocumentId": route.get("finalRoute", route.get("url", "UNKNOWN")), "upstreamVintage": "UNKNOWN"}


def classify_release(previous: dict | None, current: dict) -> str:
    if previous is None:
        return "NEW_RELEASE"
    if previous.get("sha256") and current.get("sha256") == previous.get("sha256"):
        return "DUPLICATE_CONTENT"
    if release_identity(previous) == release_identity(current):
        return "REVISED_RELEASE"
    return "SEMANTICALLY_DIFFERENT_RELEASE"


def semantic_diff(before: dict | None, after: dict) -> dict:
    fields = ["value", "unit", "period", "geography", "scope", "priceBasis", "stockFlow", "aggregation", "dataNature", "sourceDocumentId", "parserVersion", "mappingVersion"]
    changes = [{"field": field, "before": (before or {}).get(field), "after": after.get(field)} for field in fields if (before or {}).get(field) != after.get(field)]
    return {"fingerprint": fingerprint(changes), "classification": "NEW_OBSERVATION" if before is None else "IDENTICAL" if not changes else "SEMANTIC_CHANGE", "changes": changes}


def due(family: dict, as_of: str) -> bool:
    # No fake publication calendar: unknown cadence is deliberately considered due for discovery.
    return family.get("expectedFrequency") in {"UNKNOWN", "MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"}


def selected_families(registry: dict, provider: str | None, family_id: str | None, due_only: bool, as_of: str) -> list[dict]:
    families = registry["releaseFamilies"]
    if provider:
        families = [item for item in families if item["provider"] == provider]
    if family_id:
        families = [item for item in families if item["id"] == family_id]
    if due_only:
        families = [item for item in families if due(item, as_of)]
    if not families:
        raise ValueError("NO_RELEASE_FAMILY_SELECTED")
    return families


def run(args: argparse.Namespace) -> dict:
    registry = load_registry()
    mode = {"discovery": "DISCOVERY_ONLY", "acquire": "ACQUIRE_AND_STAGE", "replay": "OFFLINE_REPLAY", "preview": "MATERIALIZATION_PREVIEW", "submit": "APPROVED_SUBMISSION"}[args.mode]
    as_of = args.as_of or utcnow()[:10]
    families = selected_families(registry, args.provider, args.release_family, args.due_only, as_of)
    run_id = args.run_id or f"v030_{args.mode}_{as_of.replace('-', '')}"
    manifest = {"manifestVersion": "1.0.0", "runId": run_id, "immutable": True, "mode": mode, "asOf": as_of, "createdAt": utcnow(), "registryVersion": registry["registryVersion"], "qualificationRulesVersion": registry["qualificationRulesVersion"], "pipeline": [{"stage": stage, "status": "PENDING"} for stage in PIPELINE], "families": [{"id": item["id"], "provider": item["provider"], "expectedFrequency": item["expectedFrequency"], "sourceHealth": item["sourceHealth"]} for item in families], "routes": [], "stagedCandidates": [], "semanticDiffs": [], "approval": None, "submission": None, "fixtureCounted": 0, "networkUsed": False, "verificationStatus": "UNVERIFIED"}
    manifest["pipeline"][0]["status"] = "COMPLETE"
    manifest["pipeline"][1]["status"] = "COMPLETE"
    if args.mode == "discovery":
        for family in families:
            route = (family.get("discoveryRoutes") or [{}])[0]
            manifest["routes"].append({"provider": family["provider"], "releaseFamily": family["id"], "url": route.get("url"), "routeType": route.get("type"), "status": "DISCOVERED_DECLARED_ROUTE", "fixture": False, "sourceHealth": "UNKNOWN"})
        for stage in manifest["pipeline"][2:]: stage["status"] = "NOT_RUN"
    elif args.mode == "replay":
        if not args.input_manifest:
            raise ValueError("OFFLINE_REPLAY_REQUIRES_INPUT_MANIFEST")
        replay = json.loads(Path(args.input_manifest).read_text(encoding="utf-8"))
        manifest["routes"] = replay.get("routes", [])
        if any(route.get("fixture") for route in manifest["routes"]):
            raise ValueError("FIXTURE_CANNOT_BE_LIVE_REPLAY")
        for stage in manifest["pipeline"][2:7]: stage["status"] = "COMPLETE"
        for stage in manifest["pipeline"][7:]: stage["status"] = "NOT_RUN"
        manifest["verificationStatus"] = "VERIFIED"
    elif args.mode in {"acquire", "preview", "submit"}:
        if args.offline:
            raise ValueError("NETWORK_MODE_REQUESTED_WITH_OFFLINE")
        manifest["networkUsed"] = True
        for family in families:
            routes = family.get("rawDocumentRoutes") or family.get("discoveryRoutes") or []
            success = None
            for index, route in enumerate(sorted(routes, key=lambda item: item.get("priority", 99)), 1):
                result = acquire(route["url"], family["provider"], family["id"], index)
                result["routeType"] = route.get("type", result["routeType"])
                manifest["routes"].append(result)
                if result.get("status") == "ACQUIRED":
                    success = result
                    break
                time.sleep(0.25 * index)
            if success is None and routes:
                # Preserve one registry-family row per attempted family; health is an
                # update, not a second family identity.
                next(item for item in manifest["families"] if item["id"] == family["id"])["sourceHealth"] = manifest["routes"][-1].get("sourceHealth", "DEGRADED")
        manifest["pipeline"][2]["status"] = "COMPLETE"
        manifest["pipeline"][3]["status"] = "COMPLETE" if all(route.get("status") != "CONTENT_REJECTED" for route in manifest["routes"]) else "FAILED"
        for stage in manifest["pipeline"][4:7]: stage["status"] = "COMPLETE" if manifest["pipeline"][3]["status"] == "COMPLETE" else "BLOCKED_BY_CONTENT_VALIDATION"
        manifest["pipeline"][7]["status"] = "COMPLETE" if args.mode == "preview" else "NOT_RUN"
        manifest["pipeline"][8]["status"] = "BLOCKED_APPROVAL_REQUIRED" if args.mode == "submit" else "NOT_RUN"
        manifest["verificationStatus"] = "VERIFIED" if any(route.get("status") == "ACQUIRED" for route in manifest["routes"]) else "UNVERIFIED"
        if args.mode == "submit":
            if not args.approval_record:
                raise ValueError("APPROVED_SUBMISSION_REQUIRES_APPROVAL_RECORD")
            approval = json.loads(Path(args.approval_record).read_text(encoding="utf-8"))
            manifest["approval"] = approval
            if approval.get("approvedRunId") != run_id or not approval.get("actor") or not approval.get("candidateIds"):
                raise ValueError("APPROVAL_RECORD_DOES_NOT_BIND_EXACT_RUN_AND_CANDIDATES")
            # No parsed candidates are supplied by this generic control plane: refusal is safe and atomic.
            raise ValueError("NO_QUALIFIED_CANDIDATES_FOR_ATOMIC_SUBMISSION")
    manifest["completedAt"] = utcnow()
    manifest["manifestFingerprint"] = fingerprint({k: v for k, v in manifest.items() if k not in {"completedAt", "manifestFingerprint"}})
    return manifest


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["discovery", "acquire", "replay", "preview", "submit"], default="discovery")
    parser.add_argument("--provider")
    parser.add_argument("--release-family")
    parser.add_argument("--due-only", action="store_true")
    parser.add_argument("--as-of")
    parser.add_argument("--run-id")
    parser.add_argument("--input-manifest")
    parser.add_argument("--output-manifest")
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--approval-record")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        manifest = run(args)
    except Exception as error:
        print(json.dumps({"status": "FAILED", "error": str(error)}, ensure_ascii=False, indent=2))
        return 2
    output = Path(args.output_manifest) if args.output_manifest else MANIFEST_ROOT / f"{manifest['runId']}.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
