"""Development integration checks; independent audit will use its own prompt."""
from playwright.sync_api import sync_playwright
import json
URL='http://127.0.0.1:4173'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 context=b.new_context(viewport={'width':1440,'height':1000});page=context.new_page();page.set_default_timeout(12000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def done():page.wait_for_function("!document.querySelector('#run').disabled")
 def switch(kind):page.locator('#macroType').select_option(kind);done()
 page.goto(URL);done();assert page.title()=='プログラミング練習';ids=page.locator('#macroType option').evaluate_all('(items)=>items.map(x=>x.value)');assert len(ids)>0
 page.on('dialog',lambda d:d.accept())
 # Every tool, every supplied template, and per-tool save state.
 template_count=0
 for kind in ids:
  switch(kind)
  options=page.locator('#template option').evaluate_all('(items)=>items.map(x=>x.value).filter(Boolean)')
  for template in options:
   page.locator('#template').select_option(template);done();assert not page.locator('#pathNav').is_hidden(),(kind,template,page.locator('#resultStatus').inner_text());template_count+=1
  page.locator('#template').select_option('');assert not page.locator('#templateExplanation').is_visible()
  assert page.locator('#file').get_attribute('accept')
  print('templates',kind,len(options),flush=True)
 # Distinct drafts, sort and selected path across tool switches and a full reload.
 switch('javascript');page.locator('#editor').fill('const x = prompt("x");\nif (x === "a") {\nconsole.log("a");\n} else {\nconsole.log("b");\n}')
 page.locator('#run').click();done();assert page.locator('#counter').inner_text()=='1 / 2';page.locator('#next').click();page.locator('#sort').select_option('long');saved=page.locator('#final').inner_text();js_code=page.locator('#editor').input_value()
 switch('r');page.locator('#editor').fill('x <- c(2,4)\nprint(mean(x))');r_code=page.locator('#editor').input_value()
 switch('javascript');assert page.locator('#editor').input_value()==js_code;assert page.locator('#sort').input_value()=='long';assert page.locator('#counter').inner_text()=='2 / 2';assert page.locator('#final').inner_text()==saved
 page.reload();done();assert page.locator('#macroType').input_value()=='javascript';assert page.locator('#counter').inner_text()=='2 / 2';switch('r');assert page.locator('#editor').input_value()==r_code
 # Preserve temporarily invalid JSON model text, without losing code drafts.
 raw='{ "variables": '
 page.locator('#modelPanel summary').click();page.locator('#modelJson').fill(raw);switch('javascript');switch('r');assert page.locator('#modelJson').input_value()==raw;assert page.locator('#editor').input_value()==r_code
 page.locator('#resetModel').click();done()
 # Shared action editor edits, reorders and jumps to structurally located actions.
 switch('uivision');page.locator('#template').select_option('ui-form');done();assert page.locator('#builder .action-list li').count()==5
 page.locator('#builder select').select_option('echo');page.locator('#builder button').filter(has_text='＋ 追加').click();assert page.locator('#builder .action-list li').count()==6
 page.locator('#run').click();done();buttons=page.locator('#trace button').filter(has_text='ログへ出力');buttons.last.click();assert page.locator('#builder li.selected').count()==1
 # Mobile and desktop: all registered tools x 4 views x 2 widths.
 layouts=0
 for width in [375,1440]:
  page.set_viewport_size({'width':width,'height':900})
  page.locator('[data-view="practice"]').click()
  for kind in ids:
   switch(kind)
   for view in ['practice','reference','templates','glossary']:
    page.locator('[data-view="'+view+'"]').click();assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),(width,kind,view);layouts+=1
   page.locator('[data-view="practice"]').click()
 # All lazy-loaded modules and reference data must work after offline cold reload.
 page.wait_for_function('navigator.serviceWorker.controller !== null');context.set_offline(True);page.reload();done()
 for kind in ids:
  switch(kind)
  assert '開始できません' not in page.locator('#resultStatus').inner_text(),kind
  assert '使えません' not in page.locator('#resultStatus').inner_text(),kind
  page.locator('#template').select_option(page.locator('#template option').nth(1).get_attribute('value'));done();assert not page.locator('#pathNav').is_hidden(),kind
 context.set_offline(False);assert not errors,errors
 print(json.dumps({'types':len(ids),'templates':template_count,'layout_cases':layouts,'drafts':'per-type/reload/invalid model preserved','flow_builder':'passed','offline':f'all {len(ids)}','pageerrors':errors},ensure_ascii=False),flush=True)
 b.close()
