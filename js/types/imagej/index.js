import { functions, functionCats } from "./reference-data.js";
import { sourceTemplates } from "./templates-data.js";
import { LIMITS, formatValue } from "../../core/contract.js";
const reference = functions.map((r) => ({
  name: r.name,
  category: functionCats[r.cat] || r.cat,
  syntax: r.sig,
  description: r.desc,
  example: r.ex || "",
  caution: r.note || "",
  supported: true,
}));
export const definition = {
  id: "imagej",
  name: "ImageJマクロ",
  extensions: [".ijm", ".txt"],
  syntax: { name: "ImageJ Macro", caseSensitive: true, lineComment: "//" },
  reference,
  templates: sourceTemplates.map((t, i) => ({
    id: "ij-" + i,
    title: t.name,
    code: t.code,
    intro: [t.prep, ...t.guide].join(" "),
    refs: reference
      .filter((r) => t.code.includes(r.name + "("))
      .map((r) => r.name),
  })),
  glossary: [
    ["モデル画像", "画素値・幅・高さ・階調などを明示した学習用の画像です。"],
    ["ROI", "測定や処理の対象として選択した領域。"],
    ["Log", "printの出力先です。"],
  ],
  model: {
    kind: "json",
    title: "モデル画像",
    hint: 'imagesのw / h / bitとpix（例："0,0":100）を編集できます。未指定画素の値は捏造しません。bucketsは明示した階調分布のモデルです。',
    defaults: {
      images: [
        {
          title: "demo.tif",
          w: 512,
          h: 512,
          bit: 8,
          channels: 1,
          slices: 1,
          frames: 1,
          slice: 1,
          buckets: [
            [0, 29, 52],
            [30, 99, 13],
            [100, 149, 9],
            [150, 199, 11],
            [200, 255, 15],
          ],
          thr: null,
          pix: { "0,0": 100 },
          spatial: false,
          kind: "グレースケール",
        },
      ],
    },
  },
  semantics: {
    description:
      "ImageJ学習アプリのマクロパーサ・評価器と教材を移植。画像・ROI・測定表を明示したモデル上で説明します。",
    support:
      "実画像の粒子数・外部ファイル・ダイアログの入力値は未確定です。画像フィルター等はモデル上の近似として表示する項目があります。",
    sources: [
      {
        title: "ImageJ公式マクロ関数",
        url: "https://imagej.net/ij/developer/macro/functions.html",
      },
    ],
  },
  scan(code) {
    let found = [];
    let stripped = code
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/"(?:\\.|[^"\\])*"/g, '""');
    for (let match of stripped.matchAll(/([A-Za-z_][\w.]*)\s*\(/g)) {
      if (
        reference.some((r) => r.name === match[1]) &&
        !found.includes(match[1])
      )
        found.push(match[1]);
    }
    return found;
  },
  async simulate(code, model) {
    if (code.length > LIMITS.source)
      return {
        paths: [],
        error: { line: 1, message: "コードは100000文字以内にしてください" },
      };
    let engine = await import("./engine.js");
    try {
      let raw = engine.simRunPaths(code, model);
      let list = raw.single ? [raw.single] : raw.paths;
      let truncated = !!raw.truncated || list.some((r) => r.incomplete);
      let paths = list.map((r, id) => {
        let error = r.diags.find((d) => d.sev === "err");
        let trace = r.steps.map((s) => ({
          line: s.line || 1,
          text: s.text,
          kind: /続く可能性|打ち切/.test(s.text) ? "limit" : "step",
          refs: (s.used || []).filter((n) =>
            reference.some((r) => r.name === n),
          ),
        }));
        if (error)
          trace.push({
            line: error.line || 1,
            text: error.text + " " + error.cause,
            kind: "error",
            refs: [],
          });
        return {
          id,
          trace,
          outputs: r.log.map((text, i) => ({
            channel: "Log",
            text,
            line: r.logLines?.[i],
          })),
          vars: Object.fromEntries(r.vars.map((v) => [v.name, v.value])),
          groups: [
            { title: "変数", entries: r.vars.map((v) => [v.name, v.value]) },
            {
              title: "画像・測定表",
              entries: [
                ["アクティブ画像", formatValue(r.img)],
                [
                  "画素の変化",
                  formatValue(r.modelState?.images.map((i) => i.pix)),
                ],
                ["測定結果", formatValue(r.modelState?.results)],
              ],
            },
          ],
          error: error
            ? { line: error.line || 1, message: error.text }
            : undefined,
        };
      });
      return {
        paths,
        truncated,
        limits: LIMITS,
        reasons: truncated ? ["探索またはループの上限"] : [],
      };
    } catch (e) {
      return {
        paths: [],
        error: {
          line: e.line || 1,
          message: e.text || e.message || "未対応の構文です",
        },
      };
    }
  },
};
