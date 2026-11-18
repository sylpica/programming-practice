import { getDefinition } from "../../../js/types/registry.js";
const d = getDefinition("cpp");
const run = async (body) => {
  const code = `#include <iostream>\n#include <string>\n#include <vector>\nint main() {\n${body}\n return 0;\n}`;
  const r = await d.simulate(code, structuredClone(d.model.defaults));
  const errs = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
  const outs = (r.paths || []).map((p) => p.outputs.map((o) => o.text).join(""));
  console.log(JSON.stringify(body.slice(0, 90)), "=> errors:", JSON.stringify(errs), "outputs:", JSON.stringify(outs));
};
// 実 C++: push_back の再確保でイテレータは無効化される（未定義動作）
await run(`std::vector<int> v = {10, 20, 30}; auto it = v.begin(); for (int i = 0; i < 100; i++) v.push_back(i); std::cout << *it;`);
// 実 C++: erase より前の要素を消すと it は無効化（モデルでは位置追跡なら 30 が出る）
await run(`std::vector<int> v = {10, 20, 30}; auto it = v.begin() + 1; v.erase(v.begin()); std::cout << *it;`);
// 実 C++: 自分の要素を erase すると無効化
await run(`std::vector<int> v = {10, 20, 30}; auto it = v.begin() + 1; v.erase(it); std::cout << *it;`);
// 実 C++: clear 後は無効化
await run(`std::vector<int> v = {10, 20, 30}; auto it = v.begin(); v.clear(); std::cout << *it;`);
// 実 C++: insert より後ろの it は無効化
await run(`std::vector<int> v = {10, 20, 30}; auto it = v.begin() + 2; v.insert(v.begin(), 5); std::cout << *it;`);
// 実 C++: string の append 再確保で無効化
await run(`std::string s = "abc"; auto it = s.begin(); s.append(100, 'x'); std::cout << *it;`);
// 実 C++: reserve でも再確保が起きれば無効化
await run(`std::vector<int> v = {10, 20, 30}; auto it = v.begin(); v.reserve(1000); std::cout << *it;`);
// 比較用: 変更を挟まない通常使用
await run(`std::vector<int> v = {10, 20, 30}; auto it = v.begin(); std::cout << *it;`);
