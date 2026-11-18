/* 高度モード B7 G4 リファレンス：array（正規形）
 * 出典は各項目の source（公式ドキュメント 3.15）。status は実装の裏付け状態。
 * expected（期待出力）はここには置かず、テストファイルのケース表で保持する。 */
export const referenceAdvanced = [
  {
   "name": "array.array",
   "category": "標準ライブラリ",
   "syntax": "array(typecode, initializer=None)",
   "description": "型コードで要素の型を固定した配列。型コードごとの範囲チェックを行い、範囲外では OverflowError。f は単精度（float32）として保持される。e（float16）と複素数型コード（3.15）はエンジンに表現がなく未確定値になる。",
   "example": "from array import array\na = array('i', [1, 2])\nprint(a)",
   "status": "supported",
   "caution": "",
   "returns": "array",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array"
  },
  {
   "name": "array.array.append",
   "category": "標準ライブラリ",
   "syntax": "append(x)",
   "description": "末尾に要素を追加する。型コードの範囲外では OverflowError。",
   "example": "from array import array\na = array('i', [1])\na.append(2)\nprint(a.tolist())",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.append"
  },
  {
   "name": "array.array.buffer_info",
   "category": "標準ライブラリ",
   "syntax": "buffer_info()",
   "description": "(アドレス, 要素数) を返すが、アドレスは実行環境ごとに変わる値で、このエンジンでは再現できないため未検証。",
   "example": "from array import array\na = array('i', [1, 2])\nprint('buffer_info はアドレスを含む')",
   "status": "unverified",
   "caution": "メモリアドレスを含む値を捏造しないため未確定値に倒す。この項目は未検証。",
   "returns": "tuple",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.buffer_info"
  },
  {
   "name": "array.array.byteswap",
   "category": "標準ライブラリ",
   "syntax": "byteswap()",
   "description": "各要素のバイト順を入れ替える。要素サイズが1バイトの型では何も起きない。",
   "example": "from array import array\na = array('b', [1, 2])\na.byteswap()\nprint(a.tolist())",
   "status": "supported",
   "caution": "このエンジンの数値表現ではバイト順の入れ替えが観測可能な変化を生まないため、実質的に無操作として再現する（要素サイズ1では CPython でも無操作）。",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.byteswap"
  },
  {
   "name": "array.array.clear",
   "category": "標準ライブラリ",
   "syntax": "clear()",
   "description": "すべての要素を取り除く（3.13+）。",
   "example": "from array import array\na = array('i', [1, 2])\na.clear()\nprint(len(a))",
   "status": "supported",
   "caution": "3.13 で追加されたメソッドのため、ローカルの CPython 3.12 では実走できず、公式ドキュメントで意味論を照合した。",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.clear"
  },
  {
   "name": "array.array.count",
   "category": "標準ライブラリ",
   "syntax": "count(x)",
   "description": "x と等しい要素の数を返す。",
   "example": "from array import array\na = array('i', [1, 2, 2])\nprint(a.count(2))",
   "status": "supported",
   "caution": "",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.count"
  },
  {
   "name": "array.array.extend",
   "category": "標準ライブラリ",
   "syntax": "extend(iterable)",
   "description": "iterable の要素を末尾に順に追加する。別の array を渡す場合は型コードが同じでなければならない。",
   "example": "from array import array\na = array('i', [1])\na.extend([2, 3])\nprint(a.tolist())",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.extend"
  },
  {
   "name": "array.array.frombytes",
   "category": "標準ライブラリ",
   "syntax": "frombytes(bytes)",
   "description": "bytes から要素を読み取って末尾に追加する。このエンジンでは bytes 値が未確定値のため再現できず未検証。",
   "example": "from array import array\na = array('i')\nprint('frombytes は bytes が必要なため未検証')",
   "status": "unverified",
   "caution": "エンジンの bytes リテラルは未確定値になるため、バイト列の中身を復元できない。この項目は未検証。",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.frombytes"
  },
  {
   "name": "array.array.fromfile",
   "category": "標準ライブラリ",
   "syntax": "fromfile(f, n)",
   "description": "ファイルオブジェクトから n 個の要素を読む。このエンジンにはファイルオブジェクトがないため未対応。",
   "example": "from array import array\na = array('i')\nprint('fromfile は未対応')",
   "status": "unsupported",
   "caution": "このエンジンにはファイルオブジェクトがないため未対応。",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.fromfile"
  },
  {
   "name": "array.array.fromlist",
   "category": "標準ライブラリ",
   "syntax": "fromlist(list)",
   "description": "リストの要素を末尾に追加する。リスト以外では TypeError。",
   "example": "from array import array\na = array('i', [1])\na.fromlist([2, 3])\nprint(a.tolist())",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.fromlist"
  },
  {
   "name": "array.array.fromunicode",
   "category": "標準ライブラリ",
   "syntax": "fromunicode(s)",
   "description": "'u'/'w' 型の array に文字列の各文字を追加する。それ以外の型では ValueError。",
   "example": "from array import array\na = array('u')\na.fromunicode('ab')\nprint(a.tolist())",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.fromunicode"
  },
  {
   "name": "array.array.index",
   "category": "標準ライブラリ",
   "syntax": "index(x, start=0, stop=len)",
   "description": "x が最初に現れる位置を返す。なければ ValueError。",
   "example": "from array import array\na = array('i', [1, 2, 3])\nprint(a.index(3))",
   "status": "supported",
   "caution": "",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.index"
  },
  {
   "name": "array.array.insert",
   "category": "標準ライブラリ",
   "syntax": "insert(i, x)",
   "description": "位置 i に x を挿入する。",
   "example": "from array import array\na = array('i', [1, 3])\na.insert(1, 2)\nprint(a.tolist())",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.insert"
  },
  {
   "name": "array.array.itemsize",
   "category": "標準ライブラリ",
   "syntax": "array.itemsize",
   "description": "要素1つのバイト数（読み取り専用）。この環境（Linux LP64）では i=4、l/q=8。",
   "example": "from array import array\na = array('i')\nprint(a.itemsize)",
   "status": "supported",
   "caution": "",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.itemsize"
  },
  {
   "name": "array.array.pop",
   "category": "標準ライブラリ",
   "syntax": "pop(i=-1)",
   "description": "位置 i の要素を取り出して返す。空なら IndexError。",
   "example": "from array import array\na = array('i', [1, 2])\nprint(a.pop(), a.tolist())",
   "status": "supported",
   "caution": "",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.pop"
  },
  {
   "name": "array.array.remove",
   "category": "標準ライブラリ",
   "syntax": "remove(x)",
   "description": "x と等しい最初の要素を削除する。なければ ValueError。",
   "example": "from array import array\na = array('i', [1, 2, 3])\na.remove(2)\nprint(a.tolist())",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.remove"
  },
  {
   "name": "array.array.reverse",
   "category": "標準ライブラリ",
   "syntax": "reverse()",
   "description": "要素の順序をその場で逆にする。",
   "example": "from array import array\na = array('i', [1, 2, 3])\na.reverse()\nprint(a.tolist())",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.reverse"
  },
  {
   "name": "array.array.tobytes",
   "category": "標準ライブラリ",
   "syntax": "tobytes()",
   "description": "バイト列表現を返す。このエンジンでは bytes 値が未確定値のため再現できず未検証。",
   "example": "from array import array\na = array('i', [1])\nprint('tobytes は bytes を返すため未検証')",
   "status": "unverified",
   "caution": "エンジンの bytes リテラルは未確定値になるため、正確なバイト列を返せない。この項目は未検証。",
   "returns": "bytes",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.tobytes"
  },
  {
   "name": "array.array.tofile",
   "category": "標準ライブラリ",
   "syntax": "tofile(f)",
   "description": "ファイルオブジェクトへ書き出す。このエンジンにはファイルオブジェクトがないため未対応。",
   "example": "from array import array\na = array('i', [1])\nprint('tofile は未対応')",
   "status": "unsupported",
   "caution": "このエンジンにはファイルオブジェクトがないため未対応。",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.tofile"
  },
  {
   "name": "array.array.tolist",
   "category": "標準ライブラリ",
   "syntax": "tolist()",
   "description": "通常のリストに変換して返す。f 型では単精度に丸められた値になる。",
   "example": "from array import array\na = array('i', [1, 2])\nprint(a.tolist())",
   "status": "supported",
   "caution": "",
   "returns": "list",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.tolist"
  },
  {
   "name": "array.array.tounicode",
   "category": "標準ライブラリ",
   "syntax": "tounicode()",
   "description": "'u'/'w' 型の array の中身を文字列として返す。それ以外の型では ValueError。",
   "example": "from array import array\na = array('u', 'ab')\nprint(a.tounicode())",
   "status": "supported",
   "caution": "",
   "returns": "str",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.tounicode"
  },
  {
   "name": "array.array.typecode",
   "category": "標準ライブラリ",
   "syntax": "array.typecode",
   "description": "型コード（読み取り専用）。",
   "example": "from array import array\na = array('i')\nprint(a.typecode)",
   "status": "supported",
   "caution": "",
   "returns": "str",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.array.typecode"
  },
  {
   "name": "array.typecodes",
   "category": "標準ライブラリ",
   "syntax": "array.typecodes",
   "description": "使用できる型コードの一覧。3.15 で文字列からタプルに変わり、正確な中身（並び・追加コード）をローカル環境で裏付けできないため未検証。",
   "example": "import array\nprint('typecodes は 3.15 でタプル化され未検証')",
   "status": "unverified",
   "caution": "3.15 のタプル化に伴う正確な内容を確認できないため、値を捏造せず未確定値に倒す。この項目は未検証。",
   "returns": "tuple",
   "source": "https://docs.python.org/ja/3.15/library/array.html#array.typecodes"
  }
];
