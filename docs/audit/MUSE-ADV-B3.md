# 高度モード ブロックB3 報告書（ImageJマクロ＋PowerShell）

- 作業ツリー: `~/workspace/programming-practice-audit/work/adv-b3/`（ベース bba3b26 = 修正バッチ13）
- 体制: コーディネーター＋5チーム（IJ-REF／IJ-ENG-PURE／IJ-ENG-STATE／PS-REF／PS-ENG）並行、各チームの成果は別チーム・機械照合で独立検証してから統合した。
- GitHub への書き込みは行っていない。本書と成果物はローカルコミットまで。

## 1. 件数

### 1.1 棚卸し基準（公式インベントリの名前に対する最終状態）

| 種別 | 対応 | 未対応 | 未検証 | 合計 |
|---|---:|---:|---:|---:|
| ImageJ（公式関数 558） | 465 | 41 | 52 | 558 |
| PowerShell（コマンドレット270＋演算子98＋自動変数47） | 188 | 175 | 52 | 415 |

正本: `work/adv-b3-src/ij-final-status.tsv`／`ps-final-status.tsv`（エンジン実態に合わせて機械照合した最終状態）。

### 1.2 合成カタログ基準（アプリのリファレンス表示の実数）

| 種別 | リファレンス総数 | 対応 | 未対応 | 未検証 | テンプレート | 用語集 |
|---|---:|---:|---:|---:|---:|---:|
| ImageJ | 566（基礎 201＋高度新規 365、override 33） | 470 | 44 | 52 | 15（基礎10＋高度5） | 20（基礎8＋高度12） |
| PowerShell | 369（基礎 52＋高度新規 317、override 0） | 142 | 175 | 52 | 15（基礎8＋高度7） | 23（基礎7＋高度16） |

- PowerShell の棚卸し基準（188対応）と合成基準（142対応）の差は、演算子・自動変数の一部が基礎では日本語名の「構文・用語」束ね項目として収載されているため（名前の数え方の差であり、欠落ではない）。
- ImageJ の合成基準（566）は公式インベントリ外の基礎項目（アプリ独自の補助項目等 8件）を含む。

### 1.3 エンジン実装の内訳

- ImageJ 高度レジストリ 399エントリ（PURE 54＋STATE 345）: ハンドラ 307（PURE 33＋STATE 274）／未対応 40（16＋24）／未検証 52（5＋47）。残りは基礎エンジン実装済み分と基礎の参照のみ項目でカバーされ、558件全件が状態確定した（機械照合で欠落 0）。
- PowerShell 高度レジストリ: コマンドレット 250件（対応 50／未対応 166／未検証 34）＋自動変数 35件（確定値 12／文脈 $null 8／未検証 15）。基礎 20コマンドレット等と合わせて 270コマンドレット全件を裁定。
- PowerShell 演算子: 新規に式レベル演算子を実装（-band/-bor/-bxor/-bnot/-shl/-shr/-xor/-replace 系/-split/-join/-is/-isnot/-as/-f/??）。文レベル・リダイレクト・チェーン系（&&/||/&/>/>>/?./?[]/??= 等）は未対応として名指し停止。

## 2. 契約（advanced-interface.md）への適合

適合させた点:

- 差分ファイルは契約の既定名・既定エクスポート名に統一した: `reference-advanced.js`（`referenceAdvanced`／`referenceOverrides`）、`templates-advanced.js`（`templatesAdvanced`）、`glossary-advanced.js`（`glossaryAdvanced`）、両種別に `advanced-manifest.js`（`advancedManifest`、engineFile 付き）。
- 高度項目は `status` のみで状態を持ち、`supported` 真偽値は付けない（契約 3.2）。基礎項目の変更は `referenceOverrides` 経由のみ（ImageJ 33件、PowerShell 0件）。`referenceAdvanced` と基礎の名前重複は 0件（機械照合）。
- ImageJ テンプレートは基礎の生形式（name/prep/guide）ではなく契約の正規形（id/title/code/intro/refs/level）に変換した。refs は合成後カタログで全件解決する。
- 高度ファイル名は全て precache 除外パターン（`-advanced` を含む／`advanced-manifest.js`／`advanced-engine.js`）に一致する。
- テンプレートは未対応項目に黙って依存しない（全テンプレートを実行検証済み）。

差異（報告書への明記で足りるとされた分）:

- **エンジン拡張の経路**: 契約 5.2(e) は `advanced-engine.js` の `applyAdvancedEngine(definition, merged)` フック経由を定めるが、契約 R-3 のとおり `merged` の正確な形は B1 初例まで未確定である。B3 は `advanced-engine.js` を用意し `applyAdvancedEngine` を高度レジストリ有効化の唯一の入口とした上で、実際のディスパッチは各エンジン（ImageJ engine.js のフォールスルー、PowerShell engine.js／parser.js）からレジストリを参照する形にした。レジストリは純データ（関数テーブル）であり、フックの形が確定すれば意味論を変えずに移設できる。有効化は一方向（読み込み後は切り戻さない）で、機構側ローダーの種類別メモリキャッシュ（契約 7.1）と整合する想定だが、モード往復時のエンジン側の扱いは機構側の確定事項として申し送る。
- **precache.js は再生成していない**。現行 `scripts/precache.mjs` は `js/` 配下全ファイルを対象にするため、旧スクリプトで再生成すると高度ファイルが precache に混入し契約 7.2 に反する。再生成は機構側の除外パターン適用後に行うこと。なお基礎側の方式（スクリプト・sw.js）自体には一切手を入れていない。`--check` が stale になるのは、基礎エンジン3ファイル（imagej/engine.js、powershell/engine.js、powershell/parser.js）の内容変更と高度ファイル追加の当然の帰結である。

## 3. 一次情報と主な裁定

- ImageJ 一次情報: 公式 Built-in Macro Functions（functions.html、Last updated 2025-02-15）と ImageJ 本体ソース。Functions.java（master、2026-11-17 取得、sha256 先頭16桁 `b8e62f4fe54e2ea5`）。統合時に Tools.java（imagej.net ソースミラー、sha256 先頭16桁 `6e410b6c00043cc5`）を追加取得した。
- Tools.java で確定した裁定: (1) `Array.rankPositions` の同点順序は安定ソート（Java の Arrays.sort＋Comparator）で、PURE の裁定どおり。(2) 文字列版 rank は compareToIgnoreCase で、基礎 Array.sort の慣行と一致。(3) `Array.resample` は Tools.resampleArray の線形補間で完全確定したため、未検証→対応へ格上げした（長さ1への resample は元の末尾要素になる実挙動も再現）。(4) `IJ.checksum` の文字列ハッシュは `String.getBytes()`（実行環境の既定文字セット依存）であり、モデルは UTF-8（Java 18 以降の既定）を採用。ASCII 入力では一致する。
- `String.format`: 実 ImageJ は全引数を Double で java.util.Formatter に渡す（Functions.java の format()）ため、`%d`／`%x` 等の整数変換は実機でも IllegalFormatConversionException で停止する。PURE の実装が同じくエラーで止まるのは忠実な再現であり、欠陥ではない（監査で検分し裁定した）。
- `Overlay.setStrokeColor`: 実 ImageJ でもオーバーレイの無い画像ではエラーになる（doOverlay が overlay==null のまま呼ぶ）。STATE の「オーバーレイが必要」という実装が正しく、IJ-REF のテンプレート側の呼び出し順序を修正した（先にパスを add してオーバーレイを作る）。
- PowerShell 一次情報: Microsoft Learn（コマンドレットヘルプ、about_* 群、演算子優先順位）。実 pwsh の無い環境で確定できない意味論は未検証に倒した（履歴・ヘルプ・文化依存変換・CliXML 等）。Get-Date の引数なしはモデルに時計の慣行が無いため未確定値、Get-Random は基礎の未確定値慣行に従う、等の個別裁定は各チーム報告と実装コメントに記録した。
- REF／ENG 両チームの独立裁定が食い違った 90件超は「エンジン実態が正」で機械的に統一した（代表例: Format-* は整形サブシステム不在のため未対応、Invoke-Command はスクリプトブロック実行基盤が無いため未対応、Compress-Archive は ZIP バイナリをテキストモデル FS で保持できないため未対応）。

## 4. ブロック監査（角度カタログのブロック範囲実施）

実施した角度（ブロック範囲＝両種別の高度差分＋統合部）:

- **存在＋到達性（F-02）**: 合成カタログ全項目の名前一意性・status 必須・未対応／未検証の理由（caution）必須を機械照合（問題 0件）。到達可能性スイープ: 高度レジストリ全エントリ（ImageJ 399＋PowerShell 250）を実際に呼び、対応エントリが未対応フォールスルーに落ちないこと、未対応／未検証エントリが名指し（「未対応：名前」「未検証：名前」）で止まることを確認（実質 649/649。runMacro のみ引数個数エラーが先に出るが、これは収載済み全関数に共通の基礎エンジンの裁定であり、正しい引数では名指し停止することを別途確認した）。
- **一次情報照合（F-04）**: 各チームが項目単位で実施。コーディネーター側で Tools.java の追加取得による再検証（rank／resample／checksum）、String.format と Overlay の本体ソース再検分を行った。
- **独立検証**: REF（データ）と ENG（実装）が互いの成果を見ずに独立裁定し、差分 90件超を機械照合で検出・統一した。基礎側の静的診断・文字列文脈判定との相互作用は統合側で別途検証した。
- **実行検証**: 全テンプレート（ImageJ 5＋PowerShell 7）を有効化後に実行し完走を確認。文字列連結プローブ（SIM_STRFNS 追加分の検証を含む）。
- **回帰**: 全テスト 4,793件（基礎 4,597＋ブロック 196）を実行（後述）。

対象外とした角度（理由）:

- 実ブラウザでの画面操作・オフライン・実機確認: モード機構（ローダー・合成・表示）が未統合のため、統合後に親工程の全体監査で実施する。本ブロックでは合成カタログの機械照合と simulate 経由の実行検証で代替した。
- 実シェル照合（validate-shells 相当）: この VM に pwsh／cmd が無く、shell-native-audit は全 202件 skip（基礎ツリーでも同一）。実シェル照合は CI 側の領分として申し送る。native-audit.py は all_passed（C# はコンパイラ無しのため skip、基礎と同一条件）。

監査で見つけてブロック内で修正した欠陥:

1. 基礎の静的診断（simStaticChecks）が高度レジストリを参照せず、高度関数 23件超に「定義されていない関数」の誤診断が併記されていた → 高度有効化時はレジストリ名を既知として扱うよう engine.js を修正（簡易モードの診断は不変であることも確認）。
2. SIM_OFFICIAL に無い公式名 3件（String.buffer／String.paste／toolID）が簡易・高度とも誤診断されていた → 追加。
3. 文字列を返す高度関数が SIM_STRFNS に無く、文字列連結で数値文脈に誤認される危険があった → PURE／STATE の文字列返却関数 計40件を追加し、連結プローブで検証。
4. 基礎で「未対応」の参照のみ項目だった 5件（File.open／File.append／getCursorLoc／getDisplayedArea／getLocationAndSize）は STATE が実装済みなのに override が無く、合成カタログで未対応表示のままだった → referenceOverrides に追加（対応へ）。
5. IJ-REF テンプレートの Overlay 呼び出し順序（3. の裁定によりテンプレート側を修正）。
6. R29-N4 テスト（基礎側）の件数ピン 8→9: 高度フックの未対応テンプレートが engine.js に 1件増えたための更新。新規行自体は同テストの要件（「未対応：」接頭辞・未確認の混入なし）を満たすことを確認済み。テストファイルの変更はこの 1件のみで、コメントに根拠を明記した。
7. PowerShell の高度スイッチが基礎パーサのスイッチ表に無く裸で書けなかった → 有効化時に限り ADVANCED_SWITCHES を合体するよう parser.js を修正（PS-ENG のテスト側の回避記法 10箇所を実 PowerShell の結合に合う裸スイッチ形式へ是正）。
8. PowerShell 演算子の優先順位付けのため基礎 prec 表を ×10 に再番号した（キー集合は不変で、基礎テスト f02ops の照合対象はキー集合のみ。再番号の影響範囲は PS 関連テスト 477件で回帰なしを確認）。

## 5. テスト結果

- ブロック新規テスト 196件: 全通過（ImageJ PURE 73＋STATE 64、PowerShell ENG 50＋演算子 9）。
- 全体: 4,793件中 4,791通過。失敗 2件の切り分け:
  - `powershell path explosion emits a notice at the shared 2000 path cap`: 制限時間 10秒の時間予算テスト。単独実行では基礎ツリー・B3 ツリーとも 104/104 通過する VM 環境フレーキー（既知）。
  - R29-N4 件数ピン: 上記 6. のとおりブロック内で更新し、対象ファイル単独で 18/18 通過を確認済み（全体再実行は時間の都合で未実施。最終状態の全体実行は親工程の統合時に回すこと）。

## 6. 残存・申し送り

- **未検証 52件ずつ**（両種別とも）は一次情報で確定できなかった項目で、画面には理由つきで「未検証」と表示される。主な内訳: ImageJ は Fit 系（LM 法の反復過程・組み込み式一覧が CurveFitter.java 側にあり未提供）、色の文字列化（Colors.java の名前表が未提供）、REF_FNS 対象外で引数への書き戻しができない 11件（Plot.getLimits 等。REF_FNS を高度名に拡張できれば対応へ格上げ可能）、幾何規則が Roi.java 側の未提供情報に依存するもの。PowerShell は履歴・ヘルプ・文化依存変換・CliXML・Markdown 等。
- ImageJ のプロパティ形式名（File.name／Image.title／Table.size 等）は、本エンジンでは呼び出し形式でのみ到達可能（パス式は未確定値になる）。基礎エンジン全体の性質であり、本ブロックでは変更していない。
- 基礎側で見つけた不整合 2件（本ブロックでは未修正、親工程へ申し送り）: (a) 基礎 getResult の第3引数タイトル検査が "Results" 以外を全て拒否するため、Table.create で作った名前付き表に基礎 getResult では到達できない（高度側の Table.get／getResultString は名前付き表を解決する）。(b) 基礎 Color.getLut は setLut 後も恒等 LUT を返す（高度側の getLut は保持した LUT を返す）。
- print(ファイル変数, ...) への書き込みは基礎 print の仕様のため未対応（File.open 自体は対応）。IJ.checksum のファイル形式は未対応（文字列形式のみ対応）。
- PowerShell の裁定メモ: `-xor` の優先順位は基礎の -and／-or 分離に合わせて -or と同格に置いたため、`a -xor b -and c` の結合は実 PowerShell（同格・左結合）と異なる場合がある（基礎側の既存裁定に起因）。-replace の存在しないグループ番号への置換文字列はリテラルのまま残すモデル裁定とした。-is の数値型はモデルの数値統合（整数値＝int 相当）に従う。
- モード往復時のエンジン有効化の扱い（2. の差異）と precache 再生成のタイミングは機構・親工程の確定事項。
- 本ブロックの作業ファイル（照合スクリプト・最終状態 TSV・一次情報ソース）は `~/workspace/programming-practice-audit/work/adv-b3-src/` に残した。台帳（RG）への登録と状態ファイルへの記録は親工程の統合時に行うこと（本ブロックでは共有ファイルに触れていない）。
