"""Corruption/migration/quota and real Service Worker version-change preservation."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,functools
changed=False
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  if self.path.split('?')[0]=='/precache.js' and changed:
   data=Path('precache.js').read_text().replace('programming-practice-','programming-practice-audit-update-').encode()
   self.send_response(200);self.send_header('Content-Type','application/javascript');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data)
  else:super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',4175),functools.partial(Handler,directory=str(Path.cwd())));Thread(target=server.serve_forever,daemon=True).start()
URL='http://127.0.0.1:4175';count=0
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for key,raw,recovery in [
  ('programming-practice-v3','{bad','programming-practice-recovery-v3'),
  ('programming-practice-v3',json.dumps({'drafts':[]}),'programming-practice-recovery-v3'),
  ('macro-practice-v2',json.dumps({'drafts':'broken'}),'programming-practice-recovery-v2'),
  ('macro-practice-v2',json.dumps({'drafts':[1]}),'programming-practice-recovery-v2'),
  ('programming-practice-v3',json.dumps({'active':'uivision','drafts':{'uivision':{'code':'{"Commands":[null]}'}}}),None),
 ]:
  c=b.new_context();page=c.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  page.add_init_script('if(!sessionStorage.once){localStorage.setItem('+json.dumps(key)+','+json.dumps(raw)+');sessionStorage.once="1"}')
  page.goto(URL);page.wait_for_function('document.querySelectorAll("#macroType option").length===13');page.wait_for_function('!document.querySelector("#run").disabled')
  assert not errs,errs
  if recovery:assert page.evaluate('(k)=>localStorage.getItem(k)',recovery)==raw
  if key=='macro-practice-v2':assert page.evaluate('(k)=>localStorage.getItem(k)',key)==raw
  if recovery is None:
   assert page.locator('#editor').input_value()=='{"Commands":[null]}'
   page.reload();assert page.locator('#editor').input_value()=='{"Commands":[null]}'
  count+=1;c.close()
 # Valid legacy migration retains original data.
 for key,value in [('vba-practice-v1',{'code':'x = 123','model':{'A1':'legacy'}}),('macro-practice-v2',{'active':'r','drafts':{'r':{'code':'x <- 123'}}})]:
  c=b.new_context();page=c.new_page();page.add_init_script('if(!sessionStorage.once){localStorage.setItem('+json.dumps(key)+','+json.dumps(json.dumps(value))+');sessionStorage.once="1"}');page.goto(URL);page.wait_for_function('!document.querySelector("#run").disabled')
  assert '123' in page.locator('#editor').input_value();assert page.evaluate('(k)=>localStorage.getItem(k)',key)==json.dumps(value);count+=1;c.close()
 # Quota failure preserves existing raw storage and reports failure.
 c=b.new_context();page=c.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 original=json.dumps({'active':'javascript','drafts':{'javascript':{'code':'let x=123;'}}})
 page.add_init_script('localStorage.setItem("programming-practice-v3",'+json.dumps(original)+'); Storage.prototype.setItem=function(){throw new DOMException("quota","QuotaExceededError")}')
 page.goto(URL);page.wait_for_function('!document.querySelector("#run").disabled');page.locator('#editor').fill('let x=456;');assert page.locator('#storageNotice').is_visible();assert page.evaluate('localStorage.getItem("programming-practice-v3")')==original;assert not errs;count+=1;c.close()
 # Real service worker update, then offline reload: all distinct drafts survive.
 c=b.new_context();page=c.new_page();page.goto(URL);page.wait_for_function('!document.querySelector("#run").disabled')
 ids=page.locator('#macroType option').evaluate_all('(a)=>a.map(x=>x.value)');saved={}
 for kind in ids:
  page.locator('#macroType').select_option(kind);page.wait_for_function('!document.querySelector("#run").disabled');page.locator('#auto').uncheck();code='// draft '+kind;page.locator('#editor').fill(code);saved[kind]=code
 page.wait_for_function('navigator.serviceWorker.controller!==null');before=page.evaluate('localStorage.getItem("programming-practice-v3")');changed=True
 page.evaluate('async()=>{const r=await navigator.serviceWorker.getRegistration(); await r.update();}')
 page.wait_for_function('async()=> (await caches.keys()).some(k=>k.startsWith("programming-practice-audit-update-"))')
 page.wait_for_function('async()=> (await caches.keys()).every(k=>!k.startsWith("programming-practice-")||k.startsWith("programming-practice-audit-update-"))')
 assert page.evaluate('localStorage.getItem("programming-practice-v3")')==before
 c.set_offline(True);page.reload();page.wait_for_function('!document.querySelector("#run").disabled')
 for kind in ids:
  page.locator('#macroType').select_option(kind);page.wait_for_function('!document.querySelector("#run").disabled');assert page.locator('#editor').input_value()==saved[kind]
 count+=1;c.close();b.close()
server.shutdown()
print(json.dumps({'storage_cases':count,'drafts_after_real_SW_update':len(saved),'offline_reload':'passed'}))
