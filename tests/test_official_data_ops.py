import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("ops", Path(__file__).parents[1] / "tools" / "run_official_data_ops.py")
ops = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(ops)


class OfficialDataOperationsTests(unittest.TestCase):
    def test_registry_has_required_coverage(self):
        registry = ops.load_registry(); families = registry["releaseFamilies"]
        self.assertGreaterEqual(len(families), 10)
        self.assertTrue({"NBS", "PBOC", "MOF", "WORLD_BANK", "IMF"}.issubset({x["provider"] for x in families}))
        self.assertTrue(all(x["parser"]["version"] and x["mappingVersion"] for x in families))

    def test_content_validation_rejects_access_and_fake_pdf(self):
        self.assertFalse(ops.validate_content(b"<html>captcha</html>", "text/html", "https://x/a")["eligible"])
        self.assertFalse(ops.validate_content(b"<html>not pdf</html>", "application/pdf", "https://x/a.pdf")["eligible"])
        self.assertTrue(ops.validate_content(b"%PDF-1.7 test", "application/pdf", "https://x/a.pdf")["eligible"])

    def test_identity_diff_and_replay_are_deterministic(self):
        before = {"provider":"NBS", "releaseFamily":"F", "sha256":"A", "value":1, "unit":"%"}
        after = {"provider":"NBS", "releaseFamily":"F", "sha256":"B", "value":2, "unit":"%"}
        self.assertEqual(ops.classify_release(before, after), "REVISED_RELEASE")
        diff = ops.semantic_diff(before, after); self.assertEqual(diff["classification"], "SEMANTIC_CHANGE")
        self.assertEqual(diff["fingerprint"], ops.semantic_diff(before, after)["fingerprint"])

    def test_offline_replay_never_requests_network(self):
        with tempfile.TemporaryDirectory() as folder:
            incoming = Path(folder) / "incoming.json"; output = Path(folder) / "output.json"
            incoming.write_text(json.dumps({"routes":[{"status":"ACQUIRED","fixture":False}]}), encoding="utf-8")
            code = ops.main(["--mode","replay","--input-manifest",str(incoming),"--output-manifest",str(output),"--run-id","test_replay"])
            self.assertEqual(code, 0); manifest = json.loads(output.read_text(encoding="utf-8"))
            self.assertFalse(manifest["networkUsed"]); self.assertEqual(manifest["verificationStatus"], "VERIFIED")

    def test_submit_requires_exact_approval_and_never_partially_writes(self):
        with tempfile.TemporaryDirectory() as folder:
            approval = Path(folder) / "approval.json"; approval.write_text(json.dumps({"approvedRunId":"x","actor":"reviewer","candidateIds":["c"]}), encoding="utf-8")
            self.assertEqual(ops.main(["--mode","submit","--run-id","x","--approval-record",str(approval),"--offline"]), 2)


if __name__ == "__main__": unittest.main()
