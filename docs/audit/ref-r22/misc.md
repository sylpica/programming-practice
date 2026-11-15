# リファレンス完全性修正：R／JavaScript／Power Apps／Power Automate／UI.Vision 担当分（misc）

- 対象リスト：`reference-completeness-round22.md` の R／JavaScript／Power Apps／Power Automate／UI.Vision 各節（§5 の R／Power Apps 分を含む）
- 処置方針：項目追加を基本とし、追加・変更した全項目の使用例は `node --test tests/audit.test.js` の自種分（audit runnable reference）でエラーなしを確認済み。追加後の総数：R 44件／JavaScript 39件／Power Apps 28件／Power Automate 15件／UI.Vision 22件。
- フラグメント：`misc-r2.json`（58行＝追加45件＋変更13件。ビルド後の定義オブジェクトから node スクリプトで抽出）

## 名前解決の検証方法と凡例

各追加名について、(1) `scan(code)`（コード中の使用名検出）と (2) 実行トレースの `refs`（アプリ側 `resolveReferenceName` による解決を含む）の2経路で、対象名を含む最小コードを実行して実測した。

- 「scan可」＝識別子トークンとして名前が一致し、scan が項目名を返す。
- 「trace可」＝実行トレースの refs が（接頭辞除去の解決後に）項目名へ解決される。
- 演算子・添字・リテラル形状の名前は、トークナイザが識別子として扱わず（演算子トークン）、AST の二項／添字／メンバノードも refs を持たないため、現行の仕組みではどちらの経路でも解決できない。これはエンジン側の仕組みの制約であり、本修正の範囲（エンジン挙動を変更しない）では項目側で解消できない。該当名は各表の「解決」欄に「不可（仕組み制約）」と明記した。

## R（第1層12件・第2層9件・§5 5件）

### 第1層（12件すべて個別項目を追加）

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| rnorm | 項目追加 | 専用分岐が未確定値を返す実装あり（readline と同列）。値は作らず未確定値である旨を本文に明記。R 公式 stats「Normal」 | scan可／trace可 |
| runif | 項目追加 | 同上。R 公式 stats「Uniform」 | scan可／trace可 |
| sample | 項目追加 | 専用分岐が未確定値を返す実装あり。項目には「抽出結果は未確定値で、どの要素が選ばれたかは示さない」と正直に記載。R 公式 base「sample」 | scan可／trace可 |
| `%in%` | 項目追加 | RG-14 の専用実装（全体照合・NA同士一致・結果にNAなし）。R 公式 base「match」 | 不可（仕組み制約：演算子トークン） |
| `$` | 項目追加（列参照・代入の両方を記載） | 読み（存在しない列はNULL）・書き（列の追加・置換）の実装あり、テンプレートの中心操作。R 公式 base「Extract」 | 不可（仕組み制約：メンバノードは列名を refs に持ち、$ 自体は現れない） |
| `[` | 項目追加（単独添字） | subset 実装（正負・論理・文字列添字）。R 公式 base「Extract」 | 不可（仕組み制約：添字ノードは refs を持たない） |
| `[[` | 項目追加（二重添字） | ベクトルの単一要素・データフレームの列取り出しの実装あり。R 公式 base「Extract」 | 不可（仕組み制約：同上） |
| NA | 項目追加 | var 読みの専用処理あり。R 公式 base「NA」 | scan可（trace は定数読みのため refs なし） |
| NULL | 項目追加 | 定数表＋長さ0の意味論（RG-03）。R 公式 base「NULL」 | scan可（同上） |
| break | 項目追加 | 共有パーサ・実行の実装あり。R 公式 base「Control」 | scan可／trace可 |
| next | 項目追加 | R 方言でのみ受理される実装あり。R 公式 base「Control」 | scan可／trace可 |
| repeat | 項目追加 | R 方言でのみ受理される実装あり。R 公式 base「Control」 | scan可／trace可 |

### 第2層（9件すべて個別項目を追加）

束ねる場合は名前解決できることが条件とされたため、識別子として解決できる定数6件は全件を個別項目にした。演算子3件は仕組み上どのみち解決できないが、検索・学習の単位として個別項目にした。

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| `:` | 項目追加 | コロン演算子の専用分岐あり、テンプレートでも多用。R 公式 base「Colon」 | 不可（仕組み制約：演算子トークン） |
| `%%` | 項目追加 | 剰余の実装あり。R 公式 base「Arithmetic」 | 不可（仕組み制約：同上） |
| `%/%` | 項目追加 | 整数除算の実装あり。R 公式 base「Arithmetic」 | 不可（仕組み制約：同上） |
| NaN | 項目追加（個別） | var 読みの専用処理あり。R 公式 base「is.finite」（NaN／Inf のヘルプ） | scan可 |
| Inf | 項目追加（個別） | var 読みの専用処理あり。同上 | scan可 |
| TRUE | 項目追加（個別） | 定数表あり。R 公式 base「logical」 | scan可 |
| FALSE | 項目追加（個別） | 定数表あり。同上 | scan可 |
| T | 項目追加（個別） | TRUE の別名として定数表あり。再定義可能な点を注意書きに明記。同上 | scan可 |
| F | 項目追加（個別） | FALSE の別名として定数表あり。再定義可能な点を注意書きに明記。同上 | scan可 |

### §5（5件すべて項目への追記で処置）

| 対象 | 裁定 | 内容 |
|---|---|---|
| mean の trim 引数 | 項目を修正 | 書式を `mean(x, trim = 0, na.rm = FALSE)` にし、trim（両端の切り取り割合、0.5以上で中央値）を本文に追記。実装（named.trim の処理）と R 公式 base「mean」に一致 |
| names の適用範囲 | 項目を修正 | 書式を `names(x)` に改め、データフレームの列名だけでなく名前付きベクトルの要素名にも働く旨を明記。使用例も名前付きベクトルに変更。実装（namesOf 経由）と R 公式 base「names」に一致 |
| length のデータフレーム時の値 | 項目を修正 | 「データフレームでは列数を返す（行数は nrow）」を追記。実装（data.frame では列数を返す分岐）と R 公式 base「length」に一致 |
| if の式形式 | 項目を修正 | 書式に `値 <- if (条件) 式 else 式` を追加し、値を返す式として使える旨（else なし・不成立なら NULL）を本文に追記。実装（ifexpr）と R 公式 base「Control」に一致 |
| データフレームへの要素演算（RG-70） | **data.frame 項目への追記**で処置（独立項目にしない） | 独立項目化しない理由：RG-70 は「データフレームへの二項演算」という振る舞いであり、対応する固有の名前（関数名・キーワード）が存在しない。演算子側の項目（`%%` 等）からも到達できないため、学習者が探す先は data.frame 項目が自然であり、そこへ「四則演算・比較は列ごとの要素演算」と追記した。実装（binary の RG-70 分岐）と一致 |

## JavaScript（第1層7件・第2層8件）

### 第1層（7件すべて項目を追加）

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| join | 項目追加 | push／pop と同列の配列メソッド実装あり。MDN「Array.prototype.join」 | scan可／trace可（呼び出し名 `values.join` が接頭辞除去で join に解決） |
| typeof | 項目追加 | パーサ・評価に専用実装（未宣言名・TDZ 含む）。MDN「typeof」 | scan可（trace は単項演算のため refs なし） |
| while | 項目追加（do-while も同項目でカバー） | 実装あり、refs は両形式とも `while` を共有。書式・本文に do-while を併記。MDN「while」 | scan可／trace可 |
| break | 項目追加 | パーサ・実行の実装あり。MDN「break」 | scan可／trace可 |
| continue | 項目追加 | 同上。MDN「continue」 | scan可／trace可 |
| BigInt | 項目追加 | リテラルと BigInt 同士の演算の実装あり。本文・注意書きに「`BigInt(...)` コンストラクタ呼び出しは未実装」と明記。MDN「BigInt」 | 不可（仕組み制約：リテラル `123n` には識別子トークンが現れず、項目名 BigInt と照合する対象がない） |
| オブジェクトリテラル | 項目追加（名前は「オブジェクトリテラル」） | 宣言初期化を含むリテラルの実装あり。MDN「Object」 | 不可（仕組み制約：リテラル構文には名前トークンがない） |

### 第2層（8件：7件追加＋1件は意図的除外として宣言化）

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| length | **項目化せず「意図的除外として宣言化」** | `tests/muse-fix-core.test.js` が「length は refs に含めない」ことを明示的に検証しており、意図的除外の可能性が高い。項目化すると refs 除外の設計と矛盾するため、宣言による明示に留める。下記「宣言文案」をコーディネーターが宣言側（DEVELOPMENT.md 等）へ反映すること | —（除外が裁定） |
| id | 項目追加 | モデル DOM プロパティ。textContent／value の既存項目の体裁に倣った。MDN「Element.id」 | scan可／trace可（メンバ語彙として pendingRefs に載る） |
| tagName | 項目追加 | 同上。MDN「Element.tagName」 | scan可／trace可 |
| children | 項目追加 | 同上。MDN「Element.children」 | scan可／trace可 |
| document.body | 項目追加 | モデル DOM の body（createElement の結果の追加先）。MDN「Document.body」 | scan可（trace はメンバ名 body 単体では項目名と一致しない） |
| undefined | 項目追加 | 名前解決で専用に値を返す実装あり。MDN「undefined」 | scan可 |
| NaN | 項目追加 | 同上。MDN「NaN」 | scan可 |
| Infinity | 項目追加 | 同上。MDN「Infinity」 | scan可 |

#### length の宣言文案（コーディネーター反映用）

> JavaScript の `length`（配列・文字列のプロパティ）は意図的除外とする：使用中チップの refs には含めないことをテストで明示検証している設計判断（`tests/muse-fix-core.test.js`）に基づき、リファレンス項目は設けない。プロパティ自体の読み取りはモデルで対応している。

## Power Apps（第1層4件・第2層2件・§5 6区分8項目）

### 第1層（4件すべて項目を追加）

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| And | 項目追加（関数形） | arity 定義と case 実装あり（RG-50）。Microsoft Learn Power Fx「And, Or, Not functions（function-logicals）」 | scan可／trace可 |
| Or | 項目追加（関数形） | 同上 | scan可／trace可 |
| Not | 項目追加（関数形） | 同上 | scan可／trace可 |
| ThisRecord | 項目追加 | レコードスコープ内でのみ解決し、外では名指しで停止する実装あり。Microsoft Learn Power Fx「Operators（ThisRecord）」 | scan可（trace は識別子読みのため refs なし） |

### 第2層（2件を1項目に束ねて追加）

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| in／exactin | 項目「in（演算子）」を追加し両形式をカバー | binary 処理として実装あり（文字列の部分文字列判定・テーブルの包含、in は大小不区別／exactin は区別）。同一演算子ファミリであり、書式欄に両形式を併記した。Microsoft Learn Power Fx「Operators（in and exactin）」 | 不可（仕組み制約：項目名に「（演算子）」を含むため識別子トークンと一致せず、二項ノードも refs を持たない） |

### §5（書式変更提案の処置：8項目を実装どおりに更新。変更行はすべて misc-r2.json に含む）

| 項目 | 裁定 | 内容（実装との照合結果） |
|---|---|---|
| Text | 書式・本文・注意書きを更新 | 書式を `Text(Value [, Format [, ResultLanguageTag]])` に更新。使用例も書式付き `Text(Count, "#,##0")` に変更。モデルの対応範囲（数値書式のみ・言語タグは en-US のみ・日付書式は未対応）を注意書きに明記。実装（fxFormatNumber、tag は en-US のみ受理）と Microsoft Learn「Text function」に一致 |
| LookUp | 書式・本文・使用例を更新 | 第3引数（削減式）を書式 `LookUp(Table, Condition [, ReductionFormula])` に追記し、本文と使用例（`Value * 10`）に反映。実装（RG-18 の削減式評価）と一致 |
| If | 書式・本文を更新 | 固定引数形 `If(Condition, Then, Else)` を可変長 `If(Condition1, Then1 [, Condition2, Then2, ...] [, Else])` に更新。実装（lowerBehavior の可変長処理、arity [2, ∞)）と一致 |
| Switch | 書式・本文を更新 | 可変長 `Switch(Value, Match1, Result1 [, Match2, Result2, ...] [, Default])` に更新。実装（arity [3, ∞)）と一致 |
| Collect | 書式・本文を更新 | `Collect(Collection, Record1 [, Record2, ...])` とし、複数レコード・テーブルの一括追加を明記。実装（arity [2, ∞)、各引数を展開して追加）と一致 |
| ClearCollect | 書式・本文を更新 | `ClearCollect(Collection, RecordOrTable1 [, RecordOrTable2, ...])` とし、Collect と同様の複数指定を明記。実装と一致 |
| Sequence | 書式・本文を是正 | 書式を `Sequence(Records [, Start [, Step]])` に改め、Start／Step の省略可と既定値（各1）を明記。項目自身の使用例 `Sequence(3)` との食い違いを解消。実装（省略時は 1）と一致 |
| Navigate | 文面を実装に合わせて制限を明記 | 実装は第1引数のみ（arity [1, 1]）で、第2・第3引数を渡すと引数個数エラーで停止する。その旨を注意書きに明記し、書式は `Navigate(Screen)` のまま（実装より広げない）。Microsoft Learn の実関数は第2・第3引数を持つが、本モデルの制限として明示した |

## Power Automate（第1層1件）

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| Else if | 項目追加 | classify で `"Else if": "elseif"` に分類され、`actionProgram` が分岐を構築・実行する。If／Else／End の体裁（reference-details の description／returns／source）に倣った。パレット外のアクションのため、パレットには加えずリファレンスへ直接追加した（UI.Vision の Number と同じ「参照専用の追加」方式）。Microsoft Learn「Conditionals（Else if）」 | scan可／trace可（アクション名が refs になる） |

## UI.Vision（第1層1件・第2層3件）

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| String | 項目追加（第1層） | Sandbox 式の関数として Number と並べて実装あり（式で使える関数はこの2件のみ、他は未対応で停止）。Number 項目の体裁・方針コメント（RG-59「コマンドではないが式の語彙として載せる」）に倣った。一次情報は JavaScript の String（MDN） | trace可（式内の呼び出し名として refs に載る。scan はコマンド名のみ対象のため対象外＝Number と同じ扱い） |
| ${!times} | 項目追加（第2層） | times ループ内で1始まりのカウンタとして提供される組み込み変数（実装で counterName として設定）。Number を式の語彙として載せた前例と同方針。UI.Vision 公式「times」 | 不可（仕組み制約：変数名は scan（コマンド名のみ）・trace refs のどちらの対象でもない） |
| !statusOK | 項目追加（第2層） | 各コマンド実行後に成功可否が設定される組み込み変数（初期化・実行後更新の実装あり）。同方針。UI.Vision 公式ドキュメント | 不可（仕組み制約：同上） |
| !errorIgnore | 項目追加（第2層） | 文字列 "true" のときエラーを継続扱いにする組み込み変数（実装あり）。同方針。UI.Vision 公式ドキュメント | 不可（仕組み制約：同上） |

## 申し送り

- 総リファレンス件数が 511 から増えるため、件数を固定している既存テスト（`tests/muse-fix-r22-ui.test.js` の total=511 検証）や台帳・DEVELOPMENT.md の件数表記はコーディネーター側で更新が必要。
- JavaScript `length` の宣言文案（上記）は未反映。宣言側への反映はコーディネーターが行う。
- 名前解決が「不可（仕組み制約）」の項目は、項目自体はリファレンス一覧から参照できるが、使用中チップには現れない。解消にはエンジン側（scan／refs の仕組み）の変更が必要で、本修正の範囲外。
