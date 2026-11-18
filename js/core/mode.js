// 学習モード（簡易／高度）の永続化。
// 既存の進捗キー programming-practice-v3 には一切触らない専用キーを使う。
// storage が無い環境（Node テスト等）や storage が例外を投げる環境でも
// 例外を外に投げず、メモリ上の値で動作する。

export const MODE_STORAGE_KEY = "programming-practice-mode-v1";

const VALID_MODES = new Set(["simple", "advanced"]);

// storage が使えない場合のフォールバック（プロセス内のみ保持）。
let memoryMode = "simple";

function normalizeMode(mode) {
  return VALID_MODES.has(mode) ? mode : "simple";
}

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // localStorage へのアクセス自体が例外になる環境（プライバシー設定等）。
    return null;
  }
}

export function getMode(storage) {
  const store = resolveStorage(storage);
  if (!store) return memoryMode;
  try {
    const raw = store.getItem(MODE_STORAGE_KEY);
    if (raw == null) return "simple";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return "simple";
    }
    return normalizeMode(parsed?.mode);
  } catch {
    return "simple";
  }
}

export function setMode(mode, storage) {
  const normalized = normalizeMode(mode);
  memoryMode = normalized;
  const store = resolveStorage(storage);
  if (!store) return normalized;
  try {
    store.setItem(MODE_STORAGE_KEY, JSON.stringify({ mode: normalized }));
  } catch {
    // 保存できなくても例外は投げない（メモリ上の値で継続する）。
  }
  return normalized;
}
