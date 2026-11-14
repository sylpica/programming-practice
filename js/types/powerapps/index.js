import { additionalTemplates } from "./additional-templates.js";
import {
  ScriptParser,
  executeProgram,
  parseExpression,
  scanScript,
  baseBinary,
  callName,
  PracticeError,
  unsupported,
} from "../../core/script.js";
import { rows, sourceFailure } from "../../core/data.js";
import { formatModelValue as formatValue, isUnknown, unknown } from "../../core/contract.js";
const reference = rows([
  [
    "Set",
    "変数",
    "Set(Name, Value)",
    "グローバル変数を設定します。参照する表示数式は再計算します。",
    "Set(Count, 1)",
    "コントロール・コレクションと同じ名前は使えません。",
  ],
  [
    "UpdateContext",
    "変数",
    "UpdateContext({Name: Value})",
    "現在の画面に属するコンテキスト変数を更新します。",
    "UpdateContext({Ready: true})",
  ],
  [
    "If",
    "分岐",
    "If(Condition, Then, Else)",
    "条件を左から評価し、最初に成立する式だけを評価します。",
    'If(Count > 0, Set(Result, "正"), Set(Result, "その他"))',
  ],
  [
    "Switch",
    "分岐",
    "Switch(Value, Match, Result, Default)",
    "値を一度評価し、最初に一致する結果だけを評価します。",
    'Switch(Count, 1, "一", "その他")',
  ],
  [
    "Collect",
    "コレクション",
    "Collect(Collection, Record)",
    "レコードを追加します。値だけならValue列に入ります。",
    'Collect(Items, {Name: "A"})',
  ],
  [
    "Clear",
    "コレクション",
    "Clear(Collection)",
    "コレクションの行を削除します。",
    "Clear(Items)",
    "外部データソースには使えません。",
  ],
  [
    "ClearCollect",
    "コレクション",
    "ClearCollect(Collection, Table)",
    "コレクションを空にしてから追加します。",
    "ClearCollect(Items, Table({Value:1},{Value:2}))",
  ],
  [
    "Table",
    "テーブル",
    "Table(Record, Record, ...)",
    "レコードをまとめたテーブルを作ります。",
    'Table({Name:"A"}, {Name:"B"})',
  ],
  [
    "Sequence",
    "テーブル",
    "Sequence(Records, Start, Step)",
    "Value列を持つ数列テーブルを生成します。",
    "Sequence(3)",
  ],
  [
    "ForAll",
    "テーブル",
    "ForAll(Table, Formula)",
    "各行で式を評価し、入力行順の結果テーブルを返します。",
    "ForAll(Sequence(3), {Square: Value * Value})",
    "実行順は未規定です。このアプリでは順序依存の副作用を含むForAllは停止します。",
  ],
  [
    "CountRows",
    "テーブル",
    "CountRows(Table)",
    "行数を返します。",
    "CountRows(Items)",
  ],
  [
    "Sum",
    "集計",
    "Sum(Table, Formula)",
    "各行で数式を評価し合計します。",
    "Sum(Items, Value)",
  ],
  [
    "Filter",
    "テーブル",
    "Filter(Table, Condition)",
    "条件を満たす行を抽出します。",
    "Filter(Items, Value > 1)",
    "委任できる条件はデータソースと演算子に依存します。委任できないクエリは既定500件（設定で最大2,000件）の取得範囲で評価され、結果が欠ける場合があります。このモデルは明示したローカルデータだけを評価します。",
  ],
  [
    "LookUp",
    "テーブル",
    "LookUp(Table, Condition)",
    "最初に一致したレコードを返します。",
    "LookUp(Items, Value = 2)",
  ],
  [
    "Patch",
    "レコード",
    "Patch(Source, Base, Changes)",
    "モデルデータソースの既存レコードを更新または追加します。",
    'Patch(Orders, Defaults(Orders), {Name:"A"})',
    "サーバーが採番するIDは捏造しません。",
  ],
  [
    "Defaults",
    "レコード",
    "Defaults(Source)",
    "モデルに明示した既定レコードを返します。",
    "Defaults(Orders)",
  ],
  [
    "Navigate",
    "画面",
    "Navigate(Screen)",
    "表示するモデル画面を切り替えます。",
    "Navigate(Detail)",
    "画面のOnVisible等は未対応です。",
  ],
  [
    "Reset",
    "コントロール",
    "Reset(Control)",
    "モデルコントロールをDefaultの値へ戻します。",
    "Reset(Input1)",
  ],
  [
    "Text",
    "型変換",
    "Text(Value)",
    "明示したモデルの数値を文字列にします。",
    "Text(Count)",
  ],
  [
    "Value",
    "型変換",
    "Value(Text)",
    "明示した10進数文字列を数値へ変換します。",
    "Value(Input1.Text)",
    "地域依存書式は未対応です。",
  ],
  ["Blank", "欠損", "Blank()", "空白値を返します。", "Set(Answer, Blank())"],
  [
    "IsBlank",
    "欠損",
    "IsBlank(Value)",
    "空白または空文字列か調べます。",
    "IsBlank(Input1.Text)",
  ],
  [
    "Notify",
    "入出力",
    "Notify(Message)",
    "通知をモデルの出力へ追加します。",
    'Notify("保存しました")',
  ],
]);
for (const r of reference) {
  if (["If","Switch","Text"].includes(r.name)) r.example = "Set(Count, 2);\n" + r.example;
  if (["CountRows","Sum","Filter","LookUp"].includes(r.name)) r.example = "ClearCollect(Items, {Value:1}, {Value:2});\n" + r.example;
}
function lowerBehavior(expr, line = expr.line || 1) {
  let name = callName(expr.target).toLowerCase();
  if (expr.k === "call" && name === "if") {
    let args = expr.args,
      otherwise =
        args.length % 2
          ? [
              {
                k: "expression",
                value: args.at(-1),
                line: args.at(-1).line || line,
              },
            ]
          : [];
    for (let i = Math.floor(args.length / 2) - 1; i >= 0; i--)
      otherwise = [
        {
          k: "if",
          test: args[i * 2],
          body: lowerBehavior(args[i * 2 + 1], line),
          otherwise,
          line: args[i * 2].line || line,
          refs: ["If"],
        },
      ];
    return otherwise;
  }
  if (expr.k === "call" && name === "switch") {
    let args = expr.args,
      temp = { k: "var", name: "__switch_" + line, line };
    let otherwise =
      args.length % 2 === 0 ? lowerBehavior(args.at(-1), line) : [];
    for (let i = Math.floor((args.length - 1) / 2) - 1; i >= 0; i--)
      otherwise = [
        {
          k: "if",
          test: { k: "binary", op: "=", a: temp, b: args[1 + i * 2], line },
          body: lowerBehavior(args[2 + i * 2], line),
          otherwise,
          line,
          refs: ["Switch"],
        },
      ];
    return [
      {
        k: "assign",
        op: "=",
        target: temp,
        internalSwitch: true,
        value: args[0],
        line,
        refs: ["Switch"],
      },
      ...otherwise,
    ];
  }
  if (
    expr.k === "call" &&
    name === "set" &&
    expr.args[1]?.k === "call" &&
    ["if", "switch"].includes(callName(expr.args[1].target).toLowerCase())
  ) {
    let branch = expr.args[1],
      args = branch.args;
    let wrapped = {
      ...branch,
      args: args.map((v, i) => (name === "switch" ? v : v)),
    };
    if (callName(branch.target).toLowerCase() === "if")
      wrapped.args = args.map((v, i) =>
        i % 2 || (i === args.length - 1 && args.length % 2)
          ? { ...expr, args: [expr.args[0], v] }
          : v,
      );
    else
      wrapped.args = args.map((v, i) =>
        (i > 0 && i % 2 === 0) ||
        (i === args.length - 1 && args.length % 2 === 0)
          ? { ...expr, args: [expr.args[0], v] }
          : v,
      );
    return lowerBehavior(wrapped, line);
  }
  return [
    {
      k: "expression",
      value: expr,
      line,
      refs: [callName(expr.target)].filter(Boolean),
    },
  ];
}
export const definition = {
  id: "powerapps",
  name: "Power Apps",
  extensions: [".fx", ".txt", ".json"],
  syntax: { name: "Power Fx（en-US区切り）", caseSensitive: false },
  reference,
  templates: [
    {
      id: "fx-state",
      title: "変数とコントロール表示の再計算",
      code: 'Set(Count, Value(Input1.Text));\nIf(Count >= 3, Set(Status, "十分"), Set(Status, "追加しよう"));\nNotify(Status)',
      intro:
        "Setでグローバル変数を更新すると、モデルのbindingsに記載したコントロール数式が再計算されます。",
      refs: ["Set", "Value", "If", "Notify", "Text"],
    },
    {
      id: "fx-table",
      title: "コレクションとForAll",
      code: "ClearCollect(Items, ForAll(Sequence(3), {Number: Value, Square: Value * Value}));\nSet(Total, Sum(Items, Square));\nNotify(Text(Total))",
      intro:
        "ForAllの結果テーブルは入力行順です。処理の実行順に依存する副作用は使いません。",
      refs: ["ClearCollect", "ForAll", "Sequence", "Sum", "Set"],
    },
    {
      id: "fx-record",
      title: "データソースと画面を更新",
      code: "Patch(Orders, Defaults(Orders), {Name: Input1.Text, Done: false});\nUpdateContext({Saved: true});\nNavigate(Detail)",
      intro:
        "Patchでモデルのデータソースにレコードを追加します。既定値以外のID等は作りません。",
      refs: ["Patch", "Defaults", "UpdateContext", "Navigate"],
    },
  ],
  glossary: [
    ["コントロール", "入力欄・ラベルなどの画面部品です。"],
    ["コレクション", "アプリ内のレコードを行として持つテーブルです。"],
    [
      "動作数式",
      "SetやNavigateなど、操作イベントに応じて状態を変更する数式です。",
    ],
  ],
  model: {
    kind: "json",
    title: "モデル画面・コントロール・データ",
    hint: "screen、screens、controls、bindings、dataSourcesを編集できます。bindingsは変数更新後に再計算する表示数式です。",
    defaults: {
      screen: "Home",
      screens: { Home: { context: {} }, Detail: { context: {} } },
      controls: { Input1: { Text: "3", Default: "3" }, Label1: { Text: "" } },
      variables: {},
      collections: {},
      dataSources: { Orders: [] },
      defaults: { Orders: { Name: "", Done: false } },
      bindings: { "Label1.Text": "Text(Count)" },
      language: "en-US",
    },
  },
  semantics: {
    description:
      "Power Fxの動作数式とモデル画面構成を組み合わせ、変数・コントロール・コレクション・データソースを追跡します。",
    support:
      "en-USのカンマ引数・セミコロン連結に限定。ForAllは純粋な式のみ対応。Dataverse接続・委任・自動採番・非同期通信・複雑な型推論・画面イベントは未対応です。",
    sources: [
      {
        title: "Microsoft Set",
        url: "https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-set",
      },
      {
        title: "Microsoft If / Switch",
        url: "https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-if",
      },
      {
        title: "Microsoft ForAll",
        url: "https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-forall",
      },
      {
        title: "Microsoft Collect",
        url: "https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-clear-collect-clearcollect",
      },
    ],
  },
  scan: (code) => scanScript(code, reference, "fx"),
  async simulate(code, model, limits) {
    try {
      let parser = new ScriptParser(code, "fx"),
        source = parser.program();
      let nodes = source.flatMap((n) =>
        n.k === "expression" ? lowerBehavior(n.value) : [n],
      );
      function recalc(s, api) {
        if (s.bindingDepth) return;
        s.bindingDepth = 1;
        for (let [target, text] of Object.entries(s.model.bindings || {})) {
          let [name, prop] = target.split(".");
          if (!s.model.controls[name])
            api.fail("bindingのコントロールがありません：" + name, { line: 1 });
          try {
            s.model.controls[name][prop] = api.read(
              parseExpression(text, "fx"),
              s,
            );
          } catch (e) {
            if (/未定義/.test(e.message)) s.model.controls[name][prop] = null;
            else throw e;
          }
        }
        s.bindingDepth = 0;
      }
      let semantics = {
        dialect: "fx",
        copyOnAssign: true,
        step(n, s, api) {
          if (n.internalSwitch) {
            s.vars[n.target.name] = api.read(n.value, s);
            api.note(s, n, "Switchの比較値を一度評価します：" + formatValue(s.vars[n.target.name]));
            return [s];
          }
        },
        initialize(s, api) {
          s.vars = {
            ...s.model.variables,
            ...s.model.collections,
            ...s.model.dataSources,
            ...s.model.controls,
            ...s.model.screens[s.model.screen]?.context,
          };
          recalc(s, api);
        },
        read(a, s, api) {
          if (a.k === "var") {
            let key = Object.keys(s.vars).find(
              (k) => k.toLowerCase() === a.name.toLowerCase(),
            );
            if (key !== undefined) return { handled: true, value: s.vars[key] };
            if (Object.hasOwn(s.model.screens || {}, a.name))
              return { handled: true, value: { screen: a.name } };
            if (a.name === "ThisRecord")
              return { handled: true, value: s.record };
          }
          return null;
        },
        binary(op, a, b, node, s, api) {
          if (op === "=")
            return isUnknown(a) || isUnknown(b)
              ? baseBinary(op, a, b)
              : a === b;
          if (op === "<>")
            return isUnknown(a) || isUnknown(b)
              ? baseBinary(op, a, b)
              : a !== b;
          if (op === "&")
            return isUnknown(a) || isUnknown(b)
              ? baseBinary(op, a, b, "fx")
              : String(a ?? "") + String(b ?? "");
          if (a === null) a = 0;
          if (b === null) b = 0;
          return baseBinary(op, a, b, "fx");
        },
        call(name, args, s, api, node) {
          let fn = name.toLowerCase(),
            side = [
              "set",
              "updatecontext",
              "collect",
              "clear",
              "clearcollect",
              "patch",
              "navigate",
              "reset",
              "notify",
            ];
          if ((s.record || s.bindingDepth) && side.includes(fn))
            api.fail(
              "ForAllまたは表示数式内の副作用はこのモデルでは未対応です",
              node,
            );
          function get(i) {
            return api.read(args[i], s);
          }
          function key(i) {
            let a = args[i];
            if (a?.k !== "var") api.fail("名前を直接指定してください", node);
            return a.name;
          }
          function rowEval(table, formula) {
            if (!Array.isArray(table)) api.fail("テーブルが必要です", node);
            if (table.length > 1000) api.fail("モデルの行数上限です", node);
            return table.map((record, i) => {
              let previous = s.vars,
                old = s.record;
              s.record = record;
              s.vars = { ...previous, ...record, ThisRecord: record };
              try {
                api.check();
                let v = api.read(formula, s);
                api.note(s, node, `行 ${i + 1} の式を評価します`);
                return v;
              } finally {
                s.vars = previous;
                s.record = old;
              }
            });
          }
          switch (fn) {
            case "blank":
              return null;
            case "isblank": {
              let v = get(0);
              return isUnknown(v)
                ? unknown("IsBlankの引数による", v.id)
                : v === null || v === "";
            }
            case "if": {
              for (let i = 0; i + 1 < args.length; i += 2) {
                let cond = get(i);
                if (isUnknown(cond))
                  api.fail(
                    "値の式に含まれる未確定Ifは、Setの直下または動作数式として記述してください",
                    node,
                  );
                if (cond) return get(i + 1);
              }
              return args.length % 2 ? get(args.length - 1) : null;
            }
            case "switch": {
              let value = get(0);
              if (isUnknown(value))
                api.fail("未確定Switchは動作数式として記述してください", node);
              for (let i = 1; i + 1 < args.length; i += 2)
                if (value === get(i)) return get(i + 1);
              return args.length % 2 === 0 ? get(args.length - 1) : null;
            }
            case "set": {
              let n = key(0),
                v = get(1);
              if (
                Object.hasOwn(s.model.controls, n) ||
                Object.hasOwn(s.model.collections, n)
              )
                api.fail(
                  "コントロール／コレクションと同じ変数名は使えません",
                  node,
                );
              s.vars[n] = structuredClone(v);
              s.model.variables[n] = s.vars[n];
              recalc(s, api);
              api.note(
                s,
                node,
                `${n} に ${formatValue(v)} を設定し、表示数式を再計算します`,
              );
              return null;
            }
            case "updatecontext": {
              let fields = get(0);
              s.model.screens[s.model.screen].context ??= {};
              Object.assign(s.model.screens[s.model.screen].context, fields);
              Object.assign(s.vars, fields);
              recalc(s, api);
              return null;
            }
            case "table":
              return args.map((_, i) => get(i));
            case "sequence": {
              let n = Number(get(0)),
                start = args[1] ? Number(get(1)) : 1,
                step = args[2] ? Number(get(2)) : 1;
              if (!Number.isInteger(n) || n < 0 || n > 1000)
                api.fail("Sequenceの行数が不正または上限を超えています", node);
              return Array.from({ length: n }, (_, i) => ({
                Value: start + i * step,
              }));
            }
            case "forall": {
              let result = rowEval(get(0), args[1]);
              return result
                .filter((v) => v !== null)
                .map((v) => (typeof v === "object" ? v : { Value: v }));
            }
            case "countrows":
              return get(0).length;
            case "sum":
              return rowEval(get(0), args[1]).reduce(
                (a, b) => a + Number(b ?? 0),
                0,
              );
            case "filter":
            case "lookup": {
              let table = get(0),
                results = rowEval(table, args[1]);
              if (results.some(isUnknown))
                api.fail("未確定のFilter / LookUp条件は未対応です", node);
              let selected = table.filter((_, i) => results[i]);
              return fn === "filter" ? selected : (selected[0] ?? null);
            }
            case "clear":
            case "clearcollect":
            case "collect": {
              let n = key(0);
              if (Object.hasOwn(s.model.dataSources, n))
                api.fail(
                  "このモデルのCollect / Clearはコレクションだけに対応します",
                  node,
                );
              let old = s.model.collections[n] || [];
              if (fn !== "collect") old = [];
              for (let i = 1; i < args.length; i++) {
                let value = get(i);
                old.push(
                  ...(Array.isArray(value)
                    ? value
                    : typeof value === "object" && value !== null
                      ? [value]
                      : [{ Value: value }]),
                );
              }
              s.model.collections[n] = old;
              s.vars[n] = old;
              recalc(s, api);
              api.note(s, node, `${n} のレコード数は ${old.length} です`);
              return fn === "clear" ? null : old;
            }
            case "defaults": {
              let n = key(0);
              return {
                ...structuredClone(s.model.defaults[n] || {}),
                __defaultSource: n,
              };
            }
            case "patch": {
              let n = key(0),
                base = get(1),
                changes = get(2),
                table = s.model.dataSources[n];
              if (!Array.isArray(table))
                api.fail("モデルにデータソースがありません：" + n, node);
              let result;
              if (base?.__defaultSource === n) {
                result = { ...base, ...changes };
                delete result.__defaultSource;
                table.push(result);
              } else {
                let index = table.indexOf(base);
                if (index < 0)
                  api.fail("更新するレコードがデータソースにありません", node);
                result = Object.assign(table[index], changes);
              }
              api.note(
                s,
                node,
                `${n} のレコードを${base?.__defaultSource ? "追加" : "更新"}します`,
              );
              recalc(s, api);
              return result;
            }
            case "navigate": {
              let screen = get(0)?.screen;
              if (!s.model.screens[screen])
                api.fail("モデルに画面がありません", node);
              let oldContext = s.model.screens[s.model.screen]?.context || {};
              for (let k of Object.keys(oldContext)) delete s.vars[k];
              s.model.screen = screen;
              Object.assign(s.vars, s.model.screens[screen].context || {});
              api.note(s, node, "画面を " + screen + " に切り替えます");
              return true;
            }
            case "reset": {
              let n = key(0),
                control = s.model.controls[n];
              if (!control) api.fail("モデルにコントロールがありません", node);
              control.Text = Object.hasOwn(control, "Default")
                ? control.Default
                : unknown("コントロールのDefault");
              recalc(s, api);
              return null;
            }
            case "notify":
              s.outputs.push({
                channel: "Notify",
                text: formatValue(get(0)),
                line: node.line,
              });
              return true;
            case "text": {
              let v = get(0);
              return isUnknown(v) ? v : v === null ? "" : String(v);
            }
            case "value": {
              let v = get(0);
              if (isUnknown(v)) return v;
              if (typeof v === "number") return v;
              if (
                typeof v !== "string" ||
                !/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v.trim())
              )
                api.fail("Value：数値へ変換できません", node);
              return Number(v);
            }
            default:
              api.fail(
                "このPower Fx関数は説明に対応していません：" + name,
                node,
              );
          }
        },
        groups: (p) => [
          {
            title: "画面・コントロール",
            entries: [
              ["画面", p.model.screen],
              ["コントロール", formatValue(p.model.controls)],
              ["画面コンテキスト", formatValue(p.model.screens)],
            ],
          },
          {
            title: "変数・コレクション・データソース",
            entries: [
              ["グローバル変数", formatValue(p.model.variables)],
              ["コレクション", formatValue(p.model.collections)],
              ["データソース", formatValue(p.model.dataSources)],
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
