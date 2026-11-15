import sys
sys.stdout.reconfigure(encoding="utf-8")
import base64,json,os,platform,subprocess,tempfile,time
from pathlib import Path
base=Path(__file__).resolve().parent;pwsh=os.environ.get('PWSH_AUDIT_PATH','pwsh');rows=[]
def psrun(code,cwd):
 # Capture only explicit properties; FileInfo.Directory/Parent graphs are not
 # sent to ConvertTo-Json. This avoids the first milestone's harness timeout.
 mapper=r'''
function Map-R7($v) {
 if($null -eq $v){return $null}
 if($v -is [string] -or $v -is [bool] -or $v -is [ValueType]){return $v}
 if($v -is [System.IO.FileSystemInfo]){
  $h=@{Name=$v.Name;FullName=$v.FullName;Extension=$v.Extension;PSIsContainer=$v.PSIsContainer}
  if($v -is [System.IO.FileInfo]){$h.Length=$v.Length};return $h
 }
 if($v -is [System.Management.Automation.PathInfo]){return @{Path=$v.Path}}
 if($v -is [System.Collections.IDictionary]){ $h=@{};foreach($k in $v.Keys){$h[[string]$k]=Map-R7 $v[$k]};return $h }
 $h=@{};foreach($prop in $v.PSObject.Properties){if($prop.MemberType -eq 'NoteProperty' -or $v.GetType().Name -eq 'GenericMeasureInfo'){$h[$prop.Name]=Map-R7 $prop.Value}}
 if($h.Count -eq 0){$h.NativeType=$v.GetType().FullName};return $h
}
'''
 script="$ErrorActionPreference='Stop';[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);"+mapper+"\ntry {$v=@(& ([scriptblock]::Create("+"'"+code.replace("'","''")+"'"+")) 6>$null);$mapped=@($v|ForEach-Object {Map-R7 $_});ConvertTo-Json -InputObject @{values=$mapped;error=$null} -Depth 8 -Compress} catch {ConvertTo-Json -InputObject @{values=@();error=$_.Exception.Message} -Compress}"
 return subprocess.run([pwsh,'-NoProfile','-EncodedCommand',base64.b64encode(script.encode('utf-16le')).decode()],cwd=cwd,input='a\n',capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=12)
for kind,file in [('cmd','windows-cmd-cases.json'),('powershell','windows-ps-cases.json')]:
 for i,c in enumerate(json.loads((base/file).read_text(encoding='utf-8'))):
  with tempfile.TemporaryDirectory() as t:
   p=Path(t);(p/'logs').mkdir()
   fixtures=[('notes.txt','line1\r\nline2\r\n'),('empty.txt',''),('lines.txt','a\r\nb\r\nc\r\n'),('logs/nested.txt','nested\r\n')]
   if c['name'].startswith('material:'):
    fixtures=[('notes.txt','学習メモ\r\n'),('readme.txt','Practice\r\n'),('data.csv','Name,Score\r\nAlice,80\r\n')]
   for name,value in fixtures:(p/name).write_bytes(value.encode('utf-8'))
   start=time.perf_counter()
   try:
    if kind=='cmd':
     f=p/'probe.cmd';f.write_bytes(('@echo off\r\nchcp 65001 >nul\r\n'+c['code'].replace('\n','\r\n')+'\r\n').encode('utf-8'))
     r=subprocess.run(['cmd.exe','/d','/q','/c',f.name],cwd=p,input='a\n',capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=12)
    else:r=psrun(c['code'],p)
    row=dict(kind=kind,name=c['name'],code=c['code'],stdout=r.stdout,stderr=r.stderr,returncode=r.returncode,ms=(time.perf_counter()-start)*1000,cwd=t)
   except subprocess.TimeoutExpired:row=dict(kind=kind,name=c['name'],code=c['code'],timeout=True,ms=(time.perf_counter()-start)*1000)
   rows.append(row)
   print(kind,i,c['name'].split('\n')[0],row.get('returncode'),'timeout'if row.get('timeout')else'',flush=True)
summary=dict(platform=platform.platform(),rows=rows)
(base/'results-step2-shells.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print('RESULT_JSON_START')
print(json.dumps(summary,ensure_ascii=True))
print('RESULT_JSON_END')
