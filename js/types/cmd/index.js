import { simulateCmd } from "./engine.js";
import { commandRefs } from "./parser.js";
import { advancedCommandNames } from "./advanced-engine.js";
import { sampleFiles } from "../shell/model.js";
const base =
  "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/";
const entries = [
  [
    "echo",
    "出力",
    "echo 文章 / echo.",
    "文章または空行を出力します。echo on/offはコマンド表示設定を変えます。",
    "@echo off\necho Hello\necho.",
    "echo",
  ],
  [
    "set",
    "変数",
    'set "名前=文字列"',
    "環境変数へ文字列を代入します。空文字列の代入は変数を削除します。",
    'set "NAME=Alice"\necho %NAME%',
    "set_1",
  ],
  [
    "set /a",
    "算術",
    'set /a "名前=式"',
    "符号付き32ビット整数の式を評価します。0始まりの定数は8進数です。",
    'set /a "N=2+3*4"\necho %N%',
    "set_1",
  ],
  [
    "set /p",
    "入力",
    'set /p "名前=プロンプト"',
    "プロンプトを表示し、入力した文字列を環境変数へ代入します。モデルでは入力値を捏造せず、モデルinputsで候補を明示できます。Enterのみの入力では変数は変わりません。",
    'set /p "ANSWER=Continue? "\necho %ANSWER%',
    "set_1",
  ],
  [
    "動的変数",
    "変数",
    "%ERRORLEVEL% / %CD% / %RANDOM% / %DATE% / %TIME%",
    "cmdが自動で用意する動的変数です。%ERRORLEVEL%は直近の終了コード、%CD%は現在のフォルダを返します。%RANDOM%は0〜32767の乱数、%DATE%は現在の日付、%TIME%は現在の時刻で、いずれも実行時に決まる値です。同名の環境変数をsetで定義すると、%ERRORLEVEL%と%CD%ではその環境変数の値が優先され、動的な値は隠れます。",
    "echo %ERRORLEVEL%\necho %CD%",
    "cmd",
  ],
  [
    "変数展開",
    "変数",
    "%NAME% / !NAME! / %NAME:~開始,長さ% / %NAME:検索=置換%",
    "%NAME%は論理コマンドの読み取り時に展開します。遅延展開が有効なとき、!NAME!は各実行時に展開します。部分文字列（%NAME:~0,3%の形。負の数は末尾から数えます）と置換（%NAME:検索=置換%の形。大文字小文字を区別せず全て置き換えます）の修飾も使え、!NAME!でも同じ修飾が使えます。%ERRORLEVEL%・%CD%・%RANDOM%・%DATE%・%TIME%はcmdが用意する動的変数で、詳しくは「動的変数」の項目を見てください。",
    "set NAME=Alice\necho %NAME%",
    "cmd",
  ],
  [
    "setlocal",
    "環境",
    "setlocal EnableDelayedExpansion / setlocal DisableDelayedExpansion",
    "環境変数・遅延展開の設定を局所化します。",
    "setlocal EnableDelayedExpansion\nset X=1\necho !X!\nendlocal",
    "setlocal",
  ],
  [
    "endlocal",
    "環境",
    "endlocal",
    "対応するsetlocalの前の環境変数・設定へ戻します。",
    "set X=outer\nsetlocal\nset X=inner\nendlocal\necho %X%",
    "endlocal",
  ],
  [
    "if",
    "分岐",
    "if 条件 ( … ) else ( … )",
    "条件で処理を分けます。比較は文字列の==、数値比較のEQU（等しい）・NEQ（等しくない）・LSS（より小さい）・LEQ（以下）・GTR（より大きい）・GEQ（以上）を使います。ほかに対象の存在を調べるexist、変数の定義を調べるdefined、終了コードが指定値以上かを調べるerrorlevel、条件を反転するnot、大文字小文字を区別しない/Iがあります。",
    "if exist notes.txt (\n echo found\n) else (\n echo missing\n)",
    "if",
  ],
  [
    "for",
    "繰り返し",
    "for %%i in (一覧) do … / for /L %%i in (開始,増分,終了) do …",
    "一覧・モデルのファイル集合または整数範囲を繰り返します。バッチ内のループ変数は%%iです。",
    "for /L %%i in (1,1,3) do echo %%i",
    "for",
  ],
  [
    "goto",
    "制御",
    "goto ラベル / goto :eof",
    "同一バッチのラベルへ移動します。:eofは現在のバッチ／サブルーチンから戻ります。",
    "goto done\necho skipped\n:done\necho done",
    "goto",
  ],
  [
    "call",
    "制御",
    "call :ラベル 引数",
    "同一ファイルのラベルをサブルーチンとして呼び出します。引数は%1〜%9、%~1で参照します。%0はバッチファイル自身の名前で、このモデルでは実行時に決まる値として扱います。",
    'call :show "Alice"\ngoto :eof\n:show\necho %~1\nexit /b',
    "call",
  ],
  [
    "exit",
    "制御",
    "exit /b [終了コード]",
    "/bは現在のバッチ・サブルーチンから復帰します。指定した終了コードをERRORLEVELへ設定します。",
    "exit /b 3",
    "exit",
  ],
  [
    "rem",
    "コメント",
    "rem コメント",
    "コメントとして記録され、モデルの状態を変更しません。",
    "rem 学習メモ\necho done",
    "rem",
  ],
  [
    "pause",
    "入力",
    "pause",
    "指定の案内を出し、入力があったものとしてモデル上で続行します。実キーボードは読みません。",
    "pause\necho resumed",
    "pause",
  ],
  [
    "cd",
    "フォルダ",
    "cd [/d] パス",
    "モデルの現在フォルダを変更します。/dはドライブも変更します。別名chdirでも同じ処理をします。",
    "cd logs\ncd",
    "cd",
  ],
  [
    "dir",
    "ファイル",
    "dir /b [/s] [パターン]",
    "モデル配列の順に名前を列挙します。/sを併用すると対象フォルダ以下を再帰的にフルパスで列挙します。実機の時刻・空き容量・列挙順は推定しません。",
    "dir /b *.txt",
    "dir",
  ],
  [
    "type",
    "ファイル",
    "type ファイル",
    "モデルに明示したファイルの内容を出力します。",
    "type notes.txt",
    "type",
  ],
];
const more = [
  ["md", "md フォルダ", "仮想FSにフォルダを作成します。別名mkdirでも同じ処理をします。", "md extra", "md"],
  [
    "rd",
    "rd [/s /q] フォルダ",
    "仮想FSのフォルダを削除します。空でない場合は/sが必要です。このモデルでは、/sで削除するときは確認を省略する/qもあわせて指定します（/qがない場合は停止します）。別名rmdirでも同じ処理をします。",
    "md extra\nrd extra",
    "rd",
  ],
  [
    "del",
    "del [/q] ファイル",
    "仮想FSのファイルを削除します。ワイルドカードもモデル内だけで処理します。/qを指定すると確認なしで削除します。*や*.*ですべてのファイルを削除する場合は/qの明示が必要です（/qがない場合は停止します）。別名eraseでも同じ処理をします。",
    "copy notes.txt temp.txt\ndel temp.txt",
    "del",
  ],
  [
    "ren",
    "ren 元 新しい名前",
    "同じフォルダ内で名前を変更します。別名renameでも同じ処理をします。",
    "copy notes.txt temp.txt\nren temp.txt renamed.txt",
    "ren",
  ],
  [
    "copy",
    "copy [/y] 元 先",
    "仮想FS内で単一ファイルをコピーします。上書きには/yを明示します。",
    "copy notes.txt copied.txt",
    "copy",
  ],
  [
    "move",
    "move [/y] 元 先",
    "仮想FS内の項目を移動します。移動先に既存の項目がある場合、上書きには/yを明示します（/yがない場合は停止します）。",
    "copy notes.txt temp.txt\nmove temp.txt moved.txt",
    "move",
  ],
  [
    "cls",
    "cls",
    "このモデルでは出力パネルの内容をクリアします。",
    "echo old\ncls\necho new",
    "cls",
  ],
  [
    "find",
    '入力 | find [/i] "文字列"',
    "パイプまたは単一のモデルファイルから文字列を含む行を選びます。",
    'echo apple|find "app"',
    "find",
  ],
  [
    "リダイレクト",
    "コマンド > ファイル / >> ファイル",
    "標準出力を仮想ファイルへ上書き／追記します。",
    "echo first>out.txt\necho second>>out.txt\ntype out.txt",
    "redirection",
  ],
  [
    "パイプ",
    "コマンド | コマンド",
    "標準出力を文字列として次段へ渡します。各段の環境変数・現在フォルダは呼び出し元へ持ち出しません。",
    'echo apple|find "app"',
    "cmd",
  ],
];
for (const [name, syntax, description, example, page] of more)
  entries.push([name, "ファイル・制御", syntax, description, example, page]);
const returns = {
  echo: "文章または空行（on/offは設定変更）",
  set: "環境変数の更新",
  "set /a": "計算結果を環境変数へ格納",
  "set /p": "入力文字列を環境変数へ格納",
  動的変数: "各動的変数の現在の値（%RANDOM%・%DATE%・%TIME%は実行時に決まる値）",
  変数展開: "展開後の文字列",
  setlocal: "環境・遅延展開設定の保存",
  endlocal: "保存した環境・設定への復元",
  if: "条件に合う処理への分岐",
  for: "各要素に対する処理",
  goto: "指定ラベルへの制御移動",
  call: "サブルーチン実行後に復帰",
  exit: "終了／復帰と終了コードの更新",
  rem: "出力・状態変更なし",
  pause: "継続案内の表示",
  cd: "現在フォルダの変更、引数なしは現在フォルダの出力",
  dir: "一致した項目の名前",
  type: "ファイル内容の文字列",
  md: "フォルダ作成",
  rd: "フォルダ削除",
  del: "一致したファイルの削除",
  ren: "項目名の変更",
  copy: "ファイルの複製",
  move: "項目の移動",
  cls: "モデル出力パネルのクリア",
  find: "一致する行と終了コード（0:一致／1:不一致）",
  リダイレクト: "出力の仮想ファイルへの保存",
  パイプ: "標準出力の文字列を次段へ渡す",
};
const defaults = {
  variables: {},
  cwd: "C:\\Practice",
  files: sampleFiles(),
  args: [],
  errorlevel: 0,
  inputs: {},
};
export const definition = {
  id: "cmd",
  name: "コマンドプロンプト",
  extensions: [".bat", ".cmd"],
  syntax: {
    name: "Windows cmd バッチ",
    caseSensitive: false,
    lineComment: "rem",
  },
  reference: entries.map(
    ([name, category, syntax, description, example, page]) => ({
      name,
      category,
      syntax,
      description,
      example,
      source: base + (page === "redirection" ? "cmd" : page),
      returns: returns[name],
      caution:
        "バッチ・コマンド拡張有効の部分モデルです。実ファイル・外部プロセスには接続しません。",
      supported: true,
    }),
  ),
  templates: [
    {
      id: "cmd-hello",
      title: "文章・空行・環境変数",
      level: "基礎",
      code: '@echo off\nset "NAME=Alice"\necho Hello %NAME%\necho.',
      intro: "文字列の代入と%NAME%による展開を確認します。echo.は空行です。",
      refs: ["echo", "set", "変数展開"],
    },
    {
      id: "cmd-calculate",
      title: "32ビット整数の計算",
      level: "基礎",
      code: '@echo off\nset /a "TOTAL=2+3*4"\necho %TOTAL%',
      intro: "掛け算を先に行い、結果14を環境変数へ格納します。",
      refs: ["set /a", "echo"],
    },
    {
      id: "cmd-delayed",
      title: "ループの中の2つの展開時点",
      level: "実践",
      code: '@echo off\nsetlocal EnableDelayedExpansion\nset COUNT=0\nfor /L %%i in (1,1,3) do (\n set /a "COUNT=COUNT+1"\n echo %COUNT% !COUNT!\n)\nendlocal',
      intro:
        "%COUNT%はループ開始前の0で固定、!COUNT!は1・2・3へ変わります。endlocalで環境を戻します。",
      refs: ["for", "set /a", "setlocal", "endlocal", "変数展開", "echo"],
    },
    {
      id: "cmd-files",
      title: "モデルのテキストファイルを列挙",
      level: "実践",
      code: "@echo off\nfor %%f in (*.txt) do (\n echo %%f\n)\nif exist notes.txt (\n type notes.txt\n)",
      intro:
        "固定のモデルツリーから.txtを列挙し、存在するnotes.txtの内容を出します。",
      refs: ["for", "if", "type", "echo"],
    },
    {
      id: "cmd-subroutine",
      title: "引数つきサブルーチンと復帰",
      level: "応用",
      code: '@echo off\ncall :show "Alice Smith"\necho returned\ngoto :eof\n:show\necho Hello %~1\nexit /b 0',
      intro:
        "callでラベルを呼び、%~1で外側の引用符を除いた引数を読みます。exit /bで呼び出し元へ戻ります。",
      refs: ["call", "exit", "goto", "変数展開", "echo"],
    },
    {
      id: "cmd-input",
      title: "実行時の入力で分かれるパス",
      level: "応用",
      code: '@echo off\nset /p "ANSWER=Continue? "\nif "%ANSWER%"=="yes" (\n echo accepted\n) else (\n echo other input\n)',
      intro:
        "入力値を捏造せず、yesとそれ以外のパスを表示します。モデルinputs.ANSWERに候補を明示することもできます。",
      refs: ["set /p", "set", "if", "変数展開", "echo"],
    },
  ],
  glossary: [
    [
      "環境変数",
      "cmdが名前と文字列で保持する値です。名前は大文字小文字を区別しません。",
    ],
    ["遅延展開", "!NAME!をコマンドの実行時に展開する設定です。"],
    [
      "終了コード",
      "コマンドの結果を示す値。ERRORLEVELを常に0へ戻すとは限りません。",
    ],
    [
      "仮想ファイルシステム",
      "実ファイルへ接続せず、明示したフォルダ・ファイルだけを扱うモデルです。",
    ],
    ["ラベル", "gotoやcallの移動先を示す:名前です。"],
    [
      "サブルーチン",
      "call :ラベルで呼び出せる、バッチ内の処理のまとまりです。処理が終わると呼び出し元の次の行へ戻って実行を続けます。",
    ],
    [
      "未確定（値）",
      "実行時に決まる値のことです。このアプリでは値を仮定して作らず、未確定のまま扱って、到達可能な分岐をすべて表示します。",
    ],
  ],
  model: {
    kind: "json",
    title: "モデル環境変数・現在フォルダ・ファイル",
    hint: "Windowsの実環境ではなく、このモデルだけを使います。inputsは入力名→値または候補配列。未指定の入力は未確定。filesの順序を列挙順として使用します。",
    defaults,
  },
  semantics: {
    description:
      "コマンド拡張有効・初期コマンド表示offのバッチをモデル化します。",
    support:
      "echo、setと基本set /a、%VAR%／!VAR!（遅延展開の動的変数を含む）と展開修飾（部分文字列 ~開始,長さ／置換 検索=置換）、%%エスケープ、setlocal/endlocal、if、for基本形／/L、goto、call :label、%1〜%9／%~1、exit、rem、pause、cd、dir /b（/s再帰を含む）、type、md/rd/del/ren/copy/move、cls、find、>／>>、基本パイプ。%0はモデルに無いため実行時に決まる値として扱う。未対応：外部プロセス、番号つき／複合リダイレクト、for /F、二重展開、条件付き連結（&&／||）、複雑な算術代入、UNC／ドライブ相対パス。",
    sources: [
      { title: "Microsoft Windows commands", url: base },
      { title: "Microsoft cmd", url: base + "cmd" },
    ],
  },
  scan(code) {
    const names = new Set();
    try {
      // 高度モード ブロックB1: 高度側の名前（別名・複合名を含む）も
      // 解決する。名前集合は advanced-engine.js のテーブルから導出し、
      // reference-advanced.js（遅延ロード対象）は import しない。
      // 複合名を先に当てるため、語数の多い順に照合する。
      // 統合第1弾（差異 D-3 の解消）: 機構が有効カタログ
      // （definition.__catalogReference）を差し込んでいる場合は、その
      // カタログに載っている高度名だけを解決する（簡易モードでは基礎
      // カタログが差し込まれるため高度名は出ない）。未設定の環境
      // （単体テスト等）では従来どおり全高度名を解決する。
      // LANE-A1: カタログ照合は大小区別なしに行い、解決した名前は
      // カタログ側の表記で返す。従来は大小区別ありの集合照合だった
      // ため、索引表記が Evntcmd の項目だけがエンジン側の小文字名と
      // 一致せず、scan で一切解決できなかった。
      const catalogRef = definition.__catalogReference;
      const catalogByLower = catalogRef
        ? new Map(catalogRef.map((r) => [r.name.toLowerCase(), r.name]))
        : null;
      const advSorted = [
        ...new Set(
          [...advancedCommandNames]
            .map((nm) =>
              catalogByLower ? catalogByLower.get(nm.toLowerCase()) : nm,
            )
            .filter(Boolean),
        ),
      ].sort(
        (a, b) =>
          b.split(/\s+/).length - a.split(/\s+/).length ||
          b.length - a.length,
      );
      // LANE-A1: パイプ／&／&&／|| で連結された後段のコマンドも名前
      // 解決の対象にする（従来は行頭しか解決できず、同梱テンプレート
      // cmd-pipe 自身の refs と scan が一致しなかった）。引用符と
      // キャレットエスケープの内側は区切りとして扱わない。あわせて、
      // 記号でしか書けない概念項目（リダイレクト／パイプ）を演算子
      // から解決する（set /a 行の > は比較・シフト演算子なので除く）。
      const segmentsOf = (line) => {
        const segs = [];
        let cur = "",
          quote = false,
          pipe = false,
          redirect = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === "^" && !quote && i + 1 < line.length) {
            cur += c + line[i + 1];
            i++;
            continue;
          }
          if (c === '"') {
            quote = !quote;
            cur += c;
            continue;
          }
          if (!quote && (c === "|" || c === "&")) {
            if (line[i + 1] === c) i++;
            else if (c === "|") pipe = true;
            segs.push(cur);
            cur = "";
            continue;
          }
          if (!quote && c === ">") redirect = true;
          cur += c;
        }
        segs.push(cur);
        return { segs, pipe, redirect };
      };
      for (const line of code.split("\n")) {
        const { segs, pipe, redirect } = segmentsOf(line);
        if (pipe) names.add("パイプ");
        if (redirect && !/^\s*@?\s*set\s+\/a\b/i.test(line))
          names.add("リダイレクト");
        for (const seg of segs) {
          for (const ref of commandRefs(seg.trim())) names.add(ref);
          const t = seg
            .trim()
            .replace(/^@/, "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
          if (!t) continue;
          for (const nm of advSorted) {
            const key = nm.toLowerCase();
            if (t === key || t.startsWith(key + " ")) {
              names.add(nm);
              break;
            }
          }
        }
      }
      if (/set\s+\/a/i.test(code)) names.add("set /a");
      if (/set\s+\/p/i.test(code)) names.add("set /p");
      if (/%(ERRORLEVEL|CD|RANDOM|DATE|TIME)%|!(ERRORLEVEL|CD|RANDOM|DATE|TIME)!/i.test(code))
        names.add("動的変数");
    } catch {}
    return [...names];
  },
  simulate: simulateCmd,
};

definition.templates.push(
  {
    id: "cmd-write",
    title: "モデルファイルへ書いて移動する",
    level: "実践",
    code: "@echo off\nmd output\necho first>output\\result.txt\necho second>>output\\result.txt\nmove output\\result.txt output\\moved.txt\ntype output\\moved.txt",
    intro:
      "仮想フォルダを作り、2行を書いて移動します。実ファイルは作りません。",
    refs: ["md", "リダイレクト", "move", "type", "echo"],
  },
  {
    id: "cmd-pipe",
    title: "パイプでテキストを絞り込む",
    level: "応用",
    code: '@echo off\ntype notes.txt|find "学習"\nif errorlevel 1 (\n echo not found\n) else (\n echo found\n)',
    intro:
      "モデルファイルの文字列をfindへ渡します。findの終了コードにより、結果を分けます。",
    refs: ["type", "パイプ", "find", "if", "echo"],
  },
);
