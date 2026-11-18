/* 高度モード B7 G5：functools モジュールのリファレンス差分（全19件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 生成器：docs/audit/gen-ref-g5.py */
export const referenceAdvanced = [
 {
  "name": "functools.Placeholder",
  "category": "標準ライブラリ",
  "syntax": "functools.Placeholder",
  "description": "partial の位置引数の空きスロットを表す単一の番兵（3.14 で追加）。partial の引数に置くと、その位置は呼び出し時の位置引数で埋められる。",
  "example": "import functools\nprint(functools.Placeholder)",
  "caution": "キーワード引数の値にはできない。呼び出し時にはすべてのスロットを埋める必要がある。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.Placeholder"
 },
 {
  "name": "functools.cache",
  "category": "標準ライブラリ",
  "syntax": "functools.cache(user_function)",
  "description": "関数の戻り値を無制限にキャッシュするデコレータ。lru_cache(maxsize=None) と等価（3.9 で追加）。",
  "example": "import functools\n@functools.cache\ndef f(x):\n    return x * 2\nprint(f(3), f(3))",
  "caution": "キャッシュは無制限に育つ。ラップされた関数には cache_info() などが付く。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.cache"
 },
 {
  "name": "functools.cached_property",
  "category": "標準ライブラリ",
  "syntax": "functools.cached_property(func)",
  "description": "プロパティのように振る舞うが、値を一度だけ計算してインスタンスの辞書に保存し、以後はそれを返すデコレータ。",
  "example": "import functools\nclass C:\n    @functools.cached_property\n    def value(self):\n        return 42\nprint(C().value)",
  "caution": "この学習環境では未検証（エンジンに必要な仕組みがない）ため、呼び出すと未検証である旨が表示され、結果は確定しません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.cached_property"
 },
 {
  "name": "functools.cmp_to_key",
  "category": "標準ライブラリ",
  "syntax": "functools.cmp_to_key(mycmp)",
  "description": "旧式の比較関数（2引数を受け取り、負・0・正を返す）を、sorted などのキー関数として使えるクラスに変換する。",
  "example": "import functools\ndef cmp(a, b):\n    return b - a\nprint(sorted([3, 1, 2], key=functools.cmp_to_key(cmp)))",
  "caution": "変換されたオブジェクトはハッシュ化できない（集合の要素や辞書のキーにできない）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.cmp_to_key"
 },
 {
  "name": "functools.lru_cache",
  "category": "標準ライブラリ",
  "syntax": "functools.lru_cache(user_function=None, *, maxsize=128, typed=False)",
  "description": "最近使われていないエントリから捨てるキャッシュで関数をラップするデコレータ。同じ引数での再呼び出しは計算を省く。",
  "example": "import functools\n@functools.lru_cache(maxsize=None)\ndef f(x):\n    return x + 1\nprint(f(1), f(1), f.cache_info())",
  "caution": "引数はハッシュ可能でなければならない。typed=True では 1 と 1.0 を別々にキャッシュする。キーワード引数の並び順もキャッシュの区別に含まれる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.lru_cache"
 },
 {
  "name": "functools.lru_cache.cache_clear",
  "category": "標準ライブラリ",
  "syntax": "wrapper.cache_clear()",
  "description": "キャッシュの中身とヒット統計をすべて消す。戻り値は None。",
  "example": "import functools\n@functools.lru_cache(maxsize=None)\ndef f(x):\n    return x + 1\nf(1)\nf.cache_clear()\nprint(f.cache_info())",
  "caution": "キャッシュ統計も 0 に戻る。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.lru_cache"
 },
 {
  "name": "functools.lru_cache.cache_info",
  "category": "標準ライブラリ",
  "syntax": "wrapper.cache_info()",
  "description": "キャッシュの状態を CacheInfo(hits, misses, maxsize, currsize) という名前付きタプルで返す。",
  "example": "import functools\n@functools.lru_cache(maxsize=None)\ndef f(x):\n    return x + 1\nf(1)\nf(1)\nprint(f.cache_info())",
  "caution": "maxsize が None のときは無制限を表す。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.lru_cache"
 },
 {
  "name": "functools.partial",
  "category": "標準ライブラリ",
  "syntax": "functools.partial(func, /, *args, **keywords)",
  "description": "引数の一部を固定した新しい呼び出し可能オブジェクトを作る。固定した位置引数の後ろに、呼び出し時の引数が続く。",
  "example": "import functools\nprint(functools.partial(pow, 2)(5))",
  "caution": "最初の引数が呼び出し可能でないと TypeError。partial の入れ子は自動で平坦化される。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.partial"
 },
 {
  "name": "functools.partial.args",
  "category": "標準ライブラリ",
  "syntax": "partial_obj.args",
  "description": "partial オブジェクトに固定された位置引数のタプル。",
  "example": "import functools\np = functools.partial(pow, 2)\nprint(p.args)",
  "caution": "読み取り専用の属性。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.partial"
 },
 {
  "name": "functools.partial.func",
  "category": "標準ライブラリ",
  "syntax": "partial_obj.func",
  "description": "partial オブジェクトがラップしている元の呼び出し可能オブジェクト。",
  "example": "import functools\ndef f(a, b):\n    return a + b\np = functools.partial(f, 1)\nprint(p.func is f)",
  "caution": "読み取り専用の属性。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.partial"
 },
 {
  "name": "functools.partial.keywords",
  "category": "標準ライブラリ",
  "syntax": "partial_obj.keywords",
  "description": "partial オブジェクトに固定されたキーワード引数の辞書。",
  "example": "from functools import partial\np = partial(dict, a=1)\nprint(p.keywords)",
  "caution": "呼び出し時に同じ名前のキーワードを渡すと上書きされる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.partial"
 },
 {
  "name": "functools.partialmethod",
  "category": "標準ライブラリ",
  "syntax": "functools.partialmethod(func, /, *args, **keywords)",
  "description": "メソッド定義のための partial。クラス属性として置くとディスクリプタとして働き、インスタンスやクラスから呼び出せる。",
  "example": "import functools\nclass C:\n    def _impl(self, x):\n        return x * 2\n    double = functools.partialmethod(_impl)\nprint(C().double(21))",
  "caution": "この学習環境では未検証（エンジンに必要な仕組みがない）ため、呼び出すと未検証である旨が表示され、結果は確定しません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.partialmethod"
 },
 {
  "name": "functools.reduce",
  "category": "標準ライブラリ",
  "syntax": "functools.reduce(function, iterable[, initializer])",
  "description": "2引数関数をイテラブルの要素へ左から累積適用し、1つの値に畳み込む。initializer があるとそれが開始値になる。",
  "example": "import functools\nimport operator\nprint(functools.reduce(operator.add, [1, 2, 3, 4]))",
  "caution": "空のイテラブルで初期値がないと TypeError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.reduce"
 },
 {
  "name": "functools.singledispatch",
  "category": "標準ライブラリ",
  "syntax": "functools.singledispatch(func)",
  "description": "第一引数の型に応じて実装を切り替えるジェネリック関数を作るデコレータ。装飾した関数が既定の実装になる。",
  "example": "import functools\n@functools.singledispatch\ndef f(x):\n    return 'default'\nprint(f(1))",
  "caution": "具体的な型の実装は register で追加する。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.singledispatch"
 },
 {
  "name": "functools.singledispatch.register",
  "category": "標準ライブラリ",
  "syntax": "generic_function.register(cls, func=None)",
  "description": "ジェネリック関数へ型と実装を登録する。実装を省略するとデコレータとして使え、注釈付き関数をそのまま装飾すると第一引数の注釈の型が登録される。",
  "example": "import functools\n@functools.singledispatch\ndef f(x):\n    return 'default'\n@f.register(int)\ndef _(x):\n    return 'int'\nprint(f(1), f('a'))",
  "caution": "第一引数はクラスか union でなければならない。register は実装関数をそのまま返す。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.singledispatch"
 },
 {
  "name": "functools.singledispatchmethod",
  "category": "標準ライブラリ",
  "syntax": "functools.singledispatchmethod(func)",
  "description": "メソッド版の singledispatch。第一引数（self の次）ではなく、メソッドの第一引数の型で実装を切り替える。",
  "example": "import functools\nclass C:\n    @functools.singledispatchmethod\n    def f(self, x):\n        return 'default'\nprint(C().f(1))",
  "caution": "この学習環境では未検証（エンジンに必要な仕組みがない）ため、呼び出すと未検証である旨が表示され、結果は確定しません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.singledispatchmethod"
 },
 {
  "name": "functools.total_ordering",
  "category": "標準ライブラリ",
  "syntax": "functools.total_ordering(cls)",
  "description": "等価演算と1つの順序付けメソッド（__lt__ など）を定義したクラスに、残りの比較演算子を補うクラスデコレータ。",
  "example": "import functools\n@functools.total_ordering\nclass C:\n    def __init__(self, v):\n        self.v = v\n    def __eq__(self, other):\n        return self.v == other.v\n    def __lt__(self, other):\n        return self.v < other.v\nprint(C(1) < C(2), C(2) >= C(1))",
  "caution": "この学習環境では未検証（エンジンに必要な仕組みがない）ため、呼び出すと未検証である旨が表示され、結果は確定しません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.total_ordering"
 },
 {
  "name": "functools.update_wrapper",
  "category": "標準ライブラリ",
  "syntax": "functools.update_wrapper(wrapper, wrapped, assigned=WRAPPER_ASSIGNMENTS, updated=WRAPPER_UPDATES)",
  "description": "ラッパー関数へ、元の関数の __name__ や __doc__ などの属性をコピーし、__wrapped__ を設定する。",
  "example": "import functools\ndef deco(f):\n    def inner(*a, **k):\n        return f(*a, **k)\n    return functools.update_wrapper(inner, f)\n@deco\ndef g():\n    pass\nprint(g.__name__)",
  "caution": "この学習環境では未検証（エンジンに必要な仕組みがない）ため、呼び出すと未検証である旨が表示され、結果は確定しません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.update_wrapper"
 },
 {
  "name": "functools.wraps",
  "category": "標準ライブラリ",
  "syntax": "functools.wraps(wrapped, assigned=WRAPPER_ASSIGNMENTS, updated=WRAPPER_UPDATES)",
  "description": "update_wrapper を呼び出すデコレータ。ラッパー関数を定義するときに元の関数の属性を引き継ぐ。",
  "example": "import functools\ndef deco(f):\n    @functools.wraps(f)\n    def inner(*a, **k):\n        return f(*a, **k)\n    return inner\n@deco\ndef g():\n    pass\nprint(g.__name__)",
  "caution": "この学習環境では未検証（エンジンに必要な仕組みがない）ため、呼び出すと未検証である旨が表示され、結果は確定しません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/functools.html#functools.wraps"
 }
];
