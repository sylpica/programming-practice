import { getDefinition } from "../../../js/types/registry.js";
const run = async (id, code) => {
  const d = getDefinition(id);
  const r = await d.simulate(code, structuredClone(d.model.defaults));
  const errs = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
  const outs = (r.paths || []).map((p) => p.outputs.map((o) => o.text).join(""));
  return { errs, outs };
};
const cpp = (body) => `#include <iostream>\n#include <string>\n#include <vector>\n#include <array>\n#include <utility>\n#include <algorithm>\nint main() {\n${body}\n return 0;\n}`;
const cases = [
  // 欠陥1: ranges 系統
  ["cpp", cpp(`std::vector<int> v = {3,1,2}; std::ranges::sort(v);`), "ranges::sort 名指し"],
  ["cpp", cpp(`std::vector<int> v = {3,1,2}; std::ranges::views::iota(0, 3);`), "ranges::views::iota 名指し"],
  ["cpp", cpp(`std::vector<int> v = {3,1,2}; auto n = std::ranges::distance(v);`), "ranges::distance 名指し"],
  // 欠陥2: execution
  ["cpp", cpp(`std::vector<int> v = {3,1,2}; std::sort(std::execution::par, v.begin(), v.end());`), "execution::par 名指し・黙って実行しない"],
  // 欠陥3: filesystem / chrono / meta
  ["cpp", cpp(`std::filesystem::path p = "/a/b.txt"; std::cout << p.filename();`), "filesystem::path 名指し"],
  ["cpp", cpp(`auto s = std::chrono::seconds(5);`), "chrono::seconds 名指し"],
  ["cpp", cpp(`auto t = std::chrono::system_clock::now();`), "chrono::system_clock 名指し"],
  // 欠陥4: transform / find_if / count_if ラムダ形
  ["cpp", cpp(`std::vector<int> v = {1,2,3}; std::vector<int> w(3); std::transform(v.begin(), v.end(), w.begin(), [](int x){ return x*2; });`), "transform+ラムダ名指し"],
  ["cpp", cpp(`std::vector<int> v = {1,2,3}; auto it = std::find_if(v.begin(), v.end(), [](int x){ return x > 1; });`), "find_if+ラムダ名指し"],
  ["cpp", cpp(`std::vector<int> v = {1,2,3}; auto c = std::count_if(v.begin(), v.end(), [](int x){ return x > 1; });`), "count_if+ラムダ名指し"],
  ["cpp", cpp(`auto f = [](int x){ return x + 1; };`), "単独ラムダ名指し"],
  ["cpp", cpp(`std::vector<int> v = {3,1,2}; std::sort(v.begin(), v.end(), [](int a, int b){ return a > b; });`), "sort+ラムダ名指し（対応関数のラムダ引数）"],
  // CPP-B7: 明示テンプレート引数
  ["cpp", cpp(`auto p = std::make_pair<int, int>(1, 2); std::cout << p.first;`), "make_pair<...> 名指し"],
  ["cpp", cpp(`unsigned x = std::byteswap<unsigned>(3u);`), "byteswap<...> 名指し"],
  // メンバ型 (c)
  ["cpp", cpp(`std::string s = "abc"; std::string::size_type n = s.size();`), "string::size_type 名指し"],
  ["cpp", cpp(`std::vector<int> v = {1}; std::vector<int>::size_type n = v.size();`), "vector::size_type 名指し"],
  ["cpp", cpp(`std::pair<int, int> p{1, 2}; std::pair<int, int>::first_type x = p.first;`), "pair::first_type 名指し"],
  // optional 汎用型拡張
  ["cpp", cpp(`std::optional<int> o = 5;`), "optional 宣言名指し"],
  ["cpp", cpp(`std::optional<int> o;`), "optional 宣言のみ名指し"],
  ["cpp", cpp(`std::tuple<int, int> t = {1, 2};`), "tuple 宣言名指し"],
  ["cpp", cpp(`std::shared_ptr<int> sp;`), "shared_ptr 宣言名指し"],
  ["cpp", cpp(`std::basic_string<char> s = "ab";`), "basic_string 宣言名指し"],
  // 回帰: 動くはずの形
  ["cpp", cpp(`std::vector<int> v = {1,2,3}; std::sort(v.begin(), v.end()); std::cout << v[0] << v[2];`), "OK sort"],
  ["cpp", cpp(`std::string s = "abc"; std::string::iterator it = s.begin(); std::cout << *it;`), "OK string::iterator"],
  ["cpp", cpp(`std::vector<int> v = {1,2}; for (std::vector<int>::iterator it = v.begin(); it != v.end(); ++it) std::cout << *it;`), "OK vector::iterator for"],
  ["cpp", cpp(`std::cout << std::string::npos;`), "OK npos"],
  ["cpp", cpp(`std::cout << std::numbers::pi;`), "OK numbers::pi"],
  ["cpp", cpp(`int a = 5; int b = 3; std::cout << (a < b > (0) ? 1 : 0);`), "OK 比較 a<b>(0) 誤発火なし"],
  ["cpp", cpp(`std::vector<int> v = {1,2}; std::cout << v.size(); int arr[3] = {1,2,3}; std::cout << arr[1];`), "OK 添字・宣言"],
  ["cpp", cpp(`enum class Color { Red, Green }; std::cout << (int)Color::Green;`), "enum宣言の文言が優先（従来どおり）"],
  ["cpp", cpp(`std::map<int, int> m; m[1] = 2;`), "map 宣言名指し（従来どおり）"],
  ["cpp", cpp(`std::vector<int> v = {1,2,3}; std::transform(v.begin(), v.end(), v.begin(), std::negate<int>());`), "関数オブジェクト形（従来文言）"],
  ["cpp", cpp(`std::cout << std::format("{} {}", 1, 2);`), "format 名指し（従来どおり）"],
  ["cpp", cpp(`auto p = std::make_pair(1, 2); std::cout << p.first << p.second;`), "OK make_pair 推論形"],
  ["cpp", cpp(`std::pair<int, std::string> p{1, "one"}; std::cout << p.first << p.second;`), "OK pair 宣言・使用"],
  // C / C# 波及なし
  ["c", `#include <stdio.h>\nint main() { int a[3] = {1,2,3}; printf("%d", a[1]); return 0; }`, "C 従来どおり"],
  ["csharp", `using System;\nclass Program { static void Main() { int[] a = {1,2,3}; Console.Write(a[1]); } }`, "C# 従来どおり"],
  ["csharp", `using System;\nclass Program { static void Main() { var f = (int x) => x + 1; } }`, "C# ラムダは従来文言のまま"],
];
for (const [id, code, label] of cases) {
  const { errs, outs } = await run(id, code);
  console.log(`[${label}] errors=${JSON.stringify(errs)} outputs=${JSON.stringify(outs)}`);
}
