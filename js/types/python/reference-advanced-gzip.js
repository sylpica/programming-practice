/* 高度モード B7 G11 リファレンス：gzip モジュール（9件）。例外のみ対応。
 * 一次情報：公式ドキュメント 3.15（docs.python.org/ja/3.15）と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
{
 "name": "gzip.BadGzipFile",
 "category": "標準ライブラリ",
 "syntax": "class gzip.BadGzipFile",
 "description": "gzip ファイルでない、または壊れているときに送出される例外（OSError のサブクラス）。",
 "example": "from gzip import BadGzipFile\ntry:\n    raise BadGzipFile(\"not a gzip file\")\nexcept BadGzipFile:\n    print(\"caught\")",
 "caution": "例外クラスとして対応付け済みで、raise と except に使えます。",
 "status": "supported",
 "returns": "BadGzipFile のインスタンス",
 "source": "https://docs.python.org/ja/3.15/library/gzip.html#gzip.BadGzipFile"
},
{
 "name": "gzip.GzipFile",
 "category": "標準ライブラリ",
 "syntax": "class gzip.GzipFile(filename=None, mode=None, compresslevel=9, fileobj=None, mtime=None)",
 "description": "gzip 圧縮ファイルを読み書きするファイルオブジェクト。",
 "example": "import gzip\nwith gzip.open(\"a.gz\", \"wb\") as f:\n    f.write(b\"hello\")",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "GzipFile オブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/gzip.html#gzip.GzipFile"
},
{
 "name": "gzip.GzipFile.mode",
 "category": "標準ライブラリ",
 "syntax": "GzipFile.mode",
 "description": "ファイルを書き込み用（WRITE）か読み取り用（READ）かを示す内部的なモード値（属性）。",
 "example": "import gzip\nwith gzip.open(\"a.gz\", \"rb\") as f:\n    print(f.mode)",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "int",
 "source": "https://docs.python.org/ja/3.15/library/gzip.html#gzip.GzipFile.mode"
},
{
 "name": "gzip.GzipFile.mtime",
 "category": "標準ライブラリ",
 "syntax": "GzipFile.mtime",
 "description": "読み取り時：ヘッダに記録された更新時刻。書き込み時に指定した mtime も保持します（属性）。",
 "example": "import gzip\nwith gzip.open(\"a.gz\", \"rb\") as f:\n    print(f.mtime)",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "int または None",
 "source": "https://docs.python.org/ja/3.15/library/gzip.html#gzip.GzipFile.mtime"
},
{
 "name": "gzip.GzipFile.name",
 "category": "標準ライブラリ",
 "syntax": "GzipFile.name",
 "description": "ファイルの名前（属性）。",
 "example": "import gzip\nwith gzip.open(\"a.gz\", \"rb\") as f:\n    print(f.name)",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "str",
 "source": "https://docs.python.org/ja/3.15/library/gzip.html#gzip.GzipFile.name"
},
{
 "name": "gzip.GzipFile.peek",
 "category": "標準ライブラリ",
 "syntax": "GzipFile.peek(n=0)",
 "description": "読み取り位置を進めずに先読みします。",
 "example": "import gzip\nwith gzip.open(\"a.gz\", \"rb\") as f:\n    print(f.peek(4))",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "bytes",
 "source": "https://docs.python.org/ja/3.15/library/gzip.html#gzip.GzipFile.peek"
},
{
 "name": "gzip.compress",
 "category": "標準ライブラリ",
 "syntax": "gzip.compress(data, compresslevel=9, *, mtime=None)",
 "description": "データを gzip 形式で一括圧縮します。",
 "example": "import gzip\nprint(len(gzip.compress(b\"hello hello\")))",
 "caution": "未検証：bytes を入出力とし、エンジンに bytes の値表現がありません。",
 "status": "unverified",
 "returns": "bytes",
 "source": "https://docs.python.org/ja/3.15/library/gzip.html#gzip.compress"
},
{
 "name": "gzip.decompress",
 "category": "標準ライブラリ",
 "syntax": "gzip.decompress(data)",
 "description": "gzip 形式のデータを一括展開します。連結されたメンバーにも対応します。",
 "example": "import gzip\nprint(gzip.decompress(gzip.compress(b\"abc\")))",
 "caution": "未検証：bytes を入出力とし、エンジンに bytes の値表現がありません。",
 "status": "unverified",
 "returns": "bytes",
 "source": "https://docs.python.org/ja/3.15/library/gzip.html#gzip.decompress"
},
{
 "name": "gzip.open",
 "category": "標準ライブラリ",
 "syntax": "gzip.open(filename, mode=\"rb\", compresslevel=9, encoding=None, errors=None, newline=None)",
 "description": "gzip 圧縮ファイルを開くファクトリ関数。",
 "example": "import gzip\nwith gzip.open(\"a.txt.gz\", \"rt\") as f:\n    print(f.read())",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "GzipFile オブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/gzip.html#gzip.open"
}
];
