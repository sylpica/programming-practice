/* 高度モード B7 G9：gc モジュールのリファレンス差分（25件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 裁定方針は docs/audit/b7-g9-report.md を参照（環境依存値は実値化しない）。 */
export const referenceAdvanced = [
 {
  "name": "gc.DEBUG_COLLECTABLE",
  "category": "標準ライブラリ",
  "syntax": "gc.DEBUG_COLLECTABLE",
  "description": "デバッグフラグ：回収可能オブジェクトの情報。",
  "example": "import gc\nprint(gc.DEBUG_COLLECTABLE)",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.DEBUG_COLLECTABLE"
 },
 {
  "name": "gc.DEBUG_LEAK",
  "category": "標準ライブラリ",
  "syntax": "gc.DEBUG_LEAK",
  "description": "デバッグフラグ：リーク調査用（複合）。",
  "example": "import gc\nprint(gc.DEBUG_LEAK)",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.DEBUG_LEAK"
 },
 {
  "name": "gc.DEBUG_SAVEALL",
  "category": "標準ライブラリ",
  "syntax": "gc.DEBUG_SAVEALL",
  "description": "デバッグフラグ：回収対象を garbage へ保存。",
  "example": "import gc\nprint(gc.DEBUG_SAVEALL)",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.DEBUG_SAVEALL"
 },
 {
  "name": "gc.DEBUG_STATS",
  "category": "標準ライブラリ",
  "syntax": "gc.DEBUG_STATS",
  "description": "デバッグフラグ：統計を標準エラーへ出す。",
  "example": "import gc\nprint(gc.DEBUG_STATS)",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.DEBUG_STATS"
 },
 {
  "name": "gc.DEBUG_UNCOLLECTABLE",
  "category": "標準ライブラリ",
  "syntax": "gc.DEBUG_UNCOLLECTABLE",
  "description": "デバッグフラグ：回収不能オブジェクトの情報。",
  "example": "import gc\nprint(gc.DEBUG_UNCOLLECTABLE)",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.DEBUG_UNCOLLECTABLE"
 },
 {
  "name": "gc.callbacks",
  "category": "標準ライブラリ",
  "syntax": "gc.callbacks",
  "description": "GC のコールバック関数のリスト。",
  "example": "import gc\nprint(gc.callbacks)",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.callbacks"
 },
 {
  "name": "gc.collect",
  "category": "標準ライブラリ",
  "syntax": "gc.collect()",
  "description": "ガベージコレクションを実行する。",
  "example": "import gc\ngc.collect()",
  "caution": "本アプリの高度モードでは未対応です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、この操作を実行できないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.collect"
 },
 {
  "name": "gc.disable",
  "category": "標準ライブラリ",
  "syntax": "gc.disable()",
  "description": "自動ガベージコレクションを無効化する。",
  "example": "import gc\ngc.disable()",
  "caution": "本アプリの高度モードでは未対応です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、この操作を実行できないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.disable"
 },
 {
  "name": "gc.enable",
  "category": "標準ライブラリ",
  "syntax": "gc.enable()",
  "description": "自動ガベージコレクションを有効化する。",
  "example": "import gc\ngc.enable()",
  "caution": "本アプリの高度モードでは未対応です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、この操作を実行できないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.enable"
 },
 {
  "name": "gc.freeze",
  "category": "標準ライブラリ",
  "syntax": "gc.freeze()",
  "description": "現在の追跡オブジェクトを固定する。",
  "example": "import gc\ngc.freeze()",
  "caution": "本アプリの高度モードでは未対応です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、この操作を実行できないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.freeze"
 },
 {
  "name": "gc.garbage",
  "category": "標準ライブラリ",
  "syntax": "gc.garbage",
  "description": "回収不能オブジェクトのリスト。",
  "example": "import gc\nprint(gc.garbage)",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.garbage"
 },
 {
  "name": "gc.get_count",
  "category": "標準ライブラリ",
  "syntax": "gc.get_count()",
  "description": "世代別のオブジェクト数を返す。",
  "example": "import gc\ngc.get_count()",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.get_count"
 },
 {
  "name": "gc.get_debug",
  "category": "標準ライブラリ",
  "syntax": "gc.get_debug()",
  "description": "デバッグフラグを返す。",
  "example": "import gc\ngc.get_debug()",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.get_debug"
 },
 {
  "name": "gc.get_freeze_count",
  "category": "標準ライブラリ",
  "syntax": "gc.get_freeze_count()",
  "description": "固定されたオブジェクト数を返す。",
  "example": "import gc\ngc.get_freeze_count()",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.get_freeze_count"
 },
 {
  "name": "gc.get_objects",
  "category": "標準ライブラリ",
  "syntax": "gc.get_objects()",
  "description": "追跡中のオブジェクトを返す。",
  "example": "import gc\ngc.get_objects()",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.get_objects"
 },
 {
  "name": "gc.get_referents",
  "category": "標準ライブラリ",
  "syntax": "gc.get_referents()",
  "description": "オブジェクトが参照する先を返す。",
  "example": "import gc\ngc.get_referents()",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.get_referents"
 },
 {
  "name": "gc.get_referrers",
  "category": "標準ライブラリ",
  "syntax": "gc.get_referrers()",
  "description": "オブジェクトを参照する元を返す。",
  "example": "import gc\ngc.get_referrers()",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.get_referrers"
 },
 {
  "name": "gc.get_stats",
  "category": "標準ライブラリ",
  "syntax": "gc.get_stats()",
  "description": "世代別の統計を返す。",
  "example": "import gc\ngc.get_stats()",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.get_stats"
 },
 {
  "name": "gc.get_threshold",
  "category": "標準ライブラリ",
  "syntax": "gc.get_threshold()",
  "description": "世代別の閾値を返す。",
  "example": "import gc\ngc.get_threshold()",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.get_threshold"
 },
 {
  "name": "gc.is_finalized",
  "category": "標準ライブラリ",
  "syntax": "gc.is_finalized()",
  "description": "オブジェクトが終端処理済みかを返す。",
  "example": "import gc\ngc.is_finalized()",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.is_finalized"
 },
 {
  "name": "gc.is_tracked",
  "category": "標準ライブラリ",
  "syntax": "gc.is_tracked()",
  "description": "オブジェクトが GC 追跡対象かを返す。",
  "example": "import gc\ngc.is_tracked()",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.is_tracked"
 },
 {
  "name": "gc.isenabled",
  "category": "標準ライブラリ",
  "syntax": "gc.isenabled()",
  "description": "自動ガベージコレクションが有効かを返す。",
  "example": "import gc\ngc.isenabled()",
  "caution": "未検証です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、状態値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.isenabled"
 },
 {
  "name": "gc.set_debug",
  "category": "標準ライブラリ",
  "syntax": "gc.set_debug()",
  "description": "デバッグフラグを設定する。",
  "example": "import gc\ngc.set_debug()",
  "caution": "本アプリの高度モードでは未対応です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、この操作を実行できないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.set_debug"
 },
 {
  "name": "gc.set_threshold",
  "category": "標準ライブラリ",
  "syntax": "gc.set_threshold()",
  "description": "世代別の閾値を設定する。",
  "example": "import gc\ngc.set_threshold()",
  "caution": "本アプリの高度モードでは未対応です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、この操作を実行できないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.set_threshold"
 },
 {
  "name": "gc.unfreeze",
  "category": "標準ライブラリ",
  "syntax": "gc.unfreeze()",
  "description": "freeze の固定を解除する。",
  "example": "import gc\ngc.unfreeze()",
  "caution": "本アプリの高度モードでは未対応です。本アプリのエンジンには CPython のガベージコレクタの実体がなく、この操作を実行できないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/gc.html#gc.unfreeze"
 }
];
