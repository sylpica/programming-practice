# WS-HOOKREG（収束判定ラウンド）findings — CFNフック＋回帰

- 担当範囲：CFN-08〜15、CFN-16〜18、CFN-B1〜B3・B5〜B7（CFN-B4 は注記テキスト生成まで。画面エスケープは実ブラウザ班担当）、REG-01、REG-02、REG-03、REG-05。
- 対象ツリー：`~/workspace/programming-practice-audit/work/lane-a8-conv/`（統合ビルド 4771801 のコピー）。対照ツリー：`~/workspace/programming-practice-audit/deliver-stage18/`（簡易モード最終ビルド d2f2198）。アプリのソースは一切変更していない（読み取り専用）。
- ハーネス（CFN）：Node ESM 実走（`cfn-hook-conv.mjs`）。`js/types/cloudformation/index.js` の definition を読み、`loadAdvanced`＋`mergeCatalog` で実物の合成を再現し、検証用コピー `{...definition}` に `applyAdvancedEngine` を適用（既存テスト `muse-advanced-cfn-engine.test.js` と同方式、台帳は実物で構築）。simulate は `await d.simulate(code, structuredClone(definition.model.defaults))`、入力は JSON テンプレート文字列（特記なき場合）。基礎との比較は「notes を除いた結果オブジェクトの JSON 完全一致」で判定。
- ハーネス（REG）：ツリーごとに**別プロセス**で simulate（`reg-runner.mjs`＋共通入力 `reg-cases.json`）し、正規化オブジェクト（topError／notes／truncated／reasons／operations／パスごとの outputs{text,channel}・trace{line,text,category,kind} 全件・error・halt・signal・vars・model.variables・groups・facts・response・fragment）の **JSON 完全一致** で判定（経過時間キーのみ除外）。結果は `reg-conv.json`／`reg-stage18.json` に保存。
- 台帳の実測前提（全 CFN プローブ共通）：loader は loaded 7ファイル（advanced-manifest／reference-advanced-part1〜3／templates-advanced／glossary-advanced／advanced-engine）、missing=[]、failed=[]、referenceAdvanced=1,798件、templatesAdvanced=4本（cfn-adv-multi-resource／cfn-adv-fn-transform-loggroup／cfn-adv-handler-type-count／cfn-adv-handler-params-stage）。merged.reference=2,024件、mergeCatalog の problems=0件（空配列）。`buildResourceTypeLedger(merged)` の台帳サイズ=**1,798**、`LEDGER_SNAPSHOT_DATE`=`2026-11-16`。台帳収録：AWS::S3::Bucket／AWS::SQS::Queue／AWS::SNS::Topic／AWS::Logs::LogGroup／AWS::CloudFormation::WaitCondition／AWS::CloudFormation::WaitConditionHandle／AWS::CloudFormation::CustomResource は全て true、AWS::FakeService::Thing／`ＡWS::S3::Bucket`（全角）／`AWS::S3::Bucket `（末尾空白）は false。
- **総括：欠陥 0 件。** 前回欠陥 A8-8（全角 Type の注記漏れ）は統合ビルドで修正が効いていることを実測確認（CFN-B5）。前回欠陥 A8-9（cfn-adv-multi-resource の intro 是正）も是正後の intro と実挙動の一致を確認（CFN-16）。REG-02 の C `div` は裁定どおり両ツリー同一挙動（欠陥として扱わない）。REG-03 は基礎テンプレート全6本が完全一致し、差分なし（A5 是正の該当形は基礎テンプレートに含まれないことを補助実測で確認、§REG-03）。

---

## CFN-08（典型）台帳内 Type のみ → 注記ゼロ・基礎と同一

- 入力：`{"Resources":{"Bucket":{"Type":"AWS::S3::Bucket"},"Queue":{"Type":"AWS::SQS::Queue"}}}`
- 期待値：注記ゼロで基礎（フックなし）と同一結果。
- 実測：フック適用 simulate は error なし、notes プロパティなし、paths=1。notes を除いた結果は基礎と JSON 完全一致（true）。scan も notes プロパティなし、要素は基礎と完全一致。
- 判定：**合格**

## CFN-09（典型）未収録 `AWS::FakeService::Thing` → 注記あり・エラー化なし

- 入力：`{"Resources":{"Thing":{"Type":"AWS::FakeService::Thing"}}}`
- 期待値：注記が付き、文面が「台帳未収録＋2026-11-16 時点の台帳」を伝え、simulate は成功し注記以外は基礎と同一。
- 実測：error なし、paths=1、notes=1件。注記の実文（全文）：
> 注記：Resources の「Thing」の Type「AWS::FakeService::Thing」は、このアプリのリソースタイプ台帳に載っていません。台帳は 2026-11-16 時点の AWS 公式リソース仕様のスナップショットであり、それ以降に追加された新しいタイプなど、実在しても台帳に未収録の場合があります。これはエラーではなく、このタイプはこのアプリでは検証・参照の対象外であることを示す注記です。
notes を除いた結果は基礎と完全一致。scan でも要素は基礎と同一で、同じ注記が配列の `notes` プロパティに1件付いた（基礎 scan の notes はなし）。
- 判定：**合格**

## CFN-10（典型）`Custom::MyResource` → 注記なし

- 入力：`{"Resources":{"R":{"Type":"Custom::MyResource"}}}`
- 期待値：注記なし（Custom:: は対象外）。
- 実測：error なし、notes なし、paths=1、結果は基礎と完全一致（notes 除外でなく全体が一致）。
- 判定：**合格**

## CFN-11（典型）`AWS::CloudFormation::CustomResource` → 注記なし

- 入力：`{"Resources":{"R":{"Type":"AWS::CloudFormation::CustomResource"}}}`
- 期待値：注記なし（正規の例外。当該 Type 自体は台帳にも収録されていることを台帳照合で確認済み）。
- 実測：error なし、notes なし、paths=1、結果は基礎と完全一致。
- 判定：**合格**

## CFN-12（典型）同一未収録 Type の複数使用 → (論理名, Type) 組ごとに1回・重複なし

- 入力：(a) simulate：`{"Resources":{"First":{"Type":"AWS::FakeService::Thing"},"Second":{"Type":"AWS::FakeService::Thing"}}}`。(b) `findUnlistedResourceTypes` 直接照合：外側 Resources に First／Second、入れ子断片側 Resources に First（重複）＋Third。(c) 同じ (A, 同Type) を外側と入れ子で重複させた構造。
- 期待値：注記は (論理名, Type) 組ごとに1回ずつ、重複なし。
- 実測：(a) notes=2件（論理名 First／Second の各1件、文面は CFN-09 と同文で論理名のみ差替）。(b) 返値は First／Second／Third の3件ちょうど。(c) 返値は1件ちょうど。
- 判定：**合格**

## CFN-13（境界）再実行・再処理での冪等性

- 入力：CFN-09 と同じテンプレートを、同一フック済み definition で2回 simulate／2回 scan、二重に `applyAdvancedEngine` を適用した definition で simulate、初回結果の変換後断片（fragment）を JSON 化して再投入、共有モデルオブジェクトの再利用。
- 期待値：注記が増殖しない（冪等）。再実行で基礎状態が漏れない。
- 実測：run1／run2 とも notes=1件で結果全体が完全一致。二重適用でも notes=1件。再投入でも notes=1件。scan 2回とも notes=1件。共有モデル再利用でも各回 notes=1件。`definition.model.defaults` は実行前後で不変（JSON 比較で一致）。
- 判定：**合格**

## CFN-14（回帰）フック未適用（簡易相当）で CFN-09 と同一テンプレート → 基礎と完全同一

- 入力：CFN-09 と同じテンプレートを、フックを適用していない素の definition で simulate／scan。
- 期待値：基礎と完全に同一、注記もエラーも増えない（未適用時は基礎不変＝絶対条件）。
- 実測：error なし、notes なし、paths=1。scan の notes プロパティもなし。全プローブを通じてフック適用側も「notes を除けば基礎と JSON 完全一致」を毎回確認しており、基礎側の改変は検出されなかった。
- 判定：**合格**

## CFN-15（敵対的）`Type: "aws::s3::bucket"`（小文字）→ 注記は付かない

- 入力：`{"Resources":{"Bucket":{"Type":"aws::s3::bucket"}}}`
- 期待値：フックの注記は付かない（接頭辞は大小区別）。
- 実測：notes なし、error なし、結果は基礎と完全一致。`findUnlistedResourceTypes` 直接照合でも返値 []。全角修正（NFKC 形状判定）は小文字形には影響していない（NFKC で大文字化しないため従来どおり対象外）。
- 判定：**合格**

## CFN-16（典型）高度テンプレート `cfn-adv-multi-resource`

- 入力：merged.templates から取得した実テンプレート（Transform: AddMetadata、Bucket=S3／Queue=SQS／Topic=SNS）を simulate。
- 期待値：使用 Type はすべて台帳内で注記ゼロ。出力・trace がテンプレート解説と一致。特に A8-9 是正後の intro と実挙動（トップレベルに Metadata {Stage: dev} を追加）の一致。
- 実測：使用 Type 3種は全て台帳内、notes なし、error なし、paths=1。結果全体に `[object Object]`・`__set` の漏れなし。変換後断片は3リソースを保持し、トップレベルに `Metadata: {"Stage": "dev"}` が**追加**されている（trace にも「『fragment』の ['Metadata'] を {'Stage': 'dev'} にします」と明示）。intro の実文は「モデルのAddMetadataは、断片のトップレベルにMetadata（Stage: dev）を追加します。」であり、**是正後の intro と実挙動は一致**する（前回の「断片をそのまま返します」という不一致は解消）。
- 判定：**合格**（A8-9 の修正が統合ビルドで有効）

## CFN-17（典型）高度テンプレート `cfn-adv-fn-transform-loggroup`＋変換後断片の照合対象性

- 入力：(a) 実テンプレート（LogGroup の Properties 内 Fn::Transform／AddMetadata、Parameters Stage=test、対象外 Queue=SQS）。(b) 補助プローブ：入力は台帳内の S3 のみで、モデルマクロ AddFake が変換後断片の Resources へ `Injected: {"Type":"AWS::FakeService::Thing"}` を持ち込むテンプレート（`Transform: "AddFake"`、補助スクリプトは `cfn-hook-conv.mjs` 内）。
- 期待値：Fn::Transform の変換結果が解説どおり。変換後断片に現れる Type も台帳照合の対象。
- 実測：(a) notes なし、error なし。マクロへ渡された断片は解説どおり兄弟要素 `{LogGroupName: "practice-log", RetentionInDays: 7}` のみで、params は `{Stage: "test"}` の未評価渡し、変換後は Properties 内に `Metadata: {"Stage": "test"}` が付き、対象外の Queue は無変更で残存。内部表現の漏れなし。(b) 基礎では notes なしだが、フック適用では notes=1件が付き、実文は論理名「Injected」・Type「AWS::FakeService::Thing」を名指す CFN-09 と同文面。notes を除いた結果は基礎と完全一致。すなわち変換後断片も走査対象であることが統合ビルドでも保持されている。
- 判定：**合格**

## CFN-18（典型）高度テンプレート `cfn-adv-handler-type-count`／`cfn-adv-handler-params-stage`

- 入力：merged.templates から取得した実テンプレート2本を、モデル既定値（入力断片＝S3バケット1件、params Stage=test、transformId=AddMetadata）で simulate。
- 期待値：種別カウントと params のステージ名付与が解説どおりで、ステップ説明が実際の状態変化と一致。
- 実測：
- type-count：notes なし、error なし。出力は `Resources: 1`（print、line 10）。応答断片は `{"Resources":{"Bucket":{"Type":"AWS::S3::Bucket"}},"BucketCount":1}` で、intro「モデルの入力断片にはS3バケットが1件」「全体の件数とAWS::S3::Bucketの件数を数えて断片へ記録」と一致。trace は total 0→1、buckets 0→1、BucketCount 設定の各ステップを実状態どおりに述べる。
- params-stage：notes なし、error なし。出力は `Stage: test`（print、line 6）。応答断片は Bucket に `Metadata: {"Stage": "test", "TransformId": "AddMetadata"}` が付いた形で、intro「paramsのStageとtransformIdを全リソースのMetadataへ書き込む」「paramsにはStage: test」と一致（対象リソースは1件のみで、全件付与を妨げる要素なし）。
- 両本とも使用 Type は台帳内の AWS::S3::Bucket のみで注記ゼロ、notes を除いた結果は基礎と完全一致。
- 判定：**合格**

## CFN-B1（敵対的）`Type: 123`（数値）／`Type: [AWS::S3::Bucket]`（リスト）

- 入力：`{"Resources":{"R":{"Type":123}}}` および `{"Resources":{"R":{"Type":["AWS::S3::Bucket"]}}}`
- 期待値：フックが例外で落ちない。捏造した注記・誤った成功表示をしない。
- 実測：両形ともフック適用 simulate は例外なく完了し、error なし、notes なし、paths=1 で、結果は基礎と完全一致。`findUnlistedResourceTypes` 直接照合でも両形とも返値 []（文字列でない Type は対象外として安全に素通り）。
- 判定：**合格**

## CFN-B2（境界）Resources 節なし／`Resources: {}`

- 入力：`{}` および `{"Resources":{}}`
- 期待値：注記ゼロ、通常の結果、クラッシュしない。
- 実測：両形とも error なし、notes なし、paths=1、結果は基礎と完全一致。
- 判定：**合格**

## CFN-B3（境界）リソース200件（未収録 Type が相異なる50種）

- 入力：台帳内 Type（S3／SQS／SNS を循環）150件＋未収録 Type `AWS::Fake0::Thing`〜`AWS::Fake49::Thing` 各1件、計200リソースのテンプレート。
- 期待値：50種すべてに注記が付く。件数を理由に黙って打ち切らない。
- 実測：error なし、notes=**50件**、相異なる Type も50種全て。notes を除いた結果は基礎と完全一致（打ち切り・欠落なし）。
- 判定：**合格**

## CFN-B4（敵対的）`Type: "AWS::X::<script>alert(1)</script>"` — 注記テキスト生成まで

- 入力：`{"Resources":{"R":{"Type":"AWS::X::<script>alert(1)</script>"}}}`
- 期待値（本WSの範囲）：注記が生成され、Type 文字列が文面にそのまま含まれること（画面でのエスケープは実ブラウザ班の担当）。
- 実測：`findUnlistedResourceTypes` は `{logicalId: "R", type: "AWS::X::<script>alert(1)</script>"}` を1件返し、生成された注記文面は当該文字列を原文のまま含む（simulate 経由でも同文面の notes=1件）。注記生成自体は例外なく完了。
- 判定：**合格（注記テキスト生成の範囲）**。画面表示時のエスケープ成否は本WSでは判定しない。

## CFN-B5（敵対的）末尾空白形／全角形

- 入力：(a) `{"Resources":{"R":{"Type":"AWS::S3::Bucket "}}}`（末尾空白）。(b) `{"Resources":{"R":{"Type":"ＡWS::S3::Bucket"}}}`（先頭の A が全角）。
- 期待値：完全一致しないため両形とも台帳外として注記が付く。台帳照合・注記文面は原文のまま（正規化した名前で台帳に一致して注記が消えないこと）。
- 実測：
- (a) 末尾空白形：台帳照合は原文・NFKC 形とも false。notes=1件、文面は末尾空白を含む原文 `AWS::S3::Bucket ` のまま。notes を除いた結果は基礎と完全一致。
- (b) 全角形：台帳照合は原文では false、NFKC 正規化形（`AWS::S3::Bucket`）では true になるが、**notes=1件が付いた**。注記の実文（全文）：
> 注記：Resources の「R」の Type「ＡWS::S3::Bucket」は、このアプリのリソースタイプ台帳に載っていません。台帳は 2026-11-16 時点の AWS 公式リソース仕様のスナップショットであり、それ以降に追加された新しいタイプなど、実在しても台帳に未収録の場合があります。これはエラーではなく、このタイプはこのアプリでは検証・参照の対象外であることを示す注記です。
文面中の Type は全角の原文のまま（`ＡWS::S3::Bucket`）。`findUnlistedResourceTypes` 直接照合でも `{logicalId: "R", type: "ＡWS::S3::Bucket"}` を返す。notes を除いた結果は基礎と完全一致。
- 判定：**合格**（A8-8 の修正＝NFKC 形状判定の追加が統合ビルドで有効。全角形に注記が付き、台帳照合・文面は原文のまま）

## CFN-B6（敵対的）自分自身を参照する循環断片

- 入力：(a) `findUnlistedResourceTypes` へ、自己参照（`circ.self = circ`、リソース内にも循環）を含むオブジェクト `{Resources:{R:{Type:"AWS::FakeService::Thing"}}, self:…}` を直接投入。(b) ハンドラ形 simulate：`model.event.fragment` に自己参照プロパティを持つ断片（Resources に未収録 Type を含む）を入れ、そのまま返すハンドラを実行（補助スクリプト `cfn-b6-base-supplement.mjs` で基礎側も同条件実行）。
- 期待値：フックが無限走査で固まらず、基礎エンジン側の扱いに委ねられる（ハングは不合格）。
- 実測：(a) ハングせず `{logicalId: "R", type: "AWS::FakeService::Thing"}` の1件を返して即時完了（祖先集合で循環を守る実装どおり）。(b) フック適用・基礎とも simulate は paths=0 で同一のエラー（`{line: 1, message: "処理中に予期しないエラーが発生しました", category: "エラー"}`）を返して完了し、ハングはなかった。フック適用側には未収録 Type の注記1件が付いた。すなわち循環入力の成否は基礎エンジン側の扱いに委ねられ、フックは走査で固まらない。
- 判定：**合格**

## CFN-B7（境界）類似名：WaitCondition と WaitConditionHandle の区別

- 入力：合成カタログ（merged.reference）から `AWS::CloudFormation::WaitCondition` と `AWS::CloudFormation::WaitConditionHandle` の両項目を抽出し、台帳収録と説明文を照合。
- 期待値：両方とも台帳に実在し、説明が別種別として正しく区別されている。WaitConditionHandle 側は CFN-03 の0件説明と一致。
- 実測：台帳には両方とも収録（true）。説明文は別々に実在する：
- WaitCondition：「AWS::CloudFormation::WaitCondition を作成するリソースタイプです。主要プロパティはCount、Handle、Timeoutです（プロパティは全3件）。」
- WaitConditionHandle：「AWS::CloudFormation::WaitConditionHandle を作成するリソースタイプです。このリソースタイプにはプロパティがありません。」（0件説明と一致）
片方への統合・取り違えはなし。使用例も各項目名自身と一致。
- 判定：**合格**

---

## REG-01：C printf 形と NaN 表示（対照突合）

- 入力：C ラッパ（`#include <stdio.h>`／`<stdlib.h>`／`<string.h>`／`<math.h>`＋`int main() { <本文> return 0;}`）で前回所見の19件（d-single／d-neg-nl／s-basic／multi-nl／f-basic／f-dot1／mixed-dsf／mixed-fd／c-char／i-form／percent／u-form／nan-var／nan-direct／inf-pos／inf-neg／inf-var／width-form／ld-form）を両ツリーで実行。
- 期待値：対照ツリーと正規化 JSON 完全一致。NaN 表示は `nan`（RG-04）。
- 実測：**19件すべて完全一致**（差分0件）。NaN は両ツリーとも nan-var／nan-direct の出力が `nan`。受理書式の範囲も両ツリー同一（`%.1f`／`%5d`／`%ld` は両ツリーとも未対応停止で一致）。
- 判定：**合格（回帰なし）**

## REG-02：C `div`／文字列関数群（対照突合）

- 入力：REG-01 と同じラッパで前回所見の14件（div-decl／div-direct／div-neg／ldiv-direct／strcmp-lit-neg／strcmp-eq／strcmp-arr／strncmp／strlen／strchr／strrchr／strstr／strstr-null／strcpy-pipe）を両ツリーで実行。
- 期待値（今回の裁定）：probes.md の「div(10,3) で quot=3/rem=1」は両ツリーとも未達であり、C の div は未対応開示・`std::div` が正値を返すのが基礎からの仕様（回帰ではない）。今回は**対象ツリーと対照ツリーで同一挙動**であることの確認に留め、欠陥として扱わない。
- 実測：**14件すべて完全一致**（差分0件）。両ツリーとも簡易（基礎）では div／文字列関数は意味論を持たず同文言で停止する。実測例（両ツリー共通）：div-decl はパス0件で topError「この構文は説明に対応していません：型 div_t の宣言は未対応です」（@L6、カテゴリ「未対応」）、div-direct はパス内エラー「この関数は説明に対応していません：div」（@L6、カテゴリ「エラー」）、strcmp／strlen 等も同型の停止で一致。
- 判定：**合格（同一挙動を確認。裁定どおり欠陥として扱わない）**

## REG-03：C# 基礎テンプレート全6本（対照突合）

- 入力：両ツリーの csharp definition の基礎テンプレート全6本（csharp-array／cs-object／csharp-error／csharp-price／csharp-positive-total／cs-shared-total）を各ツリー自身のコードで実行し、正規化 JSON を照合。
- 期待値：全本一致。ただし A5 是正（C# の整数除算 −0 表示）が基礎テンプレートの該当形に及ぶ場合は、対照との差分として現れる可能性があり、その場合は差分内容を実測記録し A5 是正の意図どおりかを文面で判定する（黙って一致扱いにしない）。
- 実測：**6本すべて完全一致（差分0件）**。テンプレートのコード文字列自体も全6本が両ツリーでバイト一致。出力は csharp-array=`6`、cs-object=`5`、csharp-error=出力なし（パス内エラーで停止、両ツリー同一）、csharp-price=`360`、csharp-positive-total=`11`、cs-shared-total=`15` で全て一致。
- 差分の有無の内訳確認：6本のコードには除算（`/`）自体が1件も含まれないため、A5 是正の該当形（整数除算で −0 が出る形）は基礎テンプレートには存在せず、差分が出ないことは是正の未適用ではなく「該当形なし」によるものである。
- 補助実測（テンプレート外、A5 是正自体の効きの確認。補助スクリプト `reg03-a5-supplement.mjs`、両ツリーで同入力）：
- `int x = 0 / -5; Console.WriteLine(x);` → 対照ツリーは出力 `-0`、対象ツリーは出力 `0`。**A5 是正の意図どおりの差**（整数除算の −0 表示が 0 に是正されている）。
- `double y = 0.0 / -5; Console.WriteLine(y);` → 両ツリーとも `-0`（浮動小数の −0 は是正対象外で不変）。
- `int z = -7 / 2; Console.WriteLine(z);` → 両ツリーとも `-3`（通常の整数除算は不変）。
- 判定：**合格（回帰なし。基礎テンプレートに A5 該当形はなく全本一致。A5 是正自体は補助実測で意図どおりに効いていることを確認）**

## REG-05：単一エンジン原則（簡易／高度の実行一致）

- 手順（`reg05-conv.mjs`）：C++ は対象ツリーの基礎 definition のまま simulate した結果と、高度モード相当（`loadAdvanced`→`mergeCatalog` で合成カタログを装着。cpp の engineModule は null＝意味論は核内蔵のため simulate 自体は同一関数）で simulate した結果を、正規化 JSON（経過時間キーのみ除外）で突合。CFN は簡易＝フック未適用、高度＝`applyAdvancedEngine` 適用で突合。
- カタログ装着の実測：C++ は基礎 reference 33件→合成 4,948件、templates 6本→14本、loaded 11ファイル、missing／failed なし、merge problems 0、engineModule なし。CFN は基礎 reference 226件→合成 2,024件、台帳1,798件。
- 実測（C++）：

| プローブ | 簡易の実測 | 高度の実測 | 判定 |
|---|---|---|---|
| CPP-01（sort＋binary_search） | 出力 `1 2 3 5 8 9 `＋`10`（真=1／偽=0 を連結）、trace 16ステップ、最終 vars `{v:[1,2,3,5,8,9]}`、エラーなし | 簡易と**完全一致** | 一致（期待値 1 2 3 5 8 9／真／偽とも合致） |
| CPP-04（string find／rfind／substr／npos） | 出力 `2 4 ana 1`、trace 3ステップ、最終 vars `{s:"banana"}`、エラーなし | 簡易と**完全一致** | 一致（期待値 2／4／"ana"／真とも合致） |

- 実測（CFN）：

| 対象 | 簡易（フック未適用） | 高度（フック適用） | 判定 |
|---|---|---|---|
| fake（JSON） | notes なし、エラーなし | notes 1件（文面は CFN-09 と同一）。**notes を除いた正規化オブジェクトは簡易と完全一致** | 設計どおり（注記のみ差分） |
| fake（YAML 形） | notes なし | notes 1件（同文面）。notes 除外で簡易と完全一致 | 設計どおり |
| fake 再実行 | — | 2回目も notes 1件で結果全体が1回目と完全一致（冪等） | 設計どおり |
| bucket（台帳内） | notes なし | notes なし。**全体が簡易と完全一致** | 誤注記なし |
| custom（例外2種） | notes なし | notes なし、エラーなし | 例外が正しく除外 |
| scan（fake） | 要素は基礎どおり、notes プロパティなし | 要素は基礎と同一、配列に notes 1件を付属 | 要素不変＋注記付属は設計どおり |

- 判定：**合格**（出力・trace・最終状態・停止理由は両モードで一致。CFN は注記のみ差分で設計どおり）

---

## まとめ

| プローブ | 判定 |
|---|---|
| CFN-08〜15（8件） | 全て合格（注記ゼロ／注記文面／例外／重複除去／冪等／基礎不変／大小区別） |
| CFN-16 | 合格（A8-9 是正後の intro と実挙動＝Metadata {Stage: dev} 追加が一致） |
| CFN-17 | 合格（変換結果は解説どおり、変換後断片も照合対象） |
| CFN-18（2本） | 合格（カウント／ステージ名付与とも解説・ステップ説明と一致、注記ゼロ） |
| CFN-B1（2形）／B2（2形）／B3 | 合格（例外なし・打ち切りなし、B3 は50種全てに注記） |
| CFN-B4 | 合格（注記テキスト生成の範囲。画面エスケープは実ブラウザ班） |
| CFN-B5（2形） | 合格（A8-8 是正が有効：全角形にも原文のまま注記） |
| CFN-B6 | 合格（ハングなし、基礎側の扱いに委ねられる） |
| CFN-B7 | 合格（両種別が別説明で区別、Handle は0件説明と一致） |
| REG-01（19件） | 合格：全件対照と完全一致、NaN=`nan`（RG-04）維持 |
| REG-02（14件） | 合格：全件対照と完全一致（div は裁定どおり同一挙動の確認に留め、欠陥としない） |
| REG-03（6本） | 合格：全本完全一致（コード自体も一致）。A5 該当形は基礎テンプレートに無し。補助実測で A5 是正（整数除算 −0→0）は意図どおり有効、浮動小数 −0 と通常除算は不変 |
| REG-05 | 合格：CPP-01／CPP-04 はモード間で完全一致。CFN は注記のみ差分（文面・冪等・例外・scan とも設計どおり） |

**欠陥：0件。** 前回欠陥 A8-8・A8-9 はいずれも統合ビルド（4771801）で修正が効いていることを実測で確認した。未確認として残す差異：なし。

## 使用スクリプト（同ディレクトリに保存）

- `cfn-hook-conv.mjs` — CFN-08〜18、CFN-B1〜B7 の実走（出力 `cfn-results.json`）
- `cfn-b6-base-supplement.mjs` — CFN-B6 の基礎側同条件実行＋CFN-18 応答断片の抽出
- `reg-runner.mjs`＋`reg-cases.json` — REG-01／02／03 のツリー別プロセス実走（出力 `reg-conv.json`／`reg-stage18.json`）
- `reg03-a5-supplement.mjs` — REG-03 補助実測（C# 整数除算 −0 の両ツリー比較）
- `reg05-conv.mjs` — REG-05 の実走（出力 `reg05-results.json`）
