/* 高度モード B7 G1：cmath モジュールのリファレンス差分（30件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。 */
export const referenceAdvanced = [
 {
  "name": "cmath.pi",
  "category": "標準ライブラリ",
  "syntax": "cmath.pi",
  "description": "math.pi と同じ円周率 π の float 値。",
  "example": "import cmath\nprint(cmath.pi)",
  "caution": "実数の定数のため、複素数型なしでも正確に解決できます。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.pi"
 },
 {
  "name": "cmath.e",
  "category": "標準ライブラリ",
  "syntax": "cmath.e",
  "description": "自然対数の底 e の float 値。",
  "example": "import cmath\nprint(cmath.e)",
  "caution": "実数の定数のため、複素数型なしでも正確に解決できます。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.e"
 },
 {
  "name": "cmath.tau",
  "category": "標準ライブラリ",
  "syntax": "cmath.tau",
  "description": "円周率の2倍 τ（= 2π）の float 値。",
  "example": "import cmath\nprint(cmath.tau)",
  "caution": "実数の定数のため、複素数型なしでも正確に解決できます。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.tau"
 },
 {
  "name": "cmath.inf",
  "category": "標準ライブラリ",
  "syntax": "cmath.inf",
  "description": "正の無限大の float 値。",
  "example": "import cmath\nprint(cmath.inf)",
  "caution": "実数の定数のため、複素数型なしでも正確に解決できます。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.inf"
 },
 {
  "name": "cmath.nan",
  "category": "標準ライブラリ",
  "syntax": "cmath.nan",
  "description": "NaN（非数）の float 値。",
  "example": "import cmath\nprint(cmath.nan)",
  "caution": "実数の定数のため、複素数型なしでも正確に解決できます。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.nan"
 },
 {
  "name": "cmath.infj",
  "category": "標準ライブラリ",
  "syntax": "cmath.infj",
  "description": "虚部が無限大の複素数 0+infj。",
  "example": "import cmath\nprint(cmath.infj)",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.infj"
 },
 {
  "name": "cmath.nanj",
  "category": "標準ライブラリ",
  "syntax": "cmath.nanj",
  "description": "虚部が NaN の複素数 0+nanj。",
  "example": "import cmath\nprint(cmath.nanj)",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.nanj"
 },
 {
  "name": "cmath.acos",
  "category": "標準ライブラリ",
  "syntax": "cmath.acos(x)",
  "description": "逆余弦を複素数で返す。",
  "example": "import cmath\nprint(cmath.acos(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.acos"
 },
 {
  "name": "cmath.acosh",
  "category": "標準ライブラリ",
  "syntax": "cmath.acosh(x)",
  "description": "逆双曲線余弦を複素数で返す。",
  "example": "import cmath\nprint(cmath.acosh(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.acosh"
 },
 {
  "name": "cmath.asin",
  "category": "標準ライブラリ",
  "syntax": "cmath.asin(x)",
  "description": "逆正弦を複素数で返す。",
  "example": "import cmath\nprint(cmath.asin(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.asin"
 },
 {
  "name": "cmath.asinh",
  "category": "標準ライブラリ",
  "syntax": "cmath.asinh(x)",
  "description": "逆双曲線正弦を複素数で返す。",
  "example": "import cmath\nprint(cmath.asinh(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.asinh"
 },
 {
  "name": "cmath.atan",
  "category": "標準ライブラリ",
  "syntax": "cmath.atan(x)",
  "description": "逆正接を複素数で返す。",
  "example": "import cmath\nprint(cmath.atan(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.atan"
 },
 {
  "name": "cmath.atanh",
  "category": "標準ライブラリ",
  "syntax": "cmath.atanh(x)",
  "description": "逆双曲線正接を複素数で返す。",
  "example": "import cmath\nprint(cmath.atanh(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.atanh"
 },
 {
  "name": "cmath.cos",
  "category": "標準ライブラリ",
  "syntax": "cmath.cos(x)",
  "description": "余弦を複素数で返す。",
  "example": "import cmath\nprint(cmath.cos(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.cos"
 },
 {
  "name": "cmath.cosh",
  "category": "標準ライブラリ",
  "syntax": "cmath.cosh(x)",
  "description": "双曲線余弦を複素数で返す。",
  "example": "import cmath\nprint(cmath.cosh(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.cosh"
 },
 {
  "name": "cmath.exp",
  "category": "標準ライブラリ",
  "syntax": "cmath.exp(x)",
  "description": "e の x 乗を複素数で返す。",
  "example": "import cmath\nprint(cmath.exp(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.exp"
 },
 {
  "name": "cmath.isclose",
  "category": "標準ライブラリ",
  "syntax": "cmath.isclose(x)",
  "description": "2つの複素数が近いかどうかを判定する。",
  "example": "import cmath\nprint(cmath.isclose(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.isclose"
 },
 {
  "name": "cmath.isfinite",
  "category": "標準ライブラリ",
  "syntax": "cmath.isfinite(x)",
  "description": "実部と虚部が両方とも有限かどうかを判定する。",
  "example": "import cmath\nprint(cmath.isfinite(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.isfinite"
 },
 {
  "name": "cmath.isinf",
  "category": "標準ライブラリ",
  "syntax": "cmath.isinf(x)",
  "description": "実部または虚部が無限大かどうかを判定する。",
  "example": "import cmath\nprint(cmath.isinf(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.isinf"
 },
 {
  "name": "cmath.isnan",
  "category": "標準ライブラリ",
  "syntax": "cmath.isnan(x)",
  "description": "実部または虚部が NaN かどうかを判定する。",
  "example": "import cmath\nprint(cmath.isnan(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.isnan"
 },
 {
  "name": "cmath.log",
  "category": "標準ライブラリ",
  "syntax": "cmath.log(x)",
  "description": "複素数の自然対数（底や第2引数で底の指定も可）。",
  "example": "import cmath\nprint(cmath.log(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.log"
 },
 {
  "name": "cmath.log10",
  "category": "標準ライブラリ",
  "syntax": "cmath.log10(x)",
  "description": "複素数の常用対数。",
  "example": "import cmath\nprint(cmath.log10(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.log10"
 },
 {
  "name": "cmath.phase",
  "category": "標準ライブラリ",
  "syntax": "cmath.phase(x)",
  "description": "複素数の偏角（位相）を float で返す。",
  "example": "import cmath\nprint(cmath.phase(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.phase"
 },
 {
  "name": "cmath.polar",
  "category": "標準ライブラリ",
  "syntax": "cmath.polar(x)",
  "description": "複素数を極形式 (r, φ) の組で返す。",
  "example": "import cmath\nprint(cmath.polar(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.polar"
 },
 {
  "name": "cmath.rect",
  "category": "標準ライブラリ",
  "syntax": "cmath.rect(x)",
  "description": "極形式 (r, φ) から複素数を作る。",
  "example": "import cmath\nprint(cmath.rect(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.rect"
 },
 {
  "name": "cmath.sin",
  "category": "標準ライブラリ",
  "syntax": "cmath.sin(x)",
  "description": "正弦を複素数で返す。",
  "example": "import cmath\nprint(cmath.sin(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.sin"
 },
 {
  "name": "cmath.sinh",
  "category": "標準ライブラリ",
  "syntax": "cmath.sinh(x)",
  "description": "双曲線正弦を複素数で返す。",
  "example": "import cmath\nprint(cmath.sinh(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.sinh"
 },
 {
  "name": "cmath.sqrt",
  "category": "標準ライブラリ",
  "syntax": "cmath.sqrt(x)",
  "description": "平方根を複素数で返す。",
  "example": "import cmath\nprint(cmath.sqrt(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.sqrt"
 },
 {
  "name": "cmath.tan",
  "category": "標準ライブラリ",
  "syntax": "cmath.tan(x)",
  "description": "正接を複素数で返す。",
  "example": "import cmath\nprint(cmath.tan(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.tan"
 },
 {
  "name": "cmath.tanh",
  "category": "標準ライブラリ",
  "syntax": "cmath.tanh(x)",
  "description": "双曲線正接を複素数で返す。",
  "example": "import cmath\nprint(cmath.tanh(1+1j))",
  "caution": "本アプリの高度モードでは未対応です。エンジンに複素数値型がないため、複素数を返す・受け取る項目は表現できません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmath.html#cmath.tanh"
 }
];
