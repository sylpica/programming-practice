import time, json
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8941/index.html"
EXE = "/home/hatch/workspace/programming-practice-audit/tools/browsers/chromium-1255/chrome-linux/chrome"

def wait_summary(page, needle, timeout=120):
    end = time.time() + timeout
    last = ""
    while time.time() < end:
        try:
            last = page.locator("#refStatusSummary").inner_text(timeout=2000)
        except Exception:
            last = ""
        if needle in last:
            return last
        time.sleep(1)
    return last

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=EXE, args=["--no-sandbox", "--ignore-certificate-errors"])
    ctx = b.new_context()
    page = ctx.new_page()
    page.goto(BASE, timeout=60000)
    page.wait_for_selector("#modeAdvanced", timeout=30000)
    page.click("#modeAdvanced")
    page.select_option("#macroType", "cpp")
    s = wait_summary(page, "4,948", timeout=180)
    time.sleep(5)
    dump = page.evaluate("""async () => {
      const keys = await caches.keys();
      const res = {};
      for (const k of keys) {
        const c = await caches.open(k);
        const reqs = await c.keys();
        res[k] = reqs.map(r => r.url.replace(location.origin, ''));
      }
      return res;
    }""")
    print("summary:", s)
    for k, v in dump.items():
        adv = [u for u in v if "advanced" in u]
        print(f"cache {k}: total {len(v)} urls, advanced {len(adv)}")
        for u in adv:
            print("   ", u)
    b.close()
