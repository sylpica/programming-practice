import sys,json,subprocess,tempfile,urllib.request,zipfile,re,platform
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8');base=Path(__file__).resolve().parent;rows=[]
with tempfile.TemporaryDirectory()as td:
 p=Path(td);urllib.request.urlretrieve('https://github.com/AutoHotkey/AutoHotkey/releases/download/v2.0.19/AutoHotkey_2.0.19.zip',p/'ahk.zip');zipfile.ZipFile(p/'ahk.zip').extractall(p/'ahk');exe=next((p/'ahk').rglob('AutoHotkey64.exe'))
 setup='''#Requires AutoHotkey v2.0
SetTitleMatchMode 2
g1:=Gui(,"R7 Window A")
g1.AddText(,"present text")
g1.Show("w200 h100 x0 y0")
g2:=Gui(,"R7 Window B")
g2.AddText(,"present text")
g2.Show("w200 h100 x220 y0")
WinActivate("ahk_id " g2.Hwnd)
WinWaitActive("ahk_id " g2.Hwnd,,2)
FileAppend "ACTIVE_B=" (WinActive("ahk_id " g2.Hwnd)>0) "`n", "*"
'''
 for c in json.loads((base/'ahk-cases.json').read_text(encoding='utf-8')):
  code=c['code'];body='\n'.join('FileAppend String('+line[len('MsgBox '):]+') "`n", "*"'if line.startswith('MsgBox ')else line for line in code.splitlines())
  script=setup+'\ntry {\n'+body+'\n} catch as e {\n FileAppend Type(e) ": " e.Message "`n", "*"\n}\ng1.Destroy()\ng2.Destroy()\nExitApp\n';f=p/'probe.ahk';f.write_text(script,encoding='utf-8-sig')
  try:
   r=subprocess.run([str(exe),'/ErrorStdOut',str(f)],capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=10);row=dict(name=c['name'],code=code,script=script,stdout=r.stdout,stderr=r.stderr,returncode=r.returncode)
  except subprocess.TimeoutExpired:row=dict(name=c['name'],code=code,timeout=True)
  rows.append(row);print(c['name'],row.get('stdout'),row.get('stderr'),flush=True)
summary=dict(platform=platform.platform(),rows=rows);(base/'results-ahk.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8');print('AHK_JSON_START');print(json.dumps(summary,ensure_ascii=True));print('AHK_JSON_END')
