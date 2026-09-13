import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build_site import PAGE_ROUTES, build_site, redirect_page, render_page, rewrite_routes


class SiteTests(unittest.TestCase):
    def test_links_templates_queries_and_external_sources(self):
        source = '''<a href="find-data.html?category=safety#results">Find</a>
        <a href="https://example.org/find-data.html">External source</a>
        <a href="/BatteryDataCommons/members.html">People</a>
        <a href="https://batterydatacommons.org/BatteryDataCommons/tools.html">Tools</a>
        <article onclick="window.location.href='dataset.html?id=${dataset.id}'"></article>'''
        result = rewrite_routes(source, PAGE_ROUTES)
        self.assertIn('href="/find-data/?category=safety#results"', result)
        self.assertIn('href="https://example.org/find-data.html"', result)
        self.assertIn('href="/contributors/"', result)
        self.assertIn('href="/tools/"', result)
        self.assertIn("window.location.href='/dataset/?id=${dataset.id}'", result)

    def test_nested_pages_resolve_assets_at_root_and_keep_anchors(self):
        source = '<html><head><base href="/old/"><link href="css/base.css"></head><body><a href="#citation">Cite</a></body></html>'
        result = render_page(source, "/about/", PAGE_ROUTES)
        self.assertEqual(result.count('<base '), 1)
        self.assertIn('<base href="/">', result)
        self.assertIn('href="/about/#citation"', result)
        self.assertIn('href="css/base.css"', result)

    def test_legacy_redirect_keeps_query_and_fragment(self):
        result = redirect_page("/find-data/")
        self.assertIn('"/find-data/" + window.location.search + window.location.hash', result)
        self.assertIn('<noscript>', result)

    def test_build_works_with_a_replaced_source_and_preserves_downloads(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "source"
            source.mkdir()
            for generation in ("old website", "new website"):
                for name in PAGE_ROUTES:
                    (source / name).write_text(f'<html><head></head><body>{generation}<a href="find-data.html">Data</a></body></html>')
                (source / "js").mkdir(exist_ok=True)
                (source / "js" / "ui.js").write_text("const link = `dataset.html?id=${id}`;")
                (source / "releases").mkdir(exist_ok=True)
                (source / "releases" / "registry.xlsx").write_bytes(b"unchanged workbook bytes")
                output = root / generation
                build_site(source, output)
                for name, route in PAGE_ROUTES.items():
                    page = output / route.strip("/") / "index.html"
                    self.assertIn(generation, page.read_text())
                    self.assertIn('href="/find-data/"', page.read_text())
                    self.assertTrue((output / "BatteryDataCommons" / name).exists())
                self.assertIn('`/dataset/?id=${id}`', (output / "js/ui.js").read_text())
                self.assertEqual((output / "releases/registry.xlsx").read_bytes(), b"unchanged workbook bytes")
                self.assertEqual((output / "BatteryDataCommons/releases/registry.xlsx").read_bytes(), b"unchanged workbook bytes")


if __name__ == "__main__":
    unittest.main()
