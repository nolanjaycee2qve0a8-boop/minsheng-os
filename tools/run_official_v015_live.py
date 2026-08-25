"""Explicit Wave 2 LIVE run. Never imported by browser code or tests."""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'sources'/'official-v015'/'raw'
OUT=ROOT/'sources'/'official-v015'/'manifests'/'live-acquisition-v015.json'
HEADERS={'User-Agent':'MinshengOS-Official-Research/0.15 (auditable manual run)'}
PBOC_INDEX='https://www.pbc.gov.cn/goutongjiaoliu/113456/113469/11040-2.html'
PBOC='https://www.pbc.gov.cn/goutongjiaoliu/113456/113469/2026072719364116939/index.html'
MOF_FISCAL_INDEX='https://www.mof.gov.cn/zhengwuxinxi/redianzhuanti/quanguocaizhengshouzhiqingkuang/'
MOF_DEBT_INDEX='https://zwgls.mof.gov.cn/tjsj/'
MOF_DEBT='https://zwgls.mof.gov.cn/tjsj/202607/t20260727_3994357.htm'

def fetch(url: str) -> tuple[int, bytes, str]:
    request=Request(url,headers=HEADERS)
    with urlopen(request,timeout=30) as response:
        return response.status,response.read(),response.headers.get_content_type()

def attempt(label: str, role: str, url: str, output: Path|None=None) -> dict:
    item={'label':label,'role':role,'url':url,'fetchedAt':datetime.now(timezone.utc).isoformat(),'fixture':False}
    try:
        status,body,mime=fetch(url)
        item.update(status='FETCHED',httpStatus=status,mimeType=mime,bytes=len(body),sha256=hashlib.sha256(body).hexdigest().upper())
        if output:
            output.parent.mkdir(parents=True,exist_ok=True);output.write_bytes(body);item['relativePath']=output.relative_to(ROOT).as_posix()
        return item
    except Exception as error:
        message=str(error);code=getattr(error,'code',None)
        item.update(status='FETCH_FAILED',httpStatus=code,failureReason=('HTTP_'+str(code) if code else 'NETWORK_OR_TLS_ERROR')+':'+message[:160])
        return item

def fiscal_detail(index: bytes) -> str|None:
    text=index.decode('utf-8','ignore')
    marker='2026年上半年财政收支情况'
    match=re.search(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>\s*'+re.escape(marker),text,re.I)
    return urljoin(MOF_FISCAL_INDEX,match.group(1)) if match else None

def main() -> None:
    attempts=[attempt('pboc_credit_index','OFFICIAL_INDEX',PBOC_INDEX),attempt('pboc_credit_original','ORIGINAL',PBOC,RAW/'pboc_credit_2026q2.html')]
    fiscal_index=attempt('mof_fiscal_index','OFFICIAL_INDEX',MOF_FISCAL_INDEX)
    attempts.append(fiscal_index)
    if fiscal_index['status']=='FETCHED':
        detail=fiscal_detail((ROOT/fiscal_index.get('relativePath','missing')).read_bytes()) if fiscal_index.get('relativePath') else None
        # The index is not retained as raw evidence; fetch it once more only in memory for route discovery.
        try:
            _,body,_=fetch(MOF_FISCAL_INDEX);detail=fiscal_detail(body)
        except Exception: detail=None
        attempts.append(attempt('mof_fiscal_original','ORIGINAL',detail,RAW/'mof_fiscal_2026h1.html') if detail else {'label':'mof_fiscal_original','role':'ORIGINAL','status':'FETCH_FAILED','failureReason':'INDEX_TARGET_NOT_FOUND','fixture':False})
    else:attempts.append({'label':'mof_fiscal_original','role':'ORIGINAL','status':'FETCH_FAILED','failureReason':'INDEX_FETCH_FAILED','fixture':False})
    attempts.extend([attempt('mof_debt_index','OFFICIAL_INDEX',MOF_DEBT_INDEX),attempt('mof_debt_original','ORIGINAL',MOF_DEBT,RAW/'mof_local_debt_2026m06.html')])
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps({'version':'v0.15.0','explicitLive':True,'createdAt':datetime.now(timezone.utc).isoformat(),'attempts':attempts},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'attempts':attempts},ensure_ascii=False))

if __name__=='__main__':main()
