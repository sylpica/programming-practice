/* 高度モード B7 G7: html.entities のリファレンス（正規形）。
* 状態（status）は実装の裁定結果。出典は公式ドキュメント 3.15 と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
 {
  "name": "html.entities.codepoint2name",
  "category": "HTML実体",
  "syntax": "codepoint2name",
  "description": "コードポイント→HTML4 実体名の辞書。",
  "example": "import html\nprint(html.entities.codepoint2name[38])",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.entities.html",
  "returns": "dict"
 },
 {
  "name": "html.entities.entitydefs",
  "category": "HTML実体",
  "syntax": "entitydefs",
  "description": "HTML4 の実体名→文字の辞書（252件）。",
  "example": "import html\nprint(html.entities.entitydefs['amp'])",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.entities.html",
  "returns": "dict"
 },
 {
  "name": "html.entities.html5",
  "category": "HTML実体",
  "syntax": "html5",
  "description": "HTML5 の実体名→文字列の辞書（2231件。';' 付きとレガシーな ';' なしの両キーを含む）。CPython 3.12 の表を転記した。",
  "example": "import html\nprint(html.entities.html5['&amp;'.strip('&') + ';'] if False else html.entities.html5['amp;'])",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.entities.html",
  "returns": "dict"
 },
 {
  "name": "html.entities.name2codepoint",
  "category": "HTML実体",
  "syntax": "name2codepoint",
  "description": "HTML4 の実体名→コードポイントの辞書（252件）。",
  "example": "import html\nprint(html.entities.name2codepoint['amp'])",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.entities.html",
  "returns": "dict"
 }
];
