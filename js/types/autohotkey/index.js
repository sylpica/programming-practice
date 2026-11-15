import { additionalTemplates } from "./additional-templates.js";
import {
  ScriptParser,
  executeProgram,
  scanScript,
  PracticeError,
  toLearnerError,
  unsupported,
  baseBinary,
  callName,
  atLineStart,
} from "../../core/script.js";
import { rows, sourceFailure } from "../../core/data.js";
import { formatModelValue as formatValue, isUnknown, unknown, LIMITS } from "../../core/contract.js";
const reference = rows([
  [
    "Send",
    "キー送信",
    'Send "文字列 / {Enter} / ^a"',
    "アクティブウィンドウへキー列を送信します。",
    'Send "Hello{Enter}"',
    "文字入力・Enter・Ctrl+A以外のアプリ効果はモデルへ記録するだけです。",
  ],
  [
    "SendText",
    "キー送信",
    'SendText "文字列"',
    "修飾キー記法を解釈せず、テキストとして送ります。",
    'SendText "^a"',
  ],
  [
    "WinExist",
    "ウィンドウ",
    'WinExist("タイトル")',
    "条件に合うウィンドウのHWNDを返し、なければ0です。",
    'id := WinExist("メモ帳")',
    "既定のタイトル一致は部分一致です（v2）。",
  ],
  [
    "WinActive",
    "ウィンドウ",
    'WinActive("タイトル")',
    "アクティブウィンドウが一致すればHWND、なければ0です。",
    'if WinActive("メモ帳") {\n SendText "Hello"\n}',
  ],
  [
    "WinActivate",
    "ウィンドウ",
    'WinActivate "タイトル"',
    "指定したモデルウィンドウをアクティブにします。",
    'WinActivate "メモ帳"',
    "一致しなければTargetErrorです。実ウィンドウは操作しません。",
  ],
  [
    "WinClose",
    "ウィンドウ",
    'WinClose "タイトル"',
    "モデルのウィンドウを閉じる操作を説明します。",
    'WinClose "メモ帳"',
    "対象ウィンドウが見つからなければTargetErrorを投げます（実物ではグループモード使用時を除く）。保存確認などアプリ固有の結果は未確認です。",
  ],
  [
    "SetTitleMatchMode",
    "ウィンドウ",
    "SetTitleMatchMode 1 / 2 / 3 / \"RegEx\" / \"Fast\" / \"Slow\"",
    "タイトルの一致方法（1：先頭一致、2：部分一致、3：完全一致、\"RegEx\"：正規表現）か、ウィンドウテキストの検索速度（\"Fast\"／\"Slow\"）を切り替えます。速度は一致方法とは独立に設定できます。",
    "SetTitleMatchMode 3",
    "この教材のモデルで対応するのは数値の1／2／3のみで、\"RegEx\"・\"Fast\"・\"Slow\"は未対応として停止します。",
  ],
  [
    "Click",
    "マウス",
    "Click X, Y",
    "アクティブウィンドウのクライアント座標でクリックを記録します。",
    "Click 10, 20",
    "座標モードは既定のClientのみです。画面上の効果は捏造しません。",
  ],
  [
    "MouseMove",
    "マウス",
    "MouseMove X, Y",
    "モデルのマウス座標を変更します。",
    "MouseMove 30, 40",
  ],
  [
    "Sleep",
    "制御",
    "Sleep ミリ秒",
    "待機を説明し、実時間は待ちません。",
    "Sleep 100",
  ],
  [
    "MsgBox",
    "入出力",
    'MsgBox "メッセージ"',
    "メッセージと未確定のボタン結果を扱います。",
    'MsgBox "完了"',
  ],
  [
    "InputBox",
    "入出力",
    'InputBox("質問").Value',
    "入力オブジェクトのValueは未確定のまま扱います。",
    'answer := InputBox("名前").Value',
  ],
  [
    "IsSet",
    "変数",
    "IsSet(変数)",
    "変数に値が代入されているかを調べ、代入済みなら1、未代入なら0を返します。引数の変数は評価されないため、未代入の変数を渡してもエラーになりません。空文字列が代入されている場合も代入済みです。",
    "x := 1\nMsgBox IsSet(x)\nMsgBox IsSet(y)",
    "対応している組み込み変数は常に値があるため、IsSetの結果は1です（未対応のA_Loop*系などは除きます）。",
  ],
  [
    "IsSetRef",
    "変数",
    "IsSetRef(&変数)",
    "参照（&変数）で受け取った変数に値が代入されているかを調べ、代入済みなら1、未代入なら0を返します。参照先は評価されないため、未代入でもエラーになりません。",
    "y := [1, 2]\nMsgBox IsSetRef(&y)\nMsgBox IsSetRef(&z)",
    "実物では型によらず代入済みなら1ですが、この教材のモデルは実物と異なり、参照先が配列・オブジェクトのときにだけ1を返し、代入済みの数値・文字列や未確定値でも0を返します（モデル側の制限です）。未代入のときは実物・モデルとも0です。",
  ],
  [
    "if",
    "制御",
    "if 条件 { … } else { … }",
    "成立するブロックを選びます。",
    'if x > 0 {\n MsgBox "正"\n}',
  ],
  [
    "Loop",
    "制御",
    "Loop 回数 { … } / Loop { … } Until 条件",
    "指定回数だけ本体を繰り返します。Until 節（Loop { … } Until 条件）を付けると、本体を1回実行するごとにその後で条件を評価し、条件が成立した時点で繰り返しを終了します。",
    'Loop 3 {\n SendText "A"\n}',
  ],
  [
    "for",
    "制御",
    "for Key, Value in Collection { … }",
    "コレクションの要素を順に取り出し、Key（配列では1始まりの添字、オブジェクトではプロパティ名）とValue（要素の値）へ代入しながら本体を繰り返します。変数が1つだけのときは、配列では値だけを受け取りますが、オブジェクトではプロパティ名を受け取ります。",
    "total := 0\nfor idx, v in [10, 20] {\n total += v\n}\nMsgBox total",
    "繰り返し対象が未確定値や配列・オブジェクトでない場合は未対応として停止します。このアプリのモデルでは、オブジェクトに対する変数1つの形でも値を受け取ります（実物ではプロパティ名を受け取る点が異なります）。",
  ],
  [
    "break",
    "制御",
    "break",
    "最も内側のループを直ちに終了し、ループの次の文から実行を続けます。",
    "Loop 5 {\n if A_Index = 2 {\n  break\n }\n MsgBox A_Index\n}",
    "ループの外で使うことはできません。",
  ],
  [
    "continue",
    "制御",
    "continue",
    "現在の繰り返しの残りの文を飛ばし、次の繰り返しへ進みます。",
    "Loop 3 {\n if A_Index = 2 {\n  continue\n }\n MsgBox A_Index\n}",
    "ループの外で使うことはできません。",
  ],
  [
    "return",
    "制御",
    "return / return 式",
    "現在の関数またはホットキー本体の実行を終えて、呼び出し側へ戻ります。式を付けると、その値が戻り値になります。",
    'MsgBox "前"\nreturn\nMsgBox "後"',
    "この教材ではユーザ関数定義が未対応のため、使用例はホットキー本体を途中で終える形です。式付きの形は関数内でのみ意味を持ちます。",
  ],
  [
    "A_Index",
    "変数",
    "A_Index",
    "現在実行中のループの繰り返し回数（1始まり）を保持する組み込み変数です。最も内側のループが優先され、ループの外では0です。配列の添字などに使います。",
    "Loop 3 {\n MsgBox A_Index\n}",
    "この教材のモデルでは、A_Indexへの代入によるループ制御は未対応です。",
  ],
  [
    "A_*（組み込み変数）",
    "変数",
    "A_Space / A_Tab / A_ScriptDir / A_Now ほか",
    "AutoHotkeyが用意する組み込み変数群で、多くは読み取り専用です。ただし一部は代入で設定を変更できます（A_WorkingDir・A_Clipboard・A_TitleMatchMode・A_SendMode・A_FileEncodingなど）。A_Space（空白1文字）とA_Tab（タブ1文字）は固定値です。それ以外は実行時に決まる値で、この教材では値を捏造せず「実行時に決まる値」として扱います（A_TitleMatchModeだけは例外で、現在の一致モード1／2／3を返します）。代表例：日時（A_YYYY・A_MM・A_DD・A_Hour・A_Min・A_Sec・A_MSec・A_Now・A_NowUTC・A_TickCount）、スクリプト情報（A_ScriptDir・A_ScriptName・A_ScriptFullPath・A_WorkingDir・A_AhkVersion・A_AhkPath・A_LineNumber）、環境とOS（A_UserName・A_ComputerName・A_OSVersion・A_WinDir・A_Temp・A_AppData・A_Desktop・A_ProgramFiles・A_ScreenWidth・A_ScreenHeight・A_IsAdmin・A_Clipboard）、スクリプト設定（A_TitleMatchMode・A_SendMode・A_KeyDelay・A_MouseDelay・A_DetectHiddenWindows・A_FileEncoding）などです。",
    'MsgBox "a" A_Space "b"\nMsgBox A_ScriptDir',
    "ループ専用のA_Loop*系（A_LoopField・A_LoopFileName・A_LoopReadLine・A_LoopRegNameなど）とA_ThisFuncは未対応で、読み取り時に名前を挙げて停止します。A_Indexは個別項目です。A_TitleMatchModeへの代入は、この教材のモデルではタイトル一致動作に反映されません（一致方法の変更にはSetTitleMatchModeを使ってください）。",
  ],
  [
    "Length",
    "プロパティ",
    "対象.Length",
    "配列では要素数を、文字列では文字数を返すプロパティです。配列では代入で長さを変更でき、長くすると値のない要素が増え、短くすると末尾が切り捨てられます。",
    'a := [10, 20, 30]\nMsgBox a.Length\nMsgBox "hello".Length',
    "プロパティ名は大文字小文字を区別しません（.lengthでも同じです）。文字列のLengthへは代入できません。",
  ],
  [
    "while",
    "制御",
    "while 条件 { … }",
    "条件が成立している間繰り返します。",
    "while n < 3 {\n n += 1\n}",
  ],
  [
    "Hotkey",
    "起動イベント",
    "^!n:: { … }",
    "モデルのeventが対応するときだけホットキー本体を説明します。",
    '^!n:: {\n SendText "Hello"\n}',
    "常時実行とは区別します。",
  ],
  [
    "Hotstring",
    "起動イベント",
    "::btw::by the way",
    "モデルのeventが::btwなら置換を説明します。",
    "::btw::by the way",
    "オプション付き・式・ブロック形式は未対応です。",
  ],
]);
for (const r of reference) {
  if (r.name === "Hotkey") continue;
  if (r.name === "Hotstring") {
    r.example += '\n^!n:: {\n MsgBox "モデルeventを::btwにすると置換を確認できます"\n}';
    r.caution += "モデルeventを::btw、ウィンドウ末尾をbtwにして置換を確認します。";
    continue;
  }
  const setup = r.name === "if" ? "x := 1\n" : r.name === "while" ? "n := 0\n" : "";
  r.example = "^!n:: {\n" + setup + r.example + "\n}";
}
// ---------------------------------------------------------------------------
// AutoHotkey source preparation. The shared ScriptParser (js/core/script.js)
// is case-sensitive about control keywords and its string tokenizer only
// maps the `n/`r/`t backtick escapes, so the AHK dialect absorbs those
// differences here, before parsing. Every pass preserves line breaks, so
// reported line numbers stay aligned with the learner's source.
// ---------------------------------------------------------------------------
const AHK_ESCAPE_FIX = { a: "\x07", b: "\x08", f: "\x0C", v: "\x0B" };
const AHK_KEYWORD_CASE = {
  if: "if",
  else: "else",
  while: "while",
  loop: "Loop",
  for: "for",
  return: "return",
  break: "break",
  continue: "continue",
};
function phaseA(source) {
  let out = "",
    i = 0,
    inString = null,
    inLineComment = false,
    inBlockComment = false;
  while (i < source.length) {
    const c = source[i];
    if (inLineComment) {
      out += c;
      if (c === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (c === "*" && source[i + 1] === "/") {
        out += "*/";
        i += 2;
        inBlockComment = false;
        continue;
      }
      out += c;
      i++;
      continue;
    }
    if (inString) {
      if (c === "`" && i + 1 < source.length) {
        const e = source[i + 1];
        // RG-44: convert the official control escapes the shared
        // tokenizer misses (`a `b `f `v) inside the literal itself.
        if (Object.hasOwn(AHK_ESCAPE_FIX, e)) {
          out += AHK_ESCAPE_FIX[e];
          i += 2;
          continue;
        }
        out += c + e;
        i += 2;
        continue;
      }
      if (c === inString) {
        if (source[i + 1] === inString) {
          out += c + c;
          i += 2;
          continue;
        }
        inString = null;
        out += c;
        i++;
        continue;
      }
      out += c;
      i++;
      continue;
    }
    if (c === ";") {
      // RG-68: v2 の ; は行頭か直前が空白／タブのときだけコメントになる。
      const prev = source[i - 1];
      if (i === 0 || prev === "\n" || prev === " " || prev === "\t")
        inLineComment = true;
      out += c;
      i++;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      // RG-68: v2 の /* は行頭（空白・タブを除く）にあるときだけコメントになる。
      if (atLineStart(source, i)) inBlockComment = true;
      out += "/*";
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = c;
      out += c;
      i++;
      continue;
    }
    const m = source.slice(i).match(/^[\p{ID_Start}_][\p{ID_Continue}_]*/u);
    if (m) {
      // RG-32: control keywords are case-insensitive in AutoHotkey v2;
      // normalize them to the spellings the shared parser matches.
      out += AHK_KEYWORD_CASE[m[0].toLowerCase()] ?? m[0];
      i += m[0].length;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}
function sanitizeParseError(e) {
  if (e instanceof PracticeError) {
    const m = e.message;
    // RG-08: never surface internal tokens (<eof>, .concat) or an empty
    // token name to learners.
    if (m.includes("<eof>") || m.includes(".concat") || m.includes("：\n") || m.endsWith("："))
      return new PracticeError(
        "式を解釈できません（式が途中で終わっています）",
        e.line || 1,
        e.category,
      );
  }
  return e;
}
// Splits a line into the code part and the trailing comment part (";" line
// comments and "/*" block comments), tracking string literals so a ";"
// or brace inside a string is never treated as syntax.
function splitCodeComment(line) {
  let inString = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inString) {
      if (c === "`") i++;
      else if (c === inString) {
        if (line[i + 1] === inString) i++;
        else inString = null;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      inString = c;
      continue;
    }
    // RG-68: v2 の ; は行頭か直前が空白／タブのときだけ、/* は行頭
    // （空白・タブのみ前置）のときだけコメントになる。
    if (c === ";" && (i === 0 || line[i - 1] === " " || line[i - 1] === "\t"))
      return { code: line.slice(0, i), comment: line.slice(i), opensBlock: false };
    if (c === "/" && line[i + 1] === "*" && /^[ \t]*$/.test(line.slice(0, i))) {
      const rest = line.slice(i);
      return { code: line.slice(0, i), comment: rest, opensBlock: !rest.includes("*/") };
    }
  }
  return { code: line, comment: "", opensBlock: false };
}
// RG-33: rewrite a Loop Until clause into a marker call placed directly
// after the loop statement; transformNodes folds it back into the loop
// node so the executor-side step hook can evaluate it after each pass.
function rewriteUntil(code) {
  let lead = code.match(/^(\s*)Until\b\s*(.+)$/i);
  if (lead) return `${lead[1]}__AHKUNTIL__(${lead[2].trim()})`;
  let inString = null;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (inString) {
      if (c === "`") i++;
      else if (c === inString) {
        if (code[i + 1] === inString) i++;
        else inString = null;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      inString = c;
      continue;
    }
    if (c === "}") {
      let m = code.slice(i + 1).match(/^\s*Until\b\s*(.+)$/i);
      if (m) return code.slice(0, i + 1) + ` __AHKUNTIL__(${m[1].trim()})`;
    }
  }
  return code;
}
// RG-08: constructs the dialect does not implement must stop with the
// construct named, not with a blamed argument, brace or comma. This scan
// runs on the phaseA output (strings and comments are single tokens, so
// keywords inside them never match).
function prescanAHK(source) {
  const tokens = lexAHK(source);
  const prevSig = (idx) => {
    for (let j = idx - 1; j >= 0; j--) if (tokens[j].k !== "nl") return tokens[j];
    return null;
  };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.k === "eof") break;
    // R27-N8：**= は AutoHotkey v2 公式の代入演算子表に存在しない
    // （複合代入は := += -= *= /= //= .= |= &= ^= >>= <<= >>>= のみ）。
    // 汎用の式エラーに落とさず、演算子そのものを名指して止める。
    if (t.v === "**=")
      unsupported(
        "複合代入演算子 **=（AutoHotkeyに **= という代入演算子はありません。累乗は x := x ** 3 の形で書きます）",
        t.line,
      );
    const prev = tokens[i - 1];
    const atStmtStart = !prev || prev.k === "nl" || prev.v === "{" || prev.v === "}";
    if (t.k !== "id") continue;
    const lower = t.v.toLowerCase();
    if (lower === "loop") {
      const nx = tokens[i + 1];
      if (
        nx && nx.k === "id" && nx.line === t.line &&
        ["files", "parse", "read", "reg"].includes(nx.v.toLowerCase())
      )
        unsupported("Loop " + nx.v.charAt(0).toUpperCase() + nx.v.slice(1).toLowerCase(), t.line);
    }
    if (!atStmtStart) continue;
    if (lower === "try" || lower === "catch" || lower === "finally") unsupported("Try／Catch", t.line);
    if (lower === "throw") unsupported("Throw", t.line);
    if (lower === "switch") unsupported("Switch", t.line);
    if (lower === "class") unsupported("class（クラス定義）", t.line);
    if (lower === "goto") unsupported("Goto", t.line);
    if (lower === "gosub") unsupported("Gosub", t.line);
    if (lower === "global" || lower === "static" || lower === "local") {
      const nx = tokens[i + 1];
      if (!(nx && nx.v === "(")) unsupported(lower + " 宣言", t.line);
    }
    // Label: a lone "name:" at a line start (not a record entry, whose
    // previous significant token is a comma or whose value follows).
    if (!prev || prev.k === "nl") {
      const n1 = tokens[i + 1],
        n2 = tokens[i + 2];
      if (
        n1 && n1.v === ":" && n1.line === t.line &&
        (!n2 || n2.k === "nl" || n2.k === "eof") &&
        prevSig(i)?.v !== ","
      )
        unsupported(`ラベル（${t.v}:）`, t.line);
    }
    // Function definition: Name(args) { with the brace on the same line.
    // (AutoHotkey itself reads a call followed by "{" as a definition.)
    if (
      !["if", "else", "while", "loop", "for", "return", "break", "continue", "until", "and", "or", "not"].includes(lower)
    ) {
      const n1 = tokens[i + 1];
      if (n1 && n1.v === "(" && n1.line === t.line) {
        let d = 0,
          j = i + 1;
        for (; j < tokens.length; j++) {
          if (tokens[j].v === "(") d++;
          else if (tokens[j].v === ")") {
            d--;
            if (d === 0) break;
          } else if (tokens[j].k === "eof") break;
        }
        const after = tokens[j + 1];
        if (after && after.v === "{" && after.line === tokens[j].line)
          unsupported(`関数定義（${t.v}）`, t.line);
      }
    }
  }
}
// RG-08: AHK's for loop (for Key, Value in Collection) is rewritten to a
// Loop whose count is a marker call; transformNodes folds it into an
// ahkForEach node executed by the semantics step hook.
function rewriteFor(code) {
  const m = code.match(
    /^(\s*)for\s+([\p{ID_Start}_][\p{ID_Continue}_]*)\s*(?:,\s*([\p{ID_Start}_][\p{ID_Continue}_]*)\s*)?in\s+(.+)$/iu,
  );
  if (!m) return code;
  const [, indent, n1, n2, rest] = m;
  let depth = 0,
    inString = null,
    brace = -1;
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    if (inString) {
      if (c === "`") i++;
      else if (c === inString) {
        if (rest[i + 1] === inString) i++;
        else inString = null;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      inString = c;
      continue;
    }
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "{") {
      // A "{" at depth 0 after the collection is the body brace; a
      // leading "{" opens an object-literal collection instead.
      if (depth === 0 && i > 0) {
        brace = i;
        break;
      }
      depth++;
    } else if (c === "}") {
      if (depth === 0) break;
      depth--;
    }
  }
  const coll = (brace >= 0 ? rest.slice(0, brace) : rest).trim();
  if (!coll) return code;
  const suffix = brace >= 0 ? " " + rest.slice(brace).trimStart() : "";
  const names = n2 ? `"${n1}", "${n2}"` : `"${n1}"`;
  return `${indent}Loop __AHKFOREACH__(${coll}, ${names})${suffix}`;
}
// RG-08 (R9-N8): the concatenation assignment `.=` is rewritten to its
// explicit form, instead of failing on the "=" token.
function rewriteDotAssign(code) {
  const m = code.match(
    /^(\s*)([\p{ID_Start}_][\p{ID_Continue}_]*(?:[ \t]*\.[ \t]*[\p{ID_Start}_][\p{ID_Continue}_]*|[ \t]*\[[^\]\n]*\])*)\s*\.=\s*(.+)$/u,
  );
  if (!m) return code;
  const target = m[2].replace(/[ \t]*\.[ \t]*/g, ".").replace(/[ \t]+\[/g, "[");
  return `${m[1]}${target} := ${target} . ${m[3]}`;
}
const AHK_STMT_KEYWORDS = new Set([
  "if", "else", "while", "loop", "for", "return", "break", "continue",
  "until", "try", "catch", "finally", "switch", "class", "global",
  "static", "local", "goto", "gosub", "throw",
]);
// RG-64 (R18-N6): AutoHotkey v2 built-in variables (official Variables
// reference). Runtime-determined values (clock, environment, screen,
// script paths) resolve to an indeterminate value labelled with the
// variable's own name — never a fabricated value, and never the false
// "undefined name" cause. A_Space/A_Tab are documented constants.
const AHK_BUILTIN_EXACT = { a_space: " ", a_tab: "\t" };
// The Loop-context family belongs to the Loop Files/Parse/Read/Reg
// forms this dialect stops as unsupported, and A_ThisFunc presupposes
// user functions; reads stop naming the built-in variable itself.
const AHK_BUILTIN_UNSUPPORTED = new Set([
  "a_loopfield", "a_loopfilename", "a_loopfileext", "a_loopfiledir",
  "a_loopfilefullpath", "a_loopfileshortpath", "a_loopfileshortname",
  "a_loopfiletimemodified", "a_loopfiletimecreated",
  "a_loopfiletimeaccessed", "a_loopfileattrib", "a_loopfilesize",
  "a_loopfilesizekb", "a_loopfilesizemb", "a_loopreadline",
  "a_loopregname", "a_loopregtype", "a_loopregkey", "a_loopregsubkey",
  "a_loopregtimemodified", "a_thisfunc",
]);
const AHK_BUILTIN_RUNTIME = new Set([
  "a_ahkpath", "a_ahkversion", "a_allowmainwindow", "a_appdata",
  "a_appdatacommon", "a_args", "a_clipboard", "a_comspec",
  "a_computername", "a_controldelay", "a_coordmodecaret",
  "a_coordmodemenu", "a_coordmodemouse", "a_coordmodepixel",
  "a_coordmodetooltip", "a_cursor", "a_dd", "a_ddd", "a_dddd",
  "a_defaultmousespeed", "a_desktop", "a_desktopcommon",
  "a_detecthiddentext", "a_detecthiddenwindows", "a_endchar",
  "a_eventinfo", "a_fileencoding", "a_hotkeyinterval",
  "a_hotkeymodifiertimeout", "a_hour", "a_iconfile", "a_iconhidden",
  "a_iconnumber", "a_icontip", "a_initialworkingdir", "a_is64bitos",
  "a_isadmin", "a_iscompiled", "a_iscritical", "a_ispaused",
  "a_issuspended", "a_keydelay", "a_keydelayplay", "a_keyduration",
  "a_keydurationplay", "a_language", "a_lasterror", "a_linefile",
  "a_linenumber", "a_listlines", "a_maxhotkeysperinterval", "a_mday",
  "a_menumaskkey", "a_min", "a_mm", "a_mmm", "a_mmmm", "a_mon",
  "a_mousedelay", "a_mousedelayplay", "a_msec", "a_mydocuments",
  "a_now", "a_nowutc", "a_osversion", "a_priorhotkey", "a_priorkey",
  "a_programfiles", "a_programs", "a_programscommon", "a_ptrsize",
  "a_regview", "a_screendpi", "a_screenheight", "a_screenwidth",
  "a_scriptdir", "a_scriptfullpath", "a_scripthwnd", "a_scriptname",
  "a_sec", "a_sendlevel", "a_sendmode", "a_startmenu",
  "a_startmenucommon", "a_startup", "a_startupcommon",
  "a_storecapslockmode", "a_temp", "a_thishotkey", "a_tickcount",
  "a_timeidle", "a_timeidlekeyboard", "a_timeidlemouse",
  "a_timeidlephysical", "a_timesincepriorhotkey",
  "a_timesincethishotkey", "a_titlematchmode", "a_titlematchmodespeed",
  "a_traymenu", "a_username", "a_wday", "a_windelay", "a_windir",
  "a_workingdir", "a_yday", "a_yweek", "a_year", "a_yyyy",
]);
const AHK_COMMAND_NAMES = new Set([
  "msgbox", "send", "sendtext", "winactivate", "winclose", "click",
  "mousemove", "sleep", "tooltip", "settitlematchmode", "winexist",
  "winactive", "inputbox",
]);
// RG-08: statement-form (parenthesis-free) calls are rewritten to the
// parenthesized form the shared parser handles uniformly. This fixes the
// argument shapes the parser's own statement-form path mangled: a leading
// unary sign (R3-N1), one-character bracket/paren strings (R6-N6), and
// explicit concatenation in argument position.
function rewriteSegment(seg) {
  const m = seg.match(
    /^([ \t]*)([\p{ID_Start}_][\p{ID_Continue}_]*(?:[ \t]*\.[ \t]*[\p{ID_Start}_][\p{ID_Continue}_]*)*)[ \t]+(.+?)([ \t]*)$/u,
  );
  if (m) {
    const [, indent, rawName, rest, trail] = m;
    const name = rawName.replace(/[ \t]+/g, "");
    if (!name.includes(".") && AHK_STMT_KEYWORDS.has(name.toLowerCase())) return seg;
    if (
      /^(:=|==|!=|<=|>=|\+=|-=|\*=|\/=|\*\*=|&=|\|=|\^=|<<=|>>=|>>>=|\.=|&&|\|\|)/.test(rest) ||
      /^[=*\/(\[{?:,|<>.%^]/.test(rest)
    )
      return seg;
    if (/^[+-]/.test(rest)) {
      // A sign-led first argument belongs to a call only when the name is
      // a known command or a PascalCase function name; a lowercase plain
      // name keeps the expression-statement reading (x - 3).
      if (
        !name.includes(".") &&
        !AHK_COMMAND_NAMES.has(name.toLowerCase()) &&
        !/^[A-Z]/.test(name)
      )
        return seg;
    }
    return `${indent}${name}(${rest})${trail}`;
  }
  const bare = seg.match(/^([ \t]*)([\p{ID_Start}_][\p{ID_Continue}_]*)([ \t]*)$/u);
  if (bare && AHK_COMMAND_NAMES.has(bare[2].toLowerCase()))
    return `${bare[1]}${bare[2]}()${bare[3]}`;
  return seg;
}
function rewriteStatements(code) {
  const pieces = [],
    delims = [];
  let cur = "",
    inString = null;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (inString) {
      cur += c;
      if (c === "`") {
        cur += code[i + 1] ?? "";
        i++;
      } else if (c === inString) {
        if (code[i + 1] === inString) {
          cur += code[i + 1];
          i++;
        } else inString = null;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      inString = c;
      cur += c;
      continue;
    }
    if (c === "{" || c === "}") {
      pieces.push(cur);
      delims.push(c);
      cur = "";
      continue;
    }
    cur += c;
  }
  pieces.push(cur);
  let out = "";
  for (let j = 0; j < pieces.length; j++) {
    // A piece followed by "{" is a control/hotkey header, not a statement.
    out += delims[j] === "{" ? pieces[j] : rewriteSegment(pieces[j]);
    if (delims[j]) out += delims[j];
  }
  return out;
}
function transformCodeLine(line) {
  const { code, comment, opensBlock } = splitCodeComment(line);
  let c = rewriteUntil(code);
  c = rewriteFor(c);
  c = rewriteDotAssign(c);
  c = rewriteStatements(c);
  return { text: c + comment, opensBlock };
}
// R27-N15：行継続の妥当性検査のための、文字列リテラルを伏せたコード形。
// 文字列の中の演算子・括弧・セミコロンを構文として数えないため、
// リテラル全体を "" へ置き換える（バッククォートエスケープと引用符の
// 二重化は共有トークナイザと同じ規則で読み飛ばす）。
function maskAhkStrings(code) {
  let out = "",
    inString = null;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (inString) {
      if (c === "`") i++;
      else if (c === inString) {
        if (code[i + 1] === inString) i++;
        else {
          inString = null;
          out += '"';
        }
      }
      continue;
    }
    if (c === '"' || c === "'") {
      inString = c;
      out += '"';
      continue;
    }
    out += c;
  }
  return out;
}
// 行末が未完の式かどうか（代入の空の右辺・二項／複合演算子・三項の
// ? と :・連結子等で終わる形）。ラベル行（名前だけ＋:）とホットキー
// 行（:: で終わる形）は式ではないため除く。
function ahkLineEndsIncomplete(maskedTrimmed) {
  if (!maskedTrimmed) return false;
  if (maskedTrimmed.endsWith("::")) return false;
  // 後置 ++ ／ -- で終わる行は完全な式（継続演算子の対象外。公式の
  // 継続行規則でも ++ ／ -- は例外と明記されている）。
  if (maskedTrimmed.endsWith("++") || maskedTrimmed.endsWith("--"))
    return false;
  if (/^[\p{ID_Start}_][\p{ID_Continue}_]*\s*:$/u.test(maskedTrimmed))
    return false;
  // 小数点で終わる数値リテラル（1. 等）は完全な式であり、連結子ではない。
  const s = /\d\.$/.test(maskedTrimmed)
    ? maskedTrimmed.slice(0, -1)
    : maskedTrimmed;
  return /(:=|\+=|-=|\*=|\/=|\*\*=|&=|\|=|\^=|<<=|>>=|>>>=|\.=|\*\*|==|!=|<=|>=|&&|\|\||<<|>>>|>>|[-+*\/%^&|<>?:.,!~])$/.test(
    s,
  );
}
// 次の行が「文」で始まる形かどうか：コマンド形式の呼出（rewriteSegment
// で呼出式へ書換わる形）に加え、代入文で始まる行も式の被演算子には
// ならない（代入が被演算子になるのは括弧で囲った場合だけ）。
function ahkLineStartsStatement(code) {
  if (rewriteSegment(code) !== code) return true;
  return /^\s*[\p{ID_Start}_][\p{ID_Continue}_]*(?:\s*\.\s*[\p{ID_Start}_][\p{ID_Continue}_]*|\s*\[[^\]\n]*\])*\s*(:=|\+=|-=|\*=|\/=|\*\*=|&=|\|=|\^=|<<=|>>=|>>>=|\.=)/u.test(
    code,
  );
}
function phaseB(source) {
  let inBlock = false;
  // R27-N15：行継続の妥当性検査。前の有意な行が未完の式で終わって
  // いるのに、次の行がコマンド形式の文（書換で呼出式に化ける形）で
  // 始まる場合、その文は式の被演算子にはならない（AutoHotkey v2 の
  // 継続は式同士を繋ぐもので、文は式の続きにならない）。従来は行ごと
  // の書換で MsgBox x が MsgBox(x) という正当な呼出式に化け、共有
  // パーサの行継続が無言で飲み込んでいた（後続文の消失・次行への
  // 誤帰属）。コマンド形式かどうかは書換前の形でしか判別できない
  // ため、検査はこの準備層に置く。括弧・角括弧の内側（enclosure に
  // よる継続）は対象外とする。
  let prevIncompleteLine = 0;
  let enclosureDepth = 0;
  return source
    .split("\n")
    .map((line, idx) => {
      let text, analysisCode;
      if (inBlock) {
        const end = line.indexOf("*/");
        if (end < 0) return line;
        inBlock = false;
        const rest = line.slice(end + 2);
        text = line.slice(0, end + 2) + transformCodeLine(rest).text;
        analysisCode = splitCodeComment(rest).code;
      } else {
        const { code } = splitCodeComment(line);
        analysisCode = code;
        if (
          prevIncompleteLine &&
          enclosureDepth === 0 &&
          code.trim() &&
          ahkLineStartsStatement(code)
        )
          throw new PracticeError(
            `式が途中で終わっています：${prevIncompleteLine}行目の式が未完成のまま、次の文が始まっています`,
            prevIncompleteLine,
            "SyntaxError",
          );
        const r = transformCodeLine(line);
        inBlock = r.opensBlock;
        text = r.text;
      }
      const masked = maskAhkStrings(analysisCode);
      for (const ch of masked) {
        if (ch === "(" || ch === "[") enclosureDepth++;
        else if (ch === ")" || ch === "]")
          enclosureDepth = Math.max(0, enclosureDepth - 1);
      }
      const trimmed = masked.trim();
      if (trimmed)
        prevIncompleteLine = ahkLineEndsIncomplete(trimmed) ? idx + 1 : 0;
      return text;
    })
    .join("\n");
}
// Minimal AHK lexer used by the preparation passes (prescan and phaseC).
// It mirrors the shared tokenizer's token boundaries closely enough for
// those passes; the authoritative parse still happens in ScriptParser.
function lexAHK(source) {
  const tokens = [];
  let i = 0,
    line = 1;
  const push = (v, k, start, startLine) =>
    tokens.push({ v, k, line: startLine, start, end: i });
  while (i < source.length) {
    const c = source[i];
    if (c === "\n") {
      tokens.push({ v: "\n", k: "nl", line, start: i, end: i + 1 });
      line++;
      i++;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r" || c === "\x0B" || c === "\x0C") {
      i++;
      continue;
    }
    // RG-68: lexAHK も v2 のコメント規則に合わせる（; は行頭／空白・タブの後、
    // /* は行頭のときだけコメント）。それ以外は通常のトークンとして扱う。
    if (
      c === ";" &&
      (i === 0 || source[i - 1] === "\n" || source[i - 1] === " " || source[i - 1] === "\t")
    ) {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && source[i + 1] === "*" && atLineStart(source, i)) {
      let end = source.indexOf("*/", i + 2);
      let stop = end < 0 ? source.length : end + 2;
      if (source.slice(i, stop).includes("\n"))
        tokens.push({ v: "\n", k: "nl", line, start: i, end: i + 1 });
      line += source.slice(i, stop).split("\n").length - 1;
      i = stop;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c,
        start = i,
        startLine = line;
      i++;
      while (i < source.length) {
        const ch = source[i];
        if (ch === "`") {
          i += 2;
          continue;
        }
        if (ch === quote) {
          if (source[i + 1] === quote) {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        if (ch === "\n") {
          line++;
          i++;
          break;
        }
        i++;
      }
      push(source.slice(start, i), "string", start, startLine);
      continue;
    }
    let m = source.slice(i).match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
    if (m) {
      const start = i;
      i += m[0].length;
      push(m[0], "number", start, line);
      continue;
    }
    m = source.slice(i).match(/^[\p{ID_Start}_][\p{ID_Continue}_]*/u);
    if (m) {
      const start = i;
      i += m[0].length;
      push(m[0], "id", start, line);
      continue;
    }
    m = source
      .slice(i)
      .match(/^(===|!==|%\/%|%%|%in%|<-|->|:=|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|\*\*=|&=|\|=|\^=|<<=|<<|>>=|>>|>>>=|::|=>|<>|\[\[|\]\]|\.=)/);
    if (m) {
      const start = i;
      i += m[0].length;
      push(m[0], "op", start, line);
      continue;
    }
    const start = i;
    i++;
    push(c, "op", start, line);
  }
  tokens.push({ v: "<eof>", k: "eof", line, start: source.length, end: source.length });
  return tokens;
}
const AHK_CONCAT_KEYWORDS = new Set([
  "if", "else", "while", "Loop", "for", "return", "break", "continue",
  "until", "try", "catch", "finally", "switch", "class", "global",
  "static", "local", "goto", "gosub", "throw", "and", "or", "not", "in", "is",
]);
function phaseC(source) {
  const tokens = lexAHK(source);
  let out = "",
    lastEnd = 0,
    prevSig = null,
    prevNameChain = false,
    stmtStart = true,
    encloseDepth = 0,
    sawNl = false;
  const insertBefore = (tok, text) => {
    out += source.slice(lastEnd, tok.start) + text;
    lastEnd = tok.start;
  };
  const isOperandEnd = (t) =>
    t.k === "string" || t.k === "number" || t.k === "id" || t.v === ")" || t.v === "]";
  const isOperandStart = (t) =>
    t.k === "string" || t.k === "number" || t.k === "id" || t.v === "(";
  for (const tok of tokens) {
    if (tok.k === "nl") {
      sawNl = true;
      stmtStart = true;
      continue;
    }
    if (tok.k === "eof") break;
    // A dotted name at the start of a statement is a statement-form call
    // target (MsgBox …, obj.Method …): the juxtaposition with its first
    // argument is the call itself, never implicit concatenation.
    const curNameChain =
      tok.k === "id" && (stmtStart || (prevSig?.v === "." && prevNameChain));
    if (prevSig) {
      if (
        // RG-08 (R13-N7): an omitted middle argument becomes an explicit
        // empty argument instead of a parse error naming the comma.
        tok.v === "," &&
        (prevSig.v === "," || prevSig.v === "(" || prevSig.v === "[")
      )
        insertBefore(tok, '"" ');
      else if (
        // RG-13: implicit concatenation. Two operands separated only by
        // whitespace (on one line, or continued inside parentheses /
        // brackets) gain the operator AutoHotkey implies.
        isOperandEnd(prevSig) &&
        isOperandStart(tok) &&
        !prevNameChain &&
        !(sawNl && encloseDepth === 0) &&
        !(prevSig.k === "id" && AHK_CONCAT_KEYWORDS.has(prevSig.v)) &&
        !(tok.k === "id" && AHK_CONCAT_KEYWORDS.has(tok.v)) &&
        !(tok.v === "(" && prevSig.k === "id")
      ) {
        const gap = source.slice(prevSig.end, tok.start);
        if (/\s/.test(gap) || gap.includes(";") || gap.includes("/*"))
          insertBefore(tok, " . ");
      }
    }
    out += source.slice(lastEnd, tok.end);
    lastEnd = tok.end;
    if (tok.v === "(" || tok.v === "[") encloseDepth++;
    else if (tok.v === ")" || tok.v === "]") encloseDepth--;
    prevSig = tok;
    prevNameChain = curNameChain;
    stmtStart = tok.v === "{" || tok.v === "}";
    sawNl = false;
  }
  out += source.slice(lastEnd);
  return out;
}
function prepareAHK(source) {
  const normalized = phaseA(source);
  prescanAHK(normalized);
  return phaseC(phaseB(normalized));
}
// Folds dialect marker nodes produced by the source preparation back into
// the statements they belong to (RG-33 Until clauses; RG-08 for loops are
// folded in transformLoopMarkers).
function transformNodes(list) {
  for (let i = 0; i < list.length; i++) {
    let n = list[i];
    if (!n || typeof n !== "object") continue;
    if (
      n.k === "repeat" &&
      n.count?.k === "call" &&
      callName(n.count.target).toLowerCase() === "__ahkforeach__"
    ) {
      const args = n.count.args ?? [];
      const names = args.slice(1).map((a) => (a.k === "literal" ? a.value : null));
      list[i] = n = {
        k: "ahkForEach",
        collection: args[0],
        indexName: names.length > 1 ? names[0] : null,
        valueName: names[names.length - 1] ?? null,
        body: n.body,
        line: n.line,
        refs: ["for"],
      };
    }
    if (
      n.k === "expression" &&
      n.value?.k === "call" &&
      callName(n.value.target).toLowerCase() === "__ahkuntil__"
    ) {
      const prev = list[i - 1];
      if (
        prev &&
        (prev.k === "repeat" || prev.k === "while") &&
        (prev.refs || []).includes("Loop") &&
        !prev.untilCond &&
        n.value.args[0]
      ) {
        prev.untilCond = n.value.args[0];
        prev.untilLine = n.line;
        list.splice(i, 1);
        i--;
        continue;
      }
    }
    for (const key of ["body", "otherwise"])
      if (Array.isArray(n[key])) transformNodes(n[key]);
  }
}
function parseProgram(source) {
  let nodes;
  try {
    nodes = new ScriptParser(prepareAHK(source), "ahk").program();
  } catch (e) {
    throw sanitizeParseError(e);
  }
  transformNodes(nodes);
  return nodes;
}
function parseAHK(code, event) {
  let lines = code.split("\n"),
    masked = lines.map((l) =>
      /^\s*#Requires\s+AutoHotkey\s+v2/i.test(l) ? "" : l,
    ),
    handlers = [],
    base = [],
    i = 0;
  while (i < masked.length) {
    let l = masked[i],
      hot = l.match(/^\s*([^;\s].*?)::\s*(.*)$/);
    if (hot && !l.trim().startsWith("::")) {
      let start = i,
        key = hot[1],
        tail = hot[2];
      if (tail.trim().startsWith("{")) {
        let src = tail,
          depth = 0,
          closed = false;
        for (let j = i; j < masked.length; j++) {
          let segment = j === i ? tail : masked[j];
          let ts = new ScriptParser(segment, "ahk").ts;
          for (let t of ts) {
            if (t.v === "{") depth++;
            if (t.v === "}") depth--;
          }
          if (j > i) src += "\n" + segment;
          if (depth === 0) {
            closed = true;
            i = j;
            break;
          }
        }
        if (!closed)
          throw new PracticeError("ホットキーの } がありません", start + 1);
        handlers.push({
          key,
          start,
          source: "\n".repeat(start) + src,
          kind: "Hotkey",
        });
      } else
        handlers.push({
          key,
          start,
          source: "\n".repeat(start) + tail,
          kind: "Hotkey",
        });
      for (let j = start; j <= i; j++) base[j] = "";
      i++;
      continue;
    }
    let hs = l.match(/^\s*::([^:]+)::(.*)$/);
    if (hs) {
      handlers.push({
        key: "::" + hs[1],
        start: i,
        replacement: hs[2],
        kind: "Hotstring",
      });
      base[i] = "";
    } else base[i] = l;
    i++;
  }
  let nodes = parseProgram(base.join("\n"));
  if (event) {
    let handler = handlers.find((h) => h.key === event);
    if (!handler)
      throw new PracticeError(
        "モデルのeventに対応するホットキー／ホットストリングがありません",
        1,
      );
    let body =
      handler.replacement !== undefined
        ? [
            {
              k: "action",
              action: "Hotstring",
              text: handler.replacement,
              line: handler.start + 1,
              refs: ["Hotstring"],
            },
          ]
        : parseProgram(handler.source);
    nodes.push({
      k: "action",
      action: "HotkeyEvent",
      body,
      line: handler.start + 1,
      refs: [handler.kind],
    });
  }
  return { nodes, handlers };
}
export const definition = {
  id: "autohotkey",
  name: "AutoHotkey v2",
  extensions: [".ahk", ".txt"],
  syntax: { name: "AutoHotkey v2", lineComment: ";", caseSensitive: false },
  reference,
  templates: [
    {
      id: "ahk-hotkey",
      title: "ホットキーでウィンドウへ入力",
      code: '#Requires AutoHotkey v2.0\n^!n:: {\n    WinActivate "メモ帳"\n    SendText "こんにちは"\n    Send "{Enter}"\n}',
      intro:
        "モデルのeventで^!nを発火します。WinActivateとSendTextの結果をモデルウィンドウで追います。",
      refs: ["Hotkey", "WinActivate", "SendText", "Send"],
    },
    {
      id: "ahk-hotstring",
      title: "ホットストリングの置換",
      code: "#Requires AutoHotkey v2.0\n::btw::by the way",
      model: {
        event: "::btw",
        variables: {},
        windows: [{ id: 1, title: "メモ帳", text: "btw", exists: true }],
        activeId: 1,
        mouse: { x: 0, y: 0 },
        keys: [],
      },
      intro:
        "モデルeventを::btwとして、対応する置換だけを説明します。既定のホットストリングは終端文字で発火しますが、ここでは発火後のイベントを明示します。",
      refs: ["Hotstring"],
    },
    {
      id: "ahk-loop",
      title: "入力と条件・繰り返し",
      code: '#Requires AutoHotkey v2.0\nanswer := InputBox("続けますか").Value\nif answer = "はい" {\n    Loop 2 {\n        SendText "A"\n    }\n} else {\n    MsgBox "終了"\n}',
      model: {
        event: null,
        variables: {},
        windows: [{ id: 1, title: "メモ帳", text: "", exists: true }],
        activeId: 1,
        mouse: { x: 0, y: 0 },
        keys: [],
      },
      intro:
        "InputBoxのValueは未確定です。対応する側だけが実行され、入力の値を仮定して捏造しません。",
      refs: ["InputBox", "if", "Loop", "SendText", "MsgBox"],
    },
  ],
  glossary: [
    ["ホットキー", "キーの組み合わせを起動イベントにする仕組みです。"],
    ["ホットストリング", "入力した短い文字列を置き換える仕組みです。"],
    [
      "自動実行",
      "スクリプトの冒頭部分で、起動時に上から順に実行される区間です。ホットキーなどの定義が始まるまでが自動実行部分になります。",
    ],
    [
      "未確定（値）",
      "実行時に決まる値のことです。このアプリでは値を仮定して作らず、未確定のまま扱って、到達可能な分岐をすべて表示します。",
    ],
  ],
  model: {
    kind: "json",
    title: "モデル入力イベント・ウィンドウ",
    hint: "eventで発火するホットキー／ホットストリングを指定します。nullなら自動実行部分だけ。Windowsは操作しません。",
    defaults: {
      event: "^!n",
      variables: {},
      windows: [{ id: 1, title: "メモ帳", text: "", exists: true }],
      activeId: 1,
      mouse: { x: 0, y: 0 },
      keys: [],
    },
  },
  semantics: {
    description:
      "AutoHotkey v2の起動部分とイベント本体を分離し、モデルのアクティブウィンドウ・送信キー・マウスを更新します。",
    support:
      "ホットキーの単一イベント、単純ホットストリング、代入、If、Loop（Until 節・For を含む）、While、掲載関数、IsSet／IsSetRef、組み込み変数 A_*（値は実行時に決まるものとして扱い、A_Space・A_Tab は固定値）に対応。キーワード・プロパティ名は大文字小文字を区別しません。配列の添字は1始まり、真偽結果は 1／0 で表示します。空白による暗黙の連結と省略引数にも対応します。整数は安全整数範囲内のモデル。整数除算 //・64ビットのビット演算は未対応として停止します。#HotIf、タイマー、複雑なSend記法、CoordMode変更、ユーザ関数定義、Try／Catch、Switch、クラス定義、ラベル／Goto、Loop Files／Parse／Read 等は未対応として停止します。",
    sources: [
      {
        title: "AutoHotkey公式 v2ドキュメント",
        url: "https://github.com/AutoHotkey/AutoHotkeyDocs/tree/v2/docs",
      },
      {
        title: "AutoHotkey公式 ホットキー",
        url: "https://www.autohotkey.com/docs/v2/Hotkeys.htm",
      },
    ],
  },
  scan(code) {
    let found = scanScript(code, reference, "ahk");
    if (/::/.test(code))
      found.unshift(code.trim().includes("::btw") ? "Hotstring" : "Hotkey");
    // R22: built-in variables A_* have no reference item of their own
    // (except A_Index), so scanScript can never surface them. Resolve
    // every implemented A_* name in the code to the A_Index item or
    // the bundled A_* item, mirroring the cmd dynamic-variable
    // bundling. The 21 names in AHK_BUILTIN_UNSUPPORTED stop by name
    // at run time and are deliberately not resolved, and neither are
    // names that are not built-ins at all.
    for (const m of code.matchAll(/\bA_[A-Za-z0-9_]+\b/gi)) {
      const lower = m[0].toLowerCase();
      if (lower === "a_index") {
        if (!found.includes("A_Index")) found.push("A_Index");
      } else if (
        Object.hasOwn(AHK_BUILTIN_EXACT, lower) ||
        AHK_BUILTIN_RUNTIME.has(lower)
      ) {
        if (!found.includes("A_*（組み込み変数）"))
          found.push("A_*（組み込み変数）");
      }
    }
    return [...new Set(found)];
  },
  async simulate(code, model, limits) {
    try {
      let { nodes } = parseAHK(code, model.event);
      // RG-72／RG-73: v2 では数値文字列は数値として解釈される。空文字列や
      // 空白だけの文字列は数値文字列ではない（数値として解釈できる場合は
      // その数値を、できない場合は null を返す）。
      function ahkNumericValue(v) {
        if (typeof v !== "string") return null;
        const text = v.trim();
        if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return Number(text);
        if (/^[+-]?0x[0-9a-f]+$/i.test(text)) return parseInt(text, 16);
        return null;
      }
      function numeric(value, node, api) {
        let v = value;
        if (typeof v === "boolean") v = Number(v);
        if (typeof v === "string") {
          const text = v.trim();
          if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) v = Number(text);
          else if (/^[+-]?0x[0-9a-f]+$/i.test(text)) v = parseInt(text, 16);
          else api.fail("数値または数値文字列が必要です", node, "TypeError");
        }
        if (typeof v !== "number") api.fail("数値または数値文字列が必要です", node, "TypeError");
        if (!Number.isFinite(v) || (Number.isInteger(v) && !Number.isSafeInteger(v))) api.fail("未確認：AutoHotkeyの数値がこのモデルの安全整数・有限数の範囲外です", node, "未確認");
        return v;
      }
      // RG-19: AutoHotkey v2 arrays are 1-based (a negative index counts
      // back from the end). Convert an evaluated subscript to the integer
      // the user wrote, rejecting non-integers honestly.
      function ahkIndex(value, node) {
        let v = value;
        if (typeof v === "boolean") v = Number(v);
        if (typeof v === "string" && /^[+-]?\d+$/.test(v.trim())) v = parseInt(v.trim(), 10);
        if (typeof v !== "number" || !Number.isInteger(v))
          throw new PracticeError("添字は整数で指定してください", node?.line || 1, "TypeError");
        return v;
      }
      function ahkArrayPos(length, n, node, api) {
        let pos = n < 0 ? length + n + 1 : n;
        if (pos < 1 || pos > length) api.fail("添字が有効範囲にありません", node, "IndexError");
        return pos;
      }
      function setVarCI(s, name, value) {
        let key = Object.keys(s.vars).find((k) => k.toLowerCase() === name.toLowerCase());
        s.vars[key ?? name] = value;
      }
      // RG-55: AutoHotkey v2 has no distinct boolean display form; truth
      // values are the numbers 1 and 0. Convert JS booleans (which only
      // enter through the shared executor or raw model data) before any
      // learner-facing formatting in this dialect.
      function ahkDisplay(v) {
        if (typeof v === "boolean") return v ? 1 : 0;
        if (Array.isArray(v)) return v.map(ahkDisplay);
        if (v && typeof v === "object" && !isUnknown(v) && v.kind === undefined && !v.__class)
          return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ahkDisplay(x)]));
        return v;
      }
      const fmt = (v) => formatValue(ahkDisplay(v));
      // NX-N23: the shared executor names an assignment target via
      // callName(), which covers variables and properties (o.Score)
      // but returns "" for a subscript, so subscript assignments were
      // narrated as 「対象 に …」. Render the target from the AST so
      // a[2] / o.list[1] are named with their subscript.
      function ahkExprLabel(a) {
        if (!a || typeof a !== "object") return "";
        switch (a.k) {
          case "literal":
            return typeof a.value === "string" ? `"${a.value}"` : String(a.value);
          case "var":
            return a.name;
          case "member": {
            const t = ahkExprLabel(a.target);
            return t ? `${t}.${a.name}` : "";
          }
          case "index": {
            const t = ahkExprLabel(a.target);
            if (!t) return "";
            const parts = (a.indexes || []).map(ahkExprLabel);
            if (!parts.length || parts.some((p) => p === "")) return "";
            return `${t}[${parts.join(", ")}]`;
          }
          case "binary": {
            const l = ahkExprLabel(a.a),
              r = ahkExprLabel(a.b);
            return l && r ? `${l} ${a.op === ".concat" ? "." : a.op} ${r}` : "";
          }
          case "unary": {
            const x = ahkExprLabel(a.arg);
            return x ? `${a.op}${x}` : "";
          }
          case "post": {
            const x = ahkExprLabel(a.target);
            return x ? `${x}${a.op}` : "";
          }
          case "call": {
            const t = ahkExprLabel(a.target);
            if (!t) return "";
            const args = (a.args || []).map(ahkExprLabel);
            return args.some((x) => x === "") ? "" : `${t}(${args.join(", ")})`;
          }
          default:
            return "";
        }
      }
      // RG-33: executes a Loop node carrying an Until condition. Mirrors
      // the shared executor's loop bookkeeping (iteration notes, A_Index
      // via loopIterations, break/continue/return signals, path caps) and
      // evaluates the Until expression after every pass, so a Loop…Until
      // can no longer vanish silently.
      function runUntilLoop(n, s, api) {
        let active = [s],
          done = [],
          countLimit = null;
        if (n.k === "repeat" && n.count) {
          countLimit = api.read(n.count, s);
          if (isUnknown(countLimit) || !Number.isInteger(countLimit) || countLimit < 0)
            unsupported("未確定または不正な回数", n.line);
        }
        for (let i = 0; active.length; i++) {
          let next = [];
          for (let st of active) {
            if (st.halt || st.signal) {
              done.push(st);
              continue;
            }
            if (countLimit !== null && i >= countLimit) {
              api.note(st, n, `${i}回実行してループを終了します`);
              done.push(st);
              continue;
            }
            if (i >= LIMITS.iterations) {
              api.note(st, n, "ループ上限で説明を停止しました", "limit");
              st.halt = true;
              done.push(st);
              continue;
            }
            api.note(st, n, `繰り返し ${i + 1}回目`);
            st.loopDepth = (st.loopDepth || 0) + 1;
            (st.loopIterations ??= []).push(i + 1);
            for (let out of api.run(n.body, [st])) {
              out.loopDepth--;
              out.loopIterations.pop();
              if (out.signal === "break") {
                out.signal = null;
                done.push(out);
                continue;
              }
              if (out.halt || out.signal === "return") {
                done.push(out);
                continue;
              }
              out.signal = null;
              let uv = api.read(n.untilCond, out);
              if (isUnknown(uv) && i >= 2) {
                api.note(out, n, "2回より多く続く可能性があります。後続状態は未確定です", "limit");
                out.halt = true;
                done.push(out);
                continue;
              }
              for (let r of api.choose(out, uv, n)) {
                if (r.yes) {
                  api.note(r.s, n, "Until の条件が成立したためループを終了します");
                  done.push(r.s);
                } else next.push(r.s);
              }
            }
          }
          active = next;
          if (done.length + active.length > LIMITS.paths) {
            done = done.slice(0, LIMITS.paths);
            active = active.slice(0, Math.max(0, LIMITS.paths - done.length));
          }
        }
        return done;
      }
      // RG-08: executes an ahkForEach node (for Key, Value in Collection).
      // Arrays iterate with their 1-based indices, objects with their
      // property names, mirroring the executor's bookkeeping.
      function runForEach(n, s, api) {
        const coll = api.read(n.collection, s);
        if (isUnknown(coll) || coll === null || typeof coll !== "object")
          unsupported("未確定または配列でない繰り返し対象", n.line);
        const entries = Array.isArray(coll)
          ? coll.map((v, i) => [i + 1, v])
          : Object.entries(coll);
        let active = [s];
        let done = [];
        for (let i = 0; i < entries.length; i++) {
          if (i >= LIMITS.iterations) {
            for (let st of active) {
              api.note(st, n, "ループ上限で説明を停止しました", "limit");
              st.halt = true;
              done.push(st);
            }
            active = [];
            break;
          }
          let next = [];
          for (let st of active) {
            if (st.halt || st.signal) {
              done.push(st);
              continue;
            }
            const [key, value] = entries[i];
            if (n.indexName) setVarCI(st, n.indexName, key);
            if (n.valueName)
              setVarCI(st, n.valueName, typeof value === "boolean" ? (value ? 1 : 0) : value);
            api.note(st, n, `繰り返し ${i + 1}回目`);
            st.loopDepth = (st.loopDepth || 0) + 1;
            (st.loopIterations ??= []).push(i + 1);
            for (let out of api.run(n.body, [st])) {
              out.loopDepth--;
              out.loopIterations.pop();
              if (out.signal === "break") {
                // NX-N1: break ends this for loop itself. The state is
                // finished here, not carried into the next element.
                out.signal = null;
                done.push(out);
              } else if (out.signal === "continue") {
                // NX-N2: continue skips only the rest of this pass.
                // Clear the signal so the next element — and the
                // statements after the loop — still run.
                out.signal = null;
                next.push(out);
              } else if (out.halt || out.signal === "return") {
                done.push(out);
              } else {
                out.signal = null;
                next.push(out);
              }
            }
          }
          active = next;
          if (done.length + active.length > LIMITS.paths) {
            done = done.slice(0, LIMITS.paths);
            active = active.slice(0, Math.max(0, LIMITS.paths - done.length));
          }
        }
        return done.concat(active);
      }
      const semantics = {
        dialect: "ahk",
        logicalOperands: true,
        initialize(s, api) { for (const v of Object.values(s.vars)) if (typeof v === "number") numeric(v,{line:1},api); },
        read(a, s, api) {
          if (a.k === "literal" && typeof a.value === "number") return {handled:true,value:numeric(a.value,a,api)};
          if (a.k === "unary" && ["+", "-"].includes(a.op)) {
            const value = api.read(a.arg, s);
            if (isUnknown(value)) return {handled:true,value:{...unknown(a.op + formatValue(value)),op:a.op,a:value}};
            return {handled:true,value:(a.op === "-" ? -1 : 1) * numeric(value,a,api)};
          }
          // RG-08 (R9-N7): a ByRef marker &var is not a variable read.
          // A set variable passes its value; an unset one yields an
          // indeterminate argument, never a NameError naming the variable.
          if (a.k === "unary" && a.op === "&") {
            if (a.arg.k === "var") {
              let key = Object.keys(s.vars).find((k) => k.toLowerCase() === a.arg.name.toLowerCase());
              if (key !== undefined) {
                let v = s.vars[key];
                return { handled: true, value: typeof v === "boolean" ? (v ? 1 : 0) : v };
              }
              return { handled: true, value: unknown("参照渡しの引数（&" + a.arg.name + "）") };
            }
            return null;
          }
          // RG-55: logical NOT yields 1/0, never a JS boolean.
          if (a.k === "unary" && a.op === "!") {
            const value = api.read(a.arg, s);
            if (isUnknown(value)) return {handled:true,value:{...unknown("!" + formatValue(value)),op:"!",a:value}};
            return {handled:true,value:(value !== false && value !== 0 && value !== "" && value !== null) ? 0 : 1};
          }
          // RG-19: 1-based subscripting for arrays (A_Index idiom included).
          if (a.k === "index") {
            if (a.double) return null;
            if (a.indexes.length > 1) unsupported("複数の添字", a.line);
            if (a.indexes.length === 1 && a.indexes[0] != null) {
              let target = api.read(a.target, s),
                idxRaw = api.read(a.indexes[0], s);
              if (isUnknown(target) || isUnknown(idxRaw))
                return { handled: true, value: unknown("実行時の添字による") };
              if (Array.isArray(target)) {
                let pos = ahkArrayPos(target.length, ahkIndex(idxRaw, a), a, api);
                let v = target[pos - 1];
                return { handled: true, value: typeof v === "boolean" ? (v ? 1 : 0) : v };
              }
              if (typeof target === "string") unsupported("文字列への添字アクセス", a.line);
              if (target && typeof target === "object" && typeof idxRaw === "string") {
                let key = Object.keys(target).find(
                  (k) => k.toLowerCase() === idxRaw.toLowerCase(),
                );
                if (key === undefined) api.fail("プロパティがありません：" + idxRaw, a);
                let v = target[key];
                return { handled: true, value: typeof v === "boolean" ? (v ? 1 : 0) : v };
              }
              return null;
            }
            return null;
          }
          // RG-48: member resolution is case-insensitive in AutoHotkey v2,
          // and Length is the official spelling for arrays and strings.
          if (a.k === "member") {
            let target = api.read(a.target, s);
            if (isUnknown(target))
              return { handled: true, value: unknown(`${target.source}.${a.name}`, `${target.id}.${a.name}`) };
            if (target == null) return null;
            let lname = a.name.toLowerCase();
            if (lname === "length") {
              if (Array.isArray(target)) return { handled: true, value: target.length };
              if (typeof target === "string") return { handled: true, value: target.length };
            }
            if (Array.isArray(target)) api.fail("プロパティがありません：" + a.name, a);
            if (typeof target === "object") {
              let key = Object.keys(target).find(
                (k) => k.toLowerCase() === lname,
              );
              if (key !== undefined) {
                let v = target[key];
                return { handled: true, value: typeof v === "boolean" ? (v ? 1 : 0) : v };
              }
              api.fail("プロパティがありません：" + a.name, a);
            }
            if (typeof target === "string") api.fail("プロパティがありません：" + a.name, a);
            return null;
          }
          if (a.k === "var") {
            if (["true","false"].includes(a.name.toLowerCase()))
              return { handled:true, value:a.name.toLowerCase() === "true" ? 1 : 0 };
            if (a.name.toLowerCase() === "a_index")
              return { handled: true, value: s.loopIterations?.at(-1) || 0 };
            let key = Object.keys(s.vars).find(
              (k) => k.toLowerCase() === a.name.toLowerCase(),
            );
            if (key !== undefined) {
              let v = s.vars[key];
              // RG-55: raw model booleans read back as AHK's 1/0.
              if (typeof v === "boolean") return { handled: true, value: v ? 1 : 0 };
              return { handled: true, value: typeof v === "number" ? numeric(v, a, api) : v };
            }
            // RG-64: built-in variables are never "undefined names".
            let lname = a.name.toLowerCase();
            if (Object.hasOwn(AHK_BUILTIN_EXACT, lname))
              return { handled: true, value: AHK_BUILTIN_EXACT[lname] };
            if (AHK_BUILTIN_UNSUPPORTED.has(lname))
              api.fail("この組み込み変数は未対応です：" + a.name, a, "未対応");
            // NX-N14 (sibling surface): A_TitleMatchMode is not a
            // runtime-determined value in this model — it is exactly
            // the mode SetTitleMatchMode maintains, so read it back.
            if (lname === "a_titlematchmode")
              return { handled: true, value: s.model.titleMatchMode ?? 2 };
            if (AHK_BUILTIN_RUNTIME.has(lname))
              return { handled: true, value: unknown(a.name) };
          }
          return null;
        },
        write(a, v, s, api, node) {
          if (a.k === "var") {
            if (a.name.toLowerCase() === "a_index")
              api.fail("A_Indexの変更によるループ制御は未対応です", node, "未対応");
            let key =
              Object.keys(s.vars).find(
                (k) => k.toLowerCase() === a.name.toLowerCase(),
              ) || a.name;
            s.vars[key] = v;
            return true;
          }
          // RG-19: subscript assignment uses the same 1-based semantics.
          if (a.k === "index") {
            if (a.double || a.indexes.length === 0) return false;
            if (a.indexes.length > 1) unsupported("複数の添字", a.line);
            if (a.indexes[0] == null) return false;
            let target = api.read(a.target, s),
              idxRaw = api.read(a.indexes[0], s);
            if (isUnknown(target) || isUnknown(idxRaw))
              unsupported("未確定の添字への書き込み", a.line);
            if (Array.isArray(target)) {
              let n = ahkIndex(idxRaw, a),
                pos = n < 0 ? target.length + n + 1 : n;
              if (pos < 1) api.fail("添字が有効範囲にありません", a, "IndexError");
              // P-N1（配列の成長経路）: 巨大な添字で疎な配列の長さが爆発
              // すると、状態スナップショットの表示・転送が要素数に比例して
              // 肥大する。他系統と同じ上限で止める。
              if (pos > 200000)
                api.fail("添字が上限（200000）を超えます", a, "IndexError");
              // Writing at Length+1 appends; beyond that leaves unset slots,
              // matching AutoHotkey's sparse-array behaviour in this model.
              target[pos - 1] = v;
              return true;
            }
            if (target && typeof target === "object" && typeof idxRaw === "string") {
              let key =
                Object.keys(target).find(
                  (k) => k.toLowerCase() === idxRaw.toLowerCase(),
                ) ?? idxRaw;
              target[key] = v;
              return true;
            }
            return false;
          }
          // RG-48: property assignment resolves names case-insensitively.
          if (a.k === "member") {
            let target = api.read(a.target, s);
            if (isUnknown(target)) return false;
            let lname = a.name.toLowerCase();
            if (Array.isArray(target)) {
              if (lname === "length") {
                if (typeof v !== "number" || !Number.isInteger(v) || v < 0)
                  api.fail("Lengthには0以上の整数を指定してください", node, "TypeError");
                // P-N1: Length の直接拡張も疎配列の成長経路として上限で止める。
                if (v > 200000)
                  api.fail("Lengthには200000以下の整数を指定してください", node, "TypeError");
                target.length = v;
                return true;
              }
              api.fail("プロパティがありません：" + a.name, node);
            }
            if (target && typeof target === "object") {
              let key =
                Object.keys(target).find(
                  (k) => k.toLowerCase() === lname,
                ) ?? a.name;
              target[key] = v;
              return true;
            }
            return false;
          }
          return false;
        },
        step(n, s, api) {
          // RG-33: Loop…Until nodes are executed here; RG-08 for loops
          // likewise; all other nodes fall through to the shared
          // executor.
          if (n.k === "ahkForEach") return runForEach(n, s, api);
          if ((n.k === "repeat" || n.k === "while") && n.untilCond)
            return runUntilLoop(n, s, api);
          // R27-N8：ビット演算の複合代入（&= ／ |= ／ ^= ／ <<= ／ >>= ／
          // >>>=）は AutoHotkey v2 公式の代入演算子だが、その基礎になる
          // ビット演算自体が本モデルの未対応（64ビット整数演算）である
          // ため、複合代入演算子そのものを名指して止める（**= は公式の
          // 代入演算子表に存在しないため、prescanAHK で別途名指す）。
          if (
            n.k === "assign" &&
            ["&=", "|=", "^=", "<<=", ">>=", ">>>="].includes(n.op)
          )
            api.fail(
              `未対応：AutoHotkeyの複合代入演算子 ${n.op}（ビット演算は未対応です）`,
              n,
              "未対応",
            );
          // NX-N23: subscript assignments (and postfix ++/-- on a
          // subscript) are executed here, mirroring the shared
          // executor's assign/expression steps, so the note can name
          // the element (a[2]) instead of the fallback 「対象」.
          if (n.k === "assign" && n.target?.k === "index") {
            const label = ahkExprLabel(n.target);
            if (label) {
              let v = api.read(n.value, s);
              const base = {
                "+=": "+", "-=": "-", "*=": "*", "/=": "/",
              }[n.op];
              if (base)
                v = semantics.binary
                  ? semantics.binary(base, api.read(n.target, s), v, n, s, api)
                  : baseBinary(base, api.read(n.target, s), v, "ahk");
              api.write(n.target, v, s, n);
              api.note(s, n, `${label} に ${fmt(v)} を代入します`);
              return [s];
            }
          }
          if (
            n.k === "expression" &&
            n.value?.k === "post" &&
            n.value.target?.k === "index"
          ) {
            const label = ahkExprLabel(n.value.target);
            if (label) {
              const before = s.trace.length;
              let v = api.read(n.value, s);
              if (s.trace.length === before)
                api.note(
                  s,
                  n,
                  `${label} を${n.value.op === "++" ? "増やし" : "減らし"}ます（後置式の値は変更前の ${fmt(v)}）`,
                );
              return [s];
            }
          }
          return null;
        },
        truth(v) {
          // RG-73（R20-N3）: 数値文字列は数値として解釈され、0 相当は偽になる。
          if (typeof v === "string") {
            const n = ahkNumericValue(v);
            if (n !== null) return n !== 0;
          }
          return v !== false && v !== 0 && v !== "" && v !== null;
        },
        increment(x, node, s, api) {
          if (isUnknown(x)) api.fail("未確認：不確定な値のインクリメント", node, "未確認");
          const previous = numeric(x,node,api), next = numeric(previous + (node.op === "++" ? 1 : -1),node,api);
          return {previous,next};
        },
        binary(op, a, b, node, s, api) {
          if (isUnknown(a) || isUnknown(b)) {
            // RG-13: the learner-facing label of an indeterminate
            // concatenation is ".", never the internal ".concat" token.
            if (op === "." || op === ".concat")
              return { ...unknown(`${formatValue(a)} . ${formatValue(b)}`), op: ".", a, b };
            return baseBinary(op, a, b, "ahk");
          }
          // R26-N16：累乗 `**` は AutoHotkey v2 の正式な演算子（公式ドキュメントの
          // 演算子表）。従来は `*` の単独名指しで未対応停止していた。
          if (op === "**") {
            a = numeric(a, node, api); b = numeric(b, node, api);
            return numeric(a ** b, node, api);
          }
          if (["^", "&", "|", "<<", ">>"].includes(op)) api.fail("未対応：AutoHotkeyの64ビットのビット演算", node, "未対応");
          if (["+", "-", "*", "/", "<", ">", "<=", ">="].includes(op)) {
            a = numeric(a,node,api); b = numeric(b,node,api);
            if (op === "/" && b === 0) api.fail("0による除算です", node, "ZeroDivisionError");
            const value = baseBinary(op, a, b, "ahk");
            // RG-55: comparisons produce 1/0, not JS true/false.
            if (typeof value === "boolean") return value ? 1 : 0;
            return typeof value === "number" ? numeric(value,node,api) : value;
          }
          if (["=", "==", "!=", "!=="].includes(op)) {
            // AHK's default string comparison folds ASCII A-Z only.
            const fold = (x) => x.replace(/[A-Z]/g, (c) => c.toLowerCase());
            if (typeof a === "boolean") a = a ? 1 : 0;
            if (typeof b === "boolean") b = b ? 1 : 0;
            let equal;
            if (typeof a === "string" && typeof b === "string") {
              equal = ["=", "!="].includes(op) ? fold(a) === fold(b) : a === b;
            } else if (
              (typeof a === "string" && typeof b === "number") ||
              (typeof a === "number" && typeof b === "string")
            ) {
              // RG-72（R19-N10）: 数値文字列なら数値比較、それ以外は文字列比較。
              // 空文字列は数値文字列ではないため、数値 0 とは一致しない。
              const str = typeof a === "string" ? a : b;
              const num = typeof a === "number" ? a : b;
              const nv = ahkNumericValue(str);
              if (nv !== null) equal = nv === num;
              else {
                const ns = String(num);
                equal = ["=", "!="].includes(op) ? fold(str) === fold(ns) : str === ns;
              }
            } else {
              equal = a == b;
            }
            const result = ["!=", "!=="].includes(op) ? !equal : equal;
            // RG-55: equality results are displayed as 1/0.
            return result ? 1 : 0;
          }
          const r = baseBinary(op, a, b, "ahk");
          return typeof r === "boolean" ? (r ? 1 : 0) : r;
        },
        call(name, args, s, api, node) {
          let n = name.toLowerCase();
          // Internal dialect markers (RG-33 Until, RG-08 for) are folded
          // into their statements before execution; a leftover one is a
          // stray clause, reported by construct name, never by its
          // internal spelling.
          if (n === "__ahkuntil__")
            api.fail("この構文は説明に対応していません：Until 節（対応する Loop がありません）", node, "未対応");
          if (n.startsWith("__ahk"))
            api.fail("この構文は説明に対応していません", node, "未対応");
          // RG-08 (R13-N5): IsSet/IsSetRef inspect the argument without
          // evaluating it — evaluating an unset variable is the very
          // error these functions exist to avoid (R9-N7 for IsSetRef).
          if (n === "isset" || n === "issetref") {
            if (args.length !== 1) api.fail("引数の数が一致していません", node);
            let a = args[0];
            if (a.k === "unary" && a.op === "&") a = a.arg;
            if (a.k === "var") {
              let key = Object.keys(s.vars).find((k) => k.toLowerCase() === a.name.toLowerCase());
              if (key === undefined) {
                // RG-64: built-in variables always have a value.
                let lname = a.name.toLowerCase();
                return Object.hasOwn(AHK_BUILTIN_EXACT, lname) || AHK_BUILTIN_RUNTIME.has(lname) ? 1 : 0;
              }
              if (n === "isset") return 1;
              let v = s.vars[key];
              return v !== null && typeof v === "object" && !isUnknown(v) ? 1 : 0;
            }
            api.read(a, s);
            return n === "isset" ? 1 : 0;
          }
          // RG-08 (R13-N6): an unimplemented function is reported by its
          // own name before any argument is evaluated, so reference
          // arguments (&var) and unset variables are never blamed for
          // the function's absence.
          if (
            !["winexist", "winactive", "winactivate", "winclose", "settitlematchmode",
              "sendtext", "send", "click", "mousemove", "sleep", "inputbox", "msgbox"].includes(n)
          ) {
            // M-N5: a name that already holds a value is not an
            // "unsupported function" — the value simply is not
            // callable. Name that cause instead; only a name with no
            // definition at all keeps the unsupported-function message.
            if (!name.includes(".")) {
              const varKey = Object.keys(s.vars).find(
                (k) => k.toLowerCase() === n,
              );
              if (varKey !== undefined) {
                const v = s.vars[varKey];
                const kind = Array.isArray(v)
                  ? "配列"
                  : isUnknown(v)
                    ? "未確定値"
                    : typeof v === "number"
                      ? "数値"
                      : typeof v === "string"
                        ? "文字列"
                        : typeof v === "boolean"
                          ? "真偽値"
                          : v && typeof v === "object"
                            ? "オブジェクト"
                            : "値";
                api.fail(
                  `${name} は関数ではありません（${kind}は呼び出せません）`,
                  node,
                );
              }
              if (
                Object.hasOwn(AHK_BUILTIN_EXACT, n) ||
                AHK_BUILTIN_RUNTIME.has(n) ||
                AHK_BUILTIN_UNSUPPORTED.has(n)
              )
                api.fail(
                  `${name} は関数ではありません（組み込み変数は呼び出せません）`,
                  node,
                );
            }
            api.fail("このAutoHotkey関数は未対応です：" + name, node);
          }
          let vals = args.map((a) => api.read(a, s));
          // RG-55: arguments reaching a builtin are AHK values; a raw JS
          // boolean (e.g. from model data) is the number 1/0 here.
          vals = vals.map((v) => (typeof v === "boolean" ? (v ? 1 : 0) : v));
          function window(title) {
            if (isUnknown(title))
              api.fail("未確定タイトルのウィンドウ解決は未対応です", node);
            let mode = s.model.titleMatchMode || 2,
              match = s.model.windows.find(
                (w) =>
                  w.exists !== false &&
                  (mode === 1
                    ? w.title.startsWith(String(title))
                    : mode === 3
                      ? w.title === String(title)
                      : w.title.includes(String(title))),
              );
            return match;
          }
          function active() {
            let w = s.model.windows.find(
              (w) => w.id === s.model.activeId && w.exists !== false,
            );
            if (!w)
              api.fail(
                "モデルにアクティブウィンドウがありません",
                node,
                "TargetError",
              );
            return w;
          }
          switch (n) {
            case "winexist": {
              let w = window(vals[0] || "");
              return w?.id || 0;
            }
            case "winactive": {
              let w = window(vals[0] || "");
              return w?.id === s.model.activeId ? w.id : 0;
            }
            case "winactivate": {
              let w = window(vals[0] || "");
              if (!w)
                api.fail("対象ウィンドウがありません", node, "TargetError");
              s.model.activeId = w.id;
              api.note(
                s,
                node,
                `モデルウィンドウ「${w.title}」をアクティブにします`,
              );
              return null;
            }
            case "winclose": {
              let w = window(vals[0] || "");
              if (!w)
                api.fail("対象ウィンドウがありません", node, "TargetError");
              w.exists = false;
              if (s.model.activeId === w.id) s.model.activeId = null;
              api.note(
                s,
                node,
                "閉じる要求をモデルに反映します。保存確認等は未確認です",
              );
              return null;
            }
            case "settitlematchmode": {
              if (![1, 2, 3].includes(vals[0]))
                api.fail("未対応：一致モードは1 / 2 / 3のみ対応です", node, "未対応");
              const previous = s.model.titleMatchMode ?? 2;
              s.model.titleMatchMode = vals[0];
              // NX-N14: the return value is the *previous* mode (the
              // documented contract), so the step must name the mode
              // that was just set — otherwise the trace only ever shows
              // the old value and the new mode appears nowhere.
              api.note(
                s,
                node,
                `タイトル一致モードを ${vals[0]}（${{ 1: "先頭一致", 2: "部分一致", 3: "完全一致" }[vals[0]]}）に設定します`,
              );
              return previous;
            }
            case "sendtext":
            case "send": {
              let w = active(),
                text = vals[0];
              s.model.keys ??= [];
              s.model.keys.push({ windowId: w.id, mode: name, value: text });
              if (isUnknown(text)) {
                w.text = unknown("送信する文字による");
                return null;
              }
              text = String(text);
              // NX-N22: the note quotes the text as written. Keep a
              // display copy before "{Enter}" is expanded to a real
              // newline for the model state, and show any literal
              // newline (e.g. from a `n escape in SendText) as
              // （改行） instead of embedding it raw, which made the
              // quoted value look blank.
              const displayText = text.replace(/\r\n|\r|\n/g, "（改行）");
              if (n === "send") {
                if (text === "^a") {
                  w.selectionAll = true;
                  api.note(s, node, "モデルのテキスト全体を選択します");
                  return null;
                }
                if (/[!^+#]|\{(?!Enter\})/.test(text)) {
                  api.note(
                    s,
                    node,
                    "キー列を記録します。アプリ固有の効果は未確認です",
                  );
                  return null;
                }
                text = text.replaceAll("{Enter}", "\n");
              }
              // P-N1（蓄積の成長経路）: 送信テキストの蓄積も値サイズ上限の
              // 対象にする。上限を超えたら実体を保持せず未確定値へ倒す。
              w.text = w.selectionAll
                ? text
                : isUnknown(w.text)
                  ? w.text
                  : String(w.text || "").length + text.length > 200000
                    ? unknown("とても長い文字列")
                    : String(w.text || "") + text;
              w.selectionAll = false;
              api.note(
                s,
                node,
                `「${w.title}」へ ${formatValue(displayText)} を入力します`,
              );
              return null;
            }
            case "click":
            case "mousemove":
              if (vals.length !== 2 || !vals.every(Number.isFinite))
                api.fail("X・Yの数値を2つ指定してください", node);
              s.model.mouse = {
                x: vals[0],
                y: vals[1],
                coordinateMode: "Client",
                windowId: s.model.activeId,
              };
              if (n === "click") {
                s.model.keys ??= [];
                s.model.keys.push({ mouse: "Left click", ...s.model.mouse });
              }
              api.note(
                s,
                node,
                `${vals[0]}, ${vals[1]} へ${n === "click" ? "クリック" : "移動"}します。画面上の効果は未確認です`,
              );
              return null;
            case "sleep":
              api.note(
                s,
                node,
                `${formatValue(vals[0])}ミリ秒の待機を説明します`,
              );
              return null;
            case "inputbox":
              return {
                Value: api.freshUnknown("InputBoxの入力", s),
                Result: unknown("InputBoxの確定／キャンセル"),
              };
            case "msgbox":
              s.outputs.push({
                channel: "MsgBox",
                text: fmt(vals[0]),
                line: node.line,
              });
              api.note(s, node, "メッセージを表示します");
              return unknown("MsgBoxのボタン");
            default:
              api.fail("このAutoHotkey関数は未対応です：" + name, node);
          }
        },
        action(n, s, api) {
          if (n.action === "HotkeyEvent") {
            let globals = s.vars,
              locals = new Set();
            function walk(nodes) {
              for (let node of nodes) {
                if (node.k === "assign" && node.target.k === "var")
                  locals.add(node.target.name.toLowerCase());
                if (node.body) walk(node.body);
                if (node.otherwise) walk(node.otherwise);
              }
            }
            walk(n.body);
            s.eventGlobals = globals;
            s.vars = { ...globals };
            for (let name of Object.keys(s.vars))
              if (locals.has(name.toLowerCase())) delete s.vars[name];
            let results = api.run(n.body, [s]);
            for (let out of results) {
              out.model.lastEventLocals = Object.fromEntries(
                Object.entries(out.vars).filter(([k]) =>
                  locals.has(k.toLowerCase()),
                ),
              );
              out.vars = out.eventGlobals;
              delete out.eventGlobals;
            }
            return results;
          }
          if (n.action === "Hotstring") {
            let w = s.model.windows.find((w) => w.id === s.model.activeId);
            if (!w) api.fail("アクティブウィンドウがありません", n);
            let trigger = String(s.model.event).slice(2);
            if (typeof w.text !== "string" || !w.text.endsWith(trigger))
              api.fail("モデルの末尾に置換元文字列がありません", n);
            w.text = w.text.slice(0, -trigger.length) + n.text;
            api.note(
              s,
              n,
              "モデルの末尾文字列を「" + n.text + "」に置き換えます",
            );
            return [s];
          }
        },
        groups: (p) => [
          {
            title: "変数",
            entries: Object.entries(p.vars).map(([k, v]) => [
              k,
              fmt(v),
            ]),
          },
          {
            title: "モデル入力・ウィンドウ",
            entries: [
              ["アクティブID", formatValue(p.model.activeId)],
              // NX-N14: the current title match mode belongs in the
              // final summary, not only in the step that changed it.
              [
                "タイトル一致モード",
                (() => {
                  const mode = p.model.titleMatchMode ?? 2;
                  const label = { 1: "先頭一致", 2: "部分一致", 3: "完全一致" }[mode];
                  return label ? `${mode}（${label}）` : formatValue(mode);
                })(),
              ],
              ["ウィンドウ", formatValue(p.model.windows)],
              ["キー送信", formatValue(p.model.keys)],
              ["マウス", formatValue(p.model.mouse)],
              [
                "イベント終了前のローカル変数（終了時に破棄）",
                formatValue(p.model.lastEventLocals || {}),
              ],
            ],
          },
        ],
      };
      return executeProgram(nodes, model, semantics, limits);
    } catch (e) {
      return sourceFailure(
        e instanceof PracticeError || e?.category ? e : toLearnerError(e),
      );
    }
  },
};

definition.templates.push(...additionalTemplates(definition.model.defaults));
definition.templates[0].model = structuredClone(definition.model.defaults);

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
