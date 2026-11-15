import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { definitions, getDefinition } from "../js/types/registry.js";

// 修正バッチ8・表示班（R29-N4／R29-N5、監査要件 U-45）
// N4: ImageJ 参照専用37件で「未対応」と「未確認」のラベルが混同されていた。
//     実体は全37件とも未対応（未実装）であり、caution・バッジ・実行時文言の
//     3表面で「未対応」に統一した。他の参照専用25件にも同型の混同がない
//     ことを全62件で棚卸しする。
// N5: 参照専用62件がコード練習ビューのリファレンス一覧（#refList）と
//     使用中チップで判別できなかった。描画コード（renderRefs／updateUsed／
//     renderExplanation のチップ）に、バッジと同文言・同配色の判別表示を
//     付けたことを、実描画コードをスタブ DOM で実行して全件確認する。

const appSource = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
const cssSource = fs.readFileSync(new URL("../style.css", import.meta.url), "utf8");
const imagejEngineSource = fs.readFileSync(
  new URL("../js/types/imagej/engine.js", import.meta.url),
  "utf8",
);
const imagejIndexSource = fs.readFileSync(
  new URL("../js/types/imagej/index.js", import.meta.url),
  "utf8",
);

const run = async (id, code, model) => {
  const d = getDefinition(id);
  return d.simulate(code, structuredClone(model || d.model.defaults));
};
const errText = (r) =>
  [r.error?.message, ...(r.paths || []).map((p) => p.error?.message)]
    .filter(Boolean)
    .join(" / ");

// ---------------------------------------------------------------- N4: 分類
const IMAGEJ_37 = [
  "getValue", "setColor", "drawLine", "getPixelSize", "getLut",
  "getDateAndTime", "getLocationAndSize", "getDisplayedArea",
  "getSelectionCoordinates", "getLine", "getCursorLoc", "Roi.getBounds",
  "Roi.getCoordinates", "Roi.contains", "Roi.move", "Roi.translate",
  "Roi.setStrokeWidth", "Roi.setStrokeColor", "Roi.setFillColor",
  "Roi.setName", "Roi.getName", "Roi.setPosition", "Roi.getPosition",
  "Roi.getProperty", "Roi.setProperty", "RoiManager.select",
  "RoiManager.selectByName", "RoiManager.getName", "RoiManager.getIndex",
  "RoiManager.delete", "setForegroundColor", "File.open", "File.append",
  "runMacro", "Math.sinh", "Math.cosh", "Math.tanh",
];

test("R29-N4 ImageJ reference-only set is exactly the 37 items", () => {
  const ij = getDefinition("imagej");
  const uns = ij.reference.filter((r) => !r.supported).map((r) => r.name);
  assert.deepEqual([...uns].sort(), [...IMAGEJ_37].sort());
});

test("R29-N4 all 37 cautions use 未対応 and never 未確認として停止", () => {
  const ij = getDefinition("imagej");
  for (const name of IMAGEJ_37) {
    const r = ij.reference.find((x) => x.name === name);
    assert.ok(r, name);
    assert.ok(
      r.caution.includes("このアプリでは未対応として停止する。"),
      name + ": " + r.caution,
    );
    assert.ok(!r.caution.includes("未確認"), name + ": " + r.caution);
  }
  assert.ok(
    imagejIndexSource.includes("このアプリでは未対応として停止する。"),
  );
  assert.ok(!imagejIndexSource.includes("未確認として停止する"));
});

test("R29-N4 Math.sinh/cosh/tanh keep the confirmed non-existence note", () => {
  const ij = getDefinition("imagej");
  for (const n of ["Math.sinh", "Math.cosh", "Math.tanh"]) {
    const r = ij.reference.find((x) => x.name === n);
    // 「実物に存在しない」という確定記述がある以上「未確認」ではありえない。
    assert.ok(
      r.caution.includes("実物の ImageJ マクロ言語には " + n + " は存在しない"),
      n,
    );
    assert.ok(r.caution.includes("未対応として停止する"), n);
  }
});

test("R29-N4 all 37 examples stop with 未対応： and never 未確認", async () => {
  const ij = getDefinition("imagej");
  for (const name of IMAGEJ_37) {
    const r = ij.reference.find((x) => x.name === name);
    const res = await run("imagej", r.example);
    const text = errText(res);
    assert.ok(text.includes("未対応："), name + " -> " + text);
    assert.ok(text.includes("はモデルで未対応です"), name + " -> " + text);
    assert.ok(!text.includes("未確認"), name + " -> " + text);
  }
  // drawLine の使用例は setColor で先に止まるため、単独でも確認する。
  const direct = await run("imagej", "drawLine(10, 10, 100, 50);");
  assert.ok(errText(direct).includes("未対応：drawLine はモデルで未対応です"));
});

test("R29-N4 every engine template that says 未対応 carries the 未対応： prefix", () => {
  // テンプレートは文字列連結で組まれているため行単位で照合する。
  const lines = imagejEngineSource
    .split("\n")
    .filter((l) => l.includes("はモデルで未対応です"));
  // 文字列メソッド／配列メソッド／File.*／公式／フォールバック／
  // RoiManager 操作／メニューコマンドの7テンプレート。
  assert.equal(lines.length, 7);
  for (const l of lines) {
    assert.ok(l.includes("未対応："), l);
    assert.ok(!l.includes("未確認"), l);
  }
});

test("R29-N4 sibling engine paths also use the unified prefix", async () => {
  const cases = [
    ['s = "abc";\nprint(s.toHex());', "未対応：文字列メソッド toHex はモデルで未対応です"],
    ["a = newArray(3, 1, 2);\na.reverse();", "未対応：配列メソッド Array.reverse はモデルで未対応です"],
    ['roiManager("Rotate", 0);', "未対応：ROI Manager の操作「Rotate」はモデルで未対応です"],
    ['run("No Such Command XYZ");', "未対応：メニューコマンド「No Such Command XYZ」はモデルで未対応です"],
    ['print(String.format("%d", 1));', "未対応：String.format はモデルで未対応です"],
  ];
  for (const [code, expected] of cases) {
    const r = await run("imagej", code);
    assert.ok(errText(r).includes(expected), code + " -> " + errText(r));
    assert.ok(!errText(r).includes("未確認"), code + " -> " + errText(r));
  }
});

test("R29-N4 genuine 未確認 (undetermined value) stops are preserved", async () => {
  // 値が未確定であることが理由の停止は「未確認」のままが正しい（N4 の対象外）。
  const r = await run(
    "imagej",
    'dir2 = getDirectory("no-such-key");\nsaveAs("Tiff", dir2 + "x.tif");',
  );
  assert.ok(
    errText(r).includes("未確認：保存先のパスが未確定です"),
    errText(r),
  );
  assert.ok(
    imagejEngineSource.includes("未確認：保存先のパスが未確定です"),
  );
});

test("R29-N4 inventory: no reference-only item in any type mixes the labels", async () => {
  let count = 0;
  for (const d of definitions) {
    for (const r of d.reference.filter((x) => !x.supported)) {
      count++;
      // caution は全62件とも「未対応」側で、未確認を含まない。
      assert.ok(
        (r.caution || "").includes("未対応"),
        d.id + "/" + r.name + ": " + r.caution,
      );
      assert.ok(
        !(r.caution || "").includes("未確認"),
        d.id + "/" + r.name + ": " + r.caution,
      );
      // 使用例の停止文言にも「未確認」は現れない（JS addEventListener は
      // 別理由の停止で、どちらのラベルも含まない。FREF U-6 の継続候補）。
      const res = await d.simulate(
        r.example,
        structuredClone(d.model.defaults),
      );
      assert.ok(
        !errText(res).includes("未確認"),
        d.id + "/" + r.name + " -> " + errText(res),
      );
    }
  }
  assert.equal(count, 74); // 62 + 修正バッチ8 VBA 参照専用12件
});

test("R29-N4 Python/CFN reference-only runtime messages start with 未対応：", async () => {
  for (const id of ["python", "cloudformation"]) {
    const d = getDefinition(id);
    for (const r of d.reference.filter((x) => !x.supported)) {
      const res = await d.simulate(
        r.example,
        structuredClone(d.model.defaults),
      );
      assert.ok(
        errText(res).includes("未対応："),
        id + "/" + r.name + " -> " + errText(res),
      );
    }
  }
});

// ------------------------------------------------- N5: 判別表示（スタブ DOM）
// js/app.js は Node で import できないため、対象の描画関数をソースから
// 抽出し、最小のスタブ DOM 上で実コードを実行する（muse-fix-ui.test.js と
// 同じ方式）。jsdom はこのリポジトリの依存に無いため、実描画関数の実行で
// 代替する。
function extractFunctions(source, names) {
  const chunks = [];
  for (const name of names) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, name + " not found in js/app.js");
    let depth = 0,
      state = "code";
    let j = source.indexOf("{", start);
    for (; j < source.length; j++) {
      const c = source[j],
        next = source[j + 1];
      if (state === "code") {
        if (c === "'") state = "single";
        else if (c === '"') state = "double";
        else if (c === "`") state = "template";
        else if (c === "/" && next === "/") {
          state = "line";
          j++;
        } else if (c === "/" && next === "*") {
          state = "block";
          j++;
        } else if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      } else if (state === "single") {
        if (c === "\\") j++;
        else if (c === "'") state = "code";
      } else if (state === "double") {
        if (c === "\\") j++;
        else if (c === '"') state = "code";
      } else if (state === "template") {
        if (c === "\\") j++;
        else if (c === "`") state = "code";
      } else if (state === "line") {
        if (c === "\n") state = "code";
      } else if (state === "block") {
        if (c === "*" && next === "/") {
          state = "code";
          j++;
        }
      }
    }
    chunks.push(source.slice(start, j));
  }
  return chunks.join("\n");
}

class FakeEl {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this._text = "";
    this.className = "";
    this.attrs = {};
    this.hidden = false;
    this.value = "";
    this.title = "";
    this.onclick = null;
    const self = this;
    this.classList = {
      add(c) {
        const s = new Set(self.className.split(/\s+/).filter(Boolean));
        s.add(c);
        self.className = [...s].join(" ");
      },
      contains(c) {
        return self.className.split(/\s+/).includes(c);
      },
    };
  }
  set textContent(v) {
    this._text = String(v);
    this.children = [];
  }
  get textContent() {
    return (
      this._text +
      this.children
        .map((c) => (c && typeof c.textContent === "string" ? c.textContent : ""))
        .join("")
    );
  }
  append(...nodes) {
    for (const n of nodes) if (n != null) this.children.push(n);
  }
  replaceChildren(...nodes) {
    this.children = [];
    this._text = "";
    this.append(...nodes);
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
  }
  getAttribute(k) {
    return k in this.attrs ? this.attrs[k] : null;
  }
  get childElementCount() {
    return this.children.filter((c) => c instanceof FakeEl).length;
  }
  scrollIntoView() {}
}

function makeHarness() {
  const byId = new Map();
  const documentStub = {
    createElement: (t) => new FakeEl(t),
    createDocumentFragment: () => new FakeEl("#fragment"),
    createTextNode: (t) => ({ textContent: String(t) }),
  };
  const $ = (id) => {
    if (!byId.has(id)) byId.set(id, new FakeEl("div"));
    return byId.get(id);
  };
  const el = (tag, text, cls) => {
    const n = documentStub.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };
  const shownRefs = [];
  const showRef = (name) => shownRefs.push(name);
  const refsInTrace = (p) => p.__refs || [];
  const names = [
    "resolveReferenceName",
    "usedTraceNames",
    "isWordChar",
    "linkSegments",
    "referenceOnlyMark",
    "applyReferenceOnlyMark",
    "linkedText",
    "refArticle",
    "renderExplanation",
    "renderRefs",
    "fullRefs",
    "updateUsed",
  ];
  const factory = new Function(
    "document",
    "$",
    "el",
    "showRef",
    "refsInTrace",
    "console",
    "let reference = [], active = null, result = null, paths = [], current = 0;\n" +
      extractFunctions(appSource, names) +
      "\nreturn { renderRefs, fullRefs, updateUsed, renderExplanation, refArticle, referenceOnlyMark," +
      " setState(s) { if ('reference' in s) reference = s.reference; if ('active' in s) active = s.active;" +
      " if ('result' in s) result = s.result; if ('paths' in s) paths = s.paths; if ('current' in s) current = s.current; } };",
  );
  const api = factory(documentStub, $, el, showRef, refsInTrace, console);
  return { api, $, shownRefs };
}

function assertMarked(button, r, where) {
  if (r.supported === false) {
    assert.ok(
      button.classList.contains("unsupported"),
      where + " " + r.name + ": unsupported class",
    );
    const tag = button.children.find(
      (c) => c instanceof FakeEl && c.classList.contains("unsupported-tag"),
    );
    assert.ok(tag, where + " " + r.name + ": text tag present (not color-only)");
    assert.equal(tag.textContent, "未対応");
    assert.equal(
      button.getAttribute("aria-label"),
      r.name + "（参照用 · 操作は未対応）",
      where + " " + r.name + ": aria-label",
    );
    assert.equal(button.title, "参照用 · 操作は未対応");
    assert.ok(button.textContent.startsWith(r.name), where + " " + r.name);
  } else {
    assert.ok(
      !button.classList.contains("unsupported"),
      where + " " + r.name + ": supported item must not be marked",
    );
    assert.ok(
      !button.children.some(
        (c) => c instanceof FakeEl && c.classList.contains("unsupported-tag"),
      ),
      where + " " + r.name + ": no tag on supported item",
    );
    assert.equal(button.getAttribute("aria-label"), null);
  }
}

test("R29-N5 referenceOnlyMark helper distinguishes only supported=false", () => {
  const { api } = makeHarness();
  assert.deepEqual(api.referenceOnlyMark({ supported: false }), {
    tag: "未対応",
    ariaSuffix: "（参照用 · 操作は未対応）",
  });
  assert.equal(api.referenceOnlyMark({ supported: true }), null);
  assert.equal(api.referenceOnlyMark({}), null);
  assert.equal(api.referenceOnlyMark(null), null);
});

test("R29-N5 #refList marks exactly the reference-only items (all 15 types, all items)", () => {
  const { api, $ } = makeHarness();
  let marked = 0;
  for (const d of definitions) {
    api.setState({ reference: d.reference });
    $("referenceSearch").value = "";
    api.renderRefs();
    const buttons = $("refList").children.filter((c) => c instanceof FakeEl);
    assert.equal(buttons.length, d.reference.length, d.id);
    d.reference.forEach((r, i) => {
      assertMarked(buttons[i], r, d.id + " #refList");
      if (!r.supported) marked++;
    });
  }
  assert.equal(marked, 74); // 62 + 修正バッチ8 VBA 参照専用12件
});

test("R29-N5 #refList marking survives search filtering", () => {
  const { api, $ } = makeHarness();
  const ij = getDefinition("imagej");
  api.setState({ reference: ij.reference });
  $("referenceSearch").value = "Roi.getBounds";
  api.renderRefs();
  const buttons = $("refList").children.filter((c) => c instanceof FakeEl);
  assert.equal(buttons.length, 1);
  assertMarked(buttons[0], ij.reference.find((r) => r.name === "Roi.getBounds"), "search");
});

test("R29-N5 used chips mark exactly the reference-only items (all items via trace path)", () => {
  const { api, $ } = makeHarness();
  let marked = 0;
  for (const d of definitions) {
    api.setState({ reference: d.reference, active: d, result: {} });
    for (const r of d.reference) {
      api.setState({ paths: [{ __refs: [r.name] }], current: 0 });
      api.updateUsed();
      const chips = $("used").children.filter((c) => c instanceof FakeEl);
      assert.equal(chips.length, 1, d.id + "/" + r.name);
      assertMarked(chips[0], r, d.id + " #used");
      if (!r.supported) marked++;
    }
  }
  assert.equal(marked, 74); // 62 + 修正バッチ8 VBA 参照専用12件
});

test("R29-N5 used chips via scan (pre-run) also mark reference-only items", () => {
  const { api, $ } = makeHarness();
  const ij = getDefinition("imagej");
  api.setState({ reference: ij.reference, active: ij, result: null });
  $("editor").value = "Roi.getBounds(x, y, w, h);\nprint(w);";
  api.updateUsed();
  const chips = $("used").children.filter((c) => c instanceof FakeEl);
  const byName = new Map(
    chips.map((c) => [ij.reference.find((r) => c.textContent.startsWith(r.name)), c]),
  );
  assertMarked(
    byName.get(ij.reference.find((r) => r.name === "Roi.getBounds")),
    ij.reference.find((r) => r.name === "Roi.getBounds"),
    "scan #used",
  );
  assertMarked(
    byName.get(ij.reference.find((r) => r.name === "print")),
    ij.reference.find((r) => r.name === "print"),
    "scan #used",
  );
});

test("R29-N5 template-explanation chips also mark reference-only items", () => {
  const { api, $ } = makeHarness();
  const ij = getDefinition("imagej");
  api.setState({ reference: ij.reference });
  api.renderExplanation({
    title: "合成テンプレート",
    intro: "説明文",
    refs: ["Roi.getBounds", "print"],
  });
  const box = $("templateExplanation");
  const chipsBox = box.children.find(
    (c) => c instanceof FakeEl && c.classList.contains("chips"),
  );
  assert.ok(chipsBox, "chips container");
  const chips = chipsBox.children.filter((c) => c instanceof FakeEl);
  assert.equal(chips.length, 2);
  assertMarked(chips[0], ij.reference.find((r) => r.name === "Roi.getBounds"), "explanation");
  assertMarked(chips[1], ij.reference.find((r) => r.name === "print"), "explanation");
});

test("R29-N5 badge in refArticle is unchanged and consistent with the marks", () => {
  const { api } = makeHarness();
  for (const d of definitions) {
    for (const r of d.reference) {
      const article = api.refArticle(r, true);
      const badge = article.children[0];
      if (!r.supported) {
        assert.equal(badge.textContent, "参照用 · 操作は未対応", d.id + "/" + r.name);
        assert.ok(badge.classList.contains("unsupported"));
      } else {
        assert.equal(badge.textContent, "シミュレーション対応", d.id + "/" + r.name);
      }
    }
  }
});

// ------------------------------------------------------- N5: スタイルと AA
function luminance(hex) {
  const v = hex.replace("#", "");
  const rgb = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  const lin = rgb.map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

test("R29-N5 CSS reuses the badge colors for list buttons and chips (AA)", () => {
  assert.ok(cssSource.includes(".ref-list button.unsupported"));
  assert.ok(cssSource.includes(".chip.unsupported"));
  assert.ok(cssSource.includes(".unsupported-tag"));
  // バッジと同一配色であること（文言・スタイルを揃える）。
  const block = cssSource.slice(cssSource.indexOf(".ref-list button.unsupported"));
  assert.ok(block.includes("background: #fff2df"));
  assert.ok(block.includes("color: #916322"));
  // AA: バッジ配色そのものが 4.5:1 以上（ui班の実測 4.74 と一致すること）。
  const ratio = contrast("#916322", "#fff2df");
  assert.ok(ratio >= 4.5, "badge colors contrast " + ratio.toFixed(2));
});

test("R29-N5 rendering code consults supported on all three surfaces", () => {
  assert.ok(appSource.includes("function referenceOnlyMark(r)"));
  assert.ok(appSource.includes("function applyReferenceOnlyMark(button, r)"));
  const renderRefsBody = appSource.slice(appSource.indexOf("function renderRefs()"));
  assert.ok(renderRefsBody.slice(0, 600).includes("applyReferenceOnlyMark(b, r)"));
  const updateUsedBody = appSource.slice(appSource.indexOf("function updateUsed()"));
  assert.ok(updateUsedBody.slice(0, 1200).includes("applyReferenceOnlyMark("));
  const explanationBody = appSource.slice(
    appSource.indexOf("function renderExplanation(t)"),
  );
  assert.ok(explanationBody.slice(0, 900).includes("applyReferenceOnlyMark("));
});
