/* 高度モード B7 G11 リファレンス：bz2 モジュール（21件）。ファイルクラスは未対応、圧縮・展開は bytes のため未検証。
 * 一次情報：公式ドキュメント 3.15（docs.python.org/ja/3.15）と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
{
 "name": "bz2.BZ2Compressor",
 "category": "標準ライブラリ",
 "syntax": "class bz2.BZ2Compressor(compresslevel=9)",
 "description": "逐次圧縮オブジェクト。",
 "example": "import bz2\nc = bz2.BZ2Compressor()\ndata = c.compress(b\"abc\") + c.flush()\nprint(len(data))",
 "caution": "未検証：bytes のストリーミング処理で、エンジンに bytes の値表現がありません。",
 "status": "unverified",
 "returns": "BZ2Compressor オブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2Compressor"
},
{
 "name": "bz2.BZ2Compressor.compress",
 "category": "標準ライブラリ",
 "syntax": "BZ2Compressor.compress(data)",
 "description": "データ片を圧縮し、出力可能な分を返します。",
 "example": "import bz2\nc = bz2.BZ2Compressor()\nprint(c.compress(b\"abc\"))",
 "caution": "未検証：bytes のストリーミング処理で、エンジンに bytes の値表現がありません。",
 "status": "unverified",
 "returns": "bytes",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2Compressor.compress"
},
{
 "name": "bz2.BZ2Compressor.flush",
 "category": "標準ライブラリ",
 "syntax": "BZ2Compressor.flush()",
 "description": "圧縮を完了し、残りの出力を返します。以後は再利用できません。",
 "example": "import bz2\nc = bz2.BZ2Compressor()\nc.compress(b\"abc\")\nprint(c.flush())",
 "caution": "未検証：bytes のストリーミング処理で、エンジンに bytes の値表現がありません。",
 "status": "unverified",
 "returns": "bytes",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2Compressor.flush"
},
{
 "name": "bz2.BZ2Decompressor",
 "category": "標準ライブラリ",
 "syntax": "class bz2.BZ2Decompressor()",
 "description": "逐次展開オブジェクト。連結されたストリームにも対応します。",
 "example": "import bz2\nd = bz2.BZ2Decompressor()\nprint(d.decompress(bz2.compress(b\"abc\")))",
 "caution": "未検証：bytes のストリーミング処理で、エンジンに bytes の値表現がありません。",
 "status": "unverified",
 "returns": "BZ2Decompressor オブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2Decompressor"
},
{
 "name": "bz2.BZ2Decompressor.decompress",
 "category": "標準ライブラリ",
 "syntax": "BZ2Decompressor.decompress(data, max_length=-1)",
 "description": "データ片を展開します。max_length で出力の上限を指定できます。",
 "example": "import bz2\nd = bz2.BZ2Decompressor()\nprint(d.decompress(bz2.compress(b\"abc\")))",
 "caution": "未検証：bytes のストリーミング処理で、エンジンに bytes の値表現がありません。",
 "status": "unverified",
 "returns": "bytes",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2Decompressor.decompress"
},
{
 "name": "bz2.BZ2Decompressor.eof",
 "category": "標準ライブラリ",
 "syntax": "BZ2Decompressor.eof",
 "description": "ストリームの終端に達したか（属性）。",
 "example": "import bz2\nd = bz2.BZ2Decompressor()\nprint(d.eof)",
 "caution": "未検証：bytes のストリーミング処理で、エンジンに bytes の値表現がありません。",
 "status": "unverified",
 "returns": "bool",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2Decompressor.eof"
},
{
 "name": "bz2.BZ2Decompressor.needs_input",
 "category": "標準ライブラリ",
 "syntax": "BZ2Decompressor.needs_input",
 "description": "さらにデータを必要としているか（属性）。",
 "example": "import bz2\nd = bz2.BZ2Decompressor()\nprint(d.needs_input)",
 "caution": "未検証：bytes のストリーミング処理で、エンジンに bytes の値表現がありません。",
 "status": "unverified",
 "returns": "bool",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2Decompressor.needs_input"
},
{
 "name": "bz2.BZ2Decompressor.unused_data",
 "category": "標準ライブラリ",
 "syntax": "BZ2Decompressor.unused_data",
 "description": "圧縮ストリームの終端より後ろにあったデータ（属性）。",
 "example": "import bz2\nd = bz2.BZ2Decompressor()\nprint(d.unused_data)",
 "caution": "未検証：bytes のストリーミング処理で、エンジンに bytes の値表現がありません。",
 "status": "unverified",
 "returns": "bytes",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2Decompressor.unused_data"
},
{
 "name": "bz2.BZ2File",
 "category": "標準ライブラリ",
 "syntax": "class bz2.BZ2File(filename, mode=\"r\", *, compresslevel=9)",
 "description": "bzip2 圧縮ファイルを読み書きするファイルオブジェクト。",
 "example": "import bz2\nwith bz2.open(\"a.bz2\", \"wb\") as f:\n    f.write(b\"hello\")",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "BZ2File オブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2File"
},
{
 "name": "bz2.BZ2File.fileno",
 "category": "標準ライブラリ",
 "syntax": "BZ2File.fileno()",
 "description": "背後のファイル記述子を返します。",
 "example": "import bz2\nwith bz2.open(\"a.bz2\", \"rb\") as f:\n    print(f.fileno())",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "int",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2File.fileno"
},
{
 "name": "bz2.BZ2File.mode",
 "category": "標準ライブラリ",
 "syntax": "BZ2File.mode",
 "description": "ファイルを開いたモードを表す文字列（属性）。",
 "example": "import bz2\nwith bz2.open(\"a.bz2\", \"rb\") as f:\n    print(f.mode)",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "str",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2File.mode"
},
{
 "name": "bz2.BZ2File.name",
 "category": "標準ライブラリ",
 "syntax": "BZ2File.name",
 "description": "ファイルの名前（属性）。",
 "example": "import bz2\nwith bz2.open(\"a.bz2\", \"rb\") as f:\n    print(f.name)",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "str",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2File.name"
},
{
 "name": "bz2.BZ2File.peek",
 "category": "標準ライブラリ",
 "syntax": "BZ2File.peek(n=0)",
 "description": "読み取り位置を進めずに先読みします（バッファ付き読み取り）。",
 "example": "import bz2\nwith bz2.open(\"a.bz2\", \"rb\") as f:\n    print(f.peek(4))",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "bytes",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2File.peek"
},
{
 "name": "bz2.BZ2File.read1",
 "category": "標準ライブラリ",
 "syntax": "BZ2File.read1(size=-1)",
 "description": "最大で1回の読み取りでデータを読みます。",
 "example": "import bz2\nwith bz2.open(\"a.bz2\", \"rb\") as f:\n    print(f.read1())",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "bytes",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2File.read1"
},
{
 "name": "bz2.BZ2File.readable",
 "category": "標準ライブラリ",
 "syntax": "BZ2File.readable()",
 "description": "読み取り可能かを返します。",
 "example": "import bz2\nwith bz2.open(\"a.bz2\", \"rb\") as f:\n    print(f.readable())",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "bool",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2File.readable"
},
{
 "name": "bz2.BZ2File.readinto",
 "category": "標準ライブラリ",
 "syntax": "BZ2File.readinto(b)",
 "description": "展開しながらバッファ b へ読み込み、読み込んだバイト数を返します。",
 "example": "import bz2\nbuf = bytearray(4)\nwith bz2.open(\"a.bz2\", \"rb\") as f:\n    print(f.readinto(buf))",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "int",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2File.readinto"
},
{
 "name": "bz2.BZ2File.seekable",
 "category": "標準ライブラリ",
 "syntax": "BZ2File.seekable()",
 "description": "シーク可能かを返します。",
 "example": "import bz2\nwith bz2.open(\"a.bz2\", \"rb\") as f:\n    print(f.seekable())",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "bool",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2File.seekable"
},
{
 "name": "bz2.BZ2File.writable",
 "category": "標準ライブラリ",
 "syntax": "BZ2File.writable()",
 "description": "書き込み可能かを返します。",
 "example": "import bz2\nwith bz2.open(\"a.bz2\", \"wb\") as f:\n    print(f.writable())",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "bool",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.BZ2File.writable"
},
{
 "name": "bz2.compress",
 "category": "標準ライブラリ",
 "syntax": "bz2.compress(data, compresslevel=9)",
 "description": "データを bzip2 形式で一括圧縮します。",
 "example": "import bz2\nprint(len(bz2.compress(b\"hello hello\")))",
 "caution": "未検証：bytes のストリーミング処理で、エンジンに bytes の値表現がありません。",
 "status": "unverified",
 "returns": "bytes",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.compress"
},
{
 "name": "bz2.decompress",
 "category": "標準ライブラリ",
 "syntax": "bz2.decompress(data)",
 "description": "bzip2 形式のデータを一括展開します。",
 "example": "import bz2\nprint(bz2.decompress(bz2.compress(b\"abc\")))",
 "caution": "未検証：bytes のストリーミング処理で、エンジンに bytes の値表現がありません。",
 "status": "unverified",
 "returns": "bytes",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.decompress"
},
{
 "name": "bz2.open",
 "category": "標準ライブラリ",
 "syntax": "bz2.open(filename, mode=\"rb\", *, compresslevel=9, encoding=None, errors=None, newline=None)",
 "description": "bzip2 圧縮ファイルを開くファクトリ関数。",
 "example": "import bz2\nwith bz2.open(\"a.txt.bz2\", \"rt\") as f:\n    print(f.read())",
 "caution": "本アプリの高度モードでは未対応です。実ファイルを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "BZ2File オブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/bz2.html#bz2.open"
}
];
