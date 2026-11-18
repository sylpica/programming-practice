// 高度モード ブロックB1: cmd エンジン拡張（CMD-ENG班）
// 基礎エンジン（engine.js）の dispatchCommand から、switch の default 句で
// 呼ばれる追加コマンド群。意味論は Microsoft Learn の各コマンドページに
// 基づく（出典と裁定理由は work/adv-b1-notes-cmdeng.md）。
// ctx は engine.js 側で構築される:
// { name, arg, raw, n, s, api, output, value, words, windowsPath, listFiles,
//   fsEntry, writeFile, makeDirectory, removeEntry, copyEntry, unquote,
//   ciGet, ciSet, fail, isUnknown, formatValue, freshUnknown, inputValue,
//   snapshotEnv, enqueueCmdC, getStdin }
import { isUnknown } from "../../core/contract.js";

const line = (ctx) => ctx.n.line;
function unsupported(ctx, detail) {
  ctx.fail("未対応：" + detail, line(ctx));
}
function unconfirmed(ctx, detail) {
  ctx.fail("未確認：" + detail, line(ctx), "未確認");
}
function execFail(ctx, detail) {
  ctx.fail(detail, line(ctx), "実行エラー");
}
function syntaxFail(ctx, detail) {
  ctx.fail(detail, line(ctx), "SyntaxError");
}
function tokens(ctx) {
  return ctx.words(ctx.arg, line(ctx));
}
// words() は引用符を保持したまま返す。値として使うときはスロット解決
// （ctx.value）→ unquote の順で実文字列にする。
function resolved(ctx, tok) {
  return ctx.value(ctx.unquote(tok));
}
function requireFile(ctx, tok, label) {
  const v = resolved(ctx, tok);
  if (isUnknown(v)) unconfirmed(ctx, label + "のファイルが確定していません");
  const e = ctx.fsEntry(v);
  if (isUnknown(e)) unconfirmed(ctx, label + "のファイルが確定していません");
  if (!e || e.type !== "file")
    execFail(ctx, "モデルにファイルがありません：" + ctx.unquote(tok));
  if (e.content === undefined)
    unconfirmed(ctx, label + "のファイル内容がモデルにありません");
  if (isUnknown(e.content))
    unconfirmed(ctx, label + "のファイル内容が確定していません");
  return e;
}
const splitLines = (text) =>
  String(text).replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
function maskRegex(mask) {
  return new RegExp(
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
}
// パターンを含むパスから、基準フォルダ以下の一致項目を再帰的に集める。
function recursiveMatches(ctx, pattern) {
  const full = ctx.windowsPath(pattern, ctx.s.model.cwd, line(ctx));
  if (isUnknown(full)) unconfirmed(ctx, "パターンが確定していません");
  const slash = full.lastIndexOf("\\"),
    base = full.slice(0, slash),
    mask = full.slice(slash + 1),
    re = maskRegex(mask),
    prefix = (base.endsWith("\\") ? base : base + "\\").toLowerCase();
  return ctx.s.model.files.filter(
    (e) =>
      e.path.toLowerCase().startsWith(prefix) &&
      re.test(e.path.slice(e.path.lastIndexOf("\\") + 1)),
  );
}
function note(ctx, text) {
  ctx.api.note(ctx.s, ctx.n, text);
}

// ---------------------------------------------------------------- attrib
function attrib(ctx) {
  const toks = tokens(ctx);
  const ops = [];
  let pattern = null,
    recursive = false,
    includeDirs = false;
  for (const tok of toks) {
    const t = ctx.unquote(tok);
    // B1G-05: 属性指定（+／- で始まるトークン）は形式検証の前に
    // 未確定検査を通す。未確定のまま形式で判定すると、属性トークンが
    // パターンと誤認され「複数パターン」という虚偽の原因になる。
    if (/^[+-]/.test(t) && isUnknown(ctx.value(t)))
      unconfirmed(ctx, "attribの属性指定が確定していません");
    if (t.startsWith("/") && isUnknown(ctx.value(t)))
      unconfirmed(ctx, "attribのオプションが確定していません");
    if (/^[+-][a-z]+$/i.test(t)) {
      for (const ch of t.slice(1)) {
        if (!/[rashi]/i.test(ch))
          unsupported(ctx, "attribの属性 " + ch + "（対応は R A S H I のみ）");
        ops.push({ sign: t[0], attr: ch.toUpperCase() });
      }
    } else if (/^\/[sd]$/i.test(t)) {
      if (/^\/s$/i.test(t)) recursive = true;
      else includeDirs = true;
    } else if (t.startsWith("/")) {
      unsupported(ctx, "attribのオプション " + t);
    } else if (pattern === null) pattern = tok;
    else unsupported(ctx, "attribの複数パターン");
  }
  if (ops.length && pattern === null)
    unsupported(ctx, "attribの対象ファイルを省略した設定形式");
  const pat = pattern === null ? "*" : resolved(ctx, pattern);
  if (isUnknown(pat)) unconfirmed(ctx, "attribの対象が確定していません");
  let entries;
  // B1B-04: 明示指定した実在エントリは /s の有無にかかわらず対象に
  // 含める。明示フォルダ＋/s ではフォルダ自体に加え、その配下の
  // 項目も再帰的に集める（/s は対象を広げる指定であって、明示した
  // フォルダを取り除く指定ではない）。
  let explicitObj = null;
  if (!/[*?]/.test(pat)) {
    const e = ctx.fsEntry(pat);
    if (e) explicitObj = e;
  }
  if (recursive) {
    if (explicitObj?.type === "directory") {
      const prefix = (
        explicitObj.path.endsWith("\\")
          ? explicitObj.path
          : explicitObj.path + "\\"
      ).toLowerCase();
      entries = [
        explicitObj,
        ...ctx.s.model.files.filter((x) =>
          x.path.toLowerCase().startsWith(prefix),
        ),
      ];
    } else if (explicitObj) entries = [explicitObj];
    else entries = recursiveMatches(ctx, pat);
  } else if (/[*?]/.test(pat)) entries = ctx.listFiles(pat);
  else entries = explicitObj ? [explicitObj] : [];
  if (isUnknown(entries)) unconfirmed(ctx, "attribの対象が確定していません");
  // B1A-10: 名前で明示指定したフォルダは /d なしでも対象にする。
  // /d の有無で変わるのはワイルドカード／再帰収集時にフォルダを
  // 含めるかどうかだけ（明示フォルダ自体は常に対象）。
  entries = entries.filter(
    (e) => includeDirs || e === explicitObj || e.type === "file",
  );
  if (!entries.length)
    execFail(ctx, "モデルに属性の対象がありません：" + pat);
  const order = ["R", "A", "S", "H", "I"];
  if (ops.length) {
    for (const e of entries) {
      const cur = new Set(
        (Array.isArray(e.attributes) ? e.attributes : []).map((a) =>
          String(a).toUpperCase(),
        ),
      );
      for (const op of ops) {
        if (op.sign === "+") cur.add(op.attr);
        else cur.delete(op.attr);
      }
      e.attributes = order.filter((a) => cur.has(a));
    }
    ctx.s.cmd.errorlevel = 0;
    note(
      ctx,
      "ファイル属性を更新します：" +
        entries.map((e) => e.path).join("、"),
    );
    return;
  }
  for (const e of entries) {
    const cur = new Set(
      (Array.isArray(e.attributes) ? e.attributes : []).map((a) =>
        String(a).toUpperCase(),
      ),
    );
    const shown = order.map((a) => (cur.has(a) ? a : " ")).join(" ");
    ctx.output(shown + "  " + e.path);
  }
  ctx.s.cmd.errorlevel = 0;
  note(ctx, "ファイル属性を表示します");
}

// ---------------------------------------------------------------- break
function breakCmd(ctx) {
  const a = ctx.arg.trim();
  // 同型（B1G-05）: on/off の形式検証の前に未確定検査を通す。
  if (a && isUnknown(ctx.value(a)))
    unconfirmed(ctx, "breakの引数が確定していません");
  if (a && !/^(on|off)$/i.test(a))
    syntaxFail(ctx, "breakの引数は on または off です");
  // Microsoft Learn「break」: コマンド拡張が有効な Windows では何もしない。
  note(
    ctx,
    "break は現在の Windows では何もしません（DOS互換のため残されたコマンドです）",
  );
}

// ---------------------------------------------------------------- choice
function choice(ctx) {
  const toks = tokens(ctx);
  let choices = "YN",
    hide = false,
    caseSensitive = false,
    message = "",
    defaultChoice = null;
  for (let i = 0; i < toks.length; i++) {
    const t = ctx.unquote(toks[i]);
    let m;
    // B1A-06: /cs を /c より先に判定する（/c の正規表現が "/cs" を
    // 「/c の値 s」として消費してしまうため）。
    if (/^\/cs$/i.test(t)) caseSensitive = true;
    else if ((m = t.match(/^\/c(?::)?(.*)$/i))) {
      // B1G-01: /c の選択肢はスロット解決（ctx.value）を通し、
      // 未確定なら内部プレースホルダの文字集合を選択肢として
      // 提示・判定せず、未確認で止める。
      let rv;
      if (m[1]) rv = ctx.value(m[1]);
      else rv = resolved(ctx, toks[++i] ?? "");
      if (isUnknown(rv)) unconfirmed(ctx, "choiceの選択肢が確定していません");
      choices = String(rv);
      if (!choices) syntaxFail(ctx, "choice /c には選択肢が必要です");
    } else if (/^\/n$/i.test(t)) hide = true;
    else if ((m = t.match(/^\/m(?::)?(.*)$/i))) {
      // B1G-01: /m のメッセージも同様に解決し、未確定なら
      // プレースホルダをそのまま表示せず未確認で止める。
      let rv;
      if (m[1] !== "") rv = ctx.value(m[1]);
      else rv = resolved(ctx, toks[++i] ?? "");
      if (isUnknown(rv))
        unconfirmed(ctx, "choiceのメッセージが確定していません");
      message = String(rv);
    } else if (/^\/t(?::)?(.*)$/i.test(t)) {
      const v = t.match(/^\/t(?::)?(.*)$/i)[1] || toks[++i];
      const rv = ctx.value(ctx.unquote(v ?? ""));
      if (isUnknown(rv)) unconfirmed(ctx, "choiceの秒数が確定していません");
      if (!/^\d+$/.test(String(rv)))
        syntaxFail(ctx, "choice /t には秒数（整数）が必要です");
      // タイムアウト自体はモデル化しない（入力の有無で結果が変わるため）。
    } else if ((m = t.match(/^\/d(?::)?(.*)$/i))) {
      // B1G-01: /d の既定値も解決し、未確定なら未確認で止める。
      let rv;
      if (m[1]) rv = ctx.value(m[1]);
      else rv = resolved(ctx, toks[++i] ?? "");
      if (isUnknown(rv)) unconfirmed(ctx, "choiceの既定値が確定していません");
      defaultChoice = String(rv);
    } else if (t.startsWith("/")) {
      if (isUnknown(ctx.value(t)))
        unconfirmed(ctx, "choiceのオプションが確定していません");
      unsupported(ctx, "choiceのオプション " + t);
    } else {
      if (isUnknown(ctx.value(t)))
        unconfirmed(ctx, "choiceの引数が確定していません");
      unsupported(ctx, "choiceの引数形式 " + t);
    }
  }
  if (
    defaultChoice !== null &&
    ![...choices].some((c) =>
      caseSensitive
        ? c === defaultChoice
        : c.toUpperCase() === String(defaultChoice).toUpperCase(),
    )
  )
    syntaxFail(ctx, "choice /d の既定値は /c の選択肢から選んでください");
  const promptText =
    (message ? message + " " : "") +
    (hide ? "" : "[" + [...choices].join(",") + "]?");
  if (promptText) ctx.output(promptText, true);
  const candidates = ctx.inputValue("choice", "choice の入力");
  const apply = (state, cand) => {
    if (isUnknown(cand)) {
      state.cmd.errorlevel = cand;
      ctx.api.note(
        state,
        ctx.n,
        "choice の選択が未確定のため、ERRORLEVELを未確定値として扱います",
      );
      return;
    }
    let index = -1;
    if (typeof cand === "number" && Number.isInteger(cand)) index = cand;
    else {
      const text = String(cand);
      if (text.length === 1) {
        index =
          [...choices].findIndex((c) =>
            caseSensitive
              ? c === text
              : c.toUpperCase() === text.toUpperCase(),
          ) + 1;
        if (!index && /^\d$/.test(text)) index = Number(text);
      } else if (/^\d+$/.test(text)) index = Number(text);
    }
    if (index >= 1 && index <= choices.length) {
      state.cmd.errorlevel = index;
      ctx.api.note(
        state,
        ctx.n,
        "choice の選択は " +
          choices[index - 1] +
          "（ERRORLEVEL=" +
          index +
          "）です",
      );
    } else {
      // Learn: choice がエラー条件を検出すると ERRORLEVEL は 255。
      state.cmd.errorlevel = 255;
      ctx.api.note(
        state,
        ctx.n,
        "choice の入力が選択肢にないため、ERRORLEVEL=255（エラー）です",
      );
    }
  };
  if (candidates.length === 1) {
    apply(ctx.s, candidates[0]);
    return;
  }
  return candidates.map((cand) => {
    const st = structuredClone(ctx.s);
    apply(st, cand);
    return st;
  });
}

// ---------------------------------------------------------------- cmd
function cmdCmd(ctx) {
  const a = ctx.arg.trim();
  const m = a.match(/^(?:\/q\s+)?\/c\s+([\s\S]+)$/i);
  if (!m) {
    // 同型（B1G-05）: /c 以外の形式判定の前に未確定検査を通す。
    if (a && isUnknown(ctx.value(a)))
      unconfirmed(ctx, "cmdの引数が確定していません");
    if (/^\/k\b/i.test(a) || !a || /^\//.test(a))
      unsupported(
        ctx,
        "cmdのこの形式（対話起動・/k・/c 以外のオプションはモデル化していません。対応は cmd /c のみです）",
      );
    unsupported(ctx, "cmdの引数形式（対応は cmd /c のみです）");
  }
  const sub = ctx.unquote(m[1].trim());
  if (!sub) syntaxFail(ctx, "cmd /c には実行するコマンドが必要です");
  // B1G-05: サブコマンドの先頭トークン（コマンド名）が未確定なら、
  // 基礎 dispatch にプレースホルダをコマンド名として名指させず、
  // ここ（cmd ハンドラ側）で未確認として止める。先頭以外の引数は
  // サブ実行側でスロット解決されるため対象外（例: cmd /c echo %RANDOM%
  // は従来どおり正直な未確定表示になる）。
  const firstTok = sub.trim().split(/\s+/)[0] ?? "";
  if (isUnknown(ctx.value(ctx.unquote(firstTok))))
    unconfirmed(ctx, "cmd /cで実行するコマンドが確定していません");
  ctx.enqueueCmdC(sub, ctx.snapshotEnv());
  note(
    ctx,
    "新しい cmd として実行します（終了後に環境を復元し、ERRORLEVELを引き継ぎます）",
  );
}

// ---------------------------------------------------------------- color
function color(ctx) {
  let a = ctx.arg.trim();
  // B1G-05: 形式検証の前に未確定検査を通す（未確定値を16進数で
  // ないと断定できない。%RANDOM% の実値は有効な色値であり得る）。
  if (a) {
    const v = ctx.value(a);
    if (isUnknown(v)) unconfirmed(ctx, "colorの引数が確定していません");
    a = String(v).trim();
  }
  if (!a) {
    delete ctx.s.cmd.colorValue;
    ctx.s.cmd.errorlevel = 0;
    note(ctx, "コンソールの色を既定値に戻します");
    return;
  }
  if (!/^[0-9a-f]{1,2}$/i.test(a))
    unsupported(ctx, "colorの引数 " + a + "（16進数1〜2桁のみ対応）");
  const v = a.toUpperCase();
  if (v.length === 2 && v[0] === v[1]) {
    // Learn: 背景色と文字色が同じ場合は色を変えず ERRORLEVEL=1。
    ctx.s.cmd.errorlevel = 1;
    note(ctx, "背景色と文字色が同じため、色は変更しません（ERRORLEVEL=1）");
    return;
  }
  ctx.s.cmd.colorValue = v;
  ctx.s.cmd.errorlevel = 0;
  note(ctx, "コンソールの色を " + v + " に設定します");
}

// ---------------------------------------------------------------- comp / fc 共通
function readPair(ctx, label) {
  const toks = tokens(ctx);
  return toks;
}
function comp(ctx) {
  const toks = readPair(ctx);
  const flags = new Set();
  let nLines = null;
  const files = [];
  for (const tok of toks) {
    const t = ctx.unquote(tok);
    let m;
    if ((m = t.match(/^\/n=(.+)$/i))) {
      // 同型（B1G-05）: /n= の値も形式検証の前に未確定検査を通す。
      const rv = ctx.value(m[1]);
      if (isUnknown(rv)) unconfirmed(ctx, "compの行数が確定していません");
      nLines = Number(rv);
      if (!Number.isInteger(nLines) || nLines < 0)
        syntaxFail(ctx, "comp /n には0以上の整数が必要です");
    } else if (/^\/(d|a|l|c|off|offline)$/i.test(t)) flags.add(t.toLowerCase());
    else if (t.startsWith("/")) {
      if (isUnknown(ctx.value(t)))
        unconfirmed(ctx, "compのオプションが確定していません");
      unsupported(ctx, "compのオプション " + t);
    }
    else files.push(tok);
  }
  if (files.length !== 2)
    syntaxFail(ctx, "compには比較する2つのファイルが必要です");
  if (files.some((f) => /[*?]/.test(ctx.unquote(f))))
    unsupported(ctx, "compのワイルドカードによるファイル集合の比較");
  const e1 = requireFile(ctx, files[0], "comp"),
    e2 = requireFile(ctx, files[1], "comp");
  let aText = e1.content,
    bText = e2.content;
  if (flags.has("/c")) {
    aText = aText.toLowerCase();
    bText = bText.toLowerCase();
  }
  if (nLines !== null) {
    aText = splitLines(aText).slice(0, nLines).join("\n");
    bText = splitLines(bText).slice(0, nLines).join("\n");
  }
  // comp はバイト単位の比較。モデル文字列は UTF-8 バイト列へ変換して
  // 比較する（文字単位で比べるとマルチバイト文字でずれるため）。
  const enc = new TextEncoder();
  const a = enc.encode(aText),
    b = enc.encode(bText);
  if (nLines === null && a.length !== b.length) {
    ctx.output("Files are different sizes");
    ctx.s.cmd.errorlevel = 1;
    note(ctx, "ファイルの大きさが違うため比較を打ち切ります");
    return;
  }
  const mismatches = [];
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len && mismatches.length < 11; i++)
    if (a[i] !== b[i]) mismatches.push(i);
  if (!mismatches.length && a.length === b.length) {
    ctx.output("Files compare OK");
    ctx.s.cmd.errorlevel = 0;
    note(ctx, "ファイルの内容が一致しました");
    return;
  }
  const dec = new TextDecoder();
  for (const i of mismatches.slice(0, 10)) {
    ctx.output("Compare error at OFFSET " + i.toString(16).toUpperCase());
    const show = (byte) =>
      flags.has("/a")
        ? dec.decode(new Uint8Array([byte]))
        : flags.has("/d")
          ? String(byte)
          : byte.toString(16).toUpperCase().padStart(2, "0");
    ctx.output("file1 = " + show(a[i]));
    ctx.output("file2 = " + show(b[i]));
  }
  if (mismatches.length > 10) ctx.output("10 Mismatches - ending compare");
  ctx.s.cmd.errorlevel = 1;
  note(ctx, "ファイルの内容が異なります");
}
function fc(ctx) {
  const toks = readPair(ctx);
  const flags = new Set();
  const files = [];
  for (const tok of toks) {
    const t = ctx.unquote(tok);
    if (/^\/(a|b|c|l|n|t|u|w)$/i.test(t)) flags.add(t.toLowerCase());
    else if (t.startsWith("/")) {
      if (isUnknown(ctx.value(t)))
        unconfirmed(ctx, "fcのオプションが確定していません");
      unsupported(ctx, "fcのオプション " + t + "（/lb・再同期行数・/off 等は未対応）");
    }
    else files.push(tok);
  }
  if (files.length !== 2)
    syntaxFail(ctx, "fcには比較する2つのファイルが必要です");
  if (files.some((f) => /[*?]/.test(ctx.unquote(f))))
    unsupported(ctx, "fcのワイルドカードによるファイル集合の比較");
  const get = (tok) => {
    const v = resolved(ctx, tok);
    if (isUnknown(v)) unconfirmed(ctx, "fcのファイルが確定していません");
    const e = ctx.fsEntry(v);
    if (!e || e.type !== "file") return null;
    if (e.content === undefined || isUnknown(e.content))
      unconfirmed(ctx, "fcのファイル内容がモデルにありません");
    return e;
  };
  const e1 = get(files[0]),
    e2 = get(files[1]);
  if (!e1 || !e2) {
    // Learn の fc 終了コード表: 2 = 比較中にエラーが発生した。
    ctx.output("FC: ファイルを開けません");
    ctx.s.cmd.errorlevel = 2;
    note(ctx, "比較対象のファイルがないため、終了コード2で終了します");
    return;
  }
  if (flags.has("/b")) {
    // /b はバイト単位の比較（再同期しない）。UTF-8 バイト列で比べる。
    const enc = new TextEncoder();
    const ba = enc.encode(e1.content),
      bb = enc.encode(e2.content);
    const diffs = [];
    const blen = Math.min(ba.length, bb.length);
    for (let i = 0; i < blen; i++) if (ba[i] !== bb[i]) diffs.push(i);
    if (!diffs.length && ba.length === bb.length) {
      ctx.output("FC: no differences encountered");
      ctx.s.cmd.errorlevel = 0;
      note(ctx, "ファイルの内容が一致しました");
      return;
    }
    for (const i of diffs.slice(0, 100))
      ctx.output(
        i.toString(16).toUpperCase().padStart(8, "0") +
          ": " +
          ba[i].toString(16).toUpperCase().padStart(2, "0") +
          " " +
          bb[i].toString(16).toUpperCase().padStart(2, "0"),
      );
    if (ba.length !== bb.length)
      ctx.output(
        "FC: " +
          (ba.length > bb.length ? e1.path : e2.path) +
          " longer than " +
          (ba.length > bb.length ? e2.path : e1.path),
      );
    ctx.s.cmd.errorlevel = 1;
    note(ctx, "ファイルの内容が異なります（終了コード1）");
    return;
  }
  const norm = (text) => {
    let ls = splitLines(text);
    if (flags.has("/c")) ls = ls.map((l) => l.toLowerCase());
    if (flags.has("/w"))
      ls = ls.map((l) => l.replace(/[ \t]+/g, " ").trim());
    if (flags.has("/t")) ls = ls.map((l) => l.replace(/\t/g, "        "));
    return ls;
  };
  const la = norm(e1.content),
    lb = norm(e2.content);
  const same =
    la.length === lb.length && la.every((l, i) => l === lb[i]);
  if (same) {
    ctx.output("FC: no differences encountered");
    ctx.s.cmd.errorlevel = 0;
    note(ctx, "ファイルの内容が一致しました");
    return;
  }
  const rawA = splitLines(e1.content),
    rawB = splitLines(e2.content);
  ctx.output("Comparing files " + e1.path + " and " + e2.path);
  const max = Math.max(rawA.length, rawB.length);
  for (let i = 0; i < max; i++) {
    if (la[i] === lb[i]) continue;
    const num = (v) => (flags.has("/n") ? i + 1 + ": " : "") + (v ?? "");
    ctx.output("***** " + e1.path);
    if (rawA[i] !== undefined) ctx.output(num(rawA[i]));
    ctx.output("***** " + e2.path);
    if (rawB[i] !== undefined) ctx.output(num(rawB[i]));
    ctx.output("*****");
  }
  if (rawA.length !== rawB.length)
    ctx.output(
      "FC: " +
        (rawA.length > rawB.length ? e1.path : e2.path) +
        " longer than " +
        (rawA.length > rawB.length ? e2.path : e1.path),
    );
  ctx.s.cmd.errorlevel = 1;
  note(ctx, "ファイルの内容が異なります（終了コード1）");
}

// ---------------------------------------------------------------- date / time
function dateCmd(ctx) {
  const a = ctx.arg.trim();
  // 同型（B1G-05）: 設定値の形式判定の前に未確定検査を通す。
  if (a && !/^\/t$/i.test(a) && isUnknown(ctx.value(a)))
    unconfirmed(ctx, "dateの引数が確定していません");
  if (!a || /^\/t$/i.test(a)) {
    ctx.output(ctx.freshUnknown("現在の日付"));
    note(ctx, "現在の日付を表示します（値は実行時に決まります）");
    return;
  }
  if (/^\/\?/.test(a)) unsupported(ctx, "dateのヘルプ表示");
  unsupported(ctx, "dateによる日付の設定（このモデルでは表示のみ対応します）");
}
function timeCmd(ctx) {
  const a = ctx.arg.trim();
  // 同型（B1G-05）: 設定値の形式判定の前に未確定検査を通す。
  if (a && !/^\/t$/i.test(a) && isUnknown(ctx.value(a)))
    unconfirmed(ctx, "timeの引数が確定していません");
  if (!a || /^\/t$/i.test(a)) {
    ctx.output(ctx.freshUnknown("現在の時刻"));
    note(ctx, "現在の時刻を表示します（値は実行時に決まります）");
    return;
  }
  if (/^\/\?/.test(a)) unsupported(ctx, "timeのヘルプ表示");
  unsupported(ctx, "timeによる時刻の設定（このモデルでは表示のみ対応します）");
}

// ---------------------------------------------------------------- doskey
function doskey(ctx) {
  const a = ctx.arg.trim();
  if (!a) {
    note(ctx, "doskey は引数なしでは何もしません");
    return;
  }
  if (a.startsWith("/")) {
    // B1G-04: 照会形式の名指しの前に未確定検査を通す。
    if (isUnknown(ctx.value(a.split(/\s/)[0])))
      unconfirmed(ctx, "doskeyの引数が確定していません");
    unsupported(
      ctx,
      "doskeyの照会・管理形式 " +
        a.split(/\s/)[0] +
        "（/macros・/history 等はモデル化していません）",
    );
  }
  const eq = a.indexOf("=");
  if (eq <= 0) {
    if (isUnknown(ctx.value(a)))
      unconfirmed(ctx, "doskeyのマクロ名が確定していません");
    syntaxFail(ctx, "doskeyのマクロ定義は 名前=文字列 の形式です");
  }
  // B1G-04: マクロ名・定義文字列をスロット解決し、未確定なら
  // プレースホルダのまま状態へ保存せず未確認で止める。
  const nameV = ctx.value(a.slice(0, eq).trim());
  if (isUnknown(nameV)) unconfirmed(ctx, "doskeyのマクロ名が確定していません");
  const defV = ctx.value(a.slice(eq + 1));
  if (isUnknown(defV))
    unconfirmed(ctx, "doskeyのマクロ定義が確定していません");
  const name = String(nameV);
  if (!/^[^\s=]+$/.test(name)) syntaxFail(ctx, "doskeyのマクロ名が不正です");
  ctx.s.cmd.doskeyMacros = { ...(ctx.s.cmd.doskeyMacros || {}) };
  ctx.s.cmd.doskeyMacros[name] = String(defV);
  // Learn「doskey」: バッチプログラムからは doskey マクロを実行できない。
  note(
    ctx,
    "doskeyマクロ " +
      name +
      " を定義します（バッチファイル内ではマクロは展開されないため、このバッチの実行には影響しません）",
  );
}

// ---------------------------------------------------------------- findstr
function findstr(ctx) {
  const toks = tokens(ctx);
  const flags = new Set();
  // B1B-03: /c は複数回指定でき、各文字列がリテラルとして OR に加わる。
  const cStrings = [];
  const rest = [];
  for (let i = 0; i < toks.length; i++) {
    const rawTok = toks[i];
    const t = ctx.unquote(rawTok);
    let m;
    if ((m = t.match(/^\/c:(.*)$/i))) {
      // B1A-02: /c の引用符は文字列の一部ではない（Learn の公式例
      // findstr /c:"hello there" x.y の形）。値を囲む引用符は外し、
      // /c の文字列はリテラルとして照合する（下の patterns 参照）。
      let v = m[1];
      if (v === "") v = ctx.unquote(toks[++i] ?? "");
      if (v.length >= 2 && v.startsWith('"') && v.endsWith('"'))
        v = v.slice(1, -1);
      // B1F-01: /c の値も通常トークンと同じくスロット解決を通す。
      // 未確定値（%RANDOM% 等）が混ざる場合は、内部プレースホルダを
      // 検索文字列にして黙って完走せず、未確認として正直に止める。
      const rv = ctx.value(v);
      if (isUnknown(rv))
        unconfirmed(ctx, "findstrの検索文字列が確定していません");
      cStrings.push(String(rv));
    } else if (/^\/(b|e|l|r|s|i|x|v|n|m)$/i.test(t)) flags.add(t.toLowerCase());
    else if (t.startsWith("/")) {
      // 同型（B1G-05）: オプションの名指しの前に未確定検査を通す。
      if (isUnknown(ctx.value(t)))
        unconfirmed(ctx, "findstrのオプションが確定していません");
      unsupported(
        ctx,
        "findstrのオプション " + t.split(":")[0] + "（/f・/g・/d・/a・/o・/p 等は未対応）",
      );
    }
    else rest.push(rawTok);
  }
  // B1B-03: 検索文字列は複数指定でき OR 検索になる（Microsoft Learn
  // findstr: "Use spaces to separate multiple search strings unless
  // the argument is prefixed with /c"）。/c でない文字列は、引用符で
  // 囲まれていても中の空白で複数の文字列に分かれる。/c の文字列は
  // 空白を含めて1つのリテラル文字列のまま扱う。
  // 文字列とファイルの判別は実物の位置規則（文字列引数の後に
  // ファイルが続く）に寄せ、末尾側からファイルらしいトークンを
  // ファイルとして切り分ける:
  // - 強判定: 実在するエントリ、または実際に一致する項目がある
  //   ワイルドカードのトークンはファイル位置とみなす。
  // - 弱判定: 強判定のファイルが1つも無い場合に限り、末尾側の
  //   拡張子らしいトークンをファイル位置とみなす（存在しない
  //   ファイルを B1A-07 どおり名指すため）。
  // - どちらにも当たらない末尾トークンは文字列として扱い、
  //   「存在しないファイル」という虚偽の原因は出さない（ファイルが
  //   無ければパイプ入力／コンソール入力の扱いになる）。
  // /c が無い場合は最初のトークンを必ず文字列として残す（B1A-07:
  // ファイル名と同名の検索文字列をファイルと誤認しない）。
  if (!rest.length && !cStrings.length)
    syntaxFail(ctx, "findstrには検索文字列が必要です");
  const restVals = rest.map((tok) => resolved(ctx, tok));
  let stringToks = [],
    fileToks = [];
  if (restVals.some((v) => isUnknown(v))) {
    // 値が確定しないトークンがある場合は従来の位置規則で割り当て、
    // 未確定の名指し（検索文字列／ファイル）をそのまま出す。
    // B1E-01: 空文字列トークンは確定値経路（B1D-01）と同じくファイル
    // ではあり得ないため、この分岐でも位置によらず文字列側へ回す
    // （ファイル側に残った未確定トークンは読み取り時に「ファイルが
    // 確定していません」と正直に停止する）。
    const emptyToks = rest.filter(
      (tok, i) => !isUnknown(restVals[i]) && String(restVals[i]) === "",
    );
    const nonEmpty = rest.filter(
      (tok, i) => isUnknown(restVals[i]) || String(restVals[i]) !== "",
    );
    if (!cStrings.length) {
      if (isUnknown(restVals[0]))
        unconfirmed(ctx, "findstrの検索文字列が確定していません");
      stringToks = [...(nonEmpty.length ? [nonEmpty[0]] : []), ...emptyToks];
      fileToks = nonEmpty.slice(1);
    } else {
      stringToks = emptyToks;
      fileToks = nonEmpty;
    }
  } else {
    const strongFile = (v) => {
      const text = String(v);
      // B1D-01: 空文字列はファイルではあり得ない（空パスは現在
      // フォルダへ解決されて実在エントリに一致してしまうため、
      // 位置によらずファイル判定から外す）。
      if (text === "") return false;
      if (/[*?]/.test(text)) {
        // ワイルドカードは、実際に一致する項目がある場合だけ
        // ファイル位置とみなす（正規表現として * や ? を含む検索
        // 文字列をファイルパターンと誤認しないため）。
        const entries = flags.has("/s")
          ? recursiveMatches(ctx, text)
          : ctx.listFiles(text);
        return Array.isArray(entries) && entries.length > 0;
      }
      const e = ctx.fsEntry(text);
      return !!e;
    };
    const minStrings = cStrings.length ? 0 : 1;
    let split = rest.length;
    while (split > minStrings && strongFile(restVals[split - 1])) split--;
    if (split === rest.length) {
      // 強判定のファイルが無い場合のみ弱判定（拡張子）で末尾を切る。
      const extFile = (v) => /\.[^.\s\\]+$/.test(String(v));
      while (split > minStrings && extFile(restVals[split - 1])) split--;
    }
    stringToks = rest.slice(0, split);
    fileToks = rest.slice(split);
  }
  // /c でない文字列トークンは空白で分割して複数の文字列にする。
  // B1C-02: 明示された空文字列（findstr ""）は有効な検索文字列で、
  // 全ての行に一致する（/c:"" や基礎層 find "" と同じ扱い）。
  // 空白区切りの途中に出る空片だけを捨てる。
  const plainStrings = [];
  for (const tok of stringToks) {
    const v = resolved(ctx, tok);
    if (isUnknown(v))
      unconfirmed(ctx, "findstrの検索文字列が確定していません");
    const pieces = String(v).split(/\s+/).filter((piece) => piece !== "");
    if (!pieces.length && String(v) === "") plainStrings.push("");
    else plainStrings.push(...pieces);
  }
  const stringSpecs = [
    ...cStrings.map((text) => ({ text, literal: true })),
    ...plainStrings.map((text) => ({ text, literal: false })),
  ];
  if (!stringSpecs.length)
    syntaxFail(ctx, "findstrには検索文字列が必要です");
  const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = stringSpecs.map(({ text: p, literal }) => {
    // /c の文字列は Learn の定義どおりリテラル照合（/l と同じ扱い）。
    let body = flags.has("/l") || literal ? escapeRe(p) : p;
    if (flags.has("/b")) body = "^(?:" + body + ")";
    if (flags.has("/e")) body = "(?:" + body + ")$";
    if (flags.has("/x")) body = "^(?:" + body + ")$";
    try {
      return new RegExp(body, flags.has("/i") ? "i" : "");
    } catch {
      syntaxFail(ctx, "findstrの正規表現が不正です：" + p);
    }
  });
  let sources = []; // {label, text}
  if (!fileToks.length) {
    const stdin = ctx.getStdin();
    if (typeof stdin !== "string")
      unsupported(ctx, "findstrのコンソール入力（ファイルまたはパイプ入力のみ対応）");
    sources = [{ label: null, text: stdin }];
  } else {
    for (const ft of fileToks) {
      const v = resolved(ctx, ft);
      if (isUnknown(v)) unconfirmed(ctx, "findstrのファイルが確定していません");
      if (/[*?]/.test(v) || flags.has("/s")) {
        const entries = (
          flags.has("/s") ? recursiveMatches(ctx, v) : ctx.listFiles(v)
        ).filter((e) => e.type === "file");
        if (!entries.length)
          execFail(ctx, "モデルにファイルがありません：" + v);
        for (const e of entries) {
          if (e.content === undefined || isUnknown(e.content))
            unconfirmed(ctx, "findstrのファイル内容がモデルにありません");
          sources.push({ label: e.path, text: e.content });
        }
      } else {
        const e = requireFile(ctx, ft, "findstr");
        sources.push({ label: e.path, text: e.content });
      }
    }
  }
  const multi = sources.length > 1 || fileToks.length > 1;
  let found = false;
  const matchedFiles = new Set();
  for (const src of sources) {
    splitLines(src.text).forEach((ln, idx) => {
      const hit = patterns.some((re) => re.test(ln));
      if (hit === flags.has("/v")) return;
      found = true;
      matchedFiles.add(src.label);
      if (flags.has("/m")) return;
      let outLine = ln;
      if (flags.has("/n")) outLine = idx + 1 + ":" + outLine;
      if (multi && src.label) outLine = src.label + ":" + outLine;
      ctx.output(outLine);
    });
  }
  if (flags.has("/m"))
    for (const f of matchedFiles) if (f) ctx.output(f);
  ctx.s.cmd.errorlevel = found ? 0 : 1;
  note(
    ctx,
    found
      ? "検索文字列を含む行を選びます（ERRORLEVEL=0）"
      : "検索文字列を含む行はありません（ERRORLEVEL=1）",
  );
}

// ---------------------------------------------------------------- help
const BASE_COMMANDS = [
  "call", "cd", "chdir", "cls", "copy", "del", "dir", "echo", "endlocal",
  "erase", "exit", "find", "for", "goto", "if", "md", "mkdir", "move",
  "pause", "rd", "rem", "ren", "rename", "rmdir", "set", "setlocal", "type",
];
function helpCmd(ctx) {
  // B1G-03: 引数をスロット解決し（小文字化の前に解決する。
  // プレースホルダは大文字のスロット名で保持されているため）、
  // 未確定ならプレースホルダをコマンド名として照合せず未確認で止める。
  const av = ctx.value(ctx.arg.trim());
  if (isUnknown(av)) unconfirmed(ctx, "helpのコマンド名が確定していません");
  const a = String(av).trim().toLowerCase();
  const all = [
    ...new Set([...BASE_COMMANDS, ...Object.keys(advancedCommandHandlers)]),
  ].sort();
  if (!a) {
    for (const name of all) ctx.output(name);
    ctx.s.cmd.errorlevel = 0;
    note(
      ctx,
      "このモデルで使えるコマンドの一覧を出力します（実機の help の一覧とは異なります）",
    );
    return;
  }
  if (all.includes(a)) {
    ctx.output(a + " はこのモデルで対応しています");
    ctx.s.cmd.errorlevel = 0;
    note(ctx, a + " の概要を出力します（詳細はリファレンスを見てください）");
    return;
  }
  const stop = [...advancedStops, ...advancedAliasStops].find(
    (st) => st.name.toLowerCase() === a,
  );
  if (stop)
    ctx.fail(
      "未対応：" + stop.name + "（" + stop.reason + "）",
      line(ctx),
    );
  ctx.output("このコマンドは help ではサポートされていません：" + a);
  ctx.s.cmd.errorlevel = 1;
  note(ctx, "モデルに無いコマンドです");
}

// ---------------------------------------------------------------- more
function more(ctx) {
  const toks = tokens(ctx);
  const files = [];
  for (const tok of toks) {
    const t = ctx.unquote(tok);
    if (t.startsWith("/")) {
      if (isUnknown(ctx.value(t)))
        unconfirmed(ctx, "moreのオプションが確定していません");
      unsupported(ctx, "moreのオプション " + t);
    } else files.push(tok);
  }
  if (!files.length) {
    const stdin = ctx.getStdin();
    if (typeof stdin !== "string")
      unsupported(ctx, "moreのコンソール入力（ファイルまたはパイプ入力のみ対応）");
    ctx.output(stdin, true);
    note(ctx, "入力をそのまま出力します（ページ送りはモデル化していません）");
    ctx.s.cmd.errorlevel = 0;
    return;
  }
  for (const f of files) {
    const e = requireFile(ctx, f, "more");
    ctx.output(e.content, true);
  }
  ctx.s.cmd.errorlevel = 0;
  note(ctx, "ファイルの内容をそのまま出力します（ページ送りはモデル化していません）");
}

// ---------------------------------------------------------------- path
function pathCmd(ctx) {
  const a = ctx.arg.trim();
  if (!a) {
    const v = ctx.ciGet("PATH");
    if (v === undefined) {
      ctx.output("");
      note(ctx, "PATH は設定されていません（モデルに値がありません）");
    } else {
      if (isUnknown(v)) unconfirmed(ctx, "PATHの値が確定していません");
      ctx.output("PATH=" + v);
      note(ctx, "現在の PATH を表示します");
    }
    return;
  }
  if (a === ";") {
    ctx.ciSet("PATH", undefined);
    ctx.s.cmd.errorlevel = 0;
    note(ctx, "PATH をクリアします");
    return;
  }
  const v = ctx.value(a);
  if (isUnknown(v)) unconfirmed(ctx, "PATHの値が確定していません");
  ctx.ciSet("PATH", String(v));
  ctx.s.cmd.errorlevel = 0;
  note(ctx, "PATH を設定します：" + v);
}

// ---------------------------------------------------------------- pushd / popd
function pushd(ctx) {
  const toks = tokens(ctx);
  // B1A-08: 引数なしの pushd はスタック一覧を表示する（実物／SS64）。
  if (toks.length === 0) {
    const stack = ctx.s.cmd.dirStack || [];
    for (const p of stack) ctx.output(p);
    ctx.s.cmd.errorlevel = 0;
    note(
      ctx,
      stack.length
        ? "保存されているフォルダの一覧を表示します（" + stack.length + "件）"
        : "ディレクトリスタックは空のため、表示するフォルダはありません",
    );
    return;
  }
  if (toks.length !== 1)
    syntaxFail(ctx, "pushdには移動先フォルダを1つ指定してください");
  const v = resolved(ctx, toks[0]);
  if (isUnknown(v)) unconfirmed(ctx, "pushdの移動先が確定していません");
  const target = ctx.windowsPath(v, ctx.s.model.cwd, line(ctx));
  const e = ctx.fsEntry(target);
  if (!e || e.type !== "directory")
    execFail(ctx, "モデルに移動先フォルダがありません：" + v);
  ctx.s.cmd.dirStack = [...(ctx.s.cmd.dirStack || []), ctx.s.model.cwd];
  ctx.s.model.cwd = target;
  ctx.s.cmd.errorlevel = 0;
  note(
    ctx,
    "現在フォルダをスタックに保存し、" +
      target +
      " へ移動します（スタックの深さ " +
      ctx.s.cmd.dirStack.length +
      "）",
  );
}
function popd(ctx) {
  // 同型（B1G-05）: 引数の有無判定の前に未確定検査を通す。
  if (ctx.arg.trim() && isUnknown(ctx.value(ctx.arg.trim())))
    unconfirmed(ctx, "popdの引数が確定していません");
  if (ctx.arg.trim()) unsupported(ctx, "popdの引数");
  const stack = ctx.s.cmd.dirStack || [];
  if (!stack.length) {
    note(ctx, "ディレクトリスタックが空のため、現在フォルダは変わりません");
    return;
  }
  const target = stack[stack.length - 1];
  const e = ctx.fsEntry(target);
  if (!e || e.type !== "directory")
    execFail(ctx, "スタックのフォルダがモデルにありません：" + target);
  ctx.s.cmd.dirStack = stack.slice(0, -1);
  ctx.s.model.cwd = target;
  ctx.s.cmd.errorlevel = 0;
  note(ctx, "スタックから復元し、現在フォルダを " + target + " にします");
}

// ---------------------------------------------------------------- prompt / title / verify / color state
function promptCmd(ctx) {
  const a = ctx.arg;
  const v = a === "" ? "$P$G" : ctx.value(a);
  if (isUnknown(v)) unconfirmed(ctx, "promptの文字列が確定していません");
  ctx.s.cmd.promptText = String(v);
  ctx.ciSet("PROMPT", String(v));
  note(ctx, "プロンプトを「" + v + "」に設定します");
}
function titleCmd(ctx) {
  const v = ctx.value(ctx.arg);
  if (isUnknown(v)) unconfirmed(ctx, "titleの文字列が確定していません");
  ctx.s.cmd.windowTitle = String(v);
  note(ctx, "ウィンドウのタイトルを「" + v + "」に設定します");
}
function verifyCmd(ctx) {
  // 同型（B1G-05）: 小文字化の前にスロット解決し、on/off の形式
  // 検証の前に未確定検査を通す。
  const av = ctx.value(ctx.arg.trim());
  if (isUnknown(av)) unconfirmed(ctx, "verifyの引数が確定していません");
  const a = String(av).trim().toLowerCase();
  if (!a) {
    ctx.output(
      "VERIFY is " + (ctx.s.cmd.verifyState ? "on" : "off") + ".",
    );
    note(
      ctx,
      "verify の現在の設定を表示します：" +
        (ctx.s.cmd.verifyState ? "on" : "off"),
    );
    return;
  }
  if (a !== "on" && a !== "off")
    syntaxFail(ctx, "verifyの引数は on または off です");
  ctx.s.cmd.verifyState = a === "on";
  note(ctx, "verify を " + a + " に設定します（書き込み検証の設定です）");
}

// ---------------------------------------------------------------- replace
function replaceCmd(ctx) {
  const toks = tokens(ctx);
  const flags = new Set();
  const paths = [];
  for (const tok of toks) {
    const t = ctx.unquote(tok);
    if (/^\/(a|s|r)$/i.test(t)) flags.add(t.toLowerCase());
    else if (/^\/(p|w|u)$/i.test(t))
      unsupported(
        ctx,
        "replaceのオプション " + t + (/^\/u$/i.test(t) ? "（モデルのファイルには更新時刻がないため比較できません）" : "（確認・待機の形式はモデル化していません）"),
      );
    else if (t.startsWith("/")) {
      if (isUnknown(ctx.value(t)))
        unconfirmed(ctx, "replaceのオプションが確定していません");
      unsupported(ctx, "replaceのオプション " + t);
    } else paths.push(tok);
  }
  if (paths.length !== 2)
    syntaxFail(ctx, "replaceには置換元と置換先フォルダが必要です");
  const srcPat = resolved(ctx, paths[0]);
  const dstDirV = resolved(ctx, paths[1]);
  if (isUnknown(srcPat) || isUnknown(dstDirV))
    unconfirmed(ctx, "replaceの対象が確定していません");
  const dstDir = ctx.windowsPath(dstDirV, ctx.s.model.cwd, line(ctx));
  const dstEntry = ctx.fsEntry(dstDir);
  if (!dstEntry || dstEntry.type !== "directory")
    execFail(ctx, "モデルに置換先フォルダがありません：" + dstDirV);
  let sources;
  if (/[*?]/.test(srcPat)) {
    sources = (
      flags.has("/s") ? recursiveMatches(ctx, srcPat) : ctx.listFiles(srcPat)
    ).filter((e) => e.type === "file");
  } else {
    const e = ctx.fsEntry(srcPat);
    if (e?.type === "directory") {
      const pat = srcPat.replace(/\\$/, "") + "\\*";
      sources = (
        flags.has("/s") ? recursiveMatches(ctx, pat) : ctx.listFiles(pat)
      ).filter((x) => x.type === "file");
    } else if (e?.type === "file") sources = [e];
    else sources = [];
  }
  if (!sources.length)
    execFail(ctx, "モデルに置換元ファイルがありません：" + srcPat);
  let done = 0;
  for (const src of sources) {
    // /s のときは元のフォルダ構造の相対部分を保つ代わりに、部分集合として
    // ファイル名だけで置換先へ対応付ける（構造の保持は未対応としてメモに明記）。
    const destPath = dstDir.replace(/\\$/, "") + "\\" + src.path.split("\\").at(-1);
    const dest = ctx.fsEntry(destPath);
    if (flags.has("/a") && dest) continue;
    if (!flags.has("/a") && !dest) continue;
    if (src.content === undefined || isUnknown(src.content))
      unconfirmed(ctx, "replaceの元ファイル内容がモデルにありません");
    ctx.writeFile(destPath, src.content);
    const written = ctx.fsEntry(destPath);
    if (written && Array.isArray(src.attributes))
      written.attributes = [...src.attributes];
    ctx.output((dest ? "Replacing " : "Adding ") + destPath);
    done++;
  }
  ctx.output(
    done +
      (flags.has("/a") ? " file(s) added" : " file(s) replaced"),
  );
  ctx.s.cmd.errorlevel = 0;
  note(ctx, "ファイルを " + done + " 件" + (flags.has("/a") ? "追加" : "置換") + "します");
}

// ---------------------------------------------------------------- robocopy
function robocopy(ctx) {
  const toks = tokens(ctx);
  const allowed = new Set(["/s", "/e", "/np", "/njh", "/njs", "/ndl", "/nfl", "/ns", "/nc"]);
  const flags = new Set();
  const positional = [];
  for (const tok of toks) {
    const t = ctx.unquote(tok);
    if (t.startsWith("/")) {
      if (isUnknown(ctx.value(t)))
        unconfirmed(ctx, "robocopyのオプションが確定していません");
      const key = t.toLowerCase().split(":")[0];
      if (!allowed.has(key))
        unsupported(ctx, "robocopyのオプション " + t);
      flags.add(key);
    } else positional.push(tok);
  }
  if (positional.length < 2)
    syntaxFail(ctx, "robocopyにはコピー元フォルダとコピー先フォルダが必要です");
  const srcV = resolved(ctx, positional[0]);
  const dstV = resolved(ctx, positional[1]);
  if (isUnknown(srcV) || isUnknown(dstV))
    unconfirmed(ctx, "robocopyの対象が確定していません");
  const srcDir = ctx.windowsPath(srcV, ctx.s.model.cwd, line(ctx));
  const dstDir = ctx.windowsPath(dstV, ctx.s.model.cwd, line(ctx));
  const srcEntry = ctx.fsEntry(srcDir);
  if (!srcEntry || srcEntry.type !== "directory") {
    // Learn の robocopy 終了コード: 16 = 重大なエラー（何もコピーされない）。
    ctx.output("ERROR 16: コピー元フォルダがありません：" + srcV);
    ctx.s.cmd.errorlevel = 16;
    note(ctx, "コピー元がないため終了コード16（重大なエラー）で終了します");
    return;
  }
  // B1G-02: ファイルパターンもコピー元・先と同じく解決結果を
  // isUnknown で検査する（コピー先フォルダの作成より前に行い、
  // 未確認で止まる場合に副作用を残さない）。String() 化を無検査で
  // 行うと未確定オブジェクトが "[object Object]" というパターンに
  // 化け、黙って0件コピーで完走したり同名の実ファイルを誤コピーする。
  const patterns = positional.slice(2).map((t) => {
    const v = resolved(ctx, t);
    if (isUnknown(v)) unconfirmed(ctx, "robocopyの対象が確定していません");
    return String(v);
  });
  if (!ctx.fsEntry(dstDir)) ctx.makeDirectory(dstDir);
  const pats = patterns.length ? patterns : ["*.*"];
  const recursive = flags.has("/s") || flags.has("/e");
  const prefix = srcDir.replace(/\\$/, "") + "\\";
  const srcFiles = ctx.s.model.files.filter((e) => {
    if (e.type !== "file") return false;
    if (!e.path.toLowerCase().startsWith(prefix.toLowerCase())) return false;
    const rel = e.path.slice(prefix.length);
    if (!recursive && rel.includes("\\")) return false;
    return pats.some((p) => maskRegex(p).test(rel.split("\\").at(-1)));
  });
  if (flags.has("/e")) {
    for (const e of ctx.s.model.files) {
      if (e.type !== "directory") continue;
      if (!e.path.toLowerCase().startsWith(prefix.toLowerCase())) continue;
      const rel = e.path.slice(prefix.length);
      if (!rel) continue;
      const target = dstDir.replace(/\\$/, "") + "\\" + rel;
      if (!ctx.fsEntry(target)) ctx.makeDirectory(target);
    }
  }
  let copied = 0,
    mismatch = false;
  const destNames = new Set();
  for (const src of srcFiles) {
    const rel = src.path.slice(prefix.length);
    const destPath = dstDir.replace(/\\$/, "") + "\\" + rel;
    destNames.add(destPath.toLowerCase());
    const dest = ctx.fsEntry(destPath);
    if (dest?.type === "directory") {
      mismatch = true;
      continue;
    }
    if (dest && dest.content === src.content) continue;
    if (src.content === undefined || isUnknown(src.content))
      unconfirmed(ctx, "robocopyの元ファイル内容がモデルにありません");
    const parent = destPath.slice(0, destPath.lastIndexOf("\\"));
    if (!ctx.fsEntry(parent)) ctx.makeDirectory(parent);
    ctx.writeFile(destPath, src.content);
    const written = ctx.fsEntry(destPath);
    if (written && Array.isArray(src.attributes))
      written.attributes = [...src.attributes];
    ctx.output(destPath);
    copied++;
  }
  const dstPrefix = dstDir.replace(/\\$/, "") + "\\";
  const extra = ctx.s.model.files.some((e) => {
    if (!e.path.toLowerCase().startsWith(dstPrefix.toLowerCase())) return false;
    if (!recursive && e.path.slice(dstPrefix.length).includes("\\")) return false;
    return e.type === "file" && !destNames.has(e.path.toLowerCase());
  });
  let code = 0;
  if (copied) code |= 1;
  if (extra) code |= 2;
  if (mismatch) code |= 4;
  ctx.s.cmd.errorlevel = code;
  note(
    ctx,
    "robocopy で " + copied + " 件をコピーします（終了コード " + code + "：1=コピー実行、2=余分なファイル、4=不一致のビット和です）",
  );
}

// ---------------------------------------------------------------- shift
function shiftCmd(ctx) {
  let a = ctx.arg.trim();
  // B1G-05: 形式検証の前に未確定検査を通す（プレースホルダを
  // 実引数として名指した虚偽の原因で止めない）。
  if (a) {
    const v = ctx.value(a);
    if (isUnknown(v)) unconfirmed(ctx, "shiftの引数が確定していません");
    a = String(v).trim();
  }
  const args = ctx.s.cmd.args;
  if (!a) {
    if (args.length) args.shift();
    note(
      ctx,
      args.length
        ? "引数を1つずらします（新しい %1 は " + args[0] + "）"
        : "引数を1つずらします（残りの引数はありません）",
    );
    return;
  }
  const m = a.match(/^\/(\d)$/);
  if (!m) unsupported(ctx, "shiftの引数形式 " + a + "（対応は shift と shift /n のみ）");
  const n = Number(m[1]);
  if (n === 0)
    unsupported(ctx, "shift /0（%0 はバッチファイル名で、このモデルでは保持していません）");
  if (n - 1 < args.length) args.splice(n - 1, 1);
  note(ctx, "%" + n + " から引数をずらします");
}

// ---------------------------------------------------------------- sort
function sortCmd(ctx) {
  const toks = tokens(ctx);
  let reverse = false,
    column = 1,
    outFile = null;
  const files = [];
  for (let i = 0; i < toks.length; i++) {
    const t = ctx.unquote(toks[i]);
    let m;
    if (/^\/r$/i.test(t)) reverse = true;
    else if ((m = t.match(/^\/\+(.*)$/))) {
      // B1G-05: /+ の値は形式検証（数値照合）の前に未確定検査を
      // 通す。未確定のまま照合するとプレースホルダを実引数として
      // 名指した虚偽の原因になる。
      const rv = ctx.value(m[1]);
      if (isUnknown(rv)) unconfirmed(ctx, "sortの列番号が確定していません");
      if (!/^\d+$/.test(String(rv)))
        unsupported(ctx, "sortのオプション " + t);
      column = Number(rv);
      if (column < 1) syntaxFail(ctx, "sort /+ には1以上の列番号が必要です");
    } else if ((m = t.match(/^\/o(?::)?(.*)$/i))) {
      outFile = m[1] || ctx.unquote(toks[++i] ?? "");
      if (!outFile) syntaxFail(ctx, "sort /o には出力ファイルが必要です");
    } else if (t.startsWith("/")) {
      if (isUnknown(ctx.value(t)))
        unconfirmed(ctx, "sortのオプションが確定していません");
      unsupported(ctx, "sortのオプション " + t);
    }
    else files.push(toks[i]);
  }
  if (files.length > 1) unsupported(ctx, "sortの複数ファイル");
  let text;
  if (files.length) text = requireFile(ctx, files[0], "sort").content;
  else {
    text = ctx.getStdin();
    if (typeof text !== "string")
      unsupported(ctx, "sortのコンソール入力（ファイルまたはパイプ入力のみ対応）");
  }
  const lines = text === "" ? [] : splitLines(text);
  // B1A-11: リファレンス説明（大文字と小文字は区別しません）に合わせ、
  // 大小を区別しない比較にする。同順の場合は 0 を返し、安定ソートで
  // 元の文字列の順序を保つ。
  const sorted = [...lines].sort((x, y) => {
    const kx = x.slice(column - 1).toLowerCase(),
      ky = y.slice(column - 1).toLowerCase();
    const c = kx < ky ? -1 : kx > ky ? 1 : 0;
    return reverse ? -c : c;
  });
  if (outFile !== null) {
    const v = ctx.value(outFile);
    if (isUnknown(v)) unconfirmed(ctx, "sortの出力先が確定していません");
    ctx.writeFile(v, sorted.length ? sorted.join("\r\n") + "\r\n" : "");
    note(ctx, "並べ替えた結果をファイルへ書き込みます：" + v);
  } else for (const l of sorted) ctx.output(l);
  ctx.s.cmd.errorlevel = 0;
  note(ctx, "行を並べ替えます" + (reverse ? "（逆順）" : ""));
}

// ---------------------------------------------------------------- timeout
function timeoutCmd(ctx) {
  const toks = tokens(ctx);
  let seconds = null,
    nobreak = false;
  for (let i = 0; i < toks.length; i++) {
    const t = ctx.unquote(toks[i]);
    let m;
    if ((m = t.match(/^\/t(?::)?(.*)$/i))) {
      const v = m[1] || ctx.unquote(toks[++i] ?? "");
      // 同型（B1G-05）: /t の値も形式検証の前に未確定検査を通す。
      const rv = ctx.value(v);
      if (isUnknown(rv)) unconfirmed(ctx, "timeoutの秒数が確定していません");
      if (!/^-?\d+$/.test(String(rv))) syntaxFail(ctx, "timeout /t には秒数（整数）が必要です");
      seconds = Number(rv);
    } else if (/^\/nobreak$/i.test(t)) nobreak = true;
    else if (t.startsWith("/")) {
      if (isUnknown(ctx.value(t)))
        unconfirmed(ctx, "timeoutのオプションが確定していません");
      unsupported(ctx, "timeoutのオプション " + t);
    } else {
      // B1G-05: 裸引数は形式検証の前に未確定検査を通す
      // （プレースホルダを実引数として名指さない）。
      if (isUnknown(ctx.value(t)))
        unconfirmed(ctx, "timeoutの引数が確定していません");
      unsupported(ctx, "timeoutの引数形式 " + t);
    }
  }
  if (seconds === null)
    syntaxFail(ctx, "timeoutには /t 秒数が必要です");
  if (seconds === -1)
    unsupported(ctx, "timeout /t -1（無期限の待機はモデル化していません）");
  if (seconds < 0 || seconds > 99999)
    syntaxFail(ctx, "timeout /t の秒数は 0 から 99999 の範囲です");
  ctx.s.cmd.errorlevel = 0;
  note(
    ctx,
    "timeout：" +
      seconds +
      "秒の待機はモデルでは経過させず、すぐに続行します" +
      (nobreak ? "（/nobreak）" : ""),
  );
}

// ---------------------------------------------------------------- tree
function treeCmd(ctx) {
  const toks = tokens(ctx);
  let showFiles = false;
  const paths = [];
  for (const tok of toks) {
    const t = ctx.unquote(tok);
    if (/^\/f$/i.test(t)) showFiles = true;
    else if (/^\/a$/i.test(t)) {
      // 表示文字種の指定は、モデルの簡略表示では区別しない。
    } else if (t.startsWith("/")) {
      if (isUnknown(ctx.value(t)))
        unconfirmed(ctx, "treeのオプションが確定していません");
      unsupported(ctx, "treeのオプション " + t);
    } else paths.push(tok);
  }
  if (paths.length > 1) syntaxFail(ctx, "treeにはフォルダを1つまで指定できます");
  const baseV = paths.length ? resolved(ctx, paths[0]) : ctx.s.model.cwd;
  if (isUnknown(baseV)) unconfirmed(ctx, "treeの対象が確定していません");
  const base = ctx.windowsPath(baseV, ctx.s.model.cwd, line(ctx));
  const root = ctx.fsEntry(base);
  if (!root || root.type !== "directory")
    execFail(ctx, "モデルにフォルダがありません：" + baseV);
  ctx.output(base);
  const prefix = base.replace(/\\$/, "") + "\\";
  const walk = (dirPath, depth) => {
    const children = ctx.s.model.files.filter((e) => {
      if (e.path.toLowerCase() === dirPath.toLowerCase()) return false;
      const parent = e.path.slice(0, e.path.lastIndexOf("\\"));
      const normParent =
        parent.length === 2 ? parent + "\\" : parent;
      return normParent.toLowerCase() === dirPath.toLowerCase();
    });
    for (const e of children) {
      if (e.type === "file" && !showFiles) continue;
      ctx.output(
        "    ".repeat(depth) + "+---" + e.path.split("\\").at(-1),
      );
      if (e.type === "directory") walk(e.path, depth + 1);
    }
  };
  walk(base, 1);
  ctx.s.cmd.errorlevel = 0;
  note(ctx, "フォルダのツリーを簡略表示します");
}

// ---------------------------------------------------------------- ver / vol
function verCmd(ctx) {
  ctx.output(ctx.freshUnknown("Windowsのバージョン"));
  note(ctx, "Windows のバージョンを表示します（値は実機依存のため未確定値です）");
}
function volCmd(ctx) {
  let a = ctx.arg.trim();
  // B1G-05: 形式検証の前に未確定検査を通す（プレースホルダを
  // 実引数として名指した虚偽の原因で止めない）。
  if (a) {
    const v = ctx.value(a);
    if (isUnknown(v)) unconfirmed(ctx, "volの引数が確定していません");
    a = String(v).trim();
  }
  if (a && !/^[a-z]:$/i.test(a))
    unsupported(ctx, "volの引数 " + a + "（ドライブ名のみ対応）");
  ctx.output(ctx.freshUnknown("ボリュームラベル"));
  ctx.output(ctx.freshUnknown("ボリュームシリアル番号"));
  note(ctx, "ボリュームラベルとシリアル番号を表示します（値はいずれも実行時に決まります）");
}

// ---------------------------------------------------------------- where
function whereCmd(ctx) {
  const toks = tokens(ctx);
  let quiet = false,
    recurseRoot = null;
  const patterns = [];
  for (let i = 0; i < toks.length; i++) {
    const t = ctx.unquote(toks[i]);
    if (/^\/q$/i.test(t)) quiet = true;
    else if (/^\/r$/i.test(t)) {
      recurseRoot = ctx.unquote(toks[++i] ?? "");
      if (!recurseRoot) syntaxFail(ctx, "where /r には検索するフォルダが必要です");
    } else if (t.startsWith("/")) {
      if (isUnknown(ctx.value(t)))
        unconfirmed(ctx, "whereのオプションが確定していません");
      unsupported(ctx, "whereのオプション " + t + "（/t・/f 等の表示形式は未対応）");
    } else patterns.push(toks[i]);
  }
  if (!patterns.length) syntaxFail(ctx, "whereには探すファイルのパターンが必要です");
  const searchDirs = [];
  if (recurseRoot !== null) {
    const rv = ctx.value(recurseRoot);
    if (isUnknown(rv)) unconfirmed(ctx, "where /r のフォルダが確定していません");
    searchDirs.push({ dir: ctx.windowsPath(rv, ctx.s.model.cwd, line(ctx)), recursive: true });
  } else {
    searchDirs.push({ dir: ctx.s.model.cwd, recursive: false });
    const pathVar = ctx.ciGet("PATH");
    if (typeof pathVar === "string")
      for (const d of pathVar.split(";")) {
        if (!d.trim()) continue;
        try {
          searchDirs.push({
            dir: ctx.windowsPath(d.trim(), ctx.s.model.cwd, line(ctx)),
            recursive: false,
          });
        } catch {
          // PATH 内の解決できない要素は where の検索対象から外す。
        }
      }
  }
  const foundPaths = [];
  for (const patTok of patterns) {
    const pat = resolved(ctx, patTok);
    if (isUnknown(pat)) unconfirmed(ctx, "whereのパターンが確定していません");
    if (/[*?]/.test(pat)) {
      for (const sd of searchDirs) {
        const full = sd.dir.replace(/\\$/, "") + "\\" + pat;
        const entries = sd.recursive
          ? recursiveMatches(ctx, full)
          : ctx.listFiles(full);
        for (const e of entries)
          if (e.type === "file" && !foundPaths.includes(e.path))
            foundPaths.push(e.path);
      }
      continue;
    }
    if (pat.includes("\\")) {
      const e = ctx.fsEntry(pat);
      if (e?.type === "file" && !foundPaths.includes(e.path)) foundPaths.push(e.path);
      continue;
    }
    const candidates = [pat];
    if (!pat.includes(".")) {
      const exts =
        typeof ctx.ciGet("PATHEXT") === "string"
          ? ctx.ciGet("PATHEXT").split(";").filter(Boolean)
          : [".COM", ".EXE", ".BAT", ".CMD"];
      for (const ext of exts) candidates.push(pat + ext);
    }
    for (const sd of searchDirs) {
      for (const cand of candidates) {
        const full = sd.dir.replace(/\\$/, "") + "\\" + cand;
        if (sd.recursive) {
          for (const e of recursiveMatches(ctx, full))
            if (e.type === "file" && !foundPaths.includes(e.path))
              foundPaths.push(e.path);
        } else {
          const e = ctx.fsEntry(full);
          if (e?.type === "file" && !foundPaths.includes(e.path))
            foundPaths.push(e.path);
        }
      }
    }
  }
  if (!quiet) {
    if (foundPaths.length) for (const p of foundPaths) ctx.output(p);
    else ctx.output("INFO: Could not find files for the given pattern(s).");
  }
  ctx.s.cmd.errorlevel = foundPaths.length ? 0 : 1;
  note(
    ctx,
    foundPaths.length
      ? "ファイルが見つかりました（ERRORLEVEL=0）"
      : "ファイルが見つかりません（ERRORLEVEL=1）",
  );
}

// ---------------------------------------------------------------- xcopy
function xcopy(ctx) {
  const toks = tokens(ctx);
  const allowed = new Set(["/s", "/e", "/y", "/i", "/q"]);
  const flags = new Set();
  const paths = [];
  for (const tok of toks) {
    const t = ctx.unquote(tok);
    if (t.startsWith("/")) {
      if (isUnknown(ctx.value(t)))
        unconfirmed(ctx, "xcopyのオプションが確定していません");
      const key = t.toLowerCase().split(":")[0];
      if (!allowed.has(key)) unsupported(ctx, "xcopyのオプション " + t);
      flags.add(key);
    } else paths.push(tok);
  }
  if (paths.length !== 2)
    syntaxFail(ctx, "xcopyにはコピー元とコピー先が必要です");
  const srcV = resolved(ctx, paths[0]);
  const dstV = resolved(ctx, paths[1]);
  if (isUnknown(srcV) || isUnknown(dstV))
    unconfirmed(ctx, "xcopyの対象が確定していません");
  const recursive = flags.has("/s") || flags.has("/e");
  let sources = []; // {entry, rel}
  const srcEntry = /[*?]/.test(srcV) ? null : ctx.fsEntry(srcV);
  if (/[*?]/.test(srcV)) {
    const list = ctx.listFiles(srcV).filter((e) => e.type === "file");
    sources = list.map((e) => ({ entry: e, rel: e.path.split("\\").at(-1) }));
  } else if (srcEntry?.type === "file") {
    sources = [{ entry: srcEntry, rel: srcEntry.path.split("\\").at(-1) }];
  } else if (srcEntry?.type === "directory") {
    const srcDir = ctx.windowsPath(srcV, ctx.s.model.cwd, line(ctx));
    const prefix = srcDir.replace(/\\$/, "") + "\\";
    sources = ctx.s.model.files
      .filter((e) => {
        if (e.type !== "file") return false;
        if (!e.path.toLowerCase().startsWith(prefix.toLowerCase())) return false;
        const rel = e.path.slice(prefix.length);
        return recursive || !rel.includes("\\");
      })
      .map((e) => ({ entry: e, rel: e.path.slice(prefix.length) }));
    if (flags.has("/e")) {
      // 空フォルダも含めるため、先にフォルダ構造だけ作る。
      const dstDir0 = ctx.windowsPath(dstV, ctx.s.model.cwd, line(ctx));
      for (const e of ctx.s.model.files) {
        if (e.type !== "directory") continue;
        if (!e.path.toLowerCase().startsWith(prefix.toLowerCase())) continue;
        const rel = e.path.slice(prefix.length);
        if (!rel) continue;
        const target = dstDir0.replace(/\\$/, "") + "\\" + rel;
        if (!ctx.fsEntry(target)) ctx.makeDirectory(target);
      }
    }
  }
  if (!sources.length) {
    // Learn の xcopy 終了コード: 1 = コピーするファイルが見つからない。
    ctx.output("File not found - " + srcV);
    ctx.s.cmd.errorlevel = 1;
    note(ctx, "コピーするファイルがないため終了コード1で終了します");
    return;
  }
  const dstPath = ctx.windowsPath(dstV, ctx.s.model.cwd, line(ctx));
  const dstEntry = ctx.fsEntry(dstPath);
  const destIsDir =
    dstEntry?.type === "directory" ||
    flags.has("/i") ||
    sources.length > 1 ||
    srcEntry?.type === "directory" ||
    /\\$/.test(dstV);
  let copied = 0;
  for (const { entry, rel } of sources) {
    const destPath = destIsDir
      ? dstPath.replace(/\\$/, "") + "\\" + rel
      : dstPath;
    const dest = ctx.fsEntry(destPath);
    if (dest?.type === "directory")
      execFail(ctx, "コピー先がフォルダです：" + destPath);
    if (dest && !flags.has("/y"))
      unconfirmed(
        ctx,
        "既存ファイルへの上書きには /y の明示が必要です：" + destPath,
      );
    if (entry.content === undefined || isUnknown(entry.content))
      unconfirmed(ctx, "xcopyの元ファイル内容がモデルにありません");
    const parent = destPath.slice(0, destPath.lastIndexOf("\\"));
    if (!ctx.fsEntry(parent)) ctx.makeDirectory(parent);
    ctx.writeFile(destPath, entry.content);
    const written = ctx.fsEntry(destPath);
    if (written && Array.isArray(entry.attributes))
      written.attributes = [...entry.attributes];
    if (!flags.has("/q")) ctx.output(destPath);
    copied++;
  }
  ctx.output(copied + " File(s) copied");
  ctx.s.cmd.errorlevel = 0;
  note(ctx, "xcopy で " + copied + " 件をコピーします");
}

// ---------------------------------------------------------------- handlers / stops
export const advancedCommandHandlers = {
  attrib,
  break: breakCmd,
  choice,
  cmd: cmdCmd,
  color,
  comp,
  date: dateCmd,
  doskey,
  fc,
  findstr,
  help: helpCmd,
  more,
  path: pathCmd,
  popd,
  prompt: promptCmd,
  pushd,
  replace: replaceCmd,
  robocopy,
  shift: shiftCmd,
  sort: sortCmd,
  time: timeCmd,
  timeout: timeoutCmd,
  title: titleCmd,
  tree: treeCmd,
  ver: verCmd,
  verify: verifyCmd,
  vol: volCmd,
  where: whereCmd,
  xcopy,
};

// 別名5件は基礎エンジンが実行するが、名前解決（scan）のために公開する。
export const advancedAliasNames = ["chdir", "erase", "mkdir", "rename", "rmdir"];

// 未対応コマンドの名指し停止一覧。棚卸し324件から、基礎層21件と
// 本ファイルで実装する34件（別名5件を含む）を除いた269件。
// 照合は engine.js 側で長い名前（複合名）優先で行う。
export const advancedStops = [
  { name: "active", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "add", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "add alias", status: "unsupported", reason: "DiskShadow／VSSの内部コマンドで、実OSのシャドウコピーを操作するため、このモデルでは扱いません" },
  { name: "add volume", status: "unsupported", reason: "DiskShadow／VSSの内部コマンドで、実OSのシャドウコピーを操作するため、このモデルでは扱いません" },
  { name: "adprep", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "append", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "arp", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "assign", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "assoc", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "at", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "atmadm", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "attach-vdisk", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "attributes", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "auditpol", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "autochk", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "autoconv", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "autofmt", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "automount", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "bcdboot", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "bcdedit", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "bdehdcfg", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "begin backup", status: "unsupported", reason: "DiskShadow／VSSの内部コマンドで、実OSのシャドウコピーを操作するため、このモデルでは扱いません" },
  { name: "begin restore", status: "unsupported", reason: "DiskShadow／VSSの内部コマンドで、実OSのシャドウコピーを操作するため、このモデルでは扱いません" },
  { name: "bitsadmin", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "bootcfg", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "cacls", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "certreq", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "certutil", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "change", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "chcp", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "chglogon", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "chgport", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "chgusr", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "chkdsk", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "chkntfs", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "cipher", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "clean", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "cleanmgr", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "clip", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "cmdkey", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "cmstp", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "compact", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "convert", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "create", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "cscript", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "dcdiag", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "dcgpofix", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "dcpromo", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "defrag", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "delete", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "detach vdisk", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "detail", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "dfsdiag", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "dfsrmig", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "diantz", status: "unsupported", reason: "キャビネット書庫の形式をモデル化していないため、このモデルでは扱いません" },
  { name: "diskcomp", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "diskcopy", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "diskpart", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "diskperf", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "diskraid", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "diskshadow", status: "unsupported", reason: "実システムのバックアップ／復元やシャドウコピーの実状態をモデル化していないため、このモデルでは扱いません" },
  { name: "dispdiag", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "dnscmd", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "driverquery", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "dtrace", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "edit", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "end restore", status: "unsupported", reason: "DiskShadow／VSSの内部コマンドで、実OSのシャドウコピーを操作するため、このモデルでは扱いません" },
  { name: "eventcreate", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "evntcmd", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "exec", status: "unsupported", reason: "DiskShadow／VSSの内部コマンドで、実OSのシャドウコピーを操作するため、このモデルでは扱いません" },
  { name: "expand", status: "unsupported", reason: "キャビネット書庫の形式をモデル化していないため、このモデルでは扱いません" },
  { name: "expand vdisk", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "expose", status: "unsupported", reason: "DiskShadow／VSSの内部コマンドで、実OSのシャドウコピーを操作するため、このモデルでは扱いません" },
  { name: "extend", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "extract", status: "unsupported", reason: "キャビネット書庫の形式をモデル化していないため、このモデルでは扱いません" },
  { name: "filesystems", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "finger", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "flattemp", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "fondue", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "forfiles", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "format", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "freedisk", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "fsutil", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "ftp", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "ftype", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "fveupdate", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "getmac", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "gettype", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "gpfixup", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "gpresult", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "gpt", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "gpupdate", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "graftabl", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "helpctr", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "hostname", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "icacls", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "import (shadowdisk)", status: "unsupported", reason: "DiskShadow／VSSの内部コマンドで、実OSのシャドウコピーを操作するため、このモデルでは扱いません" },
  { name: "import (diskpart)", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "inactive", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "ipconfig", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "ipxroute", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "irftp", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "jetpack", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "klist", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "ksetup", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "ktmutil", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "ktpass", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "label", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "list", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "load metadata", status: "unsupported", reason: "DiskShadow／VSSの内部コマンドで、実OSのシャドウコピーを操作するため、このモデルでは扱いません" },
  { name: "lodctr", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "logman", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "logoff", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "lpq", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "lpr", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "macfile", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "makecab", status: "unsupported", reason: "キャビネット書庫の形式をモデル化していないため、このモデルでは扱いません" },
  { name: "manage bde", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "mapadmin", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "merge vdisk", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "mklink", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "mmc", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "mode", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "mount", status: "unsupported", reason: "DiskShadow／VSSの内部コマンドで、実OSのシャドウコピーを操作するため、このモデルでは扱いません" },
  { name: "mountvol", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "mqbkup", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "mqsvc", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "mqtgsvc", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "msdt", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "msg", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "msiexec", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "msinfo32", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "mstsc", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "nbtstat", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "netcfg", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "netdom", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "net print", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "net user", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "netsh", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "netstat", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "nfsadmin", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "nfsshare", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "nfsstat", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "nlbmgr", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "nltest", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "nslookup", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "ntbackup", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "ntcmdprompt", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "ntfrsutl", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "offline", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "online", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "openfiles", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "pagefileconfig", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "pathping", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "pbadmin", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "pentnt", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "perfmon", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "ping", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "pktmon", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "pnpunattend", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "pnputil", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "powershell", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "powershell ise", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "print", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "prncnfg", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "prndrvr", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "prnjobs", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "prnmngr", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "prnport", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "prnqctl", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "pubprn", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "pushprinterconnections", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "pwlauncher", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "pwsh", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "qappsrv", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "qprocess", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "query", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "quser", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "qwinsta", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "rdpsign", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "recover", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "recover disk group", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "refsutil", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "reg", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "regini", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "regsvr32", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "relog", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "remove", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "repadmin", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "repair", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "rescan", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "reset", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "retain", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "revert", status: "unsupported", reason: "DiskShadow／VSSの内部コマンドで、実OSのシャドウコピーを操作するため、このモデルでは扱いません" },
  { name: "rexec", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "risetup", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "route ws2008", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "rpcinfo", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "rpcping", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "rsh", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "rundll32", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "rundll32 printui", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "rwinsta", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "san", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "sc config", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "sc create", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "sc delete", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "sc query", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "schtasks", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "scwcmd", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "secedit", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "select", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "serverceipoptin", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "servermanagercmd", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "serverweroptin", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "set environmental variables", status: "unsupported", reason: "setコマンドへの索引見出しで、独立したコマンドではないため、このモデルでは扱いません" },
  { name: "set shadow copy", status: "unsupported", reason: "DiskShadow／VSSの内部コマンドで、実OSのシャドウコピーを操作するため、このモデルでは扱いません" },
  { name: "setspn", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "setx", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "sfc", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "shadow", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "showmount", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "shrink", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "shutdown", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "simulate restore", status: "unsupported", reason: "DiskShadow／VSSの内部コマンドで、実OSのシャドウコピーを操作するため、このモデルでは扱いません" },
  { name: "start", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "subst", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "sxstrace", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "sysmon", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "sysocmgr", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "systeminfo", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "takeown", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "tapicfg", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "taskkill", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "tasklist", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "tcmsetup", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "telnet", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "tftp", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "tlntadmn", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "tpmtool", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "tpmvscmgr", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "tracerpt", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "tracert", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "tscon", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "tsdiscon", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "tsecimp", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "tskill", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "tsprof", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "typeperf", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "tzutil", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "unexpose", status: "unsupported", reason: "DiskShadow／VSSの内部コマンドで、実OSのシャドウコピーを操作するため、このモデルでは扱いません" },
  { name: "uniqueid", status: "unsupported", reason: "DiskPartの内部コマンドで、実ディスクを操作するため、このモデルでは扱いません" },
  { name: "unlodctr", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "verifier", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "vssadmin", status: "unsupported", reason: "実システムのバックアップ／復元やシャドウコピーの実状態をモデル化していないため、このモデルでは扱いません" },
  { name: "waitfor", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "wbadmin", status: "unsupported", reason: "実システムのバックアップ／復元やシャドウコピーの実状態をモデル化していないため、このモデルでは扱いません" },
  { name: "wdsutil", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "wecutil", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "wevtutil", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "whoami", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "winnt", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "winnt32", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "winrs", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "winsat mem", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "winsat mfmedia", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "wmic", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
  { name: "writer", status: "unsupported", reason: "DiskShadow／VSSの内部コマンドで、実OSのシャドウコピーを操作するため、このモデルでは扱いません" },
  { name: "wscript", status: "unsupported", reason: "実OS・ネットワーク・サーバー役割・実プロセス等を操作するため、このモデルでは扱いません" },
];

// 別名停止（B1A-19）: リファレンス項目名（"import (diskpart)" 等）と
// 実行時のコマンド名がずれる項目のための単独名の停止。停止一覧本体
// （advancedStops, 269件）には含めない。整合性テストの「停止名集合＝
// 未対応項目名集合」の前提とは別枠であり、コーディネーター側で
// 整合性テストを更新する際にこの一覧を加えること。
export const advancedAliasStops = [
  { name: "import", status: "unsupported", reason: "DiskPart／DiskShadow の内部コマンドで、専用セッションの外では使えません" },
  { name: "route", status: "unsupported", reason: "ネットワーク経路の操作はモデル化していません" },
];

// scan 用の名前集合（handlers＋別名＋停止名＋別名停止名）。
// reference-advanced.js は遅延ロード対象のため import せず、
// このテーブルのみから導出する。
export const advancedCommandNames = [
  ...Object.keys(advancedCommandHandlers),
  ...advancedAliasNames,
  ...advancedStops.map((st) => st.name),
  ...advancedAliasStops.map((st) => st.name),
];

// 機構契約（advanced-interface.md 第5章(e)）のエンジン拡張フック。
// B1 の初例としての落とし込み（契約の未決・留保 R-3 への提案）：
// 合成済みカタログを受け取り、この種類の高度エンジンテーブルを
// definition.advancedEngine へ登録して返す。エンジン本体の dispatch は
// 単一エンジンの原則（契約 第1章）どおり同じテーブルを静的に参照して
// おり、モードによる条件分岐は存在しない。
export function applyAdvancedEngine(definition, merged) {
  definition.advancedEngine = {
    commandHandlers: advancedCommandHandlers,
    aliasNames: advancedAliasNames,
    stops: advancedStops,
    aliasStops: advancedAliasStops,
    commandNames: advancedCommandNames,
  };
  return definition;
}
