/* 高度モード B7 G1：fractions モジュールのリファレンス差分（13件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。 */
export const referenceAdvanced = [
 {
  "name": "fractions.Fraction",
  "category": "標準ライブラリ",
  "syntax": "Fraction(numerator=0, denominator=1)",
  "description": "有理数を正確に表すクラス。文字列・float・Decimal・他の有理数からも作れる。値は常に既約で、分母は正に正規化される。",
  "example": "from fractions import Fraction\nprint(Fraction(3, 4) + Fraction(1, 4))",
  "caution": "演算は正確な有理数演算（内部で任意精度）。float との混合演算は float に寄せられる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fractions.html#fractions.Fraction"
 },
 {
  "name": "fractions.Fraction.__ceil__",
  "category": "標準ライブラリ",
  "syntax": "Fraction.__ceil__()",
  "description": "天井（以上で最小の整数）を int で返す。",
  "example": "from fractions import Fraction\nprint(Fraction(7, 2).__ceil__())",
  "caution": "組み込みの math.ceil からも同じ結果になるが、本エンジンでは math.ceil が Fraction を受け付けないため、メソッド経由で使う（基盤要請として報告済み）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fractions.html#fractions.Fraction.__ceil__"
 },
 {
  "name": "fractions.Fraction.__floor__",
  "category": "標準ライブラリ",
  "syntax": "Fraction.__floor__()",
  "description": "床（以下で最大の整数）を int で返す。",
  "example": "from fractions import Fraction\nprint(Fraction(7, 2).__floor__())",
  "caution": "組み込みの math.floor からも同じ結果になるが、本エンジンでは math.floor が Fraction を受け付けないため、メソッド経由で使う（基盤要請として報告済み）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fractions.html#fractions.Fraction.__floor__"
 },
 {
  "name": "fractions.Fraction.__format__",
  "category": "標準ライブラリ",
  "syntax": "Fraction.__format__(spec)",
  "description": "書式指定 spec で書式化した文字列を返す。float と同じ e/f/g/% 書式が使える。",
  "example": "from fractions import Fraction\nprint(Fraction(1, 3).__format__('.2f'))",
  "caution": "組み込みの format() 経由では本エンジンが書式指定を Fraction に渡せないため、メソッド経由で使う（基盤要請として報告済み）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fractions.html#fractions.Fraction.__format__"
 },
 {
  "name": "fractions.Fraction.__round__",
  "category": "標準ライブラリ",
  "syntax": "Fraction.__round__(ndigits=None)",
  "description": "ndigits なしでは最近接の整数（同点は偶数）へ、ndigits 指定ではその桁へ丸めた Fraction を返す。",
  "example": "from fractions import Fraction\nprint(Fraction(5, 2).__round__())",
  "caution": "組み込みの round() は本エンジンでは Fraction に委譲されないため、メソッド経由で使う（基盤要請として報告済み）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fractions.html#fractions.Fraction.__round__"
 },
 {
  "name": "fractions.Fraction.as_integer_ratio",
  "category": "標準ライブラリ",
  "syntax": "Fraction.as_integer_ratio()",
  "description": "(分子, 分母) の組を返す。",
  "example": "from fractions import Fraction\nprint(Fraction(3, 4).as_integer_ratio())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fractions.html#fractions.Fraction.as_integer_ratio"
 },
 {
  "name": "fractions.Fraction.denominator",
  "category": "標準ライブラリ",
  "syntax": "Fraction.denominator",
  "description": "既約にした分母（属性）。",
  "example": "from fractions import Fraction\nprint(Fraction(6, 8).denominator)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fractions.html#fractions.Fraction.denominator"
 },
 {
  "name": "fractions.Fraction.from_decimal",
  "category": "標準ライブラリ",
  "syntax": "Fraction.from_decimal(dec)",
  "description": "Decimal（または int）から正確な Fraction を作るクラスメソッド。",
  "example": "from fractions import Fraction\nfrom decimal import Decimal\nprint(Fraction.from_decimal(Decimal('1.1')))",
  "caution": "Decimal 本体の実装は他群の担当で、本群では Decimal 値からの変換を実走照合できていないため未検証です（int の入力は動作します）。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/fractions.html#fractions.Fraction.from_decimal"
 },
 {
  "name": "fractions.Fraction.from_float",
  "category": "標準ライブラリ",
  "syntax": "Fraction.from_float(flt)",
  "description": "float の正確な値（float が実際に表す有理数）から Fraction を作るクラスメソッド。",
  "example": "from fractions import Fraction\nprint(Fraction.from_float(0.5))",
  "caution": "0.1 のような float は、表示どおりの 1/10 ではなく float が表す厳密な有理数になる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fractions.html#fractions.Fraction.from_float"
 },
 {
  "name": "fractions.Fraction.from_number",
  "category": "標準ライブラリ",
  "syntax": "Fraction.from_number(number)",
  "description": "as_integer_ratio を持つ数値全般から Fraction を作るクラスメソッド（Python 3.14 で追加）。",
  "example": "from fractions import Fraction\nprint(Fraction.from_number(0.5))",
  "caution": "Python 3.14 で追加されたため、ローカルの CPython 3.12 では実走できず、公式ドキュメント 3.15 の受け入れ規則に基づいて実装した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fractions.html#fractions.Fraction.from_number"
 },
 {
  "name": "fractions.Fraction.is_integer",
  "category": "標準ライブラリ",
  "syntax": "Fraction.is_integer()",
  "description": "整数値（分母が1）かどうかを返す（Python 3.12 で追加）。",
  "example": "from fractions import Fraction\nprint(Fraction(4, 2).is_integer())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fractions.html#fractions.Fraction.is_integer"
 },
 {
  "name": "fractions.Fraction.limit_denominator",
  "category": "標準ライブラリ",
  "syntax": "Fraction.limit_denominator(max_denominator=1000000)",
  "description": "分母が max_denominator 以下の最も近い Fraction を返す。",
  "example": "from fractions import Fraction\nprint(Fraction(355, 113).limit_denominator(10))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fractions.html#fractions.Fraction.limit_denominator"
 },
 {
  "name": "fractions.Fraction.numerator",
  "category": "標準ライブラリ",
  "syntax": "Fraction.numerator",
  "description": "既約にした分子（属性）。",
  "example": "from fractions import Fraction\nprint(Fraction(6, 8).numerator)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/fractions.html#fractions.Fraction.numerator"
 }
];
