// 高度モード B8：CloudFormation 高度差分（公式ドキュメント掲載 1,798 種別、
// 主要プロパティは公式 Resource Specification JSON 272.0.0 で照合）。

export const templatesAdvanced = [
 {
  "id": "cfn-adv-multi-resource",
  "title": "複数リソースのテンプレートを変換する",
  "level": "実践",
  "code": "{\n  \"Transform\": \"AddMetadata\",\n  \"Resources\": {\n    \"Bucket\": {\n      \"Type\": \"AWS::S3::Bucket\",\n      \"Properties\": { \"BucketName\": \"practice-bucket\" }\n    },\n    \"Queue\": {\n      \"Type\": \"AWS::SQS::Queue\",\n      \"Properties\": { \"QueueName\": \"practice-queue\", \"DelaySeconds\": 5 }\n    },\n    \"Topic\": {\n      \"Type\": \"AWS::SNS::Topic\",\n      \"Properties\": { \"DisplayName\": \"practice\", \"TopicName\": \"practice-topic\" }\n    }\n  }\n}",
  "intro": "S3バケット・SQSキュー・SNSトピックの3リソースを含むテンプレート全体へTransformを適用します。Typeとプロパティ名はすべて実在のものだけを使い、実際のAWSリソースは作りません。モデルのAddMetadataは、断片のトップレベルにMetadata（Stage: dev）を追加します。",
  "refs": [
   "Transform",
   "AWS::S3::Bucket",
   "AWS::SQS::Queue",
   "AWS::SNS::Topic"
  ]
 },
 {
  "id": "cfn-adv-fn-transform-loggroup",
  "title": "Fn::Transformでロググループの設定を変換する",
  "level": "応用",
  "code": "{\n  \"Resources\": {\n    \"LogGroup\": {\n      \"Type\": \"AWS::Logs::LogGroup\",\n      \"Properties\": {\n        \"Fn::Transform\": { \"Name\": \"AddMetadata\", \"Parameters\": { \"Stage\": \"test\" } },\n        \"LogGroupName\": \"practice-log\",\n        \"RetentionInDays\": 7\n      }\n    },\n    \"Queue\": {\n      \"Type\": \"AWS::SQS::Queue\",\n      \"Properties\": { \"QueueName\": \"practice-queue\" }\n    }\n  }\n}",
  "intro": "Fn::Transformは同じProperties内の兄弟要素（LogGroupNameとRetentionInDays）を断片としてマクロへ渡します。パラメータは未評価で渡されます。変換対象でないQueueはそのまま残ります。",
  "refs": [
   "Fn::Transform",
   "params",
   "AWS::Logs::LogGroup",
   "AWS::SQS::Queue"
  ]
 },
 {
  "id": "cfn-adv-handler-type-count",
  "title": "リソースの種類を数えるハンドラ",
  "level": "実践",
  "code": "def handler(event, context):\n    fragment = event[\"fragment\"]\n    total = 0\n    buckets = 0\n    for name, resource in fragment[\"Resources\"].items():\n        total += 1\n        if resource[\"Type\"] == \"AWS::S3::Bucket\":\n            buckets += 1\n    fragment[\"BucketCount\"] = buckets\n    print(\"Resources:\", total)\n    return {\"requestId\": event[\"requestId\"], \"status\": \"success\", \"fragment\": fragment}",
  "intro": "断片内のリソースを走査し、全体の件数とAWS::S3::Bucketの件数を数えて断片へ記録します。モデルの入力断片にはS3バケットが1件入っています。",
  "refs": [
   "fragment",
   "requestId",
   "status",
   "AWS::S3::Bucket"
  ]
 },
 {
  "id": "cfn-adv-handler-params-stage",
  "title": "paramsのステージ名を全リソースへ付けるハンドラ",
  "level": "応用",
  "code": "def handler(event, context):\n    fragment = event[\"fragment\"]\n    stage = event[\"params\"][\"Stage\"]\n    for name, resource in fragment[\"Resources\"].items():\n        resource[\"Metadata\"] = {\"Stage\": stage, \"TransformId\": event[\"transformId\"]}\n    print(\"Stage:\", stage)\n    return {\"requestId\": event[\"requestId\"], \"status\": \"success\", \"fragment\": fragment}",
  "intro": "マクロ引数paramsのStageと、呼び出されたマクロ名transformIdを、全リソースのMetadataへ書き込むハンドラです。モデルのparamsにはStage: testが入っています。",
  "refs": [
   "fragment",
   "params",
   "transformId",
   "requestId",
   "status"
  ]
 }
];
