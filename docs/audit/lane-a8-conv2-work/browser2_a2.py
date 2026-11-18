import time, json
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8941/index.html"
EXE = "/home/hatch/workspace/programming-practice-audit/tools/browsers/chromium-1255/chrome-linux/chrome"
WORK = "/home/hatch/workspace/programming-practice-audit/work/lane-a8-conv2/docs/audit/lane-a8-conv2-work"
FAKE = '{"Resources":{"Thing":{"Type":"AWS::FakeService::Thing"}}}'
S3ONLY = '{"Resources":{"Bucket":{"Type":"AWS::S3::Bucket"},"Queue":{"Type":"AWS::SQS::Queue"}}}'

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

def result_status(page):
    try:
        return page.locator("#resultStatus").inner_text(timeout=2000)
    except Exception:
        return ""

def state(page):
    return page.evaluate("""() => {
      const pn = document.getElementById('pathNumber');
      const b = document.getElementById('resultNotes');
      return {pathNumber: pn ? pn.textContent : null,
              noteDisplay: b ? getComputedStyle(b).display : null,
              noteText: b ? b.textContent : null};
    }""")

def try_run(page, label, attempts_max=10):
    attempts = []
    for i in range(attempts_max):
        page.click("#run")
        end = time.time() + 120
        st = ""
        while time.time() < end:
            st = result_status(page)
            if st and ("上限" not in st) and ("解析時間" not in st) and st.strip():
                break
            if st and "上限" in st:
                break
            time.sleep(0.5)
        attempts.append(st)
        if st and "上限" not in st:
            return {"label": label, "completed": True, "status": st, "attempts": attempts, "state": state(page)}
        time.sleep(5)
    return {"label": label, "completed": False, "status": attempts[-1] if attempts else "", "attempts": attempts, "state": state(page)}

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
        # control: in-ledger template run
        set_editor(page, S3ONLY)
        time.sleep(3)
        out["s3_run"] = try_run(page, "s3only")
        # target: out-of-ledger template run
        set_editor(page, FAKE)
        time.sleep(3)
        out["fake_run"] = try_run(page, "fake")
        page.screenshot(path=WORK + "/browser2-conv-cfn19-run.png")
        out["pageerrors"] = errors
        ctx.close()
        b.close()
    print(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
