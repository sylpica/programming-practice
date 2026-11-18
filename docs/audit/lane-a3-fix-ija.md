# FIX-IJ-A 報告書 — ImageJ 純粋関数 Array 高度項目の格上げ実装

- 担当: FIX-IJ-A（高度A3班・修正チーム）
- 土台: `lane-a3-exec`（HEAD 04dfe2d）の作業コピー `lane-a3-fix-ija`
- 対象欠陥: 監査（lane-a3-t1 報告書 §4.6・台帳1〜3行）で「格上げ可能」と確定した
  状態誤表示3件 — `Array.findMaxima` / `Array.findMinima` / `Array.fourier` が
  実装可能にもかかわらず `unverified`（未検証で停止）と表示されていた。
- 一次情報（`docs/audit/primary-sources/fetch.sh` の台帳どおり再取得し sha256 一致を確認）:
  - `ij/plugin/filter/MaximumFinder.java` — sha256 `a13a6a1eb38d94c2…`
  - `ij/process/FHT.java` — sha256 `1aadbb22da9a8c19…`
  - `ij/macro/Functions.java` — sha256 `b8e62f4fe54e2ea5…`（adv-b3-src キャッシュ）
  - `ij/util/Tools.java` — sha256 `6e410b6c00043cc5…`（同キャッシュ）

## 1. 実装内容

### 1.1 `js/types/imagej/engine-advanced-pure.js`

レジストリの `{unverified: …}` スタブ3件を実ハンドラに置き換え、その前に
一次情報の忠実移植ヘルパーを追加した。

- **Array.findMaxima(values, tolerance, edgeMode)**（引数2〜3）
  - `maximumFinderFindMaxima`: MaximumFinder.java の `findMaxima(double[], tolerance, edgeMode)`
    を制御フローごと移植。tolerance<0 は 0 に丸め、要素数<2 は空、NaN は全比較が
    偽になることでスキップ（全 NaN は do-while の早期 return で空）、平坦部は
    中央位置を `(int)` 切捨て、edgeMode 2 は配列を3倍に連結して中央部分のみ採用、
    結果は `Tools.rank`（安定ソート＋`Double.compare` 相当の `doubleCompare`）の
    昇順を反転した振幅降順。
  - edgeMode の既定は **0**（Functions.java `findArrayMaxima`）。第3引数は `(int)` 化。
- **Array.findMinima(values, tolerance, edgeMode)**（引数2〜3）
  - `maximumFinderFindMinima`: 本体の実経路どおり、配列を符号反転して
    findMaxima へ委譲するだけの実装。
- **Array.fourier(values, window)**（引数1〜2）
  - 窓文字列の判定は Functions.java `fourierArray` どおり: 小文字化し、
    `"hamming"` 完全一致 → HAMMING、`"hann"` 前方一致（"Hanning" も可）→ HANN、
    `"flat"` 前方一致 → FLATTOP、`"no"` 前方一致でなければエラー停止。
    要素は `(float)` 化（`Math.fround`）してから渡す。
  - `fhtFourier1D`: FHT.java `fourier1D` の全仕様を移植。2の冪へゼロ埋め、
    窓関数（Hamming `0.54−0.46cos(z)`／Hann `1−cos(z)`／flat-top
    `1−1.90796cos(z)+1.07349cos(2z)−0.18199cos(3z)`、いずれも `z=(x+0.5)·2π/n`、
    窓係数は double で計算）、窓和（窓なしは n）による正規化、
    `result[0]=√(y[0]²+y[0]²)`、`result[x]=√(y[x]²+y[size−x]²)`。
  - `fhtDfht3` / `fhtSinCosTables` / `fhtBitRevX` / `fhtLog2`: FHT.java の
    `dfht3`（base=0・順変換）、`makeSinCosTables`（theta は double 累積、表は float）、
    `BitRevRArr`、`bitRevX`、`log2` を移植。**演算は float32 で再現**:
    作業配列は Float32Array、局所演算の各段に `Math.fround` を適用し、
    Java float の丸めと一致させた。

### 1.2 `js/types/imagej/reference-advanced.js`

- 3件とも `status` を `supported` に変更。
- `caution`（未検証理由）を、実装範囲の正直な注記に置き換えた
  （本体アルゴリズムをそのまま再現する旨と根拠）。
- **Array.findMaxima の description 誤記を修正**: edgeMode の既定を
  「1=端を除く（既定）」→「0=端を含める（既定）、1=端を除く」。
  公式 functions.html 自体が誤記を含んでいるが、一次情報である
  Functions.java のコード（`int edgeMode = 0;`）が正。

### 1.3 テスト

- 新規 `tests/lane-a3-ija.test.js`（21件）: 下記 §2 の境界ケース群を固定。
- 既存 `tests/adv-b3-imagej-pure.test.js` の3件を更新（§3 参照）。

## 2. 検証方法と結果

### findMaxima / findMinima

MaximumFinder.java の制御フローを手で追跡して導いた期待値と、エンジンの
実出力を全ケース照合した（監査報告書の期待値例を含む）。

| ケース | 期待値（Java 追跡） | 結果 |
|---|---|---|
| {0,5,0,3,0}, tol 0, 既定 | {1,3} | 一致 |
| {5,0,3}, edgeMode 0 / 1 | {0,2} / {} | 一致 |
| {5,0,3} / {3,0,5}, edgeMode 2 | {0} / {2} | 一致 |
| {0,5,5,0} / {0,5,5,5,0} 平坦部 | {1} / {2} | 一致 |
| {2,2,2}, edgeMode 0 / 1 | {1} / {} | 一致 |
| {0,3,0,3,0} 同振幅 | {3,1}（後位置先行） | 一致 |
| tol 10 / tol 4 / tol −1 | {} / {1} / {1,3} | 一致 |
| 全 NaN / {NaN,5} / {0,5,NaN,3,0} | {} / {} / {1} | 一致 |
| 空 / 要素数1 | {} / {} | 一致 |
| findMinima {0,−5,0,−3,0} 他 | {1,3} 等 | 一致 |

### fourier

3角度で検証した（報告書への明記どおり、採用した方法は「独立実装との
突き合わせ」＋「float32/float64 で分かれる入力の手計算」の併用）。

1. **手計算の厳密ケース**: 定数 {1,1,1,1} → {√2, 0}、デルタ {1,0,0,0} →
   {0.25√2, 0.25√2}、Hann・定数 → {√2, 0.7071}、窓なし {1,2,3,4} の
   result[1] = 1、空配列 → [0]、n=5 のゼロ埋め（結果長 4）。全て一致。
2. **独立実装との突き合わせ**: 開発時に Python numpy の DFT
   （`result[k]=√2·|F[k]|` の恒等式）で6ケース（窓なし／Hamming／Hann／
   flat-top、n=4・5・11）を照合し全て表示精度で一致。コミットするテスト内
   にも float64 の素朴な DFT による独立実装を置き、6ケースを相対誤差
   2e-5 以内で突き合わせている。
3. **float32 判別ケース**: 入力 {16777217, 0, …} は float32 では
   16777216 に丸まる。手計算では float32 経路の result = **2965820.75**、
   float64 経路では 2965820.9775… と 0.22 以上ずれる。エンジン出力は
   2965820.75 で、float32 再現が効いていることを確認した。

reference の使用例3件（`p = Array.findMaxima(vals, 10);` 等）が新しい実装で
実際に動作することもテストで確認した。

## 3. テスト結果

（全体スイート結果を追記する）

### 実行結果（TZ=UTC、基準線どおり）

| 範囲 | 件数 | 結果 |
|---|---|---|
| `tests/lane-a3-ija.test.js`（新規） | 21 | 全通過 |
| `tests/adv-b3-imagej-pure.test.js`（更新後） | 73 | 全通過 |
| ImageJ 状態系＋カタログ＋機構系（adv-b3-imagej-state / adv-b5-catalog / audit / engine） | 1,654 | 全通過 |
| 全体スイート（tests/*.test.js、206ファイル） | 7,185 | **全通過・失敗 0** |

基準線（TZ=UTC 全通過）を超える失敗は無い。タイミング系の環境フレークも
今回の実行では発生しなかった。

### 既存テストの期待値変更（3件）と根拠

`tests/adv-b3-imagej-pure.test.js` の以下の3件は「未検証で停止する」ことを
期待していたが、対象の一次情報本体（MaximumFinder.java / FHT.java）が
lane-a3-t1 監査で追加取得され意味論が確定したため、実装済み挙動の期待値に
置き換えた（弱体化ではなく、格上げに伴う追随。理由は各テストのコメントにも明記）。

- `Array.fourier stops as unverified …` → `Array.fourier is implemented per FHT.fourier1D …`
- `Array.findMaxima stops as unverified …` → `Array.findMaxima is implemented per MaximumFinder.findMaxima …`
- `Array.findMinima stops as unverified …` → `Array.findMinima is implemented per MaximumFinder.findMinima …`

## 4. 触ったファイル

| ファイル | 変更 |
|---|---|
| `js/types/imagej/engine-advanced-pure.js` | 移植ヘルパー追加＋スタブ3件を実ハンドラ化 |
| `js/types/imagej/reference-advanced.js` | 3件の status を supported 化、caution を実装注記に置換、findMaxima の description の既定誤記を修正 |
| `tests/adv-b3-imagej-pure.test.js` | 陳腐化した3件を実装済み期待値に更新（根拠コメント付き） |
| `tests/lane-a3-ija.test.js` | 新規（回帰テスト21件） |
| `docs/audit/lane-a3-fix-ija.md` | 新規（本報告書） |

precache.js は再生成していない（指示どおり統合側の担当）。
共有記録ファイル（台帳・状態ファイル・DEVELOPMENT.md・PROGRESS.md）には触れていない。
GitHub 書き込みは行っていない。

## 5. 残存事項・統合側への申し送り

1. **ツリーの実体化とコミット**: 本タスクの実行環境ではシェルからの
ファイル書き込みが全面的に `Operation not permitted`（EPERM）で遮断され、
`git clone` も git オブジェクト書き込みも不可能だった。そのため作業コピーは
「lane-a3-exec のシンボリックリンク・ミラー＋変更ファイルのみ実ファイル化」
という構成で構築した。実ファイル（リンクでない）のは上表の5ファイルのみで、
それ以外は全て lane-a3-exec へのリンクである。
- 統合側では、書き込み可能な環境で `cp -rL` 等により実体化コピーを作り、
そのままコミットすれば本修正がそのまま入る（変更ファイルは実体化済みで、
未変更ファイルは元とバイト同一）。
- テストは本環境では `node --preserve-symlinks --test` で実行した
（リンクミラー越しに自ツリーのモジュールを読むため）。実体化した
ツリーでは通常の `node --test` と等価であり、上記の全通過結果は
そのまま有効。
- ローカルコミット自体は上記理由で本環境では実施できていない。
2. 対象3件の実装上の残存は無い。全て一次情報どおりに実装し、検証も
§2 の3角度で完了している。任意の積み残しも発生していない。
3. なお、作業の過程で空の作業用ディレクトリ
`lane-a3-fix-ija-test`（中身なし）が残っている場合は統合側で削除してよい。
