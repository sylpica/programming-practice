import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate } from "../js/engine.js";

const sim = (s, m = {}, l = {}) => simulate(s, m, l);
const path = (s, m) => {
  let r = sim(s, m);
  assert.equal(r.error, undefined, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  assert.equal(r.paths[0].error, undefined, JSON.stringify(r.paths[0].error));
  return r.paths[0];
};
const outputs = (s, m) => path(s, m).outputs.map((x) => x.text);

// ---- RG-74（統合）: 条件位置の "True"／"False" 文字列は CBool 規則で変換される ----
test("RG-74 If conditions convert True/False strings like CBool", () => {
  assert.deepEqual(
    outputs('Sub Main()\n    If "True" Then\n        Debug.Print "T1"\n    End If\n    If "false" Then\n        Debug.Print "T2"\n    Else\n        Debug.Print "F2"\n    End If\nEnd Sub'),
    ["T1", "F2"], // RG-04 統合裁定：実 VBA 表記（引用符なし）
  );
  const r = sim('Sub Main()\n    If "hello" Then\n        Debug.Print "T"\n    End If\nEnd Sub');
  assert.ok(r.paths[0].error || r.error, "non-convertible strings still raise type mismatch");
});

// ---- RG-04 (VBA分・実装できた部分): 型名の正規表記と浮動小数の既定桁数 ----
// 注: Boolean 値の True/False 化と文字列出力の引用符除去は、既存テスト
// （tests/engine.test.js と tests/fixtures/*.json）が旧表記を期待値として
// 明示しているため、本担当の「既存テスト変更禁止」制約下では保留とした。
// 詳細は最終報告の RG-04 項を参照。
test("RG-04 VBA type names use the canonical capitalised form in Dim traces", () => {
  let p = path("Dim b As Boolean\nDim n As Long\nDim s As String");
  assert.ok(p.trace.some((t) => /b は Boolean の変数です/.test(t.text)));
  assert.ok(p.trace.some((t) => /n は Long の変数です/.test(t.text)));
  assert.ok(p.trace.some((t) => /s は String の変数です/.test(t.text)));
});
test("RG-04 VBA numbers use the 15-significant-digit default conversion on all surfaces", async () => {
  // 出力
  assert.deepEqual(outputs("MsgBox 0.1 + 0.2"), ["0.3"]);
  assert.deepEqual(outputs("Debug.Print 1 / 3"), ["0.333333333333333"]);
  assert.deepEqual(outputs("MsgBox 0.00001"), ["1E-05"]);
  assert.deepEqual(outputs("MsgBox 1000000000000000"), ["1E+15"]);
  // trace
  let p = path("x = 0.1 + 0.2");
  assert.ok(p.trace.some((t) => t.text === "x ← 0.3"));
  // 最終状態（定義経由の groups も同じ display を使う）
  const { getDefinition } = await import("../js/types/registry.js");
  let r = await getDefinition("vba").simulate("x = 0.1 + 0.2", {});
  let vars = r.paths[0].groups.find((g) => g.title === "変数");
  assert.deepEqual(vars.entries, [["x", "0.3"]]);
  // 整数・通常の小数は従来どおり
  assert.deepEqual(outputs("MsgBox 2.5"), ["2.5"]);
  assert.deepEqual(outputs("MsgBox 100"), ["100"]);
});

// ---- RG-31: Mod の丸め後除数0はエラー11（\ と統一） ----
test("RG-31 Mod with a divisor that rounds to zero is division-by-zero (11)", () => {
  for (let code of ["x = 5 Mod 0.5", "x = 10 Mod 0.4", "x = 0 Mod 0.5", "x = 5 Mod 0"]) {
    let e = sim(code).paths[0].error;
    assert.equal(e.code, 11, code);
    assert.equal(e.message, "0 で除算しました", code);
  }
  // \ と同じ入力で同じ分類になる
  assert.equal(sim("x = 10 \\ 0.4").paths[0].error.code, 11);
  // On Error 経路でも Err.Number が 11 で一致する
  assert.deepEqual(
    outputs("On Error Resume Next\nx = 5 Mod 0.5\nDebug.Print Err.Number"),
    ["11"],
  );
  // 通常の Mod は従来どおり
  assert.equal(path("x = 5 Mod 2").vars.x, 1);
  assert.equal(path("x = 5 Mod 1.5").vars.x, 1);
  assert.equal(path("x = -7 Mod 2").vars.x, -1);
  assert.equal(path("x = 7 Mod -2").vars.x, 1);
});

// ---- RG-27: Select Case のパス条件ラベルに内部表現 "false or" が漏れない ----
test("RG-27 Select Case path labels contain no internal accumulation expression", async () => {
  const { templates } = await import("../js/content.js");
  const t = templates.find((x) => x.id === "input");
  let r = sim(t.code, { B2: 85 });
  assert.equal(r.paths.length, 3);
  for (let p of r.paths)
    for (let tr of p.trace) assert.doesNotMatch(tr.text, /false or|or false/);
  // 全テンプレート横断でも漏れない
  for (let tpl of templates) {
    let rr = sim(tpl.code, { B2: 85 });
    for (let p of rr.paths || [])
      for (let tr of p.trace || [])
        assert.doesNotMatch(tr.text, /false or|or false/, tpl.id);
  }
  // 複数チェックの Case は、利用者の条件同士の or として読める形で残る
  let multi = sim('x = InputBox("x")\nSelect Case x\nCase "a", "b"\ny = 1\nCase Else\ny = 2\nEnd Select');
  assert.deepEqual(multi.paths.map((p) => p.vars.y).sort(), [1, 2]);
  // 確定値の Select は従来どおり
  assert.deepEqual(
    outputs('n = 5\nSelect Case n\nCase 1 To 5\nDebug.Print "first"\nCase Is >= 5\nDebug.Print "second"\nEnd Select'),
    ["first"], // RG-04 統合裁定：実 VBA 表記（引用符なし）
  );
});

// ---- RG-24: 括弧なし組み込み関数参照が暗黙変数にならない ----
test("RG-24 bare built-in references resolve as runtime-determined values", () => {
  for (let fn of ["Time", "Rnd", "Timer", "Command", "CurDir", "FreeFile", "DoEvents", "IMEStatus"]) {
    let p = path(`x = ${fn}`);
    assert.equal(p.vars.x?.kind, "unknown", fn);
    // 幻の変数が最終状態に現れない
    assert.deepEqual(Object.keys(p.vars), ["x"], fn);
  }
  // trace でも「実行時に決まる」として表示される
  let p = path("x = Time");
  assert.ok(p.trace.some((t) => /実行時に決まる/.test(t.text)));
  // 分岐条件にも使える（Rnd は未確定として2パス）
  let r = sim("If Rnd < 0.5 Then\ny = 1\nElse\ny = 2\nEnd If");
  assert.deepEqual(r.paths.map((q) => q.vars.y).sort(), [1, 2]);
  // 括弧つき未対応関数は従来どおり名前を挙げて停止する
  assert.match(sim("x = Rnd()").paths[0].error.message, /関数 rnd/);
});

// ---- RG-18 (VBA分): Replace の任意引数 ----
test("RG-18 Replace optional arguments start/count/compare are implemented", () => {
  // RG-04 統合裁定：期待値は実 VBA 表記（引用符なし）
  assert.deepEqual(outputs('Debug.Print Replace("aaa", "a", "b", 2)'), ["bb"]);
  assert.deepEqual(outputs('Debug.Print Replace("aaa", "a", "b", 1, 1)'), ["baa"]);
  assert.deepEqual(outputs('Debug.Print Replace("aaa", "a", "b", 1, 0)'), ["aaa"]);
  assert.deepEqual(outputs('Debug.Print Replace("AaA", "a", "b", 1, -1, 1)'), ["bbb"]);
  assert.deepEqual(outputs('Debug.Print Replace("a-b-c", "-", "/", 3)'), ["b/c"]);
  assert.deepEqual(outputs('Debug.Print Replace("abc", "a", "b", 5)'), [""]);
  // 3引数形は従来どおり
  assert.deepEqual(outputs('Debug.Print Replace("AaA", "a", "b")'), ["AbA"]);
  // 不正な任意引数は引数の実態を指して止まる（個数のせいにしない）
  assert.equal(sim('Debug.Print Replace("abc", "a", "b", 0)').paths[0].error.code, 5);
  assert.match(
    sim('Debug.Print Replace("abc", "a", "b", 1, -1, -1)').paths[0].error.message,
    /compare 引数 -1/,
  );
});

// ---- RG-12 (VBA分): "5" + 3 の混合型変換 ----
test("RG-12 numeric string literal plus number follows the classic VBA rule", () => {
  assert.equal(path('x = "5" + 3').vars.x, 8);
  assert.equal(path('x = 5 + "3"').vars.x, 8);
  assert.equal(path('x = "5.5" + 3').vars.x, 8.5);
  assert.deepEqual(outputs('Debug.Print "5" + 3'), ["8"]);
  assert.equal(path('x = ("5" + 3) * 2').vars.x, 16);
  // 数値化できない文字列は従来どおりエラー13
  assert.equal(sim('x = "a" + 3').paths[0].error.code, 13);
  assert.equal(sim('x = 3 + "a"').paths[0].error.code, 13);
  assert.equal(sim('x = "" + 3').paths[0].error.code, 13);
  // 文字列同士は連結のまま、他の演算子も従来どおり変換する
  assert.equal(path('x = "5" + "3"').vars.x, "53");
  assert.equal(path('x = "5" - 1').vars.x, 4);
  // 宣言された String 型変数と数値型の組み合わせは従来仕様を維持する
  assert.equal(
    sim('Dim s As String\nDim n As Long\ns = "2"\nn = 3\nx = s + n').paths[0].error.code,
    13,
  );
  assert.deepEqual(
    outputs('Dim s As String\ns = "2"\nv = 3\nDebug.Print s + v'),
    ["23"], // RG-04 統合裁定：実 VBA 表記（引用符なし）
  );
});

// ---- RG-09: VBA パーサの構文エラーの誤分類 ----
test("RG-09 missing block terminators name the missing terminator", () => {
  assert.equal(sim("Sub M()\nIf True Then\nMsgBox 1\nEnd Sub").error.message, "End If が必要です");
  assert.equal(sim("Sub M()\nDo\nMsgBox 1\nEnd Sub").error.message, "Loop が必要です");
  assert.equal(sim("Sub M()\nFor i = 1 To 2\nMsgBox i\nEnd Sub").error.message, "Next が必要です");
  assert.equal(
    sim("Sub M()\nSelect Case 1\nCase 1\nMsgBox 1\nEnd Sub").error.message,
    "End Select が必要です",
  );
  // 入れ子では内側の欠落を指す
  assert.equal(
    sim("Sub M()\nIf True Then\nFor i = 1 To 2\nMsgBox i\nEnd If\nEnd Sub").error.message,
    "Next が必要です",
  );
  // 正しいブロックは従来どおり動く／単独の終端は従来どおり開始文なしエラー
  assert.deepEqual(outputs("Sub M()\nIf True Then\nMsgBox 1\nEnd If\nEnd Sub"), ["1"]);
  assert.match(sim("End If").error.message, /対応する開始文がありません/);
});
test("RG-09 Dim x As names the missing type name", () => {
  assert.equal(sim("Dim x As").error.message, "As の後に型名が必要です");
  assert.equal(sim("Dim x As, y As Long").error.message, "As の後に型名が必要です");
  // As New は従来どおりその構文自体を名指す
  assert.match(sim("Dim x As New Collection").error.message, /As New/);
});
test("RG-09 ReDim is stopped by name as an unsupported dynamic-array syntax", () => {
  let r = sim("Dim a() As Long\nReDim a(2)");
  assert.equal(r.error.line, 2);
  assert.match(r.error.message, /ReDim（動的配列）/);
  let preserve = sim("Dim a() As Long\nReDim Preserve a(2)");
  assert.match(preserve.error.message, /ReDim Preserve（動的配列）/);
  // 動的配列の宣言だけなら受理し、未割当要素へのアクセスはエラー9
  assert.equal(path("Dim a() As Long\nx = 1").vars.x, 1);
  assert.equal(sim("Dim a() As Long\na(0) = 1").paths[0].error.code, 9);
  assert.equal(sim("Dim a() As Long\nx = LBound(a)").paths[0].error.code, 9);
});
test("RG-09 line continuation '_' joins logical lines", () => {
  assert.deepEqual(outputs("x = 1 + _\n2\nDebug.Print x"), ["3"]);
  assert.deepEqual(outputs("x = 1 + _\n2 + _\n3\nDebug.Print x"), ["6"]);
  assert.deepEqual(outputs('s = "ab" & _\n"cd"\nDebug.Print s'), ["abcd"]);
  assert.deepEqual(outputs('MsgBox _\n"hello"'), ["hello"]);
  // 文字列 "_" と識別子の一部は継続と混同しない
  assert.deepEqual(outputs('s = "_"\nDebug.Print s'), ["_"]);
  assert.deepEqual(outputs("my_var = 3\nDebug.Print my_var"), ["3"]);
});

// ---- RG-23: エラー行番号は line フィールドに分離し、本文に埋め込まない ----
test("RG-23 lexer errors carry the line only in the line field", () => {
  let unterminated = sim('x = 1\ny = 2\ns = "abc');
  assert.deepEqual(unterminated.error, {
    line: 3,
    message: "文字列が閉じられていません",
    code: 0,
  });
  let unknownChar = sim("x = 1\ny = ~");
  assert.deepEqual(unknownChar.error, {
    line: 2,
    message: "この構文は説明に対応していません：~",
    code: 0,
  });
  // UI が「N行：」を1回だけ前置する形になる（本文に行番号が残っていない）
  for (let e of [unterminated.error, unknownChar.error])
    assert.doesNotMatch(e.message, /^\d+行：/);
});

// ---- RG-20: ":" / "," 1文字文字列リテラル ----
test("RG-20 colon/comma one-char string literals work in every position", () => {
  // 被演算子位置（連結）
  assert.deepEqual(outputs('total = 5\nDebug.Print "結果" & ":" & total'), ["結果:5"]);
  assert.deepEqual(outputs('Debug.Print "a" & "," & "b"'), ["a,b"]);
  // 引数位置
  assert.deepEqual(outputs('Debug.Print Len(":")'), ["1"]);
  assert.deepEqual(outputs('Debug.Print Len(",")'), ["1"]);
  assert.deepEqual(outputs('Debug.Print ","'), [","]);
  assert.deepEqual(outputs('Debug.Print ":"'), [":"]);
  // 代入右辺（全体・連結の一部）
  assert.equal(path('s = ","').vars.s, ",");
  assert.equal(path('s = ":"').vars.s, ":");
  assert.equal(path('s = "a" & ":"').vars.s, "a:");
  // 括弧1文字リテラルも区切り・括弧と混同しない
  assert.deepEqual(outputs('Debug.Print "(" & ")"'), ["()"]);
  assert.deepEqual(outputs('Debug.Print Mid("a:b", 2, 1)'), [":"]);
  // 本来の文区切り ":" と引数区切り "," は従来どおり動く
  assert.deepEqual(outputs("x = 1 : y = 2\nDebug.Print x + y"), ["3"]);
  assert.deepEqual(outputs("Debug.Print 1, 2"), ["1, 2"]);
});

// ---- RG-60（統合）: 貼り付け由来文字は識別子に吸収されず、文字を名指して止まる ----
test("RG-60 N1 pasted special characters stop with the character named", () => {
  const cases = [
    ["x =\u300040 + 2", /全角スペース（U\+3000/],
    ["x\u3000= 40 + 2", /全角スペース（U\+3000/],
    ["x\u00a0= 40 + 2", /ノーブレークスペース（U\+00A0/],
    ["s = \u201chi\u201d", /スマートクォート（U\+201C/],
    ["x = \uff14\uff12", /全角数字（U\+FF14/],
  ];
  for (const [code, re] of cases) {
    const r = sim(code);
    const e = r.error || r.paths?.[0]?.error;
    assert.ok(e, "must stop: " + JSON.stringify(code));
    assert.match(e.message, re);
    assert.ok(!r.paths?.some((p) => !p.error), "no successful phantom path: " + JSON.stringify(code));
  }
  const zwsp = sim("x = 42\nDebug.Print x\u200b");
  assert.match((zwsp.error || zwsp.paths?.[0]?.error).message, /ゼロ幅スペース（U\+200B/);
});
test("RG-60 N1 BOM prefix is stripped and Japanese identifiers still work", () => {
  assert.deepEqual(outputs("\ufeff\u5408\u8a08 = 40 + 2\nDebug.Print \u5408\u8a08"), ["42"]);
});
test("RG-60 N2 CR-only and mixed line endings parse as line boundaries", () => {
  assert.deepEqual(outputs("x = 42\rDebug.Print x\r"), ["42"]);
  assert.deepEqual(outputs("x = 42\r\nDebug.Print x\n"), ["42"]);
});
