import {
  LIMITS,
  isUnknown,
  unknown,
  formatValue,
} from "../../core/contract.js";
import { shellRuntime, pushNodes } from "../shell/runtime.js";
import {
  fail,
  ciGet,
  ciSet,
  unquote,
  words,
  initFiles,
  fsEntry,
  listFiles,
  fileDisplay,
  windowsPath,
  reservedDeviceName,
  inputValue,
  sourceError,
  writeFile,
  makeDirectory,
  removeEntry,
  copyEntry,
  parentDirectory,
} from "../shell/model.js";
import { commands, block, commandRefs } from "./parser.js";
import { arithmetic } from "./arithmetic.js";
import { toLearnerError } from "../../core/script.js";
function slot(value, s) {
  // Unknown values are always held behind a placeholder so structural
  // parsing (command splitting on &, pipes, redirects, blocks) cannot
  // mistake their eventual text for syntax. Known values that contain
  // cmd structural characters (& | < > ^ ( ) " or newlines) need the same
  // protection: in real cmd the text produced by expanding a variable is
  // data, not a new command separator (R22-N5).
  if (
    !isUnknown(value) &&
    !/[&|<>^()"\r\n]/.test(String(value ?? ""))
  )
    return String(value ?? "");
  const key = "__CMD_VALUE_" + Object.keys(s.cmd.slots).length + "__";
  s.cmd.slots[key] = value;
  return key;
}
function value(text, s) {
  if (typeof text !== "string") return text;
  if (Object.hasOwn(s.cmd.slots, text)) return s.cmd.slots[text];
  const keys = [
    ...new Set(
      [...text.matchAll(/__CMD_VALUE_\d+__/g)]
        .map((m) => m[0])
        .filter((k) => Object.hasOwn(s.cmd.slots, k)),
    ),
  ];
  if (!keys.length) return text;
  if (keys.some((k) => isUnknown(s.cmd.slots[k]))) {
    let described = text;
    for (const k of keys)
      if (!isUnknown(s.cmd.slots[k]))
        described = described.replaceAll(k, String(s.cmd.slots[k]));
    return unknown(
      "環境変数を展開した文字列",
      keys
        .map((k) =>
          isUnknown(s.cmd.slots[k]) ? s.cmd.slots[k].id : String(s.cmd.slots[k]),
        )
        .join(":") +
        ":" +
        described.replace(/__CMD_VALUE_\d+__/g, "?"),
    );
  }
  let out = text;
  for (const k of keys) {
    out = out.replaceAll(k, String(s.cmd.slots[k]));
    // P-N1: スロット解決後の文字列も値サイズ上限の対象にする（上限を
    // 超えたら実体を保持せず未確定値へ倒す）。
    if (out.length > CMD_VALUE_LIMIT) return unknown("とても長い文字列");
  }
  return out;
}
// Dynamic variables (%ERRORLEVEL%, %CD%, ...) yield the internal value
// when no environment variable of the same name is defined. Shared by
// percent expansion (read time) and delayed expansion (execution time)
// so both forms resolve the same value at their own timing (R22-N1).
function dynamicValue(name, s, api) {
  let v = ciGet(s.vars, name);
  if (v !== undefined) return v;
  if (/^cd$/i.test(name)) return s.model.cwd;
  if (/^errorlevel$/i.test(name)) return s.cmd.errorlevel;
  if (/^(random|date|time)$/i.test(name))
    return api
      ? api.freshUnknown(name + " の実行時の値", s)
      : unknown(name + " の実行時の値");
  return "";
}
// P-N1: cmd の成長は「展開後のコマンド文字列」の中で起きる（%S%%S% の
// 繰り返し）。展開結果が値サイズ上限を超えたら、実体を作り続けず理由を
// 明示して停止する（上限を引き上げても OOM しないための根治）。
const CMD_VALUE_LIMIT = 200000;
function percent(text, s, api, node) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    if (out.length > CMD_VALUE_LIMIT)
      fail(
        "展開後の文字列が長すぎます（上限は200000文字です）",
        node.line,
        "limit",
      );
    if (text[i] !== "%") {
      out += text[i];
      continue;
    }
    if (text[i + 1] === "%") {
      const third = text[i + 2];
      // %%<letter> (and %%~…) is a for-variable reference, not an escape:
      // keep it intact for the for-variable substitution in delayed().
      if (third !== undefined && /[a-z~]/i.test(third)) {
        out += text.slice(i, i + 3);
        i += 2;
        continue;
      }
      // In a batch file %% is the escape for a single literal % (R22-N2).
      // This is what makes the regular spelling set /a "N=7%%3" work.
      out += "%";
      i += 1;
      continue;
    }
    let m = text.slice(i).match(/^%~([0-9])/);
    if (m) {
      out +=
        m[1] === "0"
          ? // %0 is the invoked batch name, which the model does not
            // hold: never fabricate one (R22-N8).
            slot(unknown("バッチファイル名（%0）の実行時の値"), s)
          : slot(unquote(s.cmd.args[Number(m[1]) - 1] || ""), s);
      i += m[0].length - 1;
      continue;
    }
    m = text.slice(i).match(/^%([0-9])/);
    if (m) {
      out += slot(
        m[1] === "0"
          ? unknown("バッチファイル名（%0）の実行時の値")
          : s.cmd.args[Number(m[1]) - 1] || "",
        s,
      );
      i++;
      continue;
    }
    const end = text.indexOf("%", i + 1);
    if (end < 0) fail("未対応：単独の % または展開修飾子", node.line);
    const name = text.slice(i + 1, end);
    if (name.includes(":"))
      fail("未対応：環境変数の部分文字列・置換展開", node.line);
    out += slot(dynamicValue(name, s, api), s);
    i = end;
  }
  return out;
}
function delayed(text, s, node, api) {
  // P-N1: 遅延展開・for変数展開でも、置換後の累積長を見積もり、上限を
  // 超える場合は実体を作らず理由を明示して停止する。
  let estimate = text.length;
  const track = (piece) => {
    estimate += String(piece).length;
    if (estimate > CMD_VALUE_LIMIT)
      fail(
        "展開後の文字列が長すぎます（上限は200000文字です）",
        node.line,
        "limit",
      );
    return piece;
  };
  text = text.replace(/%%([a-z])/gi, (_, name) => {
    if (!Object.hasOwn(s.cmd.loops, name))
      fail("未対応：未束縛のfor変数／callによる二重展開", node.line);
    return track(slot(s.cmd.loops[name], s));
  });
  if (s.cmd.delayed)
    text = text.replace(/!([^!]*)!/g, (_, name) =>
      track(slot(dynamicValue(name, s, api), s)),
    );
  let out = "",
    quote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') quote = !quote;
    if (c === "^" && !quote && i + 1 < text.length) {
      if (text[i + 1] === "\n") {
        i++;
        continue;
      }
      out += text[++i];
    } else out += c;
  }
  return out;
}
// for basic-list items are separated by spaces, tabs, commas,
// semicolons and equals signs (quoted items keep their delimiters).
function forItems(text, line = 1) {
  const out = [];
  let part = "",
    quote = false,
    started = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      quote = !quote;
      part += c;
      started = true;
    } else if (!quote && /[\s,;=]/.test(c)) {
      if (started) {
        out.push(part);
        part = "";
        started = false;
      }
    } else {
      part += c;
      started = true;
    }
  }
  if (quote) fail("引用符が閉じられていません", line, "SyntaxError");
  if (started) out.push(part);
  return out;
}
// True when the text contains a pipe/redirect character that is really
// syntax: outside double quotes and not caret-escaped. Quoted or
// escaped occurrences are literal data (R22-N11).
function hasBareSpecial(text) {
  let quote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "^" && !quote) {
      i++;
      continue;
    }
    if (c === '"') quote = !quote;
    else if (!quote && /[<>|]/.test(c)) return true;
  }
  return false;
}
function partsIf(text, node) {
  let negate = false,
    insensitive = false;
  for (let i = 0; i < 2; i++) {
    if (/^not\s+/i.test(text)) {
      negate = !negate;
      text = text.replace(/^not\s+/i, "");
    }
    if (/^\/i\s+/i.test(text)) {
      insensitive = true;
      text = text.replace(/^\/i\s+/i, "");
    }
  }
  let m = text.match(
    /^(exist|errorlevel|defined)\s+("[^"]*"|\S+)\s+([\s\S]+)$/i,
  );
  if (m)
    return { op: m[1].toLowerCase(), a: m[2], body: m[3], negate, insensitive };
  m = text.match(
    /^("[^"]*"|[^\s=]+)\s*(==|EQU|NEQ|LSS|LEQ|GTR|GEQ)\s*("[^"]*"|\S+)\s+([\s\S]+)$/i,
  );
  if (!m) fail("未対応または不正なif条件です", node.line);
  return {
    op: m[2].toUpperCase(),
    a: m[1],
    b: m[3],
    body: m[4],
    negate,
    insensitive,
  };
}
function compare(c, s, node) {
  let a = value(c.a, s),
    b = value(c.b || "", s),
    v;
  if (c.op === "defined") v = ciGet(s.vars, a) !== undefined;
  else if (c.op === "exist") {
    v = isUnknown(a)
      ? unknown("指定したモデルパスの存在", a.id + ":exist")
      : !!fsEntry(s, a, node.line);
  } else if (c.op === "errorlevel") {
    a = s.cmd.errorlevel;
    b = Number(c.a);
    if (!Number.isInteger(b))
      fail("if errorlevelには整数が必要です", node.line, "SyntaxError");
    v = isUnknown(a)
      ? { ...unknown("終了コードによる"), op: ">=", a, b }
      : a >= b;
  } else {
    let op = c.op;
    if (op !== "==" && !isUnknown(a) && !isUnknown(b)) {
      if (!/^[+-]?\d+$/.test(a) || !/^[+-]?\d+$/.test(b))
        fail(
          "未対応：数値でないEQU等の比較（文字列には == を使用）",
          node.line,
        );
      a = Number(a);
      b = Number(b);
      if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b))
        fail("未確認：比較の数値範囲外", node.line, "未確認");
    }
    if (c.insensitive) {
      if (isUnknown(a) || isUnknown(b))
        fail("未確認：未確定文字列の /I 比較", node.line, "未確認");
      a = String(a).toUpperCase();
      b = String(b).toUpperCase();
    }
    const mapped = {
      "==": "=",
      EQU: "=",
      NEQ: "<>",
      LSS: "<",
      LEQ: "<=",
      GTR: ">",
      GEQ: ">=",
    }[op];
    v =
      isUnknown(a) || isUnknown(b)
        ? { ...unknown("展開した環境変数の比較"), op: mapped, a, b }
        : mapped === "="
          ? a === b
          : mapped === "<>"
            ? a !== b
            : mapped === "<"
              ? a < b
              : mapped === "<="
                ? a <= b
                : mapped === ">"
                  ? a > b
                  : a >= b;
  }
  return c.negate
    ? isUnknown(v)
      ? { ...unknown("条件の否定"), op: "!", a: v }
      : !v
    : v;
}
export function simulateCmd(source, model, limits) {
  try {
    if (
      typeof source !== "string" ||
      source.length > Math.min(LIMITS.source, limits?.source || LIMITS.source)
    )
      fail("cmdコードは100000文字以内で指定してください", 1, "limit");
    const nodes = commands(source.replace(/\r\n?/g, "\n")),
      labels = Object.create(null);
    nodes.forEach((n, i) => {
      if (/^:[^:]/.test(n.raw)) {
        const name = n.raw.slice(1).trim().split(/\s/)[0].toLowerCase();
        if (Object.hasOwn(labels, name))
          fail("未対応：重複ラベル " + name, n.line);
        labels[name] = i + 1;
      }
    });
    function program(pc) {
      return { k: "program-counter", pc, line: nodes[pc]?.line || 1 };
    }
    function returning(s, node) {
      const frame = s.cmd.calls.pop(),
        depth = frame?.localDepth || 0;
      while (s.cmd.locals.length > depth) {
        const prev = s.cmd.locals.pop();
        s.vars = prev.vars;
        s.cmd.delayed = prev.delayed;
      }
      if (frame) {
        s.tasks = frame.tasks;
        s.cmd.args = frame.args;
      } else {
        s.tasks = [];
        s.halt = true;
      }
    }
    const dispatchCommand = (n, s, api) => {
        if (n.k === "redirect-end") {
          const entries = s.outputs.splice(n.start),
            text = entries
              .filter((o) => o.channel === "stdout")
              .map((o) => o.text + (o.raw ? "" : "\r\n"))
              .join("");
          // SH-C1: NUL デバイスへの出力は破棄し、ファイルは作らない。
          if (n.device === "NUL") {
            api.note(
              s,
              { ...n, refs: ["リダイレクト"] },
              "出力を予約デバイス NUL へ破棄します",
            );
            return;
          }
          writeFile(s, n.path, text, n.line, true);
          api.note(
            s,
            { ...n, refs: ["リダイレクト"] },
            "出力をモデルファイルへ書き込みます：" + n.path,
          );
          return;
        }
        if (n.k === "pipe-end") {
          const entries = s.outputs.splice(n.start);
          if (entries.some((o) => o.uncertain))
            fail(
              "未確認：パイプの入力文字列が確定していません",
              n.line,
              "未確認",
            );
          s.cmd.stdin = entries
            .filter((o) => o.channel === "stdout")
            .map((o) => o.text + (o.raw ? "" : "\r\n"))
            .join("");
          s.vars = n.vars;
          s.model.cwd = n.cwd;
          s.tasks.push({
            k: "pipe-restore",
            vars: structuredClone(n.vars),
            cwd: n.cwd,
            line: n.line,
          });
          pushNodes(s, commands(n.next, n.line, true));
          return;
        }
        if (n.k === "pipe-restore") {
          s.vars = n.vars;
          s.model.cwd = n.cwd;
          delete s.cmd.stdin;
          return;
        }
        if (n.k === "program-counter") {
          if (n.pc >= nodes.length) return returning(s, n);
          s.tasks.push(program(n.pc + 1), nodes[n.pc]);
          return;
        }
        if (n.k === "restore-loop") {
          if (n.had) s.cmd.loops[n.name] = n.previous;
          else delete s.cmd.loops[n.name];
          return;
        }
        if (n.k === "for-iteration") {
          const num = n.numeric ? n.start + n.index * n.step : undefined;
          if (
            n.numeric
              ? n.step > 0
                ? num > n.end
                : num < n.end
              : n.index >= n.items.length
          )
            return;
          if (n.index >= api.limits.iterations) {
            api.stop(s, n, "ループ回数の上限");
            return;
          }
          const had = Object.hasOwn(s.cmd.loops, n.name),
            previous = s.cmd.loops[n.name];
          s.cmd.loops[n.name] = n.numeric ? String(num) : n.items[n.index];
          s.tasks.push(
            { ...n, index: n.index + 1 },
            { k: "restore-loop", name: n.name, had, previous, line: n.line },
          );
          pushNodes(s, n.body);
          return;
        }
        if (!n.expanded) {
          const expanded = percent(n.raw, s, api, n);
          pushNodes(s, commands(expanded, n.line, true));
          return;
        }
        let raw = n.raw.trimStart().replace(/^@/, "");
        n = { ...n, refs: commandRefs(raw) };
        if (!raw || raw.startsWith(":") || /^rem(?:\s|$)/i.test(raw)) return;
        if (!n.redirected) {
          let quote = false,
            depth = 0;
          for (let i = 0; i < raw.length; i++) {
            const ch = raw[i];
            if (ch === "^" && !quote) {
              i++;
              continue;
            }
            if (ch === '"') quote = !quote;
            if (!quote) {
              if (ch === "(") depth++;
              if (ch === ")") depth--;
              if (!depth && ch === "|") {
                if (raw[i + 1] === "|")
                  fail("未対応：条件付きコマンド連結 ||", n.line);
                s.tasks.push({
                  k: "pipe-end",
                  start: s.outputs.length,
                  next: raw.slice(i + 1),
                  vars: structuredClone(s.vars),
                  cwd: s.model.cwd,
                  line: n.line,
                });
                pushNodes(s, commands(raw.slice(0, i), n.line, true));
                api.note(
                  s,
                  { ...n, refs: ["パイプ"] },
                  "標準出力を次のコマンドへ渡します",
                );
                return;
              }
              if (!depth && (ch === ">" || ch === "<")) {
                if (ch === "<") fail("未対応：入力リダイレクト <", n.line);
                if (/\d$/.test(raw.slice(0, i)))
                  fail("未対応：番号つき出力リダイレクト", n.line);
                const append = raw[i + 1] === ">",
                  offset = append ? 2 : 1;
                const target = unquote(
                  delayed(raw.slice(i + offset).trim(), s, n, api),
                );
                if (!target || /[<>|]/.test(target))
                  fail("未対応：複合リダイレクト", n.line);
                const path = windowsPath(value(target, s), s.model.cwd, n.line);
                // SH-C1: 予約デバイス名は通常ファイルとして作らない。
                // NUL は破棄、CON／CONOUT$ は画面（標準出力）そのもの、
                // それ以外のデバイスは対象を名指して未対応とする。
                const device = reservedDeviceName(path);
                if (device === "CONIN$")
                  fail(
                    "未対応：予約デバイス名 CONIN$ への出力リダイレクト",
                    n.line,
                  );
                if (device && !["NUL", "CON", "CONOUT$"].includes(device))
                  fail(
                    "未対応：予約デバイス名 " + device + " への出力リダイレクト",
                    n.line,
                  );
                if (device === "CON" || device === "CONOUT$") {
                  api.note(
                    s,
                    { ...n, refs: ["リダイレクト"] },
                    "予約デバイス CON へ出力します（画面表示のまま）",
                  );
                  pushNodes(
                    s,
                    commands(raw.slice(0, i), n.line, true).map((c) => ({
                      ...c,
                      redirected: true,
                    })),
                  );
                  return;
                }
                if (device !== "NUL")
                  writeFile(s, path, "", n.line, append);
                s.tasks.push({
                  k: "redirect-end",
                  path,
                  device,
                  start: s.outputs.length,
                  line: n.line,
                });
                pushNodes(
                  s,
                  commands(raw.slice(0, i), n.line, true).map((c) => ({
                    ...c,
                    redirected: true,
                  })),
                );
                return;
              }
            }
          }
        }

        if (/^if(?:\s|$)/i.test(raw)) {
          // M-N4(e): 単独の if は「未対応のコマンド」ではなく引数不足。
          if (!raw.slice(3).trim())
            fail(
              "ifには条件と実行するコマンドが必要です",
              n.line,
              "SyntaxError",
            );
          const c = partsIf(raw.slice(3), n);
          c.a = delayed(c.a, s, n, api);
          if (c.b) c.b = delayed(c.b, s, n, api);
          const yes = block(c.body, n.line);
          let no = [];
          if (yes.rest) {
            if (!/^else\s+/i.test(yes.rest))
              fail("ifブロックの後はelseだけに対応します", n.line);
            const other = block(yes.rest.replace(/^else\s+/i, ""), yes.endLine);
            if (other.rest) fail("elseの後に未対応の文字があります", n.line);
            no = other.nodes;
          }
          const v = compare(c, s, n);
          api.note(s, n, "ifの条件を判定します");
          return api.choose(s, v, n).map((r) => {
            pushNodes(r.s, r.yes ? yes.nodes : no);
            return r.s;
          });
        }
        if (/^for(?:\s|$)/i.test(raw)) {
          // M-N4(e): 単独の for は「未対応のコマンド」ではなく引数不足。
          if (!raw.slice(3).trim())
            fail(
              "forにはループ変数、対象の一覧と実行するコマンドが必要です",
              n.line,
              "SyntaxError",
            );
          const m = raw.match(
            /^for\s+(\/L\s+)?%%([a-z])\s+in\s*\(([^)]*)\)\s+do\s+([\s\S]+)$/i,
          );
          if (!m) fail("未対応または不正なfor形式（基本形と /L のみ）", n.line);
          const body = block(m[4], n.line);
          if (body.rest) fail("forの後に未対応の文字があります", n.line);
          const frame = {
            k: "for-iteration",
            name: m[2],
            body: body.nodes,
            index: 0,
            line: n.line,
            numeric: !!m[1],
          };
          if (frame.numeric) {
            const nums = m[3].split(",").map((x) => Number(x.trim()));
            if (
              nums.length !== 3 ||
              nums.some((x) => !Number.isSafeInteger(x)) ||
              nums[1] === 0
            )
              fail(
                "for /L は整数の開始値,0以外の増分,終了値が必要です",
                n.line,
              );
            [frame.start, frame.step, frame.end] = nums;
          } else {
            frame.items = [];
            for (const item of forItems(m[3], n.line)) {
              if (/[?*]/.test(item)) {
                const entries = listFiles(s, item, n.line);
                frame.items.push(
                  ...entries
                    .filter((e) => e.type === "file")
                    .map((e) => e.path.slice(e.path.lastIndexOf("\\") + 1)),
                );
              } else frame.items.push(item);
            }
          }
          api.note(s, n, "forの列挙を開始します");
          s.tasks.push(frame);
          return;
        }
        if (raw.startsWith("(")) {
          // A bare parenthesised block is a container, not a command:
          // do not delayed-expand its whole text now. Each command
          // inside must delayed-expand at its own execution time,
          // exactly like if/for bodies (R22-N6).
          const b = block(raw, n.line);
          if (b.rest) fail("未対応：ブロック後の連結", n.line);
          pushNodes(s, b.nodes);
          return;
        }
        raw = delayed(raw, s, n, api);
        const m = raw.match(/^(echo\.|[\w]+)(?:\s+([\s\S]*))?$/i);
        if (!m) fail("未対応：cmdの構文 " + raw, n.line);
        const name = m[1].toLowerCase(),
          arg = m[2] ?? "";
        if (hasBareSpecial(arg) && name !== "set")
          fail("未対応：パイプライン・リダイレクト", n.line);
        function output(v, raw = false) {
          s.outputs.push({
            channel: "stdout",
            text: isUnknown(v) ? formatValue(v) : String(v),
            uncertain: isUnknown(v),
            raw,
            line: n.line,
          });
          api.note(
            s,
            n,
            "出力します：" + (isUnknown(v) ? formatValue(v) : String(v)),
          );
        }
        switch (name) {
          case "echo.":
            output("");
            break;
          case "echo":
            if (/^(on|off)$/i.test(arg)) {
              s.cmd.echo = arg.toLowerCase() === "on";
              api.note(
                s,
                n,
                "コマンド表示を " + arg.toLowerCase() + " にします",
              );
            } else if (!arg) {
              // SH-C2: 引数なし echo は現在の設定を標準出力へ表示する
              // （Microsoft Learn「echo」）。trace だけに残さない。
              api.note(
                s,
                n,
                "ECHO設定を確認します：" + (s.cmd.echo ? "on" : "off"),
              );
              output("ECHO は " + (s.cmd.echo ? "ON" : "OFF") + " です。");
            } else output(value(arg, s));
            break;
          case "set": {
            if (/^\/a\s+/i.test(arg)) {
              const result = arithmetic(
                arg.replace(/^\/a\s+/i, ""),
                s.vars,
                n.line,
              );
              s.cmd.errorlevel = 0;
              api.note(
                s,
                { ...n, refs: ["set", "set /a"] },
                "32ビット整数の式を評価します：" + result,
              );
              break;
            }
            const input = /^\/p\s+/i.test(arg),
              text = unquote(input ? arg.replace(/^\/p\s+/i, "") : arg),
              at = text.indexOf("=");
            if (!arg) {
              api.note(s, n, "環境変数は下の終了状態で確認できます");
              break;
            }
            if (at <= 0) fail("未対応：setの接頭辞検索／不正な代入", n.line);
            const key = text.slice(0, at);
            if (input) {
              const candidates = inputValue(s, key, api, n, key + " の入力");
              if (!candidates.length)
                fail("入力候補は1つ以上必要です", n.line, "モデルエラー");
              if (candidates.length > api.limits.paths)
                api.stop(s, n, "入力候補のパス数上限");
              return candidates.slice(0, api.limits.paths).map((v) => {
                const st = structuredClone(s);
                if (v !== "") ciSet(st.vars, key, isUnknown(v) ? v : String(v));
                api.note(
                  st,
                  n,
                  key + " への入力をモデル化します：" + formatValue(v),
                );
                return st;
              });
            }
            const v = value(text.slice(at + 1), s);
            ciSet(s.vars, key, v === "" ? undefined : v);
            // NX-N28: set X= は空文字列の設定ではなく変数の削除（未定義化）。
            api.note(
              s,
              n,
              v === ""
                ? key + " を未定義にします（削除します）"
                : key + " を設定します：" + formatValue(v),
            );
            break;
          }
          case "setlocal":
            if (
              !/^(EnableDelayedExpansion|DisableDelayedExpansion)?$/i.test(arg)
            )
              fail("未対応：このsetlocalオプション", n.line);
            s.cmd.locals.push({
              vars: structuredClone(s.vars),
              delayed: s.cmd.delayed,
            });
            if (arg) s.cmd.delayed = /^Enable/i.test(arg);
            s.cmd.errorlevel = arg ? 0 : 1;
            api.note(s, n, "環境変数と遅延展開設定を局所化します");
            break;
          case "endlocal": {
            const prev = s.cmd.locals.pop();
            if (!prev)
              fail("対応するsetlocalがありません", n.line, "実行エラー");
            s.vars = prev.vars;
            s.cmd.delayed = prev.delayed;
            api.note(s, n, "局所環境を戻します");
            break;
          }
          case "goto": {
            const label = arg.replace(/^:/, "").toLowerCase();
            // M-N4(d): ラベル自体がない場合は「見つからない」ではなく不足。
            if (!arg.trim() || !label)
              fail("gotoにはラベルが必要です", n.line, "SyntaxError");
            api.note(s, n, "ラベル " + arg + " へ移動します");
            if (label === "eof") {
              returning(s, n);
              break;
            }
            if (!Object.hasOwn(labels, label))
              fail("ラベルが見つかりません：" + arg, n.line, "実行エラー");
            s.tasks = [program(labels[label])];
            break;
          }
          case "call": {
            const args = words(arg, n.line),
              label = args.shift();
            // M-N4 同根: ラベル自体がない場合は不足を伝える。
            if (!label)
              fail("callには呼び出し先ラベルが必要です", n.line, "SyntaxError");
            if (!label.startsWith(":"))
              fail(
                "未対応：外部バッチのcall（同一ファイルの :label のみ）",
                n.line,
              );
            const key = label.slice(1).toLowerCase();
            if (!Object.hasOwn(labels, key))
              fail("call先ラベルがありません：" + label, n.line, "実行エラー");
            if (s.cmd.calls.length >= api.limits.depth) {
              api.stop(s, n, "callの深さ上限");
              break;
            }
            s.cmd.calls.push({
              tasks: s.tasks,
              args: s.cmd.args,
              localDepth: s.cmd.locals.length,
            });
            s.tasks = [program(labels[key])];
            s.cmd.args = args;
            api.note(s, n, "サブルーチン " + label + " を呼び出します");
            break;
          }
          case "exit": {
            const mm = arg.match(/^(\/b)?\s*(-?\d+)?$/i);
            if (!mm) fail("未対応：exitの引数", n.line);
            if (mm[2] !== undefined) s.cmd.errorlevel = Number(mm[2]);
            api.note(s, n, "バッチの処理を終了／復帰します");
            if (mm[1]) returning(s, n);
            else {
              s.tasks = [];
              s.halt = true;
            }
            break;
          }
          case "pause":
            output("続行するには何かキーを押してください . . .");
            api.note(s, n, "入力があったものとしてモデル上で続行します");
            break;
          case "cd":
          case "chdir": {
            // cmd tokenises arguments: surrounding whitespace is a
            // delimiter, never part of the folder name (R22-N3).
            const cdArg = arg.trim();
            if (!cdArg) {
              output(s.model.cwd);
              break;
            }
            const target = windowsPath(
                value(cdArg.replace(/^\/d\s+/i, "").trim(), s),
                s.model.cwd,
                n.line,
              ),
              entry = fsEntry(s, target, n.line);
            if (isUnknown(entry))
              fail("未確認：現在フォルダの移動先", n.line, "未確認");
            if (!entry || entry.type !== "directory") {
              s.cmd.errorlevel = 1;
              fail("モデルに移動先フォルダがありません", n.line, "実行エラー");
            }
            if (
              target.slice(0, 2) !== s.model.cwd.slice(0, 2) &&
              !/^\/d\s/i.test(cdArg)
            )
              fail("未対応：/dを伴わないドライブをまたぐcd", n.line);
            s.model.cwd = target;
            s.cmd.errorlevel = 0;
            api.note(s, n, "現在フォルダを " + target + " にします");
            break;
          }
          case "dir": {
            const dirTokens = words(arg, n.line),
              dirFlags = dirTokens.filter((t) => /^\//.test(t)),
              dirPatterns = dirTokens.filter((t) => !/^\//.test(t));
            if (!dirFlags.some((f) => /^\/b$/i.test(f)))
              fail(
                "未対応：dirは日時・実物のサイズを捏造しない /b 形式のみ",
                n.line,
              );
            const badFlag = dirFlags.find((f) => !/^\/(b|s)$/i.test(f));
            if (badFlag) fail("未対応：dirのオプション " + badFlag, n.line);
            if (dirPatterns.length > 1)
              fail("未対応：dirの複数パターン", n.line);
            const patternValue = value(dirPatterns[0] ?? "*", s);
            if (isUnknown(patternValue))
              fail("未確認：dirのパターン", n.line, "未確認");
            const pattern = patternValue,
              recursive = dirFlags.some((f) => /^\/s$/i.test(f));
            if (recursive) {
              // dir /b /s: recursive bare listing with full paths
              // (R22-N4). The virtual tree is small, so list every
              // matching entry below the base folder in model order.
              const found = fsEntry(s, pattern, n.line);
              let base = s.model.cwd,
                mask = pattern;
              if (found?.type === "directory") {
                base = windowsPath(pattern, s.model.cwd, n.line);
                mask = "*";
              } else if (found?.type === "file") {
                const full = windowsPath(pattern, s.model.cwd, n.line);
                base = full.slice(0, full.lastIndexOf("\\"));
                mask = full.slice(full.lastIndexOf("\\") + 1);
              } else if (pattern.includes("\\")) {
                const slash = pattern.lastIndexOf("\\");
                base = windowsPath(
                  pattern.slice(0, slash) || "\\",
                  s.model.cwd,
                  n.line,
                );
                mask = pattern.slice(slash + 1);
              }
              const maskRegex = new RegExp(
                "^" +
                  (mask === "*.*" ? "*" : mask)
                    .split("")
                    .map((c) =>
                      c === "*"
                        ? ".*"
                        : c === "?"
                          ? "."
                          : c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                    )
                    .join("") +
                  "$",
                "i",
              );
              const prefix = (
                base.endsWith("\\") ? base : base + "\\"
              ).toLowerCase();
              const entries = s.model.files.filter(
                (e) =>
                  e.path.toLowerCase().startsWith(prefix) &&
                  maskRegex.test(e.path.slice(e.path.lastIndexOf("\\") + 1)),
              );
              // SH-C3: 不一致・不存在でも実 cmd どおり表示する。
              if (entries.length)
                for (const e of entries) output(e.path);
              else output("ファイルが見つかりません");
              s.cmd.errorlevel = entries.length ? 0 : 1;
              api.note(
                s,
                n,
                "フォルダ以下を再帰的に列挙します：" + entries.length + "件",
              );
              break;
            }
            const target = fsEntry(s, pattern, n.line);
            const entries = listFiles(
              s,
              target?.type === "directory"
                ? windowsPath(pattern, s.model.cwd, n.line) + "\\*"
                : pattern,
              n.line,
            );
            if (isUnknown(entries))
              fail("未確認：dirのパターン", n.line, "未確認");
            // SH-C3: 不一致・不存在でも実 cmd どおり表示する
            // （ERRORLEVEL 1 で継続する点は従来どおり）。
            if (entries.length)
              for (const e of entries)
                output(e.path.slice(e.path.lastIndexOf("\\") + 1));
            else output("ファイルが見つかりません");
            s.cmd.errorlevel = entries.length ? 0 : 1;
            break;
          }
          case "type": {
            // M-N4(c): 引数なしは「ファイルがない」ではなく不足を伝える。
            if (!arg.trim())
              fail("typeにはファイル名が必要です", n.line, "SyntaxError");
            // Trailing whitespace is an argument delimiter, not part
            // of the file name (R22-N3, incl. the space before a pipe).
            const typeValue = value(arg.trim(), s);
            // 読み取り経路のデバイス規律（R24 §3.3 再裁定）：予約デバイス名は
            // 通常ファイルとして探さない。NUL は読むと即 EOF の空デバイス
            // なので、何も表示せず成功する（実 cmd の type nul／type nul >
            // file の古典形。Microsoft Learn「Naming Files, Paths, and
            // Namespaces」の予約名規則で、拡張子付き・フォルダ内でも
            // デバイスとして扱われる）。CON 等の入力デバイスはコンソール
            // 入力等でモデル化できないため、デバイス名を名指して停止する。
            if (!isUnknown(typeValue)) {
              const device = reservedDeviceName(
                windowsPath(typeValue, s.model.cwd, n.line),
              );
              if (device === "NUL") {
                s.cmd.errorlevel = 0;
                api.note(
                  s,
                  n,
                  "予約デバイス NUL を読みます（内容は空です）",
                );
                break;
              }
              if (device)
                fail(
                  "未対応：予約デバイス名 " +
                    device +
                    " からの読み取り（デバイス入力はモデル化できません）",
                  n.line,
                );
            }
            const e = fsEntry(s, typeValue, n.line);
            if (isUnknown(e))
              fail(
                "未確認：typeのファイルが確定していません",
                n.line,
                "未確認",
              );
            if (!e || e.type !== "file")
              fail("モデルにファイルがありません", n.line, "実行エラー");
            if (e.content === undefined)
              fail(
                "未確認：typeのファイル内容がモデルにありません",
                n.line,
                "未確認",
              );
            output(e.content, true);
            break;
          }
          case "md":
          case "mkdir": {
            // M-N4(f): 引数なしを無言で成功させない（del／rd と揃える）。
            const mdPaths = words(arg, n.line);
            if (!mdPaths.length)
              fail(name + "にはフォルダ名が必要です", n.line, "SyntaxError");
            for (const path of mdPaths) {
              const resolved = value(path, s);
              // SH-C1 追随：予約デバイス名はフォルダ名として作らない。
              // 中間フォルダも作成対象なので、解決済みパスの全要素を見る
              // （md nul\sub で nul フォルダが捏造される経路を含む）。
              if (!isUnknown(resolved)) {
                const full = windowsPath(resolved, s.model.cwd, n.line);
                for (const part of full.split("\\").slice(1)) {
                  const device = reservedDeviceName(part);
                  if (device)
                    fail(
                      "未対応：予約デバイス名 " +
                        device +
                        " のフォルダ作成（デバイス名はフォルダ名として使えません）",
                      n.line,
                    );
                }
              }
              makeDirectory(s, resolved, n.line);
            }
            s.cmd.errorlevel = 0;
            api.note(s, n, "モデルにフォルダを作成します");
            break;
          }
          case "rd":
          case "rmdir": {
            const args = words(arg, n.line),
              recursive = args.some((x) => /^\/s$/i.test(x));
            if (recursive && !args.some((x) => /^\/q$/i.test(x)))
              fail(
                "未確認：rd /sの確認には /q を明示してください",
                n.line,
                "未確認",
              );
            const paths = args.filter((x) => !/^\/[sq]$/i.test(x));
            if (paths.length !== 1)
              fail("rdには1つのフォルダを指定してください", n.line);
            const e = fsEntry(s, value(paths[0], s), n.line);
            if (!e || e.type !== "directory")
              fail("モデルにフォルダがありません", n.line, "実行エラー");
            removeEntry(s, paths[0], n.line, recursive);
            s.cmd.errorlevel = 0;
            api.note(s, n, "モデルからフォルダを削除します");
            break;
          }
          case "del":
          case "erase": {
            const args = words(arg, n.line),
              quiet = args.some((x) => /^\/q$/i.test(x)),
              patterns = args.filter((x) => !/^\/q$/i.test(x));
            if (!patterns.length) fail("delにファイル名が必要です", n.line);
            for (const pattern of patterns) {
              if (/^(?:\*|\*\.\*)$/.test(unquote(pattern)) && !quiet)
                fail(
                  "未確認：全件削除の確認には /q を明示してください",
                  n.line,
                  "未確認",
                );
              const resolved = value(pattern, s);
              if (isUnknown(resolved))
                fail(
                  "未確認：delの削除対象が確定していません",
                  n.line,
                  "未確認",
                );
              const matches = listFiles(s, resolved, n.line);
              if (isUnknown(matches))
                fail(
                  "未確認：delの削除対象が確定していません",
                  n.line,
                  "未確認",
                );
              const files = matches.filter((e) => e.type === "file");
              // Like cd/type/find, a model-level failure stops instead
              // of silently succeeding; the runtime then shows the
              // failure exit code as unconfirmed (R22-N9). The real
              // ERRORLEVEL value for a missing del target is not
              // established from a primary source, so none is invented.
              if (!files.length)
                fail(
                  "モデルに削除対象のファイルがありません：" +
                    unquote(resolved),
                  n.line,
                  "実行エラー",
                );
              for (const e of files) removeEntry(s, e.path, n.line);
            }
            s.cmd.errorlevel = 0;
            api.note(s, n, "モデルから一致するファイルを削除します");
            break;
          }
          case "ren":
          case "rename": {
            const args = words(arg, n.line);
            // M-N4(b): 引数不足は「未対応の形式」ではなく不足を伝える。
            if (args.length < 2)
              fail(
                name + "には元のパスと新しい名前が必要です",
                n.line,
                "SyntaxError",
              );
            if (args.length !== 2 || /[\\/:*?]/.test(unquote(args[1])))
              fail("未対応：renは単一パスと新しい名前のみ", n.line);
            const from = windowsPath(value(args[0], s), s.model.cwd, n.line),
              to = from.slice(0, from.lastIndexOf("\\") + 1) + unquote(args[1]);
            // SH-C1 追随：ren の新名は「内容の書き込み先」ではなく
            // 「付ける名前」なので、デバイス名は NUL／CON を含め全て
            // 名前を挙げて停止する（デバイス名のファイルを作らない）。
            const renSrcDevice = reservedDeviceName(from),
              renDstDevice = reservedDeviceName(to);
            if (renSrcDevice)
              fail(
                "未対応：予約デバイス名 " +
                  renSrcDevice +
                  " の名前変更（デバイスは名前変更できません）",
                n.line,
              );
            if (renDstDevice)
              fail(
                "未対応：予約デバイス名 " +
                  renDstDevice +
                  " への名前変更（デバイス名はファイル名として使えません）",
                n.line,
              );
            copyEntry(s, from, to, n.line, true, false);
            s.cmd.errorlevel = 0;
            api.note(s, n, "モデル内の名前を変更します：" + to);
            break;
          }
          case "copy":
          case "move": {
            const args = words(arg, n.line),
              overwrite = args.some((x) => /^\/y$/i.test(x)),
              paths = args.filter((x) => !/^\/y$/i.test(x));
            // M-N4(b): 引数不足は「未対応の形式」ではなく不足を伝える。
            if (paths.length < 2)
              fail(
                name +
                  "には" +
                  (name === "move" ? "移動元と移動先" : "コピー元とコピー先") +
                  "が必要です",
                n.line,
                "SyntaxError",
              );
            if (paths.length !== 2 || paths.some((x) => /[?*+]/.test(x)))
              fail("未対応：copy/moveは単一のコピー元・コピー先のみ", n.line);
            const fromValue = value(paths[0], s),
              toValue = value(paths[1], s);
            // SH-C1 追随：コピー／移動先が予約デバイス名の場合は
            // リダイレクトと同じ方針（NUL は破棄してファイルを作らない、
            // CON／CONOUT$ は画面出力、その他は名前を挙げて未対応停止）。
            // 読み取り側（コピー元）の規律は type 等の読み取り経路と統一
            // する（R24 §3.3 再裁定）：NUL は空として読めるため、copy では
            // 空のコピー（0バイトのファイル作成。実 cmd の copy nul の
            // 古典形）として扱う。CON 等はデバイス入力をモデル化できない
            // ため名前を挙げて停止する。move は実ファイルの移動であり
            // デバイス自体は移動できないため、NUL でも名前を挙げて停止する。
            let deviceHandled = null;
            if (!isUnknown(fromValue)) {
              const srcDevice = reservedDeviceName(
                windowsPath(fromValue, s.model.cwd, n.line),
              );
              if (srcDevice === "NUL" && name === "copy") {
                if (isUnknown(toValue))
                  fail("未確認：コピー先が確定していません", n.line, "未確認");
                const destPath = windowsPath(toValue, s.model.cwd, n.line),
                  destEntry = fsEntry(s, destPath, n.line),
                  // 既存フォルダ宛はフォルダ内へ元名で入る形になるが、その
                  // 最終パス（…\nul）自体もデバイス名なので破棄になる。
                  finalPath =
                    destEntry?.type === "directory"
                      ? destPath.replace(/\\$/, "") +
                        "\\" +
                        windowsPath(fromValue, s.model.cwd, n.line)
                          .split("\\")
                          .at(-1)
                      : destPath,
                  destDevice = reservedDeviceName(finalPath);
                if (destDevice === "NUL")
                  deviceHandled = { device: "NUL", path: destPath };
                else if (destDevice === "CON" || destDevice === "CONOUT$")
                  deviceHandled = { device: destDevice, path: destPath };
                else if (destDevice)
                  fail(
                    "未対応：予約デバイス名 " + destDevice + " へのコピー",
                    n.line,
                  );
                else {
                  if (destEntry && !overwrite)
                    fail(
                      "未確認：既存ファイルへの上書きには明示した強制オプションが必要です",
                      n.line,
                      "未確認",
                    );
                  writeFile(s, destPath, "", n.line);
                  deviceHandled = {
                    device: "NUL",
                    path: destPath,
                    note:
                      "予約デバイス NUL を空として読み取り、空のファイルを作成します：" +
                      destPath,
                  };
                }
              } else if (srcDevice)
                fail(
                  "未対応：予約デバイス名 " +
                    srcDevice +
                    " からの" +
                    (name === "move" ? "移動" : "コピー") +
                    "（デバイスからの読み取り）",
                  n.line,
                );
            }
            if (
              !deviceHandled &&
              !isUnknown(fromValue) &&
              !isUnknown(toValue)
            ) {
              const destPath = windowsPath(toValue, s.model.cwd, n.line),
                destEntry = fsEntry(s, destPath, n.line);
              // 既存フォルダ宛はフォルダ内へ元名で入る通常経路であり、
              // デバイス判定は最終的な書き込み先に対してだけ行う。
              if (destEntry?.type !== "directory") {
                const device = reservedDeviceName(destPath);
                if (device) {
                  const source = fsEntry(s, fromValue, n.line);
                  if (isUnknown(source))
                    fail(
                      "未確認：コピー／移動の対象",
                      n.line,
                      "未確認",
                    );
                  if (!source)
                    fail(
                      "モデルにコピー／移動元がありません",
                      n.line,
                      "実行エラー",
                    );
                  if (source.type === "directory")
                    fail(
                      "未対応：予約デバイス名 " +
                        device +
                        " へのフォルダの" +
                        (name === "move" ? "移動" : "コピー"),
                      n.line,
                    );
                  if (device === "NUL") {
                    if (name === "move")
                      removeEntry(s, source.path, n.line);
                    deviceHandled = { device, path: destPath };
                  } else if (device === "CON" || device === "CONOUT$") {
                    if (
                      source.content === undefined ||
                      isUnknown(source.content)
                    )
                      fail(
                        "未確認：コピー／移動元ファイルの内容がモデルにありません",
                        n.line,
                        "未確認",
                      );
                    output(source.content, true);
                    if (name === "move")
                      removeEntry(s, source.path, n.line);
                    deviceHandled = { device, path: destPath };
                  } else
                    fail(
                      "未対応：予約デバイス名 " +
                        device +
                        " への" +
                        (name === "move" ? "移動" : "コピー"),
                      n.line,
                    );
                }
              }
            }
            if (deviceHandled) {
              s.cmd.errorlevel = 0;
              api.note(
                s,
                n,
                deviceHandled.note ||
                  (deviceHandled.device === "NUL"
                    ? "予約デバイス NUL へ" +
                      (name === "move" ? "移動" : "コピー") +
                      "します（出力は破棄され、ファイルは作られません）"
                    : "予約デバイス CON へ出力します（画面表示）：" +
                      deviceHandled.path),
              );
              break;
            }
            const to = copyEntry(
              s,
              fromValue,
              toValue,
              n.line,
              name === "move",
              overwrite,
            );
            s.cmd.errorlevel = 0;
            api.note(
              s,
              n,
              "モデル内で" +
                (name === "move" ? "移動" : "コピー") +
                "します：" +
                to,
            );
            break;
          }
          case "cls":
            s.outputs = [];
            api.note(s, n, "モデルの出力をクリアします");
            break;
          case "find": {
            const args = words(arg, n.line);
            // Options are the unquoted /… tokens. Only /i is supported;
            // name any other option instead of blaming the quoting of
            // the search string (R22-N10).
            const badOption = args.find(
              (x) => /^\//.test(x) && !/^\/i$/i.test(x),
            );
            if (badOption)
              fail("未対応：findのオプション " + badOption, n.line);
            const insensitive = args.some((x) => /^\/i$/i.test(x)),
              pos = args.filter((x) => !/^\//.test(x));
            // M-N4(a): 引数ゼロは引用符の問題ではなく検索文字列自体の不足。
            if (!pos.length)
              fail("findには検索文字列が必要です", n.line, "SyntaxError");
            if (!pos[0].startsWith('"'))
              fail(
                "findの検索文字列は二重引用符で囲んでください",
                n.line,
                "SyntaxError",
              );
            const queryValue = value(unquote(pos.shift()), s);
            if (isUnknown(queryValue))
              fail(
                "未確認：findの検索文字列が確定していません",
                n.line,
                "未確認",
              );
            const query = queryValue;
            let text = s.cmd.stdin;
            if (pos.length) {
              if (pos.length !== 1) fail("未対応：findの複数ファイル", n.line);
              // 読み取り経路のデバイス規律（type／copy と統一）：NUL は
              // 空の入力として読み（一致なし・ERRORLEVEL 1 で継続）、
              // CON 等はデバイス名を名指して停止する。
              const findValue = value(pos[0], s);
              if (!isUnknown(findValue)) {
                const device = reservedDeviceName(
                  windowsPath(findValue, s.model.cwd, n.line),
                );
                if (device === "NUL") text = "";
                else if (device)
                  fail(
                    "未対応：予約デバイス名 " +
                      device +
                      " からの読み取り（デバイス入力はモデル化できません）",
                    n.line,
                  );
                else text = fsEntry(s, pos[0], n.line)?.content;
              } else text = fsEntry(s, pos[0], n.line)?.content;
            }
            if (typeof text !== "string")
              fail(
                "未確認：findの入力内容がモデルにありません",
                n.line,
                "未確認",
              );
            const lines = text
              .replace(/\r\n/g, "\n")
              .replace(/\n$/, "")
              .split("\n")
              .filter((l) =>
                (insensitive ? l.toLowerCase() : l).includes(
                  insensitive ? query.toLowerCase() : query,
                ),
              );
            for (const l of lines) output(l);
            s.cmd.errorlevel = lines.length ? 0 : 1;
            api.note(s, n, "文字列を含む行を選びます");
            break;
          }
          default:
            fail("未対応のcmdコマンド：" + name, n.line);
        }
    };
    // P-N3 受け皿：shellRuntime 内の受け皿は例外の message をそのまま
    // パスエラー／手順テキストへ載せるため、ディスパッチ境界でホスト例外を
    // 学習者向け文言へ変換してから投げ直す（PracticeError はそのまま通る）。
    const dispatch = (n, s, api) => {
      try {
        return dispatchCommand(n, s, api);
      } catch (e) {
        throw toLearnerError(e);
      }
    };
    return shellRuntime(
      [program(0)],
      model,
      (s, api) => {
        initFiles(s);
        for (const [k, v] of Object.entries(s.vars)) {
          if (v !== null && typeof v === "object" && !isUnknown(v))
            fail(
              "モデル環境変数は文字列・数値・真偽値または未確定値で指定してください：" +
                k,
              1,
              "モデルエラー",
            );
          ciSet(s.vars, k, isUnknown(v) ? v : String(v ?? ""));
        }
        s.cmd = {
          errorlevel: s.model.errorlevel ?? 0,
          echo: false,
          delayed: false,
          args: s.model.args || [],
          calls: [],
          locals: [],
          loops: {},
          slots: {},
        };
      },
      dispatch,
      (s) => [
        {
          title: "環境変数",
          entries: Object.entries(s.vars).map(([k, v]) => [k, formatValue(v)]),
        },
        {
          title: "バッチの終了状態",
          entries: [
            ["ERRORLEVEL", formatValue(s.cmd.errorlevel)],
            ["現在フォルダ", s.model.cwd],
            ["コマンド表示", s.cmd.echo ? "on" : "off"],
            ["遅延展開", s.cmd.delayed ? "有効" : "無効"],
          ],
        },
        {
          title: "仮想ファイル一覧",
          entries: [["モデルのツリー", fileDisplay(s.model.files)]],
        },
      ],
      limits,
    );
  } catch (e) {
    // P-N3 受け皿：実行境界（executeProgram の後処理など）から漏れた
    // ホスト例外は、生文言のまま返さず学習者向け文言へ変換する
    // （PracticeError はそのまま通る）。
    return sourceError(toLearnerError(e));
  }
}
