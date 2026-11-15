import base64,json,subprocess,tempfile,urllib.request,zipfile,time,os
from pathlib import Path
root=Path(__file__).resolve().parents[1];rows=[]
pwsh=os.environ.get('PWSH_AUDIT_PATH','pwsh')
with tempfile.TemporaryDirectory() as td:
 p=Path(td)
 url='https://github.com/AutoHotkey/AutoHotkey/releases/download/v2.0.19/AutoHotkey_2.0.19.zip'
 urllib.request.urlretrieve(url,p/'ahk.zip')
 zipfile.ZipFile(p/'ahk.zip').extractall(p/'ahk')
 exe=next((p/'ahk').rglob('AutoHotkey64.exe'))
 for expr in ['"abc".Length','"".Length','[1,2].Length','!"0"','IsSet(1)','A_Space.Length']:
  f=p/'probe.ahk'; f.write_text('#Requires AutoHotkey v2.0\ntry {\n FileAppend String('+expr+') "`n", "*"\n} catch as e {\n FileAppend Type(e) ": " e.Message "`n", "*"\n}\n',encoding='utf-8-sig')
  v=subprocess.run([str(exe),'/ErrorStdOut',str(f)],capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=10)
  rows.append(dict(kind='autohotkey',expression=expr,stdout=v.stdout,stderr=v.stderr,returncode=v.returncode))
 ps=['$null * 5','5 * $null','$null / 5','$null - 5','1 -eq "1.4"','1 -eq "1.6"','2 -eq "1.6"','0 -eq ""',"'x' * 2147483648",'$PSVersionTable.PSVersion.ToString()']
 for code in ps:
  script="$ErrorActionPreference='Stop'; try {ConvertTo-Json -InputObject @{values=@(& {"+code+"})} -Depth 10 -Compress} catch {ConvertTo-Json -InputObject @{error=$_.Exception.Message} -Compress}"
  v=subprocess.run([pwsh,'-NoProfile','-NonInteractive','-EncodedCommand',base64.b64encode(script.encode('utf-16le')).decode()],capture_output=True,text=True,encoding='utf-8',timeout=10)
  rows.append(dict(kind='powershell',code=code,stdout=v.stdout,stderr=v.stderr,returncode=v.returncode))
 bodies=[
  'double x; Console.WriteLine(double.TryParse("0x10",out x)); Console.WriteLine(x);',
  'double x; Console.WriteLine(double.TryParse("NaN",out x)); Console.WriteLine(x);',
  'double x; Console.WriteLine(double.TryParse("1,000",out x)); Console.WriteLine(x);',
  'int x; Console.WriteLine(int.TryParse(null,out x)); Console.WriteLine(x);',
 ]
 for i,body in enumerate(bodies):
  code='using System; public class Probe'+str(i)+' {public static void Run(){'+body+'}}'
  script="Add-Type -TypeDefinition @'\n"+code+"\n'@; [Probe"+str(i)+"]::Run()"
  v=subprocess.run(['pwsh','-NoProfile','-EncodedCommand',base64.b64encode(script.encode('utf-16le')).decode()],capture_output=True,text=True,encoding='utf-8',timeout=15)
  rows.append(dict(kind='csharp',code=code,stdout=v.stdout,stderr=v.stderr,returncode=v.returncode))
result=dict(rows=rows)
(root/'audit-probes/results-extra.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=True,indent=2))
