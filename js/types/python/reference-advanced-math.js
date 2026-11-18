/* 高度モード B7：math モジュールのリファレンス差分（全67件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 基礎に実在する9件は referenceOverrides、残り58件は referenceAdvanced。
 * 生成器：work/adv-b7-tools/gen-ref-math.py */
export const referenceAdvanced = [
 {
  "name": "math.trunc",
  "category": "標準ライブラリ",
  "syntax": "math.trunc(x)",
  "description": "x の小数部を切り捨てた整数を int で返す。",
  "example": "import math\nprint(math.trunc(-3.7))",
  "caution": "floor と違い、0 の側へ切り捨てる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.trunc"
 },
 {
  "name": "math.factorial",
  "category": "標準ライブラリ",
  "syntax": "math.factorial(x)",
  "description": "x の階乗を int で返す。",
  "example": "import math\nprint(math.factorial(5))",
  "caution": "負数では ValueError。float は渡せない（TypeError）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.factorial"
 },
 {
  "name": "math.gcd",
  "category": "標準ライブラリ",
  "syntax": "math.gcd(*integers)",
  "description": "引数すべての最大公約数を int で返す。",
  "example": "import math\nprint(math.gcd(12, 18))",
  "caution": "引数なしでは 0。float は渡せない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.gcd"
 },
 {
  "name": "math.lcm",
  "category": "標準ライブラリ",
  "syntax": "math.lcm(*integers)",
  "description": "引数すべての最小公倍数を int で返す。",
  "example": "import math\nprint(math.lcm(4, 6))",
  "caution": "引数なしでは 1。0 を含むと 0。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.lcm"
 },
 {
  "name": "math.comb",
  "category": "標準ライブラリ",
  "syntax": "math.comb(n, k)",
  "description": "組み合わせの総数 nCk を int で返す。",
  "example": "import math\nprint(math.comb(5, 2))",
  "caution": "k > n では 0。負数では ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.comb"
 },
 {
  "name": "math.perm",
  "category": "標準ライブラリ",
  "syntax": "math.perm(n, k=None)",
  "description": "順列の総数 nPk を int で返す。k 省略時は n! 。",
  "example": "import math\nprint(math.perm(5, 2))",
  "caution": "k > n では 0。負数では ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.perm"
 },
 {
  "name": "math.isqrt",
  "category": "標準ライブラリ",
  "syntax": "math.isqrt(x)",
  "description": "x の整数平方根（平方根の切り下げ）を int で返す。",
  "example": "import math\nprint(math.isqrt(10))",
  "caution": "負数では ValueError。float は渡せない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.isqrt"
 },
 {
  "name": "math.prod",
  "category": "標準ライブラリ",
  "syntax": "math.prod(iterable, *, start=1)",
  "description": "iterable の要素の積を返す。start で初期値を指定できる。",
  "example": "import math\nprint(math.prod([2, 3, 4]))",
  "caution": "空では start の値（既定 1）。int だけなら int が返る。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.prod"
 },
 {
  "name": "math.sumprod",
  "category": "標準ライブラリ",
  "syntax": "math.sumprod(p, q)",
  "description": "2つの iterable の要素同士の積の合計を返す。",
  "example": "import math\nprint(math.sumprod([1, 2], [3, 4]))",
  "caution": "長さが違うと ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.sumprod"
 },
 {
  "name": "math.fsum",
  "category": "標準ライブラリ",
  "syntax": "math.fsum(iterable)",
  "description": "浮動小数点数を高精度に合計し float で返す。",
  "example": "import math\nprint(math.fsum([0.1] * 10))",
  "caution": "通常の sum より誤差が小さい。合計があふれると OverflowError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.fsum"
 },
 {
  "name": "math.pow",
  "category": "標準ライブラリ",
  "syntax": "math.pow(x, y)",
  "description": "x の y 乗を float で返す。",
  "example": "import math\nprint(math.pow(2, 3))",
  "caution": "組み込みの ** と違い常に戻り値は float。結果が実数にならないと ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.pow"
 },
 {
  "name": "math.exp",
  "category": "標準ライブラリ",
  "syntax": "math.exp(x)",
  "description": "e の x 乗を float で返す。",
  "example": "import math\nprint(math.exp(1))",
  "caution": "大きすぎる x では OverflowError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.exp"
 },
 {
  "name": "math.exp2",
  "category": "標準ライブラリ",
  "syntax": "math.exp2(x)",
  "description": "2 の x 乗を float で返す（Python 3.11以降）。",
  "example": "import math\nprint(math.exp2(10))",
  "caution": "大きすぎる x では OverflowError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.exp2"
 },
 {
  "name": "math.expm1",
  "category": "標準ライブラリ",
  "syntax": "math.expm1(x)",
  "description": "e の x 乗から 1 を引いた値を高精度に返す。",
  "example": "import math\nprint(math.expm1(1))",
  "caution": "x が 0 に近いときに exp(x) - 1 より正確。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.expm1"
 },
 {
  "name": "math.log",
  "category": "標準ライブラリ",
  "syntax": "math.log(x, base=None)",
  "description": "x の自然対数。base を指定するとその底の対数。",
  "example": "import math\nprint(math.log(8, 2))",
  "caution": "x が 0 以下では ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.log"
 },
 {
  "name": "math.log2",
  "category": "標準ライブラリ",
  "syntax": "math.log2(x)",
  "description": "x の 2 を底とする対数を返す。",
  "example": "import math\nprint(math.log2(8))",
  "caution": "x が 0 以下では ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.log2"
 },
 {
  "name": "math.log10",
  "category": "標準ライブラリ",
  "syntax": "math.log10(x)",
  "description": "x の 10 を底とする対数を返す。",
  "example": "import math\nprint(math.log10(1000))",
  "caution": "x が 0 以下では ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.log10"
 },
 {
  "name": "math.log1p",
  "category": "標準ライブラリ",
  "syntax": "math.log1p(x)",
  "description": "1 + x の自然対数を高精度に返す。",
  "example": "import math\nprint(math.log1p(1))",
  "caution": "x が -1 以下では ValueError。x が 0 に近いときに正確。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.log1p"
 },
 {
  "name": "math.cbrt",
  "category": "標準ライブラリ",
  "syntax": "math.cbrt(x)",
  "description": "x の立方根を float で返す（Python 3.11以降）。",
  "example": "import math\nprint(math.cbrt(-8))",
  "caution": "負数の立方根も実数で返る。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.cbrt"
 },
 {
  "name": "math.sin",
  "category": "標準ライブラリ",
  "syntax": "math.sin(x)",
  "description": "x（ラジアン）の正弦を返す。",
  "example": "import math\nprint(math.sin(math.pi / 2))",
  "caution": "引数はラジアン。度数法は math.radians で変換する。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.sin"
 },
 {
  "name": "math.cos",
  "category": "標準ライブラリ",
  "syntax": "math.cos(x)",
  "description": "x（ラジアン）の余弦を返す。",
  "example": "import math\nprint(math.cos(0))",
  "caution": "引数はラジアン。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.cos"
 },
 {
  "name": "math.tan",
  "category": "標準ライブラリ",
  "syntax": "math.tan(x)",
  "description": "x（ラジアン）の正接を返す。",
  "example": "import math\nprint(math.tan(0))",
  "caution": "引数はラジアン。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.tan"
 },
 {
  "name": "math.asin",
  "category": "標準ライブラリ",
  "syntax": "math.asin(x)",
  "description": "x の逆正弦をラジアンで返す。",
  "example": "import math\nprint(math.asin(1))",
  "caution": "x が -1〜1 の範囲外では ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.asin"
 },
 {
  "name": "math.acos",
  "category": "標準ライブラリ",
  "syntax": "math.acos(x)",
  "description": "x の逆余弦をラジアンで返す。",
  "example": "import math\nprint(math.acos(1))",
  "caution": "x が -1〜1 の範囲外では ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.acos"
 },
 {
  "name": "math.atan",
  "category": "標準ライブラリ",
  "syntax": "math.atan(x)",
  "description": "x の逆正接をラジアンで返す。",
  "example": "import math\nprint(math.atan(1))",
  "caution": "象限を考慮する場合は atan2 を使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.atan"
 },
 {
  "name": "math.atan2",
  "category": "標準ライブラリ",
  "syntax": "math.atan2(y, x)",
  "description": "y / x の逆正接を、象限を考慮してラジアンで返す。",
  "example": "import math\nprint(math.atan2(1, 1))",
  "caution": "引数の順序は (y, x)。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.atan2"
 },
 {
  "name": "math.sinh",
  "category": "標準ライブラリ",
  "syntax": "math.sinh(x)",
  "description": "x の双曲線正弦を返す。",
  "example": "import math\nprint(math.sinh(0))",
  "caution": "大きすぎる x では OverflowError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.sinh"
 },
 {
  "name": "math.cosh",
  "category": "標準ライブラリ",
  "syntax": "math.cosh(x)",
  "description": "x の双曲線余弦を返す。",
  "example": "import math\nprint(math.cosh(0))",
  "caution": "大きすぎる x では OverflowError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.cosh"
 },
 {
  "name": "math.tanh",
  "category": "標準ライブラリ",
  "syntax": "math.tanh(x)",
  "description": "x の双曲線正接を返す。",
  "example": "import math\nprint(math.tanh(0))",
  "caution": "戻り値は -1〜1 の範囲。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.tanh"
 },
 {
  "name": "math.asinh",
  "category": "標準ライブラリ",
  "syntax": "math.asinh(x)",
  "description": "x の逆双曲線正弦を返す。",
  "example": "import math\nprint(math.asinh(0))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.asinh"
 },
 {
  "name": "math.acosh",
  "category": "標準ライブラリ",
  "syntax": "math.acosh(x)",
  "description": "x の逆双曲線余弦を返す。",
  "example": "import math\nprint(math.acosh(1))",
  "caution": "x が 1 未満では ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.acosh"
 },
 {
  "name": "math.atanh",
  "category": "標準ライブラリ",
  "syntax": "math.atanh(x)",
  "description": "x の逆双曲線正接を返す。",
  "example": "import math\nprint(math.atanh(0))",
  "caution": "x が -1〜1 の範囲外（両端を含む）では ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.atanh"
 },
 {
  "name": "math.degrees",
  "category": "標準ライブラリ",
  "syntax": "math.degrees(x)",
  "description": "ラジアンを度数法（度）に変換する。",
  "example": "import math\nprint(math.degrees(math.pi))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.degrees"
 },
 {
  "name": "math.radians",
  "category": "標準ライブラリ",
  "syntax": "math.radians(x)",
  "description": "度数法（度）をラジアンに変換する。",
  "example": "import math\nprint(math.radians(180))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.radians"
 },
 {
  "name": "math.hypot",
  "category": "標準ライブラリ",
  "syntax": "math.hypot(*coordinates)",
  "description": "座標のユークリッドノルム sqrt(x1²+…+xn²) を返す。",
  "example": "import math\nprint(math.hypot(3, 4))",
  "caution": "引数なしでは 0.0。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.hypot"
 },
 {
  "name": "math.dist",
  "category": "標準ライブラリ",
  "syntax": "math.dist(p, q)",
  "description": "2点間のユークリッド距離を返す。",
  "example": "import math\nprint(math.dist((0, 0), (3, 4)))",
  "caution": "2点の次元数が違うと ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.dist"
 },
 {
  "name": "math.fmod",
  "category": "標準ライブラリ",
  "syntax": "math.fmod(x, y)",
  "description": "x / y の剰余（符号は x と同じ）を float で返す。",
  "example": "import math\nprint(math.fmod(-3, 2))",
  "caution": "y が 0 では ValueError。% 演算子とは負数の扱いが違う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.fmod"
 },
 {
  "name": "math.remainder",
  "category": "標準ライブラリ",
  "syntax": "math.remainder(x, y)",
  "description": "x の y による IEEE 754 剰余を返す（商は偶数へ丸める）。",
  "example": "import math\nprint(math.remainder(7, 2))",
  "caution": "y が 0 では ValueError。fmod と違い最も近い商で割る。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.remainder"
 },
 {
  "name": "math.modf",
  "category": "標準ライブラリ",
  "syntax": "math.modf(x)",
  "description": "x の小数部と整数部を (小数部, 整数部) のタプルで返す。",
  "example": "import math\nprint(math.modf(3.5))",
  "caution": "両方とも float で、符号は x と同じ。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.modf"
 },
 {
  "name": "math.frexp",
  "category": "標準ライブラリ",
  "syntax": "math.frexp(x)",
  "description": "x を (仮数, 指数) に分解する。x = 仮数 × 2^指数。",
  "example": "import math\nprint(math.frexp(8))",
  "caution": "逆の操作は ldexp。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.frexp"
 },
 {
  "name": "math.ldexp",
  "category": "標準ライブラリ",
  "syntax": "math.ldexp(x, i)",
  "description": "x × 2^i を返す（frexp の逆）。",
  "example": "import math\nprint(math.ldexp(0.5, 4))",
  "caution": "結果があふれると OverflowError。i は整数。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.ldexp"
 },
 {
  "name": "math.copysign",
  "category": "標準ライブラリ",
  "syntax": "math.copysign(x, y)",
  "description": "x の大きさに y の符号を付けた float を返す。",
  "example": "import math\nprint(math.copysign(3, -1))",
  "caution": "-0.0 の符号も負として扱う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.copysign"
 },
 {
  "name": "math.isfinite",
  "category": "標準ライブラリ",
  "syntax": "math.isfinite(x)",
  "description": "x が有限（inf でも nan でもない）かを返す。",
  "example": "import math\nprint(math.isfinite(1.5))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.isfinite"
 },
 {
  "name": "math.isinf",
  "category": "標準ライブラリ",
  "syntax": "math.isinf(x)",
  "description": "x が正または負の無限大かを返す。",
  "example": "import math\nprint(math.isinf(math.inf))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.isinf"
 },
 {
  "name": "math.isnan",
  "category": "標準ライブラリ",
  "syntax": "math.isnan(x)",
  "description": "x が NaN かを返す。",
  "example": "import math\nprint(math.isnan(math.nan))",
  "caution": "NaN の判定は == ではできない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.isnan"
 },
 {
  "name": "math.isclose",
  "category": "標準ライブラリ",
  "syntax": "math.isclose(a, b, *, rel_tol=1e-09, abs_tol=0.0)",
  "description": "2値が近いかどうかを、相対誤差・絶対誤差の許容値で判定する。",
  "example": "import math\nprint(math.isclose(0.1 + 0.2, 0.3))",
  "caution": "許容値に負数は使えない（ValueError）。NaN 同士は False。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.isclose"
 },
 {
  "name": "math.erf",
  "category": "標準ライブラリ",
  "syntax": "math.erf(x)",
  "description": "x の誤差関数 erf(x) を返す。",
  "example": "import math\nprint(math.erf(1))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.erf"
 },
 {
  "name": "math.erfc",
  "category": "標準ライブラリ",
  "syntax": "math.erfc(x)",
  "description": "相補誤差関数 1 - erf(x) を返す。",
  "example": "import math\nprint(math.erfc(1))",
  "caution": "大きな x では erf 経由より正確。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.erfc"
 },
 {
  "name": "math.gamma",
  "category": "標準ライブラリ",
  "syntax": "math.gamma(x)",
  "description": "x のガンマ関数 Γ(x) を返す。",
  "example": "import math\nprint(math.gamma(5))",
  "caution": "0 と負の整数では ValueError。正の整数 n では (n-1)! 。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.gamma"
 },
 {
  "name": "math.lgamma",
  "category": "標準ライブラリ",
  "syntax": "math.lgamma(x)",
  "description": "ガンマ関数の絶対値の自然対数を返す。",
  "example": "import math\nprint(math.lgamma(5))",
  "caution": "0 と負の整数では ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.lgamma"
 },
 {
  "name": "math.nextafter",
  "category": "標準ライブラリ",
  "syntax": "math.nextafter(x, y)",
  "description": "x から y の方向へ、浮動小数点数として次の値を返す。",
  "example": "import math\nprint(math.nextafter(1.0, 2.0))",
  "caution": "x と y が等しい場合は y を返す。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.nextafter"
 },
 {
  "name": "math.ulp",
  "category": "標準ライブラリ",
  "syntax": "math.ulp(x)",
  "description": "x の最下位ビット単位（1 ulp）の大きさを返す。",
  "example": "import math\nprint(math.ulp(1.0))",
  "caution": "ulp(0.0) は最小の非正規化数 5e-324。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.ulp"
 },
 {
  "name": "math.fma",
  "category": "標準ライブラリ",
  "syntax": "math.fma(x, y, z)",
  "description": "融合積和 x*y + z を、途中で丸めずに計算する（Python 3.13以降）。",
  "example": "import math\nprint(math.fma(2, 3, 4))",
  "caution": "x * y + z と違い、積の段階で丸め誤差が出ない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.fma"
 },
 {
  "name": "math.fmax",
  "category": "標準ライブラリ",
  "syntax": "math.fmax(x, y)",
  "description": "2値のうち大きい方を返す。片方が NaN なら他方を返す（Python 3.15以降）。",
  "example": "import math\nprint(math.fmax(1, 2))",
  "caution": "組み込み max と違い NaN を伝播させない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.fmax"
 },
 {
  "name": "math.fmin",
  "category": "標準ライブラリ",
  "syntax": "math.fmin(x, y)",
  "description": "2値のうち小さい方を返す。片方が NaN なら他方を返す（Python 3.15以降）。",
  "example": "import math\nprint(math.fmin(1, 2))",
  "caution": "組み込み min と違い NaN を伝播させない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.fmin"
 },
 {
  "name": "math.signbit",
  "category": "標準ライブラリ",
  "syntax": "math.signbit(x)",
  "description": "x の符号ビットが立っているか（負か）を返す（Python 3.15以降）。",
  "example": "import math\nprint(math.signbit(-0.0))",
  "caution": "-0.0 でも True になる。x < 0 の判定とは異なる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.signbit"
 },
 {
  "name": "math.isnormal",
  "category": "標準ライブラリ",
  "syntax": "math.isnormal(x)",
  "description": "x が正規化数（有限で、0 でなく、非正規化数でない）かを返す（Python 3.15以降）。",
  "example": "import math\nprint(math.isnormal(1.0))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.isnormal"
 },
 {
  "name": "math.issubnormal",
  "category": "標準ライブラリ",
  "syntax": "math.issubnormal(x)",
  "description": "x が非正規化数かを返す（Python 3.15以降）。",
  "example": "import math\nprint(math.issubnormal(5e-324))",
  "caution": "0 は非正規化数ではない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.issubnormal"
 }
];
export const referenceOverrides = [
 {
  "name": "math.pi",
  "description": "円周率 π の近似値（float）。",
  "caution": "定数であり、呼び出しはできない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.pi"
 },
 {
  "name": "math.e",
  "description": "自然対数の底 e の近似値（float）。",
  "caution": "定数であり、呼び出しはできない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.e"
 },
 {
  "name": "math.tau",
  "description": "円周率の2倍 τ = 2π の近似値（float）。",
  "caution": "定数であり、呼び出しはできない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.tau"
 },
 {
  "name": "math.inf",
  "description": "正の無限大（float）。float('inf') と同じ値。",
  "caution": "定数であり、呼び出しはできない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.inf"
 },
 {
  "name": "math.nan",
  "description": "非数（NaN）の float 値。float('nan') と同じ。",
  "caution": "NaN は自分自身とも等しくない。判定には math.isnan を使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.nan"
 },
 {
  "name": "math.sqrt",
  "description": "x の平方根を float で返す。",
  "caution": "負数を渡すと ValueError。戻り値は常に float。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.sqrt"
 },
 {
  "name": "math.fabs",
  "description": "x の絶対値を float で返す。",
  "caution": "組み込み abs と違い、int を渡しても float が返る。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.fabs"
 },
 {
  "name": "math.floor",
  "description": "x 以下の最大の整数（切り下げ）を int で返す。",
  "caution": "負数では -2.5 → -3 のように絶対値が大きい側へ切り下げる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.floor"
 },
 {
  "name": "math.ceil",
  "description": "x 以上の最小の整数（切り上げ）を int で返す。",
  "caution": "戻り値は int。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/math.html#math.ceil"
 }
];
