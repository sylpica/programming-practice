/* 高度モード B7 G9：errno モジュールのリファレンス差分（156件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 裁定方針は docs/audit/b7-g9-report.md を参照（環境依存値は実値化しない）。 */
export const referenceAdvanced = [
 {
  "name": "errno.E2BIG",
  "category": "標準ライブラリ",
  "syntax": "errno.E2BIG",
  "description": "エラー番号定数 E2BIG（Argument list too long（引数リストが長すぎる））。",
  "example": "import errno\nprint(errno.E2BIG)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.E2BIG"
 },
 {
  "name": "errno.EACCES",
  "category": "標準ライブラリ",
  "syntax": "errno.EACCES",
  "description": "エラー番号定数 EACCES（Permission denied（アクセス権が無い））。",
  "example": "import errno\nprint(errno.EACCES)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EACCES"
 },
 {
  "name": "errno.EADDRINUSE",
  "category": "標準ライブラリ",
  "syntax": "errno.EADDRINUSE",
  "description": "エラー番号定数 EADDRINUSE（Address already in use（アドレスが使用中））。",
  "example": "import errno\nprint(errno.EADDRINUSE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EADDRINUSE"
 },
 {
  "name": "errno.EADDRNOTAVAIL",
  "category": "標準ライブラリ",
  "syntax": "errno.EADDRNOTAVAIL",
  "description": "エラー番号定数 EADDRNOTAVAIL（Cannot assign requested address）。",
  "example": "import errno\nprint(errno.EADDRNOTAVAIL)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EADDRNOTAVAIL"
 },
 {
  "name": "errno.EADV",
  "category": "標準ライブラリ",
  "syntax": "errno.EADV",
  "description": "エラー番号定数 EADV（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EADV)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EADV"
 },
 {
  "name": "errno.EAFNOSUPPORT",
  "category": "標準ライブラリ",
  "syntax": "errno.EAFNOSUPPORT",
  "description": "エラー番号定数 EAFNOSUPPORT（Address family not supported by protocol）。",
  "example": "import errno\nprint(errno.EAFNOSUPPORT)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EAFNOSUPPORT"
 },
 {
  "name": "errno.EAGAIN",
  "category": "標準ライブラリ",
  "syntax": "errno.EAGAIN",
  "description": "エラー番号定数 EAGAIN（Resource temporarily unavailable（リソースが一時的に利用不可））。",
  "example": "import errno\nprint(errno.EAGAIN)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EAGAIN"
 },
 {
  "name": "errno.EALREADY",
  "category": "標準ライブラリ",
  "syntax": "errno.EALREADY",
  "description": "エラー番号定数 EALREADY（Operation already in progress）。",
  "example": "import errno\nprint(errno.EALREADY)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EALREADY"
 },
 {
  "name": "errno.EAUTH",
  "category": "標準ライブラリ",
  "syntax": "errno.EAUTH",
  "description": "エラー番号定数 EAUTH（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EAUTH)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EAUTH"
 },
 {
  "name": "errno.EBADARCH",
  "category": "標準ライブラリ",
  "syntax": "errno.EBADARCH",
  "description": "エラー番号定数 EBADARCH（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EBADARCH)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EBADARCH"
 },
 {
  "name": "errno.EBADE",
  "category": "標準ライブラリ",
  "syntax": "errno.EBADE",
  "description": "エラー番号定数 EBADE（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EBADE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EBADE"
 },
 {
  "name": "errno.EBADEXEC",
  "category": "標準ライブラリ",
  "syntax": "errno.EBADEXEC",
  "description": "エラー番号定数 EBADEXEC（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EBADEXEC)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EBADEXEC"
 },
 {
  "name": "errno.EBADF",
  "category": "標準ライブラリ",
  "syntax": "errno.EBADF",
  "description": "エラー番号定数 EBADF（Bad file descriptor（不正なファイル記述子））。",
  "example": "import errno\nprint(errno.EBADF)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EBADF"
 },
 {
  "name": "errno.EBADFD",
  "category": "標準ライブラリ",
  "syntax": "errno.EBADFD",
  "description": "エラー番号定数 EBADFD（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EBADFD)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EBADFD"
 },
 {
  "name": "errno.EBADMACHO",
  "category": "標準ライブラリ",
  "syntax": "errno.EBADMACHO",
  "description": "エラー番号定数 EBADMACHO（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EBADMACHO)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EBADMACHO"
 },
 {
  "name": "errno.EBADMSG",
  "category": "標準ライブラリ",
  "syntax": "errno.EBADMSG",
  "description": "エラー番号定数 EBADMSG（Bad message）。",
  "example": "import errno\nprint(errno.EBADMSG)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EBADMSG"
 },
 {
  "name": "errno.EBADR",
  "category": "標準ライブラリ",
  "syntax": "errno.EBADR",
  "description": "エラー番号定数 EBADR（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EBADR)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EBADR"
 },
 {
  "name": "errno.EBADRPC",
  "category": "標準ライブラリ",
  "syntax": "errno.EBADRPC",
  "description": "エラー番号定数 EBADRPC（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EBADRPC)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EBADRPC"
 },
 {
  "name": "errno.EBADRQC",
  "category": "標準ライブラリ",
  "syntax": "errno.EBADRQC",
  "description": "エラー番号定数 EBADRQC（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EBADRQC)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EBADRQC"
 },
 {
  "name": "errno.EBADSLT",
  "category": "標準ライブラリ",
  "syntax": "errno.EBADSLT",
  "description": "エラー番号定数 EBADSLT（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EBADSLT)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EBADSLT"
 },
 {
  "name": "errno.EBFONT",
  "category": "標準ライブラリ",
  "syntax": "errno.EBFONT",
  "description": "エラー番号定数 EBFONT（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EBFONT)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EBFONT"
 },
 {
  "name": "errno.EBUSY",
  "category": "標準ライブラリ",
  "syntax": "errno.EBUSY",
  "description": "エラー番号定数 EBUSY（Device or resource busy（使用中））。",
  "example": "import errno\nprint(errno.EBUSY)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EBUSY"
 },
 {
  "name": "errno.ECANCELED",
  "category": "標準ライブラリ",
  "syntax": "errno.ECANCELED",
  "description": "エラー番号定数 ECANCELED（Operation canceled（操作がキャンセルされた））。",
  "example": "import errno\nprint(errno.ECANCELED)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ECANCELED"
 },
 {
  "name": "errno.ECHILD",
  "category": "標準ライブラリ",
  "syntax": "errno.ECHILD",
  "description": "エラー番号定数 ECHILD（No child processes（子プロセスが無い））。",
  "example": "import errno\nprint(errno.ECHILD)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ECHILD"
 },
 {
  "name": "errno.ECHRNG",
  "category": "標準ライブラリ",
  "syntax": "errno.ECHRNG",
  "description": "エラー番号定数 ECHRNG（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ECHRNG)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ECHRNG"
 },
 {
  "name": "errno.ECOMM",
  "category": "標準ライブラリ",
  "syntax": "errno.ECOMM",
  "description": "エラー番号定数 ECOMM（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ECOMM)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ECOMM"
 },
 {
  "name": "errno.ECONNABORTED",
  "category": "標準ライブラリ",
  "syntax": "errno.ECONNABORTED",
  "description": "エラー番号定数 ECONNABORTED（Software caused connection abort）。",
  "example": "import errno\nprint(errno.ECONNABORTED)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ECONNABORTED"
 },
 {
  "name": "errno.ECONNREFUSED",
  "category": "標準ライブラリ",
  "syntax": "errno.ECONNREFUSED",
  "description": "エラー番号定数 ECONNREFUSED（Connection refused（接続が拒否された））。",
  "example": "import errno\nprint(errno.ECONNREFUSED)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ECONNREFUSED"
 },
 {
  "name": "errno.ECONNRESET",
  "category": "標準ライブラリ",
  "syntax": "errno.ECONNRESET",
  "description": "エラー番号定数 ECONNRESET（Connection reset by peer（接続がリセットされた））。",
  "example": "import errno\nprint(errno.ECONNRESET)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ECONNRESET"
 },
 {
  "name": "errno.EDEADLK",
  "category": "標準ライブラリ",
  "syntax": "errno.EDEADLK",
  "description": "エラー番号定数 EDEADLK（Resource deadlock avoided（デッドロック））。",
  "example": "import errno\nprint(errno.EDEADLK)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EDEADLK"
 },
 {
  "name": "errno.EDEADLOCK",
  "category": "標準ライブラリ",
  "syntax": "errno.EDEADLOCK",
  "description": "エラー番号定数 EDEADLOCK（EDEADLK の別名）。",
  "example": "import errno\nprint(errno.EDEADLOCK)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EDEADLOCK"
 },
 {
  "name": "errno.EDESTADDRREQ",
  "category": "標準ライブラリ",
  "syntax": "errno.EDESTADDRREQ",
  "description": "エラー番号定数 EDESTADDRREQ（Destination address required）。",
  "example": "import errno\nprint(errno.EDESTADDRREQ)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EDESTADDRREQ"
 },
 {
  "name": "errno.EDEVERR",
  "category": "標準ライブラリ",
  "syntax": "errno.EDEVERR",
  "description": "エラー番号定数 EDEVERR（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EDEVERR)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EDEVERR"
 },
 {
  "name": "errno.EDOM",
  "category": "標準ライブラリ",
  "syntax": "errno.EDOM",
  "description": "エラー番号定数 EDOM（Numerical argument out of domain（数値引数の定義域外））。",
  "example": "import errno\nprint(errno.EDOM)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EDOM"
 },
 {
  "name": "errno.EDOTDOT",
  "category": "標準ライブラリ",
  "syntax": "errno.EDOTDOT",
  "description": "エラー番号定数 EDOTDOT（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EDOTDOT)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EDOTDOT"
 },
 {
  "name": "errno.EDQUOT",
  "category": "標準ライブラリ",
  "syntax": "errno.EDQUOT",
  "description": "エラー番号定数 EDQUOT（Disk quota exceeded（クォータ超過））。",
  "example": "import errno\nprint(errno.EDQUOT)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EDQUOT"
 },
 {
  "name": "errno.EEXIST",
  "category": "標準ライブラリ",
  "syntax": "errno.EEXIST",
  "description": "エラー番号定数 EEXIST（File exists（ファイルが存在する））。",
  "example": "import errno\nprint(errno.EEXIST)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EEXIST"
 },
 {
  "name": "errno.EFAULT",
  "category": "標準ライブラリ",
  "syntax": "errno.EFAULT",
  "description": "エラー番号定数 EFAULT（Bad address（不正なアドレス））。",
  "example": "import errno\nprint(errno.EFAULT)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EFAULT"
 },
 {
  "name": "errno.EFBIG",
  "category": "標準ライブラリ",
  "syntax": "errno.EFBIG",
  "description": "エラー番号定数 EFBIG（File too large（ファイルが大きすぎる））。",
  "example": "import errno\nprint(errno.EFBIG)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EFBIG"
 },
 {
  "name": "errno.EFTYPE",
  "category": "標準ライブラリ",
  "syntax": "errno.EFTYPE",
  "description": "エラー番号定数 EFTYPE（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EFTYPE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EFTYPE"
 },
 {
  "name": "errno.EHOSTDOWN",
  "category": "標準ライブラリ",
  "syntax": "errno.EHOSTDOWN",
  "description": "エラー番号定数 EHOSTDOWN（Host is down）。",
  "example": "import errno\nprint(errno.EHOSTDOWN)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EHOSTDOWN"
 },
 {
  "name": "errno.EHOSTUNREACH",
  "category": "標準ライブラリ",
  "syntax": "errno.EHOSTUNREACH",
  "description": "エラー番号定数 EHOSTUNREACH（No route to host）。",
  "example": "import errno\nprint(errno.EHOSTUNREACH)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EHOSTUNREACH"
 },
 {
  "name": "errno.EHWPOISON",
  "category": "標準ライブラリ",
  "syntax": "errno.EHWPOISON",
  "description": "エラー番号定数 EHWPOISON（Memory page has hardware error）。",
  "example": "import errno\nprint(errno.EHWPOISON)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EHWPOISON"
 },
 {
  "name": "errno.EIDRM",
  "category": "標準ライブラリ",
  "syntax": "errno.EIDRM",
  "description": "エラー番号定数 EIDRM（Identifier removed）。",
  "example": "import errno\nprint(errno.EIDRM)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EIDRM"
 },
 {
  "name": "errno.EILSEQ",
  "category": "標準ライブラリ",
  "syntax": "errno.EILSEQ",
  "description": "エラー番号定数 EILSEQ（Invalid or incomplete multibyte or wide character（不正なマルチバイト文字））。",
  "example": "import errno\nprint(errno.EILSEQ)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EILSEQ"
 },
 {
  "name": "errno.EINPROGRESS",
  "category": "標準ライブラリ",
  "syntax": "errno.EINPROGRESS",
  "description": "エラー番号定数 EINPROGRESS（Operation now in progress）。",
  "example": "import errno\nprint(errno.EINPROGRESS)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EINPROGRESS"
 },
 {
  "name": "errno.EINTR",
  "category": "標準ライブラリ",
  "syntax": "errno.EINTR",
  "description": "エラー番号定数 EINTR（Interrupted system call（システムコールの中断））。",
  "example": "import errno\nprint(errno.EINTR)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EINTR"
 },
 {
  "name": "errno.EINVAL",
  "category": "標準ライブラリ",
  "syntax": "errno.EINVAL",
  "description": "エラー番号定数 EINVAL（Invalid argument（不正な引数））。",
  "example": "import errno\nprint(errno.EINVAL)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EINVAL"
 },
 {
  "name": "errno.EIO",
  "category": "標準ライブラリ",
  "syntax": "errno.EIO",
  "description": "エラー番号定数 EIO（Input/output error（入出力エラー））。",
  "example": "import errno\nprint(errno.EIO)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EIO"
 },
 {
  "name": "errno.EISCONN",
  "category": "標準ライブラリ",
  "syntax": "errno.EISCONN",
  "description": "エラー番号定数 EISCONN（Transport endpoint is already connected）。",
  "example": "import errno\nprint(errno.EISCONN)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EISCONN"
 },
 {
  "name": "errno.EISDIR",
  "category": "標準ライブラリ",
  "syntax": "errno.EISDIR",
  "description": "エラー番号定数 EISDIR（Is a directory（ディレクトリである））。",
  "example": "import errno\nprint(errno.EISDIR)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EISDIR"
 },
 {
  "name": "errno.EISNAM",
  "category": "標準ライブラリ",
  "syntax": "errno.EISNAM",
  "description": "エラー番号定数 EISNAM（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EISNAM)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EISNAM"
 },
 {
  "name": "errno.EKEYEXPIRED",
  "category": "標準ライブラリ",
  "syntax": "errno.EKEYEXPIRED",
  "description": "エラー番号定数 EKEYEXPIRED（Key has expired）。",
  "example": "import errno\nprint(errno.EKEYEXPIRED)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EKEYEXPIRED"
 },
 {
  "name": "errno.EKEYREJECTED",
  "category": "標準ライブラリ",
  "syntax": "errno.EKEYREJECTED",
  "description": "エラー番号定数 EKEYREJECTED（Key was rejected by service）。",
  "example": "import errno\nprint(errno.EKEYREJECTED)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EKEYREJECTED"
 },
 {
  "name": "errno.EKEYREVOKED",
  "category": "標準ライブラリ",
  "syntax": "errno.EKEYREVOKED",
  "description": "エラー番号定数 EKEYREVOKED（Key has been revoked）。",
  "example": "import errno\nprint(errno.EKEYREVOKED)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EKEYREVOKED"
 },
 {
  "name": "errno.EL2HLT",
  "category": "標準ライブラリ",
  "syntax": "errno.EL2HLT",
  "description": "エラー番号定数 EL2HLT（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EL2HLT)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EL2HLT"
 },
 {
  "name": "errno.EL2NSYNC",
  "category": "標準ライブラリ",
  "syntax": "errno.EL2NSYNC",
  "description": "エラー番号定数 EL2NSYNC（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EL2NSYNC)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EL2NSYNC"
 },
 {
  "name": "errno.EL3HLT",
  "category": "標準ライブラリ",
  "syntax": "errno.EL3HLT",
  "description": "エラー番号定数 EL3HLT（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EL3HLT)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EL3HLT"
 },
 {
  "name": "errno.EL3RST",
  "category": "標準ライブラリ",
  "syntax": "errno.EL3RST",
  "description": "エラー番号定数 EL3RST（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EL3RST)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EL3RST"
 },
 {
  "name": "errno.ELIBACC",
  "category": "標準ライブラリ",
  "syntax": "errno.ELIBACC",
  "description": "エラー番号定数 ELIBACC（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ELIBACC)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ELIBACC"
 },
 {
  "name": "errno.ELIBBAD",
  "category": "標準ライブラリ",
  "syntax": "errno.ELIBBAD",
  "description": "エラー番号定数 ELIBBAD（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ELIBBAD)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ELIBBAD"
 },
 {
  "name": "errno.ELIBEXEC",
  "category": "標準ライブラリ",
  "syntax": "errno.ELIBEXEC",
  "description": "エラー番号定数 ELIBEXEC（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ELIBEXEC)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ELIBEXEC"
 },
 {
  "name": "errno.ELIBMAX",
  "category": "標準ライブラリ",
  "syntax": "errno.ELIBMAX",
  "description": "エラー番号定数 ELIBMAX（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ELIBMAX)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ELIBMAX"
 },
 {
  "name": "errno.ELIBSCN",
  "category": "標準ライブラリ",
  "syntax": "errno.ELIBSCN",
  "description": "エラー番号定数 ELIBSCN（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ELIBSCN)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ELIBSCN"
 },
 {
  "name": "errno.ELNRNG",
  "category": "標準ライブラリ",
  "syntax": "errno.ELNRNG",
  "description": "エラー番号定数 ELNRNG（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ELNRNG)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ELNRNG"
 },
 {
  "name": "errno.ELOCKUNMAPPED",
  "category": "標準ライブラリ",
  "syntax": "errno.ELOCKUNMAPPED",
  "description": "エラー番号定数 ELOCKUNMAPPED（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ELOCKUNMAPPED)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ELOCKUNMAPPED"
 },
 {
  "name": "errno.ELOOP",
  "category": "標準ライブラリ",
  "syntax": "errno.ELOOP",
  "description": "エラー番号定数 ELOOP（Too many levels of symbolic links（シンボリックリンクのループ））。",
  "example": "import errno\nprint(errno.ELOOP)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ELOOP"
 },
 {
  "name": "errno.EMEDIUMTYPE",
  "category": "標準ライブラリ",
  "syntax": "errno.EMEDIUMTYPE",
  "description": "エラー番号定数 EMEDIUMTYPE（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EMEDIUMTYPE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EMEDIUMTYPE"
 },
 {
  "name": "errno.EMFILE",
  "category": "標準ライブラリ",
  "syntax": "errno.EMFILE",
  "description": "エラー番号定数 EMFILE（Too many open files（開きすぎ））。",
  "example": "import errno\nprint(errno.EMFILE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EMFILE"
 },
 {
  "name": "errno.EMLINK",
  "category": "標準ライブラリ",
  "syntax": "errno.EMLINK",
  "description": "エラー番号定数 EMLINK（Too many links）。",
  "example": "import errno\nprint(errno.EMLINK)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EMLINK"
 },
 {
  "name": "errno.EMSGSIZE",
  "category": "標準ライブラリ",
  "syntax": "errno.EMSGSIZE",
  "description": "エラー番号定数 EMSGSIZE（Message too long）。",
  "example": "import errno\nprint(errno.EMSGSIZE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EMSGSIZE"
 },
 {
  "name": "errno.EMULTIHOP",
  "category": "標準ライブラリ",
  "syntax": "errno.EMULTIHOP",
  "description": "エラー番号定数 EMULTIHOP（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EMULTIHOP)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EMULTIHOP"
 },
 {
  "name": "errno.ENAMETOOLONG",
  "category": "標準ライブラリ",
  "syntax": "errno.ENAMETOOLONG",
  "description": "エラー番号定数 ENAMETOOLONG（File name too long（名前が長すぎる））。",
  "example": "import errno\nprint(errno.ENAMETOOLONG)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENAMETOOLONG"
 },
 {
  "name": "errno.ENAVAIL",
  "category": "標準ライブラリ",
  "syntax": "errno.ENAVAIL",
  "description": "エラー番号定数 ENAVAIL（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ENAVAIL)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENAVAIL"
 },
 {
  "name": "errno.ENEEDAUTH",
  "category": "標準ライブラリ",
  "syntax": "errno.ENEEDAUTH",
  "description": "エラー番号定数 ENEEDAUTH（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ENEEDAUTH)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENEEDAUTH"
 },
 {
  "name": "errno.ENETDOWN",
  "category": "標準ライブラリ",
  "syntax": "errno.ENETDOWN",
  "description": "エラー番号定数 ENETDOWN（Network is down）。",
  "example": "import errno\nprint(errno.ENETDOWN)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENETDOWN"
 },
 {
  "name": "errno.ENETRESET",
  "category": "標準ライブラリ",
  "syntax": "errno.ENETRESET",
  "description": "エラー番号定数 ENETRESET（Network dropped connection on reset）。",
  "example": "import errno\nprint(errno.ENETRESET)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENETRESET"
 },
 {
  "name": "errno.ENETUNREACH",
  "category": "標準ライブラリ",
  "syntax": "errno.ENETUNREACH",
  "description": "エラー番号定数 ENETUNREACH（Network is unreachable）。",
  "example": "import errno\nprint(errno.ENETUNREACH)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENETUNREACH"
 },
 {
  "name": "errno.ENFILE",
  "category": "標準ライブラリ",
  "syntax": "errno.ENFILE",
  "description": "エラー番号定数 ENFILE（Too many open files in system）。",
  "example": "import errno\nprint(errno.ENFILE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENFILE"
 },
 {
  "name": "errno.ENOANO",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOANO",
  "description": "エラー番号定数 ENOANO（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ENOANO)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOANO"
 },
 {
  "name": "errno.ENOATTR",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOATTR",
  "description": "エラー番号定数 ENOATTR（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ENOATTR)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOATTR"
 },
 {
  "name": "errno.ENOBUFS",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOBUFS",
  "description": "エラー番号定数 ENOBUFS（No buffer space available）。",
  "example": "import errno\nprint(errno.ENOBUFS)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOBUFS"
 },
 {
  "name": "errno.ENOCSI",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOCSI",
  "description": "エラー番号定数 ENOCSI（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ENOCSI)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOCSI"
 },
 {
  "name": "errno.ENODATA",
  "category": "標準ライブラリ",
  "syntax": "errno.ENODATA",
  "description": "エラー番号定数 ENODATA（No data available）。",
  "example": "import errno\nprint(errno.ENODATA)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENODATA"
 },
 {
  "name": "errno.ENODEV",
  "category": "標準ライブラリ",
  "syntax": "errno.ENODEV",
  "description": "エラー番号定数 ENODEV（No such device（デバイスが無い））。",
  "example": "import errno\nprint(errno.ENODEV)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENODEV"
 },
 {
  "name": "errno.ENOENT",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOENT",
  "description": "エラー番号定数 ENOENT（No such file or directory（ファイルやディレクトリが無い））。",
  "example": "import errno\nprint(errno.ENOENT)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOENT"
 },
 {
  "name": "errno.ENOEXEC",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOEXEC",
  "description": "エラー番号定数 ENOEXEC（Exec format error（実行形式エラー））。",
  "example": "import errno\nprint(errno.ENOEXEC)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOEXEC"
 },
 {
  "name": "errno.ENOKEY",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOKEY",
  "description": "エラー番号定数 ENOKEY（Required key not available）。",
  "example": "import errno\nprint(errno.ENOKEY)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOKEY"
 },
 {
  "name": "errno.ENOLCK",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOLCK",
  "description": "エラー番号定数 ENOLCK（No locks available）。",
  "example": "import errno\nprint(errno.ENOLCK)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOLCK"
 },
 {
  "name": "errno.ENOLINK",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOLINK",
  "description": "エラー番号定数 ENOLINK（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ENOLINK)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOLINK"
 },
 {
  "name": "errno.ENOMEDIUM",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOMEDIUM",
  "description": "エラー番号定数 ENOMEDIUM（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ENOMEDIUM)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOMEDIUM"
 },
 {
  "name": "errno.ENOMEM",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOMEM",
  "description": "エラー番号定数 ENOMEM（Out of memory（メモリ不足））。",
  "example": "import errno\nprint(errno.ENOMEM)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOMEM"
 },
 {
  "name": "errno.ENOMSG",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOMSG",
  "description": "エラー番号定数 ENOMSG（No message of desired type）。",
  "example": "import errno\nprint(errno.ENOMSG)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOMSG"
 },
 {
  "name": "errno.ENONET",
  "category": "標準ライブラリ",
  "syntax": "errno.ENONET",
  "description": "エラー番号定数 ENONET（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ENONET)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENONET"
 },
 {
  "name": "errno.ENOPKG",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOPKG",
  "description": "エラー番号定数 ENOPKG（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ENOPKG)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOPKG"
 },
 {
  "name": "errno.ENOPOLICY",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOPOLICY",
  "description": "エラー番号定数 ENOPOLICY（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ENOPOLICY)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOPOLICY"
 },
 {
  "name": "errno.ENOPROTOOPT",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOPROTOOPT",
  "description": "エラー番号定数 ENOPROTOOPT（Protocol not available）。",
  "example": "import errno\nprint(errno.ENOPROTOOPT)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOPROTOOPT"
 },
 {
  "name": "errno.ENOSPC",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOSPC",
  "description": "エラー番号定数 ENOSPC（No space left on device（空き容量が無い））。",
  "example": "import errno\nprint(errno.ENOSPC)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOSPC"
 },
 {
  "name": "errno.ENOSR",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOSR",
  "description": "エラー番号定数 ENOSR（Out of streams resources）。",
  "example": "import errno\nprint(errno.ENOSR)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOSR"
 },
 {
  "name": "errno.ENOSTR",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOSTR",
  "description": "エラー番号定数 ENOSTR（Device not a stream）。",
  "example": "import errno\nprint(errno.ENOSTR)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOSTR"
 },
 {
  "name": "errno.ENOSYS",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOSYS",
  "description": "エラー番号定数 ENOSYS（Function not implemented（未実装の機能））。",
  "example": "import errno\nprint(errno.ENOSYS)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOSYS"
 },
 {
  "name": "errno.ENOTACTIVE",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOTACTIVE",
  "description": "エラー番号定数 ENOTACTIVE（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ENOTACTIVE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOTACTIVE"
 },
 {
  "name": "errno.ENOTBLK",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOTBLK",
  "description": "エラー番号定数 ENOTBLK（Block device required）。",
  "example": "import errno\nprint(errno.ENOTBLK)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOTBLK"
 },
 {
  "name": "errno.ENOTCAPABLE",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOTCAPABLE",
  "description": "エラー番号定数 ENOTCAPABLE（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ENOTCAPABLE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOTCAPABLE"
 },
 {
  "name": "errno.ENOTCONN",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOTCONN",
  "description": "エラー番号定数 ENOTCONN（Transport endpoint is not connected）。",
  "example": "import errno\nprint(errno.ENOTCONN)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOTCONN"
 },
 {
  "name": "errno.ENOTDIR",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOTDIR",
  "description": "エラー番号定数 ENOTDIR（Not a directory（ディレクトリでない））。",
  "example": "import errno\nprint(errno.ENOTDIR)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOTDIR"
 },
 {
  "name": "errno.ENOTEMPTY",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOTEMPTY",
  "description": "エラー番号定数 ENOTEMPTY（Directory not empty（ディレクトリが空でない））。",
  "example": "import errno\nprint(errno.ENOTEMPTY)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOTEMPTY"
 },
 {
  "name": "errno.ENOTNAM",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOTNAM",
  "description": "エラー番号定数 ENOTNAM（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ENOTNAM)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOTNAM"
 },
 {
  "name": "errno.ENOTRECOVERABLE",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOTRECOVERABLE",
  "description": "エラー番号定数 ENOTRECOVERABLE（State not recoverable）。",
  "example": "import errno\nprint(errno.ENOTRECOVERABLE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOTRECOVERABLE"
 },
 {
  "name": "errno.ENOTSOCK",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOTSOCK",
  "description": "エラー番号定数 ENOTSOCK（Socket operation on non-socket）。",
  "example": "import errno\nprint(errno.ENOTSOCK)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOTSOCK"
 },
 {
  "name": "errno.ENOTSUP",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOTSUP",
  "description": "エラー番号定数 ENOTSUP（EOPNOTSUPP と同じ意味の別名）。",
  "example": "import errno\nprint(errno.ENOTSUP)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOTSUP"
 },
 {
  "name": "errno.ENOTTY",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOTTY",
  "description": "エラー番号定数 ENOTTY（Inappropriate ioctl for device）。",
  "example": "import errno\nprint(errno.ENOTTY)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOTTY"
 },
 {
  "name": "errno.ENOTUNIQ",
  "category": "標準ライブラリ",
  "syntax": "errno.ENOTUNIQ",
  "description": "エラー番号定数 ENOTUNIQ（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ENOTUNIQ)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENOTUNIQ"
 },
 {
  "name": "errno.ENXIO",
  "category": "標準ライブラリ",
  "syntax": "errno.ENXIO",
  "description": "エラー番号定数 ENXIO（No such device or address）。",
  "example": "import errno\nprint(errno.ENXIO)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ENXIO"
 },
 {
  "name": "errno.EOPNOTSUPP",
  "category": "標準ライブラリ",
  "syntax": "errno.EOPNOTSUPP",
  "description": "エラー番号定数 EOPNOTSUPP（Operation not supported）。",
  "example": "import errno\nprint(errno.EOPNOTSUPP)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EOPNOTSUPP"
 },
 {
  "name": "errno.EOVERFLOW",
  "category": "標準ライブラリ",
  "syntax": "errno.EOVERFLOW",
  "description": "エラー番号定数 EOVERFLOW（Value too large for defined data type）。",
  "example": "import errno\nprint(errno.EOVERFLOW)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EOVERFLOW"
 },
 {
  "name": "errno.EOWNERDEAD",
  "category": "標準ライブラリ",
  "syntax": "errno.EOWNERDEAD",
  "description": "エラー番号定数 EOWNERDEAD（Owner died）。",
  "example": "import errno\nprint(errno.EOWNERDEAD)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EOWNERDEAD"
 },
 {
  "name": "errno.EPERM",
  "category": "標準ライブラリ",
  "syntax": "errno.EPERM",
  "description": "エラー番号定数 EPERM（Operation not permitted（操作が許可されていない））。",
  "example": "import errno\nprint(errno.EPERM)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EPERM"
 },
 {
  "name": "errno.EPFNOSUPPORT",
  "category": "標準ライブラリ",
  "syntax": "errno.EPFNOSUPPORT",
  "description": "エラー番号定数 EPFNOSUPPORT（Protocol family not supported）。",
  "example": "import errno\nprint(errno.EPFNOSUPPORT)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EPFNOSUPPORT"
 },
 {
  "name": "errno.EPIPE",
  "category": "標準ライブラリ",
  "syntax": "errno.EPIPE",
  "description": "エラー番号定数 EPIPE（Broken pipe）。",
  "example": "import errno\nprint(errno.EPIPE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EPIPE"
 },
 {
  "name": "errno.EPROCLIM",
  "category": "標準ライブラリ",
  "syntax": "errno.EPROCLIM",
  "description": "エラー番号定数 EPROCLIM（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EPROCLIM)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EPROCLIM"
 },
 {
  "name": "errno.EPROCUNAVAIL",
  "category": "標準ライブラリ",
  "syntax": "errno.EPROCUNAVAIL",
  "description": "エラー番号定数 EPROCUNAVAIL（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EPROCUNAVAIL)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EPROCUNAVAIL"
 },
 {
  "name": "errno.EPROGMISMATCH",
  "category": "標準ライブラリ",
  "syntax": "errno.EPROGMISMATCH",
  "description": "エラー番号定数 EPROGMISMATCH（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EPROGMISMATCH)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EPROGMISMATCH"
 },
 {
  "name": "errno.EPROGUNAVAIL",
  "category": "標準ライブラリ",
  "syntax": "errno.EPROGUNAVAIL",
  "description": "エラー番号定数 EPROGUNAVAIL（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EPROGUNAVAIL)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EPROGUNAVAIL"
 },
 {
  "name": "errno.EPROTO",
  "category": "標準ライブラリ",
  "syntax": "errno.EPROTO",
  "description": "エラー番号定数 EPROTO（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EPROTO)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EPROTO"
 },
 {
  "name": "errno.EPROTONOSUPPORT",
  "category": "標準ライブラリ",
  "syntax": "errno.EPROTONOSUPPORT",
  "description": "エラー番号定数 EPROTONOSUPPORT（Protocol not supported）。",
  "example": "import errno\nprint(errno.EPROTONOSUPPORT)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EPROTONOSUPPORT"
 },
 {
  "name": "errno.EPROTOTYPE",
  "category": "標準ライブラリ",
  "syntax": "errno.EPROTOTYPE",
  "description": "エラー番号定数 EPROTOTYPE（Protocol wrong type for socket）。",
  "example": "import errno\nprint(errno.EPROTOTYPE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EPROTOTYPE"
 },
 {
  "name": "errno.EPWROFF",
  "category": "標準ライブラリ",
  "syntax": "errno.EPWROFF",
  "description": "エラー番号定数 EPWROFF（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EPWROFF)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EPWROFF"
 },
 {
  "name": "errno.EQFULL",
  "category": "標準ライブラリ",
  "syntax": "errno.EQFULL",
  "description": "エラー番号定数 EQFULL（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EQFULL)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EQFULL"
 },
 {
  "name": "errno.ERANGE",
  "category": "標準ライブラリ",
  "syntax": "errno.ERANGE",
  "description": "エラー番号定数 ERANGE（Numerical result out of range（数値結果の範囲外））。",
  "example": "import errno\nprint(errno.ERANGE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ERANGE"
 },
 {
  "name": "errno.EREMCHG",
  "category": "標準ライブラリ",
  "syntax": "errno.EREMCHG",
  "description": "エラー番号定数 EREMCHG（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EREMCHG)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EREMCHG"
 },
 {
  "name": "errno.EREMOTE",
  "category": "標準ライブラリ",
  "syntax": "errno.EREMOTE",
  "description": "エラー番号定数 EREMOTE（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EREMOTE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EREMOTE"
 },
 {
  "name": "errno.EREMOTEIO",
  "category": "標準ライブラリ",
  "syntax": "errno.EREMOTEIO",
  "description": "エラー番号定数 EREMOTEIO（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EREMOTEIO)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EREMOTEIO"
 },
 {
  "name": "errno.ERESTART",
  "category": "標準ライブラリ",
  "syntax": "errno.ERESTART",
  "description": "エラー番号定数 ERESTART（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ERESTART)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ERESTART"
 },
 {
  "name": "errno.ERFKILL",
  "category": "標準ライブラリ",
  "syntax": "errno.ERFKILL",
  "description": "エラー番号定数 ERFKILL（Operation not possible due to RF-kill）。",
  "example": "import errno\nprint(errno.ERFKILL)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ERFKILL"
 },
 {
  "name": "errno.EROFS",
  "category": "標準ライブラリ",
  "syntax": "errno.EROFS",
  "description": "エラー番号定数 EROFS（Read-only file system（読み取り専用））。",
  "example": "import errno\nprint(errno.EROFS)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EROFS"
 },
 {
  "name": "errno.ERPCMISMATCH",
  "category": "標準ライブラリ",
  "syntax": "errno.ERPCMISMATCH",
  "description": "エラー番号定数 ERPCMISMATCH（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ERPCMISMATCH)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ERPCMISMATCH"
 },
 {
  "name": "errno.ESHLIBVERS",
  "category": "標準ライブラリ",
  "syntax": "errno.ESHLIBVERS",
  "description": "エラー番号定数 ESHLIBVERS（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ESHLIBVERS)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ESHLIBVERS"
 },
 {
  "name": "errno.ESHUTDOWN",
  "category": "標準ライブラリ",
  "syntax": "errno.ESHUTDOWN",
  "description": "エラー番号定数 ESHUTDOWN（Cannot send after transport endpoint shutdown）。",
  "example": "import errno\nprint(errno.ESHUTDOWN)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ESHUTDOWN"
 },
 {
  "name": "errno.ESOCKTNOSUPPORT",
  "category": "標準ライブラリ",
  "syntax": "errno.ESOCKTNOSUPPORT",
  "description": "エラー番号定数 ESOCKTNOSUPPORT（Socket type not supported）。",
  "example": "import errno\nprint(errno.ESOCKTNOSUPPORT)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ESOCKTNOSUPPORT"
 },
 {
  "name": "errno.ESPIPE",
  "category": "標準ライブラリ",
  "syntax": "errno.ESPIPE",
  "description": "エラー番号定数 ESPIPE（Illegal seek）。",
  "example": "import errno\nprint(errno.ESPIPE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ESPIPE"
 },
 {
  "name": "errno.ESRCH",
  "category": "標準ライブラリ",
  "syntax": "errno.ESRCH",
  "description": "エラー番号定数 ESRCH（No such process（プロセスが無い））。",
  "example": "import errno\nprint(errno.ESRCH)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ESRCH"
 },
 {
  "name": "errno.ESRMNT",
  "category": "標準ライブラリ",
  "syntax": "errno.ESRMNT",
  "description": "エラー番号定数 ESRMNT（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ESRMNT)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ESRMNT"
 },
 {
  "name": "errno.ESTALE",
  "category": "標準ライブラリ",
  "syntax": "errno.ESTALE",
  "description": "エラー番号定数 ESTALE（Stale file handle）。",
  "example": "import errno\nprint(errno.ESTALE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ESTALE"
 },
 {
  "name": "errno.ESTRPIPE",
  "category": "標準ライブラリ",
  "syntax": "errno.ESTRPIPE",
  "description": "エラー番号定数 ESTRPIPE（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.ESTRPIPE)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ESTRPIPE"
 },
 {
  "name": "errno.ETIME",
  "category": "標準ライブラリ",
  "syntax": "errno.ETIME",
  "description": "エラー番号定数 ETIME（Timer expired）。",
  "example": "import errno\nprint(errno.ETIME)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ETIME"
 },
 {
  "name": "errno.ETIMEDOUT",
  "category": "標準ライブラリ",
  "syntax": "errno.ETIMEDOUT",
  "description": "エラー番号定数 ETIMEDOUT（Connection timed out（接続タイムアウト））。",
  "example": "import errno\nprint(errno.ETIMEDOUT)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ETIMEDOUT"
 },
 {
  "name": "errno.ETOOMANYREFS",
  "category": "標準ライブラリ",
  "syntax": "errno.ETOOMANYREFS",
  "description": "エラー番号定数 ETOOMANYREFS（Too many references）。",
  "example": "import errno\nprint(errno.ETOOMANYREFS)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ETOOMANYREFS"
 },
 {
  "name": "errno.ETXTBSY",
  "category": "標準ライブラリ",
  "syntax": "errno.ETXTBSY",
  "description": "エラー番号定数 ETXTBSY（Text file busy）。",
  "example": "import errno\nprint(errno.ETXTBSY)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.ETXTBSY"
 },
 {
  "name": "errno.EUCLEAN",
  "category": "標準ライブラリ",
  "syntax": "errno.EUCLEAN",
  "description": "エラー番号定数 EUCLEAN（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EUCLEAN)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EUCLEAN"
 },
 {
  "name": "errno.EUNATCH",
  "category": "標準ライブラリ",
  "syntax": "errno.EUNATCH",
  "description": "エラー番号定数 EUNATCH（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EUNATCH)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EUNATCH"
 },
 {
  "name": "errno.EUSERS",
  "category": "標準ライブラリ",
  "syntax": "errno.EUSERS",
  "description": "エラー番号定数 EUSERS（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EUSERS)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EUSERS"
 },
 {
  "name": "errno.EWOULDBLOCK",
  "category": "標準ライブラリ",
  "syntax": "errno.EWOULDBLOCK",
  "description": "エラー番号定数 EWOULDBLOCK（EAGAIN と同じ意味の別名）。",
  "example": "import errno\nprint(errno.EWOULDBLOCK)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EWOULDBLOCK"
 },
 {
  "name": "errno.EXDEV",
  "category": "標準ライブラリ",
  "syntax": "errno.EXDEV",
  "description": "エラー番号定数 EXDEV（Cross-device link（デバイスをまたぐリンク））。",
  "example": "import errno\nprint(errno.EXDEV)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EXDEV"
 },
 {
  "name": "errno.EXFULL",
  "category": "標準ライブラリ",
  "syntax": "errno.EXFULL",
  "description": "エラー番号定数 EXFULL（プラットフォーム固有のエラー番号）。",
  "example": "import errno\nprint(errno.EXFULL)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.EXFULL"
 },
 {
  "name": "errno.errorcode",
  "category": "標準ライブラリ",
  "syntax": "errno.errorcode",
  "description": "エラー番号から定数名への対応を表す辞書。",
  "example": "import errno\nprint(errno.errorcode)",
  "caution": "未検証です。エラー番号の値はプラットフォーム依存であり（公式ドキュメントもプラットフォーム依存と明記）、単一の値を正として固定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/errno.html#errno.errorcode"
 }
];
