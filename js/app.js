import { LIMITS, formatValue, refsInTrace } from "./core/contract.js";
import {
  definitions,
  advancedOnlyDefinitions,
  getDefinition,
} from "./types/registry.js";
import { getMode, setMode } from "./core/mode.js";
import {
  itemStatus,
  statusInfo,
  countByStatus,
  mergeCatalog,
} from "./core/catalog.js";
import { loadAdvanced } from "./core/advanced-loader.js";
let active = getDefinition("vba"),
  templates = active.templates,
  reference = active.reference,
  glossary = active.glossary || [];
// 高度モード基盤: 現在のモード（保存が無い・壊れている場合は "simple"）。
let mode = getMode(),
  // カタログ再構築の世代カウンタ。種類切替・モード切替が連続した場合に
  // 古い非同期結果で新しいカタログを上書きしないためのガード。
  catalogGeneration = 0,
  // 直近の高度データ読み込みで failed があったか（modeNote の末尾注記用）。
  catalogFailed = false;
const MODE_NOTES = {
  simple:
    "簡易モード：よく使う関数を中心に収録しています。全ての関数が実装されているわけではありません。網羅的な収録は高度モードにあります。",
  advanced:
    "高度モード：各言語・ツールの関数を網羅的に収録しています。項目ごとに「対応／未対応／未検証」を表示します。",
};
let drafts = {},
  editorPlugin = null,
  storageBlocked = false,
  // R7-50: 起動時に部分的な型破損を検出して原文退避＋整復した場合の通知フラグ。
  recoveredDraftNotice = false,
  // S-N2: 保全書き込みに失敗した原文。save() のたびに再試行し、
  // 全て成功するまで破損データを上書きしない（保全設計は維持する）。
  pendingRecoveries = [];
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
      // R7-50: 下書き項目単位で型検証する。部分的に壊れた下書き（code が
      // 文字列でない等）は、原文を recovery へ退避し、壊れた項目だけを
      // 取り除いてから使う（原文を残さず自動上書きしない）。
      let sanitized = sanitizeDrafts(saved.drafts);
      drafts = sanitized.drafts;
      if (sanitized.invalid) {
        recoveredDraftNotice = true;
        try {
          localStorage.setItem("programming-practice-recovery-v3", raw);
        } catch {
          storageBlocked = true;
          pendingRecoveries = [
            ...pendingRecoveries,
            { key: "programming-practice-recovery-v3", raw },
          ];
        }
      }
      active = getDefinition(saved.active);
    } catch {
      try {
        localStorage.setItem("programming-practice-recovery-v3", raw);
      } catch {
        storageBlocked = true;
        pendingRecoveries.push({
          key: "programming-practice-recovery-v3",
          raw,
        });
      }
    }
  }
} catch {
  storageBlocked = true;
}

if (!Object.keys(drafts).length) {
  try {
    let raw = localStorage.getItem("macro-practice-v2");
    // R22-N27: 構文的に壊れた JSON でも原文を recovery へ保全する。
    // 判定は純関数 parseLegacyV2 に寄せ、パース失敗をここで握り潰さない。
    let migrated = parseLegacyV2(raw);
    if (migrated.kind === "drafts") {
      // R7-50: v2 移行分も v3 と同じ項目単位の型検証を通す。
      let sanitized = sanitizeDrafts(migrated.drafts);
      drafts = sanitized.drafts;
      if (sanitized.invalid) {
        recoveredDraftNotice = true;
        try {
          localStorage.setItem("programming-practice-recovery-v2", raw);
        } catch {
          storageBlocked = true;
          pendingRecoveries = [
            ...pendingRecoveries,
            { key: "programming-practice-recovery-v2", raw: migrated.raw },
          ];
        }
      }
      active = getDefinition(migrated.active);
    } else if (migrated.kind === "recovery") {
      try {
        localStorage.setItem("programming-practice-recovery-v2", migrated.raw);
      } catch {
        storageBlocked = true;
        pendingRecoveries.push({
          key: "programming-practice-recovery-v2",
          raw: migrated.raw,
        });
      }
    }
  } catch {}
}
if (!drafts.vba) {
  try {
    // S-N3: v1 分岐も v2/v3 と同等に形状検証する。文字列・配列などを
    // 無検証で取り込むと数字キーとして下書きへ混入・永続化するため、
    // 判定は純関数 parseLegacyV1 に寄せる。
    let migrated = parseLegacyV1(localStorage.getItem("vba-practice-v1"));
    if (migrated.kind === "draft") {
      // R7-50: v1 移行分も項目単位の型検証を通す。
      let sanitized = sanitizeDrafts({ vba: migrated.draft });
      if (sanitized.drafts.vba) drafts.vba = sanitized.drafts.vba;
      if (sanitized.invalid) recoveredDraftNotice = true;
    }
  } catch {}
}
// RG-86: 起動時点の下書きスナップショット。save() はこれを基準に
// 「このタブが変更した種類」だけを自分の版で確定し、未変更の種類は
// 保存済み（他タブが書いた）版を採用する。複数タブで開いても、他タブの
// 下書きが丸ごと上書きで無言消失しないようにするための基準点。
let baseDrafts = structuredClone(drafts);
import { decodeFile, MAX_FILE_BYTES } from "./import.js";
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
  // R22-N25: 利用者が明示的にテンプレートを選んだ直後の changed() では
  // 選択表示と解説を切り離さないための一回限りの保持フラグ。
  // loadTemplate が立て、changed() が消費する。その後の追加編集では
  // フラグがないため従来どおり「なし」へ切り離される。
  preserveTemplateSelection = false,
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
      // R7-50（兄弟表面）：他タブが書いた保存済み下書きにも型破損が
      // あり得るため、マージへ渡す前に同じ項目単位検証で整復する。
      // 整復しないと文字列エントリが数字キーへ分解されて再永続化する。
      storedDrafts = sanitizeDrafts(saved.drafts).drafts;
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
    if (storageBlocked) {
      // S-N2: 一過性の保全失敗でセッション中ラッチさせず、保存のたびに
      // 保全書き込みを再試行する。全て保全できるまでは従来どおり
      // 破損データを上書きしない。
      pendingRecoveries = retryPendingRecoveries(
        pendingRecoveries,
        localStorage,
      );
      if (pendingRecoveries.length)
        throw Error("保存データを保護しています");
      storageBlocked = false;
    }
    localStorage.setItem(
      "programming-practice-v3",
      JSON.stringify({ active: active.id, drafts }),
    );
    baseDrafts = structuredClone(drafts);
    // S-N1: 保存が成功したら保存失敗の通知を消す。
    $("storageNotice").hidden = true;
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
  // R22-N25: 明示的なテンプレート選択直後は保持フラグを消費して切り離さない。
  const preserve = preserveTemplateSelection;
  preserveTemplateSelection = false;
  const nextTemplateId = templateSelectionAfterChange(
    templateId,
    templates,
    $("editor").value,
    preserve,
  );
  if (nextTemplateId !== templateId) {
    templateId = nextTemplateId;
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
  // R7-128: 未解消のアクション欄エラーは、他の変更で痕跡なく消えないよう
  // 状態欄へ出し直す。
  if (editorPlugin?.hasPendingError?.())
    $("resultStatus").textContent = editorPlugin.getPendingError();
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
  // R22-N25: 復元したコードが下書き（テンプレート原本と異なる）でも、
  // 利用者が明示的に選んだ直後は選択表示と解説を維持する。
  preserveTemplateSelection = true;
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
// R22-N25: changed() でのテンプレート切り離し判定（純関数）。
// preserve が真（明示的なテンプレート選択直後）なら、コードが下書きで
// テンプレート原本と異なっても選択を維持する。preserve が偽なら従来
// どおり、選択中テンプレートの原本と異なるコードでは "" に切り離す。
function templateSelectionAfterChange(templateId, templatesList, editorValue, preserve) {
  if (preserve) return templateId;
  const selected = (templatesList || []).find((t) => t.id === templateId);
  return selected && editorValue !== selected.code ? "" : templateId;
}
// R22-N25: 種類切替・起動時の復元で表示するテンプレート選択（純関数）。
// 選択が記録されている場合は、復元コードが下書きで原本と異なっても
// その選択を維持する。選択が記録されていない旧形式データでは、
// 復元コードが先頭テンプレートの原本と一致する場合だけ先頭を選ぶ
// （異なる下書きを無関係なテンプレートに帰属させない、従来の扱い）。
function restoredTemplateSelection(saved, templatesList) {
  const list = templatesList || [];
  const first = list[0];
  const recorded = saved?.templateId;
  if (recorded) return list.some((t) => t.id === recorded) ? recorded : "";
  if (recorded === "") return "";
  const code = saved?.code ?? first?.code ?? "";
  return first && code === first.code ? first.id : "";
}
// R22-N27: 旧形式 v2 保存データの移行判定（純関数）。戻り値は
// { kind: "empty" } / { kind: "drafts", drafts, active } /
// { kind: "recovery", raw } のいずれか。構文的に壊れた JSON は例外を
// 投げず recovery として返し、呼び出し側が原文を保全できるようにする。
// 「JSON として正しいが形式不正」の場合も従来どおり recovery とする。
function parseLegacyV2(raw) {
  if (!raw) return { kind: "empty" };
  let interim;
  try {
    interim = JSON.parse(raw);
  } catch {
    return { kind: "recovery", raw };
  }
  if (!interim) return { kind: "empty" };
  if (
    interim.drafts &&
    typeof interim.drafts === "object" &&
    !Array.isArray(interim.drafts)
  )
    return { kind: "drafts", drafts: interim.drafts, active: interim.active };
  return { kind: "recovery", raw };
}
// S-N3: 旧形式 v1 保存データの移行判定（純関数）。v1 は下書きエントリ
// 自体（{code, model,...}）であり、退避先キーの仕組みがないため、
// オブジェクト（配列でない）場合のみ { kind: "draft" } として取り込み、
// 文字列・配列・数値・真偽値・壊れた JSON は移行対象外として無視する。
function parseLegacyV1(raw) {
  if (!raw) return { kind: "empty" };
  let interim;
  try {
    interim = JSON.parse(raw);
  } catch {
    return { kind: "empty" };
  }
  if (interim && typeof interim === "object" && !Array.isArray(interim))
    return { kind: "draft", draft: interim };
  return { kind: "empty" };
}
// R7-50: 下書き項目単位の型検証（純関数）。保存データが JSON として
// 読めても、個別の下書きが部分的に型破損している場合（code が文字列で
// ない、種類エントリが文字列、byTemplate のスロットが壊れている等）は、
// 壊れた項目だけを取り除いた整復済み下書きと invalid フラグを返す。
// 呼び出し側は invalid の場合に原文を recovery へ退避し、通知する。
// 文字列エントリをそのまま使うと数字キーへ分解されて永続化するため、
// エントリ単位で落とすことが要点。
function isPlainRecord(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function sanitizeDraftSnapshotFields(entry) {
  let invalid = false;
  for (const f of ["code", "templateId", "draftOrigin", "sort"])
    if (entry[f] !== undefined && typeof entry[f] !== "string") {
      delete entry[f];
      invalid = true;
    }
  if (
    entry.modelText !== undefined &&
    entry.modelText !== null &&
    typeof entry.modelText !== "string"
  ) {
    delete entry.modelText;
    invalid = true;
  }
  if (entry.auto !== undefined && typeof entry.auto !== "boolean") {
    delete entry.auto;
    invalid = true;
  }
  if (
    entry.pathId !== undefined &&
    entry.pathId !== null &&
    typeof entry.pathId !== "number"
  ) {
    delete entry.pathId;
    invalid = true;
  }
  if (
    entry.model !== undefined &&
    entry.model !== null &&
    !isPlainRecord(entry.model)
  ) {
    delete entry.model;
    invalid = true;
  }
  return invalid;
}
function sanitizeDrafts(input) {
  if (!isPlainRecord(input)) return { drafts: {}, invalid: true };
  let out = {},
    invalid = false;
  for (const [id, entry] of Object.entries(input)) {
    if (!isPlainRecord(entry)) {
      invalid = true;
      continue;
    }
    let clean = { ...entry };
    if (sanitizeDraftSnapshotFields(clean)) invalid = true;
    if (clean.byTemplate !== undefined) {
      if (!isPlainRecord(clean.byTemplate)) {
        delete clean.byTemplate;
        invalid = true;
      } else {
        let bt = {};
        for (const [tid, slot] of Object.entries(clean.byTemplate)) {
          if (!isPlainRecord(slot)) {
            invalid = true;
            continue;
          }
          const codeBad =
            slot.code !== undefined && typeof slot.code !== "string";
          let s = { ...slot };
          if (sanitizeDraftSnapshotFields(s)) invalid = true;
          if (codeBad) {
            // コード自体が壊れたスロットは内容を失っているため落とす。
            invalid = true;
            continue;
          }
          bt[tid] = s;
        }
        clean.byTemplate = bt;
      }
    }
    if (clean.freeDraft !== undefined) {
      if (!isPlainRecord(clean.freeDraft)) {
        delete clean.freeDraft;
        invalid = true;
      } else if (
        clean.freeDraft.code !== undefined &&
        typeof clean.freeDraft.code !== "string"
      ) {
        delete clean.freeDraft;
        invalid = true;
      } else {
        let fd = { ...clean.freeDraft };
        if (sanitizeDraftSnapshotFields(fd)) invalid = true;
        clean.freeDraft = fd;
      }
    }
    out[id] = clean;
  }
  return { drafts: out, invalid };
}
// R7-134: 最終状態欄のエラー分類（純関数）。モデル検証エラーは構文エラー
// と表示せず、モデルの修正を促す文言にする。
function finalErrorMessage(error) {
  if (error?.category === "モデルエラー")
    return "モデルの確認で停止しました。モデルを修正して再実行してください。実行結果はありません。";
  return "構文の確認で停止しました。実行結果はありません。";
}
// S-N2: 保全書き込みの再試行（純関数）。storage は setItem を持つ
// ストレージ互換オブジェクト。書き込めた分は落とし、失敗した分だけを
// 残りとして返す。呼び出し側は残りが空になるまで通常保存へ進まない。
function retryPendingRecoveries(pending, storage) {
  let remaining = [];
  for (let item of pending || []) {
    try {
      storage.setItem(item.key, item.raw);
    } catch {
      remaining.push(item);
    }
  }
  return remaining;
}
// A-N7: prefers-reduced-motion が有効な場合はスムーズスクロールを使わない。
function preferredScrollBehavior() {
  let reduced = false;
  try {
    reduced = !!globalThis.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  } catch {}
  return reduced ? "auto" : "smooth";
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
// R7-127: 従来の {...stored, ...mine} 合成では、自タブが保持する古い
// スロット写しが他タブの新しい保存を上書きして巻き戻していた。スロット
// 単位で base と比較し、このタブが base から変更したスロットだけ自分の
// 版を採用し、未変更のスロットは stored（他タブ）の版を採用する。
// トップレベルのスナップショット項目（code 等）も同じ規則で選ぶ。
function mergeActivePrevious(baseEntry, mineEntry, storedEntry) {
  // R7-50（防御）：レコードでないエントリは「無いもの」として扱い、
  // 分解（{..."abc"} の数字キー化）を持ち込まない。
  if (baseEntry && (typeof baseEntry !== "object" || Array.isArray(baseEntry)))
    baseEntry = null;
  if (mineEntry && (typeof mineEntry !== "object" || Array.isArray(mineEntry)))
    mineEntry = null;
  if (
    storedEntry &&
    (typeof storedEntry !== "object" || Array.isArray(storedEntry))
  )
    storedEntry = null;
  if (!storedEntry) return mineEntry || {};
  if (!mineEntry) return storedEntry;
  if (JSON.stringify(mineEntry) === JSON.stringify(storedEntry)) return mineEntry;
  const strip = (e) => {
    const { byTemplate, freeDraft, ...rest } = e || {};
    return rest;
  };
  const mineChangedTop =
    JSON.stringify(strip(mineEntry)) !== JSON.stringify(strip(baseEntry || {}));
  const merged = { ...(mineChangedTop ? strip(mineEntry) : strip(storedEntry)) };
  let byTemplate = {};
  const slotIds = new Set([
    ...Object.keys(baseEntry?.byTemplate || {}),
    ...Object.keys(mineEntry.byTemplate || {}),
    ...Object.keys(storedEntry.byTemplate || {}),
  ]);
  for (const id of slotIds) {
    const mineSlot = mineEntry.byTemplate?.[id];
    const storedSlot = storedEntry.byTemplate?.[id];
    const changed =
      JSON.stringify(mineSlot ?? null) !==
      JSON.stringify(baseEntry?.byTemplate?.[id] ?? null);
    const v = changed ? mineSlot : storedSlot !== undefined ? storedSlot : mineSlot;
    if (v !== undefined) byTemplate[id] = v;
  }
  if (
    Object.keys(byTemplate).length ||
    mineEntry.byTemplate ||
    storedEntry.byTemplate
  )
    merged.byTemplate = byTemplate;
  const freeDraft =
    JSON.stringify(mineEntry.freeDraft ?? null) !==
    JSON.stringify(baseEntry?.freeDraft ?? null)
      ? mineEntry.freeDraft
      : storedEntry.freeDraft;
  if (freeDraft !== undefined) merged.freeDraft = freeDraft;
  return merged;
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
// R29-N5（U-45）: 参照専用（supported=false）項目を、コード練習ビューの
// リファレンス一覧（#refList）と使用中チップでも対応項目と判別できるように
// するための表示情報。文言はリファレンスビューのバッジ
// （refArticle の「参照用 · 操作は未対応」）と揃える。色だけに頼らず、
// ボタン／チップの本文にも「未対応」のテキストタグを付ける。
// 高度モード基盤: 3値ステータス（supported／unsupported／unverified）へ
// 一般化した。判定と文言は基盤 API（itemStatus／statusInfo）を正とする。
// このブロックは単体テストがソース抽出して実行するため、import が
// 解決できない抽出環境では基盤 API と同一規則のフォールバックを使う。
// 状態導出の単一窓口。実環境では基盤 API の itemStatus を正とし、
// ソース抽出テスト環境（itemStatus が無い）では catalog.js と同一規則の
// 導出にフォールバックする（status は3値のいずれかの場合のみ採用し、
// それ以外は supported から導出する。監査 D-4 の是正：生の status 文字列を
// そのまま使うと件数表示（itemStatus）とフィルタ・タグが食い違う）。
function statusWithFallback(r) {
  if (typeof itemStatus === "function") return itemStatus(r);
  const s = r?.status;
  if (s === "supported" || s === "unsupported" || s === "unverified") return s;
  return r?.supported === false ? "unsupported" : "supported";
}
function referenceOnlyMark(r) {
  if (!r) return null;
  let info;
  if (typeof itemStatus === "function" && typeof statusInfo === "function")
    info = statusInfo(itemStatus(r));
  else {
    // 抽出環境用の自己完結フォールバック。導出規則は catalog.js の
    // itemStatus と同一（status は3値の場合のみ採用、それ以外は
    // supported から導出。監査 D-4 の是正）。
    let status =
      r.status === "supported" ||
      r.status === "unsupported" ||
      r.status === "unverified"
        ? r.status
        : r.supported === false
          ? "unsupported"
          : "supported";
    info =
      status === "unsupported"
        ? { tag: "未対応", ariaSuffix: "（参照用 · 操作は未対応）" }
        : status === "unverified"
          ? { tag: "未検証", ariaSuffix: "（参照用 · 意味論は未検証）" }
          : { tag: null, ariaSuffix: "" };
  }
  if (!info || !info.tag) return null;
  return { tag: info.tag, ariaSuffix: info.ariaSuffix };
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
    applyReferenceOnlyMark(
      b,
      reference.find((x) => x.name === name),
    );
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
// R29-N5（U-45）: 一覧ボタン／チップに参照専用の判別表示を付ける。
// .unsupported の配色はバッジ（.badge.unsupported）と同一にし、
// 「未対応」タグ（テキスト）と aria-label でも区別する（色のみに依存しない）。
// 高度モード基盤: unverified はタグ「未検証」・クラス unverified で
// 判別する（文言自体が異なるため色だけに頼らない）。unsupported の
// 表示（タグ・クラス・aria・title）は従来と完全に同一に保つ。
function applyReferenceOnlyMark(button, r) {
  const mark = referenceOnlyMark(r);
  if (!mark) return;
  if (mark.tag === "未検証") {
    button.classList.add("unverified");
    button.append(el("span", mark.tag, "unsupported-tag unverified"));
    button.setAttribute("aria-label", r.name + mark.ariaSuffix);
    button.title = "参照用 · 意味論は未検証";
    return;
  }
  button.classList.add("unsupported");
  button.append(el("span", mark.tag, "unsupported-tag"));
  button.setAttribute("aria-label", r.name + mark.ariaSuffix);
  button.title = "参照用 · 操作は未対応";
}
function refArticle(r, expanded = false, heading = "h3") {
  // 高度モード基盤: バッジは3値ステータス（基盤 API の statusInfo）を正とする。
  // 単体テストのソース抽出環境では同一規則のフォールバックを使う。
  // supported／unsupported の文言とクラスは従来と完全に同一。
  let info;
  if (typeof itemStatus === "function" && typeof statusInfo === "function")
    info = statusInfo(itemStatus(r));
  else {
    let status = r.status
      ? r.status
      : r.supported === false
        ? "unsupported"
        : "supported";
    info =
      status === "unsupported"
        ? { badge: "参照用 · 操作は未対応", badgeClass: " unsupported" }
        : status === "unverified"
          ? { badge: "参照用 · 意味論は未検証", badgeClass: " unverified" }
          : { badge: "シミュレーション対応", badgeClass: "" };
  }
  let article = el("article", undefined, expanded ? "" : "ref-card");
  article.append(
    el("span", info.badge, "badge" + info.badgeClass),
    el(heading, r.name),
    el("pre", r.syntax),
    el("p", r.description),
    ...(r.returns ? [el("p", "戻り値：" + r.returns)] : []),
    el("pre", r.example),
    // R22-N26: caution が空なら空の要素自体を描画しない。
    ...(r.caution ? [el("p", r.caution, "caution")] : []),
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
  $("refDetail").scrollIntoView({
    behavior: preferredScrollBehavior(),
    block: "nearest",
  });
}
// 統合第1弾（B5 §3 の機構側要件）: 検索の索引には、項目名・分類・
// 説明・構文に加えて、高度項目が持つ到達性メタデータ（inventoryNames
// ＝束ねられた棚卸し名の配列、scan ＝コード上の短いトークン）も含める。
// これが無いと、束ね項目へ統合された棚卸し名（例: JS の
// DataView.prototype.buffer）で検索しても自項目に到達できない。
// メタデータを持たない基礎項目では従来と同一の文字列になる。
function refSearchText(r) {
  let parts = [r.name, r.category, r.description, r.syntax];
  if (Array.isArray(r.inventoryNames)) parts.push(...r.inventoryNames);
  if (typeof r.scan === "string") parts.push(r.scan);
  return parts.filter((x) => typeof x === "string").join(" ").toLowerCase();
}
function renderRefs() {
  let q = $("referenceSearch").value.toLowerCase();
  let f = $("refStatusFilter")?.value || "all";
  $("refList").replaceChildren();
  for (let r of reference.filter(
    (r) =>
      refSearchText(r).includes(q) &&
      // 状態判定は statusWithFallback（itemStatus が正。監査 D-4）。
      (f === "all" || statusWithFallback(r) === f),
  )) {
    let b = el("button", r.name);
    applyReferenceOnlyMark(b, r);
    b.onclick = () => showRef(r.name);
    $("refList").append(b);
  }
  if (!$("refList").childElementCount)
    $("refList").append(el("p", "該当する項目はありません。"));
}
function fullRefs() {
  let q = $("fullSearch").value.toLowerCase();
  let f = $("refStatusFilter")?.value || "all";
  $("fullReferences").replaceChildren();
  for (let r of reference.filter(
    (r) =>
      refSearchText(r).includes(q) &&
      (f === "all" || statusWithFallback(r) === f),
  ))
    $("fullReferences").append(refArticle(r, false, "h2"));
  if (!$("fullReferences").childElementCount)
    $("fullReferences").append(el("p", "該当する項目はありません。"));
}
$("referenceSearch").oninput = renderRefs;
$("fullSearch").oninput = fullRefs;
// 高度モード基盤: 状態フィルタは保存しない（開くたび "all"）。
// fullRefs() と renderRefs() の両方へ適用する。
$("refStatusFilter").onchange = () => {
  renderRefs();
  fullRefs();
};
// 現在の種類・現在のモードのカタログでの状態別件数表示。
function updateRefStatusSummary() {
  let counts = countByStatus(reference);
  $("refStatusSummary").textContent =
    "対応 " +
    counts.supported +
    " 件／未対応 " +
    counts.unsupported +
    " 件／未検証 " +
    counts.unverified +
    " 件（全 " +
    counts.total +
    " 件）";
}
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
    // 統合第1弾: scan 結果にフックの注記（CFN の台帳外タイプ注記等）が
    // 付いている場合はそちらを表示し、無ければ前の注記を消す（配列の
    // notes プロパティ。結果が無い状態では scan 側が注記の正）。
    renderResultNotes(Array.isArray(names) ? names.notes : null);
    $("usedScope").textContent = "コード全体";
  }
  $("used").replaceChildren();
  for (let name of names) {
    let b = el("button", name, "chip");
    applyReferenceOnlyMark(
      b,
      reference.find((r) => r.name === name),
    );
    b.onclick = () => showRef(name);
    $("used").append(b);
  }
  if (!names.length)
    $("used").append(el("span", "該当する項目はありません。", "muted"));
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
  editor.scrollIntoView({
    behavior: preferredScrollBehavior(),
    block: "center",
  });
}
function errorDescription(error) {
  const { category, message } = error;
  return category && category !== "エラー" && !message.startsWith(category + "：") ? category + "：" + message : message;
}
// 統合第1弾: 高度エンジンフック（CloudFormation の台帳外タイプ注記等）
// が結果や scan に付けた注記（notes）の描画。注記は成否・パス・エラー
// に影響しない告知であり、高度モードでのみ表示する（簡易モードでは
// 基礎の見た目を完全に保つ）。notes が無い・空なら枠ごと隠す。
function renderResultNotes(notes) {
  const box = $("resultNotes");
  if (!box) return;
  const list =
    mode === "advanced" && Array.isArray(notes)
      ? notes.filter((n) => typeof n === "string" && n)
      : [];
  box.replaceChildren();
  box.hidden = !list.length;
  for (let note of list) box.append(el("p", note));
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
  // 統合第1弾: フックが結果へ付けた注記（あれば）をステータス下に表示。
  renderResultNotes(r.notes);
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
    $("final").textContent = finalErrorMessage(r.error);
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
  // A-N5: 打ち切りの事実と詳細は視覚表示 (#limit) だけでなく、
  // live region (#resultStatus) の文言にも含め、支援技術へ伝える。
  const limitText = r.truncated
    ? `最大${r.limits?.paths ?? LIMITS.paths}件までです。すべての分岐パスは表示されていません。${r.reasons?.join("、") || "探索上限"}により打ち切りました。`
    : "";
  $("resultStatus").textContent =
    `${paths.length}件のパス · ${active.model.title}に基づく説明` +
    (limitText ? `。${limitText}` : "");
  $("limit").hidden = !r.truncated;
  if (r.truncated) $("limit").textContent = limitText;
  renderPath();
}
function run() {
  // R7-128: アクション欄に未反映の不正入力がある間は、古い値で正常実行
  // せず、エラーを状態欄に残したまま実行を抑止する。
  if (editorPlugin?.hasPendingError?.()) {
    $("run").disabled = false;
    $("resultStatus").textContent =
      editorPlugin.getPendingError() +
      "（アクション欄の入力が未反映のため実行しませんでした）";
    return;
  }
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
      // P-N1 副次表面: onerror は開始失敗だけでなく実行中の異常終了
      // （メモリ不足で Worker が死ぬ場合など）でも発火する。「開始でき
      // ません」「開き直してください」という原因と合わない文言にせず、
      // どちらの場合でも成り立つ案内にする。
      $("resultStatus").textContent =
        "解析用Workerでエラーが発生しました。コードを小さくして再実行してください。";
    };
    // 統合第1弾: Worker 内でも高度エンジンを有効化できるよう、現在の
    // モードとカタログ適用の成否を渡す（Worker は実行ごとに作り直され、
    // メインスレッドの有効化状態を引き継がないため）。
    worker.postMessage({
      id,
      code,
      model,
      typeId: active.id,
      advanced: mode === "advanced" && !catalogFailed,
    });
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
    if (file.size > MAX_FILE_BYTES) throw Error("ファイルは300KB以内にしてください。");
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
// 高度モード基盤: モード開示文。モード文面は常時表示し、高度データの
// 一部が読み込めなかった場合だけ末尾に注記を付ける。
function renderModeNote() {
  let note = MODE_NOTES[mode] || MODE_NOTES.simple;
  if (mode === "advanced" && catalogFailed)
    note += "（高度データの一部を読み込めませんでした）";
  $("modeNote").textContent = note;
}
function updateModeToggle() {
  $("modeSimple").setAttribute(
    "aria-pressed",
    mode === "simple" ? "true" : "false",
  );
  $("modeAdvanced").setAttribute(
    "aria-pressed",
    mode === "advanced" ? "true" : "false",
  );
  renderModeNote();
}
// 高度モード基盤: 現在種類のカタログを現在のモードで再構築する。
// simple は基礎カタログをそのまま使う。advanced は loadAdvanced を
// await し、mergeCatalog の結果を使う。読み込み中は基礎カタログの
// 表示のまま待ち（偽の件数や項目を出さない）、完了後に差し替える。
// 世代カウンタで、種類切替・モード切替が連続した場合の古い非同期
// 結果による上書きを防ぐ。エディタのコード文字列は変更しない。
async function applyCatalog() {
  let generation = ++catalogGeneration;
  let target = active;
  if (mode !== "advanced") {
    catalogFailed = false;
    reference = target.reference;
    templates = target.templates;
    glossary = target.glossary || [];
  } else {
    let loaded = null,
      loadError = false;
    try {
      loaded = await loadAdvanced(target);
    } catch {
      loadError = true;
    }
    // 読み込み中に種類・モードが変わっていたら、この結果は破棄する。
    if (generation !== catalogGeneration || active !== target) return;
    if (loadError || (loaded?.failed && loaded.failed.length)) {
      // 契約 §7.1（advanced-interface.md）: 読み込み失敗（failed）がある場合は
      // 部分合成せず、基礎カタログのみで動作する（監査 D-1 の是正）。
      // 失敗の事実は catalogFailed 経由で modeNote の注記に表示する。
      catalogFailed = true;
      reference = target.reference;
      templates = target.templates;
      glossary = target.glossary || [];
    } else {
      let merged = mergeCatalog(
        {
          reference: target.reference,
          templates: target.templates,
          glossary: target.glossary || [],
        },
        loaded,
      );
      // 統合第1弾: エンジン拡張フック（契約 第5章(e)）の接続。合成が
      // 成功した場合に限り、ローダーが返した engineModule の
      // applyAdvancedEngine(definition, merged) を1回呼ぶ。フックは
      // 冪等であることが各ブロックの前提（有効化フラグ／登録／包みの
      // 二重適用ガード）。フックが例外を投げた場合は、高度側が半端に
      // 有効化された状態を避けるため、読み込み失敗と同じ扱い（基礎
      // カタログのみ＋失敗注記）に倒す。
      let hookFailed = false;
      const engineModule = loaded?.engineModule;
      if (engineModule && typeof engineModule.applyAdvancedEngine === "function") {
        try {
          const hooked = engineModule.applyAdvancedEngine(target, merged);
          // 戻り値で包んだ定義を返すフック（現行ブロックでは不在だが
          // 契約上ありうる）にも追従する：scan／simulate だけを引き継ぐ。
          if (hooked && hooked !== target) {
            if (typeof hooked.scan === "function") target.scan = hooked.scan;
            if (typeof hooked.simulate === "function")
              target.simulate = hooked.simulate;
          }
        } catch {
          hookFailed = true;
        }
      }
      if (merged.problems?.length)
        console.info(
          "高度カタログの合成で契約違反を検出しました：" +
            merged.problems.map((p) => `${p.kind}:${p.name}`).join(", "),
        );
      if (hookFailed) {
        catalogFailed = true;
        reference = target.reference;
        templates = target.templates;
        glossary = target.glossary || [];
      } else {
        catalogFailed = false;
        reference = merged.reference;
        templates = merged.templates;
        glossary = merged.glossary || [];
      }
    }
  }
  // 統合第1弾: 種類側の scan／名前解決が「いま有効なカタログ」を参照
  // するための機構側の差し込み（cmd／UI.Vision／Python が利用する。
  // 未設定のまま使う単体テスト環境では各種類の従来動作になる）。
  target.__catalogReference = reference;
  renderModeNote();
  // 再構築後のカタログに現在のテンプレートが無ければ選択を外す
  // （解説は消すが、エディタのコード文字列は変更しない）。
  if (templateId && !templates.some((t) => t.id === templateId))
    templateId = "";
  renderTemplates();
  $("template").value = templateId;
  renderGlossary();
  renderRefs();
  fullRefs();
  updateRefStatusSummary();
  renderExplanation(
    templateId ? templates.find((t) => t.id === templateId) : null,
  );
  // チップの状態タグを新しいカタログで付け直すため再解析する。
  run();
}
// 高度モード基盤: トグル操作。保存し、トグル表示と開示文を更新して
// 現在種類のカタログを再構築する。エディタ・下書きには触れない
// （applyCatalog／run はコード文字列を変更しない）。
function changeMode(next) {
  if (next !== "simple" && next !== "advanced") return;
  mode = next;
  setMode(mode);
  catalogFailed = false;
  updateModeToggle();
  // 統合第1弾: 高度モードでのみ現れる種別（U-47）の表示を切り替える。
  renderTypeOptions();
  if (active.advancedOnly && mode !== "advanced") {
    // 表示できなくなった種別に留まらない。下書きは switchType の
    // save() で退避され、高度モードへ戻れば復元できる。
    switchType("vba");
    return;
  }
  applyCatalog();
}
$("modeSimple").onclick = () => changeMode("simple");
$("modeAdvanced").onclick = () => changeMode("advanced");
function switchType(id, savePrevious = true) {
  if (savePrevious) save();
  worker?.terminate();
  clearTimeout(timer);
  clearTimeout(watchdog);
  request++;
  active = getDefinition(id);
  // 統合第1弾: 高度モード専用種別は簡易モードでは開かない（防御的
  // フォールバック。通常はセレクタに現れないため到達しない）。
  if (active.advancedOnly && mode !== "advanced") active = getDefinition("vba");
  templates = active.templates;
  reference = active.reference;
  glossary = active.glossary || [];
  // 統合第1弾: 有効カタログの差し込み（applyCatalog が高度分で更新する）。
  active.__catalogReference = active.reference;
  renderResultNotes(null);
  // 高度モード基盤: 種類が変わるので、進行中の高度データ読み込みは
  // 世代カウンタで無効化し、失敗注記も基礎カタログ用にリセットする。
  catalogGeneration++;
  catalogFailed = false;
  renderModeNote();
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
  updateRefStatusSummary();
  $("refDetail").replaceChildren(...refArticle(reference[0], true).childNodes);
  let saved = drafts[active.id],
    first = templates[0];
  // R22-N25: 種類切替時の復元でも、記録されたテンプレート選択は
  // 復元コードが下書き（原本と異なる）という理由で切り離さない。
  templateId = restoredTemplateSelection(saved, templates);
  $("template").value = templateId;
  $("editor").value = saved?.code ?? first?.code ?? "";
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
  // 高度モード基盤: 基礎カタログで即時描画してから、高度モードなら
  // 高度データの読み込みとマージで再構築する。
  if (mode === "advanced") applyCatalog();
}
// 統合第1弾: 種別セレクタの選択肢はモードで変わる（高度モードでのみ
// 現れる種別 U-47 を含めるかどうか）。現在の種別が選択肢に残る場合は
// その選択を保つ。
function renderTypeOptions() {
  const visible =
    mode === "advanced"
      ? [...definitions, ...advancedOnlyDefinitions]
      : definitions;
  $("macroType").replaceChildren();
  for (let type of visible) {
    let option = el("option", type.name);
    option.value = type.id;
    $("macroType").append(option);
  }
  $("macroType").value = active.id;
}
renderTypeOptions();
$("macroType").onchange = (e) => switchType(e.target.value);
$("modelJson").oninput = changed;
// 高度モード基盤: 起動時の保存モードをトグル表示と開示文へ反映する。
updateModeToggle();
switchType(active.id, false);
// R7-50: 起動時に壊れた下書きを退避・整復した場合は、その旨を通知する。
// switchType 内の save() が成功しても消えないよう、初期化の最後で出す。
if (recoveredDraftNotice) $("recoveryNotice").hidden = false;
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
