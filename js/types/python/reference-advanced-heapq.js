/* 高度モード B7 G4 リファレンス：heapq（正規形）
 * 出典は各項目の source（公式ドキュメント 3.15）。status は実装の裏付け状態。
 * expected（期待出力）はここには置かず、テストファイルのケース表で保持する。 */
export const referenceAdvanced = [
  {
   "name": "heapq.heapify",
   "category": "標準ライブラリ",
   "syntax": "heapify(x)",
   "description": "リスト x をその場でヒープ化する（最小ヒープ）。戻り値は None。リスト以外では TypeError。",
   "example": "import heapq\nh = [3, 1, 2]\nheapq.heapify(h)\nprint(h)",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/heapq.html#heapq.heapify"
  },
  {
   "name": "heapq.heapify_max",
   "category": "標準ライブラリ",
   "syntax": "heapify_max(x)",
   "description": "リスト x をその場で最大ヒープ化する（3.14+）。heapify の鏡像で、比較は < のみを使う。",
   "example": "import heapq\nh = [3, 1, 2]\nheapq.heapify_max(h)\nprint(h)",
   "status": "supported",
   "caution": "3.14 で追加された関数のため、ローカルの CPython 3.12 では実走できず、公式ドキュメントの意味論で照合した。",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/heapq.html#heapq.heapify_max"
  },
  {
   "name": "heapq.heappop",
   "category": "標準ライブラリ",
   "syntax": "heappop(heap)",
   "description": "最小の要素を取り出して返す。空のヒープでは IndexError。",
   "example": "import heapq\nh = [1, 3, 2]\nprint(heapq.heappop(h), h)",
   "status": "supported",
   "caution": "",
   "source": "https://docs.python.org/ja/3.15/library/heapq.html#heapq.heappop"
  },
  {
   "name": "heapq.heappop_max",
   "category": "標準ライブラリ",
   "syntax": "heappop_max(heap)",
   "description": "最大ヒープから最大の要素を取り出して返す（3.14+）。",
   "example": "import heapq\nh = [2, 3, 1]\nheapq.heapify_max(h)\nprint(heapq.heappop_max(h), h)",
   "status": "supported",
   "caution": "3.14 で追加された関数のため、公式ドキュメントの意味論で照合した。",
   "source": "https://docs.python.org/ja/3.15/library/heapq.html#heapq.heappop_max"
  },
  {
   "name": "heapq.heappush",
   "category": "標準ライブラリ",
   "syntax": "heappush(heap, item)",
   "description": "ヒープの性質を保ったまま item を追加する。",
   "example": "import heapq\nh = [1, 3, 2]\nheapq.heappush(h, 0)\nprint(h)",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/heapq.html#heapq.heappush"
  },
  {
   "name": "heapq.heappush_max",
   "category": "標準ライブラリ",
   "syntax": "heappush_max(heap, item)",
   "description": "最大ヒープへ item を追加する（3.14+）。",
   "example": "import heapq\nh = [3, 1, 2]\nheapq.heapify_max(h)\nheapq.heappush_max(h, 5)\nprint(h)",
   "status": "supported",
   "caution": "3.14 で追加された関数のため、公式ドキュメントの意味論で照合した。",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/heapq.html#heapq.heappush_max"
  },
  {
   "name": "heapq.heappushpop",
   "category": "標準ライブラリ",
   "syntax": "heappushpop(heap, item)",
   "description": "item を追加してから最小要素を取り出す（個別に push/pop するより効率的）。空のヒープでは item がそのまま返る。",
   "example": "import heapq\nh = [1, 3, 2]\nprint(heapq.heappushpop(h, 0), h)",
   "status": "supported",
   "caution": "",
   "source": "https://docs.python.org/ja/3.15/library/heapq.html#heapq.heappushpop"
  },
  {
   "name": "heapq.heappushpop_max",
   "category": "標準ライブラリ",
   "syntax": "heappushpop_max(heap, item)",
   "description": "最大ヒープ版の heappushpop（3.14+）。",
   "example": "import heapq\nh = [3, 1, 2]\nheapq.heapify_max(h)\nprint(heapq.heappushpop_max(h, 9), h)",
   "status": "supported",
   "caution": "3.14 で追加された関数のため、公式ドキュメントの意味論で照合した。",
   "source": "https://docs.python.org/ja/3.15/library/heapq.html#heapq.heappushpop_max"
  },
  {
   "name": "heapq.heapreplace",
   "category": "標準ライブラリ",
   "syntax": "heapreplace(heap, item)",
   "description": "最小要素を取り出してから item を追加する。空のヒープでは IndexError。",
   "example": "import heapq\nh = [1, 3, 2]\nprint(heapq.heapreplace(h, 5), h)",
   "status": "supported",
   "caution": "",
   "source": "https://docs.python.org/ja/3.15/library/heapq.html#heapq.heapreplace"
  },
  {
   "name": "heapq.heapreplace_max",
   "category": "標準ライブラリ",
   "syntax": "heapreplace_max(heap, item)",
   "description": "最大ヒープ版の heapreplace（3.14+）。",
   "example": "import heapq\nh = [3, 1, 2]\nheapq.heapify_max(h)\nprint(heapq.heapreplace_max(h, 0), h)",
   "status": "supported",
   "caution": "3.14 で追加された関数のため、公式ドキュメントの意味論で照合した。",
   "source": "https://docs.python.org/ja/3.15/library/heapq.html#heapq.heapreplace_max"
  },
  {
   "name": "heapq.merge",
   "category": "標準ライブラリ",
   "syntax": "merge(*iterables, key=None, reverse=False)",
   "description": "ソート済みの反復可能オブジェクトを1つのソート済みイテレータに統合する。key と reverse を取れる。",
   "example": "import heapq\nprint(list(heapq.merge([1, 3], [2, 4])))",
   "status": "supported",
   "caution": "このエンジンではジェネレータは値の列として即時に評価される（遅延評価にはならない）。",
   "returns": "iterator",
   "source": "https://docs.python.org/ja/3.15/library/heapq.html#heapq.merge"
  },
  {
   "name": "heapq.nlargest",
   "category": "標準ライブラリ",
   "syntax": "nlargest(n, iterable, key=None)",
   "description": "iterable の中から大きい順に n 個をリストで返す。key は各要素へ適用する関数。",
   "example": "import heapq\nprint(heapq.nlargest(2, [5, 1, 4]))",
   "status": "supported",
   "caution": "",
   "returns": "list",
   "source": "https://docs.python.org/ja/3.15/library/heapq.html#heapq.nlargest"
  },
  {
   "name": "heapq.nsmallest",
   "category": "標準ライブラリ",
   "syntax": "nsmallest(n, iterable, key=None)",
   "description": "iterable の中から小さい順に n 個をリストで返す。",
   "example": "import heapq\nprint(heapq.nsmallest(2, [5, 1, 4]))",
   "status": "supported",
   "caution": "",
   "returns": "list",
   "source": "https://docs.python.org/ja/3.15/library/heapq.html#heapq.nsmallest"
  }
];
