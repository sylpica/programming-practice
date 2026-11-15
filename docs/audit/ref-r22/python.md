# リファレンス完全性修正 R22 — Python／CloudFormation 裁定記録

- 対象報告書：`reference-completeness-round22.md` の「Python」節と「CloudFormation」節
- 変更ファイル：`js/types/python/reference.js`（新規118件追加＋`with` 文面修正）、`js/types/python/index.js`（`with` の未対応注記の出し分けのみ。エンジン挙動は変更していない）、`js/types/cloudformation/index.js`（固有4件追加）、`js/types/cloudformation/reference-details.js`（固有4件の returns／source 追加）、新規テスト `tests/muse-fix-ref-python.test.js`
- 抽出成果物：`docs/audit/ref-r22/python-r2.json`（123行＝Python 119行（新規118＋変更 `with` 1）＋CloudFormation 4行。ビルド後の定義オブジェクトから node スクリプトで抽出。Python 定義の独自フィールドは summary→description、pitfalls→caution、doc→source と対応付けた）
- 追加後のリファレンス総数：Python 160件（従前42件＋新規118件。対応151／参照専用9で、参照専用の内訳は従前どおり open・with・str.format・random・json・os・datetime・numpy.array・pandas.DataFrame）。CloudFormation 171件（従前49件＝固有7＋Python委譲42 → 固有11＋Python委譲160）
- 検証：`node --test tests/audit.test.js` 全1,130件合格（新規項目の使用例は Python 自種分・CloudFormation ハンドラ内包分の両方でエラーなし）。`node --test tests/muse-fix-ref-python.test.js` 9件合格、`tests/muse-fix-python.test.js`／`tests/muse-fix-cloudformation.test.js`／`tests/types.test.js` 47件合格。追加・変更した全項目の使用例は、エンジン実実行で出力が `expected` と一致することを自前プローブでも確認済み（119／119件。従前項目の input／filter は対象外の既存事情で不一致だが本修正の対象ではない）
- 一次情報の根拠の表記：Python は公式ドキュメント日本語版 3.12（https://docs.python.org/ja/3.12/ 配下）を行ごとに「ページ#アンカー」で示す。CloudFormation は AWS 公式「マクロのリクエスト・レスポンス」https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html

## Python 第1層（89件）— 全件「項目を追加」で処置

### 組み込み関数（16件）

| 名前 | 裁定 | 理由 | 一次情報の根拠 |
|---|---|---|---|
| float | 項目を追加 | `callBuiltin0` に専用 case があり変換が計算される。int／str と対になる基本変換で項目がなかった | library/functions.html#float |
| bool | 項目を追加 | 専用 case あり。真理値判定の基礎で、TYPE 系項目の前提になる | library/functions.html#bool |
| reversed | 項目を追加 | 専用 case あり。sorted／iter と対のイテレータ関数 | library/functions.html#reversed |
| ord | 項目を追加 | 専用 case あり。chr と対 | library/functions.html#ord |
| chr | 項目を追加 | 専用 case あり。ord と対 | library/functions.html#chr |
| divmod | 項目を追加 | 専用 case あり（商と余りの組）。演算子 // ％ の意味づけにも必要 | library/functions.html#divmod |
| pow | 項目を追加 | 専用 case あり（3引数 mod 付き含む） | library/functions.html#pow |
| any | 項目を追加 | 専用 case あり（短絡評価・イテレータ消費位置まで実装） | library/functions.html#any |
| all | 項目を追加 | 専用 case あり。any と対 | library/functions.html#all |
| repr | 項目を追加 | 専用 case あり。str との違いが教材論点 | library/functions.html#repr |
| hex | 項目を追加 | 専用 case あり。bin／oct と組の基数変換 | library/functions.html#hex |
| bin | 項目を追加 | 専用 case あり | library/functions.html#bin |
| oct | 項目を追加 | 専用 case あり | library/functions.html#oct |
| format | 項目を追加 | 専用 case あり（組み込み関数版）。メソッド版 str.format が参照専用項目として存在するのと対照的だった | library/functions.html#format |
| next | 項目を追加 | 専用 case あり。iter と対でイテレータ教材の中心 | library/functions.html#next |
| iter | 項目を追加 | 専用 case あり。next と対 | library/functions.html#iter |

### str メソッド（26件）

いずれもエンジンの str メソッド専用 case（STR_KNOWN）で実際に計算される。項目があったのは str.split／str.join のみで、テンプレートでも使われる str.strip／str.replace を含め全件を追加した。根拠は全件 library/stdtypes.html の各メソッド節（#str.<名前>）。

| 名前 | 裁定 | 理由 |
|---|---|---|
| str.upper | 項目を追加 | 大文字化。lower と対の基本変換 |
| str.lower | 項目を追加 | 小文字化。upper と対の基本変換 |
| str.title | 項目を追加 | 単語先頭の大文字化。capitalize との違いが論点 |
| str.capitalize | 項目を追加 | 先頭のみ大文字化。title との違いが論点 |
| str.strip | 項目を追加 | 両端の空白除去。テンプレートでも使用され解説文でも名前が挙がっていた（方向3にも該当） |
| str.lstrip | 項目を追加 | 左端のみ。strip と組 |
| str.rstrip | 項目を追加 | 右端のみ。strip と組 |
| str.rsplit | 項目を追加 | 右からの分割。split の対 |
| str.replace | 項目を追加 | 置換。テンプレートでも使用され解説文でも名前が挙がっていた（方向3にも該当） |
| str.find | 項目を追加 | 位置検索（見つからなければ -1）。index と対 |
| str.index | 項目を追加 | 位置検索（見つからなければ ValueError）。find と対 |
| str.rfind | 項目を追加 | 末尾からの位置検索。find の対 |
| str.rindex | 項目を追加 | 末尾からの位置検索。index の対 |
| str.count | 項目を追加 | 出現回数。list.count と対 |
| str.startswith | 項目を追加 | 接頭辞判定。endswith と対 |
| str.endswith | 項目を追加 | 接尾辞判定。startswith と対 |
| str.isdigit | 項目を追加 | 数字判定。isdecimal／isnumeric と範囲の違いが論点 |
| str.isdecimal | 項目を追加 | 10進数字判定。isdigit より狭い |
| str.isnumeric | 項目を追加 | 数値文字判定。isdigit より広い |
| str.isalpha | 項目を追加 | 文字判定。isalnum と対 |
| str.isalnum | 項目を追加 | 英数字判定。isalpha／isdigit と組 |
| str.isspace | 項目を追加 | 空白判定 |
| str.isascii | 項目を追加 | ASCII 判定（空文字列でも True の例外性が論点） |
| str.isidentifier | 項目を追加 | 識別子判定 |
| str.islower | 項目を追加 | 小文字判定。isupper と対 |
| str.isupper | 項目を追加 | 大文字判定。islower と対 |

### list メソッド（9件）

いずれも専用 case で実際に変更・取得が行われる。項目があったのは list.append／list.sort のみ。根拠は全件 tutorial/datastructures.html#more-on-lists（既存 list.append の doc と同じページ）。

| 名前 | 裁定 | 理由 |
|---|---|---|
| list.extend | 項目を追加 | 要素ごとの追加。append との違いが最重要の論点 |
| list.insert | 項目を追加 | 位置指定の挿入 |
| list.pop | 項目を追加 | 取り出し。append と対でスタック操作の中心 |
| list.remove | 項目を追加 | 値による削除。pop／del との使い分けが論点 |
| list.index | 項目を追加 | 位置検索。count と対 |
| list.count | 項目を追加 | 個数。index と対 |
| list.reverse | 項目を追加 | その場での逆転。reversed との違いが論点 |
| list.copy | 項目を追加 | 浅いコピー。代入との違いが論点 |
| list.clear | 項目を追加 | 全削除。del との共有関係の違いが論点 |

### dict メソッド（8件）

いずれも専用 case あり。項目があったのは dict.get／dict.items のみ。根拠は全件 library/stdtypes.html の各メソッド節（#dict.<名前>、既存 dict.get の doc と同じ形式）。

| 名前 | 裁定 | 理由 |
|---|---|---|
| dict.keys | 項目を追加 | キーのビュー。items 項目本文でも言及されていた |
| dict.values | 項目を追加 | 値のビュー。keys と組 |
| dict.update | 項目を追加 | まとめて更新・上書き |
| dict.pop | 項目を追加 | キー指定の取り出し。get との違いが論点 |
| dict.setdefault | 項目を追加 | 取得と登録の複合操作 |
| dict.popitem | 項目を追加 | 最後の組の取り出し（LIFO が仕様） |
| dict.copy | 項目を追加 | 浅いコピー。list.copy と対 |
| dict.clear | 項目を追加 | 全削除。list.clear と対 |

### set メソッド（14件）

set のメソッド項目は1件もなかったが、エンジンには全件の専用 case がある。全件を追加した。根拠は全件 library/stdtypes.html の集合型の節（#set、既存 set 項目の doc と同じページ。集合メソッドには個別アンカーがないため節単位）。

| 名前 | 裁定 | 理由 |
|---|---|---|
| set.add | 項目を追加 | 要素の追加。集合操作の入口 |
| set.remove | 項目を追加 | 要素の削除（無ければ KeyError）。discard と対 |
| set.discard | 項目を追加 | 要素の削除（無くてもエラーなし）。remove と対 |
| set.update | 項目を追加 | 複数要素の追加。union との違い（変更 vs 新規）が論点 |
| set.clear | 項目を追加 | 全削除 |
| set.pop | 項目を追加 | 任意要素の取り出し。エンジンは取り出す要素が定まらないため未確定値を返す実装であり、使用例・注意書きもその実態に合わせた |
| set.intersection_update | 項目を追加 | 共通要素だけに更新。intersection と対 |
| set.difference_update | 項目を追加 | 差集合に更新。difference と対 |
| set.symmetric_difference_update | 項目を追加 | 対称差に更新。symmetric_difference と対 |
| set.union | 項目を追加 | 和集合（新しい集合）。update と対 |
| set.intersection | 項目を追加 | 積集合（新しい集合） |
| set.difference | 項目を追加 | 差集合（新しい集合） |
| set.symmetric_difference | 項目を追加 | 対称差（新しい集合） |
| set.copy | 項目を追加 | 浅いコピー。list.copy／dict.copy と対 |

### tuple／range メソッド（4件）

いずれも専用 case あり（メソッド項目ゼロだった）。根拠は tuple が library/stdtypes.html#tuple、range が同 #range（各型項目の doc と同じページ）。

| 名前 | 裁定 | 理由 |
|---|---|---|
| tuple.count | 項目を追加 | 個数。タプルに許される数少ないメソッドの1つ |
| tuple.index | 項目を追加 | 位置検索。count と組でタプルのメソッドはこの2つだけ |
| range.count | 項目を追加 | 含有個数（0 か 1）。列挙せず判定される点が論点 |
| range.index | 項目を追加 | 位置。count と組 |

### 構文（12件）

項目があった構文は for／if／while／try（＋参照専用の with）のみで、DEVELOPMENT.md が「型・コンテナ・関数・クラス・例外」を対応範囲と宣言し、テンプレートも def／class を教えているため、全件を追加した。

| 名前 | 裁定 | 理由 | 一次情報の根拠 |
|---|---|---|---|
| def | 項目を追加 | 関数定義。エンジンに専用処理がありテンプレートの中心 | reference/compound_stmts.html#function-definitions |
| class | 項目を追加 | クラス定義。エンジンに専用処理がありテンプレートでも使用 | reference/compound_stmts.html#class-definitions |
| return | 項目を追加 | 関数の戻り値。def と不可分 | reference/simple_stmts.html#the-return-statement |
| break | 項目を追加 | ループ終了。for／while 項目の前提 | reference/simple_stmts.html#the-break-statement |
| continue | 項目を追加 | 周回スキップ。break と対 | reference/simple_stmts.html#the-continue-statement |
| pass | 項目を追加 | 何もしない文。def／class の雛形に必須 | reference/simple_stmts.html#the-pass-statement |
| del | 項目を追加 | 束縛・要素の削除。エンジンに名前／添字／スライスの専用処理あり | reference/simple_stmts.html#the-del-statement |
| assert | 項目を追加 | 表明。AssertionError と対応 | reference/simple_stmts.html#the-assert-statement |
| raise | 項目を追加 | 例外の発生。try 項目・例外クラス項目の前提 | reference/simple_stmts.html#the-raise-statement |
| global／nonlocal | 項目を追加（1項目「global文／nonlocal文」に束ねる） | エンジンに両形式の専用処理あり（global はモジュール変数、nonlocal は外側関数の変数への宣言）。使用例は global の代入パターン（CloudFormation ハンドラ内包でも実行できる形）で実証し、nonlocal は構文・注意書きで扱う | reference/simple_stmts.html#the-global-statement |
| 内包表記 | 項目を追加（id は comprehension） | リスト内包等はエンジンに専用処理があり、map／filter 項目の関連先としても必要 | reference/expressions.html#displays-for-lists-sets-and-dictionaries |
| f文字列 | 項目を追加（id は f-string） | フォーマット文字列リテラルはエンジンに専用処理があり、str.format 項目からも参照される現在の標準表記 | reference/lexical_analysis.html#formatted-string-literals |

## Python 第2層 math 関数（4件）— 全件「個別項目を追加」で処置

モジュール単位の `math` 項目しかなかったが、エンジンの mathCall で実際に計算されるのは sqrt／log 系の定義域チェックを除くと sqrt・fabs・floor・ceil の4件が中心であり、個別項目を追加した（log／log2／log10 は定義域チェックのみで結果は未確定値のため、個別項目は作らない）。根拠は全件 library/math.html の各節（#math.<名前>）。

| 名前 | 裁定 | 理由 |
|---|---|---|
| math.sqrt | 項目を追加 | 専用計算あり（負数は ValueError）。math 項目の使用例でも使われていた |
| math.fabs | 項目を追加 | 専用計算あり（常に float）。abs との違いが論点 |
| math.floor | 項目を追加 | 専用計算あり（床）。ceil と対、int() の切り捨てとの違いが論点 |
| math.ceil | 項目を追加 | 専用計算あり（天井）。floor と対 |

## 例外クラス（25件）— 全件「項目を追加」で処置

呼び出し（コンストラクタ）としては汎用フォールバックだが、`raise` 文と try のハンドラ照合では種類名として実処理される（階層照合を含む）ため、全件をカテゴリ「例外」の項目として追加した。使用例は全件 try／raise／except で捕捉できる形にし、エンジン実実行で捕捉を確認済み。根拠は全件 library/exceptions.html の各節（#<クラス名>）。コンストラクタ呼び出しを値として使う形は本アプリでは未確定値になる旨は、各項目の syntax／returns の範囲（raise／except での使用）に限定して明記した。

| 名前 | 裁定 | 理由（発生場面） |
|---|---|---|
| Exception | 項目を追加 | 通常例外すべての基底。まとめて捕捉する際の指定先 |
| BaseException | 項目を追加 | 全例外の最上位。SystemExit／KeyboardInterrupt の親である点が論点 |
| ValueError | 項目を追加 | 値が不適切な変換・計算（int("abc") 等）。最も頻出 |
| TypeError | 項目を追加 | 型に合わない操作・引数の誤り。最も頻出 |
| KeyError | 項目を追加 | 辞書に無いキー。dict.get 項目と対応 |
| IndexError | 項目を追加 | シーケンスの範囲外。list.pop 項目と対応 |
| ZeroDivisionError | 項目を追加 | ゼロ除算 |
| NameError | 項目を追加 | 未定義の名前。del 項目と対応 |
| AttributeError | 項目を追加 | 無い属性・メソッド |
| RuntimeError | 項目を追加 | 分類外の実行時エラーの受け皿 |
| StopIteration | 項目を追加 | イテレータの終了合図。next／iter 項目と対応 |
| AssertionError | 項目を追加 | assert の失敗。assert 項目と対応 |
| ImportError | 項目を追加 | import の失敗。ModuleNotFoundError の親 |
| ModuleNotFoundError | 項目を追加 | モジュール自体が無い（ImportError のサブクラス） |
| OSError | 項目を追加 | OS 系エラーの基底。FileNotFoundError の親 |
| FileNotFoundError | 項目を追加 | ファイルが無い（OSError のサブクラス） |
| NotImplementedError | 項目を追加 | 未実装の表明（RuntimeError のサブクラス） |
| ArithmeticError | 項目を追加 | 算術エラーの基底（ZeroDivisionError／OverflowError の親） |
| LookupError | 項目を追加 | 探索エラーの基底（KeyError／IndexError の親） |
| OverflowError | 項目を追加 | 数値の過大（ArithmeticError のサブクラス） |
| RecursionError | 項目を追加 | 再帰の深さ超過（RuntimeError のサブクラス） |
| UnicodeError | 項目を追加 | 符号化・復号エラー（ValueError のサブクラス） |
| EOFError | 項目を追加 | input() の終端到達。input 項目と対応 |
| KeyboardInterrupt | 項目を追加 | Ctrl+C の割り込み（BaseException 系で except Exception では捕捉されない点が論点） |
| SystemExit | 項目を追加 | sys.exit() による終了（BaseException 系）。本アプリの照合は簡略化され except Exception でも一致する場合がある旨を注意書きに明記 |

## フォールバック受理のみの組み込み（29件）— 全件「現行どおり＋宣言化」で処置（項目化しない）

仕組み：`PY_BUILTINS` に名前があるため NameError にはならず受理されるが、`callBuiltin0` に専用 case がなく、呼び出すと「組み込みの『名前』はこの説明では解釈しません。結果は『実行時に決まる値』として扱います」という未対応の注記（その実行経路は停止）になる。専用の意味・計算を説明する項目を作ると実装の実態（未対応）と食い違うため、項目化せず、DEVELOPMENT.md への宣言追加で未対応範囲を明示する裁定とした（宣言文案は末尾）。個別の理由は次のとおり。

| 名前 | 理由 |
|---|---|
| ascii | repr の ASCII エスケープ版で、専用 case はない。教材範囲では repr で代替できる |
| breakpoint | デバッガ連携用。学習モデルにデバッガは存在しない |
| bytearray | バイト列型は本アプリの対応型の範囲外で、専用処理がない |
| bytes | bytearray と同じくバイト列型が対応範囲外 |
| callable | 呼び出し可能性の判定だが専用 case がない |
| classmethod | 記述子（デコレータ）で、クラスの応用機能。専用処理がない |
| compile | 動的コンパイル。eval／exec と同じく動的実行はモデル化しない |
| complex | 複素数型は対応型の範囲外で、専用処理がない |
| delattr | 動的属性の削除。属性操作の専用処理がない |
| dir | スコープ内省系。専用処理がない |
| eval | 動的実行。任意コードの実行は学習モデルでは扱わない |
| exec | eval と同じく動的実行 |
| frozenset | イミュータブル集合型は対応範囲外。set で代替できる |
| getattr | 動的属性の取得。専用処理がない |
| globals | スコープ内省系。専用処理がない |
| hasattr | 動的属性の判定。専用処理がない |
| hash | ハッシュ値は実行環境依存で、モデルでは再現しない |
| help | 対話ヘルプ。学習モデルにヘルプシステムはない |
| id | オブジェクト ID は実行環境依存で、モデルでは再現しない |
| issubclass | 継承判定。isinstance には専用項目があるが、こちらは専用 case がなくクラス階層の教材範囲外 |
| locals | スコープ内省系。専用処理がない |
| memoryview | バッファ型は対応範囲外 |
| object | 基底型のコンストラクタ。専用処理がない |
| property | 記述子。専用処理がない |
| setattr | 動的属性の設定。専用処理がない |
| slice | スライスオブジェクトの生成。添字記法 [a:b] 自体は構文として処理されるが、slice() 呼び出しの専用 case はない |
| staticmethod | 記述子（デコレータ）。専用処理がない |
| super | 継承先の呼び出し。エンジンは super() を専用処理せず、クラス教材は単独クラスの範囲 |
| vars | スコープ内省系。専用処理がない |

## TYPE_ATTRS のフォールバックメソッド（41件）— 全件「現行どおり＋宣言化」で処置（項目化しない）

仕組み：`TYPE_ATTRS` に属性名があるため AttributeError にならずメソッド参照として受理されるが、メソッド呼び出しの専用 case がなく、呼び出すと「未対応：<型> の『<名前>』はこの説明では解釈できません」でその経路が止まる（全件を実実行プローブで確認済み）。組み込みと同様、専用項目を作ると実態と食い違うため項目化せず宣言化する。数値型の属性 real／imag／numerator／denominator は専用処理で実値が返るためフォールバックではない（メソッドではなく属性であり、対象外）。

| 型 | 名前（全数） | 理由 |
|---|---|---|
| str（18件） | casefold、center、encode、expandtabs、format_map、isprintable、istitle、ljust、maketrans、partition、removeprefix、removesuffix、rjust、rpartition、splitlines、swapcase、translate、zfill | いずれも整形・分割・判定の応用メソッドで専用 case がない。特に casefold は lower との使い分けが教材論点になりうるが、未対応である以上は宣言で明示するに留める。str.format は参照専用項目が既にあるため、この群には数えない |
| dict（1件） | fromkeys | クラスメソッド的な生成方法で専用 case がない |
| set（3件） | isdisjoint、issubset、issuperset | 関係判定の3件。演算子（<=、>= 等）や他の集合メソッドは専用処理があるが、この3件は専用 case がない |
| int（7件） | as_integer_ratio、bit_count、bit_length、conjugate、from_bytes、is_integer、to_bytes | 整数の応用メソッド群で専用 case がない |
| float（5件） | as_integer_ratio、conjugate、fromhex、hex、is_integer | 浮動小数点数の応用メソッド群で専用 case がない |
| bool（7件） | as_integer_ratio、bit_count、bit_length、conjugate、from_bytes、is_integer、to_bytes | int の属性表を継承するメソッド群で、bool としても専用 case がない（実実行プローブで確認） |

## with 項目（参照専用）— 文面を実装の実態に合わせて修正

| 対象 | 裁定 | 理由 | 根拠 |
|---|---|---|---|
| with | 項目文面を修正（項目の追加・削除はなし。supported=false の参照専用分類とエンジン挙動は変更しない） | 従前の文面は「未対応として停止」と読めるものだったが、実装は (1) コンテキスト式を評価し、(2) as 変数に「with で開いた値」という未確定値を束縛し、(3) 本文を実行する部分実行である（イテレータや未確定値を渡した場合は出入りの出力をプレースホルダで示す）。__enter__／__exit__ の実際の処理や後始末は再現されない。`with open(...)` が停止するのは open 自体が未対応のためである。summary／pitfalls と、index.js で付加される注記をこの実態に合わせて書き換え、使用例も部分実行で実際に動く形（独自コンテキストマネージャ＋本文の print）に差し替えて実実行確認した | エンジン `js/types/python/engine.js` の with 実行部（式の評価→as 変数への未確定値の束縛→本文の実行）。一次情報としての with の意味は reference/compound_stmts.html#the-with-statement |

## CloudFormation 第1層（固有4件）— 全件「固有項目を追加」で処置

いずれもハンドラの event／応答として実際にコードで扱われるフィールドで、兄弟フィールド（fragment／params／requestId／status／templateParameterValues）には項目があった。根拠は全件 AWS 公式「マクロのリクエスト・レスポンス」。

| 名前 | 裁定 | 理由 |
|---|---|---|
| region | 固有項目を追加 | モデル既定 event に入りハンドラへ渡される（`js/types/cloudformation/index.js` の model.defaults.event）。event の出所を示す基本フィールド |
| accountId | 固有項目を追加 | 同上。アカウント ID のフィールド |
| transformId | 固有項目を追加 | モデル既定 event に入り、マクロ呼び出し時は呼び出し側のマクロ名で上書きされて渡される |
| errorMessage | 固有項目を追加 | 応答検査で実際に読まれる（status が success 以外／欠落のときに失敗理由として表示）。テストでも使用されている |

なお Python 委譲分の漏れは Python 側の追加（118件）がそのまま伝播して解消する（CloudFormation のリファレンスは pythonDefinition.reference を複製する構造）。新規 Python 項目の使用例は、ハンドラ内包形（def handler の内側にインデントした形）でも全件エラーなく実行できることを確認済み。

## DEVELOPMENT.md への宣言文案（コーディネーター反映用）

Python の対応範囲の宣言に、次の趣旨の文を追加する（文案）。

> Python：次の組み込み名は PY_BUILTINS の受理のみで専用処理はなく、呼び出すと未対応として停止します（リファレンス項目はありません）：ascii、breakpoint、bytearray、bytes、callable、classmethod、compile、complex、delattr、dir、eval、exec、frozenset、getattr、globals、hasattr、hash、help、id、issubclass、locals、memoryview、object、property、setattr、slice、staticmethod、super、vars。例外クラス名（Exception、ValueError 等25件）は raise 文と try のハンドラ照合でのみ処理し、コンストラクタ呼び出しを値として使う形は未対応です。また TYPE_ATTRS に載る次のメソッドは参照のみ受理され、呼び出しは未対応として停止します（リファレンス項目はありません）：str の casefold、center、encode、expandtabs、format_map、isprintable、istitle、ljust、maketrans、partition、removeprefix、removesuffix、rjust、rpartition、splitlines、swapcase、translate、zfill、dict の fromkeys、set の isdisjoint、issubset、issuperset、int の as_integer_ratio、bit_count、bit_length、conjugate、from_bytes、is_integer、to_bytes、float の as_integer_ratio、conjugate、fromhex、is_integer、bool の as_integer_ratio、bit_count、bit_length、conjugate、from_bytes、is_integer、to_bytes。with 文は部分対応です（本文は実行し、as 変数には未確定値が入り、__enter__／__exit__ の処理や後始末は再現しません。open との組み合わせは open 自体が未対応のため停止します）。

あわせて、DEVELOPMENT.md 種類別表の Python 行にある「42リファレンス」の記数は 160 への更新が必要です（本担当の変更範囲外のため未反映）。

## 裁定の内訳

- Python 第1層89件 → 新規89項目で処置（組み込み16＋str 26＋list 9＋dict 8＋set 14＋tuple／range 4＋構文12）。
- Python 第2層 math 4件 → 新規4項目で処置。
- 例外クラス25件 → 新規25項目で処置（カテゴリ「例外」）。
- フォールバック受理のみの組み込み29件＋TYPE_ATTRS フォールバックメソッド41件 → 項目化せず「現行どおり＋宣言化」（名前は全数列挙済み。宣言の反映はコーディネーター）。
- with 1件 → 文面修正（分類・挙動は不変）。
- CloudFormation 第1層（固有）4件 → 新規4項目で処置。Python 委譲分は Python 追加118件の伝播で解消。
- 新規項目の合計：Python 118件＋CloudFormation 固有4件。変更した既存項目：Python `with` 1件。python-r2.json は新規・変更の全123行を収録。
