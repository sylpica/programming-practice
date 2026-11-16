import { additionalTemplates } from "./additional-templates.js";
import {
  executeProgram,
  parseExpression,
  astRefs,
  PracticeError,
  toLearnerError,
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
// Else if はパレットには無いが、フロー分類（classify）で elseif として処理される
// アクションのため、リファレンスにだけ項目を持つ（If／Else／End と同列）。
reference.push({
  name: "Else if",
  category: "アクション",
  syntax: JSON.stringify({ action: "Else if", condition: "%Count% > 0" }),
  description:
    "Power Automate for desktopの「Else if」を学習用モデル上で説明します。",
  example: encode([
    { action: "Set variable", target: "Count", value: 0 },
    { action: "Set variable", target: "Items", value: ["A", "B"] },
    { action: "If", condition: "%Count% > 1" },
    { action: "Display message", value: "大きい" },
    { action: "Else if", condition: "%Count% > 0" },
    { action: "Display message", value: "正" },
    { action: "Else" },
    { action: "Display message", value: "0" },
    { action: "End" },
  ]),
  caution:
    "JSONはこのアプリの学習用フロー表現で、製品のエクスポート形式ではありません。",
  supported: true,
});
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
      "ループ",
      "同じ処理を繰り返す仕組みです。Loopは回数や条件で、For eachはリストの要素ごとに繰り返します。",
    ],
    [
      "デスクトップフロー",
      "自分のパソコン（デスクトップ）上のアプリ操作やファイル操作を自動化するフローです。Power Automate for desktop で作成し、アクションを組み合わせて組み立てます。",
    ],
    [
      "未確定（値）",
      "実行時に決まる値のことです。このアプリでは値を仮定して作らず、未確定のまま扱って、到達可能な分岐をすべて表示します。",
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
    // R31-N13（script系モデル分）：モデル形状の入口検証。モデル自体が
    // オブジェクトでない場合はモデルを、variables／files／sentMail
    // の型違いは項目名を名指して停止する（従来はモデル null で
    // 「null / undefined のプロパティは参照できません」という汎用
    // 文言になっていた）。各項目の欠落は実行側のフォールバック
    // （??= による初期化）があるため受理する。
    const isModelObject = (v) =>
      !!v && typeof v === "object" && !Array.isArray(v);
    const modelFailure = (message) =>
      sourceFailure(new PracticeError(message, 1, "モデルエラー"));
    if (!isModelObject(model))
      return modelFailure("モデルはオブジェクト（JSON）で指定してください");
    if (model.variables !== undefined && !isModelObject(model.variables))
      return modelFailure("モデルvariablesはオブジェクトで指定してください");
    if (model.files !== undefined && !isModelObject(model.files))
      return modelFailure("モデルfilesはオブジェクトで指定してください");
    if (model.sentMail !== undefined && !Array.isArray(model.sentMail))
      return modelFailure("モデルsentMailは配列で指定してください");
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
        read(a, s, api) {
          // R7-123（バッチ13）: 通常 PAD の変数名は大小文字を同一視する。
          // 書かれた大小と違うキーで保存されている変数を解決する
          // （Power Fx 有効フローの大小区別と混同しない）。
          if (a.k === "var") {
            if (!Object.hasOwn(s.vars, a.name)) {
              let key = ciVarKey(s.vars, a.name);
              if (key !== undefined)
                return { handled: true, value: s.vars[key] };
            }
            return null;
          }
          if (a.k === "member") {
            let x;
            try {
              x = api.read(a.target, s);
            } catch {
              return null;
            }
            if (isUnknown(x) || x === null || x === undefined) return null;
            let prop = a.name.toLowerCase();
            // R7-228（バッチ13）: PAD のプロパティ語彙は、リストが
            // Count（Length は無い）、文字列が Length（Count は無い）。
            if (Array.isArray(x)) {
              if (prop === "count") return { handled: true, value: x.length };
              if (prop === "length")
                throw new PracticeError(
                  "リストに Length プロパティはありません（Power Automate Desktop では要素数は Count で取得します）",
                  a.line,
                );
              return null;
            }
            if (typeof x === "string") {
              if (prop === "length")
                return { handled: true, value: x.length };
              if (prop === "count")
                throw new PracticeError(
                  "文字列に Count プロパティはありません（Power Automate Desktop では文字数は Length で取得します）",
                  a.line,
                );
              return null;
            }
            if (typeof x === "object" && !Object.hasOwn(x, a.name)) {
              let key = ciVarKey(x, a.name);
              if (key !== undefined)
                return { handled: true, value: x[key] };
            }
            return null;
          }
          return null;
        },
        binary(op, x, y, node) {
          if (isUnknown(x) || isUnknown(y)) return baseBinary(op, x, y, "js");
          // R7-231（バッチ13）: 順序比較は同じ型同士でのみ行う。数値と
          // 引用文字列等の型違いを JS の暗黙変換で真偽値にしない。
          if (["<", ">", "<=", ">="].includes(op)) {
            const cat = (v) =>
              v === null || v === undefined
                ? "null"
                : Array.isArray(v)
                  ? "リスト"
                  : typeof v === "object"
                    ? "オブジェクト"
                    : { number: "数値", string: "文字列", boolean: "真偽値" }[
                        typeof v
                      ] || typeof v;
            let cx = cat(x),
              cy = cat(y);
            if (cx !== cy)
              throw new PracticeError(
                `異なる型同士の順序比較はできません（${cx} と ${cy}）`,
                node?.line || 1,
              );
          }
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
            // R7-123: 条件中の %変数% は保存キーの大小へ寄せてから
            // uiCondition（大小区別）に渡す。
            let condText = unwrapPercentWrapped(n.test);
            if (typeof condText === "string")
              condText = condText.replace(
                /%([A-Za-z_]\w*)%/g,
                (m, name) => "%" + (ciVarKey(s.vars, name) ?? name) + "%",
              );
            let v = uiCondition(condText, s, api),
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
              // R7-46（バッチ13）: 出力先の変数名が必須。欠落で undefined
              // という名前の変数を作らない。
              if (
                item.target === undefined ||
                item.target === null ||
                String(item.target).trim() === ""
              )
                api.fail(
                  "For each には現在の項目の変数名（target）が必要です",
                  n,
                );
              checkPadReservedName(item.target, n);
              newNode.name = item.target;
              let v = resolve(item.value, s, api);
              newNode.collection = { k: "literal", value: v, line: n.line };
            } else if (n.mode === "while") {
              newNode.test = conditionAST(item.condition, s);
            } else {
              if (
                item.target !== undefined &&
                item.target !== null &&
                String(item.target).trim() !== ""
              )
                checkPadReservedName(item.target, n);
              // R7-226（バッチ13）: 明示した null と省略を区別する。
              // from／to の null を 0 へ変換せず、step の null を既定値
              // 1 でごまかさず、いずれも項目名を挙げて停止する。既定値
              // 1 が効くのは step を省略した場合だけ。
              let bounds = {};
              for (let [key, label] of [
                ["from", "開始値"],
                ["to", "終了値"],
                ["step", "増分"],
              ]) {
                if (key === "step" && item.step === undefined) {
                  bounds.step = 1;
                  continue;
                }
                if (item[key] === undefined || item[key] === null)
                  api.fail(
                    `Loopの${label}（${key}）が必要です（数値で指定してください）`,
                    n,
                  );
                let v = resolve(item[key], s, api);
                if (isUnknown(v)) api.fail("未確定のLoop境界は未対応です", n);
                if (
                  typeof v === "string" &&
                  v.trim() !== "" &&
                  !Number.isNaN(Number(v))
                )
                  v = Number(v);
                if (typeof v !== "number" || !Number.isFinite(v))
                  api.fail("Loopの開始・終了・増分が不正です", n);
                bounds[key] = v;
              }
              let from = bounds.from,
                to = bounds.to,
                step = bounds.step;
              if (!step) api.fail("Loopの開始・終了・増分が不正です", n);
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
              // R22-N23：実 PAD の「変数の設定」は変数名と値が必須で、欠落は
              // フロー定義エラー。target 欠落で幻の変数 undefined を作ったり、
              // value 欠落を無言で通したりせず、名指しで停止する。
              if (a.target === undefined || a.target === null || String(a.target).trim() === "")
                api.fail("Set variable には変数名（target）が必要です", n);
              if (a.value === undefined)
                api.fail("Set variable には値（value）が必要です", n);
              // R7-227（バッチ13）: PAD の予約語は変数名に使えない。
              checkPadReservedName(a.target, n);
              // R7-123: 大小だけ違う既存変数は同一変数として更新する。
              s.vars[ciVarKey(s.vars, a.target) ?? a.target] =
                structuredClone(value);
              api.note(
                s,
                n,
                `${a.target} に ${formatValue(value)} を設定します`,
              );
              break;
            case "Increase variable": {
              if (a.target === undefined || a.target === null || String(a.target).trim() === "")
                api.fail("Increase variable には変数名（target）が必要です", n);
              // M-N6: 変数が存在しない場合は型の問題と区別し、不存在を
              // 先に名指しする（%Undefined% 参照時の文言と揃える）。
              // R7-123: 変数名の大小は同一視して解決する。
              let incKey = ciVarKey(s.vars, a.target);
              if (incKey === undefined)
                api.fail("変数がありません：" + a.target, n);
              if (
                typeof s.vars[incKey] !== "number" ||
                typeof value !== "number"
              )
                api.fail("数値型の変数と増分が必要です", n);
              s.vars[incKey] += value;
              // NX-N16: 説明の動詞は実際の増減方向に合わせる（増分が
              // 負なら減少、0 なら不変であり、「増やします」ではない）。
              if (value > 0)
                api.note(s, n, `${a.target} を ${s.vars[incKey]} に増やします`);
              else if (value < 0)
                api.note(s, n, `${a.target} を ${s.vars[incKey]} に減らします`);
              else
                api.note(s, n, `${a.target} は ${s.vars[incKey]} のまま変わりません`);
              break;
            }
            case "Display input dialog":
              // R7-46（バッチ13）: 出力変数名が必須。欠落で undefined と
              // いう名前の変数を作らない。R7-227: 予約語も使えない。
              if (a.target === undefined || a.target === null || String(a.target).trim() === "")
                api.fail("Display input dialog には出力変数名（target）が必要です", n);
              checkPadReservedName(a.target, n);
              s.vars[ciVarKey(s.vars, a.target) ?? a.target] =
                api.freshUnknown("入力ダイアログの入力", s);
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
              // R7-46（バッチ13）: ファイルパス（target）と書き込む
              // テキスト（value）が必須。target 欠落で "undefined" という
              // 名前のモデルファイルを作らない。
              if (a.target === undefined || a.target === null || String(a.target).trim() === "")
                api.fail("Write text to file にはファイルパス（target）が必要です", n);
              if (a.value === undefined)
                api.fail("Write text to file には書き込むテキスト（value）が必要です", n);
              let path = padInterpolate(a.target, s, api);
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
              // R7-46（バッチ13）: 出力変数名（target）とファイルパス
              // （value）が必須。target 欠落を無言で通さない。
              if (a.target === undefined || a.target === null || String(a.target).trim() === "")
                api.fail("Read text from file には出力変数名（target）が必要です", n);
              if (a.value === undefined || a.value === null || String(a.value).trim() === "")
                api.fail("Read text from file にはファイルパス（value）が必要です", n);
              checkPadReservedName(a.target, n);
              let readKey = ciVarKey(s.vars, a.target) ?? a.target;
              if (isUnknown(value))
                s.vars[readKey] = unknown("読み取り先のファイルによる");
              else if (!Object.hasOwn(s.model.files || {}, value))
                api.fail("モデルにファイルがありません：" + value, n);
              else s.vars[readKey] = s.model.files[value];
              api.note(s, n, `モデルファイルを ${a.target} に読み込みます`);
              break;
            }
            case "Send email": {
              if (a.target === undefined || a.target === null || String(a.target).trim() === "")
                api.fail("Send email には宛先（target）が必要です", n);
              s.model.sentMail ??= [];
              s.model.sentMail.push({
                to: padInterpolate(a.target, s, api),
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
      return sourceFailure(
        e instanceof PracticeError || e?.category ? e : toLearnerError(e),
      );
    }
  },
};
function resolve(v, s, api) {
  // R28-N13: 包み判定は前後の空白を取り除いた形で行う。生文字列のまま
  // 判定すると、空白で挟んだ "%N% + 1%" 形が包み判定をすり抜けて通常の
  // 文字列補間に落ち、数値式のつもりが黙って文字列化していた（条件側は
  // unwrapPercentWrapped が trim 済みで判定するため空白形でも停止する
  // 対照があり、値側だけが不揃いだった）。判定・包み外し・式の解釈は
  // 全て trim 済みの文字列で統一する。
  const t = typeof v === "string" ? v.trim() : v;
  if (typeof t === "string" && t.includes("%")) {
    // R7-124（バッチ13）: %% エスケープを含む文字列は PAD 補間で処理する
    // （%% はリテラルの % になり、%%Price%% は "%Price%" になる）。
    if (t.includes("%%")) return padInterpolate(t, s, api);
    if (/^%[\s\S]*%$/.test(t)) {
      // R27-N9: 先頭が %変数% 参照で始まる形（"%N% + 1%" 等）は包み形では
      // ない。先頭の %…% は変数参照として消費されるため、末尾の % は式の
      // 終端ではなく、包みを外すと閉じ % が剰余演算子に化けて黙って誤値に
      // なる。実 PAD でも解釈エラーになる形なので、名前を挙げて停止する。
      // 単独の %変数% 参照そのもの（"%N%"）は従来どおり変数の値として読む。
      if (startsWithPercentVariable(t) && !/^%[A-Za-z_]\w*%$/.test(t)) {
        // R7-225（バッチ13）: "%A% %B%" のように完全な %変数% 参照と
        // リテラルだけで構成される文字列は、包み形ではなく補間として
        // 解釈する（残りに単独の % が残る形は従来どおり R27-N9 で停止）。
        if (isPurePercentInterpolation(t)) return padInterpolate(t, s, api);
        throw new PracticeError(
          "%変数% で始まる文字列は式として解釈できません（式全体を %…% で包む場合は、内側の変数名を % なしで書いてください）",
          1,
        );
      }
      return api.read(parseExpression(t.slice(1, -1)), s);
    }
    // R7-225: 文中に埋め込まれた %式%（"total=%N + 1%" 等）も展開する。
    return padInterpolate(v, s, api);
  }
  return interpolate(v, s);
}
// 大小文字を同一視した変数キーの解決（R7-123）。PAD 専用で、共有コアの
// interpolate（UI.Vision 等の大小区別）には影響させない。
function ciVarKey(vars, name) {
  if (!vars || typeof vars !== "object") return undefined;
  return Object.keys(vars).find(
    (k) => k.toLowerCase() === String(name).toLowerCase(),
  );
}
// R7-227（バッチ13）: PAD の予約語（Microsoft Learn の変数・フロー制御の
// キーワード）は変数名に使えない。
const PAD_RESERVED_NAMES = new Set([
  "if", "else", "elseif", "loop", "foreach", "for", "each", "while",
  "end", "and", "or", "not", "true", "false", "switch", "case",
  "default", "exit", "next", "then", "do",
]);
function checkPadReservedName(name, node) {
  if (PAD_RESERVED_NAMES.has(String(name).trim().toLowerCase()))
    throw new PracticeError(
      `変数名「${name}」は Power Automate Desktop の予約語のため使えません`,
      node?.line || 1,
    );
}
// 完全な %変数% 参照と %% エスケープとリテラルだけで構成されるか。
function isPurePercentInterpolation(text) {
  let rest = text
    .replace(/%%/g, " ")
    .replace(/%[A-Za-z_][\w.]*%/g, "");
  return !rest.includes("%");
}
// PAD の文字列補間（R7-123／124／225）: %% はリテラルの %、%変数% は
// 大小同一視で展開、%式%（演算子やプロパティを含む内側）は式として評価
// する。単独で残る % はリテラルとして残す。
function padInterpolate(text, s, api) {
  if (typeof text !== "string") return text;
  let unknownValue;
  const embedName = (key) => {
    if (key === "True" || key === "False") return key;
    let stored = ciVarKey(s.vars, key);
    if (stored === undefined)
      throw new PracticeError("変数がありません：" + key);
    let v = s.vars[stored];
    if (v?.kind === "unknown") {
      unknownValue = v;
      return "";
    }
    return String(v);
  };
  let out = "",
    i = 0;
  while (i < text.length) {
    if (text.startsWith("%%", i)) {
      out += "%";
      i += 2;
      continue;
    }
    if (text.startsWith("${", i)) {
      let j = text.indexOf("}", i + 2);
      if (j > i + 2) {
        out += embedName(text.slice(i + 2, j));
        i = j + 1;
        continue;
      }
    }
    if (text[i] === "%") {
      let m = /^%([^%]*)%/.exec(text.slice(i));
      if (m) {
        let inner = m[1].trim();
        if (/^[A-Za-z_]\w*$/.test(inner)) {
          out += embedName(inner);
          i += m[0].length;
          continue;
        }
        // プロパティ参照（Items.Count）や埋込み式（N + 1）は式として評価。
        if (inner && api && /[+\-*/.<>=]/.test(inner)) {
          let ast = null;
          try {
            ast = parseExpression(inner);
          } catch {
            ast = null;
          }
          if (ast) {
            let val = api.read(ast, s);
            if (isUnknown(val)) unknownValue = val;
            else out += String(val ?? "");
            i += m[0].length;
            continue;
          }
        }
      }
      out += "%";
      i++;
      continue;
    }
    out += text[i];
    i++;
  }
  return unknownValue
    ? { ...unknownValue, source: "変数を展開した文字列による" }
    : out;
}
// 文字列が完全な %変数% 参照で始まるか（R27-N9 の判定）。
// "%N + 1%"（裸の変数名で始まる正規の包み形）や "%4 / 2%"（数値で始まる
// 包み形）は、% の直後が変数名＋閉じ % の形にならないため一致しない。
function startsWithPercentVariable(text) {
  return /^%[A-Za-z_]\w*%/.test(text.trim());
}
function conditionAST(text, s) {
  // R7-123: %変数% は保存キーの大小へ寄せてから裸の名前へ置換する。
  let normalized = unwrapPercentWrapped(text).replace(
    /%([A-Za-z_]\w*)%/g,
    (m, name) => ciVarKey(s.vars, name) ?? name,
  );
  return parseExpression(normalized);
}
// R26-N17: 条件全体を %…% で包んだ形（値側の resolve が受理する PAD の
// 式記法）は、包みを外した内側を式として解釈する。内側の %変数% 参照は
// そのまま残し、後段（uiCondition／conditionAST）の置換に委ねる。
// %A% == %B% のように %変数% が並ぶだけの形は、両端の % を外すと壊れる
// ため、%変数% を仮名へ置換した内側が構文解析できる場合に限って外す
// （解析できない形は従来の解釈のままにする）。
function unwrapPercentWrapped(text) {
  if (typeof text !== "string") return text;
  let t = text.trim();
  if (t.length < 2 || !t.startsWith("%") || !t.endsWith("%")) return text;
  // R27-N9: 先頭が %変数% 参照で始まる形（"%N% + 1 > 3%" 等）は包み形
  // ではない。先頭の %…% が変数参照として消費されるため、包みを外すと
  // 変数参照の閉じ % が内側に残り、剰余演算子として偶然パースできて
  // 黙って誤分岐する。包みを外さず通常の条件解釈（%変数% 置換）に委ね、
  // 末尾に残る % は式の解釈エラーとして停止させる（実 PAD でも解釈
  // エラーになる形）。"%A% == %B%" の非破壊もこの経路で維持される。
  if (startsWithPercentVariable(t)) return text;
  let inner = t.slice(1, -1);
  if (!inner.trim()) return text;
  try {
    parseExpression(inner.replace(/%[A-Za-z_]\w*%/g, "__wrappedVar"));
  } catch {
    return text;
  }
  return inner;
}

definition.templates.push(...additionalTemplates(definition.model.defaults));

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
