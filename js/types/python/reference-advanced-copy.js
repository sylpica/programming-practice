/* 高度モード B7 G4 リファレンス：copy（正規形）
 * 出典は各項目の source（公式ドキュメント 3.15）。status は実装の裏付け状態。
 * expected（期待出力）はここには置かず、テストファイルのケース表で保持する。 */
export const referenceAdvanced = [
  {
   "name": "copy.Error",
   "category": "標準ライブラリ",
   "syntax": "class Error(Exception)",
   "description": "copy モジュールの例外クラス（copy.error の別名）。例外の対応付けとして登録され、except で捕捉できる。",
   "example": "from copy import Error\ntry:\n    raise Error('x')\nexcept Error:\n    print('caught')",
   "status": "supported",
   "caution": "",
   "source": "https://docs.python.org/ja/3.15/library/copy.html#copy.Error"
  },
  {
   "name": "copy.copy",
   "category": "標準ライブラリ",
   "syntax": "copy(x)",
   "description": "浅いコピーを作る。コンテナは複製されるが中身は共有される。タプルは同一オブジェクトが返る。",
   "example": "import copy\na = [[1], 2]\nb = copy.copy(a)\nb[0].append(9)\nprint(a, b[1])",
   "status": "supported",
   "caution": "",
   "source": "https://docs.python.org/ja/3.15/library/copy.html#copy.copy"
  },
  {
   "name": "copy.deepcopy",
   "category": "標準ライブラリ",
   "syntax": "deepcopy(x, memo=None)",
   "description": "深いコピーを作る。循環参照があってもメモ化により同一性が保たれる。",
   "example": "import copy\na = [1]\na.append(a)\nb = copy.deepcopy(a)\nprint(b[1] is b, b[0])",
   "status": "supported",
   "caution": "",
   "source": "https://docs.python.org/ja/3.15/library/copy.html#copy.deepcopy"
  },
  {
   "name": "copy.replace",
   "category": "標準ライブラリ",
   "syntax": "replace(obj, /, **changes)",
   "description": "__replace__ を持つオブジェクトの属性を差し替えたコピーを返す（3.13+）。namedtuple と SimpleNamespace には最善努力で委譲するが、3.13+ の意味論をローカル環境で裏付けできないため未検証。",
   "example": "import copy\nfrom collections import namedtuple\nPoint = namedtuple('Point', ['x', 'y'])\nprint(copy.replace(Point(1, 2), y=3))",
   "status": "unverified",
   "caution": "ローカルの CPython 3.12 には存在しない関数のため実走で照合できない。この項目は未検証。",
   "source": "https://docs.python.org/ja/3.15/library/copy.html#copy.replace"
  }
];
