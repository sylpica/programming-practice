"""Browser regressions for adjudicated round 2 findings, at mobile and PC widths."""
from playwright.sync_api import sync_playwright
import json,re
from pathlib import Path
cases=[
 ('r','x <- NA\nprint(mean(c("a","b")))','NA'),
 ('c','int a[2]={1,2}; int *p=&a[0]; printf("%d",*p);','1'),
 ('cpp','int n=1; int& r=n; r=4; cout << n;','4'),
 ('c','char s[]="abc"; s[1]=\'X\'; printf("%s",s);','aXc'),
 ('cpp','std::string s="a"; s += "b"; cout << (s+"c");','abc'),
 ('csharp','class Counter {public int Value;} Counter c=new Counter(); c.Value=2; Console.WriteLine(c.Value);','2'),
 ('javascript','console.log(typeof 5);','number'),
 ('javascript','console.log(missing);','ReferenceError'),
 ('javascript','console.log(typeof x); let x=1;','ReferenceError'),
 ('python','x=print(1)','1'),
 ('vba','Debug.Print Date\nDebug.Print Now','現在日付'),
 ('powerapps','Switch(1,1,Set(x,2),Set(x,3))',None),
]
records=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,1440]:
  c=b.new_context(viewport={'width':width,'height':900});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4173')
  def done():page.wait_for_function('!document.querySelector("#run").disabled')
  done()
  for kind,code,expected in cases:
   page.locator('#macroType').select_option(kind);done();page.locator('#auto').uncheck();page.locator('#editor').fill(code);page.locator('#run').click();done()
   text=page.locator('#trace').inner_text()+'\n'+page.locator('#final').inner_text()+'\n'+page.locator('#outputs').inner_text()
   assert not re.search(r'"kind"|__class|__defaultSource|__switch|式を評価します：(null|未設定)',text),(kind,text)
   if expected:assert expected in text,(kind,text)
   if kind=='python':assert page.locator('#trace li').count()==1
   if kind=='javascript' and 'ReferenceError'==expected:assert 'NameError' not in text;assert 'ReferenceError' in page.locator('#final').inner_text();assert 'ReferenceError' in page.locator('#trace').inner_text()
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),kind
   records.append({'kind':kind,'width':width,'checks':'passed'})
  page.locator('#macroType').select_option('javascript');done();page.locator('[data-view="reference"]').click();assert page.locator('#fullReferences').get_by_text('戻り値：undefined',exact=True).count()>0;assert page.locator('#fullReferences a',has_text='公式資料').count()>0
  assert not errors,errors;c.close()
 b.close()
Path('work/audit/round2-browser.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
print(json.dumps({'regressions_at_two_widths':len(records),'reference_returns_and_links':'passed','pageerrors':0}))
