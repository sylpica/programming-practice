"""Exercise both new types using the real common UI and offline assets."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json,functools
root=Path.cwd()
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',4180),functools.partial(Handler,directory=str(root)));Thread(target=server.serve_forever,daemon=True).start()
counts={'templates':0,'views':0,'files':0,'offline':0,'jumps':0,'mode_and_paths':0,'errors':0};errs=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,kind in [(w,k) for w in [375,1440] for k in ['cmd','powershell']]:
  c=b.new_context(viewport={'width':width,'height':900});page=c.new_page();page.on('pageerror',lambda e:errs.append(str(e)));page.on('dialog',lambda d:d.accept());page.goto('http://127.0.0.1:4180');page.wait_for_function('!document.querySelector("#run").disabled');page.locator('#macroType').select_option(kind)
  def done():page.wait_for_function('!document.querySelector("#run").disabled')
  done();page.locator('#auto').uncheck()
  for i in range(8):
   page.locator('[data-view="templates"]').click();buttons=page.locator('#templateCards button');assert buttons.count()==8;buttons.nth(i).click();done();page.locator('#run').click();done();assert page.locator('#trace li').count()>0;assert not page.locator('#trace .error').count(),page.locator('#trace').inner_text();counts['templates']+=1
  for view in ['practice','reference','templates','glossary']:
   page.locator('[data-view="'+view+'"]').click();assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(width,view);counts['views']+=1
  page.locator('[data-view="practice"]').click();page.locator('#editor').fill('echo first\necho second' if kind=='cmd' else 'Write-Output first\nWrite-Output second');page.locator('#run').click();done();page.locator('#trace button').last.click();assert page.locator('#editor').evaluate('(e)=>e.value.slice(0,e.selectionStart).split("\\n").length')==2;counts['jumps']+=1
  page.locator('#editor').fill('echo manual' if kind=='cmd' else 'Write-Output manual');assert '未実行' in page.locator('#resultStatus').inner_text()
  page.locator('#auto').check();page.locator('#editor').fill('echo automatic' if kind=='cmd' else 'Write-Output automatic');page.wait_for_function('document.querySelector("#outputs").textContent.includes("automatic")');page.locator('#auto').uncheck()
  branch='set /p X=\nif "%X%"=="yes" (\n echo yes\n) else (\n type notes.txt\n)' if kind=='cmd' else '$x=Read-Host "X"\nif($x -eq "yes"){Write-Host yes}else{Get-Content notes.txt}'
  page.locator('#editor').fill(branch);page.locator('#run').click();done();assert page.locator('#counter').inner_text()=='1 / 2'
  used=page.locator('#used').inner_text();page.locator('#last').click();assert page.locator('#counter').inner_text()=='2 / 2';assert page.locator('#used').inner_text()!=used
  for sel in ['#first','#next','#prev']:page.locator(sel).click()
  for sort in ['long','short','original']:page.locator('#sort').select_option(sort)
  page.locator('#pathNumber').fill('2');page.locator('#jump').click();assert page.locator('#counter').inner_text()=='2 / 2'
  page.locator('#used .chip').first.click();assert page.locator('#refDetail h3').count()==1;assert not page.locator('#templateExplanation').is_visible();counts['mode_and_paths']+=1
  page.locator('#editor').fill('unknown-command');page.locator('#run').click();done();assert page.locator('#trace .error').count();counts['errors']+=1
  for ext in (['.bat','.cmd'] if kind=='cmd' else ['.ps1']):
   code=('echo file' if kind=='cmd' else 'Write-Output file')+ext;page.locator('#file').set_input_files({'name':'example'+ext,'mimeType':'text/plain','buffer':code.encode()});page.wait_for_function('(code)=>document.querySelector("#editor").value===code',arg=code);counts['files']+=1
  code='echo dropped' if kind=='cmd' else 'Write-Output dropped';dt=page.evaluate_handle('''code=>{let d=new DataTransfer();d.items.add(new File([code],code.startsWith("echo")?"drop.cmd":"drop.ps1",{type:"text/plain"}));return d}''',code);page.locator('#dropzone').dispatch_event('drop',{'dataTransfer':dt});page.wait_for_function('(code)=>document.querySelector("#editor").value===code',arg=code);counts['files']+=1
  page.wait_for_function('navigator.serviceWorker.controller!==null');c.set_offline(True);page.reload();done();assert page.locator('#macroType').input_value()==kind;assert page.locator('#editor').input_value()==code;page.locator('#run').click();done();assert 'dropped' in page.locator('#outputs').inner_text();counts['offline']+=1;c.close()
 b.close()
server.shutdown();assert not errs,errs
Path('work/shell-browser-results.json').write_text(json.dumps({'counts':counts,'pageerrors':errs},indent=2));print(json.dumps({'counts':counts,'pageerrors':errs}))
