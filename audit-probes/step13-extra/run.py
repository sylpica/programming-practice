from pathlib import Path
import subprocess,json,os,platform,gzip,base64,time
p=Path(__file__).resolve().parent
(p/'model.csv').write_text('x,y\n1,4\n2,5\n3,6\n',encoding='utf-8')
start=time.perf_counter();x=subprocess.run(['Rscript','--vanilla',str(p/'probes.R')],cwd=p,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=120);elapsed=(time.perf_counter()-start)*1000
(p/'results-native-stdout.txt').write_text(x.stdout,encoding='utf-8');(p/'results-native-stderr.txt').write_text(x.stderr,encoding='utf-8')
rows=json.loads((p/'cases.json').read_text(encoding='utf-8'));native=[]
for line in x.stdout.splitlines():
 if '\t'not in line:continue
 i,raw=line.split('\t',1)
 if not i.isdigit():continue
 native.append(dict(index=int(i),name=rows[int(i)]['name'],native=json.loads(raw)))
assert len(native)==len(rows),(len(native),len(rows),x.stderr[:500])
version=subprocess.run(['Rscript','--vanilla','-e','cat(R.version.string)'],capture_output=True,text=True,encoding='utf-8').stdout
metadata=dict(platform=platform.platform(),R=version,nativeBatchMs=elapsed,returncode=x.returncode,rows=native)
(p/'results-native.json').write_text(json.dumps(metadata,ensure_ascii=False),encoding='utf-8')
subprocess.run(['node',str(p/'app.mjs')],cwd=p.parents[1],check=True,timeout=90)
for name in ['native','app']:
 data=(p/('results-'+name+'.json')).read_bytes();encoded=base64.b64encode(gzip.compress(data)).decode()
 for i in range(0,len(encoded),4096):print(name.upper()+'_GZIP_PART:'+encoded[i:i+4096],flush=True)
print('SUMMARY:'+json.dumps(dict(count=len(native),R=version,platform=platform.platform(),nativeBatchMs=elapsed)),flush=True)
