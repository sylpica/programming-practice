/* 高度モード B7 G3：textwrap モジュールのリファレンス差分（全20件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 折り返しアルゴリズムは CPython 3.12 の textwrap.py を移植。
 */
export const referenceAdvanced = [
 {
  "name": "textwrap.TextWrapper",
  "category": "標準ライブラリ",
  "syntax": "textwrap.TextWrapper(width=70, **kwargs)",
  "description": "テキストを折り返すためのクラス。コンストラクタ引数で同名の属性を初期化できる。wrap() で行のリスト、fill() で改行入りの文字列を返す。",
  "example": "import textwrap\nw = textwrap.TextWrapper(width=10)\nprint(w.wrap('hello world foo'))",
  "caution": "属性は読み取り専用として扱う（代入による変更は本アプリのエンジンでは未対応）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.TextWrapper"
 },
 {
  "name": "textwrap.TextWrapper.width",
  "category": "標準ライブラリ",
  "syntax": "wrapper.width",
  "description": "各行の最大幅（文字数）。デフォルトは 70。",
  "example": "import textwrap\nprint(textwrap.TextWrapper().width)",
  "caution": "コンストラクタ引数 width で変更する。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.TextWrapper.width"
 },
 {
  "name": "textwrap.TextWrapper.expand_tabs",
  "category": "標準ライブラリ",
  "syntax": "wrapper.expand_tabs",
  "description": "True（デフォルト）ならタブを空白に展開してから折り返す。tabsize 属性が展開幅を決める。",
  "example": "import textwrap\nprint(textwrap.TextWrapper().expand_tabs)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.TextWrapper.expand_tabs"
 },
 {
  "name": "textwrap.TextWrapper.tabsize",
  "category": "標準ライブラリ",
  "syntax": "wrapper.tabsize",
  "description": "タブ展開の幅。デフォルトは 8。expand_tabs が True のとき使われる。",
  "example": "import textwrap\nprint(textwrap.TextWrapper().tabsize)",
  "caution": "textwrap 3.13 以降の属性（旧来は expand_tabs の内部処理）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.TextWrapper.tabsize"
 },
 {
  "name": "textwrap.TextWrapper.replace_whitespace",
  "category": "標準ライブラリ",
  "syntax": "wrapper.replace_whitespace",
  "description": "True（デフォルト）ならタブ・改行などの空白文字を半角スペースに置換してから折り返す。",
  "example": "import textwrap\nprint(textwrap.TextWrapper().replace_whitespace)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.TextWrapper.replace_whitespace"
 },
 {
  "name": "textwrap.TextWrapper.drop_whitespace",
  "category": "標準ライブラリ",
  "syntax": "wrapper.drop_whitespace",
  "description": "True（デフォルト）なら行頭・行末の空白を取り除く。",
  "example": "import textwrap\nprint(textwrap.TextWrapper().drop_whitespace)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.TextWrapper.drop_whitespace"
 },
 {
  "name": "textwrap.TextWrapper.initial_indent",
  "category": "標準ライブラリ",
  "syntax": "wrapper.initial_indent",
  "description": "最初の行の先頭に付ける文字列。デフォルトは空文字列。",
  "example": "import textwrap\nw = textwrap.TextWrapper(width=8, initial_indent='>> ')\nprint(w.wrap('aa bb cc'))",
  "caution": "インデントの分だけ本文の使える幅が狭くなる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.TextWrapper.initial_indent"
 },
 {
  "name": "textwrap.TextWrapper.subsequent_indent",
  "category": "標準ライブラリ",
  "syntax": "wrapper.subsequent_indent",
  "description": "2行目以降の先頭に付ける文字列。デフォルトは空文字列。",
  "example": "import textwrap\nw = textwrap.TextWrapper(width=8, subsequent_indent='.. ')\nprint(w.wrap('aa bb cc'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.TextWrapper.subsequent_indent"
 },
 {
  "name": "textwrap.TextWrapper.fix_sentence_endings",
  "category": "標準ライブラリ",
  "syntax": "wrapper.fix_sentence_endings",
  "description": "True なら文末のピリオド等の後に空白を2つにする。デフォルトは False。",
  "example": "import textwrap\nprint(textwrap.TextWrapper().fix_sentence_endings)",
  "caution": "文末判定は英字の文を前提にした単純な規則。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.TextWrapper.fix_sentence_endings"
 },
 {
  "name": "textwrap.TextWrapper.break_long_words",
  "category": "標準ライブラリ",
  "syntax": "wrapper.break_long_words",
  "description": "True（デフォルト）なら行幅より長い単語を途中で分割する。",
  "example": "import textwrap\nprint(textwrap.TextWrapper().break_long_words)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.TextWrapper.break_long_words"
 },
 {
  "name": "textwrap.TextWrapper.break_on_hyphens",
  "category": "標準ライブラリ",
  "syntax": "wrapper.break_on_hyphens",
  "description": "True（デフォルト）ならハイフンの直後でも分割できる。",
  "example": "import textwrap\nprint(textwrap.TextWrapper().break_on_hyphens)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.TextWrapper.break_on_hyphens"
 },
 {
  "name": "textwrap.TextWrapper.max_lines",
  "category": "標準ライブラリ",
  "syntax": "wrapper.max_lines",
  "description": "出力する最大行数。None（デフォルト）なら無制限。超える場合は placeholder で切り詰める。",
  "example": "import textwrap\nprint(textwrap.TextWrapper().max_lines)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.TextWrapper.max_lines"
 },
 {
  "name": "textwrap.TextWrapper.placeholder",
  "category": "標準ライブラリ",
  "syntax": "wrapper.placeholder",
  "description": "max_lines で切り詰めるとき末尾に付ける文字列。デフォルトは ' [...] '。",
  "example": "import textwrap\nprint(repr(textwrap.TextWrapper().placeholder))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.TextWrapper.placeholder"
 },
 {
  "name": "textwrap.TextWrapper.wrap",
  "category": "標準ライブラリ",
  "syntax": "wrapper.wrap(text)",
  "description": "text を折り返して行のリストを返す。",
  "example": "import textwrap\nprint(textwrap.TextWrapper(width=10).wrap('hello world foo'))",
  "caution": "空文字列には空リストを返す。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.TextWrapper.wrap"
 },
 {
  "name": "textwrap.TextWrapper.fill",
  "category": "標準ライブラリ",
  "syntax": "wrapper.fill(text)",
  "description": "text を折り返して改行でつないだ文字列を返す。wrap() の結果を '\\n'.join したもの。",
  "example": "import textwrap\nprint(repr(textwrap.TextWrapper(width=10).fill('hello world foo')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.TextWrapper.fill"
 },
 {
  "name": "textwrap.wrap",
  "category": "標準ライブラリ",
  "syntax": "textwrap.wrap(text, width=70, **kwargs)",
  "description": "TextWrapper(width=width, **kwargs).wrap(text) のショートカット。",
  "example": "import textwrap\nprint(textwrap.wrap('hello world foo', width=10))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.wrap"
 },
 {
  "name": "textwrap.fill",
  "category": "標準ライブラリ",
  "syntax": "textwrap.fill(text, width=70, **kwargs)",
  "description": "TextWrapper(width=width, **kwargs).fill(text) のショートカット。",
  "example": "import textwrap\nprint(repr(textwrap.fill('hello world foo', width=10)))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.fill"
 },
 {
  "name": "textwrap.shorten",
  "category": "標準ライブラリ",
  "syntax": "textwrap.shorten(text, width, **kwargs)",
  "description": "text を width 以内に切り詰める。単語の途中で切らず、末尾に placeholder（デフォルト ' [...]'）を付ける。",
  "example": "import textwrap\nprint(textwrap.shorten('Hello world, how are you?', width=12))",
  "caution": "placeholder より width が小さいと ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.shorten"
 },
 {
  "name": "textwrap.dedent",
  "category": "標準ライブラリ",
  "syntax": "textwrap.dedent(text)",
  "description": "複数行テキストの各行に共通する行頭の空白を取り除く。",
  "example": "import textwrap\nprint(repr(textwrap.dedent('  a\\n  b\\n')))",
  "caution": "空白だけの行は無視して共通接頭辞を求める。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.dedent"
 },
 {
  "name": "textwrap.indent",
  "category": "標準ライブラリ",
  "syntax": "textwrap.indent(text, prefix, predicate=None)",
  "description": "text の各行の先頭に prefix を付ける。predicate が与えられれば、それが真を返す行だけに付ける。",
  "example": "import textwrap\nprint(repr(textwrap.indent('a\\nb\\n', '> ')))",
  "caution": "デフォルトでは空でない行すべてに付ける。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/textwrap.html#textwrap.indent"
 },
];
