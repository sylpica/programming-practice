import time, sys
from playwright.sync_api import sync_playwright
EXE = "/home/hatch/workspace/programming-practice-audit/tools/browsers/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=EXE, args=["--no-sandbox", "--ignore-certificate-errors"])
    pg = b.new_page()
    pg.goto("http://127.0.0.1:8941/index.html", timeout=60000)
    pg.wait_for_selector("#modeAdvanced", timeout=30000)
    print("before:", pg.evaluate("""() => { const e = document.getElementById('modeNote');
      return {text: e.textContent, disp: getComputedStyle(e).display, off: e.offsetParent !== null}; }"""))
    pg.click("#modeAdvanced")
    time.sleep(3)
    print("after adv:", pg.evaluate("""() => { const e = document.getElementById('modeNote');
      return {text: e.textContent, disp: getComputedStyle(e).display, off: e.offsetParent !== null}; }"""))
    b.close()
print("DBG3HS OK")
