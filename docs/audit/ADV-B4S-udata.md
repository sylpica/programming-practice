# ADV-B4S udata 班報告書（R utils：データ操作・入出力）

担当スライス：24 トピック／37 名（`slice-udata.json`）。
成果物は自班の新規ファイル5件のみ。既存ファイル・集約ファイルは編集していない
（検証用の一時結線は実施後に `git checkout` で復元済み。コミットなし）。

## 件数（名前単位）

| 区分 | 件数 |
|---|---|
| 対応（supported） | 14 |
| 未対応（unsupported） | 23 |
| 未検証（unverified） | 0 |
| 合計 | 37 |

names 収録は 35 名（下記「名前の精選」参照）。

## 対応 14 名と照合根拠

全14関数とも、実 R 4.3.3（/usr/bin/Rscript）の実測と関数ソースの読み合わせで
検証した（ヘルプのみで実装した関数は無い）。

| 関数 | 照合根拠 |
|---|---|
| head / tail | 実測＋ `head.default`／`head.data.frame`／内部 `checkHT` のソース。n の負値・既定値 6L・NA 成分（次元の全選択）・長さ2までの n（行・列）・checkHT の検証順と文言・データフレームの行名実体化・`tail` の `addrownums` 非推奨警告まで再現 |
| combn | ソース読み＋実測。m の検証順（`length(m) == 1L`→`is.numeric(m)`→符号→`n < m`、未切り捨て m で比較し as.integer で切り捨て）。FUN=NULL の結果は行列／リストになるため名指し停止とし、FUN を文字列の集計名（sum／mean／median／min／max／length／sd、`...` の na.rm 対応）で渡す形のみ対応（B4 apply 系の前例に倣う）。組み合わせ上限 10000（B4 前例） |
| glob2rx | ソースそのままの変換規則。公式ヘルプの stopifnot 例全件をテスト固定 |
| URLencode / URLdecode | ソースそのまま。reserved の差異、repeated=FALSE 時の %xx 含み文字列の丸ごと素通し、NA→文字列 "NA"、多バイトのバイト単位処理、デコードのバイト演算（"%2G"→"0" 等）、範囲外警告、末尾 NUL の除去と内包 NUL のエラー（`"%zz"` は警告のみで `""`、`"a%zzb"` はエラー。実測で確定） |
| compareVersion | ソースそのまま。要素数優位（`"1.0"` vs `"1.0.0"` は -1）、NA の先行判定、区切り `[.-]`、末尾空要素の扱いを実測 |
| hasName | ソース（`match(name, names(x), nomatch = 0L) > 0L`）どおり。データフレームでは列名が対象 |
| modifyList | リスト型が無いため、実 R でも data.frame を返すデータフレーム同士の形のみ対応。列置換・追加・長さ1リサイクル・行数不一致エラー文言（`replacement has N rows, data has M`）を実測 |
| type.convert / type.convert.default | ソース＋約40件の実測プローブ。logical→integer→numeric→complex の梯子、na.strings の全結果型への適用、空文字列の扱い、整数パターンの前空白可・後空白不可の非対称、dec=","、numerals の精度損失3分岐（警告文言含む）、as.is 省略時の警告。複素数化・因子化（as.is=FALSE で文字列残留）は表せないため名指し停止。データフレームは列ごと再帰 |
| is.relistable | 実 R でもベクトル／データフレームは FALSE であり、relistable オブジェクトは本モデルで生成不能なため、常に FALSE が忠実な再現 |
| strcapture | ソース（regexec＋conformToProto）＋公式例。非マッチ行は全列 NA、非参加グループは "" 経由の変換。proto の列型は「見本値」または「`data.frame(chr = character(), start = integer(), ...)` と直接渡した AST の型指定」から判定（長さ0列は値だけでは型が定まらないための措置）。因子・Date 列と型判別不能な場合は名指し停止 |
| stack | データフレームのみ。values／ind の構成、select の文字列・数値（負値は除外）・論理ベクトル、エラー文言（`undefined columns selected`／`no vector columns were selected`）を実測。ind は実 R では因子だが本モデルでは表せないため文字列（caution に明記） |

## 未対応 23 名の理由分類

- **ファイル入力（6）**：read.table、read.fwf、read.DIF、read.fortran、count.fields
  （＋下記 file_test を除く入出力系）。基礎層 read.csv はモデル内蔵データ専用の
  専用経路として `js/types/r/index.js` 内に実装されており、高度ハンドラ契約
  （SPEC 第4章）で公開される道具（api／H）からはファイル読み取りに到達できない。
  read.table は既定値（header=FALSE 等）や text 引数の解釈まで含め到達不能。
- **ファイル出力（1）**：write.table（仮想ファイルストアは read.csv と cat の専用経路のみ）。
- **ファイルシステム照会（1）**：file_test。
- **データセット／環境ロード（1）**：data（モデルにデータセットが無く、packageIQR 返却も不可）。
- **式の評価＋出力付け替え（1）**：capture.output。
- **属性付き行列が戻り値（1）**：adist（counts／trafos 属性。属性を落とした行列は誤値になるため未対応）。
- **リストが戻り値・骨格（3）**：aregexec（属性付きベクトルのリスト）、relist、unlist.relistable、as.relistable（"relistable" クラス）。
- **クラス付き数値（4）**：as.roman、Ops.roman、Summary.roman（"roman" クラスの表示・メソッドディスパッチ依存）、.romans（データオブジェクト。下記）。
- **フォーミュラ依存（1）**：unstack。
- **表示が本体で戻り値が invisible NULL（2）**：str、print.packageIQR。文字列を返す安易な実装は実 R と異なる値になるため採らない。
- **大域状態（1）**：strOptions（options のセッション状態）。
- **名前空間に存在しない（1）**：.checkHT（実 R 4.3.3 の utils 名前空間に無く、内部関数 checkHT のみ。`.checkHT` は R-devel ヘルプにのみ現れる。Rscript で機械確認）。

## 名前の精選（names から除外した2名）

- `.checkHT`：上記のとおり 4.3.3 に存在しないため names には収録しない（項目は分母監査のため作成し unsupported）。
- `.romans`：関数ではなく名前付き文字ベクトルのデータオブジェクトのため names には収録しない（項目は作成し unsupported）。
- それ以外の35名は全て R 4.3.3 の utils 名前空間に関数として存在することを Rscript で機械確認した。基礎層・B4 part1/part2 との重複はゼロ（テストで固定）。

## 既知のモデル上の制限・逸脱（caution／description にも明記）

- stack の ind は因子ではなく文字列ベクトル。
- strcapture の正規表現は JavaScript エンジンで評価するため、POSIX（TRE）の左端最長一致とは結果が異なる場合がある。POSIX 照合要素 `[. .]`／等価クラス `[= =]` は名指し停止。
- type.convert の integer は本モデルの数値型（double）と同一であり、typeof では区別できない（受理パターンの規則自体は実 R どおり再現）。
- URLdecode の結果は UTF-8 として文字列化する（実 R はロケールのバイト列）。
- combn の FUN は関数値ではなく文字列の集計名のみ（B4 前例踏襲）。結果が長さ1に簡約されない FUN は名指し停止。
- modifyList はデータフレーム同士のみ。head／tail は行列・配列・関数値が値モデルに無いためベクトルとデータフレームのみ。
- head／tail のデータフレームでは行名を常に実体化する（実 R の部分集合化の挙動どおり）。

## テストと検証結果

- `tests/adv-b4s-udata.test.js`：21 件（内容整合3、振る舞い16、未対応の名指し停止2）。
  集約ファイルへ一時結線した状態で **21/21 合格**。
- 関連既存テスト（adv-b4-r-eng1/2/3、adv-b4-audit-r、muse-fix-batch*-r、adv-b4-r-content）：
  結線状態で 203 件中 201 件合格。失敗2件の内訳は次のとおりで、いずれも自班の
  実装不良ではない。
  - `adv-b4-audit-r` の件数マトリクス：B4 期の part1+part2 固定の監査テストであり、
    part9 結線時は「項目の無いハンドラ: head」で落ちる。統合時に同テストの
    マトリクスへ part9（37項目・対応14）を加える必要がある（自班テスト側で
    同等の不変条件「supported ⇔ ハンドラ有り」は固定済み）。
  - `muse-fix-batch13-r` の B13-R：結線を全て戻した素のツリーでも失敗する
    既存のベースライン失敗（B4 裁定済み既知失敗の範囲）。
- 一時結線は検証後に全て復元し、集約ファイルの diff に自班の結線
  （utilsdata／part9）が残っていないことを確認した。ツリーには他班の
  未コミット結線（statsts／namesPart7 等）が存在するが、それらには
  一切触れていない。自班の成果物は新規5ファイルのみ。

## 残存

- スライス外の注意：課題文に挙がっていた read.delim／read.delim2／read.csv2／
  write.csv2 は `slice-udata.json` に含まれないため項目を作っていない
  （read.table／write.table の項目説明内でラッパー関係には言及した）。
- 統合時の作業（コーディネーター）：part9 を reference-advanced.js／
  names-advanced.js／functions-advanced.js の集約へ結線し、adv-b4-audit-r の
  件数マトリクスを更新すること。
