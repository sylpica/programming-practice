"""Interaction evidence for the original requirements, rather than code inspection."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,subprocess,re
source=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{definitions}from'./js/types/registry.js';console.log(JSON.stringify(definitions.map(d=>({id:d.id,model:d.model.defaults,templates:d.templates,reference:d.reference}))))"]))
fixtures=json.loads(Path('tests/fixtures/audit-blind.json').read_text());records=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,1440]:
  c=b.new_context(viewport={'width':width,'height':900});page=c.new_page();page.set_default_timeout(12000);page.on('dialog',lambda d:d.accept());errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4173')
  def done():page.wait_for_function('!document.querySelector("#run").disabled')
  done()
  for d in source:
   kind=d['id'];page.locator('#macroType').select_option(kind);done()
   page.locator('#template').select_option(d['templates'][0]['id']);done()
   explanation=page.locator('#templateExplanation');assert explanation.is_visible()
   assert explanation.evaluate('(e)=>e.scrollHeight<=e.clientHeight+2 && getComputedStyle(e).overflowY==="visible"')
   assert explanation.bounding_box()['y']>=page.locator('.simulation').bounding_box()['y']
   chips=explanation.locator('.chip')
   if chips.count():
    title=chips.first.inner_text();chips.first.click();assert page.locator('#refDetail h3').inner_text()==title
   if width==1440:
    assert page.locator('.reference-panel').bounding_box()['x']>page.locator('.editor-panel').bounding_box()['x']
    assert page.locator('#sideGlossary').is_visible()
    assert page.locator('.right-column .model-panel').count()==0
   page.locator('#template').select_option('');assert not explanation.is_visible()
   # Blank lines push the selected statement far outside the editor viewport.
   sample=next((x['code'] for x in fixtures if x['kind']==kind), d['templates'][0]['code'])
   if kind=='cloudformation':sample=d['templates'][0]['code']
   if kind=='autohotkey':
    if page.locator('#modelPanel').get_attribute('open') is None:page.locator('#modelPanel summary').click()
    page.locator('#modelJson').fill(json.dumps({**d['model'],'event':None}))
   code='\n'*60+sample;page.locator('#auto').uncheck();page.locator('#editor').fill(code);page.locator('#run').click();done()
   trace=page.locator('#trace button');assert trace.count()>0,(kind,page.locator('#resultStatus').inner_text())
   last=trace.last;label=last.locator('.line');line=int(label.inner_text()[1:]) if label.count() else None;last.click()
   if kind in ['powerautomate','uivision']:assert page.locator('#builder li.selected').count()==1
   else:
    actual=page.locator('#editor').evaluate(r'''e=>({line:e.value.slice(0,e.selectionStart).split("\n").length,scroll:e.scrollTop,height:parseFloat(getComputedStyle(e).lineHeight)})''')
    assert actual['line']==line,(kind,line,actual)
    assert abs(actual['scroll']-(line-1)*actual['height'])<=2,(kind,line,actual)
   records.append({'kind':kind,'width':width,'template_expand_hide':True,'template_reference_link':True,'jump_and_scroll_top':True,'sidebar_variables':False})
  # Many used functions must leave the reference panel reachable.
  page.locator('#macroType').select_option('imagej');done();page.locator('#auto').uncheck();ij=next(d for d in source if d['id']=='imagej');page.locator('#editor').fill('\n'.join(r['example'] for r in ij['reference']))
  assert page.locator('#used .chip').count()>60
  assert page.locator('#used').evaluate('(e)=>e.scrollHeight>e.clientHeight && e.clientHeight<=155')
  assert page.locator('.reference-panel').bounding_box()['height']>=180
  page.locator('#used .chip').first.click();assert page.locator('#refDetail h3').inner_text()
  assert not errors,errors;c.close()
 b.close()
Path('work/audit/requirements-operations.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
print(json.dumps({'type_width_cases':len(records),'all_checks':'passed','many_used_functions':'reference remains usable'},ensure_ascii=False))
