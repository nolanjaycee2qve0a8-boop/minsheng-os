"""Explicit v0.19 low-frequency LIVE acquisition for World Bank and DBnomics."""
from __future__ import annotations
import hashlib, json, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'sources'/'official-v019'/'raw'
MANIFEST=ROOT/'sources'/'official-v019'/'manifests'/'live-acquisition-v019.json'
COUNTRIES=['chn','usa','jpn','kor','deu']
INDICATORS={
 'NY.GDP.MKTP.CD':'nominal_gdp','NY.GDP.MKTP.KD.ZG':'real_gdp_growth','NY.GDP.PCAP.CD':'gdp_per_capita',
 'SP.POP.TOTL':'total_population','SP.URB.TOTL.IN.ZS':'urban_population_share','FP.CPI.TOTL.ZG':'cpi_inflation',
}
DB_SERIES=[*(('WB','WDI',f'A-NY.GDP.MKTP.CD-{country.upper()}') for country in COUNTRIES),('IMF','IFS','M.CN.PCPI_IX')]
UA={'User-Agent':'MinshengOS-v019 research client','Accept':'application/json'}

def fetch(url, name, request_id, provider, upstream, kind):
    route={'requestId':request_id,'provider':provider,'upstreamProvider':upstream,'endpoint':url,'kind':kind,'retryCount':0,'live':True}
    try:
        path=RAW/name
        if path.exists():
            body=path.read_bytes();route.update({'status':'CACHED_LOCAL_LIVE','cacheHit':True,'httpStatus':200,'contentType':'application/json'})
        else:
            with urlopen(Request(url,headers=UA),timeout=15) as response:
                body=response.read(); route.update({'httpStatus':response.status,'contentType':response.headers.get_content_type()})
            if route['httpStatus']!=200: raise RuntimeError(f"HTTP_{route['httpStatus']}")
            path.write_bytes(body);route['status']='FETCHED'
        route.update({'fileName':name,'relativePath':str(path.relative_to(ROOT)).replace('\\','/'),'responseSize':len(body),'sha256':hashlib.sha256(body).hexdigest().upper()})
        try: route['resultCount']=len(json.loads(body.decode('utf-8'))[1] or []) if provider=='WORLD_BANK_API' and kind=='observations' else None
        except Exception: route['resultCount']=None
    except Exception as exc: route.update({'status':'FETCH_FAILED','error':str(exc)})
    return route

def main():
    RAW.mkdir(parents=True,exist_ok=True);MANIFEST.parent.mkdir(parents=True,exist_ok=True);routes=[];n=0
    def take(url,name,provider,upstream,kind):
        nonlocal n;n+=1;routes.append(fetch(url,name,f'v019_{n:02d}',provider,upstream,kind));time.sleep(.35)
    wb_base='https://api.worldbank.org/v2/'
    take(wb_base+'country?format=json&per_page=400','world_bank_countries.json','WORLD_BANK_API','World Bank','country_metadata')
    take(wb_base+'source/2?format=json','world_bank_source_2.json','WORLD_BANK_API','World Bank','source_metadata')
    query=urlencode({'format':'json','per_page':2000,'date':'2018:2024','source':'2'})
    take(f'{wb_base}country/{";".join(COUNTRIES)}/indicator/{";".join(INDICATORS)}?{query}','world_bank_wdi_core_2018_2024.json','WORLD_BANK_API','World Bank','observations')
    for code in INDICATORS:
        take(f'{wb_base}indicator/{code}?format=json&source=2',f'world_bank_indicator_{code.replace(".","_")}.json','WORLD_BANK_API','World Bank','indicator_metadata')
    for provider,dataset,series in DB_SERIES:
        take(f'https://api.db.nomics.world/v22/series/{provider}/{dataset}/{series}?observations=1',f'dbnomics_{provider}_{dataset}_{series.replace(".","_").replace("-","_")}.json','DBNOMICS',provider,'observations')
    for provider in ('WB','IMF'):
        take(f'https://api.db.nomics.world/v22/providers/{provider}',f'dbnomics_provider_{provider}.json','DBNOMICS',provider,'provider_metadata')
    for provider,dataset in (('WB','WDI'),('IMF','IFS')):
        take(f'https://api.db.nomics.world/v22/series/{provider}/{dataset}?limit=1',f'dbnomics_dataset_{provider}_{dataset}.json','DBNOMICS',provider,'dataset_metadata')
    ok=[r for r in routes if r['status'] in ('FETCHED','CACHED_LOCAL_LIVE')]
    manifest={'id':'live_international_statistics_v019_20260820','version':'v0.19.0','explicitLive':True,'completedAt':datetime.now(timezone.utc).isoformat(),'attemptedRequests':len(routes),'successfulRequests':len(ok),'failedRequests':len(routes)-len(ok),'fixtureCounted':False,'countries':['CHN','USA','JPN','KOR','DEU'],'worldBankIndicators':INDICATORS,'dbnomicsSeries':[f'{p}/{d}/{s}' for p,d,s in DB_SERIES],'notes':'Raw responses are locally retained. DBnomics is an aggregator; WB provider copies are same-upstream different distribution paths. No request claims point-in-time vintage or redistribution rights.','routes':routes}
    MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(manifest,ensure_ascii=False,indent=2));return 0 if len(ok)==len(routes) else 1
if __name__=='__main__': raise SystemExit(main())
