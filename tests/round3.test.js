import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {getDefinition,definitions} from '../js/types/registry.js';
import {display} from '../js/engine.js';
import {formatModelValue,unknown} from '../js/core/contract.js';
import {unknownLabel} from '../js/core/presentation.js';
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/audit-blind-r3.json',import.meta.url)));
const run=async(id,code,model)=>{const d=getDefinition(id);return d.simulate(code,structuredClone(model||d.model.defaults));};
const errors=r=>[r.error,...(r.paths||[]).map(p=>p.error)].filter(Boolean);
const text=r=>(r.paths||[]).flatMap(p=>[...(p.trace||[]).map(t=>t.text),...(p.groups||[]).flatMap(g=>g.entries.map(e=>e[1]))]).join('\n');
for(const c of fixtures)test(`round3 blind: ${c.kind}/${c.name}`,async()=>{
 const r=await run(c.kind,c.code,c.model);
 if(c.error){assert.ok(errors(r).some(e=>new RegExp(c.error).test(e.message)),JSON.stringify(r));return;}
 assert.deepEqual(errors(r),[]);assert.equal(r.paths.length,c.paths);
 if(c.outputs)assert.deepEqual(r.paths[0].outputs.map(o=>o.text),c.outputs);
 if(c.allOutputs)assert.deepEqual(r.paths.map(p=>JSON.stringify(p.outputs.map(o=>o.text))).sort(),c.allOutputs.map(JSON.stringify).sort());
 if(c.allFragments)assert.deepEqual(r.paths.map(p=>JSON.parse(p.groups.find(g=>g.title.includes("断片")).entries[1][1])).map(JSON.stringify).sort(),c.allFragments.map(JSON.stringify).sort());
 if(c.fragment)assert.deepEqual(JSON.parse(r.paths[0].groups.find(g=>g.title.includes('断片')).entries[1][1]),c.fragment);
 assert.doesNotMatch(text(r),/"kind"\s*:|__class|__defaultSource|\(model\)|（model）|実行時に決まる（実行時に決まる/);
});
test('round3 unknown display strips nested wrappers without changing model identity',()=>{
 const a=unknown('model','cell-B2'),v={...unknown('unused'),op:'>=',a,b:80};
 const before=JSON.stringify(v);
 for(const format of [display,formatModelValue,unknownLabel]){const s=format(v);assert.match(s,/実行時に決まる：.*80/);assert.doesNotMatch(s,/\bmodel\b|実行時に決まる（/);assert.equal(s.match(/実行時に決まる/g).length,1);}
 assert.equal(JSON.stringify(v),before);
 assert.equal(unknownLabel(unknown('実行時に決まる（実行時に決まる（model） >= 80）')),'実行時に決まる：モデルで未指定の値 >= 80');
});
test('round3 recursive modeled objects never expose serialized markers',()=>{
 const el={kind:'element',tagName:'DIV',textContent:'結果',children:[]};el.children.push(el);
 const s=formatModelValue({dom:el,refs:[{kind:'pointer',object:'object-1',offset:0}],x:{kind:'NA'},c:{__class:'Box',N:2}});
 assert.doesNotMatch(s,/"kind"|__class|"tagName"/);assert.match(s,/DOM要素 <div>/);assert.match(s,/参照：/);assert.match(s,/Box のオブジェクト/);
});
for(const id of ['c','cpp'])for(const [code,expected] of [
 ['int n=(int)(-3.9); printf("%d",n);','-3'],
 ['double n=(double)7/2; printf("%f",n);','3.500000'],
 ['int n=(int)(float)2.9; printf("%d",n);','2'],
 ['int n=(char)65; printf("%d",n);','65'],
 ['int n=(signed char)-3; printf("%d",n);','-3'],
 ['int n=(short)1234; printf("%d",n);','1234'],
 ['double n=(unsigned)-1; printf("%f",n);','4294967295.000000'],
 ['int n=(int)(long)4.9; printf("%d",n);','4'],
 ['int n=(int)sizeof((unsigned char)999); printf("%d",n);','1'],
 ['int i=0; int n=(int)sizeof((double)i++); printf("%d %d",i,n);','0 8'],
])test('round3 native cast oracle '+id+': '+code,async()=>{const r=await run(id,code);assert.deepEqual(errors(r),[]);assert.deepEqual(r.paths[0].outputs.map(o=>o.text),[expected]);});
for(const id of ['c','cpp'])for(const code of ['int n=(int*)0;','int n=(const int)3;','int n=(long long)3;','int n=(void)3;'])test('round3 explicit unsupported cast '+id+': '+code,async()=>{const r=await run(id,code);assert.match(errors(r)[0].message,/キャストのこの形式は未対応/);assert.equal(errors(r)[0].category,'未対応');});
for(const id of ['c','cpp'])for(const [code,category] of [['char n=256;','環境依存'],['int n=1e30;','未定義動作'],['float n=1e100;','未定義動作'],['int n=(int)(float)1e100;','未定義動作'],['int n=(char)-1;','環境依存']])test('round3 unsafe scalar conversion stops '+id+': '+code,async()=>{const r=await run(id,code);assert.equal(errors(r)[0].category,category);});
test('round3 postfix trace distinguishes side effect and expression value',async()=>{const r=await run('c','int s=0; for(int i=0;i<2;i++){s+=i;} printf("%d",s);');assert.deepEqual(errors(r),[]);assert.ok(r.paths[0].trace.some(t=>/増やします（後置式の値は変更前の 0）/.test(t.text)));assert.deepEqual(r.paths[0].outputs.map(o=>o.text),['1']);});
test('round3 all templates final and trace presentation crosscheck',async()=>{for(const d of definitions)for(const t of d.templates){const r=await run(d.id,t.code,t.model);if(d.id!=='cloudformation')assert.doesNotMatch(text(r),/"kind"\s*:|__class|__defaultSource|\(model\)|（model）|実行時に決まる（実行時に決まる/,d.id+'/'+t.id);}});
for(const [code,expected] of [['MsgBox "2" + "3"',['5']],['MsgBox "2" + 3',['5']],['if "Ab" != "ab" {\nMsgBox "bad"\n} else {\nMsgBox "ok"\n}',['ok']],['if "Ab" !== "ab" {\nMsgBox "ok"\n}',['ok']]])test('round3 AHK numeric and equality oracle '+code,async()=>{const r=await run('autohotkey',code,{...getDefinition('autohotkey').model.defaults,event:null});assert.deepEqual(errors(r),[]);assert.deepEqual(r.paths[0].outputs.map(o=>o.text),expected);});
for(const [code,category] of [['x := 1/0','ZeroDivisionError'],['x := 3\nx /= 0','ZeroDivisionError'],['x := "abc"+1','TypeError'],['x := 7//2','未対応'],['x := 2^3','未対応']])test('round3 AHK must not invent numeric results '+code,async()=>{const r=await run('autohotkey',code,{...getDefinition('autohotkey').model.defaults,event:null});assert.equal(errors(r)[0].category,category);});
test('round3 all previously reviewed reference texts still match their source record',()=>{
 const reviewed=JSON.parse(fs.readFileSync(new URL('../docs/audit/reference-r2.json',import.meta.url)));
 const reviewedKinds=new Set(reviewed.map(r=>r.kind));
 const current=definitions.filter(d=>reviewedKinds.has(d.id)).flatMap(d=>d.reference.map(r=>({kind:d.id,name:r.name,supported:r.supported,fields:Object.fromEntries(['description','returns','caution','example','source'].map(k=>[k,r[k]||'']))})));
 assert.equal(current.length,reviewed.length);
 for(const row of current){const source=reviewed.find(r=>r.kind===row.kind&&r.name===row.name);assert.ok(source,row.kind+'/'+row.name);assert.deepEqual(row.fields,source.fields);}
});
for(const id of ['c','cpp'])for(const [code,expected] of [
 ['printf("%u",(unsigned)-1+1);','0'],
 ['printf("%u",(unsigned)0-1);','4294967295'],
 ['printf("%u",-(unsigned)1);','4294967295'],
 ['printf("%d",-1 < (unsigned)1);','0'],
 ['printf("%d",(int)((long)-1+(unsigned)1));','0'],
 ['printf("%d",(int)((unsigned)7/2));','3'],
])test('round3 unsigned cast expression conversions '+id+': '+code,async()=>{const r=await run(id,code);assert.deepEqual(errors(r),[]);assert.deepEqual(r.paths[0].outputs.map(o=>o.text),[expected]);});
for(const code of ['int n=(Custom)3;','int n=(Custom*)0;','int n=static_cast<int>(3);','int n=int(3);'])test('round3 other cast forms stop explicitly: '+code,async()=>{const r=await run('cpp',code);assert.match(errors(r)[0].message,/キャストのこの形式は未対応/);assert.equal(errors(r)[0].category,'未対応');});
for(const id of ['c','cpp']){
 test('round3 sizeof type participates in integer arithmetic '+id,async()=>{const r=await run(id,'double x=2; double n=sizeof x/3; printf("%f",n);');assert.deepEqual(errors(r),[]);assert.deepEqual(r.paths[0].outputs.map(o=>o.text),['2.000000']);});
 test('round3 signed unary overflow is undefined '+id,async()=>{const r=await run(id,'int n=-(-2147483647-1);');assert.equal(errors(r)[0].category,'未定義動作');});
}
for(const [commands,outputs] of [
 [[['times','2'],['echo','${!times}'],['end','']],['1','2']],
 [[['times','2'],['times','3'],['echo','inner:${!times}'],['end',''],['echo','outer:${!times}'],['end','']],['inner:1','inner:2','inner:3','outer:1','inner:1','inner:2','inner:3','outer:2']],
 [[['times','2'],['continue',''],['echo','bad'],['end',''],['echo','done']],['done']],
 [[['times','3'],['echo','${!times}'],['break',''],['end',''],['echo','done']],['1','done']],
])test('round3 UI.Vision times internal counter and nesting '+JSON.stringify(commands),async()=>{
 const r=await run('uivision',JSON.stringify({Commands:commands.map(([Command,Target])=>({Command,Target,Value:''}))}));assert.deepEqual(errors(r),[]);assert.deepEqual(r.paths[0].outputs.map(o=>o.text),outputs);
});
for(const id of ['c','cpp'])test('round3 float arithmetic rounds before widening '+id,async()=>{const r=await run(id,'float a=16777216; float b=1; double n=a+b; printf("%f",n);');assert.deepEqual(errors(r),[]);assert.deepEqual(r.paths[0].outputs.map(o=>o.text),['16777216.000000']);});
for(const code of ['MsgBox 9007199254740993','x := 9007199254740991\nx++','MsgBox "9007199254740993"+0','MsgBox 9007199254740991+2'])test('round3 AHK integer precision is never guessed '+code,async()=>{const r=await run('autohotkey',code,{...getDefinition('autohotkey').model.defaults,event:null});assert.equal(errors(r)[0].category,'未確認');});
for(const [code,expected] of [['MsgBox(-"3")',['-3']],['MsgBox "0x10"+1',['17']]])test('round3 AHK numeric unary and hexadecimal strings '+code,async()=>{const r=await run('autohotkey',code,{...getDefinition('autohotkey').model.defaults,event:null});assert.deepEqual(errors(r),[]);assert.deepEqual(r.paths[0].outputs.map(o=>o.text),expected);});
test('round3 AHK nonnumeric unary is a TypeError',async()=>{const r=await run('autohotkey','x := -"abc"',{...getDefinition('autohotkey').model.defaults,event:null});assert.equal(errors(r)[0].category,'TypeError');});
for(const id of ['c','cpp'])for(const code of ['int n=(int)1e30;','int n=(char)1000.0;','char n=1000.0;'])test('round3 provably out-of-range floating conversion is UB '+id+': '+code,async()=>{const r=await run(id,code);assert.equal(errors(r)[0].category,'未定義動作');});
for(const code of ['class Box {public double D;} Box b=new Box(); b.D=2; b.D/=3; Console.WriteLine(b.D);','double[] a={2}; a[0]/=3; Console.WriteLine(a[0]);'])test('round3 C# compound floating field and array: '+code,async()=>{const r=await run('csharp',code);assert.deepEqual(errors(r),[]);assert.deepEqual(r.paths[0].outputs.map(o=>o.text),[String(2/3)]);});
test('round3 C# float addition rounds before widening',async()=>{const r=await run('csharp','float a=16777216; float b=1; double n=a+b; Console.WriteLine(n);');assert.deepEqual(errors(r),[]);assert.deepEqual(r.paths[0].outputs.map(o=>o.text),['16777216']);});
for(const id of ['c','cpp','csharp'])test('round3 float literal rounds at the literal: '+id,async()=>{const code=id==='csharp'?'double n=2.9f; Console.WriteLine(n>2.9);':'double n=2.9f; printf("%d",n>2.9);';const r=await run(id,code);assert.deepEqual(errors(r),[]);assert.deepEqual(r.paths[0].outputs.map(o=>o.text),[id==='csharp'?'True':'1']);});
