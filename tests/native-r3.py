"""Independent execution of newly derived round-3 samples and scalar cast oracles."""
import json, subprocess, tempfile, sys, shutil, os
from pathlib import Path
root=Path(__file__).resolve().parents[1]
blind=json.loads((root/'tests/fixtures/audit-blind-r3.json').read_text())
cast=[('int n=(int)(-3.9); printf("%d",n);','-3'),('double n=(double)7/2; printf("%f",n);','3.500000'),('int n=(int)(float)2.9; printf("%d",n);','2'),('int n=(char)65; printf("%d",n);','65'),('int n=(signed char)-3; printf("%d",n);','-3'),('int n=(short)1234; printf("%d",n);','1234'),('double n=(unsigned)-1; printf("%f",n);','4294967295.000000'),('int n=(int)(long)4.9; printf("%d",n);','4'),('int n=(int)sizeof((unsigned char)999); printf("%d",n);','1'),('int i=0; int n=(int)sizeof((double)i++); printf("%d %d",i,n);','0 8')]
cast += [('printf("%u",(unsigned)-1+1);','0'),('printf("%u",(unsigned)0-1);','4294967295'),('printf("%u",-(unsigned)1);','4294967295'),('printf("%d",-1 < (unsigned)1);','0'),('printf("%d",(int)((long)-1+(unsigned)1));','0'),('printf("%d",(int)((unsigned)7/2));','3')]
cast += [('double x=2; double n=sizeof x/3; printf("%f",n);','2.000000')]
cast += [('float a=16777216; float b=1; double n=a+b; printf("%f",n);','16777216.000000')]
cast += [('int i=0; int before=i++; printf("%d %d",before,i);','0 1')]
cast += [('double n=2.9f; printf("%d",n>2.9);','1')]
records=[]
with tempfile.TemporaryDirectory() as tmp:
 for lang,compiler,suffix,std in [('c','gcc','c','c17'),('cpp','g++','cpp','c++17')]:
  valid=[(c['code'],''.join(c['outputs'])) for c in blind if c['kind']==lang and c['outputs'] and not c['error']]+cast
  for i,(body,expected) in enumerate(valid):
   code='#include <stdio.h>\nint main(void){'+body+' return 0;}'
   src=Path(tmp)/('r3.'+suffix);exe=Path(tmp)/'r3';src.write_text(code)
   compile_=subprocess.run([compiler,'-std='+std,'-Wall','-Wextra',str(src),'-o',str(exe)],text=True,capture_output=True,timeout=15)
   assert compile_.returncode==0,(body,compile_.stderr)
   actual=subprocess.run([str(exe)],text=True,capture_output=True,timeout=3);assert actual.returncode==0
   assert actual.stdout==expected,(lang,body,actual.stdout,expected)
   records.append({'kind':lang,'sample':i,'expected':expected,'actual':actual.stdout})
 for c in blind:
  if c['kind']=='python' and c['outputs'] and not c['error']:
   actual=subprocess.run([sys.executable,'-c',c['code']],text=True,capture_output=True,timeout=3)
   assert actual.returncode==0 and actual.stdout.splitlines()==c['outputs'],(c,actual.stdout,actual.stderr)
   records.append({'kind':'python','sample':c['name'],'actual':actual.stdout})
 # JS's independent language runtime, with no browser/DOM fixture substituted.
 js=[c for c in blind if c['kind']=='javascript' and c['outputs'] and 'document.' not in c['code']]
 for c in js:
  script='import vm from "node:vm"; const out=[]; vm.runInNewContext('+json.dumps(c['code'])+', {console:{log:(...v)=>out.push(v.map(String).join(" "))}}); console.log(JSON.stringify(out));'
  actual=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],text=True))
  assert actual==c['outputs'],(c,actual);records.append({'kind':'javascript','sample':c['name'],'actual':actual})
 # Independently validate the unknown input combinations and failure classification.
 for a,b in [('y','y'),('y','n'),('n','y'),('n','n')]:
  c=next(c for c in blind if c['name']=='two independent inputs')
  actual=subprocess.run([sys.executable,'-c',c['code']],input=a+'\n'+b+'\n',text=True,capture_output=True,timeout=3)
  expected=['1' if a=='y' else '0','2' if b=='y' else '3'];assert actual.stdout.splitlines()==expected
  records.append({'kind':'python','sample':'two inputs '+a+b,'actual':actual.stdout})
 c=next(c for c in blind if c['kind']=='python' and c['error'])
 actual=subprocess.run([sys.executable,'-c',c['code']],text=True,capture_output=True,timeout=3);assert actual.returncode!=0 and 'IndexError' in actual.stderr
 records.append({'kind':'python','sample':'IndexError','actual':'IndexError'})
 c=next(c for c in blind if c['kind']=='cloudformation' and c['name']=='handler step loop')
 child=c['code']+'\nimport json\nprint(json.dumps(handler({"requestId":"r3","fragment":{},"params":{}},None)))'
 actual=json.loads(subprocess.check_output([sys.executable,'-c',child],text=True,timeout=3));assert actual=={'requestId':'r3','status':'success','fragment':{'total':12}}
 records.append({'kind':'cloudformation','sample':'Python handler only; no AWS deployment','actual':actual})
 script='import vm from "node:vm";try{vm.runInNewContext("let x=1; {console.log(x); let x=2;}",{console});process.exit(1)}catch(e){if(e.name!=="ReferenceError")throw e;console.log(e.name)}'
 actual=subprocess.check_output(['node','--input-type=module','-e',script],text=True).strip();assert actual=='ReferenceError'
 records.append({'kind':'javascript','sample':'TDZ ReferenceError','actual':actual})
 # Optional native C# regressions run in CI, whose SDK is available.
 if shutil.which('dotnet'):
  project=Path(tmp)/'cs-r3';project.mkdir()
  env={**os.environ,'DOTNET_CLI_HOME':str(Path(tmp)/'dotnet-home'),'DOTNET_CLI_TELEMETRY_OPTOUT':'1','DOTNET_NOLOGO':'1'}
  subprocess.run(['dotnet','new','console','--output',str(project)],env=env,text=True,capture_output=True,check=True,timeout=60)
  for name,body in [
   ('field','Box b=new Box(); b.D=2; b.D/=3; Console.WriteLine(b.D>0.66 && b.D<0.67);'),
   ('array','double[] a={2}; a[0]/=3; Console.WriteLine(a[0]>0.66 && a[0]<0.67);'),
   ('float','float a=16777216; float b=1; double n=a+b; double literal=2.9f; Console.WriteLine(n==16777216 && literal>2.9);'),
  ]:
   code='using System; class Box {public double D;} class Program {static void Main(){'+body+'}}'
   (project/'Program.cs').write_text(code)
   result=subprocess.run(['dotnet','run','--project',str(project),'--verbosity','quiet'],env=env,text=True,capture_output=True,timeout=60)
   assert result.returncode==0 and result.stdout.strip().splitlines()[-1]=='True',(name,result.stdout,result.stderr)
   records.append({'kind':'csharp','sample':name,'actual':'True'})
Path('work/audit').mkdir(parents=True,exist_ok=True)
Path('work/audit/native-r3.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
print(json.dumps({'new_native_oracles':len(records),'by_kind':{k:sum(r['kind']==k for r in records) for k in ['c','cpp','python','javascript','cloudformation','csharp']},'all_passed':True}))
