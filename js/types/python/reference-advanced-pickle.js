/* 高度モード B7 G11 リファレンス：pickle モジュール（23件）。プロトコル定数と例外を対応。
 * 一次情報：公式ドキュメント 3.15（docs.python.org/ja/3.15）と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
{
 "name": "pickle.DEFAULT_PROTOCOL",
 "category": "標準ライブラリ",
 "syntax": "pickle.DEFAULT_PROTOCOL",
 "description": "dumps／dump の既定プロトコル。3.14 以降は 5 です。",
 "example": "import pickle\nprint(pickle.DEFAULT_PROTOCOL)",
 "caution": "値はドキュメント 3.15 で確認しました（3.13 以前は 4 で、ローカルの CPython 3.12.3 実走では 4 です）。",
 "status": "supported",
 "returns": "int（5）",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.DEFAULT_PROTOCOL"
},
{
 "name": "pickle.HIGHEST_PROTOCOL",
 "category": "標準ライブラリ",
 "syntax": "pickle.HIGHEST_PROTOCOL",
 "description": "対応する最高のプロトコル番号（現在は 5）。",
 "example": "import pickle\nprint(pickle.HIGHEST_PROTOCOL)",
 "caution": "値はドキュメント 3.15 と CPython 3.12.3 実走で確認しました。",
 "status": "supported",
 "returns": "int（5）",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.HIGHEST_PROTOCOL"
},
{
 "name": "pickle.PickleBuffer",
 "category": "標準ライブラリ",
 "syntax": "class pickle.PickleBuffer(buffer)",
 "description": "プロトコル 5 の帯域外バッファを受け渡すためのラッパ。",
 "example": "import pickle\nbuf = pickle.PickleBuffer(b\"abc\")\nprint(buf.raw())",
 "caution": "未検証：バッファプロトコル（bytes／memoryview）に依存し、エンジンに bytes の値表現がありません。",
 "status": "unverified",
 "returns": "PickleBuffer オブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.PickleBuffer"
},
{
 "name": "pickle.PickleBuffer.raw",
 "category": "標準ライブラリ",
 "syntax": "PickleBuffer.raw()",
 "description": "連続した読み取り専用の memoryview を返します。",
 "example": "import pickle\nbuf = pickle.PickleBuffer(b\"abc\")\nprint(buf.raw())",
 "caution": "未検証：memoryview を返し、エンジンに bytes の値表現がありません。",
 "status": "unverified",
 "returns": "memoryview",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.PickleBuffer.raw"
},
{
 "name": "pickle.PickleBuffer.release",
 "category": "標準ライブラリ",
 "syntax": "PickleBuffer.release()",
 "description": "保持しているバッファを解放します。",
 "example": "import pickle\nbuf = pickle.PickleBuffer(b\"abc\")\nbuf.release()\nprint(\"released\")",
 "caution": "未検証：バッファプロトコルに依存し、エンジンに bytes の値表現がありません。",
 "status": "unverified",
 "returns": "None",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.PickleBuffer.release"
},
{
 "name": "pickle.PickleError",
 "category": "標準ライブラリ",
 "syntax": "class pickle.PickleError",
 "description": "pickle 関連の全例外の基底クラス（Exception のサブクラス）。",
 "example": "from pickle import PickleError\ntry:\n    raise PickleError(\"bad\")\nexcept PickleError:\n    print(\"caught\")",
 "caution": "例外クラスとして対応付け済みで、raise と except に使えます。",
 "status": "supported",
 "returns": "PickleError のインスタンス",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.PickleError"
},
{
 "name": "pickle.Pickler",
 "category": "標準ライブラリ",
 "syntax": "class pickle.Pickler(file, protocol=None, *, fix_imports=True, buffer_callback=None)",
 "description": "ファイルへ pickle 書き込みを行うオブジェクト。",
 "example": "import pickle\nwith open(\"data.pkl\", \"wb\") as f:\n    p = pickle.Pickler(f)\n    p.dump([1, 2, 3])",
 "caution": "本アプリの高度モードでは未対応です。書き込み先・読み込み元のストリーム（ファイルオブジェクト）を必要とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "Pickler オブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.Pickler"
},
{
 "name": "pickle.Pickler.clear_memo",
 "category": "標準ライブラリ",
 "syntax": "Pickler.clear_memo()",
 "description": "メモ（再帰参照の記録）を空にします。",
 "example": "import pickle\nwith open(\"data.pkl\", \"wb\") as f:\n    p = pickle.Pickler(f)\n    p.clear_memo()",
 "caution": "本アプリの高度モードでは未対応です。書き込み先・読み込み元のストリーム（ファイルオブジェクト）を必要とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "None",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.Pickler.clear_memo"
},
{
 "name": "pickle.Pickler.dispatch_table",
 "category": "標準ライブラリ",
 "syntax": "Pickler.dispatch_table",
 "description": "型ごとの reduce 関数の登録表（copyreg.dispatch_table のコピー）。属性として保持します。",
 "example": "import pickle\nwith open(\"data.pkl\", \"wb\") as f:\n    p = pickle.Pickler(f)\n    print(type(p.dispatch_table))",
 "caution": "本アプリの高度モードでは未対応です。書き込み先・読み込み元のストリーム（ファイルオブジェクト）を必要とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "dict",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.Pickler.dispatch_table"
},
{
 "name": "pickle.Pickler.dump",
 "category": "標準ライブラリ",
 "syntax": "Pickler.dump(obj)",
 "description": "オブジェクトを書き込みます。",
 "example": "import pickle\nwith open(\"data.pkl\", \"wb\") as f:\n    pickle.Pickler(f).dump({\"a\": 1})",
 "caution": "本アプリの高度モードでは未対応です。書き込み先・読み込み元のストリーム（ファイルオブジェクト）を必要とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "None",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.Pickler.dump"
},
{
 "name": "pickle.Pickler.fast",
 "category": "標準ライブラリ",
 "syntax": "Pickler.fast",
 "description": "高速モードのフラグ（後方互換のために残された属性で、現在は効果がありません）。",
 "example": "import pickle\nwith open(\"data.pkl\", \"wb\") as f:\n    p = pickle.Pickler(f)\n    p.fast = 1",
 "caution": "本アプリの高度モードでは未対応です。書き込み先・読み込み元のストリーム（ファイルオブジェクト）を必要とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "int",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.Pickler.fast"
},
{
 "name": "pickle.Pickler.persistent_id",
 "category": "標準ライブラリ",
 "syntax": "Pickler.persistent_id(obj)",
 "description": "永続 ID を返すためにサブクラスで上書きするメソッド。既定では None を返します。",
 "example": "import pickle\nclass MyPickler(pickle.Pickler):\n    def persistent_id(self, obj):\n        return None",
 "caution": "本アプリの高度モードでは未対応です。書き込み先・読み込み元のストリーム（ファイルオブジェクト）を必要とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "永続 ID または None",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.Pickler.persistent_id"
},
{
 "name": "pickle.Pickler.reducer_override",
 "category": "標準ライブラリ",
 "syntax": "Pickler.reducer_override(obj)",
 "description": "型ごとの変換を上書きするためにサブクラスで定義するメソッド（3.8 で追加）。",
 "example": "import pickle\nclass MyPickler(pickle.Pickler):\n    def reducer_override(self, obj):\n        return NotImplemented",
 "caution": "本アプリの高度モードでは未対応です。書き込み先・読み込み元のストリーム（ファイルオブジェクト）を必要とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "reduce 用のタプルまたは NotImplemented",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.Pickler.reducer_override"
},
{
 "name": "pickle.PicklingError",
 "category": "標準ライブラリ",
 "syntax": "class pickle.PicklingError",
 "description": "オブジェクトを pickle 化できないときに送出される例外（PickleError のサブクラス）。",
 "example": "from pickle import PicklingError\ntry:\n    raise PicklingError(\"cannot pickle\")\nexcept PicklingError:\n    print(\"caught\")",
 "caution": "例外クラスとして対応付け済みで、raise と except に使えます。",
 "status": "supported",
 "returns": "PicklingError のインスタンス",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.PicklingError"
},
{
 "name": "pickle.Unpickler",
 "category": "標準ライブラリ",
 "syntax": "class pickle.Unpickler(file, *, fix_imports=True, encoding=\"ASCII\", errors=\"strict\", buffers=None)",
 "description": "ファイルから pickle 読み込みを行うオブジェクト。",
 "example": "import pickle\nwith open(\"data.pkl\", \"rb\") as f:\n    print(pickle.Unpickler(f).load())",
 "caution": "本アプリの高度モードでは未対応です。書き込み先・読み込み元のストリーム（ファイルオブジェクト）を必要とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "Unpickler オブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.Unpickler"
},
{
 "name": "pickle.Unpickler.find_class",
 "category": "標準ライブラリ",
 "syntax": "Unpickler.find_class(module, name)",
 "description": "グローバル（クラスや関数）を名前から取得します。サブクラスで制限できます。",
 "example": "import pickle\nclass MyUnpickler(pickle.Unpickler):\n    def find_class(self, module, name):\n        return super().find_class(module, name)",
 "caution": "本アプリの高度モードでは未対応です。書き込み先・読み込み元のストリーム（ファイルオブジェクト）を必要とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "クラスまたは関数",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.Unpickler.find_class"
},
{
 "name": "pickle.Unpickler.load",
 "category": "標準ライブラリ",
 "syntax": "Unpickler.load()",
 "description": "オブジェクトを 1 つ読み込んで返します。",
 "example": "import pickle\nwith open(\"data.pkl\", \"rb\") as f:\n    u = pickle.Unpickler(f)\n    print(u.load())",
 "caution": "本アプリの高度モードでは未対応です。書き込み先・読み込み元のストリーム（ファイルオブジェクト）を必要とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "読み込まれたオブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.Unpickler.load"
},
{
 "name": "pickle.Unpickler.persistent_load",
 "category": "標準ライブラリ",
 "syntax": "Unpickler.persistent_load(pid)",
 "description": "永続 ID からオブジェクトを返すためにサブクラスで上書きするメソッド。既定では UnpicklingError を送出します。",
 "example": "import pickle\nclass MyUnpickler(pickle.Unpickler):\n    def persistent_load(self, pid):\n        raise pickle.UnpicklingError(\"unsupported\")",
 "caution": "本アプリの高度モードでは未対応です。書き込み先・読み込み元のストリーム（ファイルオブジェクト）を必要とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "オブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.Unpickler.persistent_load"
},
{
 "name": "pickle.UnpicklingError",
 "category": "標準ライブラリ",
 "syntax": "class pickle.UnpicklingError",
 "description": "壊れた pickle データを復元しようとしたときに送出される例外（PickleError のサブクラス）。",
 "example": "from pickle import UnpicklingError\ntry:\n    raise UnpicklingError(\"bad data\")\nexcept UnpicklingError:\n    print(\"caught\")",
 "caution": "例外クラスとして対応付け済みで、raise と except に使えます。",
 "status": "supported",
 "returns": "UnpicklingError のインスタンス",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.UnpicklingError"
},
{
 "name": "pickle.dump",
 "category": "標準ライブラリ",
 "syntax": "pickle.dump(obj, file, protocol=None, *, fix_imports=True, buffer_callback=None)",
 "description": "オブジェクトを pickle 形式でファイルへ書き込みます。",
 "example": "import pickle\nwith open(\"data.pkl\", \"wb\") as f:\n    pickle.dump([1, 2, 3], f)",
 "caution": "本アプリの高度モードでは未対応です。書き込み先・読み込み元のストリーム（ファイルオブジェクト）を必要とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "None",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.dump"
},
{
 "name": "pickle.dumps",
 "category": "標準ライブラリ",
 "syntax": "pickle.dumps(obj, protocol=None, *, fix_imports=True, buffer_callback=None)",
 "description": "オブジェクトを pickle 形式の bytes に変換します。",
 "example": "import pickle\nprint(len(pickle.dumps([1, 2, 3])))",
 "caution": "未検証：戻り値が bytes でエンジンに bytes の値表現がなく、プロトコル形式のバイト単位の正確性も照合できません。",
 "status": "unverified",
 "returns": "bytes",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.dumps"
},
{
 "name": "pickle.load",
 "category": "標準ライブラリ",
 "syntax": "pickle.load(file, *, fix_imports=True, encoding=\"ASCII\", errors=\"strict\", buffers=None)",
 "description": "ファイルから pickle 形式のオブジェクトを読み込みます。",
 "example": "import pickle\nwith open(\"data.pkl\", \"rb\") as f:\n    print(pickle.load(f))",
 "caution": "本アプリの高度モードでは未対応です。書き込み先・読み込み元のストリーム（ファイルオブジェクト）を必要とし、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "読み込まれたオブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.load"
},
{
 "name": "pickle.loads",
 "category": "標準ライブラリ",
 "syntax": "pickle.loads(data, /, *, fix_imports=True, encoding=\"ASCII\", errors=\"strict\", buffers=None)",
 "description": "pickle 形式の bytes からオブジェクトを復元します。",
 "example": "import pickle\nprint(pickle.loads(pickle.dumps([1, 2, 3])))",
 "caution": "未検証：引数が bytes でエンジンに bytes の値表現がなく、任意オブジェクトの再構成まで含む形式の正確性を照合できません。信頼できないデータの復元は任意コード実行につながる点にも注意が必要です。",
 "status": "unverified",
 "returns": "復元されたオブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/pickle.html#pickle.loads"
}
];
