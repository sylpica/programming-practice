import { load, JSON_SCHEMA } from "../../vendor/yaml.js";
import { parseJsonLocated, sourceFailure, rows } from "../../core/data.js";
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
    "トップレベルTransformのparamsは空です。",
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
    "templateParameterValues",
    "ハンドラ",
    'event["templateParameterValues"]',
    "テンプレートパラメーターの評価済み値です。",
    'event["templateParameterValues"]',
    "モデルにない実値は未確定です。",
  ],
]);
export const definition = {
  id: "cloudformation",
  name: "AWS CloudFormation Macros",
  extensions: [".yaml", ".yml", ".json", ".py", ".txt"],
  syntax: { name: "CloudFormation JSON / YAML・Python 3", caseSensitive: true },
  reference: [
    ...ref,
    ...pythonDefinition.reference.filter(
      (r) => !ref.some((f) => f.name === r.name),
    ),
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
      "Lambdaハンドラ",
      "マクロのリクエストを受け、変換済み断片を返す関数です。",
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
    return /^\s*(def |import |from |#)/.test(code)
      ? ".py"
      : code.trim().startsWith("{")
        ? ".json"
        : ".yaml";
  },
  scan(code) {
    if (/^\s*(def |import |from |#)/.test(code))
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
            if (!response || typeof response !== "object")
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
            else if (
              typeof response.status !== "string" ||
              response.status.toLowerCase() !== "success"
            )
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
      if (/^\s*(def |import |from |#)/.test(code))
        return await runHandler(code, event);
      let doc,
        locations = new Map();
      if (code.trim().startsWith("{"))
        ({ data: doc, locations } = parseJsonLocated(code));
      else {
        doc = load(code, { schema: JSON_SCHEMA, json: false });
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
      async function invoke(name, fragment, params, line, refs) {
        if (typeof name !== "string" || !model.macros?.[name])
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
            states = states
              .flatMap((s) =>
                rs.map((r) => ({
                  fragment: [...s.fragment, r.fragment],
                  trace: [...s.trace, ...r.trace],
                  outputs: [...s.outputs, ...r.outputs],
                  error: s.error || r.error,
                })),
              )
              .slice(0, LIMITS.paths);
          }
          return states;
        }
        let base = { ...value };
        delete base["Fn::Transform"];
        let states = [{ fragment: base, trace: [], outputs: [] }];
        for (let [key, v] of Object.entries(base)) {
          let rs = await nested(v, path + "/" + key);
          states = states
            .flatMap((s) =>
              rs.map((r) => ({
                ...s,
                fragment: { ...s.fragment, [key]: r.fragment },
                trace: [...s.trace, ...r.trace],
                outputs: [...s.outputs, ...r.outputs],
                error: s.error || r.error,
              })),
            )
            .slice(0, LIMITS.paths);
        }
        if (value["Fn::Transform"]) {
          let spec = value["Fn::Transform"],
            done = [];
          for (let s of states) {
            let rs = await invoke(
              spec.Name,
              s.fragment,
              spec.Parameters || {},
              locations.get(path + "/Fn::Transform") || 1,
              ["Fn::Transform"],
            );
            done.push(
              ...rs.map((r) => ({
                ...r,
                trace: [...s.trace, ...r.trace],
                outputs: [...s.outputs, ...r.outputs],
              })),
            );
          }
          states = done.slice(0, LIMITS.paths);
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
        if (typeof transform !== "string")
          throw Error("トップレベルTransformにはマクロ名を指定してください");
        for (let s of states) {
          if (s.error) {
            done.push(s);
            continue;
          }
          let rs = await invoke(
            transform,
            s.fragment,
            {},
            locations.get("/Transform") || 1,
            ["Transform"],
          );
          done.push(
            ...rs.map((r) => ({
              ...r,
              trace: [...s.trace, ...r.trace],
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
