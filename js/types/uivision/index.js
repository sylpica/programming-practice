import { additionalTemplates } from "./additional-templates.js";
import {
  executeProgram,
  parseExpression,
  PracticeError,
  toLearnerError,
} from "../../core/script.js";
import { rows, sourceFailure } from "../../core/data.js";
import { actionProgram, interpolate, resolveVarKey, uiCondition } from "../../core/actions.js";
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
// R7-224（修正バッチ13・fxb班）: 公式の組み込み変数 !StringEscape を実装に
// 合わせて載せる。true（既定）では type の値の \n／\r／\t 等を JavaScript
// と同じエスケープとして解釈し、false では文字どおり入力する（公式
// ドキュメント「Internal variables」: !StringEscape (read/write) – If true
// \n \r are interpreted as escape sequence (default). TYPE と SENDKEYS に
// 適用され、XTYPE には適用されない。本モデルに SENDKEYS／XTYPE は無い）。
reference.push({
  name: "!StringEscape",
  category: "組み込み変数",
  syntax: "${!StringEscape}",
  description:
    "typeコマンドで入力する値のエスケープ解釈を切り替えます。true（既定）では \\n が改行、\\t がタブ等として解釈され、文字列\"false\"に設定するとバックスラッシュを含めて文字どおり入力します。",
  example: encode([
    cmd("open", "https://example.test/form"),
    cmd("store", "false", "!StringEscape"),
    cmd("type", "id=name", "a\\nb"),
  ]),
  caution: "既定はtrueです。このモデルではtypeコマンドにだけ適用します。",
  supported: true,
});
// R7-122（修正バッチ13・fxb班）: endIf／endWhile は end の別名として実行
// 側では受理していたが、リファレンス項目が無く別名であることも除外宣言も
// 無かった。項目を追加し、end の別名であることを明記する（項目数は
// 22→25件：endIf／endWhile／!StringEscape の3件追加）。
reference.push({
  name: "endIf",
  category: "コマンド",
  syntax: "endIf",
  description:
    "ifブロックを閉じます。endの別名で、if／elseif／else のブロックを閉じる位置では end と同じ働きをします。",
  example: encode([
    cmd("open", "https://example.test/form"),
    cmd("store", "0", "count"),
    cmd("if", "${count} == 0"),
    cmd("echo", "YES"),
    cmd("endIf"),
  ]),
  caution: "endと同等です。対応するifが必要です。",
  supported: true,
});
reference.push({
  name: "endWhile",
  category: "コマンド",
  syntax: "endWhile",
  description:
    "whileブロックを閉じます。endの別名で、while のブロックを閉じる位置では end と同じ働きをします。",
  example: encode([
    cmd("open", "https://example.test/form"),
    cmd("store", "0", "count"),
    cmd("while", "${count} < 3"),
    cmd("executeScript_Sandbox", "return Number(${count}) + 1;", "count"),
    cmd("endWhile"),
    cmd("echo", "${count}"),
  ]),
  caution: "endと同等です。対応するwhileが必要です。",
  supported: true,
});
// R31-N13: モデル形状の入口検証。モデル自体がオブジェクトでない場合と、
// defaults の実項目（pages／url／variables／clicks）の欠落・型違い、各
// ページとその elements の型違いを、汎用のホスト文言（「null / undefined
// のプロパティは参照できません」等）に落とさず、モデル側の言葉で項目名
// を名指して停止する。文言の水準は shell の「モデルfilesは配列で指定
// してください」、CloudFormation の「モデルにマクロ定義がありません：
// …」に揃える。
function isUiModelObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function validateUiModel(model) {
  const fail = (message) => {
    throw new PracticeError(message, 1, "モデルエラー");
  };
  if (!isUiModelObject(model)) fail("モデルはオブジェクトで指定してください");
  if (!("pages" in model)) fail("モデルにpagesがありません");
  if (!isUiModelObject(model.pages))
    fail("モデルpagesはオブジェクトで指定してください");
  if (!("url" in model)) fail("モデルにurlがありません");
  if (typeof model.url !== "string")
    fail("モデルurlは文字列で指定してください");
  if (!("variables" in model)) fail("モデルにvariablesがありません");
  if (!isUiModelObject(model.variables))
    fail("モデルvariablesはオブジェクトで指定してください");
  if (!("clicks" in model)) fail("モデルにclicksがありません");
  if (!Array.isArray(model.clicks))
    fail("モデルclicksは配列で指定してください");
  for (const [url, page] of Object.entries(model.pages)) {
    if (!isUiModelObject(page))
      fail(`モデルpages.${url}はオブジェクトで指定してください`);
    if (page.elements !== undefined) {
      if (!isUiModelObject(page.elements))
        fail(`モデルpages.${url}.elementsはオブジェクトで指定してください`);
      for (const [locator, element] of Object.entries(page.elements))
        if (!isUiModelObject(element))
          fail(
            `モデルpages.${url}.elements.${locator}はオブジェクトで指定してください`,
          );
    }
  }
}
// R31 横断スイープ(c)：while 条件や executeScript_Sandbox の return 式が
// 途中終了していた場合のパーサエラーが内部トークン「<eof>」を含めて
// いた。AutoHotkey の RG-08 サニタイズと同じ文言・方針で置き換える。
function sanitizeUiEof(e) {
  if (typeof e?.message === "string" && e.message.includes("<eof>"))
    return new PracticeError(
      "式を解釈できません（式が途中で終わっています）",
      e.line || 1,
      e.category || "エラー",
    );
  return e;
}
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
    [
      "サンドボックス",
      "executeScript_SandboxがJavaScriptを実行する、ページの状態から隔離された環境です。値の受け渡しは変数の展開と戻り値を通じて行われます。",
    ],
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
      // R31-N13: モデル形状は入口で検証し、項目名を名指して停止する。
      validateUiModel(model);
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
      // R7-121（修正バッチ13・fxb班）: UI.Vision の変数名は大小文字を区別
      // しない（公式 variables.js は set／get とも大文字へ正規化する）。
      // 表示上のキー（最初に書かれた綴り）は保持したまま、読み書きの
      // 解決だけを大小文字無視にするヘルパーを全表面で使う。
      const varKeyCI = (vars, key) => resolveVarKey(vars, key, true);
      const getVarCI = (vars, key) => {
        const k = varKeyCI(vars, key);
        return k === undefined ? undefined : vars[k];
      };
      const setVarCI = (vars, key, value) => {
        vars[varKeyCI(vars, key) ?? String(key)] = value;
      };
      // R7-62: while 条件は繰り返しのたびに現在値で評価し直す必要がある
      // ため、${変数} を合成識別子へ置き換え、read のたびに実変数から
      // 解決する。asString は引用で囲まれた展開（文字列のまま読む）。
      const whileVars = new Map();
      const semantics = {
        dialect: "js",
        // R7-230: Sandbox の &&／|| は JavaScript と同じく、短絡したとき
        // 選ばれたオペランドの値そのものを返す（真偽値へ潰さない）。
        logicalOperands: true,
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
          if (a?.k !== "var") return undefined;
          // R7-60: uiCondition が作る一時変数（__condition_N）は、引用の
          // 有無に応じた変換（引用なし＝数値化、引用あり＝文字列のまま）
          // を put 側で済ませている。ここで数値文字列→Number 変換を
          // 再適用すると、引用した "001" の先行ゼロと文字列型が失われる
          // ため、一時変数は保持した値をそのまま返す。
          if (a.name.startsWith("__condition_"))
            return { handled: true, value: s.vars[a.name] };
          // R7-62: while 条件の合成識別子は、評価のたびに実変数の現在値
          // へ解決する（引用ありは文字列のまま、引用なしは従来どおり
          // 数値文字列を数値として読む）。
          if (whileVars.has(a.name)) {
            const { key, asString } = whileVars.get(a.name);
            const actual = varKeyCI(s.vars, key);
            if (actual === undefined)
              throw new PracticeError("変数がありません：" + key, a.line);
            let v = s.vars[actual];
            if (isUnknown(v)) return { handled: true, value: v };
            if (asString)
              return {
                handled: true,
                value: typeof v === "string" ? v : String(v),
              };
            if (typeof v === "string") {
              let text = v.trim();
              if (text !== "" && !Number.isNaN(Number(text)))
                return { handled: true, value: Number(text) };
            }
            return { handled: true, value: v };
          }
          // true／false／null は共有コアの定数として解決させる。
          if (["true", "false", "null"].includes(a.name)) return undefined;
          // R7-223: マクロ変数は Sandbox の裸の識別子としては読めない
          // （公式の JS-Interpreter では未束縛名は ReferenceError）。
          // マクロ変数を読むには ${名前} と書く。共有コアの通常解決へ
          // 落とすと s.vars の同名キーを拾ってしまうため、ここで名指し
          // の ReferenceError として止める（undefined 側の処置済み範囲
          // ＝大域名解決は上の分岐で維持する）。
          throw new PracticeError(
            `未定義の名前：${a.name}`,
            a.line,
            "ReferenceError",
          );
        },
        call(name, args, s, api, node) {
          // R7-125（修正バッチ13）：呼出しで使わない追加引数も評価する
          // （ECMAScript の ArgumentListEvaluation。JavaScript 種類と
          // 同根）。未使用引数の中の未定義名などの例外を消さない。
          const evaluated = args.map((a) => api.read(a, s));
          // R7-61: 引数なし呼出しは JavaScript の変換規則どおり、欠落を
          // undefined へ変換するのではなく各関数の既定結果を返す
          // （String() は空文字列、Number() は 0。Node 実測で確認）。
          // 引数ありで undefined を渡す形（String(undefined) 等）は従来
          // どおり undefined の変換になるため、個数で切り分ける。
          if (!args.length) {
            if (name === "String") return "";
            if (name === "Number") return 0;
          }
          // 引数の欠落は null ではなく undefined として渡る（JS 本体と同根）。
          const arg0 = args.length ? evaluated[0] : undefined;
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
            let value = uiCondition(n.test, s, api, { caseInsensitive: true }),
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
            if (n.mode === "while") {
              // R7-62: 従来は ${x} を識別子文字列 x へ単純置換していたため、
              // 引用した "${x}" が固定文字列リテラル "x" に化け、条件が
              // 変数の現在値と無関係に確定していた。引用の有無を保った
              // 合成識別子へ置き換え、read のたびに現在値へ解決する
              // （uiCondition と同じ引用規則を、繰り返し評価でも保つ）。
              const registerWhileVar = (key, asString) => {
                const id = "__while_" + whileVars.size;
                whileVars.set(id, { key: key.trim(), asString });
                return id;
              };
              let test = String(n.item.Target)
                .replace(/(["'])\$\{([^}]+)\}\1/g, (_, q, name) =>
                  registerWhileVar(name, true),
                )
                .replace(/\$\{([^}]+)\}/g, (_, name) =>
                  registerWhileVar(name, false),
                );
              return api.run(
                [{ ...n, k: "while", test: parseExpression(test) }],
                [s],
              );
            }
            let count = Number(interpolate(n.item.Target, s, { caseInsensitive: true }));
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
          let target = "",
            value = "";
          // R7-126: 保存先の変数名の検証。公式は !TIMES を read-only と
          // 宣言し、公式 setter は空キーを除外する。読取専用名・空名へ
          // store すると存在しない状態を作ってしまうため、保存系の全
          // コマンド（store／storeText／storeValue／
          // executeScript_Sandbox）で保存前に名指しで止める。
          const assertWritableVar = (name) => {
            if (String(name) === "")
              api.fail("保存先の変数名が空です", n);
            if (String(name).toUpperCase() === "!TIMES")
              api.fail(
                "!times は読み取り専用の組み込み変数のため保存できません",
                n,
              );
          };
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
            // R7-222: Target／Value の変数展開も try の内側で行う。展開は
            // コマンド実行の一部であり、展開で発生したエラーだけが
            // !errorIgnore の継続処理を迂回してマクロを止める理由はない
            // （対照の click 失敗は継続するのに展開失敗は止まっていた）。
            // R7-121: 展開の変数解決は大小文字を区別しない。
            target = interpolate(n.item.Target ?? "", s, { caseInsensitive: true });
            value = interpolate(n.item.Value ?? "", s, { caseInsensitive: true });
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
                // R7-224: 公式の !StringEscape（既定 true）相当を実装する。
                // true の間は値の中の \n／\r／\t 等を JavaScript と同じ
                // エスケープとして解釈し、文字列 "false"（大小無視）や
                // false が保存されているときは文字どおり入力する。
                let typed = value;
                const escapeSetting = getVarCI(s.vars, "!StringEscape");
                const escapeOn = !(
                  escapeSetting === false ||
                  (typeof escapeSetting === "string" &&
                    escapeSetting.toLowerCase() === "false")
                );
                if (escapeOn && typeof typed === "string")
                  typed = typed.replace(/\\(.)/gs, (_, c) =>
                    ({
                      n: "\n",
                      r: "\r",
                      t: "\t",
                      b: "\b",
                      f: "\f",
                      v: "\v",
                      0: "\0",
                    })[c] ?? c,
                  );
                e.value = typed;
                api.note(
                  s,
                  n,
                  `${target} の入力値を ${formatValue(typed)} に置き換えます`,
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
                assertWritableVar(value);
                setVarCI(s.vars, String(value), target);
                api.note(
                  s,
                  n,
                  `${value} に ${formatValue(target)} を保存します`,
                );
                break;
              case "storeText":
              case "storeValue": {
                assertWritableVar(value);
                const e = element(true);
                setVarCI(s.vars, String(value), !e ? "#LNF" : n.action === "storeValue" ? (e.value ?? "") : ["input", "select", "textarea"].includes(e.tag?.toLowerCase()) ? "" : (e.text ?? ""));
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
                assertWritableVar(value);
                let expr = String(n.item.Target).trim();
                if (!/^return\s/.test(expr))
                  api.fail("return 式 のみ対応しています", n);
                expr = expr.replace(/^return\s+/, "").replace(/;\s*$/, "");
                setVarCI(
                  s.vars,
                  String(value),
                  uiCondition(expr, s, api, { caseInsensitive: true }),
                );
                api.note(
                  s,
                  n,
                  `${value} に単純式の結果 ${formatValue(getVarCI(s.vars, String(value)))} を保存します`,
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
            // R7-121: 内部変数名の照合も大小文字を区別しない（保存時の
            // 綴りが !STATUSOK 等でも、同じ組み込み変数として扱う）。
            if (
              n.action === "store" &&
              String(value).toUpperCase() === "!STATUSOK" &&
              (target === "true" || target === "false")
            )
              setVarCI(s.vars, "!statusOK", target === "true");
            else if (softFail || getVarCI(s.vars, "!statusOK") === false)
              setVarCI(s.vars, "!statusOK", false);
            else setVarCI(s.vars, "!statusOK", true);
          } catch (e) {
            setVarCI(s.vars, "!statusOK", false);
            if (
              getVarCI(s.vars, "!errorIgnore") === "true" ||
              getVarCI(s.vars, "!errorIgnore") === true
            ) {
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
      // R31 横断スイープ(c)：パスエラー・全体エラーにも <eof> を出さない。
      if (result.error?.message?.includes("<eof>"))
        result.error.message = "式を解釈できません（式が途中で終わっています）";
      for (let p of result.paths || []) {
        p.vars = finiteSafeSnapshot(p.vars);
        if (p.error?.message?.includes("<eof>"))
          p.error.message = "式を解釈できません（式が途中で終わっています）";
      }
      return result;
    } catch (e) {
      return sourceFailure(
        sanitizeUiEof(
          e instanceof PracticeError || e?.category ? e : toLearnerError(e),
        ),
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
