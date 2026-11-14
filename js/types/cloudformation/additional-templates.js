const data = [
  {
    "id": "cfn-pass",
    "title": "変換しないテンプレートを読む",
    "level": "基礎",
    "code": "{\"Resources\":{\"Bucket\":{\"Type\":\"AWS::S3::Bucket\"}}}",
    "intro": "Transformがなければ、このモデルでは断片をそのまま表示します。実際のリソースは作りません。",
    "refs": [
      "Transform",
      "fragment"
    ]
  },
  {
    "id": "cfn-two-macros",
    "title": "2つのマクロを順番に適用",
    "level": "実践",
    "code": "{\"Transform\":[\"AddMetadata\",\"AddLabel\"],\"Resources\":{\"Bucket\":{\"Type\":\"AWS::S3::Bucket\"}}}",
    "intro": "先のマクロが付けたMetadataを次のマクロが読みます。テンプレート全体のTransformは記載順です。",
    "refs": [
      "Transform",
      "fragment",
      "status"
    ]
  },
  {
    "id": "cfn-resource-loop",
    "title": "複数リソースに確認済み印を付ける",
    "level": "応用",
    "code": "def handler(event, context):\n    fragment = event[\"fragment\"]\n    count = 0\n    for name, resource in fragment[\"Resources\"].items():\n        resource[\"Metadata\"] = {\"Reviewed\": True}\n        count += 1\n    fragment[\"ReviewedCount\"] = count\n    print(\"Reviewed:\", count)\n    return {\"requestId\": event[\"requestId\"], \"status\": \"success\", \"fragment\": fragment}",
    "intro": "明示した2リソースをPythonのループで変換します。IAMや実デプロイの検証は行いません。",
    "refs": [
      "fragment",
      "requestId",
      "status",
      "for",
      "print"
    ]
  }
];

export function additionalTemplates(defaultModel) {
  const result = structuredClone(data);
  for (const t of result) t.model = structuredClone(defaultModel);
  result[1].model.macros.AddLabel = "def handler(event, context):\n    f = event[\"fragment\"]\n    f[\"Metadata\"][\"Label\"] = \"checked\"\n    return {\"requestId\":event[\"requestId\"],\"status\":\"success\",\"fragment\":f}";
  result[2].model.event.fragment = {Resources:{A:{Type:"AWS::S3::Bucket"},B:{Type:"AWS::S3::Bucket"}}};
  return result;
}
