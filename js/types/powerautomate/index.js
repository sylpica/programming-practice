import { additionalTemplates } from "./additional-templates.js";
import {
  executeProgram,
  parseExpression,
  astRefs,
  PracticeError,
  baseBinary,
} from "../../core/script.js";
import { rows, sourceFailure } from "../../core/data.js";
import {
  actionProgram,
  interpolate,
  valueExpression,
  uiCondition,
} from "../../core/actions.js";
import { createActionEditor } from "../../core/action-editor.js";
import { formatModelValue as formatValue, isUnknown, unknown } from "../../core/contract.js";
const palette = [
  {
    name: "Set variable",
    label: "変数の設定",
    sample: { action: "Set variable", target: "Count", value: 0 },
  },
  {
    name: "Increase variable",
    label: "変数を大きくする",
    sample: { action: "Increase variable", target: "Count", value: 1 },
  },
  {
    name: "Display input dialog",
    label: "入力ダイアログ",
    sample: {
      action: "Display input dialog",
      target: "Answer",
      value: "入力してください",
    },
  },
  {
    name: "If",
    sample: { action: "If", target: "", value: "", condition: "%Count% > 0" },
  },
  { name: "Else", sample: { action: "Else", target: "", value: "" } },
  { name: "End", sample: { action: "End", target: "", value: "" } },
  {
    name: "Loop",
    sample: {
      action: "Loop",
      target: "Index",
      value: "",
      from: 1,
      to: 3,
      step: 1,
    },
  },
  {
    name: "For each",
    sample: { action: "For each", target: "Item", value: "%Items%" },
  },
  {
    name: "Loop condition",
    sample: {
      action: "Loop condition",
      target: "",
      value: "",
      condition: "%Count% < 3",
    },
  },
  { name: "Exit loop", sample: { action: "Exit loop", target: "", value: "" } },
  {
    name: "Write text to file",
    sample: {
      action: "Write text to file",
      target: "C:/model/result.txt",
      value: "完了",
      append: false,
    },
  },
  {
    name: "Read text from file",
    sample: {
      action: "Read text from file",
      target: "Text",
      value: "C:/model/input.txt",
    },
  },
  {
    name: "Send email",
    sample: {
      action: "Send email",
      target: "model@example.invalid",
      value: "モデルのメール",
      subject: "練習",
    },
  },
  {
    name: "Display message",
    sample: { action: "Display message", target: "", value: "完了" },
  },
];
const reference = rows(
  palette.map((p) => [
    p.name,
    "アクション",
    JSON.stringify(p.sample),
    "Power Automate for desktopの「" +
      (p.label || p.name) +
      "」を学習用モデル上で説明します。",
    JSON.stringify(p.sample),
    "JSONはこのアプリの学習用フロー表現で、製品のエクスポート形式ではありません。",
  ]),
);
const encode = (actions) =>
  JSON.stringify({ name: "学習フロー", actions }, null, 2);
for (const r of reference) {
  const sample = palette.find(p => p.name === r.name).sample;
  const setup = [{action:"Set variable",target:"Count",value:0},{action:"Set variable",target:"Items",value:["A","B"]}];
  let actions = [sample];
  if (["If","Else","End"].includes(r.name)) actions = [{action:"If",condition:"%Count% > 0"},{action:"Display message",value:"正"},{action:"Else"},{action:"Display message",value:"0"},{action:"End"}];
  if (["Loop","For each"].includes(r.name)) actions = [sample,{action:"Display message",value:r.name === "Loop" ? "%Index%" : "%Item%"},{action:"End"}];
  if (r.name === "Loop condition") actions = [sample,{action:"Increase variable",target:"Count",value:1},{action:"End"}];
  if (r.name === "Exit loop") actions = [{action:"Loop",target:"Index",from:1,to:3,step:1},sample,{action:"End"}];
  r.example = encode([...setup,...actions]);
}
export const definition = {
  id: "powerautomate",
  name: "Power Automate",
  extensions: [".json", ".txt"],
  syntax: { name: "Desktopフロー・学習用JSON", caseSensitive: true },
  reference,
  templates: [
    {
      id: "pa-counter",
      title: "変数と回数ループ",
      code: encode([
        { action: "Set variable", target: "Count", value: 0 },
        { action: "Loop", target: "Index", from: 1, to: 3, step: 1 },
        { action: "Increase variable", target: "Count", value: 1 },
        { action: "End" },
        { action: "Display message", value: "合計 %Count%" },
      ]),
      intro:
        "Loopは指定した終了値を含めて繰り返します。変数の設定とIncrease variableで合計を数えます。",
      refs: ["Set variable", "Loop", "Increase variable"],
    },
    {
      id: "pa-branch",
      title: "入力でファイルとメールを分岐",
      code: encode([
        {
          action: "Display input dialog",
          target: "Answer",
          value: "実行しますか？",
        },
        { action: "If", condition: '%Answer% == "はい"' },
        {
          action: "Write text to file",
          target: "C:/model/result.txt",
          value: "完了",
          append: false,
        },
        {
          action: "Send email",
          target: "model@example.invalid",
          value: "完了しました",
          subject: "練習",
        },
        { action: "Else" },
        { action: "Display message", value: "終了" },
        { action: "End" },
      ]),
      intro:
        "入力は未確定です。選んだパスに応じてモデルのファイルと送信メールだけが変化します。",
      refs: ["Display input dialog", "If", "Write text to file", "Send email"],
    },
    {
      id: "pa-files",
      title: "リストを順に処理",
      code: encode([
        { action: "Set variable", target: "Items", value: ["A", "B", "C"] },
        { action: "For each", target: "Item", value: "%Items%" },
        {
          action: "Write text to file",
          target: "C:/model/result.txt",
          value: "%Item%",
          append: true,
        },
        { action: "End" },
      ]),
      intro:
        "For eachでリストの要素を順に取り出し、モデルファイルへ追記します。",
      refs: ["For each", "Write text to file"],
    },
  ],
  glossary: [
    ["アクション", "フロー内の1つの操作です。"],
    [
      "デスクトップフロー",
      "アクションを条件やループで組み合わせる自動化です。",
    ],
  ],
  editor: createActionEditor({ palette }),
  model: {
    kind: "json",
    title: "モデルファイル・メール",
    hint: "variables、files、sentMailを編集できます。ファイル操作やメール送信はモデル内だけで行います。",
    defaults: {
      variables: {},
      files: { "C:/model/input.txt": "モデルの入力" },
      sentMail: [],
    },
  },
  semantics: {
    description:
      "Power Automate for desktopの変数・If・Loop / For each / Loop conditionとファイル・メール操作のモデルです。",
    support:
      "製品のフローエクスポート互換ではありません。JSONは学習用のアクション表現です。コネクター、認証、例外処理設定などは未対応です。",
    sources: [
      {
        title: "Microsoft ループアクション",
        url: "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/loops",
      },
      {
        title: "Microsoft ファイルアクション",
        url: "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/file",
      },
      {
        title: "Microsoft 変数アクション",
        url: "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/variables",
      },
    ],
  },
  scan(code) {
    try {
      return [...new Set(JSON.parse(code).actions.map((a) => a.action))].filter(
        (n) => reference.some((r) => r.name === n),
      );
    } catch {
      return [];
    }
  },
  async simulate(code, model, limits) {
    try {
      let { nodes } = actionProgram(code, {
        classify: (n) =>
          ({
            If: "if",
            "Else if": "elseif",
            Else: "else",
            End: "end",
            Loop: "loop",
            "For each": "each",
            "Loop condition": "while",
          })[n] || "action",
      });
      let semantics = {
        dialect: "js",
        copyOnAssign: true,
        constants: { true: true, false: false, null: null, True: true, False: false },
        binary(op, x, y, node) {
          if (isUnknown(x) || isUnknown(y)) return baseBinary(op, x, y, "js");
          if (
            (op === "/" || op === "%") &&
            ((typeof y === "number" && y === 0) ||
              (typeof y === "string" && y.trim() !== "" && Number(y) === 0))
          )
            throw new PracticeError(
              "0 で除算しました（Power Automate Desktop では 0 除算は実行時エラーになります）",
              node?.line || 1,
            );
          return baseBinary(op, x, y, "js");
        },
        step(n, s, api) {
          let item = n.item;
          if (n.k === "action-if") {
            let v = uiCondition(n.test, s, api),
              done = [];
            for (let r of api.choose(s, v, n)) {
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
            let newNode = {
              ...n,
              k:
                n.mode === "each"
                  ? "each"
                  : n.mode === "while"
                    ? "while"
                    : "for",
            };
            if (n.mode === "each") {
              newNode.name = item.target;
              let v = resolve(item.value, s, api);
              newNode.collection = { k: "literal", value: v, line: n.line };
            } else if (n.mode === "while") {
              newNode.test = conditionAST(item.condition, s);
            } else {
              for (let key of ["from", "to", "step"])
                if (
                  isUnknown(
                    resolve(
                      item[key] ?? (key === "step" ? 1 : undefined),
                      s,
                      api,
                    ),
                  )
                )
                  api.fail("未確定のLoop境界は未対応です", n);
              let from = Number(resolve(item.from, s, api)),
                to = Number(resolve(item.to, s, api)),
                step = Number(resolve(item.step ?? 1, s, api));
              if (!step || ![from, to, step].every(Number.isFinite))
                api.fail("Loopの開始・終了・増分が不正です", n);
              let variable = {
                k: "var",
                name: item.target || "LoopIndex",
                line: n.line,
              };
              newNode.init = {
                k: "assign",
                target: variable,
                value: { k: "literal", value: from },
                op: "=",
                line: n.line,
              };
              newNode.test = {
                k: "binary",
                op: step > 0 ? "<=" : ">=",
                a: variable,
                b: { k: "literal", value: to },
                line: n.line,
              };
              newNode.update = {
                k: "assign",
                target: variable,
                value: { k: "literal", value: step },
                op: "+=",
                line: n.line,
              };
            }
            return api.run([newNode], [s]);
          }
        },
        action(n, s, api) {
          let a = n.item,
            value = resolve(a.value, s, api);
          switch (n.action) {
            case "Set variable":
              s.vars[a.target] = structuredClone(value);
              api.note(
                s,
                n,
                `${a.target} に ${formatValue(value)} を設定します`,
              );
              break;
            case "Increase variable": {
              if (
                typeof s.vars[a.target] !== "number" ||
                typeof value !== "number"
              )
                api.fail("数値型の変数と増分が必要です", n);
              s.vars[a.target] += value;
              api.note(s, n, `${a.target} を ${s.vars[a.target]} に増やします`);
              break;
            }
            case "Display input dialog":
              s.vars[a.target] = api.freshUnknown("入力ダイアログの入力", s);
              api.note(s, n, "入力値は実行時に決まります");
              break;
            case "Display message":
              s.outputs.push({
                channel: "メッセージ",
                text: formatValue(value),
                line: n.line,
              });
              api.note(s, n, `メッセージを表示します：${formatValue(value)}`);
              break;
            case "Write text to file": {
              let path = interpolate(a.target, s);
              if (isUnknown(path))
                api.fail("未確定のファイルパスは未対応です", n);
              s.model.files ??= {};
              let old = s.model.files[path] || "";
              s.model.files[path] = a.append
                ? isUnknown(old) || isUnknown(value)
                  ? unknown("追記するファイル内容による")
                  : String(old) + String(value)
                : value;
              api.note(
                s,
                n,
                `モデルファイル ${path} に${a.append ? "追記" : "書き込み"}ます`,
              );
              break;
            }
            case "Read text from file": {
              if (isUnknown(value))
                s.vars[a.target] = unknown("読み取り先のファイルによる");
              else if (!Object.hasOwn(s.model.files || {}, value))
                api.fail("モデルにファイルがありません：" + value, n);
              else s.vars[a.target] = s.model.files[value];
              api.note(s, n, `モデルファイルを ${a.target} に読み込みます`);
              break;
            }
            case "Send email": {
              s.model.sentMail ??= [];
              s.model.sentMail.push({
                to: interpolate(a.target, s),
                subject: resolve(a.subject || "", s, api),
                body: value,
              });
              api.note(s, n, "モデルの送信メール一覧に追加します");
              break;
            }
            case "Exit loop":
              if (!s.loopDepth)
                api.fail("ループの外ではExit loopを使えません", n);
              s.signal = "break";
              api.note(s, n, "ループを抜けます");
              break;
            default:
              api.fail(
                "このアクションは説明に対応していません：" + n.action,
                n,
              );
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
            title: "モデルファイル・メール",
            entries: [
              ["ファイル", formatValue(p.model.files)],
              ["送信メール", formatValue(p.model.sentMail)],
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
function resolve(v, s, api) {
  if (typeof v === "string" && /^%[\s\S]*%$/.test(v))
    return api.read(parseExpression(v.slice(1, -1)), s);
  return interpolate(v, s);
}
function conditionAST(text, s) {
  let normalized = text.replace(/%([A-Za-z_]\w*)%/g, "$1");
  return parseExpression(normalized);
}

definition.templates.push(...additionalTemplates(definition.model.defaults));

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
