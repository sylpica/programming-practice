/* 高度モード B7 G11 リファレンス：pkgutil モジュール（8件）。モジュール探索は環境依存のため未対応、ModuleInfo は未検証。
 * 一次情報：公式ドキュメント 3.15（docs.python.org/ja/3.15）と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
{
 "name": "pkgutil.ModuleInfo",
 "category": "標準ライブラリ",
 "syntax": "class pkgutil.ModuleInfo(module_finder, name, ispkg)",
 "description": "iter_modules 等が返す (module_finder, name, ispkg) の namedtuple。",
 "example": "import pkgutil\nfor info in pkgutil.iter_modules():\n    print(info.name)",
 "caution": "未検証：namedtuple のタプルとしての振る舞いとインポータオブジェクトの保持を含み、その範囲の再現・照合ができません。",
 "status": "unverified",
 "returns": "ModuleInfo オブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/pkgutil.html#pkgutil.ModuleInfo"
},
{
 "name": "pkgutil.extend_path",
 "category": "標準ライブラリ",
 "syntax": "pkgutil.extend_path(path, name)",
 "description": "名前空間パッケージのために探索パスを拡張します。",
 "example": "import pkgutil\npath = pkgutil.extend_path(__path__, __name__)\nprint(path)",
 "caution": "本アプリの高度モードでは未対応です。モジュール探索（sys.path とインポータ）に依存し、実行環境によって結果が変わります。",
 "status": "unsupported",
 "returns": "拡張されたパスのリスト",
 "source": "https://docs.python.org/ja/3.15/library/pkgutil.html#pkgutil.extend_path"
},
{
 "name": "pkgutil.get_data",
 "category": "標準ライブラリ",
 "syntax": "pkgutil.get_data(package, resource)",
 "description": "パッケージのリソースを bytes で返します。",
 "example": "import pkgutil\ndata = pkgutil.get_data(\"mypkg\", \"data.txt\")\nprint(len(data))",
 "caution": "本アプリの高度モードでは未対応です。パッケージのリソース（実ファイル）を読み込む操作であり、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "bytes",
 "source": "https://docs.python.org/ja/3.15/library/pkgutil.html#pkgutil.get_data"
},
{
 "name": "pkgutil.get_importer",
 "category": "標準ライブラリ",
 "syntax": "pkgutil.get_importer(path_item)",
 "description": "パス要素に対するインポータを返します。",
 "example": "import pkgutil\nprint(pkgutil.get_importer(\"/some/dir\"))",
 "caution": "本アプリの高度モードでは未対応です。モジュール探索（sys.path とインポータ）に依存し、実行環境によって結果が変わります。",
 "status": "unsupported",
 "returns": "インポータオブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/pkgutil.html#pkgutil.get_importer"
},
{
 "name": "pkgutil.iter_importers",
 "category": "標準ライブラリ",
 "syntax": "pkgutil.iter_importers(fullname=\"\")",
 "description": "モジュールに対応するインポータを順に返します。",
 "example": "import pkgutil\nfor imp in pkgutil.iter_importers(\"json\"):\n    print(imp)",
 "caution": "本アプリの高度モードでは未対応です。モジュール探索（sys.path とインポータ）に依存し、実行環境によって結果が変わります。",
 "status": "unsupported",
 "returns": "インポータのイテレータ",
 "source": "https://docs.python.org/ja/3.15/library/pkgutil.html#pkgutil.iter_importers"
},
{
 "name": "pkgutil.iter_modules",
 "category": "標準ライブラリ",
 "syntax": "pkgutil.iter_modules(path=None, prefix=\"\")",
 "description": "探索可能なモジュールを ModuleInfo で順に返します。",
 "example": "import pkgutil\nfor info in pkgutil.iter_modules():\n    print(info.name)",
 "caution": "本アプリの高度モードでは未対応です。モジュール探索（sys.path とインポータ）に依存し、実行環境によって結果が変わります。",
 "status": "unsupported",
 "returns": "ModuleInfo のイテレータ",
 "source": "https://docs.python.org/ja/3.15/library/pkgutil.html#pkgutil.iter_modules"
},
{
 "name": "pkgutil.resolve_name",
 "category": "標準ライブラリ",
 "syntax": "pkgutil.resolve_name(name)",
 "description": "\"module:attr\" 形式の名前を解決してオブジェクトを返します。",
 "example": "import pkgutil\ncls = pkgutil.resolve_name(\"json:JSONDecoder\")\nprint(cls)",
 "caution": "本アプリの高度モードでは未対応です。名前解決のために実際のインポートを行い、実行環境に依存します。",
 "status": "unsupported",
 "returns": "解決されたオブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/pkgutil.html#pkgutil.resolve_name"
},
{
 "name": "pkgutil.walk_packages",
 "category": "標準ライブラリ",
 "syntax": "pkgutil.walk_packages(path=None, prefix=\"\", onerror=None)",
 "description": "全モジュールを再帰的に ModuleInfo で順に返します。",
 "example": "import pkgutil\nfor info in pkgutil.walk_packages():\n    print(info.name)",
 "caution": "本アプリの高度モードでは未対応です。モジュール探索（sys.path とインポータ）に依存し、実行環境によって結果が変わります。",
 "status": "unsupported",
 "returns": "ModuleInfo のイテレータ",
 "source": "https://docs.python.org/ja/3.15/library/pkgutil.html#pkgutil.walk_packages"
}
];
