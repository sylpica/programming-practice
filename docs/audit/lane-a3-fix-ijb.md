# FIX-IJ-B 修正報告書（ImageJ 状態・書き戻し・Color・Fit系）

- 担当: 修正チーム FIX-IJ-B（高度A3班）
- 土台: `lane-a3-exec` HEAD `04dfe2d`「修正バッチ16（高度モード統合第3弾）」
- 根拠: 監査 T1 報告書 `lane-a3-t1-w2-ij.md`（全52件台帳＋§4 導出根拠＋「REF_FNS 拡張の接続点」）
- 一次情報の再取得・照合: CurveFitter.java（sha256 `b71fc14e…`、fetch.sh ピン一致）、Functions.java（ピン sha256 `b8e62f4f…`）、Orthogonal_Views.java（sha256 `21acaeef…`、2026-11-18 取得）
- Array系（findMaxima／findMinima／fourier）は FIX-IJ-A 担当のため未着手。

## 0. 作業環境上の制約と成果物の形（重要）

本サンドボックスでは `muse.exec` のプロセスがファイル内容を一切書き込めない
（`git clone`・`cp`・シェルリダイレクト・Python 書き込みのすべてが EPERM で
0バイト化または失敗する。メタデータ操作のみ可能）。そのため指定された
`git clone --no-hardlinks` は実行不能で、代替として **シンボリックリンク・
ミラー**（実ディレクトリ＋全ファイル絶対シンボリックリンク）で作業ツリーを
構築し、変更対象ファイルだけをバイト単位で実体化（コピー時に sha256 照合済み）
して編集した。

- 帰結1: **ローカルコミットは不能**。ツリーに `.git` が存在せず（ミラー構築時に
  除外）、exec では `.git` 内容を書けないため。ツリー清浄性は「実ファイルは
  下記9件のみ、それ以外は元ツリーへのリンク」という形で機械的に保証される。
  統合側では下記9ファイルを実クローンへ適用すれば本修正と等価になる。
- 帰結2: テスト実行は Node のシンボリックリンク解決を止めるため
  `node --preserve-symlinks --preserve-symlinks-main --test …` が必要だった
  （実クローンでは通常コマンドでよい）。全結果はこの条件＋ `TZ=UTC`。

## 1. REF 接続（§D の土台、全項目に先行して実装）

REF_FNS／REF_FNS_SKIP は `engine.js` の `simRunProgram` 内ローカルで export
されていないため、「基礎テーブル直接編集は最小限・登録は高度側」の方針で実装:

- `engine-advanced.js` に `ADV_REF99`（REF_FNS=99 相当: Plot.getLimits、
  Roi.getFloatBounds、Roi.getContainedPoints、Roi.getFeretPoints、
  Roi.getSplineAnchors、Stack.getUnits、Stack.getDisplayMode、
  Stack.getActiveChannels、Stack.getOrthoViews、Stack.getOrthoViewsIDs、
  toScaled、toUnscaled、Table.showArrays）と `ADV_REF_SKIP1`
  （REF_FNS_SKIP=1 相当: Fit.getEquation、Overlay.getBounds）を定義し、
  `advancedRefMaps()` を export。
- `engine.js` 側の変更は委譲範囲内のみ: (1) import への `advancedRefMaps` 追加、
  (2) `evCall` で `advancedActive()` のときだけ上記マップを基礎の判定に重ねる
  （基礎の isRef 判定が false の場合のみ追加参照。高度無効時は `null` で経路不変）、
  (3) 委譲ヘルパー H に `readRef(name)`（トップフレーム→globals を引き、
  無ければ undefined。組み込み値の解決・例外はしない）を追加。
- 簡易モード無傷の証明: 高度を適用しない実行では toScaled が従来どおり
  「未対応」で止まり、Roi.getFloatBounds へ未初期化変数を渡すと従来どおり
  「まだ値が代入されていません」になる等、基礎挙動とバイト一致するプローブ
  結果を回帰テスト化（`tests/lane-a3-ijb-simple.test.js`、4件）。

## 2. A. Color系 7件 — 全件格上げ

一次情報: Colors.java の13色名表と colorToString（null→"none"、名前一致→名前、
無ければ "#"+%06x、成分は 0〜255 クランプ）。

- `Color.toString(r,g,b)`: 上記規則そのまま。未確定引数はステップ注記＋未確定値。
- `Color.foreground` / `Color.background`: モデルの colorState の fg/bg RGB から
  colorToString。値のみで設定され fg=null の経路は既存
  `getValue("rgb.foreground")` の先例どおり未確定値＋注記。既定は "black"/"white"。
- `Color.wavelengthToColor(wl)`: Colors.java の区間式（γ=0.8、減衰、floor(×255)）
  を pure 側に実装。期待値列で検証: 440→"blue"、490→"cyan"、500→"#00ff92"、
  510→"green"、580→"yellow"、645→"red"、380→"#610061"、範囲外→"black"。
- `Roi.getStrokeColor()` / `Roi.getFillColor()`: roi の色（rgb フィールド優先、
  無ければ spec を復号）を colorToString。復号不能な spec は注記＋未確定値、
  未設定は "none"。
- `Roi.getDefaultColor()`: モデル内に変更経路が無いため "yellow" で確定。
- 併せてセッター側の整合: `Roi.setStrokeColor/setFillColor` は spec と rgb を
  排他化（後勝ち）。reference の7件を supported 化し、例文は呼び出し形に統一
  （§6 の注記参照）。

## 3. B. Fit系 10件 — 閉形式の範囲で格上げ

静的表（fitList／fList／fMacro の25件、nParams 表）は CurveFitter.java から
正確に転記（取得時に sha256 照合）。

- `Fit.nEquations` = 25（定数）。
- `Fit.getEquation(index, name, formula, macro)`: REF_FNS_SKIP=1 接続で静的3表を
  書き戻し。参照変数が無い場合・範囲外 index は実 ImageJ どおりエラー。
- `Fit.doFit` / `Fit.doWeightedFit`: 対応範囲は閉形式のみ —
  Straight Line（重み付き閉形式を含む）、2nd〜8th Degree Polynomial
  （index 1,2,3,17,18,19,20。正規方程式＋部分ピボットによる厳密な最小二乗解、
  重み付き形も重み付き正規方程式で閉形式）、Exponential (linear regression)
  （index 15）、Power (linear regression)（index 16、対数変換・(0,0) 点の読み
  飛ばし・x≤0 エラー・y 符号整合の実挙動を含む）。式種の指定は名前（小文字
  照合）・番号の両形式、未知の名前は実スタイルの "Unrecognized fit" エラー、
  長さ不一致・ゼロ長も実エラー文に合わせた。それ以外の組み込み式とカスタム式は
  **名前を挙げた未検証停止**（理由は Nelder-Mead simplex 法への依存。旧 caution
  の「Levenberg-Marquardt」は事実誤認としてエンジン・reference 双方を是正）。
  フィット状態（式種・パラメータ・残差集計）は実行単位の状態 `S.__fit` に保持し
  実行をまたいで漏れない。
- `Fit.rSquared`: 1 − SSE/(Σy² − (Σy)²/Σw)（分母 ≤0 なら 0）。対数線形回帰では
  変換後データで計算。**裁定**: 重み付きフィットでは集計・SSE とも全て重み付きで
  統一した（実 Fitter の getRSquared は重みを扱わない近似だが、モデルの doFit が
  返す rSquared の一貫性を優先する判断としてここに明記する）。
- `Fit.p(i)`（nParams で範囲検査）、`Fit.nParams`（現在の式種から表引き）、
  `Fit.f(x)`（多項式は Horner 法、15 は a·exp(bx)、16 は a·x^b）。
  **未実施時の裁定**: Functions.java の fitter フィールドは null 初期化で
  ガードされるため、f/p/nParams/rSquared/plot は未実施時に実エラー "No fit"。
- `Fit.logResults`: フラグ設定のみで NaN を返す。後続の対応範囲 doFit では
  getResultString 形式のうち Formula／Macro code／R^2／Parameters 行を Log へ
  出力する。**範囲外として開示**: Status／iterations／time／標準偏差の行は
  simplex 反復過程の情報であり再現しない（reference caution にも明記）。
- `Fit.plot` は未検証のまま（理由書き換え、§5-3）。`Fit.showDialog` は未対応のまま。
- 検証例 IJ-R1 成立: x={0,1,2}, y={1,3,5} に Straight Line → rSquared=1、
  nParams=2、f(10)=21、p=[1,2]。多項式 1+2x+3x²、Exp 線形 2·exp(0.5x)、
  Power 線形 3x² の再現も検証。多項式の値は厳密解であり実 ImageJ（simplex
  反復）とは末尾桁が異なる場合がある旨を reference caution に開示済み。

## 4. C. Plot／Table／Roi／Stack の格上げ

- `Plot.addHistogram`: Plot.java のアルゴリズム全量（NaN 除去、binWidth≤0 なら
  母標準偏差からの Scott の式、modCenter／firstBin／0.499 条件の両端拡張、
  nBins、上限 9999 超はエラー、各値は round のビンへ）。結果は bar データセット
  として追加。検証例: 値 0..9・binWidth 2・binCenter 0 → xValues
  [0,2,4,6,8,10]、histo [1,2,2,2,2,1]。**縮退ケースの裁定（開示）**: 有効値が
  無い場合と、Scott の binWidth がなお ≤0（全値同一）の場合は、実 Plot.java が
  前提としない入力として、注記のみでデータセットを追加しない。
- `Plot.showValues` / `Plot.showValuesWithLabels`: 表示済みプロットのみ対象
  （無ければ "No plot window" エラー）。列見出し規則（X/Y、X1/Y1…、同一 X 列・
  同一 XY 列の重複排除は2列目以降に適用、ERR 列）、WithLabels の
  replaceSpacesEtc 変換とラベル由来見出し、行数は最長データセットに合わせ
  不足分は ""。**小数桁メタデータは再現せず caution に開示**。
- `Table.allHeadings`: ResultsTable.defaultHeadings の38件をタブ区切り連結
  （末尾タブなし）。
- `Roi.getProperties()`: キーをソートし "key: value\n" を連結。無ければ ""。
- `RoiManager.rotate`: RoiRotator の回転（theta=−angle·π/180、極座標回転、
  float 化）。対象は選択中または全 ROI。対応範囲は line／point／polygon／
  rectangle（line・point は同型のまま、rectangle→polygon、polygon は polygon）。
  中心未指定時は各 ROI 自身の bounds 中心（float bounds 中心のモデル近似）。
  oval／traced／composite は名前を挙げた未検証停止（弧サンプリング／Shape
  平坦化）。検証: 線 (0,0)-(10,0) を中心 (5,0) で 90° → (5,−5),(5,5)、
  rectangle の rotate(0) で型が rectangle→polygon。

## 5. D. 書き戻し（REF）系の格上げ

接続は §1。個別の実装と裁定:

- `Plot.getLimits`: setLimits で明示設定された場合のみ4値を書き戻し。自動範囲は
  「自動範囲は軸スケーリング計算に依存するため」の名指し未検証停止。
  **未初期化変数を渡しても誤原因エラーにならず当該停止に届く**ことを回帰条件
  として検証済み。
- `Roi.getFloatBounds`: 整数 bounds をそのまま数値で書き戻し（ROI 無しは画像矩形、
  Roi.getBounds の先例に一致）。
- `Roi.getContainedPoints`: 外接矩形を行優先に走査し roiContainsPoint が真の点を
  収集。対応範囲 rectangle／oval／polygon、それ以外は形状を挙げた未検証停止。
  検証: 矩形 (0,0,3,2) → 6点（行優先順）。
- `Roi.getFeretPoints`: 凸包（gift-wrapping、FloatPolygon の determinate 規則）
  に対する最大点対＋最小キャリパの決定的幾何計算で Feret 配列 [8..15] を
  書き戻し。画素サイズは voxel から。対応範囲 polygon／rectangle。
  検証: 正方形 (0,0)-(10,10) → 最大点対 (0,0),(10,10)、最小 Feret 区間の長さ 10。
- `Roi.getSplineAnchors`: 頂点保持型はその頂点、rectangle は4隅、line は端点を
  書き戻し。それ以外（oval 等）は型を挙げた未検証停止。
- `Stack.getUnits`: モデルの unitsArr を書き戻し。**裁定**: unitsArr の既定値
  自体は変更せず、読み取り経路で実 Calibration の既定（Z=単位、T="sec"、
  V="Gray Value"）へ補完した。既定変更は setXUnit 等の既存挙動・テストへ
  波及するため。検証: 既定で pixels/pixels/pixels/sec/Gray Value。
- `Stack.getDisplayMode`: チャンネル数 >1 ではモデルの displayMode（既定
  "composite"）、非コンポジット画像では "" を書く実挙動どおり。
- `Stack.getActiveChannels`: 非コンポジットは実エラー "Composite image
  required"。コンポジットではモデルの activeChannels 文字列（未設定時は
  全チャンネル "1"）。
- `Stack.getOrthoViews` / `Stack.getOrthoViewsIDs`: Orthogonal_Views.java を
  直接確認し、未起動時は `getImageIDs()` が `new int[3]`（={0,0,0}）を返す
  ことが明示されていたため、両者とも {0,0,0} 書き戻しで格上げ。
- `Overlay.getBounds`（REF_FNS_SKIP=1）: オーバーレイ無しはエラー、index 範囲外は
  **何も書かず NaN を返す**実挙動（roi==null 分岐）、正常時は要素の bounds を
  書き戻し。
- `toScaled` / `toUnscaled`（readRef 接続、in-place 形）: Calibration の換算式。
  モデルに原点・invertY 状態が無いため原点0・invertY=false を既定とする。
  スカラー1変数形は長さ換算（×／÷ pixelWidth）、2変数形は x・y、3変数形は
  z（pixelDepth）、配列形（配列変数2つ）は要素ごと。読み取れない現値は
  未確定値を書き戻し＋注記。**開示**: プロットが画像に付随する場合の
  descaling は、モデルでプロットが画像に付随しないため対象外（reference
  caution に明記）。検証: voxel [0.5,0.25,2] で 10→5、(10,8)→(5,2)、z 3→6、
  逆変換 5→10、配列形の要素換算、未初期化変数の注記経路。
- `Table.showArrays`: 見出しは配列引数の変数名。配列1つでタイトル既定
  "Arrays" のときタイトル＝変数名・見出し "Value"。タイトル末尾の "(...)" に
  "row"/"1" を含めば行番号列、"index" を含めば 0 始まり Index 列。文字列要素は
  文字列のまま、数値は数値、短い配列は "" で埋める。

## 6. E. その他の是正

1. `Overlay.setLabelFontSize`: arity を 1..1 → 1..2 に是正し、options 文字列
   （"scale"/"bold"/"back" の部分文字列）を overlayStyle に保持。例文
   `Overlay.setLabelFontSize(12, "bold");` の動作を検証済み。
2. `Roi.setFillColor` の実副作用: area 型 ROI（rectangle/oval/polygon/freehand/
   traced/composite）に fill を設定すると stroke が消える副作用を既存セッターに
   実装（line/point は対象外）。検証: 矩形で stroke "red" → setFillColor 後
   getStrokeColor が "none"、線では保持。
3. 理由の書き換え6件（reference caution とエンジン停止文を統一）: Fit.plot、
   IJ.getFullVersion、List.setMeasurements、Plot.getFrameBounds、
   Roi.setPolygonSplineAnchors、Roi.setPolylineSplineAnchors — いずれも T1 §5 の
   修正案どおりの文面に統一し、停止トレースで検証済み。
4. 括弧なし例文群: `Overlay.flatten;`→`Overlay.flatten();`、
   `Plot.appendToStack;`→`Plot.appendToStack();`、`reset;`→`reset();`
   （functions.html の見出しは reset で本文が "reset() and run(\"Undo\") are
   basically the same" のため呼び出し形が正書式）。いずれも未対応の名指し停止
   または正常実行が起きる形になったことを検証済み。
5. **selectionName の裁定（例文側の是正）**: 例文 `n = selectionName;` を
   `n = selectionName();` に是正した。組み込み値としての実装は基礎エンジンの
   `readVar` の変更を要し、本タスクで許可された engine.js の変更範囲
   （REF_FNS／委譲ヘルパーの範囲のみ）を超えるため行わない。現在の ROI 名は
   呼び出し形 `selectionName()` で既に取得できる。
6. state.js 冒頭の裁定メモを更新: REF_FNS 対象外を理由とする一律未検証の扱いを
   やめ、高度側 REF 接続（advancedRefMaps）の存在と Plot.getFrameBounds の
   例外を明記。

**注記（プロパティ形について）**: `Color.foreground;` のような括弧なしの
ドットプロパティ形は、基礎エンジンが高度レジストリへ委譲せず未確定値として
評価する既存挙動であり、本修正の範囲外（基礎の全ドット名に共通）。ハンドラへ
届くのは呼び出し形であり、既存 B3 スイートも呼び出し形で統一されている。
担当項目の reference 例文はすべて呼び出し形に統一した。

## 7. 触ったファイル（実ファイル9件のみ）

- `js/types/imagej/engine-advanced-state.js`（A の Color/Roi 色、B の Fit、
  C の Plot/Table/Roi/RoiManager、D の REF ハンドラ群、E-1/E-2、理由文）
- `js/types/imagej/engine-advanced-pure.js`（Color.wavelengthToColor、
  IJ.getFullVersion の理由文）
- `js/types/imagej/engine-advanced.js`（ADV_REF99／ADV_REF_SKIP1／
  advancedRefMaps、H の readRef 記述）
- `js/types/imagej/engine.js`（REF 接続のみ: import、evCall の高度時の追加参照、
  委譲 H への readRef 追加）
- `js/types/imagej/reference-advanced.js`（担当項目の status／caution／例文）
- `tests/lane-a3-ijb.test.js`（新規48件）、`tests/lane-a3-ijb-simple.test.js`
  （新規4件: 簡易モード無傷の回帰）
- `tests/adv-b3-imagej-pure.test.js`、`tests/adv-b3-imagej-state.test.js`
  （既存テストの期待値更新、次節）

precache.js は再生成していない。共有記録ファイルには触れていない。

## 8. テスト結果

- 基準線（着手前、元ツリー相当）: B3 2ファイル 137件全通過（TZ=UTC）。
- 実装後・既存テスト未更新の時点: 127通過／10失敗 — すべて今回格上げした
  旧挙動（未検証・未対応で止まること）を期待するテストであり、想定どおり。
- 既存テストの期待値変更は10件のみ（pure 1件: wavelengthToColor／state 9件:
  Table、Roi、RoiManager.rotate、Overlay.getBounds、Plot、Stack、色
  （Color.foreground）、Fit、toScaled）。いずれも一次情報の証拠に基づき、
  変更箇所に理由コメント（FIX-IJB）を明記した。まだ有効な停止の期待
  （applyMacro、xor、自動範囲の getLimits、oval の rotate、対応外 Fit、
  showDialog、multiCrop 等）は温存している。
- 最終結果（TZ=UTC）:
  - 対象4ファイル（B3 2件＋新規2件）: **189件 全通過**。
  - テストスイート全体（tests/*.test.js 207ファイル）: **7,216件 全通過、
    失敗0**。基礎エンジンに触れたため機構系を含む全体で基準線超えの失敗なし。

## 9. 残存事項（格上げしなかった項目と理由）

- `Fit.plot`: 未検証のまま。Fitter.plot の構築仕様（Fitter.java）が未取得の
  ため表示内容を確定できない（理由文は是正済み）。フィット未実施時は "No fit"
  エラー。
- 対応範囲外の組み込み Fit 式・カスタム式: 名指し未検証停止のまま
  （Nelder-Mead simplex 法の反復過程に依存し厳密に再現できないため）。
- `Fit.logResults` の Status／iterations／time／標準偏差行: 再現しない
  （simplex 反復情報のため。§3 に開示）。
- `Plot.getLimits` の自動範囲: 名指し未検証停止のまま（軸スケーリング計算に
  依存するため）。
- `Plot.getFrameBounds`: 未検証のまま（フォントメトリクス等に依存する
  レイアウト計算。REF_FNS 拡張だけでは確定しない。理由文は是正済み）。
- `Plot.showValues(WithLabels)` の小数桁メタデータ: 再現しない（caution 開示）。
- `RoiManager.rotate` の oval／traced／composite: 名指し未検証停止のまま
  （弧サンプリング／Shape 平坦化の規則が未確定）。
- `Roi.getContainedPoints` の rectangle／oval／polygon 以外、
  `Roi.getFeretPoints` の polygon／rectangle 以外、`Roi.getSplineAnchors` の
  頂点保持型＋rectangle 以外: 形状・型を挙げた未検証停止のまま。
- `IJ.getFullVersion`、`List.setMeasurements`、`Roi.setPolygonSplineAnchors`、
  `Roi.setPolylineSplineAnchors`: 未検証のまま（理由文は T1 §5 の修正案に
  統一済み）。
- `toScaled/toUnscaled` のプロット付随時の descaling: モデルに表現が無く
  対象外（caution 開示）。
- `Stack.getUnits` の既定補完は読み取り経路のみ（unitsArr の保存値自体は
  変えない。§5 の裁定参照）。
- ローカルコミット: §0 の環境制約により不能。変更は実ファイル9件に限定され
  機械的に列挙可能であり、統合側での適用をもって代替する。
