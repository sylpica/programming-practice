# ADV-B4 R実装班2（文字列・テキスト）報告書

担当：R 高度関数グループ「文字列・テキスト操作」（`js/types/r/functions-advanced-char.js`）
テスト：`tests/adv-b4-r-eng2.test.js`（24テスト群、全合格）
GitHub への書き込みは行っていない。編集したのは担当3ファイルのみ。

## 実 R の使用

- 使用した：**R 4.3.3**（`/usr/bin/Rscript`、Rscript (R) version 4.3.3 (2024-02-29)）。
  ローカル R は **C ロケール**（`Sys.getlocale()` = "C"）で動作する。
- 期待値と端の意味論は、公式ヘルプ（stat.ethz.ch R-manual）の Examples、実 R 4.3.3 の
  実測、および R 4.3 ブランチの一次ソース（`src/main/character.c`, `sprintf.c`,
  `grep.c`, `names.c`, `unique.c`, `agrep.c`, `print.c`, `format.c` と base パッケージの
  R ラッパ群）で裁定した。
- 検証方法：全担当関数＋端ケース **335 件の差分バッテリ**（同一式を実 R と
  `definition.simulate` の両方で実行し、値・警告・エラー・名前属性まで機械比較）を
  実施。最終差分は 18 件で、全て「C ロケールの実 R と UTF-8 ロケールモデルの差」
  「R 4.3.3 に存在しない devel 関数」「意図した名指し停止」のいずれか（後述）。
- ロケールのモデル化：本実装は **UTF-8 ロケール**を前提とする（JS の Unicode 文字列
  モデルと整合）。このため次の点は C ロケールの実 R と意図的に異なる：
  sQuote／dQuote の既定引用符が ‘’／“”（実 R は C ロケールで ASCII）、nchar の
  type="chars" がコードポイント数（実 R はバイト数）、make.names が Unicode 文字を
  英字として保持、toupper の簡易ケースマッピング等。コーディネーター裁定事項。

## 担当名の確定リスト（データ班2ファイルから機械抽出）

データ班宣言（reference-advanced-part1.js／part2.js、全1,082件）のうち文字列・
テキスト操作ドメインに属するものは次の72件。

### 実装した名前（44件）

| トピック | 名前 |
|---|---|
| paste | paste, paste0 |
| sprintf | sprintf, gettextf |
| substr | substr, substring |
| nchar | nchar, nzchar |
| 大小変換 | toupper, tolower, casefold, chartr |
| sub | sub, gsub |
| grep | grep, grepl, grepv |
| trimws／startsWith | trimws, startsWith, endsWith |
| make.names | make.names, make.unique |
| charmatch | charmatch, pmatch, char.expand |
| agrep | agrep, agrepl |
| abbreviate | abbreviate |
| toString | toString, is.string |
| formatC／prettyNum | formatC, prettyNum |
| sQuote | sQuote, dQuote |
| utf8ToInt | utf8ToInt, intToUtf8 |
| strtoi | strtoi |
| strwrap 系 | strwrap, strtrim, strrep |
| encodeString／shQuote | encodeString, shQuote |
| validUTF8 | validUTF8, validEnc |

基礎層で実装済みの名前（c, sum, mean, median, sd, seq, seq_len, rep, length,
is.na, as.numeric, as.character, print, cat, data.frame, nrow, ncol, names,
read.csv）には登録していない。

## 実装しなかった名前と名指し理由

### 申し送り（データ班は supported 宣言だが実装しない：8件）

- **strsplit**：リストを返すが値モデルにリスト型が無い。指示どおり実装せず。
- **regexpr, gregexpr, regexec, gregexec**：`match.length` 等の属性が本質だが、
  値モデルは `.names` 以外の属性を保持しない。属性なしの位置ベクトルだけでは
  不完全な再現になるため実装せず申し送る。
  - 両論併記：位置情報だけでも教材価値があるという考えは成り立つが、
    `attr(., "match.length")` を使う実コードがそのまま動くように見えてしまう
    危険が勝る、というのが班の判断。コーディネーター裁定に回す。
- **regmatches**：regexpr／gregexpr の結果オブジェクトに依存するため、上記と
  一体として申し送る。
- **format.pval**：データ班は supported だが、内部で `format()`（format.default の
  ベクトル整形）に依存し、本班では format 自体を実装しない（下記）ため申し送る。
- **formatDL**：内部で `strwrap(..., simplify = FALSE)` のリストと
  `getOption("width")` に依存し、リストが表せないため申し送る。

### データ班 unsupported 宣言と一致し実装しない（11件）

- **gettext, ngettext, bindtextdomain, Sys.setLanguage**：翻訳カタログ機構。
  なお gettextf のみ supported 宣言があり実装した（カタログの無い環境では
  gettext が fmt をそのまま返し、trim は翻訳結果にのみ効くため sprintf と等価。
  実 R 4.3.3 で `gettextf("  %d  ", 5)` が空白を保持することを実測）。
- **iconv, iconvlist**：エンコーディング変換。JS 文字列モデルではバイト列の
  意味論を忠実に表せず、UTF-8 同士の恒等に近い範囲だけの実装は誤解を招くため
  全体を実装しない（指示どおり）。
- **enc2native, enc2utf8, Encoding**：エンコーディング属性機構。同じ理由。
- **grepRaw**：raw 型が値モデルに無い。
- **format**：S3 ジェネリック。format.default のベクトル共通整形
  （formatReal のベクトル版）が別途必要で、本班の範囲では忠実に表せない。
  ただし prettyNum の数値入力パスで必要なスカラー版 formatReal は移植済み。

### ドメイン境界として扱った名前（8件）

- **character, is.character**（データ班 supported）：型コンストラクタ／述語であり
  文字列操作ではない。基礎層の型機構の領分として本班では登録しない。
- **match.arg**（supported）：引数照合ユーティリティでありテキスト操作ではない。
  本班の各ハンドラ内部では同等機構（部分一致・複数候補エラー）を実装済み。
- **.format.zeros**（supported）：prettyNum の内部ヘルパ。prettyNum／formatC の
  marks 経路内に実 R ソースどおり移植済みで、単独の組み込みとしては登録しない。
- **NA_character_**（supported）：関数ではなく定数。アプリのパーサがこのリテラルを
  受け付けない（基礎層の制約。`c("a", NA)[2]` 等で文字 NA は表現可能で、
  本班のハンドラはそちらで検証済み）。
- **pretty, pretty.default, .pretty**（supported）：数値軸の pretty breakpoints で
  あって文字列整形ではない（数値ドメイン）。

### 未検証（1件）

- **format.info**：データ班宣言自体が "unverified"。一次情報で意味論を確定
  できなかったため実装しない（未検証候補として名指しで残す）。

## 正規表現の翻訳範囲の線引き

対象は POSIX ERE（perl = FALSE）→ JS RegExp の翻訳。実装範囲：

- `.` は改行にも一致（`[\s\S]` に翻訳）。`^` は文字列先頭のみ、`$` は
  **絶対的な文字列末尾**のみ（TRE の規則。末尾改行の前では一致しない。
  `(?![\s\S])` に翻訳）。
- 後方参照 `\1`–`\9`、`\b` `\B` `\<` `\>`（Unicode 単語文字クラスによる
  ルックアラウンド展開）、`\w` = `[\p{L}\p{N}_]`、`\d` = `[0-9]`、`\s`。
- POSIX 文字クラス `[:alnum:]` 等12種を Unicode プロパティで展開
  （`[:punct:]` は `\p{P}` で近似：POSIX の ASCII 句読点集合とは記号類の
  扱いが一部異なる）。
- 文字クラス内では `]` の先頭配置はリテラル、バックスラッシュはリテラルな
  バックスラッシュ（POSIX の規則どおり）。
- 原子位置の数量詞（`+a`, `*a` 等）はリテラルとして扱う（TRE の規則）。
  区間 `{n,m}` は空の式への数量詞としても受理。未知のエスケープはその文字
  自体（`\y` → "y"）。
- **最長一致**：grep／grepl／grepv は存在判定のため選択肢（`|`）をそのまま
  許可。sub／gsub は POSIX の最左最長一致が結果を左右するため、選択肢を含む
  場合は「固定した部分文字列への全一致テスト」で最左最長探索を再現する
  （`sub("a|ab", "X", "ab")` = "X" を実測一致）。ただし選択肢と境界
  アサーション（^／$／\b 等）を併用するパターンは再現できないため名指し停止。
- **fixed = TRUE は完全リテラル**で全実装（空パターンの挿入意味論を含む）。
- 名指し停止：**perl = TRUE**（PCRE と JS の差異が大きいため全 grep／sub 系＋
  agrep）、**useBytes = TRUE**、照合要素 `[. .]`・等価クラス `[= =]`、
  未知の POSIX クラス名、重ね数量詞・遅延数量詞（`a+?`, `a**`）、
  区間上限 > 255。不正なパターンは実 R と同じく
  `invalid regular expression '<pat>'` で停止する（理由文言は近似）。
- agrep の fixed = FALSE は TRE 正規表現だが、本実装ではメタ文字を含む
  パターンを名指し停止し、メタ文字なしのパターンはリテラルとして扱う
  （データ班は agrep を supported 宣言：部分実装として申し送る）。

## 実装上の主な裁定と既知の近似・逸脱

- **sprintf**：引数消費カウンタは出力行ごとに 0 に戻り、各引数の要素は行番号で
  リサイクルされる（sprintf.c の実挙動を差分バッテリで確認）。型強制は「最初に
  使われた書式」で引数ごとに決まる状態モデルで再現。ただしアプリには整数
  リテラルが無いため、実 R の INTSXP／REALSXP の区別が観測できるケース
  （例：`sprintf("%s", 1L)` のエラー）は再現できない。浮動小数点の整形は
  BigInt による正確な10進展開＋半偶数丸め（C printf 互換）。負の `*` 精度は
  glibc の不定動作になるため名指し停止。`%s` の精度切り詰めはバイト数でなく
  コードポイント数（UTF-8 ロケールモデル側の選択）。
- **grepl の NA 要素は FALSE**（パターンが NA のときだけ結果が NA）。
  grep の invert は NA の位置を含む。いずれも実 R 4.3.3 で実測。
- **substr の結果長は常に length(x)**（start／stop は循環リサイクル後に
  切り詰め）。substring は3引数とも最長にリサイクル。実測で確認。
- **char.expand の nomatch**：実 R は `if (anyNA(y)) eval(nomatch)` の値を捨て
  `target[y]`（y = NA）を返すため、エラーにならない nomatch を渡しても結果は
  NA になる（実測した実 R の癖）。本実装もそれに合わせた。アプリは引数を
  先行評価するため `nomatch = stop(...)` の形は表現できない。
- **agrep**：転置は原始操作ではない（重み付き Levenshtein の部分文字列 DP で
  再現）。max.distance の名前付き "insertions" 上限がパターン文字の削除を、
  "deletions" 上限がテキスト文字の挿入を制限する（C ソースの実挙動を識別
  プローブで確認し、そのまま実装）。costs の無名エントリは黙って無視される
  （実測）。max.distance の成分指定はリスト形式のみ有効だが、アプリでは
  リストを構築できないため到達不能（長さ>1 のベクトルは実 R と同じく
  `'length = n' in coercion to 'logical(1)'` エラー）。
- **abbreviate**：R ラッパと C 実装（stripchars）を移植。非 ASCII の
  islower 判定は `\p{Ll}` で近似。母音テーブルはソースの 0x2e エントリを含め
  そのまま移植。
- **prettyNum の数値入力**：format.c の scientific／formatReal を要素数1・
  digits=7 で移植。C は二進の nearbyint で丸めるため、正確な10進丸めとは
  境界ケースで稀に異なりうる（近似として明記）。
- **データフレーム**：本班の全ハンドラで「データフレームはこの関数の対象外です」
  と名指し停止（eng1 の先例）。実 R では as.character 経由で動く関数もあるが、
  値の化け方が一様でないため統一して止める（コーディネーター裁定事項）。
- **toString／intToUtf8（multiple = FALSE）** は長さ1の文字列をスカラーで返す
  （基礎層の表示もそれに追随する）。
- **intToUtf8 の負数**：実 R は不正バイト列を生成する（"<U+FFDD>" と表示）ため
  名指し停止にした。
- **grepv／is.string は R 4.3.3 に存在しない**（R-devel 4.6 の追加関数。
  `could not find function` を実測）。データ班宣言と devel の公式ヘルプに
  従って実装したが、4.3.3 基準で見れば宣言側の誤りの可能性があり申し送る。

## その他の申し送り

- **substr の代入形**（`substr(x, 1, 2) <- "ab"`）：パーサ／代入機構の話であり
  ハンドラでは扱えない。遭遇時の扱いはコーディネーターへ申し送る。
- **他班との重複登録**：`char.expand`, `strtoi`, `validUTF8`, `validEnc` は
  mopup 班（functions-advanced-mopup.js）も登録しており、集約
  （functions-advanced.js）のマージ順で mopup 側が有効になる。本班の実装は
  差分バッテリで検証済みだが、重複の解消はコーディネーター裁定に回す。
  なお統合ツリーでの当該4関数の振る舞いもバッテリ335件に含まれ検証済み。
- **既存テストとの相互作用**：統合ツリーでは `tests/muse-fix-batch13-r.test.js`
  の1件（"unknown function with unknown argument still names the function"、
  `sqrt(readline())`）が失敗する。原因はデータ班が `readline` を
  names-advanced-part2.js に宣言したため、未知関数エラーではなく高度モードの
  「実行時に決まる値」に解決されること。本班のファイルは無関係で、ベース
  ツリー（repo-reffix）では同テストは30件全合格。宣言の是非はコーディネーター
  ／データ班の裁定事項として申し送る。本班のテスト（24群）と eng1／eng3／
  eng4／data1／data2／content の各テストは全合格。

## 未確定事項

- format.info（未検証、1件）：意味論を確定できず未実装。
- ロケールモデル（UTF-8 前提）と C ロケール実 R の差異（sQuote の引用符、
  nchar のバイト数、make.names の非 ASCII 等）：モデル選択として明記したが、
  最終的な正はコーディネーター裁定待ち。
- regexpr 系・strsplit・formatDL・format.pval の申し送り（8件）は裁定待ち。
- POSIX `[:punct:]` の近似、sprintf の整数／実数区別、prettyNum の format
  丸め境界：上記のとおり近似として明記した範囲が残る。
