import json,subprocess,tempfile,time,platform,urllib.request,zipfile,gzip,base64
from pathlib import Path
p=Path(__file__).resolve().parent;rows=json.loads((p/'cases.json').read_text(encoding='utf-8'));native=[]
with tempfile.TemporaryDirectory()as td:
 root=Path(td);urllib.request.urlretrieve('https://github.com/PowerShell/PowerShell/releases/download/v7.4.6/PowerShell-7.4.6-win-x64.zip',root/'pwsh.zip');zipfile.ZipFile(root/'pwsh.zip').extractall(root/'pwsh');exe=root/'pwsh'/'pwsh.exe'
 version=subprocess.run([str(exe),'-NoProfile','-NonInteractive','-Command','$PSVersionTable.PSVersion.ToString()'],capture_output=True,text=True,encoding='utf-8').stdout.strip()
 for r in rows:
  started=time.perf_counter()
  if r['kind']=='cmd':
   with tempfile.TemporaryDirectory()as cd:
    folder=Path(cd)
    for f in r['model']['files']:
     rel=f['path'][11:].lstrip('\\');dest=folder/rel
     if f['type']=='directory':dest.mkdir(parents=True,exist_ok=True)
     else:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(f.get('content','').encode('utf-8'))
    code='@echo off\r\nchcp 65001>nul\r\ncmd /d /c exit 0\r\n'+r['code'].replace('\n','\r\n')+'\r\n';probe=root/'probe.cmd';probe.write_bytes(code.encode('utf-8'))
    try:
     x=subprocess.run(['cmd.exe','/d','/q','/c',str(probe)],cwd=folder,input=r.get('stdin',''),capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=10)
     native.append(dict(id=r['id'],stdout=x.stdout,stderr=x.stderr,returncode=x.returncode,root=str(folder),ms=(time.perf_counter()-started)*1000))
    except subprocess.TimeoutExpired:native.append(dict(id=r['id'],timeout=True))
  else:
   one=root/'one-case.json';one.write_text(json.dumps([r],ensure_ascii=False),encoding='utf-8');result=root/'one-result.json'
   if result.exists():result.unlink()
   args=[str(exe),'-NoLogo','-NoProfile']+([]if r.get('interactive')else['-NonInteractive'])+['-File',str(p/'run-ps.ps1'),'-Cases',str(one),'-Result',str(result)]
   try:
    x=subprocess.run(args,input=r.get('stdin',''),capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=15)
    entry=dict(id=r['id'],processCode=x.returncode,hostStdout=x.stdout,hostStderr=x.stderr,processMs=(time.perf_counter()-started)*1000)
    if result.exists():entry.update(json.loads(result.read_text(encoding='utf-8-sig'))['rows'][0])
    else:entry['unavailable']='Native result file not produced'
    native.append(entry)
   except subprocess.TimeoutExpired:native.append(dict(id=r['id'],timeout=True))
result=dict(platform=platform.platform(),powershell=version,rows=native);(p/'results-native.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');subprocess.run(['node',str(p/'app.mjs')],check=True,timeout=90)
for name in ['native','app']:
 data=(p/('results-'+name+'.json')).read_bytes();print(name.upper()+'_GZIP:'+base64.b64encode(gzip.compress(data)).decode(),flush=True)
print('SUMMARY:'+json.dumps(dict(count=len(native),unavailable=[r['id']for r in native if r.get('timeout')or r.get('unavailable')],version=version)),flush=True)
