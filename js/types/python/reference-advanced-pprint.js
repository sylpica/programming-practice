/* 高度モード B7 G4 リファレンス：pprint（正規形）
 * 出典は各項目の source（公式ドキュメント 3.15）。status は実装の裏付け状態。
 * expected（期待出力）はここには置かず、テストファイルのケース表で保持する。 */
export const referenceAdvanced = [
  {
   "name": "pprint.PrettyPrinter",
   "category": "標準ライブラリ",
   "syntax": "PrettyPrinter(indent=1, width=80, depth=None, stream=None, *, compact=False, sort_dicts=True, underscore_numbers=False)",
   "description": "整形表示を行うクラス。幅に収まらない場合は折り返し、深さ制限・辞書キーのソート（混合型キーは repr 順へフォールバック）・compact 詰め込みを CPython の規則で再現する。",
   "example": "from pprint import PrettyPrinter\npp = PrettyPrinter(width=10)\nprint(pp.pformat([1, 2, 3]))",
   "status": "supported",
   "caution": "",
   "returns": "PrettyPrinter",
   "source": "https://docs.python.org/ja/3.15/library/pprint.html#pprint.PrettyPrinter"
  },
  {
   "name": "pprint.PrettyPrinter.format",
   "category": "標準ライブラリ",
   "syntax": "format(object, context, maxlevels, level)",
   "description": "(整形済み文字列, 読み取り可能か, 再帰的か) のタプルを返す内部用メソッド。再帰構造では再帰プレースホルダを含む文字列になり、isrecursive が True になる。",
   "example": "from pprint import PrettyPrinter\npp = PrettyPrinter()\nprint(pp.format([1, 2], {}, 0, 0))",
   "status": "supported",
   "caution": "再帰プレースホルダに含まれる id= の数値は CPython ではメモリアドレス由来で、本実装では省略する（文字列の完全一致はしない）。",
   "returns": "tuple",
   "source": "https://docs.python.org/ja/3.15/library/pprint.html#pprint.PrettyPrinter.format"
  },
  {
   "name": "pprint.PrettyPrinter.isreadable",
   "category": "標準ライブラリ",
   "syntax": "isreadable(object)",
   "description": "整形結果が eval で読み戻せる（再帰構造を含まない）なら True。",
   "example": "from pprint import PrettyPrinter\npp = PrettyPrinter()\na = [1]\na.append(a)\nprint(pp.isreadable(a), pp.isreadable([1]))",
   "status": "supported",
   "caution": "",
   "returns": "bool",
   "source": "https://docs.python.org/ja/3.15/library/pprint.html#pprint.PrettyPrinter.isreadable"
  },
  {
   "name": "pprint.PrettyPrinter.isrecursive",
   "category": "標準ライブラリ",
   "syntax": "isrecursive(object)",
   "description": "オブジェクトが再帰構造を含むなら True。",
   "example": "from pprint import PrettyPrinter\npp = PrettyPrinter()\na = [1]\na.append(a)\nprint(pp.isrecursive(a), pp.isrecursive([1]))",
   "status": "supported",
   "caution": "",
   "returns": "bool",
   "source": "https://docs.python.org/ja/3.15/library/pprint.html#pprint.PrettyPrinter.isrecursive"
  },
  {
   "name": "pprint.PrettyPrinter.pformat",
   "category": "標準ライブラリ",
   "syntax": "pformat(object)",
   "description": "整形した文字列を返す。",
   "example": "from pprint import PrettyPrinter\npp = PrettyPrinter()\nprint(pp.pformat({'b': 2, 'a': 1}))",
   "status": "supported",
   "caution": "",
   "returns": "str",
   "source": "https://docs.python.org/ja/3.15/library/pprint.html#pprint.PrettyPrinter.pformat"
  },
  {
   "name": "pprint.PrettyPrinter.pprint",
   "category": "標準ライブラリ",
   "syntax": "pprint(object)",
   "description": "整形結果をストリームへ出力する。このエンジンの ctx には出力 API がないため、表示そのものは再現できず未検証。",
   "example": "from pprint import PrettyPrinter\npp = PrettyPrinter()\nprint('pprint は出力先が必要なため未検証')",
   "status": "unverified",
   "caution": "基盤要請：stdlib の ctx へ出力（print 相当）の API が必要。この項目は未検証。",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/pprint.html#pprint.PrettyPrinter.pprint"
  },
  {
   "name": "pprint.isreadable",
   "category": "標準ライブラリ",
   "syntax": "isreadable(object)",
   "description": "デフォルト設定の PrettyPrinter で isreadable を判定するモジュール関数。",
   "example": "import pprint\na = [1]\na.append(a)\nprint(pprint.isreadable(a))",
   "status": "supported",
   "caution": "",
   "returns": "bool",
   "source": "https://docs.python.org/ja/3.15/library/pprint.html#pprint.isreadable"
  },
  {
   "name": "pprint.isrecursive",
   "category": "標準ライブラリ",
   "syntax": "isrecursive(object)",
   "description": "デフォルト設定の PrettyPrinter で isrecursive を判定するモジュール関数。",
   "example": "import pprint\nprint(pprint.isrecursive([1, 2]))",
   "status": "supported",
   "caution": "",
   "returns": "bool",
   "source": "https://docs.python.org/ja/3.15/library/pprint.html#pprint.isrecursive"
  },
  {
   "name": "pprint.pformat",
   "category": "標準ライブラリ",
   "syntax": "pformat(object, indent=1, width=80, depth=None, *, compact=False, sort_dicts=True, underscore_numbers=False)",
   "description": "整形した文字列を返すモジュール関数。辞書はキーでソートされ、混合型のキーでは repr 順になる。",
   "example": "import pprint\nprint(pprint.pformat({'b': 2, 'a': 1}))",
   "status": "supported",
   "caution": "",
   "returns": "str",
   "source": "https://docs.python.org/ja/3.15/library/pprint.html#pprint.pformat"
  },
  {
   "name": "pprint.pp",
   "category": "標準ライブラリ",
   "syntax": "pp(object, *args, sort_dicts=False, **kwargs)",
   "description": "pprint の別名で sort_dicts=False が既定。出力先（標準出力）へ書き出すため、このエンジンでは再現できず未検証。",
   "example": "import pprint\nprint('pp は出力先が必要なため未検証')",
   "status": "unverified",
   "caution": "基盤要請：stdlib の ctx へ出力 API が必要。この項目は未検証。",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/pprint.html#pprint.pp"
  },
  {
   "name": "pprint.pprint",
   "category": "標準ライブラリ",
   "syntax": "pprint(object, stream=None, indent=1, width=80, depth=None, *, compact=False, sort_dicts=True, underscore_numbers=False)",
   "description": "整形結果を標準出力へ書き出す。このエンジンの ctx には出力 API がないため、表示そのものは再現できず未検証。",
   "example": "import pprint\nprint('pprint は出力先が必要なため未検証')",
   "status": "unverified",
   "caution": "基盤要請：stdlib の ctx へ出力 API が必要。この項目は未検証。",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/pprint.html#pprint.pprint"
  },
  {
   "name": "pprint.saferepr",
   "category": "標準ライブラリ",
   "syntax": "saferepr(object)",
   "description": "再帰構造でも安全な repr を返すモジュール関数。",
   "example": "import pprint\nprint(pprint.saferepr([1, 'a']))",
   "status": "supported",
   "caution": "",
   "returns": "str",
   "source": "https://docs.python.org/ja/3.15/library/pprint.html#pprint.saferepr"
  }
];
