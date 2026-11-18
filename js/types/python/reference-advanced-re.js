/* 高度モード B7 G3：re モジュールのリファレンス差分（全64件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * JS RegExp への翻訳で実装。翻訳できない構文は未対応エラーにし、意味差は報告書に列挙。
 */
export const referenceAdvanced = [
 {
  "name": "re.A",
  "category": "標準ライブラリ",
  "syntax": "re.A",
  "description": "ASCII フラグの別名。\\w \\s \\d などを ASCII の範囲だけでマッチさせる。値は 256。",
  "example": "import re\nprint(int(re.A))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.A"
 },
 {
  "name": "re.ASCII",
  "category": "標準ライブラリ",
  "syntax": "re.ASCII",
  "description": "\\w \\s \\d \\b などを ASCII の範囲だけでマッチさせるフラグ。値は 256。",
  "example": "import re\nprint(int(re.ASCII))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.ASCII"
 },
 {
  "name": "re.DEBUG",
  "category": "標準ライブラリ",
  "syntax": "re.DEBUG",
  "description": "コンパイル時に正規表現のデバッグ情報を表示するフラグ。値は 128。本アプリでは表示は行わない。",
  "example": "import re\nprint(int(re.DEBUG))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.DEBUG"
 },
 {
  "name": "re.DOTALL",
  "category": "標準ライブラリ",
  "syntax": "re.DOTALL",
  "description": ". が改行にもマッチするようにするフラグ。値は 16。",
  "example": "import re\nprint(int(re.DOTALL))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.DOTALL"
 },
 {
  "name": "re.I",
  "category": "標準ライブラリ",
  "syntax": "re.I",
  "description": "IGNORECASE フラグの別名。値は 2。",
  "example": "import re\nprint(int(re.I))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.I"
 },
 {
  "name": "re.IGNORECASE",
  "category": "標準ライブラリ",
  "syntax": "re.IGNORECASE",
  "description": "大文字小文字を区別せずにマッチさせるフラグ。値は 2。",
  "example": "import re\nprint(int(re.IGNORECASE))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.IGNORECASE"
 },
 {
  "name": "re.L",
  "category": "標準ライブラリ",
  "syntax": "re.L",
  "description": "LOCALE フラグの別名。値は 4。str パターンでは使えない。",
  "example": "import re\nprint(int(re.L))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.L"
 },
 {
  "name": "re.LOCALE",
  "category": "標準ライブラリ",
  "syntax": "re.LOCALE",
  "description": "\\w などをロケール依存にするフラグ。値は 4。bytes パターン専用で、str パターンに使うと ValueError。",
  "example": "import re\nprint(int(re.LOCALE))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.LOCALE"
 },
 {
  "name": "re.M",
  "category": "標準ライブラリ",
  "syntax": "re.M",
  "description": "MULTILINE フラグの別名。値は 8。",
  "example": "import re\nprint(int(re.M))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.M"
 },
 {
  "name": "re.MULTILINE",
  "category": "標準ライブラリ",
  "syntax": "re.MULTILINE",
  "description": "^ と $ が各行の先頭・末尾にもマッチするようにするフラグ。値は 8。",
  "example": "import re\nprint(int(re.MULTILINE))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.MULTILINE"
 },
 {
  "name": "re.S",
  "category": "標準ライブラリ",
  "syntax": "re.S",
  "description": "DOTALL フラグの別名。値は 16。",
  "example": "import re\nprint(int(re.S))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.S"
 },
 {
  "name": "re.U",
  "category": "標準ライブラリ",
  "syntax": "re.U",
  "description": "UNICODE フラグの別名。値は 32。str パターンでは既定で有効。",
  "example": "import re\nprint(int(re.U))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.U"
 },
 {
  "name": "re.UNICODE",
  "category": "標準ライブラリ",
  "syntax": "re.UNICODE",
  "description": "\\w \\s \\d \\b などを Unicode の性質でマッチさせるフラグ。値は 32。str パターンでは既定。",
  "example": "import re\nprint(int(re.UNICODE))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.UNICODE"
 },
 {
  "name": "re.VERBOSE",
  "category": "標準ライブラリ",
  "syntax": "re.VERBOSE",
  "description": "パターン中の空白とコメントを無視するフラグ。値は 64。",
  "example": "import re\nprint(int(re.VERBOSE))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.VERBOSE"
 },
 {
  "name": "re.X",
  "category": "標準ライブラリ",
  "syntax": "re.X",
  "description": "VERBOSE フラグの別名。値は 64。",
  "example": "import re\nprint(int(re.X))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.X"
 },
 {
  "name": "re.NOFLAG",
  "category": "標準ライブラリ",
  "syntax": "re.NOFLAG",
  "description": "フラグなしを表す 0。",
  "example": "import re\nprint(int(re.NOFLAG))",
  "caution": "フラグは | で組み合わせる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.NOFLAG"
 },
 {
  "name": "re.compile",
  "category": "標準ライブラリ",
  "syntax": "re.compile(pattern, flags=0)",
  "description": "正規表現パターンを Pattern オブジェクトにコンパイルする。繰り返し使う場合はこちらが速い。",
  "example": "import re\np = re.compile(r'\\d+')\nprint(p.search('ab12').group())",
  "caution": "不正なパターンは re.PatternError（ValueError のサブクラス）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.compile"
 },
 {
  "name": "re.match",
  "category": "標準ライブラリ",
  "syntax": "re.match(pattern, string, flags=0)",
  "description": "文字列の先頭でパターンがマッチするか調べ、Match オブジェクトか None を返す。",
  "example": "import re\nprint(re.match(r'\\d+', '123abc').group())",
  "caution": "先頭に固定される。途中から探すなら search。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.match"
 },
 {
  "name": "re.prefixmatch",
  "category": "標準ライブラリ",
  "syntax": "re.prefixmatch(pattern, string, flags=0)",
  "description": "re.match の別名（3.15 で追加）。文字列の先頭でマッチするか調べる。",
  "example": "import re\nprint(re.prefixmatch(r'\\d+', '123abc').group())",
  "caution": "match と完全に同じ。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.prefixmatch"
 },
 {
  "name": "re.search",
  "category": "標準ライブラリ",
  "syntax": "re.search(pattern, string, flags=0)",
  "description": "文字列のどこかでパターンが最初にマッチする位置を探し、Match オブジェクトか None を返す。",
  "example": "import re\nprint(re.search(r'\\d+', 'ab123').span())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.search"
 },
 {
  "name": "re.fullmatch",
  "category": "標準ライブラリ",
  "syntax": "re.fullmatch(pattern, string, flags=0)",
  "description": "文字列全体がパターンにマッチすれば Match オブジェクト、そうでなければ None を返す。",
  "example": "import re\nprint(re.fullmatch(r'\\d+', '123') is not None, re.fullmatch(r'\\d+', '12a'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.fullmatch"
 },
 {
  "name": "re.findall",
  "category": "標準ライブラリ",
  "syntax": "re.findall(pattern, string, flags=0)",
  "description": "重ならないマッチすべてをリストで返す。グループが1つならそのグループ、複数ならタプルのリスト。",
  "example": "import re\nprint(re.findall(r'\\d+', 'a1b22c333'))",
  "caution": "参加しなかったグループは空文字列になる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.findall"
 },
 {
  "name": "re.finditer",
  "category": "標準ライブラリ",
  "syntax": "re.finditer(pattern, string, flags=0)",
  "description": "重ならないマッチすべての Match オブジェクトを反復する。本アプリではリストを返す。",
  "example": "import re\nprint([m.span() for m in re.finditer(r'\\d+', 'a1b22')])",
  "caution": "本アプリではイテレータではなくリストで返す。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.finditer"
 },
 {
  "name": "re.split",
  "category": "標準ライブラリ",
  "syntax": "re.split(pattern, string, maxsplit=0, flags=0)",
  "description": "パターンのマッチ位置で文字列を分割したリストを返す。グループがあると区切り自体も要素に入る。",
  "example": "import re\nprint(re.split(r'\\s+', 'a b  c'))",
  "caution": "maxsplit=0 は無制限。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.split"
 },
 {
  "name": "re.sub",
  "category": "標準ライブラリ",
  "syntax": "re.sub(pattern, repl, string, count=0, flags=0)",
  "description": "パターンのマッチを repl で置換した文字列を返す。repl には \\1 や \\g<name> が使え、関数も渡せる。",
  "example": "import re\nprint(re.sub(r'\\d+', '#', 'a1b22'))",
  "caution": "count=0 は全部置換。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.sub"
 },
 {
  "name": "re.subn",
  "category": "標準ライブラリ",
  "syntax": "re.subn(pattern, repl, string, count=0, flags=0)",
  "description": "sub と同じ置換を行い、(新しい文字列, 置換回数) のタプルを返す。",
  "example": "import re\nprint(re.subn(r'\\d+', '#', 'a1b22'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.subn"
 },
 {
  "name": "re.escape",
  "category": "標準ライブラリ",
  "syntax": "re.escape(pattern)",
  "description": "パターン中の特殊文字をエスケープし、リテラルとしてマッチするパターンを返す。",
  "example": "import re\nprint(re.escape('a.b*c'))",
  "caution": "英数字と _ 以外がエスケープされる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.escape"
 },
 {
  "name": "re.purge",
  "category": "標準ライブラリ",
  "syntax": "re.purge()",
  "description": "正規表現キャッシュを消去する。本アプリではキャッシュを持たないため何もしない。",
  "example": "import re\nprint(re.purge())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.purge"
 },
 {
  "name": "re.RegexFlag",
  "category": "標準ライブラリ",
  "syntax": "re.RegexFlag",
  "description": "フラグ定数の列挙型（IntFlag）。re.IGNORECASE などの実体。",
  "example": "import re\nprint(int(re.RegexFlag.IGNORECASE))",
  "caution": "本アプリではフラグを整数として扱うため、RegexFlag の列挙体としての振る舞いは未検証。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.RegexFlag"
 },
 {
  "name": "re.PatternError",
  "category": "標準ライブラリ",
  "syntax": "re.PatternError",
  "description": "不正なパターンのときに送出される例外。ValueError のサブクラス。旧名 re.error の後継（3.13 で改名）。",
  "example": "import re\ntry:\n    re.compile('(')\nexcept ValueError as e:\n    print(type(e).__name__)",
  "caution": "msg、pattern、pos、lineno、colno 属性を持つ。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.PatternError"
 },
 {
  "name": "re.PatternError.msg",
  "category": "標準ライブラリ",
  "syntax": "error.msg",
  "description": "エラーメッセージ文字列。",
  "example": "import re\ntry:\n    re.compile('(')\nexcept re.PatternError as e:\n    print(e.msg)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.PatternError.msg"
 },
 {
  "name": "re.PatternError.pattern",
  "category": "標準ライブラリ",
  "syntax": "error.pattern",
  "description": "エラーになったパターン文字列。",
  "example": "import re\ntry:\n    re.compile('(')\nexcept re.PatternError as e:\n    print(e.pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.PatternError.pattern"
 },
 {
  "name": "re.PatternError.pos",
  "category": "標準ライブラリ",
  "syntax": "error.pos",
  "description": "パターン中のエラー位置（インデックス）。",
  "example": "import re\ntry:\n    re.compile('a**')\nexcept re.PatternError as e:\n    print(e.pos)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.PatternError.pos"
 },
 {
  "name": "re.PatternError.lineno",
  "category": "標準ライブラリ",
  "syntax": "error.lineno",
  "description": "エラー位置の行番号（pos から導出）。",
  "example": "import re\ntry:\n    re.compile('(')\nexcept re.PatternError as e:\n    print(e.lineno)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.PatternError.lineno"
 },
 {
  "name": "re.PatternError.colno",
  "category": "標準ライブラリ",
  "syntax": "error.colno",
  "description": "エラー位置の列番号（pos から導出）。",
  "example": "import re\ntry:\n    re.compile('(')\nexcept re.PatternError as e:\n    print(e.colno)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.PatternError.colno"
 },
 {
  "name": "re.Pattern",
  "category": "標準ライブラリ",
  "syntax": "re.Pattern",
  "description": "コンパイル済み正規表現の型。re.compile の返り値。match/search/fullmatch/findall/finditer/sub/subn/split を持つ。",
  "example": "import re\np = re.compile(r'\\w+')\nprint(p.match('abc').group())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Pattern"
 },
 {
  "name": "re.Pattern.pattern",
  "category": "標準ライブラリ",
  "syntax": "pattern.pattern",
  "description": "コンパイルに使ったパターン文字列。",
  "example": "import re\nprint(re.compile(r'\\d+').pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Pattern.pattern"
 },
 {
  "name": "re.Pattern.flags",
  "category": "標準ライブラリ",
  "syntax": "pattern.flags",
  "description": "コンパイル時のフラグ値。str パターンでは UNICODE(32) が既定で含まれる。",
  "example": "import re\nprint(re.compile(r'\\d+', re.I).flags, re.compile(r'\\d+').flags)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Pattern.flags"
 },
 {
  "name": "re.Pattern.groups",
  "category": "標準ライブラリ",
  "syntax": "pattern.groups",
  "description": "パターン中のキャプチャグループの数。",
  "example": "import re\nprint(re.compile(r'(a)(b)?').groups)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Pattern.groups"
 },
 {
  "name": "re.Pattern.groupindex",
  "category": "標準ライブラリ",
  "syntax": "pattern.groupindex",
  "description": "名前付きグループ名からグループ番号への辞書。",
  "example": "import re\nprint(re.compile(r'(?P<x>a)(b)').groupindex)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Pattern.groupindex"
 },
 {
  "name": "re.Pattern.match",
  "category": "標準ライブラリ",
  "syntax": "pattern.match(string[, pos[, endpos]])",
  "description": "pos から始めて、文字列の先頭（pos の位置）でマッチするか調べる。",
  "example": "import re\nprint(re.compile(r'\\d+').match('ab123', 2).group())",
  "caution": "^ は pos ではなく文字列の本当の先頭を指す。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Pattern.match"
 },
 {
  "name": "re.Pattern.prefixmatch",
  "category": "標準ライブラリ",
  "syntax": "pattern.prefixmatch(string[, pos[, endpos]])",
  "description": "pattern.match の別名（3.15 で追加）。",
  "example": "import re\nprint(re.compile(r'\\d+').prefixmatch('123').group())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Pattern.prefixmatch"
 },
 {
  "name": "re.Pattern.search",
  "category": "標準ライブラリ",
  "syntax": "pattern.search(string[, pos[, endpos]])",
  "description": "pos 以降で最初にマッチする位置を探す。",
  "example": "import re\nprint(re.compile(r'\\d+').search('ab123').span())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Pattern.search"
 },
 {
  "name": "re.Pattern.fullmatch",
  "category": "標準ライブラリ",
  "syntax": "pattern.fullmatch(string[, pos[, endpos]])",
  "description": "pos から endpos まで全体がマッチするか調べる。",
  "example": "import re\nprint(re.compile(r'\\d+').fullmatch('123') is not None)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Pattern.fullmatch"
 },
 {
  "name": "re.Pattern.findall",
  "category": "標準ライブラリ",
  "syntax": "pattern.findall(string[, pos[, endpos]])",
  "description": "重ならないマッチすべてをリストで返す。",
  "example": "import re\nprint(re.compile(r'(\\d)(\\d)?').findall('a12b3'))",
  "caution": "参加しなかったグループは空文字列になる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Pattern.findall"
 },
 {
  "name": "re.Pattern.finditer",
  "category": "標準ライブラリ",
  "syntax": "pattern.finditer(string[, pos[, endpos]])",
  "description": "重ならないマッチすべての Match オブジェクトを反復する。本アプリではリストを返す。",
  "example": "import re\nprint([m.group() for m in re.compile(r'\\d+').finditer('a1b22')])",
  "caution": "本アプリではイテレータではなくリストで返す。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Pattern.finditer"
 },
 {
  "name": "re.Pattern.split",
  "category": "標準ライブラリ",
  "syntax": "pattern.split(string, maxsplit=0)",
  "description": "マッチ位置で文字列を分割する。グループがあると区切りも要素に入る。",
  "example": "import re\nprint(re.compile(r'(\\W+)').split('Words, words, words.'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Pattern.split"
 },
 {
  "name": "re.Pattern.sub",
  "category": "標準ライブラリ",
  "syntax": "pattern.sub(repl, string, count=0)",
  "description": "マッチを repl で置換する。",
  "example": "import re\ndef dbl(m):\n    return str(int(m.group()) * 2)\nprint(re.compile(r'\\d+').sub(dbl, 'a1b22'))",
  "caution": "repl に関数を渡すと Match オブジェクトで呼ばれる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Pattern.sub"
 },
 {
  "name": "re.Pattern.subn",
  "category": "標準ライブラリ",
  "syntax": "pattern.subn(repl, string, count=0)",
  "description": "sub と同じ置換を行い (新しい文字列, 置換回数) を返す。",
  "example": "import re\nprint(re.compile(r'\\d+').subn('#', 'a1b22'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Pattern.subn"
 },
 {
  "name": "re.Match",
  "category": "標準ライブラリ",
  "syntax": "re.Match",
  "description": "マッチ結果の型。match/search などの返り値。group/groups/groupdict/span などで結果を取り出す。",
  "example": "import re\nm = re.search(r'(\\d+)', 'ab123')\nprint(m.group(1), m.span())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Match"
 },
 {
  "name": "re.Match.group",
  "category": "標準ライブラリ",
  "syntax": "match.group([group1, ...])",
  "description": "マッチした文字列（グループ番号・名前で部分文字列）を返す。引数なしは全体。複数引数ではタプル。",
  "example": "import re\nm = re.match(r'(?P<x>\\d+)-(\\d+)', '12-34')\nprint(m.group(), m.group(2), m.group('x'), m.group(1, 2))",
  "caution": "参加しなかったグループは None。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Match.group"
 },
 {
  "name": "re.Match.groups",
  "category": "標準ライブラリ",
  "syntax": "match.groups(default=None)",
  "description": "全グループのタプルを返す。参加しなかったグループは default。",
  "example": "import re\nprint(re.match(r'(\\d+)-(\\d+)?', '12-').groups())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Match.groups"
 },
 {
  "name": "re.Match.groupdict",
  "category": "標準ライブラリ",
  "syntax": "match.groupdict(default=None)",
  "description": "名前付きグループの辞書を返す。参加しなかったグループは default。",
  "example": "import re\nprint(re.match(r'(?P<x>\\d+)-(?P<y>\\d+)?', '12-').groupdict())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Match.groupdict"
 },
 {
  "name": "re.Match.start",
  "category": "標準ライブラリ",
  "syntax": "match.start([group])",
  "description": "グループのマッチ開始位置。参加しなかったグループは -1。",
  "example": "import re\nm = re.search(r'(\\d+)', 'ab123')\nprint(m.start(1), m.start())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Match.start"
 },
 {
  "name": "re.Match.end",
  "category": "標準ライブラリ",
  "syntax": "match.end([group])",
  "description": "グループのマッチ終了位置。参加しなかったグループは -1。",
  "example": "import re\nm = re.search(r'(\\d+)', 'ab123')\nprint(m.end(1), m.end())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Match.end"
 },
 {
  "name": "re.Match.span",
  "category": "標準ライブラリ",
  "syntax": "match.span([group])",
  "description": "(start, end) のタプルを返す。参加しなかったグループは (-1, -1)。",
  "example": "import re\nprint(re.search(r'(\\d+)', 'ab123').span(1))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Match.span"
 },
 {
  "name": "re.Match.expand",
  "category": "標準ライブラリ",
  "syntax": "match.expand(template)",
  "description": "\\1 や \\g<name> を含むテンプレートを展開する。",
  "example": "import re\nm = re.match(r'(?P<x>\\d+)-(\\d+)?', '12-')\nprint(repr(m.expand(r'\\2/\\g<x>')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Match.expand"
 },
 {
  "name": "re.Match.__getitem__",
  "category": "標準ライブラリ",
  "syntax": "match[group]",
  "description": "match.group(group) と同じ。m[0] は全体、m[1] 以降はグループ。",
  "example": "import re\nm = re.match(r'(\\d+)-(\\d+)', '12-34')\nprint(m[0], m[2])",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Match.__getitem__"
 },
 {
  "name": "re.Match.pos",
  "category": "標準ライブラリ",
  "syntax": "match.pos",
  "description": "match/search に渡された pos の値。",
  "example": "import re\nprint(re.compile(r'\\d+').search('ab12', 1).pos)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Match.pos"
 },
 {
  "name": "re.Match.endpos",
  "category": "標準ライブラリ",
  "syntax": "match.endpos",
  "description": "match/search に渡された endpos の値。省略時は文字列の長さ。",
  "example": "import re\nprint(re.search(r'\\d+', 'ab12').endpos)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Match.endpos"
 },
 {
  "name": "re.Match.string",
  "category": "標準ライブラリ",
  "syntax": "match.string",
  "description": "マッチ対象になった文字列そのもの。",
  "example": "import re\nprint(re.search(r'\\d+', 'ab12').string)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Match.string"
 },
 {
  "name": "re.Match.re",
  "category": "標準ライブラリ",
  "syntax": "match.re",
  "description": "このマッチを作った Pattern オブジェクト。",
  "example": "import re\nprint(re.search(r'\\d+', 'ab12').re.pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Match.re"
 },
 {
  "name": "re.Match.lastindex",
  "category": "標準ライブラリ",
  "syntax": "match.lastindex",
  "description": "最後にマッチしたキャプチャグループの番号。無ければ None。",
  "example": "import re\nprint(re.match(r'(?P<x>\\d+)-(\\d+)?', '12-').lastindex, re.match(r'(a)?', '').lastindex)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Match.lastindex"
 },
 {
  "name": "re.Match.lastgroup",
  "category": "標準ライブラリ",
  "syntax": "match.lastgroup",
  "description": "最後にマッチした名前付きグループの名前。無ければ None。",
  "example": "import re\nprint(re.match(r'(?P<x>\\d+)-(\\d+)?', '12-').lastgroup)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/re.html#re.Match.lastgroup"
 },
];
