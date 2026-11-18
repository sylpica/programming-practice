# B7 G5チーム報告書（関数型・イテレータ系：itertools／functools／operator）

担当：G5チーム。作業コピー `work/adv-b7-g5`（基盤 bc9ab93 系から複製）。GitHub 書き込みなし。
契約（advanced-interface.md）を群規約より優先し、リファレンスは正規形・配置は
`js/types/python/` 直下・ファイル名に `-advanced` を含む形で納品した。

## 区分別件数（全143件）

| 区分 | 件数 | 内訳 |
|---|---|---|
| 個別実装 | 136 | itertools 21、functools 12（Placeholder を除く supported 分）、operator 103 |
| 束ね値 | 1 | functools.Placeholder（単一の番兵オブジェクトを data として収載） |
| 例外対応付け | 0 | 自群に例外クラス項目なし |
| 未対応 | 0 | ― |
| 未検証 | 6 | functools.cached_property／partialmethod／singledispatchmethod／total_ordering／update_wrapper／wraps |
| 合計 | 143 | supported 137＋unverified 6。referenceAdvanced に全件収載、referenceOverrides は空 |

## 再分類と理由

- backlog の candidate は全件「実装」だったが、次6件はエンジンに必要な仕組みが
  無く、捏造を避けて未検証（status=unverified、呼び出し時は diag＋UNK で正直に停止）に倒した。
  - cached_property／partialmethod／singledispatchmethod：ディスクリプタ
    プロトコル（ユーザー定義クラス属性の `__get__`）と、属性アクセス時の
    インスタンス属性書き込みフックがエンジンに無い。
  - total_ordering：ユーザー定義クラスへ比較メソッドを合成する仕組みが無い。
  - update_wrapper／wraps：エンジンの関数値は属性（`__name__`／`__wrapped__` 等）を
    保存・読み出しできない。
- operator.abs／operator.pow は backlog の current 欄で「実装済み」だったが、
  コーディネーター訂正（接尾辞一致の誤検出119件）どおり基礎リファレンスに実在
  しない新規項目として referenceAdvanced に収載した。
- operator.is_none／is_not_none は CPython 3.12.3 に存在しない（公式ドキュメントで
  3.14 追加を確認）。自明な意味論のため supported とし、ドキュメントに基づき実装した。
- functools.Placeholder は 3.14 追加で 3.12.3 に無い。ドキュメントに基づき実装
  （partial の位置スロット、キーワード値不可、呼び出し時の不足は TypeError）。
  不足時の TypeError 文面はドキュメントに明記がなく自作文面（要確認事項として記録）。
- itertools.batched の strict（3.13+）の ValueError 文面 `batched(): incomplete batch`
  もドキュメントに逐語の記載がなく自作文面（同上）。

## イテレータ表現の設計判断と根拠

エンジンの ITER 値（{__iter, kind, used, pos}、pull による遅延生産、iterPull の
バッファ→pos→pull 消費）を調査した上で次を採った。有限イテレータをリストで
返す近似は、len() が効く・再反復できる等の観測可能な差異があるため採らない。

- 有限の itertools 戻り値は、実体化した配列を持つ正規の ITER として返す。
  これにより len() が TypeError になり、単回消費・next()・消費位置の共有が
  CPython と一致する。代償として、入力の消費タイミングが構築時に前倒しになる
  （観測可能な差異として明記。値そのものと全消費後の入力位置は一致する）。
  islice／takewhile 等はカーソル経由で必要分だけ消費し、無限入力でも動作する。
- 無限イテレータ（count、空でない cycle、times 省略の repeat）は pull クロージャを
  持つ ITER で表す。生産上限は 10,000 件で、超過時は failed フラグ＋UNK に倒して
  ハングを防ぐ。実体化・ドレインの上限は 100,000 件（エンジンの MAX_RANGE と同値）。
  組み合わせ系（product／combinations／permutations）は総数を BigInt で数え、
  上限超過は UNK＋診断にする。
- groupby は eager 方式：外側 ITER が (キー, ITER(グループ項目, '_grouper')) を返す。
  CPython との差異：次のキーへ進んだ後も前のグループが読めてしまう（CPython は無効化する）。
- tee は入力を一度だけ実体化し、同じ配列を共有して pos だけが独立した ITER を
  n 個返す（有限入力では複製独立性が正確に再現される）。

## 照合方法と範囲

- CPython 3.12.3 実走（/usr/bin/python3）：全項目のエラー文面・境界挙動を採取して
  実装とテストに反映（accumulate／islice／tee／partial／lru_cache／operator の
  arity 文面など）。lru_cache のキー化規則（引数1個・非タプル時は型区別、
  キーワードは呼び出し順がキーになる等）は実走の観測に基づく。
- 公式ドキュメント 3.15（各モジュールページ）：3.12.3 に無い項目
  （Placeholder、batched の strict、is_none／is_not_none）の意味論と追加バージョンを確認。
- F-04：リファレンス例題133件（supported のうち matmul 系4件を除く）を CPython 実走と
  エンジン実行で全件突き合わせ、完全一致を確認。期待値表は
  `tests/muse-adv-b7-g5-expected.js`（CPython 実走から生成）。
  matmul 系4件は、既知の型では CPython どおり TypeError、ユーザー定義クラスでは
  エンジンの @ 演算子自体が未対応で停止することを個別テストで確認した。
- 振る舞いテスト：`tests/muse-adv-b7-g5.test.js` 全22ブロック通過
  （典型・境界・異常、イテレータ意味論、lru_cache のキー化行列と追い出し、
  partial／Placeholder、singledispatch、in-place のエイリアス意味論を含む）。
- 回帰確認：基盤テスト 7/7、math テスト 92/92、engine 43/43、types 25/25 が通過。

## 既知の微差（実装済みだが CPython と完全一致しない点）

1. groupby：進んだ後の過去グループが読めてしまう（上記）。
2. 有限 itertools の入力消費タイミングが構築時（上記）。
3. cmp_to_key のキー同士の `==` は比較関数を呼べない（eq フックには静的 ctx しか
   渡らず、ユーザー関数を呼べない）。順序比較（<、<=、>、>=）は通常 ctx で再現する。
4. キーワード引数の受け渡し：ctx.call が位置引数専用のため、共通基盤
   callWithKwargs が stdlib 実装・ネイティブには直接届け、ユーザー定義関数には
   「位置引数の直後から連続する末尾領域を埋める場合」に限りパラメータ並びで
   位置引数化して届ける。デフォルト付き引数を飛ばす形などは UNK＋診断に倒す。
5. partial で位置とキーワードが同じパラメータに重なった場合は、TypeError でなく
   未確定に倒す（上記4の帰結）。
6. singledispatch の注釈形式 register は、組み込み型名の単純な注釈のみ対応。
7. operator の関数オブジェクト同士の同一性（operator.add is operator.add）は
   エンジンの METHODREF 生成方式のため未確定（CPython では同一オブジェクト）。

## 基盤要請・確認事項

1. **ctx への kwargs 付き call の追加**（最重要）：現状の位置引数専用 call が、
   partial／lru_cache／singledispatch／methodcaller／operator.call のユーザー関数
   宛て kwargs 受け渡しを制限している（微差4）。
2. **モジュールクラスの kwargs 二重評価バグ**：engine.js の stdlibModuleCall が
   評価済み kwargs を stdlibConstruct へ渡し、stdlibConstruct が stdlibKwargs で
   再評価するため、`functools.partial(dict, a=1)` のようなモジュール属性経由の
   構築ではキーワード値が UNK 化する（from-import 経由は正常）。全群の
   モジュールクラスに影響しうるため基盤側の修正を要請する。
3. **ディスクリプタ `__get__` フック**（ユーザー定義クラス属性）：cached_property／
   partialmethod／singledispatchmethod の前提。
4. **属性アクセス時のインスタンス属性書き込みフック**：cached_property の前提。
5. **ユーザー定義クラスへのメソッド合成**：total_ordering の前提。
6. **関数値の属性保存・読み出し**：wraps／update_wrapper の前提。
7. **eq フックへの実 ctx 付与**：cmp_to_key の等価比較の前提。
8. **@ 演算子（binop '@'）のサポート**：operator.matmul／imatmul の前提。
   現状は既知の型への TypeError 先行判定のみで、インスタンスは未対応停止になる。
9. **slice() 組み込み関数の値化**：現状 slice 値は添字構文内部でしか作れず、
   operator.getitem／setitem／delitem／itemgetter のスライスキーに到達できない
   （実装側はスライス値が渡れば処理できるよう対応済み）。
10. **クラス継承（class B(A)）のサポート**：singledispatch の継承チェーン経由
    ディスパッチの前提（現状エンジンは継承自体が未対応で停止する）。
11. **lambda 式のサポート**：利用者プログラム側の制約。リファレンス例題は
    lambda を避けて def／operator 関数で記述した。
12. ctx.getitem／setitem／unop／getattr 相当のヘルパー基盤化（G5 は
    impl-advanced-g5-common.js に自作した。他群と重複しうるため基盤化が望ましい）。
13. 要確認事項：batched の strict 時 ValueError 文面と、Placeholder 不足時の
    TypeError 文面は公式ドキュメントに逐語記載がなく自作文面とした
    （3.13／3.14 実走での裏取りが望ましい）。

## 残存

- 自群の担当範囲に残存はない。統合側の作業として、advanced-engine.js への
  impl-advanced-{itertools,functools,operator}.js の import 追加と、
  advanced-manifest.js の referenceParts への3ファイル追加が残る
  （共有ファイルのため G5 からは触っていない。集約は group-advanced-g5.js が提供）。

## 作成ファイル一覧

- js/types/python/impl-advanced-g5-common.js（G5 共通基盤：カーソル、getattr／getitem、kwargs 付き呼び出し）
- js/types/python/impl-advanced-itertools.js（21件）
- js/types/python/impl-advanced-functools.js（19件）
- js/types/python/impl-advanced-operator.js（103件）
- js/types/python/reference-advanced-itertools.js／reference-advanced-functools.js／reference-advanced-operator.js（正規形リファレンス）
- js/types/python/group-advanced-g5.js（集約：referenceAdvanced 143件＋referenceOverrides 空）
- tests/muse-adv-b7-g5.test.js／tests/muse-adv-b7-g5-expected.js（F-04 期待値表）
- docs/audit/gen-ref-g5.py（リファレンス生成器）／docs/audit/b7-g5-report.md（本報告書）
