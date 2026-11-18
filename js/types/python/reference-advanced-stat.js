/* 高度モード B7 G9：stat モジュールのリファレンス差分（103件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 裁定方針は docs/audit/b7-g9-report.md を参照（環境依存値は実値化しない）。 */
export const referenceAdvanced = [
 {
  "name": "stat.FILE_ATTRIBUTE_ARCHIVE",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_ARCHIVE",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_ARCHIVE。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_ARCHIVE)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_ARCHIVE"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_COMPRESSED",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_COMPRESSED",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_COMPRESSED。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_COMPRESSED)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_COMPRESSED"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_DEVICE",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_DEVICE",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_DEVICE。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_DEVICE)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_DEVICE"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_DIRECTORY",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_DIRECTORY",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_DIRECTORY。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_DIRECTORY)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_DIRECTORY"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_ENCRYPTED",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_ENCRYPTED",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_ENCRYPTED。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_ENCRYPTED)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_ENCRYPTED"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_HIDDEN",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_HIDDEN",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_HIDDEN。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_HIDDEN)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_HIDDEN"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_INTEGRITY_STREAM",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_INTEGRITY_STREAM",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_INTEGRITY_STREAM。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_INTEGRITY_STREAM)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_INTEGRITY_STREAM"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_NORMAL",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_NORMAL",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_NORMAL。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_NORMAL)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_NORMAL"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_NOT_CONTENT_INDEXED",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_NOT_CONTENT_INDEXED",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_NOT_CONTENT_INDEXED。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_NOT_CONTENT_INDEXED)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_NOT_CONTENT_INDEXED"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_NO_SCRUB_DATA",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_NO_SCRUB_DATA",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_NO_SCRUB_DATA。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_NO_SCRUB_DATA)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_NO_SCRUB_DATA"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_OFFLINE",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_OFFLINE",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_OFFLINE。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_OFFLINE)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_OFFLINE"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_READONLY",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_READONLY",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_READONLY。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_READONLY)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_READONLY"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_REPARSE_POINT",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_REPARSE_POINT",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_REPARSE_POINT。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_REPARSE_POINT)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_REPARSE_POINT"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_SPARSE_FILE",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_SPARSE_FILE",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_SPARSE_FILE。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_SPARSE_FILE)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_SPARSE_FILE"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_SYSTEM",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_SYSTEM",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_SYSTEM。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_SYSTEM)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_SYSTEM"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_TEMPORARY",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_TEMPORARY",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_TEMPORARY。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_TEMPORARY)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_TEMPORARY"
 },
 {
  "name": "stat.FILE_ATTRIBUTE_VIRTUAL",
  "category": "標準ライブラリ",
  "syntax": "stat.FILE_ATTRIBUTE_VIRTUAL",
  "description": "Windows のファイル属性ビット FILE_ATTRIBUTE_VIRTUAL。",
  "example": "import stat\nprint(stat.FILE_ATTRIBUTE_VIRTUAL)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.FILE_ATTRIBUTE_VIRTUAL"
 },
 {
  "name": "stat.IO_REPARSE_TAG_APPEXECLINK",
  "category": "標準ライブラリ",
  "syntax": "stat.IO_REPARSE_TAG_APPEXECLINK",
  "description": "Windows のリパースポイントタグ IO_REPARSE_TAG_APPEXECLINK。",
  "example": "import stat\nprint(stat.IO_REPARSE_TAG_APPEXECLINK)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.IO_REPARSE_TAG_APPEXECLINK"
 },
 {
  "name": "stat.IO_REPARSE_TAG_MOUNT_POINT",
  "category": "標準ライブラリ",
  "syntax": "stat.IO_REPARSE_TAG_MOUNT_POINT",
  "description": "Windows のリパースポイントタグ IO_REPARSE_TAG_MOUNT_POINT。",
  "example": "import stat\nprint(stat.IO_REPARSE_TAG_MOUNT_POINT)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.IO_REPARSE_TAG_MOUNT_POINT"
 },
 {
  "name": "stat.IO_REPARSE_TAG_SYMLINK",
  "category": "標準ライブラリ",
  "syntax": "stat.IO_REPARSE_TAG_SYMLINK",
  "description": "Windows のリパースポイントタグ IO_REPARSE_TAG_SYMLINK。",
  "example": "import stat\nprint(stat.IO_REPARSE_TAG_SYMLINK)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.IO_REPARSE_TAG_SYMLINK"
 },
 {
  "name": "stat.SF_APPEND",
  "category": "標準ライブラリ",
  "syntax": "stat.SF_APPEND",
  "description": "BSD 系のファイルフラグ SF_APPEND。",
  "example": "import stat\nprint(stat.SF_APPEND)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.SF_APPEND"
 },
 {
  "name": "stat.SF_ARCHIVED",
  "category": "標準ライブラリ",
  "syntax": "stat.SF_ARCHIVED",
  "description": "BSD 系のファイルフラグ SF_ARCHIVED。",
  "example": "import stat\nprint(stat.SF_ARCHIVED)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.SF_ARCHIVED"
 },
 {
  "name": "stat.SF_DATALESS",
  "category": "標準ライブラリ",
  "syntax": "stat.SF_DATALESS",
  "description": "BSD 系のファイルフラグ SF_DATALESS。",
  "example": "import stat\nprint(stat.SF_DATALESS)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.SF_DATALESS"
 },
 {
  "name": "stat.SF_FIRMLINK",
  "category": "標準ライブラリ",
  "syntax": "stat.SF_FIRMLINK",
  "description": "BSD 系のファイルフラグ SF_FIRMLINK。",
  "example": "import stat\nprint(stat.SF_FIRMLINK)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.SF_FIRMLINK"
 },
 {
  "name": "stat.SF_IMMUTABLE",
  "category": "標準ライブラリ",
  "syntax": "stat.SF_IMMUTABLE",
  "description": "BSD 系のファイルフラグ SF_IMMUTABLE。",
  "example": "import stat\nprint(stat.SF_IMMUTABLE)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.SF_IMMUTABLE"
 },
 {
  "name": "stat.SF_NOUNLINK",
  "category": "標準ライブラリ",
  "syntax": "stat.SF_NOUNLINK",
  "description": "BSD 系のファイルフラグ SF_NOUNLINK。",
  "example": "import stat\nprint(stat.SF_NOUNLINK)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.SF_NOUNLINK"
 },
 {
  "name": "stat.SF_RESTRICTED",
  "category": "標準ライブラリ",
  "syntax": "stat.SF_RESTRICTED",
  "description": "BSD 系のファイルフラグ SF_RESTRICTED。",
  "example": "import stat\nprint(stat.SF_RESTRICTED)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.SF_RESTRICTED"
 },
 {
  "name": "stat.SF_SETTABLE",
  "category": "標準ライブラリ",
  "syntax": "stat.SF_SETTABLE",
  "description": "BSD 系のファイルフラグ SF_SETTABLE。",
  "example": "import stat\nprint(stat.SF_SETTABLE)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.SF_SETTABLE"
 },
 {
  "name": "stat.SF_SNAPSHOT",
  "category": "標準ライブラリ",
  "syntax": "stat.SF_SNAPSHOT",
  "description": "BSD 系のファイルフラグ SF_SNAPSHOT。",
  "example": "import stat\nprint(stat.SF_SNAPSHOT)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.SF_SNAPSHOT"
 },
 {
  "name": "stat.SF_SUPPORTED",
  "category": "標準ライブラリ",
  "syntax": "stat.SF_SUPPORTED",
  "description": "BSD 系のファイルフラグ SF_SUPPORTED。",
  "example": "import stat\nprint(stat.SF_SUPPORTED)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.SF_SUPPORTED"
 },
 {
  "name": "stat.SF_SYNTHETIC",
  "category": "標準ライブラリ",
  "syntax": "stat.SF_SYNTHETIC",
  "description": "BSD 系のファイルフラグ SF_SYNTHETIC。",
  "example": "import stat\nprint(stat.SF_SYNTHETIC)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.SF_SYNTHETIC"
 },
 {
  "name": "stat.STATX_ATTR_APPEND",
  "category": "標準ライブラリ",
  "syntax": "stat.STATX_ATTR_APPEND",
  "description": "Linux statx の属性ビット STATX_ATTR_APPEND。",
  "example": "import stat\nprint(stat.STATX_ATTR_APPEND)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.STATX_ATTR_APPEND"
 },
 {
  "name": "stat.STATX_ATTR_AUTOMOUNT",
  "category": "標準ライブラリ",
  "syntax": "stat.STATX_ATTR_AUTOMOUNT",
  "description": "Linux statx の属性ビット STATX_ATTR_AUTOMOUNT。",
  "example": "import stat\nprint(stat.STATX_ATTR_AUTOMOUNT)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.STATX_ATTR_AUTOMOUNT"
 },
 {
  "name": "stat.STATX_ATTR_COMPRESSED",
  "category": "標準ライブラリ",
  "syntax": "stat.STATX_ATTR_COMPRESSED",
  "description": "Linux statx の属性ビット STATX_ATTR_COMPRESSED。",
  "example": "import stat\nprint(stat.STATX_ATTR_COMPRESSED)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.STATX_ATTR_COMPRESSED"
 },
 {
  "name": "stat.STATX_ATTR_DAX",
  "category": "標準ライブラリ",
  "syntax": "stat.STATX_ATTR_DAX",
  "description": "Linux statx の属性ビット STATX_ATTR_DAX。",
  "example": "import stat\nprint(stat.STATX_ATTR_DAX)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.STATX_ATTR_DAX"
 },
 {
  "name": "stat.STATX_ATTR_ENCRYPTED",
  "category": "標準ライブラリ",
  "syntax": "stat.STATX_ATTR_ENCRYPTED",
  "description": "Linux statx の属性ビット STATX_ATTR_ENCRYPTED。",
  "example": "import stat\nprint(stat.STATX_ATTR_ENCRYPTED)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.STATX_ATTR_ENCRYPTED"
 },
 {
  "name": "stat.STATX_ATTR_IMMUTABLE",
  "category": "標準ライブラリ",
  "syntax": "stat.STATX_ATTR_IMMUTABLE",
  "description": "Linux statx の属性ビット STATX_ATTR_IMMUTABLE。",
  "example": "import stat\nprint(stat.STATX_ATTR_IMMUTABLE)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.STATX_ATTR_IMMUTABLE"
 },
 {
  "name": "stat.STATX_ATTR_MOUNT_ROOT",
  "category": "標準ライブラリ",
  "syntax": "stat.STATX_ATTR_MOUNT_ROOT",
  "description": "Linux statx の属性ビット STATX_ATTR_MOUNT_ROOT。",
  "example": "import stat\nprint(stat.STATX_ATTR_MOUNT_ROOT)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.STATX_ATTR_MOUNT_ROOT"
 },
 {
  "name": "stat.STATX_ATTR_NODUMP",
  "category": "標準ライブラリ",
  "syntax": "stat.STATX_ATTR_NODUMP",
  "description": "Linux statx の属性ビット STATX_ATTR_NODUMP。",
  "example": "import stat\nprint(stat.STATX_ATTR_NODUMP)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.STATX_ATTR_NODUMP"
 },
 {
  "name": "stat.STATX_ATTR_VERITY",
  "category": "標準ライブラリ",
  "syntax": "stat.STATX_ATTR_VERITY",
  "description": "Linux statx の属性ビット STATX_ATTR_VERITY。",
  "example": "import stat\nprint(stat.STATX_ATTR_VERITY)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.STATX_ATTR_VERITY"
 },
 {
  "name": "stat.STATX_ATTR_WRITE_ATOMIC",
  "category": "標準ライブラリ",
  "syntax": "stat.STATX_ATTR_WRITE_ATOMIC",
  "description": "Linux statx の属性ビット STATX_ATTR_WRITE_ATOMIC。",
  "example": "import stat\nprint(stat.STATX_ATTR_WRITE_ATOMIC)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.STATX_ATTR_WRITE_ATOMIC"
 },
 {
  "name": "stat.ST_ATIME",
  "category": "標準ライブラリ",
  "syntax": "stat.ST_ATIME",
  "description": "os.stat 結果のタプルにおける ST_ATIME のインデックス定数。",
  "example": "import stat\nprint(stat.ST_ATIME)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.ST_ATIME"
 },
 {
  "name": "stat.ST_CTIME",
  "category": "標準ライブラリ",
  "syntax": "stat.ST_CTIME",
  "description": "os.stat 結果のタプルにおける ST_CTIME のインデックス定数。",
  "example": "import stat\nprint(stat.ST_CTIME)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.ST_CTIME"
 },
 {
  "name": "stat.ST_DEV",
  "category": "標準ライブラリ",
  "syntax": "stat.ST_DEV",
  "description": "os.stat 結果のタプルにおける ST_DEV のインデックス定数。",
  "example": "import stat\nprint(stat.ST_DEV)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.ST_DEV"
 },
 {
  "name": "stat.ST_GID",
  "category": "標準ライブラリ",
  "syntax": "stat.ST_GID",
  "description": "os.stat 結果のタプルにおける ST_GID のインデックス定数。",
  "example": "import stat\nprint(stat.ST_GID)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.ST_GID"
 },
 {
  "name": "stat.ST_INO",
  "category": "標準ライブラリ",
  "syntax": "stat.ST_INO",
  "description": "os.stat 結果のタプルにおける ST_INO のインデックス定数。",
  "example": "import stat\nprint(stat.ST_INO)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.ST_INO"
 },
 {
  "name": "stat.ST_MODE",
  "category": "標準ライブラリ",
  "syntax": "stat.ST_MODE",
  "description": "os.stat 結果のタプルにおける ST_MODE のインデックス定数。",
  "example": "import stat\nprint(stat.ST_MODE)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.ST_MODE"
 },
 {
  "name": "stat.ST_MTIME",
  "category": "標準ライブラリ",
  "syntax": "stat.ST_MTIME",
  "description": "os.stat 結果のタプルにおける ST_MTIME のインデックス定数。",
  "example": "import stat\nprint(stat.ST_MTIME)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.ST_MTIME"
 },
 {
  "name": "stat.ST_NLINK",
  "category": "標準ライブラリ",
  "syntax": "stat.ST_NLINK",
  "description": "os.stat 結果のタプルにおける ST_NLINK のインデックス定数。",
  "example": "import stat\nprint(stat.ST_NLINK)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.ST_NLINK"
 },
 {
  "name": "stat.ST_SIZE",
  "category": "標準ライブラリ",
  "syntax": "stat.ST_SIZE",
  "description": "os.stat 結果のタプルにおける ST_SIZE のインデックス定数。",
  "example": "import stat\nprint(stat.ST_SIZE)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.ST_SIZE"
 },
 {
  "name": "stat.ST_UID",
  "category": "標準ライブラリ",
  "syntax": "stat.ST_UID",
  "description": "os.stat 結果のタプルにおける ST_UID のインデックス定数。",
  "example": "import stat\nprint(stat.ST_UID)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.ST_UID"
 },
 {
  "name": "stat.S_ENFMT",
  "category": "標準ライブラリ",
  "syntax": "stat.S_ENFMT",
  "description": "ファイルモードのビット定数 S_ENFMT（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_ENFMT)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_ENFMT"
 },
 {
  "name": "stat.S_IEXEC",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IEXEC",
  "description": "ファイルモードのビット定数 S_IEXEC（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_IEXEC)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IEXEC"
 },
 {
  "name": "stat.S_IFBLK",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IFBLK",
  "description": "ファイル種別を表すビット値 S_IFBLK（S_IFMT の結果と比較する）。",
  "example": "import stat\nprint(stat.S_IFBLK)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IFBLK"
 },
 {
  "name": "stat.S_IFCHR",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IFCHR",
  "description": "ファイル種別を表すビット値 S_IFCHR（S_IFMT の結果と比較する）。",
  "example": "import stat\nprint(stat.S_IFCHR)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IFCHR"
 },
 {
  "name": "stat.S_IFDIR",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IFDIR",
  "description": "ファイル種別を表すビット値 S_IFDIR（S_IFMT の結果と比較する）。",
  "example": "import stat\nprint(stat.S_IFDIR)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IFDIR"
 },
 {
  "name": "stat.S_IFDOOR",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IFDOOR",
  "description": "ファイル種別を表すビット値 S_IFDOOR（S_IFMT の結果と比較する）。",
  "example": "import stat\nprint(stat.S_IFDOOR)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IFDOOR"
 },
 {
  "name": "stat.S_IFIFO",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IFIFO",
  "description": "ファイル種別を表すビット値 S_IFIFO（S_IFMT の結果と比較する）。",
  "example": "import stat\nprint(stat.S_IFIFO)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IFIFO"
 },
 {
  "name": "stat.S_IFLNK",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IFLNK",
  "description": "ファイル種別を表すビット値 S_IFLNK（S_IFMT の結果と比較する）。",
  "example": "import stat\nprint(stat.S_IFLNK)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IFLNK"
 },
 {
  "name": "stat.S_IFMT",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IFMT(mode)",
  "description": "st_mode からIFMT部分を取り出す関数。",
  "example": "import stat\nprint(stat.S_IFMT(33188))",
  "caution": "ビット演算として公式ドキュメントの定義どおりに実装し、CPython 3.12.3 実走で照合した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IFMT"
 },
 {
  "name": "stat.S_IFPORT",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IFPORT",
  "description": "ファイル種別を表すビット値 S_IFPORT（S_IFMT の結果と比較する）。",
  "example": "import stat\nprint(stat.S_IFPORT)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IFPORT"
 },
 {
  "name": "stat.S_IFREG",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IFREG",
  "description": "ファイル種別を表すビット値 S_IFREG（S_IFMT の結果と比較する）。",
  "example": "import stat\nprint(stat.S_IFREG)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IFREG"
 },
 {
  "name": "stat.S_IFSOCK",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IFSOCK",
  "description": "ファイル種別を表すビット値 S_IFSOCK（S_IFMT の結果と比較する）。",
  "example": "import stat\nprint(stat.S_IFSOCK)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IFSOCK"
 },
 {
  "name": "stat.S_IFWHT",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IFWHT",
  "description": "ファイル種別を表すビット値 S_IFWHT（S_IFMT の結果と比較する）。",
  "example": "import stat\nprint(stat.S_IFWHT)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IFWHT"
 },
 {
  "name": "stat.S_IMODE",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IMODE(mode)",
  "description": "st_mode からIMODE部分を取り出す関数。",
  "example": "import stat\nprint(stat.S_IMODE(33188))",
  "caution": "ビット演算として公式ドキュメントの定義どおりに実装し、CPython 3.12.3 実走で照合した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IMODE"
 },
 {
  "name": "stat.S_IREAD",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IREAD",
  "description": "ファイルモードのビット定数 S_IREAD（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_IREAD)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IREAD"
 },
 {
  "name": "stat.S_IRGRP",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IRGRP",
  "description": "ファイルモードのビット定数 S_IRGRP（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_IRGRP)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IRGRP"
 },
 {
  "name": "stat.S_IROTH",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IROTH",
  "description": "ファイルモードのビット定数 S_IROTH（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_IROTH)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IROTH"
 },
 {
  "name": "stat.S_IRUSR",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IRUSR",
  "description": "ファイルモードのビット定数 S_IRUSR（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_IRUSR)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IRUSR"
 },
 {
  "name": "stat.S_IRWXG",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IRWXG",
  "description": "ファイルモードのビット定数 S_IRWXG（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_IRWXG)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IRWXG"
 },
 {
  "name": "stat.S_IRWXO",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IRWXO",
  "description": "ファイルモードのビット定数 S_IRWXO（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_IRWXO)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IRWXO"
 },
 {
  "name": "stat.S_IRWXU",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IRWXU",
  "description": "ファイルモードのビット定数 S_IRWXU（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_IRWXU)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IRWXU"
 },
 {
  "name": "stat.S_ISBLK",
  "category": "標準ライブラリ",
  "syntax": "stat.S_ISBLK(mode)",
  "description": "st_mode が該当する種類かどうかを判定する関数 S_ISBLK。",
  "example": "import stat\nprint(stat.S_ISBLK(25069))",
  "caution": "ビット演算として公式ドキュメントの定義どおりに実装し、CPython 3.12.3 実走で照合した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_ISBLK"
 },
 {
  "name": "stat.S_ISCHR",
  "category": "標準ライブラリ",
  "syntax": "stat.S_ISCHR(mode)",
  "description": "st_mode が該当する種類かどうかを判定する関数 S_ISCHR。",
  "example": "import stat\nprint(stat.S_ISCHR(8685))",
  "caution": "ビット演算として公式ドキュメントの定義どおりに実装し、CPython 3.12.3 実走で照合した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_ISCHR"
 },
 {
  "name": "stat.S_ISDIR",
  "category": "標準ライブラリ",
  "syntax": "stat.S_ISDIR(mode)",
  "description": "st_mode が該当する種類かどうかを判定する関数 S_ISDIR。",
  "example": "import stat\nprint(stat.S_ISDIR(16877))",
  "caution": "ビット演算として公式ドキュメントの定義どおりに実装し、CPython 3.12.3 実走で照合した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_ISDIR"
 },
 {
  "name": "stat.S_ISDOOR",
  "category": "標準ライブラリ",
  "syntax": "stat.S_ISDOOR(mode)",
  "description": "st_mode が該当する種類かどうかを判定する関数 S_ISDOOR。",
  "example": "import stat\nstat.S_ISDOOR()",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_ISDOOR"
 },
 {
  "name": "stat.S_ISFIFO",
  "category": "標準ライブラリ",
  "syntax": "stat.S_ISFIFO(mode)",
  "description": "st_mode が該当する種類かどうかを判定する関数 S_ISFIFO。",
  "example": "import stat\nprint(stat.S_ISFIFO(4589))",
  "caution": "ビット演算として公式ドキュメントの定義どおりに実装し、CPython 3.12.3 実走で照合した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_ISFIFO"
 },
 {
  "name": "stat.S_ISGID",
  "category": "標準ライブラリ",
  "syntax": "stat.S_ISGID",
  "description": "ファイルモードのビット定数 S_ISGID（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_ISGID)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_ISGID"
 },
 {
  "name": "stat.S_ISLNK",
  "category": "標準ライブラリ",
  "syntax": "stat.S_ISLNK(mode)",
  "description": "st_mode が該当する種類かどうかを判定する関数 S_ISLNK。",
  "example": "import stat\nprint(stat.S_ISLNK(41471))",
  "caution": "ビット演算として公式ドキュメントの定義どおりに実装し、CPython 3.12.3 実走で照合した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_ISLNK"
 },
 {
  "name": "stat.S_ISPORT",
  "category": "標準ライブラリ",
  "syntax": "stat.S_ISPORT(mode)",
  "description": "st_mode が該当する種類かどうかを判定する関数 S_ISPORT。",
  "example": "import stat\nstat.S_ISPORT()",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_ISPORT"
 },
 {
  "name": "stat.S_ISREG",
  "category": "標準ライブラリ",
  "syntax": "stat.S_ISREG(mode)",
  "description": "st_mode が該当する種類かどうかを判定する関数 S_ISREG。",
  "example": "import stat\nprint(stat.S_ISREG(33188))",
  "caution": "ビット演算として公式ドキュメントの定義どおりに実装し、CPython 3.12.3 実走で照合した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_ISREG"
 },
 {
  "name": "stat.S_ISSOCK",
  "category": "標準ライブラリ",
  "syntax": "stat.S_ISSOCK(mode)",
  "description": "st_mode が該当する種類かどうかを判定する関数 S_ISSOCK。",
  "example": "import stat\nprint(stat.S_ISSOCK(49663))",
  "caution": "ビット演算として公式ドキュメントの定義どおりに実装し、CPython 3.12.3 実走で照合した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_ISSOCK"
 },
 {
  "name": "stat.S_ISUID",
  "category": "標準ライブラリ",
  "syntax": "stat.S_ISUID",
  "description": "ファイルモードのビット定数 S_ISUID（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_ISUID)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_ISUID"
 },
 {
  "name": "stat.S_ISVTX",
  "category": "標準ライブラリ",
  "syntax": "stat.S_ISVTX",
  "description": "ファイルモードのビット定数 S_ISVTX（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_ISVTX)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_ISVTX"
 },
 {
  "name": "stat.S_ISWHT",
  "category": "標準ライブラリ",
  "syntax": "stat.S_ISWHT(mode)",
  "description": "st_mode が該当する種類かどうかを判定する関数 S_ISWHT。",
  "example": "import stat\nstat.S_ISWHT()",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_ISWHT"
 },
 {
  "name": "stat.S_IWGRP",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IWGRP",
  "description": "ファイルモードのビット定数 S_IWGRP（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_IWGRP)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IWGRP"
 },
 {
  "name": "stat.S_IWOTH",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IWOTH",
  "description": "ファイルモードのビット定数 S_IWOTH（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_IWOTH)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IWOTH"
 },
 {
  "name": "stat.S_IWRITE",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IWRITE",
  "description": "ファイルモードのビット定数 S_IWRITE（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_IWRITE)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IWRITE"
 },
 {
  "name": "stat.S_IWUSR",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IWUSR",
  "description": "ファイルモードのビット定数 S_IWUSR（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_IWUSR)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IWUSR"
 },
 {
  "name": "stat.S_IXGRP",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IXGRP",
  "description": "ファイルモードのビット定数 S_IXGRP（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_IXGRP)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IXGRP"
 },
 {
  "name": "stat.S_IXOTH",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IXOTH",
  "description": "ファイルモードのビット定数 S_IXOTH（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_IXOTH)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IXOTH"
 },
 {
  "name": "stat.S_IXUSR",
  "category": "標準ライブラリ",
  "syntax": "stat.S_IXUSR",
  "description": "ファイルモードのビット定数 S_IXUSR（POSIX の権限・特殊ビット）。",
  "example": "import stat\nprint(stat.S_IXUSR)",
  "caution": "POSIX で値が定まるビット／インデックス定数。CPython 3.12.3 実走で値を確認した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.S_IXUSR"
 },
 {
  "name": "stat.UF_APPEND",
  "category": "標準ライブラリ",
  "syntax": "stat.UF_APPEND",
  "description": "BSD 系のユーザファイルフラグ UF_APPEND。",
  "example": "import stat\nprint(stat.UF_APPEND)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.UF_APPEND"
 },
 {
  "name": "stat.UF_COMPRESSED",
  "category": "標準ライブラリ",
  "syntax": "stat.UF_COMPRESSED",
  "description": "BSD 系のユーザファイルフラグ UF_COMPRESSED。",
  "example": "import stat\nprint(stat.UF_COMPRESSED)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.UF_COMPRESSED"
 },
 {
  "name": "stat.UF_DATAVAULT",
  "category": "標準ライブラリ",
  "syntax": "stat.UF_DATAVAULT",
  "description": "BSD 系のユーザファイルフラグ UF_DATAVAULT。",
  "example": "import stat\nprint(stat.UF_DATAVAULT)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.UF_DATAVAULT"
 },
 {
  "name": "stat.UF_HIDDEN",
  "category": "標準ライブラリ",
  "syntax": "stat.UF_HIDDEN",
  "description": "BSD 系のユーザファイルフラグ UF_HIDDEN。",
  "example": "import stat\nprint(stat.UF_HIDDEN)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.UF_HIDDEN"
 },
 {
  "name": "stat.UF_IMMUTABLE",
  "category": "標準ライブラリ",
  "syntax": "stat.UF_IMMUTABLE",
  "description": "BSD 系のユーザファイルフラグ UF_IMMUTABLE。",
  "example": "import stat\nprint(stat.UF_IMMUTABLE)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.UF_IMMUTABLE"
 },
 {
  "name": "stat.UF_NODUMP",
  "category": "標準ライブラリ",
  "syntax": "stat.UF_NODUMP",
  "description": "BSD 系のユーザファイルフラグ UF_NODUMP。",
  "example": "import stat\nprint(stat.UF_NODUMP)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.UF_NODUMP"
 },
 {
  "name": "stat.UF_NOUNLINK",
  "category": "標準ライブラリ",
  "syntax": "stat.UF_NOUNLINK",
  "description": "BSD 系のユーザファイルフラグ UF_NOUNLINK。",
  "example": "import stat\nprint(stat.UF_NOUNLINK)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.UF_NOUNLINK"
 },
 {
  "name": "stat.UF_OPAQUE",
  "category": "標準ライブラリ",
  "syntax": "stat.UF_OPAQUE",
  "description": "BSD 系のユーザファイルフラグ UF_OPAQUE。",
  "example": "import stat\nprint(stat.UF_OPAQUE)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.UF_OPAQUE"
 },
 {
  "name": "stat.UF_SETTABLE",
  "category": "標準ライブラリ",
  "syntax": "stat.UF_SETTABLE",
  "description": "BSD 系のユーザファイルフラグ UF_SETTABLE。",
  "example": "import stat\nprint(stat.UF_SETTABLE)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.UF_SETTABLE"
 },
 {
  "name": "stat.UF_TRACKED",
  "category": "標準ライブラリ",
  "syntax": "stat.UF_TRACKED",
  "description": "BSD 系のユーザファイルフラグ UF_TRACKED。",
  "example": "import stat\nprint(stat.UF_TRACKED)",
  "caution": "未検証です。この定数の値は特定の OS（Windows／BSD／Linux 拡張）に固有であり、プラットフォームを問う単一の値として確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.UF_TRACKED"
 },
 {
  "name": "stat.filemode",
  "category": "標準ライブラリ",
  "syntax": "stat.filemode(mode)",
  "description": "st_mode を 'drwxr-xr-x' 形式の10文字の文字列へ変換する関数。",
  "example": "import stat\nprint(stat.filemode(33188))",
  "caution": "ビット演算として公式ドキュメントの定義どおりに実装し、CPython 3.12.3 実走で照合した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stat.html#stat.filemode"
 }
];
