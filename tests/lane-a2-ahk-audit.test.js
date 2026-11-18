// Lane A2 AutoHotkey v2 監査チーム（A2-AHK）の回帰テスト。
// 期待値は AutoHotkey v2 公式ドキュメント（autohotkey.com/docs/v2）から
// 再導出したもの。プローブ表（lanes/lane-a2/probes.md）と公式が食い違う
// 箇所は公式を正とし、本ファイルのコメントと報告書に「本表の誤り」と記録する。
// 主な一次情報:
// - Throw.htm:「クラスなし Catch は Error クラスのインスタンスだけを受ける」
// - v2-changes: catch / catch as err は Error、catch Any はすべてを受ける
// - Map.htm: CaseSense の既定は "On"（大文字小文字を区別する）
// - Else.htm: Else は Try で例外が起きなかった場合だけ実行される
import test from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { referenceAdvanced } from "../js/types/autohotkey/reference-advanced.js";
import { applyAdvancedEngine } from "../js/types/autohotkey/advanced-engine.js";

const d = getDefinition("autohotkey");
applyAdvancedEngine(d, null);
const run = async (code, model) => {
  try {
    return await d.simulate(code, structuredClone(model ?? { ...d.model.defaults, event: null }));
  } catch (e) {
    return { harnessError: e.message };
  }
};
const errOf = (r) => r?.error ?? r?.paths?.[0]?.error ?? (r?.harnessError ? { category: "HARNESS", message: r.harnessError } : null);
const vars = (r) => r.paths?.[0]?.vars ?? {};

// ---------- AHK-01〜03: Try/Catch/Else/Finally の経路 ----------
test("AHK-01: 例外なしでは Else が実行され Catch は実行されない", async () => {
  const r = await run('result := ""\nTry {\n x := 1\n} Catch {\n result := "catch"\n} Else {\n result := "else"\n}');
  assert.equal(errOf(r), null);
  assert.equal(vars(r).result, "else");
});

test("AHK-02: Catch 発動時は Else は実行されない（公式形: Error を投げる）", async () => {
  const r = await run('result := ""\nTry {\n Throw Error("boom")\n} Catch {\n result := "catch"\n} Else {\n result := "else"\n}');
  assert.equal(errOf(r), null);
  assert.equal(vars(r).result, "catch");
});

test("AHK-02(本表原文): 文字列の Throw はクラスなし Catch を素通りし Else も実行されない", async () => {
  // 本表は「Catch が受ける」前提だが、公式 Throw.htm ではクラスなし Catch は
  // Error だけを受けるため文字列は伝播する。本表の誤りとして記録する。
  const r = await run('result := ""\nTry {\n Throw "boom"\n} Catch {\n result := "catch"\n} Else {\n result := "else"\n}');
  assert.ok(errOf(r));
  assert.equal(vars(r).result, "");
});

test("AHK-02b: どの Catch にも一致せず伝播する場合は Else は実行されない", async () => {
  const r = await run('result := ""\nTry {\n Throw "boom"\n} Catch Error {\n result := "catch"\n} Else {\n result := "else"\n}');
  assert.ok(errOf(r));
  assert.equal(vars(r).result, "");
});

test("AHK-03: Finally は正常・Catch 発動・伝播の全経路で実行される", async () => {
  const ok = await run('log := ""\nTry {\n x := 1\n} Finally {\n log .= "F"\n}');
  assert.equal(errOf(ok), null);
  assert.equal(vars(ok).log, "F");
  const caught = await run('log := ""\nTry {\n Throw Error("x")\n} Catch {\n log .= "C"\n} Finally {\n log .= "F"\n}');
  assert.equal(errOf(caught), null);
  assert.equal(vars(caught).log, "CF");
  const prop = await run('log := ""\nTry {\n Throw "x"\n} Catch Error {\n log .= "C"\n} Finally {\n log .= "F"\n}');
  assert.ok(errOf(prop));
  assert.equal(vars(prop).log, "F");
});

// ---------- AHK-04〜08: クラスなし Catch の受信範囲（F1/F2 回帰） ----------
test("AHK-04: クラスなし Catch は文字列を受けず伝播する。Catch Any／Catch String は受ける", async () => {
  const bare = await run('result := "none"\nTry {\n Throw "oops"\n} Catch {\n result := "caught"\n}');
  assert.ok(errOf(bare));
  assert.equal(errOf(bare).message, "oops");
  assert.equal(vars(bare).result, "none");
  const any = await run('result := "none"\nTry {\n Throw "oops"\n} Catch Any {\n result := "caught"\n}');
  assert.equal(errOf(any), null);
  assert.equal(vars(any).result, "caught");
  const str = await run('result := "none"\nTry {\n Throw "oops"\n} Catch String as e {\n result := e\n}');
  assert.equal(errOf(str), null);
  assert.equal(vars(str).result, "oops");
});

test("AHK-05: クラスなし Catch は数値を受けず伝播する。Catch Any as e は値と型を保持する", async () => {
  const bare = await run('result := "none"\nTry {\n Throw 42\n} Catch {\n result := "caught"\n}');
  assert.ok(errOf(bare));
  assert.equal(vars(bare).result, "none");
  const any = await run('v := 0\nt := ""\nTry {\n Throw 42\n} Catch Any as e {\n v := e\n t := Type(e)\n}');
  assert.equal(errOf(any), null);
  assert.equal(vars(any).v, 42);
  assert.equal(vars(any).t, "Integer");
});

test("AHK-06: クラスなし Catch は通常オブジェクトを受けず伝播する（表示は [object Object] にならない）", async () => {
  const bare = await run('result := "none"\nTry {\n Throw {code: 1}\n} Catch {\n result := "caught"\n}');
  assert.ok(errOf(bare));
  assert.ok(!errOf(bare).message.includes("[object Object]"), errOf(bare).message);
  assert.ok(errOf(bare).message.includes("code"), errOf(bare).message);
  assert.equal(vars(bare).result, "none");
  const any = await run('v := 0\nTry {\n Throw {code: 7}\n} Catch Any as e {\n v := e.code\n}');
  assert.equal(errOf(any), null);
  assert.equal(vars(any).v, 7);
});

test("F2: Catch Object／Map／Array は対応するオブジェクト値を受け取る", async () => {
  const obj = await run('v := 0\nTry {\n Throw {code: 3}\n} Catch Object as e {\n v := e.code\n}');
  assert.equal(errOf(obj), null);
  assert.equal(vars(obj).v, 3);
  const mp = await run('v := 0\nTry {\n Throw Map("k", 5)\n} Catch Map as e {\n v := e.Get("k")\n}');
  assert.equal(errOf(mp), null);
  assert.equal(vars(mp).v, 5);
  const ar = await run('v := 0\nTry {\n Throw [7, 8]\n} Catch Array as e {\n v := e[2]\n}');
  assert.equal(errOf(ar), null);
  assert.equal(vars(ar).v, 8);
  const errObj = await run('v := ""\nTry {\n Throw Error("z")\n} Catch Object as e {\n v := e.Message\n}');
  assert.equal(errOf(errObj), null);
  assert.equal(vars(errObj).v, "z");
});

test("AHK-07: Catch Error は文字列を受けない", async () => {
  const r = await run('result := "none"\nTry {\n Throw "oops"\n} Catch Error {\n result := "caught"\n}');
  assert.ok(errOf(r));
  assert.equal(vars(r).result, "none");
});

test("AHK-08: Catch Error as e／クラスなし Catch as e は Error と実行時エラーを受ける", async () => {
  const a = await run('msg := ""\nTry {\n Throw Error("boom")\n} Catch Error as e {\n msg := e.Message\n}');
  assert.equal(errOf(a), null);
  assert.equal(vars(a).msg, "boom");
  const b = await run('msg := ""\nTry {\n Throw Error("boom")\n} Catch as e {\n msg := e.Message\n}');
  assert.equal(errOf(b), null);
  assert.equal(vars(b).msg, "boom");
  const c = await run('msg := ""\nTry {\n x := 1 / 0\n} Catch as e {\n msg := e.Message\n}');
  assert.equal(errOf(c), null);
  assert.equal(vars(c).msg, "0による除算です");
});

test("F3: Catch も Finally もない Try は Error だけを暗黙に受け、非 Error 値は伝播する", async () => {
  const a = await run('x := 0\nTry {\n x := 1 / 0\n}\ny := 1');
  assert.equal(errOf(a), null);
  assert.equal(vars(a).y, 1);
  const b = await run('Try {\n Throw "s"\n}\ny := 1');
  assert.ok(errOf(b));
  const c = await run('log := ""\nTry {\n Throw Error("e")\n} Finally {\n log .= "F"\n}');
  assert.ok(errOf(c));
  assert.equal(vars(c).log, "F");
});

test("Catch 内の引数なし Throw は再スローする", async () => {
  const r = await run('Try {\n Throw Error("x")\n} Catch {\n Throw\n}');
  assert.ok(errOf(r));
  assert.equal(errOf(r).message, "x");
});

// ---------- AHK-09〜11: Map.CaseSense と Clone ----------
test("AHK-09: CaseSense \"On\" では A と a は別キーになる", async () => {
  const r = await run('m := Map()\nm.CaseSense := "On"\nm["A"] := 1\nm["a"] := 2\nc := m.Count');
  assert.equal(errOf(r), null);
  assert.equal(vars(r).c, 2);
});

test("AHK-10(公式で是正): CaseSense の既定は \"On\"（区別する）。本表の『既定は区別しない』は誤り", async () => {
  const r = await run('m := Map()\nm["A"] := 1\nm["a"] := 2\nc := m.Count');
  assert.equal(errOf(r), null);
  assert.equal(vars(r).c, 2);
  const miss = await run('m := Map()\nm["A"] := 1\nv := m["a"]');
  assert.ok(errOf(miss));
  assert.equal(errOf(miss).category, "UnsetItemError");
});

test("AHK-11: Clone は要素と CaseSense を引き継ぐ", async () => {
  const r = await run('m := Map()\nm.CaseSense := "On"\nm["A"] := 1\nm["a"] := 2\nn := m.Clone()\nc := n.Count\nx := n["A"]\ny := n["a"]\ncs := n.CaseSense');
  assert.equal(errOf(r), null);
  assert.equal(vars(r).c, 2);
  assert.equal(vars(r).x, 1);
  assert.equal(vars(r).y, 2);
  assert.equal(vars(r).cs, "On");
});

// ---------- AHK-12〜15・30: 正規表現（PCRE→JS 変換、F6 回帰） ----------
test("AHK-12: RegExMatch は一致位置（1始まり）を返す", async () => {
  const r = await run('p := RegExMatch("abc123", "\\d+")');
  assert.equal(errOf(r), null);
  assert.equal(vars(r).p, 4);
});

test("AHK-13: \\p{Lu} は等価変換され大文字に一致する。\\pL／\\P{Lu}／\\p{Nd} も同様", async () => {
  assert.equal(vars(await run('p := RegExMatch("aBc", "\\p{Lu}")')).p, 2);
  assert.equal(vars(await run('p := RegExMatch("aBc", "\\pL")')).p, 1);
  assert.equal(vars(await run('p := RegExMatch("ABc", "\\P{Lu}")')).p, 3);
  assert.equal(vars(await run('p := RegExMatch("ab5", "\\p{Nd}")')).p, 3);
});

test("AHK-14: \\K は名前を挙げて未対応停止する", async () => {
  const r = await run('p := RegExMatch("abc", "a\\Kb")');
  assert.ok(errOf(r));
  assert.ok(errOf(r).message.includes("\\K"), errOf(r).message);
  assert.ok(errOf(r).message.includes("未対応"), errOf(r).message);
});

test("AHK-15: \\A と \\z は文字列の厳密な先頭・末尾にだけ一致する", async () => {
  assert.equal(vars(await run('p := RegExMatch("xabc", "\\Aabc")')).p, 0);
  assert.equal(vars(await run('p := RegExMatch("abc", "\\Aabc")')).p, 1);
  assert.equal(vars(await run('p := RegExMatch("abc`n", "bc\\z")')).p, 0);
  assert.equal(vars(await run('p := RegExMatch("ba", "a\\A")')).p, 0);
});

test("F6: エスケープされた \\\\A／\\\\z と文字クラス内の \\A はリテラルとして扱われる", async () => {
  // AHK文字列 "\\A" は正規表現では「バックスラッシュ＋A」のリテラル。
  assert.equal(vars(await run('p := RegExMatch("x\\Ay", "\\\\A")')).p, 2);
  assert.equal(vars(await run('p := RegExMatch("x\\zy", "\\\\z")')).p, 2);
  // 文字クラス内の \A は PCRE では文字 'A' として扱われる（変換前は ValueError になっていた）。
  const cls = await run('p := RegExMatch("A", "[\\A]")');
  assert.equal(errOf(cls), null);
  assert.equal(vars(cls).p, 1);
});

test("AHK-30: 不正な正規表現は正直に ValueError で停止する", async () => {
  const r = await run('p := RegExMatch("abc", "([")');
  assert.ok(errOf(r));
  assert.equal(errOf(r).category, "ValueError");
});

// ---------- AHK-16・17: Round ----------
test("AHK-16(記録): タイは 0 から遠い側へ丸める実装挙動。型は桁数で決まる（F4）", async () => {
  // タイ方向は公式で確定できないため「記録のみ」。値は現行実装の実測。
  assert.equal(vars(await run("r := Round(2.5)")).r, 3);
  assert.equal(vars(await run("r := Round(3.5)")).r, 4);
  assert.equal(vars(await run("r := Round(-2.5)")).r, -3);
  assert.equal(vars(await run("t := Type(Round(2.5))")).t, "Integer");
  assert.equal(vars(await run("t := Type(Round(2.567, 2))")).t, "Float");
  const neg = await run("r := Round(123.456, -1)\nt := Type(Round(123.456, -1))");
  assert.equal(vars(neg).r, 120);
  assert.equal(vars(neg).t, "Integer");
});

test("AHK-17: Round(2.567, 2) は 2.57（Float は表示文字列で保持される）", async () => {
  const r = await run("r := Round(2.567, 2)");
  assert.equal(errOf(r), null);
  assert.equal(vars(r).r, "2.57");
});

// ---------- AHK-18〜22: 名指し停止と前提の是正 ----------
test("AHK-18: DllCall は名前を挙げて未対応停止する", async () => {
  const r = await run('x := DllCall("user32\\MessageBox", "Ptr", 0, "Str", "x", "Str", "t", "UInt", 0)');
  assert.ok(errOf(r));
  assert.ok(errOf(r).message.includes("DllCall"), errOf(r).message);
});

test("AHK-19(前提是正): WinActivate は基礎対応であり、対象なしは TargetError。本表の『未対応停止』前提は誤り", async () => {
  for (const code of ['WinActivate("Untitled")', 'WinActivate "Untitled"']) {
    const r = await run(code);
    assert.ok(errOf(r), code);
    assert.equal(errOf(r).category, "TargetError", code);
    assert.ok(!errOf(r).message.includes("未対応"), code);
  }
});

test("AHK-20(前提是正): Send は基礎対応でありモデルへ送信される（エラーなし）", async () => {
  for (const code of ['Send("abc")', 'Send "abc"']) {
    const r = await run(code);
    assert.equal(errOf(r), null, code);
  }
});

test("AHK-21: FileAppend は名前を挙げて未対応停止する", async () => {
  const r = await run('FileAppend("x", "out.txt")');
  assert.ok(errOf(r));
  assert.ok(errOf(r).message.includes("FileAppend"), errOf(r).message);
});

test("AHK-22: EnvGet／EnvSet は名前を挙げて未対応停止する（仮想環境変数代替は保留のまま）", async () => {
  const g = await run('x := EnvGet("MUSE_PROBE_NONEXISTENT")');
  assert.ok(errOf(g));
  assert.ok(errOf(g).message.includes("EnvGet"), errOf(g).message);
  const s = await run('EnvSet("MUSE_PROBE_X", "1")');
  assert.ok(errOf(s));
  assert.ok(errOf(s).message.includes("EnvSet"), errOf(s).message);
});

// ---------- AHK-23〜29・31〜33: 基礎意味論 ----------
test("AHK-23〜25: StrLen／SubStr／InStr", async () => {
  assert.equal(vars(await run('n := StrLen("あいう")')).n, 3);
  assert.equal(vars(await run('s := SubStr("abcdef", -2)')).s, "ef");
  assert.equal(vars(await run('s := SubStr("hi", 10)')).s, "");
  assert.equal(vars(await run('p := InStr("hello", "L")')).p, 3);
  assert.equal(vars(await run('p := InStr("hello", "L", true)')).p, 0);
});

test("AHK-26・27: 配列は1始まりで [0] は IndexError", async () => {
  const r = await run("arr := [10, 20, 30]\nn := arr.Length\nv := arr[1]");
  assert.equal(errOf(r), null);
  assert.equal(vars(r).n, 3);
  assert.equal(vars(r).v, 10);
  const bad = await run("arr := [10, 20]\nv := arr[0]");
  assert.ok(errOf(bad));
  assert.equal(errOf(bad).category, "IndexError");
});

test("AHK-28・29: 0除算は ZeroDivisionError、未定義変数は名前入りの NameError", async () => {
  const z = await run("x := 1 / 0");
  assert.ok(errOf(z));
  assert.equal(errOf(z).category, "ZeroDivisionError");
  const n = await run("x := probeUndefined123 + 1");
  assert.ok(errOf(n));
  assert.equal(errOf(n).category, "NameError");
  assert.ok(errOf(n).message.includes("probeUndefined123"), errOf(n).message);
});

test("AHK-31: 整数除算 // は名前と理由を挙げて未対応停止する（共有コア側の申し送り）", async () => {
  const r = await run("x := 7 // 2");
  assert.ok(errOf(r));
  assert.ok(errOf(r).message.includes("//"), errOf(r).message);
  assert.ok(errOf(r).message.includes("未対応"), errOf(r).message);
});

test("AHK-32: = は大小を区別せず、== は区別する", async () => {
  assert.equal(vars(await run('x := ("abc" = "ABC")')).x, 1);
  assert.equal(vars(await run('x := ("abc" == "ABC")')).x, 0);
});

test("AHK-33: アロー関数 => は名前を挙げて未対応停止する（ユーザー定義関数は基礎で未対応）", async () => {
  const r = await run("f := (x) => x * 2\nr := f(21)");
  assert.ok(errOf(r));
  assert.ok(errOf(r).message.includes("=>") || errOf(r).message.includes("アロー"), errOf(r).message);
});

// ---------- §1-4: 名指し停止の全数照合 ----------
const plainForms = (name) => {
  const list = [
    `x := ${name}()`,
    `x := ${name}(1)`,
    `x := ${name}("a", 1)`,
    `${name}()`,
    `${name} "a"`,
    `x := ${name}`,
  ];
  if (name.startsWith("Loop ")) list.push(`${name}, "C:\\*" {\n}`);
  if (name === "Goto") list.push("Goto, lbl\nlbl:\nx := 1");
  if (name === "Until") list.push("Loop {\n x := 1\n} Until x > 0");
  return list;
};

test("§1-4: 未対応の通常関数271件は全件が自分の名前を挙げて停止する", async () => {
  const plain = referenceAdvanced.filter((e) => e.status === "unsupported" && !e.name.includes("."));
  assert.equal(plain.length, 271);
  const unnamed = [];
  const noStop = [];
  for (const e of plain) {
    let named = false;
    let anyStop = false;
    let firstMsg = "";
    for (const code of plainForms(e.name)) {
      const err = errOf(await run(code));
      if (err) {
        anyStop = true;
        if (!firstMsg) firstMsg = `[${err.category}] ${err.message}`;
        if (err.message.includes(e.name)) { named = true; break; }
      }
    }
    if (!named) (anyStop ? unnamed : noStop).push(`${e.name} :: ${firstMsg}`);
  }
  assert.deepEqual(noStop, []);
  assert.deepEqual(unnamed, []);
});

test("§1-4: ドット形36件のうち受信側を構築できる3件は名指し停止し、33件は呼び出し形が無い", async () => {
  const dotted = referenceAdvanced.filter((e) => e.status === "unsupported" && e.name.includes("."));
  assert.equal(dotted.length, 36);
  const receivers = { Array: "[1, 2]", Map: 'Map("a", 1)', Object: "{}", Buffer: "Buffer(4)" };
  const noForm = [];
  const checked = [];
  for (const e of dotted) {
    const [type, method] = e.name.split(".");
    const recv = receivers[type];
    if (recv === undefined) { noForm.push(e.name); continue; }
    let named = false;
    for (const code of [
      `rcv := ${recv}\nx := rcv.${method}()`,
      `rcv := ${recv}\nx := rcv.${method}(1)`,
      `rcv := ${recv}\nrcv.${method}()`,
    ]) {
      const err = errOf(await run(code));
      if (err && (err.message.includes(method) || err.message.includes(e.name))) { named = true; break; }
    }
    checked.push(`${e.name}:${named ? "named" : "NOT-NAMED"}`);
  }
  assert.deepEqual(checked, ["Array.__Enum:named", "Map.__Enum:named", "Object.OwnProps:named"]);
  assert.equal(noForm.length, 33);
  // 形が無い内訳: File.* 10・Menu.* 15・InputHook.* 4・Func.* 4
  // （コンストラクタ自体が未対応停止するため受信側オブジェクトを作れない）
  const count = (p) => noForm.filter((n) => n.startsWith(p)).length;
  assert.deepEqual([count("File."), count("Menu."), count("InputHook."), count("Func.")], [10, 15, 4, 4]);
});

// ---------- C-12: 対応項目の使用例が宣言どおりに動く ----------
test("C-12: 高度差分 対応98件は文脈付き使用例で宣言どおりに動く（Throw は投げるのが正）", async () => {
  const SETUP = [
    "a := [10, 20, 30]",
    'm := Map("a", 1)',
    "obj := {x: 1}",
    "buf := Buffer(16)",
    'RegExMatch("abc123", "(\\d+)", &m2)',
    "x := 1",
    'out := ""',
  ].join("\n");
  const wrap = (e) => {
    if (e.name === "Catch") return `Try {\n Throw ValueError("v")\n} ${e.example}`;
    if (e.name === "Finally") return `Try {\n x := 1\n} ${e.example}`;
    if (e.name.startsWith("RegExMatchInfo.")) return `RegExMatch("abc123", "(\\d+)", &m)\n${e.example}`;
    return `${SETUP}\n${e.example}`;
  };
  const sup = referenceAdvanced.filter((e) => e.status === "supported");
  assert.equal(sup.length, 98);
  const bad = [];
  for (const e of sup) {
    const err = errOf(await run(wrap(e)));
    if (!err) continue;
    if (e.name === "Throw" && err.message.includes("値が不正です")) continue; // 例自体が投げるのが宣言どおり
    bad.push(`${e.name} :: [${err.category}] ${err.message}`);
  }
  assert.deepEqual(bad, []);
});

test("C-12: 基礎リファレンス26件の使用例が既定モデルで動く", async () => {
  assert.equal(d.reference.length, 26);
  const bad = [];
  for (const e of d.reference) {
    const err = errOf(await run(e.example, structuredClone(d.model.defaults)));
    if (err) bad.push(`${e.name} :: [${err.category}] ${err.message}`);
  }
  assert.deepEqual(bad, []);
});

// ---------- C-03: 表示面に内部表現が漏れない ----------
test("C-03: Map／Buffer を含むコードの trace・最終状態表示・出力に内部キーが漏れない", async () => {
  const leakRe = /__ahkType|__groups|"entries"|"bytes"/;
  const codes = [
    'm := Map("a", 1, "b", 2)\nbuf := Buffer(4)\nbuf2 := Buffer(3, 255)',
    'm := Map()\nm.CaseSense := "Off"\nm["Key"] := [1, 2]\ninner := Map("x", 9)\nm["inner"] := inner',
    'p := RegExMatch("abc123", "(?P<d>\\d+)", &mi)\nwhole := mi[0]',
    'arr := [Map("k", 1), Buffer(2)]\no := {m: Map("a", 1)}',
  ];
  // groups は {title, entries:[[名前, 表示文字列]]} の入れ物であり、検査対象は
  // その「表示文字列」の中身（入れ物自体の entries キーは対象外）。
  const displayValues = (p) => (p.groups ?? []).flatMap((g) => (g.entries ?? []).map((e) => String(e[1])));
  for (const code of codes) {
    const r = await run(code);
    const p = r.paths?.[0];
    assert.ok(p, code);
    const traceText = (p.trace || []).map((t) => t.text).join("\n");
    assert.ok(!leakRe.test(traceText), `trace leak: ${code}`);
    for (const v of displayValues(p)) assert.ok(!leakRe.test(v), `display leak: ${code} :: ${v}`);
    assert.ok(!leakRe.test(JSON.stringify(p.outputs ?? {})), `outputs leak: ${code}`);
    // 注: paths[].vars の生オブジェクトには内部キー（__ahkType 等）が残る。
    // これは B2 申し送り6 のデータ層の残存であり、学習者向け表示には出ない。
  }
  // 表示文字列そのものの形（Map はキーと値の組、Buffer はバイト列として読める形）
  const r = await run('m := Map("a", 1, "b", 2)\nbuf := Buffer(2)');
  const values = displayValues(r.paths[0]);
  assert.ok(values.some((v) => v.includes('"a": 1') && v.includes('"b": 2')), JSON.stringify(values));
  assert.ok(values.some((v) => v.includes("Buffer（バイト列）")), JSON.stringify(values));
});

// ---------- 文面照合（F7・AHK-17・AHK-22 の文面側） ----------
test("文面: Catch／Round／Throw／EnvGet／EnvSet／Map の説明が公式と整合する", () => {
  const byName = Object.fromEntries(referenceAdvanced.map((e) => [e.name, e]));
  assert.ok(byName["Catch"].caution.includes("Error クラスのインスタンスだけ"));
  assert.ok(byName["Catch"].caution.includes("Catch Any"));
  assert.ok(byName["Round"].caution.includes("桁数が正なら Float"));
  assert.ok(byName["Round"].caution.includes("省略・0・負なら整数"));
  assert.ok(byName["Throw"].caution.includes("クラスなしの Catch は Error のインスタンスだけ"));
  assert.ok(byName["EnvGet"].description.includes("読み取り"));
  assert.ok(byName["EnvGet"].caution.includes("保留"));
  assert.ok(byName["EnvSet"].description.includes("書き込み"));
  assert.ok(byName["EnvSet"].caution.includes("保留"));
  assert.ok(byName["Map"].caution.includes("既定で大文字小文字を区別"));
});
