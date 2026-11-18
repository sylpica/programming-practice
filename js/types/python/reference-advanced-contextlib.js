/* 高度モード B7 G4 リファレンス：contextlib（正規形）
 * 出典は各項目の source（公式ドキュメント 3.15）。status は実装の裏付け状態。
 * expected（期待出力）はここには置かず、テストファイルのケース表で保持する。 */
export const referenceAdvanced = [
  {
   "name": "contextlib.AbstractAsyncContextManager",
   "category": "標準ライブラリ",
   "syntax": "class AbstractAsyncContextManager",
   "description": "非同期コンテキストマネージャの ABC。非同期処理を扱えないため未対応。",
   "example": "import contextlib\nprint('AbstractAsyncContextManager は未対応')",
   "status": "unsupported",
   "caution": "このエンジンには非同期処理（async/await）の実行機構がないため未対応。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.AbstractAsyncContextManager"
  },
  {
   "name": "contextlib.AbstractContextManager",
   "category": "標準ライブラリ",
   "syntax": "class AbstractContextManager",
   "description": "コンテキストマネージャの ABC。単独で実体化すると TypeError（抽象クラス）になる点まで再現する。",
   "example": "from contextlib import AbstractContextManager\ntry:\n    AbstractContextManager()\nexcept TypeError:\n    print('TypeError')",
   "status": "supported",
   "caution": "継承して __enter__/__exit__ を実装する使い方は、エンジンの with 文がそれらを呼ばないため再現できない。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.AbstractContextManager"
  },
  {
   "name": "contextlib.AsyncContextDecorator",
   "category": "標準ライブラリ",
   "syntax": "class AsyncContextDecorator",
   "description": "非同期コンテキストマネージャをデコレータとして使うための基底。非同期処理を扱えないため未対応。",
   "example": "import contextlib\nprint('AsyncContextDecorator は未対応')",
   "status": "unsupported",
   "caution": "このエンジンには非同期処理（async/await）の実行機構がないため未対応。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.AsyncContextDecorator"
  },
  {
   "name": "contextlib.AsyncExitStack",
   "category": "標準ライブラリ",
   "syntax": "class AsyncExitStack",
   "description": "非同期版の ExitStack。非同期処理を扱えないため未対応。",
   "example": "import contextlib\nprint('AsyncExitStack は未対応')",
   "status": "unsupported",
   "caution": "このエンジンには非同期処理（async/await）の実行機構がないため未対応。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.AsyncExitStack"
  },
  {
   "name": "contextlib.AsyncExitStack.aclose",
   "category": "標準ライブラリ",
   "syntax": "aclose()",
   "description": "非同期にクローズする。非同期処理を扱えないため未対応。",
   "example": "import contextlib\nprint('aclose は未対応')",
   "status": "unsupported",
   "caution": "このエンジンには非同期処理（async/await）の実行機構がないため未対応。",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.AsyncExitStack.aclose"
  },
  {
   "name": "contextlib.AsyncExitStack.enter_async_context",
   "category": "標準ライブラリ",
   "syntax": "enter_async_context(cm)",
   "description": "非同期コンテキストマネージャに入る。非同期処理を扱えないため未対応。",
   "example": "import contextlib\nprint('enter_async_context は未対応')",
   "status": "unsupported",
   "caution": "このエンジンには非同期処理（async/await）の実行機構がないため未対応。",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.AsyncExitStack.enter_async_context"
  },
  {
   "name": "contextlib.AsyncExitStack.push_async_callback",
   "category": "標準ライブラリ",
   "syntax": "push_async_callback(callback, /)",
   "description": "非同期コールバックを積む。非同期処理を扱えないため未対応。",
   "example": "import contextlib\nprint('push_async_callback は未対応')",
   "status": "unsupported",
   "caution": "このエンジンには非同期処理（async/await）の実行機構がないため未対応。",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.AsyncExitStack.push_async_callback"
  },
  {
   "name": "contextlib.AsyncExitStack.push_async_exit",
   "category": "標準ライブラリ",
   "syntax": "push_async_exit(exit)",
   "description": "非同期の終了処理を積む。非同期処理を扱えないため未対応。",
   "example": "import contextlib\nprint('push_async_exit は未対応')",
   "status": "unsupported",
   "caution": "このエンジンには非同期処理（async/await）の実行機構がないため未対応。",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.AsyncExitStack.push_async_exit"
  },
  {
   "name": "contextlib.ContextDecorator",
   "category": "標準ライブラリ",
   "syntax": "class ContextDecorator",
   "description": "コンテキストマネージャをデコレータとして再利用する基底。with の出入りが観測できないため未検証。",
   "example": "import contextlib\nprint('ContextDecorator は未検証')",
   "status": "unverified",
   "caution": "このエンジンの with 文は __enter__/__exit__ を呼ばない（本体は実行されるが as 変数は未確定値になる）ため、with の出入り自体が観測可能な挙動の中核である項目は未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.ContextDecorator"
  },
  {
   "name": "contextlib.ExitStack",
   "category": "標準ライブラリ",
   "syntax": "class ExitStack",
   "description": "コールバックを積んで close() で逆順（LIFO）に実行するスタック。callback/push/pop_all/close を再現する。",
   "example": "from contextlib import ExitStack\norder = []\nwith_stack = ExitStack()\nwith_stack.callback(order.append, 'a')\nwith_stack.callback(order.append, 'b')\nwith_stack.close()\nprint(order)",
   "status": "supported",
   "caution": "enter_context は with の出入りに依存するため未検証（個別項目を参照）。",
   "returns": "ExitStack",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.ExitStack"
  },
  {
   "name": "contextlib.ExitStack.callback",
   "category": "標準ライブラリ",
   "syntax": "callback(callback, /, *args, **kwds)",
   "description": "引数つきコールバックを登録し、そのコールバック自体を返す。close() で逆順に実行される。",
   "example": "from contextlib import ExitStack\norder = []\ns = ExitStack()\ns.callback(order.append, 'x')\ns.close()\nprint(order)",
   "status": "supported",
   "caution": "",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.ExitStack.callback"
  },
  {
   "name": "contextlib.ExitStack.close",
   "category": "標準ライブラリ",
   "syntax": "close()",
   "description": "登録されたコールバックを逆順（LIFO）にすべて実行する。",
   "example": "from contextlib import ExitStack\norder = []\ns = ExitStack()\ns.callback(order.append, 1)\ns.callback(order.append, 2)\ns.close()\nprint(order)",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.ExitStack.close"
  },
  {
   "name": "contextlib.ExitStack.enter_context",
   "category": "標準ライブラリ",
   "syntax": "enter_context(cm)",
   "description": "コンテキストマネージャに入り、終了処理をスタックに積む。with の出入りが観測できないため未検証。",
   "example": "import contextlib\nprint('enter_context は未検証')",
   "status": "unverified",
   "caution": "このエンジンの with 文は __enter__/__exit__ を呼ばない（本体は実行されるが as 変数は未確定値になる）ため、with の出入り自体が観測可能な挙動の中核である項目は未検証。",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.ExitStack.enter_context"
  },
  {
   "name": "contextlib.ExitStack.pop_all",
   "category": "標準ライブラリ",
   "syntax": "pop_all()",
   "description": "積まれたコールバックを新しい ExitStack へ移し替えて返す。元のスタックは空になる。",
   "example": "from contextlib import ExitStack\norder = []\ns = ExitStack()\ns.callback(order.append, 1)\ns2 = s.pop_all()\ns.close()\ns2.close()\nprint(order)",
   "status": "supported",
   "caution": "",
   "returns": "ExitStack",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.ExitStack.pop_all"
  },
  {
   "name": "contextlib.ExitStack.push",
   "category": "標準ライブラリ",
   "syntax": "push(exit)",
   "description": "終了処理の呼び出し可能オブジェクト（__exit__ 相当の関数）を積み、そのオブジェクト自体を返す。close() では (None, None, None) を渡して呼ばれる。",
   "example": "from contextlib import ExitStack\nseen = []\ndef exit_fn(*a):\n    seen.append(a)\ns = ExitStack()\ns.push(exit_fn)\ns.close()\nprint(len(seen))",
   "status": "supported",
   "caution": "",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.ExitStack.push"
  },
  {
   "name": "contextlib.aclosing",
   "category": "標準ライブラリ",
   "syntax": "class aclosing(thing)",
   "description": "非同期の close を持つオブジェクトを包む。非同期処理を扱えないため未対応。",
   "example": "import contextlib\nprint('aclosing は未対応')",
   "status": "unsupported",
   "caution": "このエンジンには非同期処理（async/await）の実行機構がないため未対応。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.aclosing"
  },
  {
   "name": "contextlib.asynccontextmanager",
   "category": "標準ライブラリ",
   "syntax": "asynccontextmanager(func)",
   "description": "非同期ジェネレータ関数から非同期コンテキストマネージャを作るデコレータ。非同期処理を扱えないため未対応。",
   "example": "import contextlib\nprint('asynccontextmanager は未対応')",
   "status": "unsupported",
   "caution": "このエンジンには非同期処理（async/await）の実行機構がないため未対応。",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.asynccontextmanager"
  },
  {
   "name": "contextlib.chdir",
   "category": "標準ライブラリ",
   "syntax": "class chdir(path)",
   "description": "作業ディレクトリを変更するコンテキストマネージャ。このエンジンにはファイルシステムがないため未対応。",
   "example": "import contextlib\nprint('chdir は未対応')",
   "status": "unsupported",
   "caution": "ファイルシステムを扱えないため未対応。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.chdir"
  },
  {
   "name": "contextlib.closing",
   "category": "標準ライブラリ",
   "syntax": "class closing(thing)",
   "description": "close() を持つオブジェクトを with で使うためのラッパ。with の出入りが観測できないため未検証。",
   "example": "import contextlib\nprint('closing は未検証')",
   "status": "unverified",
   "caution": "このエンジンの with 文は __enter__/__exit__ を呼ばない（本体は実行されるが as 変数は未確定値になる）ため、with の出入り自体が観測可能な挙動の中核である項目は未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.closing"
  },
  {
   "name": "contextlib.contextmanager",
   "category": "標準ライブラリ",
   "syntax": "contextmanager(func)",
   "description": "ジェネレータ関数からコンテキストマネージャを作るデコレータ。with の出入りが観測できないため未検証。",
   "example": "import contextlib\nprint('contextmanager は未検証')",
   "status": "unverified",
   "caution": "このエンジンの with 文は __enter__/__exit__ を呼ばない（本体は実行されるが as 変数は未確定値になる）ため、with の出入り自体が観測可能な挙動の中核である項目は未検証。",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.contextmanager"
  },
  {
   "name": "contextlib.nullcontext",
   "category": "標準ライブラリ",
   "syntax": "class nullcontext(enter_result=None)",
   "description": "何もしないコンテキストマネージャで、__enter__ の結果として enter_result を返す。with の出入りが観測できないため未検証。",
   "example": "import contextlib\nprint('nullcontext は未検証')",
   "status": "unverified",
   "caution": "このエンジンの with 文は __enter__/__exit__ を呼ばない（本体は実行されるが as 変数は未確定値になる）ため、with の出入り自体が観測可能な挙動の中核である項目は未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.nullcontext"
  },
  {
   "name": "contextlib.redirect_stderr",
   "category": "標準ライブラリ",
   "syntax": "class redirect_stderr(new_target)",
   "description": "標準エラー出力を差し替える。with の出入りと出力先の概念がエンジンにないため未検証。",
   "example": "import contextlib\nprint('redirect_stderr は未検証')",
   "status": "unverified",
   "caution": "このエンジンの with 文は __enter__/__exit__ を呼ばない（本体は実行されるが as 変数は未確定値になる）ため、with の出入り自体が観測可能な挙動の中核である項目は未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.redirect_stderr"
  },
  {
   "name": "contextlib.redirect_stdout",
   "category": "標準ライブラリ",
   "syntax": "class redirect_stdout(new_target)",
   "description": "標準出力を差し替える。with の出入りと出力先の概念がエンジンにないため未検証。",
   "example": "import contextlib\nprint('redirect_stdout は未検証')",
   "status": "unverified",
   "caution": "このエンジンの with 文は __enter__/__exit__ を呼ばない（本体は実行されるが as 変数は未確定値になる）ため、with の出入り自体が観測可能な挙動の中核である項目は未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.redirect_stdout"
  },
  {
   "name": "contextlib.suppress",
   "category": "標準ライブラリ",
   "syntax": "class suppress(*exceptions)",
   "description": "指定した例外を抑制するコンテキストマネージャ。with の出入りが観測できないため未検証。",
   "example": "import contextlib\nprint('suppress は未検証')",
   "status": "unverified",
   "caution": "このエンジンの with 文は __enter__/__exit__ を呼ばない（本体は実行されるが as 変数は未確定値になる）ため、with の出入り自体が観測可能な挙動の中核である項目は未検証。",
   "returns": "type",
   "source": "https://docs.python.org/ja/3.15/library/contextlib.html#contextlib.suppress"
  }
];
