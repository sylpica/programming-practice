// Return contracts and primary documentation for the supported teaching subset.
export const referenceDetails = {
  "Transform": {
    "returns": "変換後のテンプレート全体（Transform節を除く）",
    "source": "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html"
  },
  "Fn::Transform": {
    "returns": "マクロのfragment応答で置き換える断片",
    "source": "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html"
  },
  "fragment": {
    "returns": "入力断片／変換後のテンプレート断片",
    "source": "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html"
  },
  "params": {
    "returns": "マクロ引数のキーと値",
    "source": "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html"
  },
  "requestId": {
    "returns": "受け取った要求IDと同じID",
    "source": "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html"
  },
  "status": {
    "returns": "successまたは失敗状態",
    "source": "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html"
  },
  "region": {
    "returns": "マクロが実行されるリージョン",
    "source": "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html"
  },
  "accountId": {
    "returns": "マクロを実行するアカウント ID",
    "source": "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html"
  },
  "transformId": {
    "returns": "呼び出されたマクロ名",
    "source": "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html"
  },
  "errorMessage": {
    "returns": "失敗時の理由メッセージ",
    "source": "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html"
  },
  "templateParameterValues": {
    "returns": "評価済みテンプレートパラメータ",
    "source": "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html"
  }
};
