"""Template switching must work with native dialogs disabled and retain free drafts."""
from playwright.sync_api import sync_playwright
import json,subprocess
from pathlib import Path
source=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {definitions} from './js/types/registry.js';console.log(JSON.stringify(definitions.map(d=>({id:d.id,templates:d.templates}))));"],text=True))
records=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,1440]:
  c=b.new_context(viewport={'width':width,'height':900});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script("window.confirm=()=>{throw Error('window.confirm is forbidden for templates')}")
  page.goto('http://127.0.0.1:4173')
  def done():page.wait_for_function('!document.querySelector("#run").disabled')
  done()
  for d in source:
   page.locator('#macroType').select_option(d['id']);done();page.locator('#auto').uncheck()
   original=page.locator('#editor').input_value()
   page.locator('#template').select_option(d['templates'][0]['id']);done()
   page.locator('#template').select_option(d['templates'][1]['id']);done()
   assert page.locator('#editor').input_value()==d['templates'][1]['code']
   page.locator('#template').select_option('');assert page.locator('#editor').input_value()==original
   draft='自由練習 '+d['id']+'\n未保存の編集 🐈'
   page.locator('#editor').fill(draft)
   assert page.locator('#template').input_value()==''
   assert not page.locator('#templateExplanation').is_visible()
   page.locator('#template').select_option(d['templates'][0]['id']);done()
   changed=d['templates'][0]['code']+'\n変更'
   page.locator('#editor').fill(changed)
   assert page.locator('#template').input_value()=='';assert not page.locator('#templateExplanation').is_visible()
   page.locator('[data-view="templates"]').click();page.locator('#templateCards .template-card').nth(1).locator('button').click();done()
   assert page.locator('#editor').input_value()==d['templates'][1]['code']
   page.reload();done();page.locator('#template').select_option('')
   assert page.locator('#editor').input_value()==changed
   page.locator('#template').select_option(d['templates'][0]['id']);done()
   other=source[(source.index(d)+1)%len(source)]['id'];page.locator('#macroType').select_option(other);done();page.locator('#macroType').select_option(d['id']);done()
   page.locator('#template').select_option('');assert page.locator('#editor').input_value()==changed
   stored=page.evaluate('JSON.parse(localStorage.getItem("programming-practice-v3"))')
   assert stored['drafts'][d['id']]['freeDraft']['code']==changed
   assert 'freeDraft' not in stored['drafts'][d['id']]['freeDraft']
   records.append({'kind':d['id'],'width':width,'dialog_disabled':True,'reload_and_switch_restore':True,'edited_template_detaches':True})
  assert not errors,errors;c.close()
 b.close()
Path('work/audit/template-drafts-r2.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
print(json.dumps({'cases':len(records),'all_checks':'passed'}))
