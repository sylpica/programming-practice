import sys
sys.stdout.reconfigure(encoding="utf-8")
import json,os,subprocess,time,shutil
from pathlib import Path
p=Path(__file__).resolve().parent;project=p/'csharp-native';project.mkdir(exist_ok=True)
(project/'Audit.csproj').write_text('<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework><ImplicitUsings>disable</ImplicitUsings><Nullable>disable</Nullable><EnableNETAnalyzers>false</EnableNETAnalyzers></PropertyGroup></Project>')
env={**os.environ,'DOTNET_CLI_HOME':str(p/'dotnet-home'),'DOTNET_CLI_TELEMETRY_OPTOUT':'1','DOTNET_NOLOGO':'1','NUGET_PACKAGES':str(p/'nuget'),'DOTNET_SKIP_FIRST_TIME_EXPERIENCE':'1'}
dotnet=os.environ.get('R7_DOTNET',shutil.which('dotnet') or '/workspace/work/dotnet-sdk/dotnet');rows=[]
for i,c in enumerate(json.loads((p/'csharp-cases.json').read_text())):
 (project/'Program.cs').write_text(c['code'],encoding='utf-8')
 start=time.perf_counter()
 try:
  b=subprocess.run([dotnet,'build','--nologo','-v:q','-o',str(project/'built')],cwd=project,env=env,capture_output=True,text=True,timeout=45)
  row={**c,'compileReturn':b.returncode,'compileOut':b.stdout,'compileErr':b.stderr,'buildMs':(time.perf_counter()-start)*1000}
  if b.returncode==0:
   r=subprocess.run([dotnet,str(project/'built/Audit.dll')],cwd=project,env=env,input='input\n',capture_output=True,text=True,timeout=5)
   row.update(returncode=r.returncode,stdout=r.stdout,stderr=r.stderr)
 except subprocess.TimeoutExpired as e:row={**c,'timeout':str(e)}
 rows.append(row)
 (p/'results-step2-csharp.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
 print(i,c['name'],row.get('compileReturn'),row.get('returncode'),flush=True)

print("CSHARP_JSON_START")
print(json.dumps(rows,ensure_ascii=True))
print("CSHARP_JSON_END")
