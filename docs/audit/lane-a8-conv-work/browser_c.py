import time, json
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8941/index.html"
EXE = "/home/hatch/workspace/programming-practice-audit/tools/browsers/chromium-1255/chrome-linux/chrome"

def main():
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=EXE, args=["--no-sandbox", "--ignore-certificate-errors"])
        ctx = b.new_context()
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        blocked = []
        def handler(route):
            url = route.request.url
            if "/types/cpp/reference-advanced-part3.js" in url:
                blocked.append(url)
                route.abort()
            else:
                route.continue_()
        page.route("**/*", handler)
        page.goto(BASE, timeout=60000)
        page.wait_for_selector("#modeAdvanced", timeout=30000)
        page.click("#modeAdvanced")
        page.select_option("#macroType", "cpp")
        # modeNote に失敗注記が付くまで待つ
        end = time.time() + 120
        note = ""
        while time.time() < end:
            try:
                note = page.locator("#modeNote").inner_text(timeout=2000)
            except Exception:
                note = ""
            if "読み込めませんでした" in note:
                break
            time.sleep(1)
        out["modeNote"] = note
        time.sleep(3)
        try:
            out["summary_blocked"] = page.locator("#refStatusSummary").inner_text(timeout=5000)
        except Exception as e:
            out["summary_blocked"] = f"<error {e}>"
        out["lists_blocked"] = page.evaluate("""() => {
          const cnt = id => { const el = document.getElementById(id); return el ? el.children.length : null; };
          return {full: cnt('fullReferences'), ref: cnt('refList')};
        }""")
        out["blocked_urls"] = blocked
        page.screenshot(path="/home/hatch/workspace/programming-practice-audit/work/lane-a8-conv/docs/audit/lane-a8-conv-work/browser-conv-e02-blocked.png")
        out["pageerrors"] = errors
        ctx.close()
        b.close()
    print(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
