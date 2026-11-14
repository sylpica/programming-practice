"""Add a real temporary type without editing core UI or semantic infrastructure."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import shutil,subprocess,functools,json
root=Path('work/audit/extension');root.mkdir(parents=True,exist_ok=True)
for name in ['js','icons','scripts']:
 shutil.copytree(name,root/name,dirs_exist_ok=True)
for name in ['index.html','style.css','sw.js','precache.js','manifest.webmanifest','package.json']:shutil.copy(name,root/name)
folder=root/'js/types/auditdummy';folder.mkdir(exist_ok=True)
(folder/'index.js').write_text("import {definition as base} from '../javascript/index.js';\nexport const definition={...base,id:'auditdummy',name:'監査用ダミー',extensions:['.dummy']};\n")
registry=root/'js/types/registry.js';text=registry.read_text();text="import {definition as auditdummy} from './auditdummy/index.js';\n"+text.replace('export const definitions = [','export const definitions = [auditdummy,');registry.write_text(text)
subprocess.run(['node','scripts/precache.mjs'],cwd=root,check=True)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',4176),functools.partial(Handler,directory=str(root.resolve())));Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context();page=c.new_page();page.goto('http://127.0.0.1:4176');page.wait_for_function('!document.querySelector("#run").disabled');assert page.locator('#macroType option').count()==14
 page.locator('#macroType').select_option('auditdummy');page.wait_for_function('!document.querySelector("#run").disabled');assert page.locator('#file').get_attribute('accept')=='.dummy';page.locator('#editor').fill('console.log(2+3);');page.locator('#run').click();page.wait_for_function('!document.querySelector("#run").disabled');assert '5' in page.locator('#outputs').inner_text()
 page.wait_for_function('navigator.serviceWorker.controller!==null');c.set_offline(True);page.reload();page.wait_for_function('!document.querySelector("#run").disabled');assert page.locator('#macroType').input_value()=='auditdummy';assert '5' in page.locator('#outputs').inner_text();b.close()
server.shutdown();print(json.dumps({'temporary_types':14,'changed':['js/types/auditdummy/index.js','js/types/registry.js','precache.js'],'core_changes':0,'offline':'passed'}))
