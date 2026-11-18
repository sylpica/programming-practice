/* 高度モード B7 G3：string モジュールのリファレンス差分（全25件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 定数は CPython 3.12.3 実走の値を転記。
 */
export const referenceAdvanced = [
 {
  "name": "string.ascii_letters",
  "category": "標準ライブラリ",
  "syntax": "string.ascii_letters",
  "description": "小文字と大文字の英字すべてを含む文字列（ascii_lowercase + ascii_uppercase）。",
  "example": "import string\nprint(string.ascii_letters)",
  "caution": "ロケールに依存しない定数。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.ascii_letters"
 },
 {
  "name": "string.ascii_lowercase",
  "category": "標準ライブラリ",
  "syntax": "string.ascii_lowercase",
  "description": "小文字の英字 'abcdefghijklmnopqrstuvwxyz'。",
  "example": "import string\nprint(string.ascii_lowercase)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.ascii_lowercase"
 },
 {
  "name": "string.ascii_uppercase",
  "category": "標準ライブラリ",
  "syntax": "string.ascii_uppercase",
  "description": "大文字の英字 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'。",
  "example": "import string\nprint(string.ascii_uppercase)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.ascii_uppercase"
 },
 {
  "name": "string.digits",
  "category": "標準ライブラリ",
  "syntax": "string.digits",
  "description": "数字 '0123456789'。",
  "example": "import string\nprint(string.digits)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.digits"
 },
 {
  "name": "string.hexdigits",
  "category": "標準ライブラリ",
  "syntax": "string.hexdigits",
  "description": "16進数に使う文字 '0123456789abcdefABCDEF'。",
  "example": "import string\nprint(string.hexdigits)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.hexdigits"
 },
 {
  "name": "string.octdigits",
  "category": "標準ライブラリ",
  "syntax": "string.octdigits",
  "description": "8進数に使う文字 '01234567'。",
  "example": "import string\nprint(string.octdigits)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.octdigits"
 },
 {
  "name": "string.punctuation",
  "category": "標準ライブラリ",
  "syntax": "string.punctuation",
  "description": "ASCII の句読点・記号文字を集めた文字列。",
  "example": "import string\nprint(string.punctuation)",
  "caution": "C ロケールで句読点とされる32文字。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.punctuation"
 },
 {
  "name": "string.whitespace",
  "category": "標準ライブラリ",
  "syntax": "string.whitespace",
  "description": "空白とみなされる ASCII 文字（スペース、タブ、改行、復帰、垂直タブ、改ページ）。",
  "example": "import string\nprint(repr(string.whitespace))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.whitespace"
 },
 {
  "name": "string.printable",
  "category": "標準ライブラリ",
  "syntax": "string.printable",
  "description": "印刷可能とみなされる ASCII 文字（digits + ascii_letters + punctuation + whitespace）。",
  "example": "import string\nprint(len(string.printable))",
  "caution": "repr() の出力に使われる判定とは別物。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.printable"
 },
 {
  "name": "string.capwords",
  "category": "標準ライブラリ",
  "syntax": "string.capwords(s, sep=None)",
  "description": "各単語の先頭を大文字にし残りを小文字にして、空白でつなぎ直す。sep を与えるとその文字列で分割・結合する。",
  "example": "import string\nprint(string.capwords('hello world'))",
  "caution": "str.title() と違い、アポストロフィの後ろは大文字にならない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.capwords"
 },
 {
  "name": "string.Template",
  "category": "標準ライブラリ",
  "syntax": "string.Template(template)",
  "description": "$name 形式の置換を含むテンプレート文字列のクラス。substitute で辞書などから値を差し込む。",
  "example": "import string\nt = string.Template('$x and $y')\nprint(t.substitute(x=1, y=2))",
  "caution": "識別子の規則は idpattern 属性で変更できる（本アプリでは属性の代入は未対応のため、既定パターンのみ）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.Template"
 },
 {
  "name": "string.Template.template",
  "category": "標準ライブラリ",
  "syntax": "template.template",
  "description": "コンストラクタに渡されたテンプレート文字列そのもの。",
  "example": "import string\nprint(string.Template('abc').template)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.Template.template"
 },
 {
  "name": "string.Template.substitute",
  "category": "標準ライブラリ",
  "syntax": "template.substitute(mapping=(), /, **kwds)",
  "description": "テンプレート内の $name を mapping／キーワード引数の値で置換する。キーが無いと KeyError。",
  "example": "import string\nprint(string.Template('$x!').substitute({'x': 'hi'}))",
  "caution": "$$ はリテラルの $ になる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.Template.substitute"
 },
 {
  "name": "string.Template.safe_substitute",
  "category": "標準ライブラリ",
  "syntax": "template.safe_substitute(mapping=(), /, **kwds)",
  "description": "substitute と似るが、キーが無い場合は元の $name をそのまま残す。",
  "example": "import string\nprint(string.Template('$x $y').safe_substitute(x='A'))",
  "caution": "不正なプレースホルダもそのまま残る。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.Template.safe_substitute"
 },
 {
  "name": "string.Template.get_identifiers",
  "category": "標準ライブラリ",
  "syntax": "template.get_identifiers()",
  "description": "テンプレートに現れる識別子名のリストを、重複なし・出現順で返す。",
  "example": "import string\nprint(string.Template('$x and $y and $x').get_identifiers())",
  "caution": "不正なプレースホルダがあると ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.Template.get_identifiers"
 },
 {
  "name": "string.Template.is_valid",
  "category": "標準ライブラリ",
  "syntax": "template.is_valid()",
  "description": "テンプレートに不正なプレースホルダが無ければ True を返す。",
  "example": "import string\nprint(string.Template('$x $').is_valid(), string.Template('$x').is_valid())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.Template.is_valid"
 },
 {
  "name": "string.Formatter",
  "category": "標準ライブラリ",
  "syntax": "string.Formatter()",
  "description": "str.format と同じ書式指定ミニ言語を解釈するクラス。format / vformat / parse / get_field などを差し替えられる。",
  "example": "import string\nprint(string.Formatter().format('{0} + {1} = {2}', 1, 2, 3))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.Formatter"
 },
 {
  "name": "string.Formatter.format",
  "category": "標準ライブラリ",
  "syntax": "formatter.format(format_string, /, *args, **kwargs)",
  "description": "書式文字列を整形する。str.format と同じ結果になる。",
  "example": "import string\nprint(string.Formatter().format('{name} is {age}', name='Ann', age=7))",
  "caution": "基礎モードの str.format と共通のミニ言語実装に合わせている。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.Formatter.format"
 },
 {
  "name": "string.Formatter.vformat",
  "category": "標準ライブラリ",
  "syntax": "formatter.vformat(format_string, args, kwargs)",
  "description": "format の実体。位置引数をタプル、キーワード引数を辞書で受け取る。",
  "example": "import string\nprint(string.Formatter().vformat('{0}-{k}', ('a',), {'k': 'b'}))",
  "caution": "サブクラスが format を差し替える際の入口。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.Formatter.vformat"
 },
 {
  "name": "string.Formatter.parse",
  "category": "標準ライブラリ",
  "syntax": "formatter.parse(format_string)",
  "description": "(リテラル文字列, フィールド名, 書式仕様, 変換) のタプルを反復する。フィールドが無い部分はフィールド名が None。",
  "example": "import string\nprint(list(string.Formatter().parse('a{x}b{y:>3}')))",
  "caution": "書式仕様の中の入れ子フィールドは展開された形で現れる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.Formatter.parse"
 },
 {
  "name": "string.Formatter.get_field",
  "category": "標準ライブラリ",
  "syntax": "formatter.get_field(field_name, args, kwargs)",
  "description": "フィールド名（'0.x' や 'k[0]' など）を解決して (値, 使われたキー) を返す。",
  "example": "import string\nprint(string.Formatter().get_field('0', ('ab',), {}))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.Formatter.get_field"
 },
 {
  "name": "string.Formatter.get_value",
  "category": "標準ライブラリ",
  "syntax": "formatter.get_value(key, args, kwargs)",
  "description": "位置引数・キーワード引数からキーに対応する値を取り出す。",
  "example": "import string\nprint(string.Formatter().get_value('k', (), {'k': 42}))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.Formatter.get_value"
 },
 {
  "name": "string.Formatter.convert_field",
  "category": "標準ライブラリ",
  "syntax": "formatter.convert_field(value, conversion)",
  "description": "変換指定（'s'→str、'r'→repr、'a'→ascii）を値に適用する。",
  "example": "import string\nprint(string.Formatter().convert_field('x', 'r'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.Formatter.convert_field"
 },
 {
  "name": "string.Formatter.format_field",
  "category": "標準ライブラリ",
  "syntax": "formatter.format_field(value, format_spec)",
  "description": "値に書式仕様を適用する。組み込みの format(value, format_spec) と同じ。",
  "example": "import string\nprint(string.Formatter().format_field(3.14159, '.2f'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.Formatter.format_field"
 },
 {
  "name": "string.Formatter.check_unused_args",
  "category": "標準ライブラリ",
  "syntax": "formatter.check_unused_args(used_args, args, kwargs)",
  "description": "使われなかった引数があれば例外にするためのフック。既定では何もしない。",
  "example": "import string\nprint(string.Formatter().check_unused_args(set(), (), {}))",
  "caution": "既定の実装は常に None を返す。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/string.html#string.Formatter.check_unused_args"
 },
];
