// 高度モード差分ファイルのローダー。
//
// 種類ごとのディレクトリ（js/types/<id>/）に置かれた高度差分ファイルを
// dynamic import で読み込み、mergeCatalog が受け取れる形に集約する。
// import の失敗は例外として外に投げず、戻り値の loaded/missing/failed で表現する:
//   loaded  … 正常に読み込み、内容も妥当だったファイル
//   missing … 既定ファイルが無い（＝追加なしとして正常扱い）
//   failed  … manifest に明示されたファイルの失敗、または内容不正
//             （呼び出し側が利用者に知らせるための材料）
// 1つのファイルは loaded／missing／failed のいずれか1つにだけ入る。
// manifest にキーが書かれていない項目は「既定ファイル」として扱い、
// 不存在は failed ではなく missing に入る（監査 D-2 の是正）。
// failed を含む結果はキャッシュしない（次回アクセスで再試行する。監査 D-7）。

const MANIFEST_FILE = "advanced-manifest.js";
const DEFAULT_MANIFEST = {
  referenceParts: ["reference-advanced.js"],
  templatesFile: "templates-advanced.js",
  glossaryFile: "glossary-advanced.js",
  engineFile: null,
};

const cache = new Map();

export function clearAdvancedCache() {
  cache.clear();
}

function specifierFor(definition, options, file) {
  if (options.baseUrl) {
    const base = String(options.baseUrl).replace(/\/?$/, "/");
    return base + file;
  }
  return new URL(`../types/${definition.id}/${file}`, import.meta.url).href;
}

async function tryImport(definition, options, file) {
  return import(specifierFor(definition, options, file));
}

export async function loadAdvanced(definition, options = {}) {
  const id = definition?.id;
  if (!options.refresh && cache.has(id)) return cache.get(id);
  const resultPromise = doLoad(definition, options).then((result) => {
    // failed を含む結果はキャッシュに残さない（失敗をセッション中固定しない）。
    if (result.failed.length && cache.get(id) === resultPromise)
      cache.delete(id);
    return result;
  });
  cache.set(id, resultPromise);
  return resultPromise;
}

async function doLoad(definition, options) {
  const loaded = [];
  const missing = [];
  const failed = [];
  const result = {
    referenceAdvanced: [],
    referenceOverrides: [],
    templatesAdvanced: [],
    glossaryAdvanced: [],
    engineModule: null,
    loaded,
    missing,
    failed,
  };
  const pushOnce = (list, file) => {
    if (!list.includes(file)) list.push(file);
  };
  const failOnce = (file) => pushOnce(failed, file);
  const loadOnce = (file) => pushOnce(loaded, file);
  const missOnce = (file) => pushOnce(missing, file);

  // import を試み、成否だけを返す（振り分けは呼び出し側が行う）。
  async function attempt(file) {
    try {
      return { mod: await tryImport(definition, options, file) };
    } catch {
      return { mod: null };
    }
  }
  // import 失敗時の振り分け: 明示ファイルは failed、既定ファイルは missing。
  function importFailed(file, isExplicit) {
    if (isExplicit) failOnce(file);
    else missOnce(file);
  }

  // 1. manifest の読み込み（無い場合は既定値を使う）。
  //    manifest に実際に書かれたキーだけが「明示」扱いになる。
  let manifest = DEFAULT_MANIFEST;
  const explicit = {
    referenceParts: false,
    templatesFile: false,
    glossaryFile: false,
  };
  {
    const { mod } = await attempt(MANIFEST_FILE);
    if (!mod) {
      missOnce(MANIFEST_FILE);
    } else {
      const m = mod?.advancedManifest;
      if (m && typeof m === "object" && !Array.isArray(m)) {
        manifest = {
          referenceParts: Array.isArray(m.referenceParts)
            ? m.referenceParts
            : DEFAULT_MANIFEST.referenceParts,
          templatesFile:
            m.templatesFile === undefined
              ? DEFAULT_MANIFEST.templatesFile
              : m.templatesFile,
          glossaryFile:
            m.glossaryFile === undefined
              ? DEFAULT_MANIFEST.glossaryFile
              : m.glossaryFile,
          engineFile: m.engineFile ?? null,
        };
        explicit.referenceParts = Array.isArray(m.referenceParts);
        explicit.templatesFile = m.templatesFile !== undefined;
        explicit.glossaryFile = m.glossaryFile !== undefined;
        loadOnce(MANIFEST_FILE);
      } else {
        // manifest ファイルはあるが advancedManifest が不正 → 内容不正として failed。
        // 合成自体は既定値で続行する。
        failOnce(MANIFEST_FILE);
      }
    }
  }

  // 2. reference parts: referenceAdvanced / referenceOverrides を集める。
  for (const file of manifest.referenceParts || []) {
    const { mod } = await attempt(file);
    if (!mod) {
      importFailed(file, explicit.referenceParts);
      continue;
    }
    let foundAny = false;
    let valid = true;
    for (const key of ["referenceAdvanced", "referenceOverrides"]) {
      if (mod[key] === undefined) continue;
      foundAny = true;
      if (Array.isArray(mod[key])) result[key].push(...mod[key]);
      else valid = false;
    }
    // どちらの export も無い part、型不正を含む part は内容不正として failed
    // のみに記録する（loaded との二重計上をしない。監査 D-3 の是正）。
    if (!foundAny) valid = false;
    if (valid) loadOnce(file);
    else failOnce(file);
  }

  // 3. templates / glossary ファイル。
  async function collectSingle(file, exportName, targetKey, isExplicit) {
    if (!file) return;
    const { mod } = await attempt(file);
    if (!mod) {
      importFailed(file, isExplicit);
      return;
    }
    if (Array.isArray(mod[exportName])) {
      result[targetKey].push(...mod[exportName]);
      loadOnce(file);
    } else {
      failOnce(file);
    }
  }
  await collectSingle(
    manifest.templatesFile,
    "templatesAdvanced",
    "templatesAdvanced",
    explicit.templatesFile,
  );
  await collectSingle(
    manifest.glossaryFile,
    "glossaryAdvanced",
    "glossaryAdvanced",
    explicit.glossaryFile,
  );

  // 4. engine ファイル（manifest 指定時のみ。常に明示扱い）。モジュールごと返す。
  if (manifest.engineFile) {
    const { mod } = await attempt(manifest.engineFile);
    if (mod) {
      result.engineModule = mod;
      loadOnce(manifest.engineFile);
    } else {
      failOnce(manifest.engineFile);
    }
  }

  // 5. 全ファイルが missing で終わった場合の切り分け（横断監査 SP-31）。
  //    dynamic import の失敗だけでは「ファイルが存在しない（404）」と
  //    「ネットワークに届かない（オフライン等）」を区別できない。既定
  //    ファイルが1つも読めなかったときは、manifest の URL への fetch で
  //    到達性を確認する: fetch 自体が失敗する場合は「無い」のではなく
  //    「読み込めなかった」ので、全て failed に振り替えて呼び出し側が
  //    利用者へ注記できるようにする。HTTP 応答が返る（404 を含む）場合は
  //    従来どおり missing（追加なしとして正常扱い）。
  //    http(s) 以外のベース（テストの file:// フィクスチャ等）では
  //    判定材料が無いため振り替えない。
  if (!loaded.length && !failed.length && missing.length) {
    const probeUrl = specifierFor(definition, options, MANIFEST_FILE);
    if (/^https?:\/\//.test(probeUrl) && typeof fetch === "function") {
      let unreachable = false;
      try {
        await fetch(probeUrl, { cache: "no-store" });
      } catch {
        unreachable = true;
      }
      if (unreachable) {
        for (const file of missing) failOnce(file);
        missing.length = 0;
      }
    }
  }

  return result;
}
