import time, json, re
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8941/index.html"
EXE = "/home/hatch/workspace/programming-practice-audit/tools/browsers/chromium-1255/chrome-linux/chrome"
WORK = "/home/hatch/workspace/programming-practice-audit/work/lane-a8-conv2/docs/audit/lane-a8-conv2-work"
FAKE = '{"Resources":{"Thing":{"Type":"AWS::FakeService::Thing"}}}'
S3ONLY = '{"Resources":{"Bucket":{"Type":"AWS::S3::Bucket"},"Queue":{"Type":"AWS::SQS::Queue"}}}'
DONE = re.compile(r"\d+件のパス")

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

def set_editor(page, text):
    page.fill("#editor", text)
    page.dispatch_event("#editor", "input")

def status(page):
    try:
        return page.locator("#resultStatus").inner_text(timeout=2000)
    except Exception:
        return ""

def state(page):
    return page.evaluate("""() => {
      const pn = document.getElementById('pathNumber');
      const b = document.getElementById('resultNotes');
      const run = document.getElementById('run');
      return {pathNumber: pn ? pn.textContent : null,
              runDisabled: run ? run.disabled : null,
              noteDisplay: b ? getComputedStyle(b).display : null,
              noteText: b ? b.textContent : null,
              noteScriptCount: b ? b.querySelectorAll('script').length : null};
    }""")

def grind(page, label, max_attempts=150):
    log = []
    for i in range(max_attempts):
        page.click("#run")
        end = time.time() + 20
        st = ""
        while time.time() < end:
            st = status(page)
            if DONE.search(st or ""):
                break
            if st and "上限" in st:
                break
            time.sleep(0.4)
        log.append(st)
        if DONE.search(st or ""):
            time.sleep(1)
            return {"label": label, "completed": True, "attempts": i + 1, "status": st, "state": state(page), "logTail": log[-5:]}
        time.sleep(1.5)
    return {"label": label, "completed": False, "attempts": max_attempts, "status": log[-1] if log else "", "state": state(page), "logTail": log[-5:]}

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
        page.select_option("#macroType", "cloudformation")
        out["cfn_summary"] = wait_summary(page, "2,024")
        out["sw"] = page.evaluate("""async () => {
          const reg = await navigator.serviceWorker.getRegistration();
          return {active: !!(reg && reg.active), controller: !!navigator.serviceWorker.controller};
        }""")
        set_editor(page, FAKE)
        time.sleep(3)
        out["fake"] = grind(page, "fake")
        if out["fake"]["completed"]:
            page.screenshot(path=WORK + "/browser2-conv-cfn19-completed.png")
            set_editor(page, S3ONLY)
            time.sleep(3)
            out["s3"] = grind(page, "s3only", max_attempts=30)
        out["pageerrors"] = errors
        ctx.close()
        b.close()
    print(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
