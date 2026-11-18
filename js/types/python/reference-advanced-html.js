/* 高度モード B7 G7: html のリファレンス（正規形）。
* 状態（status）は実装の裁定結果。出典は公式ドキュメント 3.15 と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
 {
  "name": "html.escape",
  "category": "HTML",
  "syntax": "escape(s, quote=True)",
  "description": "文字列中の & < > を実体参照に置換する。quote=True では \" は &quot;、' は &#x27; になる。",
  "example": "import html\nprint(html.escape('<a b=\"c\">&'))",
  "caution": "& は最初に置換されるため、二重にエスケープされることはない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.html",
  "returns": "str"
 },
 {
  "name": "html.unescape",
  "category": "HTML",
  "syntax": "unescape(s)",
  "description": "HTML の文字参照（&amp; &#65; &#x41; 等）を文字に戻す。HTML5 の実体表を使い、';' の無いレガシー実体や前方一致（&not → ¬）も CPython どおり処理する。",
  "example": "import html\nprint(html.unescape('&Aacute; &#128; &notanentity;'))",
  "caution": "数値参照の不正値（0 やサロゲート）は U+FFFD に、C1 制御文字は Windows-1252 の文字に置換される。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.html",
  "returns": "str"
 }
];
