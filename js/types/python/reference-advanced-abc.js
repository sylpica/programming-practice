/* 高度モード B7 G4 リファレンス：abc（正規形）
 * 出典は各項目の source（公式ドキュメント 3.15）。status は実装の裏付け状態。
 * expected（期待出力）はここには置かず、テストファイルのケース表で保持する。 */
export const referenceAdvanced = [
  {
   "name": "abc.ABC",
   "category": "標準ライブラリ",
   "syntax": "class ABC",
   "description": "抽象基底クラスのヘルパークラス。register による仮想サブクラス登録を再現する（ネイティブクラスに対してのみ）。",
   "example": "from abc import ABC\nfrom collections import UserDict\nABC.register(UserDict)\nprint(isinstance(UserDict(), ABC))",
   "status": "supported",
   "caution": "ユーザー定義クラスの継承による抽象性の強制は基盤外。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/abc.html#abc.ABC"
  },
  {
   "name": "abc.ABCMeta",
   "category": "標準ライブラリ",
   "syntax": "class ABCMeta(type)",
   "description": "抽象基底クラスのメタクラス。クラスを生成する機構が基盤にないため未検証（register と __subclasshook__ は個別項目）。",
   "example": "from abc import ABCMeta\nprint('ABCMeta は未検証')",
   "status": "unverified",
   "caution": "メタクラスによるクラス生成は再現できない。この項目は未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/abc.html#abc.ABCMeta"
  },
  {
   "name": "abc.ABCMeta.__subclasshook__",
   "category": "標準ライブラリ",
   "syntax": "__subclasshook__(subclass)",
   "description": "サブクラス判定のフック。戻り値の NotImplemented 単例をエンジンの API から取得できないため未検証。",
   "example": "from abc import ABCMeta\nprint('__subclasshook__ は未検証')",
   "status": "unverified",
   "caution": "NotImplemented の単例は PyAPI から取得できない。この項目は未検証。",
   "source": "https://docs.python.org/ja/3.15/library/abc.html#abc.ABCMeta.__subclasshook__"
  },
  {
   "name": "abc.ABCMeta.register",
   "category": "標準ライブラリ",
   "syntax": "register(subclass)",
   "description": "仮想サブクラスとして登録し、isinstance で判定できるようにする。このエンジンではネイティブクラスへの登録のみ再現する。",
   "example": "from abc import ABC\nfrom collections import UserDict\nABC.register(UserDict)\nprint(isinstance(UserDict(), ABC))",
   "status": "supported",
   "caution": "組み込み値・ユーザー定義クラスへの register は基盤外（診断を表示する）。",
   "source": "https://docs.python.org/ja/3.15/library/abc.html#abc.ABCMeta.register"
  },
  {
   "name": "abc.abstractclassmethod",
   "category": "標準ライブラリ",
   "syntax": "abstractclassmethod(callable)",
   "description": "抽象クラスメソッドを宣言するデコレータ。このエンジンでは引数をそのまま返すパススルーとして再現する（抽象性の強制はない）。",
   "example": "from abc import abstractclassmethod\ndef f():\n    pass\ng = abstractclassmethod(f)\nprint('abstractclassmethod を適用')",
   "status": "supported",
   "caution": "抽象性の強制（実体化の禁止）は再現しない。CPython では classmethod のサブクラスが返るが、このエンジンでは引数そのものを返す。",
   "source": "https://docs.python.org/ja/3.15/library/abc.html#abc.abstractclassmethod"
  },
  {
   "name": "abc.abstractmethod",
   "category": "標準ライブラリ",
   "syntax": "abstractmethod(callable)",
   "description": "抽象メソッドを宣言するデコレータ。このエンジンでは関数をそのまま返すパススルーとして再現する（抽象性の強制はない）。",
   "example": "from abc import abstractmethod\ndef f():\n    pass\ng = abstractmethod(f)\nprint(g == f)",
   "status": "supported",
   "caution": "抽象性の強制（実体化の禁止）は再現しない。",
   "source": "https://docs.python.org/ja/3.15/library/abc.html#abc.abstractmethod"
  },
  {
   "name": "abc.abstractproperty",
   "category": "標準ライブラリ",
   "syntax": "abstractproperty(fget=None, fset=None, fdel=None)",
   "description": "抽象プロパティを宣言するデコレータ（property のサブクラス）。パススルーとして再現する。",
   "example": "from abc import abstractproperty\nprint('abstractproperty はパススルー')",
   "status": "supported",
   "caution": "抽象性の強制は再現しない。",
   "source": "https://docs.python.org/ja/3.15/library/abc.html#abc.abstractproperty"
  },
  {
   "name": "abc.abstractstaticmethod",
   "category": "標準ライブラリ",
   "syntax": "abstractstaticmethod(callable)",
   "description": "抽象静的メソッドを宣言するデコレータ。このエンジンでは引数をそのまま返すパススルーとして再現する。",
   "example": "from abc import abstractstaticmethod\ndef f():\n    pass\ng = abstractstaticmethod(f)\nprint('abstractstaticmethod を適用')",
   "status": "supported",
   "caution": "抽象性の強制は再現しない。CPython では staticmethod のサブクラスが返るが、このエンジンでは引数そのものを返す。",
   "source": "https://docs.python.org/ja/3.15/library/abc.html#abc.abstractstaticmethod"
  },
  {
   "name": "abc.get_cache_token",
   "category": "標準ライブラリ",
   "syntax": "get_cache_token()",
   "description": "ABC の登録キャッシュの世代を表す整数を返す。register が呼ばれるたびに値が変わる。",
   "example": "from abc import get_cache_token\nprint(isinstance(get_cache_token(), int))",
   "status": "supported",
   "caution": "",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/abc.html#abc.get_cache_token"
  },
  {
   "name": "abc.update_abstractmethods",
   "category": "標準ライブラリ",
   "syntax": "update_abstractmethods(cls)",
   "description": "クラスの __abstractmethods__ を再計算する。クラスの内部状態を書き換えるため、このエンジンでは再現できず未検証（何もせず None を返す）。",
   "example": "from abc import update_abstractmethods\nprint('update_abstractmethods は未検証')",
   "status": "unverified",
   "caution": "ユーザー定義クラスの内部状態への介入フックが基盤にない。この項目は未検証。",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/abc.html#abc.update_abstractmethods"
  }
];
