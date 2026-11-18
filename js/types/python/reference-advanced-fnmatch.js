/* 高度モード B7 G3：fnmatch モジュールのリファレンス差分（全5件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * fnmatch は CPython 3.12 の translate アルゴリズムを移植。
 */
export const referenceAdvanced = [
 {
  "name": "fnmatch.fnmatch",
  "category": "標準ライブラリ",
  "syntax": "fnmatch.fnmatch(name, pat)",
  "description": "name がパターン pat にマッチするか返す。照合は os.path.normcase を通すため、プラットフォーム依存の大文字小文字の扱いになる（POSIX では大文字小文字を区別する）。",
  "example": "import fnmatch\nprint(fnmatch.fnmatch('foo.txt', '*.txt'))",
  "caution": "大文字小文字を区別したい場合は fnmatchcase を使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fnmatch.html#fnmatch.fnmatch"
 },
 {
  "name": "fnmatch.fnmatchcase",
  "category": "標準ライブラリ",
  "syntax": "fnmatch.fnmatchcase(name, pat)",
  "description": "name がパターン pat にマッチするか返す。normcase を通さないため、大文字小文字をそのまま区別する。",
  "example": "import fnmatch\nprint(fnmatch.fnmatchcase('Foo.txt', '*.txt'), fnmatch.fnmatchcase('Foo.txt', 'f*'))",
  "caution": "translate の結果を使うため高速に繰り返し照合したい場合は re を直接使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fnmatch.html#fnmatch.fnmatchcase"
 },
 {
  "name": "fnmatch.filter",
  "category": "標準ライブラリ",
  "syntax": "fnmatch.filter(names, pat)",
  "description": "文字列のリスト names のうち、パターン pat にマッチするものだけのリストを返す。",
  "example": "import fnmatch\nprint(fnmatch.filter(['a.py', 'b.txt', 'c.py'], '*.py'))",
  "caution": "fnmatchcase と同じく大文字小文字を区別する（内部で _compile_pattern を使う）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fnmatch.html#fnmatch.filter"
 },
 {
  "name": "fnmatch.filterfalse",
  "category": "標準ライブラリ",
  "syntax": "fnmatch.filterfalse(names, pat)",
  "description": "文字列のリスト names のうち、パターン pat にマッチしないものだけのリストを返す（3.14 で追加）。",
  "example": "import fnmatch\nprint(fnmatch.filterfalse(['a.py', 'b.txt', 'c.py'], '*.py'))",
  "caution": "filter の補集合版。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fnmatch.html#fnmatch.filterfalse"
 },
 {
  "name": "fnmatch.translate",
  "category": "標準ライブラリ",
  "syntax": "fnmatch.translate(pat)",
  "description": "シェル形式のパターン pat を正規表現の文字列に変換して返す。re モジュールでそのまま使える。",
  "example": "import fnmatch\nprint(fnmatch.translate('*.txt'))",
  "caution": "返り値は (?s:...)\\Z の形。バージョンにより細部が変わる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fnmatch.html#fnmatch.translate"
 },
];
