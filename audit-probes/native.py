import base64,json,os,platform,subprocess,tempfile,time
from pathlib import Path
root=Path(__file__).resolve().parents[1]
pwsh=os.environ.get('PWSH_AUDIT_PATH','pwsh')
rows=[]
cmds=[
 ('percent CD','cd sub\necho%CD%'),
 ('delayed CD','setlocal EnableDelayedExpansion\ncd sub\necho!CD!'),
 ('percent ERRORLEVEL','cmd /c exit 7\necho%ERRORLEVEL%'),
 ('delayed ERRORLEVEL','setlocal EnableDelayedExpansion\ncmd /c exit 7\necho!ERRORLEVEL!'),
 ('percent metachar','set "X=hello&echo injected"\necho %X%'),
 ('delayed metachar','setlocal EnableDelayedExpansion\nset "X=hello&echo injected"\necho !X!'),
 ('echo colon','echo:hello'),
 ('echo dot text','echo.hello'),
 ('delayed missing bang','setlocal EnableDelayedExpansion\necho hello!world'),
 ('quoted extension CD','cd "sub"\necho%CD%'),
 ('set input empty','set X=before\nset /p X=prompt\necho %X%'),
 ('if wildcard','if exist *.txt echo found'),
]
with tempfile.TemporaryDirectory() as t:
 p=Path(t);(p/'sub').mkdir();(p/'notes.txt').write_text('notes')
 for name,code in cmds:
  f=p/'probe.cmd';f.write_bytes(('@echo off\r\n'+code.replace('\n','\r\n')+'\r\n').encode('ascii'))
  start=time.perf_counter()
  v=subprocess.run(['cmd.exe','/d','/q','/c','probe.cmd'],cwd=p,input='\n',capture_output=True,text=True,timeout=10)
  rows.append(dict(kind='cmd',name=name,code=code,stdout=v.stdout,stderr=v.stderr,returncode=v.returncode,ms=(time.perf_counter()-start)*1000,cwd=t))
 for code in json.loads((root/'audit-probes/ps-cases.json').read_text(encoding='utf-8')):
  script="$ErrorActionPreference='Stop'; try {$v=@(& {"+code+"}); ConvertTo-Json -InputObject @{values=$v;error=$null} -Depth 20 -Compress} catch {ConvertTo-Json -InputObject @{values=@();error=$_.Exception.Message} -Compress}"
  start=time.perf_counter()
  v=subprocess.run([pwsh,'-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',base64.b64encode(script.encode('utf-16le')).decode()],cwd=p,capture_output=True,text=True,encoding='utf-8',timeout=10)
  rows.append(dict(kind='powershell',code=code,stdout=v.stdout,stderr=v.stderr,returncode=v.returncode,ms=(time.perf_counter()-start)*1000))
 # Run model probes in child processes so an inner loop cannot block the audit.
 for code in ['@() * 2147483648','@() * 100000000',"'' * 2147483648"]:
  script="import {definition as d} from './js/types/powershell/index.js';let start=performance.now();let r=d.simulate("+json.dumps(code)+",structuredClone(d.model.defaults));console.log(JSON.stringify({ms:performance.now()-start,result:r}));"
  start=time.perf_counter()
  try:
   v=subprocess.run(['node','--input-type=module','-e',script],cwd=root,capture_output=True,text=True,encoding='utf-8',timeout=8)
   rows.append(dict(kind='model-performance',code=code,stdout=v.stdout,stderr=v.stderr,returncode=v.returncode,ms=(time.perf_counter()-start)*1000))
  except subprocess.TimeoutExpired:
   rows.append(dict(kind='model-performance',code=code,timeout=True,ms=(time.perf_counter()-start)*1000))
summary=dict(platform=platform.platform(),processor=platform.processor(),rows=rows)
(root/'audit-probes/results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=True,indent=2))
