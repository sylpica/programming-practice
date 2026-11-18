# WS-DATA-CFN findings — CloudFormation カタログ データ突合（CFN-01〜07）

- 担当：高度A8班 WS-DATA-CFN（独立実施。アプリのソースは読み取り専用で一切変更していない）
- 対象ツリー：`~/workspace/programming-practice-audit/work/lane-a8-exec/`（repo-reffix @ 04dfe2d のコピー）
- 正本：`~/workspace/programming-practice-audit/work/b8-data/cfn-spec.json`（AWS Resource Specification。ファイル内 `ResourceSpecificationVersion` = **272.0.0** を実測確認。`ResourceTypes` 2,111件／`PropertyTypes` 10,627件）
- 検証対象の主張：B8報告書 `work/adv-b8/docs/audit/MUSE-B8-ADVANCED.md`（CFN 1,798件全件 supported、うち1,786件は仕様JSON 272.0.0と照合済み、残り12件 docsOnly）
- 実施日：2026-11-18

## 共通の入力・手順（全プローブ）

アプリの合成方法を忠実に再現した（独自の近似合成はしていない）：

1. `js/types/cloudformation/index.js` の `definition`（基礎カタログ。reference 全226件）を読み込む。
2. `js/core/advanced-loader.js` の `loadAdvanced(definition)` で高度差分を読み込む。実測：loaded = advanced-manifest.js／reference-advanced-part1〜3.js／templates-advanced.js／glossary-advanced.js／advanced-engine.js、missing = なし、failed = なし、referenceAdvanced = **1,798件**、templatesAdvanced = 4件。
3. `js/core/catalog.js` の `mergeCatalog(base, advanced)` で合成。実測：merged.reference = **2,024件**（基礎226＋高度1,798）、`problems` = **0件**（duplicate-name／status-missing 等なし）。
4. 以後の「合成カタログ」「カタログ順」は、この合成結果から名前が `AWS::`／`Alexa::` で始まる項目を抽出した列（＝高度1,798件と一致。基礎 reference に `AWS::`／`Alexa::` 名は0件、下記 CFN-05）を指す。
5. 等間隔抽出の定義：カタログ順（合成順）の総数 N に対し、インデックス `floor(i×N/k)`（i=0..k-1）を取る決定的抽出。再現可能。
6. 説明文パーサ：説明文には2つの dialect が実在したため両対応で機械抽出した。
   - dialect A（part1／part3 系、1,196件）：「主要プロパティは[必須の] A、B、[ほかに C、D] [など]です（プロパティは全N件）」
   - dialect B（part2 系、598件）：「主要プロパティは A（必須）、B、…[など]（全N個）です」
   - 0件文（3件）：「このリソースタイプにはプロパティがありません。」
   - 上記いずれにも一致しないもの：1件（CFN-03 の AWS::ApplicationSignals::Discovery）
   dialect の混在自体は表記ゆれの観察事項として記録する（両 dialect とも記載内容の真偽は下記のとおり全件照合済みで、混在そのものは欠陥としていない）。

## 判定サマリ

| プローブ | 判定 | 要点 |
|---|---|---|
| CFN-01 | 合格 | 総数1,798・重複0・仕様実在1,786・差分docsOnly 12件ちょうど・Alexa 1件。全て期待値どおり。逆方向（仕様→カタログ）に325件の未収載がある点は観察事項として記録（§CFN-01-補足） |
| CFN-02 | 合格 | サンプル31件（等間隔30＋必須EIP）全件一致。EIP は期待どおり。全件補足照合（1,786件）でも列挙実在・総数・必須表示に誤りなし |
| CFN-03 | **欠陥（軽微・文面）1件** | AWS::ApplicationSignals::Discovery の0件文が他3件と異なる文面。内容（0件であること）は仕様と一致し、例の捏造もなし |
| CFN-04 | 合格（本工程範囲） | 対象2件のカタログ主張を正確に抽出。仕様JSONに存在しないことを確認。公式ドキュメント照合は親工程（本書の抽出文が照合材料） |
| CFN-05 | 合格（データ面） | 高度合成で1,798件全件 status=supported。基礎のみに高度項目は存在せず、簡易への漏れなし（データ面）。画面表示の実測は他担当（CFN-19等） |
| CFN-06 | 合格 | 指定25件全件が検索述語で自項目に到達。補足の全件照合でも到達不能0件 |
| CFN-07 | 合格 | サンプル50件＋高度テンプレート4本の全 Type を照合し、全て一致。補足の全件照合（1,798例）でも問題0件 |

欠陥は **1件（軽微・文面不統一）** のみ。詳細は各節と末尾の欠陥一覧を参照。

---

## CFN-01（名前集合の突合）

### 入力・手順
合成カタログの `AWS::`／`Alexa::` 名集合（1,798名）を機械抽出し、正本の `ResourceTypes` 名集合（2,111名）および plan.md 冒頭の docsOnly 12件と突合した。全名の突合結果は台帳 `ledger-cfn-names.tsv`（1,798行＋ヘッダ）に残した。

### 期待値と根拠
総数1,798、重複ゼロ、仕様JSONに実在1,786、差分は docsOnly 12件ちょうど（DeviceFarm 6／GameLiftStreams 2／IoTManagedIntegrations 3／SageMaker 1）、Alexa:: は Alexa::ASK::Skill の1件のみ（probes.md CFN-01、正本 272.0.0）。

### 実測
- 総数：**1,798**（期待どおり）
- 重複：**0件**（合成カタログ内での同名重複なし。mergeCatalog の problems も0件）
- 仕様JSONに実在：**1,786件**（期待どおり）
- カタログにあって仕様JSONに無いもの：**12件**で、docsOnly 12件と集合として完全一致（過不足なし）。全件列挙：
  AWS::DeviceFarm::DevicePool、AWS::DeviceFarm::InstanceProfile、AWS::DeviceFarm::NetworkProfile、AWS::DeviceFarm::Project、AWS::DeviceFarm::TestGridProject、AWS::DeviceFarm::VPCEConfiguration、AWS::GameLiftStreams::Application、AWS::GameLiftStreams::StreamGroup、AWS::IoTManagedIntegrations::CredentialLocker、AWS::IoTManagedIntegrations::ManagedThing、AWS::IoTManagedIntegrations::ProvisioningProfile、AWS::SageMaker::ExperimentTrialComponent
- Alexa:: ：**Alexa::ASK::Skill の1件のみ**（期待どおり。同名は仕様JSONにも実在）
- 補足照合：カタログ集合は B8 作業台帳 `cfn-types.json`（1,798件）および `cfn-work.json`（1,798件）の名集合と完全一致した（カタログの収載範囲＝B8 のドキュメント採取ワークリストどおりであることの裏付け）。

### CFN-01-補足（逆方向の差分：観察事項・裁定送り）
仕様JSON（272.0.0）にあってカタログに無い ResourceTypes が **325件** 実在した（2,111 − 1,786）。全件は台帳 `ledger-cfn-spec-extra.tsv`（325行＋ヘッダ）および本書付録Aに残した。
- 性質の観察：Job／Execution／Task／Session 等の実行・ジョブ系（例：AWS::MediaConvert::Job、AWS::Transcribe::TranscriptionJob、AWS::States::Execution、AWS::ECS::Task、AWS::SageMaker::TrainingJob）や、レガシー系（AWS::OpsWorks::*、AWS::Inspector::* 等）が多くを占める。カタログの収載範囲は B8 申告どおり「公式ドキュメント掲載種別」（ワークリスト1,798件と完全一致）であり、「仕様JSONの全種別を収載する」という主張はアプリ・B8報告書のいずれにも無い。
- 本プローブの期待値（カタログ側の件数・差分）は全て満たすため、本件は欠陥として起票しない。ただし「272.0.0 の集合との差分が docsOnly 12件ちょうど」という plan.md §2-5 の文言を双方向の意味に読む場合は325件が差分となるため、解釈の裁定事項として親工程へ送る。

### 判定
**合格**（期待値は全て一致。逆方向差分325件は観察事項として全件記録し裁定送り）

---

## CFN-02（プロパティ要約の照合）

### 入力・手順
カタログ順に等間隔30件（インデックス floor(i×1798/30)）を抽出し、必須指定の AWS::EC2::EIP を加えた31件について、説明文の列挙プロパティ名と総数Nを機械抽出し、正本の `Properties` キー集合と照合した（列挙名の実在、N＝仕様のプロパティ総数、「など」無し＝列挙が全集合と一致すること）。あわせて補足として同一照合を仕様実在の全1,786件に拡張し、必須表示（dialect A の「必須の…」／dialect B の「（必須）」）についても「必須でないものを必須と表示していないか（部分集合）」「列挙が完全な場合は必須集合と一致するか」を照合した。全件結果は台帳 `ledger-cfn-desc.tsv`。

### 期待値と根拠
列挙名は全て仕様の Properties キーに実在し、N は仕様のプロパティ総数と一致。EIP は列挙＝Address／Domain／InstanceId／IpamPoolId／NetworkBorderGroup／PublicIpv4Pool など、全8件（probes.md CFN-02、正本 272.0.0）。

### 実測
サンプル31件は **全件 problems なし**。内訳（名前／dialect／説明の総数＝仕様の総数／列挙数／など有無）：
AWS::EC2::ApplicationStatusCheck（A／15＝15／6／あり）、AWS::EC2::RouteServer（A／5＝5／5／なし）、AWS::EC2::VPNGatewayRoutePropagation（A／2＝2／2／なし）、AWS::Lambda::Version（A／6＝6／6／なし）、AWS::MediaLive::InputSecurityGroup（A／2＝2／2／なし）、AWS::CustomerProfiles::EventStream（A／4＝4／4／なし）、AWS::OpenSearchServerless::CollectionGroup（A／6＝6／6／なし）、AWS::WAF::IPSet（A／2＝2／2／なし）、AWS::S3Tables::Table（A／10＝10／6／あり）、AWS::DevOpsGuru::LogAnomalyDetectionIntegration（0件文／0＝0／0／−）、Alexa::ASK::Skill（A／3＝3／3／なし）、AWS::Glue::IdentityCenterConfiguration（B／3＝3／3／なし）、AWS::ApiGateway::RestApi（B／18＝18／6／あり）、AWS::DataZone::ProjectProfile（B／10＝10／6／あり）、AWS::VpcLattice::Service（B／7＝7／6／あり）、AWS::DMS::Endpoint（B／31＝31／6／あり）、AWS::Personalize::Dataset（B／6＝6／6／なし）、AWS::AutoScaling::AutoScalingGroup（B／37＝37／6／あり）、AWS::ServiceDiscovery::HttpNamespace（B／3＝3／3／なし）、AWS::DAX::SubnetGroup（B／3＝3／3／なし）、AWS::VoiceID::Domain（B／4＝4／4／なし）、AWS::IoT::ResourceSpecificLogging（A／3＝3／3／なし）、AWS::Bedrock::ResourcePolicy（A／2＝2／2／なし）、AWS::Cognito::UserPoolUICustomizationAttachment（A／3＝3／3／なし）、AWS::MediaConnect::FlowVpcInterface（A／6＝6／6／なし）、AWS::Config::ConformancePack（A／8＝8／6／あり）、AWS::Omics::RunCache（A／6＝6／6／なし）、AWS::Route53GlobalResolver::DnsView（A／8＝8／6／あり）、AWS::VerifiedPermissions::Policy（A／3＝3／3／なし）、AWS::Detective::MemberInvitation（A／5＝5／5／なし）、AWS::EC2::EIP（A／8＝8／6／あり）。

- **EIP（必須確認）**：説明の列挙は Address、Domain、InstanceId、IpamPoolId、NetworkBorderGroup、PublicIpv4Pool の6件＋「など」、総数表記は全8件。仕様の Properties は Address、Domain、InstanceId、IpamPoolId、NetworkBorderGroup、PublicIpv4Pool、Tags、TransferAddress の8件。列挙6件は全て実在し、総数8件が一致。**期待値どおり**。
- 補足・全件照合（仕様実在1,786件）：列挙名の不存在、総数Nの不一致、「など」無しでの列挙欠落は **いずれも0件**。必須表示についても、必須でないプロパティを必須と表示した例は **0件**、列挙完全な場合の必須集合の不一致も **0件**。
  - なお厳密等値（必須表示集合＝仕様の必須集合）で機械比較すると11件が「不一致」に見えたが、全件とも「など」付きの切り捨て列挙（列挙は最大6件）で、必須表示は仕様の必須集合の部分集合であり、虚偽の必須表示ではないことを原文引用で確認したため欠陥としない。該当11件：AWS::Lambda::MicrovmImage、AWS::MediaLive::CloudWatchAlarmTemplate、AWS::LicenseManager::License、AWS::CUR::ReportDefinition、AWS::DataZone::SubscriptionTarget、AWS::ServiceCatalog::StackSetConstraint、AWS::EMR::Studio、AWS::AppConfig::ExperimentDefinition、AWS::KafkaConnect::Connector、AWS::Budgets::BudgetsAction、AWS::Invoicing::ProcurementPortalPreference。代表原文：「AWS::Lambda::MicrovmImage …主要プロパティは必須の AdditionalOsCapabilities、BaseImageArn、BaseImageVersion、BuildRoleArn、CodeArtifact、CpuConfigurations などです（プロパティは全15件）。」（仕様の必須は12件で、表示6件はその部分集合）

### 判定
**合格**（サンプル31件・全件補足とも、誤ったプロパティ要約なし）

---

## CFN-03（プロパティ0件の4種別）

### 入力・手順
対象4種別について、カタログの説明文・使用例と、正本の `Properties` を照合した。あわせて「0件文を持つ項目」と「仕様で Properties が0件のカタログ項目」を全件機械抽出し、対象が4件で尽きることも確認した。

### 期待値と根拠
4件とも説明が「このリソースタイプにはプロパティがありません。」であり、仕様でも Properties が空／不在と一致し、例にプロパティの捏造が無いこと（probes.md CFN-03）。

### 実測

| 種別 | カタログの説明（全文） | 仕様 Properties | 例のプロパティ |
|---|---|---|---|
| AWS::CloudFormation::WaitConditionHandle | 「AWS::CloudFormation::WaitConditionHandle を作成するリソースタイプです。このリソースタイプにはプロパティがありません。」 | `{}`（0件） | なし（Type のみ） |
| AWS::Route53::DelegationSet | 「AWS::Route53::DelegationSet を作成するリソースタイプです。このリソースタイプにはプロパティがありません。」 | `{}`（0件） | なし（Type のみ） |
| AWS::DevOpsGuru::LogAnomalyDetectionIntegration | 「AWS::DevOpsGuru::LogAnomalyDetectionIntegration を作成するリソースタイプです。このリソースタイプにはプロパティがありません。」 | `{}`（0件） | なし（Type のみ） |
| AWS::ApplicationSignals::Discovery | 「AWS::ApplicationSignals::Discovery を作成するリソースタイプです。**設定可能なプロパティはありません。**」 | `{}`（0件） | なし（Type のみ） |

- 4件とも仕様の Properties は空オブジェクト `{}` で、カタログの「プロパティなし」という内容主張は4件とも真であり、仕様と一致する。
- 4件とも使用例は `Type:` のみで、プロパティの捏造はない。
- 網羅性：0件文（定型文）を持つ項目は上記4件のうち3件のみ、仕様で Properties 0件のカタログ項目はちょうどこの4件のみ。対象の取りこぼし・余分な0件主張はなし。
- **不一致は1件**：AWS::ApplicationSignals::Discovery のみ、定型文「このリソースタイプにはプロパティがありません。」ではなく「設定可能なプロパティはありません。」という異なる文面になっている。意味内容は同一で誤りではないが、プローブの期待文面および他3件との統一から外れている。

### 判定
**欠陥（軽微・文面不統一）1件** — AWS::ApplicationSignals::Discovery の0件文が定型文と異なる。内容の真偽・仕様一致・例の正確性に問題はないため、実質的な誤りではなく文面統一の欠陥として起票する。

---

## CFN-04（docsOnly 2件のカタログ主張抽出）

### 入力・手順
docsOnly の AWS::DeviceFarm::Project と AWS::SageMaker::ExperimentTrialComponent について、カタログ側の説明・列挙プロパティ・使用例を正確に抽出・引用し、両名が仕様JSON（272.0.0）の `ResourceTypes` に存在しないことを確認した。指示どおり Web／公式ドキュメント照合は行っていない（親工程で実施）。参考として docsOnly 12件全ての説明・列挙も付録Bに記録した。

### 期待値と根拠
本工程の期待は「カタログ側の主張テキストの正確な抽出」と「仕様JSONに存在しないことの確認」まで（親工程が公式ドキュメントと照合する）。

### 実測

**AWS::DeviceFarm::Project**（仕様JSONに存在しないことを確認済み）
- category：`AWS::DeviceFarm`／syntax：`Type: AWS::DeviceFarm::Project`／status：supported
- source：`https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-devicefarm-project.html`
- 説明（全文引用）：「AWS::DeviceFarm::Project を作成するリソースタイプです。主要プロパティは必須の Name、ほかに DefaultJobTimeoutMinutes、Tags、VpcConfigです（プロパティは全4件）。」
- 列挙プロパティ（機械抽出）：Name（必須表示）、DefaultJobTimeoutMinutes、Tags、VpcConfig — 全4件、「など」なし＝全件列挙の主張、総数表記4件
- 使用例（全文引用）：
  ```
  Project:
    Type: AWS::DeviceFarm::Project
    Properties:
      Name: "example"
      DefaultJobTimeoutMinutes: 1
      Tags: []
  ```
  例のプロパティ {Name, DefaultJobTimeoutMinutes, Tags} は列挙の部分集合で内部整合あり。

**AWS::SageMaker::ExperimentTrialComponent**（仕様JSONに存在しないことを確認済み）
- category：`AWS::SageMaker`／syntax：`Type: AWS::SageMaker::ExperimentTrialComponent`／status：supported
- source：`https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-sagemaker-experimenttrialcomponent.html`
- 説明（全文引用）：「AWS::SageMaker::ExperimentTrialComponent を作成するリソースタイプです。主要プロパティは TrialComponentName（必須）、DisplayName、EndTime、MetadataProperties、StartTime、Statusなど（全7個）です。」
- 列挙プロパティ（機械抽出）：TrialComponentName（必須表示）、DisplayName、EndTime、MetadataProperties、StartTime、Status — 6件＋「など」、総数表記7個
- 使用例（全文引用）：
  ```
  ExperimentTrialComponent:
    Type: AWS::SageMaker::ExperimentTrialComponent
    Properties:
      TrialComponentName: "example"
      DisplayName: "example"
      EndTime: "example"
  ```
  例のプロパティ {TrialComponentName, DisplayName, EndTime} は列挙の部分集合で内部整合あり。

### 判定
**合格（本工程範囲）** — 抽出と仕様不在の確認は完了。両項目の列挙・総数が公式ドキュメントの Properties と一致するかは **未確認（親工程の公式ドキュメント照合に委ねる）**。本工程では欠陥の有無を判定しない。

---

## CFN-05（状態とモード分離のデータ面）

### 入力・手順
高度合成カタログの CFN 1,798件について `status` 原値と `js/core/catalog.js` の `itemStatus` 導出値を機械確認し、基礎のみのカタログ（`definition.reference`）に高度項目が存在しないことを確認した。判定はデータ面に限る（画面表示の実測は本工程の対象外）。

### 期待値と根拠
高度では1,798件すべて「対応」表示、簡易では基礎の範囲のみで高度項目が漏れて見えないこと（probes.md CFN-05、U-45／U-50）。

### 実測
- 合成カタログの CFN 1,798件：`status` 原値が **全件 "supported"**、`itemStatus` 導出も **全件 supported**。`countByStatus`（CFN のみ）＝ {total: 1798, supported: 1798, unsupported: 0, unverified: 0}。
- 基礎のみのカタログ：reference 226件中に `AWS::`／`Alexa::` 名は **0件**。高度項目名と基礎項目名の重なりは **0件**。合成件数は 226＋1,798＝2,024 で厳密に一致し、mergeCatalog の problems は0件（重複による破棄・欠落なし）。
- すなわち簡易モードが使う基礎カタログには高度 CFN 項目が一切含まれず、漏れはない（データ面）。

### 判定
**合格（データ面）** — 画面上の表示確認は他担当プローブ（CFN-19 等）の範囲であり、本判定には含まない。

---

## CFN-06（検索到達性）

### 入力・手順
`js/app.js` の `refSearchText`（944行付近）を一字一句複製し、`renderRefs`／`fullRefs` のフィルタ処理（950〜990行付近：クエリは入力値の `toLowerCase()`、述語は `refSearchText(r).includes(q)`、状態フィルタは "all"）をそのまま適用した。対象25件は、必須の Alexa::ASK::Skill、docsOnly から2件（AWS::DeviceFarm::Project、AWS::SageMaker::ExperimentTrialComponent）、最長級の名前5件、残りをサービス横断の等間隔抽出で選んだ。補足として全1,798件についても同じ照合を行った。

### 期待値と根拠
全件が自名クエリで自項目に到達すること（probes.md CFN-06、F-02 の到達性定義＝検索述語そのものによる機械照合）。

### 実測
指定25件は **全件到達**（到達不能0件）。25件の内訳：
Alexa::ASK::Skill、AWS::DeviceFarm::Project、AWS::SageMaker::ExperimentTrialComponent（以上必須3件）、AWS::Notifications::ManagedNotificationAdditionalChannelAssociation（67字・最長）、AWS::EC2::LocalGatewayRouteTableVirtualInterfaceGroupAssociation（64字）、AWS::Notifications::ManagedNotificationAccountContactAssociation（64字）、AWS::Route53Resolver::ResolverQueryLoggingConfigAssociation（59字）、AWS::KinesisAnalyticsV2::ApplicationCloudWatchLoggingOption（59字）（以上最長5件）、AWS::EC2::ApplicationStatusCheck、AWS::EC2::SnapshotBlockPublicAccess、AWS::CloudFormation::TypeActivation、AWS::Redshift::Cluster、AWS::Route53Resolver::FirewallRuleGroupAssociation、AWS::OpenSearchServerless::CollectionGroup、AWS::LicenseManager::Grant、AWS::Lex::ResourcePolicy、AWS::Oam::Sink、AWS::SageMaker::Workteam、AWS::ApiGateway::RestApi、AWS::Lightsail::Distribution、AWS::IoTSiteWise::ComputationModel、AWS::WorkSpacesWeb::Portal、AWS::Neptune::DBInstance、AWS::ServiceDiscovery::HttpNamespace、AWS::PCS::Queue（以上等間隔17件）。
補足の全件照合でも到達不能は **0件／1,798件**。

### 判定
**合格**

---

## CFN-07（使用例の検証）

### 入力・手順
(1) カタログ順に等間隔50件の項目の `example`（YAML断片）を、アプリ同梱の YAML パーサ（`js/vendor/yaml.js` の `load`、アプリ自身が使うもの）で読み、`Type:` が項目名自身と一致すること、例のプロパティが仕様 `Properties` の部分集合であることを照合した。(2) 高度テンプレート4本（`js/types/cloudformation/templates-advanced.js`）が使う全 Type について同様に照合した（JSON形式テンプレートは Resources を機械抽出、Pythonハンドラ形式はコード中の Type 名を機械抽出）。(3) 補足として全1,798件の example に同一照合を拡張した。全件結果は台帳 `ledger-cfn-examples.tsv`。

### 期待値と根拠
例が YAML として読め、`Type:` が項目名自身と一致し、例のプロパティは仕様 Properties の部分集合であること（probes.md CFN-07、正本 272.0.0／docsOnly は公式ドキュメント）。

### 実測
- サンプル50件：**全件 problems なし**（YAML 読解可、Type 自己一致、プロパティは全て仕様の部分集合）。50件の名前：AWS::EC2::ApplicationStatusCheck、AWS::EC2::IpamExternalResourceVerificationToken、AWS::EC2::SnapshotBlockPublicAccess、AWS::EC2::VPCDHCPOptionsAssociation、AWS::CloudFormation::TypeActivation、AWS::Lambda::Version、AWS::Redshift::Cluster、AWS::AppSync::DomainName、AWS::Route53Resolver::FirewallRuleGroupAssociation、AWS::Route53::KeySigningKey、AWS::OpenSearchServerless::CollectionGroup、AWS::ElasticLoadBalancingV2::TrustStore、AWS::LicenseManager::Grant、AWS::KinesisAnalyticsV2::Snapshot、AWS::Lex::ResourcePolicy、AWS::DevOpsGuru::LogAnomalyDetectionIntegration、AWS::Oam::Sink、AWS::SageMaker::DataQualityJobDefinition、AWS::SageMaker::Workteam、AWS::QuickSight::CustomPermissions、AWS::ApiGateway::RestApi、AWS::Pinpoint::EmailChannel、AWS::Lightsail::Distribution、AWS::ServiceCatalog::ServiceActionAssociation、AWS::IoTSiteWise::ComputationModel、AWS::DMS::Endpoint、AWS::WorkSpacesWeb::Portal、AWS::DirectConnect::PrivateVirtualInterface、AWS::Neptune::DBInstance、AWS::Timestream::Database、AWS::ServiceDiscovery::HttpNamespace、AWS::S3Files::MountTarget、AWS::PCS::Queue、AWS::CodeGuruReviewer::RepositoryAssociation、AWS::Connect::QuickConnect、AWS::IoT::ResourceSpecificLogging、AWS::BedrockAgentCore::ResourcePolicy、AWS::CloudFront::FieldLevelEncryptionProfile、AWS::Cognito::LogDeliveryConfiguration、AWS::NetworkManager::CustomerGatewayAssociation、AWS::MediaConnect::FlowVpcInterface、AWS::SSM::MaintenanceWindow、AWS::GameLift::GameServerGroup、AWS::ImageBuilder::Component、AWS::AppMesh::Mesh、AWS::Route53GlobalResolver::DnsView、AWS::EntityResolution::MatchingWorkflow、AWS::EMRContainers::Endpoint、AWS::AppFlow::ConnectorProfile、AWS::Budgets::Budget。
- 高度テンプレート4本：
  - `cfn-adv-multi-resource`（JSON）：AWS::S3::Bucket{BucketName}、AWS::SQS::Queue{QueueName, DelaySeconds}、AWS::SNS::Topic{DisplayName, TopicName} — 全 Type が台帳内かつ仕様実在、全プロパティが仕様の部分集合。
  - `cfn-adv-fn-transform-loggroup`（JSON）：AWS::Logs::LogGroup{LogGroupName, RetentionInDays}、AWS::SQS::Queue{QueueName} — 同上。なお LogGroup の Properties 内にはキー `Fn::Transform` が同居するが、これはテンプレート解説どおり兄弟要素を渡す変換指定であり、リソースプロパティではないため部分集合照合からは除外して記録した（プロパティとして数えると仕様に無いキーになる点は、解説文がその意味を明示しているため欠陥としない）。
  - `cfn-adv-handler-type-count`（Pythonハンドラ）：コードが使う Type は AWS::S3::Bucket のみ — 台帳内かつ仕様実在。プロパティの使用なし。
  - `cfn-adv-handler-params-stage`（Pythonハンドラ）：コード中に Type 名の使用なし。
  - 4本とも `refs` は合成カタログで全件解決した。
- 補足・全件照合（1,798例）：YAML 読解エラー、Type 不一致、仕様外プロパティは **いずれも0件**。docsOnly 12件の例は仕様照合の対象外として、例のプロパティが各項目の列挙の部分集合であること（内部整合）を全件確認し、問題はなかった（公式ドキュメント照合は CFN-04 と同様に親工程）。

### 判定
**合格**

---

## 欠陥一覧

| # | プローブ | 内容 | 重篤度 |
|---|---|---|---|
| 1 | CFN-03 | AWS::ApplicationSignals::Discovery のプロパティ0件文が定型文「このリソースタイプにはプロパティがありません。」ではなく「設定可能なプロパティはありません。」になっている（他3件は定型文）。内容は真で仕様（Properties `{}`）とも一致し、例の捏造もないため、実質的な誤りではない文面不統一 | 軽微（文面） |

## 未確認事項・裁定送り

1. **CFN-04 の公式ドキュメント照合**（親工程）：本書 CFN-04 節および付録Bの抽出文を材料に、docsOnly 12件（少なくとも対象2件）の列挙・総数が公式ドキュメントの Properties と一致するかの確認が残る。本工程では Web 照合をしていない。
2. **仕様→カタログ方向の差分325件**（CFN-01-補足）：カタログの収載範囲はドキュメント掲載種別（B8 ワークリストと完全一致）であり、プローブ期待値の範囲では欠陥としない。plan.md §2-5 の「差分が docsOnly 12件ちょうど」を双方向に読む場合は裁定が必要。全件リストは `ledger-cfn-spec-extra.tsv` と付録A。
3. **画面表示の確認**：CFN-05 はデータ面のみ。状態バッジ・件数表示・簡易／高度の画面分離の実ブラウザ確認は他担当プローブの範囲。
4. **説明文 dialect の混在**（A：1,196件／B：598件／0件文：3件＋変種1件）：内容の真偽は全件照合済みで誤りはない。文面統一を要するかは J-01（日本語文面）担当・親工程の判断に委ねる。CFN-03 の欠陥1件はこの変種のうち定型文期待に直接触れるものとして起票した。

## 機械台帳（同ディレクトリ）

- `ledger-cfn-names.tsv` — 全1,798名×（カタログ順序、仕様272.0.0への実在、分類 spec/docsOnly、仕様プロパティ数、status）
- `ledger-cfn-spec-extra.tsv` — 仕様にあってカタログに無い325名×（仕様プロパティ数）
- `ledger-cfn-desc.tsv` — 全1,798件×（説明 dialect、総数表記、仕様総数、列挙、など有無、必須表示、問題）
- `ledger-cfn-examples.tsv` — 全1,798件×（例の Type 値、例のプロパティ、問題）

## 付録A：仕様JSONにあってカタログに無い ResourceTypes（325件・全件）

AWS::AWSExternalAnthropic::Workspace、AWS::Amplify::Jobs、AWS::AmplifyUIBuilder::CodegenJob、AWS::AppFabric::AppAuthorization、AWS::AppFabric::AppBundle、AWS::AppFabric::Ingestion、AWS::AppFabric::IngestionDestination、AWS::AppStream::Image、AWS::Artifact::ComplianceInquiry、AWS::Artifact::Report、AWS::Athena::Session、AWS::BCM::Dashboard、AWS::BCM::ScheduledReport、AWS::BCMDataExports::Table、AWS::Backup::ManagedRecoveryPoint、AWS::Backup::RecoveryPoint、AWS::BackupGateway::Gateway、AWS::BackupGateway::VirtualMachine、AWS::BackupSearch::SearchJob、AWS::BackupSearch::SearchResultExportJob、AWS::BcmPricingCalculator::BillEstimate、AWS::BcmPricingCalculator::BillScenario、AWS::BcmPricingCalculator::WorkloadEstimate、AWS::Bedrock::AsyncInvoke、AWS::Bedrock::DataAutomationLibraryIngestionJob、AWS::Bedrock::DefaultPromptRouter、AWS::Bedrock::EvaluationJob、AWS::Bedrock::FlowExecution、AWS::Bedrock::FoundationModel、AWS::Bedrock::ImportedModel、AWS::Bedrock::ModelImportJob、AWS::Bedrock::ModelInvocationJob、AWS::BedrockAgentCore::Browser、AWS::BedrockAgentCore::CodeInterpreter、AWS::BedrockAgentCore::ConfigurationBundleVersion、AWS::BedrockAgentCore::HarnessVersion、AWS::BedrockAgentCore::PolicyGeneration、AWS::BedrockAgentCore::TokenVault、AWS::BedrockMantle::Project、AWS::Braket::Job、AWS::Braket::QuantumTask、AWS::Braket::SpendingLimit、AWS::Cassandra::Stream、AWS::Chime::AppInstance、AWS::Chime::AppInstanceBot、AWS::Chime::AppInstanceUser、AWS::Chime::Channel、AWS::Chime::ChannelFlow、AWS::Chime::MediaCapturePipeline、AWS::Chime::MediaConcatenationPipeline、AWS::Chime::MediaInsightsPipeline、AWS::Chime::MediaInsightsPipelineConfiguration、AWS::Chime::MediaLiveConnectorPipeline、AWS::Chime::MediaPipelineKinesisVideoStreamPool、AWS::Chime::MediaStreamPipeline、AWS::Chime::SipMediaApplication、AWS::Chime::VoiceConnector、AWS::CleanRooms::ConfiguredAudienceModelAssociation、AWS::CleanRoomsML::AudienceGenerationJob、AWS::CleanRoomsML::AudienceModel、AWS::CleanRoomsML::ConfiguredAudienceModel、AWS::CleanRoomsML::MLInputChannel、AWS::CleanRoomsML::TrainedModel、AWS::CleanRoomsML::TrainedModelInferenceJob、AWS::CloudFormation::ResourceScan、AWS::CloudHSM::Cluster、AWS::CloudHSMV2::Backup、AWS::CodeArtifact::Package、AWS::CodeBuild::Build、AWS::CodeBuild::BuildBatch、AWS::CodeBuild::Report、AWS::CodeBuild::Sandbox、AWS::CognitoSync::Dataset、AWS::Comprehend::DocumentClassificationJob、AWS::Comprehend::DominantLanguageDetectionJob、AWS::Comprehend::EntitiesDetectionJob、AWS::Comprehend::FlywheelDataset、AWS::Comprehend::PiiEntitiesDetectionJob、AWS::Comprehend::SentimentDetectionJob、AWS::Comprehend::TargetedSentimentDetectionJob、AWS::Connect::AWSManagedView、AWS::ControlCatalog::CommonControl、AWS::ControlCatalog::Control、AWS::ControlCatalog::Objective、AWS::ControlTower::Baseline、AWS::DMS::ReplicationTaskAssessmentRun、AWS::DRS::Job、AWS::DRS::LaunchConfigurationTemplate、AWS::DRS::RecoveryInstance、AWS::DRS::RecoveryPlan、AWS::DRS::RecoveryPlanExecution、AWS::DRS::ReplicationConfigurationTemplate、AWS::DRS::SourceNetwork、AWS::DRS::SourceServer、AWS::DataExchange::Assets、AWS::DataExchange::DataSet、AWS::DataExchange::EntitledDataSets、AWS::DataExchange::EventAction、AWS::DataExchange::Job、AWS::DataSync::TaskExecution、AWS::Deadline::Job、AWS::Deadline::Volume、AWS::DynamoDB::Export、AWS::DynamoDB::Stream、AWS::EC2::DeclarativePoliciesReport、AWS::EC2::ExportImageTask、AWS::EC2::ExportInstanceTask、AWS::EC2::HostReservation、AWS::EC2::IPv6Pool、AWS::EC2::Image、AWS::EC2::ImageUsageReport、AWS::EC2::ImportImageTask、AWS::EC2::ImportSnapshotTask、AWS::EC2::LocalGateway、AWS::EC2::OutpostLag、AWS::EC2::ReplaceRootVolumeTask、AWS::EC2::ReservedInstances、AWS::EC2::SpotInstancesRequest、AWS::EC2::TransitGatewayRouteTableAnnouncement、AWS::EC2::VPCEndpointConnection、AWS::EC2::VpnConnectionDeviceType、AWS::ECRPublic::Registry、AWS::ECS::ContainerInstance、AWS::ECS::DaemonDeployment、AWS::ECS::DaemonRevision、AWS::ECS::ServiceDeployment、AWS::ECS::ServiceRevision、AWS::ECS::Task、AWS::EKS::EksAnywhereSubscription、AWS::EMR::NotebookExecution、AWS::EMR::Session、AWS::EMRContainers::JobRun、AWS::EMRServerless::JobRun、AWS::EMRServerless::Session、AWS::ElastiCache::ReservedCacheNode、AWS::Events::EventSource、AWS::Events::Replay、AWS::Evidently::Experiment、AWS::Evidently::Feature、AWS::Evidently::Launch、AWS::Evidently::Project、AWS::Evidently::Segment、AWS::FIS::Action、AWS::FIS::Experiment、AWS::FIS::SafetyLever、AWS::FSx::Task、AWS::Glue::TableVersion、AWS::GreengrassV2::Component、AWS::GreengrassV2::CoreDevice、AWS::GroundStation::Satellite、AWS::HealthAgent::Domain、AWS::HealthAgent::Subscription、AWS::IVS::Composition、AWS::IdentityStore::AllGroupMemberships、AWS::ImageBuilder::AllImageBuildVersions、AWS::ImageBuilder::AllWorkflowBuildVersions、AWS::ImageBuilder::LifecycleExecution、AWS::ImageBuilder::WorkflowExecution、AWS::ImageBuilder::WorkflowStepExecution、AWS::Inspector::AssessmentTarget、AWS::Inspector::AssessmentTemplate、AWS::Inspector::ResourceGroup、AWS::InternetMonitor::InternetEvent、AWS::IoT::Index、AWS::IoTAnalytics::Channel、AWS::IoTAnalytics::Dataset、AWS::IoTAnalytics::Datastore、AWS::IoTAnalytics::Pipeline、AWS::IoTDeviceAdvisor::SuiteRun、AWS::IoTSecureTunneling::Tunnel、AWS::IoTSiteWise::TimeSeries、AWS::IoTThingsGraph::FlowTemplate、AWS::IoTTwinMaker::MetadataTransferJob、AWS::KafkaConnect::ConnectorOperation、AWS::Lambda::DurableExecution、AWS::LicenseManagerLinuxSubscriptions::SubscriptionProvider、AWS::LicenseManagerUserSubscriptions::LicenseServerEndpoint、AWS::Lightsail::ExportSnapshotRecord、AWS::Location::Job、AWS::MGN::Application、AWS::MGN::Connector、AWS::MGN::Export、AWS::MGN::Import、AWS::MGN::Job、AWS::MGN::LaunchConfigurationTemplate、AWS::MGN::NetworkMigrationDefinition、AWS::MGN::ReplicationConfigurationTemplate、AWS::MGN::SourceServer、AWS::MGN::Wave、AWS::Macie2::ClassificationJob、AWS::MediaConnect::Offering、AWS::MediaConnect::Reservation、AWS::MediaConvert::Job、AWS::MediaLive::InputDevice、AWS::MediaLive::Offering、AWS::MediaLive::Reservation、AWS::MediaPackage::HarvestJob、AWS::MediaPackageV2::HarvestJob、AWS::MedicalImaging::ImageSet、AWS::MemoryDB::MultiRegionParameterGroup、AWS::MemoryDB::ReservedNode、AWS::NeptuneGraph::ExportTask、AWS::NeptuneGraph::ImportTask、AWS::NetworkFlowMonitor::Monitor、AWS::NetworkFlowMonitor::Scope、AWS::NetworkMonitor::Monitor、AWS::NetworkMonitor::Probe、AWS::NovaAct::WorkflowDefinition、AWS::NovaAct::WorkflowRun、AWS::OSIS::PipelineBlueprint、AWS::Omics::ReadSet、AWS::Omics::Reference、AWS::Omics::Run、AWS::Omics::RunBatch、AWS::Omics::Task、AWS::OpenSearch::DataSource、AWS::OpsWorks::App、AWS::OpsWorks::ElasticLoadBalancerAttachment、AWS::OpsWorks::Instance、AWS::OpsWorks::Layer、AWS::OpsWorks::Stack、AWS::OpsWorks::UserProfile、AWS::OpsWorks::Volume、AWS::Organizations::ResponsibilityTransfer、AWS::Organizations::Root、AWS::Outposts::Outpost、AWS::Outposts::Site、AWS::PI::PerfReports、AWS::Panorama::ApplicationInstance、AWS::Panorama::Package、AWS::Panorama::PackageVersion、AWS::PartnerCentral::ConnectionPreferences、AWS::PartnerCentral::Partner、AWS::Personalize::BatchInferenceJob、AWS::Personalize::BatchSegmentJob、AWS::Personalize::DataDeletionJob、AWS::Personalize::DatasetExportJob、AWS::Personalize::DatasetImportJob、AWS::Personalize::Recipe、AWS::Polly::Lexicon、AWS::QLDB::Ledger、AWS::QLDB::Stream、AWS::QuickSight::AssetBundleExportJob、AWS::QuickSight::AssetBundleImportJob、AWS::QuickSight::Ingestion、AWS::RDS::DBClusterAutomatedBackup、AWS::RDS::DBInstanceAutomatedBackup、AWS::RDS::ReservedDBInstance、AWS::Redshift::DataShare、AWS::RedshiftServerless::RecoveryPoint、AWS::Rekognition::ProjectVersion、AWS::ResilienceHub::AppAssessment、AWS::ResilienceHub::RecommendationTemplate、AWS::RoboMaker::Fleet、AWS::RoboMaker::Robot、AWS::RoboMaker::RobotApplication、AWS::RoboMaker::RobotApplicationVersion、AWS::RoboMaker::SimulationApplication、AWS::RoboMaker::SimulationApplicationVersion、AWS::RolesAnywhere::Subject、AWS::S3::Job、AWS::SCN::DataIntegrationFlow、AWS::SCN::Dataset、AWS::SCN::Instance、AWS::SCN::Namespace、AWS::SSM::AutomationExecution、AWS::SSM::ManagedInstance、AWS::SSM::Session、AWS::SSO::ApplicationProvider、AWS::SWF::Domain、AWS::SageMaker::AIBenchmarkJob、AWS::SageMaker::AIRecommendationJob、AWS::SageMaker::AutoMLJob、AWS::SageMaker::HubContentVersion、AWS::SageMaker::HyperParameterTuningJob、AWS::SageMaker::ModelCardExportJob、AWS::SageMaker::MonitoringScheduleAlert、AWS::SageMaker::OptimizationJob、AWS::SageMaker::PipelineExecution、AWS::SageMaker::ReservedCapacity、AWS::SageMaker::TrainingJob、AWS::SageMaker::TrainingPlan、AWS::SageMaker::TransformJob、AWS::SavingsPlans::SavingsPlan、AWS::SecurityAgent::PentestJob、AWS::SecurityAgent::PentestTask、AWS::ServerlessRepo::Application、AWS::ServiceQuotas::Quota、AWS::Signer::SigningJob、AWS::SimSpaceWeaver::Simulation、AWS::States::Execution、AWS::StepFunctions::MapRun、AWS::StorageGateway::CacheReport、AWS::StorageGateway::Device、AWS::StorageGateway::Gateway、AWS::StorageGateway::NFSFileShare、AWS::StorageGateway::SMBFileShare、AWS::StorageGateway::Tape、AWS::StorageGateway::TapePool、AWS::StorageGateway::Volume、AWS::Textract::Adapter、AWS::ThinClient::SoftwareSet、AWS::Timestream::InfluxDBParameterGroup、AWS::Transcribe::CallAnalyticsCategory、AWS::Transcribe::CallAnalyticsJob、AWS::Transcribe::LanguageModel、AWS::Transcribe::MedicalScribeJob、AWS::Transcribe::MedicalTranscriptionJob、AWS::Transcribe::MedicalVocabulary、AWS::Transcribe::TranscriptionJob、AWS::Transcribe::Vocabulary、AWS::Transcribe::VocabularyFilter、AWS::Translate::ParallelData、AWS::Translate::Terminology、AWS::UserNotifications::ManagedNotificationConfiguration、AWS::UserNotifications::NotificationEvent、AWS::VpcLattice::ResourceEndpointAssociation、AWS::Wickr::Network、AWS::Wisdom::Session、AWS::WorkSpaces::WorkSpaceApplication、AWS::WorkSpaces::WorkspaceBundle、AWS::WorkSpaces::WorkspaceImage、AWS::WorkspacesInstances::Volume、AWS::WorkspacesInstances::VolumeAssociation、AWS::WorkspacesInstances::WorkspaceInstance

## 付録B：docsOnly 12件のカタログ主張（説明全文・列挙・総数）

親工程の公式ドキュメント照合用。全件とも仕様JSON 272.0.0 に存在しないことを確認済み。

| 種別 | 説明（全文） | 列挙（機械抽出） | 総数表記 |
|---|---|---|---|
| AWS::DeviceFarm::DevicePool | AWS::DeviceFarm::DevicePool を作成するリソースタイプです。主要プロパティは必須の Name、ProjectArn、Rules、ほかに Description、MaxDevices、Tagsです（プロパティは全6件）。 | Name（必須）、ProjectArn（必須）、Rules（必須）、Description、MaxDevices、Tags | 6件（など無し＝全件列挙の主張） |
| AWS::DeviceFarm::InstanceProfile | AWS::DeviceFarm::InstanceProfile を作成するリソースタイプです。主要プロパティは必須の Name、ほかに Description、ExcludeAppPackagesFromCleanup、PackageCleanup、RebootAfterUse、Tagsです（プロパティは全6件）。 | Name（必須）、Description、ExcludeAppPackagesFromCleanup、PackageCleanup、RebootAfterUse、Tags | 6件（など無し） |
| AWS::DeviceFarm::NetworkProfile | AWS::DeviceFarm::NetworkProfile を作成するリソースタイプです。主要プロパティは必須の Name、ProjectArn、ほかに Description、DownlinkBandwidthBits、DownlinkDelayMs、DownlinkJitterMs などです（プロパティは全12件）。 | Name（必須）、ProjectArn（必須）、Description、DownlinkBandwidthBits、DownlinkDelayMs、DownlinkJitterMs | 12件（など有り） |
| AWS::DeviceFarm::Project | CFN-04 節に全文引用 | Name（必須）、DefaultJobTimeoutMinutes、Tags、VpcConfig | 4件（など無し） |
| AWS::DeviceFarm::TestGridProject | AWS::DeviceFarm::TestGridProject を作成するリソースタイプです。主要プロパティは必須の Name、ほかに Description、Tags、VpcConfigです（プロパティは全4件）。 | Name（必須）、Description、Tags、VpcConfig | 4件（など無し） |
| AWS::DeviceFarm::VPCEConfiguration | AWS::DeviceFarm::VPCEConfiguration を作成するリソースタイプです。主要プロパティは必須の ServiceDnsName、VpceConfigurationName、VpceServiceName、ほかに Tags、VpceConfigurationDescriptionです（プロパティは全5件）。 | ServiceDnsName（必須）、VpceConfigurationName（必須）、VpceServiceName（必須）、Tags、VpceConfigurationDescription | 5件（など無し） |
| AWS::GameLiftStreams::Application | AWS::GameLiftStreams::Application を作成するリソースタイプです。主要プロパティは ApplicationSourceUri（必須）、Description（必須）、ExecutablePath（必須）、RuntimeEnvironment（必須）、ApplicationLogOutputUri、ApplicationLogPathsなど（全7個）です。 | ApplicationSourceUri（必須）、Description（必須）、ExecutablePath（必須）、RuntimeEnvironment（必須）、ApplicationLogOutputUri、ApplicationLogPaths | 7個（など有り） |
| AWS::GameLiftStreams::StreamGroup | AWS::GameLiftStreams::StreamGroup を作成するリソースタイプです。主要プロパティは Description（必須）、LocationConfigurations（必須）、StreamClass（必須）、DefaultApplication、Tags（全5個）です。 | Description（必須）、LocationConfigurations（必須）、StreamClass（必須）、DefaultApplication、Tags | 5個（など無し） |
| AWS::IoTManagedIntegrations::CredentialLocker | AWS::IoTManagedIntegrations::CredentialLocker を作成するリソースタイプです。主要プロパティはName、Tagsです（プロパティは全2件）。 | Name、Tags | 2件（など無し） |
| AWS::IoTManagedIntegrations::ManagedThing | AWS::IoTManagedIntegrations::ManagedThing を作成するリソースタイプです。主要プロパティは必須の Role、ほかに AuthenticationMaterial、AuthenticationMaterialType、Brand、CapabilityReport、Classification などです（プロパティは全13件）。 | Role（必須）、AuthenticationMaterial、AuthenticationMaterialType、Brand、CapabilityReport、Classification | 13件（など有り） |
| AWS::IoTManagedIntegrations::ProvisioningProfile | AWS::IoTManagedIntegrations::ProvisioningProfile を作成するリソースタイプです。主要プロパティは必須の ProvisioningType、ほかに CaCertificate、Name、Tagsです（プロパティは全4件）。 | ProvisioningType（必須）、CaCertificate、Name、Tags | 4件（など無し） |
| AWS::SageMaker::ExperimentTrialComponent | CFN-04 節に全文引用 | TrialComponentName（必須）、DisplayName、EndTime、MetadataProperties、StartTime、Status | 7個（など有り） |
