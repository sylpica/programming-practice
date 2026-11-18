import { runBody } from "./harness.mjs";
import { getDefinition } from "../../../js/types/registry.js";
import { loadAdvanced } from "../../../js/core/advanced-loader.js";
import { mergeCatalog, itemStatus } from "../../../js/core/catalog.js";
// 補正形（前回台帳の "(補正形で再実行)" 注記に対応する実コード形）
const cases = [
  ["std::array::iterator", `std::array<int, 3> a = {7,8,9}; std::array<int, 3>::iterator it = a.begin(); std::cout << *it;`, "7"],
  ["std::array::const_iterator", `std::array<int, 3> a = {7,8,9}; std::array<int, 3>::const_iterator it = a.cbegin(); std::cout << *it;`, "7"],
  ["std::array::reverse_iterator", `std::array<int, 3> a = {7,8,9}; std::array<int, 3>::reverse_iterator it = a.rbegin(); std::cout << *it;`, "9"],
  ["std::array::const_reverse_iterator", `std::array<int, 3> a = {7,8,9}; std::array<int, 3>::const_reverse_iterator it = a.crbegin(); std::cout << *it;`, "9"],
  ["std::vector::iterator", `std::vector<int> v = {10,20,30}; std::vector<int>::iterator it = v.begin(); std::cout << *it;`, "10"],
  ["std::vector::const_iterator", `std::vector<int> v = {10,20,30}; std::vector<int>::const_iterator it = v.cbegin(); std::cout << *it;`, "10"],
  ["std::vector::reverse_iterator", `std::vector<int> v = {10,20,30}; std::vector<int>::reverse_iterator it = v.rbegin(); std::cout << *it;`, "30"],
  ["std::vector::const_reverse_iterator", `std::vector<int> v = {10,20,30}; std::vector<int>::const_reverse_iterator it = v.crbegin(); std::cout << *it;`, "30"],
  ["std::vector(class-decl)", `std::vector<int> probeObj; std::cout << 7;`, "7"],
  // std::pair 例の切り分け
  ["pair-ex-asis", `std::pair<int, std::string> p{1, "one"}; auto n = p.first;`, "(fail expected)"],
  ["pair-ex-int", `std::pair<int, std::string> p{1, "one"}; int n = p.first; std::cout << n << " " << p.second;`, "1 one"],
  ["pair-ex-noauto", `std::pair<int, std::string> p{1, "one"}; std::cout << p.first << " " << p.second;`, "1 one"],
  ["pair-ex-auto-second", `std::pair<int, std::string> p{1, "one"}; auto s = p.second; std::cout << s;`, "?"],
];
for (const [id, body, exp] of cases) {
  const r = await runBody(body);
  console.log(id, "\tERR=", r.errors.join(" ;; ") || "-", "\tOUT=", r.outputs.map(a=>a.join("")).join("||"), "\texp=", exp);
}
const def = getDefinition("cpp");
const adv = await loadAdvanced(def);
const merged = mergeCatalog(def, adv);
for (const n of ["std::pair", "std::vector"]) {
  const it = merged.reference.find(i=>i.name===n);
  console.log(n, "status=", itemStatus(it), "| example=", JSON.stringify(it.example), "| caution=", JSON.stringify(it.caution||""));
}
