# 高度モード B4・Rコンテンツ班 報告書（テンプレート／用語集）

担当ファイル：`js/types/r/templates-advanced.js`、`js/types/r/glossary-advanced.js`、`tests/adv-b4-r-content.test.js`、本報告書。他ファイルは編集していない。

## 件数

- 高度テンプレート：**7件**（全件 id 接頭辞 `r-adv-`、level は実践4件・応用3件）
- 高度用語集：**12件**（基礎用語集6語と重複なし）

## テンプレート題材と使用関数

| id | 題材 | 使用する高度関数 | 主な期待出力（実 R 照合済み） |
|---|---|---|---|
| r-adv-sort-rank | 並べ替えと順位付け | sort, order, rank | c(95, 95, 80, 70)／c(2, 4, 3, 1)／c(1, 3.5, 2, 3.5)（同点95は平均順位） |
| r-adv-cumsum-diff | 累積和と階差 | cumsum, diff | c(3, 8, 10, 16)／diff(cumsum)＝c(5, 2, 6)／diff＝c(2, -3, 4) |
| r-adv-which-match | 位置の検索 | which, match | c(2, 4)／c(3, 1)／c(2)（matchは最初の出現のみ） |
| r-adv-unique-dup | 重複処理 | unique, duplicated, anyDuplicated | c(5, 3, 1)／c(FALSE, FALSE, TRUE, FALSE, TRUE)／3 |
| r-adv-tapply-group | グループ集計 | tapply（FUN文字列指定） | c(A = 70, B = 95)／c(A = 210, B = 190) |
| r-adv-merge-colsums | データフレーム結合と列合計 | merge, colSums | total列 200/600/1500、colSums＝c(qty = 10, total = 2300) |
| r-adv-apply-df | 行・列ごとの関数適用 | apply, sapply（FUN文字列指定） | c(math = 80, eng = 80)／c(140, 190, 150)／c(math = 90, eng = 100) |

使用関数の適格性：各テンプレートの呼び出しは、基礎実装済み集合（r/index.js の IMPLEMENTED：c、sum、mean、median、sd、seq、seq_len、rep、length、is.na、as.numeric、as.character、print、cat、data.frame、nrow、ncol、names、read.csv）と、高度ハンドラ実在集合（`functions-advanced.js` の `advancedBuiltins` キーを機械抽出）の和集合内にあることをテストで機械検証している。

### 題材から外したもの（未対応への黙った依存を避けるため）

- **paste／sprintf による整形出力**：両者とも基礎 IMPLEMENTED にも `advancedBuiltins` にも無く（FUNCTION_NAMES に名前があるだけで呼ぶと名指し停止になる）、契約上収録できないため題材から外した。高度関数班が実装した場合は将来追加できる。
- lapply も `advancedBuiltins` に無いため使わず、sapply／apply／tapply で代替した。

## 用語集（12件）

名前付きベクトル、型強制、NAの伝播、遅延評価、環境、ジェネリック関数、S3ディスパッチ、部分一致、ドットドット（...）、タイ（同点）、マージ、グループ集計。

基礎用語集（ベクトル、添字、データフレーム、NA、リサイクル、未確定（値））との重複はテストで機械検証。なお基礎側に「リサイクル」があるため、同概念の「リサイクリング」は重複回避のため入れていない。また「1始まりの添字」も基礎「添字」の定義に含まれるため入れていない。定義文は R 公式ドキュメント（Language Definition の遅延評価・環境・型強制、?rank の ties、?merge、引数照合の部分一致規則）に基づく一般的事実のみを書いた。

## 実行確認の方法と結果

1. **実 R 照合**：全7テンプレートのコードを `/usr/bin/Rscript`（R 4.3.3）で実行し、全出力値を取得。
2. **シミュレータ照合**：同じコードを `definition.simulate`（モデルは `definition.model.defaults`）で実行し、エラーなし・単一パス・出力値が実 R と一致することを確認（表記差は名前付きベクトルの `c(A = 70, B = 95)` 形式などシミュレータ表記に読み替え）。
3. **テスト**：`node --test tests/adv-b4-r-content.test.js` → 4件全て合格。検証内容は (a) スキーマ（キー集合・`r-adv-` 接頭辞・基礎テンプレート含む id 一意性・level 妥当性・refs が基礎∪高度リファレンスの実在名を指すこと）、(b) 呼び出し関数が実装済み集合内にあること、(c) シミュレータ実行がエラーなく終わり期待出力と完全一致すること、(d) 用語集のペア形式と基礎との重複なし。

## 未確定事項・申し送り

- `templatesAdvanced`／`glossaryAdvanced` は現時点で基礎側（r/index.js 等）から import されておらず、合成カタログへの配線はコーディネーター側の作業待ち（本班の編集範囲外）。
- tapply／apply／sapply の FUN は、本アプリではユーザ関数定義が未対応のため文字列指定のみ可能である旨を各テンプレートの intro に明記済み。
- 全体テスト（npm test）は統合時にコーディネーターが実施する前提で、本班では担当テストのみ実行した。
