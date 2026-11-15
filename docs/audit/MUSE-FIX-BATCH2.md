# 修正バッチ2 修正報告書（Muse 側、2026-11-15）

## 概要

- 対象：専用監査群の当初キュー82件＋範囲拡張で合流した3ファイル分143件＝番号単位225件（実224件。funcheck R-02 と refacc RA-42 は同一欠陥のため重複を除く。refacc RA-36 は RG-144 で解消済みのため処置対象から除外）。
- 台帳登録：RG-145〜RG-163（19グループ）。累計は元項目 953件／163グループ。
- 結果：全件処置（解消済みの再確認のみで変更なしの項目を含む）。独立検証（別コピーの検証班A・B）で対象全件を再現→解消確認し、差し戻し2件は是正後に再確認済み。
- テスト：2,055件 → **2,494件、全件合格**。
- native-audit：exit 0、checks 303、C# 59/59 実行・スキップ0、C/C++ stdout 一致、Python 167、all_passed true。
- リファレンス：978件 → **995件（対応933／参照専用62）**。照合個票 reference-r2.json 917行／reference-r6.json 78行（定義との全フィールド一致、全行 sha256 が正規方式で再現可能であることを検証班が独立確認）。

## 出典ファイルと範囲の経緯

- 当初キュー：findings-narrcheck.md（NX-N1〜28）、findings-perfcheck.md（P-N1〜4）、findings-msgcheck.md（M-N1〜6）、verification-reffix.md の D1（9表面）・D2（8件）、findings-a11ycheck.md（A-N1〜7）、findings-storecheck.md（S-N1〜3）、findings-doccheck.md（D-N1〜10）、findings-tplcheck.md（T-1）、findings-jpcheck.md（J-N1＋表記統一 Y-1〜Y-5）。
- 合流分：関数挙動監査（funcheck）60件については、統合版 findings-funcheck.md はワークスペース内に存在しなかったため、班別6ファイル（findings-funcheck-vba.md／-imagej.md／-cfamily.md／-shell.md／-script.md／-declared.md）を正本として処置した。findings-refacc.md（RA-1〜71）、findings-round23.md（R23-N1〜13。§5 の未確認候補14件は候補のまま処置していない）。
- 第23ラウンドの再分類（SEM-1〜4／PAR-1）は二重処置にならないよう原文で突き合わせた：SEM-1→funcheck-cfamily D1＋NX-N6 と同根、SEM-2→同 D2＋NX-N6 と同根、SEM-3→同 D1〜D3 と同根（ただし「uint の演算代入で -1 の誤値」様相は新規のため D3 の追加再現として処置）、SEM-4→funcheck-shell SH-P3（`[math]::Round` 文言の傍証を追記）、PAR-1→NX-N8（フェーズ1で処置済み）。

## 項目単位の処置（RG 対応）

### RG-145 AutoHotkey（NX-N1、NX-N2、NX-N14、NX-N22、NX-N23、M-N5、J-N1）
for ループの break／continue のエンジン欠陥を根治（テスト14件）。A_TitleMatchMode 等は文面側で差異を開示し、兄弟表面2件（A_* の実行時値に対する例外明記、IsSet caution と A_Loop* の整合）も一掃。J-N1「64ビットのビット演算」は2箇所是正。

### RG-146 Power Apps／フロー（NX-N3、NX-N4、NX-N15、NX-N16、NX-N24、NX-N25、NX-N26、M-N6）
大小区別照合を共通根因から是正（Patch／Defaults 等の兄弟表面を含む、テスト21件）。

### RG-147 script 変換層（M-N2、M-N3）
`js/core/script.js` に変換層 `toLearnerError` を新設し、V8 文言10件を日本語化＋未知例外の汎用受け皿を用意（PracticeError は素通し）。同根の BigInt 増減の型化けも修正（テスト16件）。

### RG-148 シェル（NX-N8、NX-N17、NX-N27、NX-N28、M-N1、M-N4、D1 の PowerShell 表面7件、D2-1、D2-3）
$Matches、比較演算子の別綴り6形（-notlike／-notmatch／-ceq／-cne／-ieq／-ine）を実装。パラメータ不足と未対応の原因区別（M-N1）を含む（テスト26件）。

### RG-149 VBA（NX-N9、NX-N18、D1-4、T-1）
配列代入の説明が格納後の値を引用するよう是正。`Attribute` 文を Rem 前例に倣い supported=true で項目追加（VBA 91件に）。each テンプレート説明を是正。D-N4 のアプリ側文言（Option Base caution の動的配列の限定）も同根として是正（テスト20件）。

### RG-150 ImageJ（NX-N7、NX-N11、NX-N12、NX-N13、NX-N20、NX-N21、D1-1、D2-7）
三項演算子の未選択分岐を評価しないよう是正、文字列 `.length` を項目化（ImageJ 201件に）（テスト24件）。

### RG-151 C家族フェーズ1分（NX-N5、NX-N6、NX-N10、NX-N19、P-N3、P-N4、D2-4）
do-while 回数注記の自己矛盾、符号なし変換の誤値を是正。P-N4 は `transformSource` のリテラル毎 toLowerCase（二乗コスト）を線形化し準備段階へ deadline を導入。P-N3 の残存表面（executeProgram コア内部のホスト例外漏出経路）は本バッチでは未処置（下記「未処置」参照）（テスト11件）。

### RG-152 アクセシビリティ・保存（A-N1〜A-N7、S-N1〜S-N3）
`--muted` を #5c6f63 へ是正し、全背景で WCAG AA 達成を機械計算で確認。A-N7 の3箇所目として action-editor.js への最小変更を含む（テスト17件）。**実スクリーンリーダーでの読み上げ確認は未実施**（コード＋テスト検証のみ）。

### RG-153 文書・記録（D-N1〜D-N10、D2-2、D2-5、D2-6、D2-8）
現行状態ドキュメントの数値を実数へ更新（最終数値パスは統合役が実施：リファレンス995件、テスト2,494件、個票 r2 917行／r6 78行）。D-N6 は台帳冒頭へ注記を追加。D2-2 の真の欠陥は個票7行の sha256 欠落のみと特定し、正規方式 sha256(json.dumps(fields, sort_keys=True, ensure_ascii=False)) で全行を自己整合化した。

### RG-154 性能（P-N1、P-N2）
P-N1：文字列倍増で OOM する7系統（VBA／JavaScript／ImageJ／PowerShell／AutoHotkey／cmd／C#）へ値サイズガードを根治。Python の方式（長さ200,000超を未確定値化）を範とし、C系はフェーズ1の既存契約（日本語理由つき limit 停止）に統一。連結以外の成長経路（繰り返し・join・置換・疎配列書き込み・PS 未確定値 id の合成爆発・ファイル書込み蓄積）も列挙して一掃。P-N2：状態スナップショットは表示専用経路で省略記法つき切り詰め（VBA 倍々25回の結果オブジェクト約134MB → 約56KB）。副次表面：Worker 死亡時の文言（「開始できません」→ 原因に合う文言へ）、P-N4 残存観察（VBA usedReferences の事前計算＋内容キーキャッシュで後処理 2,375〜5,329ms → 64〜362ms）（テスト22件）。

### RG-155 日本語表記統一（Y-1〜Y-5）
長音の短形統一（対象5語、31箇所）、返り値→戻り値（1箇所）、全角チルダ→波ダッシュ（6箇所）、句点直後の半角スペース除去（発生源の生成テンプレート側で根治）、caution 文体の種類内多数派への統一（少数派175文→0）。個票 r2 131行／r6 29行を同期。開発者コメント内のみの旧表記は利用者向け文面でないため対象外として残置（テスト9件）。

### RG-156 VBA 拡張（F-VBA-01〜10、RA-1〜RA-4）
全件修正（テスト12件）。**F-VBA-08 の所見側に誤記**：InStr(3,"abcabc","bc") の期待値 3 は誤りで、一次情報の意味論では 5。実装・テストとも 5 で固定した。F-VBA-10（数値文字列の暗黙変換）は RG-12 の VBA 側方針と整合。

### RG-157 ImageJ 拡張（funcheck D1〜D13、R23-N12、R23-N13、RA-5〜RA-15）
全件修正（テスト56件）。**Math.sinh／cosh／tanh は実在しない関数と一次情報で確定**し、項目は残したまま supported=false へ是正（対応数 −3）。R23-N12：未知エスケープは実 ImageJ（JDK StreamTokenizer）もバックスラッシュを落とすため現行挙動を維持と裁定。D6 は公式ドキュメントの規定（8bit は 256 必須）を Functions.java スナップショットの custom8Bit 経路より優先して採用。

### RG-158 C家族拡張（funcheck D1〜D14、R23-N5、RA-29〜RA-35・RA-37〜RA-39）
D1／D2 は NX-N6 是正で解消済みを確認（変更なし）。D3＋SEM-3、D4〜D14、R23-N5 を修正。RA-37 は開示方式の是正（項目総数不変）。追随班が D3 同根の残存表面（配列初期化子の要素、単項マイナス定数式、checked／unchecked 包み、キャスト位置の C 形式型名）を一掃し、複合代入の誤発停止も是正（テスト23件＋追随4件）。**C# の期待値は Microsoft Learn／言語仕様で裁定し、モデルの C# 意味論の実コンパイル対照は未実施**。申し送りの未処置：unsigned 配列初期化子の浮動小数点要素、`byte b = 200u;` のような接尾辞付き定数の過剰受理（下記「未処置」参照）。

### RG-159 シェル拡張（SH-C1〜C3、SH-P1〜P7、R23-N1、R23-N2、R23-N7、R23-N8、RA-64〜RA-71）
SH-P1／SH-P4 はフェーズ1で解消済みを確認のみ。RA-64／RA-66／RA-70／RA-71 は解消確認のみ。PowerShell は自動変数3件（$PWD／$PSVersionTable／$HOME）とプロパティ項目を追加し 46→50件。追随班が SH-C1 同根の copy／move コピー先デバイス名を一掃（テスト25件＋追随12件）。検証差し戻し：R23-N2 の `0b` 2進リテラルは実 PowerShell に存在しない形式のため、黙った分割（誤値・虚偽原因）をやめ、リテラルを名指す未対応停止に是正（回帰テスト追加）。

### RG-160 Python 拡張（PY-01〜PY-04、R23-N6、R23-N9、R23-N10、R23-N11、RA-16〜RA-22）
集合メソッドの順序非依存引数を iterableChecked で是正、isdigit を CPython の Digit プロパティ判定へ書き換え、数値リテラルを PEP 515 文法へ、代入ターゲット検証を構文段階へ追加。math 定数5件を項目追加（実挙動は従来から確定計算可能で、欠落はリファレンス側のみ）。`with` は RA-20 で対応分類（supported=true）へ是正（テスト21件）。

### RG-161 R／JavaScript 拡張（R-01、R-02、JS-01、R23-N4、RA-40〜RA-48）
R-02 と RA-42 は同一欠陥（$ 部分一致）として一体処置。R23-N4 は R 公式ドキュメントの Usage で17関数を裁定（テスト50件）。**実機 R での再確認は未実施**（VM に Rscript が無く公式ドキュメントで裁定）。seq() 引数なしは「正直に停止する対照」として未処置（判断根拠は班報告に記録）。

### RG-162 フロー拡張（declared D-1〜D-6、R23-N3、RA-23〜RA-28、RA-53〜RA-63）
全件修正（テスト34件）。R23-N3 は `js/core/script.js` の tokenize に fx ダイアレクト限定分岐を追加。**番号対応の訂正**：RA-59＝Power Automate の出典アンカー切れ4件、RA-60＝Power Automate の End（findings-refacc.md 原文の定義が正本。委任時の要約の対応付けは誤りだった）。Sum の単一 Blank 引数はモデルの既存規約（集計では Blank を 0 扱い）に統一（一次情報で確定できず）。

### RG-163 AutoHotkey 拡張（RA-49〜RA-52）
全件を文面側で処置（RA-49 の処方どおりモデル制限は直さず差異として開示）。兄弟表面2件も一掃（テスト10件）。

## 統合時の裁定記録（主なもの）

- 個票 reference-r2.json は行単位ユニオンマージ（キー＝kind＋name）。変更行の sha256 は正規方式で再計算し、全917行が再現可能な sha を持つことを確認した。
- 欠陥側の旧期待値を固定していた既存テストは、一次情報・実挙動に基づいて統合役が更新した：F-VBA-10 関係2件（engine.test.js／muse-fix-vba.test.js）、D3／D7 関係2件（muse-fix-batch2-cfamily.test.js）、ImageJ sinh 系（muse-fix-ref-imagej.test.js）、PowerShell foreach($null) フィクスチャ（SH-P6）、リファレンス総数の固定値（981→995 ほか）、Python totals／with 分類、For Each caution の固定値（round3.test.js）、表記統一に伴う文面期待8件、個票総数 907→917、`{Name: 'A'}` のテストデータ（R23-N3 是正後の文法に合わせ `"A"` へ）。
- 検証班A の観察（PowerShell「変数」項目 syntax 先頭の半角スペース）は同根の正直さとして是正した。

## 独立検証の結論

- 検証班A（verify-a コピー）：対象77番号＋D1 9表面のうち解消76番号、D-N2 が一部解消（スナップショット時点の PROGRESS 記録不足）。D-N2 は統合役が検証スナップショット取得後に PROGRESS のバッチ2節・現行状態・種類別表を是正済みで、最終ツリーで解消を確認した。あわせて npm test 2,493件全合格（当時）と native-audit 独立実行（checks 303、C# 59/59、all_passed true）を確認。検証報告：`docs/audit/muse/verification-batch2-a.md`。
- 検証班B（verify-b コピー）：対象144件のうち解消143件、R23-N2 の `0b` 表面のみ一部解消。差し戻しを受けて RG-159 のとおり是正し、回帰テストと対象ファイル群の再実行で解消を確認した。npm test 全合格も独立確認。検証報告：`docs/audit/muse/verification-batch2-b.md`。
- 本報告書・台帳登録後の最終ツリーで、統合役が npm test 全件（2,494件全合格）と native-audit（exit 0、checks 303、C# スキップ0）を再実行して確認した。

## 未処置・未確認の一覧

### 未処置（方針・申し送りとして明示）
- P-N3 の残存表面：executeProgram コア内部のホスト例外漏出経路（フェーズ1 cfamily 班の申し送り）。
- C家族の狭小表面：unsigned 配列初期化子の浮動小数点要素、`byte b = 200u;` のような接尾辞付き定数から小さい型への過剰受理（実 C# では暗黙変換自体が存在せずエラー）。
- round23 §5 の未確認候補14件：候補のまま処置しない（委任時の明示指示）。
- PowerShell の読み取り経路のデバイス名（`type nul` 等）：書き込み経路の一掃（SH-C1 追随）の対象外として未処置。PowerShell 側のデバイス宛コピー（Copy-Item 先）も同様に対象外。
- `Write-Output 1..3` の失敗：バッチ前スナップショットでも同一の既存表面（回帰ではない、担当外）。
- findings-jpcheck §4 の観察事項2件（テンプレート intro の引用符・省略形）：報告書で「欠陥に数えない」とされた観察のため対象外。
- `.github/workflows/pages.yml` への `actions/setup-dotnet@v4` 追加（R22-N30）：push-files では書けないため、Codex 配信か Web UI 経路への同梱を申し送る（現行 CI はランナーイメージの dotnet で通過）。

### 未確認（一次情報で確定できず、捏造していない事項）
- 実 cmd の MOVE をデバイス宛にした際の元ファイル削除の有無：move＝「先への書き込み＋元の削除」の合成として元を削除する解釈で実装した。実機でエラー仕様であれば要修正。
- VBA Replace の Null エラー番号（94 と推定実装。番号自体は未確認）、Round の負桁、UBound(Null) のエラー番号。
- A_TitleMatchMode への代入の意味論（AutoHotkey）。
- RA-63 のアンカー `#continue`／`#!errorignore`：同型パターン推定でクリック実証なし。
- ImageJ D13 の文字列配列時の実 ImageJ エラーメッセージ文面（文面は自作）。
- Python isnumeric の漢数字網羅範囲：実 CPython 3.12 で照合した常用範囲のみ追加。Unicode の Unihan 数値文字全体の網羅は未確認。
- 性能面：ブラウザの structuredClone が同一文字列参照を重複排除するかは未確認（いずれの経路もステップ数・反復回数の上限で有界）。PowerShell の繰返しガード（文字列100,000／配列10,000で fail）は既存仕様として維持。
- 従来からの保留（本バッチ対象外）：Power Fx `Blank() = 0`／`Blank() = ""` の等価性、Power Fx `"5" + 3` の暗黙変換、cmd 連結形 echo の実 Windows 計測（Codex ステップ4監査の依頼に含む）、RG-04 の保留項目（R の表示2点、C家族 `(long long)` キャスト）。

## 変更ファイル

統合ツリー（repo-reffix）の変更は多岐にわたるため、分類のみ記す。エンジン・コア：js/engine.js、js/content.js、js/app.js、js/core/script.js、js/core/c-family.js、js/core/contract.js、js/core/presentation.js、js/core/action-editor.js。種類別：js/types/{vba,imagej,autohotkey,powerapps,powerautomate,uivision,cloudformation,python,r,javascript,csharp,cmd,powershell,shell}/ 配下。画面・その他：index.html、style.css（コントラスト変数）。文書・個票：PROGRESS.md、docs/DEVELOPMENT.md、docs/audit/REQUIREMENTS.md、docs/audit/MUSE-FIX-REF.md、docs/audit/reference-r2.json、docs/audit/reference-r6.json、docs/audit/muse/consolidated-residual-register.md、本報告書、検証報告2件。テスト：新規17ファイル（tests/muse-fix-batch2-*.test.js。フェーズ1の8班分、拡張の fc-* 7班分、perf、jp）＋裁定による既存テスト更新＋フィクスチャ1件（powershell-cases.json）。precache.js は再生成済み。
