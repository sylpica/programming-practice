"""Repeatable browser acceptance checks. Requires Playwright Python and Chromium."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os
URL=os.environ.get('VBA_TEST_URL','http://127.0.0.1:4173')
def run_code(page,code):
 page.locator('#auto').uncheck()
 page.locator('#editor').fill(code)
 page.locator('#run').click()
 page.wait_for_function("!document.querySelector('#run').disabled && document.querySelector('#counter').textContent.includes('/')")
def await_run(page):page.wait_for_function("!document.querySelector('#run').disabled && document.querySelector('#pathNav').hidden === false")
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000})
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_default_timeout(10000);page.goto(URL);await_run(page)
 assert 'A1' in page.locator('#final').inner_text()
 code='''x = InputBox("x")
If x = "a" Then
    Debug.Print Len("abc")
ElseIf x = "b" Then
    y = 1
    y = 2
    Debug.Print Abs(-2)
Else
    Debug.Print Trim(" x ")
End If'''
 run_code(page,code)
 assert page.locator('#counter').inner_text()=='1 / 3'
 assert 'Len' in page.locator('#used').inner_text() and 'Abs' not in page.locator('#used').inner_text()
 page.locator('#next').click();assert 'Abs' in page.locator('#used').inner_text() and 'Len' not in page.locator('#used').inner_text()
 before=page.locator('#final').inner_text();page.locator('#sort').select_option('long');assert page.locator('#counter').inner_text()=='1 / 3';assert page.locator('#final').inner_text()==before
 page.locator('#last').click();assert page.locator('#counter').inner_text()=='3 / 3'
 page.locator('#pathNumber').fill('99999');page.locator('#pathNumber').press('Enter');assert page.locator('#pathNumber').input_value()=='3'
 page.locator('#pathNumber').fill('-5');page.locator('#jump').click();assert page.locator('#pathNumber').input_value()=='1'
 for invalid in ['', 'abc']:
  page.locator('#pathNumber').fill(invalid);page.locator('#jump').click();assert page.locator('#counter').inner_text()=='1 / 3'
 page.locator('#last').click();page.locator('#first').click();page.locator('#last').click();page.locator('#prev').click();assert page.locator('#counter').inner_text()=='2 / 3'
 run_code(page,'If False Then\nx = 1\nElse\nx = 1\nEnd If')
 page.locator('#trace button').filter(has_text='x ←').click()
 assert page.locator('#editor').evaluate('(e)=>e.value.slice(e.selectionStart,e.selectionEnd)')=='x = 1'
 assert page.locator('#editor').evaluate('(e)=>e.selectionStart')==25
 page.locator('#auto').check();page.locator('#editor').fill('x = 42');page.wait_for_function("document.querySelector('#final').textContent.includes('42')")
 page.locator('#auto').uncheck();page.locator('#editor').fill('x = 43');assert '未実行' in page.locator('#resultStatus').inner_text()
 page.locator('#run').click();await_run(page);assert '43' in page.locator('#final').inner_text()
 # Real input element used for shared import pipeline; confirm file and encoding dialog.
 page.once('dialog',lambda d:d.accept());page.locator('#file').set_input_files({'name':'example.bas','mimeType':'text/plain','buffer':'x = "日本語"'.encode('utf8')})
 page.wait_for_function("document.querySelector('#editor').value.includes('日本語')")
 assert page.locator('#template').input_value()=='' and not page.locator('#templateExplanation').is_visible()
 page.once('dialog',lambda d:d.dismiss());page.locator('#file').set_input_files({'name':'cancel.bas','mimeType':'text/plain','buffer':b'x = 0'})
 assert '日本語' in page.locator('#editor').input_value()
 # All templates and expansion / clear.
 page.on('dialog',lambda d:d.accept())
 for template in ['cells','if','for','each','input','do','array','text']:
  page.locator('#template').select_option(template);await_run(page)
  assert page.locator('#templateExplanation').is_visible()
  assert '停止' not in page.locator('#final').inner_text(),template
 page.locator('#template').select_option('');assert not page.locator('#templateExplanation').is_visible()
 # Every viewport and menu; 200% equivalent layout viewport and actual browser CSS zoom.
 checks=0
 for width in [375,768,1024,1440]:
  page.set_viewport_size({'width':width,'height':900})
  for view in ['practice','reference','templates','glossary']:
   page.locator('[data-view="'+view+'"]').click()
   assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),(width,view)
   checks+=1
 page.set_viewport_size({'width':1440,'height':1000});page.locator('[data-view="practice"]').click()
 page.add_style_tag(content='body { zoom: 2; }')
 assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),'200%'
 page.reload();await_run(page)
 # Simulation header stays outside inner scroll.
 run_code(page,'For i = 1 To 20\nx = i\nNext i')
 heading_before=page.locator('.simulation .panel-heading').bounding_box()
 page.locator('.simulation-body').evaluate('(e)=>e.scrollTop=e.scrollHeight')
 assert page.locator('.simulation .panel-heading').bounding_box()==heading_before
 # Service worker controls and cold offline navigation plus worker execution.
 page.wait_for_function('navigator.serviceWorker.controller !== null')
 context.set_offline(True);page.reload();await_run(page)
 run_code(page,'x = 88\nDebug.Print x');assert '88' in page.locator('#outputs').inner_text()
 context.set_offline(False)
 # Persisted code and final screenshot.
 page.reload();await_run(page);assert 'x = 88' in page.locator('#editor').input_value()
 assert not errors,errors
 print(json.dumps({'browser':'Chromium','viewport_menu_checks':checks,'zoom':'200%','offline':'passed','functions':'path linked','import':'UTF-8, cancel','errors':errors},ensure_ascii=False))
 browser.close()
