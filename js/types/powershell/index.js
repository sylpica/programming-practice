import { simulatePowerShell } from "./engine.js";
import { tokenizePS } from "./parser.js";
import { sampleFiles } from "../shell/model.js";
const moduleURL = "https://learn.microsoft.com/en-us/powershell/module/",
  about = moduleURL + "microsoft.powershell.core/about/";
const data = [
  [
    "Write-Output",
    "出力",
    "Write-Output 値",
    "値を成功ストリームへ出力し、次のパイプラインへ渡します。",
    "Write-Output 1,2,3",
    "microsoft.powershell.utility/write-output",
    "出力したオブジェクト列",
  ],
  [
    "Write-Host",
    "出力",
    "Write-Host 値",
    "画面表示へ出力します。成功ストリームの値には含めません。",
    'Write-Host "画面のみ"\nWrite-Output "パイプライン"',
    "microsoft.powershell.utility/write-host",
    "成功ストリームへの戻り値なし",
  ],
  [
    "Read-Host",
    "入力",
    'Read-Host "質問"',
    "入力モデルの文字列を読みます。未指定の値は実行時に決まります。",
    '$name=Read-Host "Name"\nWrite-Output $name',
    "microsoft.powershell.utility/read-host",
    "入力文字列（このモデルでは未確定値／候補を使用）",
  ],
  [
    "Get-ChildItem",
    "ファイル",
    "Get-ChildItem [-Path パス] [-Filter パターン]",
    "仮想FSの子項目をプロパティを持つオブジェクトとして列挙します。",
    'Get-ChildItem -Filter "*.txt"',
    "microsoft.powershell.management/get-childitem",
    "FileInfo／DirectoryInfoに相当するモデルオブジェクト列",
  ],
  [
    "Where-Object",
    "パイプライン",
    "入力 | Where-Object { 条件 }",
    "入力オブジェクトごとに条件を評価し、真になるオブジェクトを渡します。",
    "1..5 | Where-Object { $_ -gt 2 }",
    "microsoft.powershell.core/where-object",
    "条件を満たす入力オブジェクト列",
  ],
  [
    "ForEach-Object",
    "パイプライン",
    "入力 | ForEach-Object { 処理 }",
    "各入力を$_／$PSItemで参照し、ブロックが出力したオブジェクトを渡します。",
    "1..3 | ForEach-Object { $_ * 2 }",
    "microsoft.powershell.core/foreach-object",
    "ブロックの成功ストリーム出力列",
  ],
  [
    "Select-Object",
    "パイプライン",
    "入力 | Select-Object プロパティ [-First N]",
    "プロパティの選択または先頭・末尾・スキップによる件数選択を行います。",
    "Get-ChildItem | Select-Object Name,FullName -First 2",
    "microsoft.powershell.utility/select-object",
    "選択したオブジェクト、プロパティ選択時は新しいオブジェクト",
  ],
  [
    "Sort-Object",
    "パイプライン",
    "入力 | Sort-Object [-Property 名前] [-Descending]",
    "プロパティまたは値を並べ替えます。モデルの文字列カルチャはen-USです。",
    "@(3,1,2) | Sort-Object",
    "microsoft.powershell.utility/sort-object",
    "並べ替えたオブジェクト列",
  ],
  [
    "Measure-Object",
    "パイプライン",
    "入力 | Measure-Object [-Property 名前] [-Sum]",
    "個数を数え、指定時は数値の合計・平均・最大・最小を求めます。",
    "1..3 | Measure-Object -Sum",
    "microsoft.powershell.utility/measure-object",
    "Count・Sum等を持つ集計オブジェクト",
  ],
  [
    "Set-Location",
    "ファイル",
    "Set-Location パス",
    "仮想FSの現在フォルダを変更します。",
    "Set-Location logs\nGet-Location",
    "microsoft.powershell.management/set-location",
    "通常は成功ストリームへの出力なし",
  ],
  [
    "Get-Location",
    "ファイル",
    "Get-Location",
    "モデルの現在フォルダを返します。",
    "Get-Location",
    "microsoft.powershell.management/get-location",
    "Pathを持つモデルPathInfo",
  ],
  [
    "Get-Content",
    "ファイル",
    "Get-Content パス [-Raw]",
    "モデルに明示したファイルの内容を行ごとに返します。-Rawは全体を1文字列で返します。",
    "Get-Content notes.txt",
    "microsoft.powershell.management/get-content",
    "文字列の列。-Rawは1つの文字列",
  ],
  [
    "Set-Content",
    "ファイル",
    "Set-Content パス -Value 値",
    "仮想ファイルの内容を置き換えます。モデルはUTF-8・Windowsの改行を使用します。",
    'Set-Content out.txt -Value "Hello"\nGet-Content out.txt',
    "microsoft.powershell.management/set-content",
    "成功ストリームへの出力なし",
  ],
  [
    "Add-Content",
    "ファイル",
    "Add-Content パス -Value 値",
    "仮想ファイルへ内容を追記します。",
    'Set-Content out.txt "A"\nAdd-Content out.txt "B"\nGet-Content out.txt',
    "microsoft.powershell.management/add-content",
    "成功ストリームへの出力なし",
  ],
  [
    "New-Item",
    "ファイル",
    "New-Item -Path パス -ItemType File/Directory",
    "仮想FSにファイルまたはフォルダを作成します。",
    "New-Item -Path extra -ItemType Directory",
    "microsoft.powershell.management/new-item",
    "作成したモデル項目",
  ],
  [
    "Remove-Item",
    "ファイル",
    "Remove-Item パス [-Recurse]",
    "モデルからファイル・フォルダを削除します。",
    "New-Item temp.txt -ItemType File\nRemove-Item temp.txt",
    "microsoft.powershell.management/remove-item",
    "成功ストリームへの出力なし",
  ],
  [
    "Rename-Item",
    "ファイル",
    "Rename-Item パス -NewName 名前",
    "仮想FSの項目名を変更します。新しい名前はパスでなく名前を指定します。",
    "Copy-Item notes.txt copy.txt\nRename-Item copy.txt renamed.txt",
    "microsoft.powershell.management/rename-item",
    "通常は成功ストリームへの出力なし",
  ],
  [
    "Copy-Item",
    "ファイル",
    "Copy-Item 元 -Destination 先",
    "モデル内で単一ファイルをコピーします。",
    "Copy-Item notes.txt copied.txt",
    "microsoft.powershell.management/copy-item",
    "通常は成功ストリームへの出力なし",
  ],
  [
    "Move-Item",
    "ファイル",
    "Move-Item 元 -Destination 先",
    "モデル内で項目を移動します。",
    "Copy-Item notes.txt copied.txt\nMove-Item copied.txt moved.txt",
    "microsoft.powershell.management/move-item",
    "通常は成功ストリームへの出力なし",
  ],
  [
    "Test-Path",
    "ファイル",
    "Test-Path パス [-PathType Leaf/Container]",
    "モデル内のパスの存在を判定します。",
    "Test-Path notes.txt",
    "microsoft.powershell.management/test-path",
    "Boolean",
  ],
];
const constructs = [
  [
    "if",
    "if ($条件) { … } elseif (...) { … } else { … }",
    "条件をPowerShellの真偽規則で判定します。",
    'if (2 -gt 1) { "yes" } else { "no" }',
    "about_if",
  ],
  [
    "foreach",
    "foreach ($item in 配列) { … }",
    "コレクションの項目ごとに本体を実行します。",
    "foreach ($n in 1..3) { $n * 2 }",
    "about_foreach",
  ],
  [
    "for",
    "for (初期化; 条件; 更新) { … }",
    "初期化、条件判定、更新を伴う繰り返しです。",
    "for ($i=0; $i -lt 3; $i++) { $i }",
    "about_for",
  ],
  [
    "while",
    "while (条件) { … }",
    "条件が真の間、繰り返します。",
    "$i=0\nwhile ($i -lt 3) { $i; $i++ }",
    "about_while",
  ],
  [
    "do-while",
    "do { … } while (条件)",
    "本体を最低1回実行してから条件を判定します。",
    "$i=0\ndo { $i++; $i } while ($i -lt 2)",
    "about_do",
  ],
  [
    "switch",
    "switch (値) { 値 { … } default { … } }",
    "一致する各条件の本体を実行します。基本のリテラル条件に対応します。",
    'switch (2) { 1 { "one" } 2 { "two" } default { "other" } }',
    "about_switch",
  ],
  [
    "break",
    "break",
    "現在のループまたはswitchを抜けます。",
    "foreach ($n in 1..5) { if ($n -gt 2) { break }; $n }",
    "about_break",
  ],
  [
    "continue",
    "continue",
    "現在の繰り返しの残りを飛ばし、次へ進みます。",
    "foreach ($n in 1..3) { if ($n -eq 2) { continue }; $n }",
    "about_continue",
  ],
  [
    "function",
    "function 名前 { param($引数) … }",
    "ブロックが成功ストリームへ出力したオブジェクトが関数の出力になります。",
    "function Add { param($a,$b) $a+$b }\nAdd 2 3",
    "about_functions",
  ],
  [
    "param",
    "param($x, $y)",
    "関数の仮引数を定義し、位置または名前で受け取ります。",
    'function Say { param($name) "Hello $name" }\nSay Alice',
    "about_functions_advanced_parameters",
  ],
  [
    "return",
    "return [値]",
    "任意の値を成功ストリームへ出力し、現在の関数／スクリプトから戻ります。以前に出力した値も残ります。",
    "function Values { 1; return 2; 3 }\nValues",
    "about_return",
  ],
  [
    "変数",
    " $name = 値",
    "変数名は大文字小文字を区別しません。未定義変数は、この非StrictModeモデルでは$nullです。",
    '$Name="Alice"\n$name',
    "about_variables",
  ],
  [
    "文字列",
    '"$x" / \'$x\' / "$(式)"',
    "二重引用符では変数と部分式を展開し、単一引用符では展開しません。バッククォートでエスケープします。",
    "$x=3\n\"value=$x; next=$($x+1)\"\n'$x'",
    "about_quoting_rules",
  ],
  [
    "配列",
    "@(値,値) / 1..3",
    "配列を作成し、成功ストリームへ出すと項目が列挙されます。",
    "$a=@(2,4,6)\n$a[1]\n$a.Count",
    "about_arrays",
  ],
  [
    "ハッシュテーブル",
    "@{ 名前=値; 名前=値 }",
    "キーと値を対応づけます。ハッシュテーブル自体は1つのオブジェクトです。",
    '$h=@{Name="Alice"; Score=80}\n$h["Name"]',
    "about_hash_tables",
  ],
  [
    "比較演算子",
    "-eq -ne -gt -ge -lt -le -like -match",
    "左辺の型に応じて比較します。文字列比較の既定は大文字小文字を区別しません。",
    '"Hello" -eq "hello"\n"abc.txt" -like "*.txt"\n"abc123" -match "[0-9]+"',
    "about_comparison_operators",
  ],
  [
    "パイプライン",
    "値 | コマンド | コマンド",
    "文字列ではなくオブジェクトが次段へ流れます。",
    "1..3 | ForEach-Object { $_ * 2 }",
    "about_pipelines",
  ],
];
export const definition = {
  id: "powershell",
  name: "PowerShell",
  extensions: [".ps1"],
  syntax: {
    name: "PowerShell 7 のWindowsモデル",
    caseSensitive: false,
    lineComment: "#",
  },
  reference: [
    ...data.map(
      ([name, category, syntax, description, example, url, returns]) => ({
        name,
        category,
        syntax,
        description,
        example,
        source: moduleURL + url + "?view=powershell-7.4",
        returns,
        caution:
          "仮想FS・明示モデル内の対応部分集合です。実プロセス・実ファイル・実ホストには接続しません。",
        supported: true,
      }),
    ),
    ...constructs.map(([name, syntax, description, example, page]) => ({
      name,
      category: "構文・用語",
      syntax,
      description,
      example,
      source: about + page + "?view=powershell-7.4",
      returns: "構文に従って変数・制御・成功ストリームを更新",
      caution: "未対応の形式は名称・行を示して停止します。",
      supported: true,
    })),
  ],
  templates: [
    {
      id: "ps-hello",
      title: "画面表示とパイプライン出力",
      level: "基礎",
      code: '$name="Alice"\nWrite-Host "画面: $name"\nWrite-Output "Hello $name"',
      intro:
        "Write-Hostは画面への表示、Write-Outputは成功ストリームへの出力です。両者を分けて表示します。",
      refs: ["変数", "文字列", "Write-Host", "Write-Output"],
    },
    {
      id: "ps-values",
      title: "配列とハッシュテーブル",
      level: "基礎",
      code: '$record=@{Name="Alice"; Score=80}\n$numbers=@(2,4,6)\n$record["Name"]\n$numbers[1]\n$numbers.Count',
      intro: "キーによる参照と0始まりの添字を使います。結果はAlice・4・3です。",
      refs: ["配列", "ハッシュテーブル", "変数"],
    },
    {
      id: "ps-files",
      title: "ファイルオブジェクトを絞り込む",
      level: "実践",
      code: 'Get-ChildItem -File | Where-Object { $_.Extension -eq ".txt" } | Sort-Object Name | Select-Object Name,Length',
      intro:
        "モデルの.txtファイルをオブジェクトのまま絞り、名前で並べてプロパティを選びます。",
      refs: [
        "Get-ChildItem",
        "Where-Object",
        "Sort-Object",
        "Select-Object",
        "比較演算子",
        "パイプライン",
      ],
    },
    {
      id: "ps-total",
      title: "繰り返しと集計",
      level: "実践",
      code: "$values=@()\nfor ($i=1; $i -le 4; $i++) { $values += $i * 2 }\n$values | Measure-Object -Sum",
      intro:
        "2・4・6・8の4件を作り、Count=4・Sum=20となる集計オブジェクトを返します。",
      refs: ["for", "配列", "Measure-Object", "パイプライン"],
    },
    {
      id: "ps-function",
      title: "関数から複数の値を返す",
      level: "応用",
      code: "function Double {\n param($values)\n foreach ($v in $values) { $v * 2 }\n}\n$result=Double @(1,2,3)\n$result",
      intro:
        "returnを使わずに出力した2・4・6が関数の出力です。代入すると配列になり、再び出力すると各項目へ展開されます。",
      refs: ["function", "param", "foreach", "配列", "変数"],
    },
    {
      id: "ps-input",
      title: "実行時の入力で分岐する",
      level: "応用",
      code: '$answer=Read-Host "Answer"\nif ($answer -eq "yes") {\n Write-Output "accepted"\n} else {\n Write-Output "other input"\n}',
      intro:
        "Read-Hostは文字列を返します。未指定の入力を捏造せず、到達する2つの分岐を表示します。",
      refs: ["Read-Host", "if", "比較演算子", "Write-Output"],
    },
    {
      id: "ps-transform",
      title: "オブジェクトを作って変換する",
      level: "実践",
      code: '$rows=@(\n [pscustomobject]@{Name="A"; N=2}\n [pscustomobject]@{Name="B"; N=4}\n)\n$rows | ForEach-Object { [pscustomobject]@{Name=$_.Name; N=$_.N*3} }',
      intro:
        "各オブジェクトのNを3倍にし、N=6とN=12を持つ新しいオブジェクトを返します。",
      refs: ["ForEach-Object", "ハッシュテーブル", "パイプライン"],
    },
    {
      id: "ps-file-write",
      title: "モデルファイルを作成・追記・移動",
      level: "応用",
      code: 'New-Item -Path output -ItemType Directory\nSet-Content output\\result.txt "first"\nAdd-Content output\\result.txt "second"\nMove-Item output\\result.txt output\\moved.txt\nGet-Content output\\moved.txt',
      intro:
        "仮想FSだけを変更します。ファイルを移動した後、firstとsecondの2行を読み出します。",
      refs: [
        "New-Item",
        "Set-Content",
        "Add-Content",
        "Move-Item",
        "Get-Content",
      ],
    },
  ],
  glossary: [
    [
      "パイプライン",
      "前段のオブジェクトを次段へ渡す仕組みです。テキストの連結ではありません。",
    ],
    ["コマンドレット", "Get-ChildItem等のPowerShellコマンドです。"],
    [
      "成功ストリーム",
      "関数の戻り値や次のパイプラインになるオブジェクト列です。",
    ],
    [
      "自動変数",
      "$_／$PSItemは現在のパイプライン項目を表します。$?は直近の成功状態、$LASTEXITCODEは外部プロセスの終了コードで、このモデルでは初期値を保持します。",
    ],
    ["仮想FS", "入力モデルに明示したフォルダとファイルだけを操作します。"],
  ],
  model: {
    kind: "json",
    title: "モデル変数・現在フォルダ・ファイル",
    hint: "PowerShell 7.4相当・Windowsパス・UTF-8・CRLFのモデル。実ファイルへ接続しません。inputsは質問文字列→入力値または候補配列。未指定入力は実行時に決まります。",
    defaults: {
      variables: {},
      cwd: "C:\\Practice",
      files: sampleFiles(),
      inputs: {},
      lastExitCode: null,
    },
  },
  semantics: {
    description:
      "式・コマンド引数・オブジェクトパイプラインを分け、成功ストリームと画面出力を区別する部分モデルです。",
    support:
      "掲載コマンドレットと構文の基本形。$_/$PSItem、$?、初期値の$LASTEXITCODE。未対応：外部コマンド、モジュール、並列／非同期、一般の.NETメソッド、プロバイダー、.NET固有正規表現、複雑なパラメーターセット、数値範囲外、未確定値を変換する複雑な式。ファイル系はエラーで停止します。",
    sources: [
      {
        title: "Microsoft PowerShell 7.4",
        url:
          moduleURL +
          "microsoft.powershell.core/about/about_pipelines?view=powershell-7.4",
      },
      {
        title: "Microsoft about Functions",
        url: about + "about_functions?view=powershell-7.4",
      },
    ],
  },
  scan(code) {
    try {
      const names = new Set(),
        tokens = tokenizePS(code);
      for (const t of tokens) {
        if (t.k === "var") names.add("変数");
        if (t.k === "string") names.add("文字列");
        const canonical = definition.reference.find(
          (r) => r.name.toLowerCase() === t.v.toLowerCase(),
        );
        if (canonical) names.add(canonical.name);
        if (t.v === "|") names.add("パイプライン");
        if (["@(", ".."].includes(t.v)) names.add("配列");
        if (t.v === "@{") names.add("ハッシュテーブル");
      }
      return [...names];
    } catch {
      return [];
    }
  },
  simulate: simulatePowerShell,
};
