# 高度モード補完ブロック B4S 報告書（R stats／utils パッケージ）

B4（VBA＋R base）が U-49（対象パッケージ＝base＋stats＋utils）のうち base のみを制作し、
stats／utils 全面分が未制作として申し送られた（ADV-B4-REPORT §6-1）ため、それを補完制作した。
土台は adv-b4 HEAD 147f892 のクローン。本報告書が B4S の正本記録であり、班別詳細は
`docs/audit/ADV-B4S-<班>.md`、監査は `adv-b4s-audit` コピーの `ADV-B4S-AUDIT.md`、
監査欠陥の修正は `docs/audit/ADV-B4S-FIX.md` にある。

## 1. 分母の確定方法と件数

- 公式ヘルプ（stat.ethz.ch の R-devel ライブラリ索引）を B4 の棚卸しと同じ方法で機械解析した。
  - stats：索引 599 行／312 トピック
  - utils：索引 322 行／156 トピック
- 既存カバー済みで重複を作らない名前は 5 名（stats 由来で基礎層にある rnorm／runif／median／sd、
  utils 由来で B4 base の connections トピックにある clipboard）。
- **制作分母：916 名／466 トピック**（stats 595 名＋utils 321 名。median／sd の2トピックは
  全名が既存カバーのため制作対象から除外）。
- 版差の扱い：分母は R-devel（4.6.0）の索引、実走照合は実 R 4.3.3。4.3.3 の名前空間に
  存在しない名前は公式ヘルプ本文のみで裁定し、その旨を班報告書に区別して記録した。
  なお当初「hashtab は 4.3.3 に存在しない」と想定したが、実測で 4.3.3 の utils 名前空間に
  14 名全てが実在することを確認し訂正した（裁定は可変参照オブジェクトのため未対応）。

## 2. 制作結果

| 班 | 担当 | 名前数 | 対応 | 未対応 | 未検証 | names |
|---|---|---|---|---|---|---|
| sdist | stats 分布 | 110 | 81 | 29 | 0 | 85 |
| sdesc | stats 記述統計 | 33 | 12 | 21 | 0 | 33 |
| stest | stats 検定 | 38 | 1 | 37 | 0 | 37 |
| smodel | stats モデル | 196 | 4 | 192 | 0 | 186 |
| sts | stats 時系列 | 127 | 9 | 118 | 0 | 122 |
| smisc | stats 多変量他 | 91 | 6 | 85 | 0 | 85 |
| udata | utils データ | 37 | 14 | 23 | 0 | 35 |
| umisc | utils 一般 | 284 | 2 | 282 | 0 | 247 |
| **合計** | | **916** | **129** | **787** | **0** | **830** |

- 対応 129 件は全てハンドラを実装し、実 R 4.3.3 の実走（または R 本体ソース移植＋差分
  バッテリ）で検証した。代表例：分布 d/p/q 系 60 件と r 系 21 件（引数検証つき
  freshUnknown）、quantile（type 1〜9 全型式）、var／cov／cor、p.adjust（実 R ソース移植、
  200 件照合）、na.omit／na.fail／na.pass／offset、diffinv／bw.nrd／runmed／smooth、
  convolve／ppoints／mahalanobis、head／tail／combn／URLencode／compareVersion、
  formatUL／formatOL（365 件差分バッテリ全件一致）。
- 未対応 787 件は全て理由を項目 description に名指しで明記した（htest／モデルオブジェクト
  返却、数式・環境・リスト返却、ファイル入出力、対話・GUI、パッケージ管理、文書見出し等）。
  値モデルで忠実に表せないものに部分実装はしていない（U-44 エラーゼロ原則）。
- 未検証は 0 件（一次情報で確定できないものは未対応に倒した。確定を試みた過程は班報告書）。
- テンプレート・用語集は追加していない（全件実行確認できるものだけという条件で見送り）。
- R の高度差分全体は本ブロックで **2,001 項目（対応 369／未対応 1,632／未検証 0）**、
  ハンドラ 349 件、advancedNames 1,759 名となった。基礎層 44 項目と合わせた
  R リファレンス総数は 2,045 項目。

## 3. 配線と前提更新

- 集約 3 ファイルに配線した：reference-advanced.js（part3〜part10 を追加）、
  names-advanced.js（同）、functions-advanced.js（班別グループ 8 ファイルを追加）。
- 既存テストの前提更新 2 件（いずれも分母拡張・対応化に伴う仕様変更であり、弱体化ではない）：
  1. `tests/adv-b4-audit-r.test.js`：監査マトリクスの対象 ALL を part1〜part10 に拡張し、
     B4S 分の件数ピン（916＝129／787／0、names 830、全体 2,001／1,759）を追加。
     part1／part2 の確定件数は不変。
  2. `tests/muse-fix-batch5-r.test.js` の R26-N25：rbinom／rpois が対応化されたため、
     未実装前提の名指し停止テストを「sample.int のみ」に縮小し、新挙動
     （不正引数は実 R 文言 `invalid arguments` で停止、正の引数は未確定値）を固定する
     テストを追加。実 R 4.3.3 の文言と一致することを実測した。
- precache は B4 の流儀（高度ファイル込み）で再生成し、`--check` 合格を確認した。
  統合側の機構流儀（高度差分の除外）への切替は統合第2弾の判断に委ねる。

## 4. 監査結果（ブロック範囲・多角検証）

### 4.1 コーディネーター機械照合
- 分母完全一致（916 名に項目ちょうど 1 つ）、基礎層・B4 との重複ゼロ、対応⇔ハンドラの
  双方向一致（129 件）、項目形式（7 フィールド正規形）全件、names 重複ゼロ。
- 名前空間照合：names に無い実在関数はブラケットメソッド 9 件のみ（キュレーション規則
  どおり）。names にあって 4.3.3 名前空間に無いのは Windows 専用 29 名ちょうど
  （公式ヘルプで実在確認済み）。

### 4.2 独立監査（制作と独立したチームが別コピーで実施、6 角度全実施）
- 角度1 マトリクス独立再実行：欠陥なし。
- 角度2 対応 129 件の実 R 差分照合（独立プローブ 890 件）：値一致 754・エラー一致 125・
  不一致 11＋名前属性差 1 → 欠陥 F1〜F6・F9 を検出。
- 角度3 未対応 787 件の停止確認：誤った値を返す欠陥なし（全件エラー停止。層化サンプル
  55 件超で理由と公式ヘルプの矛盾なし）。
- 角度4 名前空間の独立照合：欠陥なし。
- 角度5 example 実行可能性：欠陥 F7（3 件）・F10（4 件）を検出。
- 角度6 テキスト正確性（formals 機械照合 786 関数・Usage 照合 868 件・目視 80 件）：
  欠陥 F8（syntax 事実誤り 5 件）のみ。
- 実 R 側の誤差と再裁定した非欠陥：qf（ncp=2）は SciPy が sim と一致し実 R がずれる。
  非心 t／F の ncp=100 も同様（制作側の既知差異を独立に再確認）。

### 4.3 監査欠陥 F1〜F10 の処置（修正チームが根因修正、詳細は ADV-B4S-FIX.md）
- F1 pnbinom の q=Inf が NaN → ppois 同型の Inf ガードを追加し実 R どおり 1／0／0 に修正。
- F2 離散 d 系の x=±Inf の余分な警告 → 共有ヘルパに有限性ガード。同根を全離散 d 系で洗浄。
- F3 rlogis の余分な警告 → 実 R に合わせて修正。同根として r 系全般の不正パラメータ時の
  警告・検証を実 R と照合し 7 件を合わせて修正。
- F4 rsmirnov の検証漏れ → 実 R の文言どおりの検証を追加。
- F5 rWishart の過剰停止 → 専用ハンドラ化し、n／df の検証を実 R の実測に合わせて修正。
- F6 setNames の不足分名付けが ""（実 R は NA）→ NA 埋めに修正（自班テストの期待値も
  実測根拠つきで更新）。
- F7 対応項目の example 3 件がシミュレータで実行不能 → 両環境で実行できる形に差し替え。
- F8 syntax の事実誤り 5 件（find／arima／arima0／lag.plot／diffinv／qr.influence）→
  formals と公式ヘルプ Usage の両方で確認して修正。
- F9 非心カイ二乗の大 ncp 精度 → 根因（Poisson 重みの絶対打切りが裾の支配項を落とす）を
  対数空間混合に置換して解消。280 件グリッド（ncp≤1000）で dchisq 対数の最大誤差
  5.5e-12、監査ケースは真値と相対 4e-15 まで一致（コーディネーターも mpmath 40 桁で
  独立再確認済み）。名指し停止・開示は不要と判断した。
- F10 ブラケットメソッド 4 件の example が実 R の式として解析不能 → 解析・実行可能な
  使用例に修正。
- 修正後の再検証：監査スクリプト再実行で角度2の不一致は「実 R 自身の誤差 2 件」と
  「未エクスポート .default メソッド 2 件（挙動不変）」のみに減少し、B4S 起因の
  不一致はゼロになった。新規回帰テスト 10 件（tests/adv-b4s-fix.test.js）で固定。

## 5. テスト結果

- 最終ツリー全スイート：**4,897 件中 4,889 合格・8 件失敗**。
- 失敗 8 件は全て土台側の既知事項で、土台 adv-b4 の対照実行（4,759 件・4,751 合格・
  同一 8 件の失敗）と失敗集合が完全一致した。内訳：VBA 側 7 件（B4 §5 で裁定済みの
  意図的挙動変更に伴うもの）と muse-fix-batch13-r の B13-R 1 件（土台でも同一失敗）。
  **B4S 起因の回帰はゼロ**、新規テストは 138 件（班テスト 127＋監査修正 10＋前提更新の
  分割 1）全て合格。

## 6. 残存（申告済み・未実施のまま棚上げしていない事項）

- ptukey／qtukey／psmirnov／qsmirnov：精度を一次情報で確定できず未対応（名指し停止）。
- bw.ucv／bw.bcv／bw.SJ：C 実装の数式を一次情報で確定できず未対応。
- runmed の NA 入力の完全再現には runmed.c の移植が必要（現状は名指し停止の範囲を明記）。
- .nknots.smspl：意味論は確定・検証済みだが、ドット始まり名が共有パーサに到達不能のため
  ハンドラ未登録（項目は未対応。パーサ対応時に昇格可能）。
- dsignrank（n>400）／dwilcox（DP セル数 >3e7）は規模ガードで名指し停止。
- 実 R 自体の不具合を再現しない逸脱 2 件（qbirthday の無限ループ回避、pbirthday の
  classes ベクトルのゴミ値回避）。
- NA を含む名前属性の print 表示で `[object Object]` になる artifact が基礎層 index.js
  起因で残る（B4S の範囲外。統合側・横断班への申し送り）。
- p.adjust の引数 n に NA／ベクトルを渡した場合のエラー文言のみ未実測（推定文言で実装、
  通常範囲に影響なし）。
- formatUL／formatOL の数値ラベル整形は formatRNum 近似（極端な桁数では実 R の format()
  と差が出うる）。
- rWishart の example は値モデル表現形（ベクトル形）に差し替えた。実 R では行列必須で
  あり、行列を生成する式は全てシミュレータ未対応のため、単一の example で両環境の
  実行可能性と実 R の型要件を両立できない（caution に diag(2) との等価を明記）。

## 7. 統合時の申し送り（B4 との差分ファイル構成）

- **統合第2弾では adv-b4（147f892）ではなく本ツリーを R の正本として取り込むこと。**
  本ツリーは B4 の完全な上位集合（B4 の全ファイル＋以下）である。
- 新規ファイル：
  - `js/types/r/reference-advanced-part3.js`〜`part10.js`（part3=分布、part4=記述、
    part5=検定、part6=モデル、part7=時系列、part8=多変量他、part9=utilsデータ、
    part10=utils一般）
  - `js/types/r/names-advanced-part3.js`〜`part10.js`
  - `js/types/r/functions-advanced-statsdist.js`／`-statsdesc.js`／`-statstest.js`／
    `-statsmodel.js`／`-statsts.js`／`-statsmisc.js`／`-utilsdata.js`／`-utilsmisc.js`
  - `tests/adv-b4s-*.test.js`（8 ファイル）＋ `tests/adv-b4s-fix.test.js`
  - `docs/audit/ADV-B4S-*.md`（班報告書 8 件＋FIX＋本報告書）
- 変更ファイル：集約 3 ファイル（reference-advanced.js／names-advanced.js／
  functions-advanced.js）、precache.js（再生成済み）、前提更新したテスト 2 ファイル
  （adv-b4-audit-r.test.js／muse-fix-batch5-r.test.js）。
- 監査用コピー `work/adv-b4s-audit/` は検証専用（監査報告書と検証スクリプトを含む）で、
  統合対象ではない。
- 環境注記：実 R 4.3.3 は本 VM では apt のプロキシ滞留のため .deb 直接取得
  （r-base-core 4.3.3-2build2＋libpaper1＋libpaper-utils）で導入した。VM が再配置されると
  失われるため、統合後の監査ラインで実 R が要る場合は再導入が必要。
