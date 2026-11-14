import { additionalTemplates } from "./additional-templates.js";
import {
  executeProgram,
  parseExpression,
  PracticeError,
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
        ...new Set(JSON.parse(code).Commands.map((c) => c.Command)),
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
            else: "else",
            end: "end",
            endIf: "end",
            endWhile: "end",
            while: "while",
            times: "loop",
          })[n] || "action",
      });
      const semantics = {
        dialect: "js",
        initialize(s) {
          s.vars["!statusOK"] = true;
        },
        call(name, args, s, api, node) {
          if (name === "Number") {
            let v = api.read(args[0], s);
            return isUnknown(v)
              ? unknown("数値変換する値による", v.id)
              : Number(v);
          }
          if (name === "String") {
            let v = api.read(args[0], s);
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
                if (e.onClick?.setText)
                  for (let [k, v] of Object.entries(e.onClick.setText)) {
                    let destination = s.model.pages[s.model.url].elements[k];
                    if (!destination)
                      api.fail(
                        "クリック効果の対象がモデルにありません：" + k,
                        n,
                      );
                    destination.text = v;
                  }
                if (e.href) {
                  if (!s.model.pages[e.href])
                    api.fail("リンク先がモデルにありません", n);
                  s.model.url = e.href;
                }
                api.note(
                  s,
                  n,
                  `${target} をクリックし、モデルに定義された効果を反映します`,
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
                api.note(s, n, n.action);
                break;
              case "assertText": {
                let actual = element().text;
                if (isUnknown(actual) || isUnknown(value))
                  api.fail("assertTextの結果は実行時に決まるため未確認です", n);
                if (actual !== value)
                  api.fail("assertText：テキストが一致しません", n);
                api.note(s, n, "テキストが一致します");
                break;
              }
              default:
                api.fail(
                  "このコマンドは説明に対応していません：" + n.action,
                  n,
                );
            }
            s.vars["!statusOK"] = true;
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
      return executeProgram(nodes, model, semantics, limits);
    } catch (e) {
      return sourceFailure(e);
    }
  },
};

definition.templates.push(...additionalTemplates(definition.model.defaults));

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
