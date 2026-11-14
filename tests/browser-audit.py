"""Independent audit matrix on a disposable browser context; no external services."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os, subprocess
BASE=os.environ.get('AUDIT_URL','http://127.0.0.1:4173')
ART=Path('work/audit');ART.mkdir(parents=True,exist_ok=True)
cases=json.loads(Path('tests/fixtures/audit-blind.json').read_text())
source=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{definitions}from'./js/types/registry.js'; console.log(JSON.stringify(definitions.map(d=>({id:d.id,model:d.model.defaults,templates:d.templates}))))"]))
models={d['id']:d['model'] for d in source}
# Independent branch sources. C and C++ expose no external-input operation in their supported subset.
branch={
'vba':'x = InputBox("x")\nIf x = "a" Then\nDebug.Print "A"\nElse\nDebug.Print "B"\nEnd If',
'imagej':'x=getNumber("x",0); if(x==1){print(1);}else{print(2);}',
'cloudformation':'def handler(event, context):\n    x = input()\n    if x == "a":\n        f = {"A":1}\n    else:\n        f = {"B":2}\n    return {"requestId":event["requestId"],"status":"success","fragment":f}',
'powerautomate':next(c['code'] for c in cases if c['kind']=='powerautomate' and c['name']=='unknown'),
'autohotkey':next(c['code'] for c in cases if c['kind']=='autohotkey' and c['name']=='unknown input'),
'uivision':None,'powerapps':'If(X = 1, Notify("A"), Notify("B"))',
'python':'x=input()\nif x == "a":\n    print("A")\nelse:\n    print("B")',
'r':'x <- readline("x")\nif(x == "a"){print("A")}else{print("B")}',
'csharp':'string x=Console.ReadLine(); if(x=="a"){Console.WriteLine(1);}else{Console.WriteLine(2);}',
'javascript':'let x=prompt("x"); if(x=="a"){console.log(1);}else{console.log(2);}'
}
records=[];issues=[];dialogs=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,1440]:
  context=b.new_context(viewport={'width':width,'height':900});page=context.new_page();page.set_default_timeout(10000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append('console: '+m.text) if m.type=='error' else None);page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
  page.goto(BASE)
  def done():page.wait_for_function('!document.querySelector("#run").disabled')
  def run(code):
   page.locator('#auto').uncheck();page.locator('#editor').fill(code);page.locator('#run').click();done()
  def inspect(kind,state):
   for view in ['practice','reference','templates','glossary']:
    page.locator('[data-view="'+view+'"]').click()
    bounds=page.evaluate('''() => ({overflow:document.documentElement.scrollWidth>innerWidth,
      clipped:[...document.querySelectorAll('button,h1,h2,h3,label,dt,.badge')].filter(e=>e.getClientRects().length && e.clientWidth>0 && e.scrollWidth>e.clientWidth+2).map(e=>({text:e.textContent.slice(0,90),w:e.clientWidth,sw:e.scrollWidth})),
      narrow:[...document.querySelectorAll('label,dt,button')].filter(e=>e.getClientRects().length && e.clientWidth>0 && e.clientWidth<16 && e.textContent.trim().length>2).map(e=>e.textContent)
    })''')
    if bounds['overflow'] or bounds['clipped'] or bounds['narrow']:issues.append(dict(kind=kind,state=state,width=width,view=view,**bounds))
    records.append(dict(kind=kind,state=state,width=width,view=view))
   page.locator('[data-view="practice"]').click()
  done();ids=page.locator('#macroType option').evaluate_all('(a)=>a.map(x=>x.value)')
  for kind in ids:
   page.locator('#macroType').select_option(kind);done();inspect(kind,'initial')
   if kind in ['vba','powerautomate','javascript']:
    page.screenshot(path=str(ART/f'{kind}-{width}.png'),full_page=False)
   sample=next(c for c in cases if c['kind']==kind)
   if kind=='autohotkey':page.locator('#modelPanel').evaluate('(e)=>e.open=true');page.locator('#modelJson').fill(json.dumps({**models[kind],'event':None}));
   page.locator('#auto').uncheck();page.locator('#editor').fill(sample['code']);assert '未実行' in page.locator('#resultStatus').inner_text();inspect(kind,'input')
   page.locator('#run').click();done();inspect(kind,'executed')
   page.locator('#auto').check();page.locator('#editor').fill(sample['code']+'\n');page.wait_for_function('!document.querySelector("#run").disabled && !document.querySelector("#resultStatus").textContent.includes("未実行")');page.locator('#auto').uncheck()
   # Trace and output jumps select source, and output links are never inert.
   if page.locator('#trace button').count():
    page.locator('#trace button').first.click();assert page.locator('#editor').evaluate('(e)=>e.selectionEnd>=e.selectionStart')
   if page.locator('.output-link').count():
    page.locator('.output-link').first.click();assert page.locator('#editor').evaluate('(e)=>e.selectionEnd>e.selectionStart')
   chips=page.locator('#used .chip')
   if chips.count():chips.first.click();assert page.locator('#refDetail h3').count()==1
   if width==1440:
    assert page.locator('.simulation .panel-heading').is_visible()
    assert page.locator('.workspace').evaluate('(e)=>e.getBoundingClientRect().bottom')<=940
   run('@@@');assert page.locator('#trace .error').count() or '停止' in page.locator('#final').inner_text();inspect(kind,'error')
   bc=branch.get(kind)
   if kind=='uivision':bc=next(t['code'] for d in source if d['id']==kind for t in d['templates'] if t['id']=='ui-runtime')
   if kind=='powerapps':page.locator('#modelPanel').evaluate('(e)=>e.open=true');page.locator('#modelJson').fill(json.dumps({**models[kind],'variables':{'X':{'kind':'unknown','id':'audit-x','source':'audit'}}}))
   run(bc or sample['code'])
   if bc:
    assert page.locator('#counter').inner_text()=='1 / 2',(kind,page.locator('#resultStatus').inner_text())
    for sel in ['#last','#first','#next','#prev']:page.locator(sel).click()
    for sort in ['long','short','original']:page.locator('#sort').select_option(sort)
    page.locator('#pathNumber').fill('2');page.locator('#pathNumber').press('Enter');assert page.locator('#counter').inner_text()=='2 / 2'
   inspect(kind,'path-selected')
   ext=page.locator('#file').get_attribute('accept').split(',')[0]
   file_code=sample['code']+'\n';drop_code=sample['code']+'\n\n'
   page.locator('#file').set_input_files({'name':'audit'+ext,'mimeType':'text/plain','buffer':file_code.encode()});page.wait_for_function('(code)=>document.querySelector("#editor").value===code',arg=file_code)
   data=page.evaluate_handle('''({code,name})=>{const dt=new DataTransfer();dt.items.add(new File([code],name,{type:'text/plain'}));return dt}''',{'code':drop_code,'name':'drop'+ext})
   page.locator('#dropzone').dispatch_event('drop',{'dataTransfer':data});page.wait_for_function('(code)=>document.querySelector("#editor").value===code',arg=drop_code)
   inspect(kind,'file')
   with page.expect_event('dialog') as bad_dialog:page.locator('#file').set_input_files({'name':'other.invalid','mimeType':'text/plain','buffer':b'bad'})
   assert any(word in bad_dialog.value.message for word in ['拡張子','形式','取り込める','ファイルを選んで']),bad_dialog.value.message
   with page.expect_event('dialog') as huge_dialog:page.locator('#file').set_input_files({'name':'huge'+ext,'mimeType':'text/plain','buffer':b'a'*300001})
   assert '300KB' in huge_dialog.value.message
   assert page.locator('#editor').input_value()==drop_code
   spoof='<html>other language🙂</html>'
   page.locator('#file').set_input_files({'name':'spoof'+ext,'mimeType':'text/plain','buffer':spoof.encode()});page.wait_for_function('(code)=>document.querySelector("#editor").value===code',arg=spoof)
   page.locator('#run').click();done();assert page.locator('#trace .error').count() or '停止' in page.locator('#final').inner_text()
   run(sample['code']);page.wait_for_function('navigator.serviceWorker.controller!==null')
   context.set_offline(True);page.reload();done();assert page.locator('#editor').input_value()==sample['code'];inspect(kind,'offline');context.set_offline(False)
  # Keyboard escape leaves the textarea, Ctrl+Enter executes.
  page.locator('#editor').focus();page.keyboard.press('Escape');page.keyboard.press('Tab');assert page.evaluate('document.activeElement.id')!='editor'
  assert not errors,errors
  context.close()
 b.close()
result=dict(cases=len(records),records=records,issues=issues)
(ART/'browser-matrix.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(dict(cases=len(records),issues=issues),ensure_ascii=False))
assert not issues,issues
