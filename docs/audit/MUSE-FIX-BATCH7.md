# 修正バッチ7 修正報告書（第28ラウンド所見 R28-N1〜N23 の処置）

- 対象ビルド：main d064424（修正バッチ6配信ビルド）。正本は監査ワークスペースの `findings-round28.md`（班別報告 findings-r28-*.md）。
- 体制：領域別5班（PowerShell／VBA／スクリプト系（AHK・PA・JS）／Python・R／C家族。各班は専用コピー `work/fix7-*` で作業し、変更ファイルは班同士で完全に分離）＋統合担当＋別コピーの独立検証班。
- 結果：**全23件（P2×2、P3×21）を処置**。テスト **3,722件全件合格**（バッチ6時点 3,503＋新規・追随）。native-audit exit 0（checks 351、C# 59/59 実物実行・スキップ0、Python 実物実行215、all_passed true）。独立検証（別コピー、独自プローブ56件）は **差し戻しゼロ**（検証報告 `verification-batch7.md`、監査ワークスペース）。
- 台帳登録：RG-240〜RG-261（22グループ）。累計 **1,111件／261グループ**。
- リファレンス総数：**1,327件（対応1,265／参照専用62）**（VBA 185→326、他種は増減なし）。個票 r2 は 1,248行（+141）・r6 は 79行（無変更）で、全行が定義と一致し sha256 は正規方式で全行再現可能。

## 1. 処置した所見（番号単位）

- **R28-N1（P2）AutoHotkey 行頭演算子の継続**：continuation prefix を実装。カンマ・`.`・二項演算子・三項 `?`/`:`・単語演算子 `and/or/in/is` で始まる行を直上の有意な行へ結合する（公式例外の `++`/`--`・複合代入始まりは除外、ブロック開閉行・ラベル・ディレクティブへは結合しない）。断片は結合先の行末コメントの前に挿入し、継続行は空行として残して行番号を維持する。メンバー継続 `.k` はドット前に空白を入れない形に是正。行末側（RG-228）との複合形も確認済み。根拠：AutoHotkey v2 公式 Scripts／Language 文書の継続規則。
- **R28-N2（P2）PowerShell メンバー直後の接着 `/`**：字句解析の相対パス規則が `k/2` 全体を取り込みメンバー名化していた。RG-214 の `-` 分割を一般化し、simple-name（文法 B.1.10）の構成文字でない最初の文字（`-`／`/`／`\`／`.`）以降を再トークン化して演算子側へ戻す形に統一。代入・条件・switch・foreach・パイプライン・入れ子・PSCustomObject・添字経由・`/=` まで棚卸し済み。`$h.k/0` の無言化も解消。実シェル照合フィクスチャへ成功ケース9件を追加（既存ケースの変更・削除なし）。
- **R28-N3 PowerShell 浮動小数点の0除算・0剰余**：`binary()` の型分岐を新設し、実物どおり ±Infinity／NaN を返す形に是正。小数判定はリテラルの dbl 由来フラグ・[double] キャスト・変数の代入由来記録（代入付け替え／関数フレーム／foreach で保持）・値の形の4経路。非有限値の表示統一と最終状態 vars のスナップショット化（RG-223 同型）も併せて実施。整数側の0除算エラーは維持。根拠：Microsoft Learn。
- **R28-N4 PowerShell 文字列代入先への `++`**：`incDec()` を新設し、文字列の代入先への `++`（前置・後置、変数・メンバー・添字共通）だけを `--` と同じ数値変換経路へ是正（`'5'++` → 6、`'abc'++`・`''++` は変換エラー）。`--`・`+=` の実物挙動は不変。
- **R28-N5 PowerShell member-name の正規生成**：文法 B.2 の引用符付き・変数・括弧式のメンバー名を受理し、動的名は `nameExpr`＋`memberKey()` で読み書き双方を解決。`$h.'k-1'` のような実在キーは分割しない。
- **R28-N6 PowerShell 括弧なし属性**：Parameter／ValidateNotNull系／Allow系／CmdletBinding を型ではなく属性（文法 B.2.4）として解釈。ValidateNotNull は束縛時の $null 検証まで実装。文位置の `[CmdletBinding]`＋param 形も対応。
- **R28-N7 PowerShell 三項演算子**：言語仕様 7.4 の三項演算子を実装（最下位の優先順位、分岐は完全な式、右結合、短絡）。`:` 欠落時は真因を名指す。
- **R28-N8（悪化様相）VBA 定数への代入**：根本原因は `js/engine.js` の読み取りが定数を `s.vars` より優先する一方、書き込み経路に定数判定が無かったこと。定数名集合 `VBA_BUILTIN_CONSTANT_NAMES` を新設し、(1) `assign()` で Option Explicit 判定より先に「定数 <name> には代入できません」で名指し停止（通常代入・Let・Set・For 初期化/増分を一括カバー、虚偽原因も解消）、(2) Dim 同名宣言（スカラー・配列）を名指し停止、(3) For／For Each 反復変数の定数を `loop()` 冒頭で停止。棚卸し：複合代入は VBA に存在せず一律パース停止、Const 文・ReDim は全名未対応停止、添字形・メンバー形代入先は従来から停止——いずれも黙った表面なし（回帰テストで固定）。
- **R28-N9 VBA 定数族の完成**：Microsoft Learn 公式列挙で **141件**をエンジン定義＋項目化（VBA 185→326）。内訳：監査実測45名（StrConv 12／Shell 6／CallType 4／IMEStatus 11＝戻り値定数全件含む／QueryClose 4／Form 2／KeyCode サンプル6）に加え、KeyCode は族の完成のため公式全99名を投入。**Calendar 2件（vbCalGreg=0／vbCalHijri=1）は今回 Learn「Calendar constants」で公式確定できたため実装**（バッチ6で未確認だった既知事項の解消）。同根の vbUseCompareOption=-1 も追加。StrConv の 256/512/1024 は Learn の VbStrConv 列挙ページの等価明記で確定し source も同ページに設定。
- **R28-N10 VBA vbDirectory の説明文**：description から SetAttr を除き「GetAttr／Dir で使います」に是正（根拠：Learn「SetAttr statement」Settings 表の6件に vbDirectory 無し）。
- **R28-N11 VBA 新規4項目の source**：vbBinaryCompare／vbTextCompare／vbDatabaseCompare → `instr-function.md`、vbVolume → `dir-function.md`（いずれも Learn の Settings 表で裏付け確認）。
- **R28-N12 AutoHotkey 未完式＋次行 `}`**：RG-228 の検査に「次行が `}` で始まる形」を追加。`}` 単独・`} else {`・トップレベル形が全て専用文言で停止。
- **R28-N13 Power Automate 値側の空白形**：`resolve()` の包み判定・RG-222 判定・包み外しを trim 済み文字列で統一（条件側は不変）。Set／Display／For each × 先頭・末尾・前後空白・タブの全形が RG-222 文言で停止。正規の包み形＋空白は評価（4）、通常テキストの空白は保持。
- **R28-N14 JavaScript 括弧グループ先頭の分割代入シーケンス**：`js/core/script.js` の `statement()` で、括弧内の先頭分割代入に続くカンマをカンマ演算子として読むよう是正（オブジェクト先頭形も同経路）。基本形・混合形・3要素・ブロック内・括弧外カンマ複合が動作し、単独形・二重括弧・式位置・通常代入先頭の対照は不変。
- **R28-N15 JavaScript 式位置の不正残余形**：投機的パターン読みが握り潰していた RG-227 の名指しを、閉じ括弧直後が `=` の場合に限り伝播させるヘルパ（`isRestNamingError`／`patternFollowedByAssign`）を追加し、式位置（配列／オブジェクト）＋文位置の3か所で共用。残余＋既定値・裸の残余が宣言位置と同じ名指しになり、本物のスプレッドは従来の「スプレッド構文」名指しを維持。
- **R28-N16 Python truthy の長さ伝播**：`truthy()` に長さの伝播を実装。range は要素数、辞書ビュー（keys／values／items 全形）は元辞書の現在の要素数で判定し、if／while／or／any／all／filter／内包条件まで全表面を是正。実 CPython 3.12.3 で全期待値を裏取り。イテレータ（__len__ を持たない）は実物どおり常に True（ガードテストで固定）。
- **R28-N17 R データフレーム行数の保持**：行数の正本を実 R と同じ row.names 相当（`rowNames`）へ移行。`dfNrow()` を新設して nrow・列追加検証・二項演算・CSV 化の導出を統一し、最後の列の削除前に行数を rowNames へ実体化。0列でも nrow が残り、行数不一致の列追加は停止、print は `data frame with 0 columns and 2 rows` になる。列／行選択・二項演算への rowNames 伝播と、`data.frame(row.names=)` 列なし形の同根エラーも是正。RG-237 の他の形は不変。公式ソース dataframe.R（dim.data.frame は.row_names_info 由来）で裁定（実機突合は未実施）。
- **R28-N18 R names 置換関数代入**：step に置換関数代入の専用経路を新設し `names(x) <- value` を実装（?names＋公式 C ソース attrib.c の namesgets で裁定：as.character 強制・短い値は NA 埋め・長い値は実物の長さエラー文言・NULL で除去、データフレーム列名の付け替え、部分更新 `names(x)[i] <-` も実装＝従来は黙って無効化されていた同根表面）。棚卸し：colnames／rownames／dim／levels／length 等の他置換関数は読み取り側も含め未対応で、関数名を挙げた未対応停止に是正（「関数呼び出しの結果には代入できません」は R から消滅）。モデル表現上の制限（df の NA 列名は "" で表現、重複列名と names(df) <- NULL は名指し停止）は §4 に明記。
- **R28-N19 C家族 多次元配列**：実物どおり受理・動作まで実装。C/C++ は次元全読み＋行優先平坦化（入れ子/平坦/部分初期化・第1次元推論・char 2次元・連鎖添字の次元別範囲検査・部分添字の行ポインタ、3次元・二重ループ動作）、C# は矩形 `int[,]`（new・初期化子・`a[1,1]`・Length＝全要素数）とジャグ `int[][]`（null行・行代入・連鎖添字）に対応。gcc／g++／dotnet で実物挙動を確認して裁定。
- **R28-N20 C／C++ char 配列の2文字列初期化**：gcc/g++ 実測の excess elements を根拠に「要素が多すぎます（excess elements in char array initializer）」の CompileError へ是正（文字リテラル並び・単一文字列は合法のまま）。
- **R28-N21 C++ std::string の二重波括弧**：RG-231 を一般化し、std::string の二重波括弧だけ1段剥がして受理。三重と整数スカラーの二重波括弧は g++ 実測どおり従来の真因名指しを維持。
- **R28-N22 C# 定数キャスト（RG-238 部分未解消の解消）**：実 dotnet 8.0.428 で全形確定（既定/checked の定数キャスト＝CS0221、明示 unchecked＝折り返し、暗黙変換＝CS0031、定数算術＝CS0220）。根本原因は定数/実行時の区別なしの折り返し処理＋「既定」と「明示 unchecked」を区別できない状態管理。`s.checkMode` を新設し、定数キャストは既定・checked で CS0221 名指しの CompileError、unchecked でのみ折り返すよう是正（実行時キャストは不変）。caution 文面も実規則へ是正し、個票 r2 の当該行を同期した（新旧文面は C家族班報告 batch7-report-cfamily.md に全文明記）。
- **R28-N23 C／C++ 非有限値のモデルメモリ表示**：根本原因は `js/core/c-family.js` の groups が RG-223 のスナップショット置換を通らない生数値を contract.js の `safe()`（JS式表記化）へ渡していた点。groups 専用に非有限数を言語別表記へ置換する `displayNonFinite` を追加し、C/C++ の全表面が inf/-inf/nan で一致（contract.js／engine.js は他種への波及回避のため未変更）。

## 2. 統合時の裁定・特記事項

- **対象ファイルの構成**：VBA エンジン本体は `js/engine.js`、項目本文は `js/content.js` にある（バッチ6と同構成）ため、VBA班は同2ファイル＋`js/types/vba/reference-details.js` を変更した。班間で変更ファイルの重複はゼロ。
- **既存テストの書換え（C家族班）**：バッチ2の SEM-3 テストが是正対象の誤挙動（定数キャスト `(byte)300` → 44）を期待していたため、意図（実行時キャストの折り返し）を保ち変数経由に書き換えた。独立検証が実 dotnet で旧期待値が誤挙動そのものであることを確認し、書換えを妥当と裏取りした。
- **件数ピンの追随**：総数ピン（1,186→1,327、個票 1,107→1,248、VBA 185→326）を、由来コメントの連鎖を延長する従来方式で実測に追随させた（対象テスト：muse-fix-r22-ui／muse-fix-batch4-docs／muse-fix-batch4-pyref／muse-fix-batch2-vba／muse-fix-batch2-fc-flow2／muse-fix-batch2-fc-python）。REQUIREMENTS.md の数表（VBA 行 185→326、本文 1327リファレンス／対応1265）も追随済み。個票 r2 の同期はライブ定義から再生成し、既存行の sha256 固定値（Rem 行・"with" 行）が不変であることをテストで確認した。
- **VBA班の作業中に踏んだ表記ルール違反**（ユーザー→ユーザ）は同班が修正済み。

## 3. 検証結果

- **テスト**：統合ツリー `npm test` **3,722／3,722 全件合格**（統合直後は同期待ち7件のみ失敗し、個票同期＋ピン追随で全件解消）。各班コピーでも全件合格を確認（タイミング系の単発失敗は個別再実行とベース対照で既知の環境フレークと切り分け済み）。
- **native-audit**：exit 0、checks 351、C# 59/59 実物実行・スキップ0、Python 実物実行215、all_passed true。
- **F-02 再照合（独立検証）**：総数 **1,327件（対応1,265／参照専用62）**、VBA 326件。個票 r2 **1,248行全行**が定義と fields 一致、sha256 は正規方式（sort_keys・ensure_ascii=False）で **1,248/1,248 再現**。r6 79行も全行一致。到達性は自項目名 1,327/1,327、独自抽出の束ね項目でも未到達0。**存在・到達性とも漏れ0件**。
- **独立検証の結論：差し戻しゼロ**。独自プローブ56件（欠陥49＋ガード7）で、欠陥は全件ベース（503cb49）で再現→統合ツリーで解消を確認。裁定転換・申し送り7事項も一次情報で裏取り済み。検証報告：`verification-batch7.md`（監査ワークスペース）。
- precache は再生成し `--check` 通過。

## 4. 未処置・未確認（黙って落としていないもの）

- **実シェル照合の最終確認**：本バッチで追加した PowerShell 成功ケース9件を含む shell-native 照合は当VMに実 pwsh／cmd.exe が無く未実施。配信後の CI（validate-shells）で最終確認が必要。
- **PowerShell 引数モード無括弧形** `Write-Output $h.k/2`：黙った $null から「/ を名指す停止」に改善したが、実物の generic-token 文字列化のモデル化は引数モード側の範囲として未処置。
- **PowerShell 非有限値への後続算術**（`(1.0/0)+1`）：従来方針どおり未確認停止を維持。ハッシュ／配列内に格納された整数値の小数（`@{k=1.0}`）は由来を保持できず整数扱い（明示エラー側に倒れる限界として明示）。
- **R のモデル表現上の制限**：df の NA 列名は "" で表現、重複列名と names(df) <- NULL は名指し停止。実 R との機械突合は Rscript が無いため未実施（公式ドキュメント・公式ソースで裁定）。
- **C# の明示範囲外**：暗黙変換の停止カテゴリは従来の OverflowException のまま（停止自体は実物一致）、C# 配列の初期化子なし宣言は1次元を含むモデル一貫の制限、C/C++ 多次元書き込み側の範囲検査は平坦範囲で代用。
- **AHK の範囲外（従来挙動を維持）**：未完式＋次行 `]`（内包内、監査で欠陥に数えない表面）、ブロックコメント終了行にコードが続く行は継続の結合先にしない、関数定義自体が未対応のため `return` 行への結合は実形未検証。
- **JS の未検証位置**：for 初期化部など監査で挙がっていない位置の括弧シーケンス。
- 従来からの保留（Power Fx の Blank 等価性・`"5" + 3`、cmd MOVE デバイス宛、RG-04 等）は変更していない。

## 5. 変更ファイル一覧（統合ツリー、ベース 503cb49 比）

- 製品コード：`js/content.js`、`js/core/c-family.js`、`js/core/script.js`、`js/engine.js`、`js/types/autohotkey/index.js`、`js/types/powerautomate/index.js`、`js/types/powershell/engine.js`、`js/types/powershell/parser.js`、`js/types/python/engine.js`、`js/types/r/index.js`、`js/types/vba/reference-details.js`、`precache.js`（再生成）
- 個票・文書：`docs/audit/reference-r2.json`（+141行・6行更新）、`docs/audit/REQUIREMENTS.md`、`docs/DEVELOPMENT.md`、`docs/audit/muse/consolidated-residual-register.md`、`PROGRESS.md`、`docs/audit/MUSE-FIX-BATCH7.md`（新規）
- テスト：新規5件 `tests/muse-fix-batch7-{ps,vba,script,pyr,cfamily}.test.js`、フィクスチャ `tests/fixtures/powershell-cases.json`（成功ケース+9件）、既存テストの追随9件（batch2-cfamily／batch2-vba／batch2-fc-flow2／batch2-fc-python／batch4-docs／batch4-pyref／batch6-misc／r22-ui／ref-vba）
