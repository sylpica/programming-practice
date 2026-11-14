"""Every template card is an entrance to the only practice mode."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,subprocess
source=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{definitions}from'./js/types/registry.js';console.log(JSON.stringify(definitions.map(d=>({id:d.id,templates:d.templates}))))"]))
records=[];counts={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,1440]:
  c=b.new_context(viewport={'width':width,'height':900});page=c.new_page();page.set_default_timeout(15000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept());page.goto('http://127.0.0.1:4173');page.wait_for_function('!document.querySelector("#run").disabled')
  assert page.locator('.main-nav [data-view]').evaluate_all('(xs)=>xs.map(x=>x.dataset.view)')==['practice','reference','templates','glossary']
  for d in source:
   page.locator('[data-view="practice"]').click();page.locator('#macroType').select_option(d['id']);page.wait_for_function('!document.querySelector("#run").disabled')
   levels={}
   for t in d['templates']:levels[t['level']]=levels.get(t['level'],0)+1
   counts[d['id']]={'count':len(d['templates']),'levels':levels};assert len(d['templates'])>=6;assert levels.get('基礎') and levels.get('応用')
   for i,t in enumerate(d['templates']):
    page.locator('#auto').uncheck();page.locator('#editor').fill('下書き：'+d['id']+'/'+t['id'])
    page.locator('[data-view="templates"]').click();card=page.locator('#templateCards .template-card').nth(i);assert t['title'] in card.inner_text();assert t['level'] in card.inner_text();card.locator('button').click()
    assert page.locator('#practice').is_visible();assert not page.locator('#templates').is_visible();assert page.locator('#editor').input_value()==t['code'];assert page.locator('#template').input_value()==t['id']
    page.wait_for_function('!document.querySelector("#run").disabled');assert page.locator('#pathNav').is_visible(),(d['id'],t['id'],page.locator('#resultStatus').inner_text())
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    records.append({'type':d['id'],'template':t['id'],'width':width,'loaded_exact_code':True,'practice_visible':True})
   # Deselecting hides the complete explanation without switching learning modes.
   page.locator('#template').select_option('');assert not page.locator('#templateExplanation').is_visible()
  assert not errors,errors;c.close()
 b.close()
Path('work/audit/template-entry-results.json').write_text(json.dumps({'counts':counts,'cases':records},ensure_ascii=False,indent=2))
print(json.dumps({'template_cards':sum(x['count'] for x in counts.values()),'entry_operations':len(records),'counts':counts,'errors':0},ensure_ascii=False))
