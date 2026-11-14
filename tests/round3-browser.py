"""New blind inputs executed through the real UI at both required widths."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,re,subprocess
cases=json.loads(Path('tests/fixtures/audit-blind-r3.json').read_text())
models=json.loads(subprocess.check_output(['node','--input-type=module','-e','import{definitions}from"./js/types/registry.js";console.log(JSON.stringify(Object.fromEntries(definitions.map(d=>[d.id,d.model.defaults]))));']))
blind_count=len(cases)
extra=[]
for kind in ['c','cpp']:
 for name,code,outputs,error in [
  ('sizeof result type','double x=2; double n=sizeof x/3; printf("%f",n);',['2.000000'],None),
  ('unsigned wrap','printf("%u",(unsigned)-1+1);',['0'],None),
  ('char range','char n=256;',None,'未確認|処理系|符号'),
  ('floating range','float n=1e100;',None,'範囲外'),
  ('unary overflow','int n=-(-2147483647-1);',None,'オーバーフロー'),
 ]:extra.append(dict(kind=kind,name=name,code=code,outputs=outputs,error=error,model=None,paths=1))
for name,code,outputs,error in [
 ('AHK zero divide','x := 1/0',None,'0による除算'),
 ('AHK numeric strings','MsgBox "2"+"3"',['5'],None),
 ('AHK inequality','if "Ab" != "ab" {\nMsgBox "bad"\n} else {\nMsgBox "ok"\n}',['ok'],None),
 ('AHK integer division explicit stop','x := 7//2',None,'未対応'),
]:extra.append(dict(kind='autohotkey',name=name,code=code,outputs=outputs,error=error,model={**models['autohotkey'],'event':None},paths=1))
extra.append(dict(kind='uivision',name='times internal counter',code=json.dumps({'Commands':[{'Command':'times','Target':'2'},{'Command':'echo','Target':'${!times}'},{'Command':'end'}]}),outputs=['1','2'],error=None,model=None,paths=1))
for name,code,outputs in [
 ('C# double field','class Box {public double D;} Box b=new Box(); b.D=2; b.D/=3; Console.WriteLine(b.D);',[str(2/3)]),
 ('C# double array','double[] a={2}; a[0]/=3; Console.WriteLine(a[0]);',[str(2/3)]),
 ('C# float widening','float a=16777216; float b=1; double n=a+b; Console.WriteLine(n);',['16777216']),
]:extra.append(dict(kind='csharp',name=name,code=code,outputs=outputs,error=None,model=None,paths=1))
for kind in ['c','cpp']:extra.append(dict(kind=kind,name='float widening',code='float a=16777216; float b=1; double n=a+b; printf("%f",n);',outputs=['16777216.000000'],error=None,model=None,paths=1))
extra.append(dict(kind='autohotkey',name='integer precision',code='MsgBox 9007199254740993',outputs=None,error='未確認',model={**models['autohotkey'],'event':None},paths=1))
cases+=extra
records=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,1440]:
  context=b.new_context(viewport={'width':width,'height':900});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4173')
  def done():page.wait_for_function('!document.querySelector("#run").disabled')
  done()
  for c in cases:
   kind=c['kind'];page.locator('#macroType').select_option(kind);done();page.locator('#auto').uncheck();page.locator('#modelPanel').evaluate('(e)=>e.open=true')
   model=c['model'] or models[kind]
   if kind=='vba':
    for cell in ['A1','B1','C1','A2','B2','A3','B3','A4','B4']:
     v=model.get(cell,'');page.locator('input[data-cell="'+cell+'"]').fill('?' if isinstance(v,dict) and v.get('kind')=='unknown' else str(v))
   else:page.locator('#modelJson').fill(json.dumps(model,ensure_ascii=False))
   page.locator('#editor').fill(c['code']);page.locator('#run').click();done()
   shown=page.locator('#resultStatus').inner_text()+'\n'+page.locator('#trace').inner_text()+'\n'+page.locator('#final').inner_text()
   if c['error']:assert re.search(c['error'],shown),(c,shown)
   else:
    assert not page.locator('#trace .error').count(),(c,shown)
    assert page.locator('#counter').inner_text()=='1 / '+str(c['paths']),(c,page.locator('#counter').inner_text())
    if c['outputs'] is not None:
     buttons=page.locator('#outputs .output-link');assert buttons.count()==len(c['outputs']),(c,page.locator('#outputs').inner_text())
     for i,want in enumerate(c['outputs']):assert buttons.nth(i).inner_text().endswith(want),(c,buttons.nth(i).inner_text())
    assert not re.search(r'"kind"\s*:|__class|\(model\)|実行時に決まる（実行時に決まる',shown),(c,shown)
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),c
   records.append({'kind':kind,'name':c['name'],'width':width,'passed':True})
  # The actual DOM object itself must also be human-readable in a trace and state.
  page.locator('#macroType').select_option('javascript');done();page.locator('#editor').fill('let e=document.getElementById("result"); console.log(e);');page.locator('#run').click();done()
  shown=page.locator('#resultStatus').inner_text()+'\n'+page.locator('#trace').inner_text()+'\n'+page.locator('#final').inner_text();assert 'DOM要素 <p>' in shown;assert not re.search(r'"kind"\s*:|"tagName"\s*:',shown),shown
  assert not errors,errors;context.close()
 b.close()
Path('work/audit/round3-browser.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
print(json.dumps({'new_blind_UI_checks':blind_count*2,'new_finding_regressions':len(extra)*2,'DOM_display_checks':2,'pageerrors':0}))
