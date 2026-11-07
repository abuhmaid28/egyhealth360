"""Capture actual synthetic fixture evidence; no model/Skill evaluation is performed.

Requires an existing Python Playwright installation and Chromium. No repository
dependencies or configuration are changed. Run from the repository root.
"""
import hashlib
import json
import os
import platform
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path.cwd()
OUT = ROOT / "docs/skills-pilot/evidence/browser"
TARGET = ROOT / "docs/skills-pilot/fixtures/ui-candidate.html"
OUT.mkdir(parents=True, exist_ok=True)
records = []
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=str(TARGET.parent)))
Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"), args=["--no-sandbox"])
    for locale in ("en", "ar"):
        for width in (320, 390, 768, 1440):
            for scale in (100, 200):
                page = browser.new_page(viewport={"width": width, "height": 900}, locale=locale)
                page.goto(f"http://127.0.0.1:{server.server_port}/{TARGET.name}?lang={locale}")
                page.evaluate("scale => document.body.style.fontSize = (16 * scale / 100) + 'px'", scale)
                page.keyboard.press("Tab")
                page.keyboard.press("Tab")
                measurements = page.evaluate("""() => {
                    const wide = document.querySelector('#wide-row').getBoundingClientRect();
                    const clip = document.querySelector('#clipped');
                    const focus = document.querySelector('#details');
                    const cs = getComputedStyle(focus);
                    return {
                        direction: document.documentElement.dir,
                        documentWidth: document.documentElement.scrollWidth,
                        viewportWidth: innerWidth,
                        wideBounds: {left: wide.left, right: wide.right, width: wide.width},
                        outsideViewport: wide.left < 0 || wide.right > innerWidth,
                        clipped: clip.scrollWidth > clip.clientWidth || clip.scrollHeight > clip.clientHeight,
                        clippedWidth: {scroll: clip.scrollWidth, client: clip.clientWidth},
                        focusedId: document.activeElement.id,
                        focusOutline: cs.outlineStyle, focusShadow: cs.boxShadow,
                        inputLabelCount: document.querySelector('#unlabelled').labels.length,
                        inputAriaLabel: document.querySelector('#unlabelled').getAttribute('aria-label'),
                        disabled: document.querySelector('#fake-disabled').disabled,
                        ariaDisabled: document.querySelector('#fake-disabled').getAttribute('aria-disabled'),
                        feedbackRole: document.querySelector('#feedback').getAttribute('role'),
                        feedbackLive: document.querySelector('#feedback').getAttribute('aria-live')
                    };
                }""")
                name = f"{locale}-{width}-text-{scale}.png"
                page.screenshot(path=str(OUT / name), full_page=True)
                page.keyboard.press("Enter")
                measurements["feedbackAfterEnter"] = page.locator("#feedback").inner_text()
                assert measurements["focusedId"] == "details"
                assert measurements["clipped"] and measurements["focusOutline"] == "none"
                assert measurements["inputLabelCount"] == 0 and measurements["inputAriaLabel"] is None
                assert measurements["disabled"] is False and measurements["ariaDisabled"] is None
                assert measurements["feedbackRole"] is None and measurements["feedbackLive"] is None
                if width <= 390:
                    assert measurements["outsideViewport"]
                records.append({"locale": locale, "viewport": [width, 900], "text_percent": scale,
                                "screenshot": name, "sha256": hashlib.sha256((OUT / name).read_bytes()).hexdigest(),
                                "measurements": measurements})
                page.close()
    result = {"kind": "ACTUAL_LOCAL_CHROMIUM_FIXTURE_CHECK_NOT_SKILL_EXECUTION",
              "browser": browser.version, "python": platform.python_version(),
              "fixture_sha256": hashlib.sha256(TARGET.read_bytes()).hexdigest(),
              "text_method": "body font size 16px to 32px; not browser zoom or native-device evidence",
              "records": records}
    browser.close()
server.shutdown()
server.server_close()
(OUT / "measurements.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(f"Actual Chromium fixture checks: {len(records)} captures; planted defects observed. Not a Skill activation result.")
