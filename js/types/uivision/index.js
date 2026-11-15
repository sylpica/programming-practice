import { additionalTemplates } from "./additional-templates.js";
import {
  executeProgram,
  parseExpression,
  PracticeError,
  toLearnerError,
} from "../../core/script.js";
import { rows, sourceFailure } from "../../core/data.js";
import { actionProgram, interpolate, uiCondition } from "../../core/actions.js";
import { createActionEditor } from "../../core/action-editor.js";
import { formatModelValue as formatValue, isUnknown, unknown } from "../../core/contract.js";
const samples = [
  ["open", "https://example.test/form", ""],
  ["click", "id=submit", ""],
  ["type", "id=name", "こんにちは"],
  ["store", "0", "count"],
  ["storeText", "id=result", "Result"],
  ["storeValue", "id=name", "Name"],
  ["echo", "${Result}", ""],
  ["if", '${count} == "0"', ""],
  ["elseif", '${count} == "1"', ""],
  ["else", "", ""],
  ["end", "", ""],
  ["while", "${count} < 3", ""],
  ["times", "3", ""],
  ["executeScript_Sandbox", "return Number(${count}) + 1;", "count"],
  ["break", "", ""],
  ["continue", "", ""],
  ["assertText", "id=result", "完了"],
];
const palette = samples.map(([Command, Target, Value]) => ({
  name: Command,
  sample: { Command, Target, Value },
}));
const reference = rows(
  samples.map(([name, t, v]) => [
    name,
    "コマンド",
    `${name} | ${t} | ${v}`,
    name === "type"
      ? "入力要素の値を置き換えます。clickなどの動作後はモデルに定義した効果だけを反映します。"
      : name === "open"
        ? "モデルに存在するURLのページを開きます。"
        : "UI.VisionのClassicマクロコマンドをモデルページ上で説明します。",
    JSON.stringify({ Command: name, Target: t, Value: v }),
    "JavaScript条件は安全な構文解析の部分集合です。任意のスクリプトは実行しません。",
  ]),
);
const encode = (Commands) =>
  JSON.stringify(
    { Name: "練習マクロ", CreationDate: "モデル", Commands },
    null,
    2,
  );
// RA-61: assertText／verifyText のパターン照合（Selenium IDE の pattern
// 規則）。glob（*／?）を基本に、exact:／regexp:／regexpi: 接頭辞を扱う。
function uiTextMatches(actual, pattern, node, api) {
  if (pattern.startsWith("exact:")) return actual === pattern.slice(6);
  if (pattern.startsWith("regexp:") || pattern.startsWith("regexpi:")) {
    let insensitive = pattern.startsWith("regexpi:");
    try {
      return new RegExp(
        pattern.slice(insensitive ? 8 : 7),
        insensitive ? "i" : "",
      ).test(actual);
    } catch {
      api.fail("assertText：パターンの正規表現が不正です", node);
    }
  }
  let source = "^";
  for (let ch of pattern) {
    if (ch === "*") source += "[\\s\\S]*";
    else if (ch === "?") source += "[\\s\\S]";
    else source += ch.replace(/[.*+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(source + "$").test(actual);
}
const cmd = (Command, Target = "", Value = "") => ({ Command, Target, Value });
for (const r of reference) {
  const sample = palette.find(p => p.name === r.name).sample;
  const setup = [cmd("open","https://example.test/form"),cmd("store","0","count"),cmd("store","完了","Result"),cmd("click","id=submit")];
  let commands = [sample];
  if (["if","elseif","else","end"].includes(r.name)) commands = [cmd("if","${count} == 0"),cmd("echo","0"),cmd("elseif","${count} == 1"),cmd("echo","1"),cmd("else"),cmd("echo","その他"),cmd("end")];
  if (r.name === "while") commands = [sample,cmd("executeScript_Sandbox","return Number(${count}) + 1;","count"),cmd("end")];
  if (r.name === "times") commands = [sample,cmd("echo","繰り返し"),cmd("end")];
  if (["break","continue"].includes(r.name)) commands = [cmd("times","2"),sample,cmd("end")];
  r.example = encode([...setup,...commands]);
}
// RG-59（統合）: executeScript_Sandbox の式で使う JavaScript の Number 関数は、
// コマンドではないが式の語彙としてリファレンスに載せる（trace refs の Number に対応）。
reference.push({
  name: "Number",
  category: "式の関数",
  syntax: "Number(値)",
  description:
    "式の中で文字列などを数値へ変換します（JavaScriptのNumber関数）。executeScript_Sandboxのreturn式などで使います。",
  example: encode([
    cmd("open", "https://example.test/form"),
    cmd("store", "0", "count"),
    cmd("executeScript_Sandbox", "return Number(${count}) + 1;", "count"),
    cmd("echo", "${count}"),
  ]),
  caution: "数値に変換できない文字列では NaN になります。",
  supported: true,
});
// Number と同じ方針：式の語彙として String 関数もリファレンスに載せる
// （Sandbox 式で使える関数は Number と String の2件のみで、他は未対応で停止する）。
reference.push({
  name: "String",
  category: "式の関数",
  syntax: "String(値)",
  description:
    "式の中で値を文字列へ変換します（JavaScriptのString関数）。executeScript_Sandboxのreturn式などで使います。",
  example: encode([
    cmd("open", "https://example.test/form"),
    cmd("store", "0", "count"),
    cmd("executeScript_Sandbox", "return String(${count});", "text"),
    cmd("echo", "${text}"),
  ]),
  caution: "このモデルで式に使える関数はNumberとStringのみです。",
  supported: true,
});
// 製品の組み込み変数も、式・条件で使う語彙としてリファレンスに載せる（Number の前例と同方針）。
reference.push({
  name: "${!times}",
  category: "組み込み変数",
  syntax: "${!times}",
  description:
    "timesループの中で使える組み込み変数です。現在の繰り返し回数を1始まりで表します。",
  example: encode([
    cmd("open", "https://example.test/form"),
    cmd("times", "2"),
    cmd("echo", "${!times}"),
    cmd("end"),
  ]),
  caution: "timesループの外では値は設定されません。",
  supported: true,
});
reference.push({
  name: "!statusOK",
  category: "組み込み変数",
  syntax: "${!statusOK}",
  description:
    "コマンドの成否を表す組み込み変数です。エラーになった場合や、storeText／storeValueで要素が見つからず#LNFになった場合にfalseになります。falseは成功したコマンドでは自動では戻らず、storeでtrueを保存すると手動で戻せます。",
  example: encode([
    cmd("open", "https://example.test/form"),
    cmd("store", "0", "count"),
    cmd("echo", "${!statusOK}"),
  ]),
  caution: "",
  supported: true,
});
reference.push({
  name: "!errorIgnore",
  category: "組み込み変数",
  syntax: "${!errorIgnore}",
  description:
    "文字列\"true\"に設定すると、コマンドでエラーが起きてもマクロを止めずに継続します。",
  example: encode([
    cmd("open", "https://example.test/form"),
    cmd("store", "true", "!errorIgnore"),
    cmd("echo", "${!errorIgnore}"),
  ]),
  caution: "このモデルでは文字列\"true\"のときだけ有効です。",
  supported: true,
});
export const definition = {
  id: "uivision",
  name: "UI.Vision RPA",
  extensions: [".json", ".txt"],
  syntax: { name: "UI.Vision Classic マクロJSON", caseSensitive: true },
  reference,
  templates: [
    {
      id: "ui-form",
      title: "フォームへ入力してクリック",
      code: encode([
        cmd("open", "https://example.test/form"),
        cmd("type", "id=name", "学習者"),
        cmd("click", "id=submit"),
        cmd("storeText", "id=result", "Result"),
        cmd("echo", "${Result}"),
      ]),
      intro:
        "open / type / clickをモデルページ上で確認します。送信ボタンの効果はモデルのonClickに明示します。",
      refs: ["open", "type", "click", "storeText", "echo"],
    },
    {
      id: "ui-loop",
      title: "whileで入力を繰り返す",
      code: encode([
        cmd("open", "https://example.test/form"),
        cmd("store", "0", "count"),
        cmd("while", "${count} < 3"),
        cmd("type", "id=name", "${count}"),
        cmd("executeScript_Sandbox", "return Number(${count}) + 1;", "count"),
        cmd("end"),
        cmd("echo", "${count}"),
      ]),
      intro:
        "whileはJavaScript条件を評価します。executeScript_Sandboxはこのアプリで確認した単純式のみ対応します。",
      refs: ["store", "while", "executeScript_Sandbox", "type"],
    },
    {
      id: "ui-runtime",
      title: "ページの未確定テキストで分岐",
      code: encode([
        cmd("open", "https://example.test/form"),
        cmd("storeText", "id=remote", "Remote"),
        cmd("if", '"${Remote}" == "OK"'),
        cmd("type", "id=name", "成功"),
        cmd("else"),
        cmd("echo", "実行時のページ内容を確認"),
        cmd("end"),
      ]),
      intro:
        "未確定と設定した要素の値は捏造せず、到達可能な分岐として説明します。",
      refs: ["storeText", "if", "type", "echo"],
    },
  ],
  glossary: [
    ["ロケーター", "id=などでページ要素を識別する指定です。"],
    ["モデルページ", "URL、要素、クリック後の効果を明示した仮想ページです。"],
    [
      "未確定（値）",
      "実行時に決まる値のことです。このアプリでは値を仮定して作らず、未確定のまま扱って、到達可能な分岐をすべて表示します。",
    ],
  ],
  editor: createActionEditor({
    key: "Commands",
    columns: ["Command", "Target", "Value"],
    palette,
  }),
  model: {
    kind: "json",
    title: "モデルWebページ",
    hint: "pagesにURLと要素を定義します。実際のブラウザやネットワークには接続しません。onClick以外のサイト動作は推測しません。",
    defaults: {
      url: "https://example.test/form",
      variables: {},
      pages: {
        "https://example.test/form": {
          elements: {
            "id=name": { tag: "input", value: "", text: "" },
            "id=submit": {
              tag: "button",
              text: "送信",
              onClick: { setText: { "id=result": "完了" } },
            },
            "id=result": { tag: "div", text: "未送信" },
            "id=remote": {
              tag: "span",
              text: unknown("実行時のページ内容", "remote"),
            },
          },
        },
      },
      clicks: [],
    },
  },
  semantics: {
    description:
      "UI.Vision ClassicのCommands配列をASTに変換し、モデルURL・要素・入力値の変化を説明します。",
    support:
      "id= / css= / xpath=等はモデルのキーとの完全一致で解決します。実DOMの探索、画像認識、任意JS、外部ナビゲーション、非同期イベントは未対応です。",
    sources: [
      {
        title: "UI.Vision公式 Classicコマンド",
        url: "https://ui.vision/rpa/docs/selenium-ide",
      },
      {
        title: "UI.Vision公式 If",
        url: "https://ui.vision/rpa/docs/selenium-ide/if",
      },
      {
        title: "UI.Vision公式 While",
        url: "https://ui.vision/rpa/docs/selenium-ide/while",
      },
    ],
  },
  scan(code) {
    try {
      return [
        ...new Set(
          JSON.parse(code).Commands.map((c) =>
            // D-5: 製品綴り elseIf は項目名 elseif として数える。
            c.Command === "elseIf" ? "elseif" : c.Command,
          ),
        ),
      ].filter((n) => reference.some((r) => r.name === n));
    } catch {
      return [];
    }
  },
  async simulate(code, model, limits) {
    try {
      let { nodes } = actionProgram(code, {
        key: "Commands",
        command: "Command",
        classify: (n) =>
          ({
            if: "if",
            elseif: "elseif",
            // D-5: 製品の正綴りは elseIf（公式ドキュメント／コマンド
            // 一覧）。elseif だけを通すと elseIf は通常コマンド扱いに
            // 落ち、if の本体に紛れて黙って無視されていた。分岐として
            // 受理し、項目名は elseif に寄せる。
            elseIf: "elseif",
            else: "else",
            end: "end",
            endIf: "end",
            endWhile: "end",
            while: "while",
            times: "loop",
            forEach: "unsupported-block",
          })[n] || "action",
      });
      // D-5（refs 側）: 分岐ノードの refs は実際のコマンド名（elseIf）
      // のまま付くため、リファレンス項目名（elseif）に寄せてから実行
      // する（リンク・チップ解決が綴り違いで外れないように）。
      (function normalizeElseIfRefs(list) {
        for (let n of list || []) {
          if (Array.isArray(n.refs))
            n.refs = n.refs.map((r) => (r === "elseIf" ? "elseif" : r));
          normalizeElseIfRefs(n.body);
          normalizeElseIfRefs(n.otherwise);
        }
      })(nodes);
      const semantics = {
        dialect: "js",
        initialize(s) {
          s.vars["!statusOK"] = true;
        },
        read(a, s) {
          // R24-N36：undefined は JavaScript の定義済みグローバル値。
          // サンドボックス式（executeScript_Sandbox の return 式や条件式）
          // で「未定義の名前：undefined」という虚偽原因の ReferenceError
          // にしない（NaN／Infinity も同じグローバル値として解決する）。
          if (a?.k === "var" && a.name === "undefined")
            return { handled: true, value: undefined };
          if (a?.k === "var" && a.name === "NaN")
            return { handled: true, value: NaN };
          if (a?.k === "var" && a.name === "Infinity")
            return { handled: true, value: Infinity };
          if (a?.k === "var" && typeof s.vars[a.name] === "string") {
            let text = s.vars[a.name].trim();
            if (text !== "" && !Number.isNaN(Number(text)))
              return { handled: true, value: Number(text) };
          }
          return undefined;
        },
        call(name, args, s, api, node) {
          // 引数の欠落は null ではなく undefined として渡る（JS 本体と同根）。
          const arg0 = args.length ? api.read(args[0], s) : undefined;
          if (name === "Number") {
            let v = arg0;
            return isUnknown(v)
              ? unknown("数値変換する値による", v.id)
              : Number(v);
          }
          if (name === "String") {
            let v = arg0;
            return isUnknown(v) ? v : String(v);
          }
          api.fail("このスクリプト関数は未対応です：" + name, node);
        },
        step(n, s, api) {
          if (n.k === "action-if") {
            let value = uiCondition(n.test, s, api),
              done = [];
            for (let r of api.choose(s, value, n)) {
              api.note(
                r.s,
                n,
                r.yes ? "条件が成立します" : "条件が成立しません",
              );
              done.push(...api.run(r.yes ? n.body : n.otherwise, [r.s]));
            }
            return done;
          }
          if (n.k === "action-loop") {
            let test = String(n.item.Target).replace(/\$\{([^}]+)\}/g, "$1");
            if (n.mode === "while")
              return api.run(
                [{ ...n, k: "while", test: parseExpression(test) }],
                [s],
              );
            let count = Number(interpolate(n.item.Target, s));
            if (!Number.isInteger(count) || count < 0)
              api.fail("timesの回数が不正です", n);
            const hadCounter = Object.hasOwn(s.vars, "!times"), previousCounter = s.vars["!times"];
            const results = api.run(
              [{ ...n, k: "repeat", counterName: "!times", count: { k: "literal", value: count } }],
              [s],
            );
            for (const out of results) {
              if (hadCounter) out.vars["!times"] = previousCounter;
              else delete out.vars["!times"];
            }
            return results;
          }
        },
        action(n, s, api) {
          let target = interpolate(n.item.Target ?? "", s),
            value = interpolate(n.item.Value ?? "", s);
          function element(optional = false) {
            if (isUnknown(target))
              api.fail("未確定ロケーターの要素は説明できません", n);
            let e = s.model.pages?.[s.model.url]?.elements?.[target];
            if (!e && !optional) api.fail("モデルに要素がありません：" + target, n);
            return e;
          }
          // D-6: エラーで止まらない失敗（#LNF）を記録するフラグ。
          let softFail = false;
          try {
            switch (n.action) {
              case "open":
                if (isUnknown(target)) api.fail("URLが未確定です", n);
                if (!s.model.pages?.[target])
                  api.fail("モデルにページがありません：" + target, n);
                s.model.url = target;
                api.note(s, n, "モデルページを開きます：" + target);
                break;
              case "type": {
                let e = element();
                if (!["input", "textarea"].includes(e.tag))
                  api.fail("入力できない要素です", n);
                e.value = value;
                api.note(
                  s,
                  n,
                  `${target} の入力値を ${formatValue(value)} に置き換えます`,
                );
                break;
              }
              case "click": {
                let e = element();
                s.model.clicks ??= [];
                s.model.clicks.push(target);
                // NX-N24: 効果が定義されている場合だけその効果・遷移先を
                // 述べ、無い場合は「定義されていません」と正直に伝える
                // （起きていない効果を主張しない）。
                let effects = [];
                if (e.onClick?.setText) {
                  for (let [k, v] of Object.entries(e.onClick.setText)) {
                    let destination = s.model.pages[s.model.url].elements[k];
                    if (!destination)
                      api.fail(
                        "クリック効果の対象がモデルにありません：" + k,
                        n,
                      );
                    destination.text = v;
                  }
                  effects.push("モデルに定義された効果を反映します");
                }
                if (e.href) {
                  if (!s.model.pages[e.href])
                    api.fail("リンク先がモデルにありません", n);
                  s.model.url = e.href;
                  effects.push(`リンク先 ${e.href} へ遷移します`);
                }
                api.note(
                  s,
                  n,
                  effects.length
                    ? `${target} をクリックし、${effects.join("、")}`
                    : `${target} をクリックします（モデルに効果は定義されていません）`,
                );
                break;
              }
              case "store":
                s.vars[String(value)] = target;
                api.note(
                  s,
                  n,
                  `${value} に ${formatValue(target)} を保存します`,
                );
                break;
              case "storeText":
              case "storeValue": {
                const e = element(true);
                s.vars[String(value)] = !e ? "#LNF" : n.action === "storeValue" ? (e.value ?? "") : ["input", "select", "textarea"].includes(e.tag?.toLowerCase()) ? "" : (e.text ?? "");
                // D-6: ロケーター不一致（#LNF）はエラーで止まらないが、
                // !statusOK は false になる（公式ドキュメント／Changelog
                // V5.3.17）。成功扱いのまま true を返すと、後続の状態
                // 判定が誤る。
                if (!e) softFail = true;
                api.note(s, n, `${value} に ${e ? "モデル要素の値" : "#LNF（ロケーター不一致）"}を保存します`);
                break;
              }
              case "echo":
                s.outputs.push({
                  channel: "echo",
                  text: formatValue(target),
                  line: n.line,
                });
                api.note(s, n, "ログへ出力します：" + formatValue(target));
                break;
              case "executeScript_Sandbox": {
                let expr = String(n.item.Target).trim();
                if (!/^return\s/.test(expr))
                  api.fail("return 式 のみ対応しています", n);
                expr = expr.replace(/^return\s+/, "").replace(/;\s*$/, "");
                s.vars[String(value)] = uiCondition(expr, s, api);
                api.note(
                  s,
                  n,
                  `${value} に単純式の結果 ${formatValue(s.vars[String(value)])} を保存します`,
                );
                break;
              }
              case "break":
              case "continue":
                if (!s.loopDepth) api.fail("ループ外では使用できません", n);
                s.signal = n.action;
                // NX-N25: コマンド名そのままではなく、実際の動作を
                // 日本語で説明する（共有コア／Power Automate の文と同文）。
                api.note(
                  s,
                  n,
                  n.action === "break"
                    ? "ループを抜けます"
                    : "次の繰り返しへ進みます",
                );
                break;
              case "assertText": {
                let actual = element().text;
                if (isUnknown(actual) || isUnknown(value))
                  api.fail("assertTextの結果は実行時に決まるため未確認です", n);
                // RA-61: 期待値は「完全一致」ではなくパターンとして
                // 照合する（公式 assertText／verifyText ページ）。glob
                // 形式（* は任意の文字列、? は任意の1文字）を基本とし、
                // exact: 接頭辞では完全一致、regexp:／regexpi: 接頭辞
                // では正規表現として照合する。ワイルドカードを含まない
                // glob は完全一致と同じ結果になる。
                if (!uiTextMatches(String(actual), String(value), n, api))
                  api.fail("assertText：テキストが一致しません", n);
                api.note(s, n, "テキストがパターンと一致します");
                break;
              }
              default:
                api.fail(
                  "このコマンドは説明に対応していません：" + n.action,
                  n,
                );
            }
            // D-6: #LNF のときは false。あわせて公式ドキュメントの
            // とおり、false は成功したコマンドでは自動では true に
            // 戻らない（store で true を保存すれば手動で戻せる）。
            // store で !statusOK 自体へ保存した場合は、その値を尊重する。
            if (
              n.action === "store" &&
              String(value) === "!statusOK" &&
              (target === "true" || target === "false")
            )
              s.vars["!statusOK"] = target === "true";
            else if (softFail || s.vars["!statusOK"] === false)
              s.vars["!statusOK"] = false;
            else s.vars["!statusOK"] = true;
          } catch (e) {
            s.vars["!statusOK"] = false;
            if (s.vars["!errorIgnore"] === "true") {
              api.note(
                s,
                n,
                e.message + "（!errorIgnore により継続）",
                "error",
              );
            } else throw e;
          }
          return [s];
        },
        groups: (p) => [
          {
            title: "変数",
            entries: Object.entries(p.vars).map(([k, v]) => [
              k,
              formatValue(v),
            ]),
          },
          {
            title: "モデルページ・入力値",
            entries: [
              ["URL", formatValue(p.model.url)],
              ["要素", formatValue(p.model.pages[p.model.url]?.elements)],
              ["クリック履歴", formatValue(p.model.clicks)],
            ],
          },
        ],
      };
      let result = executeProgram(nodes, model, semantics, limits);
      // R26-N18: 最終状態（paths[].vars）は JSON として直列化される
      // 表示面であり、非有限数（Infinity／-Infinity／NaN）が null に
      // 化けて、echo や手順テキストの "Infinity" 表示と矛盾していた
      // （RG-02 と同型）。実行完了後のスナップショットに限り、非有限
      // 数を echo と同じ文字列表現へ置き換え、直列化しても矛盾しない
      // 形にする（実行中の数値としての働きは変えない）。
      for (let p of result.paths || [])
        p.vars = finiteSafeSnapshot(p.vars);
      return result;
    } catch (e) {
      return sourceFailure(
        e instanceof PracticeError || e?.category ? e : toLearnerError(e),
      );
    }
  },
};
// R26-N18: 非有限数を、その文字列表現（"Infinity"／"-Infinity"／
// "NaN"）へ置き換えた表示用スナップショットを返す。オブジェクト／
// 配列の中にネストした非有限数も対象とし、循環は元の参照を保つ。
function finiteSafeSnapshot(v, seen = new Map()) {
  if (typeof v === "number") return Number.isFinite(v) ? v : String(v);
  if (!v || typeof v !== "object") return v;
  if (isUnknown(v)) return v;
  if (seen.has(v)) return seen.get(v);
  let out = Array.isArray(v) ? [] : {};
  seen.set(v, out);
  if (Array.isArray(v))
    for (let x of v) out.push(finiteSafeSnapshot(x, seen));
  else
    for (let [k, x] of Object.entries(v))
      out[k] = finiteSafeSnapshot(x, seen);
  return out;
}

definition.templates.push(...additionalTemplates(definition.model.defaults));

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
