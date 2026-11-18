/* 高度モード B7 G6：zoneinfo モジュールのリファレンス項目（全10件・正規形＋status）。
 * 一次情報：公式ドキュメント 3.15 library/zoneinfo と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
 {
  "name": "zoneinfo.InvalidTZPathWarning",
  "category": "標準ライブラリ",
  "syntax": "zoneinfo.InvalidTZPathWarning",
  "description": "TZPATH の要素が不正な場合の警告（RuntimeWarning のサブクラス）。",
  "example": "import zoneinfo\nprint(zoneinfo.InvalidTZPathWarning)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/zoneinfo.html#zoneinfo.InvalidTZPathWarning"
 },
 {
  "name": "zoneinfo.TZPATH",
  "category": "標準ライブラリ",
  "syntax": "zoneinfo.TZPATH",
  "description": "ZoneInfo が tz データを探すパスのタプル。",
  "example": "import zoneinfo\nprint(zoneinfo.TZPATH)",
  "caution": "本アプリの高度モードでは未検証です。探索パスは実行環境に依存するため。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/zoneinfo.html#zoneinfo.TZPATH"
 },
 {
  "name": "zoneinfo.ZoneInfo",
  "category": "標準ライブラリ",
  "syntax": "zoneinfo.ZoneInfo(key)",
  "description": "IANA タイムゾーン（例 \"Asia/Tokyo\"）を表す tzinfo。",
  "example": "import zoneinfo\nprint(zoneinfo.ZoneInfo(\"Asia/Tokyo\"))",
  "caution": "本アプリの高度モードでは未検証です。エンジンに tz データベースが無いため、生成を確定できない。datetime.timezone による代用はしない。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/zoneinfo.html#zoneinfo.ZoneInfo"
 },
 {
  "name": "zoneinfo.ZoneInfo.clear_cache",
  "category": "標準ライブラリ",
  "syntax": "zoneinfo.ZoneInfo.clear_cache(only_keys=None)",
  "description": "ZoneInfo のキャッシュを消去するクラスメソッド。",
  "example": "import zoneinfo\nzoneinfo.ZoneInfo.clear_cache()",
  "caution": "本アプリの高度モードでは未検証です。キャッシュ対象の tz データが無いため。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/zoneinfo.html#zoneinfo.ZoneInfo.clear_cache"
 },
 {
  "name": "zoneinfo.ZoneInfo.from_file",
  "category": "標準ライブラリ",
  "syntax": "zoneinfo.ZoneInfo.from_file(file_obj, /, key=None)",
  "description": "TZif ファイルから ZoneInfo を作るクラスメソッド。",
  "example": "import zoneinfo\nprint(zoneinfo.ZoneInfo.from_file)",
  "caution": "本アプリの高度モードでは未検証です。TZif ファイルの読み込みと tz データ確定ができないため。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/zoneinfo.html#zoneinfo.ZoneInfo.from_file"
 },
 {
  "name": "zoneinfo.ZoneInfo.key",
  "category": "標準ライブラリ",
  "syntax": "ZoneInfo.key",
  "description": "このタイムゾーンの IANA キー（文字列）。",
  "example": "import zoneinfo\nprint(zoneinfo.ZoneInfo(\"UTC\").key)",
  "caution": "本アプリの高度モードでは未検証です。ZoneInfo 自体の生成が未検証のため。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/zoneinfo.html#zoneinfo.ZoneInfo.key"
 },
 {
  "name": "zoneinfo.ZoneInfo.no_cache",
  "category": "標準ライブラリ",
  "syntax": "zoneinfo.ZoneInfo.no_cache(key)",
  "description": "キャッシュを使わずに ZoneInfo を作るクラスメソッド。",
  "example": "import zoneinfo\nprint(zoneinfo.ZoneInfo.no_cache(\"UTC\"))",
  "caution": "本アプリの高度モードでは未検証です。tz データベースが無いため。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/zoneinfo.html#zoneinfo.ZoneInfo.no_cache"
 },
 {
  "name": "zoneinfo.ZoneInfoNotFoundError",
  "category": "標準ライブラリ",
  "syntax": "zoneinfo.ZoneInfoNotFoundError",
  "description": "指定キーのタイムゾーンが見つからない場合の例外（KeyError のサブクラス）。",
  "example": "import zoneinfo\nprint(zoneinfo.ZoneInfoNotFoundError)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/zoneinfo.html#zoneinfo.ZoneInfoNotFoundError"
 },
 {
  "name": "zoneinfo.available_timezones",
  "category": "標準ライブラリ",
  "syntax": "zoneinfo.available_timezones()",
  "description": "利用可能なタイムゾーンキーの集合を返す。",
  "example": "import zoneinfo\nprint(\"UTC\" in zoneinfo.available_timezones())",
  "caution": "本アプリの高度モードでは未検証です。tz データベースが無いため、集合の内容を確定できない。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/zoneinfo.html#zoneinfo.available_timezones"
 },
 {
  "name": "zoneinfo.reset_tzpath",
  "category": "標準ライブラリ",
  "syntax": "zoneinfo.reset_tzpath(to=None)",
  "description": "TZPATH を再設定する。",
  "example": "import zoneinfo\nzoneinfo.reset_tzpath()",
  "caution": "本アプリの高度モードでは未対応です。TZPATH 設定を変更する操作であり、tz データ自体も収載していないため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/zoneinfo.html#zoneinfo.reset_tzpath"
 }
];
