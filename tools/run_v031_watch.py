"""v0.31 safe official release watch. Default is deterministic dry-run.

This command never calls APPROVED_SUBMISSION and never writes application
observations.  An executed watch may only discover, acquire, validate, stage
and emit review metadata.
"""
from __future__ import annotations
import argparse, hashlib, json, os, random, re, sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CALENDAR=ROOT/'data'/'official-release-calendar.js'
STATE=ROOT/'sources'/'official-v031'/'state'
MANIFESTS=ROOT/'sources'/'official-v031'/'manifests'
LOCK=STATE/'watch.lock.json'
PIPELINE=['RELEASE_DISCOVERY','ROUTE_RESOLUTION','RAW_ACQUISITION','CONTENT_VALIDATION','PARSER_STAGING','SEMANTIC_DIFF','QUALIFICATION','MATERIALIZATION_PREVIEW']
TERMINAL={'COMPLETE','NO_NEW_RELEASE','FAILED','BLOCKED'}

def stable(value): return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def fp(value): return hashlib.sha256(stable(value).encode()).hexdigest().upper()
def parse_time(value):
    if value.endswith('Z'): value=value[:-1]+'+00:00'
    return datetime.fromisoformat(value).astimezone(timezone.utc)
def stamp(value): return parse_time(value).replace(microsecond=0).isoformat().replace('+00:00','Z')
def plus(value,hours=0,days=0): return (parse_time(value)+timedelta(hours=hours,days=days)).replace(microsecond=0).isoformat().replace('+00:00','Z')
def registry():
    text=CALENDAR.read_text(encoding='utf-8')
    # Calendar is derived from source registry in browser; build exact rules by loading v0.30 JSON-shaped registry.
    source=(ROOT/'data'/'official-source-registry.js').read_text(encoding='utf-8')
    match=re.search(r'window\.MinshengOfficialSourceRegistry\s*=\s*(\{.*\})\s*;',source,re.S)
    families=json.loads(match.group(1))['releaseFamilies']
    return [{"id":f"calendar_{f['id']}","provider":f['provider'],"releaseFamily":f['id'],"timezone":'UTC' if f['provider'] in {'WORLD_BANK','BIS','OECD','IMF','DBNOMICS'} else 'Asia/Shanghai',"frequency":f['expectedFrequency'],"officialCalendarUrl":f['discoveryRoutes'][0]['url'],"calendarEvidenceLocator":'NO_OFFICIAL_PUBLISHING_CALENDAR_LOCATED_IN_V030_AUDIT',"expectedPeriod":'UNKNOWN',"expectedPublicationDate":'UNKNOWN',"expectedPublicationWindow":None,"dateConfidence":'CALENDAR_UNKNOWN' if f['expectedFrequency']=='UNKNOWN' else 'HISTORICAL_CADENCE_ONLY',"lastKnownRelease":'UNKNOWN',"lastSuccessfulDiscovery":'2026-07-15T00:00:00Z',"minimumCheckIntervalHours":720,"watchWindowLeadDays":3,"overdueGraceDays":7,"retryPolicy":{"maxAttempts":3,"baseBackoffMinutes":60,"maxBackoffMinutes":1440,"jitterSeed":31,"dailyRequestCeiling":2,"pauseThreshold":3},"manualWatchRequirement":True,"rulesVersion":'v0.31.0',"disabled":False} for f in families]

def assess(cal,as_of,last_status='UNKNOWN',retry_after=None):
    next_check=plus(cal['lastSuccessfulDiscovery'],hours=cal['minimumCheckIntervalHours'])
    base={'releaseFamily':cal['releaseFamily'],'asOf':stamp(as_of),'calendarConfidence':cal['dateConfidence'],'nextEligibleCheck':next_check}
    if cal.get('disabled'): return base|{'status':'DISABLED','reason':'CALENDAR_DISABLED'}
    if retry_after and parse_time(as_of)<parse_time(retry_after): return base|{'status':'PAUSED_AFTER_FAILURE','reason':'RETRY_AFTER_NOT_REACHED','retryAfter':retry_after}
    if retry_after: return base|{'status':'DUE_FOR_RETRY','reason':'RETRY_AFTER_REACHED','retryAfter':retry_after}
    if last_status in {'RELEASE_DISCOVERED','RELEASE_ACQUIRED','STAGED_FOR_REVIEW','NO_NEW_RELEASE'}: return base|{'status':last_status,'reason':'IMMUTABLE_PRIOR_RESULT'}
    if cal['dateConfidence']=='CALENDAR_UNKNOWN' or cal['expectedPublicationDate']=='UNKNOWN':
        return base|({'status':'CALENDAR_UNKNOWN_MANUAL_WATCH','reason':'LOW_FREQUENCY_MANUAL_WATCH'} if parse_time(as_of)>=parse_time(next_check) else {'status':'NOT_DUE','reason':'MINIMUM_INTERVAL_NOT_REACHED'})
    start=plus(cal['expectedPublicationDate'],days=-cal['watchWindowLeadDays']); overdue=plus(cal['expectedPublicationDate'],days=cal['overdueGraceDays'])
    if parse_time(as_of)<parse_time(start): return base|{'status':'WATCH_WINDOW_NOT_OPEN','reason':'BEFORE_WINDOW'}
    if parse_time(as_of)<parse_time(cal['expectedPublicationDate']): return base|{'status':'WATCH_WINDOW_OPEN','reason':'INSIDE_WINDOW'}
    return base|({'status':'DUE_FOR_DISCOVERY','reason':'EXPECTED_DATE_REACHED'} if parse_time(as_of)<=parse_time(overdue) else {'status':'OVERDUE_NO_RELEASE_FOUND','reason':'GRACE_EXPIRED'})

def eligible(status): return status in {'WATCH_WINDOW_OPEN','DUE_FOR_DISCOVERY','DUE_FOR_RETRY','OVERDUE_NO_RELEASE_FOUND','CALENDAR_UNKNOWN_MANUAL_WATCH'}
def job(cal,assessment,attempt=1,parent=None):
    window=f"{cal['releaseFamily']}|{assessment['asOf'][:10] if cal['expectedPublicationDate']=='UNKNOWN' else cal['expectedPublicationDate']}"
    source={'releaseFamily':cal['releaseFamily'],'window':window,'asOf':assessment['asOf'],'policyVersion':'v0.31.0'}
    return {'id':'watch_'+fp(source)[:16].lower(),'releaseFamily':cal['releaseFamily'],'provider':cal['provider'],'dueReason':assessment['status'],'asOf':assessment['asOf'],'policyVersion':'v0.31.0','plannedStages':PIPELINE,'routeSet':cal['officialCalendarUrl'],'priority':1 if assessment['status']=='DUE_FOR_RETRY' else 2,'attempt':attempt,'parentJobId':parent,'earliestStart':assessment['asOf'],'currentStatus':'QUEUED','resultRunId':None,'errorClassification':None,'createdAt':assessment['asOf'],'completedAt':None,'inputFingerprint':fp(source)}

def read_lock(): return json.loads(LOCK.read_text(encoding='utf-8')) if LOCK.exists() else None
def lock_status(as_of):
    current=read_lock()
    if not current:return {'status':'UNLOCKED','lock':None}
    return {'status':'STALE_LOCK' if parse_time(as_of)>=parse_time(current['expiry']) else 'LOCKED','lock':current}
def acquire_lock(run_id,command,as_of,dry_run):
    state=lock_status(as_of)
    if state['status']=='LOCKED': raise RuntimeError('SINGLE_FLIGHT_BLOCKED')
    if state['status']=='STALE_LOCK' and state['lock'].get('unfinishedBatch'): raise RuntimeError('STALE_LOCK_REQUIRES_EXPLICIT_CLEAR')
    lock={'owner':'v0.31_watch','pid':os.getpid(),'startTime':stamp(as_of),'heartbeat':stamp(as_of),'expiry':plus(as_of,hours=2),'command':command,'runId':run_id,'unfinishedBatch':False}
    if not dry_run: STATE.mkdir(parents=True,exist_ok=True); LOCK.write_text(json.dumps(lock,ensure_ascii=False,indent=2),encoding='utf-8')
    return lock
def release_lock(run_id,dry_run):
    if not dry_run and LOCK.exists() and read_lock().get('runId')==run_id: LOCK.unlink()
def deterministic_backoff(policy,attempt,retry_after=None):
    if retry_after:return retry_after
    r=random.Random(policy.get('jitterSeed',0)+attempt); return min(policy['maxBackoffMinutes'],policy['baseBackoffMinutes']*2**max(0,attempt-1))+r.randint(0,6)

def run(args):
    as_of=stamp(args.as_of or '2026-08-22T00:00:00Z'); calendars=registry()
    if args.provider:calendars=[x for x in calendars if x['provider']==args.provider]
    if args.release_family:calendars=[x for x in calendars if x['releaseFamily']==args.release_family]
    if len(calendars)==0:raise RuntimeError('NO_RELEASE_FAMILY_SELECTED')
    assessments=[assess(x,as_of) for x in calendars]
    due=[(cal,a) for cal,a in zip(calendars,assessments) if eligible(a['status'])]
    if args.due_only: selected=due
    else:selected=[(cal,a) for cal,a in zip(calendars,assessments) if eligible(a['status'])]
    selected=selected[:args.max_jobs]
    run_id=args.run_id or f"v031_watch_{as_of[:10].replace('-','')}"; manifest={'manifestVersion':'1.0.0','runId':run_id,'immutable':True,'mode':'WATCH_DRY_RUN' if args.dry_run else 'WATCH_ACQUIRE_AND_STAGE','asOf':as_of,'calendarRulesVersion':'v0.31.0','createdAt':as_of,'resumeRun':args.resume_run,'calendarAssessments':assessments,'jobs':[],'reviewQueue':[],'requests':[],'fixtureCounted':0,'approvalRecordsCreated':0,'submittedReal':0,'gitCommitsCreatedByWatcher':0,'schedulerStatus':'SCHEDULER_PACKAGE_READY / SCHEDULER_NOT_INSTALLED'}
    if args.lock_status:return lock_status(as_of)
    if args.clear_stale_lock:
        state=lock_status(as_of)
        if not args.confirm_clear_stale_lock or state['status']!='STALE_LOCK' or state['lock'].get('unfinishedBatch'):raise RuntimeError('CLEAR_STALE_LOCK_REQUIRES_CONFIRMATION_AND_SAFE_LOCK')
        LOCK.unlink();return {'status':'STALE_LOCK_CLEARED'}
    lock=acquire_lock(run_id,'run_v031_watch.py',as_of,args.dry_run)
    try:
        for cal,assessment in selected:
            current=job(cal,assessment);manifest['jobs'].append(current)
            if args.dry_run:
                current['currentStatus']='DRY_RUN_PLANNED';continue
            if args.offline:
                current['currentStatus']='OFFLINE_REPLAY_REQUIRED_ARTIFACT';current['completedAt']=as_of
                manifest['reviewQueue'].append({'id':'review_'+current['id'],'provider':cal['provider'],'releaseFamily':cal['releaseFamily'],'releaseIdentity':'UNKNOWN','publicationDate':'UNKNOWN','statisticalPeriod':'UNKNOWN','route':cal['officialCalendarUrl'],'sha256':None,'semanticDiff':None,'candidates':[],'qualificationStatus':'NOT_RUN','blockedReasons':['OFFLINE_RAW_ARTIFACT_REQUIRED'],'revisionImpact':[],'requiredReviewerAction':'NO_ACTION_REQUIRED','status':'NO_ACTION_REQUIRED'});continue
            # Reuse v0.30 bounded, auditable acquisition; it never materializes REAL.
            from run_official_data_ops import acquire
            route=acquire(cal['officialCalendarUrl'],cal['provider'],cal['releaseFamily'])
            manifest['requests'].append(route)
            if route.get('status')=='ACQUIRED':current['currentStatus']='COMPLETE';current['resultRunId']=f"{run_id}_{current['id']}";classification='NO_NEW_RELEASE'
            else:current['currentStatus']='FAILED';current['errorClassification']=route.get('sourceHealth','DEGRADED');classification='REVIEW_REQUIRED_SCHEMA_DRIFT' if route.get('status')=='CONTENT_REJECTED' else 'NO_ACTION_REQUIRED'
            current['completedAt']=as_of;manifest['reviewQueue'].append({'id':'review_'+current['id'],'provider':cal['provider'],'releaseFamily':cal['releaseFamily'],'releaseIdentity':route.get('releaseIdentity','UNKNOWN'),'publicationDate':route.get('publicationDate','UNKNOWN'),'statisticalPeriod':'UNKNOWN','route':route.get('finalRoute',route.get('url')),'sha256':route.get('sha256'),'semanticDiff':None,'candidates':[],'qualificationStatus':'NOT_RUN','blockedReasons':[],'revisionImpact':[],'requiredReviewerAction':'NO_ACTION_REQUIRED' if classification=='NO_NEW_RELEASE' else 'REVIEW_REQUIRED','status':classification})
    finally: release_lock(run_id,args.dry_run)
    manifest['completedAt']=as_of;manifest['manifestFingerprint']=fp({k:v for k,v in manifest.items() if k not in {'manifestFingerprint'}})
    return manifest

def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--watch',action='store_true');p.add_argument('--due-only',action='store_true');p.add_argument('--as-of');p.add_argument('--provider');p.add_argument('--release-family');p.add_argument('--max-jobs',type=int,default=17);p.add_argument('--offline',action='store_true');p.add_argument('--dry-run',action='store_true',default=True);p.add_argument('--execute',action='store_true');p.add_argument('--resume-run');p.add_argument('--list-review-queue',action='store_true');p.add_argument('--export-review-queue');p.add_argument('--lock-status',action='store_true');p.add_argument('--clear-stale-lock',action='store_true');p.add_argument('--confirm-clear-stale-lock',action='store_true');p.add_argument('--run-id');p.add_argument('--output-manifest');args=p.parse_args(argv)
    if args.execute:args.dry_run=False
    try: result=run(args)
    except Exception as e: print(json.dumps({'status':'FAILED','error':str(e)},ensure_ascii=False,indent=2));return 2
    if args.list_review_queue:result=result.get('reviewQueue',[])
    if args.export_review_queue:Path(args.export_review_queue).write_text(json.dumps(result.get('reviewQueue',[]),ensure_ascii=False,indent=2),encoding='utf-8')
    if not args.lock_status and not args.clear_stale_lock:
        path=Path(args.output_manifest) if args.output_manifest else MANIFESTS/f"{args.run_id or 'v031_watch'}.json";path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2));return 0
if __name__=='__main__':raise SystemExit(main())
