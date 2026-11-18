# B7 G4 報告書：コレクション・データ構造系（Python 標準ライブラリ高度モード）

担当16モジュール・全346項目をリファレンス収載し、検証できた範囲を実装した。
作業は専用コピー `adv-b7-g4` 内のみ、新規ファイルの追加のみ（共有ファイルは無変更）。
契約（advanced-interface.md）を規約文書より優先し、リファレンスは正規形
`{name, category, syntax, description, example, caution?, status, returns?, source?}`、
配置は `js/types/python/` 直下・ファイル名に `-advanced` を含む形に統一した。

## 区分別件数

| 区分 | 件数 | 備考 |
|---|---|---|
| 個別実装（supported） | 224 | 意味論を個別に実装し CPython と照合 |
| 束ね値（supported） | 4 | weakref.ProxyTypes、dataclasses.MISSING、dataclasses.KW_ONLY、types.UnionType |
| 例外対応付け（supported） | 3 | copy.Error、graphlib.CycleError、dataclasses.FrozenInstanceError |
| 未対応（unsupported） | 13 | array 2、contextlib 10、dataclasses 1 |
| 未検証（unverified） | 102 | 下記「残存」参照 |
| 合計 | 346 | status 内訳：supported 231 / unsupported 13 / unverified 102 |

## モジュール別内訳（supported / unsupported / unverified）

| モジュール | 計 | supported | unsupported | unverified |
|---|---|---|---|---|
| collections | 46 | 46 | 0 | 0 |
| collections.abc | 27 | 26 | 0 | 1 |
| heapq | 13 | 13 | 0 | 0 |
| bisect | 6 | 6 | 0 | 0 |
| array | 23 | 17 | 2 | 4 |
| copy | 4 | 3 | 0 | 1 |
| pprint | 12 | 9 | 0 | 3 |
| reprlib | 19 | 19 | 0 | 0 |
| enum | 61 | 30 | 0 | 31 |
| graphlib | 8 | 8 | 0 | 0 |
| weakref | 21 | 1 | 0 | 20 |
| contextlib | 24 | 6 | 10 | 8 |
| contextvars | 17 | 17 | 0 | 0 |
| dataclasses | 14 | 11 | 1 | 2 |
| abc | 10 | 7 | 0 | 3 |
| types | 41 | 12 | 0 | 29 |

## 再分類・件数の訂正（項目名と理由）

- **担当件数の訂正**：タスクヘッダの collections 73件は backlog 実数46件＋collections.abc 27件の
二重計上だった。backlog を正として G4 総数は **346件**（ヘッダ合算373件ではない）。
- **dataclasses.__post_init__**：CPython にモジュール属性として存在しない（hasattr が False を確認）。
実装対象ではなく unsupported として収載した。
- **collections.Counter.fromkeys**：CPython 自身が NotImplementedError を送出する仕様のため、
その挙動を再現して supported とした。
- **UserDict.popitem**：CPython 3.12.3 実走で「最初に挿入された組」を取り出すことを確認し
（dict.popitem と異なる）、実装・説明をそれに合わせた。
- **contextvars.Context.get / Context[var]**：CPython 実走で「変数の既定値へフォールバックしない」
（get は引数 default、添字は KeyError）ことを確認し、その意味論で supported とした。
- **heapq の \*_max 系（heapify_max 等6件）**：3.14+ 追加でローカル 3.12 には存在しない。
公式ドキュメント記載の意味論を、否定ミラー（符号反転した通常版との等価性）で独立検証し supported。
- **enum.ReprEnum**：関数型 API のみの使用は CPython で TypeError になる（実使用はクラス構文の
ミックスイン）。検証可能な形で再現できないため unverified に倒した。
- **array.typecodes**：3.15 で str から tuple に変更され、正確な内容を一次情報で確定できないため unverified。
- **pprint.pprint / pp / PrettyPrinter.pprint**：エンジンの ctx に出力 API が無く、print 先を
再現できないため unverified（pformat 系は supported）。
- **abc.ABCMeta.register の登録先識別**：classMethods がレシーバのクラスを受け取れない基盤仕様の
ため、登録先 ABC の限定名をクロージャに焼き込む方式で supported を維持した（基盤要請7参照）。

## 照合方法と範囲

- 一次情報：公式ドキュメント（docs.python.org/ja/3.15）とローカル CPython 3.12.3 の実走。
- supported 項目のリファレンス例は全231件について、CPython 実行結果（226件を実走採取、
3.13+ の2件はドキュメント照合、heapq \*_max の3件は否定ミラー検証）とエンジン実行結果を
機械比較し、全件一致を確認した（F-04 照合はテストファイルのケース表で実施）。
- 例外は型で照合した（メッセージにアドレスを含むものがあるため）。例外メッセージ自体は
CPython の英語原文を実装に埋め込んだ。
- テスト：`tests/muse-adv-b7-g4.test.js` 全11件通過。基盤・math パイロットの既存テスト
99件も再実行し回帰なしを確認した。

## 基盤要請・確認事項

1. **kwargs の二重評価**：モジュール属性経由のクラス構築 `mod.Class(kw=...)` では
kwarg の値が未確定値に化ける（stdlibKwargs が二重に変換される）。from-import 形は正常。
全 B7 群に影響する。G4 では例・テストを from-import 形に寄せて回避した。
2. **dataclasses のクラス内部介入フック**：@dataclass はユーザー定義クラスの内部へ
`__init__` 等を注入する必要があり、現基盤では到達できない。dataclass デコレータと
InitVar は unverified。make_dataclass 経由の生成クラスについては fields/asdict/astuple/
replace まで supported（caution に明記）。
3. **with 文が \_\_enter\_\_/\_\_exit\_\_ を呼ばない**：contextlib の with 依存挙動
（contextmanager、closing、suppress、redirect_*、nullcontext、ContextDecorator、
ExitStack.enter_context）は unverified。ExitStack の明示呼び出し（callback/close/
pop_all/push）は supported。基盤側で with の出入り呼び出しが入れば再検証できる。
4. **ctx に出力 API が無い**：pprint の出力系3件が unverified の理由。出力 API があれば解消する。
5. **`is`/`is not` がネイティブ値で未確定になる**：同一性比較が再現できない。例・テストでは
`==` で代替した。基盤側の対応が望ましい。
6. **その他の基盤制約**（いずれも caution・本報告に明記して回避済み）：
ネイティブへの属性代入不可、getattr フォールバック無し、クラス値（\_\_ncls）の
getitem/iter/len/contains 未経路、組み込み値の native ABC に対する isinstance 不可、
bytes が未確定値（array.frombytes/tobytes が unverified の理由）、
Ellipsis/NotImplemented 単例へ到達不可、ネイティブのハッシュキー空間が tuple/int キーと
未統一（namedtuple や IntEnum メンバーをキーにした辞書引きが外れる）、
組み込み `hash()` 自体が未対応、組み込みクラス値の repr が日本語ラベルになる表層差異
（defaultdict の factory 表示等）。
7. **classMethods の第4引数（レシーバのクラス）追加**：現行は (ctx, args, kwargs) のみ。
ABC.register のような「レシーバのクラスが意味を持つ」クラスメソッド全般に必要。
8. **advanced-manifest.js への配線**：B7 各群で python 型を共有するため、G4 分の manifest
配線（group-advanced-g4.js の import と REF_G4 の登録）はコーディネーター側の作業として要請する。
自群では manifest を作っていない。
9. **contextvars の制約**：エンジンに文脈伝播の概念がないため、モジュールレベルの単一文脈として
再現した。Context.run の「実行中の set が文脈側に保存される」意味論は CPython 実走で確認済み。
なおモジュール状態は同一プロセス内の simulate() をまたいで持続するため、例は特定の変数だけを
参照する形に設計した。

## 残存（未検証102件の内訳と理由）

- enum 31件：クラス本体の仕組みに依存（EnumType の反復・添字・dir、EnumDict、
member/nonmember/property 等のクラス構文専用機能、内部メソッド群）。
- types 29件：型オブジェクト群。実体化が基盤外（FunctionType 等）か、単例を返せない
（EllipsisType/NotImplementedType）か、3.15 追加で一次情報の確定が弱いもの
（LazyImportType、FrameLocalsProxyType 等）。
- weakref 20件：GC が無いエンジンでは参照の死が観測できず、意味論を確定できない（捏造禁止）。
- contextlib 8件：with 依存（基盤要請3）。未対応10件は非同期系9件＋chdir（ファイル系なし）。
- array 4件：buffer_info（アドレス）、frombytes/tobytes（bytes 表現）、typecodes（3.15 変更）。
- abc 3件：ABCMeta 本体（メタクラス）、\_\_subclasshook\_\_（NotImplemented を返せない）、
update_abstractmethods（抽象性の強制が基盤外）。
- pprint 3件：出力 API 不在（基盤要請4）。
- dataclasses 2件：dataclass、InitVar（基盤要請2）。
- collections.abc 1件：ByteString.index（抽象クラス上のミックスインで実地検証できない）。
- copy 1件：replace（3.13+、ローカル 3.12 に無く検証範囲が限定されるため）。

## 作成ファイル（全て新規、js/types/python/ 直下）

- 実装17件：impl-advanced-g4-common.js、impl-advanced-{collections, collections-abc, heapq,
bisect, array, copy, pprint, reprlib, enum, graphlib, weakref, contextlib, contextvars,
dataclasses, abc, types}.js
- リファレンス16件：reference-advanced-{同上モジュール}.js（各ファイルが referenceAdvanced を export）
- 集約1件：group-advanced-g4.js（全 impl を import し REF_G4 を export）
- テスト1件：tests/muse-adv-b7-g4.test.js
- 本報告書：docs/audit/b7-g4-report.md
