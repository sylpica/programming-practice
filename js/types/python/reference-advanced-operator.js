/* 高度モード B7 G5：operator モジュールのリファレンス差分（全103件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 生成器：docs/audit/gen-ref-g5.py */
export const referenceAdvanced = [
 {
  "name": "operator.__abs__",
  "category": "標準ライブラリ",
  "syntax": "operator.__abs__(obj)",
  "description": "abs と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__abs__(-5))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__abs__"
 },
 {
  "name": "operator.__add__",
  "category": "標準ライブラリ",
  "syntax": "operator.__add__(a, b)",
  "description": "add と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__add__(2, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__add__"
 },
 {
  "name": "operator.__and__",
  "category": "標準ライブラリ",
  "syntax": "operator.__and__(a, b)",
  "description": "and_ と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__and__(6, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__and__"
 },
 {
  "name": "operator.__call__",
  "category": "標準ライブラリ",
  "syntax": "operator.__call__(obj, /, *args, **kwargs)",
  "description": "call と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__call__(pow, 2, 3))",
  "caution": "呼び出し可能でないオブジェクトを渡すと TypeError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__call__"
 },
 {
  "name": "operator.__concat__",
  "category": "標準ライブラリ",
  "syntax": "operator.__concat__(a, b)",
  "description": "concat と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__concat__([1, 2], [3]))",
  "caution": "concat(1, 2) は TypeError になる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__concat__"
 },
 {
  "name": "operator.__contains__",
  "category": "標準ライブラリ",
  "syntax": "operator.__contains__(a, b)",
  "description": "contains と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__contains__([1, 2, 3], 2))",
  "caution": "組み込みの in と引数の順序が逆なので注意。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__contains__"
 },
 {
  "name": "operator.__delitem__",
  "category": "標準ライブラリ",
  "syntax": "operator.__delitem__(a, b)",
  "description": "delitem と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nxs = [1, 2]\noperator.__delitem__(xs, 0)\nprint(xs)",
  "caution": "タプルや文字列には使えない（TypeError）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__delitem__"
 },
 {
  "name": "operator.__eq__",
  "category": "標準ライブラリ",
  "syntax": "operator.__eq__(a, b)",
  "description": "eq と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__eq__(2, 2.0))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__eq__"
 },
 {
  "name": "operator.__floordiv__",
  "category": "標準ライブラリ",
  "syntax": "operator.__floordiv__(a, b)",
  "description": "floordiv と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__floordiv__(7, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__floordiv__"
 },
 {
  "name": "operator.__ge__",
  "category": "標準ライブラリ",
  "syntax": "operator.__ge__(a, b)",
  "description": "ge と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__ge__(2, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__ge__"
 },
 {
  "name": "operator.__getitem__",
  "category": "標準ライブラリ",
  "syntax": "operator.__getitem__(a, b)",
  "description": "getitem と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__getitem__([10, 20], 1))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__getitem__"
 },
 {
  "name": "operator.__gt__",
  "category": "標準ライブラリ",
  "syntax": "operator.__gt__(a, b)",
  "description": "gt と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__gt__(3, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__gt__"
 },
 {
  "name": "operator.__iadd__",
  "category": "標準ライブラリ",
  "syntax": "operator.__iadd__(a, b)",
  "description": "iadd と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nxs = [1]\noperator.__iadd__(xs, [2])\nprint(xs)",
  "caution": "タプルや文字列では新しいオブジェクトが返る。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__iadd__"
 },
 {
  "name": "operator.__iand__",
  "category": "標準ライブラリ",
  "syntax": "operator.__iand__(a, b)",
  "description": "iand と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__iand__(6, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__iand__"
 },
 {
  "name": "operator.__iconcat__",
  "category": "標準ライブラリ",
  "syntax": "operator.__iconcat__(a, b)",
  "description": "iconcat と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nxs = [1]\noperator.__iconcat__(xs, [2])\nprint(xs)",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__iconcat__"
 },
 {
  "name": "operator.__ifloordiv__",
  "category": "標準ライブラリ",
  "syntax": "operator.__ifloordiv__(a, b)",
  "description": "ifloordiv と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__ifloordiv__(7, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__ifloordiv__"
 },
 {
  "name": "operator.__ilshift__",
  "category": "標準ライブラリ",
  "syntax": "operator.__ilshift__(a, b)",
  "description": "ilshift と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__ilshift__(1, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__ilshift__"
 },
 {
  "name": "operator.__imatmul__",
  "category": "標準ライブラリ",
  "syntax": "operator.__imatmul__(a, b)",
  "description": "imatmul と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nclass V:\n    def __matmul__(self, other):\n        return 42\nprint(operator.__imatmul__(V(), V()))",
  "caution": "この学習環境では @ 演算子自体が未対応のため、ユーザー定義クラスの __matmul__ は再現されない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__imatmul__"
 },
 {
  "name": "operator.__imod__",
  "category": "標準ライブラリ",
  "syntax": "operator.__imod__(a, b)",
  "description": "imod と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__imod__(7, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__imod__"
 },
 {
  "name": "operator.__imul__",
  "category": "標準ライブラリ",
  "syntax": "operator.__imul__(a, b)",
  "description": "imul と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nxs = [1, 2]\noperator.__imul__(xs, 2)\nprint(xs)",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__imul__"
 },
 {
  "name": "operator.__index__",
  "category": "標準ライブラリ",
  "syntax": "operator.__index__(obj)",
  "description": "index と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__index__(7))",
  "caution": "float は渡せない（TypeError）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__index__"
 },
 {
  "name": "operator.__inv__",
  "category": "標準ライブラリ",
  "syntax": "operator.__inv__(obj)",
  "description": "inv と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__inv__(5))",
  "caution": "float には使えない（TypeError）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__inv__"
 },
 {
  "name": "operator.__invert__",
  "category": "標準ライブラリ",
  "syntax": "operator.__invert__(obj)",
  "description": "invert と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__invert__(5))",
  "caution": "float には使えない（TypeError）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__invert__"
 },
 {
  "name": "operator.__ior__",
  "category": "標準ライブラリ",
  "syntax": "operator.__ior__(a, b)",
  "description": "ior と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__ior__(4, 1))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__ior__"
 },
 {
  "name": "operator.__ipow__",
  "category": "標準ライブラリ",
  "syntax": "operator.__ipow__(a, b)",
  "description": "ipow と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__ipow__(2, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__ipow__"
 },
 {
  "name": "operator.__irshift__",
  "category": "標準ライブラリ",
  "syntax": "operator.__irshift__(a, b)",
  "description": "irshift と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__irshift__(8, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__irshift__"
 },
 {
  "name": "operator.__isub__",
  "category": "標準ライブラリ",
  "syntax": "operator.__isub__(a, b)",
  "description": "isub と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__isub__(5, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__isub__"
 },
 {
  "name": "operator.__itruediv__",
  "category": "標準ライブラリ",
  "syntax": "operator.__itruediv__(a, b)",
  "description": "itruediv と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__itruediv__(7, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__itruediv__"
 },
 {
  "name": "operator.__ixor__",
  "category": "標準ライブラリ",
  "syntax": "operator.__ixor__(a, b)",
  "description": "ixor と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__ixor__(6, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__ixor__"
 },
 {
  "name": "operator.__le__",
  "category": "標準ライブラリ",
  "syntax": "operator.__le__(a, b)",
  "description": "le と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__le__(3, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__le__"
 },
 {
  "name": "operator.__lshift__",
  "category": "標準ライブラリ",
  "syntax": "operator.__lshift__(a, b)",
  "description": "lshift と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__lshift__(3, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__lshift__"
 },
 {
  "name": "operator.__lt__",
  "category": "標準ライブラリ",
  "syntax": "operator.__lt__(a, b)",
  "description": "lt と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__lt__(2, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__lt__"
 },
 {
  "name": "operator.__matmul__",
  "category": "標準ライブラリ",
  "syntax": "operator.__matmul__(a, b)",
  "description": "matmul と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nclass V:\n    def __matmul__(self, other):\n        return 42\nprint(operator.__matmul__(V(), V()))",
  "caution": "この学習環境では @ 演算子自体が未対応のため、ユーザー定義クラスの __matmul__ は再現されない。リスト同士など未対応の型では TypeError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__matmul__"
 },
 {
  "name": "operator.__mod__",
  "category": "標準ライブラリ",
  "syntax": "operator.__mod__(a, b)",
  "description": "mod と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__mod__(7, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__mod__"
 },
 {
  "name": "operator.__mul__",
  "category": "標準ライブラリ",
  "syntax": "operator.__mul__(a, b)",
  "description": "mul と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__mul__(3, 4))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__mul__"
 },
 {
  "name": "operator.__ne__",
  "category": "標準ライブラリ",
  "syntax": "operator.__ne__(a, b)",
  "description": "ne と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__ne__(2, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__ne__"
 },
 {
  "name": "operator.__neg__",
  "category": "標準ライブラリ",
  "syntax": "operator.__neg__(obj)",
  "description": "neg と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__neg__(5))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__neg__"
 },
 {
  "name": "operator.__not__",
  "category": "標準ライブラリ",
  "syntax": "operator.__not__(obj)",
  "description": "not_ と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__not__(0))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__not__"
 },
 {
  "name": "operator.__or__",
  "category": "標準ライブラリ",
  "syntax": "operator.__or__(a, b)",
  "description": "or_ と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__or__(4, 1))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__or__"
 },
 {
  "name": "operator.__pos__",
  "category": "標準ライブラリ",
  "syntax": "operator.__pos__(obj)",
  "description": "pos と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__pos__(-5))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__pos__"
 },
 {
  "name": "operator.__pow__",
  "category": "標準ライブラリ",
  "syntax": "operator.__pow__(a, b)",
  "description": "pow と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__pow__(2, 10))",
  "caution": "組み込み pow と違い、3引数（法付き）には使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__pow__"
 },
 {
  "name": "operator.__rshift__",
  "category": "標準ライブラリ",
  "syntax": "operator.__rshift__(a, b)",
  "description": "rshift と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__rshift__(12, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__rshift__"
 },
 {
  "name": "operator.__setitem__",
  "category": "標準ライブラリ",
  "syntax": "operator.__setitem__(a, b, c)",
  "description": "setitem と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nxs = [1, 2]\noperator.__setitem__(xs, 0, 9)\nprint(xs)",
  "caution": "タプルや文字列には使えない（TypeError）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__setitem__"
 },
 {
  "name": "operator.__sub__",
  "category": "標準ライブラリ",
  "syntax": "operator.__sub__(a, b)",
  "description": "sub と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__sub__(5, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__sub__"
 },
 {
  "name": "operator.__truediv__",
  "category": "標準ライブラリ",
  "syntax": "operator.__truediv__(a, b)",
  "description": "truediv と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__truediv__(7, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__truediv__"
 },
 {
  "name": "operator.__xor__",
  "category": "標準ライブラリ",
  "syntax": "operator.__xor__(a, b)",
  "description": "xor と同一の関数（特殊メソッド名の別名）。",
  "example": "import operator\nprint(operator.__xor__(6, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.__xor__"
 },
 {
  "name": "operator.abs",
  "category": "標準ライブラリ",
  "syntax": "operator.abs(obj)",
  "description": "abs(obj) を返す（絶対値）。",
  "example": "import operator\nprint(operator.abs(-5))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.abs"
 },
 {
  "name": "operator.add",
  "category": "標準ライブラリ",
  "syntax": "operator.add(a, b)",
  "description": "a + b を返す。",
  "example": "import operator\nprint(operator.add(2, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.add"
 },
 {
  "name": "operator.and_",
  "category": "標準ライブラリ",
  "syntax": "operator.and_(a, b)",
  "description": "a & b を返す（ビットAND。集合では共通部分）。",
  "example": "import operator\nprint(operator.and_(6, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.and_"
 },
 {
  "name": "operator.attrgetter",
  "category": "標準ライブラリ",
  "syntax": "operator.attrgetter(attr, /, *attrs)",
  "description": "オブジェクトの属性を取り出す呼び出し可能オブジェクトを作る。ドットで多段の属性を指定でき、複数指定するとタプルで返す。",
  "example": "import operator\ng = operator.attrgetter('denominator')\nprint(g(3))",
  "caution": "属性名は文字列でなければならない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.attrgetter"
 },
 {
  "name": "operator.call",
  "category": "標準ライブラリ",
  "syntax": "operator.call(obj, /, *args, **kwargs)",
  "description": "obj(*args, **kwargs) を呼び出した結果を返す。",
  "example": "import operator\nprint(operator.call(pow, 2, 3))",
  "caution": "呼び出し可能でないオブジェクトを渡すと TypeError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.call"
 },
 {
  "name": "operator.concat",
  "category": "標準ライブラリ",
  "syntax": "operator.concat(a, b)",
  "description": "a + b と同じだが、シーケンスの連結専用で、数値には使えない。",
  "example": "import operator\nprint(operator.concat([1, 2], [3]))",
  "caution": "concat(1, 2) は TypeError になる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.concat"
 },
 {
  "name": "operator.contains",
  "category": "標準ライブラリ",
  "syntax": "operator.contains(a, b)",
  "description": "b in a を返す。",
  "example": "import operator\nprint(operator.contains([1, 2, 3], 2))",
  "caution": "組み込みの in と引数の順序が逆なので注意。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.contains"
 },
 {
  "name": "operator.countOf",
  "category": "標準ライブラリ",
  "syntax": "operator.countOf(a, b)",
  "description": "シーケンス a の中で b と等しい要素の個数を返す。",
  "example": "import operator\nprint(operator.countOf([1, 2, 1], 1))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.countOf"
 },
 {
  "name": "operator.delitem",
  "category": "標準ライブラリ",
  "syntax": "operator.delitem(a, b)",
  "description": "del a[b] を行う。戻り値は None。",
  "example": "import operator\nxs = [1, 2]\noperator.delitem(xs, 0)\nprint(xs)",
  "caution": "タプルや文字列には使えない（TypeError）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.delitem"
 },
 {
  "name": "operator.eq",
  "category": "標準ライブラリ",
  "syntax": "operator.eq(a, b)",
  "description": "a == b を返す。",
  "example": "import operator\nprint(operator.eq(2, 2.0))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.eq"
 },
 {
  "name": "operator.floordiv",
  "category": "標準ライブラリ",
  "syntax": "operator.floordiv(a, b)",
  "description": "a // b を返す（切り捨て除算）。",
  "example": "import operator\nprint(operator.floordiv(7, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.floordiv"
 },
 {
  "name": "operator.ge",
  "category": "標準ライブラリ",
  "syntax": "operator.ge(a, b)",
  "description": "a >= b を返す。",
  "example": "import operator\nprint(operator.ge(2, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.ge"
 },
 {
  "name": "operator.getitem",
  "category": "標準ライブラリ",
  "syntax": "operator.getitem(a, b)",
  "description": "a[b] を返す。",
  "example": "import operator\nprint(operator.getitem([10, 20], 1))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.getitem"
 },
 {
  "name": "operator.gt",
  "category": "標準ライブラリ",
  "syntax": "operator.gt(a, b)",
  "description": "a > b を返す。",
  "example": "import operator\nprint(operator.gt(3, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.gt"
 },
 {
  "name": "operator.iadd",
  "category": "標準ライブラリ",
  "syntax": "operator.iadd(a, b)",
  "description": "a += b の結果を返す。リストでは同じオブジェクトを変更する。",
  "example": "import operator\nxs = [1]\noperator.iadd(xs, [2])\nprint(xs)",
  "caution": "タプルや文字列では新しいオブジェクトが返る。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.iadd"
 },
 {
  "name": "operator.iand",
  "category": "標準ライブラリ",
  "syntax": "operator.iand(a, b)",
  "description": "a &= b の結果を返す。集合では同じオブジェクトを共通部分に置き換える。",
  "example": "import operator\nprint(operator.iand(6, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.iand"
 },
 {
  "name": "operator.iconcat",
  "category": "標準ライブラリ",
  "syntax": "operator.iconcat(a, b)",
  "description": "iadd と同じ働き（連結版の名前）。",
  "example": "import operator\nxs = [1]\noperator.iconcat(xs, [2])\nprint(xs)",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.iconcat"
 },
 {
  "name": "operator.ifloordiv",
  "category": "標準ライブラリ",
  "syntax": "operator.ifloordiv(a, b)",
  "description": "a //= b の結果を返す。",
  "example": "import operator\nprint(operator.ifloordiv(7, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.ifloordiv"
 },
 {
  "name": "operator.ilshift",
  "category": "標準ライブラリ",
  "syntax": "operator.ilshift(a, b)",
  "description": "a <<= b の結果を返す。",
  "example": "import operator\nprint(operator.ilshift(1, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.ilshift"
 },
 {
  "name": "operator.imatmul",
  "category": "標準ライブラリ",
  "syntax": "operator.imatmul(a, b)",
  "description": "a @= b の結果を返す。",
  "example": "import operator\nclass V:\n    def __matmul__(self, other):\n        return 42\nprint(operator.imatmul(V(), V()))",
  "caution": "この学習環境では @ 演算子自体が未対応のため、ユーザー定義クラスの __matmul__ は再現されない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.imatmul"
 },
 {
  "name": "operator.imod",
  "category": "標準ライブラリ",
  "syntax": "operator.imod(a, b)",
  "description": "a %= b の結果を返す。",
  "example": "import operator\nprint(operator.imod(7, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.imod"
 },
 {
  "name": "operator.imul",
  "category": "標準ライブラリ",
  "syntax": "operator.imul(a, b)",
  "description": "a *= b の結果を返す。リストでは同じオブジェクトを繰り返して伸ばす。",
  "example": "import operator\nxs = [1, 2]\noperator.imul(xs, 2)\nprint(xs)",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.imul"
 },
 {
  "name": "operator.index",
  "category": "標準ライブラリ",
  "syntax": "operator.index(obj)",
  "description": "obj を __index__() で整数として解釈した値を返す。",
  "example": "import operator\nprint(operator.index(7))",
  "caution": "float は渡せない（TypeError）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.index"
 },
 {
  "name": "operator.indexOf",
  "category": "標準ライブラリ",
  "syntax": "operator.indexOf(a, b)",
  "description": "シーケンス a の中で b が最初に現れる位置を返す。",
  "example": "import operator\nprint(operator.indexOf('abc', 'b'))",
  "caution": "見つからないと ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.indexOf"
 },
 {
  "name": "operator.inv",
  "category": "標準ライブラリ",
  "syntax": "operator.inv(obj)",
  "description": "~obj を返す（ビット反転）。invert と同じ。",
  "example": "import operator\nprint(operator.inv(5))",
  "caution": "float には使えない（TypeError）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.inv"
 },
 {
  "name": "operator.invert",
  "category": "標準ライブラリ",
  "syntax": "operator.invert(obj)",
  "description": "~obj を返す（ビット反転）。inv と同じ。",
  "example": "import operator\nprint(operator.invert(5))",
  "caution": "float には使えない（TypeError）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.invert"
 },
 {
  "name": "operator.ior",
  "category": "標準ライブラリ",
  "syntax": "operator.ior(a, b)",
  "description": "a |= b の結果を返す。集合・辞書では同じオブジェクトを変更する。",
  "example": "import operator\nprint(operator.ior(4, 1))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.ior"
 },
 {
  "name": "operator.ipow",
  "category": "標準ライブラリ",
  "syntax": "operator.ipow(a, b)",
  "description": "a **= b の結果を返す。",
  "example": "import operator\nprint(operator.ipow(2, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.ipow"
 },
 {
  "name": "operator.irshift",
  "category": "標準ライブラリ",
  "syntax": "operator.irshift(a, b)",
  "description": "a >>= b の結果を返す。",
  "example": "import operator\nprint(operator.irshift(8, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.irshift"
 },
 {
  "name": "operator.is_",
  "category": "標準ライブラリ",
  "syntax": "operator.is_(a, b)",
  "description": "a is b を返す（同一オブジェクトかどうか）。",
  "example": "import operator\nx = [1]\nprint(operator.is_(x, x))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.is_"
 },
 {
  "name": "operator.is_none",
  "category": "標準ライブラリ",
  "syntax": "operator.is_none(a)",
  "description": "a is None を返す（3.14 で追加）。",
  "example": "import operator\nprint(operator.is_none(None))",
  "caution": "3.12 には存在しない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.is_none"
 },
 {
  "name": "operator.is_not",
  "category": "標準ライブラリ",
  "syntax": "operator.is_not(a, b)",
  "description": "a is not b を返す。",
  "example": "import operator\nx = [1]\ny = [1]\nprint(operator.is_not(x, y))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.is_not"
 },
 {
  "name": "operator.is_not_none",
  "category": "標準ライブラリ",
  "syntax": "operator.is_not_none(a)",
  "description": "a is not None を返す（3.14 で追加）。",
  "example": "import operator\nprint(operator.is_not_none(0))",
  "caution": "3.12 には存在しない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.is_not_none"
 },
 {
  "name": "operator.isub",
  "category": "標準ライブラリ",
  "syntax": "operator.isub(a, b)",
  "description": "a -= b の結果を返す。集合では同じオブジェクトを差集合に置き換える。",
  "example": "import operator\nprint(operator.isub(5, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.isub"
 },
 {
  "name": "operator.itemgetter",
  "category": "標準ライブラリ",
  "syntax": "operator.itemgetter(item, /, *items)",
  "description": "オブジェクトの要素を取り出す呼び出し可能オブジェクトを作る。複数指定するとタプルで返す。",
  "example": "import operator\nprint(operator.itemgetter(1)('abc'))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.itemgetter"
 },
 {
  "name": "operator.itruediv",
  "category": "標準ライブラリ",
  "syntax": "operator.itruediv(a, b)",
  "description": "a /= b の結果を返す。",
  "example": "import operator\nprint(operator.itruediv(7, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.itruediv"
 },
 {
  "name": "operator.ixor",
  "category": "標準ライブラリ",
  "syntax": "operator.ixor(a, b)",
  "description": "a ^= b の結果を返す。集合では同じオブジェクトを対称差に置き換える。",
  "example": "import operator\nprint(operator.ixor(6, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.ixor"
 },
 {
  "name": "operator.le",
  "category": "標準ライブラリ",
  "syntax": "operator.le(a, b)",
  "description": "a <= b を返す。",
  "example": "import operator\nprint(operator.le(3, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.le"
 },
 {
  "name": "operator.length_hint",
  "category": "標準ライブラリ",
  "syntax": "operator.length_hint(obj, default=0)",
  "description": "オブジェクトの長さの見積もりを返す。長さが分からなければ default（既定は0）を返す。",
  "example": "import operator\nprint(operator.length_hint([1, 2, 3]))",
  "caution": "イテレータでは残り要素数の見積もりになる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.length_hint"
 },
 {
  "name": "operator.lshift",
  "category": "標準ライブラリ",
  "syntax": "operator.lshift(a, b)",
  "description": "a << b を返す（左シフト）。",
  "example": "import operator\nprint(operator.lshift(3, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.lshift"
 },
 {
  "name": "operator.lt",
  "category": "標準ライブラリ",
  "syntax": "operator.lt(a, b)",
  "description": "a < b を返す。",
  "example": "import operator\nprint(operator.lt(2, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.lt"
 },
 {
  "name": "operator.matmul",
  "category": "標準ライブラリ",
  "syntax": "operator.matmul(a, b)",
  "description": "a @ b を返す（行列積演算子）。",
  "example": "import operator\nclass V:\n    def __matmul__(self, other):\n        return 42\nprint(operator.matmul(V(), V()))",
  "caution": "この学習環境では @ 演算子自体が未対応のため、ユーザー定義クラスの __matmul__ は再現されない。リスト同士など未対応の型では TypeError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.matmul"
 },
 {
  "name": "operator.methodcaller",
  "category": "標準ライブラリ",
  "syntax": "operator.methodcaller(name, /, *args, **kwargs)",
  "description": "オブジェクトの名前付きメソッドを呼び出す呼び出し可能オブジェクトを作る。追加の引数を固定できる。",
  "example": "import operator\nprint(operator.methodcaller('upper')('abc'))",
  "caution": "メソッド名は文字列でなければならない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.methodcaller"
 },
 {
  "name": "operator.mod",
  "category": "標準ライブラリ",
  "syntax": "operator.mod(a, b)",
  "description": "a % b を返す（剰余）。",
  "example": "import operator\nprint(operator.mod(7, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.mod"
 },
 {
  "name": "operator.mul",
  "category": "標準ライブラリ",
  "syntax": "operator.mul(a, b)",
  "description": "a * b を返す。文字列やリストの繰り返しも演算子どおりに働く。",
  "example": "import operator\nprint(operator.mul(3, 4))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.mul"
 },
 {
  "name": "operator.ne",
  "category": "標準ライブラリ",
  "syntax": "operator.ne(a, b)",
  "description": "a != b を返す。",
  "example": "import operator\nprint(operator.ne(2, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.ne"
 },
 {
  "name": "operator.neg",
  "category": "標準ライブラリ",
  "syntax": "operator.neg(obj)",
  "description": "-obj を返す（単項マイナス）。",
  "example": "import operator\nprint(operator.neg(5))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.neg"
 },
 {
  "name": "operator.not_",
  "category": "標準ライブラリ",
  "syntax": "operator.not_(obj)",
  "description": "not obj を返す（真理値の反転）。",
  "example": "import operator\nprint(operator.not_(0))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.not_"
 },
 {
  "name": "operator.or_",
  "category": "標準ライブラリ",
  "syntax": "operator.or_(a, b)",
  "description": "a | b を返す（ビットOR。集合では和集合、辞書ではマージ）。",
  "example": "import operator\nprint(operator.or_(4, 1))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.or_"
 },
 {
  "name": "operator.pos",
  "category": "標準ライブラリ",
  "syntax": "operator.pos(obj)",
  "description": "+obj を返す（単項プラス）。",
  "example": "import operator\nprint(operator.pos(-5))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.pos"
 },
 {
  "name": "operator.pow",
  "category": "標準ライブラリ",
  "syntax": "operator.pow(a, b)",
  "description": "a ** b を返す。",
  "example": "import operator\nprint(operator.pow(2, 10))",
  "caution": "組み込み pow と違い、3引数（法付き）には使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.pow"
 },
 {
  "name": "operator.rshift",
  "category": "標準ライブラリ",
  "syntax": "operator.rshift(a, b)",
  "description": "a >> b を返す（右シフト）。",
  "example": "import operator\nprint(operator.rshift(12, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.rshift"
 },
 {
  "name": "operator.setitem",
  "category": "標準ライブラリ",
  "syntax": "operator.setitem(a, b, c)",
  "description": "a[b] = c を行う。戻り値は None。",
  "example": "import operator\nxs = [1, 2]\noperator.setitem(xs, 0, 9)\nprint(xs)",
  "caution": "タプルや文字列には使えない（TypeError）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.setitem"
 },
 {
  "name": "operator.sub",
  "category": "標準ライブラリ",
  "syntax": "operator.sub(a, b)",
  "description": "a - b を返す。",
  "example": "import operator\nprint(operator.sub(5, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.sub"
 },
 {
  "name": "operator.truediv",
  "category": "標準ライブラリ",
  "syntax": "operator.truediv(a, b)",
  "description": "a / b を返す（真の除算）。",
  "example": "import operator\nprint(operator.truediv(7, 2))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.truediv"
 },
 {
  "name": "operator.truth",
  "category": "標準ライブラリ",
  "syntax": "operator.truth(obj)",
  "description": "bool(obj) と同じ真理値を返す。",
  "example": "import operator\nprint(operator.truth([0]))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.truth"
 },
 {
  "name": "operator.xor",
  "category": "標準ライブラリ",
  "syntax": "operator.xor(a, b)",
  "description": "a ^ b を返す（排他的OR。集合では対称差）。",
  "example": "import operator\nprint(operator.xor(6, 3))",
  "caution": "キーワード引数は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/operator.html#operator.xor"
 }
];
