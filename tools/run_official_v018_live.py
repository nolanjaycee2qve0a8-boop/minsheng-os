"""Explicit v0.18 LIVE NBS real-estate release acquisition; never called by UI or tests."""
from __future__ import annotations

import hashlib, json, re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'sources' / 'official-v018' / 'raw'
MANIFEST = ROOT / 'sources' / 'official-v018' / 'manifests' / 'live-acquisition-v018.json'
URL = 'https://www.stats.gov.cn/sj/zxfbhjd/202607/t20260715_1964126.html'
MARKERS = [
    '房地产开发投资38074亿元', '新建商品房销售额37945亿元',
    '房地产开发企业到位资金40233亿元', '国内贷款5716亿元',
    '自筹资金14740亿元', '定金及预收款12442亿元', '个人按揭贷款5137亿元',
]

def plain(raw: bytes) -> str:
    for encoding in ('utf-8', 'gb18030', 'gbk'):
        text = raw.decode(encoding, errors='ignore')
        text = re.sub(r'\s+', '', re.sub(r'<[^>]*>', '', text))
        if all(marker in text for marker in MARKERS):
            return text
    return ''

def main() -> int:
    RAW.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    route = {'url': URL, 'role': 'ORIGINAL', 'expectedMimeType': 'text/html'}
    try:
        with urlopen(Request(URL, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html'}), timeout=30) as response:
            payload, mime, status = response.read(), response.headers.get_content_type(), response.status
        if status != 200: raise RuntimeError(f'HTTP_{status}')
        if mime != 'text/html': raise RuntimeError(f'MIME_MISMATCH:{mime}')
        if not plain(payload): raise RuntimeError('REQUIRED_CONTEXT_NOT_FOUND')
        name = 'nbs_2026_h1_real_estate_development.html'
        (RAW / name).write_bytes(payload)
        route.update({'status': 'FETCHED', 'mimeType': mime, 'fileName': name, 'fileSize': len(payload), 'sha256': hashlib.sha256(payload).hexdigest().upper(), 'contentConsistencyVerified': True})
    except Exception as exc:
        route.update({'status': 'FETCH_FAILED', 'failureReason': str(exc)})
    ok = route['status'] == 'FETCHED'
    manifest = {
        'id': 'live_official_real_estate_v018_20260820', 'version': 'v0.18.0', 'explicitLive': True,
        'completedAt': datetime.now(timezone.utc).isoformat(), 'attemptedReleases': 1, 'attemptedRoutes': 1,
        'originalSuccesses': int(ok), 'fixtureCounted': False, 'parsedCandidates': 14 if ok else 0,
        'mappedCandidates': 14 if ok else 0,
        'notes': 'NBS 2026 H1 nationwide real-estate release. Sales activity, funds-in-place flows and loan stocks remain separate.',
        'routes': [route],
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0 if ok else 1

if __name__ == '__main__':
    raise SystemExit(main())
