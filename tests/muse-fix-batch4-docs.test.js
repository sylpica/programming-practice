// 修正バッチ4（文書／F-02班）回帰テスト。
// 対象：R25-N7（F-02 到達性：検索述語への syntax 追加＋比較演算子の基本形列挙＋
//       束ね項目の名前単位到達性照合＋基準の明文化）／
//       R25-N17（REQUIREMENTS.md の CloudFormation 176→177 と全セルの実測照合）／
//       R25-N30（AutoHotkey for の1変数形の文面是正とモデル相違の caution 開示）／
//       RG-170 訂正記録（バッチ3報告書「関数62」は誤記・実測は関数56）。
// 個票の sha256 は正規方式（fields をキーソートした JSON の sha256。
// Python json.dumps(ensure_ascii=False, sort_keys=True) と等価）で再計算する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { definitions, getDefinition } from "../js/types/registry.js";
import { definition as ps } from "../js/types/powershell/index.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const ahk = getDefinition("autohotkey");
const runAhk = async (code) =>
  ahk.simulate(code, structuredClone({ ...ahk.model.defaults, event: null }));
const ahkOutputs = (r) => (r.paths?.[0]?.outputs || []).map((o) => o.text);
const ahkErrors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);

// ---------- R25-N7(a)：検索述語が syntax を対象に含む ----------
const appSrc = read("../js/app.js");
// アプリの検索述語そのもの（renderRefs／fullRefs の2経路で同一）。
const searchHit = (r, q) =>
  (r.name + " " + r.category + " " + r.description + " " + r.syntax)
    .toLowerCase()
    .includes(q.toLowerCase());
const searchHitOld = (r, q) =>
  (r.name + " " + r.category + " " + r.description)
    .toLowerCase()
    .includes(q.toLowerCase());

test("R25-N7(a): both reference search predicates in app.js include syntax", () => {
  const occurrences =
    appSrc.split('r.description + " " + r.syntax').length - 1;
  assert.equal(occurrences, 2, "renderRefs と fullRefs の両述語に syntax が必要");
});

test("R25-N7(a): every reference item is found by its own name (all 1340)", () => {
  let n = 0;
  for (const d of definitions)
    for (const r of d.reference) {
      n++;
      assert.ok(searchHit(r, r.name), `${d.id}/${r.name} が項目名で到達しない`);
    }
  assert.equal(n, 1340); // 998 + 修正バッチ4 Python追随班の例外44件×2種（Python＋CloudFormation伝播）+ 修正バッチ6 R27-N20 組み込み定数3件×2種（同）+ R27-N7 VBA 定数94件 + 修正バッチ7 R28-N9 VBA 定数141件 + 修正バッチ8 13件（PowerShell 三項演算子＋VBA 参照専用12件）
});

// ---------- R25-N7(b)：比較演算子の description に基本形8綴りを列挙 ----------
const BASIC8 = ["-eq", "-ne", "-gt", "-ge", "-lt", "-le", "-like", "-match"];
test("R25-N7(b): PowerShell 比較演算子 description enumerates the basic 8 spellings", () => {
  const item = ps.reference.find((r) => r.name === "比較演算子");
  assert.ok(item);
  for (const s of BASIC8)
    assert.ok(item.description.includes(s), `description に ${s} がない`);
  for (const s of BASIC8)
    assert.ok(searchHit(item, s), `${s} で比較演算子に到達しない`);
});

test("R25-N7(b): reference-r6 row for 比較演算子 is in sync with the definition", () => {
  const r6 = JSON.parse(read("../docs/audit/reference-r6.json"));
  const row = r6.find((e) => e.kind === "powershell" && e.name === "比較演算子");
  const item = ps.reference.find((r) => r.name === "比較演算子");
  assert.ok(row);
  for (const f of ["description", "example", "returns", "caution", "source"])
    assert.equal(row[f], item[f], `r6 比較演算子.${f}`);
});

// ---------- R25-N7(c)：束ね項目の名前単位到達性照合 ----------
// 名前の抽出元は syntax 欄の綴り一覧。抽出規則（報告書 batch4-report-docs.md と同一）：
//  小文字の -演算子綴り／ドット付きプロパティ（接頭辞つき形からはドット形を抽出）／
//  %NAME%・!NAME!／[型名]（数字つきも含む）／A_* 名／記号演算子（+・+=・++・%% 等。
//  裸の "/" は区切りと同形のため「値 / 値」形がある項目でのみ除算として数える）／
//  !（否定）／in・exactin。
// 2名以上を抽出できた項目を「束ね項目」とする。
function extractNames(item) {
  const names = new Set();
  const tokens = (item.syntax || "").split(/[\s／]+/).filter(Boolean);
  let symbolic = false;
  for (const tok of tokens) {
    if (/^-[a-z]+$/.test(tok)) names.add(tok);
    else if (/^\.[A-Za-z_]\w*$/.test(tok)) names.add(tok);
    else if (/^[^.\s]+\.([A-Za-z_]\w*)$/.test(tok))
      names.add("." + tok.match(/\.([A-Za-z_]\w*)$/)[1]);
    else if (/^%[A-Za-z]+%$/.test(tok)) names.add(tok);
    else if (/^!([A-Za-z]+)!$/.test(tok)) names.add(tok);
    else if (/^\[([A-Za-z][A-Za-z0-9]*)\]/.test(tok))
      names.add("[" + tok.match(/^\[([A-Za-z][A-Za-z0-9]*)\]/)[1] + "]");
    else if (/^A_[A-Za-z]+$/.test(tok)) names.add(tok);
    else if (
      tok !== "/" &&
      (/^[+\-*\/%]=?$/.test(tok) ||
        /^\+\+$/.test(tok) ||
        /^--$/.test(tok) ||
        /^%%$/.test(tok) ||
        /^%\/\%$/.test(tok))
    ) {
      names.add(tok);
      symbolic = true;
    } else if (/^\$x(\+\+|--)$/.test(tok)) {
      names.add(tok.slice(-2));
      symbolic = true;
    } else if (/^(\+\+|--)\$x$/.test(tok)) {
      names.add(tok.slice(0, 2));
      symbolic = true;
    } else if (/^![^\x00-\x7F]/.test(tok)) names.add("!");
    else if (tok === "in" || tok === "exactin") names.add(tok);
  }
  if (symbolic && /値 \/ 値/.test(item.syntax || "")) names.add("/");
  return [...names];
}

test("R25-N7(c): all bundled items' all names reach their own item (bundled=12 items, 95 names, 0 unreachable)", () => {
  let bundled = 0,
    names = 0;
  const unreachable = [];
  for (const d of definitions)
    for (const r of d.reference) {
      const ns = extractNames(r);
      if (ns.length < 2) continue;
      bundled++;
      names += ns.length;
      for (const n of ns)
        if (!searchHit(r, n)) unreachable.push(`${d.id}/${r.name}: ${n}`);
    }
  assert.equal(bundled, 12, "束ね項目数");
  assert.equal(names, 95, "名前総数");
  assert.deepEqual(unreachable, [], "未到達の名前がある");
});

test("R25-N7(c): the 25 names that were unreachable before the fix now reach (incl. dot spellings)", () => {
  // 是正前の実測（是正前データ＋旧述語）で未到達だった25名。
  // ドット付き17名は現在でも旧述語では届かず、syntax を含む新述語でのみ届く。
  // 比較演算子の基本形8綴りは (b) の description 列挙により旧述語でも届くようになった
  // （複合原因の両方を是正した結果であり、ここでは新述語での到達のみを固定する）。
  const cases = [
    ["powershell", "比較演算子", BASIC8, false],
    [
      "powershell",
      "プロパティ",
      [".Name", ".FullName", ".Length", ".Count", ".Extension", ".Keys", ".Values", ".PSIsContainer", ".Path"],
      true,
    ],
    ["python", "数値の属性", [".real", ".imag", ".numerator", ".denominator"], true],
    ["cloudformation", "数値の属性", [".real", ".imag", ".numerator", ".denominator"], true],
  ];
  let checked = 0;
  for (const [kind, name, spellings, oldStillFails] of cases) {
    const item = getDefinition(kind).reference.find((r) => r.name === name);
    assert.ok(item, `${kind}/${name}`);
    for (const s of spellings) {
      checked++;
      if (oldStillFails)
        assert.equal(searchHitOld(item, s), false, `前提：旧述語では ${s} は未到達のはず`);
      assert.ok(searchHit(item, s), `${kind}/${name}: ${s} で到達しない`);
    }
  }
  assert.equal(checked, 25);
});

// ---------- R25-N7(d)：F-02 到達性基準の明文化 ----------
test("R25-N7(d): DEVELOPMENT.md states the F-02 reachability criterion incl. the search-predicate definition", () => {
  const dev = read("../docs/DEVELOPMENT.md");
  assert.match(dev, /F-02 の到達性基準/);
  assert.match(dev, /name／category／description／syntax/);
  assert.match(dev, /syntax 欄に綴りが列挙されているだけでは到達とはみなさない/);
});

// ---------- R25-N17：REQUIREMENTS.md の数表 ----------
test("R25-N17: REQUIREMENTS.md reference counts match the measured definitions and total 1340", () => {
  const req = read("../docs/audit/REQUIREMENTS.md");
  const nameToId = {
    "Excel VBA": "vba",
    "ImageJマクロ": "imagej",
    "AWS CloudFormation Macros": "cloudformation",
    "Power Automate": "powerautomate",
    "AutoHotkey v2": "autohotkey",
    "UI.Vision RPA": "uivision",
    "Power Apps": "powerapps",
    Python: "python",
    R: "r",
    C: "c",
    "C++": "cpp",
    "C#": "csharp",
    JavaScript: "javascript",
    "コマンドプロンプト": "cmd",
    PowerShell: "powershell",
  };
  const section = req.split("## 新種類追加 R6の適用")[1];
  assert.ok(section, "R6 数表の節が見つからない");
  let sum = 0,
    rows = 0;
  for (const line of section.split("\n")) {
    const m = line.match(/^\| (.+?) \| \d+ \| \d+ \| \d+ \| \d+ \| (\d+) \|$/);
    if (!m) continue;
    const id = nameToId[m[1]];
    assert.ok(id, `表の種類名が対応表にない: ${m[1]}`);
    rows++;
    sum += Number(m[2]);
    assert.equal(
      Number(m[2]),
      getDefinition(id).reference.length,
      `${m[1]} のセルが実測と一致しない`,
    );
  }
  assert.equal(rows, 15);
  assert.equal(sum, 1340, "表の合計が本文の1340と一致しない");
  assert.match(req, /1340リファレンス/);
});

// ---------- R25-N30：AutoHotkey for の文面 ----------
test("R25-N30: for description states array=value / object=property-name for the one-variable form", () => {
  const item = ahk.reference.find((r) => r.name === "for");
  assert.ok(item);
  assert.match(item.description, /変数が1つだけのときは、配列では値だけを受け取りますが、オブジェクトではプロパティ名を受け取ります/);
  assert.doesNotMatch(item.description, /変数が1つだけのときは値だけを受け取ります。/);
});

test("R25-N30: for caution discloses that the model returns values for objects (unlike real AHK)", () => {
  const item = ahk.reference.find((r) => r.name === "for");
  assert.match(item.caution, /このアプリのモデルでは、オブジェクトに対する変数1つの形でも値を受け取ります/);
  assert.match(item.caution, /実物ではプロパティ名を受け取る点が異なります/);
});

test("R25-N30: model behaviour behind the caution (array 1-var=value, object 1-var=value in the model, object 2-var key=property name)", async () => {
  let r = await runAhk("for v in [10, 20, 30] {\n MsgBox v\n}");
  assert.deepEqual(ahkErrors(r), []);
  assert.deepEqual(ahkOutputs(r), ["10", "20", "30"]);
  r = await runAhk("for v in {a: 1, b: 2} {\n MsgBox v\n}");
  assert.deepEqual(ahkErrors(r), []);
  assert.deepEqual(ahkOutputs(r), ["1", "2"], "モデルはオブジェクトでも値を返す（caution 開示どおり）");
  r = await runAhk("for k, v in {a: 1, b: 2} {\n MsgBox k\n MsgBox v\n}");
  assert.deepEqual(ahkErrors(r), []);
  assert.deepEqual(ahkOutputs(r), ["a", "1", "b", "2"]);
});

const dumpsSorted = (fields) =>
  "{" +
  Object.keys(fields)
    .sort()
    .map((k) => `${JSON.stringify(k)}: ${JSON.stringify(fields[k])}`)
    .join(", ") +
  "}";
const shaOf = (fields) =>
  createHash("sha256").update(dumpsSorted(fields)).digest("hex");

test("R25-N30: reference-r2 row for AHK for is in sync and its sha256 recomputes", () => {
  const r2 = JSON.parse(read("../docs/audit/reference-r2.json"));
  const row = r2.find((x) => x.kind === "autohotkey" && x.name === "for");
  const item = ahk.reference.find((r) => r.name === "for");
  assert.ok(row);
  assert.equal(row.fields.description, item.description);
  assert.equal(row.fields.caution, item.caution);
  assert.equal(row.sha256, shaOf(row.fields), "sha256 は fields の正規方式で再計算された値");
});

// ---------- RG-170 訂正記録 ----------
test("RG-170 correction: batch3 report keeps the original text and gains a dated correction section (関数62→実測56)", () => {
  const rep = read("../docs/audit/MUSE-FIX-BATCH3.md");
  assert.match(rep, /定数5＋関数62/, "本文は書き換えられていないこと");
  assert.match(rep, /## 訂正記録（2026-11-15、修正バッチ4・文書／F-02班）/);
  assert.match(rep, /「関数62」は\*\*誤記\*\*であり、実測は\*\*関数56\*\*/);
});

test("RG-170 correction: measured public names of math are 5 constants + 56 functions = 61", () => {
  const engine = read("../js/types/python/engine.js");
  const funcs = engine.match(/const MATH_FUNCS = '([^']+)'/)[1].split(" ");
  assert.equal(funcs.length, 56);
  const consts = engine.match(/const MATH_CONST = \{([^}]*)\}/)[1];
  assert.equal((consts.match(/\w+:/g) || []).length, 5);
});
