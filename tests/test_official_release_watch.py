import importlib.util,json,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('watch',Path(__file__).parents[1]/'tools'/'run_v031_watch.py');watch=importlib.util.module_from_spec(spec);spec.loader.exec_module(watch)
class WatchTests(unittest.TestCase):
 def test_calendar_and_due(self):
  items=watch.registry();self.assertEqual(len(items),17);self.assertEqual(watch.assess(items[0],'2026-07-20T00:00:00Z')['status'],'NOT_DUE');self.assertEqual(watch.assess(items[0],'2026-08-22T00:00:00Z')['status'],'CALENDAR_UNKNOWN_MANUAL_WATCH')
 def test_deterministic_job_and_backoff(self):
  cal=watch.registry()[0];a=watch.assess(cal,'2026-08-22T00:00:00Z');self.assertEqual(watch.job(cal,a)['id'],watch.job(cal,a)['id']);self.assertEqual(watch.deterministic_backoff(cal['retryPolicy'],2),watch.deterministic_backoff(cal['retryPolicy'],2))
 def test_default_run_is_dry_and_blocks_real(self):
  with tempfile.TemporaryDirectory() as d:
   out=Path(d)/'watch.json';code=watch.main(['--watch','--due-only','--as-of','2026-08-22T00:00:00Z','--run-id','test_watch','--output-manifest',str(out)])
   self.assertEqual(code,0);m=json.loads(out.read_text());self.assertEqual(m['mode'],'WATCH_DRY_RUN');self.assertEqual(m['submittedReal'],0);self.assertEqual(m['approvalRecordsCreated'],0);self.assertEqual(len(m['calendarAssessments']),17);self.assertTrue(all(j['currentStatus']=='DRY_RUN_PLANNED' for j in m['jobs']))
 def test_lock_status_is_safe(self):
  self.assertIn(watch.lock_status('2026-08-22T00:00:00Z')['status'],{'UNLOCKED','STALE_LOCK','LOCKED'})
 def test_execute_offline_makes_no_request(self):
  with tempfile.TemporaryDirectory() as d:
   out=Path(d)/'offline.json';self.assertEqual(watch.main(['--watch','--due-only','--execute','--offline','--as-of','2026-08-22T00:00:00Z','--output-manifest',str(out)]),0);self.assertEqual(json.loads(out.read_text())['requests'],[])
if __name__=='__main__':unittest.main()
