/* 高度モード B7 G4 リファレンス：graphlib（正規形）
 * 出典は各項目の source（公式ドキュメント 3.15）。status は実装の裏付け状態。
 * expected（期待出力）はここには置かず、テストファイルのケース表で保持する。 */
export const referenceAdvanced = [
  {
   "name": "graphlib.CycleError",
   "category": "標準ライブラリ",
   "syntax": "class CycleError(ValueError)",
   "description": "グラフに循環があるときに prepare() などが送出する例外。ValueError のサブクラスとして対応付けされている。",
   "example": "from graphlib import TopologicalSorter, CycleError\nts = TopologicalSorter()\nts.add('a', 'b')\nts.add('b', 'a')\ntry:\n    ts.prepare()\nexcept CycleError:\n    print('CycleError')",
   "status": "supported",
   "caution": "例外の args に含まれる循環ノード列は、このエンジンの例外表現では保持できない（型とメッセージのみ再現）。",
   "source": "https://docs.python.org/ja/3.15/library/graphlib.html#graphlib.CycleError"
  },
  {
   "name": "graphlib.TopologicalSorter",
   "category": "標準ライブラリ",
   "syntax": "TopologicalSorter(graph=None)",
   "description": "有向グラフのトポロジカルソートを行うクラス。graph には {ノード: 先行ノード列} の辞書を渡せる。",
   "example": "from graphlib import TopologicalSorter\nts = TopologicalSorter({'b': ['a']})\nprint(tuple(ts.static_order()))",
   "status": "supported",
   "caution": "",
   "returns": "TopologicalSorter",
   "source": "https://docs.python.org/ja/3.15/library/graphlib.html#graphlib.TopologicalSorter"
  },
  {
   "name": "graphlib.TopologicalSorter.add",
   "category": "標準ライブラリ",
   "syntax": "add(node, *predecessors)",
   "description": "ノードとその先行ノード（依存）を追加する。prepare() の後では ValueError。",
   "example": "from graphlib import TopologicalSorter\nts = TopologicalSorter()\nts.add('b', 'a')\nprint(tuple(ts.static_order()))",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/graphlib.html#graphlib.TopologicalSorter.add"
  },
  {
   "name": "graphlib.TopologicalSorter.done",
   "category": "標準ライブラリ",
   "syntax": "done(*nodes)",
   "description": "get_ready() で渡したノードを完了として記録する。渡されていないノードでは ValueError。",
   "example": "from graphlib import TopologicalSorter\nts = TopologicalSorter()\nts.add('b', 'a')\nts.prepare()\nready = ts.get_ready()\nts.done(*ready)\nprint(ts.get_ready())",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/graphlib.html#graphlib.TopologicalSorter.done"
  },
  {
   "name": "graphlib.TopologicalSorter.get_ready",
   "category": "標準ライブラリ",
   "syntax": "get_ready()",
   "description": "依存がすべて完了したノードのタプルを返す。prepare() の前では ValueError。",
   "example": "from graphlib import TopologicalSorter\nts = TopologicalSorter()\nts.add('b', 'a')\nts.prepare()\nprint(ts.get_ready())",
   "status": "supported",
   "caution": "",
   "returns": "tuple",
   "source": "https://docs.python.org/ja/3.15/library/graphlib.html#graphlib.TopologicalSorter.get_ready"
  },
  {
   "name": "graphlib.TopologicalSorter.is_active",
   "category": "標準ライブラリ",
   "syntax": "is_active()",
   "description": "未完了のノードが残っていれば True。prepare() の前では ValueError。",
   "example": "from graphlib import TopologicalSorter\nts = TopologicalSorter()\nts.add('a')\nts.prepare()\nprint(ts.is_active())",
   "status": "supported",
   "caution": "",
   "returns": "bool",
   "source": "https://docs.python.org/ja/3.15/library/graphlib.html#graphlib.TopologicalSorter.is_active"
  },
  {
   "name": "graphlib.TopologicalSorter.prepare",
   "category": "標準ライブラリ",
   "syntax": "prepare()",
   "description": "ソートの準備をする。循環があれば CycleError、2回呼ぶと ValueError。",
   "example": "from graphlib import TopologicalSorter\nts = TopologicalSorter()\nts.add('a')\nts.prepare()\nprint(ts.get_ready())",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/graphlib.html#graphlib.TopologicalSorter.prepare"
  },
  {
   "name": "graphlib.TopologicalSorter.static_order",
   "category": "標準ライブラリ",
   "syntax": "static_order()",
   "description": "トポロジカル順のノードを返すジェネレータ。内部で prepare→get_ready→done を回すのと等しい。",
   "example": "from graphlib import TopologicalSorter\nts = TopologicalSorter()\nts.add('b', 'a')\nprint(tuple(ts.static_order()))",
   "status": "supported",
   "caution": "このエンジンではジェネレータは値の列として即時に評価される。",
   "returns": "generator",
   "source": "https://docs.python.org/ja/3.15/library/graphlib.html#graphlib.TopologicalSorter.static_order"
  }
];
