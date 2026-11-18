/* 高度モード B7 G4 リファレンス：contextvars（正規形）
 * 出典は各項目の source（公式ドキュメント 3.15）。status は実装の裏付け状態。
 * expected（期待出力）はここには置かず、テストファイルのケース表で保持する。 */
export const referenceAdvanced = [
  {
   "name": "contextvars.Context",
   "category": "標準ライブラリ",
   "syntax": "class Context()",
   "description": "文脈（ContextVar の値の写像）のスナップショット。run でコールバックをその文脈で実行できる。",
   "example": "import contextvars\nctx = contextvars.Context()\nprint(len(ctx))",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "returns": "Context",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.Context"
  },
  {
   "name": "contextvars.Context.copy",
   "category": "標準ライブラリ",
   "syntax": "copy()",
   "description": "文脈の浅いコピーを返す。",
   "example": "import contextvars\nv = contextvars.ContextVar('v')\nt = v.set(1)\nctx = contextvars.copy_context()\nprint(ctx.copy().get(v))",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "returns": "Context",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.Context.copy"
  },
  {
   "name": "contextvars.Context.get",
   "category": "標準ライブラリ",
   "syntax": "get(var, default=None)",
   "description": "文脈の中の var の値を返す。文脈に値がなければ default（変数自体の既定値へはフォールバックしない）。",
   "example": "from contextvars import ContextVar, copy_context\nv = ContextVar('v', default='d')\nctx = copy_context()\nprint(ctx.get(v), ctx.get(v, 'fb'))",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.Context.get"
  },
  {
   "name": "contextvars.Context.items",
   "category": "標準ライブラリ",
   "syntax": "items()",
   "description": "(ContextVar, 値) の組を返すビュー。",
   "example": "import contextvars\nv = contextvars.ContextVar('v')\nctx = contextvars.Context()\ndef f():\n    v.set(1)\nctx.run(f)\nprint(len(ctx.items()))",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.Context.items"
  },
  {
   "name": "contextvars.Context.keys",
   "category": "標準ライブラリ",
   "syntax": "keys()",
   "description": "文脈に値が入っている ContextVar を返すビュー。",
   "example": "import contextvars\nv = contextvars.ContextVar('v')\nctx = contextvars.Context()\ndef f():\n    v.set(1)\nctx.run(f)\nprint(len(ctx.keys()))",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.Context.keys"
  },
  {
   "name": "contextvars.Context.run",
   "category": "標準ライブラリ",
   "syntax": "run(callable, *args, **kwargs)",
   "description": "この文脈を現在の文脈として callable を実行し、結果を返す。実行中の set はこの文脈に記録される。",
   "example": "from contextvars import ContextVar, Context\nv = ContextVar('v', default='d')\nctx = Context()\nprint(ctx.run(v.get))",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.Context.run"
  },
  {
   "name": "contextvars.Context.values",
   "category": "標準ライブラリ",
   "syntax": "values()",
   "description": "文脈の値を返すビュー。",
   "example": "import contextvars\nv = contextvars.ContextVar('v')\nctx = contextvars.Context()\ndef f():\n    v.set(7)\nctx.run(f)\nprint(list(ctx.values()))",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.Context.values"
  },
  {
   "name": "contextvars.ContextVar",
   "category": "標準ライブラリ",
   "syntax": "ContextVar(name, *, default=None)",
   "description": "文脈ごとに値を持つ変数。name は文字列でなければならない（TypeError）。",
   "example": "from contextvars import ContextVar\nv = ContextVar('v', default='d')\nprint(v.get())",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "returns": "ContextVar",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.ContextVar"
  },
  {
   "name": "contextvars.ContextVar.get",
   "category": "標準ライブラリ",
   "syntax": "get(default=None)",
   "description": "現在の文脈での値を返す。値がなければ引数の default、次に変数の既定値、どちらもなければ LookupError。",
   "example": "from contextvars import ContextVar\nv = ContextVar('v', default='d')\nprint(v.get())",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.ContextVar.get"
  },
  {
   "name": "contextvars.ContextVar.name",
   "category": "標準ライブラリ",
   "syntax": "ContextVar.name",
   "description": "変数の名前（読み取り専用）。",
   "example": "from contextvars import ContextVar\nv = ContextVar('myvar')\nprint(v.name)",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "returns": "str",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.ContextVar.name"
  },
  {
   "name": "contextvars.ContextVar.reset",
   "category": "標準ライブラリ",
   "syntax": "reset(token)",
   "description": "set() が返したトークンで値を以前の状態に戻す。別の変数のトークンでは ValueError、使い終わったトークンの再利用では RuntimeError。",
   "example": "from contextvars import ContextVar\nv = ContextVar('v', default='d')\nt = v.set('x')\nv.reset(t)\nprint(v.get())",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.ContextVar.reset"
  },
  {
   "name": "contextvars.ContextVar.set",
   "category": "標準ライブラリ",
   "syntax": "set(value)",
   "description": "現在の文脈で値を設定し、reset に使うトークンを返す。",
   "example": "from contextvars import ContextVar\nv = ContextVar('v', default='d')\nt = v.set('x')\nprint(v.get())",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "returns": "Token",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.ContextVar.set"
  },
  {
   "name": "contextvars.Token",
   "category": "標準ライブラリ",
   "syntax": "class Token",
   "description": "ContextVar.set() の戻り値。直接は作れない（TypeError）。var と old_value 属性を持つ。",
   "example": "from contextvars import ContextVar\nv = ContextVar('v', default='d')\nt = v.set('x')\nprint(t.var == v)",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.Token"
  },
  {
   "name": "contextvars.Token.MISSING",
   "category": "標準ライブラリ",
   "syntax": "Token.MISSING",
   "description": "set() の前に値がなかったことを表す単例のマーカー。",
   "example": "from contextvars import ContextVar, Token\nv = ContextVar('v')\nt = v.set(1)\nprint(t.old_value == Token.MISSING)",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。 このエンジンでは is による同一性判定がネイティブ値で未確定になるため、同一性の確認はできない。",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.Token.MISSING"
  },
  {
   "name": "contextvars.Token.old_value",
   "category": "標準ライブラリ",
   "syntax": "token.old_value",
   "description": "set() の前の値。値がなかった場合は Token.MISSING。",
   "example": "from contextvars import ContextVar\nv = ContextVar('v', default='d')\nt = v.set('x')\nprint(t.old_value)",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.Token.old_value"
  },
  {
   "name": "contextvars.Token.var",
   "category": "標準ライブラリ",
   "syntax": "token.var",
   "description": "トークンを作った ContextVar。",
   "example": "from contextvars import ContextVar\nv = ContextVar('v', default='d')\nt = v.set('x')\nprint(t.var.name)",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "returns": "ContextVar",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.Token.var"
  },
  {
   "name": "contextvars.copy_context",
   "category": "標準ライブラリ",
   "syntax": "copy_context()",
   "description": "現在の文脈のコピー（Context）を返す。",
   "example": "from contextvars import ContextVar, copy_context\nv = ContextVar('v', default='d')\nt = v.set('x')\nctx = copy_context()\nprint(ctx.get(v))",
   "status": "supported",
   "caution": "エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈として再現する（非同期タスク間の伝播は再現できない）。",
   "returns": "Context",
   "source": "https://docs.python.org/ja/3.15/library/contextvars.html#contextvars.copy_context"
  }
];
