import {
  templates,
  reference,
  glossary,
  usedReferences,
} from "../../content.js";
import { lex, display } from "../../engine.js";
for (const r of reference) {
  if (["LBound","UBound"].includes(r.name)) r.example = "Dim items(2) As String\n" + r.example;
  if (r.name === "Next") r.example = "For i = 1 To 3\n    Debug.Print i\nNext i";
  if (r.name === "Exit Do") r.example = "Do\n    Exit Do\nLoop";
}
export const definition = {
  id: "vba",
  name: "Excel VBA",
  extensions: [".bas", ".txt"],
  syntax: {
    name: "VBA",
    caseSensitive: false,
    lineComment: "'",
    blockKeywords: ["If", "Select Case", "For", "Do"],
  },
  reference,
  templates,
  glossary,
  model: {
    kind: "sheet",
    title: "モデルシート",
    hint: "値を編集できます。「?」は未確定、空欄はEmpty。文字列を数値と区別するには先頭に ' を付けます。",
    defaults: {
      A1: "商品",
      B1: "点数",
      C1: "判定",
      A2: "りんご",
      B2: 85,
      A3: "みかん",
      B3: 60,
      A4: "ぶどう",
      B4: 45,
    },
  },
  semantics: {
    description:
      "単一シート A1:C5 に対するVBAの部分意味論。Variantと宣言型、配列、分岐、ループ、実行時エラーを区別します。",
    support:
      "単一Sub、Dim、代入、If / ElseIf / Else、Select Case、For / For Each、Do、Exit、固定1次元配列、On Error Resume Next / GoTo 0。未対応：複数シート・外部ブック・With・GoToラベル・1行If・動的配列・未確定Step・非線形条件など。",
    sources: [
      {
        title: "Microsoft VBA言語リファレンス",
        url: "https://learn.microsoft.com/office/vba/language/reference/user-interface-help/visual-basic-language-reference",
      },
    ],
  },
  scan(code) {
    try {
      return usedReferences(lex(code));
    } catch {
      return [];
    }
  },
  async simulate(code, model, limits) {
    const { simulate } = await import("../../engine.js");
    let r = simulate(code, model, limits);
    for (let p of r.paths) {
      for (let t of p.trace) t.refs = usedReferences(t.tokens || []);
      p.groups = [
        {
          title: "変数",
          entries: Object.entries(p.vars).map(([k, v]) => [k, display(v)]),
        },
        {
          title: "セルの変化",
          entries: p.changes.map(([k, v]) => [k, display(v)]),
        },
      ];
    }
    return r;
  },
};

["基礎", "基礎", "基礎", "実践", "実践", "実践", "応用", "応用"].forEach((level, i) => { definition.templates[i].level = level; });

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
