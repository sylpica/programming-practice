/* 高度モード B7 G4 リファレンス：collections.abc（正規形）
 * 出典は各項目の source（公式ドキュメント 3.15）。status は実装の裏付け状態。
 * expected（期待出力）はここには置かず、テストファイルのケース表で保持する。 */
export const referenceAdvanced = [
  {
   "name": "collections.abc.AsyncGenerator",
   "category": "標準ライブラリ",
   "syntax": "class AsyncGenerator",
   "description": "非同期ジェネレータの ABC。単独では実体化できない（抽象クラス）。",
   "example": "from collections.abc import AsyncGenerator\ntry:\n    AsyncGenerator()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.AsyncGenerator"
  },
  {
   "name": "collections.abc.AsyncIterable",
   "category": "標準ライブラリ",
   "syntax": "class AsyncIterable",
   "description": "__aiter__ を持つ非同期反復可能オブジェクトの ABC。単独では実体化できない。",
   "example": "from collections.abc import AsyncIterable\ntry:\n    AsyncIterable()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.AsyncIterable"
  },
  {
   "name": "collections.abc.AsyncIterator",
   "category": "標準ライブラリ",
   "syntax": "class AsyncIterator",
   "description": "非同期イテレータの ABC。単独では実体化できない。",
   "example": "from collections.abc import AsyncIterator\ntry:\n    AsyncIterator()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.AsyncIterator"
  },
  {
   "name": "collections.abc.Awaitable",
   "category": "標準ライブラリ",
   "syntax": "class Awaitable",
   "description": "await できるオブジェクトの ABC。単独では実体化できない。",
   "example": "from collections.abc import Awaitable\ntry:\n    Awaitable()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.Awaitable"
  },
  {
   "name": "collections.abc.Buffer",
   "category": "標準ライブラリ",
   "syntax": "class Buffer",
   "description": "バッファプロトコル（__buffer__）を公開するオブジェクトの ABC（3.12+）。単独では実体化できない。",
   "example": "from collections.abc import Buffer\ntry:\n    Buffer()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.Buffer"
  },
  {
   "name": "collections.abc.ByteString",
   "category": "標準ライブラリ",
   "syntax": "class ByteString",
   "description": "bytes 系シーケンスの ABC（将来のバージョンで削除予定と公式に案内されている）。単独では実体化できない。",
   "example": "from collections.abc import ByteString\ntry:\n    ByteString()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.ByteString"
  },
  {
   "name": "collections.abc.ByteString.index",
   "category": "標準ライブラリ",
   "syntax": "index(sub, start=0, stop=len)",
   "description": "ByteString のミックスインメソッド。抽象クラス上のミックスインであり、このエンジンでは継承した具象クラスを作って検証する手段がないため未検証。",
   "example": "from collections.abc import ByteString\nprint('ByteString.index はミックスイン')",
   "status": "unverified",
   "caution": "抽象クラス上のミックスインは、エンジンにユーザー定義クラスの継承機構がないため実行できない。この項目は未検証。",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.ByteString.index"
  },
  {
   "name": "collections.abc.Callable",
   "category": "標準ライブラリ",
   "syntax": "class Callable",
   "description": "呼び出し可能オブジェクトの ABC。単独では実体化できない。",
   "example": "from collections.abc import Callable\ntry:\n    Callable()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.Callable"
  },
  {
   "name": "collections.abc.Collection",
   "category": "標準ライブラリ",
   "syntax": "class Collection",
   "description": "Sized・Iterable・Container をまとめた ABC。単独では実体化できない。",
   "example": "from collections.abc import Collection\ntry:\n    Collection()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.Collection"
  },
  {
   "name": "collections.abc.Container",
   "category": "標準ライブラリ",
   "syntax": "class Container",
   "description": "__contains__ を持つオブジェクトの ABC。単独では実体化できない。",
   "example": "from collections.abc import Container\ntry:\n    Container()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.Container"
  },
  {
   "name": "collections.abc.Coroutine",
   "category": "標準ライブラリ",
   "syntax": "class Coroutine",
   "description": "コルーチンの ABC。単独では実体化できない。",
   "example": "from collections.abc import Coroutine\ntry:\n    Coroutine()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.Coroutine"
  },
  {
   "name": "collections.abc.Generator",
   "category": "標準ライブラリ",
   "syntax": "class Generator",
   "description": "ジェネレータの ABC。単独では実体化できない。",
   "example": "from collections.abc import Generator\ntry:\n    Generator()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.Generator"
  },
  {
   "name": "collections.abc.Hashable",
   "category": "標準ライブラリ",
   "syntax": "class Hashable",
   "description": "__hash__ を持つオブジェクトの ABC。単独では実体化できない。",
   "example": "from collections.abc import Hashable\ntry:\n    Hashable()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.Hashable"
  },
  {
   "name": "collections.abc.ItemsView",
   "category": "標準ライブラリ",
   "syntax": "class ItemsView(mapping)",
   "description": "辞書の items ビューに対応する ABC。mapping を渡すとビューとして実体化でき、len・反復・repr が辞書ビューらしく振る舞う。",
   "example": "from collections.abc import ItemsView\nv = ItemsView({'a': 1})\nprint(len(v), list(v))",
   "status": "supported",
   "caution": "",
   "returns": "ItemsView",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.ItemsView"
  },
  {
   "name": "collections.abc.Iterable",
   "category": "標準ライブラリ",
   "syntax": "class Iterable",
   "description": "__iter__ を持つオブジェクトの ABC。単独では実体化できない。",
   "example": "from collections.abc import Iterable\ntry:\n    Iterable()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.Iterable"
  },
  {
   "name": "collections.abc.Iterator",
   "category": "標準ライブラリ",
   "syntax": "class Iterator",
   "description": "イテレータの ABC。単独では実体化できない。",
   "example": "from collections.abc import Iterator\ntry:\n    Iterator()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.Iterator"
  },
  {
   "name": "collections.abc.KeysView",
   "category": "標準ライブラリ",
   "syntax": "class KeysView(mapping)",
   "description": "辞書の keys ビューに対応する ABC。mapping を渡すとビューとして実体化できる。",
   "example": "from collections.abc import KeysView\nv = KeysView({'a': 1, 'b': 2})\nprint(len(v), list(v))",
   "status": "supported",
   "caution": "",
   "returns": "KeysView",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.KeysView"
  },
  {
   "name": "collections.abc.Mapping",
   "category": "標準ライブラリ",
   "syntax": "class Mapping",
   "description": "読み取り専用マッピングの ABC。単独では実体化できない。ネイティブの辞書系クラス（UserDict など）は isinstance で判定できる。",
   "example": "from collections import UserDict\nfrom collections.abc import Mapping\nprint(isinstance(UserDict(a=1), Mapping))",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.Mapping"
  },
  {
   "name": "collections.abc.MappingView",
   "category": "標準ライブラリ",
   "syntax": "class MappingView(mapping)",
   "description": "辞書ビューの基底 ABC。mapping を渡さないと TypeError。",
   "example": "from collections.abc import MappingView\ntry:\n    MappingView()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.MappingView"
  },
  {
   "name": "collections.abc.MutableMapping",
   "category": "標準ライブラリ",
   "syntax": "class MutableMapping",
   "description": "変更可能マッピングの ABC。単独では実体化できない。",
   "example": "from collections import Counter\nfrom collections.abc import MutableMapping\nprint(isinstance(Counter(), MutableMapping))",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.MutableMapping"
  },
  {
   "name": "collections.abc.MutableSequence",
   "category": "標準ライブラリ",
   "syntax": "class MutableSequence",
   "description": "変更可能シーケンスの ABC。単独では実体化できない。",
   "example": "from collections import UserList\nfrom collections.abc import MutableSequence\nprint(isinstance(UserList([1]), MutableSequence))",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.MutableSequence"
  },
  {
   "name": "collections.abc.MutableSet",
   "category": "標準ライブラリ",
   "syntax": "class MutableSet",
   "description": "変更可能集合の ABC。単独では実体化できない。",
   "example": "from collections.abc import MutableSet\ntry:\n    MutableSet()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.MutableSet"
  },
  {
   "name": "collections.abc.Reversible",
   "category": "標準ライブラリ",
   "syntax": "class Reversible",
   "description": "__reversed__ を持つオブジェクトの ABC。単独では実体化できない。",
   "example": "from collections.abc import Reversible\ntry:\n    Reversible()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.Reversible"
  },
  {
   "name": "collections.abc.Sequence",
   "category": "標準ライブラリ",
   "syntax": "class Sequence",
   "description": "シーケンスの ABC。単独では実体化できない。",
   "example": "from collections import UserString\nfrom collections.abc import Sequence\nprint(isinstance(UserString('ab'), Sequence))",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.Sequence"
  },
  {
   "name": "collections.abc.Set",
   "category": "標準ライブラリ",
   "syntax": "class Set",
   "description": "読み取り専用集合の ABC。単独では実体化できない。",
   "example": "from collections.abc import Set\ntry:\n    Set()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.Set"
  },
  {
   "name": "collections.abc.Sized",
   "category": "標準ライブラリ",
   "syntax": "class Sized",
   "description": "__len__ を持つオブジェクトの ABC。単独では実体化できない。",
   "example": "from collections.abc import Sized\ntry:\n    Sized()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "このエンジンの isinstance はネイティブクラス（collections の UserDict など）の継承関係に対して働く。組み込み値（dict や list そのもの）に対する isinstance は再現できない。",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.Sized"
  },
  {
   "name": "collections.abc.ValuesView",
   "category": "標準ライブラリ",
   "syntax": "class ValuesView(mapping)",
   "description": "辞書の values ビューに対応する ABC。mapping を渡すとビューとして実体化できる。",
   "example": "from collections.abc import ValuesView\nv = ValuesView({'a': 1, 'b': 2})\nprint(len(v), list(v))",
   "status": "supported",
   "caution": "",
   "returns": "ValuesView",
   "source": "https://docs.python.org/ja/3.15/library/collections.abc.html#collections.abc.ValuesView"
  }
];
