/* 高度モード B7 G1：random モジュールのリファレンス差分（32件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。 */
export const referenceAdvanced = [
 {
  "name": "random.Random",
  "category": "標準ライブラリ",
  "syntax": "class random.Random(a=None)",
  "description": "Mersenne Twister を中核とする乱数生成器クラス。インスタンスごとに独立した状態を持つ。",
  "example": "import random\nprint(random.Random(42).random())",
  "caution": "seed を与えないインスタンスは時刻等で初期化されるため値は確定しない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.Random"
 },
 {
  "name": "random.Random.getrandbits",
  "category": "標準ライブラリ",
  "syntax": "Random.getrandbits(k)",
  "description": "k ビットの非負整数を返すメソッド。",
  "example": "import random\nr = random.Random(42)\nprint(r.getrandbits(16))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.Random.getrandbits"
 },
 {
  "name": "random.Random.getstate",
  "category": "標準ライブラリ",
  "syntax": "Random.getstate()",
  "description": "生成器の内部状態を表すタプルを返すメソッド。setstate で復元できる。",
  "example": "import random\nr = random.Random(42)\ns = r.getstate()\na = r.random()\nr.setstate(s)\nprint(a == r.random())",
  "caution": "状態タプルの中身は実装依存の形式（バージョン3形式）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.Random.getstate"
 },
 {
  "name": "random.Random.randbytes",
  "category": "標準ライブラリ",
  "syntax": "Random.randbytes(n)",
  "description": "n バイトのランダムな bytes を返すメソッド。",
  "example": "import random\nr = random.Random(42)\nprint(r.randbytes(4))",
  "caution": "bytes 値は本エンジンで表現できないため、結果の値は未検証です（乱数列の消費だけは再現します）。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.Random.randbytes"
 },
 {
  "name": "random.Random.random",
  "category": "標準ライブラリ",
  "syntax": "Random.random()",
  "description": "[0.0, 1.0) のランダムな float を返すメソッド。",
  "example": "import random\nprint(random.Random(42).random())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.Random.random"
 },
 {
  "name": "random.Random.seed",
  "category": "標準ライブラリ",
  "syntax": "Random.seed(a=None, version=2)",
  "description": "生成器をシードで初期化するメソッド。",
  "example": "import random\nr = random.Random()\nr.seed(42)\nprint(r.random())",
  "caution": "bytes のシードは本エンジンで表現できないため未対応（値は確定しない）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.Random.seed"
 },
 {
  "name": "random.Random.setstate",
  "category": "標準ライブラリ",
  "syntax": "Random.setstate(state)",
  "description": "getstate で得た内部状態を復元するメソッド。",
  "example": "import random\nr = random.Random(42)\ns = r.getstate()\na = r.random()\nr.setstate(s)\nprint(a == r.random())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.Random.setstate"
 },
 {
  "name": "random.SystemRandom",
  "category": "標準ライブラリ",
  "syntax": "class random.SystemRandom",
  "description": "OS の乱数源を使う生成器クラス。状態の取得・設定は NotImplementedError。",
  "example": "import random\nprint(random.SystemRandom().getstate())",
  "caution": "乱数源が OS のため再現性がなく、値は確定できないため未検証です。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.SystemRandom"
 },
 {
  "name": "random.betavariate",
  "category": "標準ライブラリ",
  "syntax": "random.betavariate(alpha, beta)",
  "description": "ベータ分布の乱数。",
  "example": "import random\nrandom.seed(5)\nprint(round(random.betavariate(2, 5), 10))",
  "caution": "超越関数の評価で CPython（libm）と最終桁が 1ulp ずれる場合がある（実測範囲は報告書に記載）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.betavariate"
 },
 {
  "name": "random.binomialvariate",
  "category": "標準ライブラリ",
  "syntax": "random.binomialvariate(n=1, p=0.5)",
  "description": "二項分布の乱数（成功回数）。",
  "example": "import random\nrandom.seed(5)\nprint(random.binomialvariate(10, 0.3))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.binomialvariate"
 },
 {
  "name": "random.choice",
  "category": "標準ライブラリ",
  "syntax": "random.choice(seq)",
  "description": "空でないシーケンスから要素を1つランダムに選ぶ。",
  "example": "import random\nrandom.seed(7)\nprint(random.choice([10, 20, 30]))",
  "caution": "空のシーケンスでは IndexError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.choice"
 },
 {
  "name": "random.choices",
  "category": "標準ライブラリ",
  "syntax": "random.choices(population, weights=None, *, cum_weights=None, k=1)",
  "description": "重み付きで要素を k 個（重複あり）選んだリストを返す。",
  "example": "import random\nrandom.seed(7)\nprint(random.choices([1, 2, 3], k=4))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.choices"
 },
 {
  "name": "random.expovariate",
  "category": "標準ライブラリ",
  "syntax": "random.expovariate(lambd=1.0)",
  "description": "指数分布の乱数。",
  "example": "import random\nrandom.seed(5)\nprint(random.expovariate(1.5))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.expovariate"
 },
 {
  "name": "random.gammavariate",
  "category": "標準ライブラリ",
  "syntax": "random.gammavariate(alpha, beta)",
  "description": "ガンマ分布の乱数。alpha と beta は正でなければならない。",
  "example": "import random\nrandom.seed(5)\nprint(random.gammavariate(2, 3))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.gammavariate"
 },
 {
  "name": "random.gauss",
  "category": "標準ライブラリ",
  "syntax": "random.gauss(mu=0.0, sigma=1.0)",
  "description": "ガウス（正規）分布の乱数。normalvariate より高速だがスレッド安全ではない。",
  "example": "import random\nrandom.seed(2024)\nprint(random.gauss(0, 1))",
  "caution": "呼び出しごとに内部に次の値を保持するため、列は呼び出し順に依存する（CPython と同じ手順で再現）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.gauss"
 },
 {
  "name": "random.getrandbits",
  "category": "標準ライブラリ",
  "syntax": "random.getrandbits(k)",
  "description": "k ビットの非負整数を返す（モジュールレベルの共有生成器）。",
  "example": "import random\nrandom.seed(99)\nprint(random.getrandbits(16))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.getrandbits"
 },
 {
  "name": "random.getstate",
  "category": "標準ライブラリ",
  "syntax": "random.getstate()",
  "description": "共有生成器の内部状態を返す。",
  "example": "import random\nrandom.seed(42)\ns = random.getstate()\na = random.random()\nrandom.setstate(s)\nprint(a == random.random())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.getstate"
 },
 {
  "name": "random.lognormvariate",
  "category": "標準ライブラリ",
  "syntax": "random.lognormvariate(mu, sigma)",
  "description": "対数正規分布の乱数。",
  "example": "import random\nrandom.seed(5)\nprint(random.lognormvariate(0, 1))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.lognormvariate"
 },
 {
  "name": "random.normalvariate",
  "category": "標準ライブラリ",
  "syntax": "random.normalvariate(mu=0.0, sigma=1.0)",
  "description": "正規分布の乱数（スレッド安全な方式）。",
  "example": "import random\nrandom.seed(5)\nprint(random.normalvariate(0, 1))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.normalvariate"
 },
 {
  "name": "random.paretovariate",
  "category": "標準ライブラリ",
  "syntax": "random.paretovariate(alpha)",
  "description": "パレート分布の乱数。",
  "example": "import random\nrandom.seed(5)\nprint(random.paretovariate(2))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.paretovariate"
 },
 {
  "name": "random.randbytes",
  "category": "標準ライブラリ",
  "syntax": "random.randbytes(n)",
  "description": "n バイトのランダムな bytes を返す。",
  "example": "import random\nrandom.seed(42)\nprint(random.randbytes(4))",
  "caution": "bytes 値は本エンジンで表現できないため、結果の値は未検証です（乱数列の消費だけは再現します）。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.randbytes"
 },
 {
  "name": "random.randint",
  "category": "標準ライブラリ",
  "syntax": "random.randint(a, b)",
  "description": "a <= N <= b のランダムな整数。randrange(a, b+1) の別名。",
  "example": "import random\nrandom.seed(0)\nprint(random.randint(1, 100))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.randint"
 },
 {
  "name": "random.random",
  "category": "標準ライブラリ",
  "syntax": "random.random()",
  "description": "[0.0, 1.0) のランダムな float（共有生成器）。",
  "example": "import random\nrandom.seed(42)\nprint(random.random())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.random"
 },
 {
  "name": "random.randrange",
  "category": "標準ライブラリ",
  "syntax": "random.randrange(start, stop=None, step=1)",
  "description": "range(start, stop, step) からランダムに選んだ要素。",
  "example": "import random\nrandom.seed(123)\nprint(random.randrange(10))",
  "caution": "空の範囲では ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.randrange"
 },
 {
  "name": "random.sample",
  "category": "標準ライブラリ",
  "syntax": "random.sample(population, k, *, counts=None)",
  "description": "重複なしで k 個選んだリストを返す。",
  "example": "import random\nrandom.seed(7)\nprint(random.sample([1, 2, 3, 4, 5, 6], 3))",
  "caution": "k が母集団より大きい場合は ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.sample"
 },
 {
  "name": "random.seed",
  "category": "標準ライブラリ",
  "syntax": "random.seed(a=None, version=2)",
  "description": "共有生成器をシードで初期化する。int／float／str／bytes が使える。",
  "example": "import random\nrandom.seed(42)\nprint(random.random())",
  "caution": "bytes のシードは本エンジンで表現できないため未対応（値は確定しない）。文字列シード（version 2）は SHA-512 経由で処理し CPython と一致する。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.seed"
 },
 {
  "name": "random.setstate",
  "category": "標準ライブラリ",
  "syntax": "random.setstate(state)",
  "description": "共有生成器の内部状態を復元する。",
  "example": "import random\nrandom.seed(42)\ns = random.getstate()\na = random.random()\nrandom.setstate(s)\nprint(a == random.random())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.setstate"
 },
 {
  "name": "random.shuffle",
  "category": "標準ライブラリ",
  "syntax": "random.shuffle(x)",
  "description": "シーケンス x をインプレースでシャッフルする。",
  "example": "import random\nrandom.seed(7)\nx = [1, 2, 3, 4, 5]\nrandom.shuffle(x)\nprint(x)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.shuffle"
 },
 {
  "name": "random.triangular",
  "category": "標準ライブラリ",
  "syntax": "random.triangular(low=0.0, high=1.0, mode=None)",
  "description": "三角分布の乱数。",
  "example": "import random\nrandom.seed(5)\nprint(random.triangular(0, 10, 5))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.triangular"
 },
 {
  "name": "random.uniform",
  "category": "標準ライブラリ",
  "syntax": "random.uniform(a, b)",
  "description": "a <= N <= b のランダムな float。",
  "example": "import random\nrandom.seed(7)\nprint(random.uniform(1, 5))",
  "caution": "端点 b を含むかどうかは浮動小数点の丸めに依存する。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.uniform"
 },
 {
  "name": "random.vonmisesvariate",
  "category": "標準ライブラリ",
  "syntax": "random.vonmisesvariate(mu, kappa)",
  "description": "フォン・ミーゼス分布（円周上の分布）の乱数。",
  "example": "import random\nrandom.seed(5)\nprint(round(random.vonmisesvariate(0, 1), 10))",
  "caution": "超越関数の評価で CPython（libm）と最終桁が 1ulp ずれる場合がある（実測範囲は報告書に記載）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.vonmisesvariate"
 },
 {
  "name": "random.weibullvariate",
  "category": "標準ライブラリ",
  "syntax": "random.weibullvariate(alpha, beta)",
  "description": "ワイブル分布の乱数。alpha が尺度、beta が形状。",
  "example": "import random\nrandom.seed(5)\nprint(random.weibullvariate(2, 1.5))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/random.html#random.weibullvariate"
 }
];
