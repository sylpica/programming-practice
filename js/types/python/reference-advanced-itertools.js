/* 高度モード B7 G5：itertools モジュールのリファレンス差分（全21件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 生成器：docs/audit/gen-ref-g5.py */
export const referenceAdvanced = [
 {
  "name": "itertools.accumulate",
  "category": "標準ライブラリ",
  "syntax": "itertools.accumulate(iterable[, func, *, initial=None])",
  "description": "累積和（または2引数関数 func による累積適用の途中結果）を順に返すイテレータ。func の既定は加算。initial を与えると、それが先頭に出力されてから累積が始まる。",
  "example": "import itertools\nprint(list(itertools.accumulate([1, 2, 3, 4])))",
  "caution": "func には operator.mul などを渡せる。キーワード引数は func と initial のみ。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.accumulate"
 },
 {
  "name": "itertools.batched",
  "category": "標準ライブラリ",
  "syntax": "itertools.batched(iterable, n, *, strict=False)",
  "description": "入力を最大 n 個ずつのタプルに区切って返すイテレータ（3.12 で追加）。strict=True（3.13 以降）では、最後のバッチが n 個未満だと ValueError になる。",
  "example": "import itertools\nprint(list(itertools.batched('ABCDEFG', 3)))",
  "caution": "n が1未満だと ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.batched"
 },
 {
  "name": "itertools.chain",
  "category": "標準ライブラリ",
  "syntax": "itertools.chain(*iterables)",
  "description": "複数のイテラブルを続けて、1つのイテレータとして返す。",
  "example": "import itertools\nprint(list(itertools.chain('AB', 'CD')))",
  "caution": "引数はすべてイテラブルでなければならない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.chain"
 },
 {
  "name": "itertools.chain.from_iterable",
  "category": "標準ライブラリ",
  "syntax": "itertools.chain.from_iterable(iterable)",
  "description": "イテラブルのイテラブルを引数に取り、平たく連結して返す chain の代替コンストラクタ。",
  "example": "import itertools\nprint(list(itertools.chain.from_iterable(['AB', 'CD'])))",
  "caution": "引数はちょうど1つ。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.chain.from_iterable"
 },
 {
  "name": "itertools.combinations",
  "category": "標準ライブラリ",
  "syntax": "itertools.combinations(iterable, r)",
  "description": "入力の要素の位置の順序に従い、長さ r の組み合わせをタプルで辞書順に返すイテレータ。",
  "example": "import itertools\nprint(list(itertools.combinations('ABC', 2)))",
  "caution": "r が要素数より大きいと空。r が負だと ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.combinations"
 },
 {
  "name": "itertools.combinations_with_replacement",
  "category": "標準ライブラリ",
  "syntax": "itertools.combinations_with_replacement(iterable, r)",
  "description": "同じ要素を繰り返し選ぶことを許して、長さ r の組み合わせをタプルで返すイテレータ。",
  "example": "import itertools\nprint(list(itertools.combinations_with_replacement('AB', 2)))",
  "caution": "r が負だと ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.combinations_with_replacement"
 },
 {
  "name": "itertools.compress",
  "category": "標準ライブラリ",
  "syntax": "itertools.compress(data, selectors)",
  "description": "selectors の対応する要素が真である data の要素だけを返すイテレータ。",
  "example": "import itertools\nprint(list(itertools.compress('ABCDEF', [1, 0, 1, 0, 1, 1])))",
  "caution": "どちらかの入力が尽きた時点で終わる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.compress"
 },
 {
  "name": "itertools.count",
  "category": "標準ライブラリ",
  "syntax": "itertools.count(start=0, step=1)",
  "description": "start から始めて step ずつ増える値を無限に返すイテレータ。",
  "example": "import itertools\nprint(list(itertools.islice(itertools.count(10, 3), 4)))",
  "caution": "無限に続くため、list() で直接集めず islice などで区切ること。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.count"
 },
 {
  "name": "itertools.cycle",
  "category": "標準ライブラリ",
  "syntax": "itertools.cycle(iterable)",
  "description": "入力の要素を無限に繰り返すイテレータ。",
  "example": "import itertools\nprint(list(itertools.islice(itertools.cycle('AB'), 5)))",
  "caution": "空の入力では何も返さない。無限に続くため islice などで区切ること。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.cycle"
 },
 {
  "name": "itertools.dropwhile",
  "category": "標準ライブラリ",
  "syntax": "itertools.dropwhile(predicate, iterable)",
  "description": "predicate が真の間は要素を捨て、初めて偽になった要素以降をすべて返すイテレータ。",
  "example": "import itertools\ndef small(x):\n    return x < 3\nprint(list(itertools.dropwhile(small, [1, 2, 3, 1])))",
  "caution": "条件が偽になった後の要素は、再び真になっても捨てられない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.dropwhile"
 },
 {
  "name": "itertools.filterfalse",
  "category": "標準ライブラリ",
  "syntax": "itertools.filterfalse(predicate, iterable)",
  "description": "predicate が偽になる要素だけを返すイテレータ。predicate が None のときは、偽である要素そのものを返す。",
  "example": "import itertools\ndef odd(x):\n    return x % 2\nprint(list(itertools.filterfalse(odd, range(6))))",
  "caution": "組み込み filter と反対の働きをする。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.filterfalse"
 },
 {
  "name": "itertools.groupby",
  "category": "標準ライブラリ",
  "syntax": "itertools.groupby(iterable, key=None)",
  "description": "連続する同じキー値の要素をまとめ、(キー, グループのイテレータ) の組を順に返す。key はキー値を計算する関数で、省略時は要素そのもの。",
  "example": "import itertools\nprint([(k, list(g)) for k, g in itertools.groupby('AAABB')])",
  "caution": "連続した要素だけがまとまるため、普通は事前にソートする。グループは次のキーへ進む前に読み切ること（進んだ後では前のグループは読めない）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.groupby"
 },
 {
  "name": "itertools.islice",
  "category": "標準ライブラリ",
  "syntax": "itertools.islice(iterable, stop) / itertools.islice(iterable, start, stop[, step])",
  "description": "イテレータに対するスライスを返す。start から stop の手前までを step 間隔で取り出す。",
  "example": "import itertools\nprint(list(itertools.islice(range(10), 2, 8, 2)))",
  "caution": "負の添字は使えない。取り出した分だけ元のイテレータも進む。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.islice"
 },
 {
  "name": "itertools.pairwise",
  "category": "標準ライブラリ",
  "syntax": "itertools.pairwise(iterable)",
  "description": "隣り合う要素同士のペアを順に返すイテレータ（3.10 で追加）。",
  "example": "import itertools\nprint(list(itertools.pairwise('ABCD')))",
  "caution": "要素が1つ以下だと空になる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.pairwise"
 },
 {
  "name": "itertools.permutations",
  "category": "標準ライブラリ",
  "syntax": "itertools.permutations(iterable, r=None)",
  "description": "長さ r の順列をタプルで辞書順に返すイテレータ。r を省略すると要素数と同じ長さになる。",
  "example": "import itertools\nprint(list(itertools.permutations('AB', 2)))",
  "caution": "要素に重複があっても位置で区別するため、同じタプルが複数回出ることがある。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.permutations"
 },
 {
  "name": "itertools.product",
  "category": "標準ライブラリ",
  "syntax": "itertools.product(*iterables, repeat=1)",
  "description": "入力イテラブル群の直積をタプルで返すイテレータ。右端の要素が最も速く変わる。",
  "example": "import itertools\nprint(list(itertools.product('AB', '12')))",
  "caution": "repeat キーワードで同じ入力を複数回使う指定ができる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.product"
 },
 {
  "name": "itertools.repeat",
  "category": "標準ライブラリ",
  "syntax": "itertools.repeat(object[, times])",
  "description": "object を times 回返すイテレータ。times を省略すると無限に返す。",
  "example": "import itertools\nprint(list(itertools.repeat(7, 3)))",
  "caution": "times を省略すると無限イテレータになるため、islice などで区切ること。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.repeat"
 },
 {
  "name": "itertools.starmap",
  "category": "標準ライブラリ",
  "syntax": "itertools.starmap(function, iterable)",
  "description": "各要素（イテラブル）を引数として function を呼び、その結果を返すイテレータ。",
  "example": "import itertools\nprint(list(itertools.starmap(pow, [(2, 3), (3, 2)])))",
  "caution": "要素の中身が引数の個数と合わないと TypeError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.starmap"
 },
 {
  "name": "itertools.takewhile",
  "category": "標準ライブラリ",
  "syntax": "itertools.takewhile(predicate, iterable)",
  "description": "predicate が真の間だけ要素を返すイテレータ。",
  "example": "import itertools\ndef small(x):\n    return x < 3\nprint(list(itertools.takewhile(small, [1, 2, 3, 1])))",
  "caution": "初めて偽になった要素で停止する。その要素自体は消費される。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.takewhile"
 },
 {
  "name": "itertools.tee",
  "category": "標準ライブラリ",
  "syntax": "itertools.tee(iterable, n=2)",
  "description": "1つのイテラータから n 個の独立したイテレータを作り、タプルで返す。",
  "example": "import itertools\na, b = itertools.tee([1, 2, 3])\nprint(list(a), list(b))",
  "caution": "分けた後は元のイテレータを使わないこと。n は0以上でなければならない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.tee"
 },
 {
  "name": "itertools.zip_longest",
  "category": "標準ライブラリ",
  "syntax": "itertools.zip_longest(*iterables, fillvalue=None)",
  "description": "最も長い入力に合わせて要素を組み合わせ、不足分を fillvalue で埋めてタプルで返すイテレータ。",
  "example": "import itertools\nprint(list(itertools.zip_longest('AB', '123', fillvalue='-')))",
  "caution": "組み込み zip と違い、最短の入力で打ち切らない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/itertools.html#itertools.zip_longest"
 }
];
