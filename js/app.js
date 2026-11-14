import { LIMITS, formatValue, refsInTrace } from "./core/contract.js";
import { definitions, getDefinition } from "./types/registry.js";
let active = getDefinition("vba"),
  templates = active.templates,
  reference = active.reference,
  glossary = active.glossary || [];
let drafts = {},
  editorPlugin = null,
  storageBlocked = false;
try {
  let raw = localStorage.getItem("programming-practice-v3");
  if (raw) {
    try {
      let saved = JSON.parse(raw);
      if (
        !saved ||
        typeof saved !== "object" ||
        !saved.drafts ||
        Array.isArray(saved.drafts) ||
        typeof saved.drafts !== "object"
      )
        throw Error("保存形式が不正です");
      drafts = saved.drafts;
      active = getDefinition(saved.active);
    } catch {
      try {
        localStorage.setItem("programming-practice-recovery-v3", raw);
      } catch {
        storageBlocked = true;
      }
    }
  }
} catch {
  storageBlocked = true;
}

if (!Object.keys(drafts).length) {
  try {
    let raw = localStorage.getItem("macro-practice-v2"), interim = JSON.parse(raw);
    if (interim) {
      if (interim.drafts && typeof interim.drafts === "object" && !Array.isArray(interim.drafts)) {
        drafts = interim.drafts;
        active = getDefinition(interim.active);
      } else if (raw) {
        localStorage.setItem("programming-practice-recovery-v2", raw);
      }
    }
  } catch {}
}
if (!drafts.vba) {
  try {
    let legacy = JSON.parse(localStorage.getItem("vba-practice-v1"));
    if (legacy) drafts.vba = legacy;
  } catch {}
}
// RG-86: 起動時点の下書きスナップショット。save() はこれを基準に
// 「このタブが変更した種類」だけを自分の版で確定し、未変更の種類は
// 保存済み（他タブが書いた）版を採用する。複数タブで開いても、他タブの
// 下書きが丸ごと上書きで無言消失しないようにするための基準点。
let baseDrafts = structuredClone(drafts);
import { decodeFile } from "./import.js";
const $ = (id) => document.getElementById(id);
const el = (tag, text, cls) => {
  let n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
let result = null,
  paths = [],
  current = 0,
  templateId = "",
  // RG-57: 下書きの由来テンプレート。編集で templateId が "" に切り離されても
  // draftKey は由来を保持し、下書きをテンプレート別に振り分ける。
  draftKey = "",
  timer,
  worker,
  request = 0,
  watchdog;
function getModel() {
  if (active.model.kind !== "sheet") {
    try {
      return JSON.parse($("modelJson").value);
    } catch {
      throw Error("モデル状態のJSONが不正です");
    }
  }
  let model = {};
  for (let input of $("sheet").querySelectorAll("input")) {
    let t = input.value;
    if (t === "?")
      model[input.dataset.cell] = {
        kind: "unknown",
        source: `モデルシート ${input.dataset.cell} の値による`,
      };
    else if (t === "") model[input.dataset.cell] = { kind: "empty" };
    else if (t.startsWith("'")) model[input.dataset.cell] = t.slice(1);
    else if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(t))
      model[input.dataset.cell] = Number(t);
    else model[input.dataset.cell] = t;
  }
  return model;
}
function fillSheet(model = active.model.defaults) {
  $("modelTitle").textContent = active.model.title;
  $("modelHint").textContent =
    active.model.hint || "モデルだけを変更します。外部サービスは操作しません。";
  $("sheetWrap").hidden = active.model.kind !== "sheet";
  $("modelJson").hidden = active.model.kind === "sheet";
  if (active.model.kind !== "sheet") {
    $("modelJson").value = JSON.stringify(model, null, 2);
    return;
  }
  $("sheet").replaceChildren();
  for (let row = 1; row <= 5; row++) {
    let tr = el("tr");
    tr.append(el("th", String(row)));
    for (let col of ["A", "B", "C"]) {
      let td = el("td"),
        input = el("input");
      input.dataset.cell = col + row;
      input.setAttribute("aria-label", `セル ${col + row}`);
      input.value = model[col + row] ?? "";
      input.addEventListener("input", changed);
      td.append(input);
      tr.append(td);
    }
    $("sheet").append(tr);
  }
}
function save() {
  let previous = drafts[active.id] || {},
    model = previous.model || active.model.defaults,
    modelText = active.model.kind === "sheet" ? null : $("modelJson").value;
  if (active.model.kind === "sheet")
    model = Object.fromEntries(
      [...$("sheet").querySelectorAll("input")].map((x) => [
        x.dataset.cell,
        x.value,
      ]),
    );
  else {
    try {
      model = JSON.parse(modelText);
    } catch {}
  }
  // RG-86: 保存直前に保存済み下書きを読み直し、他タブの変更とマージする。
  // 読み直しに失敗した場合は従来どおりメモリ内だけで保存する。
  let storedDrafts = null;
  try {
    let saved = JSON.parse(localStorage.getItem("programming-practice-v3"));
    if (
      saved &&
      saved.drafts &&
      typeof saved.drafts === "object" &&
      !Array.isArray(saved.drafts)
    )
      storedDrafts = saved.drafts;
  } catch {}
  // RG-57: 下書きは由来テンプレートごとに保持する（自由編集は freeDraft）。
  // 単一枠だった freeDraft へ最新編集を上書きする旧規則は廃止した。
  // RG-86: 土台は他タブの同種下書きとマージしたものを使う。
  drafts[active.id] = fileDraft(
    mergeActivePrevious(baseDrafts[active.id], previous, storedDrafts?.[active.id]),
    {
      code: $("editor").value,
      templateId,
      auto: $("auto").checked,
      sort: $("sort").value,
      pathId: paths[current]?.id ?? previous.pathId,
      model,
      modelText,
      draftOrigin: draftKey,
    },
    draftKey,
  );
  drafts = mergeDraftsForSave(baseDrafts, drafts, storedDrafts, active.id);
  try {
    if (storageBlocked) throw Error("保存データを保護しています");
    localStorage.setItem(
      "programming-practice-v3",
      JSON.stringify({ active: active.id, drafts }),
    );
    baseDrafts = structuredClone(drafts);
  } catch {
    $("storageNotice").hidden = false;
  }
}
function updateLines() {
  let lines = $("editor").value.split("\n").length;
  $("lineNumbers").textContent = Array.from(
    { length: lines },
    (_, i) => i + 1,
  ).join("\n");
  $("cursor").textContent = `${lines}行`;
  syncScroll();
}
function syncScroll() {
  $("lineNumbers").scrollTop = $("editor").scrollTop;
}
function changed() {
  const selected = templates.find(t => t.id === templateId);
  if (selected && $("editor").value !== selected.code) {
    templateId = "";
    $("template").value = "";
    renderExplanation(null);
  }
  editorPlugin?.refresh?.();
  result = null;
  paths = [];
  $("pathNav").hidden = true;
  $("trace").replaceChildren();
  $("outputs").replaceChildren();
  $("final").textContent =
    "コード・フローまたはモデルが変わりました。実行して状態を確認してください。";
  $("resultStatus").textContent = "更新後のコードは未実行です";
  $("limit").hidden = true;
  updateLines();
  updateUsed();
  save();
  request++;
  worker?.terminate();
  $("run").disabled = false;
  clearTimeout(watchdog);
  clearTimeout(timer);
  if ($("auto").checked) timer = setTimeout(run, 350);
}
function showView(name) {
  document.querySelectorAll(".view").forEach((n) => (n.hidden = n.id !== name));
  document.querySelectorAll(".main-nav button").forEach((b) => {
    if (b.dataset.view === name) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "instant" });
}
document
  .querySelectorAll("[data-view]")
  .forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
function loadTemplate(id) {
  let t = templates.find((t) => t.id === id);
  save();
  const freeDraft = drafts[active.id]?.freeDraft;
  templateId = id;
  draftKey = id || "";
  $("template").value = id;
  if (t) {
    // RG-57: そのテンプレートの下書きがあれば元のコードではなく下書きを復元する。
    const draft = pickTemplateDraft(drafts[active.id], id);
    if (draft) {
      $("editor").value = draft.code;
      fillSheet(draft.model || active.model.defaults);
      if (active.model.kind !== "sheet" && typeof draft.modelText === "string")
        $("modelJson").value = draft.modelText;
    } else {
      $("editor").value = t.code;
      if (t.model) fillSheet(t.model);
    }
  } else if (freeDraft && typeof freeDraft.code === "string") {
    $("editor").value = freeDraft.code;
    fillSheet(freeDraft.model || active.model.defaults);
    if (active.model.kind !== "sheet" && typeof freeDraft.modelText === "string")
      $("modelJson").value = freeDraft.modelText;
  }
  renderExplanation(t);
  changed();
  if (t) run();
}
// Pure helpers for reference-name matching and input normalization.
// They are unit-tested in tests/muse-fix-ui.test.js by evaluating this block.
// RG-57: 下書きを由来テンプレートごとに振り分ける純関数。draftKey が
// テンプレートIDなら byTemplate へ、"" なら freeDraft へ保存する。
function fileDraft(previous, snapshot, draftKey) {
  let entry = { ...(previous || {}), ...snapshot };
  let { freeDraft, byTemplate, ...clean } = snapshot;
  if (draftKey) {
    entry.byTemplate = {
      ...(previous?.byTemplate || {}),
      [draftKey]: clean,
    };
  } else {
    entry.freeDraft = clean;
  }
  return entry;
}
function pickTemplateDraft(entry, id) {
  let draft = entry?.byTemplate?.[id];
  return draft && typeof draft.code === "string" ? draft : null;
}
// RG-86: 複数タブ保存競合のマージ（純関数）。base はこのタブが起動時に
// 読み込んだ下書き、mine はこのタブのメモリ内下書き、stored は保存直前に
// 読み直した保存済み下書き。自分が base から変更した種類は自分の版、
// 未変更の種類は stored（他タブ）の版を採用する。アクティブな種類は
// このタブの最新版をそのまま使う（スロット単位の競合は後勝ち）。
function mergeDraftsForSave(base, mine, stored, activeId) {
  let out = {};
  let ids = new Set([
    ...Object.keys(base || {}),
    ...Object.keys(mine || {}),
    ...Object.keys(stored || {}),
  ]);
  for (const id of ids) {
    if (id === activeId) {
      if (mine?.[id] !== undefined) out[id] = mine[id];
      continue;
    }
    let changed =
      JSON.stringify(mine?.[id] ?? null) !== JSON.stringify(base?.[id] ?? null);
    let v = changed ? mine?.[id] : stored?.[id] !== undefined ? stored[id] : mine?.[id];
    if (v !== undefined) out[id] = v;
  }
  return out;
}
// RG-86: アクティブ種類の下書き土台のマージ（純関数）。他タブが同じ種類の
// 別テンプレート下書きを増やしていても消えないよう、byTemplate は和集合に
// し、freeDraft はこのタブが base から変更した場合だけ自分の版を使う。
function mergeActivePrevious(baseEntry, mineEntry, storedEntry) {
  if (!storedEntry) return mineEntry || {};
  if (!mineEntry) return storedEntry;
  if (JSON.stringify(mineEntry) === JSON.stringify(storedEntry)) return mineEntry;
  return {
    ...storedEntry,
    ...mineEntry,
    byTemplate: {
      ...(storedEntry.byTemplate || {}),
      ...(mineEntry.byTemplate || {}),
    },
    freeDraft:
      JSON.stringify(mineEntry.freeDraft ?? null) !==
      JSON.stringify(baseEntry?.freeDraft ?? null)
        ? mineEntry.freeDraft
        : storedEntry.freeDraft,
  };
}
function resolveReferenceName(name, referenceNames) {
  if (referenceNames.indexOf(name) >= 0) return name;
  let parts = name.split(".");
  for (let i = 1; i < parts.length; i++) {
    let candidate = parts.slice(i).join(".");
    if (referenceNames.indexOf(candidate) >= 0) return candidate;
  }
  return null;
}
function usedTraceNames(refs, referenceNames) {
  let out = [];
  for (let name of refs) {
    let resolved = resolveReferenceName(name, referenceNames);
    if (resolved && out.indexOf(resolved) < 0) out.push(resolved);
  }
  return out;
}
function isWordChar(ch) {
  return (
    !!ch &&
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_$".indexOf(
      ch,
    ) >= 0
  );
}
function linkSegments(text, names) {
  let segments = [];
  if (!text) return segments;
  let sorted = [...names]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  let pos = 0;
  while (pos < text.length) {
    let best = null;
    for (let name of sorted) {
      let from = pos;
      while (from + name.length <= text.length) {
        let index = text.indexOf(name, from);
        if (index < 0) break;
        let before = index > 0 ? text[index - 1] : "",
          after =
            index + name.length < text.length
              ? text[index + name.length]
              : "";
        if (!isWordChar(before) && !isWordChar(after)) {
          if (
            !best ||
            index < best.index ||
            (index === best.index && name.length > best.name.length)
          )
            best = { name, index };
          break;
        }
        from = index + 1;
      }
    }
    if (!best) break;
    if (best.index > pos)
      segments.push({ text: text.slice(pos, best.index) });
    segments.push({ name: best.name });
    pos = best.index + best.name.length;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos) });
  if (!segments.length) segments.push({ text });
  return segments;
}
function normalizeLineEndings(code) {
  return code.replace(/\r\n?/g, "\n");
}
// End of pure helpers.
function linkedText(text) {
  let fragment = document.createDocumentFragment();
  let names = reference.map((r) => r.name);
  for (let segment of linkSegments(text, names)) {
    if (segment.name) {
      let link = el("button", segment.name, "inline-link");
      link.onclick = () => showRef(segment.name);
      fragment.append(link);
    } else fragment.append(document.createTextNode(segment.text));
  }
  return fragment;
}
function renderExplanation(t) {
  let box = $("templateExplanation");
  box.replaceChildren();
  box.hidden = !t;
  if (!t) return;
  let intro = el("p");
  intro.append(linkedText(t.intro));
  box.append(el("h2", t.title), intro);
  let links = el("div", undefined, "chips");
  for (let name of t.refs) {
    let b = el("button", name, "chip");
    b.onclick = () => showRef(name);
    links.append(b);
  }
  box.append(links);
  for (let name of t.refs) {
    let r = reference.find((x) => x.name === name);
    if (r) box.append(refArticle(r, true));
  }
}
function renderTemplates() {
  $("template").replaceChildren();
  let none = el("option", "なし（自由に練習）");
  none.value = "";
  $("template").append(none);
  $("templateCards").replaceChildren();
  for (let t of templates) {
    let o = el("option", `${t.level} · ${t.title}`);
    o.value = t.id;
    $("template").append(o);
    let card = el("article", undefined, "template-card");
    card.append(
      el(
        "span",
        t.level,
        "eyebrow",
      ),
      el("h2", t.title),
      el("p", t.intro),
    );
    let b = el("button", "このテンプレートで練習する", "primary");
    b.onclick = () => {
      loadTemplate(t.id);
      showView("practice");
    };
    card.append(b);
    $("templateCards").append(card);
  }
}
$("template").onchange = (e) => loadTemplate(e.target.value);
function refArticle(r, expanded = false, heading = "h3") {
  let article = el("article", undefined, expanded ? "" : "ref-card");
  article.append(
    el(
      "span",
      r.supported ? "シミュレーション対応" : "参照用 · 操作は未対応",
      "badge" + (r.supported ? "" : " unsupported"),
    ),
    el(heading, r.name),
    el("pre", r.syntax),
    el("p", r.description),
    ...(r.returns ? [el("p", "戻り値：" + r.returns)] : []),
    el("pre", r.example),
    el("p", r.caution, "caution"),
  );
  if (r.source) {
    const source = el("a", "公式資料");
    source.href = r.source;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    article.append(source);
  }
  return article;
}
function showRef(name) {
  let r = reference.find((r) => r.name === name);
  if (!r) return;
  $("refDetail").replaceChildren(...refArticle(r, true).childNodes);
  if ($("practice").hidden) showView("practice");
  $("refDetail").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function renderRefs() {
  let q = $("referenceSearch").value.toLowerCase();
  $("refList").replaceChildren();
  for (let r of reference.filter((r) =>
    (r.name + " " + r.category + " " + r.description).toLowerCase().includes(q),
  )) {
    let b = el("button", r.name);
    b.onclick = () => showRef(r.name);
    $("refList").append(b);
  }
  if (!$("refList").childElementCount)
    $("refList").append(el("p", "該当する項目はありません。"));
}
function fullRefs() {
  let q = $("fullSearch").value.toLowerCase();
  $("fullReferences").replaceChildren();
  for (let r of reference.filter((r) =>
    (r.name + " " + r.category + " " + r.description).toLowerCase().includes(q),
  ))
    $("fullReferences").append(refArticle(r, false, "h2"));
  if (!$("fullReferences").childElementCount)
    $("fullReferences").append(el("p", "該当する項目はありません。"));
}
$("referenceSearch").oninput = renderRefs;
$("fullSearch").oninput = fullRefs;
function renderGlossary() {
  $("glossaryList").replaceChildren();
  $("sideGlossary").replaceChildren();
  for (let [word, definition] of glossary) {
    let box = el("div");
    box.append(el("dt", word), el("dd", definition));
    $("glossaryList").append(box);
    const side = el("div");
    side.append(el("dt", word), el("dd", definition));
    $("sideGlossary").append(side);
  }
}
function updateUsed() {
  let names = [];
  if (result) {
    let referenceNames = reference.map((r) => r.name),
      rawNames = refsInTrace(paths[current]);
    names = usedTraceNames(rawNames, referenceNames);
    let dropped = rawNames.filter(
      (n) => !resolveReferenceName(n, referenceNames),
    );
    if (dropped.length)
      console.info(
        "使用中チップに表示できない参照：" + dropped.join(", "),
      );
    $("usedScope").textContent = "表示中のパス";
  } else {
    names = active.scan($("editor").value);
    $("usedScope").textContent = "コード全体";
  }
  $("used").replaceChildren();
  for (let name of names) {
    let b = el("button", name, "chip");
    b.onclick = () => showRef(name);
    $("used").append(b);
  }
  if (!names.length)
    $("used").append(el("span", "該当する項目はありません", "muted"));
}
function jumpLine(line, nodeId) {
  if (nodeId && editorPlugin?.highlight) {
    editorPlugin.highlight(nodeId);
    return;
  }
  let editor = $("editor"),
    lines = editor.value.split("\n"),
    start = lines.slice(0, line - 1).reduce((n, s) => n + s.length + 1, 0);
  editor.focus({ preventScroll: true });
  editor.setSelectionRange(start, start + (lines[line - 1] || "").length);
  let lh = parseFloat(getComputedStyle(editor).lineHeight);
  editor.style.paddingBottom = editor.clientHeight + "px";
  $("lineNumbers").style.paddingBottom = editor.clientHeight + "px";
  editor.scrollTop = Math.max(0, (line - 1) * lh);
  syncScroll();
  editor.scrollIntoView({ behavior: "smooth", block: "center" });
}
function errorDescription(error) {
  const { category, message } = error;
  return category && category !== "エラー" && !message.startsWith(category + "：") ? category + "：" + message : message;
}
function applyResult(r) {
  result = r;
  paths = [...r.paths];
  current = 0;
  sortPaths();
  const previousId = drafts[active.id]?.pathId;
  if (previousId !== undefined) {
    let at = paths.findIndex((p) => p.id === previousId);
    if (at >= 0) current = at;
  }
  $("run").disabled = false;
  if (r.error) {
    $("resultStatus").textContent = `${r.error.line}行：${errorDescription(r.error)}`;
    $("trace").replaceChildren();
    let li = el("li", undefined, "error"),
      b = el("button", `${r.error.line}行へ移動`);
    b.onclick = () => jumpLine(r.error.line);
    li.append(b);
    $("trace").append(li);
    $("pathNav").hidden = true;
    $("outputs").replaceChildren();
    $("limit").hidden = true;
    $("final").textContent = "構文の確認で停止しました。実行結果はありません。";
    updateUsed();
    return;
  }
  if (!paths.length) {
    $("trace").replaceChildren();
    $("outputs").replaceChildren();
    $("final").textContent =
      "説明する処理がありません。コードまたはフローを入力してください。";
  }
  $("pathNav").hidden = !paths.length;
  $("resultStatus").textContent =
    `${paths.length}件のパス · ${active.model.title}に基づく説明`;
  $("limit").hidden = !r.truncated;
  if (r.truncated)
    $("limit").textContent =
      `最大${r.limits?.paths ?? LIMITS.paths}件までです。すべての分岐パスは表示されていません。${r.reasons?.join("、") || "探索上限"}により打ち切りました。`;
  renderPath();
}
function run() {
  clearTimeout(timer);
  clearTimeout(watchdog);
  worker?.terminate();
  let id = ++request;
  $("run").disabled = true;
  $("resultStatus").textContent = "コードを解析しています…";
  let code = normalizeLineEndings($("editor").value),
    model;
  try {
    model = getModel();
  } catch (e) {
    $("run").disabled = false;
    $("resultStatus").textContent = e.message;
    return;
  }
  try {
    worker = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      if (data.id !== request) return;
      clearTimeout(watchdog);
      worker.terminate();
      applyResult(data.result);
    };
    worker.onerror = () => {
      clearTimeout(watchdog);
      worker.terminate();
      $("run").disabled = false;
      $("resultStatus").textContent =
        "解析用Workerを開始できません。HTTP(S)でアプリを開き直してください。";
    };
    worker.postMessage({ id, code, model, typeId: active.id });
    watchdog = setTimeout(() => {
      worker.terminate();
      $("run").disabled = false;
      $("resultStatus").textContent =
        "解析時間の上限で停止しました。コードを小さくして再実行してください。";
    }, 2500);
  } catch (e) {
    $("run").disabled = false;
    $("resultStatus").textContent =
      "この環境ではWorkerが使えません。HTTP(S)で開いてください。";
  }
  save();
}
function sortPaths() {
  let id = paths[current]?.id;
  let mode = $("sort").value;
  paths.sort((a, b) =>
    mode === "long"
      ? b.trace.length - a.trace.length || a.id - b.id
      : mode === "short"
        ? a.trace.length - b.trace.length || a.id - b.id
        : a.id - b.id,
  );
  current = Math.max(
    0,
    paths.findIndex((p) => p.id === id),
  );
}
function renderPath() {
  let p = paths[current];
  if (!p) return;
  $("counter").textContent = `${current + 1} / ${paths.length}`;
  $("pathNumber").value = String(current + 1);
  $("first").disabled = $("prev").disabled = current === 0;
  $("last").disabled = $("next").disabled = current === paths.length - 1;
  $("trace").replaceChildren();
  for (let t of p.trace) {
    let li = el("li", undefined, t.kind),
      b = el("button");
    b.append(el("span", `L${t.line}`, "line"), el("span", t.category ? errorDescription({ category: t.category, message: t.text }) : t.text));
    b.onclick = () => jumpLine(t.line, t.nodeId);
    li.append(b);
    $("trace").append(li);
  }
  $("outputs").replaceChildren();
  if (p.outputs.length) {
    let box = el("div", undefined, "output-box");
    box.append(el("h3", "出力"));
    for (let o of p.outputs) {
      const entry = el(o.line ? "button" : "div", `${o.channel}  ${o.text}`);
      if (o.line) {
        entry.className = "output-link";
        entry.onclick = () => jumpLine(o.line);
        entry.setAttribute("aria-label", `${o.channel} ${o.text}：${o.line}行へ移動`);
      }
      box.append(entry);
    }
    $("outputs").append(box);
  }
  $("final").replaceChildren();
  if (p.error)
    $("final").append(
      el("p", `${p.error.line}行で停止：${errorDescription(p.error)}`, "notice"),
    );
  if (p.trace.some((t) => t.kind === "limit"))
    $("final").append(
      el(
        "p",
        "表示を打ち切った時点の状態です。終了後の状態は確定していません。",
        "notice",
      ),
    );
  let grid = el("div", undefined, "state-grid");
  for (let { title, entries } of p.groups || []) {
    let group = el("div");
    group.append(el("h3", title));
    let dl = el("dl");
    for (let [name, v] of entries) {
      let row = el("div", undefined, "state-row");
      row.append(el("dt", name), el("dd", formatValue(v)));
      dl.append(row);
    }
    if (!entries.length) group.append(el("p", "なし", "muted"));
    group.append(dl);
    grid.append(group);
  }
  $("final").append(grid);
  updateUsed();
  save();
}
function navigate(n) {
  if (!paths.length) return;
  current = Math.min(paths.length - 1, Math.max(0, n));
  renderPath();
}
$("first").onclick = () => navigate(0);
$("last").onclick = () => navigate(paths.length - 1);
$("prev").onclick = () => navigate(current - 1);
$("next").onclick = () => navigate(current + 1);
$("jump").onclick = () => {
  let text = $("pathNumber").value.trim();
  if (!text || !/^[-+]?\d+(?:\.\d+)?$/.test(text)) return;
  let n = Number(text);
  if (!Number.isNaN(n)) navigate(Math.trunc(n) - 1);
};
$("pathNumber").onkeydown = (e) => {
  if (e.key === "Enter") $("jump").click();
};
$("sort").onchange = () => {
  sortPaths();
  renderPath();
};
$("run").onclick = run;
$("auto").onchange = () => {
  save();
  if ($("auto").checked) run();
  else clearTimeout(timer);
};
$("editor").oninput = changed;
$("editor").onscroll = syncScroll;
$("editor").onkeydown = (e) => {
  if (e.key === "Escape") {
    e.target.dataset.tabEscape = "1";
    return;
  }
  if (e.key === "Tab" && e.target.dataset.tabEscape === "1") {
    delete e.target.dataset.tabEscape;
    return;
  }
  if (e.key === "Tab") {
    e.preventDefault();
    let a = e.target.selectionStart,
      b = e.target.selectionEnd;
    e.target.setRangeText("    ", a, b, "end");
    changed();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    run();
  }
};
$("resetModel").onclick = () => {
  fillSheet();
  changed();
};
async function importFile(file) {
  if (!file) return;
  const targetId = active.id,
    editVersion = request,
    extensions = [...active.extensions];
  try {
    if (file.size > 300000) throw Error("ファイルは300KB以内にしてください。");
    let buffer = await file.arrayBuffer();
    if (active.id !== targetId || request !== editVersion) {
      $("resultStatus").textContent =
        "取込中に言語・ツールまたは下書きが変わりました。もう一度取り込んでください。";
      return;
    }
    let { text, encoding } = decodeFile(buffer, file.name, extensions);
    if (
      !window.confirm(
        `ファイル：${file.name}\n文字コード：${encoding}\n${text.split("\n").length}行\n現在のコードを上書きして取り込みますか？`,
      )
    )
      return;
    templateId = "";
    draftKey = "";
    $("template").value = "";
    renderExplanation(null);
    $("editor").value = text;
    changed();
    $("resultStatus").textContent =
      `${file.name}（${encoding}）を取り込みました`;
    if ($("auto").checked) run();
  } catch (e) {
    window.alert(e.message);
  } finally {
    $("file").value = "";
  }
}
$("import").onclick = () => $("file").click();
$("file").onchange = (e) => importFile(e.target.files[0]);
$("dropzone").ondragover = (e) => {
  e.preventDefault();
  $("dropzone").classList.add("drag-over");
};
$("dropzone").ondragleave = () => $("dropzone").classList.remove("drag-over");
$("dropzone").ondrop = (e) => {
  e.preventDefault();
  $("dropzone").classList.remove("drag-over");
  if (e.dataTransfer.files.length !== 1) {
    alert("ファイルは1つずつ取り込んでください。");
    return;
  }
  importFile(e.dataTransfer.files[0]);
};
$("download").onclick = () => {
  let blob = new Blob(["\uFEFF" + $("editor").value], {
      type: "text/plain;charset=utf-8",
    }),
    url = URL.createObjectURL(blob),
    a = el("a");
  a.href = url;
  a.download =
    "practice" +
    (active.fileExtension?.($("editor").value) || active.extensions[0]);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
function switchType(id, savePrevious = true) {
  if (savePrevious) save();
  worker?.terminate();
  clearTimeout(timer);
  clearTimeout(watchdog);
  request++;
  active = getDefinition(id);
  templates = active.templates;
  reference = active.reference;
  glossary = active.glossary || [];
  result = null;
  paths = [];
  current = 0;
  $("trace").replaceChildren();
  $("outputs").replaceChildren();
  $("final").textContent = "実行すると状態を表示します";
  $("pathNav").hidden = true;
  $("limit").hidden = true;
  editorPlugin?.destroy?.();
  editorPlugin = null;
  $("macroType").value = active.id;
  $("file").accept = active.extensions.join(",");
  $("fileHint").textContent =
    active.extensions.join(" / ") + " をドロップして取り込み";
  $("editor").setAttribute("aria-label", active.name + " コード / フロー");
  $("syntaxName").textContent = active.syntax.name;
  $("supportText").textContent =
    active.semantics.description + " " + active.semantics.support;
  $("sourceLinks").replaceChildren();
  for (let source of active.semantics.sources || []) {
    let a = el("a", source.title);
    a.href = source.url;
    a.target = "_blank";
    a.rel = "noopener";
    $("sourceLinks").append(a, document.createTextNode(" "));
  }
  renderTemplates();
  renderGlossary();
  $("referenceSearch").value = "";
  $("fullSearch").value = "";
  renderRefs();
  fullRefs();
  $("refDetail").replaceChildren(...refArticle(reference[0], true).childNodes);
  let saved = drafts[active.id],
    first = templates[0];
  templateId = saved?.templateId ?? first?.id ?? "";
  $("template").value = templateId;
  $("editor").value = saved?.code ?? first?.code ?? "";
  if (templateId && templates.find(t => t.id === templateId)?.code !== $("editor").value)
    templateId = $("template").value = "";
  draftKey = saved?.draftOrigin ?? saved?.templateId ?? "";
  $("auto").checked = !!saved?.auto;
  $("sort").value = saved?.sort || "original";
  fillSheet(saved?.model || first?.model || active.model.defaults);
  if (
    saved?.modelText !== undefined &&
    saved.modelText !== null &&
    active.model.kind !== "sheet"
  )
    $("modelJson").value = saved.modelText;
  renderExplanation(templates.find((t) => t.id === templateId));
  $("builder").replaceChildren();
  $("builder").hidden = !active.editor?.mount;
  if (active.editor?.mount)
    editorPlugin = active.editor.mount({
      root: $("builder"),
      getCode: () => $("editor").value,
      setCode: (code) => {
        $("editor").value = code;
        changed();
      },
      onError: (message) => {
        $("resultStatus").textContent = message;
      },
    });
  updateLines();
  updateUsed();
  save();
  run();
}
for (let type of definitions) {
  let option = el("option", type.name);
  option.value = type.id;
  $("macroType").append(option);
}
$("macroType").onchange = (e) => switchType(e.target.value);
$("modelJson").oninput = changed;
switchType(active.id, false);
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./sw.js")
    .then(() => navigator.serviceWorker.ready)
    .then(() => {
      $("offline").textContent = "オフライン対応";
    })
    .catch(() => {
      $("offline").textContent = "オンライン";
    });
