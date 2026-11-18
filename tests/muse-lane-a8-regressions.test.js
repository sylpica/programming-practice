// 高度A8班（C++＋CloudFormation）監査の回帰テスト。
// 検出欠陥：(1) CFN 全角 Type の注記付け忘れ、(2) CFN テンプレート
// cfn-adv-multi-resource の intro と実挙動の矛盾、(3) CFN
// ApplicationSignals::Discovery のゼロプロパティ文の不統一、
// (4) C++ 入れ子名前空間・メンバ型・ラムダ・明示テンプレート引数が
// 汎用構文エラー（虚偽原因）に化けていた問題、(5) std::optional 等の
// クラステンプレート宣言が汎用エラーに化けていた問題、(6) std::vector／
// std::pair 項目の虚偽の未対応申告と std::pair の syntax 誤り、
// (7) イテレータ型12件の status と振る舞いの不一致。
// 期待値は一次情報（cppreference／g++／公式 Resource Specification）と
// 実走で確定した。C／C# への波及がないことも対照で確認する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { definition as cfnDefinition } from "../js/types/cloudformation/index.js";
import {
  applyAdvancedEngine,
  buildResourceTypeLedger,
  findUnlistedResourceTypes,
  unlistedTypeNote,
} from "../js/types/cloudformation/advanced-engine.js";
import { loadAdvanced } from "../js/core/advanced-loader.js";
import { mergeCatalog, itemStatus, countByStatus } from "../js/core/catalog.js";

const errs = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
const outs = (r) => (r.paths || []).map((p) => p.outputs.map((o) => o.text).join(""));
const run = async (id, code) => {
  const d = getDefinition(id);
  return d.simulate(code, structuredClone(d.model.defaults));
};
const cpp = (body) =>
  `#include <iostream>\n#include <string>\n#include <vector>\n#include <array>\n#include <utility>\n#include <algorithm>\nint main() {\n${body}\n return 0;\n}`;
async function ng(body, pattern, label) {
  const r = await run("cpp", cpp(body));
  assert.ok(
    errs(r).some((e) => pattern.test(e)),
    `${label}: ${body} -> ${JSON.stringify(errs(r))}`,
  );
  assert.deepEqual(outs(r).filter((o) => o !== ""), [], `${label}: 黙って実行しない`);
}
async function ok(body, expected, label) {
  const r = await run("cpp", cpp(body));
  assert.deepEqual(errs(r), [], `${label}: ${body} -> ${JSON.stringify(errs(r))}`);
  assert.deepEqual(outs(r), [expected], label);
}

/* ---------- (4) C++ 修飾名チェーンの名指し停止 ---------- */

test("A8 cpp: 入れ子名前空間の名前は完全名で名指し停止する", async () => {
  await ng(`std::vector<int> v = {3,1,2}; std::ranges::sort(v);`, /std::ranges::sort は未対応です/, "ranges::sort");
  await ng(`std::vector<int> v = {3,1,2}; std::ranges::views::iota(0, 3);`, /std::ranges::views::iota は未対応です/, "views::iota");
  await ng(`std::vector<int> v = {3,1,2}; std::sort(std::execution::par, v.begin(), v.end());`, /std::execution::par は未対応です/, "execution::par");
  await ng(`std::filesystem::path p = "/a/b.txt"; std::cout << p.filename();`, /std::filesystem::path は未対応です/, "filesystem::path");
  await ng(`auto s = std::chrono::seconds(5);`, /std::chrono::seconds は未対応です/, "chrono::seconds");
  await ng(`auto t = std::chrono::system_clock::now();`, /std::chrono::system_clock::now は未対応です/, "system_clock::now");
});

test("A8 cpp: 対応クラスのメンバ型は型名で名指し停止する", async () => {
  await ng(`std::string s = "abc"; std::string::size_type n = s.size();`, /std::string::size_type は未対応です/, "string::size_type");
  await ng(`std::vector<int> v = {1}; std::vector<int>::size_type n = v.size();`, /std::vector::size_type は未対応です/, "vector::size_type");
  await ng(`std::pair<int, int> p{1, 2}; std::pair<int, int>::first_type x = p.first;`, /std::pair::first_type は未対応です/, "pair::first_type");
  await ng(`std::vector<int> v = {1}; std::vector<int>::value_type x = v[0];`, /std::vector::value_type は未対応です/, "vector::value_type");
});

test("A8 cpp: ラムダ式は呼び出し名と併せて名指し停止する", async () => {
  await ng(
    `std::vector<int> v = {1,2,3}; std::vector<int> w(3); std::transform(v.begin(), v.end(), w.begin(), [](int x){ return x*2; });`,
    /transform へ渡すラムダ式は未対応です/, "transform lambda");
  await ng(
    `std::vector<int> v = {1,2,3}; auto it = std::find_if(v.begin(), v.end(), [](int x){ return x > 1; });`,
    /find_if へ渡すラムダ式は未対応です/, "find_if lambda");
  await ng(
    `std::vector<int> v = {3,1,2}; std::sort(v.begin(), v.end(), [](int a, int b){ return a > b; });`,
    /sort へ渡すラムダ式は未対応です/, "sort lambda");
  await ng(`auto f = [](int x){ return x + 1; };`, /ラムダ式は未対応です/, "standalone lambda");
});

test("A8 cpp: 明示的なテンプレート引数の呼び出しは名指し停止する", async () => {
  await ng(`auto p = std::make_pair<int, int>(1, 2);`, /明示的なテンプレート引数（make_pair<\.\.\.>）は未対応です/, "make_pair<...>");
  await ng(`unsigned x = std::byteswap<unsigned>(3u);`, /明示的なテンプレート引数（byteswap<\.\.\.>）は未対応です/, "byteswap<...>");
  // 推論形は従来どおり実行できる（誤発火しない）
  await ok(`auto p = std::make_pair(1, 2); std::cout << p.first << p.second;`, "12", "make_pair deduced");
});

test("A8 cpp: 従来どおり動く形は壊れていない（チェーン検査の誤発火なし）", async () => {
  await ok(`std::vector<int> v = {1,2,3}; std::sort(v.begin(), v.end()); std::cout << v[0] << v[2];`, "13", "sort");
  await ok(`std::string s = "abc"; std::string::iterator it = s.begin(); std::cout << *it;`, "a", "string::iterator");
  await ok(`std::vector<int> v = {1,2}; for (std::vector<int>::iterator it = v.begin(); it != v.end(); ++it) std::cout << *it;`, "12", "vector::iterator loop");
  await ok(`std::cout << std::string::npos;`, "-1", "npos");
  await ok(`std::cout << std::numbers::pi;`, "3.14159", "numbers::pi");
  await ok(`int a = 5; int b = 3; std::cout << (a < b > (0) ? 1 : 0);`, "0", "comparison is not a template call");
  await ok(`std::vector<int> v = {1,2}; std::cout << v.size(); int arr[3] = {1,2,3}; std::cout << arr[1];`, "22", "subscript/declaration");
  // 利用者型の宣言は宣言自体の文言が優先される（チェーン検査は譲る）
  const r = await run("cpp", cpp(`enum class Color { Red, Green }; std::cout << (int)Color::Green;`));
  assert.ok(errs(r).some((e) => /型 enum の宣言は未対応です/.test(e)), JSON.stringify(errs(r)));
  // ジェネリック型・関数オブジェクト・関数名指しは従来文言のまま
  await ng(`std::map<int, int> m; m[1] = 2;`, /ジェネリック型 map<\.\.\.> の宣言は未対応です/, "map decl");
  await ng(`std::vector<int> v = {1,2,3}; std::transform(v.begin(), v.end(), v.begin(), std::negate<int>());`, /関数オブジェクト/, "functor form");
});

/* ---------- (5) クラステンプレート宣言の名指し停止 ---------- */

test("A8 cpp: optional 等のクラステンプレート宣言は型名で名指し停止する", async () => {
  await ng(`std::optional<int> o = 5;`, /ジェネリック型 optional<\.\.\.> の宣言は未対応です/, "optional init");
  await ng(`std::optional<int> o;`, /ジェネリック型 optional<\.\.\.> の宣言は未対応です/, "optional decl");
  await ng(`std::tuple<int, int> t = {1, 2};`, /ジェネリック型 tuple<\.\.\.> の宣言は未対応です/, "tuple decl");
  await ng(`std::shared_ptr<int> sp;`, /ジェネリック型 shared_ptr<\.\.\.> の宣言は未対応です/, "shared_ptr decl");
  await ng(`std::basic_string<char> s = "ab";`, /ジェネリック型 basic_string<\.\.\.> の宣言は未対応です/, "basic_string decl");
});

/* ---------- (6)(7) C++ データ：虚偽申告の是正 ---------- */

const loadCppMerged = async () => {
  const d = getDefinition("cpp");
  const baseUrl = new URL("../js/types/cpp/", import.meta.url).href;
  const adv = await loadAdvanced({ id: "cpp" }, { baseUrl });
  return mergeCatalog(d, adv);
};

test("A8 cpp data: vector/pair は実装どおり対応、pair の syntax は宣言形", async () => {
  const merged = await loadCppMerged();
  const byName = new Map(merged.reference.map((r) => [r.name, r]));
  for (const name of ["std::vector", "std::pair"]) {
    const it = byName.get(name);
    assert.equal(itemStatus(it), "supported", name);
    assert.ok(!/未実装のため、実行できません/.test(it.caution || ""), `${name} caution`);
  }
  assert.equal(byName.get("std::pair").syntax, "template< class T, class U > struct pair;");
  // 件数は是正分だけ動く（合成総数 4,948 = 基礎33＋高度4,915。
  // 高度側は対応 274→288／未対応 4,641→4,627、基礎33は全て対応）
  assert.deepEqual(countByStatus(merged.reference), {
    total: 4948, supported: 321, unsupported: 4627, unverified: 0,
  });
});

test("A8 cpp data: イテレータ型12件は対応で、例題が実行できる", async () => {
  const merged = await loadCppMerged();
  const byName = new Map(merged.reference.map((r) => [r.name, r]));
  const iterNames = [];
  for (const cls of ["string", "vector", "array"])
    for (const m of ["iterator", "const_iterator", "reverse_iterator", "const_reverse_iterator"])
      iterNames.push(`std::${cls}::${m}`);
  for (const name of iterNames) {
    const it = byName.get(name);
    assert.equal(itemStatus(it), "supported", name);
    assert.ok(!/実行時の操作はありません/.test(it.caution || ""), `${name} caution`);
    const r = await run("cpp", cpp(it.example));
    assert.deepEqual(errs(r), [], `${name} example: ${JSON.stringify(errs(r))}`);
  }
});

/* ---------- TEXT班 T-1〜T-4（文面欠陥） ---------- */

test("A8 text: 定義域外を例示していた数学項目の example が定義域内になっている", async () => {
  const merged = await loadCppMerged();
  const byName = new Map(merged.reference.map((r) => [r.name, r]));
  assert.equal(byName.get("std::acosh").example, "double r = std::acosh(1.5);");
  assert.equal(byName.get("std::acoshf").example, "float r = std::acoshf(1.5);");
  assert.equal(byName.get("std::acosl").example, "long double r = std::acosl(0.5);");
  assert.equal(byName.get("std::asinl").example, "long double r = std::asinl(0.5);");
  assert.equal(byName.get("std::atanhl").example, "long double r = std::atanhl(0.5);");
  // 対応項目 acosh の例は実値どおり実行できる（g++ 実値 0.9624236… の表示丸め）
  await ok(`double r = std::acosh(1.5); std::cout << r;`, "0.962424", "acosh(1.5)");
});

test("A8 text: イテレータ無効化の開示が変更系メンバ項目に保持される", async () => {
  const merged = await loadCppMerged();
  const byName = new Map(merged.reference.map((r) => [r.name, r]));
  const targets = [
    "std::string::append", "std::string::assign", "std::string::clear",
    "std::string::erase", "std::string::insert", "std::string::operator+=",
    "std::string::operator=", "std::string::pop_back", "std::string::push_back",
    "std::string::replace", "std::string::resize", "std::string::swap",
    "std::vector::assign", "std::vector::clear", "std::vector::emplace",
    "std::vector::emplace_back", "std::vector::erase", "std::vector::insert",
    "std::vector::operator=", "std::vector::pop_back", "std::vector::push_back",
    "std::vector::resize", "std::vector::swap",
  ];
  for (const name of targets) {
    const it = byName.get(name);
    assert.ok(it, name);
    assert.ok(/イテレータの無効化を再現しません/.test(it.caution || ""), `${name}: ${it.caution}`);
  }
  // 開示どおりのモデル挙動（位置ベース：erase でずれた先の要素を指す）
  await ok(
    `std::vector<int> v = {10, 20, 30}; auto it = v.begin() + 1; v.erase(v.begin()); std::cout << *it;`,
    "30", "position-based iterator after erase");
});

test("A8 text: イテレータ移動量の停止文言が理由の形になっている", async () => {
  await ng(
    `std::vector<int> v = {10, 20, 30}; auto it = v.begin(); std::advance(it, 1.5);`,
    /イテレータの移動量は整数でなければなりません/, "advance non-integer");
});

/* ---------- (1)(2)(3) CloudFormation ---------- */

const SMALL_LEDGER = {
  reference: [
    ...cfnDefinition.reference,
    { name: "AWS::S3::Bucket" },
    { name: "AWS::SQS::Queue" },
    { name: "AWS::SNS::Topic" },
    { name: "Alexa::ASK::Skill" },
  ],
};

test("A8 cfn: 全角で書かれた Type も注記対象になる（照合は元の文字列）", () => {
  const ledger = buildResourceTypeLedger(SMALL_LEDGER);
  const hits = findUnlistedResourceTypes(
    { Resources: { B: { Type: "ＡWS::S3::Bucket" } } },
    ledger,
  );
  assert.equal(hits.length, 1);
  assert.equal(hits[0].type, "ＡWS::S3::Bucket");
  const note = unlistedTypeNote(hits[0]);
  assert.ok(note.includes("ＡWS::S3::Bucket"), "注記文面は元の文字列で表示する");
  // 全角コロン形も対象
  const hits2 = findUnlistedResourceTypes(
    { Resources: { B: { Type: "AWS：：S3：：Bucket" } } },
    ledger,
  );
  assert.equal(hits2.length, 1);
  // 小文字 aws:: は従来どおり対象外（NFKC で大文字化しない）
  const hits3 = findUnlistedResourceTypes(
    { Resources: { B: { Type: "aws::s3::bucket" } } },
    ledger,
  );
  assert.equal(hits3.length, 0);
  // 台帳内の正規形は従来どおり注記なし
  const hits4 = findUnlistedResourceTypes(
    { Resources: { B: { Type: "AWS::S3::Bucket" } } },
    ledger,
  );
  assert.equal(hits4.length, 0);
});

test("A8 cfn: cfn-adv-multi-resource の intro は実挙動（Metadata 追加）と一致する", async () => {
  const baseUrl = new URL("../js/types/cloudformation/", import.meta.url).href;
  const adv = await loadAdvanced({ id: "cloudformation" }, { baseUrl });
  const merged = mergeCatalog(cfnDefinition, adv);
  const tpl = merged.templates.find((t) => t.id === "cfn-adv-multi-resource");
  assert.ok(tpl, "template exists");
  assert.ok(!tpl.intro.includes("断片をそのまま返します"), "虚偽の文言が残っていない");
  assert.ok(tpl.intro.includes("Metadata"), "追加される Metadata に言及する");
  const hooked = applyAdvancedEngine(
    { ...cfnDefinition },
    { reference: merged.reference },
  );
  const r = await hooked.simulate(tpl.code, structuredClone(cfnDefinition.model.defaults));
  assert.deepEqual(errs(r), [], JSON.stringify(errs(r)));
  assert.equal(r.notes, undefined, "台帳内 Type のみなので注記は付かない");
  const text = JSON.stringify(r.paths[0]);
  assert.ok(text.includes("Metadata") && text.includes("dev"), "実挙動でも Metadata（Stage: dev）が付く");
});

test("A8 cfn data: ゼロプロパティ種別の文は標準文に統一されている", async () => {
  const baseUrl = new URL("../js/types/cloudformation/", import.meta.url).href;
  const adv = await loadAdvanced({ id: "cloudformation" }, { baseUrl });
  const merged = mergeCatalog(cfnDefinition, adv);
  const byName = new Map(merged.reference.map((r) => [r.name, r]));
  const disc = byName.get("AWS::ApplicationSignals::Discovery");
  assert.ok(disc.description.endsWith("このリソースタイプにはプロパティがありません。"), disc.description);
  const nonStandard = merged.reference.filter(
    (r) => /プロパティはありません/.test(r.description || "") &&
      !/このリソースタイプにはプロパティがありません。$/.test(r.description),
  );
  assert.deepEqual(nonStandard.map((r) => r.name), []);
});

/* ---------- C／C# への波及なし ---------- */

test("A8 regression: C と C# の基本動作は変わらない", async () => {
  const rc = await run("c", `#include <stdio.h>\nint main() { int a[3] = {1,2,3}; printf("%d", a[1]); return 0; }`);
  assert.deepEqual(errs(rc), []);
  assert.deepEqual(outs(rc), ["2"]);
  const rs = await run("csharp", `using System;\nclass Program { static void Main() { int[] a = {1,2,3}; Console.Write(a[1]); } }`);
  assert.deepEqual(errs(rs), []);
  assert.deepEqual(outs(rs), ["2"]);
});
