import {
  ScriptParser,
  executeProgram,
  scanScript,
  PracticeError,
  unsupported,
  baseBinary,
} from "../../core/script.js";
import { rows, sourceFailure } from "../../core/data.js";
import { formatValue, isUnknown, unknown } from "../../core/contract.js";
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
    "一致しなければTargetError。実ウィンドウは操作しません。",
  ],
  [
    "WinClose",
    "ウィンドウ",
    'WinClose "タイトル"',
    "モデルのウィンドウを閉じる操作を説明します。",
    'WinClose "メモ帳"',
    "保存確認などアプリ固有の結果は未確認です。",
  ],
  [
    "SetTitleMatchMode",
    "ウィンドウ",
    "SetTitleMatchMode 1 / 2 / 3",
    "タイトルの先頭一致・部分一致・完全一致を切り替えます。",
    "SetTitleMatchMode 3",
    "RegExモードは未対応です。",
  ],
  [
    "Click",
    "マウス",
    "Click X, Y",
    "アクティブウィンドウのクライアント座標でクリックを記録します。",
    "Click 10, 20",
    "座標モードは既定のClientのみ。画面上の効果は捏造しません。",
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
    "if",
    "制御",
    "if 条件 { … } else { … }",
    "成立するブロックを選びます。",
    'if x > 0 {\n MsgBox "正"\n}',
  ],
  [
    "Loop",
    "制御",
    "Loop 回数 { … }",
    "指定回数だけ本体を繰り返します。",
    'Loop 3 {\n SendText "A"\n}',
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
  let nodes = new ScriptParser(base.join("\n"), "ahk").program();
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
        : new ScriptParser(handler.source, "ahk").program();
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
      "ホットキーの単一イベント、単純ホットストリング、代入、If、Loop、While、掲載関数に対応。#HotIf、タイマー、複雑なSend記法、CoordMode変更、ユーザー関数等は未対応です。",
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
    return [...new Set(found)];
  },
  async simulate(code, model, limits) {
    try {
      let { nodes } = parseAHK(code, model.event);
      const semantics = {
        dialect: "ahk",
        read(a, s) {
          if (a.k === "var") {
            let key = Object.keys(s.vars).find(
              (k) => k.toLowerCase() === a.name.toLowerCase(),
            );
            if (key !== undefined) return { handled: true, value: s.vars[key] };
          }
          return null;
        },
        write(a, v, s) {
          if (a.k === "var") {
            let key =
              Object.keys(s.vars).find(
                (k) => k.toLowerCase() === a.name.toLowerCase(),
              ) || a.name;
            s.vars[key] = v;
            return true;
          }
          return false;
        },
        truth(v) {
          return v !== false && v !== 0 && v !== "" && v !== null;
        },
        binary(op, a, b) {
          if (op === "=") {
            if (typeof a === "string") a = a.toLowerCase();
            if (typeof b === "string") b = b.toLowerCase();
            op = "==";
          }
          return baseBinary(op, a, b, "ahk");
        },
        call(name, args, s, api, node) {
          let vals = args.map((a) => api.read(a, s)),
            n = name.toLowerCase();
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
            case "settitlematchmode":
              if (![1, 2, 3].includes(vals[0]))
                api.fail("一致モードは1 / 2 / 3のみ対応です", node);
              s.model.titleMatchMode = vals[0];
              return null;
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
              w.text = w.selectionAll
                ? text
                : isUnknown(w.text)
                  ? w.text
                  : String(w.text || "") + text;
              w.selectionAll = false;
              api.note(
                s,
                node,
                `「${w.title}」へ ${formatValue(text)} を入力します`,
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
                text: formatValue(vals[0]),
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
              formatValue(v),
            ]),
          },
          {
            title: "モデル入力・ウィンドウ",
            entries: [
              ["アクティブID", formatValue(p.model.activeId)],
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
      return sourceFailure(e);
    }
  },
};
