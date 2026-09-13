"""Publish the existing website at stable directory URLs without changing its sources."""

import argparse
import html
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE_ROUTES = {
    "index.html": "/",
    "find-data.html": "/find-data/",
    "tools.html": "/tools/",
    "about.html": "/about/",
    "members.html": "/contributors/",
    "contribute.html": "/submit/",
    "dataset.html": "/dataset/",
    "imprint.html": "/imprint/",
}
ASSET_DIRECTORIES = ("css", "js", "data", "releases")


def rewrite_routes(text, routes):
    """Rewrite local URL literals, including inline scripts and JS templates.

    Require a URL boundary so external source URLs and ordinary text are untouched.
    Queries, fragments and template expressions after the filename stay intact.
    """
    names = "|".join(re.escape(name) for name in routes)
    host = r"https?://(?:www\.)?batterydatacommons\.org"
    legacy_host = rf"(?:{host}|https?://batterycommons\.github\.io)"
    prefix = rf"(?:(?:{legacy_host})?/BatteryDataCommons/|(?:{host})?/|\./)?"
    pattern = re.compile(rf"(?P<quote>[\"'`]){prefix}(?P<page>{names})(?=[?#\"'`])")
    return pattern.sub(lambda match: match["quote"] + routes[match["page"]], text)


def render_page(text, route, routes):
    text = rewrite_routes(text, routes)
    # A shared root base keeps relative CSS, images and fetch() URLs working
    # at every directory depth, including future versions of the website.
    text = re.sub(r"<base\b[^>]*>", "", text, flags=re.I)
    text, count = re.subn(r"<head\b[^>]*>", lambda m: m[0] + '\n    <base href="/">',
                         text, count=1, flags=re.I)
    if count != 1:
        raise ValueError(f"Missing head element for {route}")
    # Fragment-only links must remain on this page despite the root base.
    return re.sub(r"(\bhref\s*=\s*[\"'])#", lambda m: m[1] + route + "#", text, flags=re.I)


def redirect_page(route):
    target = html.escape(route, quote=True)
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex">
<title>Battery Data Commons</title>
<script>window.location.replace({json.dumps(route)} + window.location.search + window.location.hash);</script>
<noscript><meta http-equiv="refresh" content="0;url={target}"></noscript>
</head><body><a href="{target}">Continue to Battery Data Commons</a></body></html>
'''


def build_site(source=ROOT / "BatteryDataCommons", output=ROOT / "_site"):
    source, output = Path(source).resolve(), Path(output).resolve()
    pages = sorted(source.glob("*.html"))
    names = {p.name for p in pages}
    missing = set(PAGE_ROUTES) - names
    if missing:
        raise ValueError(f"Missing website pages: {sorted(missing)}")
    if output.exists():
        raise ValueError(f"Output directory must not already exist: {output}")
    routes = {p.name: PAGE_ROUTES.get(p.name, f"/{p.stem}/") for p in pages}
    output.mkdir(parents=True)
    for directory in ASSET_DIRECTORIES:
        asset_source = source / directory
        if not asset_source.is_dir():
            continue
        shutil.copytree(asset_source, output / directory)
        if directory == "js":
            for script in (output / directory).rglob("*.js"):
                script.write_text(rewrite_routes(script.read_text(encoding="utf-8-sig"), routes), encoding="utf-8")
        # Preserve previously published direct asset and registry download URLs.
        shutil.copytree(output / directory, output / "BatteryDataCommons" / directory)
    for page in pages:
        route = routes[page.name]
        destination = output / route.strip("/") / "index.html"
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(render_page(page.read_text(encoding="utf-8-sig"), route, routes), encoding="utf-8")
        redirect = redirect_page(route)
        legacy = output / "BatteryDataCommons" / page.name
        legacy.parent.mkdir(parents=True, exist_ok=True)
        legacy.write_text(redirect, encoding="utf-8")
        if page.name != "index.html":
            (output / page.name).write_text(redirect, encoding="utf-8")
    (output / ".nojekyll").write_text("", encoding="utf-8")
    shutil.copyfile(ROOT / "CNAME", output / "CNAME")
    print(f"Built {len(pages)} pages with clean URLs in {output}")
    return routes


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / "BatteryDataCommons")
    parser.add_argument("--output", type=Path, default=ROOT / "_site")
    args = parser.parse_args()
    build_site(args.source, args.output)
