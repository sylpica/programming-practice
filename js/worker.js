import { getDefinition } from "./types/registry.js";
import { loadAdvanced } from "./core/advanced-loader.js";
import { mergeCatalog } from "./core/catalog.js";

// 統合第1弾: Worker は実行ごとに作り直されるため、メインスレッドで
// 行った高度エンジンの有効化（applyAdvancedEngine）は引き継がれない。
// 高度モードの実行では、メインスレッドと同じ手順（loadAdvanced →
// mergeCatalog → フック）で Worker 内の定義に対しても有効化してから
// simulate する。有効化に失敗した場合は基礎の挙動のまま実行する
// （黙って高度のふりをしない。カタログ側の失敗表示はメインスレッド
// の modeNote が担う）。
async function activateAdvanced(definition) {
  const loaded = await loadAdvanced(definition);
  if (!loaded || (loaded.failed && loaded.failed.length)) return;
  const merged = mergeCatalog(
    {
      reference: definition.reference,
      templates: definition.templates,
      glossary: definition.glossary || [],
    },
    loaded,
  );
  definition.__catalogReference = merged.reference;
  const engineModule = loaded.engineModule;
  if (engineModule && typeof engineModule.applyAdvancedEngine === "function") {
    const hooked = engineModule.applyAdvancedEngine(definition, merged);
    if (hooked && hooked !== definition) {
      if (typeof hooked.scan === "function") definition.scan = hooked.scan;
      if (typeof hooked.simulate === "function")
        definition.simulate = hooked.simulate;
    }
  }
}

self.onmessage = async ({ data }) => {
  try {
    const definition = getDefinition(data.typeId);
    if (data.advanced) {
      try {
        await activateAdvanced(definition);
      } catch {
        // 有効化の失敗は基礎挙動での実行に倒す（理由は上記コメント）。
      }
    }
    self.postMessage({
      id: data.id,
      result: await definition.simulate(data.code, data.model),
    });
  } catch (e) {
    self.postMessage({
      id: data.id,
      result: { paths: [], error: { line: 1, message: e.message } },
    });
  }
};
