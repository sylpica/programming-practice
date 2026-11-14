import { lex, display, LIMITS } from "./engine.js";
import { templates, reference, glossary, usedReferences } from "./content.js";
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
  timer,
  worker,
  request = 0,
  watchdog;
const defaultModel = {
  A1: "商品",
  B1: "点数",
  C1: "判定",
  A2: "りんご",
  B2: 85,
  A3: "みかん",
  B3: 60,
  A4: "ぶどう",
  B4: 45,
};
function getModel() {
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
function fillSheet(model = defaultModel) {
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
  try {
    localStorage.setItem(
      "vba-practice-v1",
      JSON.stringify({
        code: $("editor").value,
        templateId,
        auto: $("auto").checked,
        model: Object.fromEntries(
          [...$("sheet").querySelectorAll("input")].map((x) => [
            x.dataset.cell,
            x.value,
          ]),
        ),
      }),
    );
  } catch {}
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
  result = null;
  paths = [];
  $("pathNav").hidden = true;
  $("trace").replaceChildren();
  $("outputs").replaceChildren();
  $("final").textContent =
    "コードまたはモデルシートが変わりました。実行して状態を確認してください。";
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
function loadTemplate(id, confirm = true) {
  let t = templates.find((t) => t.id === id);
  if (
    t &&
    confirm &&
    $("editor").value !== t.code &&
    !window.confirm(`「${t.title}」でコードを上書きしますか？`)
  ) {
    $("template").value = templateId;
    return;
  }
  templateId = id;
  $("template").value = id;
  if (t) $("editor").value = t.code;
  renderExplanation(t);
  changed();
  if (t) run();
}
function linkedText(text) {
  let fragment = document.createDocumentFragment();
  let names = reference.map((r) => r.name).sort((a, b) => b.length - a.length);
  while (text) {
    let matches = names
      .map((name) => ({ name, index: text.indexOf(name) }))
      .filter((x) => x.index >= 0)
      .sort((a, b) => a.index - b.index || b.name.length - a.name.length);
    if (!matches.length) {
      fragment.append(document.createTextNode(text));
      break;
    }
    let m = matches[0];
    fragment.append(document.createTextNode(text.slice(0, m.index)));
    let link = el("button", m.name, "inline-link");
    link.onclick = () => showRef(m.name);
    fragment.append(link);
    text = text.slice(m.index + m.name.length);
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
for (let t of templates) {
  let o = el("option", t.title);
  o.value = t.id;
  $("template").append(o);
  let card = el("article", undefined, "template-card");
  card.append(
    el(
      "span",
      "TEMPLATE " + String(templates.indexOf(t) + 1).padStart(2, "0"),
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
$("template").onchange = (e) => loadTemplate(e.target.value);
function refArticle(r, expanded = false) {
  let article = el("article", undefined, expanded ? "" : "ref-card");
  article.append(
    el(
      "span",
      r.supported ? "シミュレーション対応" : "参照用 · 操作は未対応",
      "badge" + (r.supported ? "" : " unsupported"),
    ),
    el("h3", r.name),
    el("pre", r.syntax),
    el("p", r.description),
    el("pre", r.example),
    el("p", r.caution, "caution"),
  );
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
    $("fullReferences").append(refArticle(r));
  if (!$("fullReferences").childElementCount)
    $("fullReferences").append(el("p", "該当する項目はありません。"));
}
$("referenceSearch").oninput = renderRefs;
$("fullSearch").oninput = fullRefs;
for (let [word, definition] of glossary) {
  let box = el("div");
  box.append(el("dt", word), el("dd", definition));
  $("glossaryList").append(box);
}
function updateUsed() {
  let tokens = [];
  if (result) {
    tokens = paths[current]?.trace.flatMap((t) => t.tokens) || [];
    $("usedScope").textContent = "表示中のパス";
  } else {
    try {
      tokens = lex($("editor").value);
    } catch {}
    $("usedScope").textContent = "コード全体";
  }
  let names = usedReferences(tokens);
  $("used").replaceChildren();
  for (let name of names) {
    let b = el("button", name, "chip");
    b.onclick = () => showRef(name);
    $("used").append(b);
  }
  if (!names.length)
    $("used").append(el("span", "該当する項目はありません", "muted"));
}
function jumpLine(line) {
  let editor = $("editor"),
    lines = editor.value.split("\n"),
    start = lines.slice(0, line - 1).reduce((n, s) => n + s.length + 1, 0);
  editor.focus({ preventScroll: true });
  editor.setSelectionRange(start, start + (lines[line - 1] || "").length);
  let lh = parseFloat(getComputedStyle(editor).lineHeight);
  editor.scrollTop = Math.max(0, (line - 1) * lh - editor.clientHeight / 3);
  syncScroll();
  editor.scrollIntoView({ behavior: "smooth", block: "center" });
}
function applyResult(r) {
  result = r;
  paths = [...r.paths];
  current = 0;
  sortPaths();
  $("run").disabled = false;
  if (r.error) {
    $("resultStatus").textContent = `${r.error.line}行：${r.error.message}`;
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
  $("pathNav").hidden = !paths.length;
  $("resultStatus").textContent =
    `${paths.length}件のパス · モデルシートに基づく説明`;
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
  let code = $("editor").value,
    model = getModel();
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
    worker.postMessage({ id, code, model });
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
    b.append(el("span", `L${t.line}`, "line"), el("span", t.text));
    b.onclick = () => jumpLine(t.line);
    li.append(b);
    $("trace").append(li);
  }
  $("outputs").replaceChildren();
  if (p.outputs.length) {
    let box = el("div", undefined, "output-box");
    box.append(el("h3", "出力"));
    for (let o of p.outputs) box.append(el("div", `${o.channel}  ${o.text}`));
    $("outputs").append(box);
  }
  $("final").replaceChildren();
  if (p.error)
    $("final").append(
      el("p", `${p.error.line}行で停止：${p.error.message}`, "notice"),
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
  for (let [title, entries] of [
    ["変数", Object.entries(p.vars)],
    ["セルの変化", p.changes],
  ]) {
    let group = el("div");
    group.append(el("h3", title));
    let dl = el("dl");
    for (let [name, v] of entries) {
      let row = el("div", undefined, "state-row");
      row.append(el("dt", name), el("dd", display(v)));
      dl.append(row);
    }
    if (!entries.length) group.append(el("p", "なし", "muted"));
    group.append(dl);
    grid.append(group);
  }
  $("final").append(grid);
  updateUsed();
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
  if (Number.isFinite(n)) navigate(Math.trunc(n) - 1);
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
};
$("editor").oninput = changed;
$("editor").onscroll = syncScroll;
$("editor").onkeydown = (e) => {
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
  try {
    if (file.size > 300000) throw Error("ファイルは300KB以内にしてください。");
    let { text, encoding } = decodeFile(await file.arrayBuffer(), file.name);
    if (
      !window.confirm(
        `ファイル：${file.name}\n文字コード：${encoding}\n${text.split("\n").length}行\n現在のコードを上書きして取り込みますか？`,
      )
    )
      return;
    templateId = "";
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
  a.download = "practice.bas";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
fillSheet();
renderRefs();
fullRefs();
$("refDetail").replaceChildren(
  ...refArticle(
    reference.find((r) => r.name === "Range"),
    true,
  ).childNodes,
);
let saved;
try {
  saved = JSON.parse(localStorage.getItem("vba-practice-v1"));
} catch {}
if (saved && typeof saved.code === "string") {
  $("editor").value = saved.code;
  templateId = templates.some((t) => t.id === saved.templateId)
    ? saved.templateId
    : "";
  $("template").value = templateId;
  $("auto").checked = !!saved.auto;
  if (saved.model) fillSheet(saved.model);
  renderExplanation(templates.find((t) => t.id === templateId));
  updateLines();
  updateUsed();
  run();
} else loadTemplate("cells", false);
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
