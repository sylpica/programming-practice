import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {definitions,getDefinition} from '../js/types/registry.js';
const fixtures=name=>JSON.parse(fs.readFileSync(new URL('./fixtures/'+name,import.meta.url)));
const run=async(id,code,model)=>{const d=getDefinition(id);return d.simulate(code,structuredClone(model||d.model.defaults));};
const errors=r=>[r.error,...(r.paths||[]).map(p=>p.error)].filter(Boolean);
const outputs=r=>r.paths.map(p=>p.outputs.map(o=>o.text));
for(const c of fixtures('audit-blind.json'))test(`audit blind: ${c.kind}/${c.name}`,async()=>{
 const r=await run(c.kind,c.code,c.model);
 if(c.error){assert.ok(errors(r).some(e=>new RegExp(c.error).test(e.message)),JSON.stringify(r));return;}
 assert.deepEqual(errors(r),[]);assert.equal(r.paths.length,c.paths);
 if(c.outputs)assert.deepEqual(outputs(r)[0],c.outputs);
});
for(const c of fixtures('audit-templates.json'))test(`audit template oracle: ${c.kind}/${c.template}`,async()=>{
 const d=getDefinition(c.kind),t=d.templates.find(t=>t.id===c.template),r=await run(c.kind,t.code,t.model);
 assert.ok(!r.error,JSON.stringify(r.error));if(c.paths)assert.equal(r.paths.length,c.paths);
 if(c.error)assert.ok(r.paths.every(p=>p.error&&new RegExp(c.error).test(p.error.message)));
 else assert.deepEqual(errors(r),[]);
 if(c.outputs)assert.deepEqual(outputs(r).map(JSON.stringify).sort(),c.outputs.map(JSON.stringify).sort());
 if(c.numericAreas)outputs(r)[0].forEach((text,i)=>assert.ok(Math.abs(Number(text.split(' = ')[1])-c.numericAreas[i])<1e-5));
 if(c.unknownFileList)assert.ok(r.truncated||r.paths.some(p=>p.trace.some(t=>/実行時|未確定|不明/.test(t.text))));
 const p=r.paths[0];
 if(c.fragment || c.reviewed) {
  const after=JSON.parse(p.groups.find(g=>g.title.includes('断片')).entries[1][1]);
  if(c.fragment)assert.deepEqual(after,c.fragment);
  if(c.reviewed){assert.equal(after.ReviewedCount,c.reviewed);assert.ok(Object.values(after.Resources).every(x=>x.Metadata.Reviewed===true));}
 }
 if(c.windowText)assert.equal(p.model.windows[0].text,c.windowText);
 if(c.orderName)assert.equal(p.model.dataSources.Orders.at(-1).Name,c.orderName);
 if(c.template==='cells')assert.equal(p.cells.A1,100);
 if(c.template==='if')assert.equal(p.cells.C2,'合格');
 if(c.template==='for')assert.equal(p.cells.A5,15);
 if(c.template==='each')for(let i=1;i<=5;i++)assert.equal(p.cells['A'+i],100);
 if(c.template==='text')assert.equal(p.cells.A1,'EXCEL VBA');
 if(['cfn-transform','cfn-local','cfn-handler'].includes(c.template)){
  const group=p.groups.find(g=>g.title.includes('断片'));
  const after=JSON.parse(group.entries[1][1]);
  if(c.template==='cfn-local'){assert.equal(after.Resources.Bucket.Properties.Metadata.Stage,'test');assert.ok(!Object.hasOwn(after.Resources.Bucket.Properties,'Fn::Transform'));}
  else {assert.equal(after.Metadata.Stage,c.template==='cfn-handler'?'test':'dev');assert.ok(!Object.hasOwn(after,'Transform'));}
 }
 if(c.template==='pa-counter')assert.equal(p.vars.Count,3);
 if(c.template==='pa-files')assert.equal(p.model.files['C:/model/result.txt'],'ABC');
 if(c.template==='ahk-hotkey')assert.equal(p.model.windows[0].text,'こんにちは\n');
 if(c.template==='ahk-hotstring')assert.equal(p.model.windows[0].text,'by the way');
 if(c.template==='fx-record'){assert.equal(p.model.screen,'Detail');assert.deepEqual(p.model.dataSources.Orders,[{Name:'3',Done:false}]);}
});
const jsCases=[
 ['console.log(0 || "fallback"); console.log(2 && 3);',['fallback','3']],
 ['console.log("7" - 2); console.log("6" / "2"); console.log(null * 3);',['5','3','0']],
 ['console.log(2 ^ 3); console.log(2 == 3 < 4);',['1','false']],
 ['console.log(x); var x=1;',['undefined']],
 ['let x="2"; console.log(x++); console.log(x);',['2','3']],
 ['console.log(Number()); console.log(String()); console.log(Boolean());',['0','','false']],
 ['let x=1; {let x=2; console.log(x);} console.log(x);',['2','1']],
 ['var x=1; var x; console.log(x);',['1']],
 ['console.log(0 && missing); console.log("x" || missing);',['0','x']],
];
for(const [code,expected] of jsCases)test('audit ECMAScript oracle: '+code,async()=>{
 const native=[];vm.runInNewContext(code,{console:{log:(...x)=>native.push(x.map(String).join(' '))}});assert.deepEqual(native,expected);
 const r=await run('javascript',code);assert.deepEqual(errors(r),[]);assert.deepEqual(outputs(r)[0],expected);
});
for(const code of ['let x=1; {console.log(x); let x=2;}','const x;','let x=1; let x=2;','let x=1; {var x=2;}','let x=prompt("x"); x[0]=1; console.log(7);','console.log("\\u0041");','console.log("\\x41");','int x=2;','console.log(True);','let x=prompt("x"); console.log(x && alert("side effect"));'])test('audit JS must stop: '+code,async()=>{
 const r=await run('javascript',code);assert.ok(errors(r).length);assert.ok(r.paths.every(p=>!p.outputs.length));
});
test('audit ImageJ never keeps pre-filter pixel and stops unknown commands',async()=>{
 let r=await run('imagej','run("Gaussian Blur...", "sigma=2"); print(getPixel(0,0));');assert.match(outputs(r)[0][0],/実行時/);
 r=await run('imagej','run("Not A Command"); print(7);');assert.ok(errors(r).length);assert.deepEqual(outputs(r)[0],[]);
});
test('audit nested A_Index and restoration',async()=>{
 const d=getDefinition('autohotkey'),m={...d.model.defaults,event:null};
 const r=await run('autohotkey','MsgBox A_Index\nLoop 2 {\nLoop 2 {\nMsgBox A_Index\n}\nMsgBox A_Index\n}\nMsgBox A_Index',m);
 assert.deepEqual(errors(r),[]);assert.deepEqual(outputs(r)[0],['0','1','2','1','1','2','2','0']);
});
test('audit R logical index conceptually extends source with NA',async()=>{
 const r=await run('r','print(c(1,2)[c(TRUE,FALSE,TRUE)]);');assert.deepEqual(outputs(r)[0],['c(1, NA)']);
});
test('audit C++ bool arithmetic promotes to int',async()=>{const r=await run('cpp','bool x=true; cout << (x+1);');assert.deepEqual(errors(r),[]);assert.deepEqual(outputs(r)[0],['2']);});
test('audit managed array writes check element type',async()=>{const r=await run('csharp','int[] a={1}; a[0]="bad"; Console.WriteLine(a[0]);');assert.ok(errors(r).length);assert.deepEqual(outputs(r)[0],[]);});
test('audit managed array element defaults',async()=>{const r=await run('csharp','bool[] a=new bool[2]; Console.WriteLine(a[0]);');assert.deepEqual(errors(r),[]);assert.deepEqual(outputs(r)[0],['False']);});
test('audit Python bound methods, aliases and method lexical scope',async()=>{
 const r=await run('python','x=1\nclass C:\n    x=2\n    def __init__(self):\n        self.n=0\n    def inc(self):\n        self.n += 1\n        return self.n\n    def outer(self):\n        return x\na=C()\nb=a\nc=C()\nprint(b.inc(), a.inc(), c.inc(), a.outer())');assert.deepEqual(errors(r),[]);assert.deepEqual(outputs(r)[0],['1 2 1 1']);
});
for(const code of ['import csv\nprint(7)','with open("model.txt") as f:\n    print(7)','class D(Base):\n    pass\nprint(7)','print(lambda x: x)'])test('audit Python unsupported stops: '+code,async()=>{const r=await run('python',code);assert.ok(errors(r).length);assert.ok(!r.paths.some(p=>p.outputs.some(o=>o.text==='7')));});
test('audit malformed macro handler does not silently remove all paths',async()=>{const d=getDefinition('cloudformation'),m=structuredClone(d.model.defaults);m.macros.Bad='def broken(';const r=await run('cloudformation','{"Transform":"Bad"}',m);assert.ok(errors(r).length);});
test('audit nested macro cross product reports the 2000 path cap',async()=>{
 const d=getDefinition('cloudformation'),m=structuredClone(d.model.defaults);
 m.macros.B='def handler(event, context):\n    x=input()\n    if x == "a":\n        f={"v":1}\n    else:\n        f={"v":2}\n    return {"requestId":event["requestId"],"status":"success","fragment":f}';
 const code=JSON.stringify({Items:Array.from({length:12},()=>({'Fn::Transform':{Name:'B'}}))});
 const r=await run('cloudformation',code,m);assert.ok(!r.error,JSON.stringify(r.error));assert.equal(r.paths.length,2000);assert.equal(r.truncated,true);assert.ok(r.reasons.length);
});

for(const d of definitions) for(const ref of d.reference.filter(r=>r.supported))test('audit runnable reference: '+d.id+'/'+ref.name,async()=>{const r=await run(d.id,ref.example);assert.deepEqual(errors(r),[]);assert.ok(r.paths.length);});
test('audit R empty index and NULL index have different meanings',async()=>{const r=await run('r','x <- c(1,2)\nprint(x[])\nprint(x[NULL])');assert.deepEqual(errors(r),[]);assert.deepEqual(outputs(r)[0],['c(1, 2)','c()']);});
test('audit C# arrays share their reference on assignment',async()=>{const r=await run('csharp','int[] a={1}; int[] b=a; b[0]=2; Console.WriteLine(a[0]);');assert.deepEqual(errors(r),[]);assert.deepEqual(outputs(r)[0],['2']);});
test('audit C++ bool output uses 0 and 1 by default',async()=>{const r=await run('cpp','cout << true << false;');assert.deepEqual(errors(r),[]);assert.deepEqual(outputs(r)[0],['10']);});
test('audit AHK while accepts an unparenthesized expression',async()=>{const d=getDefinition('autohotkey');const r=await run('autohotkey','n := 0\nwhile n < 2 {\nn += 1\n}\nMsgBox n',{...d.model.defaults,event:null});assert.deepEqual(errors(r),[]);assert.deepEqual(outputs(r)[0],['2']);});
test('audit JavaScript refuses unsafe mixed coercive unknown predicates',async()=>{const r=await run('javascript','let x=prompt("x"); if(x==1){console.log("unsafe");}');assert.ok(errors(r).length);assert.ok(!outputs(r).flat().includes('unsafe'));});
test('audit JSON.stringify never serializes internal unknown markers',async()=>{const r=await run('javascript','console.log(JSON.stringify({x:prompt("x")}));');assert.deepEqual(errors(r),[]);assert.match(outputs(r)[0][0],/実行時/);assert.doesNotMatch(outputs(r)[0][0],/"kind"/);});
test('audit ImageJ external metadata only comes from an explicit model',async()=>{let r=await run('imagej','open("/outside/file.tif"); print(bitDepth());');assert.ok(errors(r).length);assert.deepEqual(outputs(r)[0],[]);r=await run('imagej','print(getFileList("/outside/"));');assert.match(outputs(r)[0][0],/実行時/);});
test('audit ImageJ template processes exactly its two explicit model TIFFs',async()=>{const d=getDefinition('imagej'),r=await run('imagej',d.templates[8].code);assert.deepEqual(errors(r),[]);assert.equal(r.paths.length,1);assert.equal(r.paths[0].trace.filter(t=>/明示したモデルファイル.*を開きます/.test(t.text)).length,2);});
test('audit ImageJ log is natural logarithm rather than a logging alias',async()=>{const r=await run('imagej','print(log(1));');assert.deepEqual(errors(r),[]);assert.deepEqual(outputs(r)[0],['0']);});
test('audit ImageJ unknown writes cannot preserve stale pixels',async()=>{const r=await run('imagej','x=getNumber("x",0); setPixel(x,0,7); print(getPixel(0,0));');assert.ok(errors(r).length);assert.deepEqual(outputs(r)[0],[]);});
test('audit DOM IDs never resolve inherited object properties',async()=>{const r=await run('javascript','console.log(document.getElementById("constructor") === null); console.log(document.querySelector("#__proto__") === null);');assert.deepEqual(errors(r),[]);assert.deepEqual(outputs(r)[0],['true','true']);});
test('audit C# repeated console reads are independent runtime inputs',async()=>{const r=await run('csharp','while(Console.ReadLine()=="a"){Console.WriteLine("A");}');assert.equal(r.paths.length,4);assert.equal(r.truncated,true);});
test('audit dialects refuse foreign declarations and unmodeled type inference',async()=>{for(const [id,code] of [['r','int x=1; print(x);'],['c','cout << 1;'],['c','let x=1;'],['cpp','auto x=1.5; cout << x/2;'],['csharp','var x=1.5; Console.WriteLine(x/2);']]){const r=await run(id,code);assert.ok(errors(r).length,id);assert.ok(!r.paths.some(p=>p.outputs.length));}});
test('every practice type has multiple templates from basics through applications',()=>{for(const d of definitions){assert.ok(d.templates.length>=6,d.id);assert.ok(d.templates.some(t=>t.level==='基礎'),d.id);assert.ok(d.templates.some(t=>t.level==='実践'),d.id);assert.ok(d.templates.some(t=>t.level==='応用'),d.id);assert.equal(new Set(d.templates.map(t=>t.id)).size,d.templates.length);}});
