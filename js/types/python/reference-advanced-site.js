/* 高度モード B7 G9：site モジュールのリファレンス差分（15件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 裁定方針は docs/audit/b7-g9-report.md を参照（環境依存値は実値化しない）。 */
export const referenceAdvanced = [
 {
  "name": "site.ENABLE_USER_SITE",
  "category": "標準ライブラリ",
  "syntax": "site.ENABLE_USER_SITE",
  "description": "ユーザサイトが有効か（真偽値または None）。",
  "example": "import site\nprint(site.ENABLE_USER_SITE)",
  "caution": "未検証です。サイト固有パスの情報は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/site.html#site.ENABLE_USER_SITE"
 },
 {
  "name": "site.PREFIXES",
  "category": "標準ライブラリ",
  "syntax": "site.PREFIXES",
  "description": "サイトパッケージのプレフィックスのリスト。",
  "example": "import site\nprint(site.PREFIXES)",
  "caution": "未検証です。サイト固有パスの情報は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/site.html#site.PREFIXES"
 },
 {
  "name": "site.StartupState",
  "category": "標準ライブラリ",
  "syntax": "site.StartupState",
  "description": "サイト初期化の状態を表すクラス（Python 3.15 系で導入）。",
  "example": "import site\nprint(site.StartupState)",
  "caution": "本アプリの高度モードでは未対応です。実インタプリタの sys.path や起動状態を書き換える処理であり、本アプリのエンジンには対応する実体がないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/site.html#site.StartupState"
 },
 {
  "name": "site.StartupState.addsitedir",
  "category": "標準ライブラリ",
  "syntax": "site.StartupState.addsitedir()",
  "description": "StartupState のメソッド addsitedir（サイト初期化処理の一部）。",
  "example": "import site\nsite.StartupState.addsitedir()",
  "caution": "本アプリの高度モードでは未対応です。実インタプリタの sys.path や起動状態を書き換える処理であり、本アプリのエンジンには対応する実体がないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/site.html#site.StartupState.addsitedir"
 },
 {
  "name": "site.StartupState.addsitepackages",
  "category": "標準ライブラリ",
  "syntax": "site.StartupState.addsitepackages()",
  "description": "StartupState のメソッド addsitepackages（サイト初期化処理の一部）。",
  "example": "import site\nsite.StartupState.addsitepackages()",
  "caution": "本アプリの高度モードでは未対応です。実インタプリタの sys.path や起動状態を書き換える処理であり、本アプリのエンジンには対応する実体がないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/site.html#site.StartupState.addsitepackages"
 },
 {
  "name": "site.StartupState.addusersitepackages",
  "category": "標準ライブラリ",
  "syntax": "site.StartupState.addusersitepackages()",
  "description": "StartupState のメソッド addusersitepackages（サイト初期化処理の一部）。",
  "example": "import site\nsite.StartupState.addusersitepackages()",
  "caution": "本アプリの高度モードでは未対応です。実インタプリタの sys.path や起動状態を書き換える処理であり、本アプリのエンジンには対応する実体がないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/site.html#site.StartupState.addusersitepackages"
 },
 {
  "name": "site.StartupState.process",
  "category": "標準ライブラリ",
  "syntax": "site.StartupState.process()",
  "description": "StartupState のメソッド process（サイト初期化処理の一部）。",
  "example": "import site\nsite.StartupState.process()",
  "caution": "本アプリの高度モードでは未対応です。実インタプリタの sys.path や起動状態を書き換える処理であり、本アプリのエンジンには対応する実体がないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/site.html#site.StartupState.process"
 },
 {
  "name": "site.USER_BASE",
  "category": "標準ライブラリ",
  "syntax": "site.USER_BASE",
  "description": "ユーザベースディレクトリのパス。",
  "example": "import site\nprint(site.USER_BASE)",
  "caution": "未検証です。サイト固有パスの情報は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/site.html#site.USER_BASE"
 },
 {
  "name": "site.USER_SITE",
  "category": "標準ライブラリ",
  "syntax": "site.USER_SITE",
  "description": "ユーザサイトパッケージのパス。",
  "example": "import site\nprint(site.USER_SITE)",
  "caution": "未検証です。サイト固有パスの情報は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/site.html#site.USER_SITE"
 },
 {
  "name": "site.addsitedir",
  "category": "標準ライブラリ",
  "syntax": "site.addsitedir()",
  "description": "サイトディレクトリを sys.path へ追加する。",
  "example": "import site\nsite.addsitedir()",
  "caution": "本アプリの高度モードでは未対応です。実インタプリタの sys.path や起動状態を書き換える処理であり、本アプリのエンジンには対応する実体がないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/site.html#site.addsitedir"
 },
 {
  "name": "site.getsitepackages",
  "category": "標準ライブラリ",
  "syntax": "site.getsitepackages()",
  "description": "サイトパッケージのパス一覧を返す。",
  "example": "import site\nsite.getsitepackages()",
  "caution": "未検証です。サイト固有パスの情報は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/site.html#site.getsitepackages"
 },
 {
  "name": "site.getuserbase",
  "category": "標準ライブラリ",
  "syntax": "site.getuserbase()",
  "description": "ユーザベースのパスを返す。",
  "example": "import site\nsite.getuserbase()",
  "caution": "未検証です。サイト固有パスの情報は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/site.html#site.getuserbase"
 },
 {
  "name": "site.getusersitepackages",
  "category": "標準ライブラリ",
  "syntax": "site.getusersitepackages()",
  "description": "ユーザサイトパッケージのパスを返す。",
  "example": "import site\nsite.getusersitepackages()",
  "caution": "未検証です。サイト固有パスの情報は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/site.html#site.getusersitepackages"
 },
 {
  "name": "site.main",
  "category": "標準ライブラリ",
  "syntax": "site.main()",
  "description": "site の初期化処理を実行する。",
  "example": "import site\nsite.main()",
  "caution": "未検証です。サイト固有パスの情報は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/site.html#site.main"
 },
 {
  "name": "site.makepath",
  "category": "標準ライブラリ",
  "syntax": "site.makepath()",
  "description": "パスを絶対パスへ正規化する。",
  "example": "import site\nsite.makepath()",
  "caution": "未検証です。サイト固有パスの情報は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/site.html#site.makepath"
 }
];
