# WS-CFN-HOOK findings — CloudFormation 高度フック（台帳外 Type 注記）独立照合

- 担当範囲：CFN-08〜15、CFN-16〜18、CFN-B1〜B3、CFN-B5〜B7（CFN-19 の画面可視化と CFN-B4 の画面エスケープは実ブラウザ班担当。本書は注記テキスト生成まで）
- 対象ツリー：`~/workspace/programming-practice-audit/work/lane-a8-exec/`（repo-reffix @ 04dfe2d のコピー）。アプリのソースは変更していない（読み取り専用で実施）。
- 実施方法：Node ESM 実走。`import { definition } from "js/types/cloudformation/index.js"` し、`js/core/advanced-loader.js` の `loadAdvanced(definition)`（manifest 経由で part1〜3・templates・glossary・engine を実読み込み）＋ `js/core/catalog.js` の `mergeCatalog` で実物の merged を再現し、検証用コピー `{...definition}` に `applyAdvancedEngine` を適用（既存テスト `tests/muse-advanced-cfn-engine.test.js` と同方式、ただし台帳はテスト用3件ではなく実物で構築）。
- 台帳の実測前提（全プローブ共通の根拠）：
  - loader：loaded = advanced-manifest.js / reference-advanced-part1.js / part2.js / part3.js / templates-advanced.js / glossary-advanced.js / advanced-engine.js、missing = []、failed = []、referenceAdvanced = 1,798件、templatesAdvanced = 4本。
  - merged.reference 総数 = 2,024件、mergeCatalog の problems = 0件。
  - `buildResourceTypeLedger(merged)` の台帳サイズ = **1,798**、`LEDGER_SNAPSHOT_DATE` = `2026-11-16`。台帳収録を確認：AWS::S3::Bucket / AWS::SQS::Queue / AWS::SNS::Topic / AWS::Logs::LogGroup / AWS::CloudFormation::WaitCondition / AWS::CloudFormation::WaitConditionHandle / AWS::CloudFormation::CustomResource は全て true、AWS::FakeService::Thing は false。
  - simulate は `await d.simulate(code, structuredClone(definition.model.defaults))`、入力は JSON テンプレート文字列（特記なき場合）。
- 判定線（U-44）：注記の付け忘れ・誤注記・重複・増殖、注記のエラー化、ハング、捏造は欠陥。フック未適用時の基礎不変は絶対条件。
- **総括：欠陥2件**（CFN-B5 の全角サブケース＝注記付け忘れ、CFN-16 の解説文と実出力の軽微な不一致）。それ以外のプローブは全て合格。フック未適用時の基礎不変は全プローブで保持された。

---

## CFN-08（典型）台帳内 Type のみ → 注記ゼロ・基礎と同一

- 入力：`{"Resources":{"Bucket":{"Type":"AWS::S3::Bucket"},"Queue":{"Type":"AWS::SQS::Queue"}}}`
- 期待値と根拠：注記ゼロで基礎（フックなし）と同一結果（フック設計「誤注記なし」）。
- 実測：フック適用 simulate は error=undefined、notes=undefined（プロパティ自体なし）、paths=1、fragment は入力と同一。notes を除いた結果オブジェクトは基礎と JSON 完全一致（true）。scan も notes プロパティなし。
- 判定：**合格**

## CFN-09（典型）未収録 `AWS::FakeService::Thing` → 注記あり・エラー化なし

- 入力：`{"Resources":{"Thing":{"Type":"AWS::FakeService::Thing"}}}`
- 期待値と根拠：注記が付き、文面が「台帳未収録＋2026-11-16 時点の台帳」を正しく伝え、simulate は成功しパス・結果は注記以外基礎と同一（フック設計＋U-45）。
- 実測：error=undefined、paths=1、notes=1件。注記の実文（全文）：
  > 注記：Resources の「Thing」の Type「AWS::FakeService::Thing」は、このアプリのリソースタイプ台帳に載っていません。台帳は 2026-11-16 時点の AWS 公式リソース仕様のスナップショットであり、それ以降に追加された新しいタイプなど、実在しても台帳に未収録の場合があります。これはエラーではなく、このタイプはこのアプリでは検証・参照の対象外であることを示す注記です。
  文面は論理名・Type・「台帳に載っていません」・日付 2026-11-16・「エラーではなく…検証・参照の対象外」を全て含む。notes を除いた結果は基礎と完全一致。scan でも要素は基礎と同一で、同じ注記が配列の `notes` プロパティに1件付いた（基礎 scan の notes は undefined）。
- 判定：**合格**

## CFN-10（典型）`Custom::MyResource` → 注記なし

- 入力：`{"Resources":{"R":{"Type":"Custom::MyResource"}}}`
- 期待値と根拠：注記なし（フック設計：Custom:: は対象外）。
- 実測：error=undefined、notes=undefined、paths=1、結果は基礎と完全一致。
- 判定：**合格**

## CFN-11（典型）`AWS::CloudFormation::CustomResource` → 注記なし

- 入力：`{"Resources":{"R":{"Type":"AWS::CloudFormation::CustomResource"}}}`
- 期待値と根拠：注記なし（フック設計：正規の例外。なお当該 Type 自体は台帳にも収録されていることを台帳照合で確認済みだが、例外集合による除外と二重に安全側）。
- 実測：error=undefined、notes=undefined、paths=1、結果は基礎と完全一致。
- 判定：**合格**

## CFN-12（典型）同一未収録 Type の複数使用 → (論理名, Type) 組ごとに1回・重複なし

- 入力：(a) simulate：`{"Resources":{"First":{"Type":"AWS::FakeService::Thing"},"Second":{"Type":"AWS::FakeService::Thing"}}}`（変換後パス断片にも同じ2件が再び現れる形）。(b) `findUnlistedResourceTypes` 直接照合：外側 Resources に First／Second、入れ子の断片側 Resources に First（重複）＋Third を置いた構造。(c) 同じ (A, 同Type) を外側と入れ子で重複させた構造。
- 期待値と根拠：注記は (論理名, Type) 組ごとに1回ずつ、重複注記なし（フック設計の重複除去）。
- 実測：(a) notes=2件で、実文は CFN-09 と同文面で論理名だけが「First」「Second」に変わったものが各1件。パス断片経由の再出現で増えていない。(b) 返値は First／Second／Third の3件ちょうど（重複した First は1件に抑制）。(c) 返値は1件ちょうど。
- 判定：**合格**

## CFN-13（境界）再実行・再処理での冪等性

- 入力：CFN-09 と同じテンプレートを、同一フック済み definition で2回 simulate／2回 scan、二重に `applyAdvancedEngine` を適用した definition で simulate、初回結果の変換後断片（fragment）を JSON 化して新たなテンプレートとして再投入（再処理）。
- 期待値と根拠：注記が増殖しない（冪等）。再実行で基礎状態が漏れない（フック設計＋C-14）。
- 実測：run1／run2 とも notes=1件で notes・結果全体が完全一致。二重適用でも notes=1件。再投入でも notes=1件（2件に増えない）。scan 2回とも notes=1件。共有モデルを再利用しても各回 notes=1件で、`definition.model.defaults` は実行前後で不変（structuredClone 比較で一致）。
- 判定：**合格**

## CFN-14（回帰）フック未適用（簡易相当）で CFN-09 と同一テンプレート → 基礎と完全同一

- 入力：CFN-09 と同じ `AWS::FakeService::Thing` テンプレートを、フックを適用していない素の `definition` で simulate／scan。
- 期待値と根拠：基礎と完全に同一、注記もエラーも増えない（未適用時は基礎不変＝絶対条件）。
- 実測：error=undefined、notes=undefined、paths=1。scan の notes プロパティも undefined。全プローブを通じて、フック適用側も「notes を除けば基礎と JSON 完全一致」を毎回確認しており、基礎側の改変は検出されなかった。
- 判定：**合格**

## CFN-15（敵対的）`Type: "aws::s3::bucket"`（小文字）→ 注記は付かない

- 入力：`{"Resources":{"Bucket":{"Type":"aws::s3::bucket"}}}`
- 期待値と根拠：フックの注記は付かない（接頭辞は大小区別、isResourceTypeName の大小区別）。基礎エンジン側の扱いのみ。
- 実測：notes=undefined、error=undefined、結果は基礎と完全一致。`findUnlistedResourceTypes` 直接照合でも返値 []（小文字接頭辞はリソースタイプ名として認識されない）。
- 判定：**合格**

## CFN-16（典型）高度テンプレート `cfn-adv-multi-resource`

- 入力：merged.templates から取得した実テンプレート（Transform: AddMetadata、Bucket=S3／Queue=SQS／Topic=SNS）を simulate。
- 期待値と根拠：使用 Type は全て台帳内で注記ゼロ、出力・trace がテンプレート解説と一致し、内部表現の漏れが無い（台帳＋テンプレート解説、D-07／T-01）。
- 実測（注記・Type 面は合格）：使用 Type 3種（AWS::S3::Bucket／AWS::SQS::Queue／AWS::SNS::Topic）は全て台帳内、notes=undefined、error=undefined、paths=1。結果全体に `[object Object]`・`__set` の漏れなし、trace に内部表現の漏れなし。変換後断片は3リソースを保持。
- 実測（解説一致で1点不一致）：intro の実文は「モデルのAddMetadataは断片をそのまま返します。」だが、実際の変換後断片にはトップレベルへ `Metadata: {"Stage": "dev"}` が**追加**されている（trace にも「『fragment』の ['Metadata'] を {'Stage': 'dev'} にします」と明示される。基礎の AddMetadata ハンドラ＝identity は params の Stage（トップレベルでは空のため既定 dev）を Metadata として書き込む実装であり、「そのまま返す」は実挙動と矛盾する）。リソース本体・プロパティは無変更であり、差分はこの Metadata 追加のみ。
- 判定：**注記／台帳照合は合格。ただし解説文（intro）の「断片をそのまま返します」は実出力と一致しない軽微な欠陥**（学習者が変換結果を見て解説と食い違う箇所。フック自体の欠陥ではなくテンプレート解説側）。

## CFN-17（典型）高度テンプレート `cfn-adv-fn-transform-loggroup`＋変換後断片の照合対象性

- 入力：(a) 実テンプレート（LogGroup の Properties 内 Fn::Transform／AddMetadata、Parameters Stage=test、対象外 Queue=SQS）。(b) 補助プローブ：入力は台帳内の S3 のみで、モデルマクロ AddFake が変換後断片へ `Injected: {"Type":"AWS::FakeService::Thing"}` を持ち込むテンプレート（`Transform: "AddFake"`）。
- 期待値と根拠：Fn::Transform の変換結果が解説どおり。変換後断片に現れる Type も台帳照合の対象（フック設計：断片も走査対象）。
- 実測：(a) notes=undefined、error=undefined。マクロへ渡された断片は解説どおり兄弟要素 `{LogGroupName: "practice-log", RetentionInDays: 7}` のみで、params は `{Stage: "test"}` の未評価渡し、変換後は Properties 内に `Metadata: {"Stage": "test"}` が付き、対象外の Queue は無変更で残存。trace・groups の「入力／変換後」表示もこれと一致し、内部表現の漏れなし。(b) 基礎では notes なしで断片に Injected が現れるだけだが、フック適用では notes=1件が付き、実文は論理名「Injected」・Type「AWS::FakeService::Thing」を名指す CFN-09 と同文面だった。対照（何も持ち込まない AddMetadata）では notes=undefined。すなわち入力テンプレートだけ
...[truncated 7222 chars]