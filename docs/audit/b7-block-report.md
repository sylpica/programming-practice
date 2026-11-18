# B7 ブロック最終報告書（Python 標準ライブラリ・高度モード）

作成：B7 コーディネーター（2026-11-17）。作業ツリー：`~/workspace/programming-practice-audit/work/adv-b7/`（ベース repo-reffix HEAD bba3b26、統合コミット baa76fa＋U 是正 84c32aa の上に追補 R1〜R6 をマージ済み）。

## 1. 成果の確定値（カタログ機械監査・実測）

監査スクリプト `adv-b7-tools/audit-catalog.mjs` の最終実行結果：

| 項目 | 値 |
|---|---|
| backlog（F-16 対象） | 10,572 件 |
| covered（収載済み） | **10,572 / 10,572（全件）** |
| referenceAdvanced | 10,563 件 ＋ referenceOverrides 9 件（math の基礎重複） |
| supported（個別実装／束ね値解決） | **3,251 件** |
| unverified（未検証） | **1,771 件** |
| unsupported（未対応） | **5,541 件** |
| problems（正規形違反・重複・未収載等） | **0 件** |
| 登録モジュール／クラス／例外 | 172 ／ 773 ／ 148 |
| example 省略 | 4,899 件（未対応項目のみ。契約差異として §5 に明記） |

F-16 配分との対応：呼び出し可能 3,693 件＋束ね値 1,986 件のうち、一次情報で意味論を確定できたものが supported 3,251 件、確定できなかったもの（環境依存値・bytes／複素数型依存・動的ディスパッチ依存等）は捏造せず unverified 1,771 件に倒した。例外 133 件はリファレンス収載＋エンジン例外（登録 148 クラス、親チェーン付き）へ対応付け済み。未対応は F-16 の 4,760 件（I/O・OS・GUI・ネットワーク・プロセス系）に、担当範囲内で意味論を再現できない項目（csv.Sniffer のヒューリスティクス、re の possessive 量指定子・条件パターン等）を加えた 5,541 件で、全件リファレンス収載＋画面ラベル（status）付き。44 件の未確認モジュールは捏造せず未確認のまま（項目自体を作らない方針どおり）。

## 2. テスト結果

- B7 群テスト（tests/muse-adv-b7-*.test.js）：**1,457 件全合格**
- 全スイート（node --test tests/*.test.js）：**6,054 件全合格・回帰ゼロ**（ベースライン 4,597 件を含む。パスキャップ系の時間予算テストも今回は全通過）
- フィクスチャ是正（一次情報＋実測証拠に基づくもののみ、弱体化ではない）：
  - G11 TALLY を {supported: 168, unsupported: 157, unverified: 166} へ更新（R3：io の2件を unverified 化）
  - G10 の集計期待値を 950→952 件／supported 524→526 へ更新（R3 で新規実装した xml.is_valid_name／is_valid_text の2件が G10 の集計範囲に正当に入るため）

## 3. 実施内容の要約

- 基盤：`stdlib-registry.js`（モジュール／クラス／例外レジストリ）＋ engine.js への汎用ディスパッチフック群（全てレジストリ存在でガード。登録が空なら簡易モードと完全同一挙動）。math は高度モードで registry 経路へ載せ替え。
- 群実装 G1〜G13＋U（担当外104モジュールの未対応収載）の14チームで並行実装し、CPython 3.12.3 実走照合を各群の監査に組み込んだ。代表例：unicodedata 全1,114,112コードポイント一致、decimal は照合1,028ケース全一致、statistics は CPython の厳密有理数演算を移植、random は MT 初期化の実バグ（32bit 乗算精度落ち）を検出・修正。
- 基盤修正 F-A〜F-P（F-K のみ見送り）：dotted import 別名束縛、kwargs 二重評価の冪等化、属性代入（setattr フック／属性バッグ／上書き表）、getattr フォールバック、ネイティブの `is`、単項演算・組み込み関数（abs/round/int/float/divmod）の委譲、format 書式指定の委譲、isinstance の ABC 接続、例外値の属性保持（errAttrs チャンネル）、del のネイティブ対応 等。
- 追補ラウンド R1〜R6：カタログ監査の problems 255件（caution 正規化・未検証文言・重複収載・未収載2件）を全件解消し、到達不能 supported の実走プローブ裁定、例外属性（PatternError／JSONDecodeError）の配線、mock の子モック自動生成、Element／Message の setattr 配線、timedelta 単項演算、date／datetime／time／Fraction／Decimal の format フック、Decimal の round フック（int を返す CPython 意味論）等を実装。
- 前提訂正3件（一次情報が従前の裁定に勝ったもの）：(1) `IPv4Interface == IPv4Address` は False が正しい。(2) Decimal は numbers.Number に登録されている（Real には登録されない）。(3) `round(Decimal('2.5'))` は int の 2 を返す。

## 4. 監査（角度カタログ）

ブロック範囲で実施した角度：一次資料照合（公式ドキュメント 3.15／CPython 本体ソース）、CPython 実走との差分照合（各群＋R5 の1,466件差分照合等）、F-04 例題の両エンジン突合（G5 全133件・G8 supported 483件）、カタログ機械監査（正規形・重複・到達可能性・precache 命名適合）、全スイート回帰確認、実走プローブによる到達可能性裁定。
対象外（理由）：実ブラウザでの画面操作確認はモード機構（ローダー／画面）の統合後に親工程で実施する範囲であり、B7 の差分範囲外。到達不能と静的解析が判定した supported 59件は、動的クラス・インスタンスデータ属性・例外属性チャンネル経由で到達可能であることを実走プローブと群テストで確認済み（真に到達不能だったものは R ラウンドで unverified 化済み）。

## 5. 契約差異（統合時の裁定事項）

1. **example の省略**：契約第4章は example を必須とするが、未対応 4,899 件は捏造回避のため example を全件省略した（U チーム裁定）。統合時に裁定されたい。
2. **engine.js のフック位置**：B7 の engine.js にはレジストリ存在でガードされた汎用ディスパッチフックが入っている（モード分岐ではない。登録は advanced-engine.js 経由でのみ起きる）。契約の「エンジン拡張は applyAdvancedEngine フック経由のみ」との関係は、機構コーディネーター／B1 初例での確認事項。
3. **precache**：統合で増えた全ファイルが除外パターン（`-advanced` 含有等）に適合することを機械確認済み。ただし現行 scripts/precache.mjs には除外ロジックが無いため、**precache の再生成は機構側で除外実装とセットで行うこと**（B7 側では再生成していない）。

## 6. 残存・基盤要請

- **統一 bytes 型**（最大の基盤要請）：G7／G13 が群内専用 bytes 表現を個別に持つ不整合が残る。bytes 依存の未検証は G7／G10／G11 合わせて数百件規模。基盤に統一 bytes 型が入れば一括で supported 化できる見込み。
- **複素数型なし**：cmath 全件と複素数依存項目が未対応／未検証。
- **with 文が __enter__/__exit__ を呼ばない**（エンジン制約。as 変数は未確定値）。
- F-K（simulate 実行単位のモジュール状態初期化）は見送り、既知差異として記録。issubclass 組み込み関数は未実装。lambda は未対応（エンジン制約）。
- math の gamma／lgamma：最終グリッドで gamma 19/450 件・lgamma 11/450 件の1ulp 不一致が残存。全て「真値が丸め境界の約3e-18 相対以内にある」コインフリップであり、これ以上の追及は打ち切り済み（照合の正は数学的真値＝mpmath の最近接 double であって CPython のビット一致ではない）。
- sys.getrecursionlimit はエンジンの実上限（MAX_CALL_DEPTH=40）を返し supported とした（caution に CPython 既定1000との差異を明記）。「エンジンの真の事実」としての裁定。
- R ラウンド個別残存：IntEnum への単項 `~` は未実装（TypeError のまま）、csv.DictReader の line_num は未実装、re 置換テンプレートの範囲外数値グループ参照は IndexError のまま（CPython は PatternError。裁定待ち）、利用者コードが直接 raise した PatternError には属性が付かない、mock の `call()()` 経由の親 mock_calls 伝播は未実装、http.cookies.Morsel の read-only 属性への代入は属性バッグ保持となり CPython の AttributeError と差異、decimal.Context の `c.traps[X] = 値` の dict 項目代入は書き戻されない。
- 掃除任意残件：math 実装内のデッドコード（gserP／gcfQ／gammaLanczos／lgammaLanczos）。実施しない方針どおり未実施。
- 作業ツリー直下の `.probe`／`.probe2`／`.write-test`（0バイトのプローブ残骸3件）は削除が書き込み操作のため現状では除去できていない。統合時に削除されたい。

## 7. コミットについて（重要）

2026-11-17 02:35 UTC 頃から VM 全体で exec（シェル）経路の書き込みが EPERM で全面遮断されており（ファイルツール経由の書き込みのみ可能）、**git commit が実行できない**（`git add` が "unable to write loose object file: Operation not permitted" で失敗することを最終確認済み）。本報告書を含む全成果は adv-b7 の作業ツリーに揃っており、全ファイルの内容は各 R ツリー正本との md5 一致で検証済み。**書き込み経路の回復後、親工程で `git add -A && git commit` を実施されたい**（変更57件規模：追補マージ＋配線追加＋フィクスチャ是正2件＋本報告書）。GitHub への書き込みは一切行っていない。
