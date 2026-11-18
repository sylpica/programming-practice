/* 高度モード B7 G4 リファレンス：dataclasses（正規形）
 * 出典は各項目の source（公式ドキュメント 3.15）。status は実装の裏付け状態。
 * expected（期待出力）はここには置かず、テストファイルのケース表で保持する。 */
export const referenceAdvanced = [
  {
   "name": "dataclasses.Field",
   "category": "標準ライブラリ",
   "syntax": "class Field",
   "description": "フィールドのメタデータを表すクラス。通常は field() の戻り値として得られ、fields() で取り出せる。直接の実体化はできない。",
   "example": "from dataclasses import make_dataclass, fields\nP = make_dataclass('P', ['x'])\nprint(fields(P)[0].name)",
   "status": "supported",
   "caution": "この項目は make_dataclass で作ったクラスに対して再現する（ユーザー定義クラスへの @dataclass 適用は基盤にクラス内部への介入フックがないため未検証）。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/dataclasses.html#dataclasses.Field"
  },
  {
   "name": "dataclasses.FrozenInstanceError",
   "category": "標準ライブラリ",
   "syntax": "class FrozenInstanceError(AttributeError)",
   "description": "凍結したデータクラスの属性を変更しようとしたときの例外。AttributeError のサブクラスとして対応付けされている。",
   "example": "from dataclasses import FrozenInstanceError\ntry:\n    raise FrozenInstanceError('x')\nexcept AttributeError:\n    print('caught')",
   "status": "supported",
   "caution": "",
   "source": "https://docs.python.org/ja/3.15/library/dataclasses.html#dataclasses.FrozenInstanceError"
  },
  {
   "name": "dataclasses.InitVar",
   "category": "標準ライブラリ",
   "syntax": "class InitVar",
   "description": "InitVar は型注釈専用のマーカーで、実行時の振る舞いを持たない。エンジンでは注釈が評価されないため未検証。",
   "example": "import dataclasses\nprint('InitVar は未検証')",
   "status": "unverified",
   "caution": "型注釈はこのエンジンでは評価されない。この項目は未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/dataclasses.html#dataclasses.InitVar"
  },
  {
   "name": "dataclasses.KW_ONLY",
   "category": "標準ライブラリ",
   "syntax": "dataclasses.KW_ONLY",
   "description": "make_dataclass のフィールド列に置くと、以降のフィールドがキーワード専用になる単例のマーカー（束ね値）。",
   "example": "from dataclasses import make_dataclass, KW_ONLY\nP = make_dataclass('P', ['x', KW_ONLY, 'y'])\np = P(1, y=2)\nprint(p.y)",
   "status": "supported",
   "caution": "フィールド列に置く形式は 3.13+ のもので、ローカルの CPython 3.12 では再現できないため、公式ドキュメント（3.15）で意味論を照合した。",
   "source": "https://docs.python.org/ja/3.15/library/dataclasses.html#dataclasses.KW_ONLY"
  },
  {
   "name": "dataclasses.MISSING",
   "category": "標準ライブラリ",
   "syntax": "dataclasses.MISSING",
   "description": "デフォルト値が指定されていないことを表す単例のマーカー（束ね値）。",
   "example": "from dataclasses import field, MISSING\nf = field()\nprint(f.default == MISSING)",
   "status": "supported",
   "caution": "repr はアドレスを含むため再現しない（同一性は再現する）。",
   "source": "https://docs.python.org/ja/3.15/library/dataclasses.html#dataclasses.MISSING"
  },
  {
   "name": "dataclasses.__post_init__",
   "category": "標準ライブラリ",
   "syntax": "__post_init__()",
   "description": "データクラスのインスタンスが初期化後に呼ぶフックの名前。モジュールの属性としては存在しない（hasattr(dataclasses, '__post_init__') は False）ため、収載のみで未対応。",
   "example": "import dataclasses\nprint(hasattr(dataclasses, '__post_init__'))",
   "status": "unsupported",
   "caution": "実在しないモジュール属性のため、登録すると存在しない項目を捏造することになる。未対応として明示する。",
   "source": "https://docs.python.org/ja/3.15/library/dataclasses.html#dataclasses.__post_init__"
  },
  {
   "name": "dataclasses.asdict",
   "category": "標準ライブラリ",
   "syntax": "asdict(instance)",
   "description": "データクラスのインスタンスを辞書に変換する（入れ子も再帰的に変換）。",
   "example": "from dataclasses import make_dataclass, asdict\nP = make_dataclass('P', ['x', 'y'])\nprint(asdict(P(1, 2)))",
   "status": "supported",
   "caution": "この項目は make_dataclass で作ったクラスに対して再現する（ユーザー定義クラスへの @dataclass 適用は基盤にクラス内部への介入フックがないため未検証）。",
   "returns": "dict",
   "source": "https://docs.python.org/ja/3.15/library/dataclasses.html#dataclasses.asdict"
  },
  {
   "name": "dataclasses.astuple",
   "category": "標準ライブラリ",
   "syntax": "astuple(instance)",
   "description": "データクラスのインスタンスをタプルに変換する（入れ子も再帰的に変換）。",
   "example": "from dataclasses import make_dataclass, astuple\nP = make_dataclass('P', ['x', 'y'])\nprint(astuple(P(1, 2)))",
   "status": "supported",
   "caution": "この項目は make_dataclass で作ったクラスに対して再現する（ユーザー定義クラスへの @dataclass 適用は基盤にクラス内部への介入フックがないため未検証）。",
   "returns": "tuple",
   "source": "https://docs.python.org/ja/3.15/library/dataclasses.html#dataclasses.astuple"
  },
  {
   "name": "dataclasses.dataclass",
   "category": "標準ライブラリ",
   "syntax": "dataclass(cls=None, /, *, init=True, repr=True, eq=True, order=False, unsafe_hash=False, frozen=False, match_args=True, kw_only=False, slots=False, weakref_slot=False)",
   "description": "クラスに __init__ などを生成するデコレータ。ユーザー定義クラスの内部へメソッドを注入するフックが基盤にないため未検証。",
   "example": "import dataclasses\nprint('dataclass デコレータは未検証')",
   "status": "unverified",
   "caution": "基盤要請：ユーザー定義クラスへのメソッド注入（クラス内部への介入フック）が必要。この項目は未検証。",
   "source": "https://docs.python.org/ja/3.15/library/dataclasses.html#dataclasses.dataclass"
  },
  {
   "name": "dataclasses.field",
   "category": "標準ライブラリ",
   "syntax": "field(*, default=MISSING, default_factory=MISSING, init=True, repr=True, hash=None, compare=True, metadata=None, kw_only=False)",
   "description": "フィールドの既定値や振る舞いを指定する。default と default_factory の併用は ValueError。",
   "example": "from dataclasses import make_dataclass, field\nP = make_dataclass('P', [('y', int, field(default=5))])\nprint(P().y)",
   "status": "supported",
   "caution": "この項目は make_dataclass で作ったクラスに対して再現する（ユーザー定義クラスへの @dataclass 適用は基盤にクラス内部への介入フックがないため未検証）。",
   "returns": "Field",
   "source": "https://docs.python.org/ja/3.15/library/dataclasses.html#dataclasses.field"
  },
  {
   "name": "dataclasses.fields",
   "category": "標準ライブラリ",
   "syntax": "fields(class_or_instance)",
   "description": "フィールドのメタデータ（Field）のタプルを返す。データクラスでなければ TypeError。",
   "example": "from dataclasses import make_dataclass, fields\nP = make_dataclass('P', ['x', 'y'])\nprint([f.name for f in fields(P)])",
   "status": "supported",
   "caution": "この項目は make_dataclass で作ったクラスに対して再現する（ユーザー定義クラスへの @dataclass 適用は基盤にクラス内部への介入フックがないため未検証）。",
   "returns": "tuple",
   "source": "https://docs.python.org/ja/3.15/library/dataclasses.html#dataclasses.fields"
  },
  {
   "name": "dataclasses.is_dataclass",
   "category": "標準ライブラリ",
   "syntax": "is_dataclass(instance)",
   "description": "データクラス（またはそのインスタンス）なら True。",
   "example": "from dataclasses import make_dataclass, is_dataclass\nP = make_dataclass('P', ['x'])\nprint(is_dataclass(P), is_dataclass(3))",
   "status": "supported",
   "caution": "この項目は make_dataclass で作ったクラスに対して再現する（ユーザー定義クラスへの @dataclass 適用は基盤にクラス内部への介入フックがないため未検証）。",
   "returns": "bool",
   "source": "https://docs.python.org/ja/3.15/library/dataclasses.html#dataclasses.is_dataclass"
  },
  {
   "name": "dataclasses.make_dataclass",
   "category": "標準ライブラリ",
   "syntax": "make_dataclass(cls_name, fields, *, bases=(), namespace=None, init=True, repr=True, eq=True, order=False, unsafe_hash=False, frozen=False, match_args=True, kw_only=False, slots=False, weakref_slot=False)",
   "description": "フィールド列からデータクラスを動的に作る。フィールドは名前、(名前, 型)、(名前, 型, Field) のいずれか。生成クラスは __init__（既定値・キーワード専用を含む）、repr、eq を備える。",
   "example": "from dataclasses import make_dataclass\nP = make_dataclass('P', ['x', 'y'])\nprint(P(1, 2))",
   "status": "supported",
   "caution": "bases/namespace/slots などの高度な指定は再現しない。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/dataclasses.html#dataclasses.make_dataclass"
  },
  {
   "name": "dataclasses.replace",
   "category": "標準ライブラリ",
   "syntax": "replace(instance, **changes)",
   "description": "指定したフィールドだけを差し替えた新しいインスタンスを返す。存在しないフィールドでは ValueError。",
   "example": "from dataclasses import make_dataclass, replace\nP = make_dataclass('P', ['x', 'y'])\nprint(replace(P(1, 2), y=9))",
   "status": "supported",
   "caution": "この項目は make_dataclass で作ったクラスに対して再現する（ユーザー定義クラスへの @dataclass 適用は基盤にクラス内部への介入フックがないため未検証）。",
   "source": "https://docs.python.org/ja/3.15/library/dataclasses.html#dataclasses.replace"
  }
];
