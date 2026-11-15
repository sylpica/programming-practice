"""Differential tests use real runtimes; the offline app never launches these."""
import json,os,subprocess,tempfile,shutil,sys,base64
from pathlib import Path
root=Path(__file__).resolve().parents[1]
fixtures=json.loads((root/'tests/fixtures/powershell-cases.json').read_text(encoding='utf-8'))
pwsh=os.environ.get('PWSH_PATH') or shutil.which('pwsh')
if "--require-both" in sys.argv:
 assert pwsh and shutil.which("cmd.exe"), "Both native shells must be installed"
materials=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {definitions} from './js/types/registry.js';console.log(JSON.stringify(definitions.filter(d=>['cmd','powershell'].includes(d.id)).flatMap(d=>[...d.templates.map(t=>({kind:d.id,name:t.id,code:t.code})),...d.reference.map(r=>({kind:d.id,name:r.name,code:r.example}))])));"],cwd=root,text=True,encoding='utf-8'))
records=[];failures=[]
with tempfile.TemporaryDirectory(prefix='practice-shell-native-') as temp:
 sandbox=Path(temp);cases=sandbox/'cases.json';cases.write_text(json.dumps([{'name':n,'code':c,'index':i}for i,(n,c,e)in enumerate(fixtures)],ensure_ascii=False),encoding='utf-8')
 if pwsh:
  script=r'''
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
$ErrorActionPreference='Stop'
$rows=Get-Content -LiteralPath $env:PRACTICE_SHELL_CASES -Raw | ConvertFrom-Json
$result=@()
foreach($row in $rows){
 $dir=Join-Path $env:PRACTICE_SHELL_ROOT ('case'+$row.index)
 [void][IO.Directory]::CreateDirectory($dir)
 [void][IO.Directory]::CreateDirectory((Join-Path $dir 'logs'))
 [IO.File]::WriteAllText((Join-Path $dir 'notes.txt'),"学習メモ`r`n",[Text.UTF8Encoding]::new($false))
 [IO.File]::WriteAllText((Join-Path $dir 'data.csv'),"Name,Score`r`nAlice,80`r`n",[Text.UTF8Encoding]::new($false))
 [IO.File]::WriteAllText((Join-Path $dir 'readme.txt'),"Practice`r`n",[Text.UTF8Encoding]::new($false))
 Set-Location -LiteralPath $dir
 # Resolve Windows TEMP 8.3 aliases through the same provider as Get-Location.
 $dir=(Get-Location).Path
 try {
  $values=@(& ([scriptblock]::Create($row.code)) 6>$null)
  $strings=@($values|ForEach-Object {if($null -ne $_){[string]$_}})
  $result+=@{name=$row.name;directory=$dir;values=$values;strings=$strings}
 } catch {$result+=@{name=$row.name;error=$_.Exception.Message}}
}
ConvertTo-Json -InputObject $result -Depth 14 -Compress
'''
  env={**os.environ,'PRACTICE_SHELL_CASES':str(cases),'PRACTICE_SHELL_ROOT':str(sandbox),'XDG_CACHE_HOME':str(sandbox/'cache'),'XDG_CONFIG_HOME':str(sandbox/'config'),'XDG_DATA_HOME':str(sandbox/'data')}
  proc=subprocess.run([pwsh,'-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',base64.b64encode(script.encode('utf-16le')).decode('ascii')],env=env,capture_output=True,text=True,encoding='utf-8',timeout=60)
  assert proc.returncode==0,proc.stderr
  native=json.loads(proc.stdout)
  for (name,code,expected),row in zip(fixtures,native):
   if 'error' in row:
    failures.append((name,row));continue
   def text(v):
    if isinstance(v,bool):return 'True' if v else 'False'
    if isinstance(v,str):
     if v.startswith(row['directory']):return 'C:\\Practice'+v[len(row['directory']):].replace('/','\\')
     return v
    return str(v)
   actual=[text(v)for v in row['strings'] if v is not None]
   matched=actual==expected[0]
   if not matched:failures.append((name,actual,expected[0]))
   records.append({'kind':'powershell','name':name,'passed':matched})
 else:print('PowerShell runtime unavailable: native PowerShell probes skipped')
 cmd=shutil.which('cmd.exe')
 # The case list lives outside the runtime guard so the expected total can
 # always be counted, even when cmd.exe is absent (R22-N29).
 cmd_cases=[
   ('variables','set X=1\necho %X%',['1']),
   ('quotes','echo "hello"',['"hello"']),
   ('block expansion','set X=before\n(\nset X=after\necho %X%\n)\necho %X%',['before','after']),
   ('delayed','setlocal EnableDelayedExpansion\nset N=0\nfor /L %%i in (1,1,3) do (\nset /a "N=N+1"\necho %N% !N!\n)',['0 1','0 2','0 3']),
   ('descending','for /L %%i in (3,-1,1) do echo %%i',['3','2','1']),
   ('octal hex','set /a "N=010+0x10"\necho %N%',['24']),
   ('wrap','set /a "N=2147483647+1"\necho %N%',['-2147483648']),
   ('call','call :show "a b"\necho done\ngoto :eof\n:show\necho %1\necho %~1\nexit /b',['"a b"','a b','done']),
   ('errorlevel','call :status\nif errorlevel 2 echo yes\ngoto :eof\n:status\nexit /b 3',['yes']),
   ('local restore','set X=outer\nsetlocal\nset X=inner\nendlocal\necho %X%',['outer']),
   ('compound','set N=5\nset /a "N*=1+2"\necho %N%',['15']),
   ('redirect','echo first>out.txt\necho second>>out.txt\ntype out.txt',['first','second']),
   ('pipe','echo apple|find "app"',['apple']),
  ]
 if cmd:
  for name,body,expected in cmd_cases:
   bat=sandbox/'probe.cmd';bat.write_bytes(('@echo off\r\n'+body.replace('\n','\r\n')+'\r\n').encode('ascii'))
   proc=subprocess.run([cmd,'/d','/q','/c',bat.name],cwd=sandbox,capture_output=True,text=True,timeout=10)
   matched=proc.stdout.splitlines()==expected
   if not matched:failures.append((name,proc.stdout,proc.stderr,expected))
   records.append({'kind':'cmd','name':name,'passed':matched})
 else:print('cmd.exe unavailable: native cmd probes skipped')
 # All exact teaching material also runs in fresh native directories. This is
 # a native validity check, separate from the expected-value comparisons above.
 for i,entry in enumerate(materials):
  runtime=pwsh if entry['kind']=='powershell' else cmd
  if not runtime:continue
  case_dir=sandbox/('material'+str(i));case_dir.mkdir();(case_dir/'logs').mkdir()
  for filename,content in [('notes.txt','学習メモ\r\n'),('readme.txt','Practice\r\n'),('data.csv','Name,Score\r\nAlice,80\r\n')]:
   (case_dir/filename).write_bytes(content.encode('utf-8'))
  path=case_dir/('lesson.ps1' if entry['kind']=='powershell' else 'lesson.cmd')
  code=entry['code']
  if entry['kind']=='powershell':
   path.write_text("$ErrorActionPreference='Stop'\n"+code,encoding='utf-8')
   command=[runtime,'-NoLogo','-NoProfile','-File',str(path)]
  else:
   # UTF-8 code page permits the exact Japanese teaching text and fixture file.
   path.write_bytes(('@echo off\r\nchcp 65001 >nul\r\n'+code.replace('\n','\r\n')+'\r\n').encode('utf-8'))
   command=[runtime,'/d','/q','/c',path.name]
  proc=subprocess.run(command,cwd=case_dir,env=env if entry['kind']=='powershell' else None,input='yes\n',capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=20)
  allowed=[0,3]if entry['kind']=='cmd' and entry['name']=='exit' else [0]
  matched=proc.returncode in allowed
  if not matched:failures.append((entry['kind'],entry['name'],proc.returncode,proc.stdout,proc.stderr))
  records.append({'kind':entry['kind'],'name':'material:'+entry['name'],'passed':matched})
Path('work/audit').mkdir(parents=True,exist_ok=True)
Path('work/audit/shell-native-results.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
# Skipped checks are never silently green (R22-N29). Expected totals are
# derived from the fixture/case/material lists themselves, so a missing
# runtime shows up as an explicit skipped count, a stderr warning, a
# passed:false summary, and a non-zero exit -- with or without
# --require-both. When both runtimes are present nothing is skipped and
# the behaviour (including the Windows CI --require-both job) is unchanged.
expected={'powershell':len(fixtures)+sum(1 for e in materials if e['kind']=='powershell'),'cmd':len(cmd_cases)+sum(1 for e in materials if e['kind']=='cmd')}
executed={'powershell':sum(r['kind']=='powershell'for r in records),'cmd':sum(r['kind']=='cmd'for r in records)}
skipped={kind:expected[kind]-executed[kind] for kind in expected}
skipped_total=sum(skipped.values());expected_total=sum(expected.values())
summary={'native_shell_checks':len(records),'powershell':executed['powershell'],'cmd':executed['cmd'],'expected_total':expected_total,'expected_powershell':expected['powershell'],'expected_cmd':expected['cmd'],'skipped':skipped_total,'skipped_powershell':skipped['powershell'],'skipped_cmd':skipped['cmd'],'passed':not failures and skipped_total==0}
print(json.dumps(summary))
if skipped_total:
 print(f"WARNING: {skipped_total} of {expected_total} native shell checks were NOT executed (powershell skipped: {skipped['powershell']}, cmd skipped: {skipped['cmd']}); this run is not a pass.",file=sys.stderr)
assert not failures,json.dumps(failures,ensure_ascii=True)
if skipped_total:
 sys.exit(f"native shell audit incomplete: {skipped_total} of {expected_total} checks skipped (powershell: {skipped['powershell']}, cmd: {skipped['cmd']})")
