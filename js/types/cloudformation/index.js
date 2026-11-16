import { additionalTemplates } from "./additional-templates.js";
import { load, JSON_SCHEMA } from "../../vendor/yaml.js";
import { parseJsonLocated, sourceFailure, rows } from "../../core/data.js";
import { PracticeError, charLabel, toLearnerError } from "../../core/script.js";
import { LIMITS, unknown, formatValue, isUnknown } from "../../core/contract.js";
import { normalize, definition as pythonDefinition } from "../python/index.js";
const identity = `def handler(event, context):
    fragment = event["fragment"]
    fragment["Metadata"] = {"Stage": event["params"].get("Stage", "dev")}
    return {"requestId": event["requestId"], "status": "success", "fragment": fragment}`;
const ref = rows([
  [
    "Transform",
    "テンプレート",
    "Transform: [MacroA, MacroB]",
    "テンプレート全体（Transform節を除く）を記載順に変換します。",
    "Transform: AddMetadata",
    "実AWSのマクロ定義はモデルのmacrosと別である。",
  ],
  [
    "Fn::Transform",
    "テンプレート",
    "Fn::Transform: {Name: 名前, Parameters: {...}}",
    "同階層の兄弟とその子をfragmentとして渡します（Fn::Transform自身はfragmentに含まれません）。",
    '{"Fn::Transform":{"Name":"AddMetadata","Parameters":{"Stage":"test"}}}',
    "Parametersは事前評価されずに渡される。",
  ],
  [
    "fragment",
    "ハンドラ",
    'event["fragment"]',
    "変換対象のテンプレート断片です。トップレベルTransformではTransform節を除くテンプレート全体、Fn::Transformでは同階層の兄弟範囲（Fn::Transform自身を除く）が断片になります。",
    'fragment = event["fragment"]',
    "応答のfragmentはオブジェクト（テンプレート断片）で返す必要がある。数値・文字列・配列・nullなどのオブジェクトでないfragmentは検証で停止する。",
  ],
  [
    "params",
    "ハンドラ",
    'event["params"]',
    "Fn::Transformで指定したマクロパラメータです。トップレベルTransformのマクロでは空が渡されます。",
    'event["params"].get("Stage", "dev")',
    "カスタムLambdaマクロのトップレベルTransformではparamsは空である。Parametersを受け取るFn::Transformと区別する。AWS::Include等の組込みTransformは専用仕様で、本モデルでは未対応である。",
  ],
  [
    "requestId",
    "ハンドラ",
    'event["requestId"]',
    "受け取ったIDと同じ値を返します。",
    '"requestId": event["requestId"]',
    "実際のIDを捏造しない。モデルで未指定なら未確定である。",
  ],
  [
    "status",
    "ハンドラ",
    '{"status": "success"}',
    "success（大文字小文字を区別しない）以外は失敗です。",
    '"status": "success"',
  ],
  [
    "region",
    "ハンドラ",
    'event["region"]',
    "マクロが実行される AWS リージョンです。",
    'event["region"]',
    "モデル既定は model-region である。実際のリージョン名は捏造しない。",
  ],
  [
    "accountId",
    "ハンドラ",
    'event["accountId"]',
    "マクロを実行する AWS アカウントの ID です。",
    'event["accountId"]',
    "モデル既定は model-account である。実際のアカウント ID は捏造しない。",
  ],
  [
    "transformId",
    "ハンドラ",
    'event["transformId"]',
    "呼び出されたマクロの名前（Transform で指定した名前）です。",
    'event["transformId"]',
    "モデルでマクロを呼ぶときは、呼び出し側のマクロ名で上書きされて渡される。",
  ],
  [
    "errorMessage",
    "ハンドラ",
    '{"errorMessage": "理由"}',
    "マクロが失敗したときに理由を示す応答フィールドです。",
    '"errorMessage": "変換できませんでした"',
    "status が success 以外のとき、失敗の理由として読み取られる。成功応答には不要である。",
  ],
  [
    "templateParameterValues",
    "ハンドラ",
    'event["templateParameterValues"]',
    "テンプレートパラメータの評価済み値です。",
    'event["templateParameterValues"]',
    "モデルにない実値は未確定である。",
  ],
]);
// RA-23／RA-24: ハンドラ系の使用例は項目ごとに、その項目のフィールドを
// 実際に読む例にする。以前は全項目が同一の成功ハンドラ（identity）で、
// errorMessage／region／accountId／transformId／templateParameterValues
// の例が対象フィールドを一度も使っていなかった。
const handlerExamples = {
  fragment: identity,
  params: identity,
  requestId: identity,
  status: identity,
  region: `def handler(event, context):
    fragment = event["fragment"]
    fragment["Metadata"] = {"Region": event["region"]}
    return {"requestId": event["requestId"], "status": "success", "fragment": fragment}`,
  accountId: `def handler(event, context):
    fragment = event["fragment"]
    fragment["Metadata"] = {"AccountId": event["accountId"]}
    return {"requestId": event["requestId"], "status": "success", "fragment": fragment}`,
  transformId: `def handler(event, context):
    fragment = event["fragment"]
    fragment["Metadata"] = {"TransformId": event["transformId"]}
    return {"requestId": event["requestId"], "status": "success", "fragment": fragment}`,
  templateParameterValues: `def handler(event, context):
    fragment = event["fragment"]
    fragment["Metadata"] = {"TemplateParameters": event["templateParameterValues"]}
    return {"requestId": event["requestId"], "status": "success", "fragment": fragment}`,
  // 失敗時は status を success 以外にして errorMessage で理由を返す。
  // 既定モデル（断片が空でない）では成功側を通り、使用例として実行できる。
  errorMessage: `def handler(event, context):
    fragment = event["fragment"]
    if not fragment:
        return {"requestId": event["requestId"], "status": "failure", "errorMessage": "断片が空です", "fragment": fragment}
    return {"requestId": event["requestId"], "status": "success", "fragment": fragment}`,
};
for (const r of ref) if (handlerExamples[r.name]) r.example = handlerExamples[r.name];
const pythonRefs = pythonDefinition.reference.filter(r => !ref.some(f => f.name === r.name)).map(r => ({
  ...r,
  example: 'def handler(event, context):\n' + r.example.split('\n').map(line => '    ' + line).join('\n') + '\n    return {"requestId":event["requestId"],"status":"success","fragment":event["fragment"]}',
}));
// RG-69（R19-N3）：ハンドラ判定が先頭行の # コメントに引きずられないよう、
// 空行と # コメント行を除いた最初の実質行を返す。
function firstCodeLine(code) {
  for (const line of code.split("\n")) {
    const t = line.trim();
    if (t === "" || t.startsWith("#")) continue;
    return line;
  }
  return "";
}
// R25-N4: 外側 catch のガード。バッチ3統合時裁定（台帳 RG-173 節）は、
// 到達するエラーがすべて著作者エラーである前提で現行維持としたが、
// 再帰 YAML エイリアス・モデル null・型違いマクロ等でホスト例外が
// 実測で到達したため、著作者エラーだけを素通ししホスト例外だけを
// 学習者向け文言へ変換する。
// 著作者エラーの識別（実コードの全 throw 経路の確認に基づく）:
//   (1) PracticeError（YAML／JSON／先頭文字等の検証が生成）
//   (2) category を持つもの（組込み Transform の「未対応」等）
//   (3) line を持つもの（未確認マクロ、Fn::Transform 指定不正、
//       ハンドラのレスポンス検証エラーの再送出はいずれも
//       Object.assign(Error, {line}) または {line, category} で作られる）
//   (4) line／category を持たない残り3経路（テンプレート非オブジェクト、
//       Transform 指定不正、変換の探索上限）は、いずれも plain Error
//       （name === "Error"）に日本語の名前入り文面で作られる。
// ホスト例外は RangeError／TypeError 等のサブクラスで文面は英語の
// 生文言であり、(1)〜(4) のいずれにも一致しないため判別できる。
// ゲッターが投げる任意エラー等も (1)〜(4) に一致しなければ変換される。
function isAuthorError(e) {
  if (e instanceof PracticeError) return true;
  if (e?.category != null) return true;
  if (typeof e?.line === "number") return true;
  if (
    e instanceof Error &&
    e.name === "Error" &&
    /[぀-ヿ一-鿿]/.test(e.message || "")
  )
    return true;
  return false;
}
const CIRCULAR_TEMPLATE_MESSAGE =
  "テンプレートに循環参照があります（YAMLエイリアスなどが自分自身を参照しています）。循環しない形に書き直してください";
// R7-217（修正バッチ13・fxb班）: fragment 内の JSON 変換不能値の走査。
// Python エンジンの toModel は集合だけを内部表現（{__set:[...]}）のまま
// 返すため、その形と、素の JS 数値として残る非有限数を検出する。循環は
// toModel 側で未確定表現に置き換わるが、念のため祖先集合でも守る。
// 戻り値は名指し用の表示（例：集合（set）、NaN、Infinity）。問題が
// 無ければ null。
function findNonJsonValue(v, ancestors = new Set()) {
  if (typeof v === "number") return Number.isFinite(v) ? null : String(v);
  if (!v || typeof v !== "object") return null;
  if (isUnknown(v)) return null;
  if (Array.isArray(v.__set)) return "集合（set）";
  if (ancestors.has(v)) return null;
  ancestors.add(v);
  for (const child of Object.values(v)) {
    const found = findNonJsonValue(child, ancestors);
    if (found) return found;
  }
  ancestors.delete(v);
  return null;
}
// R25-N4: js-yaml が作る循環オブジェクトグラフは、stripTransformKeys と
// nested() の両方が循環検出なしに再帰しスタックを尽くすため、走査に
// 入る前に反復走査（明示スタック）で循環だけを検出して原因を名指す。
// 祖先集合は現在の経路分だけを保持するので、循環でない共有エイリアス
// （同じアンカーを兄弟から参照する形）は誤検出しない。深さの上限は
// 設けない（有限の深い入れ子は従来どおり処理し、万一スタックが
// 尽きる場合は外側ガードが RangeError を日本語化する）。
function assertNoCircularTemplate(root) {
  if (!root || typeof root !== "object") return;
  const ancestors = new Set();
  const stack = [{ obj: root, values: null, index: 0, entered: false }];
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (!frame.entered) {
      frame.entered = true;
      if (ancestors.has(frame.obj))
        throw new PracticeError(CIRCULAR_TEMPLATE_MESSAGE, 1);
      ancestors.add(frame.obj);
      frame.values = Object.values(frame.obj);
    }
    if (frame.index >= frame.values.length) {
      ancestors.delete(frame.obj);
      stack.pop();
      continue;
    }
    const child = frame.values[frame.index++];
    if (child && typeof child === "object")
      stack.push({ obj: child, values: null, index: 0, entered: false });
  }
}
export const definition = {
  id: "cloudformation",
  name: "AWS CloudFormation Macros",
  extensions: [".yaml", ".yml", ".json", ".py", ".txt"],
  syntax: { name: "CloudFormation JSON / YAML・Python 3", caseSensitive: true },
  reference: [
    ...ref,
    ...pythonRefs,
  ],
  templates: [
    {
      id: "cfn-transform",
      title: "Transform · 断片にMetadataを追加",
      code: JSON.stringify(
        {
          Transform: "AddMetadata",
          Resources: { Bucket: { Type: "AWS::S3::Bucket" } },
        },
        null,
        2,
      ),
      intro:
        "Transformは記載順にモデルのマクロを適用します。入力と変換後の断片を比較できます。",
      refs: ["Transform", "fragment", "status"],
    },
    {
      id: "cfn-local",
      title: "Fn::Transform · 兄弟要素を変換",
      code: JSON.stringify(
        {
          Resources: {
            Bucket: {
              Type: "AWS::S3::Bucket",
              Properties: {
                "Fn::Transform": {
                  Name: "AddMetadata",
                  Parameters: { Stage: "test" },
                },
                BucketName: "practice-bucket",
              },
            },
          },
        },
        null,
        2,
      ),
      intro:
        "Fn::Transformは同じオブジェクト内の兄弟要素を渡します。パラメータは未評価で渡されます。",
      refs: ["Fn::Transform", "params", "fragment"],
    },
    {
      id: "cfn-handler",
      title: "Lambda · Pythonハンドラを書く",
      code: identity,
      intro:
        "eventのfragmentを変更し、同じrequestIdとsuccessを返します。AWSへの接続やデプロイは行いません。",
      refs: ["fragment", "params", "requestId", "status"],
    },
  ],
  glossary: [
    ["Transform", "CloudFormationテンプレートをマクロで変換する指示です。"],
    [
      "マクロ",
      "CloudFormationがテンプレートの処理中に呼び出し、断片を変換して返す仕組みです。実体はLambdaハンドラです。",
    ],
    [
      "断片（フラグメント）",
      "マクロが受け取り、変換して返すテンプレートの範囲です。トップレベルTransformではTransform節を除くテンプレート全体、Fn::Transformでは同階層の兄弟範囲（Fn::Transform自身を除く）が断片になります。",
    ],
    [
      "Lambdaハンドラ",
      "マクロのリクエストを受け、変換済み断片を返す関数です。",
    ],
    [
      "未確定（値）",
      "実行時に決まる値のことです。このアプリでは値を仮定して作らず、未確定のまま扱って、到達可能な分岐をすべて表示します。",
    ],
  ],
  model: {
    kind: "json",
    title: "入力断片・マクロ定義",
    hint: "handlerモードの入力はevent、テンプレートモードで呼ぶモデルマクロはmacrosに記載します。実際のAWSとは接続しません。",
    defaults: {
      event: {
        fragment: { Resources: { Bucket: { Type: "AWS::S3::Bucket" } } },
        params: { Stage: "test" },
        requestId: "model-request-1",
        region: "model-region",
        accountId: "model-account",
        transformId: "AddMetadata",
        templateParameterValues: {},
      },
      macros: { AddMetadata: identity },
    },
  },
  semantics: {
    description:
      "公式のevent / response形式、Transformの順序、Fn::Transformの兄弟スコープをモデル化します。Lambda本体はPython部分評価エンジンで解析します。",
    support:
      "AWS::Include / AWS::Serverless、デプロイ、IAM、外部サービス、YAML短縮タグは未対応。モデルにないマクロは未確認として停止します。",
    sources: [
      {
        title: "AWS公式 マクロのリクエスト・レスポンス",
        url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html",
      },
    ],
  },
  fileExtension(code) {
    return /^\s*(def |import |from )/.test(firstCodeLine(code))
      ? ".py"
      : code.trim().startsWith("{")
        ? ".json"
        : ".yaml";
  },
  scan(code) {
    if (/^\s*(def |import |from )/.test(firstCodeLine(code)))
      return ref.filter((r) => code.includes(r.name)).map((r) => r.name);
    try {
      let doc = load(code, { schema: JSON_SCHEMA });
      let names = [];
      function walk(x) {
        if (!x || typeof x !== "object") return;
        for (let [k, v] of Object.entries(x)) {
          if (ref.some((r) => r.name === k) && !names.includes(k))
            names.push(k);
          walk(v);
        }
      }
      walk(doc);
      return names;
    } catch {
      return [];
    }
  },
  async simulate(code, model) {
    try {
      // R32-F01B-N3／R32-PLAT-N1（修正バッチ11・fx班）: モデル形状の入口
      // 検証。他種は RG-345 で simulate 入口の検証を持ち、モデル自体は
      // 「モデルはオブジェクト（JSON）で指定してください」／カテゴリ
      // 「モデルエラー」、項目の型違いは項目名を名指して停止するが、
      // CFN には検証が無く、モデル null が汎用文言（「null / undefined
      // のプロパティは参照できません」）、非オブジェクトがハンドラ側の
      // KeyError への誤帰属や空モデルへの黙った読み替え、macros の値の
      // 型違いが汎用文言、event の非オブジェクトが黙った既定値補完に
      // なっていた。ハンドラ形・テンプレート形の双方を対象に、入口で
      // 形状を検証する。PracticeError は isAuthorError で著作者エラー
      // として素通しされ、カテゴリ「モデルエラー」のまま返る。
      const isModelObject = (v) =>
        !!v && typeof v === "object" && !Array.isArray(v);
      const modelFail = (message) => {
        throw new PracticeError(message, 1, "モデルエラー");
      };
      if (!isModelObject(model))
        modelFail("モデルはオブジェクト（JSON）で指定してください");
      if (model.event !== undefined && !isModelObject(model.event))
        modelFail("モデルeventはオブジェクトで指定してください");
      if (model.macros !== undefined) {
        if (!isModelObject(model.macros))
          modelFail("モデルmacrosはオブジェクトで指定してください");
        for (const [name, source] of Object.entries(model.macros))
          if (typeof source !== "string")
            modelFail(`モデルmacros.${name}は文字列で指定してください`);
      }
      // ハンドラ形では event が入力そのものであり、欠落はハンドラ側の
      // KeyError（'fragment'）へ誤帰属していた。event と、その必須
      // フィールド fragment の欠落をモデル側で名指す（テンプレート形
      // の event 欠落は従来どおり後段の既定値補完で扱い、macros の
      // 欠落は「モデルにマクロ定義がありません」が名指す）。
      const isHandlerForm = /^\s*(def |import |from )/.test(firstCodeLine(code));
      if (isHandlerForm) {
        if (model.event === undefined) modelFail("モデルにeventがありません");
        if (model.event.fragment === undefined)
          modelFail("モデルeventにfragmentがありません");
      }
      // RG-63: 先頭の BOM は取り除く。先頭の不可視文字は JSON／YAML の判定を
      // すり抜けてライブラリの生エラーを露出させるため、文字を名指して止める。
      if (code.charCodeAt(0) === 0xfeff) code = code.slice(1);
      if (
        code.length &&
        /^[\u00A0\u1680\u2000-\u200D\u202F\u205F\u2060\u3000\uFEFF]$/.test(code[0])
      )
        throw new PracticeError(
          `テンプレートの先頭に、読み取りを妨げる文字があります：${charLabel(code[0])}。取り除いてください`,
          1,
        );
      const py = await import("../python/engine.js");
      const lines = code.split("\n").length;
      async function runHandler(source, event) {
        let call = source + "\n__macro_response = handler(event, None)";
        let raw = py.simulatePythonPaths(call, {
          initial: { event },
          capture: ["__macro_response"],
        });
        let normalized = normalize(raw, call, {
          dynamicFilter: false,
          scan: (line) => [
            ...ref.filter((r) => line.includes(r.name)).map((r) => r.name),
            ...pythonDefinition.scan(line),
          ],
        });
        const sourceLineCount = source.split("\n").length;
        for (let p of normalized.paths) {
          p.response = p.captures?.__macro_response;
          // R30-N33: エンジンが合成した代入のナレーションを露出させない。
          // runHandler はハンドラ実行のために、学習者のソース末尾へ
          // 「__macro_response = handler(event, None)」を合成して実行する。
          // この合成行から生じたステップは、学習者の行数を超える行番号を
          // 持つ（出所＝合成行）ことと、代入先が合成変数そのものである
          // ことの両方で識別する。名前のパターン（__macro_ 始まり等）で
          // 広く消すことはしない：学習者が自分のコードで書いた
          // __macro_custom や __mine 等への代入ステップは、学習者の行の
          // 範囲内にあるため従来どおり残る。最終状態（groups）側で
          // __macro_response が表示されないことと表面を揃える。
          p.trace = p.trace.filter(
            (t) =>
              !(
                t.line > sourceLineCount &&
                t.text.includes("「__macro_response」に")
              ),
          );
          for (let t of p.trace)
            t.line = Math.min(sourceLineCount, t.line);
          // 最終状態 vars 側も、合成変数そのものだけを除く（captures は
          // レスポンス取り出し用の内部経路として従来どおり保持する）。
          if (p.vars) delete p.vars.__macro_response;
          let response = p.response;
          if (!p.error) {
            // RG-66: レスポンスが捕捉されていないのに探索が打ち切られている場合は、
            // 辞書でないという虚偽の原因ではなく打ち切りを原因として示す。
            if (
              response === undefined &&
              raw.truncated &&
              p.captures?.__macro_response === undefined
            )
              p.error = {
                line: 1,
                message:
                  "ハンドラの処理が上限に達して打ち切られたため、レスポンスを返せませんでした",
              };
            else if (
              !response ||
              typeof response !== "object" ||
              Array.isArray(response)
            )
              p.error = {
                line: 1,
                message: "ハンドラは辞書形式のレスポンスを返す必要があります",
              };
            // R7-66（修正バッチ13・fxb班）: requestId のキー存在は、入力
            // IDの値が未確定かどうかと無関係に判定できる。従来は入力ID
            // が未確定だと照合ごと飛び、応答からの欠落まで見逃していた。
            // 欠落は欠落として名指す（値の照合は従来どおり、双方が確定
            // しているときだけ行う）。
            else if (!Object.hasOwn(response, "requestId"))
              p.error = {
                line: 1,
                message: "レスポンスにrequestIdが含まれていません",
              };
            else if (
              response.requestId?.kind !== "unknown" &&
              event.requestId?.kind !== "unknown" &&
              JSON.stringify(response.requestId) !==
                JSON.stringify(event.requestId)
            )
              p.error = {
                line: 1,
                message: "レスポンスのrequestIdが入力と一致しません",
              };
            // R7-67: status の「欠落」と「存在するが文字列でない」を
            // 切り分ける。従来は typeof の不一致を一律「含まれていま
            // せん」に潰し、存在するキーの型不正を欠落と誤診していた。
            else if (!Object.hasOwn(response, "status"))
              p.error = {
                line: 1,
                message:
                  "レスポンスにstatusが含まれていません" +
                  (typeof response.errorMessage === "string"
                    ? "（errorMessage：" + response.errorMessage + "）"
                    : ""),
              };
            else if (typeof response.status !== "string")
              p.error = {
                line: 1,
                message:
                  "レスポンスのstatusが文字列ではありません：" +
                  formatValue(response.status) +
                  (typeof response.errorMessage === "string"
                    ? "（errorMessage：" + response.errorMessage + "）"
                    : ""),
              };
            else if (response.status.toLowerCase() !== "success")
              p.error = {
                line: 1,
                message:
                  "マクロが失敗しました：" +
                  (typeof response.errorMessage === "string" &&
                  response.errorMessage
                    ? response.errorMessage
                    : response.status),
              };
            else if (!Object.hasOwn(response, "fragment"))
              p.error = {
                line: 1,
                message: "レスポンスにfragmentがありません",
              };
            // R29-N1（RG-219 の応答側）: AWS 公式の応答形式では fragment は
            // { ... } の JSON オブジェクト（変換後のテンプレート断片）であり、
            // 置換先のテンプレート（節）として差し込まれる。スカラー・配列・
            // null・未確定値は断片として成立しないため、仕様側（RG-219）で
            // 厳密化した検証と対になる型検査をここで行い、名指しで止める。
            // 連鎖時は invoke() がこのエラーを後段へ渡す前に送出する。
            else if (
              !response.fragment ||
              typeof response.fragment !== "object" ||
              Array.isArray(response.fragment) ||
              isUnknown(response.fragment)
            )
              p.error = {
                line: 1,
                message:
                  "レスポンスのfragmentがオブジェクトではありません（変換後のテンプレート断片はオブジェクトで返してください）：" +
                  formatValue(response.fragment),
              };
            // R7-217: 応答は JSON として返されるため、fragment の中に
            // JSON へ変換できない値（Python の集合、NaN／Infinity 等の
            // 非有限数）が含まれていれば成功にはできない。CPython の
            // json.dumps は集合で TypeError、allow_nan=False では非有限
            // 数で ValueError になる。従来は境界検査が無く、集合の内部
            // 表現（__set タグ）や "NaN" 文字列化した値を、正常な変換
            // 結果として提示していた。入れ子を走査し、最初に見つけた
            // 変換不能値を名指して止める（未確定値はモデル上の値として
            // 対象外）。
            else if (findNonJsonValue(response.fragment))
              p.error = {
                line: 1,
                message:
                  "レスポンスのfragmentにJSONへ変換できない値が含まれています：" +
                  findNonJsonValue(response.fragment) +
                  "（マクロのレスポンスはJSONで返されるため、集合やNaN／Infinityは使えません）",
              };
          }
          p.groups.push({
            title: "入力断片 → 変換後の断片",
            entries: [
              ["入力", formatValue(event.fragment)],
              [
                "変換後",
                p.error
                  ? "エラーのため未確定"
                  : formatValue(response?.fragment),
              ],
              ["レスポンス", formatValue(response)],
            ],
          });
        }
        return normalized;
      }
      let event = { ...model.event };
      event.requestId ??= unknown("AWSからのrequestId");
      event.params ??= {};
      event.templateParameterValues ??= {};
      if (/^\s*(def |import |from )/.test(firstCodeLine(code)))
        return await runHandler(code, event);
      let doc,
        locations = new Map();
      if (code.trim().startsWith("{"))
        ({ data: doc, locations } = parseJsonLocated(code));
      else {
        try {
          doc = load(code, { schema: JSON_SCHEMA, json: false });
        } catch (e) {
          let tag = /unknown tag\s*!<([^>]+)>/.exec(e?.message || "");
          if (tag) {
            let name = tag[1].replace(/^!/, "");
            throw new PracticeError(
              "未対応：YAML短縮タグ !" +
                name +
                " はこのモデルでは未対応です（Fn::" +
                name +
                " のような完全な表記で書いてください）",
              (e.mark?.line ?? 0) + 1,
            );
          }
          // RG-63／R19-N5: ライブラリの生エラー（英語・入力ダンプ）は出さず、
          // アプリ自身の言葉で位置だけを示す。
          throw new PracticeError(
            `YAMLとして読み取れませんでした（${(e.mark?.line ?? 0) + 1}行目付近の書き方を確認してください）`,
            (e.mark?.line ?? 0) + 1,
          );
        }
      }
      if (!doc || typeof doc !== "object" || Array.isArray(doc))
        throw Error("テンプレートはオブジェクトで指定してください");
      // R25-N4: 循環参照は後段の再帰走査（stripTransformKeys／nested）に
      // 入る前にここで名指して止める。
      assertNoCircularTemplate(doc);
      let states = [
          {
            fragment: structuredClone(doc),
            trace: [],
            outputs: [],
            groups: [],
            vars: {},
          },
        ],
        truncated = false,
        start = performance.now(),
        ops = 0;
      function cap(items) {
        if (items.length > LIMITS.paths) truncated = true;
        return items.slice(0, LIMITS.paths);
      }
      function combine(left, right, merge) {
        if (left.length * right.length > LIMITS.paths) truncated = true;
        const result = [];
        for (const l of left) for (const r of right) {
          if (result.length >= LIMITS.paths) return result;
          result.push(merge(l, r));
        }
        return result;
      }
      async function invoke(name, fragment, params, line, refs) {
        if (typeof name !== "string" || name === "")
          throw Object.assign(
            Error("マクロ名が指定されていません（呼び出しにNameが含まれていません）"),
            { line },
          );
        if (["AWS::Include", "AWS::Serverless", "AWS::Serverless-2016-10-31"].includes(name))
          throw Object.assign(Error("未対応：組込みTransformの実際の変換・外部サービスへの接続は実装していません：" + name), {line, category: "未対応"});
        // R7-218: マクロ名の存在は自有プロパティで判定する。従来の
        // model.macros?.[name] は Object.prototype の継承プロパティ
        // （toString／constructor 等）をハンドラとして拾い、未登録名
        // なのに汎用の予期しないエラーになっていた。
        if (!model.macros || !Object.hasOwn(model.macros, name))
          throw Object.assign(
            Error("未確認：モデルにマクロ定義がありません：" + name),
            { line },
          );
        let r = await runHandler(model.macros[name], {
          ...event,
          fragment,
          params,
          transformId: name,
        });
        truncated ||= r.truncated;
        if (r.error) throw Object.assign(Error(r.error.message), r.error);
        return r.paths.map((p) => ({
          ...p,
          trace: [
            { line, text: `${name} に断片を渡します`, refs, kind: "step" },
            ...p.trace.map((t) => ({
              ...t,
              line,
              text: "モデルハンドラ：" + t.text,
            })),
          ],
          fragment: p.response?.fragment,
        }));
      }
      async function nested(value, path = "", ancestors = new Set()) {
        if (++ops > 10000 || performance.now() - start > 1200)
          throw Error("変換の探索上限で停止しました");
        if (!value || typeof value !== "object")
          return [{ fragment: value, trace: [], outputs: [] }];
        // R25-N4: 走査側の循環検出（事前検査の二重化）。祖先集合は
        // 経路ごとに複製して渡すため、兄弟からの共有参照は誤検出しない。
        if (ancestors.has(value))
          throw new PracticeError(CIRCULAR_TEMPLATE_MESSAGE, 1);
        const childAncestors = new Set(ancestors);
        childAncestors.add(value);
        if (Array.isArray(value)) {
          let states = [{ fragment: [], trace: [], outputs: [] }];
          for (let [i, v] of value.entries()) {
            let rs = await nested(v, path + "/" + i, childAncestors);
            states = combine(states, rs, (s, r) => ({
                  fragment: [...s.fragment, r.fragment],
                  trace: [...s.trace, ...r.trace],
                  outputs: [...s.outputs, ...r.outputs],
                  error: s.error || r.error,
                }));
          }
          return states;
        }
        let base = { ...value };
        delete base["Fn::Transform"];
        let states = [{ fragment: base, trace: [], outputs: [] }];
        for (let [key, v] of Object.entries(base)) {
          let rs = await nested(v, path + "/" + key, childAncestors);
          states = combine(states, rs, (s, r) => ({
                ...s,
                fragment: { ...s.fragment, [key]: r.fragment },
                trace: [...s.trace, ...r.trace],
                outputs: [...s.outputs, ...r.outputs],
                error: s.error || r.error,
              }));
        }
        // R27-N6: Fn::Transform の有無も、トップレベル Transform（RG-205）と
        // 同じく値の真偽ではなくキーの存在で判定する。""／null／0／false の
        // falsy スカラーは「節なし」ではなく不正な指定であり、検証文言で
        // 停止させる（従来は真偽 gate のため検証に届かず、キーだけが消えて
        // 未変換のまま成功していた）。空配列 [] も、要素が無いため検証対象の
        // マクロ指定が存在しない形として同じ文言で停止させる（トップレベル
        // Transform の空配列受理は RG-205 の確立済み規則であり、そちらは維持）。
        if (Object.hasOwn(value, "Fn::Transform")) {
          let specs = Array.isArray(value["Fn::Transform"])
              ? value["Fn::Transform"]
              : [value["Fn::Transform"]],
            line = locations.get(path + "/Fn::Transform") || 1;
          if (specs.length === 0)
            throw Object.assign(
              Error(
                "Fn::Transformの指定にマクロ名（Name）が含まれていません（NameとParametersのオブジェクト、またはその配列で指定してください）",
              ),
              { line },
            );
          // RG-371（R33-N8）: 検証は原因ごとに切り分け、真因だけを名指す。
          // 従来は Name の有無・型と Parameters の型を1条件に潰していたため、
          // Name があるのに Parameters の型違いで「Name が含まれていません」
          // という虚偽の原因を示していた。Name の真の欠落だけが従来文言で、
          // 指定自体がオブジェクトでない形・Name の型違い・Parameters の
          // 型違いはそれぞれ対象を名指す文言で停止させる。
          for (let spec of specs) {
            if (!spec || typeof spec !== "object" || Array.isArray(spec))
              throw Object.assign(
                Error(
                  "Fn::Transformの指定がオブジェクトではありません（NameとParametersのオブジェクト、またはその配列で指定してください）",
                ),
                { line },
              );
            if (!Object.hasOwn(spec, "Name"))
              throw Object.assign(
                Error(
                  "Fn::Transformの指定にマクロ名（Name）が含まれていません（NameとParametersのオブジェクト、またはその配列で指定してください）",
                ),
                { line },
              );
            if (typeof spec.Name !== "string" || spec.Name === "")
              throw Object.assign(
                Error(
                  "Fn::TransformのNameは空でない文字列で指定してください（NameとParametersのオブジェクト、またはその配列で指定してください）",
                ),
                { line },
              );
            if (
              spec.Parameters !== undefined &&
              (!spec.Parameters ||
                typeof spec.Parameters !== "object" ||
                Array.isArray(spec.Parameters))
            )
              throw Object.assign(
                Error(
                  "Fn::TransformのParametersはオブジェクトで指定してください（NameとParametersのオブジェクト、またはその配列で指定してください）",
                ),
                { line },
              );
          }
          let done = [];
          for (let s of states) {
            if (s.error) { done.push(s); continue; }
            let chain = [s];
            for (let spec of specs) {
              let next = [];
              for (let cur of chain) {
                if (cur.error) { next.push(cur); continue; }
                let rs = await invoke(
                  spec.Name,
                  cur.fragment,
                  spec.Parameters || {},
                  line,
                  ["Fn::Transform"],
                );
                next.push(
                  ...rs.map((r) => ({
                    ...r,
                    trace: [...cur.trace, ...r.trace],
                    outputs: [...cur.outputs, ...r.outputs],
                  })),
                );
              }
              chain = next;
            }
            done.push(...chain);
          }
          states = cap(done);
        }
        return states;
      }
      const original = structuredClone(doc),
        // R26-N14: Transform 節の有無は値の真偽ではなくキーの存在で
        // 判定する。""／null は「節なし」ではなく不正な指定であり、
        // 後段の検証で 123 と同じ文言で停止させる（従来は falsy として
        // 素通りし、未変換のまま成功していた）。空配列 [] は従来どおり
        // 「マクロなし」として受理する。
        transforms = Object.hasOwn(doc, "Transform")
          ? Array.isArray(doc.Transform)
            ? doc.Transform
            : [doc.Transform]
          : [];
      // NX-N26: groups の「入力」はテンプレート全体ではなく、マクロへ
      // 実際に渡された断片（Transform／Fn::Transform キー除去後）を示す。
      // エンジン側のキー除去がマクロの仕事のように混ざらないようにする。
      function stripTransformKeys(value, isRoot = false, ancestors = new Set()) {
        if (!value || typeof value !== "object") return value;
        // R25-N4: 事前検査（assertNoCircularTemplate）で循環は止まるが、
        // この再帰自体にも祖先検出を持たせて二重に守る。
        if (ancestors.has(value))
          throw new PracticeError(CIRCULAR_TEMPLATE_MESSAGE, 1);
        const childAncestors = new Set(ancestors);
        childAncestors.add(value);
        if (Array.isArray(value))
          return value.map((v) => stripTransformKeys(v, false, childAncestors));
        let out = {};
        for (let [k, v] of Object.entries(value)) {
          if (k === "Fn::Transform") continue;
          if (isRoot && k === "Transform") continue;
          out[k] = stripTransformKeys(v, false, childAncestors);
        }
        return out;
      }
      const strippedInput = stripTransformKeys(original, true);
      // トップレベル Transform へ渡す直前の断片をパスごとに保持する
      // （Fn::Transform の変換まで済んだ状態が実際に渡される断片）。
      const inputByState = new WeakMap();
      delete doc.Transform;
      states = await nested(doc);
      for (let transform of transforms) {
        let done = [];
        const spec = typeof transform === "string" ? { Name: transform, Parameters: {} } : transform;
        if (!spec || typeof spec.Name !== "string" || spec.Name === "" || (spec.Parameters !== undefined && (!spec.Parameters || typeof spec.Parameters !== "object" || Array.isArray(spec.Parameters))))
          throw Error("Transformにはマクロ名またはNameとParametersのオブジェクトを指定してください");
        for (let s of states) {
          if (s.error) {
            done.push(s);
            continue;
          }
          let rs = await invoke(
            spec.Name,
            s.fragment,
            {},
            locations.get("/Transform") || 1,
            ["Transform"],
          );
          let passedFragment =
            inputByState.get(s) ?? structuredClone(s.fragment);
          done.push(
            ...rs.map((r) => {
              let merged = {
                ...r,
                trace: [...s.trace, ...(Object.keys(spec.Parameters || {}).length ? [{line: locations.get("/Transform") || 1, text: "トップレベルのカスタムLambdaマクロではparamsは空です。ParametersはFn::Transformの入力と区別します。", kind: "step", refs: ["Transform", "params"]}] : []), ...r.trace],
                outputs: [...s.outputs, ...r.outputs],
              };
              inputByState.set(merged, passedFragment);
              return merged;
            }),
          );
          if (done.length > LIMITS.paths) {
            truncated = true;
            done.length = LIMITS.paths;
          }
        }
        states = done;
      }
      return {
        paths: states.map((s, id) => ({
          ...s,
          id,
          vars: {},
          groups: [
            {
              title: "テンプレート断片",
              entries: [
                [
                  "入力",
                  formatValue(inputByState.get(s) ?? strippedInput),
                ],
                [
                  "変換後",
                  s.error ? "エラーのため未確定" : formatValue(s.fragment),
                ],
              ],
            },
          ],
        })),
        truncated,
        limits: LIMITS,
        reasons: truncated ? ["変換経路の上限"] : [],
      };
    } catch (e) {
      // R25-N4: 著作者エラーは従来どおりバイト単位で素通しし、
      // ホスト例外（RangeError／TypeError 等の生文言）だけを
      // 学習者向け日本語文言へ変換する（isAuthorError の識別根拠は
      // 同関数の定義箇所のコメント参照）。
      return sourceFailure(isAuthorError(e) ? e : toLearnerError(e));
    }
  },
};

definition.templates.push(...additionalTemplates(definition.model.defaults));

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
