"""Explicit v0.17 LIVE NBS income-distribution acquisition; never called by UI or tests."""
from __future__ import annotations
import hashlib, json, re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'sources'/'official-v017'/'raw'
MANIFEST=ROOT/'sources'/'official-v017'/'manifests'/'live-acquisition-v017.json'
URL='https://www.stats.gov.cn/sj/zxfb/202601/t20260119_1962330.html'
MARKERS=['全国居民人均可支配收入43377元','全国居民人均可支配收入中位数36231元','低收入组人均可支配收入10150元','中间偏下收入组22702元','中间收入组35536元','中间偏上收入组55586元','高收入组103778元']
def main():
 RAW.mkdir(parents=True,exist_ok=True);MANIFEST.parent.mkdir(parents=True,exist_ok=True)
 route={'url':URL,'role':'ORIGINAL','expectedMimeType':'text/html'}
 try:
  with urlopen(Request(URL,headers={'User-Agent':'Mozilla/5.0','Accept':'text/html'}),timeout=30) as response:
   data=response.read();mime=response.headers.get_content_type();status=response.status
  if status!=200: raise RuntimeError(f'HTTP_{status}')
  if mime!='text/html': raise RuntimeError(f'MIME_MISMATCH:{mime}')
  text=next((re.sub(r'\s+','',re.sub(r'<[^>]*>','',data.decode(encoding,errors='ignore'))) for encoding in ('utf-8','gb18030','gbk') if all(marker in re.sub(r'\s+','',re.sub(r'<[^>]*>','',data.decode(encoding,errors='ignore'))) for marker in MARKERS)),'')
  if any(marker not in text for marker in MARKERS): raise RuntimeError('REQUIRED_CONTEXT_NOT_FOUND')
  name='nbs_2025_household_income_distribution.html';(RAW/name).write_bytes(data)
  route.update({'status':'FETCHED','mimeType':mime,'fileName':name,'fileSize':len(data),'sha256':hashlib.sha256(data).hexdigest().upper(),'contentConsistencyVerified':True})
 except Exception as exc: route.update({'status':'FETCH_FAILED','failureReason':str(exc)})
 manifest={'id':'live_official_income_distribution_v017_20260820','version':'v0.17.0','explicitLive':True,'completedAt':datetime.now(timezone.utc).isoformat(),'attemptedReleases':1,'attemptedRoutes':1,'originalSuccesses':int(route['status']=='FETCHED'),'fixtureCounted':False,'parsedCandidates':7 if route['status']=='FETCHED' else 0,'mappedCandidates':7 if route['status']=='FETCHED' else 0,'notes':'All accepted values are annual national per-capita income observations; quintile values are GROUP_MEAN, not group boundaries or household income.','routes':[route]}
 MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(manifest,ensure_ascii=False,indent=2));return 0 if route['status']=='FETCHED' else 1
if __name__=='__main__': raise SystemExit(main())
