// Deterministic adversarial corpus, isolated per type with a hard parent deadline.
import {Worker} from 'node:worker_threads';
import {definitions} from '../js/types/registry.js';
import fs from 'node:fs';
const loops={vba:'Do While True\nLoop',imagej:'while(1){}',cloudformation:'{"Items":'+ '['.repeat(70)+'0'+']'.repeat(70)+'}',powerautomate:JSON.stringify({actions:[{action:'Loop condition',condition:'true'},{action:'End'}]}),autohotkey:'Loop {\n}',uivision:JSON.stringify({Commands:[{Command:'while',Target:'true'},{Command:'end'}]}),powerapps:'Set(X, ForAll(Sequence(10001), Value))',python:'while True:\n    pass',r:'while(TRUE) {}',c:'int n=0; while(1){ n++; }',cpp:'int n=0; while(1){ n++; }',csharp:'int n=0; while(true){ n++; }',javascript:'while(true) {}'};
const chars='{}[]();"\'\\@#$🙂あ\n012abc+-*/';let seed=72641;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
const common=['','@@@','{'.repeat(90), '"unterminated','a'.repeat(100001),'// 日本語🙂\n','let 😀=1;','let 日本語=1;',...Array.from({length:32},()=>Array.from({length:50},()=>chars[random()%chars.length]).join(''))];
const results=[];
for(const d of definitions){
 const cases=[...common,loops[d.id]];
 const worker=new Worker(`import {parentPort,workerData} from 'node:worker_threads';import{getDefinition}from ${JSON.stringify(new URL('../js/types/registry.js',import.meta.url).href)};const d=getDefinition(workerData.id),out=[];for(const code of workerData.cases){let r;try{r=await d.simulate(code,structuredClone({...d.model.defaults,...(d.id==='autohotkey'?{event:null}:{})}));out.push({chars:code.length,paths:r.paths?.length,error:r.error||r.paths?.find(p=>p.error)?.error,truncated:r.truncated,reasons:r.reasons});}catch(e){out.push({chars:code.length,thrown:e.message});}}parentPort.postMessage(out);`,{eval:true,type:'module',workerData:{id:d.id,cases}});
 let timer;const result=await new Promise(resolve=>{timer=setTimeout(()=>{worker.terminate();resolve({timeout:true});},15000);worker.once('message',out=>resolve({out}));worker.once('error',e=>resolve({thrown:e.message}));});clearTimeout(timer);await worker.terminate();results.push({id:d.id,...result});console.log(d.id,result.out?.length,result.timeout||result.thrown||'completed');
}
fs.mkdirSync('work/audit',{recursive:true});fs.writeFileSync('work/audit/fuzz-results.json',JSON.stringify(results,null,2));
if(results.some(r=>r.timeout||r.thrown||r.out?.some(x=>x.thrown)))process.exitCode=1;
