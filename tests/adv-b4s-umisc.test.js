import { test} from "node:test";
import assert from "node:assert/strict";
import { getDefinition} from "../js/types/registry.js";
import { referenceAdvanced as ref10} from "../js/types/r/reference-advanced-part10.js";
import { names as names10} from "../js/types/r/names-advanced-part10.js";
import { referenceAdvanced as refP1} from "../js/types/r/reference-advanced-part1.js";
import { referenceAdvanced as refP2} from "../js/types/r/reference-advanced-part2.js";
import { referenceAdvanced as refP5} from "../js/types/r/reference-advanced-part5.js";
import { names as namesP1} from "../js/types/r/names-advanced-part1.js";
import { names as namesP2} from "../js/types/r/names-advanced-part2.js";
import { names as namesP5} from "../js/types/r/names-advanced-part5.js";
import { builtins} from "../js/types/r/functions-advanced-utilsmisc.js";
import { definition} from "../js/types/r/index.js";

// 高度モード B4S・R utils その他全般班（umisc）。
// 期待値は実 R 4.3.3（/usr/bin/Rscript）の実測：
// - 名前の実在は utils 名前空間の機械確認（exists／is.function）による。
// - formatUL／formatOL は、固定65ケース＋ランダム300ケースの差分
// バッテリで JS 実装と実 R（LC_ALL=C.UTF-8）を突き合わせ全件一致を
// 確認済み（報告書 ADV-B4S-umisc.md）。
// ハンドラは集約ファイルへの配線前なので、stest 班の前例と同じく
// fake ctx で直接検証する。

const SLICE = ["BATCH","COMPILE","utils-package","utils","completion","findMatches","rc.settings","rcompgen",".AtNames",".DollarNames","REMOVE","getClipboardFormats","readClipboard","writeClipboard","DLL.version","INSTALL","R_INSTALL_STAGED","R_INSTALL_TAR","LINK","build","check","Question","?","RHOME","RShowDoc","loadRconsole","Rconsole","Rdevga","Rprof","Rprofmem","Rscript","RSiteSearch","Rtangle","RtangleFinish","RtangleRuncode","RtangleSetup","RtangleWritedoc","makeRweaveLatexCodeRunner","RweaveLatex","RweaveLatexFinish","RweaveLatexOptions","RweaveLatexSetup","RweaveLatexWritedoc","SHLIB","Stangle","Sweave","SweaveSyntaxLatex","SweaveSyntaxNoweb","SweaveSyntConv","View","alarm","apropos","find","arrangeWindows","askYesNo","aspell","aspell-utils","aspell_package_C_files","aspell_package_Rd_files","aspell_package_R_files","aspell_package_vignettes","aspell_write_personal_dictionary_file","available.packages","R_AVAILABLE_PACKAGES_CACHE_CONTROL_MAX_AGE","bibentry","format.bibentry","format.citation","print.bibentry","print.citation","sort.bibentry","toBibtex.bibentry","browseEnv","wsbrowser","browseURL","browseVignettes","print.browseVignettes","bug.report","changedFiles","fileSnapshot","print.changedFiles","charClass","choose.dir","choose.files","Filters","chooseBioCmirror","getBioCmirrors","chooseCRANmirror","getCRANmirrors","CITATION","citation","citFooter","citHeader","readCitationFile","cite","citeNatbib","citEntry","close.socket","contrib.url","create.post","data.entry","dataentry","de","debugcall","undebugcall","debugger","dump.frames","limitedLabels","demo","download.file","download.packages","edit","emacs","pico","vi","xedit","xemacs","edit.data.frame","example","file.edit","findCRANmirror","findLineNum","setBreakpoint","fix","flush.console","formatOL","formatUL","argsAnywhere","getAnywhere","print.getAnywhere","[.getAnywhere","assignInMyNamespace","assignInNamespace","fixInNamespace","getFromNamespace","getParseData","getParseText","getS3method","getWindowsHandle","getWindowsHandles","globalVariables","suppressForeignCheck","clrhash","format.hashtab","gethash","hashtab","is.hashtab","length.hashtab","maphash","numhash","print.hashtab","remhash","sethash","str.hashtab","typhash","[[.hashtab","help","help.request","help.search","print.hsearch","??","help.start","hsearch_db","hsearch_db_concepts","hsearch_db_keywords","install.packages","installed.packages","isS3method","isS3stdGeneric","localeToCharset","ls.str","lsf.str","print.ls_str","maintainer","make.packages.html","make.socket","print.socket","menu","format.MethodsFunction","methods","print.MethodsFunction",".S3methods","checkCRAN","mirror2html","mirrorAdmin","news","print.news_db","nsl","format.object_size","object.size","print.object_size","package.skeleton","asDateBuilt","packageDate","packageDescription","packageVersion","print.packageDescription","packageName","packageStatus","print.packageStatus","summary.packageStatus","update.packageStatus","upgrade.packageStatus","page","as.character.person","as.person","c.person","format.person","person","print.person","toBibtex.person","$.person","[.person","as.personList","personList","process.events","prompt","promptImport","promptData","promptPackage","read.socket","write.socket","readRegistry","recover","remove.packages","removeSource","rtags","history","loadhistory","savehistory","timestamp","select.list","osVersion","print.sessionInfo","sessionInfo","toLatex.sessionInfo","R_BIOC_VERSION","R_REPOSITORIES","setRepositories","getIdentification","getWindowTitle","setStatusBar","setWindowTitle","shortPathName","getSrcDirectory","getSrcFilename","getSrcLocation","getSrcref","summaryRprof","tar","print.Bibtex","print.Latex","toBibtex","toLatex","close.txtProgressBar","getTxtProgressBar","setTxtProgressBar","txtProgressBar","untar","unzip","new.packages","old.packages","update.packages","upgrade","url.show","utils-deprecated","edit.vignette","print.vignette","vignette","vignettes","warnErrList","winDialog","winDialogString","winMenuAdd","winMenuAddItem","winMenuDel","winMenuDelItem","winMenuItems","winMenuNames","close.winProgressBar","getWinProgressBar","setWinProgressBar","winProgressBar","win.version","zip"];
const EXCLUDED = ["BATCH","COMPILE","utils-package","utils","completion","rcompgen","REMOVE","INSTALL","R_INSTALL_STAGED","R_INSTALL_TAR","LINK","build","check","Question","RHOME","Rconsole","Rdevga","Rscript","SHLIB","SweaveSyntaxLatex","SweaveSyntaxNoweb","aspell-utils","R_AVAILABLE_PACKAGES_CACHE_CONTROL_MAX_AGE","Filters","CITATION","??","mirrorAdmin","osVersion","R_BIOC_VERSION","R_REPOSITORIES","utils-deprecated","vignettes","getBioCmirrors","[.getAnywhere","[.person","$.person","[[.hashtab"];
// パーサ段階で止まるため「名前を含むエラー」にはならない11件
// （ドット始まり・ブラケットメソッド・ハイフン見出し）。いずれも
// 値を返さず停止することだけを固定する。
const PARSE_STOP = new Set([
"utils-package", ".AtNames", ".DollarNames", "aspell-utils",
"[.getAnywhere", "[[.hashtab", "??", ".S3methods", "$.person",
"[.person", "utils-deprecated",
]);

// ============================================================
// 1. データ整合（分母・内訳・形式・重複）
// ============================================================
test("umisc data: スライス全284名にちょうど1項目ずつ", () => {
assert.equal(ref10.length, 284);
assert.deepEqual(ref10.map((r) => r.name), SLICE);
assert.equal(new Set(ref10.map((r) => r.name)).size, 284);
});

test("umisc data: 内訳は対応2／未対応282／未検証0", () => {
const count = (s) => ref10.filter((r) => r.status === s).length;
assert.equal(count("supported"), 2);
assert.equal(count("unsupported"), 282);
assert.equal(count("unverified"), 0);
assert.deepEqual(
ref10.filter((r) => r.status === "supported").map((r) => r.name).sort(),
["formatOL", "formatUL"],
);
});

test("umisc data: 正規形（7フィールドのみ）・未対応は理由を名指し", () => {
const KEYS = ["name", "category", "syntax", "description", "example", "caution", "status"];
const REASON_MARK = "\u3010\u672a\u5bfe\u5fdc\u306e\u7406\u7531\u3011";
for (const r of ref10) {
assert.deepEqual(Object.keys(r), KEYS, r.name);
assert.ok(r.syntax.length > 0, r.name);
assert.ok(r.example.length > 0, r.name);
if (r.status === "unsupported")
assert.ok(r.description.includes(REASON_MARK), r.name);
if (r.status === "supported")
assert.ok(!r.description.includes(REASON_MARK), r.name);
}
});

test("umisc data: names は247件（除外37件）・重複なし", () => {
assert.equal(EXCLUDED.length, 37);
assert.equal(names10.length, 247);
assert.deepEqual(
[...names10].sort(),
SLICE.filter((n) =>!EXCLUDED.includes(n)).sort(),
);
assert.equal(new Set(names10).size, names10.length);
const otherNames = new Set([...namesP1,...namesP2,...namesP5]);
const otherItems = new Set(
[...refP1,...refP2,...refP5].map((r) => r.name),
);
const baseItems = new Set(definition.reference.map((r) => r.name));
for (const n of names10) {
assert.ok(!otherNames.has(n), `他班 names と重複: ${n}`);
assert.ok(!otherItems.has(n), `他班項目と重複: ${n}`);
assert.ok(!baseItems.has(n), `基礎項目と重複: ${n}`);
}
for (const r of ref10) {
assert.ok(!otherItems.has(r.name), r.name);
assert.ok(!baseItems.has(r.name), r.name);
}
});

test("umisc data: ハンドラは formatUL／formatOL のみ", () => {
assert.deepEqual([...builtins.keys()].sort(), ["formatOL", "formatUL"]);
});

// ============================================================
// 2. formatUL／formatOL ハンドラ（fake ctx。実 R 4.3.3 実測値）
// ============================================================
const NA = { kind: "NA"};
const fakeCtx = (fn, vals, argNames) => {
const warnings = [];
const ctx = {
name: fn,
args: vals.map((_, i) => ({ argName: argNames?.[i]?? null})),
vals,
api: {
fail: (msg) => { throw new Error(msg);},
note: (s, node, text) => warnings.push(text),
},
s: null,
node: null,
warnings,
H: {
vec: (v) => (v === null? []: Array.isArray(v)? v: [v]),
isNA: (v) => v?.kind === "NA",
isNaNVal: (v) => typeof v === "number" && Number.isNaN(v),
isMissing: (v) => v?.kind === "NA" || (typeof v === "number" && Number.isNaN(v)),
namesOf: (v) => (Array.isArray(v) && Array.isArray(v.names)? v.names: null),
withNames: (arr, names) => { if (names) arr.names = [...names]; return arr;},
show: (v) => JSON.stringify(v),
formatRNum: (v) => {
if (Number.isNaN(v)) return "NaN";
if (!Number.isFinite(v)) return v > 0? "Inf": "-Inf";
return String(v);
},
NA,
},
matchArgs(formals) {
const out = {};
let pos = 0;
vals.forEach((v, i) => {
const nm = argNames?.[i];
if (nm && formals.includes(nm)) out[nm] = { present: true, value: v};
else if (!nm) {
while (pos < formals.length && out[formals[pos]]) pos++;
if (pos < formals.length) out[formals[pos++]] = { present: true, value: v};
}
});
return out;
},
};
return ctx;
};
const ul = (vals, argNames) => builtins.get("formatUL")(fakeCtx("formatUL", vals, argNames));
const ol = (vals, argNames) => builtins.get("formatOL")(fakeCtx("formatOL", vals, argNames));

test("umisc formatUL: 典型（実 R 実測）", () => {
assert.deepEqual(ul([["apple", "banana"]]), ["* apple", "* banana"]);
assert.deepEqual(ul([["apple"]]), ["* apple"]);
assert.deepEqual(ul([[1, 2, 3]]), ["* 1", "* 2", "* 3"]);
assert.deepEqual(ul([[true, false]]), ["* TRUE", "* FALSE"]);
assert.deepEqual(ul([["hello"], "--", 4], [null, "label", "offset"]), ["    -- hello"]);
assert.deepEqual(
ul([["apple", "banana"], "*", 0, 20], ["x", "lab", "off", "wid"]),
["* apple", "* banana"],
);
});

test("umisc formatUL: 折り返しと段落（実 R 実測）", () => {
assert.deepEqual(
ul([["one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen"], 20], [null, "width"]),
["* one two three", "  four five six", "  seven eight nine", "  ten eleven twelve", "  thirteen fourteen", "  fifteen sixteen", "  seventeen"],
);
assert.deepEqual(ul([["a\n\nb"], 10], [null, "width"]), ["* a", "  ", "  b"]);
assert.deepEqual(ul([["hello world"], 3], [null, "width"]), ["* hello", "  world"]);
assert.deepEqual(
ul([["supercalifragilisticexpialidocious and more text here to wrap around"], 20], [null, "width"]),
["* supercalifragilisticexpialidocious", "  and more text", "  here to wrap", "  around"],
);
});

test("umisc formatUL: 境界（空・NA・ラベルリサイクル）", () => {
assert.deepEqual(ul([[]]), []);
assert.deepEqual(ul([[""]]), ["* "]);
assert.deepEqual(ul([[NA]]), ["* NA"]);
assert.deepEqual(ul([["a", NA, "b"]]), ["* a", "* NA", "* b"]);
assert.deepEqual(ul([["apple", "banana"], ["*", "-"]]), ["* apple", "- banana"]);
const ctx = fakeCtx("formatUL", [["apple", "banana", "cherry"], ["*", "-"]]);
assert.deepEqual(builtins.get("formatUL")(ctx), ["* apple", "- banana", "* cherry"]);
assert.ok(ctx.warnings.some((w) => w.includes("number of items to replace")), JSON.stringify(ctx.warnings));
});

test("umisc formatUL: 異常（実 R の文言で停止）", () => {
assert.throws(() => ul([]), /argument "x" is missing/);
assert.throws(() => ul([["a"], "*", 0, 72, 99], [null, null, null, null, "foo"]), /unused argument \(foo = 99\)/);
assert.throws(() => ul([["hello"], -1], [null, "offset"]), /invalid 'times' value/);
assert.throws(() => ul([["x"], NA], [null, "width"]), /invalid 'width' argument/);
assert.throws(() => ul([["x"], []]), /label が長さ 0/);
});

test("umisc formatOL: 典型（実 R 実測）", () => {
assert.deepEqual(ol([["first", "second"]]), ["1. first", "2. second"]);
assert.deepEqual(ol([["a", "b"], "a"]), ["a. a", "b. b"]);
assert.deepEqual(ol([["a", "b"], "I"]), [" I. a", "II. b"]);
assert.deepEqual(ol([["a", "b"], "ar"]), ["1. a", "2. b"]);
assert.deepEqual(ol([["a"], "A", 0, 26], [null, "type", "offset", "start"]), ["Z. a"]);
assert.deepEqual(ol([["a"], "i", 0, 3899], [null, "type", "offset", "start"]), ["mmmdcccxcix. a"]);
assert.deepEqual(
ol([["item one is here", "two"], "arabic", 2, 1, 14], [null, "type", "offset", "start", "width"]),
["  1. item one", "     is here", "  2. two"],
);
});

test("umisc formatOL: 境界（start の端・ラベル変換）", () => {
assert.deepEqual(ol([["a", "b", "c"], "arabic", 0, 0], [null, "type", "offset", "start"]), ["0. a", "1. b", "2. c"]);
assert.deepEqual(ol([["a", "b", "c"], "arabic", 0, -1], [null, "type", "offset", "start"]), ["-1. a", " 0. b", " 1. c"]);
assert.deepEqual(ol([["x"], "arabic", 0, 2.5], [null, "type", "offset", "start"]), ["2.5. x"]);
assert.deepEqual(ol([["a", "b"], "a", 0, 0], [null, "type", "offset", "start"]), ["a. a", "a. b"]);
assert.deepEqual(ol([["a", "b"], "i", 0, 0], [null, "type", "offset", "start"]), ["NA. a", " i. b"]);
assert.deepEqual(ol([[]]), []);
assert.deepEqual(ol([[NA, "b"]]), ["1. NA", "2. b"]);
});

test("umisc formatOL: 異常（実 R の文言で停止）", () => {
assert.throws(() => ol([["a", "b"], "A", 0, 26], [null, "type", "offset", "start"]), /too many list items \(at most up to 26\)/);
assert.throws(() => ol([["a", "b"], "i", 0, 3899], [null, "type", "offset", "start"]), /too many list items \(at most up to 3899\)/);
assert.throws(() => ol([["a", "b"], "bogus"]), /'arg' should be one of/);
assert.throws(() => ol([["a", "b"], ""]), /'arg' should be one of/);
assert.throws(() => ol([]), /argument "x" is missing/);
assert.throws(() => ol([["x"], NA], [null, "type"]), /'arg' must be NULL or a character vector/);
});

// ============================================================
// 3. 未対応項目は simulate で名指し停止し、誤った値を返さない
// ============================================================
const run = async (code, model) => {
const d = getDefinition("r");
return d.simulate(code, structuredClone(model?? d.model.defaults));
};
const errOf = async (code, model) => {
const r = await run(code, model);
return [r.error,...(r.paths || []).map((p) => p.error)].filter(Boolean);
};

test("umisc unsupported: 全282件が停止し、値を返さない", async () => {
const nameSet = new Set(names10);
for (const r of ref10) {
if (r.status === "supported") continue;
const code = nameSet.has(r.name)? `${r.name}(c(1, 2, 3))`: r.name;
const errs = await errOf(code);
assert.ok(errs.length > 0, `${r.name}: エラーなく終了した`);
if (!PARSE_STOP.has(r.name))
assert.ok(
errs.some((e) => e.message.includes(r.name)),
`${r.name}: ${JSON.stringify(errs)}`,
);
}
});

test("umisc unsupported: 類型ごとの代表が関数名を挙げて停止する", async () => {
const reps = [
"install.packages", "update.packages", "available.packages", // パッケージ管理
"help", "help.search", "apropos", // ヘルプ
"menu", "select.list", "askYesNo", "View", // 対話・GUI
"download.file", "tar", "zip", "read.socket", // ファイル・ネットワーク
"sessionInfo", "localeToCharset", // セッション情報
"Sweave", "prompt", "package.skeleton", // 文書生成
"Rprof", "debugger", "recover", // デバッグ
"person", "bibentry", "citation", "object.size", // 構造化オブジェクト
"getFromNamespace", "getS3method", "methods", "isS3method", // 内省
"removeSource", "getParseData", // 言語オブジェクト
"alarm", "flush.console", "txtProgressBar", // 副作用のみ
"hashtab", "charClass", "warnErrList", // 実験的・内部
"edit", "fix", "savehistory", // 編集・履歴
];
for (const name of reps) {
const errs = await errOf(`${name}(c(1, 2, 3))`);
assert.ok(
errs.some((e) => e.message.includes(`このR関数は説明に対応していません：${name}`)),
`${name}: ${JSON.stringify(errs)}`,
);
}
});
