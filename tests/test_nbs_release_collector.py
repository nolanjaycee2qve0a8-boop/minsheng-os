import hashlib
import json
import importlib.util
import tempfile
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('collector', ROOT / 'tools' / 'nbs_release_collector.py')
collector = importlib.util.module_from_spec(SPEC); sys.modules[SPEC.name] = collector; SPEC.loader.exec_module(collector)


class CollectorTests(unittest.TestCase):
    def response(self, body, status=200, content_type='text/html; charset=utf-8'):
        return collector.FetchResponse(body.encode('utf-8'), status, {'Content-Type': content_type, 'ETag': 'fixture'})

    def test_discovery_pagination_dedup_and_domain_filter(self):
        pages = {
            'https://www.stats.gov.cn/sj/zxfb/': self.response('<a href="a.html">2022年10月15日 规模以上工业增加值</a><a href="a.html#repeat">规模以上工业增加值</a><a href="https://example.com/x">社会消费品零售总额</a><a href="page2.html">下一页</a>'),
            'https://www.stats.gov.cn/sj/zxfb/page2.html': self.response('<a href="b.html">2022年10月15日 社会消费品零售总额</a>'),
        }
        result = collector.collect_archive_pages('https://www.stats.gov.cn/sj/zxfb/', 2, 2018, 2026, fetcher=pages.__getitem__, delay=0)
        self.assertEqual(len(result['archive_pages']), 2)
        self.assertEqual(len(result['releases']), 2)
        self.assertEqual({x['category'] for x in result['releases']}, {'industrial', 'retail_sales'})

    def test_download_checksum_version_and_reject(self):
        entry = {'id': 'one', 'url': 'https://www.stats.gov.cn/a.html', 'category': 'industrial', 'publication_date': '2022-10-15', 'title': '工业'}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first = collector.download_release(entry, root, fetcher=lambda _: self.response('<html>one</html>'))
            second = collector.download_release(entry, root, fetcher=lambda _: self.response('<html>two</html>'))
            self.assertEqual(first['sha256'], hashlib.sha256(b'<html>one</html>').hexdigest())
            self.assertEqual(second['version'], 2)
            self.assertTrue(Path(second['local_path']).exists())
        self.assertEqual(collector.download_release({**entry, 'url': 'https://example.com/x'}, Path('.'))['status'], 'DOMAIN_REJECTED')

    def test_release_metadata_date_drives_raw_path(self):
        entry = {'id': 'dated', 'url': 'https://www.stats.gov.cn/a.html', 'category': 'retail_sales', 'publication_date': None, 'title': '零售'}
        with tempfile.TemporaryDirectory() as directory:
            result = collector.download_release(entry, Path(directory), fetcher=lambda _: self.response('<meta name="PubDate" content="2022-11-15">正文'))
            self.assertEqual(result['publication_date'], '2022-11-15')
            self.assertIn('2022', result['local_path'])

    def test_resume_requires_an_existing_verified_file(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); raw = root / 'raw.html'; raw.write_text('x')
            manifest = root / 'manifest.json'; manifest.write_text('{"releases":[{"url":"https://www.stats.gov.cn/a","status":"DOWNLOADED","local_path":"' + str(raw).replace('\\', '\\\\') + '","sha256":"abc"}]}')
            resumed = collector.apply_resume([{'url':'https://www.stats.gov.cn/a','status':'DISCOVERED'}], manifest)
            self.assertEqual(resumed[0]['status'], 'DOWNLOADED')

    def test_repair_manifest_date_uses_only_existing_raw_html(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); raw = root / 'raw.html'; raw.write_text('<meta name="PubDate" content="2020/08/14 10:00">', encoding='utf-8')
            manifest = root / 'manifest.json'; manifest.write_text(json.dumps({'releases':[{'status':'DOWNLOADED','local_path':str(raw),'publication_date':None}]}), encoding='utf-8')
            repaired = collector.repair_manifest_metadata(manifest)
            self.assertEqual(repaired['releases'][0]['publication_date'], '2020-08-14')
            self.assertEqual(repaired['metadata_repair']['network_requests'], 0)

    def test_reject_non_official_archive(self):
        with self.assertRaises(ValueError):
            collector.collect_archive_pages('https://example.com/archive', 1, 2018, 2026, delay=0)

    def test_declared_gb18030_is_decoded_for_title_matching(self):
        html = '<meta charset="gb18030"><a href="r.html">2022年10月15日 社会消费品零售总额</a>'.encode('gb18030')
        found = collector.discover_archive_links(html, 'https://www.stats.gov.cn/sj/zxfb/')
        self.assertEqual(found[0]['category'], 'retail_sales')
        self.assertEqual(found[0]['publication_date'], '2022-10-15')

    def test_macro_property_review_and_possible_duplicate_rules(self):
        html = ('<a href="macro.html">2023年3月15日 1—2月份国民经济运行情况</a>'
                '<a href="property.html">2023年3月15日 全国房地产市场基本情况</a>'
                '<a href="retail.html">2023年3月15日 消费市场运行情况</a>'
                '<a href="same-a.html">2023年3月15日 规模以上工业增加值</a>'
                '<a href="same-b.html">2023年3月15日 规模以上工业增加值</a>')
        found = collector.discover_archive_links(html.encode(), 'https://www.stats.gov.cn/sj/zxfb/')
        self.assertEqual([item['category'] for item in found[:3]], ['macro_monthly_release', 'property', 'retail_sales'])
        self.assertTrue(found[2]['review_category'])
        pages = {'https://www.stats.gov.cn/sj/zxfb/': self.response(html)}
        result = collector.collect_archive_pages('https://www.stats.gov.cn/sj/zxfb/', 1, 2018, 2026, fetcher=pages.__getitem__, delay=0)
        duplicates = [item for item in result['releases'] if item['title'].endswith('规模以上工业增加值')]
        self.assertEqual(len(duplicates), 2)
        self.assertTrue(all(item['possible_duplicate_release'] for item in duplicates))


if __name__ == '__main__':
    unittest.main()
