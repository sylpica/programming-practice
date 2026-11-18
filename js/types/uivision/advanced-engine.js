// 高度モード ブロックB1（UV-ENG班）: UI.Vision RPA 高度コマンドの
// エンジン実装。index.js の action() から ctx を受け取って実行する。
// 意味論の出典は work/adv-b1-notes-uveng.md に記録する。
// - assert 系は不一致で api.fail（マクロ停止）
// - verify 系は不一致で markSoftFail()＋エラー水準 note で継続
// - パターン照合は基礎層 assertText と同じ規則（glob／exact:／regexp:／
//   regexpi:）を再現する（uiTextMatches は index.js の非公開関数のため
//   ここに同規則の実装を持つ）
import {
  isUnknown,
  unknown,
  formatModelValue as formatValue,
} from "../../core/contract.js";
import { uiCondition } from "../../core/actions.js";

function textMatches(actual, pattern, ctx) {
  const { api, n } = ctx;
  if (pattern.startsWith("exact:")) return actual === pattern.slice(6);
  if (pattern.startsWith("regexp:") || pattern.startsWith("regexpi:")) {
    const insensitive = pattern.startsWith("regexpi:");
    try {
      return new RegExp(
        pattern.slice(insensitive ? 8 : 7),
        insensitive ? "i" : "",
      ).test(actual);
    } catch {
      api.fail("パターンの正規表現が不正です", n);
    }
  }
  let source = "^";
  for (const ch of pattern) {
    if (ch === "*") source += "[\\s\\S]*";
    else if (ch === "?") source += "[\\s\\S]";
    else source += ch.replace(/[.*+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(source + "$").test(actual);
}

const soft = (ctx, message) => {
  ctx.markSoftFail();
  ctx.api.note(ctx.s, ctx.n, message, "error");
};
// B1G-06〜08／観察事項3: 意味値として使う文字列（書き込む値・ファイル名・
// ロケーター・保存先変数名・選択肢・座標・メッセージ）は、使う前に
// isUnknown 検査を通す。未確定なら "[object Object]" を確定させず、
// 未確認として正直に止める。
const failUnknown = (ctx, name, what) =>
  ctx.api.fail(`未確認：${name}の${what}が確定していません`, ctx.n);
const requireKnown = (ctx, name, what, v) => {
  if (isUnknown(v)) failUnknown(ctx, name, what);
};
const unconfirmedAssert = (ctx, name) =>
  ctx.api.fail(`${name}の結果は実行時に決まるため未確認です`, ctx.n);
const unconfirmedVerify = (ctx, name) =>
  soft(ctx, `${name}の結果は実行時に決まるため未確認です`);

function elementByLocator(ctx, locator) {
  return ctx.s.model.pages?.[ctx.s.model.url]?.elements?.[locator];
}
function pageTitle(ctx) {
  const page = ctx.s.model.pages?.[ctx.s.model.url];
  return page?.title ?? "";
}
function isEditable(e) {
  if (!e) return false;
  if (e.disabled === true || e.readonly === true) return false;
  const tag = String(e.tag ?? "").toLowerCase();
  return ["input", "textarea", "select"].includes(tag) || e.contentEditable === true;
}
function recordDialog(ctx, e) {
  const oc = e?.onClick;
  if (!oc) return null;
  if (oc.alert !== undefined)
    return { type: "alert", text: String(oc.alert) };
  if (oc.confirm !== undefined)
    return { type: "confirm", text: String(oc.confirm), answer: true };
  if (oc.prompt !== undefined) {
    const answer = ctx.s.model.promptAnswer ?? unknown("プロンプトへの入力", "prompt");
    delete ctx.s.model.promptAnswer;
    return { type: "prompt", text: String(oc.prompt), answer };
  }
  return null;
}
function doClick(ctx, extraNote = "") {
  const { s, api, n, target } = ctx;
  const e = ctx.element();
  s.model.clicks ??= [];
  s.model.clicks.push(target);
  const effects = [];
  if (e.onClick?.setText) {
    for (const [k, v] of Object.entries(e.onClick.setText)) {
      const destination = s.model.pages[s.model.url].elements[k];
      if (!destination)
        api.fail("クリック効果の対象がモデルにありません：" + k, n);
      destination.text = v;
    }
    effects.push("モデルに定義された効果を反映します");
  }
  const dialog = recordDialog(ctx, e);
  if (dialog) {
    s.model.dialog = dialog;
    effects.push(
      dialog.type === "alert"
        ? "アラートを表示します"
        : dialog.type === "confirm"
          ? "確認ダイアログを表示します（確認結果は受理＝true）"
          : "入力ダイアログを表示します",
    );
  }
  if (e.href) {
    if (!s.model.pages[e.href]) api.fail("リンク先がモデルにありません", n);
    s.model.url = e.href;
    effects.push(`リンク先 ${e.href} へ遷移します`);
  }
  api.note(
    s,
    n,
    effects.length
      ? `${target} をクリックし、${effects.join("、")}${extraNote}`
      : `${target} をクリックします（モデルに効果は定義されていません）${extraNote}`,
  );
}

// ---- assert / verify 共通部品 ----
function checkPattern(ctx, name, actual, pattern, isVerify) {
  if (isUnknown(actual) || isUnknown(pattern)) {
    if (isVerify) return unconfirmedVerify(ctx, name);
    return unconfirmedAssert(ctx, name);
  }
  const ok = textMatches(String(actual), String(pattern), ctx);
  if (ok) {
    ctx.api.note(ctx.s, ctx.n, `${name}：値がパターンと一致します`);
  } else if (isVerify) {
    soft(
      ctx,
      `${name}：値が一致しません（実際：${formatValue(actual)}、期待パターン：${formatValue(pattern)}）`,
    );
  } else {
    ctx.api.fail(
      `${name}：値が一致しません（実際：${formatValue(actual)}、期待パターン：${formatValue(pattern)}）`,
      ctx.n,
    );
  }
}
function checkBool(ctx, name, actual, expected, isVerify) {
  if (actual === expected) {
    ctx.api.note(ctx.s, ctx.n, `${name}：条件が成立します`);
  } else if (isVerify) {
    soft(ctx, `${name}：条件が成立しません`);
  } else {
    ctx.api.fail(`${name}：条件が成立しません`, ctx.n);
  }
}
function dialogCheck(ctx, name, type, isVerify) {
  const expected =
    ctx.value !== "" && ctx.value !== undefined ? ctx.value : ctx.target;
  const dialog = ctx.s.model.dialog;
  if (!dialog) {
    if (isVerify) return soft(ctx, `${name}：ダイアログが表示されていません`);
    return ctx.api.fail(`${name}：ダイアログが表示されていません`, ctx.n);
  }
  if (dialog.type !== type) {
    if (isVerify)
      return soft(ctx, `${name}：表示中のダイアログは ${dialog.type} です`);
    return ctx.api.fail(
      `${name}：表示中のダイアログは ${dialog.type} です`,
      ctx.n,
    );
  }
  if (isUnknown(dialog.text) || isUnknown(expected)) {
    if (isVerify) return unconfirmedVerify(ctx, name);
    return unconfirmedAssert(ctx, name);
  }
  const ok = textMatches(String(dialog.text), String(expected), ctx);
  if (ok) {
    delete ctx.s.model.dialog;
    ctx.api.note(ctx.s, ctx.n, `${name}：ダイアログの文言が一致します`);
  } else if (isVerify) {
    soft(ctx, `${name}：ダイアログの文言が一致しません（実際：${formatValue(dialog.text)}）`);
  } else {
    ctx.api.fail(
      `${name}：ダイアログの文言が一致しません（実際：${formatValue(dialog.text)}）`,
      ctx.n,
    );
  }
}
function varCheck(ctx, name, isVerify) {
  const raw = String(ctx.n.item.Target ?? "").trim();
  const varName = raw.replace(/^\$\{/, "").replace(/\}$/, "").trim();
  const actual = ctx.getVar(varName);
  if (actual === undefined) {
    if (isVerify) return soft(ctx, `${name}：変数がありません：${varName}`);
    return ctx.api.fail(`${name}：変数がありません：${varName}`, ctx.n);
  }
  checkPattern(ctx, name, actual, ctx.value, isVerify);
}
function checkedCheck(ctx, name, expected, isVerify) {
  const e = ctx.element();
  checkBool(ctx, name, e.checked ?? false, expected, isVerify);
}
function editableCheck(ctx, name, expected, isVerify) {
  const e = ctx.element();
  checkBool(ctx, name, isEditable(e), expected, isVerify);
}
function presentCheck(ctx, name, expected, isVerify) {
  if (isUnknown(ctx.target)) {
    if (isVerify) return unconfirmedVerify(ctx, name);
    return unconfirmedAssert(ctx, name);
  }
  const e = ctx.element(true);
  checkBool(ctx, name, Boolean(e), expected, isVerify);
}
function valueOfElement(e) {
  if (e.value !== undefined) return e.value;
  if (e.checked !== undefined) return e.checked ? "on" : "off";
  if (Array.isArray(e.options)) {
    const sel = e.options.find((o) => o.selected);
    if (sel) return sel.value ?? sel.label ?? "";
  }
  return "";
}

// ---- select 系 ----
function findOption(ctx, name, e, spec) {
  // 観察事項3: 選択肢の照合対象が未確定なら、"[object Object]" を
  // 名指して照合失敗にせず、未確認で止める（select 系全般）。
  requireKnown(ctx, name, "選択肢", spec);
  const options = e.options;
  if (!Array.isArray(options) || !options.length)
    ctx.api.fail(`${name}：モデルに選択肢（options）がありません`, ctx.n);
  let kind = "label";
  let arg = String(spec);
  const m = /^(label|value|index|id)=(.*)$/s.exec(arg);
  if (m) {
    kind = m[1];
    arg = m[2];
  }
  let found;
  if (kind === "index") {
    const idx = Number(arg);
    if (!Number.isInteger(idx) || idx < 0 || idx >= options.length)
      ctx.api.fail(`${name}：選択肢の番号が範囲外です：${arg}`, ctx.n);
    found = options[idx];
  } else if (kind === "value") {
    found = options.find((o) => String(o.value ?? o.label ?? "") === arg);
  } else if (kind === "id") {
    found = options.find((o) => o.id !== undefined && String(o.id) === arg);
  } else {
    found = options.find((o) => textMatches(String(o.label ?? ""), arg, ctx));
  }
  if (!found)
    ctx.api.fail(`${name}：選択肢が見つかりません：${String(spec)}`, ctx.n);
  return found;
}
function doSelect(ctx, name, additive) {
  const e = ctx.element();
  const found = findOption(ctx, name, e, ctx.value);
  if (!additive) for (const o of e.options) o.selected = false;
  found.selected = true;
  if (!additive) e.value = found.value ?? found.label ?? "";
  ctx.api.note(
    ctx.s,
    ctx.n,
    `${ctx.target} で「${formatValue(found.label ?? found.value ?? "")}」を選択します`,
  );
}

// ---- CSV 系 ----
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const src = String(text);
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  while (i < src.length) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      pushField();
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field !== "" || row.length) pushRow();
  return rows;
}
function csvEscape(v) {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
}
function csvsOf(ctx) {
  ctx.s.model.csvs ??= {};
  return ctx.s.model.csvs;
}
// B1A-16: 文字列リテラル（単一／二重引用符、バックスラッシュエスケープ
// を含む）の内側にある ";" は文の区切りではない。引用符を意識して走査し、
// リテラルの外側にある ";" だけを複文の区切りとして検出する。
function hasStatementSemicolon(expr) {
  let quote = null;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === ";") return true;
  }
  return false;
}
// LANE-A1: storedVars は式の語彙として提供していない（項目の caution が
// 「未対応として停止」と予告する）。式評価器の「未定義の名前」という
// 誤った特徴づけに落とさず、予告どおりの文面で止めるための検査。
// 文字列リテラルの内側は対象にしない。同名の検査が基礎側
// （index.js の条件評価・executeScript_Sandbox）にもある。
function storedVarsRefError(expr) {
  let quote = null;
  let cleaned = "";
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      cleaned += " ";
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      cleaned += " ";
      continue;
    }
    cleaned += c;
  }
  return /(?<![\w$.])storedVars(?![\w$])/i.test(cleaned);
}
function evalReturnExpr(ctx, name) {
  const raw = String(ctx.n.item.Target ?? "").trim();
  let expr = raw.replace(/;\s*$/, "");
  if (/^return\b/.test(expr)) expr = expr.replace(/^return\s+/, "");
  else if (hasStatementSemicolon(expr))
    ctx.api.fail(`${name}：return 式の部分集合のみ対応しています`, ctx.n);
  if (!expr) ctx.api.fail(`${name}：式が空です`, ctx.n);
  // LANE-A1: セミコロンなしの文（throw 1 等）が式評価へ流れ込み、文では
  // なく被演算子を原因として名指す虚偽帰属になっていた。文キーワードで
  // 始まる入力は、セミコロン形と同じ「部分集合のみ対応」の文面で止める。
  // function は関数式として式評価器が正しく名指すため対象にしない。
  if (
    /^(throw|var|let|const|if|else|for|while|do|switch|try|catch|finally|break|continue|debugger|with|class|export|import)\b/.test(
      expr,
    )
  )
    ctx.api.fail(`${name}：return 式の部分集合のみ対応しています`, ctx.n);
  if (storedVarsRefError(expr))
    ctx.api.fail(`未対応：storedVars（式の語彙として提供していません）`, ctx.n);
  return uiCondition(expr, ctx.s, ctx.api, { caseInsensitive: true });
}
function storeScriptResult(ctx, name) {
  // B1G-08: 保存先変数名（Value の解決値）が未確定なら未確認で止める
  // （storeEval／executeScript 共通）。
  requireKnown(ctx, name, "保存先", ctx.value);
  const result = evalReturnExpr(ctx, name);
  const varName = String(ctx.n.item.Value ?? "").trim();
  if (varName) {
    ctx.assertWritableVar(varName);
    ctx.setVar(varName, result);
    ctx.api.note(
      ctx.s,
      ctx.n,
      `${varName} に式の結果 ${formatValue(result)} を保存します（${name}は executeScript_Sandbox と同じ return 式の部分集合で、ページのDOMやwindowにはアクセスできません）`,
    );
  } else {
    ctx.api.note(
      ctx.s,
      ctx.n,
      `式を評価します：${formatValue(result)}（保存先が無いため結果は破棄されます）`,
    );
  }
}
// B1A-01: サイズ解析はコマンドごとに分ける。setWindowSize は公式形式
// 「幅x高さ」、resize は公式形式「幅@高さ」（ドキュメント上の @@ は @ の
// エスケープ表記なので連続した @ も1つの区切りとして受理する）。
function setWindowSizeImpl(ctx, name) {
  const m = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(String(ctx.target).trim());
  if (!m)
    ctx.api.fail(`${name}：サイズは「幅x高さ」（例：1366x768）で指定してください`, ctx.n);
  const width = Number(m[1]);
  const height = Number(m[2]);
  ctx.s.model.viewport = { width, height };
  ctx.api.note(ctx.s, ctx.n, `ウィンドウサイズを ${width}x${height} に変更します`);
}
function resizeImpl(ctx, name) {
  const m = /^(\d+)\s*@+\s*(\d+)$/.exec(String(ctx.target).trim());
  if (!m)
    ctx.api.fail(`${name}：サイズは「幅@高さ」（例：1366@768）で指定してください`, ctx.n);
  const width = Number(m[1]);
  const height = Number(m[2]);
  ctx.s.model.viewport = { width, height };
  ctx.api.note(ctx.s, ctx.n, `ウィンドウサイズを ${width}x${height} に変更します`);
}
function waitPresentImpl(ctx, name, needVisible) {
  if (isUnknown(ctx.target))
    ctx.api.fail(`${name}：ロケーターが未確定です`, ctx.n);
  const e = ctx.element(true);
  if (!e)
    ctx.api.fail(
      `${name}：要素が見つかりません（モデルは変化しないため、待機しても現れません）：${ctx.target}`,
      ctx.n,
    );
  if (needVisible && e.visible === false)
    ctx.api.fail(`${name}：要素は表示されていません：${ctx.target}`, ctx.n);
  ctx.api.note(
    ctx.s,
    ctx.n,
    needVisible
      ? `${ctx.target} が表示されています`
      : `${ctx.target} が存在します（暗黙の待機で確認）`,
  );
}

export const advancedActionHandlers = {
  addSelection: (ctx) => doSelect(ctx, "addSelection", true),
  removeSelection: (ctx) => {
    const e = ctx.element();
    const found = findOption(ctx, "removeSelection", e, ctx.value);
    found.selected = false;
    ctx.api.note(ctx.s, ctx.n, `${ctx.target} で「${formatValue(found.label ?? found.value ?? "")}」の選択を解除します`);
  },
  answerOnNextPrompt: (ctx) => {
    ctx.s.model.promptAnswer = ctx.target;
    ctx.api.note(ctx.s, ctx.n, `次の入力ダイアログへの回答を ${formatValue(ctx.target)} に予約します`);
  },
  assert: (ctx) => varCheck(ctx, "assert", false),
  verify: (ctx) => varCheck(ctx, "verify", true),
  assertAlert: (ctx) => dialogCheck(ctx, "assertAlert", "alert", false),
  assertConfirmation: (ctx) => dialogCheck(ctx, "assertConfirmation", "confirm", false),
  assertPrompt: (ctx) => dialogCheck(ctx, "assertPrompt", "prompt", false),
  verifyAlert: (ctx) => dialogCheck(ctx, "verifyAlert", "alert", true),
  verifyConfirmation: (ctx) => dialogCheck(ctx, "verifyConfirmation", "confirm", true),
  verifyPrompt: (ctx) => dialogCheck(ctx, "verifyPrompt", "prompt", true),
  assertChecked: (ctx) => checkedCheck(ctx, "assertChecked", true, false),
  assertNOTChecked: (ctx) => checkedCheck(ctx, "assertNOTChecked", false, false),
  verifyChecked: (ctx) => checkedCheck(ctx, "verifyChecked", true, true),
  verifyNOTChecked: (ctx) => checkedCheck(ctx, "verifyNOTChecked", false, true),
  assertEditable: (ctx) => editableCheck(ctx, "assertEditable", true, false),
  assertNOTEditable: (ctx) => editableCheck(ctx, "assertNOTEditable", false, false),
  verifyEditable: (ctx) => editableCheck(ctx, "verifyEditable", true, true),
  verifyNOTEditable: (ctx) => editableCheck(ctx, "verifyNOTEditable", false, true),
  assertElementPresent: (ctx) => presentCheck(ctx, "assertElementPresent", true, false),
  assertElementNOTPresent: (ctx) => presentCheck(ctx, "assertElementNOTPresent", false, false),
  verifyElementPresent: (ctx) => presentCheck(ctx, "verifyElementPresent", true, true),
  verifyElementNOTPresent: (ctx) => presentCheck(ctx, "verifyElementNOTPresent", false, true),
  verifyText: (ctx) => {
    const e = ctx.element();
    checkPattern(ctx, "verifyText", e.text, ctx.value, true);
  },
  assertTitle: (ctx) =>
    checkPattern(ctx, "assertTitle", pageTitle(ctx), ctx.target, false),
  verifyTitle: (ctx) =>
    checkPattern(ctx, "verifyTitle", pageTitle(ctx), ctx.target, true),
  assertValue: (ctx) => {
    const e = ctx.element();
    checkPattern(ctx, "assertValue", valueOfElement(e), ctx.value, false);
  },
  verifyValue: (ctx) => {
    const e = ctx.element();
    checkPattern(ctx, "verifyValue", valueOfElement(e), ctx.value, true);
  },
  check: (ctx) => {
    const e = ctx.element();
    e.checked = true;
    ctx.api.note(ctx.s, ctx.n, `${ctx.target} をチェックします`);
  },
  uncheck: (ctx) => {
    const e = ctx.element();
    e.checked = false;
    ctx.api.note(ctx.s, ctx.n, `${ctx.target} のチェックを外します`);
  },
  clickAndWait: (ctx) => doClick(ctx, "（ページの読み込み完了を待ちます）"),
  clickAt: (ctx) => {
    requireKnown(ctx, "clickAt", "座標", ctx.value);
    const coord = String(ctx.value ?? "").trim();
    doClick(ctx, coord ? `（要素内の位置 ${coord} をクリック）` : "");
  },
  comment: (ctx) => {
    // 表示専用経路: 未確定値は formatValue の未確定表記で正直に示す
    // （"[object Object]" と表示しない。コメント自体は意味値ではないため停止はしない）。
    ctx.api.note(ctx.s, ctx.n, ctx.target ? `コメント：${formatValue(ctx.target)}` : "コメント");
  },
  csvRead: (ctx) => {
    const name = "csvRead";
    // 観察事項3: ファイル名が未確定なら "[object Object]" を名指さない。
    requireKnown(ctx, name, "ファイル名", ctx.target);
    const file = String(ctx.target);
    const text = csvsOf(ctx)[file];
    if (text === undefined) {
      ctx.setVar("!csvReadStatus", "Error");
      ctx.api.fail(`${name}：モデルにCSVがありません：${file}`, ctx.n);
    }
    const rows = parseCsv(text);
    ctx.setVar("!csvReadMaxRow", rows.length);
    const explicit = ctx.getVar("!csvReadLineNumber");
    const loopVar = ctx.getVar("!LOOP");
    const rawLine = explicit ?? loopVar ?? 1;
    const lineNo = Number(rawLine);
    if (!Number.isInteger(lineNo) || lineNo < 1)
      ctx.api.fail(`${name}：読み取る行番号（!csvReadLineNumber）が不正です：${formatValue(rawLine)}`, ctx.n);
    if (lineNo > rows.length) {
      ctx.setVar("!csvReadStatus", "Error");
      ctx.markSoftFail();
      ctx.api.note(ctx.s, ctx.n, `${name}：CSVの末尾に達しました（${file} は ${rows.length} 行です）`, "error");
      return;
    }
    const row = rows[lineNo - 1];
    row.forEach((cell, i) => ctx.setVar(`!COL${i + 1}`, cell));
    ctx.setVar("!csvReadStatus", "OK");
    ctx.api.note(ctx.s, ctx.n, `${name}：${file} の ${lineNo} 行目を !COL1〜!COL${row.length} に読み込みます`);
  },
  csvReadArray: (ctx) => {
    const name = "csvReadArray";
    // 観察事項3＋B1G-08: ファイル名・保存先変数名が未確定なら未確認で止める。
    requireKnown(ctx, name, "ファイル名", ctx.target);
    requireKnown(ctx, name, "保存先", ctx.value);
    const file = String(ctx.target);
    const varName = String(ctx.value ?? "").trim();
    if (!varName) ctx.api.fail(`${name}：保存先の変数名が空です`, ctx.n);
    ctx.assertWritableVar(varName);
    const text = csvsOf(ctx)[file];
    if (text === undefined)
      ctx.api.fail(`${name}：モデルにCSVがありません：${file}`, ctx.n);
    const rows = parseCsv(text);
    ctx.setVar(varName, rows);
    ctx.setVar("!csvReadMaxRow", rows.length);
    ctx.api.note(ctx.s, ctx.n, `${name}：${file} の全 ${rows.length} 行を配列変数 ${varName} に読み込みます`);
  },
  csvsave: (ctx) => {
    const name = "csvsave";
    // B1G-07: ファイル名が未確定なら "[object Object]" という名前の
    // CSV を作らず、未確認で止める。書き込む値の未確定セルも同様。
    requireKnown(ctx, name, "ファイル名", ctx.target);
    const file = String(ctx.target);
    // LANE-A1: 空のファイル名は csvsaveArray と同じく名指しで止める
    // （従来は "" という名前の CSV が黙って作られていた）。
    if (!file) ctx.api.fail(`${name}：保存先のCSVファイル名が空です`, ctx.n);
    const line = ctx.getVar("!csvLine");
    const row = Array.isArray(line) ? line : line === undefined ? [] : [line];
    if (row.some((cell) => isUnknown(cell)))
      failUnknown(ctx, name, "書き込む値");
    const csvs = csvsOf(ctx);
    const existing = csvs[file] ?? "";
    csvs[file] =
      (existing && !existing.endsWith("\n") ? existing + "\n" : existing) +
      row.map(csvEscape).join(",") +
      "\n";
    ctx.setVar("!csvLine", []);
    ctx.api.note(ctx.s, ctx.n, `${name}：!csvLine の ${row.length} 列を ${file} へ追記します`);
  },
  csvsaveArray: (ctx) => {
    const name = "csvsaveArray";
    // B1G-07: ファイル名（Value）が未確定なら未確認で止める。
    requireKnown(ctx, name, "ファイル名", ctx.value);
    const varName = String(ctx.n.item.Target ?? "").trim().replace(/^\$\{/, "").replace(/\}$/, "");
    const file = String(ctx.value ?? "").trim();
    if (!file) ctx.api.fail(`${name}：保存先のCSVファイル名が空です`, ctx.n);
    const arr = ctx.getVar(varName);
    if (arr === undefined)
      ctx.api.fail(`${name}：変数がありません：${varName}`, ctx.n);
    if (!Array.isArray(arr))
      ctx.api.fail(`${name}：対象は配列ではありません：${varName}`, ctx.n);
    if (arr.some((r) => (Array.isArray(r) ? r : [r]).some((cell) => isUnknown(cell))))
      failUnknown(ctx, name, "書き込む値");
    const rows = arr.map((r) => (Array.isArray(r) ? r : [r]));
    csvsOf(ctx)[file] = rows.map((r) => r.map(csvEscape).join(",")).join("\n") + (rows.length ? "\n" : "");
    ctx.api.note(ctx.s, ctx.n, `${name}：配列変数 ${varName} の ${rows.length} 行を ${file} へ保存します`);
  },
  dragAndDropToObject: (ctx) => {
    // 観察事項3: 移動先ロケーターが未確定なら "[object Object]" を
    // 名指さず、未確認で止める。
    requireKnown(ctx, "dragAndDropToObject", "移動先ロケーター", ctx.value);
    ctx.element();
    const dest = elementByLocator(ctx, ctx.value);
    if (!dest)
      ctx.api.fail("モデルに要素がありません：" + ctx.value, ctx.n);
    ctx.api.note(ctx.s, ctx.n, `${ctx.target} を ${ctx.value} へドラッグ＆ドロップします`);
  },
  editContent: (ctx) => {
    // B1G-06: 書き込む値が未確定なら要素へ書き込まず未確認で止める。
    requireKnown(ctx, "editContent", "値", ctx.value);
    const e = ctx.element();
    e.text = String(ctx.value ?? "");
    ctx.api.note(ctx.s, ctx.n, `${ctx.target} の内容を編集します`);
  },
  executeScript: (ctx) => storeScriptResult(ctx, "executeScript"),
  highlight: (ctx) => {
    ctx.element();
    ctx.api.note(ctx.s, ctx.n, `${ctx.target} をハイライトします（現在のIDEでは全要素が既定でハイライトされます）`);
  },
  label: (ctx) => {
    ctx.api.note(ctx.s, ctx.n, `ラベル：${formatValue(ctx.target)}（ラベルジャンプは未対応のため、位置の目印としてだけ扱います）`);
  },
  mouseOver: (ctx) => {
    ctx.element();
    ctx.api.note(ctx.s, ctx.n, `${ctx.target} にマウスを合わせます`);
  },
  pause: (ctx) => {
    // B1A-17: 空の Target は「不正」ではなく、0 と同様に待機指定として
    // 受理する（製品では空／0 は RESUME 待ちだが、実際の待機は再現しない）。
    const trimmed = String(ctx.target ?? "").trim();
    const ms = trimmed === "" ? 0 : Number(trimmed);
    if (Number.isNaN(ms) || ms < 0)
      ctx.api.fail("pause：待機時間（ミリ秒）が不正です", ctx.n);
    ctx.api.note(ctx.s, ctx.n, `${ms}ミリ秒待機します（モデルでは実際の時間は待ちません）`);
  },
  prompt: (ctx) => {
    const raw = String(ctx.n.item.Target ?? "");
    const at = raw.lastIndexOf("@");
    const question = at >= 0 ? raw.slice(0, at) : raw;
    const def = at >= 0 ? raw.slice(at + 1) : undefined;
    // B1G-08（同型）: prompt の保存先変数名が未確定なら未確認で止める。
    requireKnown(ctx, "prompt", "保存先", ctx.value);
    const varName = String(ctx.value ?? "").trim();
    if (!varName) ctx.api.fail("prompt：保存先の変数名が空です", ctx.n);
    ctx.assertWritableVar(varName);
    let answer;
    // B1A-13: @既定値は入力欄の初期表示にすぎず、回答は実行時に決まる。
    // 確定値になるのは answerOnNextPrompt で予約した値だけであり、
    // 既定値だけの場合は未確定値として扱う（caution の宣言と一致）。
    void def;
    if (ctx.s.model.promptAnswer !== undefined) {
      answer = ctx.s.model.promptAnswer;
      delete ctx.s.model.promptAnswer;
    } else {
      answer = unknown("プロンプトへの入力", "prompt");
    }
    ctx.setVar(varName, answer);
    ctx.s.model.dialog = { type: "prompt", text: question, answer };
    ctx.api.note(ctx.s, ctx.n, `入力を求め、${varName} に ${formatValue(answer)} を保存します`);
  },
  refresh: (ctx) => {
    delete ctx.s.model.dialog;
    ctx.api.note(ctx.s, ctx.n, "現在のページを再読み込みします（モデルページの状態は保持されます）");
  },
  select: (ctx) => doSelect(ctx, "select", false),
  selectAndWait: (ctx) => {
    doSelect(ctx, "selectAndWait", false);
  },
  sendKeys: (ctx) => {
    // B1G-06: 送る値が未確定なら要素へ書き込まず未確認で止める。
    requireKnown(ctx, "sendKeys", "値", ctx.value);
    const e = ctx.element();
    const raw = String(ctx.value ?? "");
    const keys = [...raw.matchAll(/\$\{KEY_([A-Z0-9_]+)\}/g)].map((m) => m[1]);
    // B1A-14: 公式に使える特殊キーは ${KEY_ENTER} のみ。それ以外の
    // ${KEY_*} トークンは送ったことにせず、名前つきで正直に止める
    // （要素への追記も行わない）。
    const unsupportedKey = keys.find((k) => k !== "ENTER");
    if (unsupportedKey !== undefined)
      ctx.api.fail(
        `未対応：\${KEY_${unsupportedKey}} はこのモデルでは扱いません（公式に使える特殊キーは \${KEY_ENTER} のみです）`,
        ctx.n,
      );
    const text = raw.replace(/\$\{KEY_[A-Z0-9_]+\}/g, "");
    if (typeof e.value === "string" || e.value !== undefined) {
      e.value = String(e.value ?? "") + text;
    } else if (e.contentEditable === true) {
      e.text = String(e.text ?? "") + text;
    }
    const parts = [];
    if (text) parts.push(`「${text}」を追加入力します`);
    if (keys.length) parts.push(`特殊キー（${keys.join("、")}）を送ります`);
    ctx.api.note(ctx.s, ctx.n, `${ctx.target} にキー入力を送ります${parts.length ? "：" + parts.join("、") : ""}（sendKeysは既存の内容を消しません）`);
  },
  setWindowSize: (ctx) => setWindowSizeImpl(ctx, "setWindowSize"),
  resize: (ctx) => resizeImpl(ctx, "resize"),
  storeAttribute: (ctx) => {
    const name = "storeAttribute";
    // B1G-08（同型）: ロケーター／属性指定と保存先変数名が未確定なら
    // 未確認で止める（#LNF の確定保存もしない）。
    requireKnown(ctx, name, "ロケーター", ctx.target);
    requireKnown(ctx, name, "保存先", ctx.value);
    const rawTarget = String(ctx.target ?? "");
    const at = rawTarget.lastIndexOf("@");
    if (at < 0)
      ctx.api.fail(`${name}：対象は「ロケーター@属性名」の形で指定してください`, ctx.n);
    const locator = rawTarget.slice(0, at);
    const attr = rawTarget.slice(at + 1);
    const varName = String(ctx.value ?? "").trim();
    if (!varName) ctx.api.fail(`${name}：保存先の変数名が空です`, ctx.n);
    ctx.assertWritableVar(varName);
    const e = elementByLocator(ctx, locator);
    if (!e) {
      ctx.setVar(varName, "#LNF");
      ctx.markSoftFail();
      ctx.api.note(ctx.s, ctx.n, `${varName} に #LNF（ロケーター不一致）を保存します`);
      return;
    }
    let v;
    if (attr === "value") v = e.value ?? "";
    else if (attr === "text" || attr === "textContent") v = e.text ?? "";
    else if (e[attr] !== undefined) v = e[attr];
    else if (e.attributes && typeof e.attributes === "object" && e.attributes[attr] !== undefined)
      v = e.attributes[attr];
    if (v === undefined) {
      ctx.setVar(varName, "#LNF");
      ctx.markSoftFail();
      ctx.api.note(ctx.s, ctx.n, `${varName} に #LNF（属性がありません：${attr}）を保存します`);
      return;
    }
    ctx.setVar(varName, v);
    ctx.api.note(ctx.s, ctx.n, `${varName} に属性 ${attr} の値 ${formatValue(v)} を保存します`);
  },
  storeChecked: (ctx) => {
    // B1G-08: 保存先変数名が未確定なら未確認で止める。
    requireKnown(ctx, "storeChecked", "保存先", ctx.value);
    const varName = String(ctx.value ?? "").trim();
    if (!varName) ctx.api.fail("storeChecked：保存先の変数名が空です", ctx.n);
    ctx.assertWritableVar(varName);
    const e = ctx.element(true);
    if (!e) {
      ctx.setVar(varName, "#LNF");
      ctx.markSoftFail();
      ctx.api.note(ctx.s, ctx.n, `${varName} に #LNF（ロケーター不一致）を保存します`);
      return;
    }
    const v = e.checked ?? false;
    ctx.setVar(varName, v);
    ctx.api.note(ctx.s, ctx.n, `${varName} にチェック状態 ${formatValue(v)} を保存します`);
  },
  storeEval: (ctx) => storeScriptResult(ctx, "storeEval"),
  storeTitle: (ctx) => {
    // B1G-08: 保存先変数名が未確定なら未確認で止める。Value が使われる
    // 場合は Value を、空でフォールバックする場合は Target を検査する。
    requireKnown(ctx, "storeTitle", "保存先", ctx.value);
    const valueName = String(ctx.value ?? "").trim();
    if (!valueName) requireKnown(ctx, "storeTitle", "保存先", ctx.target);
    const varName = valueName || String(ctx.target ?? "").trim();
    if (!varName) ctx.api.fail("storeTitle：保存先の変数名が空です", ctx.n);
    ctx.assertWritableVar(varName);
    const title = pageTitle(ctx);
    ctx.setVar(varName, title);
    ctx.api.note(ctx.s, ctx.n, `${varName} にページのタイトル ${formatValue(title)} を保存します`);
  },
  storeXpathCount: (ctx) => {
    // B1G-07＋B1G-08: ロケーターが未確定なら 0 件を確定保存せず、
    // 保存先変数名が未確定なら変数を作らず、いずれも未確認で止める。
    requireKnown(ctx, "storeXpathCount", "ロケーター", ctx.target);
    requireKnown(ctx, "storeXpathCount", "保存先", ctx.value);
    const varName = String(ctx.value ?? "").trim();
    if (!varName) ctx.api.fail("storeXpathCount：保存先の変数名が空です", ctx.n);
    ctx.assertWritableVar(varName);
    const count = elementByLocator(ctx, ctx.target) ? 1 : 0;
    ctx.setVar(varName, count);
    ctx.api.note(ctx.s, ctx.n, `${varName} に一致する要素数 ${count} を保存します（モデルではロケーターと完全一致する要素だけを数えます）`);
  },
  ThrowError: (ctx) => {
    // 観察事項3: メッセージが未確定なら "[object Object]" をエラー文に
    // せず、未確認で止める。
    requireKnown(ctx, "ThrowError", "メッセージ", ctx.target);
    ctx.api.fail(String(ctx.target || "ThrowErrorで指定されたエラーです"), ctx.n);
  },
  waitForElementPresent: (ctx) => waitPresentImpl(ctx, "waitForElementPresent", false),
  waitForElementToLoad: (ctx) => waitPresentImpl(ctx, "waitForElementToLoad", false),
  waitForPageToLoad: (ctx) => {
    ctx.api.note(ctx.s, ctx.n, "ページの読み込み完了を確認します（モデルページは読み込み済みです）");
  },
  waitForVisible: (ctx) => waitPresentImpl(ctx, "waitForVisible", true),
};

const stop = (reason) => ({ status: "unsupported", reason });
export const advancedStops = {
  executeAsyncScript: stop("非同期コールバック実行はモデル化していません"),
  run: stop("呼び出し先マクロはモデルにありません"),
  selectFrame: stop("フレームはモデル化していません"),
  sourceExtract: stop("ページのHTMLソースはモデル化していません"),
  sourceSearch: stop("ページのHTMLソースはモデル化していません"),
  gotoIf: stop("ラベルジャンプはパス列挙モデルで扱いません（製品でも非推奨です）"),
  gotoLabel: stop("ラベルジャンプはパス列挙モデルで扱いません（製品でも非推奨です）"),
  onError: stop("エラー時のジャンプ／再開はパス列挙モデルで扱いません"),
  storedVars: stop("式の語彙として提供していません"),
  bringBrowserToForeground: stop("実ブラウザウィンドウの操作はモデル化していません"),
  captureScreenshot: stop("実画面のスクリーンショット取得はモデル化していません"),
  captureEntirePageScreenshot: stop("実画面のスクリーンショット取得はモデル化していません"),
  deleteCookies: stop("実ブラウザのCookieストアはモデル化していません"),
  localStorageExport: stop("実ファイルへのエクスポートはモデル化していません"),
  saveItem: stop("実ファイルの保存はモデル化していません"),
  selectWindow: stop("実ブラウザのタブ切替はモデル化していません"),
  setProxy: stop("ネットワーク（プロキシ）設定はモデル化していません"),
  storeImage: stop("実画面のスクリーンショット取得はモデル化していません"),
  OnDownload: stop("実ファイルのダウンロード制御はモデル化していません"),
  XClick: stop("画像照合と実入力イベント（XModule）はモデル化していません"),
  XMove: stop("画像照合と実入力イベント（XModule）はモデル化していません"),
  XClickRelative: stop("画像照合と実入力イベント（XModule）はモデル化していません"),
  XMoveRelative: stop("画像照合と実入力イベント（XModule）はモデル化していません"),
  XClickText: stop("OCRと実入力イベントはモデル化していません"),
  XMoveText: stop("OCRと実入力イベントはモデル化していません"),
  XClickTextRelative: stop("OCRと実入力イベントはモデル化していません"),
  XMoveTextRelative: stop("OCRと実入力イベントはモデル化していません"),
  XMouseWheel: stop("実入力イベント（XModule）はモデル化していません"),
  XType: stop("実入力イベント（XModule）はモデル化していません"),
  XRun: stop("外部プログラムの起動はモデル化していません"),
  XRunAndWait: stop("外部プログラムの起動と完了待ちはモデル化していません"),
  XDesktopAutomation: stop("デスクトップ全体の操作はモデル化していません"),
  CaptureDesktopScreenshot: stop("実画面のスクリーンショット取得はモデル化していません"),
  visualAssert: stop("画像照合（コンピュータビジョン）はモデル化していません"),
  visualVerify: stop("画像照合（コンピュータビジョン）はモデル化していません"),
  visualSearch: stop("画像照合（コンピュータビジョン）はモデル化していません"),
  visionLimitSearchArea: stop("画像照合（コンピュータビジョン）はモデル化していません"),
  visionLimitSearchAreaRelative: stop("画像照合（コンピュータビジョン）はモデル化していません"),
  visionLimitSearchAreaByTextRelative: stop("画像照合（コンピュータビジョン）とOCRはモデル化していません"),
  visualGetPixelColor: stop("実画面のピクセル色取得はモデル化していません"),
  OCRExtract: stop("OCR（画面の文字認識）はモデル化していません"),
  OCRExtractRelative: stop("OCR（画面の文字認識）と画像照合はモデル化していません"),
  OCRExtractByTextRelative: stop("OCR（画面の文字認識）はモデル化していません"),
  OCRSearch: stop("OCR（画面の文字認識）はモデル化していません"),
};

// 機構契約（advanced-interface.md 第5章(e)）のエンジン拡張フック。
// B1 の初例としての落とし込み（契約の未決・留保 R-3 への提案）：
// 合成済みカタログを受け取り、この種類の高度エンジンテーブルを
// definition.advancedEngine へ登録して返す。エンジン本体の dispatch は
// 単一エンジンの原則（契約 第1章）どおり同じテーブルを静的に参照して
// おり、モードによる条件分岐は存在しない。
export function applyAdvancedEngine(definition, merged) {
  definition.advancedEngine = {
    actionHandlers: advancedActionHandlers,
    stops: advancedStops,
  };
  return definition;
}
