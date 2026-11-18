/* 高度モード B7 G3：shlex モジュールのリファレンス差分（全26件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 字句解析の状態機械は CPython 3.12 の shlex.py を移植。入力は文字列のみ。
 */
export const referenceAdvanced = [
 {
  "name": "shlex.split",
  "category": "標準ライブラリ",
  "syntax": "shlex.split(s, comments=False, posix=True)",
  "description": "シェルの単語分割規則で文字列 s をトークンのリストに分ける。",
  "example": "import shlex\nprint(shlex.split('a \"b c\" d'))",
  "caution": "引用符の対応が取れていないと ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.split"
 },
 {
  "name": "shlex.join",
  "category": "標準ライブラリ",
  "syntax": "shlex.join(split_command)",
  "description": "トークンのリストを、シェルで安全に使える1つの文字列に結合する（split の逆）。",
  "example": "import shlex\nprint(shlex.join(['a', 'b c']))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.join"
 },
 {
  "name": "shlex.quote",
  "category": "標準ライブラリ",
  "syntax": "shlex.quote(s)",
  "description": "文字列 s をシェルで安全な形にクォートする。安全な文字だけならそのまま返す。",
  "example": "import shlex\nprint(shlex.quote('a b'), shlex.quote('abc'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.quote"
 },
 {
  "name": "shlex.shlex",
  "category": "標準ライブラリ",
  "syntax": "shlex.shlex(instream=None, infile=None, posix=False, punctuation_chars=False)",
  "description": "シェル風の字句解析器。本アプリでは入力は文字列ソースのみ対象（ファイルは無いため）。",
  "example": "import shlex\nlx = shlex.shlex('a b', posix=True)\nprint(list(lx))",
  "caution": "instream に文字列を渡す。ファイルオブジェクトは未対応。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex"
 },
 {
  "name": "shlex.shlex.get_token",
  "category": "標準ライブラリ",
  "syntax": "lexer.get_token()",
  "description": "次のトークンを返す。push_token で積まれたものがあればそれを先に返す。終わりでは eof を返す。",
  "example": "import shlex\nlx = shlex.shlex('a b', posix=True)\nprint(lx.get_token(), lx.get_token())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.get_token"
 },
 {
  "name": "shlex.shlex.read_token",
  "category": "標準ライブラリ",
  "syntax": "lexer.read_token()",
  "description": "入力から次のトークンを読み取って返す。終わりでは eof（posix では空文字列、非 posix では None）を返す。",
  "example": "import shlex\nlx = shlex.shlex('a', posix=True)\nprint(repr(lx.read_token()), repr(lx.read_token()))",
  "caution": "引用符が閉じていないと ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.read_token"
 },
 {
  "name": "shlex.shlex.push_token",
  "category": "標準ライブラリ",
  "syntax": "lexer.push_token(tok)",
  "description": "トークンをスタックに積む。次の get_token でそれが返る。",
  "example": "import shlex\nlx = shlex.shlex('a', posix=True)\nlx.push_token('zz')\nprint(lx.get_token())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.push_token"
 },
 {
  "name": "shlex.shlex.push_source",
  "category": "標準ライブラリ",
  "syntax": "lexer.push_source(newstream, newfile=None)",
  "description": "新しい入力ソースを積む。本アプリでは文字列ソースのみ。",
  "example": "import shlex\nlx = shlex.shlex('a ', posix=True)\nlx.push_source('b')\nprint(list(lx))",
  "caution": "ファイル名からの読み込みは未対応。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.push_source"
 },
 {
  "name": "shlex.shlex.pop_source",
  "category": "標準ライブラリ",
  "syntax": "lexer.pop_source()",
  "description": "積まれていた入力ソースを取り除き、元のソースに戻る。",
  "example": "import shlex\nlx = shlex.shlex('a b', posix=True)\nlx.push_source('c')\nprint(lx.get_token())\nlx.pop_source()\nprint(lx.get_token())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.pop_source"
 },
 {
  "name": "shlex.shlex.sourcehook",
  "category": "標準ライブラリ",
  "syntax": "lexer.sourcehook(filename)",
  "description": "source 文で指定されたファイルを開くフック。",
  "example": "import shlex\nlx = shlex.shlex('a', posix=True)\nprint(lx.sourcehook('x'))",
  "caution": "本アプリにはファイルが無いため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.sourcehook"
 },
 {
  "name": "shlex.shlex.error_leader",
  "category": "標準ライブラリ",
  "syntax": "lexer.error_leader(infile=None, lineno=None)",
  "description": "エラーメッセージの接頭辞（'ファイル名, line N: ' の形）を返す。",
  "example": "import shlex\nlx = shlex.shlex('a', infile='f.txt', posix=True)\nprint(repr(lx.error_leader()))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.error_leader"
 },
 {
  "name": "shlex.shlex.infile",
  "category": "標準ライブラリ",
  "syntax": "lexer.infile",
  "description": "入力ファイルの名前。コンストラクタの infile 引数。",
  "example": "import shlex\nprint(shlex.shlex('a', infile='f.txt').infile)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.infile"
 },
 {
  "name": "shlex.shlex.instream",
  "category": "標準ライブラリ",
  "syntax": "lexer.instream",
  "description": "入力ストリーム。本アプリでは入力した文字列そのものを返す近似。",
  "example": "import shlex\nprint(shlex.shlex('a b').instream)",
  "caution": "CPython ではファイルオブジェクトが入る。本アプリでは文字列を返すため未検証。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.instream"
 },
 {
  "name": "shlex.shlex.lineno",
  "category": "標準ライブラリ",
  "syntax": "lexer.lineno",
  "description": "現在読んでいる行番号（1始まり）。",
  "example": "import shlex\nlx = shlex.shlex('a\\nb', posix=True)\nlx.get_token()\nprint(lx.lineno)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.lineno"
 },
 {
  "name": "shlex.shlex.token",
  "category": "標準ライブラリ",
  "syntax": "lexer.token",
  "description": "直近に読み取ったトークンのバッファ。",
  "example": "import shlex\nlx = shlex.shlex('ab', posix=True)\nlx.get_token()\nprint(repr(lx.token))",
  "caution": "get_token の後は空文字列に戻る。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.token"
 },
 {
  "name": "shlex.shlex.eof",
  "category": "標準ライブラリ",
  "syntax": "lexer.eof",
  "description": "入力の終わりを表す値。posix では空文字列、非 posix では None。",
  "example": "import shlex\nprint(repr(shlex.shlex('', posix=True).eof), repr(shlex.shlex('').eof))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.eof"
 },
 {
  "name": "shlex.shlex.commenters",
  "category": "標準ライブラリ",
  "syntax": "lexer.commenters",
  "description": "コメント開始文字の文字列。デフォルトは '#'。",
  "example": "import shlex\nprint(repr(shlex.shlex('a').commenters))",
  "caution": "属性への代入は本アプリのエンジンでは未対応（読み取りのみ）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.commenters"
 },
 {
  "name": "shlex.shlex.wordchars",
  "category": "標準ライブラリ",
  "syntax": "lexer.wordchars",
  "description": "単語を構成する文字の集合。デフォルトは英数字と '_' など。",
  "example": "import shlex\nprint(shlex.shlex('a', posix=True).wordchars)",
  "caution": "属性への代入は本アプリのエンジンでは未対応（読み取りのみ）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.wordchars"
 },
 {
  "name": "shlex.shlex.whitespace",
  "category": "標準ライブラリ",
  "syntax": "lexer.whitespace",
  "description": "トークンの区切りになる空白文字の文字列。デフォルトは ' \\t\\r\\n'。",
  "example": "import shlex\nprint(repr(shlex.shlex('a').whitespace))",
  "caution": "属性への代入は本アプリのエンジンでは未対応（読み取りのみ）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.whitespace"
 },
 {
  "name": "shlex.shlex.whitespace_split",
  "category": "標準ライブラリ",
  "syntax": "lexer.whitespace_split",
  "description": "True なら空白だけで分割する（単語文字の概念を使わない）。デフォルトは False。",
  "example": "import shlex\nprint(shlex.shlex('a').whitespace_split)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.whitespace_split"
 },
 {
  "name": "shlex.shlex.quotes",
  "category": "標準ライブラリ",
  "syntax": "lexer.quotes",
  "description": "引用符として扱う文字。デフォルトは '\\'\"'。",
  "example": "import shlex\nprint(repr(shlex.shlex('a').quotes))",
  "caution": "属性への代入は本アプリのエンジンでは未対応（読み取りのみ）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.quotes"
 },
 {
  "name": "shlex.shlex.escape",
  "category": "標準ライブラリ",
  "syntax": "lexer.escape",
  "description": "エスケープ文字。posix ではデフォルト '\\'、非 posix では空文字列。",
  "example": "import shlex\nprint(repr(shlex.shlex('a', posix=True).escape), repr(shlex.shlex('a').escape))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.escape"
 },
 {
  "name": "shlex.shlex.escapedquotes",
  "category": "標準ライブラリ",
  "syntax": "lexer.escapedquotes",
  "description": "エスケープで引用符自体を書ける引用符の集合。posix ではデフォルト '\\\"'。",
  "example": "import shlex\nprint(repr(shlex.shlex('a', posix=True).escapedquotes))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.escapedquotes"
 },
 {
  "name": "shlex.shlex.punctuation_chars",
  "category": "標準ライブラリ",
  "syntax": "lexer.punctuation_chars",
  "description": "句読点トークンとして扱う文字。デフォルトは空文字列（無効）。",
  "example": "import shlex\nprint(repr(shlex.shlex('a').punctuation_chars))",
  "caution": "コンストラクタで punctuation_chars=True や文字列を与えると有効になる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.punctuation_chars"
 },
 {
  "name": "shlex.shlex.source",
  "category": "標準ライブラリ",
  "syntax": "lexer.source",
  "description": "source 文で使うキーワード。デフォルトは None（無効）。",
  "example": "import shlex\nprint(shlex.shlex('a').source)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.source"
 },
 {
  "name": "shlex.shlex.debug",
  "category": "標準ライブラリ",
  "syntax": "lexer.debug",
  "description": "デバッグレベル。0 より大きいと解析の進行が標準エラーに出力される。デフォルトは 0。",
  "example": "import shlex\nprint(shlex.shlex('a').debug)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/shlex.html#shlex.shlex.debug"
 },
];
