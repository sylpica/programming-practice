/* 高度モード B7 G4 リファレンス：reprlib（正規形）
 * 出典は各項目の source（公式ドキュメント 3.15）。status は実装の裏付け状態。
 * expected（期待出力）はここには置かず、テストファイルのケース表で保持する。 */
export const referenceAdvanced = [
  {
   "name": "reprlib.Repr",
   "category": "標準ライブラリ",
   "syntax": "class Repr()",
   "description": "切り詰め規則を持つ repr 生成器。属性で各上限を調整する（このエンジンでは属性の読み取りのみ再現し、変更はできない）。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.repr([0, 1, 2, 3, 4, 5, 6]))",
   "status": "supported",
   "caution": "属性への代入はエンジンの制約で再現できない。",
   "returns": "Repr",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr"
  },
  {
   "name": "reprlib.Repr.fillvalue",
   "category": "標準ライブラリ",
   "syntax": "Repr.fillvalue",
   "description": "切り詰め時に置く文字列（既定は '...'）。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.fillvalue)",
   "status": "supported",
   "caution": "このエンジンではネイティブ値への属性代入ができないため、属性の変更（r.maxlevel = 2 のような使い方）は再現できない。読み取りのみ再現する。",
   "returns": "str",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr.fillvalue"
  },
  {
   "name": "reprlib.Repr.indent",
   "category": "標準ライブラリ",
   "syntax": "Repr.indent",
   "description": "辞書・集合などのインデント量（既定は None）。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.indent)",
   "status": "supported",
   "caution": "このエンジンではネイティブ値への属性代入ができないため、属性の変更（r.maxlevel = 2 のような使い方）は再現できない。読み取りのみ再現する。",
   "returns": "object",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr.indent"
  },
  {
   "name": "reprlib.Repr.maxarray",
   "category": "標準ライブラリ",
   "syntax": "Repr.maxarray",
   "description": "array の要素数の上限（既定は 5）。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.maxarray)",
   "status": "supported",
   "caution": "このエンジンではネイティブ値への属性代入ができないため、属性の変更（r.maxlevel = 2 のような使い方）は再現できない。読み取りのみ再現する。",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr.maxarray"
  },
  {
   "name": "reprlib.Repr.maxdeque",
   "category": "標準ライブラリ",
   "syntax": "Repr.maxdeque",
   "description": "deque の要素数の上限（既定は 6）。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.maxdeque)",
   "status": "supported",
   "caution": "このエンジンではネイティブ値への属性代入ができないため、属性の変更（r.maxlevel = 2 のような使い方）は再現できない。読み取りのみ再現する。",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr.maxdeque"
  },
  {
   "name": "reprlib.Repr.maxdict",
   "category": "標準ライブラリ",
   "syntax": "Repr.maxdict",
   "description": "辞書の要素数の上限（既定は 4）。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.maxdict)",
   "status": "supported",
   "caution": "このエンジンではネイティブ値への属性代入ができないため、属性の変更（r.maxlevel = 2 のような使い方）は再現できない。読み取りのみ再現する。",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr.maxdict"
  },
  {
   "name": "reprlib.Repr.maxfrozenset",
   "category": "標準ライブラリ",
   "syntax": "Repr.maxfrozenset",
   "description": "frozenset の要素数の上限（既定は 6）。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.maxfrozenset)",
   "status": "supported",
   "caution": "このエンジンではネイティブ値への属性代入ができないため、属性の変更（r.maxlevel = 2 のような使い方）は再現できない。読み取りのみ再現する。",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr.maxfrozenset"
  },
  {
   "name": "reprlib.Repr.maxlevel",
   "category": "標準ライブラリ",
   "syntax": "Repr.maxlevel",
   "description": "入れ子の深さの上限（既定は 6）。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.maxlevel)",
   "status": "supported",
   "caution": "このエンジンではネイティブ値への属性代入ができないため、属性の変更（r.maxlevel = 2 のような使い方）は再現できない。読み取りのみ再現する。",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr.maxlevel"
  },
  {
   "name": "reprlib.Repr.maxlist",
   "category": "標準ライブラリ",
   "syntax": "Repr.maxlist",
   "description": "リストの要素数の上限（既定は 6）。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.maxlist)",
   "status": "supported",
   "caution": "このエンジンではネイティブ値への属性代入ができないため、属性の変更（r.maxlevel = 2 のような使い方）は再現できない。読み取りのみ再現する。",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr.maxlist"
  },
  {
   "name": "reprlib.Repr.maxlong",
   "category": "標準ライブラリ",
   "syntax": "Repr.maxlong",
   "description": "整数の桁数の上限（既定は 40）。超えると中央を ... で切り詰める。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.maxlong)",
   "status": "supported",
   "caution": "このエンジンではネイティブ値への属性代入ができないため、属性の変更（r.maxlevel = 2 のような使い方）は再現できない。読み取りのみ再現する。",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr.maxlong"
  },
  {
   "name": "reprlib.Repr.maxother",
   "category": "標準ライブラリ",
   "syntax": "Repr.maxother",
   "description": "その他のオブジェクトの repr の長さの上限（既定は 30）。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.maxother)",
   "status": "supported",
   "caution": "このエンジンではネイティブ値への属性代入ができないため、属性の変更（r.maxlevel = 2 のような使い方）は再現できない。読み取りのみ再現する。",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr.maxother"
  },
  {
   "name": "reprlib.Repr.maxset",
   "category": "標準ライブラリ",
   "syntax": "Repr.maxset",
   "description": "集合の要素数の上限（既定は 6）。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.maxset)",
   "status": "supported",
   "caution": "このエンジンではネイティブ値への属性代入ができないため、属性の変更（r.maxlevel = 2 のような使い方）は再現できない。読み取りのみ再現する。",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr.maxset"
  },
  {
   "name": "reprlib.Repr.maxstring",
   "category": "標準ライブラリ",
   "syntax": "Repr.maxstring",
   "description": "文字列の repr の長さの上限（既定は 30）。超えると中央を ... で切り詰める。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.maxstring)",
   "status": "supported",
   "caution": "このエンジンではネイティブ値への属性代入ができないため、属性の変更（r.maxlevel = 2 のような使い方）は再現できない。読み取りのみ再現する。",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr.maxstring"
  },
  {
   "name": "reprlib.Repr.maxtuple",
   "category": "標準ライブラリ",
   "syntax": "Repr.maxtuple",
   "description": "タプルの要素数の上限（既定は 6）。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.maxtuple)",
   "status": "supported",
   "caution": "このエンジンではネイティブ値への属性代入ができないため、属性の変更（r.maxlevel = 2 のような使い方）は再現できない。読み取りのみ再現する。",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr.maxtuple"
  },
  {
   "name": "reprlib.Repr.repr",
   "category": "標準ライブラリ",
   "syntax": "repr(object)",
   "description": "上限規則に従って切り詰めた repr を返す（repr1 を最大レベルで呼ぶのと等しい）。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.repr('abcdefghijklmnopqrstuvwxyz0123456789'))",
   "status": "supported",
   "caution": "",
   "returns": "str",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr.repr"
  },
  {
   "name": "reprlib.Repr.repr1",
   "category": "標準ライブラリ",
   "syntax": "repr1(object, level)",
   "description": "残りの深さ level を指定して repr を生成する内部用メソッド。",
   "example": "import reprlib\nr = reprlib.Repr()\nprint(r.repr1([1, [2, [3]]], 1))",
   "status": "supported",
   "caution": "",
   "returns": "str",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.Repr.repr1"
  },
  {
   "name": "reprlib.aRepr",
   "category": "標準ライブラリ",
   "syntax": "reprlib.aRepr",
   "description": "モジュール共有の Repr インスタンス（既定の上限規則）。",
   "example": "import reprlib\nprint(reprlib.aRepr.maxlevel)",
   "status": "supported",
   "caution": "",
   "returns": "Repr",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.aRepr"
  },
  {
   "name": "reprlib.recursive_repr",
   "category": "標準ライブラリ",
   "syntax": "recursive_repr(fillvalue='...')",
   "description": "再帰的な __repr__ を書くためのデコレータ。再入した呼び出しでは fillvalue を返す。",
   "example": "import reprlib\ncalls = []\n@reprlib.recursive_repr()\ndef f(n):\n    calls.append(n)\n    return f(n + 1) if n < 1 else 'done'\nprint(f(0), len(calls))",
   "status": "supported",
   "caution": "このエンジンではユーザー定義クラスの __repr__ へ適用する経路がないため、通常の関数の再帰ガードとして再現する。",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.recursive_repr"
  },
  {
   "name": "reprlib.repr",
   "category": "標準ライブラリ",
   "syntax": "repr(object)",
   "description": "aRepr を使うモジュール関数の repr。",
   "example": "import reprlib\nprint(reprlib.repr([0, 1, 2, 3, 4, 5, 6]))",
   "status": "supported",
   "caution": "",
   "returns": "str",
   "source": "https://docs.python.org/ja/3.15/library/reprlib.html#reprlib.repr"
  }
];
