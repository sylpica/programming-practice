/* 高度モード B7 G4 リファレンス：weakref（正規形）
 * 出典は各項目の source（公式ドキュメント 3.15）。status は実装の裏付け状態。
 * expected（期待出力）はここには置かず、テストファイルのケース表で保持する。 */
export const referenceAdvanced = [
  {
   "name": "weakref.CallableProxyType",
   "category": "標準ライブラリ",
   "syntax": "class CallableProxyType",
   "description": "呼び出し可能なプロキシの型。弱参照の失効を観測できないため未検証。",
   "example": "import weakref\nprint('CallableProxyType は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.CallableProxyType"
  },
  {
   "name": "weakref.ProxyType",
   "category": "標準ライブラリ",
   "syntax": "class ProxyType",
   "description": "プロキシオブジェクトの型。弱参照の失効を観測できないため未検証。",
   "example": "import weakref\nprint('ProxyType は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.ProxyType"
  },
  {
   "name": "weakref.ProxyTypes",
   "category": "標準ライブラリ",
   "syntax": "weakref.ProxyTypes",
   "description": "(ProxyType, CallableProxyType) のタプル（束ね値として再現）。",
   "example": "import weakref\nprint(len(weakref.ProxyTypes))",
   "status": "supported",
   "caution": "",
   "returns": "tuple",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.ProxyTypes"
  },
  {
   "name": "weakref.ReferenceType",
   "category": "標準ライブラリ",
   "syntax": "class ReferenceType",
   "description": "weakref.ref の別名。弱参照の失効を観測できないため未検証。",
   "example": "import weakref\nprint('ReferenceType は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.ReferenceType"
  },
  {
   "name": "weakref.WeakKeyDictionary",
   "category": "標準ライブラリ",
   "syntax": "class WeakKeyDictionary(dict=None)",
   "description": "キーへの弱参照を持つ辞書。キーの破棄を観測できないため未検証。",
   "example": "import weakref\nprint('WeakKeyDictionary は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.WeakKeyDictionary"
  },
  {
   "name": "weakref.WeakKeyDictionary.keyrefs",
   "category": "標準ライブラリ",
   "syntax": "keyrefs()",
   "description": "キーへの弱参照のリストを返す。辞書自体が未検証のため未検証。",
   "example": "import weakref\nprint('keyrefs は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "list",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.WeakKeyDictionary.keyrefs"
  },
  {
   "name": "weakref.WeakMethod",
   "category": "標準ライブラリ",
   "syntax": "class WeakMethod(meth, callback=None)",
   "description": "メソッドへの弱参照。対象の破棄を観測できないため未検証。",
   "example": "import weakref\nprint('WeakMethod は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.WeakMethod"
  },
  {
   "name": "weakref.WeakSet",
   "category": "標準ライブラリ",
   "syntax": "class WeakSet(iterable=None)",
   "description": "要素への弱参照を持つ集合。要素の破棄を観測できないため未検証。",
   "example": "import weakref\nprint('WeakSet は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.WeakSet"
  },
  {
   "name": "weakref.WeakValueDictionary",
   "category": "標準ライブラリ",
   "syntax": "class WeakValueDictionary(dict=None)",
   "description": "値への弱参照を持つ辞書。値の破棄を観測できないため未検証。",
   "example": "import weakref\nprint('WeakValueDictionary は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.WeakValueDictionary"
  },
  {
   "name": "weakref.WeakValueDictionary.valuerefs",
   "category": "標準ライブラリ",
   "syntax": "valuerefs()",
   "description": "値への弱参照のリストを返す。辞書自体が未検証のため未検証。",
   "example": "import weakref\nprint('valuerefs は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "list",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.WeakValueDictionary.valuerefs"
  },
  {
   "name": "weakref.finalize",
   "category": "標準ライブラリ",
   "syntax": "class finalize(obj, func, *args, **kwargs)",
   "description": "オブジェクトの破棄時にコールバックを実行する仕組み。破棄を観測できないため未検証。",
   "example": "import weakref\nprint('finalize は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.finalize"
  },
  {
   "name": "weakref.finalize.__call__",
   "category": "標準ライブラリ",
   "syntax": "__call__()",
   "description": "finalize のコールバックを今すぐ実行する。finalize 自体が未検証のため未検証。",
   "example": "import weakref\nprint('finalize.__call__ は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.finalize.__call__"
  },
  {
   "name": "weakref.finalize.alive",
   "category": "標準ライブラリ",
   "syntax": "finalize.alive",
   "description": "コールバックが未実行なら True の属性。finalize 自体が未検証のため未検証。",
   "example": "import weakref\nprint('finalize.alive は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "bool",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.finalize.alive"
  },
  {
   "name": "weakref.finalize.atexit",
   "category": "標準ライブラリ",
   "syntax": "finalize.atexit",
   "description": "終了時にコールバックを実行するかを表す属性。finalize 自体が未検証のため未検証。",
   "example": "import weakref\nprint('finalize.atexit は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "bool",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.finalize.atexit"
  },
  {
   "name": "weakref.finalize.detach",
   "category": "標準ライブラリ",
   "syntax": "detach()",
   "description": "オブジェクトとの結びつけを外し、登録情報を返す。finalize 自体が未検証のため未検証。",
   "example": "import weakref\nprint('finalize.detach は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "tuple",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.finalize.detach"
  },
  {
   "name": "weakref.finalize.peek",
   "category": "標準ライブラリ",
   "syntax": "peek()",
   "description": "登録情報を外さずに返す。finalize 自体が未検証のため未検証。",
   "example": "import weakref\nprint('finalize.peek は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "tuple",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.finalize.peek"
  },
  {
   "name": "weakref.getweakrefcount",
   "category": "標準ライブラリ",
   "syntax": "getweakrefcount(object)",
   "description": "オブジェクトへの弱参照の数を返す。GC がないため未検証。",
   "example": "import weakref\nprint('getweakrefcount は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.getweakrefcount"
  },
  {
   "name": "weakref.getweakrefs",
   "category": "標準ライブラリ",
   "syntax": "getweakrefs(object)",
   "description": "オブジェクトへの弱参照のリストを返す。GC がないため未検証。",
   "example": "import weakref\nprint('getweakrefs は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "list",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.getweakrefs"
  },
  {
   "name": "weakref.proxy",
   "category": "標準ライブラリ",
   "syntax": "proxy(object, callback=None)",
   "description": "オブジェクトへのプロキシを作る。対象の破棄を観測できないため未検証。",
   "example": "import weakref\nprint('proxy は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.proxy"
  },
  {
   "name": "weakref.ref",
   "category": "標準ライブラリ",
   "syntax": "class ref(object, callback=None)",
   "description": "弱参照オブジェクト。対象の破棄を観測できないため未検証。",
   "example": "import weakref\nprint('ref は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.ref"
  },
  {
   "name": "weakref.ref.__callback__",
   "category": "標準ライブラリ",
   "syntax": "ref.__callback__",
   "description": "弱参照に登録されたコールバック（属性）。ref 自体が未検証のため未検証。",
   "example": "import weakref\nprint('ref.__callback__ は未検証')",
   "status": "unverified",
   "caution": "このエンジンには GC がなく、参照対象の破棄（弱参照の失効）を観測できないため、意味論を裏付けられず未検証。",
   "source": "https://docs.python.org/ja/3.15/library/weakref.html#weakref.ref.__callback__"
  }
];
