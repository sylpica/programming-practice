"""Compile the exact C/C++ teaching material, without adding headers or wrappers."""
import json, subprocess, tempfile, shutil, os
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=subprocess.check_output(['node','--input-type=module','-e',"import {definitions} from './js/types/registry.js';const rows=[];for(const d of definitions.filter(d=>['c','cpp','csharp','python'].includes(d.id))){const entry={id:d.id,templates:structuredClone(d.templates),reference:structuredClone(d.reference)};for(const section of ['templates','reference'])for(const item of entry[section]){const code=item.code??item.example;const r=await d.simulate(code,structuredClone(item.model||d.model.defaults));item.expectedStdout=r.paths?.[0]?.outputs?.map(o=>o.text).join('')??'';}rows.push(entry);}console.log(JSON.stringify(rows));"],cwd=root,text=True)
checks=[]
with tempfile.TemporaryDirectory() as tmp:
 dotnet=shutil.which('dotnet')
 if dotnet:
  csdir=Path(tmp)/'csharp';csdir.mkdir()
  csenv={**os.environ,'DOTNET_CLI_HOME':str(Path(tmp)/'dotnet-home'),'DOTNET_CLI_TELEMETRY_OPTOUT':'1','DOTNET_NOLOGO':'1'}
  created=subprocess.run([dotnet,'new','console','--no-restore','--output',str(csdir)],capture_output=True,text=True,env=csenv,timeout=40)
  assert created.returncode==0,created.stderr
 for d in json.loads(source):
  for section in ['templates','reference']:
   for entry in d[section]:
    code=entry['code'] if section=='templates' else entry['example'];name=entry.get('id',entry.get('name'))
    if d['id'] in ['c','cpp']:
     compiler,standard,suffix=('gcc','c17','.c') if d['id']=='c' else ('g++','c++17','.cpp')
     path=Path(tmp)/('example'+suffix);path.write_text(code)
     proc=subprocess.run([compiler,'-std='+standard,'-Wall','-Wextra',str(path),'-o',str(Path(tmp)/'example')],capture_output=True,text=True,timeout=15)
     assert proc.returncode==0,(d['id'],section,name,proc.stderr)
     if not name.endswith('-error'):
      execution=subprocess.run([str(Path(tmp)/'example')],capture_output=True,text=True,timeout=3)
      assert execution.returncode==0,(name,execution.stderr)
      assert execution.stdout==entry['expectedStdout'],(d['id'],name,execution.stdout,entry['expectedStdout'])
     checks.append([d['id'],section,name,'compile passed; UB lesson not executed' if name.endswith('-error') else 'compile and run passed'])
    if d['id']=='csharp' and dotnet:
     (csdir/'Program.cs').write_text(code)
     built=subprocess.run([dotnet,'build','--nologo','-o',str(csdir/'built')],cwd=csdir,capture_output=True,text=True,env=csenv,timeout=60)
     assert built.returncode==0,(name,built.stdout,built.stderr)
     execution=subprocess.run([dotnet,str(csdir/'built'/'csharp.dll')],input='input\n',capture_output=True,text=True,env=csenv,timeout=10)
     if name.endswith('-error'):assert execution.returncode!=0 and 'IndexOutOfRangeException' in execution.stderr,(name,execution.stderr)
     else:assert execution.returncode==0,(name,execution.stderr)
     checks.append([d['id'],section,name,'C# compile and expected execution passed'])
    if d['id']=='python':
     compile(code,str(name),'exec')
     if section=='templates' or entry.get('supported'):
      path=Path(tmp)/'example.py';path.write_text(code)
      execution=subprocess.run(['python3',str(path)],input='タロウ\n',capture_output=True,text=True,cwd=tmp,timeout=5)
      assert execution.returncode==0,(d['id'],name,execution.stderr)
      checks.append([d['id'],section,name,'CPython compile and run passed'])
     else:checks.append([d['id'],section,name,'CPython compile passed; external dependency/file not executed'])
Path('work/audit').mkdir(parents=True,exist_ok=True)
Path('work/audit/native-r2.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
print(json.dumps({'checks':len(checks),'C_CPP_stdout_matches_simulator':True,'Csharp_native_execution':sum(x[0]=='csharp' for x in checks),'Csharp_compiler_available':bool(dotnet),'python_execution':sum('compile and run' in x[3] and x[0]=='python' for x in checks)},ensure_ascii=False))
