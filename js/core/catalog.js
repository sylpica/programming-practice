// 高度モードのカタログ合成（純粋関数のみ・DOM/storage 非依存）。
//
// 状態（status）の3値:
//   "supported"   … シミュレーション対応
//   "unsupported" … 未対応（参照用のみ・操作は未対応）
//   "unverified"  … 未検証（参照用のみ・意味論は未検証）
// 不正・欠落の状態は itemStatus の導出規則で安全側（表示上の導出）に倒す。

const VALID_STATUSES = new Set(["supported", "unsupported", "unverified"]);

export function itemStatus(item) {
  if (item && VALID_STATUSES.has(item.status)) return item.status;
  if (item && item.supported === false) return "unsupported";
  return "supported";
}

const STATUS_INFO = {
  supported: { tag: null, badge: "シミュレーション対応", badgeClass: "", ariaSuffix: "" },
  unsupported: {
    tag: "未対応",
    badge: "参照用 · 操作は未対応",
    badgeClass: " unsupported",
    ariaSuffix: "（参照用 · 操作は未対応）",
  },
  unverified: {
    tag: "未検証",
    badge: "参照用 · 意味論は未検証",
    badgeClass: " unverified",
    ariaSuffix: "（参照用 · 意味論は未検証）",
  },
};

export function statusInfo(status) {
  // 未知の status は itemStatus と同じ導出に倒し、supported の表示を返す。
  const info = STATUS_INFO[status] || STATUS_INFO.supported;
  return { ...info };
}

export function countByStatus(reference) {
  const counts = { total: 0, supported: 0, unsupported: 0, unverified: 0 };
  for (const item of reference || []) {
    counts.total += 1;
    counts[itemStatus(item)] += 1;
  }
  return counts;
}

// base カタログに高度差分を合成する。入力の配列・項目オブジェクトは破壊しない
// （override 適用時は項目を複製してから上書きする）。
export function mergeCatalog(base, advanced) {
  const problems = [];
  const baseReference = base?.reference || [];
  const baseTemplates = base?.templates || [];
  const baseGlossary = base?.glossary || [];
  const {
    referenceAdvanced = [],
    referenceOverrides = [],
    templatesAdvanced = [],
    glossaryAdvanced = [],
  } = advanced || {};

  // (a) base の順序を保持する。
  const reference = [...baseReference];

  // (b) referenceOverrides: name で base 項目を引き、複製に上書きする。
  const indexByName = new Map();
  reference.forEach((item, i) => {
    if (item && item.name !== undefined && !indexByName.has(item.name))
      indexByName.set(item.name, i);
  });
  for (const override of referenceOverrides) {
    const name = override?.name;
    if (name === undefined || !indexByName.has(name)) {
      problems.push({
        kind: "override-missing",
        name: name ?? null,
        detail: `override の対象 "${String(name)}" が base reference に存在しません`,
      });
      continue;
    }
    const idx = indexByName.get(name);
    const cloned = { ...reference[idx] };
    for (const [key, value] of Object.entries(override)) {
      if (key === "name") continue; // name 自体は変更不可
      cloned[key] = value;
    }
    reference[idx] = cloned;
  }

  // (c) + (f) referenceAdvanced: 末尾に追加。重複 name は先行側を残す。
  // status の欠落・不正は problems に記録する（合成は続行）。
  const seenNames = new Set(indexByName.keys());
  for (const item of referenceAdvanced) {
    if (!item || item.status === undefined) {
      problems.push({
        kind: "status-missing",
        name: item?.name ?? null,
        detail: `高度項目 "${String(item?.name)}" に status がありません`,
      });
    } else if (!VALID_STATUSES.has(item.status)) {
      problems.push({
        kind: "status-invalid",
        name: item?.name ?? null,
        detail: `高度項目 "${String(item?.name)}" の status "${String(item?.status)}" は不正です`,
      });
    }
    const name = item?.name;
    if (name !== undefined && seenNames.has(name)) {
      problems.push({
        kind: "duplicate-name",
        name,
        detail: `高度項目 "${String(name)}" の name が重複しているため追加側を破棄しました`,
      });
      continue;
    }
    if (name !== undefined) seenNames.add(name);
    reference.push(item);
  }

  // (d) templatesAdvanced: 末尾に追加。重複 id は先行側を残す。
  const templates = [...baseTemplates];
  const seenTemplateIds = new Set(
    baseTemplates.map((t) => t?.id).filter((id) => id !== undefined),
  );
  for (const tpl of templatesAdvanced) {
    const id = tpl?.id;
    if (id !== undefined && seenTemplateIds.has(id)) {
      problems.push({
        kind: "duplicate-template-id",
        name: id,
        detail: `高度テンプレート "${String(id)}" の id が重複しているため追加側を破棄しました`,
      });
      continue;
    }
    if (id !== undefined) seenTemplateIds.add(id);
    templates.push(tpl);
  }

  // (e) glossaryAdvanced: [word, definition] の組。同語は base を残す。
  const glossary = [...baseGlossary];
  const wordOf = (entry) =>
    Array.isArray(entry) ? entry[0] : entry?.word ?? entry?.id;
  const seenWords = new Set(
    baseGlossary.map(wordOf).filter((w) => w !== undefined),
  );
  for (const entry of glossaryAdvanced) {
    const word = wordOf(entry);
    if (word !== undefined && seenWords.has(word)) {
      problems.push({
        kind: "glossary-duplicate",
        name: word,
        detail: `高度用語 "${String(word)}" は base に存在するため base を残しました`,
      });
      continue;
    }
    if (word !== undefined) seenWords.add(word);
    glossary.push(entry);
  }

  return { reference, templates, glossary, problems };
}
