import sys
sys.stdout.reconfigure(encoding="utf-8")
import subprocess,json,time,os
from pathlib import Path
p=Path(__file__).resolve().parent;rows=[]
for times in [10000000,100000000,1000000000]:
 code='a <- rep(c(), times='+str(times)+', length.out=1)'
 js="import {getDefinition}from'../../js/types/registry.js';const d=getDefinition('r');const t=performance.now();const r=await d.simulate("+json.dumps(code)+",structuredClone(d.model.defaults));console.log(JSON.stringify({ms:performance.now()-t,truncated:r.truncated,reasons:r.reasons,error:r.error,paths:r.paths?.map(p=>({error:p.error,outputs:p.outputs,vars:p.vars}))}));"
 (p/'perf.mjs').write_text(js,encoding='utf-8')
 start=time.perf_counter()
 try:
  r=subprocess.run(['node',str(p/'perf.mjs')],capture_output=True,text=True,encoding='utf-8',timeout=4);row={'code':code,'stdout':r.stdout,'stderr':r.stderr,'returncode':r.returncode,'wallMs':(time.perf_counter()-start)*1000}
 except subprocess.TimeoutExpired:row={'code':code,'timeoutSeconds':4,'wallMs':(time.perf_counter()-start)*1000}
 rows.append(row);print(row,flush=True)
(p/'results-step3-performance.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding="utf-8")

print("PERF_JSON_START")
print(json.dumps(rows,ensure_ascii=True))
print("PERF_JSON_END")
