import json,subprocess,tempfile,os,time,platform,urllib.request,zipfile,gzip,base64
from pathlib import Path
p=Path(__file__).resolve().parent;rows=json.loads((p/'cases.json').read_text());fixtures=json.loads((p/'fixture.json').read_text());native=[]
with tempfile.TemporaryDirectory()as td:
 root=Path(td);url='https://github.com/PowerShell/PowerShell/releases/download/v7.4.6/PowerShell-7.4.6-win-x64.zip';urllib.request.urlretrieve(url,root/'pwsh.zip');zipfile.ZipFile(root/'pwsh.zip').extractall(root/'pwsh');exe=root/'pwsh'/'pwsh.exe'
 for r in rows:
  if r['kind']!='cmd':continue
  with tempfile.TemporaryDirectory()as cd:
   folder=Path(cd)
   for f in fixtures:
    rel=f['path'][11:].lstrip('\\');dest=folder/rel
    if f['type']=='directory':dest.mkdir(parents=True,exist_ok=True)
    else:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(f['content'].encode())
   code='@echo off\r\ncmd /d /c exit '+str(r.get('seed',0))+'\r\n'+r['code'].replace('\n','\r\n')+'\r\n'
   probe=folder/'probe.cmd';probe.write_bytes(code.encode('ascii'));start=time.perf_counter()
   try:
    x=subprocess.run(['cmd.exe','/d','/q','/c','probe.cmd'],cwd=folder,input=r.get('stdin',''),capture_output=True,text=True,errors='replace',timeout=8)
    native.append(dict(id=r['id'],stdout=x.stdout,stderr=x.stderr,returncode=x.returncode,ms=(time.perf_counter()-start)*1000))
   except subprocess.TimeoutExpired:native.append(dict(id=r['id'],timeout=True))
 started=time.perf_counter();r=subprocess.run([str(exe),'-NoLogo','-NoProfile','-NonInteractive','-File',str(p/'run-ps.ps1'),'-Cases',str(p/'cases.json'),'-Fixture',str(p/'fixture.json'),'-Result',str(p/'results-ps.json')],capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=180);print('PS_PROCESS:'+json.dumps(dict(code=r.returncode,stdout=r.stdout[-2000:],stderr=r.stderr[-2000:],ms=(time.perf_counter()-started)*1000)),flush=True)
 if r.returncode:raise RuntimeError('Native PS harness failed')
result=dict(platform=platform.platform(),rows=native);(p/'results-cmd.json').write_text(json.dumps(result,indent=2));subprocess.run(['node',str(p/'app.mjs')],check=True,timeout=90)
for name in ['cmd','ps','app']:
 data=(p/('results-'+name+'.json')).read_bytes();print(name.upper()+'_GZIP:'+base64.b64encode(gzip.compress(data)).decode(),flush=True)
