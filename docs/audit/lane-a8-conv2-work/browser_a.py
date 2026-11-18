import sys, time, json
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8941/index.html"
EXE = "/home/hatch/workspace/programming-practice-audit/tools/browsers/chromium-1255/chrome-linux/chrome"
FAKE = '{"Resources":{"Thing":{"Type":"AWS::FakeService::Thing"}}}'
S3ONLY = '{"Resources":{"Bucket":{"Type":"AWS::S3::Bucket"},"Queue":{"Type":"AWS::SQS::Queue"}}}'

def wait_summary(page, needle, timeout=120):
    """練習画面サイドパネルの #refStatusSummary に needle が現れるまで待つ。"""
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

def notes_state(page):
    return page.evaluate("""() => {
      const b = document.getElementById('resultNotes');
      if (!b) return {exists:false};
      const r = b.getBoundingClientRect();
      return {exists:true, hidden:b.hidden, display:getComputedStyle(b).display,
              w:r.width, h:r.height, text:b.textContent, scriptCount:b.querySelectorAll('script').length};
    }""")

def set_editor(page, text):
    page.fill("#editor", text)
    page.dispatch_event("#editor", "input")

def result_status(page):
    try:
        return page.locator("#resultStatus").inner_text(timeout=2000)
    except Exception:
        return ""

def run_until_complete(page, max_attempts=6):
    attempts = []
    for i in range(max_attempts):
        page.click("#run")
        end = time.time() + 60
        st = ""
        while time.time() < end:
            st = result_status(page)
            if st and ("上限" in st or "パス" in st or "成功" in st or "エラー" in st or "停止" in st):
                break
            time.sleep(0.5)
        attempts.append(st)
        if "上限" not in st and st:
            return st, attempts
        time.sleep(2)
    return attempts[-1] if attempts else "", attempts

def side_search(page, query):
    page.fill("#referenceSearch", query)
    page.dispatch_event("#referenceSearch", "input")
    time.sleep(2.5)
    return page.evaluate("""() => {
      const list = document.getElementById('refList');
      if (!list) return null;
      return [...list.children].map(c => (c.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 100));
    }""")

def full_search(page, query):
    page.click('button[data-view="reference"]')
    time.sleep(1)
    page.fill("#fullSearch", query)
    page.dispatch_event("#fullSearch", "input")
    time.sleep(2.5)
    res = page.evaluate("""() => {
      const list = document.getElementById('fullReferences');
      if (!list) return null;
      return [...list.children].map(c => (c.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 100));
    }""")
    page.click('button[data-view="practice"]')
    time.sleep(1)
    return res

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

        # ---- D-01 同定 (CFN): "AWS::S3::Bucket"
        out["d01_cfn_side"] = side_search(page, "AWS::S3::Bucket")
        out["d01_cfn_full"] = full_search(page, "AWS::S3::Bucket")

        # ---- D-01 同定 (C++): "std::sort"
        page.select_option("#macroType", "cpp")
        out["cpp_summary"] = wait_summary(page, "4,948")
        out["d01_cpp_side"] = side_search(page, "std::sort")
        out["d01_cpp_full"] = full_search(page, "std::sort")

        # ---- CFN-19
        page.select_option("#macroType", "cloudformation")
        wait_summary(page, "2,024")
        set_editor(page, FAKE)
        time.sleep(3)
        out["cfn19_after_edit"] = notes_state(page)
        st, attempts = run_until_complete(page)
        out["cfn19_run_status"] = st
        out["cfn19_run_attempts"] = attempts
        out["cfn19_after_run"] = notes_state(page)
        page.screenshot(path="/home/hatch/workspace/programming-practice-audit/work/lane-a8-conv/docs/audit/lane-a8-conv-work/browser-conv-cfn19.png")

        # 対照1: 台帳内のみ
        set_editor(page, S3ONLY)
        time.sleep(3)
        out["control_inledger_after_edit"] = notes_state(page)
        # 対照2: 簡易モードで Fake
        page.click("#modeSimple")
        time.sleep(2)
        set_editor(page, FAKE)
        time.sleep(3)
        out["control_simple_fake"] = notes_state(page)
        out["pageerrors"] = errors
        ctx.close()
        b.close()
    print(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
