/* 高度モード B7 G11 リファレンス：zipimport モジュール（13件）。例外のみ対応。
 * 一次情報：公式ドキュメント 3.15（docs.python.org/ja/3.15）と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
{
 "name": "zipimport.ZipImportError",
 "category": "標準ライブラリ",
 "syntax": "class zipimport.ZipImportError",
 "description": "zipimport 関連のエラーを表す例外（ImportError のサブクラス）。",
 "example": "from zipimport import ZipImportError\ntry:\n    raise ZipImportError(\"bad archive\")\nexcept ZipImportError:\n    print(\"caught\")",
 "caution": "例外クラスとして対応付け済みで、raise と except に使えます。",
 "status": "supported",
 "returns": "ZipImportError のインスタンス",
 "source": "https://docs.python.org/ja/3.15/library/zipimport.html#zipimport.ZipImportError"
},
{
 "name": "zipimport.zipimporter",
 "category": "標準ライブラリ",
 "syntax": "class zipimport.zipimporter(archivepath)",
 "description": "ZIP アーカイブからモジュールをインポートするためのインポータクラス。",
 "example": "import zipimport\nimp = zipimport.zipimporter(\"lib.zip\")\nprint(imp.archive)",
 "caution": "本アプリの高度モードでは未対応です。インポート機構と ZIP アーカイブ実体に依存し、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "zipimporter オブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/zipimport.html#zipimport.zipimporter"
},
{
 "name": "zipimport.zipimporter.archive",
 "category": "標準ライブラリ",
 "syntax": "zipimporter.archive",
 "description": "アーカイブのパス（属性）。",
 "example": "import zipimport\nimp = zipimport.zipimporter(\"lib.zip\")\nprint(imp.archive)",
 "caution": "本アプリの高度モードでは未対応です。インポート機構と ZIP アーカイブ実体に依存し、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "str",
 "source": "https://docs.python.org/ja/3.15/library/zipimport.html#zipimport.zipimporter.archive"
},
{
 "name": "zipimport.zipimporter.create_module",
 "category": "標準ライブラリ",
 "syntax": "zipimporter.create_module(spec)",
 "description": "モジュールを生成します（インポート機構のフック）。",
 "example": "import zipimport\nimp = zipimport.zipimporter(\"lib.zip\")\nspec = imp.find_spec(\"mod\")\nmod = imp.create_module(spec)",
 "caution": "本アプリの高度モードでは未対応です。インポート機構と ZIP アーカイブ実体に依存し、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "モジュールオブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/zipimport.html#zipimport.zipimporter.create_module"
},
{
 "name": "zipimport.zipimporter.exec_module",
 "category": "標準ライブラリ",
 "syntax": "zipimporter.exec_module(module)",
 "description": "モジュールのコードを実行します（インポート機構のフック）。",
 "example": "import zipimport\nimp = zipimport.zipimporter(\"lib.zip\")\nspec = imp.find_spec(\"mod\")\nmod = imp.create_module(spec)\nimp.exec_module(mod)",
 "caution": "本アプリの高度モードでは未対応です。インポート機構と ZIP アーカイブ実体に依存し、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "None",
 "source": "https://docs.python.org/ja/3.15/library/zipimport.html#zipimport.zipimporter.exec_module"
},
{
 "name": "zipimport.zipimporter.find_spec",
 "category": "標準ライブラリ",
 "syntax": "zipimporter.find_spec(fullname, target=None)",
 "description": "モジュールの spec を探します。",
 "example": "import zipimport\nimp = zipimport.zipimporter(\"lib.zip\")\nprint(imp.find_spec(\"mod\"))",
 "caution": "本アプリの高度モードでは未対応です。インポート機構と ZIP アーカイブ実体に依存し、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "ModuleSpec または None",
 "source": "https://docs.python.org/ja/3.15/library/zipimport.html#zipimport.zipimporter.find_spec"
},
{
 "name": "zipimport.zipimporter.get_code",
 "category": "標準ライブラリ",
 "syntax": "zipimporter.get_code(fullname)",
 "description": "モジュールのコードオブジェクトを返します。",
 "example": "import zipimport\nimp = zipimport.zipimporter(\"lib.zip\")\nprint(imp.get_code(\"mod\"))",
 "caution": "本アプリの高度モードでは未対応です。インポート機構と ZIP アーカイブ実体に依存し、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "コードオブジェクト",
 "source": "https://docs.python.org/ja/3.15/library/zipimport.html#zipimport.zipimporter.get_code"
},
{
 "name": "zipimport.zipimporter.get_data",
 "category": "標準ライブラリ",
 "syntax": "zipimporter.get_data(pathname)",
 "description": "アーカイブ内のリソースを bytes で返します。",
 "example": "import zipimport\nimp = zipimport.zipimporter(\"lib.zip\")\nprint(imp.get_data(\"lib.zip/mod/data.txt\"))",
 "caution": "本アプリの高度モードでは未対応です。インポート機構と ZIP アーカイブ実体に依存し、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "bytes",
 "source": "https://docs.python.org/ja/3.15/library/zipimport.html#zipimport.zipimporter.get_data"
},
{
 "name": "zipimport.zipimporter.get_filename",
 "category": "標準ライブラリ",
 "syntax": "zipimporter.get_filename(fullname)",
 "description": "モジュールのファイル名を返します。",
 "example": "import zipimport\nimp = zipimport.zipimporter(\"lib.zip\")\nprint(imp.get_filename(\"mod\"))",
 "caution": "本アプリの高度モードでは未対応です。インポート機構と ZIP アーカイブ実体に依存し、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "str",
 "source": "https://docs.python.org/ja/3.15/library/zipimport.html#zipimport.zipimporter.get_filename"
},
{
 "name": "zipimport.zipimporter.get_source",
 "category": "標準ライブラリ",
 "syntax": "zipimporter.get_source(fullname)",
 "description": "モジュールのソースコードを返します。",
 "example": "import zipimport\nimp = zipimport.zipimporter(\"lib.zip\")\nprint(imp.get_source(\"mod\"))",
 "caution": "本アプリの高度モードでは未対応です。インポート機構と ZIP アーカイブ実体に依存し、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "str または None",
 "source": "https://docs.python.org/ja/3.15/library/zipimport.html#zipimport.zipimporter.get_source"
},
{
 "name": "zipimport.zipimporter.invalidate_caches",
 "category": "標準ライブラリ",
 "syntax": "zipimporter.invalidate_caches()",
 "description": "アーカイブ内容のキャッシュを破棄します。",
 "example": "import zipimport\nimp = zipimport.zipimporter(\"lib.zip\")\nimp.invalidate_caches()\nprint(\"done\")",
 "caution": "本アプリの高度モードでは未対応です。インポート機構と ZIP アーカイブ実体に依存し、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "None",
 "source": "https://docs.python.org/ja/3.15/library/zipimport.html#zipimport.zipimporter.invalidate_caches"
},
{
 "name": "zipimport.zipimporter.is_package",
 "category": "標準ライブラリ",
 "syntax": "zipimporter.is_package(fullname)",
 "description": "モジュールがパッケージかを返します。",
 "example": "import zipimport\nimp = zipimport.zipimporter(\"lib.zip\")\nprint(imp.is_package(\"pkg\"))",
 "caution": "本アプリの高度モードでは未対応です。インポート機構と ZIP アーカイブ実体に依存し、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "bool",
 "source": "https://docs.python.org/ja/3.15/library/zipimport.html#zipimport.zipimporter.is_package"
},
{
 "name": "zipimport.zipimporter.prefix",
 "category": "標準ライブラリ",
 "syntax": "zipimporter.prefix",
 "description": "アーカイブ内のプレフィックスパス（属性）。",
 "example": "import zipimport\nimp = zipimport.zipimporter(\"lib.zip/sub\")\nprint(imp.prefix)",
 "caution": "本アプリの高度モードでは未対応です。インポート機構と ZIP アーカイブ実体に依存し、エンジンに実ファイルシステムがありません。",
 "status": "unsupported",
 "returns": "str",
 "source": "https://docs.python.org/ja/3.15/library/zipimport.html#zipimport.zipimporter.prefix"
}
];
