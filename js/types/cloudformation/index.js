import { additionalTemplates } from "./additional-templates.js";
import { load, JSON_SCHEMA } from "../../vendor/yaml.js";
import { parseJsonLocated, sourceFailure, rows } from "../../core/data.js";
import { PracticeError, charLabel } from "../../core/script.js";
import { LIMITS, unknown, formatValue } from "../../core/contract.js";
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
    "実AWSのマクロ定義はモデルのmacrosと別です。",
  ],
  [
    "Fn::Transform",
    "テンプレート",
    "Fn::Transform: {Name: 名前, Parameters: {...}}",
    "同階層の兄弟とその子をfragmentとして渡します。",
    '{"Fn::Transform":{"Name":"AddMetadata","Parameters":{"Stage":"test"}}}',
    "Parametersは事前評価されずに渡されます。",
  ],
  [
    "fragment",
    "ハンドラ",
    'event["fragment"]',
    "変換対象のテンプレート断片です。",
    'fragment = event["fragment"]',
  ],
  [
    "params",
    "ハンドラ",
    'event["params"]',
    "Fn::Transformで指定したマクロパラメーターです。",
    'event["params"].get("Stage", "dev")',
    "カスタムLambdaマクロのトップレベルTransformではparamsは空です。Parametersを受け取るFn::Transformと区別します。AWS::Include等の組込みTransformは専用仕様で、本モデルでは未対応です。",
  ],
  [
    "requestId",
    "ハンドラ",
    'event["requestId"]',
    "受け取ったIDと同じ値を返します。",
    '"requestId": event["requestId"]',
    "実際のIDを捏造しません。モデルで未指定なら未確定です。",
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
    "モデル既定は model-region です。実際のリージョン名は捏造しません。",
  ],
  [
    "accountId",
    "ハンドラ",
    'event["accountId"]',
    "マクロを実行する AWS アカウントの ID です。",
    'event["accountId"]',
    "モデル既定は model-account です。実際のアカウント ID は捏造しません。",
  ],
  [
    "transformId",
    "ハンドラ",
    'event["transformId"]',
    "呼び出されたマクロの名前（Transform で指定した名前）です。",
    'event["transformId"]',
    "モデルでマクロを呼ぶときは、呼び出し側のマクロ名で上書きされて渡されます。",
  ],
  [
    "errorMessage",
    "ハンドラ",
    '{"errorMessage": "理由"}',
    "マクロが失敗したときに理由を示す応答フィールドです。",
    '"errorMessage": "変換できませんでした"',
    "status が success 以外のとき、失敗の理由として読み取られます。成功応答には不要です。",
  ],
  [
    "templateParameterValues",
    "ハンドラ",
    'event["templateParameterValues"]',
    "テンプレートパラメーターの評価済み値です。",
    'event["templateParameterValues"]',
    "モデルにない実値は未確定です。",
  ],
]);
for (const r of ref) if (!["Transform","Fn::Transform"].includes(r.name)) r.example = identity;
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
        "Fn::Transformは同じオブジェクト内の兄弟要素を渡します。パラメーターは未評価で渡されます。",
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
      "マクロが受け取り、変換して返すテンプレートの一部です。",
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
        for (let p of normalized.paths) {
          p.response = p.captures?.__macro_response;
          for (let t of p.trace)
            t.line = Math.min(source.split("\n").length, t.line);
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
            else if (!response || typeof response !== "object")
              p.error = {
                line: 1,
                message: "ハンドラは辞書形式のレスポンスを返す必要があります",
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
            else if (typeof response.status !== "string")
              p.error = {
                line: 1,
                message:
                  "レスポンスにstatusが含まれていません" +
                  (typeof response.errorMessage === "string"
                    ? "（errorMessage：" + response.errorMessage + "）"
                    : ""),
              };
            else if (response.status.toLowerCase() !== "success")
              p.error = {
                line: 1,
                message:
                  "マクロが失敗しました：" +
                  (response.errorMessage || response.status),
              };
            else if (!Object.hasOwn(response, "fragment"))
              p.error = {
                line: 1,
                message: "レスポンスにfragmentがありません",
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
        if (!model.macros?.[name])
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
      async function nested(value, path = "") {
        if (++ops > 10000 || performance.now() - start > 1200)
          throw Error("変換の探索上限で停止しました");
        if (!value || typeof value !== "object")
          return [{ fragment: value, trace: [], outputs: [] }];
        if (Array.isArray(value)) {
          let states = [{ fragment: [], trace: [], outputs: [] }];
          for (let [i, v] of value.entries()) {
            let rs = await nested(v, path + "/" + i);
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
          let rs = await nested(v, path + "/" + key);
          states = combine(states, rs, (s, r) => ({
                ...s,
                fragment: { ...s.fragment, [key]: r.fragment },
                trace: [...s.trace, ...r.trace],
                outputs: [...s.outputs, ...r.outputs],
                error: s.error || r.error,
              }));
        }
        if (value["Fn::Transform"]) {
          let specs = Array.isArray(value["Fn::Transform"])
              ? value["Fn::Transform"]
              : [value["Fn::Transform"]],
            line = locations.get(path + "/Fn::Transform") || 1;
          for (let spec of specs) {
            if (
              !spec ||
              typeof spec !== "object" ||
              Array.isArray(spec) ||
              typeof spec.Name !== "string" ||
              (spec.Parameters !== undefined &&
                (!spec.Parameters ||
                  typeof spec.Parameters !== "object" ||
                  Array.isArray(spec.Parameters)))
            )
              throw Object.assign(
                Error(
                  "Fn::Transformの指定にマクロ名（Name）が含まれていません（NameとParametersのオブジェクト、またはその配列で指定してください）",
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
        transforms = doc.Transform
          ? Array.isArray(doc.Transform)
            ? doc.Transform
            : [doc.Transform]
          : [];
      delete doc.Transform;
      states = await nested(doc);
      for (let transform of transforms) {
        let done = [];
        const spec = typeof transform === "string" ? { Name: transform, Parameters: {} } : transform;
        if (!spec || typeof spec.Name !== "string" || (spec.Parameters !== undefined && (!spec.Parameters || typeof spec.Parameters !== "object" || Array.isArray(spec.Parameters))))
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
          done.push(
            ...rs.map((r) => ({
              ...r,
              trace: [...s.trace, ...(Object.keys(spec.Parameters || {}).length ? [{line: locations.get("/Transform") || 1, text: "トップレベルのカスタムLambdaマクロではparamsは空です。ParametersはFn::Transformの入力と区別します。", kind: "step", refs: ["Transform", "params"]}] : []), ...r.trace],
              outputs: [...s.outputs, ...r.outputs],
            })),
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
                ["入力", formatValue(original)],
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
      return sourceFailure(e);
    }
  },
};

definition.templates.push(...additionalTemplates(definition.model.defaults));

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
