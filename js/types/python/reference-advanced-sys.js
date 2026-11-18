/* 高度モード B7 G9：sys モジュールのリファレンス差分（178件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 裁定方針は docs/audit/b7-g9-report.md を参照（環境依存値は実値化しない）。 */
export const referenceAdvanced = [
 {
  "name": "sys.__breakpointhook__",
  "category": "標準ライブラリ",
  "syntax": "sys.__breakpointhook__",
  "description": "起動時の breakpointhook の値（元のフック）。",
  "example": "import sys\nprint(sys.__breakpointhook__)",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.__breakpointhook__"
 },
 {
  "name": "sys.__displayhook__",
  "category": "標準ライブラリ",
  "syntax": "sys.__displayhook__",
  "description": "起動時の displayhook の値（元のフック）。",
  "example": "import sys\nprint(sys.__displayhook__)",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.__displayhook__"
 },
 {
  "name": "sys.__excepthook__",
  "category": "標準ライブラリ",
  "syntax": "sys.__excepthook__",
  "description": "起動時の excepthook の値（元のフック）。",
  "example": "import sys\nprint(sys.__excepthook__)",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.__excepthook__"
 },
 {
  "name": "sys.__interactivehook__",
  "category": "標準ライブラリ",
  "syntax": "sys.__interactivehook__",
  "description": "対話モード開始時に呼ばれる元のフック。",
  "example": "import sys\nprint(sys.__interactivehook__)",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.__interactivehook__"
 },
 {
  "name": "sys.__stderr__",
  "category": "標準ライブラリ",
  "syntax": "sys.__stderr__",
  "description": "起動時の標準エラー出力（元のストリーム）。",
  "example": "import sys\nprint(sys.__stderr__)",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.__stderr__"
 },
 {
  "name": "sys.__stdin__",
  "category": "標準ライブラリ",
  "syntax": "sys.__stdin__",
  "description": "起動時の標準入力（元のストリーム）。",
  "example": "import sys\nprint(sys.__stdin__)",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.__stdin__"
 },
 {
  "name": "sys.__stdout__",
  "category": "標準ライブラリ",
  "syntax": "sys.__stdout__",
  "description": "起動時の標準出力（元のストリーム）。",
  "example": "import sys\nprint(sys.__stdout__)",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.__stdout__"
 },
 {
  "name": "sys.__unraisablehook__",
  "category": "標準ライブラリ",
  "syntax": "sys.__unraisablehook__",
  "description": "起動時の unraisablehook の値（元のフック）。",
  "example": "import sys\nprint(sys.__unraisablehook__)",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.__unraisablehook__"
 },
 {
  "name": "sys._clear_internal_caches",
  "category": "標準ライブラリ",
  "syntax": "sys._clear_internal_caches()",
  "description": "内部キャッシュを消去する（内部用）。",
  "example": "import sys\nsys._clear_internal_caches()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._clear_internal_caches"
 },
 {
  "name": "sys._clear_type_cache",
  "category": "標準ライブラリ",
  "syntax": "sys._clear_type_cache()",
  "description": "型キャッシュを消去する（内部用。旧名）。",
  "example": "import sys\nsys._clear_type_cache()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._clear_type_cache"
 },
 {
  "name": "sys._current_exceptions",
  "category": "標準ライブラリ",
  "syntax": "sys._current_exceptions()",
  "description": "スレッドごとの現在の例外を返す（内部用）。",
  "example": "import sys\nsys._current_exceptions()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._current_exceptions"
 },
 {
  "name": "sys._current_frames",
  "category": "標準ライブラリ",
  "syntax": "sys._current_frames()",
  "description": "スレッドごとの現在のフレームを返す（内部用）。",
  "example": "import sys\nsys._current_frames()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._current_frames"
 },
 {
  "name": "sys._debugmallocstats",
  "category": "標準ライブラリ",
  "syntax": "sys._debugmallocstats()",
  "description": "メモリ確保の統計を標準エラーへ出す（内部用）。",
  "example": "import sys\nsys._debugmallocstats()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._debugmallocstats"
 },
 {
  "name": "sys._emscripten_info",
  "category": "標準ライブラリ",
  "syntax": "sys._emscripten_info",
  "description": "Emscripten 上での実行情報（名前空間）。",
  "example": "import sys\nprint(sys._emscripten_info)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._emscripten_info"
 },
 {
  "name": "sys._emscripten_info.emscripten_version",
  "category": "標準ライブラリ",
  "syntax": "sys._emscripten_info.emscripten_version",
  "description": "Emscripten 情報の属性「emscripten_version」。",
  "example": "import sys\nprint(sys._emscripten_info.emscripten_version)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._emscripten_info.emscripten_version"
 },
 {
  "name": "sys._emscripten_info.pthreads",
  "category": "標準ライブラリ",
  "syntax": "sys._emscripten_info.pthreads",
  "description": "Emscripten 情報の属性「pthreads」。",
  "example": "import sys\nprint(sys._emscripten_info.pthreads)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._emscripten_info.pthreads"
 },
 {
  "name": "sys._emscripten_info.runtime",
  "category": "標準ライブラリ",
  "syntax": "sys._emscripten_info.runtime",
  "description": "Emscripten 情報の属性「runtime」。",
  "example": "import sys\nprint(sys._emscripten_info.runtime)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._emscripten_info.runtime"
 },
 {
  "name": "sys._emscripten_info.shared_memory",
  "category": "標準ライブラリ",
  "syntax": "sys._emscripten_info.shared_memory",
  "description": "Emscripten 情報の属性「shared_memory」。",
  "example": "import sys\nprint(sys._emscripten_info.shared_memory)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._emscripten_info.shared_memory"
 },
 {
  "name": "sys._enablelegacywindowsfsencoding",
  "category": "標準ライブラリ",
  "syntax": "sys._enablelegacywindowsfsencoding()",
  "description": "Windows の旧ファイルシステムエンコーディングを有効化する（Windows のみ）。",
  "example": "import sys\nsys._enablelegacywindowsfsencoding()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._enablelegacywindowsfsencoding"
 },
 {
  "name": "sys._getframe",
  "category": "標準ライブラリ",
  "syntax": "sys._getframe()",
  "description": "呼び出しスタックのフレームオブジェクトを返す（内部用）。",
  "example": "import sys\nsys._getframe()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._getframe"
 },
 {
  "name": "sys._getframemodulename",
  "category": "標準ライブラリ",
  "syntax": "sys._getframemodulename()",
  "description": "フレームのモジュール名を返す（内部用）。",
  "example": "import sys\nsys._getframemodulename()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._getframemodulename"
 },
 {
  "name": "sys._is_gil_enabled",
  "category": "標準ライブラリ",
  "syntax": "sys._is_gil_enabled()",
  "description": "GIL が有効かを返す（内部用）。",
  "example": "import sys\nsys._is_gil_enabled()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._is_gil_enabled"
 },
 {
  "name": "sys._is_immortal",
  "category": "標準ライブラリ",
  "syntax": "sys._is_immortal()",
  "description": "オブジェクトが不滅（immortal）かを返す（内部用）。",
  "example": "import sys\nsys._is_immortal()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._is_immortal"
 },
 {
  "name": "sys._is_interned",
  "category": "標準ライブラリ",
  "syntax": "sys._is_interned()",
  "description": "文字列が intern されているかを返す（内部用）。",
  "example": "import sys\nsys._is_interned()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._is_interned"
 },
 {
  "name": "sys._jit",
  "category": "標準ライブラリ",
  "syntax": "sys._jit",
  "description": "JIT コンパイラ関連の情報（名前空間）。",
  "example": "import sys\nprint(sys._jit)",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._jit"
 },
 {
  "name": "sys._jit.is_active",
  "category": "標準ライブラリ",
  "syntax": "sys._jit.is_active()",
  "description": "JIT 情報の属性「is_active」。",
  "example": "import sys\nsys._jit.is_active()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._jit.is_active"
 },
 {
  "name": "sys._jit.is_available",
  "category": "標準ライブラリ",
  "syntax": "sys._jit.is_available()",
  "description": "JIT 情報の属性「is_available」。",
  "example": "import sys\nsys._jit.is_available()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._jit.is_available"
 },
 {
  "name": "sys._jit.is_enabled",
  "category": "標準ライブラリ",
  "syntax": "sys._jit.is_enabled()",
  "description": "JIT 情報の属性「is_enabled」。",
  "example": "import sys\nsys._jit.is_enabled()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._jit.is_enabled"
 },
 {
  "name": "sys._path0",
  "category": "標準ライブラリ",
  "syntax": "sys._path0",
  "description": "sys.path の先頭要素に対応する初期値。",
  "example": "import sys\nprint(sys._path0)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._path0"
 },
 {
  "name": "sys._xoptions",
  "category": "標準ライブラリ",
  "syntax": "sys._xoptions",
  "description": "-X オプションで渡された追加オプションの辞書。",
  "example": "import sys\nprint(sys._xoptions)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys._xoptions"
 },
 {
  "name": "sys.abi_info",
  "category": "標準ライブラリ",
  "syntax": "sys.abi_info",
  "description": "ABI に関する情報（名前空間。Python 3.15以降）。",
  "example": "import sys\nprint(sys.abi_info)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.abi_info"
 },
 {
  "name": "sys.abi_info.byteorder",
  "category": "標準ライブラリ",
  "syntax": "sys.abi_info.byteorder",
  "description": "ABI 情報の属性「byteorder」。",
  "example": "import sys\nprint(sys.abi_info.byteorder)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.abi_info.byteorder"
 },
 {
  "name": "sys.abi_info.debug",
  "category": "標準ライブラリ",
  "syntax": "sys.abi_info.debug",
  "description": "ABI 情報の属性「debug」。",
  "example": "import sys\nprint(sys.abi_info.debug)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.abi_info.debug"
 },
 {
  "name": "sys.abi_info.free_threaded",
  "category": "標準ライブラリ",
  "syntax": "sys.abi_info.free_threaded",
  "description": "ABI 情報の属性「free_threaded」。",
  "example": "import sys\nprint(sys.abi_info.free_threaded)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.abi_info.free_threaded"
 },
 {
  "name": "sys.abi_info.pointer_bits",
  "category": "標準ライブラリ",
  "syntax": "sys.abi_info.pointer_bits",
  "description": "ABI 情報の属性「pointer_bits」。",
  "example": "import sys\nprint(sys.abi_info.pointer_bits)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.abi_info.pointer_bits"
 },
 {
  "name": "sys.abiflags",
  "category": "標準ライブラリ",
  "syntax": "sys.abiflags",
  "description": "ビルドの ABI フラグ文字列。",
  "example": "import sys\nprint(sys.abiflags)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.abiflags"
 },
 {
  "name": "sys.activate_stack_trampoline",
  "category": "標準ライブラリ",
  "syntax": "sys.activate_stack_trampoline()",
  "description": "スタックトランポリンを有効化する。",
  "example": "import sys\nsys.activate_stack_trampoline()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.activate_stack_trampoline"
 },
 {
  "name": "sys.addaudithook",
  "category": "標準ライブラリ",
  "syntax": "sys.addaudithook()",
  "description": "監査フックを追加する。",
  "example": "import sys\nsys.addaudithook()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.addaudithook"
 },
 {
  "name": "sys.api_version",
  "category": "標準ライブラリ",
  "syntax": "sys.api_version",
  "description": "C API のバージョン番号。",
  "example": "import sys\nprint(sys.api_version)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.api_version"
 },
 {
  "name": "sys.argv",
  "category": "標準ライブラリ",
  "syntax": "sys.argv",
  "description": "コマンドライン引数のリスト。",
  "example": "import sys\nprint(sys.argv)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.argv"
 },
 {
  "name": "sys.audit",
  "category": "標準ライブラリ",
  "syntax": "sys.audit()",
  "description": "監査イベントを発生させる。",
  "example": "import sys\nsys.audit()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.audit"
 },
 {
  "name": "sys.base_exec_prefix",
  "category": "標準ライブラリ",
  "syntax": "sys.base_exec_prefix",
  "description": "仮想環境でない側の exec_prefix。",
  "example": "import sys\nprint(sys.base_exec_prefix)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.base_exec_prefix"
 },
 {
  "name": "sys.base_prefix",
  "category": "標準ライブラリ",
  "syntax": "sys.base_prefix",
  "description": "仮想環境でない側の prefix。",
  "example": "import sys\nprint(sys.base_prefix)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.base_prefix"
 },
 {
  "name": "sys.breakpointhook",
  "category": "標準ライブラリ",
  "syntax": "sys.breakpointhook()",
  "description": "breakpoint() が呼ぶフック関数。",
  "example": "import sys\nsys.breakpointhook()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.breakpointhook"
 },
 {
  "name": "sys.builtin_module_names",
  "category": "標準ライブラリ",
  "syntax": "sys.builtin_module_names",
  "description": "組み込みモジュール名のタプル。",
  "example": "import sys\nprint(sys.builtin_module_names)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.builtin_module_names"
 },
 {
  "name": "sys.byteorder",
  "category": "標準ライブラリ",
  "syntax": "sys.byteorder",
  "description": "ネイティブのバイト順（'little' または 'big'）。",
  "example": "import sys\nprint(sys.byteorder)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.byteorder"
 },
 {
  "name": "sys.call_tracing",
  "category": "標準ライブラリ",
  "syntax": "sys.call_tracing()",
  "description": "トレース有効状態で関数を呼ぶ。",
  "example": "import sys\nsys.call_tracing()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.call_tracing"
 },
 {
  "name": "sys.copyright",
  "category": "標準ライブラリ",
  "syntax": "sys.copyright",
  "description": "インタプリタの著作権表示文字列。",
  "example": "import sys\nprint(sys.copyright)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.copyright"
 },
 {
  "name": "sys.deactivate_stack_trampoline",
  "category": "標準ライブラリ",
  "syntax": "sys.deactivate_stack_trampoline()",
  "description": "スタックトランポリンを無効化する。",
  "example": "import sys\nsys.deactivate_stack_trampoline()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.deactivate_stack_trampoline"
 },
 {
  "name": "sys.displayhook",
  "category": "標準ライブラリ",
  "syntax": "sys.displayhook()",
  "description": "対話モードで式の値を表示するフック。",
  "example": "import sys\nsys.displayhook()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.displayhook"
 },
 {
  "name": "sys.dllhandle",
  "category": "標準ライブラリ",
  "syntax": "sys.dllhandle",
  "description": "Python DLL のハンドル（Windows のみ）。",
  "example": "import sys\nprint(sys.dllhandle)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.dllhandle"
 },
 {
  "name": "sys.dont_write_bytecode",
  "category": "標準ライブラリ",
  "syntax": "sys.dont_write_bytecode",
  "description": "バイトコード書き出しを抑制するか（真偽値）。",
  "example": "import sys\nprint(sys.dont_write_bytecode)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.dont_write_bytecode"
 },
 {
  "name": "sys.exc_info",
  "category": "標準ライブラリ",
  "syntax": "sys.exc_info()",
  "description": "現在処理中の例外の (型, 値, トレースバック) を返す。",
  "example": "import sys\nsys.exc_info()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.exc_info"
 },
 {
  "name": "sys.excepthook",
  "category": "標準ライブラリ",
  "syntax": "sys.excepthook()",
  "description": "捕捉されなかった例外を表示するフック。",
  "example": "import sys\nsys.excepthook()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.excepthook"
 },
 {
  "name": "sys.exception",
  "category": "標準ライブラリ",
  "syntax": "sys.exception()",
  "description": "現在処理中の例外インスタンスを返す。",
  "example": "import sys\nsys.exception()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.exception"
 },
 {
  "name": "sys.exec_prefix",
  "category": "標準ライブラリ",
  "syntax": "sys.exec_prefix",
  "description": "プラットフォーム固有ファイルのインストール先プレフィックス。",
  "example": "import sys\nprint(sys.exec_prefix)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.exec_prefix"
 },
 {
  "name": "sys.executable",
  "category": "標準ライブラリ",
  "syntax": "sys.executable",
  "description": "インタプリタ実行ファイルのパス。",
  "example": "import sys\nprint(sys.executable)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.executable"
 },
 {
  "name": "sys.exit",
  "category": "標準ライブラリ",
  "syntax": "sys.exit([arg])",
  "description": "SystemExit 例外を送出してプログラムを終了させる。",
  "example": "import sys\ntry:\n    sys.exit(3)\nexcept SystemExit:\n    print('exit')",
  "caution": "SystemExit を送出する。終了コードや引数の標準エラーへの表示までは再現しない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.exit"
 },
 {
  "name": "sys.flags",
  "category": "標準ライブラリ",
  "syntax": "sys.flags",
  "description": "コマンドライン引数の状態を表す名前空間。",
  "example": "import sys\nprint(sys.flags)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags"
 },
 {
  "name": "sys.flags.bytes_warning",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.bytes_warning",
  "description": "起動フラグの属性「bytes_warning」。",
  "example": "import sys\nprint(sys.flags.bytes_warning)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.bytes_warning"
 },
 {
  "name": "sys.flags.context_aware_warnings",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.context_aware_warnings",
  "description": "起動フラグの属性「context_aware_warnings」。",
  "example": "import sys\nprint(sys.flags.context_aware_warnings)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.context_aware_warnings"
 },
 {
  "name": "sys.flags.debug",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.debug",
  "description": "起動フラグの属性「debug」。",
  "example": "import sys\nprint(sys.flags.debug)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.debug"
 },
 {
  "name": "sys.flags.dev_mode",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.dev_mode",
  "description": "起動フラグの属性「dev_mode」。",
  "example": "import sys\nprint(sys.flags.dev_mode)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.dev_mode"
 },
 {
  "name": "sys.flags.dont_write_bytecode",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.dont_write_bytecode",
  "description": "起動フラグの属性「dont_write_bytecode」。",
  "example": "import sys\nprint(sys.flags.dont_write_bytecode)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.dont_write_bytecode"
 },
 {
  "name": "sys.flags.gil",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.gil",
  "description": "起動フラグの属性「gil」。",
  "example": "import sys\nprint(sys.flags.gil)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.gil"
 },
 {
  "name": "sys.flags.hash_randomization",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.hash_randomization",
  "description": "起動フラグの属性「hash_randomization」。",
  "example": "import sys\nprint(sys.flags.hash_randomization)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.hash_randomization"
 },
 {
  "name": "sys.flags.ignore_environment",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.ignore_environment",
  "description": "起動フラグの属性「ignore_environment」。",
  "example": "import sys\nprint(sys.flags.ignore_environment)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.ignore_environment"
 },
 {
  "name": "sys.flags.inspect",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.inspect",
  "description": "起動フラグの属性「inspect」。",
  "example": "import sys\nprint(sys.flags.inspect)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.inspect"
 },
 {
  "name": "sys.flags.int_max_str_digits",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.int_max_str_digits",
  "description": "起動フラグの属性「int_max_str_digits」。",
  "example": "import sys\nprint(sys.flags.int_max_str_digits)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.int_max_str_digits"
 },
 {
  "name": "sys.flags.interactive",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.interactive",
  "description": "起動フラグの属性「interactive」。",
  "example": "import sys\nprint(sys.flags.interactive)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.interactive"
 },
 {
  "name": "sys.flags.isolated",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.isolated",
  "description": "起動フラグの属性「isolated」。",
  "example": "import sys\nprint(sys.flags.isolated)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.isolated"
 },
 {
  "name": "sys.flags.lazy_imports",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.lazy_imports",
  "description": "起動フラグの属性「lazy_imports」。",
  "example": "import sys\nprint(sys.flags.lazy_imports)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.lazy_imports"
 },
 {
  "name": "sys.flags.no_site",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.no_site",
  "description": "起動フラグの属性「no_site」。",
  "example": "import sys\nprint(sys.flags.no_site)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.no_site"
 },
 {
  "name": "sys.flags.no_user_site",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.no_user_site",
  "description": "起動フラグの属性「no_user_site」。",
  "example": "import sys\nprint(sys.flags.no_user_site)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.no_user_site"
 },
 {
  "name": "sys.flags.optimize",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.optimize",
  "description": "起動フラグの属性「optimize」。",
  "example": "import sys\nprint(sys.flags.optimize)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.optimize"
 },
 {
  "name": "sys.flags.quiet",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.quiet",
  "description": "起動フラグの属性「quiet」。",
  "example": "import sys\nprint(sys.flags.quiet)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.quiet"
 },
 {
  "name": "sys.flags.safe_path",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.safe_path",
  "description": "起動フラグの属性「safe_path」。",
  "example": "import sys\nprint(sys.flags.safe_path)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.safe_path"
 },
 {
  "name": "sys.flags.thread_inherit_context",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.thread_inherit_context",
  "description": "起動フラグの属性「thread_inherit_context」。",
  "example": "import sys\nprint(sys.flags.thread_inherit_context)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.thread_inherit_context"
 },
 {
  "name": "sys.flags.utf8_mode",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.utf8_mode",
  "description": "起動フラグの属性「utf8_mode」。",
  "example": "import sys\nprint(sys.flags.utf8_mode)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.utf8_mode"
 },
 {
  "name": "sys.flags.verbose",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.verbose",
  "description": "起動フラグの属性「verbose」。",
  "example": "import sys\nprint(sys.flags.verbose)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.verbose"
 },
 {
  "name": "sys.flags.warn_default_encoding",
  "category": "標準ライブラリ",
  "syntax": "sys.flags.warn_default_encoding",
  "description": "起動フラグの属性「warn_default_encoding」。",
  "example": "import sys\nprint(sys.flags.warn_default_encoding)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.flags.warn_default_encoding"
 },
 {
  "name": "sys.float_info",
  "category": "標準ライブラリ",
  "syntax": "sys.float_info",
  "description": "float 型の表現に関する情報（名前空間）。",
  "example": "import sys\nprint(sys.float_info)",
  "caution": "各属性は IEEE 754 倍精度（binary64）の事実として定まる値のみを収載する。エンジンの float も binary64 のため真になる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.float_info"
 },
 {
  "name": "sys.float_info.dig",
  "category": "標準ライブラリ",
  "syntax": "sys.float_info.dig",
  "description": "sys.float_info の属性。float の表現情報の属性「dig」。",
  "example": "import sys\nprint(sys.float_info.dig)",
  "caution": "IEEE 754 倍精度の事実として定まる値。CPython 3.12.3 実走でも同値。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.float_info.dig"
 },
 {
  "name": "sys.float_info.epsilon",
  "category": "標準ライブラリ",
  "syntax": "sys.float_info.epsilon",
  "description": "sys.float_info の属性。float の表現情報の属性「epsilon」。",
  "example": "import sys\nprint(sys.float_info.epsilon)",
  "caution": "IEEE 754 倍精度の事実として定まる値。CPython 3.12.3 実走でも同値。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.float_info.epsilon"
 },
 {
  "name": "sys.float_info.mant_dig",
  "category": "標準ライブラリ",
  "syntax": "sys.float_info.mant_dig",
  "description": "sys.float_info の属性。float の表現情報の属性「mant_dig」。",
  "example": "import sys\nprint(sys.float_info.mant_dig)",
  "caution": "IEEE 754 倍精度の事実として定まる値。CPython 3.12.3 実走でも同値。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.float_info.mant_dig"
 },
 {
  "name": "sys.float_info.max",
  "category": "標準ライブラリ",
  "syntax": "sys.float_info.max",
  "description": "sys.float_info の属性。float の表現情報の属性「max」。",
  "example": "import sys\nprint(sys.float_info.max)",
  "caution": "IEEE 754 倍精度の事実として定まる値。CPython 3.12.3 実走でも同値。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.float_info.max"
 },
 {
  "name": "sys.float_info.max_10_exp",
  "category": "標準ライブラリ",
  "syntax": "sys.float_info.max_10_exp",
  "description": "sys.float_info の属性。float の表現情報の属性「max_10_exp」。",
  "example": "import sys\nprint(sys.float_info.max_10_exp)",
  "caution": "IEEE 754 倍精度の事実として定まる値。CPython 3.12.3 実走でも同値。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.float_info.max_10_exp"
 },
 {
  "name": "sys.float_info.max_exp",
  "category": "標準ライブラリ",
  "syntax": "sys.float_info.max_exp",
  "description": "sys.float_info の属性。float の表現情報の属性「max_exp」。",
  "example": "import sys\nprint(sys.float_info.max_exp)",
  "caution": "IEEE 754 倍精度の事実として定まる値。CPython 3.12.3 実走でも同値。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.float_info.max_exp"
 },
 {
  "name": "sys.float_info.min",
  "category": "標準ライブラリ",
  "syntax": "sys.float_info.min",
  "description": "sys.float_info の属性。float の表現情報の属性「min」。",
  "example": "import sys\nprint(sys.float_info.min)",
  "caution": "IEEE 754 倍精度の事実として定まる値。CPython 3.12.3 実走でも同値。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.float_info.min"
 },
 {
  "name": "sys.float_info.min_10_exp",
  "category": "標準ライブラリ",
  "syntax": "sys.float_info.min_10_exp",
  "description": "sys.float_info の属性。float の表現情報の属性「min_10_exp」。",
  "example": "import sys\nprint(sys.float_info.min_10_exp)",
  "caution": "IEEE 754 倍精度の事実として定まる値。CPython 3.12.3 実走でも同値。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.float_info.min_10_exp"
 },
 {
  "name": "sys.float_info.min_exp",
  "category": "標準ライブラリ",
  "syntax": "sys.float_info.min_exp",
  "description": "sys.float_info の属性。float の表現情報の属性「min_exp」。",
  "example": "import sys\nprint(sys.float_info.min_exp)",
  "caution": "IEEE 754 倍精度の事実として定まる値。CPython 3.12.3 実走でも同値。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.float_info.min_exp"
 },
 {
  "name": "sys.float_info.radix",
  "category": "標準ライブラリ",
  "syntax": "sys.float_info.radix",
  "description": "sys.float_info の属性。float の表現情報の属性「radix」。",
  "example": "import sys\nprint(sys.float_info.radix)",
  "caution": "IEEE 754 倍精度の事実として定まる値。CPython 3.12.3 実走でも同値。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.float_info.radix"
 },
 {
  "name": "sys.float_info.rounds",
  "category": "標準ライブラリ",
  "syntax": "sys.float_info.rounds",
  "description": "sys.float_info の属性。float の表現情報の属性「rounds」。",
  "example": "import sys\nprint(sys.float_info.rounds)",
  "caution": "IEEE 754 倍精度の事実として定まる値。CPython 3.12.3 実走でも同値。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.float_info.rounds"
 },
 {
  "name": "sys.float_repr_style",
  "category": "標準ライブラリ",
  "syntax": "sys.float_repr_style",
  "description": "float の repr の形式（'short' または 'legacy'）。",
  "example": "import sys\nprint(sys.float_repr_style)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.float_repr_style"
 },
 {
  "name": "sys.get_asyncgen_hooks",
  "category": "標準ライブラリ",
  "syntax": "sys.get_asyncgen_hooks()",
  "description": "非同期ジェネレータのフックを返す。",
  "example": "import sys\nsys.get_asyncgen_hooks()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.get_asyncgen_hooks"
 },
 {
  "name": "sys.get_coroutine_origin_tracking_depth",
  "category": "標準ライブラリ",
  "syntax": "sys.get_coroutine_origin_tracking_depth()",
  "description": "コルーチンの生成元追跡の深さを返す。",
  "example": "import sys\nsys.get_coroutine_origin_tracking_depth()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.get_coroutine_origin_tracking_depth"
 },
 {
  "name": "sys.get_int_max_str_digits",
  "category": "標準ライブラリ",
  "syntax": "sys.get_int_max_str_digits()",
  "description": "int と文字列の変換桁数上限を返す。",
  "example": "import sys\nsys.get_int_max_str_digits()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.get_int_max_str_digits"
 },
 {
  "name": "sys.get_lazy_imports",
  "category": "標準ライブラリ",
  "syntax": "sys.get_lazy_imports()",
  "description": "遅延 import の設定を返す（Python 3.15以降）。",
  "example": "import sys\nsys.get_lazy_imports()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.get_lazy_imports"
 },
 {
  "name": "sys.get_lazy_imports_filter",
  "category": "標準ライブラリ",
  "syntax": "sys.get_lazy_imports_filter()",
  "description": "遅延 import のフィルタを返す（Python 3.15以降）。",
  "example": "import sys\nsys.get_lazy_imports_filter()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.get_lazy_imports_filter"
 },
 {
  "name": "sys.getallocatedblocks",
  "category": "標準ライブラリ",
  "syntax": "sys.getallocatedblocks()",
  "description": "確保済みブロック数を返す。",
  "example": "import sys\nsys.getallocatedblocks()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.getallocatedblocks"
 },
 {
  "name": "sys.getandroidapilevel",
  "category": "標準ライブラリ",
  "syntax": "sys.getandroidapilevel()",
  "description": "Android の API レベルを返す（Android のみ）。",
  "example": "import sys\nsys.getandroidapilevel()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.getandroidapilevel"
 },
 {
  "name": "sys.getdefaultencoding",
  "category": "標準ライブラリ",
  "syntax": "sys.getdefaultencoding()",
  "description": "デフォルト文字列エンコーディング名を返す。",
  "example": "import sys\nsys.getdefaultencoding()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.getdefaultencoding"
 },
 {
  "name": "sys.getdlopenflags",
  "category": "標準ライブラリ",
  "syntax": "sys.getdlopenflags()",
  "description": "動的ロード用フラグを返す（Unix）。",
  "example": "import sys\nsys.getdlopenflags()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.getdlopenflags"
 },
 {
  "name": "sys.getfilesystemencodeerrors",
  "category": "標準ライブラリ",
  "syntax": "sys.getfilesystemencodeerrors()",
  "description": "ファイルシステム用エラーハンドラ名を返す。",
  "example": "import sys\nsys.getfilesystemencodeerrors()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.getfilesystemencodeerrors"
 },
 {
  "name": "sys.getfilesystemencoding",
  "category": "標準ライブラリ",
  "syntax": "sys.getfilesystemencoding()",
  "description": "ファイルシステムエンコーディング名を返す。",
  "example": "import sys\nsys.getfilesystemencoding()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.getfilesystemencoding"
 },
 {
  "name": "sys.getobjects",
  "category": "標準ライブラリ",
  "syntax": "sys.getobjects()",
  "description": "追跡中の全オブジェクトを返す（デバッグビルド）。",
  "example": "import sys\nsys.getobjects()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.getobjects"
 },
 {
  "name": "sys.getprofile",
  "category": "標準ライブラリ",
  "syntax": "sys.getprofile()",
  "description": "現在のプロファイル関数を返す。",
  "example": "import sys\nsys.getprofile()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.getprofile"
 },
 {
  "name": "sys.getrecursionlimit",
  "category": "標準ライブラリ",
  "syntax": "sys.getrecursionlimit()",
  "description": "再帰の深さの上限を返す。",
  "example": "import sys\nprint(sys.getrecursionlimit())",
  "caution": "本アプリのエンジンの呼び出し深さ上限は 40 であり、CPython の既定値 1000 とは異なる。エンジン自身の事実として 40 を返す。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.getrecursionlimit"
 },
 {
  "name": "sys.getrefcount",
  "category": "標準ライブラリ",
  "syntax": "sys.getrefcount()",
  "description": "オブジェクトの参照カウントを返す。",
  "example": "import sys\nsys.getrefcount()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.getrefcount"
 },
 {
  "name": "sys.getsizeof",
  "category": "標準ライブラリ",
  "syntax": "sys.getsizeof()",
  "description": "オブジェクトのメモリサイズ（バイト）を返す。",
  "example": "import sys\nsys.getsizeof()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.getsizeof"
 },
 {
  "name": "sys.getswitchinterval",
  "category": "標準ライブラリ",
  "syntax": "sys.getswitchinterval()",
  "description": "スレッド切替間隔（秒）を返す。",
  "example": "import sys\nsys.getswitchinterval()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.getswitchinterval"
 },
 {
  "name": "sys.gettrace",
  "category": "標準ライブラリ",
  "syntax": "sys.gettrace()",
  "description": "現在のトレース関数を返す。",
  "example": "import sys\nsys.gettrace()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.gettrace"
 },
 {
  "name": "sys.getunicodeinternedsize",
  "category": "標準ライブラリ",
  "syntax": "sys.getunicodeinternedsize()",
  "description": "intern された文字列の総量を返す。",
  "example": "import sys\nsys.getunicodeinternedsize()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.getunicodeinternedsize"
 },
 {
  "name": "sys.getwindowsversion",
  "category": "標準ライブラリ",
  "syntax": "sys.getwindowsversion()",
  "description": "Windows のバージョン情報を返す（Windows のみ）。",
  "example": "import sys\nsys.getwindowsversion()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.getwindowsversion"
 },
 {
  "name": "sys.hash_info",
  "category": "標準ライブラリ",
  "syntax": "sys.hash_info",
  "description": "ハッシュアルゴリズムに関する情報（名前空間）。",
  "example": "import sys\nprint(sys.hash_info)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.hash_info"
 },
 {
  "name": "sys.hash_info.algorithm",
  "category": "標準ライブラリ",
  "syntax": "sys.hash_info.algorithm",
  "description": "ハッシュ情報の属性「algorithm」。",
  "example": "import sys\nprint(sys.hash_info.algorithm)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.hash_info.algorithm"
 },
 {
  "name": "sys.hash_info.cutoff",
  "category": "標準ライブラリ",
  "syntax": "sys.hash_info.cutoff",
  "description": "ハッシュ情報の属性「cutoff」。",
  "example": "import sys\nprint(sys.hash_info.cutoff)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.hash_info.cutoff"
 },
 {
  "name": "sys.hash_info.hash_bits",
  "category": "標準ライブラリ",
  "syntax": "sys.hash_info.hash_bits",
  "description": "ハッシュ情報の属性「hash_bits」。",
  "example": "import sys\nprint(sys.hash_info.hash_bits)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.hash_info.hash_bits"
 },
 {
  "name": "sys.hash_info.imag",
  "category": "標準ライブラリ",
  "syntax": "sys.hash_info.imag",
  "description": "ハッシュ情報の属性「imag」。",
  "example": "import sys\nprint(sys.hash_info.imag)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.hash_info.imag"
 },
 {
  "name": "sys.hash_info.inf",
  "category": "標準ライブラリ",
  "syntax": "sys.hash_info.inf",
  "description": "ハッシュ情報の属性「inf」。",
  "example": "import sys\nprint(sys.hash_info.inf)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.hash_info.inf"
 },
 {
  "name": "sys.hash_info.modulus",
  "category": "標準ライブラリ",
  "syntax": "sys.hash_info.modulus",
  "description": "ハッシュ情報の属性「modulus」。",
  "example": "import sys\nprint(sys.hash_info.modulus)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.hash_info.modulus"
 },
 {
  "name": "sys.hash_info.nan",
  "category": "標準ライブラリ",
  "syntax": "sys.hash_info.nan",
  "description": "ハッシュ情報の属性「nan」。",
  "example": "import sys\nprint(sys.hash_info.nan)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.hash_info.nan"
 },
 {
  "name": "sys.hash_info.seed_bits",
  "category": "標準ライブラリ",
  "syntax": "sys.hash_info.seed_bits",
  "description": "ハッシュ情報の属性「seed_bits」。",
  "example": "import sys\nprint(sys.hash_info.seed_bits)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.hash_info.seed_bits"
 },
 {
  "name": "sys.hash_info.width",
  "category": "標準ライブラリ",
  "syntax": "sys.hash_info.width",
  "description": "ハッシュ情報の属性「width」。",
  "example": "import sys\nprint(sys.hash_info.width)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.hash_info.width"
 },
 {
  "name": "sys.hexversion",
  "category": "標準ライブラリ",
  "syntax": "sys.hexversion",
  "description": "バージョンを単一整数で表した値。",
  "example": "import sys\nprint(sys.hexversion)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.hexversion"
 },
 {
  "name": "sys.implementation",
  "category": "標準ライブラリ",
  "syntax": "sys.implementation",
  "description": "インタプリタ実装の情報（名前空間）。",
  "example": "import sys\nprint(sys.implementation)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.implementation"
 },
 {
  "name": "sys.int_info",
  "category": "標準ライブラリ",
  "syntax": "sys.int_info",
  "description": "int 型の内部表現に関する情報（名前空間）。",
  "example": "import sys\nprint(sys.int_info)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.int_info"
 },
 {
  "name": "sys.int_info.bits_per_digit",
  "category": "標準ライブラリ",
  "syntax": "sys.int_info.bits_per_digit",
  "description": "int の内部表現情報の属性「bits_per_digit」。",
  "example": "import sys\nprint(sys.int_info.bits_per_digit)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.int_info.bits_per_digit"
 },
 {
  "name": "sys.int_info.default_max_str_digits",
  "category": "標準ライブラリ",
  "syntax": "sys.int_info.default_max_str_digits",
  "description": "int の内部表現情報の属性「default_max_str_digits」。",
  "example": "import sys\nprint(sys.int_info.default_max_str_digits)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.int_info.default_max_str_digits"
 },
 {
  "name": "sys.int_info.sizeof_digit",
  "category": "標準ライブラリ",
  "syntax": "sys.int_info.sizeof_digit",
  "description": "int の内部表現情報の属性「sizeof_digit」。",
  "example": "import sys\nprint(sys.int_info.sizeof_digit)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.int_info.sizeof_digit"
 },
 {
  "name": "sys.int_info.str_digits_check_threshold",
  "category": "標準ライブラリ",
  "syntax": "sys.int_info.str_digits_check_threshold",
  "description": "int の内部表現情報の属性「str_digits_check_threshold」。",
  "example": "import sys\nprint(sys.int_info.str_digits_check_threshold)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.int_info.str_digits_check_threshold"
 },
 {
  "name": "sys.intern",
  "category": "標準ライブラリ",
  "syntax": "sys.intern()",
  "description": "文字列を intern（内部登録）して返す。",
  "example": "import sys\nsys.intern()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.intern"
 },
 {
  "name": "sys.is_finalizing",
  "category": "標準ライブラリ",
  "syntax": "sys.is_finalizing()",
  "description": "インタプリタが終了処理中かを返す。",
  "example": "import sys\nsys.is_finalizing()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.is_finalizing"
 },
 {
  "name": "sys.is_stack_trampoline_active",
  "category": "標準ライブラリ",
  "syntax": "sys.is_stack_trampoline_active()",
  "description": "スタックトランポリンが有効かを返す。",
  "example": "import sys\nsys.is_stack_trampoline_active()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.is_stack_trampoline_active"
 },
 {
  "name": "sys.last_exc",
  "category": "標準ライブラリ",
  "syntax": "sys.last_exc",
  "description": "対話モードで最後に発生した例外。",
  "example": "import sys\nprint(sys.last_exc)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.last_exc"
 },
 {
  "name": "sys.last_traceback",
  "category": "標準ライブラリ",
  "syntax": "sys.last_traceback",
  "description": "対話モードで最後の例外のトレースバック。",
  "example": "import sys\nprint(sys.last_traceback)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.last_traceback"
 },
 {
  "name": "sys.last_type",
  "category": "標準ライブラリ",
  "syntax": "sys.last_type",
  "description": "対話モードで最後の例外の型。",
  "example": "import sys\nprint(sys.last_type)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.last_type"
 },
 {
  "name": "sys.last_value",
  "category": "標準ライブラリ",
  "syntax": "sys.last_value",
  "description": "対話モードで最後の例外の値。",
  "example": "import sys\nprint(sys.last_value)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.last_value"
 },
 {
  "name": "sys.lazy_modules",
  "category": "標準ライブラリ",
  "syntax": "sys.lazy_modules",
  "description": "遅延読み込み対象モジュール名（Python 3.15以降）。",
  "example": "import sys\nprint(sys.lazy_modules)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.lazy_modules"
 },
 {
  "name": "sys.maxsize",
  "category": "標準ライブラリ",
  "syntax": "sys.maxsize",
  "description": "Py_ssize_t の最大値（リスト等の最大サイズの目安）。",
  "example": "import sys\nprint(sys.maxsize)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.maxsize"
 },
 {
  "name": "sys.maxunicode",
  "category": "標準ライブラリ",
  "syntax": "sys.maxunicode",
  "description": "Unicode コードポイントの最大値。",
  "example": "import sys\nprint(sys.maxunicode)",
  "caution": "Unicode の最大コードポイント U+10FFFF は言語仕様として定まる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.maxunicode"
 },
 {
  "name": "sys.meta_path",
  "category": "標準ライブラリ",
  "syntax": "sys.meta_path",
  "description": "モジュール検索用ファインダのリスト。",
  "example": "import sys\nprint(sys.meta_path)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.meta_path"
 },
 {
  "name": "sys.modules",
  "category": "標準ライブラリ",
  "syntax": "sys.modules",
  "description": "読み込み済みモジュールの辞書。",
  "example": "import sys\nprint(sys.modules)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.modules"
 },
 {
  "name": "sys.orig_argv",
  "category": "標準ライブラリ",
  "syntax": "sys.orig_argv",
  "description": "インタプリタへ渡された元のコマンドライン引数。",
  "example": "import sys\nprint(sys.orig_argv)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.orig_argv"
 },
 {
  "name": "sys.path",
  "category": "標準ライブラリ",
  "syntax": "sys.path",
  "description": "モジュール検索パスのリスト。",
  "example": "import sys\nprint(sys.path)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.path"
 },
 {
  "name": "sys.path_hooks",
  "category": "標準ライブラリ",
  "syntax": "sys.path_hooks",
  "description": "パスエントリ用フックのリスト。",
  "example": "import sys\nprint(sys.path_hooks)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.path_hooks"
 },
 {
  "name": "sys.path_importer_cache",
  "category": "標準ライブラリ",
  "syntax": "sys.path_importer_cache",
  "description": "パスインポータのキャッシュ。",
  "example": "import sys\nprint(sys.path_importer_cache)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.path_importer_cache"
 },
 {
  "name": "sys.platform",
  "category": "標準ライブラリ",
  "syntax": "sys.platform",
  "description": "プラットフォーム識別文字列。",
  "example": "import sys\nprint(sys.platform)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.platform"
 },
 {
  "name": "sys.platlibdir",
  "category": "標準ライブラリ",
  "syntax": "sys.platlibdir",
  "description": "プラットフォームライブラリのディレクトリ名。",
  "example": "import sys\nprint(sys.platlibdir)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.platlibdir"
 },
 {
  "name": "sys.prefix",
  "category": "標準ライブラリ",
  "syntax": "sys.prefix",
  "description": "プレフィックス（インストール先）。",
  "example": "import sys\nprint(sys.prefix)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.prefix"
 },
 {
  "name": "sys.ps1",
  "category": "標準ライブラリ",
  "syntax": "sys.ps1",
  "description": "対話モードの一次プロンプト文字列。",
  "example": "import sys\nprint(sys.ps1)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.ps1"
 },
 {
  "name": "sys.ps2",
  "category": "標準ライブラリ",
  "syntax": "sys.ps2",
  "description": "対話モードの二次プロンプト文字列。",
  "example": "import sys\nprint(sys.ps2)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.ps2"
 },
 {
  "name": "sys.pycache_prefix",
  "category": "標準ライブラリ",
  "syntax": "sys.pycache_prefix",
  "description": "バイトコードキャッシュの配置先プレフィックス。",
  "example": "import sys\nprint(sys.pycache_prefix)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.pycache_prefix"
 },
 {
  "name": "sys.remote_exec",
  "category": "標準ライブラリ",
  "syntax": "sys.remote_exec()",
  "description": "別プロセスでコードを実行する。",
  "example": "import sys\nsys.remote_exec()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.remote_exec"
 },
 {
  "name": "sys.set_asyncgen_hooks",
  "category": "標準ライブラリ",
  "syntax": "sys.set_asyncgen_hooks()",
  "description": "非同期ジェネレータのフックを設定する。",
  "example": "import sys\nsys.set_asyncgen_hooks()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.set_asyncgen_hooks"
 },
 {
  "name": "sys.set_coroutine_origin_tracking_depth",
  "category": "標準ライブラリ",
  "syntax": "sys.set_coroutine_origin_tracking_depth()",
  "description": "コルーチンの生成元追跡の深さを設定する。",
  "example": "import sys\nsys.set_coroutine_origin_tracking_depth()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.set_coroutine_origin_tracking_depth"
 },
 {
  "name": "sys.set_int_max_str_digits",
  "category": "標準ライブラリ",
  "syntax": "sys.set_int_max_str_digits()",
  "description": "int と文字列の変換桁数上限を設定する。",
  "example": "import sys\nsys.set_int_max_str_digits()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.set_int_max_str_digits"
 },
 {
  "name": "sys.set_lazy_imports",
  "category": "標準ライブラリ",
  "syntax": "sys.set_lazy_imports()",
  "description": "遅延 import の設定を変更する（Python 3.15以降）。",
  "example": "import sys\nsys.set_lazy_imports()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.set_lazy_imports"
 },
 {
  "name": "sys.set_lazy_imports_filter",
  "category": "標準ライブラリ",
  "syntax": "sys.set_lazy_imports_filter()",
  "description": "遅延 import のフィルタを設定する（Python 3.15以降）。",
  "example": "import sys\nsys.set_lazy_imports_filter()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.set_lazy_imports_filter"
 },
 {
  "name": "sys.setdlopenflags",
  "category": "標準ライブラリ",
  "syntax": "sys.setdlopenflags()",
  "description": "動的ロード用フラグを設定する（Unix）。",
  "example": "import sys\nsys.setdlopenflags()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.setdlopenflags"
 },
 {
  "name": "sys.setprofile",
  "category": "標準ライブラリ",
  "syntax": "sys.setprofile()",
  "description": "プロファイル関数を設定する。",
  "example": "import sys\nsys.setprofile()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.setprofile"
 },
 {
  "name": "sys.setrecursionlimit",
  "category": "標準ライブラリ",
  "syntax": "sys.setrecursionlimit()",
  "description": "再帰の深さの上限を設定する。",
  "example": "import sys\nsys.setrecursionlimit()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.setrecursionlimit"
 },
 {
  "name": "sys.setswitchinterval",
  "category": "標準ライブラリ",
  "syntax": "sys.setswitchinterval()",
  "description": "スレッド切替間隔（秒）を設定する。",
  "example": "import sys\nsys.setswitchinterval()",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.setswitchinterval"
 },
 {
  "name": "sys.settrace",
  "category": "標準ライブラリ",
  "syntax": "sys.settrace()",
  "description": "トレース関数を設定する。",
  "example": "import sys\nsys.settrace()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.settrace"
 },
 {
  "name": "sys.stderr",
  "category": "標準ライブラリ",
  "syntax": "sys.stderr",
  "description": "標準エラー出力ストリーム。",
  "example": "import sys\nprint(sys.stderr)",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.stderr"
 },
 {
  "name": "sys.stdin",
  "category": "標準ライブラリ",
  "syntax": "sys.stdin",
  "description": "標準入力ストリーム。",
  "example": "import sys\nprint(sys.stdin)",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.stdin"
 },
 {
  "name": "sys.stdlib_module_names",
  "category": "標準ライブラリ",
  "syntax": "sys.stdlib_module_names",
  "description": "標準ライブラリのモジュール名の集合。",
  "example": "import sys\nprint(sys.stdlib_module_names)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.stdlib_module_names"
 },
 {
  "name": "sys.stdout",
  "category": "標準ライブラリ",
  "syntax": "sys.stdout",
  "description": "標準出力ストリーム。",
  "example": "import sys\nprint(sys.stdout)",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.stdout"
 },
 {
  "name": "sys.thread_info",
  "category": "標準ライブラリ",
  "syntax": "sys.thread_info",
  "description": "スレッド実装に関する情報（名前空間）。",
  "example": "import sys\nprint(sys.thread_info)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.thread_info"
 },
 {
  "name": "sys.thread_info.lock",
  "category": "標準ライブラリ",
  "syntax": "sys.thread_info.lock",
  "description": "スレッド情報の属性「lock」。",
  "example": "import sys\nprint(sys.thread_info.lock)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.thread_info.lock"
 },
 {
  "name": "sys.thread_info.name",
  "category": "標準ライブラリ",
  "syntax": "sys.thread_info.name",
  "description": "スレッド情報の属性「name」。",
  "example": "import sys\nprint(sys.thread_info.name)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.thread_info.name"
 },
 {
  "name": "sys.thread_info.version",
  "category": "標準ライブラリ",
  "syntax": "sys.thread_info.version",
  "description": "スレッド情報の属性「version」。",
  "example": "import sys\nprint(sys.thread_info.version)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.thread_info.version"
 },
 {
  "name": "sys.tracebacklimit",
  "category": "標準ライブラリ",
  "syntax": "sys.tracebacklimit",
  "description": "表示するトレースバックの最大レベル数。",
  "example": "import sys\nprint(sys.tracebacklimit)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.tracebacklimit"
 },
 {
  "name": "sys.unraisablehook",
  "category": "標準ライブラリ",
  "syntax": "sys.unraisablehook()",
  "description": "捕捉不能な例外のフック。",
  "example": "import sys\nsys.unraisablehook()",
  "caution": "本アプリの高度モードでは未対応です。エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.unraisablehook"
 },
 {
  "name": "sys.version",
  "category": "標準ライブラリ",
  "syntax": "sys.version",
  "description": "インタプリタのバージョン文字列。",
  "example": "import sys\nprint(sys.version)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.version"
 },
 {
  "name": "sys.version_info",
  "category": "標準ライブラリ",
  "syntax": "sys.version_info",
  "description": "バージョン情報（名前空間）。",
  "example": "import sys\nprint(sys.version_info)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.version_info"
 },
 {
  "name": "sys.warnoptions",
  "category": "標準ライブラリ",
  "syntax": "sys.warnoptions",
  "description": "警告オプションのリスト。",
  "example": "import sys\nprint(sys.warnoptions)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.warnoptions"
 },
 {
  "name": "sys.winver",
  "category": "標準ライブラリ",
  "syntax": "sys.winver",
  "description": "Windows 用バージョン識別文字列（Windows）。",
  "example": "import sys\nprint(sys.winver)",
  "caution": "未検証です。CPython の実行環境・ビルド・起動状態に依存する値であり、本アプリのエンジン自身の事実ではないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sys.html#sys.winver"
 }
];
