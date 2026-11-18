/* 高度モード B7 G7: keyword のリファレンス（正規形）。
* 状態（status）は実装の裁定結果。出典は公式ドキュメント 3.15 と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
 {
  "name": "keyword.iskeyword",
  "category": "キーワード",
  "syntax": "iskeyword(s)",
  "description": "文字列がキーワードかどうかを返す。文字列以外では False。",
  "example": "import keyword\nprint(keyword.iskeyword('if'), keyword.iskeyword('foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/keyword.html",
  "returns": "bool"
 },
 {
  "name": "keyword.issoftkeyword",
  "category": "キーワード",
  "syntax": "issoftkeyword(s)",
  "description": "文字列がソフトキーワードかどうかを返す。",
  "example": "import keyword\nprint(keyword.issoftkeyword('match'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/keyword.html",
  "returns": "bool"
 },
 {
  "name": "keyword.kwlist",
  "category": "キーワード",
  "syntax": "kwlist",
  "description": "Python のキーワード一覧（35件）。値は CPython 3.12.3 の実走で確定した。3.15 のドキュメントに一覧値の掲載がなく、追加の公式発表も確認できないため 3.12 の値を正とする。",
  "example": "import keyword\nprint('if' in keyword.kwlist, len(keyword.kwlist))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/keyword.html",
  "returns": "list[str]"
 },
 {
  "name": "keyword.softkwlist",
  "category": "キーワード",
  "syntax": "softkwlist",
  "description": "ソフトキーワード（match/case/type/_）の一覧。",
  "example": "import keyword\nprint(keyword.softkwlist)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/keyword.html",
  "returns": "list[str]"
 }
];
