import { additionalTemplates } from "./additional-templates.js";
// R-2 の「最低限の配線」：本ファイルに残る高度関連の配線は、高度ハンドラ
// への委譲可否の最小チェック（advancedState.enabled の参照）のみである。
// モード判定（localStorage・getMode 等）は一切書かない。有効化は機構の
// advanced-loader が advanced-engine.js の applyAdvancedEngine を呼ぶ
// 経路でのみ行われる。
import { advancedFunctions, advancedState } from "./semantics-advanced.js";
import {
  ScriptParser,
  executeProgram,
  parseExpression,
  scanScript,
  baseBinary,
  callName,
  PracticeError,
  unsupported,
  toLearnerError,
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
    "If(Condition1, Then1 [, Condition2, Then2, ...] [, Else])",
    "条件を左から評価し、最初に成立する式だけを評価します。条件と結果の組は複数並べることができ、最後に既定値を1つ置けます（可変長）。",
    'If(Count > 0, Set(Result, "正"), Set(Result, "その他"))',
  ],
  [
    "Switch",
    "分岐",
    "Switch(Value, Match1, Result1 [, Match2, Result2, ...] [, Default])",
    "値を一度評価し、最初に一致する結果だけを評価します。一致値と結果の組は複数並べることができ、最後に既定値を1つ置けます（可変長）。",
    'Switch(Count, 1, "一", "その他")',
  ],
  [
    "Collect",
    "コレクション",
    "Collect(Collection, Record1 [, Record2, ...])",
    "レコードを追加します。値だけならValue列に入ります。複数のレコードやテーブルを一度に指定して追加することもできます。",
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
    "ClearCollect(Collection, RecordOrTable1 [, RecordOrTable2, ...])",
    "コレクションを空にしてから追加します。Collectと同様に、複数のレコードやテーブルを一度に指定できます。",
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
    "Sequence(Records [, Start [, Step]])",
    "Value列を持つ数列テーブルを生成します。Start（既定値1）とStep（既定値1）は省略できます。",
    "Sequence(3)",
    "生成する件数は最も近い整数へ切り捨てられます（例：Sequence(0.9)は0件になり、空表を生成します）。この説明では上限1,000件です（Microsoft Learnでの上限は50,000件）。",
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
    "Sum(Table, Formula) または Sum(NumericalFormula1 [, NumericalFormula2, ...])",
    "テーブル形では各行で数式を評価し合計します。数値形では、渡した数値の式をすべて合計します。",
    "Sum(Items, Value)",
  ],
  [
    "Filter",
    "テーブル",
    "Filter(Table, Formula1 [, Formula2, ...])",
    "条件を満たす行を抽出します。複数の数式を渡すと、すべてを満たす行を抽出します（Andで結合されます）。",
    "Filter(Items, Value > 1)",
    "委任できる条件はデータソースと演算子に依存します。委任できないクエリは既定500件（設定で最大2,000件）の取得範囲で評価され、結果が欠ける場合があります。このモデルは明示したローカルデータだけを評価します。",
  ],
  [
    "LookUp",
    "テーブル",
    "LookUp(Table, Condition [, ReductionFormula])",
    "最初に一致したレコードを返します。第3引数に削減式を指定すると、レコードそのものではなく、そのレコードの範囲で削減式を評価した値を返します。",
    "LookUp(Items, Value = 2, Value * 10)",
  ],
  [
    "Patch",
    "レコード",
    "Patch(Source, BaseRecord, ChangeRecord1 [, ChangeRecord2, ...])",
    "モデルデータソースの既存レコードを更新または追加します。変更レコードを複数渡すと、統合して適用します（同じ項目は後ろのレコードが優先されます）。",
    'Patch(Orders, Defaults(Orders), {Name:"A"})',
    "サーバが採番するIDは捏造しません。",
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
    "このモデルは第1引数の画面だけに対応します。画面遷移（第2引数）やコンテキスト（第3引数）を渡すと引数の数のエラーで停止します。画面のOnVisible等も未対応です。",
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
    "Text(Value [, Format [, ResultLanguageTag]])",
    "値を文字列に変換します。第2引数に書式文字列（0や#のプレースホルダ、小数点・桁区切り、%など）を指定すると数値を整形でき、第3引数で結果の言語タグを指定できます。",
    'Text(Count, "#,##0")',
    "このモデルの書式指定は数値に対してのみで、言語タグはen-USのみ対応します。日付・時刻の書式は未対応です。",
  ],
  [
    "Value",
    "型変換",
    "Value(Text [, LanguageTag])",
    "明示した10進数文字列を数値へ変換します。指数表記（1e3）と百分率（10%→0.1）も変換します。入力がBlankまたは空文字列の場合はBlankを返します。",
    "Value(Input1.Text)",
    "言語タグはen-USのみ対応します。地域依存書式は未対応です。",
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
    "Notify(Message [, NotificationType [, Timeout]])",
    "通知をモデルの出力へ追加します。NotificationTypeで通知の種類（既定はInformation）、Timeoutで表示時間（既定は10秒）を指定できます。",
    'Notify("保存しました")',
    "このモデルでは通知の種類と表示時間は、出力のテキストには反映しません。",
  ],
  [
    "And",
    "論理",
    "And(LogicalFormula1, LogicalFormula2 [, LogicalFormula3, ...])",
    "すべての引数が真のとき真を返します（関数形）。演算子のAndや&&でも同じ意味になります。",
    "And(1 < 2, 2 < 3)",
  ],
  [
    "Or",
    "論理",
    "Or(LogicalFormula1, LogicalFormula2 [, LogicalFormula3, ...])",
    "いずれかの引数が真のとき真を返します（関数形）。演算子のOrや||でも同じ意味になります。",
    "Or(false, 1 < 2)",
  ],
  [
    "Not",
    "論理",
    "Not(Logical)",
    "真偽を反転します（関数形）。演算子のNotでも同じ意味になります。",
    "Not(false)",
  ],
  [
    "ThisRecord",
    "レコード",
    "ThisRecord",
    "ForAll／Filter／Sum／LookUpなどの数式の中で、現在処理中のレコード全体を表します。レコードの範囲の外では使えません。",
    "Sum(Sequence(3), ThisRecord.Value)",
    "レコードの範囲の外で使うと、名前を挙げて停止します。",
  ],
  [
    "in（演算子）",
    "演算子",
    "部分文字列 in 文字列／値 in テーブル／部分文字列 exactin 文字列",
    "左の値が右に含まれるかを返します。文字列同士では部分文字列かどうかを判定し、inは大文字と小文字を区別せず、exactinは区別します。テーブルに対しては要素が含まれるかを判定します。",
    'Set(Found, "ell" in "Hello")',
  ],
]);
for (const r of reference) {
  if (["If","Switch","Text"].includes(r.name)) r.example = "Set(Count, 2);\n" + r.example;
  if (["CountRows","Sum","Filter","LookUp"].includes(r.name)) r.example = "ClearCollect(Items, {Value:1}, {Value:2});\n" + r.example;
}
function lowerBehavior(expr, line = expr.line || 1) {
  let name = callName(expr.target).toLowerCase();
  // R26-N15: If／Switch の最小引数検証。動作数式として直接書かれた
  // If／Switch は call() の RG-16 アリティ検証を通らずに if ノードへ
  // 変換されるため、変換前に同じ文言で検証する（If() が Blank、
  // If(条件) が条件値そのもの、Switch() が汎用文言になっていた）。
  // Set の直下の If／Switch も、Blank 補完の前後いずれでもこの検証を
  // 通る（検証は元の個数に対して行う）。
  if (expr.k === "call" && name === "if" && expr.args.length < 2)
    throw new PracticeError(
      `${callName(expr.target)} の引数の数が正しくありません（2 個以上が必要です。空の引数は書けません）`,
      line,
    );
  // R7-220（バッチ13）: Switch の最小は3個（Value＋Match＋Result）。
  // Microsoft Learn の Switch 構文では Match と Result の組が必須で、
  // Default は組の後ろに置く任意引数のため、2個形（Value と Default
  // だけ）は引数不足である。旧解釈（2個形を Default として受理）は
  // 一次情報と矛盾するため是正し、call() 側のアリティ表も最小3個に
  // 揃える。
  if (expr.k === "call" && name === "switch" && expr.args.length < 3)
    throw new PracticeError(
      `${callName(expr.target)} の引数の数が正しくありません（3 個以上が必要です。空の引数は書けません）`,
      line,
    );
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
          // R7-216（バッチ13）: Switch の比較であることを印付けし、
          // binary 側で比較値と一致値の型検査を行う。
          test: { k: "binary", op: "=", a: temp, b: args[1 + i * 2], fxSwitchCompare: true, line },
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
      args = [...branch.args];
    // R26-N15: Set 直下では、下の Blank 補完で個数が増えて検証を
    // すり抜けないよう、補完前の元の個数でも検証する。
    {
      let bn = callName(branch.target).toLowerCase();
      if (bn === "if" && branch.args.length < 2)
        throw new PracticeError(
          `${callName(branch.target)} の引数の数が正しくありません（2 個以上が必要です。空の引数は書けません）`,
          line,
        );
      if (bn === "switch" && branch.args.length < 3)
        throw new PracticeError(
          `${callName(branch.target)} の引数の数が正しくありません（3 個以上が必要です。空の引数は書けません）`,
          line,
        );
    }
    // D-1: If の既定値なし・Switch の既定値なしは Blank を返すのが
    // Power Fx の規則（各項目の returns 欄どおり）。Set の動作数式化で
    // 「該当なし」の経路に Set 自体が存在しないと、変数が未定義のまま
    // になり後続参照が未定義エラーになる（Set(R, Blank()) や
    // UpdateContext 経由では R=null で登録されるのと不整合）。該当なし
    // の経路には Set(名前, Blank()) を補い、変数を Blank として定義する。
    let branchName = callName(branch.target).toLowerCase(),
      hasFallback =
        branchName === "if" ? args.length % 2 === 1 : args.length % 2 === 0;
    if (!hasFallback)
      args.push({
        k: "call",
        target: { k: "var", name: "Blank", line },
        args: [],
        line,
      });
    let wrapped = {
      ...branch,
      args: args.map((v, i) => (name === "switch" ? v : v)),
    };
    if (branchName === "if")
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
// RG-75（R20-N5）: テキストから Boolean への変換は "true"／"false" のみ
// （大小不区別）で、空テキストは Blank として偽。それ以外のテキストは
// 変換エラーとして停止する（Microsoft Learn「Boolean function」の規則）。
function fxTruth(v, line) {
  // R7-65（バッチ13）: テーブル／レコードは真偽値へ暗黙変換しない
  // （JS の truthy で Not(Table()) が false になる等を防ぐ型エラー）。
  // 未確定値は従来どおり呼び出し側の分岐処理に委ねる。
  if (
    (Array.isArray(v) || (v !== null && typeof v === "object")) &&
    !(v && v.kind === "unknown")
  )
    throw new PracticeError(
      "テーブルやレコードは真偽値として使えません（型が一致しません）",
      line,
    );
  if (typeof v === "string") {
    const t = v.toLowerCase();
    if (t === "true") return true;
    if (t === "false" || t === "") return false;
    throw new PracticeError(
      `テキスト "${v}" を Boolean に変換できません（"true"／"false" のみ変換できます）`,
      line,
    );
  }
  return Boolean(v);
}
// PFX-D2（高度A2監査）: Power Fx のテキスト比較は大文字と小文字を区別
// しない（Microsoft Learn の等値演算子の規則。in が大小不区別である
// ことと同根で、Find／Search／StartsWith 等の既存実装とも揃う）。
// 比較対象が文字列同士の場合だけ大小を折り畳み、それ以外は従来どおり
// 厳密に比較する（"5" = 5 は型が違うため不一致のまま）。
function fxEqual(a, b) {
  if (typeof a === "string" && typeof b === "string")
    return a.toLowerCase() === b.toLowerCase();
  return a === b;
}
// R31-N13: モデル形状の入口検証。モデル自体がオブジェクトでない場合と、
// defaults の実項目（screens／controls／variables／collections／
// dataSources／defaults／bindings／screen／language）の欠落・型違いを、
// 汎用のホスト文言（「null / undefined のプロパティは参照できません」等）
// に落とさず、モデル側の言葉で項目名を名指して停止する。文言の水準は
// shell の「モデルfilesは配列で指定してください」、CloudFormation の
// 「モデルにマクロ定義がありません：…」に揃える。なお screen が指す画面が
// screens に実在するかは検証しない（UpdateContext／Navigate 側の既存の
// 名指し停止が担当する。RG-10 の文言を変えないため）。
function isFxModelObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function validateFxModel(model) {
  const fail = (message) => {
    throw new PracticeError(message, 1, "モデルエラー");
  };
  if (!isFxModelObject(model)) fail("モデルはオブジェクトで指定してください");
  for (const key of [
    "screens",
    "controls",
    "variables",
    "collections",
    "dataSources",
    "defaults",
    "bindings",
  ]) {
    if (!(key in model)) fail(`モデルに${key}がありません`);
    if (!isFxModelObject(model[key]))
      fail(`モデル${key}はオブジェクトで指定してください`);
  }
  for (const key of ["screen", "language"]) {
    if (!(key in model)) fail(`モデルに${key}がありません`);
    if (typeof model[key] !== "string")
      fail(`モデル${key}は文字列で指定してください`);
  }
  for (const [name, screen] of Object.entries(model.screens)) {
    if (!isFxModelObject(screen))
      fail(`モデルscreens.${name}はオブジェクトで指定してください`);
    if (screen.context !== undefined && !isFxModelObject(screen.context))
      fail(`モデルscreens.${name}.contextはオブジェクトで指定してください`);
  }
  for (const [name, control] of Object.entries(model.controls))
    if (!isFxModelObject(control))
      fail(`モデルcontrols.${name}はオブジェクトで指定してください`);
  for (const [name, table] of Object.entries(model.dataSources))
    if (!Array.isArray(table))
      fail(`モデルdataSources.${name}は配列で指定してください`);
  for (const [name, record] of Object.entries(model.defaults))
    if (!isFxModelObject(record))
      fail(`モデルdefaults.${name}はオブジェクトで指定してください`);
  for (const [name, table] of Object.entries(model.collections))
    if (!Array.isArray(table))
      fail(`モデルcollections.${name}は配列で指定してください`);
  for (const [name, formula] of Object.entries(model.bindings))
    if (typeof formula !== "string")
      fail(`モデルbindings.${name}は文字列で指定してください`);
}
// R31 横断スイープ(c)：途中終了した式のパーサエラーが内部トークン
// 「<eof>」を学習者向け文言に含めていた（例：「式を解釈できません：
// <eof>」）。AutoHotkey の RG-08 サニタイズと同じ文言・方針で置き換える。
function sanitizeFxEof(e) {
  if (typeof e?.message === "string" && e.message.includes("<eof>"))
    return new PracticeError(
      "式を解釈できません（式が途中で終わっています）",
      e.line || 1,
      e.category || "エラー",
    );
  return e;
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
    [
      "レコード",
      "テーブルの1行分のデータです。項目ごとの値の集まりで表します。",
    ],
    [
      "テーブル",
      "レコードを行として並べたデータの集まりです。列が項目に対応します。",
    ],
    [
      "データソース",
      "アプリがレコードを読み書きする接続先です。このアプリではモデル上のデータがデータソースになります。",
    ],
    ["コレクション", "アプリ内のレコードを行として持つテーブルです。"],
    [
      "動作数式",
      "SetやNavigateなど、操作イベントに応じて状態を変更する数式です。",
    ],
    [
      "表示数式",
      "コントロールのプロパティに結び付けられ、その評価結果で表示内容が決まる数式です。",
    ],
    [
      "再計算",
      "変数やコントロールの値が変わったときに、表示数式を評価し直して表示を最新の結果に更新することです。",
    ],
    [
      "未確定（値）",
      "実行時に決まる値のことです。このアプリでは値を仮定して作らず、未確定のまま扱って、到達可能な分岐をすべて表示します。",
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
      // R31-N13: モデル形状は入口で検証し、項目名を名指して停止する。
      validateFxModel(model);
      // RG-18: record / table values are shown with the app's human-readable
      // formatter instead of JavaScript's String(), which leaks
      // "[object Object]" for records.
      function fxTextOf(v) {
        if (v === null || v === undefined) return "";
        return typeof v === "object" ? formatValue(v) : String(v);
      }
      // R24-N35：Blank（内部表現 null）の文字列化は空文字列が正しい
      // （Power Fx の Blank は「値なし」であり、JS の内部表現 "null" を
      // 学習者の見る文面へ出さない。Microsoft Learn「Blank, Coalesce,
      // IsBlank, and IsEmpty functions」）。値→表示文字列の共通経路として、
      // 通知文・手順テキスト・コア側の整形（semantics.format）では
      // formatValue の "null" を使わず、Blank は "" に倒す fxFormatValue を
      // 通す。連結 & と Text() は従来から fxTextOf／専用分岐で "" になる
      // ことを回帰テストで固定する。
      function fxFormatValue(v) {
        return v === null || v === undefined ? "" : formatValue(v);
      }
      // R7-216（バッチ13）: Switch の型検査用の型名。Blank と未確定値は
      // 型検査の対象外（Blank はどの一致値とも不一致として扱う）。
      function fxTypeOf(v) {
        if (v === null || v === undefined || isUnknown(v)) return null;
        if (Array.isArray(v)) return "テーブル";
        if (typeof v === "object") return "レコード";
        return (
          { number: "数値", string: "テキスト", boolean: "真偽値" }[
            typeof v
          ] || typeof v
        );
      }
      function checkSwitchType(value, match, node, api) {
        let a = fxTypeOf(value),
          b = fxTypeOf(match);
        if (a && b && a !== b)
          api.fail(
            `Switch の一致値の型が比較値と一致しません（${a} と ${b}）`,
            node,
          );
      }
      // RG-15: numeric custom formats for Text(Value, Format), following the
      // number placeholders documented by Microsoft (0, #, ".", grouping ",",
      // scaling ",", and "%"). Anything outside that subset (date/time
      // placeholders, format sections, other languages) stops honestly
      // through fail() instead of being silently ignored.
      function fxFormatNumber(value, format, fail) {
        let fmt = format.replace(/\[\$-[^\]]*\]/g, (m) => {
          let tag = m.slice(3, -1).toLowerCase();
          if (tag === "en-us" || tag === "en") return "";
          fail(
            "Text の書式の言語プレースホルダ " +
              m +
              " は未対応です（このモデルは en-US のみ対応）：" +
              format,
          );
          return "";
        });
        if (fmt.includes(";"))
          fail(
            "Text の書式のセクション区切り（;）は未対応です：" + format,
          );
        let tokens = [];
        for (let i = 0; i < fmt.length; i++) {
          let c = fmt[i];
          if (c === '"') {
            let j = fmt.indexOf('"', i + 1);
            if (j < 0)
              fail("Text の書式の引用符が閉じていません：" + format);
            tokens.push({ t: "lit", v: fmt.slice(i + 1, j) });
            i = j;
          } else if (c === "\\") {
            if (i + 1 >= fmt.length)
              fail("Text の書式のエスケープが不完全です：" + format);
            tokens.push({ t: "lit", v: fmt[i + 1] });
            i++;
          } else if (c === "0" || c === "#") tokens.push({ t: "ph", v: c });
          else if (c === ".") tokens.push({ t: "dot" });
          else if (c === ",") tokens.push({ t: "comma" });
          else if (c === "%") tokens.push({ t: "pct" });
          else if (
            "$€£¥¢+-():'{}<=>/&~ ".includes(c) ||
            /[^\x00-\x7F]/.test(c)
          )
            tokens.push({ t: "lit", v: c });
          else
            fail(
              "Text の書式引数に未対応のプレースホルダ「" +
                c +
                "」が含まれています：" +
                format,
            );
        }
        let dotAt = tokens.findIndex((t) => t.t === "dot");
        if (tokens.filter((t) => t.t === "dot").length > 1)
          fail("Text の書式に小数点が複数あります：" + format);
        let intTokens = dotAt < 0 ? tokens : tokens.slice(0, dotAt),
          fracTokens = dotAt < 0 ? [] : tokens.slice(dotAt + 1);
        let fracPh = fracTokens.filter((t) => t.t === "ph"),
          fracCount = fracPh.length,
          mandatoryFrac = fracPh.reduce(
            (acc, t, i) => (t.v === "0" ? i + 1 : acc),
            0,
          );
        let intPh = intTokens.filter((t) => t.t === "ph"),
          minInt = intPh.filter((t) => t.v === "0").length;
        let lastPhAt = intTokens.map((t) => t.t).lastIndexOf("ph"),
          scaling = intTokens.filter(
            (t, i) => t.t === "comma" && i > lastPhAt,
          ).length,
          grouping = intTokens.some(
            (t, i) =>
              t.t === "comma" &&
              i < lastPhAt &&
              intTokens.slice(0, i).some((x) => x.t === "ph"),
          );
        let pctCount = tokens.filter((t) => t.t === "pct").length,
          scaled =
            (value * Math.pow(100, pctCount)) / Math.pow(1000, scaling);
        if (!Number.isFinite(scaled) || Math.abs(scaled) >= 1e21)
          fail("Text の書式：大きすぎる数値は未対応です：" + format);
        // R7-118（バッチ13）: 丸めは JS の toFixed（2進表現依存で
        // 1.005→"1.00" になる）ではなく、10進文字列のまま半上げする
        // （Power Fx／SDK 実測: 1.005→"1.01"、2.675→"2.68"）。
        function expandDecimal(str) {
          if (!/[eE]/.test(str)) return str;
          let [mant, expS] = str.split(/[eE]/),
            exp = parseInt(expS, 10),
            neg = mant.startsWith("-");
          mant = mant.replace("-", "");
          let [ip, fp = ""] = mant.split("."),
            digits = ip + fp,
            point = ip.length + exp,
            out;
          if (point <= 0) out = "0." + "0".repeat(-point) + digits;
          else if (point >= digits.length)
            out = digits + "0".repeat(point - digits.length);
          else out = digits.slice(0, point) + "." + digits.slice(point);
          return (neg ? "-" : "") + out;
        }
        function decimalRound(abs, digits) {
          let s = expandDecimal(String(abs)),
            [ip, fp = ""] = s.split(".");
          ip = ip.replace(/^0+(?=\d)/, "");
          if (fp.length <= digits)
            return {
              intDigits: ip,
              fracDigits: fp.padEnd(digits, "0"),
            };
          let keep = fp.slice(0, digits);
          if (fp[digits] < "5") return { intDigits: ip, fracDigits: keep };
          let combined = (ip + keep).split(""),
            i = combined.length - 1;
          while (i >= 0 && combined[i] === "9") {
            combined[i] = "0";
            i--;
          }
          if (i < 0) combined.unshift("1");
          else combined[i] = String(Number(combined[i]) + 1);
          let joined = combined.join("");
          return {
            intDigits: digits ? joined.slice(0, joined.length - digits) || "0" : joined,
            fracDigits: digits ? joined.slice(joined.length - digits) : "",
          };
        }
        let negative = scaled < 0,
          rounded = decimalRound(Math.abs(scaled), fracCount),
          rawInt = rounded.intDigits;
        let fracDigits = rounded.fracDigits;
        while (
          fracDigits.length > mandatoryFrac &&
          fracDigits.endsWith("0")
        )
          fracDigits = fracDigits.slice(0, -1);
        // R7-117（バッチ13）: # だけの整数部では 0 を表示しない
        // （Text(0,"#") は空文字列、Text(0,"#.00") は ".00"）。
        // 丸め結果が 0 のときは負号も付けない。
        let intZero = /^0*$/.test(rawInt),
          resultZero = intZero && !/[1-9]/.test(fracDigits);
        if (resultZero) negative = false;
        // 位置割り当てが必要なのは、プレースホルダの「間」にリテラルが
        // ある場合だけ（"$ #,###" のように先頭に付くリテラルは対象外で、
        // 桁区切り等の通常処理を維持する）。
        let hasMidLit = (toks) =>
          toks.some(
            (t, idx) =>
              t.t === "lit" &&
              toks.slice(0, idx).some((x) => x.t === "ph") &&
              toks.slice(idx + 1).some((x) => x.t === "ph"),
          );
        let intHasLit = hasMidLit(intTokens),
          fracHasLit = hasMidLit(fracTokens);
        let intDisplay = "";
        if (!(intZero && minInt === 0)) {
          intDisplay = rawInt.padStart(minInt, "0");
          if (!intHasLit && grouping && intDisplay.length > 3)
            intDisplay = intDisplay.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
        // R7-119（バッチ13）: 整数部の桁の途中にリテラルがある書式
        // （"00-00" 等）は、数字をプレースホルダ位置へ右詰めで割り当て、
        // リテラルをその位置に残す（末尾へ移動させない）。
        let posIntChars = null,
          posIntSpill = "";
        if (intHasLit) {
          if (intZero && minInt === 0)
            posIntChars = intPh.map(() => "");
          else {
            let dig = rawInt.padStart(minInt, "0");
            posIntSpill =
              dig.length > intPh.length
                ? dig.slice(0, dig.length - intPh.length)
                : "";
            let tail = dig.slice(Math.max(0, dig.length - intPh.length)),
              padCount = intPh.length - tail.length;
            posIntChars = intPh.map((t, idx) =>
              idx < padCount ? (t.v === "0" ? "0" : "") : tail[idx - padCount],
            );
          }
        }
        let out = "",
          intDone = false,
          fracDone = false,
          intPhIdx = 0,
          fracPhIdx = 0;
        for (let ti = 0; ti < tokens.length; ti++) {
          let t = tokens[ti];
          if (t.t === "ph") {
            let inFrac = dotAt >= 0 && ti > dotAt;
            if (!inFrac) {
              if (intHasLit) {
                if (!intDone) {
                  out += posIntSpill;
                  intDone = true;
                }
                out += posIntChars[intPhIdx++] ?? "";
              } else if (!intDone) {
                out += intDisplay;
                intDone = true;
              }
            } else if (fracHasLit) {
              let idx = fracPhIdx++;
              out +=
                idx < fracDigits.length
                  ? fracDigits[idx]
                  : fracPh[idx]?.v === "0"
                    ? "0"
                    : "";
              fracDone = true;
            } else if (!fracDone) {
              out += fracDigits;
              fracDone = true;
            }
          } else if (t.t === "dot") {
            // R7-117: 小数部に表示する数字が無ければ小数点も付けない
            // （Text(1,"0.##") は "1" であって "1." ではない）。
            if (fracDigits.length > 0) out += ".";
          } else if (t.t === "pct") out += "%";
          else if (t.t === "comma") continue;
          else out += t.v;
        }
        if (!intDone && intDisplay) out = intDisplay + out;
        return (negative ? "-" : "") + out;
      }
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
          let controlKey = Object.keys(s.model.controls || {}).find(
            (k) => k.toLowerCase() === name.toLowerCase(),
          );
          if (!controlKey)
            api.fail("bindingのコントロールがありません：" + name, { line: 1 });
          try {
            s.model.controls[controlKey][prop] = api.read(
              parseExpression(text, "fx"),
              s,
            );
          } catch (e) {
            if (/未定義/.test(e.message))
              s.model.controls[controlKey][prop] = null;
            else throw e;
          }
        }
        s.bindingDepth = 0;
      }
      // NX-N3/N4/N15 共通根因: Power Fx の識別子は大文字小文字を区別しない
      // （syntax.caseSensitive: false）。読み取り側（read）は不区別に照合する
      // のに書き込み側が書かれた通りのキーで別エントリを作ると、説明・
      // groups と読み戻しが食い違う。名前で引く全ての表面は ciKey で既存
      // キーへ寄せ、別表記の重複キーは作らない／残さない。
      function ciKey(obj, name) {
        if (!obj || typeof obj !== "object") return undefined;
        return Object.keys(obj).find(
          (k) => k.toLowerCase() === String(name).toLowerCase(),
        );
      }
      function ciDropDuplicates(obj, keepKey, name) {
        if (!obj || typeof obj !== "object") return;
        for (let k of Object.keys(obj))
          if (
            k !== keepKey &&
            k.toLowerCase() === String(name).toLowerCase()
          )
            delete obj[k];
      }
      let semantics = {
        dialect: "fx",
        // R24-N35：コア（executeProgram）側の手順テキスト整形でも Blank を
        // "null" と表示しないよう、この種類の整形関数自体を Blank 対応にする。
        format: (v) => fxFormatValue(v),
        copyOnAssign: true,
        step(n, s, api) {
          if (n.internalSwitch) {
            // R30-N34: Switch の比較値はエンジンが合成した一時変数であり、
            // 学習者の変数空間（s.vars＝最終状態として表示される）には
            // 入れない。合成代入ノード（internalSwitch）であることを
            // 出所として、専用の内部ストア switchTemps に行番号キーで
            // 保持する。読み出し側（read）は、このストアに実在する
            // 合成変数だけを解決するので、学習者が自分で書いた
            // __switch_N と同名の変数は s.vars 側に残り、最終状態にも
            // 従来どおり表示される。
            s.switchTemps ??= {};
            const tempKey = n.target.name.slice("__switch_".length);
            s.switchTemps[tempKey] = api.read(n.value, s);
            api.note(s, n, "Switchの比較値を一度評価します：" + fxFormatValue(s.switchTemps[tempKey]));
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
            // R30-N34: lowerBehavior が Switch 比較用に合成した一時変数
            // （__switch_<行>）の参照は、step が内部ストア switchTemps へ
            // 格納した値で解決する。ストアに無い同名の名前は合成変数では
            // ない（学習者の変数）ので、通常の解決へ fall through する。
            const switchTemp = /^__switch_(\d+)$/.exec(a.name);
            if (
              switchTemp &&
              s.switchTemps &&
              Object.hasOwn(s.switchTemps, switchTemp[1])
            )
              return { handled: true, value: s.switchTemps[switchTemp[1]] };
            let lower = a.name.toLowerCase();
            // Power Fx identifiers and literals are case-insensitive in
            // this model (see syntax.caseSensitive): True / False in any
            // casing are the Boolean literals.
            if (lower === "true") return { handled: true, value: true };
            if (lower === "false") return { handled: true, value: false };
            // RA-57: NotificationType は Notify の第2引数で使う列挙で、
            // NotificationType.Success のようなメンバー参照で値を得る。
            if (lower === "notificationtype")
              return {
                handled: true,
                value: {
                  Information: "Information",
                  Success: "Success",
                  Warning: "Warning",
                  Error: "Error",
                },
              };
            // R7-111（バッチ13）: コンテキスト変数（現在の画面）と
            // グローバル変数は別スコープで、同名ではコンテキストが
            // 優先する（実 Power Fx の規則）。レコードスコープ内は
            // 行の列が優先するため、この解決は行の外でのみ行う。
            if (s.record === undefined) {
              let ctx = s.model.screens?.[s.model.screen]?.context;
              let ctxKey = ctx ? ciKey(ctx, a.name) : undefined;
              if (ctxKey !== undefined)
                return { handled: true, value: ctx[ctxKey] };
            }
            let key = Object.keys(s.vars).find(
              (k) => k.toLowerCase() === a.name.toLowerCase(),
            );
            if (key !== undefined) return { handled: true, value: s.vars[key] };
            let screenKey = ciKey(s.model.screens || {}, a.name);
            if (screenKey !== undefined)
              return { handled: true, value: { screen: screenKey } };
            if (lower === "thisrecord") {
              // RG-16: ThisRecord only exists inside a record scope
              // (ForAll / Filter / Sum / LookUp formulas). At the top level
              // it must stop by name instead of silently storing an
              // "unset" value.
              if (s.record !== undefined)
                return { handled: true, value: s.record };
              api.fail(
                "ThisRecord はレコードスコープ（ForAll / Filter / Sum / LookUp の数式内）でのみ使えます",
                a,
              );
            }
          }
          if (a.k === "member") {
            // 同根の表面: メンバー名（Input1.text、ThisRecord.VALUE 等）も
            // 識別子として大文字小文字を区別しない。完全一致がある場合は
            // 共有コアの処理に任せ、大小だけ違う場合のみここで解決する。
            let x;
            try {
              x = api.read(a.target, s);
            } catch {
              return null;
            }
            // D-2: Blank レコードの全フィールドも Blank（Microsoft Learn
            // AsType/IsType）。LookUp の不一致結果や Blank() へのドット
            // 参照はエラーでなく Blank を返す。共有コアの「空のオブジェ
            // クトは参照できません」に落とさない。
            if (x === null) return { handled: true, value: null };
            if (isUnknown(x) || typeof x !== "object") return null;
            if (Object.hasOwn(x, a.name)) return null;
            let memberKey = ciKey(x, a.name);
            if (memberKey !== undefined)
              return { handled: true, value: x[memberKey] };
          }
          return null;
        },
        truth(v, line) {
          // RG-75（R20-N5）: 条件位置のテキスト変換は fxTruth に統一する。
          return fxTruth(v, line);
        },
        binary(op, a, b, node, s, api) {
          // R7-216（バッチ13）: lowerBehavior が印付けた Switch の比較は、
          // 比較値と一致値の型が異なれば型エラーで停止する（型違いを
          // 不一致として既定分岐へ落とさない）。
          if (op === "=" && node?.fxSwitchCompare)
            checkSwitchType(a, b, node, api);
          // RG-07（統合）: Power Fx の in／exactin を評価する。
          // 文字列では部分文字列（含む側・含まれる側とも文字列のとき）、
          // テーブルでは要素の包含を判定する。in はテキスト比較で大文字小文字を
          // 区別せず、exactin は区別する（Microsoft 公式ドキュメント準拠）。
          if (op === "in" || op === "exactin") {
            if (isUnknown(a) || isUnknown(b))
              return isUnknown(a) ? a : b;
            const fold = (v) =>
              op === "in" && typeof v === "string" ? v.toLowerCase() : v;
            if (typeof a === "string" && typeof b === "string")
              return fold(b).includes(fold(a));
            if (Array.isArray(b)) {
              const hit = (row) => {
                if (row !== null && typeof row === "object" && !Array.isArray(row)) {
                  if (a !== null && typeof a === "object" && !Array.isArray(a))
                    return Object.entries(a).every(
                      ([k, v]) => fold(row[k]) === fold(v),
                    );
                  const keys = Object.keys(row);
                  return keys.length === 1 && fold(row[keys[0]]) === fold(a);
                }
                return fold(row) === fold(a);
              };
              return b.some(hit);
            }
            api.fail(
              `${op} の右辺は文字列またはテーブルである必要があります`,
              node,
            );
          }
          if (op === "=")
            return isUnknown(a) || isUnknown(b)
              ? baseBinary(op, a, b)
              : fxEqual(a, b);
          if (op === "<>")
            return isUnknown(a) || isUnknown(b)
              ? baseBinary(op, a, b)
              : !fxEqual(a, b);
          if (op === "&")
            return isUnknown(a) || isUnknown(b)
              ? baseBinary(op, a, b, "fx")
              : fxTextOf(a) + fxTextOf(b);
          if (a === null) a = 0;
          if (b === null) b = 0;
          // RG-02: in Power Fx, division (or remainder) by zero is an
          // error value, never Infinity / NaN. Stop explicitly so the
          // trace, Notify output and final state cannot disagree, and a
          // string such as "Infinity" is never stored by Set.
          if (
            (op === "/" || op === "%") &&
            typeof a === "number" &&
            b === 0
          )
            api.fail(
              "0 で割ることはできません（Power Fx ではエラー値になります）",
              node,
            );
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
          // RG-16: argument-count validation. The shared parser drops a
          // trailing empty argument, so Set(x, ) arrives here with one
          // argument and Notify() with none; both must stop as formula
          // errors instead of silently running (Set previously erased an
          // existing value to Blank, Notify printed "null").
          const arity = {
            blank: [0, 0],
            isblank: [1, 1],
            not: [1, 1],
            // RA-53: And／Or は Learn の書式どおり第2引数が必須（最低2引数）。
            and: [2, Infinity],
            or: [2, Infinity],
            if: [2, Infinity],
            // R7-220（バッチ13）: Switch の最小は3個（Value＋Match＋
            // Result）に是正（Learn 構文では組が必須。2個形の Default
            // 解釈は一次情報と矛盾した旧解釈）。
            switch: [3, Infinity],
            set: [2, 2],
            updatecontext: [1, 1],
            table: [0, Infinity],
            sequence: [1, 3],
            forall: [2, 2],
            countrows: [1, 1],
            // RA-55: Sum はテーブル形と数値可変長形の両方を受ける。
            sum: [1, Infinity],
            // RA-54: Filter は複数の条件式を受け、And で結合する。
            filter: [2, Infinity],
            lookup: [2, 3],
            clear: [1, 1],
            collect: [2, Infinity],
            clearcollect: [2, Infinity],
            defaults: [1, 1],
            // RA-56: Patch は複数の変更レコードを受け、統合して適用する。
            patch: [3, Infinity],
            navigate: [1, 1],
            reset: [1, 1],
            // RA-57: Notify は NotificationType／Timeout を任意で受ける。
            notify: [1, 3],
            text: [1, 3],
            // RA-58: Value は言語タグを任意で受ける。
            value: [1, 2],
          };
          if (arity[fn]) {
            let [min, max] = arity[fn];
            if (args.length < min || args.length > max)
              api.fail(
                `${name} の引数の数が正しくありません（${min === max ? min + " 個" : max === Infinity ? min + " 個以上" : min + "〜" + max + " 個"}が必要です。空の引数は書けません）`,
                node,
              );
          }
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
            // R7-214（バッチ13）: テーブルのスキーマは全行の列の和集合で、
            // ある行に無い列はその行では Blank になる（未定義名エラーに
            // しない）。R7-215: テーブル値そのものが行になる場合は
            // Value 列のレコードとして扱う。
            let union = [];
            for (let rec of table)
              if (rec && typeof rec === "object" && !Array.isArray(rec))
                for (let k of Object.keys(rec))
                  if (!union.includes(k)) union.push(k);
            let ctxOverlay =
              s.model.screens?.[s.model.screen]?.context || {};
            return table.map((record, i) => {
              let previous = s.vars,
                old = s.record;
              let scoped = Array.isArray(record)
                ? { Value: record }
                : record && typeof record === "object"
                  ? {
                      ...Object.fromEntries(union.map((k) => [k, null])),
                      ...record,
                    }
                  : record;
              s.record = scoped;
              s.vars = {
                ...previous,
                ...ctxOverlay,
                ...(scoped && typeof scoped === "object" ? scoped : {}),
                ThisRecord: scoped,
              };
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
            // RG-50 (R16-N7): the function forms And / Or / Not are part
            // of Power Fx, and function names are case-insensitive, so
            // Not(false), And(...), Or(...) in any casing must work here
            // (the lower-case operator keywords are handled by the
            // parser; a capitalised call reaches this switch instead).
            case "not": {
              let v = get(0);
              return isUnknown(v) ? v : !fxTruth(v, node.line);
            }
            case "and": {
              // R7-64（バッチ13）: 関数形 And は短絡評価する。偽が確定した
              // 時点で残りの引数は評価しない（And(false, 1/0=0) が
              // ゼロ除算で停止しない。SDK 実測どおり）。
              for (let i = 0; i < args.length; i++) {
                let v = get(i);
                if (isUnknown(v)) return v;
                if (!fxTruth(v, node.line)) return false;
              }
              return true;
            }
            case "or": {
              // R7-64（バッチ13）: 関数形 Or も短絡評価する（真で確定）。
              for (let i = 0; i < args.length; i++) {
                let v = get(i);
                if (isUnknown(v)) return v;
                if (fxTruth(v, node.line)) return true;
              }
              return false;
            }
            case "if": {
              for (let i = 0; i + 1 < args.length; i += 2) {
                let cond = get(i);
                if (isUnknown(cond))
                  api.fail(
                    "値の式に含まれる未確定Ifは、Setの直下または動作数式として記述してください",
                    node,
                  );
                if (fxTruth(cond, node.line)) return get(i + 1);
              }
              return args.length % 2 ? get(args.length - 1) : null;
            }
            case "switch": {
              let value = get(0);
              if (isUnknown(value))
                api.fail("未確定Switchは動作数式として記述してください", node);
              for (let i = 1; i + 1 < args.length; i += 2) {
                // R7-216（バッチ13）: 一致値の型が比較値と異なれば型エラー。
                let match = get(i);
                checkSwitchType(value, match, node, api);
                if (fxEqual(value, match)) return get(i + 1);
              }
              return args.length % 2 === 0 ? get(args.length - 1) : null;
            }
            case "set": {
              let n = key(0),
                v = get(1);
              if (
                ciKey(s.model.controls, n) !== undefined ||
                ciKey(s.model.collections, n) !== undefined
              )
                api.fail(
                  "コントロール／コレクションと同じ変数名は使えません",
                  node,
                );
              // NX-N3: 既存変数と大小だけ違う名前は同一変数として既存
              // キーを更新する（別エントリを作らない）。
              let varKey = ciKey(s.model.variables, n) ?? n;
              ciDropDuplicates(s.vars, varKey, n);
              ciDropDuplicates(s.model.variables, varKey, n);
              s.vars[varKey] = structuredClone(v);
              s.model.variables[varKey] = s.vars[varKey];
              recalc(s, api);
              api.note(
                s,
                node,
                `${varKey} に ${fxFormatValue(v)} を設定し、表示数式を再計算します`,
              );
              return null;
            }
            case "updatecontext": {
              let fields = get(0);
              // RG-10 追加表面（R21-N17）: 現在の画面がモデルに無い場合は
              // 生の TypeError ではなく、画面名を挙げて日本語で停止する
              // （Navigate 側のガードと同水準に揃える）。
              const screen = s.model.screens[s.model.screen];
              if (!screen)
                api.fail(
                  `現在の画面『${s.model.screen}』がモデルにありません`,
                  node,
                );
              screen.context ??= {};
              // NX-N15: コンテキスト変数も大小不区別の同一性で既存キー
              // を更新する（別項目を作らない）。s.vars 側も同じキーに
              // 寄せ、読み戻しが旧値にならないようにする。
              if (fields && typeof fields === "object") {
                for (let [fieldName, fieldValue] of Object.entries(fields)) {
                  let ctxKey = ciKey(screen.context, fieldName) ?? fieldName;
                  screen.context[ctxKey] = fieldValue;
                  ciDropDuplicates(s.vars, ctxKey, fieldName);
                  s.vars[ctxKey] = fieldValue;
                }
              } else {
                Object.assign(screen.context, fields);
                Object.assign(s.vars, fields);
              }
              recalc(s, api);
              return null;
            }
            case "table": {
              // R7-63（バッチ13）: テーブル引数は行として展開し、スカラーは
              // レコードとして受理しない（型エラー）。R7-214: 列は全行の
              // 和集合に揃え、欠けたセルは Blank（null）にする。
              let outRows = [];
              for (let i = 0; i < args.length; i++) {
                let v = get(i);
                if (Array.isArray(v)) outRows.push(...v);
                else if (v !== null && typeof v === "object")
                  outRows.push(v);
                else
                  api.fail(
                    "Table の引数はレコードまたはテーブルで指定してください",
                    node,
                  );
              }
              let keys = [];
              for (let row of outRows)
                if (row && typeof row === "object" && !Array.isArray(row))
                  for (let k of Object.keys(row))
                    if (!keys.includes(k)) keys.push(k);
              return outRows.map((row) => {
                if (!row || typeof row !== "object" || Array.isArray(row))
                  return row;
                let normalized = {};
                for (let k of keys)
                  normalized[k] = Object.hasOwn(row, k) ? row[k] : null;
                return normalized;
              });
            }
            case "sequence": {
              // R31-N11: 件数（Records）は Microsoft Learn の規則どおり
              // 最も近い整数へ切り捨てて受理する（Sequence(0.9) は0件＝
              // 空表、Sequence(2.9) は2件）。範囲は 0〜50,000 が Learn の
              // 規定だが、このモデルでは上限1,000件とし、項目の caution
              // で開示する。不正（数値でない・負数）と上限超過は文言を
              // 分け、上限超過では上限値を正直に示す。Start／Step は
              // Learn に切り捨て・丸めの規定がなく、小数の Step（0.5）の
              // 例もあるため、従来どおり値をそのまま使う。
              // R7-65（バッチ13）: テーブル／レコード／真偽値を件数として
              // 暗黙変換しない（Sequence(Table()) が空表を返す等を防ぐ）。
              for (let i = 0; i < args.length; i++) {
                let av = get(i);
                if (
                  !isUnknown(av) &&
                  (Array.isArray(av) ||
                    (av !== null && typeof av === "object") ||
                    typeof av === "boolean")
                )
                  api.fail(
                    "Sequenceの引数は数値で指定してください（テーブルやレコード、真偽値は使えません）",
                    node,
                  );
              }
              let raw = Number(get(0)),
                start = args[1] ? Number(get(1)) : 1,
                step = args[2] ? Number(get(2)) : 1;
              if (Number.isNaN(raw))
                api.fail(
                  "Sequenceの行数が不正です（0以上の数で指定してください）",
                  node,
                );
              let n = Math.floor(raw);
              if (n < 0)
                api.fail(
                  "Sequenceの行数が不正です（0以上の数で指定してください）",
                  node,
                );
              if (n > 1000)
                api.fail(
                  "Sequenceの行数が上限（1,000件）を超えています",
                  node,
                );
              return Array.from({ length: n }, (_, i) => ({
                Value: start + i * step,
              }));
            }
            case "forall": {
              let result = rowEval(get(0), args[1]);
              return result
                .filter((v) => v !== null)
                .map((v) =>
                  // R7-215（バッチ13）: 結果がテーブル（配列）の行は裸の
                  // 配列でなく Value 列のレコードにする（次の行スコープで
                  // Value として参照できる）。
                  Array.isArray(v)
                    ? { Value: v }
                    : typeof v === "object"
                      ? v
                      : { Value: v },
                );
            }
            case "countrows": {
              // D-4: テーブルでない引数は、他のテーブル関数（Sum／Filter／
              // ForAll の rowEval ガード）と揃えて「テーブルが必要です」で
              // 止める。ガードが無いと null.length のホスト例外が汎用文に
              //化けて、真因（テーブルでないこと）が伝わらない。
              let table = get(0);
              if (!Array.isArray(table)) api.fail("テーブルが必要です", node);
              return table.length;
            }
            case "sum": {
              // RA-55: テーブル形 Sum(Table, Formula) と、数値可変長形
              // Sum(NumericalFormula1, ...) の両方に対応する。第1引数が
              // テーブルならテーブル形、Blank ならテーブル形の誤りとして
              // 「テーブルが必要です」で止める（Sum(Blank(), Value) の
              // 従来どおり）。それ以外は数値形として全引数を合計する。
              let first = get(0);
              if (Array.isArray(first)) {
                if (args.length !== 2)
                  api.fail(
                    "Sum のテーブル形式は引数が2個必要です（テーブルと集計式）",
                    node,
                  );
                // R7-115（バッチ13）: Blank の値は合計に数えない（0 として
                // 加算しない）。非 Blank が1つも無ければ結果は Blank で
                // あって 0 ではない（SDK 実測: IsBlank(Sum(...)) は true）。
                let values = rowEval(first, args[1]),
                  unk = values.find(isUnknown);
                if (unk !== undefined) return unk;
                let seen = false,
                  total = 0;
                for (let b of values) {
                  // PFX-D1（高度A2監査）: Learn（function-aggregates）の
                  // 規則どおり、数値でない値（文字列・レコード等）は変換
                  // せず無視する。Number() で強制変換すると "text" が
                  // NaN になり合計全体が NaN 化していた。Blank も数え
                  // ないため、数値が1つも無ければ結果は Blank。
                  if (typeof b !== "number") continue;
                  seen = true;
                  total += b;
                }
                return seen ? total : null;
              }
              if (first === null && args.length >= 2) {
                // Blank が第1引数の2引数形は、テーブル形の誤り
                // （Sum(Blank(), Value)）か、Blank を0として扱う数値形
                // （Sum(Blank(), 5)）か、残りの引数が現在の範囲で数値に
                // 評価できるかで判別する。列参照のように評価できない
                // 場合はテーブル形とみなし「テーブルが必要です」で止める。
                let rest = [];
                let restOk = true;
                for (let i = 1; i < args.length; i++) {
                  try {
                    rest.push(get(i));
                  } catch {
                    restOk = false;
                    break;
                  }
                }
                if (
                  !restOk ||
                  rest.some((v) => v !== null && typeof v !== "number")
                )
                  api.fail("テーブルが必要です", node);
                // R7-115: 数値形でも Blank だけなら結果は Blank。
                return rest.every((v) => v === null)
                  ? null
                  : rest.reduce((a, b) => a + Number(b ?? 0), 0);
              }
              let total = 0,
                seenNum = false;
              for (let i = 0; i < args.length; i++) {
                let v = i === 0 ? first : get(i);
                if (isUnknown(v)) return v;
                // PFX-D1（高度A2監査）: テーブル形と揃え、Learn
                // （function-aggregates）の規則どおり数値でない引数は
                // 変換せず無視する（Blank も数えない）。数値が1つも
                // 無ければ結果は Blank。
                if (typeof v !== "number") continue;
                seenNum = true;
                total += v;
              }
              return seenNum ? total : null;
            }
            case "filter":
            case "lookup": {
              let table = get(0);
              // RA-54: Filter は複数の条件式を And で結合する。
              if (fn === "filter" && args.length > 2) {
                let condLists = args
                  .slice(1)
                  .map((formula) => rowEval(table, formula));
                if (condLists.some((list) => list.some(isUnknown)))
                  api.fail("未確定のFilter / LookUp条件は未対応です", node);
                // R7-48（バッチ13）: 条件の真偽は fxTruth に統一する
                // （テキスト "false" を真として行を採用しない）。
                return table.filter((_, i) =>
                  condLists.every((list) => fxTruth(list[i], node.line)),
                );
              }
              let results = rowEval(table, args[1]);
              if (results.some(isUnknown))
                api.fail("未確定のFilter / LookUp条件は未対応です", node);
              let selected = table.filter((_, i) =>
                fxTruth(results[i], node.line),
              );
              if (fn === "filter") return selected;
              let found = selected[0] ?? null;
              // RG-18: LookUp's third argument (the reduction formula)
              // is evaluated in the found record's scope and its value
              // is returned, instead of being silently ignored and
              // returning the whole record.
              if (found === null || !args[2]) return found;
              let previous = s.vars,
                old = s.record;
              s.record = found;
              s.vars = {
                ...previous,
                ...(typeof found === "object" ? found : {}),
                ThisRecord: found,
              };
              try {
                api.check();
                return api.read(args[2], s);
              } finally {
                s.vars = previous;
                s.record = old;
              }
            }
            case "clear":
            case "clearcollect":
            case "collect": {
              let n = key(0);
              if (ciKey(s.model.dataSources, n) !== undefined)
                api.fail(
                  "このモデルのCollect / Clearはコレクションだけに対応します",
                  node,
                );
              // NX-N4: コレクションも大小不区別の同一性で既存キーを
              // 対象にする。Collect の追記先・ClearCollect の置き換え先・
              // Clear の消去先はすべて既存キーへ寄せる。
              let colKey = ciKey(s.model.collections, n) ?? n;
              let old = s.model.collections[colKey] || [];
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
              ciDropDuplicates(s.model.collections, colKey, n);
              s.model.collections[colKey] = old;
              ciDropDuplicates(s.vars, colKey, n);
              s.vars[colKey] = old;
              recalc(s, api);
              api.note(s, node, `${colKey} のレコード数は ${old.length} です`);
              return fn === "clear" ? null : old;
            }
            case "defaults": {
              let n = key(0),
                defKey = ciKey(s.model.defaults, n) ?? n;
              return {
                ...structuredClone(s.model.defaults[defKey] || {}),
                __defaultSource: defKey,
              };
            }
            case "patch": {
              let n = key(0),
                base = get(1),
                // RA-56: 変更レコードは複数渡せ、後ろが優先で統合される。
                changes = {},
                // 同根の表面: データソース名も大小不区別に解決する。
                // Defaults 側の __defaultSource との照合も大小不区別。
                dsKey = ciKey(s.model.dataSources, n),
                table = dsKey !== undefined ? s.model.dataSources[dsKey] : undefined;
              if (!Array.isArray(table))
                api.fail("モデルにデータソースがありません：" + n, node);
              for (let i = 2; i < args.length; i++) {
                let part = get(i);
                if (!part || typeof part !== "object" || Array.isArray(part))
                  api.fail(
                    "Patch の変更レコードはレコードで指定してください",
                    node,
                  );
                Object.assign(changes, part);
              }
              let isDefault =
                typeof base?.__defaultSource === "string" &&
                base.__defaultSource.toLowerCase() === n.toLowerCase();
              let result;
              if (isDefault) {
                result = { ...base, ...changes };
                delete result.__defaultSource;
                table.push(result);
              } else {
                let index = table.indexOf(base);
                if (index < 0) {
                  // R7-113（バッチ13）: Set 等で変数へ保存されたレコードは
                  // 複製されるため参照同一性では見つからない。保存前の
                  // レコードと全項目が一致する行を対象として認識する。
                  let baseKeys =
                    base && typeof base === "object"
                      ? Object.keys(base).filter(
                          (k) => k !== "__defaultSource",
                        )
                      : [];
                  if (baseKeys.length)
                    index = table.findIndex(
                      (row) =>
                        row &&
                        typeof row === "object" &&
                        baseKeys.every(
                          (k) =>
                            JSON.stringify(row[k]) ===
                            JSON.stringify(base[k]),
                        ),
                    );
                }
                if (index < 0)
                  api.fail("更新するレコードがデータソースにありません", node);
                result = Object.assign(table[index], changes);
              }
              api.note(
                s,
                node,
                `${dsKey} のレコードを${isDefault ? "追加" : "更新"}します`,
              );
              recalc(s, api);
              return result;
            }
            case "navigate": {
              let screen = get(0)?.screen;
              if (!s.model.screens[screen])
                api.fail("モデルに画面がありません", node);
              // R7-111（バッチ13）: 旧画面のコンテキスト変数を s.vars から
              // 外す際、同名のグローバル変数／コレクション等があれば
              // その値へ戻す（コンテキストと同名のグローバルを遷移で
              // 消さない）。
              let oldContext = s.model.screens[s.model.screen]?.context || {};
              for (let k of Object.keys(oldContext)) {
                let flatKey = ciKey(s.vars, k) ?? k,
                  restored =
                    (ciKey(s.model.variables, k) !== undefined
                      ? s.model.variables[ciKey(s.model.variables, k)]
                      : undefined) ??
                    (ciKey(s.model.collections, k) !== undefined
                      ? s.model.collections[ciKey(s.model.collections, k)]
                      : undefined) ??
                    (ciKey(s.model.dataSources, k) !== undefined
                      ? s.model.dataSources[ciKey(s.model.dataSources, k)]
                      : undefined) ??
                    (ciKey(s.model.controls, k) !== undefined
                      ? s.model.controls[ciKey(s.model.controls, k)]
                      : undefined);
                if (restored === undefined) delete s.vars[flatKey];
                else s.vars[flatKey] = restored;
              }
              s.model.screen = screen;
              Object.assign(s.vars, s.model.screens[screen].context || {});
              api.note(s, node, "画面を " + screen + " に切り替えます");
              // R7-112（バッチ13）: 遷移後は新しい画面のスコープで表示
              // 数式を再計算する（旧画面の値を残さない）。
              recalc(s, api);
              return true;
            }
            case "reset": {
              let n = key(0),
                controlKey = ciKey(s.model.controls, n),
                control =
                  controlKey !== undefined
                    ? s.model.controls[controlKey]
                    : undefined;
              if (!control) api.fail("モデルにコントロールがありません", node);
              control.Text = Object.hasOwn(control, "Default")
                ? control.Default
                : unknown("コントロールのDefault");
              recalc(s, api);
              return null;
            }
            case "notify": {
              // RA-57: 第2引数 NotificationType（既定 Information）と
              // 第3引数 Timeout（既定10秒）を受ける。種類と表示時間は
              // このモデルでは出力テキストに反映しない（項目の注意書き
              // で開示）が、値の妥当性は検証し、違う種類を名指しで止める。
              let message = get(0);
              if (args.length >= 2) {
                let type = get(1);
                if (
                  !isUnknown(type) &&
                  !["information", "success", "warning", "error"].includes(
                    String(type).toLowerCase(),
                  )
                )
                  api.fail(
                    "Notify の NotificationType が正しくありません：" +
                      fxFormatValue(type),
                    node,
                  );
              }
              if (args.length >= 3) {
                let timeout = get(2);
                if (
                  !isUnknown(timeout) &&
                  (typeof timeout !== "number" || timeout < 0)
                )
                  api.fail(
                    "Notify の Timeout は0以上の数値で指定してください",
                    node,
                  );
              }
              s.outputs.push({
                channel: "Notify",
                // R24-N35：通知文は値→文字列変換の共通経路 fxFormatValue を
                // 通す（Blank は "null" でなく空文になる）。
                text: fxFormatValue(message),
                line: node.line,
              });
              return true;
            }
            case "text": {
              let v = get(0);
              if (isUnknown(v)) return v;
              // R7-65（バッチ13）: テーブルを文字列へ暗黙変換しない
              // （Text(Table()) が "[]" になる等を防ぐ型エラー）。
              // レコードの Text() は RG-18 で確定した人間可読表示の
              // 仕様があるため対象外（書式付きは従来どおり数値のみ）。
              if (Array.isArray(v))
                api.fail(
                  "Text：テーブルは文字列に変換できません（型が一致しません）",
                  node,
                );
              // RG-15: the optional format argument is honoured for
              // numbers (see fxFormatNumber) instead of being accepted
              // and silently discarded. Formats outside the supported
              // numeric subset stop inside fxFormatNumber, naming the
              // format argument.
              if (args.length >= 2) {
                let format = get(1);
                if (typeof format !== "string")
                  api.fail("Text の書式は文字列で指定してください", node);
                if (args.length >= 3) {
                  let tag = get(2);
                  if (typeof tag !== "string")
                    api.fail(
                      "Text の結果言語タグは文字列で指定してください",
                      node,
                    );
                  if (tag.toLowerCase() !== "en-us")
                    api.fail(
                      "Text の結果言語タグは未対応です（このモデルは en-US のみ対応）：" +
                        tag,
                      node,
                    );
                }
                // R7-116（バッチ13）: Blank 入力でも書式処理を行う
                // （SDK 実測: Text(Blank(),"0") は "0"、"0.00" は "0.00"。
                // Blank を 0 として整形する）。
                if (v !== null && typeof v !== "number")
                  api.fail(
                    "Text の書式指定はこのモデルでは数値に対してのみ対応しています",
                    node,
                  );
                return fxFormatNumber(v ?? 0, format, (m) =>
                  api.fail(m, node),
                );
              }
              return v === null ? "" : fxTextOf(v);
            }
            case "value": {
              let v = get(0);
              if (isUnknown(v)) return v;
              // RA-58: 第2引数の言語タグを受ける（Text と揃え、en-US
              // のみ対応し、それ以外は名前を挙げて停止する）。
              if (args.length >= 2) {
                let tag = get(1);
                if (typeof tag !== "string")
                  api.fail(
                    "Value の言語タグは文字列で指定してください",
                    node,
                  );
                if (tag.toLowerCase() !== "en-us")
                  api.fail(
                    "Value の言語タグは未対応です（このモデルは en-US のみ対応）：" +
                      tag,
                    node,
                  );
              }
              // D-3: 入力が Blank または空文字列なら Blank を返す
              // （変換エラーにしない）。
              if (v === null) return null;
              if (typeof v === "number") return v;
              if (typeof v === "string" && v.trim() === "") return null;
              // R7-49（バッチ13）: Microsoft Learn／SDK 実測（en-US）で
              // 変換できる指数表記（"1e3"→1000）と百分率（"10%"→0.1）を
              // 実装する。「変換できません」と断定する虚偽の文言で、
              // 変換可能な入力を止めない。
              if (typeof v !== "string")
                api.fail("Value：数値へ変換できません", node);
              let text = v.trim(),
                percent = text.endsWith("%"),
                numericPart = percent ? text.slice(0, -1).trim() : text;
              if (
                !/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(
                  numericPart,
                )
              )
                api.fail("Value：数値へ変換できません", node);
              return percent ? Number(numericPart) / 100 : Number(numericPart);
            }
            default: {
              // 高度モード（ブロックB2）委譲: 基礎で扱えない関数は、高度
              // 意味論が有効化されている場合に限り、高度側ハンドラが登録
              // されていればそちらへ委譲する（R-2 の最低限の配線としての
              // 委譲可否チェックのみ。モード判定はここに書かない）。未適用
              // 時、および登録が無い関数（未対応・未検証）は従来どおり
              // 名前を挙げて停止する。基礎の各ケースには一切触れない。
              const advanced = advancedState.enabled
                ? advancedFunctions[fn]
                : undefined;
              if (advanced)
                return advanced({
                  name,
                  fn,
                  args,
                  get,
                  key,
                  node,
                  api,
                  s,
                  rowEval,
                  recalc,
                  ciKey,
                  ciDropDuplicates,
                  fxTruth,
                  textOf: fxTextOf,
                });
              api.fail(
                "このPower Fx関数は説明に対応していません：" + name,
                node,
              );
            }
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
      const result = executeProgram(nodes, model, semantics, limits);
      // R30-N34: 内部ストア switchTemps は実行中だけの保持場所であり、
      // 結果（最終状態）には含めない。s.vars へは最初から入れていない
      // ため、学習者の同名変数がここで消えることはない。
      // R31 横断スイープ(c)：bindings 数式など実行中に解析される式が
      // 途中終了していた場合のエラー（パスエラー・全体エラーとも）に
      // <eof> を出さない。
      if (result.error?.message?.includes("<eof>"))
        result.error.message = "式を解釈できません（式が途中で終わっています）";
      for (const p of result.paths || []) {
        delete p.switchTemps;
        if (p.error?.message?.includes("<eof>"))
          p.error.message = "式を解釈できません（式が途中で終わっています）";
      }
      return result;
    } catch (e) {
      // P-N3 受け皿：解析・後処理（groups 整形など executeProgram の
      // 内部 catch の外側）から漏れたホスト例外は、生文言のまま返さず
      // 学習者向け文言へ変換する（PracticeError はそのまま通る）。
      return sourceFailure(sanitizeFxEof(toLearnerError(e)));
    }
  },
};

definition.templates.push(...additionalTemplates(definition.model.defaults));

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
