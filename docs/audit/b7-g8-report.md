# B7 G8（言語ランタイム系）報告書

担当：ast／dis／inspect／typing／annotationlib／token／symtable／traceback／tokenize／codeop／code／pyclbr／modulefinder／tabnanny／linecache の15モジュール・全730件。
作業場所：`work/adv-b7-g8`（自専用コピー）。GitHub への書き込みは行っていない（ローカルコミットのみ）。

## 1. 区分別件数

| 区分 | 件数 | 内訳 |
|---|---|---|
| 個別実装 | 336 | 関数・メソッド・クラス・属性の意味論を実装 |
| 束ね値 | 145 | 定数・辞書・列挙メンバ等のデータ値（token 定数74、inspect CO_* 11、列挙メンバ30、ast PyCF_* 4、tabnanny フラグ2、dis.cmp_op 1、typing.TYPE_CHECKING 等） |
| 例外対応付け | 2 | tokenize.TokenError、tabnanny.NannyNag（いずれも Exception の子として登録し、送出・捕捉可能） |
| 未対応 | 103 | リファレンス収載＋画面ラベル。呼び出すと「未対応」エラー |
| 未検証 | 144 | リファレンス収載。呼び出すと診断つき UNK を返す（ハードエラーにしない） |
| 合計 | 730 | バックログとの名前集合一致を生成器で検証済み |

モジュール別（supported／unsupported／unverified）：
ast 139／0／8、dis 1／40／12、inspect 61／7／59、typing 135／0／16、annotationlib 7／0／7、token 75／0／0、symtable 8／42／0、traceback 27／0／23、tokenize 9／1／3、codeop 0／0／3、code 0／0／13、pyclbr 17／2／0、modulefinder 0／6／0、tabnanny 4／1／0、linecache 0／4／0。

## 2. 主な裁定と再分類（理由）

- **token（全75件 supported）**：定数値は 3.15 の `Lib/token.py` 本体（main ブランチ）で確定。3.12 との差異：ASYNC／AWAIT が 3.13 で削除され TYPE_IGNORE=56・TYPE_COMMENT=57・SOFT_KEYWORD=58・FSTRING_*=59–61 に繰り上がり、TSTRING_*=62–64 が 3.14 で追加、COMMENT=65・NL=66・ERRORTOKEN=67・ENCODING=68・N_TOKENS=69。本アプリは 3.15 値を採用。
- **ast**：ノードクラス114件は汎用機構（フィールド／位置属性／dump／walk 等）で個別実装。`Import`／`ImportFrom` の `_fields` は 3.15 の ASDL（`Parser/Python.asdl` 本体確認）に従い `is_lazy` を含む。`TemplateStr`／`Interpolation` は ASDL でフィールド確定のため supported（3.14+、caution に明記）。`compare` は 3.14 追加の実在関数（公式ドキュメントで確認）として実装。`parse`／`unparse`／`NodeVisitor`／`NodeTransformer` とそのメソッド、`AST._field_types` は unverified（エンジンのパーサは AST を公開しない／サブクラスのメソッドディスパッチを再現できない／3.13+ の型対応表を採取できない）。`literal_eval` は独自字句解析で忠実に実装（BinOp は複素数構成のみ受理し実数同士は ValueError、という CPython の規則まで再現）。`Constant.kind` は CPython とおり既定 None。
- **inspect**：CO_* 11件は束ね値（CO_HAS_DOCSTRING／CO_METHOD は 3.14+ の値で `Lib/dis.py` 本体の COMPILER_FLAG_NAMES から確定）。`Parameter`／`Signature`／`BoundArguments` は CPython の `Lib/inspect.py` を移植して個別実装（bind のエラーメッセージ・args/kwargs プロパティの意味論まで実走照合）。`BufferFlags` は 3.13+ の IntFlag として実装。ファイル前提の7件（getsource 等）は unsupported、その他のフレーム・docstring・注釈評価依存は unverified。`Signature.format` は 3.14+ で整形規則を確定できず unverified。
- **typing**：特殊形式と generic alias は値として実装（repr・get_origin・get_args・等価性を全形式で実走照合）。`Hashable`／`Sized` は値として存在し、添字は CPython どおり TypeError。`Supports*` はクラス値＋添字可として supported（isinstance 判定は未接続、caution 明記）。`Generic`／`Protocol`／`overload` 系／`get_type_hints` 等の注釈評価・登録簿依存は unverified。`TypedDict`／`NamedTuple` は関数形式のみ実装（クラス構文の基底としての利用は対象外）。`NoDefault`／`NoExtraItems`／`TypeIs`／`ReadOnly`／`TypeForm` は 3.13–3.14 の追加でドキュメント裏付け。
- **annotationlib（全件 3.14+）**：ローカル 3.12 に無いため、公式ドキュメントと `Lib/annotationlib.py` 本体で裁定。Format 列挙と ForwardRef の値は supported、評価系6関数は unverified。
- **dis**：`cmp_op` のみ supported（版非依存）。opcode 番号表12件は unverified（版ごとに変わり 3.15 の表を 3.12.3 で実走照合できないため、捏造せず UNK として登録）。逆アセンブル系40件は unsupported（CPython バイトコードはエンジンに存在しない）。
- **symtable**：`SymbolTableType`（StrEnum、3.13+）の値だけ supported、解析系42件は unsupported（コンパイラ内部の産物に到達できない）。
- **traceback**：FrameSummary／StackSummary（from_list／format 系）／TracebackException（format 系）は文字列生成として実装し実走照合。例外の発生位置はエンジンの例外値が保持しないため、位置依存の属性7件は unverified。print 系7件は unverified（標準エラー出力の出力路が無い。ctx の診断はプログラム出力ではないため流用しない）。extract 系等は unverified。
- **tokenize**：TokenInfo は namedtuple として実装（repr・exact_type まで実走照合）。`untokenize` は `Lib/tokenize.py` の Untokenizer（5要素形式・compat 形式とも）を移植し実走照合。字句解析系は unverified（エンジンの字句解析器は非公開）、`open` は unsupported。
- **codeop（3件 unverified）**：不完全入力の判定自体は文字列解析で近づけるが、戻り値がコードオブジェクトでありエンジンに存在しないため、成功結果を捏造せず unverified に倒した。
- **code（13件 unverified）**：対話インタプリタはエンジンへの再入が前提だが、実装関数から実行系を再入する口が基盤に無い。
- **pyclbr**：Class／Function は素朴なデータ保持クラスとして実装（コンストラクタ意味論を本体で照合）。readmodule 系は unsupported。
- **modulefinder（全件 unsupported）**：ファイルシステム探索が前提。なおバックログの `ModuleFinder.run_script` はメソッドであり、モジュール関数 `run_script` は存在しない（AddPackagePath／ReplacePackage が関数）。
- **tabnanny**：`process_tokens` は `Lib/tabnanny.py` の Whitespace／_process_tokens を忠実に移植し、NannyNag のメッセージ（witness のタブサイズ列挙）まで実走照合して supported。`check` はファイル前提のため unsupported。`verbose`／`filename_only` は CPython 本体どおり int の 0。
- **linecache（全件 unsupported）**：ソースファイル読み取りが前提。

## 3. 照合方法と範囲

- **一次情報**：公式ドキュメント 3.15（各モジュールページ）、CPython 本体ソース（`Lib/token.py`、`Parser/Python.asdl`、`Lib/inspect.py`、`Lib/dis.py`、`Lib/annotationlib.py`、`Lib/symtable.py`、`Include/cpython/compile.h`、いずれも main ブランチ）、ローカル CPython 3.12.3 実走（`/usr/bin/python3`）。
- **F-04 全件照合**：supported 483件のリファレンス例題をすべてエンジンで実行し、同じ例題を CPython 3.12.3 でも実行して出力を全件比較した。一致399件。残りの差分はすべて説明可能で、内訳は (a) 3.15 の版差異（token 値、ast の is_lazy、PyCF_OPTIMIZED_AST）、(b) 3.13+ の項目で 3.12 に存在しない56件（ドキュメント／本体ソースで裏付け）、(c) 基盤制約による差異（§5）。
- **ケース表**：各実装領域に典型・境界・異常のケースを追加（literal_eval のエラー種別、Signature.bind の各種 TypeError、tabnanny の NannyNag メッセージ、untokenize の compat 形式、enum のビット演算など）。`tests/muse-adv-b7-g8.test.js` 全79テスト合格。基盤テスト・math テスト（99件）も再実行し干渉なしを確認。

## 4. 基盤要請（重要度順）

1. **コンストラクタ kwargs の二重評価バグ（最優先）**：`engine.js` の `stdlibModuleCall`（kwargs を評価済みに変換）が `stdlibConstruct` へ渡し、`stdlibConstruct` が再度 `stdlibKwargs` で評価するため、`module.Class(kw=...)` 形式のキーワード引数値がすべて UNK になる。変数経由（`C = mod.Class; C(kw=...)`）とメソッド kwargs は正常。影響は G8 全域（ast ノードのフィールド指定、`inspect.Parameter(default=...)`、`typing.TypeVar(bound=...)` 等、最も自然な書き方）。G8 側は例題を位置引数・変数経由・replace() で回避したが、基盤側で「stdlibConstruct は評価済み kwargs を再評価しない」修正が必須。
2. **モジュール属性経由の raise が解釈されない**：`raise tokenize.TokenError(...)` は「この形の raise は解釈できません」になる（変数経由は可）。例外対応付けしたクラスの自然な利用が妨げられる。
3. **ネイティブ値への属性代入が解釈されない**：`node.lineno = 1` のような代入が未対応エラーになる。ast の位置属性設定という標準的な操作に必要。
4. **bytes／複素数／Ellipsis の値が PyAPI に無い**：`ast.literal_eval` がこれらを含むリテラルで診断つき UNK に倒れる。また frozenset 値が無いため、TypedDict の `__required_keys__` 等が set として表示される（CPython は frozenset）。
5. **プログラム出力（stdout／stderr）への書き出し手段が無い**：traceback の print 系・TracebackException.print が unverified のままになる。
6. **stdlib クラスの `__name__` が引けない／isinstance が typing 構成子に接続されていない**：`type(n).__name__` が AttributeError になる。typing の特殊形式を isinstance に使う意味論も未接続。
7. **コードオブジェクト型とエンジン再入 API が無い**：codeop／code の unverified 解消に必要。

## 5. 残存・既知の差異

- ast の `walk`／`iter_fields`／`iter_child_nodes` はジェネレータではなくリストを返す。
- `ast.literal_eval`：数値リテラルのアンダースコア検証は CPython より緩い。malformed 時のメッセージは `<ast.Expression object>` のプレースホルダ（CPython はアドレスを含むため再現不能）。bytes／複素数／Ellipsis を含む入力は診断つき UNK。
- `ast.get_source_segment` の行分割は \n／\r のみ（CPython の _splitlines_no_ff と概ね一致する範囲）。
- `ast.dump` の 3.15 追加 `color` 引数は未実装（無視される）。
- traceback：エンジンの例外値はフレームを持たないため、TracebackException の stack は空になり、format 系は例外行のみになる（CPython はヘッダ＋フレーム行を含む）。
- tabnanny.NannyNag：送出時に保持できるのは msg のみ（lineno／line はエンジンの例外値に保持できない）。
- inspect.BufferFlags：未知の数値からの構築は plain int を返す（CPython は合成フラグを返す場合がある）。
- typing：PEP 585 の組み込み型添字がエンジンに無いため、エイリアス引数は typing 形式で表され repr も typing 形式になる。動的生成クラス（NamedTuple／TypedDict の生成物）の `__module__` は `__main__` と仮定。`get_args` 等のタプル内での型値の repr はエンジン全般の表記（「組み込み関数 int」）に従う。
- 型値同士の `is` 比較はエンジンが UNK を返すため、例題・テストでは `==` を使用（基盤側の制約）。

## 6. 作成ファイル（全33件、いずれも新規追加のみ）

- 実装（16件）：`js/types/python/impl-advanced-g8-common.js`、`impl-advanced-{ast,dis,inspect,typing,annotationlib,token,symtable,traceback,tokenize,codeop,code,pyclbr,modulefinder,tabnanny,linecache}.js`
- リファレンス（15件）：`js/types/python/reference-advanced-{ast,dis,inspect,typing,annotationlib,token,symtable,traceback,tokenize,codeop,code,pyclbr,modulefinder,tabnanny,linecache}.js`（全件 referenceAdvanced、referenceOverrides は空）
- テスト（2件）：`tests/muse-adv-b7-g8.test.js`、`tests/muse-adv-b7-g8-expected.js`
- 本報告書：`docs/audit/b7-g8-report.md`

既存ファイル（advanced-engine.js／advanced-manifest.js／engine.js／stdlib-registry.js を含む）への変更は一切行っていない。
