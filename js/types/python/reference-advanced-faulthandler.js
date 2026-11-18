/* 高度モード B7 G9：faulthandler モジュールのリファレンス差分（9件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 裁定方針は docs/audit/b7-g9-report.md を参照（環境依存値は実値化しない）。 */
export const referenceAdvanced = [
 {
  "name": "faulthandler.cancel_dump_traceback_later",
  "category": "標準ライブラリ",
  "syntax": "faulthandler.cancel_dump_traceback_later()",
  "description": "予約した遅延ダンプを取り消す。",
  "example": "import faulthandler\nfaulthandler.cancel_dump_traceback_later()",
  "caution": "本アプリの高度モードでは未対応です。障害ダンプ・トレースバック出力の仕組みは本アプリのエンジンには存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/faulthandler.html#faulthandler.cancel_dump_traceback_later"
 },
 {
  "name": "faulthandler.disable",
  "category": "標準ライブラリ",
  "syntax": "faulthandler.disable()",
  "description": "faulthandler を無効化する。",
  "example": "import faulthandler\nfaulthandler.disable()",
  "caution": "本アプリの高度モードでは未対応です。障害ダンプ・トレースバック出力の仕組みは本アプリのエンジンには存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/faulthandler.html#faulthandler.disable"
 },
 {
  "name": "faulthandler.dump_c_stack",
  "category": "標準ライブラリ",
  "syntax": "faulthandler.dump_c_stack()",
  "description": "C スタックをダンプする（可能な場合）。",
  "example": "import faulthandler\nfaulthandler.dump_c_stack()",
  "caution": "本アプリの高度モードでは未対応です。障害ダンプ・トレースバック出力の仕組みは本アプリのエンジンには存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/faulthandler.html#faulthandler.dump_c_stack"
 },
 {
  "name": "faulthandler.dump_traceback",
  "category": "標準ライブラリ",
  "syntax": "faulthandler.dump_traceback()",
  "description": "現在のトレースバックをダンプする。",
  "example": "import faulthandler\nfaulthandler.dump_traceback()",
  "caution": "本アプリの高度モードでは未対応です。障害ダンプ・トレースバック出力の仕組みは本アプリのエンジンには存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/faulthandler.html#faulthandler.dump_traceback"
 },
 {
  "name": "faulthandler.dump_traceback_later",
  "category": "標準ライブラリ",
  "syntax": "faulthandler.dump_traceback_later()",
  "description": "遅延ダンプを予約する。",
  "example": "import faulthandler\nfaulthandler.dump_traceback_later()",
  "caution": "本アプリの高度モードでは未対応です。障害ダンプ・トレースバック出力の仕組みは本アプリのエンジンには存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/faulthandler.html#faulthandler.dump_traceback_later"
 },
 {
  "name": "faulthandler.enable",
  "category": "標準ライブラリ",
  "syntax": "faulthandler.enable()",
  "description": "faulthandler を有効化する。",
  "example": "import faulthandler\nfaulthandler.enable()",
  "caution": "本アプリの高度モードでは未対応です。障害ダンプ・トレースバック出力の仕組みは本アプリのエンジンには存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/faulthandler.html#faulthandler.enable"
 },
 {
  "name": "faulthandler.is_enabled",
  "category": "標準ライブラリ",
  "syntax": "faulthandler.is_enabled()",
  "description": "faulthandler が有効かを返す。",
  "example": "import faulthandler\nfaulthandler.is_enabled()",
  "caution": "本アプリの高度モードでは未対応です。障害ダンプ・トレースバック出力の仕組みは本アプリのエンジンには存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/faulthandler.html#faulthandler.is_enabled"
 },
 {
  "name": "faulthandler.register",
  "category": "標準ライブラリ",
  "syntax": "faulthandler.register()",
  "description": "シグナルハンドラを登録する。",
  "example": "import faulthandler\nfaulthandler.register()",
  "caution": "本アプリの高度モードでは未対応です。障害ダンプ・トレースバック出力の仕組みは本アプリのエンジンには存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/faulthandler.html#faulthandler.register"
 },
 {
  "name": "faulthandler.unregister",
  "category": "標準ライブラリ",
  "syntax": "faulthandler.unregister()",
  "description": "シグナルハンドラを解除する。",
  "example": "import faulthandler\nfaulthandler.unregister()",
  "caution": "本アプリの高度モードでは未対応です。障害ダンプ・トレースバック出力の仕組みは本アプリのエンジンには存在しないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/faulthandler.html#faulthandler.unregister"
 }
];
