/* 高度モード B7 G7: html.parser のリファレンス（正規形）。
* 状態（status）は実装の裁定結果。出典は公式ドキュメント 3.15 と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
 {
  "name": "html.parser.HTMLParser",
  "category": "HTML解析",
  "syntax": "class HTMLParser(*, convert_charrefs=True)",
  "description": "HTML を構文解析するクラス。本来は handle_* メソッドを上書きしたサブクラスで使う。この環境ではサブクラス化ができないため、既定ハンドラ（すべて何もしない）のもとでの状態遷移・getpos・get_starttag_text を再現する。",
  "example": "p = HTMLParser()\np.feed('<html>\\n<body>hi')\nprint(p.getpos())",
  "caution": "タグの内容を受け取る処理はサブクラス側の責務であり、この環境では再現できない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "クラス"
 },
 {
  "name": "html.parser.HTMLParser.close",
  "category": "HTML解析",
  "syntax": "close()",
  "description": "残りのデータを最後まで処理して解析を終える。",
  "example": "p = HTMLParser()\np.feed('<p>x')\np.close()\nprint(p.getpos())",
  "caution": "close 後に feed すると AssertionError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "None"
 },
 {
  "name": "html.parser.HTMLParser.feed",
  "category": "HTML解析",
  "syntax": "feed(data)",
  "description": "HTML データを供給して解析を進める。不完全なタグは次回の feed まで保持される。",
  "example": "p = HTMLParser()\np.feed('<p>x')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "None"
 },
 {
  "name": "html.parser.HTMLParser.get_starttag_text",
  "category": "HTML解析",
  "syntax": "get_starttag_text()",
  "description": "最も最近処理した開始タグの生文字列を返す。無ければ None。",
  "example": "p = HTMLParser()\np.feed('<body class=\"x\">')\nprint(p.get_starttag_text())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "str または None"
 },
 {
  "name": "html.parser.HTMLParser.getpos",
  "category": "HTML解析",
  "syntax": "getpos()",
  "description": "現在の解析位置 (行番号, 列オフセット) を返す。行は1始まり、列は0始まり。",
  "example": "p = HTMLParser()\np.feed('<html>\\n<body>hi')\nprint(p.getpos())",
  "caution": "CPython 実走（(2, 8)）と照合済み。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "tuple: (lineno, offset)"
 },
 {
  "name": "html.parser.HTMLParser.handle_charref",
  "category": "HTML解析",
  "syntax": "handle_charref(name)",
  "description": "数値文字参照のコールバック（convert_charrefs=False のとき）。既定実装は何もしない。",
  "example": "p = HTMLParser()\np.handle_charref('65')",
  "caution": "上書きはこの環境ではできない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "None"
 },
 {
  "name": "html.parser.HTMLParser.handle_comment",
  "category": "HTML解析",
  "syntax": "handle_comment(data)",
  "description": "コメントのコールバック。既定実装は何もしない。",
  "example": "p = HTMLParser()\np.handle_comment('x')",
  "caution": "上書きはこの環境ではできない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "None"
 },
 {
  "name": "html.parser.HTMLParser.handle_data",
  "category": "HTML解析",
  "syntax": "handle_data(data)",
  "description": "テキスト内容のコールバック。既定実装は何もしない。",
  "example": "p = HTMLParser()\np.handle_data('x')",
  "caution": "上書きはこの環境ではできない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "None"
 },
 {
  "name": "html.parser.HTMLParser.handle_decl",
  "category": "HTML解析",
  "syntax": "handle_decl(decl)",
  "description": "DOCTYPE 等の宣言のコールバック。既定実装は何もしない。",
  "example": "p = HTMLParser()\np.handle_decl('DOCTYPE html')",
  "caution": "上書きはこの環境ではできない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "None"
 },
 {
  "name": "html.parser.HTMLParser.handle_endtag",
  "category": "HTML解析",
  "syntax": "handle_endtag(tag)",
  "description": "終了タグのコールバック。既定実装は何もしない。",
  "example": "p = HTMLParser()\np.handle_endtag('p')",
  "caution": "上書きはこの環境ではできない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "None"
 },
 {
  "name": "html.parser.HTMLParser.handle_entityref",
  "category": "HTML解析",
  "syntax": "handle_entityref(name)",
  "description": "実体参照のコールバック（convert_charrefs=False のとき）。既定実装は何もしない。",
  "example": "p = HTMLParser()\np.handle_entityref('amp')",
  "caution": "上書きはこの環境ではできない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "None"
 },
 {
  "name": "html.parser.HTMLParser.handle_pi",
  "category": "HTML解析",
  "syntax": "handle_pi(data)",
  "description": "処理命令のコールバック。既定実装は何もしない。",
  "example": "p = HTMLParser()\np.handle_pi('x')",
  "caution": "上書きはこの環境ではできない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "None"
 },
 {
  "name": "html.parser.HTMLParser.handle_startendtag",
  "category": "HTML解析",
  "syntax": "handle_startendtag(tag, attrs)",
  "description": "自己終了タグのコールバック。既定では handle_starttag と handle_endtag を続けて呼ぶ（どちらも既定では何もしない）。",
  "example": "p = HTMLParser()\np.handle_startendtag('br', [])",
  "caution": "上書きはこの環境ではできない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "None"
 },
 {
  "name": "html.parser.HTMLParser.handle_starttag",
  "category": "HTML解析",
  "syntax": "handle_starttag(tag, attrs)",
  "description": "開始タグが見つかるたびに呼ばれるコールバック。既定実装は何もしない。",
  "example": "p = HTMLParser()\np.handle_starttag('p', [])",
  "caution": "この環境ではサブクラスによる上書きができないため、既定の何もしない実装のみが動作する。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "None"
 },
 {
  "name": "html.parser.HTMLParser.reset",
  "category": "HTML解析",
  "syntax": "reset()",
  "description": "解析状態を初期化する（位置は (1, 0) に戻る）。",
  "example": "p = HTMLParser()\np.feed('<p>')\np.reset()\nprint(p.getpos())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "None"
 },
 {
  "name": "html.parser.HTMLParser.unknown_decl",
  "category": "HTML解析",
  "syntax": "unknown_decl(data)",
  "description": "未知の宣言のコールバック。既定実装は何もしない（CPython 実走で確認）。",
  "example": "p = HTMLParser()\np.unknown_decl('x')",
  "caution": "上書きはこの環境ではできない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/html.parser.html",
  "returns": "None"
 }
];
