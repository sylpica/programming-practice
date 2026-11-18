/* 高度モード B7 G11 リファレンス：marshal モジュール（5件）。version のみ対応。
 * 一次情報：公式ドキュメント 3.15（docs.python.org/ja/3.15）と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
{
 "name": "marshal.dump",
 "category": "標準ライブラリ",
 "syntax": "marshal.dump(value, file, version=version)",
 "description": "オブジェクトを marshal 形式でファイルへ書き込みます。",
 "example": "import marshal\nwith open(\"data.bin\", \"wb\") as f:\n    marshal.dump([1, 2, 3], f)",
 "caution": "本アプリの高度モードでは未対応です。ファイルオブジェクトへの書き込みを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "None",
 "source": "https://docs.python.org/ja/3.15/library/marshal.html#marshal.dump"
},
{
 "name": "marshal.dumps",
 "category": "標準ライブラリ",
 "syntax": "marshal.dumps(value, version=version)",
 "description": "オブジェクトを marshal 形式の bytes に変換します。",
 "example": "import marshal\nprint(len(marshal.dumps([1, 2, 3])))",
 "caution": "未検証：marshal 形式は CPython のバージョン依存の内部形式で互換性が保証されず、バイト単位の正確な再現と照合ができません。戻り値が bytes である点も理由に含まれます。",
 "status": "unverified",
 "returns": "bytes",
 "source": "https://docs.python.org/ja/3.15/library/marshal.html#marshal.dumps"
},
{
 "name": "marshal.load",
 "category": "標準ライブラリ",
 "syntax": "marshal.load(file)",
 "description": "ファイルから marshal 形式のオブジェクトを読み込みます。",
 "example": "import marshal\nwith open(\"data.bin\", \"rb\") as f:\n    print(marshal.load(f))",
 "caution": "本アプリの高度モードでは未対応です。ファイルオブジェクトからの読み込みを対象とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "読み込まれたオブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/marshal.html#marshal.load"
},
{
 "name": "marshal.loads",
 "category": "標準ライブラリ",
 "syntax": "marshal.loads(bytes)",
 "description": "marshal 形式の bytes からオブジェクトを復元します。",
 "example": "import marshal\nprint(marshal.loads(marshal.dumps([1, 2, 3])))",
 "caution": "未検証：marshal 形式は CPython のバージョン依存の内部形式で、形式の正確な解釈を照合できません。引数が bytes である点も理由に含まれます。",
 "status": "unverified",
 "returns": "復元されたオブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/marshal.html#marshal.loads"
},
{
 "name": "marshal.version",
 "category": "標準ライブラリ",
 "syntax": "marshal.version",
 "description": "marshal 形式のバージョン（現在は 4）。dump 系の既定値です。",
 "example": "import marshal\nprint(marshal.version)",
 "caution": "値はドキュメント 3.15 と CPython 3.12.3 実走で確認しました。",
 "status": "supported",
 "returns": "int（4）",
 "source": "https://docs.python.org/ja/3.15/library/marshal.html#marshal.version"
}
];
