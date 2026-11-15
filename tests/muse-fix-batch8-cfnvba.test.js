import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ8（CFN／VBA班）
// R29-N1（findings-round29 §2、findings-r29-f01a F01A-N1）:
//   CFN ハンドラ応答の fragment の型が未検証で、falsy な fragment が
//   「変換後」として黙って受理されていた。一次情報は AWS 公式
//   template-macros-author の応答形式（fragment は { ... } の JSON
//   オブジェクト＝変換後のテンプレート断片で、置換先に差し込まれる）。
//   RG-219 で厳密化した仕様側検証と対になる応答側の型検査を固定する。
//   兄弟表面: 応答自体が配列の場合（辞書形式の文言へ）、失敗時の
//   errorMessage が文字列でない場合（status へフォールバックし
//   [object Object] を出さない）、fragment が未確定値の場合。
// StrConv 裁定（findings-round29 §5）:
//   バッチ7定数族の説明文が案内する所有関数・イベント・メソッド・文のうち
//   項目が皆無だった6件（StrConv／Shell／CallByName／QueryClose／Show／
//   Unload）を参照専用（supported=false、caution で未対応を明示）として
//   追加したことを固定する。一次情報は Microsoft Learn（VBA-Docs 原文）の
//   各ページ（strconv-function／shell-function／callbyname-function／
//   queryclose-event／show-method／unload-statement）。

const cf = getDefinition("cloudformation");
const vba = getDefinition("vba");
const cfRun = async (code, model) =>
  cf.simulate(code, model ?? structuredClone(cf.model.defaults));
const cfErrs = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const macroReturning = (fragmentExpr, extra = "") => {
  const m = structuredClone(cf.model.defaults);
  m.macros = {
    Bad:
      "def handler(event, context):\n" +
      extra +
      `    return {"requestId": event["requestId"], "status": "success", "fragment": ${fragmentExpr}}`,
  };
  return m;
};
const FRAGMENT_TYPE = /fragmentがオブジェクトではありません/;

/* ---------------- R29-N1: トップレベル Transform ---------------- */

for (const bad of ["0", '""', "None", "False", "[]", '"hello"', "123", "1.5"]) {
  test(`R29-N1 top-level Transform rejects non-object fragment: ${bad}`, async () => {
    const r = await cfRun(
      JSON.stringify({ Transform: "Bad", Resources: {} }),
      macroReturning(bad),
    );
    const all = cfErrs(r);
    assert.ok(all.length >= 1, `fragment=${bad} must stop`);
    assert.match(all[0].message, FRAGMENT_TYPE);
    assert.match(all[0].message, /fragment/);
  });
}

test("R29-N1 valid object fragments still pass (empty object and falsy values inside)", async () => {
  for (const good of ["{}", '{"A": 0, "B": "", "C": False, "D": None, "E": []}']) {
    const r = await cfRun(
      JSON.stringify({ Transform: "Bad", Resources: {} }),
      macroReturning(good),
    );
    assert.deepEqual(cfErrs(r), [], good);
    assert.equal(r.paths.length, 1);
  }
  const r = await cfRun(
    JSON.stringify({ Transform: "Bad", Resources: {} }),
    macroReturning('{"A": 0, "B": "", "C": False, "D": None, "E": []}'),
  );
  assert.deepEqual(r.paths[0].fragment, { A: 0, B: "", C: false, D: null, E: [] });
});

test("R29-N1 default identity macro and templates still work", async () => {
  const r = await cfRun(
    JSON.stringify({ Transform: "AddMetadata", Resources: { Bucket: { Type: "AWS::S3::Bucket" } } }),
  );
  assert.deepEqual(cfErrs(r), []);
  // トップレベル Transform では params は空のため Stage は既定の dev
  assert.equal(r.paths[0].fragment.Metadata.Stage, "dev");
});

/* ---------------- R29-N1: Fn::Transform ---------------- */

test("R29-N1 Fn::Transform rejects a scalar fragment instead of replacing siblings", async () => {
  const r = await cfRun(
    JSON.stringify({
      Resources: {
        Bucket: {
          Type: "AWS::S3::Bucket",
          Properties: { "Fn::Transform": { Name: "Bad" }, BucketName: "b" },
        },
      },
    }),
    macroReturning("0"),
  );
  const all = cfErrs(r);
  assert.ok(all.length >= 1, JSON.stringify(r));
  assert.match(all[0].message, FRAGMENT_TYPE);
});

/* ---------------- R29-N1: 連鎖（後段へ渡す前に止める） ---------------- */

test("R29-N1 chained macros stop at the bad fragment and never reach the next macro", async () => {
  const m = macroReturning("0");
  m.macros.Second =
    'def handler(event, context):\n    return {"requestId": event["requestId"], "status": "success", "fragment": {"Reached": True}}';
  const r = await cfRun(
    JSON.stringify({ Transform: ["Bad", "Second"], Resources: {} }),
    m,
  );
  const all = cfErrs(r);
  assert.ok(all.length >= 1, JSON.stringify(r));
  assert.match(all[0].message, FRAGMENT_TYPE);
  for (const p of r.paths || [])
    assert.notDeepEqual(p.fragment, { Reached: true });
});

/* ---------------- R29-N1: ハンドラモード（直接実行） ---------------- */

test("R29-N1 handler mode rejects a non-object fragment and accepts an object", async () => {
  const bad =
    'def handler(event, context):\n    return {"requestId": event["requestId"], "status": "success", "fragment": []}';
  const r1 = await cfRun(bad);
  assert.ok(cfErrs(r1).length >= 1);
  assert.match(cfErrs(r1)[0].message, FRAGMENT_TYPE);
  const good =
    'def handler(event, context):\n    return {"requestId": event["requestId"], "status": "success", "fragment": event["fragment"]}';
  const r2 = await cfRun(good);
  assert.deepEqual(cfErrs(r2), []);
});

/* ---------------- R29-N1 兄弟表面 ---------------- */

test("R29-N1 sibling: an array response gets the dictionary-required message", async () => {
  const m = structuredClone(cf.model.defaults);
  m.macros = { Bad: "def handler(event, context):\n    return [1, 2]" };
  const r = await cfRun(JSON.stringify({ Transform: "Bad", Resources: {} }), m);
  const all = cfErrs(r);
  assert.ok(all.length >= 1);
  assert.match(all[0].message, /辞書形式のレスポンスを返す必要があります/);
});

test("R29-N1 sibling: a non-string errorMessage falls back to status (no [object Object])", async () => {
  const m = structuredClone(cf.model.defaults);
  m.macros = {
    Bad: 'def handler(event, context):\n    return {"requestId": event["requestId"], "status": "failure", "errorMessage": {"code": 1}, "fragment": event["fragment"]}',
  };
  const r = await cfRun(JSON.stringify({ Transform: "Bad", Resources: {} }), m);
  const all = cfErrs(r);
  assert.ok(all.length >= 1);
  assert.match(all[0].message, /マクロが失敗しました：failure/);
  assert.doesNotMatch(all[0].message, /\[object Object\]/);
});

test("R29-N1 sibling: a string errorMessage is still used for failures", async () => {
  const m = structuredClone(cf.model.defaults);
  m.macros = {
    Bad: 'def handler(event, context):\n    return {"requestId": event["requestId"], "status": "failure", "errorMessage": "変換できませんでした", "fragment": event["fragment"]}',
  };
  const r = await cfRun(JSON.stringify({ Transform: "Bad", Resources: {} }), m);
  assert.match(cfErrs(r)[0].message, /マクロが失敗しました：変換できませんでした/);
});

test("R29-N1 sibling: an undetermined (unknown) fragment is not accepted as transformed output", async () => {
  const m = structuredClone(cf.model.defaults);
  delete m.event.requestId;
  m.macros = {
    Bad: 'def handler(event, context):\n    return {"requestId": event["requestId"], "status": "success", "fragment": event["requestId"]}',
  };
  const r = await cfRun(JSON.stringify({ Transform: "Bad", Resources: {} }), m);
  const all = cfErrs(r);
  assert.ok(all.length >= 1, JSON.stringify(r));
  assert.match(all[0].message, FRAGMENT_TYPE);
});

test("R29-N1 fragment reference item documents the object requirement", () => {
  const r = cf.reference.find((x) => x.name === "fragment");
  assert.ok(r);
  assert.match(r.caution, /オブジェクト/);
  assert.match(r.caution, /停止/);
});

/* ---------------- StrConv 裁定: 参照専用6件 ---------------- */

const NEW_REF_ONLY = {
  StrConv: {
    category: "文字列",
    syntax: "StrConv(string, conversion, [LCID])",
    returns: "Variant（String）",
    source: "https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/strconv-function.md",
  },
  Shell: {
    category: "入出力",
    syntax: "Shell(pathname, [windowstyle])",
    returns: "Variant（Double）（起動したプログラムのタスクID）",
    source: "https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/shell-function.md",
  },
  CallByName: {
    category: "セル・オブジェクト",
    syntax: "CallByName(object, procname, calltype, [args()])",
    returns: "Variant（呼び出したプロパティ取得・メソッドの結果）",
    source: "https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/callbyname-function.md",
  },
  QueryClose: {
    category: "手続き",
    syntax: "Private Sub UserForm_QueryClose(Cancel As Integer, CloseMode As Integer)",
    returns: "戻り値なし（イベントプロシージャ）",
    source: "https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/queryclose-event.md",
  },
  Show: {
    category: "セル・オブジェクト",
    syntax: "フォーム.Show([modal])",
    returns: "戻り値なし（メソッド）",
    source: "https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/show-method.md",
  },
  Unload: {
    category: "文",
    syntax: "Unload オブジェクト",
    returns: "戻り値なし（宣言または制御文）",
    source: "https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/unload-statement.md",
  },
};
const searchHit = (r, q) =>
  (r.name + " " + r.category + " " + r.description + " " + r.syntax)
    .toLowerCase()
    .includes(q.toLowerCase());
const vbaErrs = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);

test("StrConv adjudication: VBA reference count is 338 after the 12 reference-only owners (6 cfnvba + 6 vbasweep sweep)", () => {
  assert.equal(vba.reference.length, 338, "326 + 6 reference-only owners (batch8 cfnvba) + 6 reference-only owners (batch8 vbasweep: GetAttr/SetAttr/Dir/FormatDateTime/VarType/Weekday)");
});

for (const [name, exp] of Object.entries(NEW_REF_ONLY)) {
  test(`reference-only owner exists with all fields and 未対応 caution: ${name}`, () => {
    const r = vba.reference.find((x) => x.name === name);
    assert.ok(r, name + " must exist");
    assert.equal(r.supported, false, name + " must be reference-only");
    assert.equal(r.category, exp.category, name);
    assert.equal(r.syntax, exp.syntax, name);
    assert.equal(r.returns, exp.returns, name);
    assert.equal(r.source, exp.source, name);
    for (const f of ["description", "example", "caution"])
      assert.ok(typeof r[f] === "string" && r[f].length > 0, `${name}.${f}`);
    // U-45: 未対応であることが画面（caution）で判別できる
    assert.match(r.caution, /未対応/, name);
    assert.match(r.caution, /参照専用/, name);
    // F-02 到達性: 自項目名で検索ヒットする
    assert.ok(searchHit(r, r.name), name + " must be found by its own name");
  });

  test(`reference-only owner example stops honestly (no silent success): ${name}`, async () => {
    const r = vba.reference.find((x) => x.name === name);
    const res = await vba.simulate(r.example, structuredClone(vba.model.defaults));
    assert.ok(vbaErrs(res).length >= 1, `${name} example must stop: ${r.example}`);
  });
}

test("StrConv/Shell/CallByName calls stop naming the function", async () => {
  for (const [code, re] of [
    ['x = StrConv("abc", vbUpperCase)', /strconv/],
    ['x = Shell("calc.exe")', /shell/],
    ['x = CallByName(Me, "Foo", vbMethod)', /callbyname/],
  ]) {
    const r = await vba.simulate(code, structuredClone(vba.model.defaults));
    assert.ok(vbaErrs(r).length >= 1, code);
    assert.match(vbaErrs(r)[0].message, re, code);
  }
});

test("scan resolves the new owner names (QueryClose via its bare name)", () => {
  assert.ok(vba.scan('x = StrConv("a", vbUpperCase)').includes("StrConv"));
  assert.ok(vba.scan('x = Shell("calc.exe", vbHide)').includes("Shell"));
  assert.ok(vba.scan('x = CallByName(Me, "Foo", vbMethod)').includes("CallByName"));
  assert.ok(vba.scan("UserForm1.Show vbModal").includes("Show"));
  assert.ok(vba.scan("Unload UserForm1").includes("Unload"));
  assert.ok(vba.scan("QueryClose").includes("QueryClose"));
});

test("owner already present stays supported: IMEStatus / InStr / Replace", () => {
  for (const n of ["IMEStatus", "InStr", "Replace"]) {
    const r = vba.reference.find((x) => x.name === n);
    assert.ok(r, n);
    assert.equal(r.supported, true, n);
  }
});
