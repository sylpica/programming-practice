/* 高度モード B7 G1：numbers モジュールのリファレンス差分（10件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。 */
export const referenceAdvanced = [
 {
  "name": "numbers.Number",
  "category": "標準ライブラリ",
  "syntax": "class numbers.Number",
  "description": "数値タワーの最上位の抽象基底クラス。直接インスタンス化できる。",
  "example": "import numbers\nx = numbers.Number()\nprint(isinstance(x, numbers.Number))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/numbers.html#numbers.Number"
 },
 {
  "name": "numbers.Complex",
  "category": "標準ライブラリ",
  "syntax": "class numbers.Complex",
  "description": "複素数の抽象基底クラス。抽象メソッドを持つため直接インスタンス化は TypeError。",
  "example": "from fractions import Fraction\nimport numbers\nprint(isinstance(Fraction(1, 2), numbers.Complex))",
  "caution": "組み込みの int／float がこの階層に属するかどうかは、本エンジンの isinstance が組み込み型を ABC に登録していないため判定できない（基盤要請として報告済み）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/numbers.html#numbers.Complex"
 },
 {
  "name": "numbers.Complex.conjugate",
  "category": "標準ライブラリ",
  "syntax": "Complex.conjugate()",
  "description": "共役複素数を返す抽象メソッド。",
  "example": "import numbers\nprint(numbers.Complex.conjugate)",
  "caution": "抽象基底クラス上の property／抽象メソッドそのものは、本エンジンでは値として確定できないため未検証です。具体的な値は Fraction 等の具象クラスで得られます。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/numbers.html#numbers.Complex.conjugate"
 },
 {
  "name": "numbers.Complex.imag",
  "category": "標準ライブラリ",
  "syntax": "Complex.imag",
  "description": "虚部を表す抽象 property。",
  "example": "import numbers\nprint(numbers.Complex.imag)",
  "caution": "抽象基底クラス上の property そのものは、本エンジンでは値として確定できないため未検証です。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/numbers.html#numbers.Complex.imag"
 },
 {
  "name": "numbers.Complex.real",
  "category": "標準ライブラリ",
  "syntax": "Complex.real",
  "description": "実部を表す抽象 property。",
  "example": "import numbers\nprint(numbers.Complex.real)",
  "caution": "抽象基底クラス上の property そのものは、本エンジンでは値として確定できないため未検証です。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/numbers.html#numbers.Complex.real"
 },
 {
  "name": "numbers.Integral",
  "category": "標準ライブラリ",
  "syntax": "class numbers.Integral",
  "description": "整数の抽象基底クラス。抽象メソッドを持つため直接インスタンス化は TypeError。",
  "example": "import numbers\ntry:\n    numbers.Integral()\nexcept TypeError:\n    print('abstract')",
  "caution": "組み込みの int がこの階層に属するかどうかは、本エンジンの isinstance が組み込み型を ABC に登録していないため判定できない（基盤要請として報告済み）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/numbers.html#numbers.Integral"
 },
 {
  "name": "numbers.Rational",
  "category": "標準ライブラリ",
  "syntax": "class numbers.Rational",
  "description": "有理数の抽象基底クラス。Fraction の親クラス。抽象メソッドを持つため直接インスタンス化は TypeError。",
  "example": "from fractions import Fraction\nimport numbers\nprint(isinstance(Fraction(1, 2), numbers.Rational))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/numbers.html#numbers.Rational"
 },
 {
  "name": "numbers.Rational.denominator",
  "category": "標準ライブラリ",
  "syntax": "Rational.denominator",
  "description": "分母を表す抽象 property。",
  "example": "from fractions import Fraction\nprint(Fraction(3, 4).denominator)",
  "caution": "抽象基底クラス上の property そのものは、本エンジンでは値として確定できないため未検証です（例は具象クラス Fraction での値）。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/numbers.html#numbers.Rational.denominator"
 },
 {
  "name": "numbers.Rational.numerator",
  "category": "標準ライブラリ",
  "syntax": "Rational.numerator",
  "description": "分子を表す抽象 property。",
  "example": "from fractions import Fraction\nprint(Fraction(3, 4).numerator)",
  "caution": "抽象基底クラス上の property そのものは、本エンジンでは値として確定できないため未検証です（例は具象クラス Fraction での値）。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/numbers.html#numbers.Rational.numerator"
 },
 {
  "name": "numbers.Real",
  "category": "標準ライブラリ",
  "syntax": "class numbers.Real",
  "description": "実数の抽象基底クラス。抽象メソッドを持つため直接インスタンス化は TypeError。",
  "example": "from fractions import Fraction\nimport numbers\nprint(isinstance(Fraction(1, 2), numbers.Real))",
  "caution": "組み込みの float がこの階層に属するかどうかは、本エンジンの isinstance が組み込み型を ABC に登録していないため判定できない（基盤要請として報告済み）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/numbers.html#numbers.Real"
 }
];
