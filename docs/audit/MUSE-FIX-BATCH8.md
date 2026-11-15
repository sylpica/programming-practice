# 修正バッチ8 修正報告書（第29ラウンド所見 R29-N1〜N30 の処置＋統合側追加候補 StrConv の裁定）

- 対象：監査第29ラウンド（findings-round29.md）の新規欠陥30件（全てP3、うち悪化様相1件 R29-N10）＋統合側申し送り候補1件（StrConv）。
- ベース：33772b6（CI是正 RG-262／RG-263 適用済み）。
- 実施形態：6つの修正班（各班が専用コピーで作業し、統合側がファイルを受け取り共有ファイルを一元編集）＋統合前独立検証班（別コピー）。台帳登録：RG-264〜RG-292（29グループ）。累計は元項目 1,144件／統合 292グループ。
- 結果サマリ：全30件＋候補1件を処置（実装25件、文面・実装1件、文面2件、文書1件、裁定＝所見不成立1件）。`npm test` 3,863件全件合格。native-audit 完走（all_passed: true、検査351項目、C# 59／59実走・スキップ0、Python実走215件）。リファレンスは合計 1,340件（対応 1,266件／参照専用 74件）。F-02 再照合は存在・到達可能性の両基準でゼロ。独立検証は30件全件の解消を確認し、差し戻し1件（R29-N8）は検証コピーの陳腐化によるもので再検証で解消。

## 1. 処置した所見（番号単位）

- **R29-N1（CloudFormation fragment の型検証なし）** → 実装（RG-264）。`runHandler()` に成功応答の fragment 型検査を追加し、オブジェクトでない／配列／未確定値を名指し停止させた（トップレベル Transform・Fn::Transform・連鎖・直接実行の全経路。連鎖は後段へ渡る前に止まる）。根拠：AWS 公式 template-macros-author の応答契約（fragment は置換先へ差し込まれる JSON オブジェクト）。兄弟表面として、応答自体が配列の場合の辞書判定と errorMessage が文字列でない場合の status フォールバック化も是正。fragment 項目に caution を追記し個票 r2 を同期した。
- **R29-N2（PowerShell double 由来が境界で喪失）** → 実装（RG-265）。RG-241 の小数由来記録を関数引数・戻り値・パイプライン `$_`（Where／ForEach／switch 含む）・foreach スカラーの各境界へ伝播させ、`$x/0` 等の「0による除算です」という虚偽原因を解消した（実物は Infinity／NaN）。ハッシュ／配列要素の由来喪失は既知限界として様相不変をテストで固定した。
- **R29-N3（PowerShell 三項演算子の項目漏れ＋F-02 機械照合の構造的原因）** → 実装（RG-266）。三項演算子のリファレンス項目を追加した（`三項`／`条件演算子`／`?:` で検索到達可能。個票 r6 に原文ハッシュ付きで登録）。構造的根治として `tests/muse-fix-batch8-f02ops.test.js` を新設し、parser の演算子表・比較演算子生成リスト・代入表・文法要素を機械抽出して項目カバーまたは明示除外（現状 `-f` のみ）を `npm test` で機械検証する形にした。あわせて算術・代入演算子項目の description に `%=`（N11）を反映した。
- **R29-N4（ImageJ 参照専用37件のラベル混同）** → 文面・実装（RG-273）。37件を1件ずつ確認し全件「未対応」へ統一した（34件＝実在・未実装。3件＝Math.sinh／cosh／tanh は実物 ImageJ に存在しないことが確定しており、不在の事実は note 本文に保持した。「未確認」にすべき項目は0件）。caution の一括付加文と実行時文言テンプレート7箇所を是正した。残り25件（VBA 8／Python 8／CFN 8／JS 1）も全数照合し同型の混同がないことを確認した。値が未確定なことが理由の正当な「未確認」停止は不変。
- **R29-N5（参照専用がコード練習ビューで判別できない）** → 実装（RG-274）。`referenceOnlyMark`／`applyReferenceOnlyMark` を追加し、リファレンス一覧（#refList）・使用中チップ（scan／trace 両経路）・テンプレート解説チップの3表面に、バッジと同文言・同配色の「未対応」テキストタグ＋aria-label を付与した（色だけに頼らない区別。コントラスト 4.74:1 で AA 維持）。
- **R29-N6（C／C++／C# の対応範囲文面が挙動と矛盾）** → 文面（RG-275）。`semantics.support` の「多次元配列は未対応」の主張を除去し対応を明記した。棚卸しで C#「array」項目の syntax にも矩形・ジャグの形を追記した。
- **R29-N7（C#「new」項目の caution が対応済み形式を未対応と誤認させる）** → 文面（RG-276）。syntax／caution を実態（`new int[2,3]` 矩形・`new int[2][]` ジャグ対応済み）へ是正し個票を同期した。
- **R29-N8（DEVELOPMENT.md の現在形主張の陳腐化）** → 文書（RG-277）。L3 の RG 範囲・L55／L71 の件数を実測へ是正し、L157 の種類別段落と個票行数もバッチ8の現在値へ追随させた。独立検証の差し戻しは検証コピーが是正前の古いコピーだったことによるもので、再検証（verification-batch8-n8.md）で解消を確認した。
- **R29-N9（PowerShell 属性の空括弧形・文位置形）** → 実装（RG-267）。`[ValidateNotNull()]` 等の括弧つき形と文位置の括弧なし `[OutputType]` を受理した。RG-263（括弧なし＝型リテラル）は不変であり、括弧つき形だけが属性として処理される。
- **R29-N10（PowerShell Validate 系属性の検証未実装＝悪化様相）** → 実装（RG-268）。ValidateNotNullOrEmpty／ValidateNotNullOrWhiteSpace の検証を Microsoft Learn のクラス定義どおりに実装した（NotNull は $null のみ、OrEmpty は $null・空文字・空コレクション、OrWhiteSpace は空白のみ文字列も拒否）。停止文言は実際に指定された属性名を名指すよう是正した。兄弟表面として ValidateCount／Length／Range／Pattern を実装し、ValidateSet の既存実装の有効性を確認し、ValidateScript は名指し停止を維持した。AllowNull／AllowEmptyString／AllowEmptyCollection の免除合成も実装した。
- **R29-N11（PowerShell `%=` 未実装＋停止原因の誤帰属）** → 実装（RG-269）。剰余の複合代入として実装し、字句の分断による「= が必要です」の誤帰属を解消した。複合代入6種の全位置受理を棚卸し・固定した。
- **R29-N12（PowerShell メンバー接着 `-=`）** → 実装（RG-270）。メンバー名の再字句化で `-=` が隣接する場合に融合する規則を追加した（PSCustomObject・連鎖・添字経由を含む。接着減算・後置 `--` は不変）。
- **R29-N13（PowerShell 括弧付き代入式）** → 実装（RG-271）。代入深さの管理で文位置代入と区別して実装し、8位置＋連鎖代入 `$y = $x = 5` を受理させた。
- **R29-N14（PowerShell 部分式 `$()`）** → 実装（RG-272）。式位置の `$()` を実装した（空は出力なし、複数文は最後の出力列、複数値は展開）。補間は不変。
- **R29-N15（Python `__bool__`／`__len__`）** → 実装（RG-278）。`truthyOf`／`specialLookup`／`callSpecial`／`lenOfInstance` を新設し、真値判定の全箇所（if／while／not／and・or／三項／assert／内包条件／bool()／any・all／filter／sorted・sort の reverse／zip の strict）を統一経路へ移行、`len()` は `__len__` を呼ぶ形にした（特殊メソッドは実 CPython どおり型からのみ引く）。実 CPython 3.12.3 との32ケース機械突合で出力・例外種別が全件一致した。
- **R29-N16（R 1列 df の行選択 drop）** → 裁定：所見不成立（RG-279）。一次情報（公式ソース `dataframe.R` の `[.data.frame` は drop 既定が `length(cols) == 1` で真となり、列が1本残る選択はベクトルを返す）により現行挙動が実 R どおりと確定したため、コード変更せず実 R 挙動を固定するピンテストを追加した。独立検証でも裁定を確認した。
- **R29-N17（R `names<-` の全 "" 名前の保持）** → 実装（RG-280）。公式 `attrib.c` の `namesgets`（value をそのまま付与、消えるのは NULL のみ）どおり、`names<-` と `withNames` のセンチネル規約を廃止し無条件付与にした。同根の兄弟表面（添字選択の正・負・論理分岐、`c()`、`rep()` の呼び出し側）は「入力に名前属性が無ければ付けない」形に是正した。
- **R29-N18（C# ジャグの裸の入れ子初期化子）** → 実装（RG-281）。波括弧ノードに印を付けて `new` 式の初期化子と区別し、実物どおり CS0623 の CompileError で名指し停止させた。付随観察の行への裸代入 `a[0]={1,2}` の虚偽原因も CS0623 名指しへ是正した。
- **R29-N19（C# 矩形配列の foreach）** → 実装（RG-282）。行優先に要素を列挙するよう是正した（ジャグの行列挙は実物どおり維持）。
- **R29-N20（C# 添字形混同の誤受理）** → 実装（RG-283）。宣言型からの型再構成＋添字照合を新設し、矩形への `a[0][1]`・部分添字 `a[1]`・ジャグへの `a[0,1]` を読み・書き・`++` の全形で CS0022 名指し停止にした。
- **R29-N21／N22（C# 配列の表示）** → 実装（RG-284）。宣言型由来の正しい型名（Byte[]／Int32[,]／Int32[][] 等）を表示するよう是正し、char[] は WriteLine(char[]) オーバーロードどおり文字出力にした。文字列連結・補間内の配列も型名表示へ統一した（char[] の連結は型名）。
- **R29-N23（C／C++ char 波括弧初期化の過剰一般化）** → 実装・文面（RG-285）。gcc／g++ 実測に合わせ、excess の名指しを「先頭要素が文字列」の形だけに限定し、C++ は invalid conversion の名指し、C は受理に是正した。ポインタ変換値は未確定として保持し、到達時は未確認停止（裁定）。
- **R29-N24（C++ `std::string{{'h','i'}}`）** → 実装（RG-286）。初期化子リスト構築として受理した（文字列混在は invalid conversion、範囲外整数定数は narrowing で名指し）。
- **R29-N25（C# 定数の浮動小数点キャストの停止カテゴリ）** → 実装（RG-287）。実 dotnet 8.0.428 の実測7形に基づき、既定／checked を CS0221 に是正した。兄弟表面として char への定数キャストの黙った折り返しも CS0221 化した。明示 unchecked の定数浮動小数点キャストは畳み込み値が unspecified のため未確認停止を維持した（裁定）。実行時キャストは不変。
- **R29-N26（AHK 単語演算子の大小）** → 実装（RG-288）。`AHK_KEYWORD_CASE` に and／or／not／in／is を追加し文キーワードと同じ経路で大小無視化した（AHK v2 公式の大小無区別原則）。影響範囲は演算子認識のみ。
- **R29-N27／N28（AHK 行継続の到達範囲）** → 実装（RG-289）。RG-249 の書換先行構造を組み替え、行継続の結合を書換前の生行に対して行い結合後に一括書換する形にした。コマンド形式呼出行（MsgBox 行）への継続と、括弧内包中の継続（結合条件 `enclosureDepth === 0` の撤去）が公式継続規則どおりに成立する。
- **R29-N29（JS 波括弧なし本体の else／do-while）** → 実装（RG-290）。本体文の終端 `;` を本体側が消費する形（ECMAScript の文法上の帰属どおり）に是正した。dangling else を含む全形が実 Node どおりに動作する。波括弧あり本体＋`;`＋else は実 JS でも SyntaxError のため従来どおり停止。
- **R29-N30（JS 残余名指しの伝播条件）** → 実装（RG-291）。投機的パターン読みの残余名指しエラーを全式位置で無条件に伝播させた（本物のスプレッドは従来の名指しを維持）。裁定変更として、バッチ7テストの対照 `[...r = [1]]`（宣言右辺リテラル形）の期待値を残余名指しへ1件更新した（独立検証で妥当性を確認。留意：実 Node ではリテラル位置の同形は実行可能）。
- **StrConv 候補（統合側追加）** → 実装（RG-292）。裁定は「追加」。同型の全数棚卸し（バッチ6・7の全定数242件の説明文を機械走査）で、説明文が所有者を名指しするのに項目が皆無だった関数12件（StrConv／Shell／CallByName／QueryClose／Show／Unload／GetAttr／SetAttr／Dir／FormatDateTime／VarType／Weekday）を参照専用項目として追加した（いずれも `supported:false`＋caution で未対応・参照専用を明示する U-45 充足形。内容は VBA-Docs 原文で確定）。Chr は定数値の定義式としての等価表現であり所有者案内ではないため追加しないと裁定した。処置後、項目皆無の残りは0件。

## 2. 統合時の裁定・特記事項

- **CI是正（RG-262／263）との相互作用**：N9／N10 は RG-263 の「括弧なし属性名＝型リテラル」規則の上に構築した（括弧つき形だけを属性として処理し、括弧なし形の解釈は不変）。統合後の全件テストと独立検証のプローブで、括弧なし形・括弧つき形・検証の3経路が競合しないことを実走確認した。
- **個票の同期**：r2 は実行時定義からの機械同期で39行の fields 変更（imagej caution 37件＋csharp「new」caution＋cfn fragment caution）と新規12行の挿入を行い、全行の sha256 を再計算した（挿入12行の sha256 は修正班が独立に計算した値と全件一致）。r6 は三項演算子行を追加し、原文（about_Operators.md、固定コミット）の sha256 を既存行の方法で検証したうえで記録した。
- **件数ピンの追随**：リファレンス件数（1,327→1,340、参照専用 62→74、VBA 326→338、PowerShell 51→52）を固定する既存テストの期待値（§5 の既存テスト16件に含む）と、REQUIREMENTS.md／DEVELOPMENT.md の現在値記載を更新した（従来の履歴コメントの形を継承し、弱体化はしていない）。
- **既存テストの期待値変更は2件のみ**：バッチ2 D11 の対照（RG-287 の実測 CS0221 に合わせた是正）と、バッチ7 `[...r = [1]]` の対照（RG-291 の裁定変更）。いずれも一次情報・実測に基づく是正で、報告書と独立検証で妥当性を確認済み。UI 班のテスト3件は旧文言（混在ラベル）を固定していた期待値の是正。
- **precache.js** は `scripts/precache.mjs` で再生成し `--check` を通過した（sw.js は不変）。

## 3. 検証結果

- 統合ツリー：`npm test` **3,863件／3,863件 全件合格**（node --test）。`python3 tests/native-audit.py </dev/null`（PATH に ~/dotnet）：all_passed: true、検査351項目、C# 59／59実走・スキップ0、Python実走215件。統合直後の失敗14件は全て件数ピンで、機能リグレッションは0件だった。
- F-02 再照合：存在漏れ・到達可能性漏れの両基準でゼロ。あわせて RG-266 の機械照合テストが演算子・文法要素までを `npm test` の対象に含める形になった。
- 独立検証（verification-batch8.md／verification-batch8-n8.md）：別コピーで対象30件＋候補1件の再現→解消を自前プローブ約110件・スタブ DOM 描画・個票全行照合で確認した。主な独立確認：N16 の裁定を R の公式ソースで再確認（異論なし）。N10 の拒否と属性名の名指し。F-02 検出力は項目除去の変異テストで実証（除去時に f02ops が2件失敗、復元後にバイト一致）。r2 の sha256 1,260行全件を再計算で一致。r6 の80行全件が実行時と同期。追加12件の出典を VBA-Docs 実ページで照合。統合ツリーの 3,863件全件合格も独立に再現した。差し戻し1件（R29-N8）は検証コピーの陳腐化が原因と判明し、再検証で解消した。

## 4. 未処置・未確認（黙って落としていないもの）

- **PowerShell フィクスチャ追加分（+9成功／+3エラー）の実シェル最終確認は次回 CI**（RG-262／263 のフィクスチャと同様、Windows 実シェル照合は CI の validate-shells が最終確認。ローカルでは静的妥当性まで）。
- **R29-N23 のポインタ変換値**：C の `(char*)"ab"` の変換値は未確定として保持し、到達時は未確認停止（裁定。値を捏造しない）。
- **R29-N25 の明示 unchecked 定数浮動小数点キャスト**：畳み込み値が unspecified のため未確認停止を維持（裁定）。
- **R29-N30 のリテラル位置の名指し**：宣言右辺リテラル形 `[...r = [1]]` は実 Node では実行可能だが、残余名指しへの位置一貫性を優先した（裁定。独立検証の留意として記録）。
- **Python の他の特殊メソッド**（`__str__`／`__eq__` 等、UC-4）：N15 の範囲外として未対応のまま。`__len__` の巨大 int（OverflowError）の再現も未確認。
- **R の `drop = FALSE` 名前付き引数**（UC-1）：既知の未対応のまま（N16 の裁定とは別件）。
- **QueryClose の到達可能性**：走査経路では到達不可（本体が未登録のため）。項目自体は参照専用として存在する。
- **r6 三項演算子行の sourceSHA256**：統合側が固定コミットの原文ファイルから計算し、既存行の方法で交差検証済み。独立検証班は描画フェッチではバイト再現できず、存在と形式の確認に留まった（値自体は統合側の計算を正とする）。

## 5. 変更ファイル一覧（統合ツリー、ベース 33772b6 比、計49件）

- 製品コード（15件）：`js/app.js`、`js/content.js`、`js/core/c-family.js`、`js/core/script.js`、`js/types/autohotkey/index.js`、`js/types/cloudformation/index.js`、`js/types/imagej/engine.js`、`js/types/imagej/index.js`、`js/types/powershell/engine.js`、`js/types/powershell/index.js`、`js/types/powershell/parser.js`、`js/types/python/engine.js`、`js/types/r/index.js`、`js/types/vba/reference-details.js`、`style.css`
- 生成物（1件）：`precache.js`
- 個票・文書（7件）：`docs/audit/reference-r2.json`、`docs/audit/reference-r6.json`、`docs/audit/muse/consolidated-residual-register.md`、`docs/audit/MUSE-FIX-BATCH8.md`（新規）、`docs/audit/REQUIREMENTS.md`、`docs/DEVELOPMENT.md`、`PROGRESS.md`
- フィクスチャ（2件）：`tests/fixtures/powershell-cases.json`、`tests/fixtures/powershell-error-cases.json`
- テスト（新規8件）：`tests/muse-fix-batch8-ahkjs.test.js`、`tests/muse-fix-batch8-cfamily.test.js`、`tests/muse-fix-batch8-cfnvba.test.js`、`tests/muse-fix-batch8-f02ops.test.js`、`tests/muse-fix-batch8-ps.test.js`、`tests/muse-fix-batch8-pyr.test.js`、`tests/muse-fix-batch8-ui.test.js`、`tests/muse-fix-batch8-vbasweep.test.js`
- テスト（既存の追随・是正16件）：件数ピンの追随と期待値是正（`tests/muse-fix-batch2-cfamily.test.js`、`tests/muse-fix-batch2-fc-flow2.test.js`、`tests/muse-fix-batch2-fc-imagej.test.js`、`tests/muse-fix-batch2-fc-python.test.js`、`tests/muse-fix-batch2-fc-shell.test.js`、`tests/muse-fix-batch2-imagej.test.js`、`tests/muse-fix-batch2-jp.test.js`、`tests/muse-fix-batch2-vba.test.js`、`tests/muse-fix-batch3-psengine.test.js`、`tests/muse-fix-batch4-docs.test.js`、`tests/muse-fix-batch4-pyref.test.js`、`tests/muse-fix-batch6-misc.test.js`、`tests/muse-fix-batch7-script.test.js`、`tests/muse-fix-batch7-vba.test.js`、`tests/muse-fix-r22-ui.test.js`、`tests/muse-fix-ref-vba.test.js`）
