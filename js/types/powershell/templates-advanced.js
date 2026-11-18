/* 高度モード差分（ブロックB3）: PowerShell テンプレート追加分。
 * 形は基礎テンプレートと同一 { id, title, level, code, intro, refs }。
 * id は "ps-adv-" 接頭辞で基礎と衝突しないこと。refs は高度リファレンスを
 * 含む合成後の名前で書く。合成時は基礎の後ろへ追加される。
 *
 * 収載基準（PS-REF）: definition.simulate（advanced.js の
 * activateAdvanced() 経由）で実行確認し、エラーなく期待どおりの
 * パイプライン出力になるものだけを収載した。高度コマンドレット／
 * 高度演算子のエンジン実装は PS-ENG 側の担当であり、本ファイルの
 * テンプレートは基礎エンジンで実装済みの範囲（高度リファレンスに
 * 個別項目として追加した定数 $true／$false／$null を含む）で書いた。
 */
export const templatesAdvanced = [
  {
    id: "ps-adv-null-default",
    title: "$nullを判定して既定値に置き換える",
    level: "高度",
    code: '$answer = $null\n$label = ($answer -eq $null) ? "未入力" : $answer\n$label',
    intro:
      "$nullは「値が無いこと」を表す定数です。-eq $nullで判定し、三項演算子で既定値「未入力」を選びます。",
    refs: ["$null", "三項演算子", "比較演算子", "変数"],
  },
  {
    id: "ps-adv-bool-flags",
    title: "$trueと$falseのフラグを数える",
    level: "高度",
    code: "$flags = @($true, $false, $true)\n$count = 0\nforeach ($f in $flags) { if ($f) { $count++ } }\n$count",
    intro:
      "$true／$falseは真偽値の定数です。配列の中の$trueの個数を数え、結果は2になります。",
    refs: ["$true", "$false", "foreach", "if", "配列"],
  },
  {
    id: "ps-adv-safe-lookup",
    title: "ハッシュの値が$nullかどうかを確認する",
    level: "高度",
    code: '$h = @{ Name = "Alice"; Note = $null }\n$h["Name"]\n$h["Note"] -eq $null',
    intro:
      "Noteには$nullが入っています。NameはAlice、Noteの$null判定はTrueになります。",
    refs: ["$null", "ハッシュテーブル", "比較演算子"],
  },
  {
    id: "ps-adv-edition-check",
    title: "エディションと真偽値を組み合わせて判定する",
    level: "高度",
    code: '$edition = $PSVersionTable.PSEdition\n$modern = ($edition -eq "Core") -and $true\n$edition\n$modern',
    intro:
      "このモデルのPSEditionはCoreです。比較結果と$trueを-andで組み合わせ、CoreとTrueを出力します。",
    refs: ["$true", "$PSVersionTable", "比較演算子", "論理演算子"],
  },
  {
    id: "ps-adv-path-check",
    title: "存在判定の結果を$true／$falseと比べる",
    level: "高度",
    code: "$found = Test-Path notes.txt\n$missing = Test-Path nofile.txt\n$found -eq $true\n$missing -eq $false",
    intro:
      "notes.txtはモデルに存在し、nofile.txtは存在しません。2つの比較はどちらもTrueになります。",
    refs: ["$true", "$false", "Test-Path", "比較演算子"],
  },
  {
    id: "ps-adv-json-read",
    title: "JSON文字列をオブジェクトとして読む",
    level: "高度",
    code: "$j = '{\"name\":\"Alice\",\"age\":30}' | ConvertFrom-Json\n$j.name",
    intro:
      "ConvertFrom-JsonでJSON文字列をオブジェクトに変換し、nameプロパティの値Aliceを取り出します（高度モードのコマンドレット）。",
    refs: ["ConvertFrom-Json"],
  },
  {
    id: "ps-adv-path-build",
    title: "フォルダとファイル名からパスを組み立てる",
    level: "高度",
    code: "$dir = Split-Path \"C:/data/report.txt\" -Parent\nJoin-Path $dir \"summary.txt\"",
    intro:
      "Split-Path -Parentでフォルダ部分を取り出し、Join-Pathで別のファイル名と結合します。結果はC:\\data\\summary.txtです（高度モードのコマンドレット）。",
    refs: ["Split-Path", "Join-Path"],
  },
];
