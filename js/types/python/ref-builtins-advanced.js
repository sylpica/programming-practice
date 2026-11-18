// 高度モード（ブロックB6・Python班1）：組み込み関数・定数・例外の高度差分。
// 契約形式（advanced-interface.md 第4章・第5章）：正規形＋status 必須。
// 基礎に同名がある項目（open）は referenceOverrides へ分離した。
// 一次情報は docs.python.org/3（3.15系）の該当アンカー。

export const referenceAdvanced = [
 {
  "name": "ascii",
  "category": "組み込み関数",
  "syntax": "ascii(obj)",
  "description": "repr() と同じ表示を作り、非 ASCII 文字を \\xXX／\\uXXXX／\\UXXXXXXXX のエスケープに置き換えて返す関数。",
  "example": "print(ascii(\"é\"))",
  "caution": "引数そのものではなく repr() の結果がエスケープ対象になる。値が実行時に決まる場合は結果も「実行時に決まる値」になる。",
  "status": "supported",
  "returns": "str: 非 ASCII 文字をエスケープした repr 文字列",
  "source": "https://docs.python.org/3/library/functions.html#ascii"
 },
 {
  "name": "callable",
  "category": "組み込み関数",
  "syntax": "callable(obj)",
  "description": "オブジェクトが呼び出し可能（関数・クラス・__call__ を持つインスタンス）かどうかを判定する関数。",
  "example": "print(callable(len), callable(5))",
  "caution": "クラスそのものも呼び出し可能（インスタンスを作れる）ため True になる。__call__ を持つインスタンスも True。",
  "status": "supported",
  "returns": "bool: 呼び出し可能なら True",
  "source": "https://docs.python.org/3/library/functions.html#callable"
 },
 {
  "name": "delattr",
  "category": "組み込み関数",
  "syntax": "delattr(obj, name)",
  "description": "オブジェクトの属性を名前（文字列）で指定して削除する関数。del obj.name と同じ。",
  "example": "class A:\n    pass\na = A()\na.x = 1\ndelattr(a, \"x\")\nprint(hasattr(a, \"x\"))",
  "caution": "存在しない属性を消そうとすると AttributeError。インスタンスからクラス属性は消せない（クラス属性しか無い場合も AttributeError）。",
  "status": "supported",
  "returns": "None",
  "source": "https://docs.python.org/3/library/functions.html#delattr"
 },
 {
  "name": "dir",
  "category": "組み込み関数",
  "syntax": "dir()\ndir(obj)",
  "description": "引数なしでは現在のスコープの名前一覧を、引数ありではそのオブジェクトの属性名一覧を、ソート済みリストで返す関数。",
  "example": "x = 1\ny = 2\nprint(dir())",
  "caution": "このエンジンでは、組み込み型についてはエンジンが知っているメソッド・属性名だけを返し、__len__ などのダンダ―名までは返さない。dir() の結果は「その時点で定義済みの名前」だけになる。",
  "status": "supported",
  "returns": "list: 名前（文字列）のソート済みリスト",
  "source": "https://docs.python.org/3/library/functions.html#dir"
 },
 {
  "name": "getattr",
  "category": "組み込み関数",
  "syntax": "getattr(obj, name)\ngetattr(obj, name, default)",
  "description": "オブジェクトの属性を名前（文字列）で指定して取得する関数。obj.name と同じ。3つ目の引数で「無いときの既定値」を渡せる。",
  "example": "class A:\n    x = 10\na = A()\nprint(getattr(a, \"x\"))",
  "caution": "名前は文字列で渡す（getattr(a, x) ではない）。属性が無い場合、既定値を渡していないと AttributeError になる。",
  "status": "supported",
  "returns": "属性の値（無い場合は default、default が無ければ AttributeError）",
  "source": "https://docs.python.org/3/library/functions.html#getattr"
 },
 {
  "name": "globals",
  "category": "組み込み関数",
  "syntax": "globals()",
  "description": "現在のモジュールの大域変数を表す辞書を返す関数。",
  "example": "a = 10\nprint(sorted(globals()))",
  "caution": "このエンジンでは、返る辞書は呼び出し時点のスナップショットで、ユーザー定義の名前だけを含む（__builtins__ などの自動で入る名前は含まない）。返した辞書を書き換えても元の変数には反映されない。",
  "status": "supported",
  "returns": "dict: 大域名→値の辞書",
  "source": "https://docs.python.org/3/library/functions.html#globals"
 },
 {
  "name": "hasattr",
  "category": "組み込み関数",
  "syntax": "hasattr(obj, name)",
  "description": "オブジェクトが指定した名前の属性を持つかどうかを判定する関数。",
  "example": "class A:\n    x = 10\na = A()\nprint(hasattr(a, \"x\"), hasattr(a, \"y\"))",
  "caution": "名前は文字列で渡す。実 CPython では、属性の取得中に起きた例外は（AttributeError 以外も含め）すべて飲み込まず伝播する点に注意（このエンジンでも、判定できない対象は「実行時に決まる値」として扱う）。",
  "status": "supported",
  "returns": "bool: 属性があれば True、無ければ False",
  "source": "https://docs.python.org/3/library/functions.html#hasattr"
 },
 {
  "name": "hash",
  "category": "組み込み関数",
  "syntax": "hash(obj)",
  "description": "オブジェクトのハッシュ値（辞書のキーや集合の要素に使われる整数）を返す関数。",
  "example": "print(hash(42), hash(-1), hash(1.0))",
  "caution": "リスト・辞書・集合はハッシュできず TypeError。文字列・bytes・None のハッシュは実行ごとに変わりうるため、このエンジンでは「実行時に決まる値」になる。数値のハッシュは CPython のアルゴリズムで計算するが、値が大きすぎるハッシュ（一部の小数のハッシュ等）は正確に表せないため「実行時に決まる値」に倒す。タプルのハッシュは要素がすべてハッシュ可能なときだけ計算する。",
  "status": "supported",
  "returns": "int: ハッシュ値",
  "source": "https://docs.python.org/3/library/functions.html#hash"
 },
 {
  "name": "id",
  "category": "組み込み関数",
  "syntax": "id(obj)",
  "description": "オブジェクトの識別値（生存期間中は一意で不変な整数）を返す関数。is 演算子の比較に使われる値。",
  "example": "x = [1, 2]\nprint(id(x))",
  "caution": "識別値はメモリアドレスに由来し実行ごとに変わるため、このエンジンでは具体的な数値を決めず「実行時に決まる値」として示す。値の等しさの判定には使わず、同一性の判定にだけ使う。",
  "status": "supported",
  "returns": "int: 識別値",
  "source": "https://docs.python.org/3/library/functions.html#id"
 },
 {
  "name": "issubclass",
  "category": "組み込み関数",
  "syntax": "issubclass(cls, classinfo)",
  "description": "1つ目のクラスが2つ目のクラス（またはそのタプルのいずれか）のサブクラスかどうかを判定する関数。",
  "example": "print(issubclass(bool, int))",
  "caution": "1つ目がクラスでないと TypeError（issubclass() arg 1 must be a class）。クラス自身も自分のサブクラスとして True になる。すべてのクラスは object のサブクラス。",
  "status": "supported",
  "returns": "bool: サブクラスなら True",
  "source": "https://docs.python.org/3/library/functions.html#issubclass"
 },
 {
  "name": "locals",
  "category": "組み込み関数",
  "syntax": "locals()",
  "description": "現在のローカルスコープの名前と値を表す辞書を返す関数。モジュールレベルでは globals() と同じ内容になる。",
  "example": "b = 3\nprint(sorted(locals()))",
  "caution": "このエンジンでは、返る辞書は呼び出し時点のスナップショットで、まだ代入されていないローカル名は含まない。関数内では、その関数のローカル変数だけが対象になる。",
  "status": "supported",
  "returns": "dict: ローカル名→値の辞書",
  "source": "https://docs.python.org/3/library/functions.html#locals"
 },
 {
  "name": "setattr",
  "category": "組み込み関数",
  "syntax": "setattr(obj, name, value)",
  "description": "オブジェクトの属性を名前（文字列）で指定して設定する関数。obj.name = value と同じ。",
  "example": "class A:\n    pass\na = A()\nsetattr(a, \"v\", 3)\nprint(a.v)",
  "caution": "object() のインスタンスやリストなどの組み込み型には属性を設定できず AttributeError になる（実 CPython と同じ）。",
  "status": "supported",
  "returns": "None",
  "source": "https://docs.python.org/3/library/functions.html#setattr"
 },
 {
  "name": "vars",
  "category": "組み込み関数",
  "syntax": "vars()\nvars(obj)",
  "description": "引数なしでは locals() と同じ。引数ありでは、そのオブジェクトの __dict__（属性の辞書）を返す関数。",
  "example": "class A:\n    pass\na = A()\na.x = 1\nprint(vars(a))",
  "caution": "__dict__ を持たない値（整数など）を渡すと TypeError。このエンジンでは、返る辞書は呼び出し時点のスナップショットで、書き換えても元の属性には反映されない。",
  "status": "supported",
  "returns": "dict: 属性名→値の辞書",
  "source": "https://docs.python.org/3/library/functions.html#vars"
 },
 {
  "name": "object",
  "category": "組み込み関数",
  "syntax": "object()",
  "description": "すべてのクラスの基底である object 型の、属性を持たない素のインスタンスを作るクラス。",
  "example": "o = object()\nprint(type(o))",
  "caution": "object() のインスタンスには属性を持たせられない（setattr すると AttributeError。実 CPython と同じ）。引数を渡すと TypeError。",
  "status": "supported",
  "returns": "object: 素のオブジェクト",
  "source": "https://docs.python.org/3/library/functions.html#object"
 },
 {
  "name": "sentinel",
  "category": "組み込み関数",
  "syntax": "sentinel(name, repr=None, *, module=None)",
  "description": "PEP 661 のセンチネル（番兵）値を作るクラス。名前と表示（repr）を持ち、同一性（is）で比較される一意な値で、「未指定」を表す目印に使う。",
  "example": "MISSING = sentinel(\"MISSING\")\nprint(MISSING)",
  "caution": "同じ名前で2回作っても別の値になる（等しいのは自分自身だけ）。このエンジンでは module の既定値を '__main__' とみなす。Python 3.15 で追加されたため、3.12 などの旧版には存在しない。",
  "status": "supported",
  "returns": "sentinel: 一意なセンチネル値（__name__ と __module__ 属性を持つ）",
  "source": "https://docs.python.org/3/library/functions.html#sentinel"
 },
 {
  "name": "aiter",
  "category": "組み込み関数",
  "syntax": "aiter(async_iterable)",
  "description": "非同期イテラブルの __aiter__() を呼び、非同期イテレータを返す関数。",
  "example": "aiter([1, 2])",
  "caution": "このアプリのシミュレーションには非同期機構がないため未対応。呼び出すと「未対応」として停止する。",
  "status": "unsupported",
  "returns": "非同期イテレータ",
  "source": "https://docs.python.org/3/library/functions.html#aiter"
 },
 {
  "name": "anext",
  "category": "組み込み関数",
  "syntax": "anext(async_iterator)\nanext(async_iterator, default)",
  "description": "非同期イテレータの __anext__() を呼び、次の要素を取り出す awaitable を返す関数。",
  "example": "anext(aiter)",
  "caution": "このアプリのシミュレーションには非同期機構がないため未対応。呼び出すと「未対応」として停止する。",
  "status": "unsupported",
  "returns": "awaitable: 次の要素（または default）",
  "source": "https://docs.python.org/3/library/functions.html#anext"
 },
 {
  "name": "breakpoint",
  "category": "組み込み関数",
  "syntax": "breakpoint(*args, **kws)",
  "description": "その場でデバッガ（既定では pdb）を起動する関数。",
  "example": "breakpoint()",
  "caution": "実デバッガとの連携を前提とするため、このアプリのシミュレーションでは未対応。呼び出すと「未対応」として停止する。",
  "status": "unsupported",
  "returns": "None",
  "source": "https://docs.python.org/3/library/functions.html#breakpoint"
 },
 {
  "name": "compile",
  "category": "組み込み関数",
  "syntax": "compile(source, filename, mode, flags=0, dont_inherit=False, optimize=-1, *, feature_version=None)",
  "description": "文字列や AST を、exec()／eval() で実行できるコードオブジェクトにコンパイルする関数。",
  "example": "compile(\"1 + 1\", \"<string>\", \"eval\")",
  "caution": "動的コード実行は、このアプリの実行経路モデルと両立しないため未対応。呼び出すと「未対応」として停止する。",
  "status": "unsupported",
  "returns": "コードオブジェクト",
  "source": "https://docs.python.org/3/library/functions.html#compile"
 },
 {
  "name": "eval",
  "category": "組み込み関数",
  "syntax": "eval(expression, globals=None, locals=None)",
  "description": "文字列を Python の式として評価し、結果を返す関数。",
  "example": "eval(\"1 + 1\")",
  "caution": "動的コード実行は、このアプリの実行経路モデルと両立しないため未対応。呼び出すと「未対応」として停止する。実務でも、信頼できない文字列への eval は危険なため避ける。",
  "status": "unsupported",
  "returns": "式の評価結果",
  "source": "https://docs.python.org/3/library/functions.html#eval"
 },
 {
  "name": "exec",
  "category": "組み込み関数",
  "syntax": "exec(object, globals=None, locals=None, *, closure=None)",
  "description": "文字列を Python の文（プログラム）として実行する関数。",
  "example": "exec(\"x = 1\")",
  "caution": "動的コード実行は、このアプリの実行経路モデルと両立しないため未対応。呼び出すと「未対応」として停止する。",
  "status": "unsupported",
  "returns": "None",
  "source": "https://docs.python.org/3/library/functions.html#exec"
 },
 {
  "name": "help",
  "category": "組み込み関数",
  "syntax": "help(object)",
  "description": "組み込みの対話的ヘルプシステム（pydoc）を起動する関数。",
  "example": "help(len)",
  "caution": "対話的ヘルプシステムはブラウザ内シミュレーションでは再現できないため未対応。呼び出すと「未対応」として停止する。使い方の確認にはこのアプリのリファレンスを使う。",
  "status": "unsupported",
  "returns": "None（ヘルプを表示する）",
  "source": "https://docs.python.org/3/library/functions.html#help"
 },
 {
  "name": "__import__",
  "category": "組み込み関数",
  "syntax": "__import__(name, globals=None, locals=None, fromlist=(), level=0)",
  "description": "import 文が内部で使う、モジュールを読み込む関数。",
  "example": "__import__(\"math\")",
  "caution": "モジュールの実ロードはブラウザ内シミュレーションでは再現できないため未対応。呼び出すと「未対応」として停止する（import 文自体も、math 以外は従来どおり未対応）。",
  "status": "unsupported",
  "returns": "モジュールオブジェクト",
  "source": "https://docs.python.org/3/library/functions.html#__import__"
 },
 {
  "name": "False",
  "category": "組み込み定数",
  "syntax": "False",
  "description": "組み込み定数。bool 型の偽の値。比較や条件判定の結果として返る。",
  "example": "print(False)",
  "caution": "キーワードであり、代入はできない（SyntaxError）。数値としては 0 と等しい（False == 0 は True）。",
  "status": "supported",
  "returns": "bool: False（シングルトン）",
  "source": "https://docs.python.org/3/library/constants.html#False"
 },
 {
  "name": "True",
  "category": "組み込み定数",
  "syntax": "True",
  "description": "組み込み定数。bool 型の真の値。比較や条件判定の結果として返る。",
  "example": "print(True)",
  "caution": "キーワードであり、代入はできない（SyntaxError）。数値としては 1 と等しい（True == 1 は True）。",
  "status": "supported",
  "returns": "bool: True（シングルトン）",
  "source": "https://docs.python.org/3/library/constants.html#True"
 },
 {
  "name": "None",
  "category": "組み込み定数",
  "syntax": "None",
  "description": "組み込み定数。「値が無いこと」を表す NoneType の唯一の値。return を書かなかった関数の戻り値でもある。",
  "example": "print(None)",
  "caution": "キーワードであり、代入はできない（SyntaxError）。等しいかどうかの判定には == ではなく is を使う（x is None）。ハッシュ値は実行ごとに変わりうるため、このエンジンでは「実行時に決まる値」として扱う。",
  "status": "supported",
  "returns": "NoneType: None（シングルトン）",
  "source": "https://docs.python.org/3/library/constants.html#None"
 },
 {
  "name": "copyright",
  "category": "組み込み定数",
  "syntax": "copyright",
  "description": "site モジュールが追加する定数。Python の著作権表示の文字列（対話的インタプリタで表示される）。",
  "example": "print(copyright)",
  "caution": "値の文面は Python の版によって変わり確定できないため、このアプリでは「未検証」とし、エンジンでは従来どおり未定義名（NameError）として停止する側に倒している。",
  "status": "unverified",
  "returns": "str: 著作権表示の文字列",
  "source": "https://docs.python.org/3/library/constants.html#copyright"
 },
 {
  "name": "credits",
  "category": "組み込み定数",
  "syntax": "credits",
  "description": "site モジュールが追加する定数。Python への貢献者表示の文字列。",
  "example": "print(credits)",
  "caution": "値の文面は Python の版によって変わり確定できないため、このアプリでは「未検証」とし、エンジンでは従来どおり未定義名（NameError）として停止する側に倒している。",
  "status": "unverified",
  "returns": "str: 貢献者表示の文字列",
  "source": "https://docs.python.org/3/library/constants.html#credits"
 },
 {
  "name": "license",
  "category": "組み込み定数",
  "syntax": "license",
  "description": "site モジュールが追加する定数。Python のライセンス表示の文字列。",
  "example": "print(license)",
  "caution": "値の文面は Python の版によって変わり確定できないため、このアプリでは「未検証」とし、エンジンでは従来どおり未定義名（NameError）として停止する側に倒している。",
  "status": "unverified",
  "returns": "str: ライセンス表示の文字列",
  "source": "https://docs.python.org/3/library/constants.html#license"
 },
 {
  "name": "quit",
  "category": "組み込み定数",
  "syntax": "quit()",
  "description": "site モジュールが追加する定数。対話的インタプリタを終了させるためのオブジェクト（呼び出すと終了する）。",
  "example": "quit()",
  "caution": "インタプリタ終了のための定数で、ブラウザ内シミュレーションでは意味を持たないため未対応。このアプリでは名前自体が未定義で、使うと NameError として停止する。",
  "status": "unsupported",
  "returns": "（インタプリタを終了させる。値は返らない）",
  "source": "https://docs.python.org/3/library/constants.html#quit"
 },
 {
  "name": "exit",
  "category": "組み込み定数",
  "syntax": "exit()",
  "description": "site モジュールが追加する定数。quit と同じく、対話的インタプリタを終了させるためのオブジェクト。",
  "example": "exit()",
  "caution": "インタプリタ終了のための定数で、ブラウザ内シミュレーションでは意味を持たないため未対応。このアプリでは名前自体が未定義で、使うと NameError として停止する。プログラムの終了には通常 sys.exit() を使う（このアプリでは未対応）。",
  "status": "unsupported",
  "returns": "（インタプリタを終了させる。値は返らない）",
  "source": "https://docs.python.org/3/library/constants.html#exit"
 },
 {
  "name": "ImportCycleError",
  "category": "例外",
  "syntax": "raise ImportCycleError(\"メッセージ\")",
  "description": "ImportError のサブクラス。遅延 import（lazy import）で、読み込み中のモジュールが自身を読み込もうとして失敗したときに発生する例外。",
  "example": "try:\n    raise ImportCycleError(\"循環\")\nexcept ImportError:\n    print(\"ImportErrorとして捕捉\")",
  "caution": "ImportError のサブクラスなので、except ImportError で捕捉できる。Python 3.15 の例外階層で追加されたクラスで、3.12 には存在しない。",
  "status": "supported",
  "returns": "例外クラス（raise で発生させ、except で捕捉する）",
  "source": "https://docs.python.org/3/library/exceptions.html#ImportCycleError"
 },
 {
  "name": "PythonFinalizationError",
  "category": "例外",
  "syntax": "raise PythonFinalizationError(\"メッセージ\")",
  "description": "RuntimeError のサブクラス。インタプリタの終了処理（ファイナライズ）が始まった後に、許可されない操作を行ったときに発生する例外。",
  "example": "try:\n    raise PythonFinalizationError(\"終了処理中\")\nexcept RuntimeError:\n    print(\"RuntimeErrorとして捕捉\")",
  "caution": "RuntimeError のサブクラスなので、except RuntimeError で捕捉できる。Python 3.13 の例外階層で追加されたクラスで、3.12 には存在しない。",
  "status": "supported",
  "returns": "例外クラス（raise で発生させ、except で捕捉する）",
  "source": "https://docs.python.org/3/library/exceptions.html#PythonFinalizationError"
 },
 {
  "name": "WindowsError",
  "category": "例外",
  "syntax": "raise WindowsError(\"メッセージ\")",
  "description": "OSError のエイリアス（別名）。Windows でのみ存在する名前で、それ以外のプラットフォームでは定義されない。",
  "example": "raise WindowsError(\"x\")",
  "caution": "Windows 専用のエイリアスのため、このアプリでは「未検証」とし、エンジンの例外階層には登録していない（使うと未定義名として停止する）。Windows 以外の実 CPython でも NameError になる。",
  "status": "unverified",
  "returns": "例外クラス（OSError と同一）",
  "source": "https://docs.python.org/3/library/exceptions.html#WindowsError"
 }
];

export const referenceOverrides = [
 {
  "name": "open",
  "category": "組み込み関数",
  "syntax": "open(file, mode='r', buffering=-1, encoding=None, errors=None, newline=None, closefd=True, opener=None)",
  "description": "ファイルを開き、読み書きに使うファイルオブジェクトを返す関数（高度モードでの上書き項目：このアプリでは未対応）。",
  "example": "open(\"memo.txt\")",
  "caution": "実ファイルを開く操作はブラウザ内シミュレーション（実ファイル操作なし）では再現できないため、このアプリでは未対応として停止する。基礎モードの項目は参照用で、実行はできない。",
  "status": "unsupported",
  "returns": "ファイルオブジェクト",
  "source": "https://docs.python.org/3/library/functions.html#open"
 }
];
