import { simulate } from "./engine.js";
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ id: data.id, result: simulate(data.code, data.model) });
  } catch (e) {
    self.postMessage({
      id: data.id,
      result: { paths: [], error: { line: 1, message: e.message } },
    });
  }
};
