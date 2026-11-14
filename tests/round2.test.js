import {test} from 'node:test';
import assert from 'node:assert/strict';
import {definitions,getDefinition} from '../js/types/registry.js';
import {formatValue} from '../js/core/contract.js';
const run=async(id,code,model)=>{let d=getDefinition(id);return d.simulate(code,structuredClone(model||d.model.defaults));};
const errors=r=>[r.error,...(r.paths||[]).map(p=>p.error)].filter(Boolean);
const out=r=>r.paths[0].outputs.map(o=>o.text);
for (const [kind,code,expected] of [
 ['javascript','console.log(typeof 5); console.log(typeof null); console.log(typeof missing); console.log(typeof undefined); console.log(typeof [1]);',['number','object','undefined','undefined','object']],
 ['c','char s[]="abc"; s[1]=\'X\'; printf("%s %c",s,\'!\');',['aXc !']],
 ['c','char s[3]="abc"; printf("%c", s[2]);',['c']],
 ['cpp','int n=1; int& r=n; r=4; cout << n; n=7; cout << r;',['4','7']],
 ['cpp','std::string a="ab"; a += "c"; std::string b=a+"d"; cout << b;',['abcd']],
 ['c','int i=0; for (;;) { i++; if(i==3) { break; } } printf("%d",i);',['3']],
 ['cpp','int i=0; for (;;) { i++; if(i==3) { break; } } cout << i;',['3']],
 ['c','int a[3]={1,2,3}; int n=sizeof a; int m=sizeof(int); int k=sizeof "abc"; printf("%d %d %d",n,m,k);',['12 4 4']],
 ['c','int x; int n=sizeof x; printf("%d",n);',['4']],
 ['r','print(mean(c("a","b"))); print(2);',['NA','2']],
]) test('round2 semantic oracle '+kind+': '+code,async()=>{let r=await run(kind,code);assert.deepEqual(errors(r),[]);assert.deepEqual(out(r),expected);if(kind==='r')assert.ok(r.paths[0].trace.some(t=>t.kind==='warning'));});
test('round2 typeof TDZ still raises ReferenceError',async()=>{let r=await run('javascript','console.log(typeof x); let x=1;');assert.equal(errors(r)[0].category,'ReferenceError');});
test('round2 undefined name classification',async()=>{let r=await run('javascript','console.log(missing);');assert.equal(errors(r)[0].category,'ReferenceError');});
test('round2 no null or unset expression placeholders or duplicate log step',async()=>{
 for(const [kind,code] of [['javascript','console.log(2);'],['autohotkey','MsgBox "hello"'],['powerapps','Set(x, 2)']]){
 let r=await run(kind,code,kind==='autohotkey'?{...getDefinition(kind).model.defaults,event:null}:undefined);assert.deepEqual(errors(r),[]);assert.ok(!r.paths[0].trace.some(t=>/式を評価します：(null|未設定)/.test(t.text)));if(kind==='javascript')assert.equal(r.paths[0].trace.length,1);
 }
});
test('round2 internal representations are human readable, including nested values',()=>{
 for(const v of [{kind:'NA'},{kind:'pointer',object:'object-1',offset:2},{kind:'uninitialized'},{__class:'Counter',Value:2},{kind:'data.frame',columns:{x:[{kind:'NA'}]}}])
 assert.doesNotMatch(formatValue({x:[v]}),/"kind"|__class|"columns"/);
});
test('round2 top-level Transform object and list object params',async()=>{
 for(const Transform of [{Name:'AddMetadata',Parameters:{Stage:'test'}},[{Name:'AddMetadata',Parameters:{Stage:'test'}}]]){
 const r=await run('cloudformation',JSON.stringify({Transform,Resources:{}}));assert.deepEqual(errors(r),[]);const fragment=JSON.parse(r.paths[0].groups.find(g=>g.title.includes('断片')).entries[1][1]);assert.equal(fragment.Metadata.Stage,'dev');assert.ok(r.paths[0].trace.some(t=>/paramsは空/.test(t.text)));
 }
 const unsupported = await run('cloudformation', JSON.stringify({Transform:{Name:'AWS::Include',Parameters:{Location:'s3://example/model.json'}}}));
 assert.equal(errors(unsupported)[0].category,'未対応');
});
test('round2 unterminated char string is undefined, not a guessed result',async()=>{let r=await run('c','char s[3]="abc"; printf("%s",s);');assert.equal(errors(r)[0].category,'未定義動作');assert.deepEqual(out(r),[]);});
test('round2 unbounded empty for is visibly limited',async()=>{let r=await run('c','for (;;) {}');assert.ok(r.truncated);assert.ok(r.reasons.length);});

test('round2 Python output plus assignment has one combined explanation',async()=>{const r=await run('python','x=print(1)');assert.deepEqual(errors(r),[]);assert.equal(r.paths[0].trace.length,1);assert.match(r.paths[0].trace[0].text,/表示.*代入/);});
test('round2 official UI.Vision missing locator stores #LNF and continues',async()=>{const r=await run('uivision',JSON.stringify({Commands:[{Command:'storeText',Target:'id=missing',Value:'x'},{Command:'storeValue',Target:'id=missing',Value:'y'},{Command:'echo',Target:'${x}/${y}'}]}));assert.deepEqual(errors(r),[]);assert.deepEqual(out(r),['#LNF/#LNF']);});
test('round2 typeof modeled built-ins and lexical shadowing',async()=>{const r=await run('javascript','console.log(typeof Math); console.log(typeof console.log); let Number=1; console.log(typeof Number);');assert.deepEqual(errors(r),[]);assert.deepEqual(out(r),['object','function','number']);});

test('round2 AHK SetTitleMatchMode returns the previous mode',async()=>{const d=getDefinition('autohotkey');const r=await run('autohotkey','old := SetTitleMatchMode(3)\nMsgBox old',{...d.model.defaults,event:null});assert.deepEqual(errors(r),[]);assert.deepEqual(out(r),['2']);});
test('round2 R numeric coercion warns while returning NA',async()=>{const r=await run('r','print(as.numeric(c("1","oops")))');assert.deepEqual(errors(r),[]);assert.deepEqual(out(r),['c(1, NA)']);assert.ok(r.paths[0].trace.some(t=>t.kind==='warning'));});
test('round2 reference return contracts and primary links cover every registered entry',()=>{for(const d of definitions)for(const r of d.reference){assert.ok(r.returns,d.id+'/'+r.name);assert.match(r.source,/^https:\/\//);}});

test('round2 human formatting handles cycles through internal records',()=>{const value={__class:'C'};value.self=value;assert.match(formatValue(value),/参照/);assert.doesNotMatch(formatValue(value),/__class/);});
test('round2 Switch hides evaluator scratch names',async()=>{const r=await run('powerapps','Switch(1, 1, Set(x, 2), Set(x, 3))');assert.deepEqual(errors(r),[]);assert.doesNotMatch(JSON.stringify(r.paths[0].trace),/__switch/);});
test('round2 R documented trimmed mean',async()=>{const r=await run('r','print(mean(c(1,2,3,100), trim=0.25))');assert.deepEqual(errors(r),[]);assert.deepEqual(out(r),['2.5']);});

test('round2 ending an inner reference scope does not end its target lifetime',async()=>{const r=await run('cpp','int n=1; int *p=&n; { int& alias=n; alias=4; } cout << *p; n=5; cout << n; int alias=8; cout << alias;');assert.deepEqual(errors(r),[]);assert.deepEqual(out(r),['4','5','8']);});
test('round2 sizeof character constant distinguishes C int and C++ char',async()=>{for(const [id,expected] of [['c','4'],['cpp','1']]){const r=await run(id,`int n=sizeof 'a'; ${id==='c'?'printf("%d",n);':'cout << n;'}`);assert.deepEqual(errors(r),[]);assert.deepEqual(out(r),[expected]);}});

test('round2 printf percent escapes preserve literal percent signs',async()=>{const r=await run('c','printf("100%% %s", "OK");');assert.deepEqual(errors(r),[]);assert.deepEqual(out(r),['100% OK']);});
test('round2 printf char rejects an incompatible floating argument',async()=>{const r=await run('c','printf("%c", 1.5);');assert.equal(errors(r)[0].category,'未定義動作');});

test('round2 sizeof does not invent sizes for unknown calls or array type syntax',async()=>{for(const code of ['int n=sizeof missing();','int n=sizeof(int[3]);','string s="x";']){const r=await run('c',code);assert.ok(errors(r).some(e=>e.category==='未対応'));}});
test('round2 sizeof C++ boolean expression uses its bool type',async()=>{const r=await run('cpp','int n=sizeof(1==2); int m=sizeof true; cout << n << m;');assert.deepEqual(errors(r),[]);assert.deepEqual(out(r),['11']);});

test('round2 C++ concatenation requires a std::string operand',async()=>{const r=await run('cpp','cout << ("a" + "b");');assert.ok(errors(r).length);const good=await run('cpp','std::string s="b"; cout << ("a"+s);');assert.deepEqual(errors(good),[]);assert.deepEqual(out(good),['ab']);});

test('round2 C++ string initialization reserves the terminator',async()=>{const r=await run('cpp','char s[3]="abc"; cout << s;');assert.equal(errors(r)[0].category,'CompileError');});
