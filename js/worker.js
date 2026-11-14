import { getDefinition } from "./types/registry.js";
self.onmessage = async ({ data }) => {
  try {
    self.postMessage({
      id: data.id,
      result: await getDefinition(data.typeId).simulate(data.code, data.model),
    });
  } catch (e) {
    self.postMessage({
      id: data.id,
      result: { paths: [], error: { line: 1, message: e.message } },
    });
  }
};
