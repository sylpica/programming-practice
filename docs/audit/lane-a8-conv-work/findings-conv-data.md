# WS-DATA（データ突合）所見 — 高度A8班 収束判定ラウンド

- 担当：全体監査・高度A8班 収束判定ラウンド WS-DATA（CFN-01／02／03／06／07、C-11／F-02（C++）、是正 A8-6／A8-7／A8-11／A8-12 の在席確認、F-03 収載面、REG-06 データ面）
- 対象ツリー：`~/workspace/programming-practice-audit/work/lane-a8-conv/`（統合ビルド 4771801 のコピー。前回ラウンド対象 04dfe2d とは異なる）。アプリのソースは読み取り専用で一切変更していない。
- 正本：
  - CFN：`~/workspace/programming-practice-audit/work/b8-data/cfn-spec.json`（ファイル内 `ResourceSpecificationVersion` を実測＝**272.0.0**。`ResourceTypes` 2,111件／`PropertyTypes` 10,627件）
  - C++ 母集団：同 `cpp-namespace-work.json`（3,182名）／`cpp-members-work.json`（1,733名）。生データ `cpp-namespace.json`／`cpp-members.json` からの変換検証は前回所見（lane-a8-exec `findings-data-cpp.md` §1-2）で完了済みであり、本ラウンドでは整形済み work 版を母集団として全数突合した。
- 手順の正本：前回所見 `findings-data-cfn.md`／`findings-data-cpp.md`（lane-a8-exec）。合成・検索述語・scan の再現方法は前回と同一（下記「共通手順」）。
- 実施スクリプト（同ディレクトリに残置）：`conv-cfn.mjs`（CFN 群）、`conv-cpp.mjs`（C++ 群＋REG-06 データ面）、`conv-fixes.mjs`（是正確認＋F-03）、`scan-domain.mjs`（前回から複写、A8-11）、`check-counts.mjs`（前回から複写、件数の対照）。
- 機械台帳（同ディレクトリ）：`ledger-conv-cfn-names.tsv`（1,798行＋ヘッダ）、`ledger-conv-cfn-examples.tsv`（1,798行＋ヘッダ）、`ledger-conv-cpp-names.tsv`（合成4,948行＋母集団のみ21行＋ヘッダ）。

## 共通手順（全プローブ）

アプリの合成方法を忠実に再現した（独自の近似合成はしていない）：

1. CFN は `js/types/cloudformation/index.js` の `definition`（基礎 reference 226件）を読み込み、`js/core/advanced-loader.js` の `loadAdvanced` で高度差分を取得。実測：loaded = advanced-manifest.js／reference-advanced-part1〜3.js／templates-advanced.js／glossary-advanced.js／advanced-engine.js、missing = なし、failed = なし、referenceAdvanced = **1,798件**（全件 supported）、templatesAdvanced = 4件、glossaryAdvanced = 6語。
2. C++ は `js/types/cpp/index.js` の `definition`（基礎 reference 33件・全件 supported）を読み込み、同様に `loadAdvanced`。実測：loaded = advanced-manifest.js／reference-advanced-part1〜8.js／templates-advanced.js／glossary-advanced.js（11ファイル）、missing = なし、failed = なし、referenceAdvanced = **4,915件**。
3. 合成は `js/core/catalog.js` の `mergeCatalog(definition, advanced)`。実測：CFN 合成 reference = **2,024件**（基礎226＋高度1,798）、C++ 合成 reference = **4,948件**（基礎33＋高度4,915）、両者とも `problems` = **0件**。
4. 「カタログ順」は合成結果の順序。等間隔抽出は前回と同一の決定的抽出：総数 N に対しインデックス `floor(i×N/k)`（i=0..k-1）。
5. 検索述語は `js/app.js` の `refSearchText`（944行付近）を一字一句複写（name＋category＋description＋syntax＋inventoryNames＋scan 文字列を空白連結し小文字化、クエリは小文字化して `includes` 照合。状態フィルタは "all"）。
6. scan は合成済みカタログを `definition.reference` にセットした上で `definition.scan`（`js/types/cpp/index.js` の拡張込み）を実走。名前ごとの断片は、修飾名そのままの断片＋メンバについては宣言＋ドット綴り断片（対象クラス string／vector／array／pair、例：`std::vector<int> objW; objW.push_back;`）を150件ずつのチャンクにまとめて投入した（前回手順と同一）。
7. CFN 説明文パーサは2 dialect 両対応（A：「主要プロパティは[必須の] A、B、[ほかに C、D] [など]です（プロパティは全N件）」、B：「主要プロパティは A（必須）、B、…[など]（全N個）です」、0件文：「このリソースタイプにはプロパティがありません。」）。書式ベースの実測分布は A 1,196件／B 598件／0件文 4件＝1,798件で、前回ラウンド（A 1,196／B 598／0件文 3＋変種1）と 0件文の内訳以外は同一。

## 判定サマリ

| プローブ | 判定 | 要点 |
|---|---|---|
| CFN-01 | 合格 | 総数1,798・重複0・仕様実在1,786・差分 docsOnly 12件ちょうど・Alexa 1件。全て期待値どおり。逆方向差分325件は前回と同一の観察事項 |
| CFN-02 | 合格 | サンプル31件（等間隔30＋必須EIP）全件一致。補足の全件照合（仕様実在1,786件）でも列挙実在・総数・必須表示に誤り0件 |
| CFN-03 | 合格 | 対象4種別すべて標準文に統一（A8-10 是正の在席を確認）。仕様 Properties 0件とも一致し、例の捏造なし |
| CFN-06 | 合格 | 指定25件全件到達。補足の全件照合でも到達不能0件／1,798件 |
| CFN-07 | 合格 | サンプル50件＋高度テンプレート4本の全 Type を照合し全て一致。補足の全件照合（1,798例）でも問題0件 |
| C-11（C++） | 合格 | 高度4,915件＝対応288／未対応4,627／未検証0、合成4,948件・対応321、problems 0。全て統合後の期待値どおり。母集団差分21↔21は前回裁定済みの読み替え・修復と同一 |
| F-02（C++ 検索） | 合格 | 合成全4,948件が自名到達、syntax 綴り1,848出現も失敗0。未到達ゼロ |
| scan 到達性（C++） | 合格（開示済みモデル差10件を含む） | 識別子のみで構成できる名前は全件解決。対応288件の未解決は演算子・デストラクタ名10件のみで、前回と同一・開示済みの設計上の対象外（全件検索到達済み） |
| REG-06（データ面） | 合格 | 基礎のみ対照で高度名の scan 解決0件。検索テキストへの出現5名は前回と同一の部分文字列・言及であり漏れではない |
| A8-6 是正 | 合格（在席確認） | std::vector／std::pair が対応、虚偽 caution 除去、pair の syntax は宣言形 |
| A8-7 是正 | 合格（在席確認） | イテレータ型12件が対応＋caution 実態文 |
| A8-11 是正 | 合格（在席確認） | scan-domain 違反 0件 |
| A8-12 是正 | 合格（在席確認） | 変更系メンバ23項目すべてにイテレータ無効化の開示 caution |
| F-03 収載面 | 合格 | C++ 高度12語＋CFN 高度6語がすべて合成カタログ（用語集）に現れる。重複 problems 0 |

**欠陥：0件。** 開示済みモデル差として記録するもの：scan で解決できない対応項目10件（§C++-scan）。裁定で説明できる差分：母集団↔カタログの名前差分21↔21（§C-11）。

---

## CFN-01（名前集合の突合）

### 入力・手順
合成カタログの `AWS::`／`Alexa::` 名集合（1,798名）を機械抽出し、正本の `ResourceTypes` 名集合（2,111名）および plan.md 冒頭の docsOnly 12件と突合した。全名の突合結果は台帳 `ledger-conv-cfn-names.tsv` に残した。基礎 reference 226件中に `AWS::`／`Alexa::` 名は0件（前回と同一）であり、合成カタログの当該名集合＝高度1,798件と一致する。

### 期待値
総数1,798、重複ゼロ、仕様JSONに実在1,786、差分は docsOnly 12件ちょうど（DeviceFarm 6／GameLiftStreams 2／IoTManagedIntegrations 3／SageMaker 1）、Alexa:: は Alexa::ASK::Skill の1件のみ（probes.md CFN-01、正本 272.0.0）。

### 実測
- 総数：**1,798**、重複：**0件**（mergeCatalog の problems も0件）
- 仕様JSONに実在：**1,786件**
- カタログにあって仕様JSONに無いもの：**12件**で、docsOnly 12件と集合として完全一致（過不足なし）。全件：AWS::DeviceFarm::DevicePool、AWS::DeviceFarm::InstanceProfile、AWS::DeviceFarm::NetworkProfile、AWS::DeviceFarm::Project、AWS::DeviceFarm::TestGridProject、AWS::DeviceFarm::VPCEConfiguration、AWS::GameLiftStreams::Application、AWS::GameLiftStreams::StreamGroup、AWS::IoTManagedIntegrations::CredentialLocker、AWS::IoTManagedIntegrations::ManagedThing、AWS::IoTManagedIntegrations::ProvisioningProfile、AWS::SageMaker::ExperimentTrialComponent
- Alexa:: ：**Alexa::ASK::Skill の1件のみ**（仕様JSONにも実在）
- 逆方向（仕様→カタログ）の差分：**325件**（2,111 − 1,786）。前回ラウンドと同数であり、カタログの収載範囲が「公式ドキュメント掲載種別」であるという B8 申告と整合する観察事項。前回同様、プローブ期待値（カタログ側の件数・差分）は全て満たすため欠陥としない。

### 判定
**合格**

---

## CFN-02（プロパティ要約の照合）

### 入力・手順
カタログ順に等間隔30件（インデックス floor(i×1798/30)）を抽出し、必須指定の AWS::EC2::EIP を加えた31件について、説明文の列挙プロパティ名と総数Nを2 dialect 両対応パーサで機械抽出し、正本の `Properties` キー集合と照合した（列挙名の実在、N＝仕様のプロパティ総数、「など」無し＝列挙が全集合と一致すること、必須表示が仕様の必須集合の部分集合であること、列挙完全な場合は必須集合と一致すること）。あわせて補足として同一照合を仕様実在の全1,786件に拡張した。

### 期待値
列挙名は全て仕様の Properties キーに実在し、N は仕様のプロパティ総数と一致。EIP は列挙＝Address／Domain／InstanceId／IpamPoolId／NetworkBorderGroup／PublicIpv4Pool など、全8件（probes.md CFN-02）。

### 実測
サンプル31件は **全件 problems なし**。内訳（名前／総数＝仕様総数／列挙数／など有無）は前回ラウンドのサンプルと同一の31件・同一結果：AWS::EC2::ApplicationStatusCheck（15／6／あり）、AWS::EC2::RouteServer（5／5／なし）、AWS::EC2::VPNGatewayRoutePropagation（2／2／なし）、AWS::Lambda::Version（6／6／なし）、AWS::MediaLive::InputSecurityGroup（2／2／なし）、AWS::CustomerProfiles::EventStream（4／4／なし）、AWS::OpenSearchServerless::CollectionGroup（6／6／なし）、AWS::WAF::IPSet（2／2／なし）、AWS::S3Tables::Table（10／6／あり）、AWS::DevOpsGuru::LogAnomalyDetectionIntegration（0件文／0）、Alexa::ASK::Skill（3／3／なし）、AWS::Glue::IdentityCenterConfiguration（3／3／なし）、AWS::ApiGateway::RestApi（18／6／あり）、AWS::DataZone::ProjectProfile（10／6／あり）、AWS::VpcLattice::Service（7／6／あり）、AWS::DMS::Endpoint（31／6／あり）、AWS::Personalize::Dataset（6／6／なし）、AWS::AutoScaling::AutoScalingGroup（37／6／あり）、AWS::ServiceDiscovery::HttpNamespace（3／3／なし）、AWS::DAX::SubnetGroup（3／3／なし）、AWS::VoiceID::Domain（4／4／なし）、AWS::IoT::ResourceSpecificLogging（3／3／なし）、AWS::Bedrock::ResourcePolicy（2／2／なし）、AWS::Cognito::UserPoolUICustomizationAttachment（3／3／なし）、AWS::MediaConnect::FlowVpcInterface（6／6／なし）、AWS::Config::ConformancePack（8／6／あり）、AWS::Omics::RunCache（6／6／なし）、AWS::Route53GlobalResolver::DnsView（8／6／あり）、AWS::VerifiedPermissions::Policy（3／3／なし）、AWS::Detective::MemberInvitation（5／5／なし）、AWS::EC2::EIP（8／6／あり）。

- **EIP（必須確認）**：説明の列挙は Address、Domain、InstanceId、IpamPoolId、NetworkBorderGroup、PublicIpv4Pool の6件＋「など」、総数表記は全8件。仕様の Properties は Address、Domain、InstanceId、IpamPoolId、NetworkBorderGroup、PublicIpv4Pool、Tags、TransferAddress の8件。列挙6件は全て実在し、総数8件が一致。**期待値どおり**。
- 補足・全件照合（仕様実在1,786件）：列挙名の不存在、総数Nの不一致、「など」無しでの列挙欠落、虚偽の必須表示、列挙完全な場合の必須集合の不一致は **いずれも0件**。

### 判定
**合格**

---

## CFN-03（プロパティ0件の4種別）

### 入力・手順
対象4種別について、カタログの説明文・使用例と、正本の `Properties` を照合した。あわせて「仕様で Properties が0件のカタログ項目」と「標準文を持つ項目」を全件機械抽出し、対象が4件で尽きることも確認した。

### 期待値
4件とも説明が標準文「このリソースタイプにはプロパティがありません。」で統一されていること（A8-10 是正の確認）。仕様でも Properties が空／不在と一致し、例にプロパティの捏造が無いこと。

### 実測

| 種別 | 標準文を含むか | 仕様 Properties | 例のプロパティ |
|---|---|---|---|
| AWS::CloudFormation::WaitConditionHandle | はい | `{}`（0件） | なし（Type のみ） |
| AWS::Route53::DelegationSet | はい | `{}`（0件） | なし（Type のみ） |
| AWS::DevOpsGuru::LogAnomalyDetectionIntegration | はい | `{}`（0件） | なし（Type のみ） |
| AWS::ApplicationSignals::Discovery | はい | `{}`（0件） | なし（Type のみ） |

- 4件の説明全文はいずれも「（種別名）を作成するリソースタイプです。このリソースタイプにはプロパティがありません。」の形で統一されている。前回ラウンドで欠陥（軽微・文面不統一）とした AWS::ApplicationSignals::Discovery の変種文面「設定可能なプロパティはありません。」は解消されている。
- 網羅性：仕様で Properties 0件のカタログ項目はちょうどこの4件のみ、標準文を持つ項目もちょうどこの4件のみ。取りこぼし・余分な0件主張はなし。

### 判定
**合格**（A8-10 是正の在席を確認）

---

## CFN-06（検索到達性）

### 入力・手順
共通手順5の検索述語（`refSearchText` の正確な複写）で、指定25件を各名前で検索し、自項目に到達するか照合した。25件の構成：必須の Alexa::ASK::Skill、docsOnly から2件（AWS::DeviceFarm::Project、AWS::SageMaker::ExperimentTrialComponent）、最長級の名前5件（AWS::Notifications::ManagedNotificationAdditionalChannelAssociation（67字）、AWS::EC2::LocalGatewayRouteTableVirtualInterfaceGroupAssociation（64字）、AWS::Notifications::ManagedNotificationAccountContactAssociation（64字）、AWS::Route53Resolver::ResolverQueryLoggingConfigAssociation（59字）、AWS::KinesisAnalyticsV2::ApplicationCloudWatchLoggingOption（59字））、残り17件を等間隔抽出で選定。補足として全1,798件についても同じ照合を行った。

### 期待値
全件が自名クエリで自項目に到達すること（probes.md CFN-06、F-02 の到達性定義）。

### 実測
指定25件は **全件到達**（到達不能0件）。補足の全件照合でも到達不能は **0件／1,798件**。

### 判定
**合格**

---

## CFN-07（使用例の検証）

### 入力・手順
(1) カタログ順に等間隔50件の項目の `example`（YAML断片）を、アプリ同梱の YAML パーサ（`js/vendor/yaml.js` の `load`）で読み、`Type:` が項目名自身と一致すること、例のプロパティが仕様 `Properties` の部分集合であることを照合した（docsOnly 12件は仕様照合の対象外とし、例のプロパティが各項目の列挙の部分集合である内部整合を確認）。(2) 高度テンプレート4本が使う全 Type について、台帳内・仕様実在・プロパティ部分集合（JSON形式は Resources を機械走査、Pythonハンドラ形式はコード中の Type 名を機械抽出）と refs の解決を照合した。(3) 補足として全1,798件の example に同一照合を拡張した。全件結果は台帳 `ledger-conv-cfn-examples.tsv`。

### 期待値
例が YAML として読め、`Type:` が項目名自身と一致し、例に現れるプロパティは仕様の Properties の部分集合であること（probes.md CFN-07）。

### 実測
- サンプル50件：**全件 problems なし**（名前は前回ラウンドのサンプル50件と同一集合・同一結果）。
- 高度テンプレート4本：
  - `cfn-adv-multi-resource`（JSON）：AWS::S3::Bucket{BucketName}、AWS::SQS::Queue{QueueName, DelaySeconds}、AWS::SNS::Topic{DisplayName, TopicName} — 全 Type が台帳内かつ仕様実在、全プロパティが仕様の部分集合。refs 4件全て解決。
  - `cfn-adv-fn-transform-loggroup`（JSON）：AWS::Logs::LogGroup{LogGroupName, RetentionInDays}、AWS::SQS::Queue{QueueName} — 同上（`Fn::Transform` キーは変換指定でありリソースプロパティではないため部分集合照合から除外。前回と同一の扱い）。refs 4件全て解決。
  - `cfn-adv-handler-type-count`（Pythonハンドラ）：コードが使う Type は AWS::S3::Bucket のみ — 台帳内かつ仕様実在。refs 4件全て解決。
  - `cfn-adv-handler-params-stage`（Pythonハンドラ）：コード中に Type 名の使用なし。refs 5件全て解決。
- 補足・全件照合（1,798例）：YAML 読解エラー、Type 不一致、仕様外プロパティは **いずれも0件**。docsOnly 12件の例も列挙の部分集合であり内部整合に問題なし。

### 判定
**合格**

---

## C-11（C++ カタログ完全性）

### 入力・手順
母集団（名前空間3,182名＋メンバ1,733名＝4,915名、交わり0）と合成カタログを全数突合した。件数・ステータスは `mergeCatalog`／`itemStatus` の実導出値。

### 期待値（統合後の期待値）
高度 4,915件 ＝ 対応288／未対応4,627／未検証0（前回是正 A8-6／A8-7 で vector・pair＋イテレータ型12件が対応化）。合成総数 4,948（基礎33＋高度4,915）、合成の対応は 321。mergeCatalog problems 0。

### 実測

| 対象 | 期待 | 実測 | 判定 |
|---|---|---|---|
| 高度項目 総数 | 4,915 | **4,915** | 一致 |
| 対応 supported | 288 | **288** | 一致 |
| 未対応 unsupported | 4,627 | **4,627** | 一致 |
| 未検証 unverified | 0 | **0** | 一致 |
| 合成総数 | 4,948 | **4,948** | 一致 |
| 合成の対応 | 321 | **321**（288＋基礎33） | 一致 |
| mergeCatalog problems | 0 | **0** | 一致 |
| 高度項目の重複名 | 0 | **0**（相異なる名前4,915） | 一致 |
| 高度項目の status 明示 | 全件3値のいずれか | 全4,915件が明示の3値 | 一致 |

- 区分別の裏付け：母集団名と同名でカタログに存在する名前空間側は3,180件（対応180＝前回178＋std::vector＋std::pair）、メンバ側は1,714件（対応106＝前回94＋イテレータ型12件）。残りは下記の読み替え・修復分（名前空間側の修復2件はいずれも未対応、メンバ側の読み替え19件のうち対応は std::string::string／std::string::~string の2件）であり、区分別合計は名前空間側3,182件（対応180）・メンバ側1,733件（対応108）で、対応の総計288と完全一致する。
- 母集団↔カタログの集合差分は **21↔21** で、前回ラウンドと完全に同一の対応表である：(a) コンストラクタ／デストラクタの表示名読み替え19件（例：母集団 `std::string::basic_string` → カタログ `std::string::string`。全件対応表は前回所見 §1-3 と同一のため再掲を省略し、本ラウンドの機械出力でも同一リストであることを確認した）、(b) 棚卸し時の項目名破損の修復2件（`std::operator` → `std::operator|=`、`std::operator\` → `std::operator|`）。いずれも B8 の裁定で説明できるため、前回同様 **欠陥にしない**。

### 判定
**合格**（件数・ステータス・集合は統合後の期待値と一致）

---

## F-02（C++ 検索到達性）

### 入力・手順
共通手順5の述語で、(1) 合成カタログ全4,948件について自名が自項目にヒットするか、(2) 束ね項目の syntax 欄から抽出した全綴り（`::` 綴り・ドット綴り）が自項目にヒットするか、(3) 母集団4,915名が合成カタログのいずれかの項目に到達するか、を照合した。

### 実測
- (1) 自名到達：**4,948／4,948件**（失敗0）。高度項目に `inventoryNames` を持つものは0件、`scan` 文字列メタデータを持つものも0件（前回と同一。C++ では束ねは項目分割方式）。
- (2) 束ね綴り：syntax から抽出した綴りは1,848出現で、自項目ヒット失敗は **0件**。
- (3) 母集団名の到達：4,894名は自項目に到達。`std::operator` は他演算子項目の部分文字列としてのみヒット（自項目は存在しない）。残り20名（`std::operator\` および表示名読み替え前の basic_* 系19件）は文字列としても到達しない。これは §C-11 の読み替え・修復に対応する作業母集団側の中間名であり、カタログ項目の名前としては存在しないことが裁定済みのため、前回同様 **欠陥にしない**（内訳・名前リストは前回所見 §2 (3) と完全に同一であることを機械出力で確認した）。

### 判定
**合格**（カタログ項目の到達性は全件成立。未到達ゼロ）

---

## scan 到達性（C++、チップ解決。REG-06 のデータ面を兼ねる）

### 入力・手順
共通手順6。対応項目を主対象とし、全高度項目でも照合した。あわせて基礎のみに戻した対照（REG-06）でも同一の検索・scan を実施した。

### 実測
- 対応（高度）288件：**278件が解決**、未解決は次の **10件のみ**（前回ラウンドと同一の全件列挙）：`std::string::operator+=`、`std::string::operator=`、`std::string::operator[]`、`std::string::~string`、`std::array::operator=`、`std::array::operator[]`、`std::vector::operator=`、`std::vector::operator[]`、`std::vector::~vector`、`std::pair::operator=`。
  - 10件はいずれもメンバ名部分が識別子でない演算子名／デストラクタ名であり、scan 拡張が識別子トークン列で照合する設計上対象外になるもの（B8報告書 §5 欠陥5で開示済み）。10件すべて F-02 の検索到達は成立している。よって **欠陥ではなく開示済みモデル差** とする（前回判定と同一）。新規対応化した std::vector／std::pair／イテレータ型12件はいずれも scan で解決することを確認した（未解決リストに含まれない）。
- 全高度項目：識別子のみで構成できる名前 **4,679件は全件解決**（対応・未対応を問わない）。識別子で構成できない名前は236件で、全て設計上の対象外（未解決236件と一致）。
- 実コード断片の確認：テンプレート `cpp-adv-sort-search` のコードに対する scan 結果は10件（std::vector::push_back／begin／end／front／back、std::vector、std::distance、std::sort、std::lower_bound、std::binary_search）で、同テンプレートの refs 9件を全て含む（前回と同一）。
- テンプレート refs（C++ 高度8本）：合計57件、dangling **0件**、参照先は全件 supported（前回と同一）。

### REG-06（データ面：簡易モードへの漏れ）
- 検索サンプル9名（std::sort／std::accumulate／std::binary_search／std::numbers::pi／std::string::npos／std::vector::push_back／std::popcount／std::clamp／std::stoi）：基礎のみでは全件ヒット0、合成では全件が自項目にヒットし全件 supported。
- scan：基礎のみのカタログで全高度名を対象に照合しても、解決される高度名は **0件**。
- 全数検索漏れ照合：高度4,915名のうち5名（std::end／std::cin／std::nullptr_t／std::NULL／std::get）が基礎項目の検索テキストに部分文字列として現れるが、前回フィールド単位で確認済みのとおり、いずれも基礎項目自身の文面内の言及・部分文字列（例：std::end ← 基礎 `endl` の syntax `std::endl`）であり、高度項目そのものの出現ではない。**漏れとは判定しない**（前回と同一の5名・同一の説明）。

### 判定
**合格**（未到達ゼロ。scan 未解決10件は開示済みモデル差）

---

## 是正の在席確認（A8-6／A8-7／A8-11／A8-12）

### A8-6（std::vector／std::pair）
- 前回の欠陥（lane-a8-exec `findings-cpp-stop.md` §2 (e)）：両項目は status=unsupported で、caution「このクラス／機能の値モデルは未実装のため、実行できません」が事実と反していた。
- 実測：`std::vector` は status=**supported**、caution=**""**（虚偽 caution は除去済み）、syntax=「template< class T, class Allocator = std::allocator<T> > class vector;」、example=「std::vector<int> v{1, 2, 3};」。`std::pair` は status=**supported**、caution=**""**、syntax=「template< class T, class U > struct pair;」（**宣言形**）、example=「std::pair<int, std::string> p{1, "one"};\nauto n = p.first;」。
- 判定：**合格（是正在席）** — 両項目とも対応化され、虚偽 caution は無く、pair の syntax は宣言形である。

### A8-7（イテレータ型12件）
- 前回の不一致（同 §2 (d)）：12件は status=unsupported 表示ながらエンジンでは実行でき、caution「型や概念そのものを表す項目で、実行時の操作はありません」とも食い違っていた。
- 実測：対象12件（std::string／std::vector／std::array × iterator／const_iterator／reverse_iterator／const_reverse_iterator）は **全件 status=supported**、caution は **全件**「この型でイテレータ変数を宣言し、begin()/cbegin()/rbegin()/crbegin() などが返すイテレータを受けて使うことができます」という実態文に統一されている。
- 判定：**合格（是正在席）**

### A8-11（数学項目の example 定義域）
- 手順：前回スクリプト `scan-domain.mjs` をそのまま複写して実走（acos／asin／acosh／atanh／log／log2／log10／log1p／sqrt の example 第1引数を定義域と照合）。
- 実測：**total violations: 0**。
- 判定：**合格（是正在席）** — 期待値0件と一致。

### A8-12（イテレータ無効化の開示 caution 23件）
- 対象：変更系メンバ23項目（string 12：append／assign／clear／erase／insert／operator+=／operator=／pop_back／push_back／replace／resize／swap、vector 11：assign／clear／emplace／emplace_back／erase／insert／operator=／pop_back／push_back／resize／swap）。
- 実測：**23／23件すべて**に caution「このシミュレータではイテレータの無効化を再現しません。変更前に得たイテレータは位置で要素を指し続けるため、実物（無効化されたイテレータの使用は未定義動作）とは動きが異なる場合があります」が入っている（全件同一文面、全件 status=supported）。
- 判定：**合格（是正在席）**

---

## F-03（用語集の収載面）

### 入力・手順
C++ 高度12語＋CFN 高度6語（各 `glossary-advanced.js`）が合成後の用語集に現れること、基礎用語との重複が無いことを照合した。定義文の正確性そのものの裁定は他担当の範囲であり、ここでは収載・重複まで。

### 実測
- C++：合成後 glossary は **18語**＝基礎6語＋高度12語。高度12語（イテレータ／半開区間／コンテナ／メンバ関数／コンストラクタ／デストラクタ／名前空間／ヘッダ／標準ライブラリ／テンプレート／ムーブ／符号なし整数）は全て合成結果に現れ、欠落0。glossary-duplicate の problems は0。
- CFN：合成後 glossary は **11語**＝基礎5語＋高度6語。高度6語（リソース／リソースタイプ／論理名／プロパティ／スタック／マクロ引数（params））は全て合成結果に現れ、欠落0。glossary-duplicate の problems は0。
- 合成は基礎・高度の単一配列に対して行われるため、ビュー間の不一致は生じない構造である（前回確認と同一）。

### 判定
**合格**

---

## 総合判定（WS-DATA）

- **欠陥：0件。** 実施した全プローブ（CFN-01／02／03／06／07、C-11、F-02、scan 到達性、REG-06 データ面、是正 A8-6／A8-7／A8-11／A8-12 の在席確認、F-03 収載面）が合格し、統合後の期待値（C++ 高度4,915件＝288／4,627／0、合成4,948・対応321、CFN 高度1,798・合成2,024、両者 problems 0、scan-domain 0件、無効化 caution 23件）と全て一致した。
- 前回ラウンドの本 WS 範囲の欠陥1件（CFN-03 の文面不統一）は解消を確認した（§CFN-03）。
- 開示済みモデル差（欠陥にしない）：scan で解決できない対応項目10件（演算子・デストラクタ名。検索到達は全件成立）。
- 裁定で説明できる差分（欠陥にしない）：母集団↔カタログの名前差分21↔21（表示名読み替え19＋破損名修復2、前回裁定と同一）、CFN の仕様→カタログ方向の差分325件（収載範囲＝ドキュメント掲載種別という B8 申告と整合する観察事項、前回と同数）。
- 本所見の範囲外：CFN-04 の公式ドキュメント照合、CFN フック挙動（CFN-08〜15／19／B群）、C++ 実挙動・名指し停止（F-01／C-12）、用語定義・項目文面の内容正確性（F-03／F-04 の内容面）、UI 表示（D群）は他担当の範囲。
