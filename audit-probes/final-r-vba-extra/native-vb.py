import json,os,platform,subprocess,time,gzip,base64
from pathlib import Path
p=Path(__file__).resolve().parent;rows=json.loads((p/'vb-cases.json').read_text(encoding='utf-8'))
def vbquote(s):
 return ' & '.join(('ChrW('+str(ord(c))+')') if ord(c)>127 else ('\"'+c.replace('\"','\"\"')+'\"') for c in s) if any(ord(c)>127 for c in s) else '\"'+s.replace('\"','\"\"')+'\"'
number_fn = """Function NumberBits(v)
Dim q, ex, sg, frac, bits, i
q=CDbl(v): ex=0: sg=1
If q=0 Then
NumberBits="0": Exit Function
End If
If q<0 Then sg=-1: q=-q
Do While q>=2
q=q/2: ex=ex+1
Loop
Do While q<1
q=q*2: ex=ex-1
Loop
frac=q-1: bits="1"
For i=1 To 52
frac=frac*2
If frac>=1 Then
bits=bits & "1": frac=frac-1
Else
bits=bits & "0"
End If
Next
NumberBits=sg & ":" & ex & ":" & bits
End Function"""
lines=[number_fn,'On Error Resume Next','WScript.Echo "LOCALE:" & GetLocale()','Dim v, er, descr, txt, typ, nb','Err.Clear','v=Eval("Val(""1"")")','WScript.Echo "FEATURE:Val|" & Err.Number','Err.Clear']
for i,row in enumerate(rows):
 lines += ['Err.Clear','v=Empty','v=Eval('+vbquote(row['expr'])+')','er=Err.Number','descr=Err.Description','Err.Clear','typ=TypeName(v)','txt=""','If IsNull(v) Then','txt="<Null>"','ElseIf IsEmpty(v) Then','txt="<Empty>"','ElseIf IsArray(v) Then','txt="<Array>"','Else','txt=CStr(v)','End If','txt=Replace(Replace(txt,vbCr,"\\r"),vbLf,"\\n")','nb=""','If typ="Integer" Or typ="Long" Or typ="Double" Or typ="Single" Or typ="Currency" Then nb=NumberBits(v)','WScript.Echo "CASE:'+str(i)+'|" & er & "|" & typ & "|" & txt & "|" & nb & "|" & descr']
native_file=p/'native-file.txt'
lines.insert(1,'Set auditOut=CreateObject("Scripting.FileSystemObject").CreateTextFile('+vbquote(str(native_file))+',True,True)')
lines=[x.replace('WScript.Echo ', 'auditOut.WriteLine ') for x in lines]+['auditOut.Close']
script=p/'probe.vbs';script.write_text('\r\n'.join(lines)+'\r\n',encoding='ascii')
meta={'os':platform.platform(),'python':platform.python_version(),'runtime':'Windows Script Host VBScript (auxiliary; not Excel VBA)'}
try:
 started=time.perf_counter();r=subprocess.run([str(Path(os.environ['SystemRoot'])/'System32'/'cscript.exe'),'//Nologo','//E:VBScript','//U',str(script)],capture_output=True,timeout=60);meta.update(returncode=r.returncode,elapsedMs=(time.perf_counter()-started)*1000);stdout=(native_file.read_text(encoding='utf-16') if native_file.exists() else r.stdout.decode('utf-16le',errors='replace')).lstrip('\ufeff');stderr=r.stderr.decode('utf-16le',errors='replace');(p/'native-stdout.txt').write_text(stdout,encoding='utf-8');meta['stderr']=stderr;meta['stdoutBytes']=len(r.stdout);meta['stdoutPreview']=repr(r.stdout[:1500]);print('CSCRIPT_DIAGNOSTIC:'+json.dumps(meta),flush=True)
 for line in stdout.splitlines():
  if line.startswith('LOCALE:'):meta['locale']=line[7:]
  if line.startswith('FEATURE:'):
   fn,err=line[8:].split('|');meta.setdefault('features',{})[fn]={'errorNumber':int(err)}
  if not line.startswith('CASE:'):continue
  i,err,typ,text,bits,descr=line[5:].split('|',5);rows[int(i)]['native']={'errorNumber':int(err),'type':typ,'text':text,'numberBits':bits,'errorDescription':descr}
except (FileNotFoundError,subprocess.TimeoutExpired)as e:meta['unavailable']=str(e)
smoke=p/'smoke.vbs';smoke.write_text('WScript.Echo \"R7_SMOKE\"',encoding='ascii')
for exe in [str(Path(os.environ['SystemRoot'])/'System32'/'cscript.exe'),str(Path(os.environ['SystemRoot'])/'SysWOW64'/'cscript.exe')]:
 try:
  z=subprocess.run([exe,'//Nologo','//E:VBScript',str(smoke)],capture_output=True,timeout=15);meta.setdefault('smoke',[]).append({'exe':exe,'code':z.returncode,'stdout':repr(z.stdout),'stderr':repr(z.stderr)})
 except Exception as e:meta.setdefault('smoke',[]).append({'exe':exe,'exception':str(e)})
print('SMOKE_DIAGNOSTIC:'+json.dumps(meta.get('smoke')),flush=True)
missing=[i for i,r in enumerate(rows)if 'native'not in r];meta['missing']=missing
result={'meta':meta,'rows':rows};(p/'results-vb-native.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print('NATIVE_META:'+json.dumps(meta,ensure_ascii=False),flush=True);
encoded=base64.b64encode(gzip.compress(json.dumps(result,ensure_ascii=False,separators=(',',':')).encode('utf-8'))).decode('ascii')
for i in range(0,len(encoded),4096):print('EXTRA_VBS_GZIP_PART:'+encoded[i:i+4096],flush=True)
