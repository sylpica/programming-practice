import { functions, functionCats } from "./reference-data.js";
import { sourceTemplates } from "./templates-data.js";
import { LIMITS, formatModelValue as formatValue } from "../../core/contract.js";
const reference = functions.map((r) => ({
  name: r.name,
  category: functionCats[r.cat] || r.cat,
  syntax: r.sig,
  description: r.desc,
  returns: r.ret || "戻り値なし（処理または引数の変数への書き込み）",
  example: r.ex || "",
  caution: r.note || "",
  supported: true,
}));
const exampleSetup = {
  selectImage:'id=getImageID();',makeSelection:'xs=newArray(0,10,10); ys=newArray(0,0,10);',getResult:'run("Measure");',getResultLabel:'run("Measure");',isNaN:'run("Measure");',
  getFileList:'dir=getDirectory("フォルダ");',"File.append":'name="sample";',"File.exists":'path="/model/sample.tif";',
  showStatus:'i=1; n=3;',showProgress:'i=1; n=3;',lengthOf:'name="sample"; arr=newArray(1,2);',
  indexOf:'name="sample_1";',startsWith:'name="ctrl_1";',endsWith:'name="sample.tif";',replace:'name="sample 1";',split:'name="sample_1";',
  d2s:'mean=1.25;',"Array.sort":'values=newArray(3,1,2);',"Array.copy":'a=newArray(3,1,2);',"Array.getStatistics":'vals=newArray(1,2,3);',
  abs:'a=2; b=5;',"Math.min":'a=2; b=5;',"Math.max":'a=2; b=5;',minOf:'a=2; b=5;',maxOf:'a=2; b=5;',pow:'x=3;',exp:'x=1;',log:'x=2;',atan2:'dy=1; dx=1;',print:'mean=2.5;'
};
for (const r of reference) if (Object.prototype.hasOwnProperty.call(exampleSetup, r.name)) r.example = exampleSetup[r.name] + "\n" + r.example;
reference.find(r=>r.name === "File.exists").example = 'print(File.exists("/model/sample.tif"));';
reference.find(r=>r.name === "open").example = 'open("/model/input/image1.tif");';
const unmodeledReferences = new Set(["getValue", "setColor", "drawLine", "getPixelSize", "getLut", "getDateAndTime", "getLocationAndSize", "getDisplayedArea", "getSelectionCoordinates", "getLine", "getCursorLoc", "Roi.getBounds", "Roi.getCoordinates", "Roi.contains", "Roi.move", "Roi.translate", "Roi.setStrokeWidth", "Roi.setStrokeColor", "Roi.setFillColor", "Roi.setName", "Roi.getName", "Roi.setPosition", "Roi.getPosition", "Roi.getProperty", "Roi.setProperty", "RoiManager.select", "RoiManager.selectByName", "RoiManager.getName", "RoiManager.getIndex", "RoiManager.delete", "setForegroundColor", "File.open", "File.append", "runMacro", "Math.sinh", "Math.cosh", "Math.tanh"]);
for (const r of reference) {
  if (unmodeledReferences.has(r.name)) { r.supported=false; r.caution += "このアプリでは未確認として停止する。"; }
  if (["setPixel","setMinAndMax"].includes(r.name)) r.example = r.example.replace(/updateDisplay\(\);?/g, "");
  if (r.name === "getProfile") r.example = "makeLine(0, 0, 100, 0);\nprof=getProfile(); print(prof);"; /* D10: 選択なしでは実 ImageJ でもエラーになるため、直線 ROI を作る前置きを含める */
}
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
    intro: [t.prep, ...t.guide].join(""),
    refs: reference
      .filter((r) => t.code.includes(r.name + "("))
      .map((r) => r.name),
  })),
  glossary: [
    ["モデル画像", "画素値・幅・高さ・階調などを明示した学習用の画像です。"],
    ["ROI", "測定や処理の対象として選択した領域。"],
    ["Log", "printの出力先です。"],
    [
      "スタック",
      "複数枚のスライスを重ねた画像の集まりです。スライスの枚数がスタックの大きさになります。",
    ],
    [
      "閾値・二値化",
      "画素の明るさを閾値（境目の値）で区切り、白黒2値に分ける処理です。粒子カウントなどの前処理に使います。",
    ],
    [
      "結果表（Results）",
      "測定結果が1行ずつ並ぶ表です。ROIごとの測定値などが記録されます。",
    ],
    [
      "未確定（値）",
      "実行時に決まる値のことです。このアプリでは値を仮定して作らず、未確定のまま扱って、到達可能な分岐をすべて表示します。",
    ],
  ],
  model: {
    kind: "json",
    title: "モデル画像",
    hint: 'imagesのw / h / bitとpix（例："0,0":100）を編集できます。未指定画素の値は捏造しません。bucketsは明示した階調分布のモデルです。',
    defaults: {
      directories: {"画像フォルダを選んでください":"/model/input/","保存先フォルダを選んでください":"/model/output/","フォルダ":"/model/input/"},
      files: {
        "/model/input/image1.tif": {w:32,h:32,bit:8,channels:1,slices:1,frames:1,pix:{"0,0":10}},
        "/model/input/image2.tif": {w:64,h:64,bit:16,channels:1,slices:1,frames:1,pix:{"0,0":20}},
        "/model/input/memo.txt": {text:"モデルのメモ"},
      },
      runtime: {version:"1.54p",argument:""},
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
                ["モデルファイル", formatValue(r.modelState?.files)],
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

// RG-84（R21-N15）: ij-3「関数の定義」のレベルは名前側の分類どおり基礎。
// （以前は実践になっており、名前の【基礎】表記と矛盾していた。名前側の
// 【基礎】は RG-84 で除去済みで、レベルはこの配列が唯一の保持場所。）
["基礎", "基礎", "基礎", "基礎", "基礎", "応用", "応用", "実践", "応用", "応用"].forEach((level, i) => { definition.templates[i].level = level; });

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
