/* 高度モード B7（G13）：math.integer のリファレンス（全6件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 生成器：/tmp/gen_ref_g13.py（G13 作業用） */
export const referenceAdvanced = [
 {
  "name": "math.integer.comb",
  "category": "標準ライブラリ",
  "syntax": "math.integer.comb(n, k)",
  "description": "二項係数 nCk を int で返す。",
  "example": "from math.integer import comb\nprint(comb(5, 2))",
  "caution": "3.15 で追加されたサブモジュール。意味論は math の同名関数と同一で、math 群の検証済み意味論をそのまま使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.integer.html#math.integer.comb"
 },
 {
  "name": "math.integer.factorial",
  "category": "標準ライブラリ",
  "syntax": "math.integer.factorial(x)",
  "description": "x の階乗を int で返す。負数では ValueError。",
  "example": "from math.integer import factorial\nprint(factorial(5))",
  "caution": "3.15 で追加されたサブモジュール。意味論は math の同名関数と同一で、math 群の検証済み意味論をそのまま使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.integer.html#math.integer.factorial"
 },
 {
  "name": "math.integer.gcd",
  "category": "標準ライブラリ",
  "syntax": "math.integer.gcd(*integers)",
  "description": "引数すべての最大公約数を int で返す。",
  "example": "from math.integer import gcd\nprint(gcd(12, 18))",
  "caution": "3.15 で追加されたサブモジュール。意味論は math の同名関数と同一で、math 群の検証済み意味論をそのまま使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.integer.html#math.integer.gcd"
 },
 {
  "name": "math.integer.isqrt",
  "category": "標準ライブラリ",
  "syntax": "math.integer.isqrt(n)",
  "description": "n の整数平方根（sqrt の床）を返す。負数では ValueError。",
  "example": "from math.integer import isqrt\nprint(isqrt(10))",
  "caution": "3.15 で追加されたサブモジュール。意味論は math の同名関数と同一で、math 群の検証済み意味論をそのまま使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.integer.html#math.integer.isqrt"
 },
 {
  "name": "math.integer.lcm",
  "category": "標準ライブラリ",
  "syntax": "math.integer.lcm(*integers)",
  "description": "引数すべての最小公倍数を int で返す。",
  "example": "from math.integer import lcm\nprint(lcm(4, 6))",
  "caution": "3.15 で追加されたサブモジュール。意味論は math の同名関数と同一で、math 群の検証済み意味論をそのまま使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.integer.html#math.integer.lcm"
 },
 {
  "name": "math.integer.perm",
  "category": "標準ライブラリ",
  "syntax": "math.integer.perm(n, k=None)",
  "description": "順列 nPk を int で返す。k 省略時は n! と同じ。",
  "example": "from math.integer import perm\nprint(perm(5, 2))",
  "caution": "3.15 で追加されたサブモジュール。意味論は math の同名関数と同一で、math 群の検証済み意味論をそのまま使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.integer.html#math.integer.perm"
 },
];
