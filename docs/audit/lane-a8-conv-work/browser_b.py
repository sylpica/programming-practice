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

def main():
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=EXE, args=["--no-sandbox", "--ignore-certificate-errors"])
        ctx = b.new_context()
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(BASE, timeout=60000)
        page.wait_for_selector("#modeAdvanced", timeout=30000)
        page.click("#modeAdvanced")
        page.select_option("#macroType", "cpp")
        out["online_summary"] = wait_summary(page, "4,948", timeout=180)
        # ランタイムキャッシュに cpp 高度ファイルが入ったか
        out["caches_online"] = page.evaluate("""async () => {
          const keys = await caches.keys();
          const res = {};
          for (const k of keys) {
            const c = await caches.open(k);
            const reqs = await c.keys();
            res[k] = reqs.map(r => r.url.split('/').slice(-2).join('/')).filter(u => u.includes('cpp'));
          }
          return res;
        }""")
        # オフライン化して再訪
        ctx.set_offline(True)
        page.reload(timeout=60000)
        page.wait_for_selector("#modeAdvanced", timeout=30000)
        # モード・種類は復元される想定だが、念のため再選択
        try:
            pressed = page.get_attribute("#modeAdvanced", "aria-pressed")
            if pressed != "true":
                page.click("#modeAdvanced")
        except Exception:
            page.click("#modeAdvanced")
        page.select_option("#macroType", "cpp")
        out["offline_summary"] = wait_summary(page, "4,948", timeout=180)
        page.click('button[data-view="reference"]')
        time.sleep(3)
        out["offline_lists"] = page.evaluate("""() => {
          const cnt = id => { const el = document.getElementById(id); return el ? el.children.length : null; };
          return {full: cnt('fullReferences'), ref: cnt('refList')};
        }""")
        page.screenshot(path="/home/hatch/workspace/programming-practice-audit/work/lane-a8-conv/docs/audit/lane-a8-conv-work/browser-conv-e02-offline-cpp.png")
        out["pageerrors"] = errors
        ctx.close()
        b.close()
    print(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
