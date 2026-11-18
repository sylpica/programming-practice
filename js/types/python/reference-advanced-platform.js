/* 高度モード B7 G9：platform モジュールのリファレンス差分（26件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 裁定方針は docs/audit/b7-g9-report.md を参照（環境依存値は実値化しない）。 */
export const referenceAdvanced = [
 {
  "name": "platform.android_ver",
  "category": "標準ライブラリ",
  "syntax": "platform.android_ver()",
  "description": "Android のバージョン情報を返す。",
  "example": "import platform\nplatform.android_ver()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.android_ver"
 },
 {
  "name": "platform.architecture",
  "category": "標準ライブラリ",
  "syntax": "platform.architecture()",
  "description": "実行ファイルのアーキテクチャ情報を返す。",
  "example": "import platform\nplatform.architecture()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.architecture"
 },
 {
  "name": "platform.freedesktop_os_release",
  "category": "標準ライブラリ",
  "syntax": "platform.freedesktop_os_release()",
  "description": "freedesktop OS リリース情報を返す。",
  "example": "import platform\nplatform.freedesktop_os_release()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.freedesktop_os_release"
 },
 {
  "name": "platform.invalidate_caches",
  "category": "標準ライブラリ",
  "syntax": "platform.invalidate_caches()",
  "description": "プラットフォーム情報のキャッシュを消去する。",
  "example": "import platform\nplatform.invalidate_caches()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.invalidate_caches"
 },
 {
  "name": "platform.ios_ver",
  "category": "標準ライブラリ",
  "syntax": "platform.ios_ver()",
  "description": "iOS のバージョン情報を返す。",
  "example": "import platform\nplatform.ios_ver()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.ios_ver"
 },
 {
  "name": "platform.libc_ver",
  "category": "標準ライブラリ",
  "syntax": "platform.libc_ver()",
  "description": "C ライブラリのバージョンを返す。",
  "example": "import platform\nplatform.libc_ver()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.libc_ver"
 },
 {
  "name": "platform.mac_ver",
  "category": "標準ライブラリ",
  "syntax": "platform.mac_ver()",
  "description": "macOS のバージョン情報を返す。",
  "example": "import platform\nplatform.mac_ver()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.mac_ver"
 },
 {
  "name": "platform.machine",
  "category": "標準ライブラリ",
  "syntax": "platform.machine()",
  "description": "マシン種別文字列を返す。",
  "example": "import platform\nplatform.machine()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.machine"
 },
 {
  "name": "platform.node",
  "category": "標準ライブラリ",
  "syntax": "platform.node()",
  "description": "ネットワーク上のマシン名を返す。",
  "example": "import platform\nplatform.node()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.node"
 },
 {
  "name": "platform.platform",
  "category": "標準ライブラリ",
  "syntax": "platform.platform()",
  "description": "プラットフォーム識別文字列を返す。",
  "example": "import platform\nplatform.platform()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.platform"
 },
 {
  "name": "platform.processor",
  "category": "標準ライブラリ",
  "syntax": "platform.processor()",
  "description": "プロセッサ名を返す。",
  "example": "import platform\nplatform.processor()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.processor"
 },
 {
  "name": "platform.python_branch",
  "category": "標準ライブラリ",
  "syntax": "platform.python_branch()",
  "description": "Python のブランチ名を返す。",
  "example": "import platform\nplatform.python_branch()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.python_branch"
 },
 {
  "name": "platform.python_build",
  "category": "標準ライブラリ",
  "syntax": "platform.python_build()",
  "description": "Python のビルド情報を返す。",
  "example": "import platform\nplatform.python_build()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.python_build"
 },
 {
  "name": "platform.python_compiler",
  "category": "標準ライブラリ",
  "syntax": "platform.python_compiler()",
  "description": "Python のビルドに使ったコンパイラを返す。",
  "example": "import platform\nplatform.python_compiler()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.python_compiler"
 },
 {
  "name": "platform.python_implementation",
  "category": "標準ライブラリ",
  "syntax": "platform.python_implementation()",
  "description": "Python 実装名を返す。",
  "example": "import platform\nplatform.python_implementation()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.python_implementation"
 },
 {
  "name": "platform.python_revision",
  "category": "標準ライブラリ",
  "syntax": "platform.python_revision()",
  "description": "Python のリビジョンを返す。",
  "example": "import platform\nplatform.python_revision()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.python_revision"
 },
 {
  "name": "platform.python_version",
  "category": "標準ライブラリ",
  "syntax": "platform.python_version()",
  "description": "Python バージョン文字列を返す。",
  "example": "import platform\nplatform.python_version()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.python_version"
 },
 {
  "name": "platform.python_version_tuple",
  "category": "標準ライブラリ",
  "syntax": "platform.python_version_tuple()",
  "description": "Python バージョンをタプルで返す。",
  "example": "import platform\nplatform.python_version_tuple()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.python_version_tuple"
 },
 {
  "name": "platform.release",
  "category": "標準ライブラリ",
  "syntax": "platform.release()",
  "description": "OS のリリース文字列を返す。",
  "example": "import platform\nplatform.release()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.release"
 },
 {
  "name": "platform.system",
  "category": "標準ライブラリ",
  "syntax": "platform.system()",
  "description": "OS 名を返す。",
  "example": "import platform\nplatform.system()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.system"
 },
 {
  "name": "platform.system_alias",
  "category": "標準ライブラリ",
  "syntax": "platform.system_alias()",
  "description": "OS 名の別名情報を返す。",
  "example": "import platform\nplatform.system_alias()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.system_alias"
 },
 {
  "name": "platform.uname",
  "category": "標準ライブラリ",
  "syntax": "platform.uname()",
  "description": "プラットフォーム情報（名前空間）を返す。",
  "example": "import platform\nplatform.uname()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.uname"
 },
 {
  "name": "platform.version",
  "category": "標準ライブラリ",
  "syntax": "platform.version()",
  "description": "OS のバージョン文字列を返す。",
  "example": "import platform\nplatform.version()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.version"
 },
 {
  "name": "platform.win32_edition",
  "category": "標準ライブラリ",
  "syntax": "platform.win32_edition()",
  "description": "Windows のエディションを返す。",
  "example": "import platform\nplatform.win32_edition()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.win32_edition"
 },
 {
  "name": "platform.win32_is_iot",
  "category": "標準ライブラリ",
  "syntax": "platform.win32_is_iot()",
  "description": "Windows IoT かを返す。",
  "example": "import platform\nplatform.win32_is_iot()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.win32_is_iot"
 },
 {
  "name": "platform.win32_ver",
  "category": "標準ライブラリ",
  "syntax": "platform.win32_ver()",
  "description": "Windows のバージョン情報を返す。",
  "example": "import platform\nplatform.win32_ver()",
  "caution": "未検証です。実行環境（OS・CPU・インタプリタビルド）の識別情報であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/platform.html#platform.win32_ver"
 }
];
