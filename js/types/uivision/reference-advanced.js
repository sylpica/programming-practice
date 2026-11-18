// 高度モード（ブロックB1）: UI.Vision RPA の高度リファレンス項目。
// 形式は基礎層 reference と同じ＋ status フィールド。意味論の出典は
// ~/workspace/programming-practice-audit/work/adv-b1-notes-uvdata.md を参照。
export const referenceAdvanced = [
  {
    "name": "addSelection",
    "category": "操作",
    "syntax": "addSelection | ロケーター | オプションロケーター",
    "description": "複数選択できるselect要素に、オプションロケーターで指定した選択肢を追加で選択します。既に選ばれている選択肢は解除されません。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"addSelection\",\n      \"Target\": \"id=fruits\",\n      \"Value\": \"label=りんご\"\n    }\n  ]\n}",
    "caution": "対象は複数選択（multiple）のselect要素です。単一選択の置き換えにはselectを使います。このモデルでは要素のoptionsで選択状態を表します。",
    "status": "supported"
  },
  {
    "name": "removeSelection",
    "category": "操作",
    "syntax": "removeSelection | ロケーター | オプションロケーター",
    "description": "複数選択できるselect要素で、オプションロケーターで指定した選択肢の選択を外します。他の選択肢の選択状態は変わりません。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"removeSelection\",\n      \"Target\": \"id=fruits\",\n      \"Value\": \"label=りんご\"\n    }\n  ]\n}",
    "caution": "対象は複数選択（multiple）のselect要素です。このモデルでは要素のoptionsで選択状態を表します。",
    "status": "supported"
  },
  {
    "name": "answerOnNextPrompt",
    "category": "ダイアログ",
    "syntax": "answerOnNextPrompt | 回答文字列",
    "description": "次に表示されるJavaScriptのpromptダイアログへ返す回答を、あらかじめTargetに設定します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"answerOnNextPrompt\",\n      \"Target\": \"山田太郎\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"click\",\n      \"Target\": \"id=submit\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "予約は次のpromptダイアログ1回分だけに効きます。このモデルでは、クリック効果で定義されたpromptに対して予約した回答が使われ、予約が無い場合の回答は未確定として扱います。",
    "status": "supported"
  },
  {
    "name": "assert",
    "category": "検証",
    "syntax": "assert | 変数名 | 期待値",
    "description": "Targetに書いた変数の値を文字列に変換し、Valueの期待値と一致するか検証します。不一致の場合はエラーでマクロを停止します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"store\",\n      \"Target\": \"3\",\n      \"Value\": \"count\"\n    },\n    {\n      \"Command\": \"assert\",\n      \"Target\": \"count\",\n      \"Value\": \"3\"\n    }\n  ]\n}",
    "caution": "変数名は${}を付けずに書きます（公式コマンド一覧の指定）。比較は文字列として行われるため、数値も文字列表現で比べられます。",
    "status": "supported"
  },
  {
    "name": "verify",
    "category": "検証",
    "syntax": "verify | 変数名 | 期待値",
    "description": "Targetに書いた変数の値を文字列に変換し、Valueの期待値と一致するか検証します。不一致でもマクロは止めず、エラーをログに残して次へ進み、!statusOKがfalseになります。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"store\",\n      \"Target\": \"3\",\n      \"Value\": \"count\"\n    },\n    {\n      \"Command\": \"verify\",\n      \"Target\": \"count\",\n      \"Value\": \"3\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"継続します\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "変数名は${}を付けずに書きます（公式コマンド一覧の指定）。比較は文字列として行われます。",
    "status": "supported"
  },
  {
    "name": "assertAlert",
    "category": "検証",
    "syntax": "assertAlert | 期待するダイアログ文字列",
    "description": "直前に表示されたalertダイアログの文字列がTargetと一致するか検証します。不一致の場合はエラーでマクロを停止します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"click\",\n      \"Target\": \"id=submit\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"assertAlert\",\n      \"Target\": \"送信しました\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "製品ではダイアログは自動で閉じられます。このモデルでは、クリック効果（onClickのalert）で記録されたダイアログが対象で、ダイアログが出ていない場合は検証できません。",
    "status": "supported"
  },
  {
    "name": "assertConfirmation",
    "category": "検証",
    "syntax": "assertConfirmation | 期待するダイアログ文字列",
    "description": "直前に表示されたconfirmダイアログの文字列がTargetと一致するか検証します。不一致の場合はエラーでマクロを停止します。confirmの結果自体は製品の組み込み動作で受理（true）として扱われます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"click\",\n      \"Target\": \"id=submit\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"assertConfirmation\",\n      \"Target\": \"送信しますか？\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "製品ではダイアログは自動で閉じられます。このモデルでは、クリック効果（onClickのconfirm）で記録されたダイアログが対象です。",
    "status": "supported"
  },
  {
    "name": "assertPrompt",
    "category": "検証",
    "syntax": "assertPrompt | 期待するダイアログ文字列",
    "description": "直前に表示されたpromptダイアログの文字列がTargetと一致するか検証します。不一致の場合はエラーでマクロを停止します。ダイアログへの回答はanswerOnNextPromptで予約します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"answerOnNextPrompt\",\n      \"Target\": \"山田\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"click\",\n      \"Target\": \"id=submit\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"assertPrompt\",\n      \"Target\": \"名前を入力してください\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "製品ではダイアログは自動で閉じられます。このモデルでは、クリック効果（onClickのprompt）で記録されたダイアログが対象です。",
    "status": "supported"
  },
  {
    "name": "verifyAlert",
    "category": "検証",
    "syntax": "verifyAlert | 期待するダイアログ文字列",
    "description": "直前に表示されたalertダイアログの文字列がTargetと一致するか検証します。不一致でもマクロは止めず、エラーをログに残して次へ進みます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"click\",\n      \"Target\": \"id=submit\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"verifyAlert\",\n      \"Target\": \"送信しました\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"継続します\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "公式ページでは、Ui.Vision本体はverifyAlert／verifyConfirmation／verifyPromptを提供していないと明記されています（ダイアログは自動で閉じられるため不要という理由）。このモデルでは学習用に、verifyの意味論（不一致でも継続）で扱います。",
    "status": "supported"
  },
  {
    "name": "verifyConfirmation",
    "category": "検証",
    "syntax": "verifyConfirmation | 期待するダイアログ文字列",
    "description": "直前に表示されたconfirmダイアログの文字列がTargetと一致するか検証します。不一致でもマクロは止めず、エラーをログに残して次へ進みます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"click\",\n      \"Target\": \"id=submit\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"verifyConfirmation\",\n      \"Target\": \"送信しますか？\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"継続します\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "公式ページでは、Ui.Vision本体はverifyAlert／verifyConfirmation／verifyPromptを提供していないと明記されています（ダイアログは自動で閉じられるため不要という理由）。このモデルでは学習用に、verifyの意味論（不一致でも継続）で扱います。",
    "status": "supported"
  },
  {
    "name": "verifyPrompt",
    "category": "検証",
    "syntax": "verifyPrompt | 期待するダイアログ文字列",
    "description": "直前に表示されたpromptダイアログの文字列がTargetと一致するか検証します。不一致でもマクロは止めず、エラーをログに残して次へ進みます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"answerOnNextPrompt\",\n      \"Target\": \"山田\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"click\",\n      \"Target\": \"id=submit\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"verifyPrompt\",\n      \"Target\": \"名前を入力してください\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"継続します\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "公式ページでは、Ui.Vision本体はverifyAlert／verifyConfirmation／verifyPromptを提供していないと明記されています（ダイアログは自動で閉じられるため不要という理由）。このモデルでは学習用に、verifyの意味論（不一致でも継続）で扱います。",
    "status": "supported"
  },
  {
    "name": "assertChecked",
    "category": "検証",
    "syntax": "assertChecked | ロケーター",
    "description": "対象のチェックボックスまたはラジオボタンがチェックされているか検証します。チェックされていなければエラーでマクロを停止します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"assertChecked\",\n      \"Target\": \"id=agree\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは要素のcheckedで判定します。",
    "status": "supported"
  },
  {
    "name": "assertNOTChecked",
    "category": "検証",
    "syntax": "assertNOTChecked | ロケーター",
    "description": "対象のチェックボックスまたはラジオボタンがチェックされていないか検証します。チェックされていればエラーでマクロを停止します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"assertNOTChecked\",\n      \"Target\": \"id=agree\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは要素のcheckedで判定します。",
    "status": "supported"
  },
  {
    "name": "verifyChecked",
    "category": "検証",
    "syntax": "verifyChecked | ロケーター",
    "description": "対象のチェックボックスまたはラジオボタンがチェックされているか検証します。チェックされていなくてもマクロは止めず、エラーをログに残して次へ進みます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"verifyChecked\",\n      \"Target\": \"id=agree\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"継続します\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは要素のcheckedで判定します。",
    "status": "supported"
  },
  {
    "name": "verifyNOTChecked",
    "category": "検証",
    "syntax": "verifyNOTChecked | ロケーター",
    "description": "対象のチェックボックスまたはラジオボタンがチェックされていないか検証します。チェックされていてもマクロは止めず、エラーをログに残して次へ進みます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"verifyNOTChecked\",\n      \"Target\": \"id=agree\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"継続します\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは要素のcheckedで判定します。",
    "status": "supported"
  },
  {
    "name": "assertEditable",
    "category": "検証",
    "syntax": "assertEditable | ロケーター",
    "description": "対象要素が編集できる状態か検証します。編集できなければエラーでマクロを停止します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"assertEditable\",\n      \"Target\": \"id=name\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは要素のdisabled／readonly（編集可能要素ではcontentEditable）で判定します。",
    "status": "supported"
  },
  {
    "name": "assertNOTEditable",
    "category": "検証",
    "syntax": "assertNOTEditable | ロケーター",
    "description": "対象要素が編集できない状態か検証します。編集できる状態であればエラーでマクロを停止します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"assertNOTEditable\",\n      \"Target\": \"id=result\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは要素のdisabled／readonly（編集可能要素ではcontentEditable）で判定します。",
    "status": "supported"
  },
  {
    "name": "verifyEditable",
    "category": "検証",
    "syntax": "verifyEditable | ロケーター",
    "description": "対象要素が編集できる状態か検証します。編集できなくてもマクロは止めず、エラーをログに残して次へ進みます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"verifyEditable\",\n      \"Target\": \"id=name\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"継続します\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは要素のdisabled／readonly（編集可能要素ではcontentEditable）で判定します。",
    "status": "supported"
  },
  {
    "name": "verifyNOTEditable",
    "category": "検証",
    "syntax": "verifyNOTEditable | ロケーター",
    "description": "対象要素が編集できない状態か検証します。編集できる状態でもマクロは止めず、エラーをログに残して次へ進みます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"verifyNOTEditable\",\n      \"Target\": \"id=name\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"継続します\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは要素のdisabled／readonly（編集可能要素ではcontentEditable）で判定します。",
    "status": "supported"
  },
  {
    "name": "assertElementPresent",
    "category": "検証",
    "syntax": "assertElementPresent | ロケーター",
    "description": "対象要素がページに存在するか検証します。存在しなければエラーでマクロを停止します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"assertElementPresent\",\n      \"Target\": \"id=name\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "製品では暗黙的待機により、要素が現れるまで最大で!timeout_wait（既定10秒）待ちます。このモデルでは待機時間は再現せず、その時点のモデルページで判定します。",
    "status": "supported"
  },
  {
    "name": "assertElementNOTPresent",
    "category": "検証",
    "syntax": "assertElementNOTPresent | ロケーター",
    "description": "対象要素がページに存在しないか検証します。存在すればエラーでマクロを停止します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"assertElementNOTPresent\",\n      \"Target\": \"id=missing\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "製品では、要素が消えるまで暗黙的待機で待ちます。このモデルでは待機時間は再現せず、その時点のモデルページで判定します。",
    "status": "supported"
  },
  {
    "name": "verifyElementPresent",
    "category": "検証",
    "syntax": "verifyElementPresent | ロケーター",
    "description": "対象要素がページに存在するか検証します。存在しなくてもマクロは止めず、エラーをログに残して次へ進みます。結果は!statusOKでも判定できます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"verifyElementPresent\",\n      \"Target\": \"id=name\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"継続します\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "製品では暗黙的待機により、要素が現れるまで最大で!timeout_wait（既定10秒）待ちます。このモデルでは待機時間は再現せず、その時点のモデルページで判定します。",
    "status": "supported"
  },
  {
    "name": "verifyElementNOTPresent",
    "category": "検証",
    "syntax": "verifyElementNOTPresent | ロケーター",
    "description": "対象要素がページに存在しないか検証します。存在してもマクロは止めず、エラーをログに残して次へ進みます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"verifyElementNOTPresent\",\n      \"Target\": \"id=missing\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"継続します\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "製品では、要素が消えるまで暗黙的待機で待ちます。このモデルでは待機時間は再現せず、その時点のモデルページで判定します。",
    "status": "supported"
  },
  {
    "name": "verifyText",
    "category": "検証",
    "syntax": "verifyText | ロケーター | 期待パターン",
    "description": "要素のテキストを期待パターンと照合します。パターンはglob形式（*は任意の文字列、?は任意の1文字）で、exact:を付けると完全一致、regexp:を付けると正規表現として照合します。不一致でもマクロは止めず、エラーをログに残して次へ進みます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"click\",\n      \"Target\": \"id=submit\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"verifyText\",\n      \"Target\": \"id=result\",\n      \"Value\": \"完了\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"継続します\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "assertTextのソフト版です。照合規則はassertTextと同じです。",
    "status": "supported"
  },
  {
    "name": "assertTitle",
    "category": "検証",
    "syntax": "assertTitle | 期待するタイトル",
    "description": "現在のページのタイトルがTargetの文字列と一致するか検証します。不一致の場合はエラーでマクロを停止します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"assertTitle\",\n      \"Target\": \"\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルではページのtitle（モデルで未設定の場合は空文字）が対象です。",
    "status": "supported"
  },
  {
    "name": "verifyTitle",
    "category": "検証",
    "syntax": "verifyTitle | 期待するタイトル",
    "description": "現在のページのタイトルがTargetの文字列と一致するか検証します。不一致でもマクロは止めず、エラーをログに残して次へ進みます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"verifyTitle\",\n      \"Target\": \"\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"継続します\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルではページのtitle（モデルで未設定の場合は空文字）が対象です。",
    "status": "supported"
  },
  {
    "name": "assertValue",
    "category": "検証",
    "syntax": "assertValue | ロケーター | 期待パターン",
    "description": "要素のvalue（値）を期待パターンと照合します。パターンの照合規則はassertTextと同じglob／exact:／regexp:です。不一致の場合はエラーでマクロを停止します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"type\",\n      \"Target\": \"id=name\",\n      \"Value\": \"学習者\"\n    },\n    {\n      \"Command\": \"assertValue\",\n      \"Target\": \"id=name\",\n      \"Value\": \"学習者\"\n    }\n  ]\n}",
    "caution": "値を持つ要素（入力欄など）が対象です。テキストの照合にはassertTextを使います。",
    "status": "supported"
  },
  {
    "name": "verifyValue",
    "category": "検証",
    "syntax": "verifyValue | ロケーター | 期待パターン",
    "description": "要素のvalue（値）を期待パターンと照合します。パターンの照合規則はassertTextと同じglob／exact:／regexp:です。不一致でもマクロは止めず、エラーをログに残して次へ進みます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"type\",\n      \"Target\": \"id=name\",\n      \"Value\": \"学習者\"\n    },\n    {\n      \"Command\": \"verifyValue\",\n      \"Target\": \"id=name\",\n      \"Value\": \"学習者\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"継続します\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "値を持つ要素（入力欄など）が対象です。",
    "status": "supported"
  },
  {
    "name": "check",
    "category": "操作",
    "syntax": "check | ロケーター",
    "description": "対象のチェックボックスまたはラジオボタンをチェック状態にします。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"check\",\n      \"Target\": \"id=agree\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは要素のcheckedをtrueにします。チェックを外すにはuncheckを使います。",
    "status": "supported"
  },
  {
    "name": "uncheck",
    "category": "操作",
    "syntax": "uncheck | ロケーター",
    "description": "対象のチェックボックスまたはラジオボタンのチェックを外します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"uncheck\",\n      \"Target\": \"id=agree\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは要素のcheckedをfalseにします。",
    "status": "supported"
  },
  {
    "name": "clickAndWait",
    "category": "操作",
    "syntax": "clickAndWait | ロケーター",
    "description": "要素をクリックし、続けてページの読み込みイベントが発生するまで待ちます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"clickAndWait\",\n      \"Target\": \"id=submit\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは、ページ遷移や効果はモデルに定義された場合だけ反映され、読み込み待ちそのものは再現しません（clickと同じ扱いです）。",
    "status": "supported"
  },
  {
    "name": "clickAt",
    "category": "操作",
    "syntax": "clickAt | ロケーター | x,y",
    "description": "要素の内側の、Target要素を基準にした相対座標（x,y）の位置をクリックします。canvas要素の中の特定位置をクリックするような場合に使います。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"clickAt\",\n      \"Target\": \"id=canvas\",\n      \"Value\": \"10,20\"\n    }\n  ]\n}",
    "caution": "座標は要素の左上を基準にした相対位置です。このモデルではクリック位置の視覚的な結果までは再現されません。製品のビジュアルUIテストのページでは、clickAtは旧コマンドとして扱われています。",
    "status": "supported"
  },
  {
    "name": "comment",
    "category": "フロー制御",
    "syntax": "comment | コメント文",
    "description": "マクロの中にコメントを残します。実行には影響しません。コマンドをコメント化して一時的に無効にすることもできます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"comment\",\n      \"Target\": \"ここから入力を開始する\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "コメントはTargetに書きます。",
    "status": "supported"
  },
  {
    "name": "csvRead",
    "category": "CSV",
    "syntax": "csvRead | CSVファイル名",
    "description": "CSVファイルの1行を読み、各列の値を組み込み変数${!COL1}、${!COL2}…へ入れます。読む行は、ループ実行時の${!LOOP}や${!csvReadLineNumber}で決まります。読み取り後は、行の総数が${!csvReadMaxRow}に、成否が${!csvReadStatus}に入ります。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"csvRead\",\n      \"Target\": \"data.csv\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${!COL1}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "製品では、CSVはあらかじめブラウザ内ストレージ（データソース）へ読み込んでおく必要があります。このモデルでは実ファイルではなく、モデルのcsvsに定義されたテキストが対象です。カンマを含む値は二重引用符で囲みます。",
    "status": "supported"
  },
  {
    "name": "csvReadArray",
    "category": "CSV",
    "syntax": "csvReadArray | CSVファイル名 | 配列変数名",
    "description": "CSVファイルの全行を一度に読み、2次元配列としてValueの変数へ保存します。添字は0から始まります。各要素は、executeScript_Sandboxの式の中で${配列名}[行][列]の形で参照できます（例：return ${rows}[0][0];）。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"csvReadArray\",\n      \"Target\": \"data.csv\",\n      \"Value\": \"rows\"\n    },\n    {\n      \"Command\": \"executeScript_Sandbox\",\n      \"Target\": \"return ${rows}[0][0];\",\n      \"Value\": \"first\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${first}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "1行ずつ読むcsvReadとは別のコマンドです。配列の保存にはcsvsaveArrayを使います。このモデルではモデルのcsvsに定義されたテキストが対象です。このモデルでは${rows[0][0]}のような添字つき補間は扱いません。要素の参照は例のようにexecuteScript_Sandboxの式の中で${rows}[0][0]と書きます。",
    "status": "supported"
  },
  {
    "name": "csvsave",
    "category": "CSV",
    "syntax": "csvsave | CSVファイル名",
    "description": "組み込み配列${!csvLine}に積んだ値の列を1行として、CSVファイルへ保存します。2回目以降の保存では、行がファイルの末尾へ追加されます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"store\",\n      \"Target\": \"山田\",\n      \"Value\": \"!csvLine\"\n    },\n    {\n      \"Command\": \"store\",\n      \"Target\": \"東京\",\n      \"Value\": \"!csvLine\"\n    },\n    {\n      \"Command\": \"csvsave\",\n      \"Target\": \"out.csv\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "値はstoreで${!csvLine}へ1つずつ積んでから保存します。csvReadで読み取るファイルとは別に扱われます（公式ドキュメント）。このモデルではモデルのcsvsへ追記されます。",
    "status": "supported"
  },
  {
    "name": "csvsaveArray",
    "category": "CSV",
    "syntax": "csvsaveArray | 配列変数名 | CSVファイル名",
    "description": "Targetの2次元配列の内容全体を、ValueのCSVファイルへ保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"executeScript_Sandbox\",\n      \"Target\": \"return [[\\\"山田\\\",\\\"東京\\\"],[\\\"佐藤\\\",\\\"大阪\\\"]];\",\n      \"Value\": \"rows\"\n    },\n    {\n      \"Command\": \"csvsaveArray\",\n      \"Target\": \"rows\",\n      \"Value\": \"out.csv\"\n    }\n  ]\n}",
    "caution": "配列の添字は0から始まります。読み戻しにはcsvReadArrayを使います。このモデルではモデルのcsvsへ保存されます。",
    "status": "supported"
  },
  {
    "name": "do",
    "category": "フロー制御",
    "syntax": "do",
    "description": "repeatIfと対になるループの開始です。doからrepeatIfまでの本体は、条件の判定より先に実行されるため、最低でも1回は実行されます（後判定ループ）。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"store\",\n      \"Target\": \"0\",\n      \"Value\": \"count\"\n    },\n    {\n      \"Command\": \"do\",\n      \"Target\": \"\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"executeScript_Sandbox\",\n      \"Target\": \"return Number(${count}) + 1;\",\n      \"Value\": \"count\"\n    },\n    {\n      \"Command\": \"repeatIf\",\n      \"Target\": \"${count} < 3\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${count}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "対応するrepeatIfが必要です。先に条件を判定したい場合はwhileを使います。",
    "status": "supported"
  },
  {
    "name": "repeatIf",
    "category": "フロー制御",
    "syntax": "repeatIf | JavaScript式",
    "description": "doからここまでの本体を実行した後に式を評価し、真であれば本体を繰り返します。式はexecuteScript_Sandboxと同じ仕組みで評価されます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"store\",\n      \"Target\": \"0\",\n      \"Value\": \"count\"\n    },\n    {\n      \"Command\": \"do\",\n      \"Target\": \"\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"executeScript_Sandbox\",\n      \"Target\": \"return Number(${count}) + 1;\",\n      \"Value\": \"count\"\n    },\n    {\n      \"Command\": \"repeatIf\",\n      \"Target\": \"${count} < 3\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "while（先判定）と違い、本体は必ず1回は実行されます。対応するdoが無い場所では使えません。",
    "status": "supported"
  },
  {
    "name": "dragAndDropToObject",
    "category": "操作",
    "syntax": "dragAndDropToObject | ドラッグ元のロケーター | ドロップ先のロケーター",
    "description": "Targetの要素をドラッグし、Valueの要素の上へドロップします。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"dragAndDropToObject\",\n      \"Target\": \"id=item\",\n      \"Value\": \"id=box\"\n    }\n  ]\n}",
    "caution": "このモデルでは、要素の視覚的な移動や並び替えの結果までは再現されません。",
    "status": "supported"
  },
  {
    "name": "editContent",
    "category": "操作",
    "syntax": "editContent | ロケーター | HTMLテキスト",
    "description": "contentEditableな要素（リッチテキスト編集欄）の内容を、HTML形式のテキストで設定します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"editContent\",\n      \"Target\": \"id=editor\",\n      \"Value\": \"<h1>見出し</h1>\"\n    }\n  ]\n}",
    "caution": "通常の入力欄の値の設定にはtypeを使います。このモデルではcontentEditableな要素が対象です。",
    "status": "supported"
  },
  {
    "name": "executeScript",
    "category": "スクリプト",
    "syntax": "executeScript | JavaScript | 結果を保存する変数",
    "description": "ページの文脈でJavaScriptを実行し、returnした結果をValueの変数へ保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"store\",\n      \"Target\": \"100\",\n      \"Value\": \"a\"\n    },\n    {\n      \"Command\": \"executeScript\",\n      \"Target\": \"return Number(${a}) - 20;\",\n      \"Value\": \"b\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${b}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルではexecuteScript_Sandboxと同じ「return式の部分集合」で評価します。ページのDOMやwindowへアクセスする名前は未定義として停止し、任意のスクリプトは実行しません。",
    "status": "supported"
  },
  {
    "name": "forEach",
    "category": "フロー制御",
    "syntax": "forEach | 配列変数名 | 要素を入れる変数名",
    "description": "Targetの配列変数の各要素について、endまでの本体を繰り返します。各回の要素はValueの変数へ順に入ります。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"executeScript_Sandbox\",\n      \"Target\": \"return [\\\"Hello\\\",\\\"Bonjour\\\"];\",\n      \"Value\": \"words\"\n    },\n    {\n      \"Command\": \"forEach\",\n      \"Target\": \"words\",\n      \"Value\": \"word\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${word}\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"end\",\n      \"Target\": \"\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "配列変数名は${}を付けずに書きます。配列はexecuteScript_Sandboxのreturnで作れます（例：return [\"a\",\"b\"];）。ブロックの終わりはendです。",
    "status": "supported"
  },
  {
    "name": "highlight",
    "category": "操作",
    "syntax": "highlight | ロケーター",
    "description": "指定した要素を短時間ハイライト表示します。マクロのデバッグに使うコマンドです。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"highlight\",\n      \"Target\": \"id=name\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "現行のIDEでは、見つけた要素は既定で自動的にハイライトされるため、このコマンド自体は不要と公式ドキュメントが説明しています。このモデルでは表示上の効果は再現しません。",
    "status": "supported"
  },
  {
    "name": "label",
    "category": "フロー制御",
    "syntax": "label | ラベル名",
    "description": "ジャンプ先の目印を置きます。実行しても何も起きません。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"label\",\n      \"Target\": \"start\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "公式ドキュメントではlabelは非推奨とされています。このモデルでは目印として置けますが、ジャンプを行うgotoIf／gotoLabelは未対応のため、ジャンプ自体は行われません。",
    "status": "supported"
  },
  {
    "name": "mouseOver",
    "category": "操作",
    "syntax": "mouseOver | ロケーター",
    "description": "対象要素の上にマウスカーソルを重ねます。ホバーで表示が変わる要素の確認に使います。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"mouseOver\",\n      \"Target\": \"id=submit\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは、ホバーによるページの変化はモデルに定義が無い限り再現されません。",
    "status": "supported"
  },
  {
    "name": "pause",
    "category": "待機",
    "syntax": "pause | ミリ秒",
    "description": "指定したミリ秒だけ実行を止めます。5000で5秒です。0を指定するか空にすると、製品ではRESUMEボタンが押されるまで止まります。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"pause\",\n      \"Target\": \"1000\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは実際の時間の経過は再現せず、待機の指定として扱います。単位は秒ではなくミリ秒です。Targetが空の場合も不正とはせず、0と同様に待機指定として受理します（製品ではRESUMEボタンが押されるまで止まりますが、このモデルでは実際の待機は再現しません）。",
    "status": "supported"
  },
  {
    "name": "prompt",
    "category": "ダイアログ",
    "syntax": "prompt | 質問文@既定値 | 保存先変数",
    "description": "実行時にユーザーへ入力を求め、入力した値をValueの変数へ保存します。Targetは「質問文@既定値」の形で、@以降の既定値は省略できます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"prompt\",\n      \"Target\": \"名前を入力してください@名無し\",\n      \"Value\": \"userName\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${userName}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは実際の入力ダイアログは表示されないため、入力値は実行時に決まる値として扱います。既定値は入力欄の初期表示であり、回答は実行時に決まります。answerOnNextPromptで予約した値だけが確定します。製品でも、無人で実行するマクロには向きません。",
    "status": "supported"
  },
  {
    "name": "refresh",
    "category": "ブラウザ",
    "syntax": "refresh",
    "description": "現在開いているページを再読み込みします。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"refresh\",\n      \"Target\": \"\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは、再読み込みによるページの変化は再現されず、ページの状態はモデル定義どおりに扱います。",
    "status": "supported"
  },
  {
    "name": "select",
    "category": "操作",
    "syntax": "select | ロケーター | オプションロケーター",
    "description": "ドロップダウンやリストボックスから選択肢を選びます。オプションロケーターはlabel=／value=／index=／id=の形で、接頭辞が無い場合はラベルで照合します。label=では*を使った部分一致もできます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"select\",\n      \"Target\": \"id=lang\",\n      \"Value\": \"label=日本語\"\n    }\n  ]\n}",
    "caution": "このモデルでは要素のoptions（label／value／selected）で選択状態を表します。選択でページが再読み込みされる場合はselectAndWaitを使います。",
    "status": "supported"
  },
  {
    "name": "selectAndWait",
    "category": "操作",
    "syntax": "selectAndWait | ロケーター | オプションロケーター",
    "description": "ドロップダウンやリストボックスから選択肢を選び、続けてページの読み込みが完了するまで待ちます。オプションロケーターの書き方はselectと同じです。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"selectAndWait\",\n      \"Target\": \"id=lang\",\n      \"Value\": \"label=日本語\"\n    }\n  ]\n}",
    "caution": "このモデルでは、読み込み待ちそのものは再現しません（selectと同じ扱いです）。",
    "status": "supported"
  },
  {
    "name": "sendKeys",
    "category": "操作",
    "syntax": "sendKeys | ロケーター | 送信する文字列",
    "description": "対象要素へキー入力を1文字ずつ送ります。typeと違い、既存の内容は置き換えずに追記されます。特殊キーとして${KEY_ENTER}を送るとEnterキーとして働きます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"type\",\n      \"Target\": \"id=name\",\n      \"Value\": \"検索語\"\n    },\n    {\n      \"Command\": \"sendKeys\",\n      \"Target\": \"id=name\",\n      \"Value\": \"${KEY_ENTER}\"\n    }\n  ]\n}",
    "caution": "Ui.Visionの実装で公式に使える特殊キーは${KEY_ENTER}のみで、${KEY_DOWN}などは公式にはサポートされません。",
    "status": "supported"
  },
  {
    "name": "setWindowSize",
    "category": "ブラウザ",
    "syntax": "setWindowSize | 幅x高さ",
    "description": "ブラウザのビューポート（ページの表示領域）を、指定した幅と高さへ変更します。例：375x667。さまざまな画面サイズでの表示確認に使います。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"setWindowSize\",\n      \"Target\": \"375x667\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルではviewportとして幅と高さを記録するだけで、実際の表示は変わりません。区切りはxです（resizeの@とは異なります）。",
    "status": "supported"
  },
  {
    "name": "resize",
    "category": "ブラウザ",
    "syntax": "resize | 幅@高さ",
    "description": "ブラウザのビューポート（ページの表示領域）を、指定した幅と高さへ変更します。setWindowSizeと同じ働きをする旧名です。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"resize\",\n      \"Target\": \"375@667\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "公式ドキュメントでは非推奨で、後継はsetWindowSizeです。区切り文字も異なり、resizeは@、setWindowSizeはxです。このモデルではviewportとして幅と高さを記録します。",
    "status": "supported"
  },
  {
    "name": "storeAttribute",
    "category": "保存",
    "syntax": "storeAttribute | ロケーター@属性名 | 保存先変数",
    "description": "要素の属性値（hrefやaltなど）を変数へ保存します。Targetはロケーターの後に@属性名を続けて書きます。要素が見つからない場合はエラーにせず、変数に#LNFが保存され、!statusOKがfalseになります。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"storeAttribute\",\n      \"Target\": \"id=link@href\",\n      \"Value\": \"url\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${url}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "入力欄（input）の値の取得には使えません（公式ドキュメント）。このモデルでは、要素の属性として定義された値が対象です。",
    "status": "supported"
  },
  {
    "name": "storeChecked",
    "category": "保存",
    "syntax": "storeChecked | ロケーター | 保存先変数",
    "description": "チェックボックスまたはラジオボタンのチェック状態を、trueまたはfalseとして変数へ保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"storeChecked\",\n      \"Target\": \"id=agree\",\n      \"Value\": \"agreed\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${agreed}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "判定だけならassertChecked／verifyCheckedも使えます。",
    "status": "supported"
  },
  {
    "name": "storeEval",
    "category": "スクリプト",
    "syntax": "storeEval | JavaScript式 | 保存先変数",
    "description": "JavaScript式を評価し、その結果をValueの変数へ保存します。executeScriptと違い、returnは書かず、式の値そのものが結果になります。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"store\",\n      \"Target\": \"3\",\n      \"Value\": \"n\"\n    },\n    {\n      \"Command\": \"storeEval\",\n      \"Target\": \"Number(${n}) + 1\",\n      \"Value\": \"m\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${m}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "公式ドキュメントでは非推奨で、後継はexecuteScriptです。このモデルではexecuteScriptと同じ「return式の部分集合」の範囲で評価します。storedVarsは使えません。",
    "status": "supported"
  },
  {
    "name": "storeTitle",
    "category": "保存",
    "syntax": "storeTitle |  | 保存先変数",
    "description": "現在のページのタイトルを、Valueの変数へ保存します。Targetは使いません。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"storeTitle\",\n      \"Target\": \"\",\n      \"Value\": \"pageTitle\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${pageTitle}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "旧名はstoreLocationです。このモデルではページのtitle（モデルで未設定の場合は空文字）が保存されます。",
    "status": "supported"
  },
  {
    "name": "storeXpathCount",
    "category": "保存",
    "syntax": "storeXpathCount | xpath=… | 保存先変数",
    "description": "TargetのXPathに一致する要素の数を数え、Valueの変数へ保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"storeXpathCount\",\n      \"Target\": \"xpath=//a\",\n      \"Value\": \"linkCount\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${linkCount}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは実DOMではなくモデルページが対象のため、数えられるのはモデルに定義された要素の範囲に限ります。XPath は評価せず、Target と完全一致するロケーターキーを持つ要素だけを数えます。",
    "status": "supported"
  },
  {
    "name": "ThrowError",
    "category": "フロー制御",
    "syntax": "ThrowError | エラーメッセージ",
    "description": "任意のエラーを発生させてマクロを停止し、Targetのメッセージをログへ表示します。ifと組み合わせると、独自のエラー条件を作れます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"store\",\n      \"Target\": \"0\",\n      \"Value\": \"count\"\n    },\n    {\n      \"Command\": \"ThrowError\",\n      \"Target\": \"countが0のため処理できません\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "名前のとおり、実行すると必ずエラーで停止します。",
    "status": "supported"
  },
  {
    "name": "waitForElementPresent",
    "category": "待機",
    "syntax": "waitForElementPresent | ロケーター",
    "description": "対象要素がページに現れるまで待ちます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"waitForElementPresent\",\n      \"Target\": \"id=result\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "現行のIDEは暗黙的待機の仕組みを持つため、このコマンドは不要と公式ドキュメントが説明しています。このモデルでは待機は再現せず、その時点のモデルページに要素が無ければエラーになります。",
    "status": "supported"
  },
  {
    "name": "waitForElementToLoad",
    "category": "待機",
    "syntax": "waitForElementToLoad | ロケーター",
    "description": "対象要素がページに現れるまで待ちます。waitForElementPresentの旧名で、公式ドキュメントでは同じページで扱われています。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"waitForElementToLoad\",\n      \"Target\": \"id=result\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "現行のIDEは暗黙的待機の仕組みを持つため、このコマンドは不要と公式ドキュメントが説明しています。このモデルでは待機は再現せず、その時点のモデルページに要素が無ければエラーになります。",
    "status": "supported"
  },
  {
    "name": "waitForPageToLoad",
    "category": "待機",
    "syntax": "waitForPageToLoad | 最大待機ミリ秒",
    "description": "ページの読み込みイベントが発生するまで待ちます。Targetは最大で待つ時間（ミリ秒）です。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"waitForPageToLoad\",\n      \"Target\": \"3000\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "…andWait系のコマンドには読み込み待ちが含まれているため、通常は不要です。このモデルでは読み込みイベントは再現せず、現在のページのまま次へ進みます。",
    "status": "supported"
  },
  {
    "name": "waitForVisible",
    "category": "待機",
    "syntax": "waitForVisible | ロケーター",
    "description": "対象要素がページに存在し、かつ表示されるまで待ちます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"waitForVisible\",\n      \"Target\": \"id=result\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "このモデルでは要素のvisible（モデルで未設定の場合は表示されているものとして扱います）で判定し、実際の待機時間は再現しません。",
    "status": "supported"
  },
  {
    "name": "executeAsyncScript",
    "category": "スクリプト",
    "syntax": "executeAsyncScript | JavaScript | 結果を保存する変数",
    "description": "非同期のJavaScript（コールバックやPromiseを使う処理）を実行し、完了後の結果をValueの変数へ保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"executeAsyncScript\",\n      \"Target\": \"return 1;\",\n      \"Value\": \"x\"\n    }\n  ]\n}",
    "caution": "未対応：非同期のコールバック実行はこのモデルでは扱っていないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "run",
    "category": "フロー制御",
    "syntax": "run | マクロ名",
    "description": "別のマクロをサブルーチンとして呼び出し、終わったら呼び出し元へ戻ります。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"run\",\n      \"Target\": \"SubMacro\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：呼び出し先のマクロはこのモデルには無いため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "selectFrame",
    "category": "ブラウザ",
    "syntax": "selectFrame | index=番号 / relative=parent / relative=top",
    "description": "操作対象をフレーム（iframeを含む）へ切り替えます。index=番号で番号指定、relative=parentで親フレーム、relative=topで最上位のページへ戻ります。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"selectFrame\",\n      \"Target\": \"index=0\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：フレームはこのモデルでは扱っていないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "sourceExtract",
    "category": "ページソース",
    "syntax": "sourceExtract | 検索文字列または正規表現 | 保存先変数",
    "description": "ページのHTMLソースを対象に、検索文字列（*が可変部分）または正規表現で一致した部分を取り出し、変数へ保存します。一致が無い場合はエラーにせず#nomatchfoundが保存されます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"sourceExtract\",\n      \"Target\": \"Price: *\",\n      \"Value\": \"price\"\n    }\n  ]\n}",
    "caution": "未対応：ページのHTMLソースはこのモデルでは扱っていないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "sourceSearch",
    "category": "ページソース",
    "syntax": "sourceSearch | 検索文字列または正規表現 | 保存先変数",
    "description": "ページのHTMLソースを対象に、検索文字列（*が可変部分）または正規表現に一致する件数を数え、変数へ保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"sourceSearch\",\n      \"Target\": \"Price: *\",\n      \"Value\": \"hits\"\n    }\n  ]\n}",
    "caution": "未対応：ページのHTMLソースはこのモデルでは扱っていないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "gotoIf",
    "category": "フロー制御",
    "syntax": "gotoIf | JavaScript式 | ラベル名",
    "description": "式が真の場合に、Valueのラベルへジャンプします。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"gotoIf\",\n      \"Target\": \"${count} == 0\",\n      \"Value\": \"zero\"\n    }\n  ]\n}",
    "caution": "未対応：ラベルへのジャンプは、到達可能な経路を列挙するこのモデルでは扱いません。実行すると未対応として停止します。製品の公式ドキュメントでもgotoIfは非推奨とされています。",
    "status": "unsupported"
  },
  {
    "name": "gotoLabel",
    "category": "フロー制御",
    "syntax": "gotoLabel | ラベル名",
    "description": "無条件に、Targetのラベルへジャンプします。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"gotoLabel\",\n      \"Target\": \"start\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：ラベルへのジャンプは、到達可能な経路を列挙するこのモデルでは扱いません。実行すると未対応として停止します。製品の公式ドキュメントでもgotoLabelは非推奨とされています。",
    "status": "unsupported"
  },
  {
    "name": "onError",
    "category": "フロー制御",
    "syntax": "onError | #restart / #goto | ラベル名",
    "description": "コマンドでエラーが起きたときの動作を指定します。#restartはマクロを最初から実行し直し、#gotoはValueのラベルへジャンプします。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"onError\",\n      \"Target\": \"#goto\",\n      \"Value\": \"errorLabel\"\n    }\n  ]\n}",
    "caution": "未対応：エラー時のジャンプや再開は、到達可能な経路を列挙するこのモデルでは扱いません。実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "storedVars",
    "category": "スクリプト",
    "syntax": "storedVars['変数名']",
    "description": "コマンドではなく、storeEvalなどの式の中でマクロ変数そのものを参照するためのオブジェクトです。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"storeEval\",\n      \"Target\": \"storedVars['n']\",\n      \"Value\": \"m\"\n    }\n  ]\n}",
    "caution": "未対応：このモデルでは式の語彙として提供していないため、実行すると未対応として停止します。公式ドキュメントでも非推奨とされています。",
    "status": "unsupported"
  },
  {
    "name": "bringBrowserToForeground",
    "category": "ブラウザ",
    "syntax": "bringBrowserToForeground",
    "description": "実ブラウザのアクティブなタブを前面へ出します。入力要素へのフォーカスなど、前面化が必要な操作の前に使います。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"bringBrowserToForeground\",\n      \"Target\": \"\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：実ブラウザのウィンドウ操作はブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "captureScreenshot",
    "category": "ファイル・画面",
    "syntax": "captureScreenshot | ファイル名",
    "description": "表示中のビューポート（画面に見えている範囲）のスクリーンショットを撮り、指定したファイル名で保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"captureScreenshot\",\n      \"Target\": \"shot.png\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：実画面のスクリーンショット取得が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "captureEntirePageScreenshot",
    "category": "ファイル・画面",
    "syntax": "captureEntirePageScreenshot | ファイル名",
    "description": "ページ全体（スクロール範囲を含む）のスクリーンショットを撮り、指定したファイル名で保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"captureEntirePageScreenshot\",\n      \"Target\": \"full.png\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：実画面のスクリーンショット取得が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "deleteCookies",
    "category": "ブラウザ",
    "syntax": "deleteCookies",
    "description": "現在のウェブサイトのCookieをすべて削除します。旧名はdeleteAllCookiesです。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"deleteCookies\",\n      \"Target\": \"\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：実ブラウザのCookieストアを操作するため、ブラウザ内シミュレーションでは再現できません。実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "localStorageExport",
    "category": "ファイル・画面",
    "syntax": "localStorageExport | ファイル名",
    "description": "ブラウザ内ストレージに保持されたCSVなどのデータを、実ファイルへ書き出します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"localStorageExport\",\n      \"Target\": \"data.csv\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：実ファイルへの書き出しが必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "saveItem",
    "category": "ファイル・画面",
    "syntax": "saveItem | URLなど | 保存先",
    "description": "ブラウザが保持する画像などのアイテムを、実ファイルとして保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"saveItem\",\n      \"Target\": \"https://example.test/image.png\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：実ファイルの保存が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "selectWindow",
    "category": "ブラウザ",
    "syntax": "selectWindow | tab=番号など",
    "description": "操作対象のブラウザタブを切り替えます。tab=0が現在のタブ、tab=1が右隣のタブです。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"selectWindow\",\n      \"Target\": \"tab=1\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：実ブラウザのタブ切り替えが必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "setProxy",
    "category": "ブラウザ",
    "syntax": "setProxy | プロキシ指定",
    "description": "マクロ実行時に使うプロキシサーバーの設定を変更します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"setProxy\",\n      \"Target\": \"proxy.example:8080\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：ネットワーク（プロキシ）設定の変更が必要で、オフラインのシミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "storeImage",
    "category": "ファイル・画面",
    "syntax": "storeImage | ロケーターなど | 保存先",
    "description": "ページ要素のスクリーンショットを撮って保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"storeImage\",\n      \"Target\": \"id=logo\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：実画面のスクリーンショット取得が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "OnDownload",
    "category": "ファイル・画面",
    "syntax": "OnDownload | ファイル名",
    "description": "この後に起きるファイルのダウンロードを、指定したファイル名で受け取るようあらかじめ設定します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"OnDownload\",\n      \"Target\": \"report.pdf\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：実ファイルのダウンロード制御が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "XClick",
    "category": "デスクトップ自動化",
    "syntax": "XClick | 画像名@信頼度",
    "description": "画面のスクリーンショットから参照画像を探し、見つけた位置の中心を、OSレベルの実マウス入力でクリックします。画像名の後に@0.8のように一致の信頼度を付けられます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"XClick\",\n      \"Target\": \"button.png\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：画像照合とRealUser XModuleによる実入力イベントが必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "XMove",
    "category": "デスクトップ自動化",
    "syntax": "XMove | 画像名@信頼度",
    "description": "画面のスクリーンショットから参照画像を探し、見つけた位置の中心へ、OSレベルの実マウス入力でカーソルを移動します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"XMove\",\n      \"Target\": \"button.png\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：画像照合とRealUser XModuleによる実入力イベントが必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "XClickRelative",
    "category": "デスクトップ自動化",
    "syntax": "XClickRelative | 画像名（緑／ピンク枠付き）",
    "description": "参照画像（緑枠）を見つけ、その内側に描かれたピンク枠の相対位置を、OSレベルの実マウス入力でクリックします。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"XClickRelative\",\n      \"Target\": \"button_relative.png\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：画像照合とRealUser XModuleによる実入力イベントが必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "XMoveRelative",
    "category": "デスクトップ自動化",
    "syntax": "XMoveRelative | 画像名（緑／ピンク枠付き）",
    "description": "参照画像（緑枠）を見つけ、その内側に描かれたピンク枠の相対位置へ、OSレベルの実マウス入力でカーソルを移動します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"XMoveRelative\",\n      \"Target\": \"button_relative.png\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：画像照合とRealUser XModuleによる実入力イベントが必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "XClickText",
    "category": "デスクトップ自動化",
    "syntax": "XClickText | 文字列",
    "description": "画面上の文字をOCRで探し、見つけた位置をOSレベルの実マウス入力でクリックします。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"XClickText\",\n      \"Target\": \"送信\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：OCR（画面の文字認識）と実入力イベントが必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "XMoveText",
    "category": "デスクトップ自動化",
    "syntax": "XMoveText | 文字列",
    "description": "画面上の文字をOCRで探し、見つけた位置へOSレベルの実マウス入力でカーソルを移動します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"XMoveText\",\n      \"Target\": \"送信\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：OCR（画面の文字認識）と実入力イベントが必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "XClickTextRelative",
    "category": "デスクトップ自動化",
    "syntax": "XClickTextRelative | 文字列（相対範囲指定付き）",
    "description": "画面上の文字をOCRで探し、その文字を基準にした相対位置を、OSレベルの実マウス入力でクリックします。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"XClickTextRelative\",\n      \"Target\": \"送信\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：OCR（画面の文字認識）と実入力イベントが必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "XMoveTextRelative",
    "category": "デスクトップ自動化",
    "syntax": "XMoveTextRelative | 文字列（相対範囲指定付き）",
    "description": "画面上の文字をOCRで探し、その文字を基準にした相対位置へ、OSレベルの実マウス入力でカーソルを移動します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"XMoveTextRelative\",\n      \"Target\": \"送信\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：OCR（画面の文字認識）と実入力イベントが必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "XMouseWheel",
    "category": "デスクトップ自動化",
    "syntax": "XMouseWheel | 回転量",
    "description": "OSレベルの実マウス入力でマウスホイールを回します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"XMouseWheel\",\n      \"Target\": \"3\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：RealUser XModuleによる実入力イベントが必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "XType",
    "category": "デスクトップ自動化",
    "syntax": "XType | 文字列",
    "description": "OSレベルの実キーボード入力で文字列を入力します。${KEY_ENTER}や${KEY_TAB}などの特殊キーも送れます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"XType\",\n      \"Target\": \"hello${KEY_ENTER}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：RealUser XModuleによる実入力イベントが必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。ページ内の入力にはtype／sendKeysを使います。",
    "status": "unsupported"
  },
  {
    "name": "XRun",
    "category": "デスクトップ自動化",
    "syntax": "XRun | プログラムまたはスクリプト",
    "description": "外部のプログラムやスクリプトを起動します。完了を待たずに次へ進みます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"XRun\",\n      \"Target\": \"notepad.exe\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：外部プログラムの起動が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "XRunAndWait",
    "category": "デスクトップ自動化",
    "syntax": "XRunAndWait | プログラムまたはスクリプト",
    "description": "外部のプログラムやスクリプトを起動し、終了するまで待ってから次へ進みます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"XRunAndWait\",\n      \"Target\": \"notepad.exe\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：外部プログラムの起動と完了待ちが必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "XDesktopAutomation",
    "category": "デスクトップ自動化",
    "syntax": "XDesktopAutomation | true / false",
    "description": "自動化の対象をウェブページからデスクトップ全体へ（またはその逆へ）切り替えます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"XDesktopAutomation\",\n      \"Target\": \"true\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：デスクトップ全体を対象にする実画面操作が前提のため、ブラウザ内シミュレーションでは再現できません。実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "CaptureDesktopScreenshot",
    "category": "デスクトップ自動化",
    "syntax": "CaptureDesktopScreenshot | ファイル名",
    "description": "デスクトップ全体のスクリーンショットを撮り、指定したファイル名で保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"CaptureDesktopScreenshot\",\n      \"Target\": \"desktop.png\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：実画面のスクリーンショット取得が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "visualAssert",
    "category": "画像認識",
    "syntax": "visualAssert | 画像名@信頼度",
    "description": "画面のスクリーンショットの中から参照画像を探し、見つからなければエラーでマクロを停止します。画像が現れるまで!timeout_wait秒待ちます。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"visualAssert\",\n      \"Target\": \"button.png\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：コンピュータビジョンによる画像照合が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "visualVerify",
    "category": "画像認識",
    "syntax": "visualVerify | 画像名@信頼度",
    "description": "画面のスクリーンショットの中から参照画像を探し、見つからなければ警告をログに残して次へ進みます。見つけた位置は組み込み変数!imageX／!imageYに入ります。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"visualVerify\",\n      \"Target\": \"button.png\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：コンピュータビジョンによる画像照合が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "visualSearch",
    "category": "画像認識",
    "syntax": "visualSearch | 画像名 | 件数を保存する変数",
    "description": "画面のスクリーンショットの中から参照画像に一致する箇所の数を数え、Valueの変数へ保存します。見つからなければ0です。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"visualSearch\",\n      \"Target\": \"button.png\",\n      \"Value\": \"matches\"\n    }\n  ]\n}",
    "caution": "未対応：コンピュータビジョンによる画像照合が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "visionLimitSearchArea",
    "category": "画像認識",
    "syntax": "visionLimitSearchArea | viewport / full / area=x1,y1,x2,y2",
    "description": "画像照合の探索範囲を切り替えます。viewportは表示中の範囲、fullはページ全体、area=では左上と右下の座標で範囲を直接指定します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"visionLimitSearchArea\",\n      \"Target\": \"full\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：画像照合の探索範囲の切り替えであり、画像照合自体をブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "visionLimitSearchAreaRelative",
    "category": "画像認識",
    "syntax": "visionLimitSearchAreaRelative | 画像名（緑／ピンク枠付き）",
    "description": "参照画像（緑枠）を見つけ、その内側に描かれたピンク枠の相対位置を、画像照合の新しい探索範囲にします。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"visionLimitSearchAreaRelative\",\n      \"Target\": \"area_relative.png\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：画像照合が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "visionLimitSearchAreaByTextRelative",
    "category": "画像認識",
    "syntax": "visionLimitSearchAreaByTextRelative | 文字列（相対範囲指定付き）",
    "description": "画面上の文字をOCRで探し、その文字を基準にした相対位置を、画像照合の新しい探索範囲にします。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"visionLimitSearchAreaByTextRelative\",\n      \"Target\": \"送信\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "caution": "未対応：画像照合とOCR（画面の文字認識）が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。公式ページの見出し表記はvisionLimitSearchAreaBYTEXTRelativeです。",
    "status": "unsupported"
  },
  {
    "name": "visualGetPixelColor",
    "category": "画像認識",
    "syntax": "visualGetPixelColor | x,y | 色を保存する変数",
    "description": "画面上の指定位置のピクセルの色を、#142467のようなRGBの16進数表記で変数へ保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"visualGetPixelColor\",\n      \"Target\": \"100,200\",\n      \"Value\": \"color\"\n    }\n  ]\n}",
    "caution": "未対応：実画面のピクセル色の取得が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "OCRExtract",
    "category": "OCR",
    "syntax": "OCRExtract | 対象範囲 | 保存先変数",
    "description": "画面や画像の範囲からOCRでテキストを読み取り、変数へ保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"OCRExtract\",\n      \"Target\": \"viewport\",\n      \"Value\": \"text\"\n    }\n  ]\n}",
    "caution": "未対応：OCR（画面の文字認識）が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "OCRExtractRelative",
    "category": "OCR",
    "syntax": "OCRExtractRelative | 画像名（緑／ピンク枠付き） | 保存先変数",
    "description": "参照画像（緑枠）を見つけ、その内側に描かれたピンク枠の相対範囲から、OCRでテキストを読み取り変数へ保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"OCRExtractRelative\",\n      \"Target\": \"label_relative.png\",\n      \"Value\": \"text\"\n    }\n  ]\n}",
    "caution": "未対応：OCR（画面の文字認識）と画像照合が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "OCRExtractByTextRelative",
    "category": "OCR",
    "syntax": "OCRExtractByTextRelative | 文字列（相対範囲指定付き） | 保存先変数",
    "description": "画面上の文字をOCRで探し、その文字を基準にした相対範囲から、OCRでテキストを読み取り変数へ保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"OCRExtractByTextRelative\",\n      \"Target\": \"価格\",\n      \"Value\": \"text\"\n    }\n  ]\n}",
    "caution": "未対応：OCR（画面の文字認識）が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  },
  {
    "name": "OCRSearch",
    "category": "OCR",
    "syntax": "OCRSearch | 文字列 | 保存先変数",
    "description": "画面上の文字をOCRで探し、一致した件数などを変数へ保存します。",
    "example": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"OCRSearch\",\n      \"Target\": \"送信\",\n      \"Value\": \"hits\"\n    }\n  ]\n}",
    "caution": "未対応：OCR（画面の文字認識）が必要で、ブラウザ内シミュレーションでは再現できないため、実行すると未対応として停止します。",
    "status": "unsupported"
  }
];

// 既存基礎項目への上書き定義（機構契約 advanced-interface.md 第5章(b)）。
// B1 では基礎項目の変更は行わないため空である。
export const referenceOverrides = [];
