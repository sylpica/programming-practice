// B8 高度モード（cpp-engine-b）：std::vector／std::array／std::pair の
// 値モデルと宣言・メンバ群、イテレータモデル、<algorithm>／<numeric>／
// <utility>／<iterator> の自由関数、scan 拡張のテスト。
// 期待値は g++ 13.3.0 の実走出力と照合して決めた（報告書の照合表参照）。
// 変更は language === "cpp" の分岐内だけ。C／C# の不変も対照で確認する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const run = async (id, code) => {
  const d = getDefinition(id);
  return d.simulate(code, structuredClone(d.model.defaults));
};
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
// 本ファイルでは経路ごとの全 cout 文を連結した1文字列として照合する。
const outputs = (r) => (r.paths || []).map((p) => [p.outputs.map((o) => o.text).join("")]);
const cpp = (body) => `#include <iostream>\n#include <string>\n#include <vector>\n#include <array>\n#include <utility>\n#include <algorithm>\n#include <numeric>\n#include <iterator>\nint main() {\n${body}\n return 0;\n}`;
const cc = (body) => `#include <stdio.h>\nint main() {\n${body}\n return 0;\n}`;
const cs = (body) => `using System;\nclass Program {\n static void Main() {\n${body}\n }\n}`;

async function ok(body, expected) {
  const r = await run("cpp", cpp(body));
  assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
  assert.deepEqual(outputs(r), expected, body);
}
async function ng(body, pattern) {
  const r = await run("cpp", cpp(body));
  assert.ok(
    errors(r).some((e) => pattern.test(e)),
    `${body} -> ${JSON.stringify(errors(r))}`,
  );
}

/* ---------- vector の宣言と基本メンバ ---------- */
test("B8 vector: declarations and basic members", async () => {
  await ok(`std::vector<int> v; std::cout << v.size() << v.empty();`, [["01"]]);
  await ok(`std::vector<int> v = {3, 1, 2}; std::cout << v.size() << v[0] << v[1] << v[2];`, [["3312"]]);
  await ok(`std::vector<int> v{3, 1, 2}; std::cout << v.size();`, [["3"]]);
  await ok(`std::vector<int> v(3); std::cout << v[0] << v[1] << v[2];`, [["000"]]);
  await ok(`std::vector<int> v(3, 7); std::cout << v[0] << v[2];`, [["77"]]);
  await ok(`std::vector<int> a = {1, 2}; std::vector<int> b = a; b.push_back(3); std::cout << a.size() << b.size();`, [["23"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; std::cout << v.front() << v.back() << v.at(1);`, [["132"]]);
  await ok(`std::vector<int> v = {1, 2}; v.push_back(5); v.pop_back(); v.push_back(6); std::cout << v[2] << v.size();`, [["63"]]);
  await ok(`std::vector<int> v = {1, 2}; v.resize(4); std::cout << v.size() << v[3]; v.resize(1); std::cout << v.size();`, [["401"]]);
  await ok(`std::vector<int> v = {1, 2}; v.clear(); std::cout << v.empty() << v.size();`, [["10"]]);
  await ok(`std::vector<int> v = {1, 2}; v.assign(3, 9); std::cout << v.size() << v[0]; v.assign({4, 5}); std::cout << v.size() << v[1];`, [["3925"]]);
  await ok(`std::vector<int> a = {1}, b = {2, 3}; a.swap(b); std::cout << a.size() << b.size() << a[1];`, [["213"]]);
  await ok(`std::vector<int> v = {1}; v.reserve(100); v.shrink_to_fit(); v.push_back(2); std::cout << v.size() << v[1];`, [["22"]]);
  await ok(`std::vector<double> v = {1.5, 2.5}; std::cout << v[0] + v[1];`, [["4"]]);
  await ok(`std::vector<std::string> v = {"ab", "cd"}; std::cout << v[0] << v[1] << v.size();`, [["abcd2"]]);
  await ok(`std::vector<int> v = {1, 2}; v[0] = 9; std::cout << v[0]; v.at(1) = 8; std::cout << v[1];`, [["98"]]);
  await ok(`std::vector<int> a = {1}, b; b = a; std::cout << b[0] << b.size();`, [["11"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; int n = 0; for (int x : v) n += x; std::cout << n;`, [["6"]]);
  await ng(`std::vector<int> v = {1}; std::cout << v.at(5);`, /例外/);
  await ng(`std::vector<int> v = {1}; std::cout << v[5];`, /未定義動作/);
  await ng(`std::vector<int> v = {1}; int c = v.capacity();`, /説明に対応していません/);
  await ng(`std::vector<int> v = {1}; int* p = v.data();`, /説明に対応していません|未対応/);
  await ng(`std::vector<int>* p;`, /未対応/);
  await ng(`std::set<int> s;`, /ジェネリック型 set/);
  await ng(`std::map<int, int> m;`, /ジェネリック型 map/);
});

test("B8 vector: insert/erase/emplace", async () => {
  await ok(`std::vector<int> v = {1, 3}; v.insert(v.begin() + 1, 2); std::cout << v[0] << v[1] << v[2];`, [["123"]]);
  await ok(`std::vector<int> v = {1, 4}; v.insert(v.begin() + 1, 2, 9); std::cout << v.size() << v[1] << v[2];`, [["499"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; v.erase(v.begin()); std::cout << v[0] << v.size(); v.erase(v.begin(), v.end()); std::cout << v.empty();`, [["221"]]);
  await ok(`std::vector<int> v = {1}; v.emplace_back(7); v.emplace(v.begin(), 0); std::cout << v[0] << v[2];`, [["07"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; auto it = v.erase(v.begin() + 1); std::cout << *it;`, [["3"]]);
  await ok(`std::vector<int> a = {8, 9}; std::vector<int> v = {1}; v.insert(v.end(), a.begin(), a.end()); std::cout << v.size() << v[2];`, [["39"]]);
  await ok(`std::vector<int> a = {8, 9}; std::vector<int> v(a.begin(), a.end()); std::cout << v.size() << v[0];`, [["28"]]);
});

/* ---------- array / pair ---------- */
test("B8 array and pair", async () => {
  await ok(`std::array<int, 3> a = {7, 8, 9}; std::cout << a.size() << a.max_size() << a[1] << a.front() << a.back();`, [["33879"]]);
  await ok(`std::array<int, 3> a; a.fill(4); std::cout << a[0] << a[2];`, [["44"]]);
  await ok(`std::array<int, 2> a = {1, 2}, b = {3, 4}; a.swap(b); std::cout << a[0] << b[0];`, [["31"]]);
  await ok(`std::array<int, 4> a = {1, 2}; std::cout << a[2];`, [["0"]]);
  await ok(`int n = 0; std::array<int, 3> a = {1, 2, 3}; for (int x : a) n += x; std::cout << n;`, [["6"]]);
  await ng(`std::array<int, 3> a(1);`, /CompileError/);
  await ok(`std::pair<int, std::string> p = {1, "ab"}; std::cout << p.first << p.second;`, [["1ab"]]);
  await ok(`std::pair<int, int> p(3, 4); std::cout << p.first + p.second;`, [["7"]]);
  await ok(`std::pair<int, int> p; std::cout << p.first << p.second;`, [["00"]]);
  await ok(`std::pair<int, int> a = {1, 2}, b = {3, 4}; a.swap(b); std::cout << a.first << b.first;`, [["31"]]);
  await ok(`std::pair<int, int> p = {1, 2}; p.first = 9; std::cout << p.first;`, [["9"]]);
  await ok(`std::pair<int, int> a = {1, 2}, b = {1, 3}; std::cout << (a < b) << (a == b);`, [["10"]]);
  await ok(`auto p = std::make_pair(5, 6); std::cout << p.first + p.second;`, [["11"]]);
  await ok(`std::vector<std::pair<int, int>> v = {{1, 2}, {3, 4}}; std::cout << v[1].second << v.size();`, [["42"]]);
  await ok(`std::vector<std::pair<int, int>> v; v.emplace_back(1, 2); std::cout << v[0].first << v[0].second;`, [["12"]]);
});

/* ---------- イテレータモデル ---------- */
test("B8 iterators: arithmetic, comparison, dereference", async () => {
  await ok(`std::vector<int> v = {10, 20, 30}; std::vector<int>::iterator it = v.begin(); std::cout << *it; ++it; std::cout << *it; it += 1; std::cout << *it; --it; std::cout << *it;`, [["10203020"]]);
  await ok(`std::vector<int> v = {10, 20, 30}; std::cout << *(v.begin() + 2) << v.begin()[1];`, [["3020"]]);
  await ok(`std::vector<int> v = {10, 20, 30}; std::cout << (v.end() - v.begin()) << (v.begin() < v.end());`, [["31"]]);
  await ok(`std::vector<int> v = {10, 20, 30}; for (std::vector<int>::iterator it = v.begin(); it != v.end(); ++it) *it += 1; std::cout << v[0] << v[2];`, [["1131"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; for (std::vector<int>::reverse_iterator it = v.rbegin(); it != v.rend(); ++it) std::cout << *it;`, [["321"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; std::vector<int>::const_iterator it = v.cbegin(); std::cout << *it << (it == v.begin());`, [["11"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; auto it = v.begin(); std::cout << *it;`, [["1"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; std::cout << std::distance(v.begin(), v.end());`, [["3"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; std::vector<int>::iterator it = v.begin(); std::advance(it, 2); std::cout << *it; std::cout << *std::next(v.begin()) << *std::prev(v.end());`, [["323"]]);
  await ok(`int a[3] = {5, 6, 7}; std::sort(a, a + 3); std::cout << a[0];`, [["5"]]);
  await ok(`int a[3] = {7, 6, 5}; std::sort(a, a + 3); std::cout << a[0] << a[2];`, [["57"]]);
  await ok(`std::string s = "abc"; int n = 0; for (std::string::iterator it = s.begin(); it != s.end(); ++it) n++; std::cout << n;`, [["3"]]);
  await ok(`std::string s = "abc"; *s.begin() = 'z'; std::cout << s;`, [["zbc"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; std::vector<int>::iterator it; it = v.begin(); std::cout << *it;`, [["1"]]);
  await ng(`std::vector<int> a = {1}, b = {2}; std::cout << (a.begin() == b.begin());`, /未定義動作/);
  await ng(`std::vector<int> v = {1}; std::vector<int>::const_iterator it = v.cbegin(); *it = 5;`, /const/);
  await ng(`std::vector<int> v = {1}; std::cout << *v.end();`, /未定義動作/);
  await ng(`std::vector<int> v = {1}; int* p = &v[0];`, /未対応/);
  await ng(`std::vector<int> v = {1}; if (v) { std::cout << 1; }`, /CompileError/);
  await ng(`std::vector<int> v = {1}; std::cout << v;`, /未対応/);
});

/* ---------- 範囲 for ---------- */
test("B8 range-for: value, reference write-back, const ref", async () => {
  await ok(`std::vector<int> v = {1, 2, 3}; for (int& x : v) x *= 2; std::cout << v[0] << v[1] << v[2];`, [["246"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; int s = 0; for (const int& x : v) s += x; std::cout << s;`, [["6"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; for (auto x : v) std::cout << x;`, [["123"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; for (auto& x : v) x += 10; std::cout << v[2];`, [["13"]]);
  await ok(`std::string s = "ab"; for (char c : s) std::cout << c;`, [["ab"]]);
  await ok(`std::string s = "ab"; for (char& c : s) c = 'z'; std::cout << s;`, [["zz"]]);
  await ok(`int a[3] = {1, 2, 3}; int s = 0; for (int x : a) s += x; std::cout << s;`, [["6"]]);
  await ok(`int a[3] = {1, 2, 3}; for (int& x : a) x += 1; std::cout << a[0] << a[2];`, [["24"]]);
  await ok(`std::vector<std::string> v = {"a", "b"}; for (std::string t : v) std::cout << t;`, [["ab"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; for (int x : v) { if (x == 2) break; std::cout << x; }`, [["1"]]);
});

/* ---------- <algorithm> ---------- */
test("B8 algorithm functions", async () => {
  const sorted = (body) => ok(body, [["12345"]]);
  await sorted(`std::vector<int> v = {5, 3, 1, 4, 2}; std::sort(v.begin(), v.end()); for (int x : v) std::cout << x;`);
  await sorted(`std::vector<int> v = {5, 3, 1, 4, 2}; std::stable_sort(v.begin(), v.end()); for (int x : v) std::cout << x;`);
  await ok(`std::vector<int> v = {1, 2, 3}; std::reverse(v.begin(), v.end()); for (int x : v) std::cout << x;`, [["321"]]);
  await ok(`std::vector<int> v(3); std::fill(v.begin(), v.end(), 7); std::cout << v[0] << v[2]; std::fill_n(v.begin(), 2, 8); std::cout << v[1];`, [["778"]]);
  await ok(`std::vector<int> v = {1, 2, 3, 2}; std::cout << (std::find(v.begin(), v.end(), 3) - v.begin()) << std::count(v.begin(), v.end(), 2);`, [["22"]]);
  await ok(`std::cout << std::min(3, 7) << std::max(3, 7) << std::clamp(10, 0, 5);`, [["375"]]);
  await ok(`auto mm = std::minmax(4, 9); std::cout << mm.first << mm.second;`, [["49"]]);
  await ok(`std::vector<int> v = {3, 1, 4}; std::cout << *std::min_element(v.begin(), v.end()) << *std::max_element(v.begin(), v.end());`, [["14"]]);
  await ok(`std::vector<int> v = {1, 2, 3, 4}; std::cout << std::binary_search(v.begin(), v.end(), 3) << std::binary_search(v.begin(), v.end(), 9);`, [["10"]]);
  await ok(`std::vector<int> v = {1, 2, 2, 3}; std::cout << (std::lower_bound(v.begin(), v.end(), 2) - v.begin()) << (std::upper_bound(v.begin(), v.end(), 2) - v.begin());`, [["13"]]);
  await ok(`std::vector<int> v = {1, 2, 2, 3}; auto r = std::equal_range(v.begin(), v.end(), 2); std::cout << (r.second - r.first);`, [["2"]]);
  await ok(`std::vector<int> a = {1, 2, 3}, b = {1, 2, 3}; std::cout << std::equal(a.begin(), a.end(), b.begin()); auto m = std::mismatch(a.begin(), a.end(), b.begin()); std::cout << (m.first == a.end());`, [["11"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; std::cout << std::is_sorted(v.begin(), v.end()); std::vector<int> w = {3, 1}; std::cout << std::is_sorted(w.begin(), w.end());`, [["10"]]);
  await ok(`std::vector<int> v = {1, 2, 3, 4}; std::rotate(v.begin(), v.begin() + 1, v.end()); for (int x : v) std::cout << x;`, [["2341"]]);
  await ok(`std::vector<int> a = {1, 2}, b = {0, 0}; std::copy(a.begin(), a.end(), b.begin()); std::cout << b[0] << b[1]; std::copy_n(a.begin(), 1, b.begin() + 1); std::cout << b[1];`, [["121"]]);
  await ok(`int x = 1, y = 2; std::iter_swap(&x, &y); std::cout << x << y;`, [["21"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; std::iter_swap(v.begin(), v.begin() + 2); std::cout << v[0] << v[2];`, [["31"]]);
  await ok(`std::vector<int> v = {3, 1, 2}; std::nth_element(v.begin(), v.begin() + 1, v.end()); std::cout << v[1];`, [["2"]]);
  await ok(`std::vector<int> v = {5, 3, 1, 4, 2}; std::partial_sort(v.begin(), v.begin() + 2, v.end()); std::cout << v[0] << v[1];`, [["12"]]);
  await ok(`std::vector<int> a = {1, 2, 3}, b = {1, 2, 4}; std::cout << std::lexicographical_compare(a.begin(), a.end(), b.begin(), b.end());`, [["1"]]);
  await ok(`std::vector<int> v = {1, 2, 3}; std::cout << std::next_permutation(v.begin(), v.end()); for (int x : v) std::cout << x; std::cout << std::prev_permutation(v.begin(), v.end()); for (int x : v) std::cout << x;`, [["11321123"]]);
  await ok(`std::vector<int> v = {1, 2, 2, 3, 2}; auto e = std::remove(v.begin(), v.end(), 2); std::cout << (e - v.begin()); v.erase(e, v.end()); std::cout << v.size(); for (int x : v) std::cout << x;`, [["2213"]]);
  await ok(`std::vector<int> v = {1, 2, 2, 1}; std::replace(v.begin(), v.end(), 2, 9); for (int x : v) std::cout << x;`, [["1991"]]);
  await ok(`std::vector<int> v = {1, 1, 2, 2, 3}; auto e = std::unique(v.begin(), v.end()); std::cout << (e - v.begin());`, [["3"]]);
  await ng(`std::vector<int> v = {2, 1}; std::sort(v.begin(), v.end(), std::greater<int>());`, /未対応/);
});

/* ---------- <numeric> / <utility> ---------- */
test("B8 numeric and utility functions", async () => {
  await ok(`std::vector<int> v = {1, 2, 3, 4}; std::cout << std::accumulate(v.begin(), v.end(), 0);`, [["10"]]);
  await ok(`std::vector<int> v(4); std::iota(v.begin(), v.end(), 10); std::cout << v[0] << v[3];`, [["1013"]]);
  await ok(`std::vector<int> a = {1, 2, 3}, b = {4, 5, 6}; std::cout << std::inner_product(a.begin(), a.end(), b.begin(), 0);`, [["32"]]);
  await ok(`std::vector<int> a = {1, 2, 3}, b(3); std::partial_sum(a.begin(), a.end(), b.begin()); std::cout << b[0] << b[1] << b[2];`, [["136"]]);
  await ok(`std::vector<int> a = {1, 3, 6}, b(3); std::adjacent_difference(a.begin(), a.end(), b.begin()); std::cout << b[0] << b[1] << b[2];`, [["123"]]);
  await ok(`int x = 1, y = 2; std::swap(x, y); std::cout << x << y; int old = std::exchange(x, 9); std::cout << old << x;`, [["2129"]]);
  await ok(`std::vector<int> a = {1}, b = {2, 3}; std::swap(a, b); std::cout << a.size() << b.size();`, [["21"]]);
  await ok(`std::string s = "ab"; std::string t = std::move(s); std::cout << t;`, [["ab"]]);
  // 名前付きコンテナ参照は未対応（正直に停止する）。
  await ng(`std::vector<int> v = {1, 2}; const std::vector<int>& r = v; std::cout << r.size();`, /未対応/);
});

/* ---------- 対照：C／C# は不変 ---------- */
test("B8 contrast: C and C# behavior unchanged", async () => {
  const rc = await run("c", cc(`int v[3] = {3, 1, 2}; printf("%d", v[0] + v[1]);`));
  assert.deepEqual(errors(rc), []);
  assert.deepEqual(outputs(rc), [["4"]]);
  const rcs = await run("csharp", cs(`var v = new System.Collections.Generic.List<int>(); Console.WriteLine(1);`));
  assert.ok(errors(rcs).length > 0, JSON.stringify(errors(rcs)));
  // C では vector 宣言は従来どおりエラー。
  const rcg = await run("c", cc(`vector<int> v;`));
  assert.ok(errors(rcg).length > 0);
});

/* ---------- scan 拡張 ---------- */
test("B8 scan: advanced member names resolved from declarations", async () => {
  const d = getDefinition("cpp");
  // 高度メンバ項目のリファレンスデータはデータ班の成果物が正本で、
  // 本ツリー（ベース bba3b26）の reference にはまだ含まれない。
  // scan 拡張は「reference に存在する名前だけを返す」設計のため、
  // ここでは一時的に項目を足して解決機構そのものを検証し、直後に戻す。
  const added = ["std::vector::push_back", "std::vector::begin", "std::pair::swap", "std::pair::first"];
  for (const name of added) d.reference.push({ name });
  try {
    const found = d.scan(`#include <vector>\nint main() { std::vector<int> v; v.push_back(1); v.begin(); std::vector<int>::iterator it = v.begin(); std::pair<int,int> p; p.swap(p); return 0; }`);
    for (const name of ["std::vector::push_back", "std::vector::begin", "std::pair::swap"])
      assert.ok(found.includes(name), `${name} not in ${JSON.stringify(found)}`);
    // 宣言されていない変数のメンバは誤検出しない。
    const found3 = d.scan(`int main() { w.push_back(1); return 0; }`);
    assert.ok(!found3.includes("std::vector::push_back"), JSON.stringify(found3));
    // reference に無い名前は返さない。
    const found4 = d.scan(`int main() { std::vector<int> v; v.clear(); return 0; }`);
    assert.ok(!found4.includes("std::vector::clear"), JSON.stringify(found4));
  } finally {
    for (const name of added) {
      const i = d.reference.findIndex((r) => r.name === name);
      if (i >= 0) d.reference.splice(i, 1);
    }
  }
  // 基礎項目の解決は従来どおり。
  const found2 = d.scan(`int main() { std::sort(a, b); return 0; }`);
  assert.ok(Array.isArray(found2));
});
