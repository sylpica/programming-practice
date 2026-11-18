// WS-CPP 収束ラウンド：CPP-01〜24 / CPP-B1〜B10 / CPP-25〜31 / REG-04 再実行
// 入力は前回所見（findings-cpp-exec.md / findings-cpp-stop.md）の記載と同一形。
import fs from "node:fs";
import { runBody } from "./harness.mjs";

const P = [];
const add = (id, body, note = "") => P.push({ id, body, note });

// ---- CPP-01〜24（前回と同一入力） ----
add("CPP-01", `std::vector<int> v = {5,2,8,1,9,3}; std::sort(v.begin(), v.end()); for (int x: v) std::cout << x << " "; std::cout << "|" << std::binary_search(v.begin(), v.end(), 8) << std::binary_search(v.begin(), v.end(), 4);`);
add("CPP-02", `std::vector<int> a = {1,2,3,4}; std::vector<int> b = {4,5,6}; std::vector<int> c = {1,2,3}; std::cout << std::accumulate(a.begin(), a.end(), 100) << " " << std::inner_product(c.begin(), c.end(), b.begin(), 0);`);
add("CPP-03", `std::vector<int> a = {1,2,3,4}; std::vector<int> ps(4); std::vector<int> ad(4); std::partial_sum(a.begin(), a.end(), ps.begin()); std::adjacent_difference(a.begin(), a.end(), ad.begin()); for (int x: ps) std::cout << x << " "; std::cout << "|"; for (int x: ad) std::cout << x << " "; std::cout << "|"; std::vector<int> io(4); std::iota(io.begin(), io.end(), 5); for (int x: io) std::cout << x << " ";`);
add("CPP-04", `std::string s = "banana"; std::cout << s.find("na") << " " << s.rfind("na") << " " << s.substr(1,3) << " " << (s.find("q") == std::string::npos);`);
add("CPP-05a", `std::string s = "hello"; s.replace(0,1,"J"); std::cout << s;`);
add("CPP-05b", `std::string s = "abcd"; s.erase(1,2); s.insert(1,"XY"); std::cout << s;`);
add("CPP-05c", `std::string s = "ab"; s.push_back('c'); s.pop_back(); std::cout << s;`);
add("CPP-06a", `std::vector<int> v = {10,20,30}; std::cout << v.at(2);`);
add("CPP-06b", `std::vector<int> v = {10,20,30}; std::cout << v.at(3);`);
add("CPP-07", `auto mm = std::minmax(3,7); std::vector<int> v = {4,1,9,2}; std::cout << std::clamp(15,0,10) << " " << std::clamp(-3,0,10) << " " << std::clamp(5,0,10) << " " << mm.first << " " << mm.second << " " << *std::min_element(v.begin(), v.end()) << " " << *std::max_element(v.begin(), v.end());`);
add("CPP-08", `double a = std::pow(2.0,10.0); double b = std::sqrt(2.0); double c = std::hypot(3.0,4.0); double e = std::fmod(10.5,3.0); double f = std::remainder(10.5,3.0); std::cout << (a==1024.0) << (b>1.4142135623730950 && b<1.4142135623730952) << (c==5.0) << (e==1.5) << (f==-1.5) << " " << a << " " << b << " " << c << " " << e << " " << f;`);
add("CPP-09", `std::cout << std::round(2.5) << " " << std::round(-2.5) << " " << std::round(1.5) << " " << std::nearbyint(2.5) << " " << std::nearbyint(3.5) << " " << std::rint(2.5);`);
add("CPP-10", `std::div_t d1 = std::div(-7,2); std::div_t d2 = std::div(7,-2); std::ldiv_t d3 = std::ldiv(10L,3L); std::cout << d1.quot << "," << d1.rem << " " << d2.quot << "," << d2.rem << " " << d3.quot << "," << d3.rem;`);
add("CPP-11a", `std::cout << std::stoi("42abc") << " " << std::stoi("  -17") << " " << std::stod("2.5x") << " " << std::to_string(3.5) << " " << std::to_string(42);`);
add("CPP-11b", `std::cout << std::stoi("abc");`);
add("CPP-12", `std::cout << (std::isalpha('A') != 0) << (std::isalpha('7') != 0) << (std::isdigit('7') != 0) << (std::isspace('\\t') != 0) << (std::isupper('a') != 0) << " " << (char)std::toupper('q') << (char)std::tolower('Q');`);
add("CPP-13a", `std::cout << std::strlen("hello") << " " << std::strlen("") << " " << (std::strcmp("abc","abd") < 0) << (std::strcmp("abc","abd") == 0) << " " << std::strcmp("abc","abc");`);
add("CPP-13b", `char buf[] = "hello"; std::cout << std::strchr(buf, 'l') << " " << std::strrchr(buf, 'l') << " " << std::strstr(buf, "ell");`);
add("CPP-13c", `char buf[] = "hello"; std::cout << (std::strstr(buf, "z") == nullptr) << (std::strchr(buf, 'x') == nullptr);`);
add("CPP-13d-pointerdiff", `char buf[] = "hello"; std::cout << (std::strchr(buf, 'l') - buf);`, "前回は名指し停止（未対応のポインタ演算）だった形");
add("CPP-14", `std::cout << std::popcount(0xFFu) << " " << std::popcount(0u) << " " << std::bit_width(5u) << " " << std::bit_width(0u) << " " << std::bit_floor(9u) << " " << std::bit_floor(0u) << " " << std::bit_ceil(1u) << " " << std::bit_ceil(9u) << " " << std::has_single_bit(0u) << " " << std::has_single_bit(16u) << " " << std::countr_zero(8u) << " " << std::rotl(0x80000000u, 1) << " " << std::rotr(1u, 1);`);
add("CPP-15", `double pi = std::numbers::pi; double e = std::numbers::e; double s2 = std::numbers::sqrt2; double phi = std::numbers::phi; double ln2 = std::numbers::ln2; std::cout << (pi>3.141592653589792 && pi<3.141592653589794) << (e>2.718281828459044 && e<2.718281828459046) << (s2>1.4142135623730950 && s2<1.4142135623730952) << (phi>1.618033988749894 && phi<1.618033988749896) << (ln2>0.6931471805599452 && ln2<0.6931471805599454) << " " << pi << " " << e << " " << s2 << " " << phi << " " << ln2;`);
add("CPP-16a-castform", `int a=1; int b=2; std::swap(a,b); int x=5; int old = std::exchange(x, 9); auto p = std::make_pair(7, std::string("x")); std::cout << a << " " << b;`, "前回は関数形式キャストで名指し停止した形");
add("CPP-16b", `int a=1; int b=2; std::swap(a,b); int x=5; int old = std::exchange(x, 9); std::string xs = "x"; auto p = std::make_pair(7, xs); std::pair<int,int> q = {1,2}; std::pair<int,int> w = {3,4}; q.swap(w); std::cout << a << " " << b << " " << old << " " << x << " " << p.first << " " << p.second << " " << q.first << "," << q.second << " " << w.first << "," << w.second;`);
add("CPP-16c", `auto p = std::make_pair(7, "x"); std::cout << p.first << " " << p.second;`);
add("CPP-17", `std::vector<int> v = {10,20,30,40}; auto it = v.begin(); std::advance(it, 3); std::cout << *std::next(v.begin(), 2) << " " << *std::prev(v.end()) << " " << std::distance(v.begin(), v.end()) << " " << *it;`);
add("CPP-18", `std::vector<int> a = {1,2,2,3,2}; std::vector<int> b = {1,2,3}; std::vector<int> c = {1,2,4}; auto m = std::mismatch(b.begin(), b.end(), c.begin()); std::cout << std::count(a.begin(), a.end(), 2) << " " << (std::find(a.begin(), a.end(), 3) - a.begin()) << " " << std::equal(b.begin(), b.end(), b.begin()) << " " << (m.first - b.begin()) << " " << *m.first << " " << *m.second;`);
add("CPP-19a", `std::vector<int> v = {1,2,3}; std::cout << std::next_permutation(v.begin(), v.end()); for (int x: v) std::cout << x;`);
add("CPP-19b", `std::vector<int> v = {3,2,1}; std::cout << std::next_permutation(v.begin(), v.end()); for (int x: v) std::cout << x;`);
add("CPP-19c", `std::vector<int> v = {1,3,2}; std::cout << std::prev_permutation(v.begin(), v.end()); for (int x: v) std::cout << x;`);
add("CPP-20a", `std::vector<int> v = {1,3,4,7,9}; auto er = std::equal_range(v.begin(), v.end(), 5); std::cout << (std::lower_bound(v.begin(), v.end(), 4) - v.begin()) << " " << (std::upper_bound(v.begin(), v.end(), 4) - v.begin()) << " " << (er.first - v.begin()) << " " << (er.second - v.begin()) << " " << std::binary_search(v.begin(), v.end(), 7);`);
add("CPP-20b", `std::vector<int> v = {7,1,4,9,3}; std::cout << std::is_sorted(v.begin(), v.end()) << " "; std::nth_element(v.begin(), v.begin()+2, v.end()); std::cout << v[2] << " "; std::sort(v.begin(), v.end()); std::cout << std::is_sorted(v.begin(), v.end());`);
add("CPP-21a", `std::vector<int> v = {1,2,3,2,4}; auto e = std::remove(v.begin(), v.end(), 2); std::cout << (e - v.begin()) << " " << v[0] << v[1] << v[2] << " " << v.size();`);
add("CPP-21b", `std::vector<int> v = {1,1,2,2,3}; auto e = std::unique(v.begin(), v.end()); std::cout << (e - v.begin()) << " " << v[0] << v[1] << v[2] << " " << v.size();`);
add("CPP-22a", `std::vector<std::pair<int,int>> v = {{2,1},{1,9},{1,3}}; std::sort(v.begin(), v.end()); for (auto& pr: v) std::cout << pr.first << "," << pr.second << " ";`);
add("CPP-22b-lambda", `std::vector<std::pair<int,int>> v = {{2,1},{1,9},{1,3}}; std::stable_sort(v.begin(), v.end(), [](const std::pair<int,int>& x, const std::pair<int,int>& y){ return x.first < y.first; }); for (auto& pr: v) std::cout << pr.first << "," << pr.second << " ";`, "前回は汎用エラーで停止したラムダ形（修正対象）");
add("CPP-22c", `std::vector<std::pair<int,int>> v = {{2,1},{1,9},{1,3}}; std::stable_sort(v.begin(), v.end()); for (auto& pr: v) std::cout << pr.first << "," << pr.second << " ";`);
add("CPP-23a", `std::cerr << "E1"; std::clog << "L1"; std::cout << "O1";`);
add("CPP-23b", `int n; std::cin >> n; if (n > 0) { std::cout << "pos"; } else { std::cout << "nonpos"; }`);
add("CPP-24", `std::vector<int> v = {4,1,3,2}; std::sort(v.begin(), v.end()); std::vector<int> ps(4); std::partial_sum(v.begin(), v.end(), ps.begin()); for (int x: ps) std::cout << x << " "; int mx = *std::max_element(ps.begin(), ps.end()); std::string s = std::to_string(mx); s.append(" items"); std::cout << mx << " " << s << " " << (s.find("10") == 0) << " " << s.find("items");`);

// ---- CPP-B1〜B10 ----
add("CPP-B1a", `std::string s = "abc"; std::cout << s.at(3);`);
add("CPP-B1b", `std::string s = "abc"; std::cout << s[10];`);
add("CPP-B1c", `std::vector<int> v = {1,2,3}; std::cout << v[10];`);
add("CPP-B2a", `std::vector<int> v; std::cout << std::accumulate(v.begin(), v.end(), 7) << " "; std::sort(v.begin(), v.end()); std::cout << v.empty();`);
add("CPP-B2b", `std::vector<int> v; std::cout << *std::max_element(v.begin(), v.end());`);
add("CPP-B2c", `std::string s = ""; std::cout << "[" << s.substr(0,0) << "]";`);
add("CPP-B2d", `std::string s = ""; std::cout << s.substr(1);`);
add("CPP-B3a", `std::cout << std::stoi("99999999999999999999999999");`);
add("CPP-B3b", `std::cout << std::stod("1e999");`);
add("CPP-B4a", `std::cout << std::div(1,0).quot;`);
add("CPP-B4b", `std::cout << 5/0;`);
add("CPP-B4c", `std::cout << 5%0;`);
add("CPP-B4d", `double z = 1.0/0.0; std::cout << std::isinf(z) << " " << z;`);
add("CPP-B5", `double n = std::sqrt(-1.0); double p = std::pow(0.0,-1.0); std::cout << std::isnan(n) << " " << std::isinf(p) << " " << (p > 0) << " " << std::isunordered(n, 1.0) << " " << std::isless(n, 1.0) << " " << n << " " << p;`);
add("CPP-B6", `std::vector<int> v = {10,20,30}; auto it = v.erase(v.begin()); std::cout << *it << " "; auto it2 = v.insert(v.begin(), 5); std::cout << *it2;`);
add("CPP-B7a", `auto p = std::make_pair<int, int>(1, 2); std::cout << p.first << " " << p.second;`);
add("CPP-B7b", `std::pair<int,int> p = std::make_pair<int,int>(1, 2); std::cout << p.first;`);
add("CPP-B8a", `std::size_t n = 3; std::cout << n;`);
add("CPP-B8b", `size_t n = 3; std::cout << n;`);
add("CPP-B9", `std::string s = "abc"; std::cout << s.find("q") << " " << (s.find("q") == std::string::npos) << " "; if (s.find("q") == std::string::npos) { std::cout << "guarded"; }`);
add("CPP-B10a", `std::cout << std::llabs(LLONG_MIN);`);
add("CPP-B10a2", `long long m = -9223372036854775807LL - 1; std::cout << std::llabs(m);`);
add("CPP-B10b", `unsigned int u = 0; std::cout << (u - 1) << " " << std::bit_width(u - 1);`);

// ---- CPP-25〜31 名指し停止（前回と同一形＋統合後の典型形） ----
add("CPP-25-lambda", `std::vector<int> v = {1,2,3}; std::vector<int> w(3); std::transform(v.begin(), v.end(), w.begin(), [](int x){ return x*2; });`);
add("CPP-25-negate", `std::vector<int> v = {1,2,3}; std::vector<int> w(3); std::transform(v.begin(), v.end(), w.begin(), std::negate<int>());`);
add("CPP-25-nullptr", `std::transform();`);
add("CPP-26-userdef", `bool isBig(int x) { return x > 2; } std::vector<int> v = {1,2,3}; std::cout << (std::find_if(v.begin(), v.end(), isBig) - v.begin());`, "注: 関数定義は main 外が正形だが前回所見の指定形は定義を含む形。main内定義は不可のため定義を main 直前に置く変形も併記する（26-userdef2）");
add("CPP-26-userdef-count", `bool isBig(int x) { return x > 2; } std::vector<int> v = {1,2,3}; std::cout << std::count_if(v.begin(), v.end(), isBig);`);
add("CPP-26-lambda-find", `std::vector<int> v = {1,2,3}; std::cout << (std::find_if(v.begin(), v.end(), [](int x){ return x > 2; }) - v.begin());`);
add("CPP-26-lambda-count", `std::vector<int> v = {1,2,3}; std::cout << std::count_if(v.begin(), v.end(), [](int x){ return x > 2; });`);
add("CPP-26-nullptr-find", `std::vector<int> v = {1,2,3}; std::cout << (std::find_if(v.begin(), v.end(), nullptr) - v.begin());`);
add("CPP-26-nullptr-count", `std::vector<int> v = {1,2,3}; std::cout << std::count_if(v.begin(), v.end(), nullptr);`);
add("CPP-27a", `std::vector<int> v = {3,1,2}; std::ranges::sort(v);`);
add("CPP-27b", `std::vector<int> v = {3,1,2}; std::ranges::sort(v.begin(), v.end());`);
add("CPP-27c", `auto f = std::ranges::sort;`);
add("CPP-28a", `std::cout << std::format("{} {}", 1, 2);`);
add("CPP-28b", `std::print("hi");`);
add("CPP-28c", `std::println("hi");`);
add("CPP-29-map", `std::map<int, int> m; m[1] = 2; std::cout << m.at(1);`);
add("CPP-29-deque", `std::deque<int> q; q.push_back(1);`);
add("CPP-29-set", `std::set<int> s = {1,2}; std::cout << s.contains(1);`);
add("CPP-29-optional-decl", `std::optional<int> o;`);
add("CPP-29-optional-init", `std::optional<int> o = 5;`);
add("CPP-29-optional-nullopt", `std::optional<int> o = std::nullopt;`);
add("CPP-29-string-data", `std::string s = "abc"; char* p = s.data();`);
add("CPP-29-string-cstr", `std::string s = "abc"; std::cout << s.c_str();`);
add("CPP-29-vector-data", `std::vector<int> v = {1,2,3}; std::cout << v.data();`);
add("CPP-30-par", `std::vector<int> v = {3,1,2}; std::sort(std::execution::par, v.begin(), v.end());`);
add("CPP-30-seq", `std::vector<int> v = {3,1,2}; std::sort(std::execution::seq, v.begin(), v.end());`);
add("CPP-30-ref", `auto pol = std::execution::par;`);
add("CPP-31-thread", `std::thread t;`);
add("CPP-31-regex-a", `std::string s = "abc"; std::regex re("a.*"); std::cout << std::regex_match(s, re);`);
add("CPP-31-regex-b", `std::cout << std::regex_match("abc", "a.*");`);
add("CPP-31-fs", `std::filesystem::path p = "/a/b.txt"; std::cout << p.filename();`);
add("CPP-31-fs-decl", `std::filesystem::path p;`);
add("CPP-31-fs-paren", `std::filesystem::path p("/a/b.txt");`);
add("CPP-31-chrono-sec", `std::chrono::seconds sec(5); std::cout << sec.count();`);
add("CPP-31-chrono-clock", `auto now = std::chrono::system_clock::now();`);
add("CPP-31-membertype-sizetype", `std::string s = "abc"; std::string::size_type n = s.size(); std::cout << n;`);
add("CPP-31-membertype-vec", `std::vector<int> v = {1,2,3}; std::vector<int>::size_type n = v.size(); std::cout << n;`);

// ---- REG-04（前回所見 §3 の11+パターン） ----
add("REG04-01-forloop", `std::string s = "abc"; int n = 0; for (std::string::iterator it = s.begin(); it != s.end(); ++it) n++; std::cout << n;`);
add("REG04-02-decl", `std::string s = "abc"; std::string::iterator it = s.begin(); std::cout << *it;`);
add("REG04-03-assign", `std::string s = "abc"; std::string::iterator it; it = s.begin(); ++it; std::cout << *it;`);
add("REG04-04-constiter", `std::string s = "abc"; std::string::const_iterator it = s.cbegin(); std::cout << *it;`);
add("REG04-05-reviter", `std::string s = "abc"; std::string::reverse_iterator it = s.rbegin(); std::cout << *it;`);
add("REG04-06-veciter", `std::vector<int> v = {10,20,30}; std::vector<int>::iterator it = v.begin(); std::cout << *it;`);
add("REG04-07-vecconstiter", `std::vector<int> v = {10,20,30}; std::vector<int>::const_iterator it = v.cbegin(); std::cout << *it;`);
add("REG04-08-arriter", `std::array<int, 3> a = {7,8,9}; std::array<int, 3>::iterator it = a.begin(); std::cout << *it;`);
add("REG04-09-vecstriter", `std::vector<std::string> v = {"a","b"}; std::vector<std::string>::iterator it = v.begin(); std::cout << *it;`);
add("REG04-10-distance", `std::string s = "abc"; std::cout << std::distance(s.begin(), s.end());`);
add("REG04-11-multidecl", `std::string s = "abc"; std::string::iterator it = s.begin(), jt = s.end(); std::cout << (it != jt);`);
add("REG04-12-npos-mix1", `std::string s = "abc"; std::cout << (s.find("q") == std::string::npos); std::string::iterator it = s.begin(); std::cout << *it;`);
add("REG04-13-npos-mix2", `std::string s = "abc"; std::string::iterator it = s.begin(); std::cout << *it; std::cout << (s.find("q") == std::string::npos);`);
add("REG04-14-iterptr", `std::string s = "abc"; std::string::iterator* p;`);
add("REG04-15-basicstring", `std::basic_string<char>::iterator it;`);
add("REG04-16-mapiter", `std::map<int,int>::iterator it;`);
add("REG04-17-npos-out", `std::cout << std::string::npos;`);
add("REG04-18-npos-guard", `std::string s = "banana"; if (s.find("na") != std::string::npos) { std::cout << s.substr(2, 2); }`);

const results = [];
for (const p of P) {
  // CPP-26 userdef は関数定義を main の外に置く正形も併走
  const r = await runBody(p.body);
  const flat = r.outputs.map((a) => a.join("")).join(" || ");
  results.push({ id: p.id, body: p.body, note: p.note, errors: r.errors, outputs: flat, channels: r.channels, vars: r.vars, traceHeads: r.trace.map((t) => t.slice(0, 3)) });
  console.log(`${p.id}\tERR=${r.errors.join(" ;; ") || "-"}\tOUT=${flat}`);
}
// CPP-26 の正形（関数定義を main 外）
import { run, wrap } from "./harness.mjs";
{
  const code = `#include <iostream>\n#include <string>\n#include <vector>\n#include <algorithm>\nbool isBig(int x) { return x > 2; }\nint main() {\nstd::vector<int> v = {1,2,3}; std::cout << (std::find_if(v.begin(), v.end(), isBig) - v.begin()) << " " << std::count_if(v.begin(), v.end(), isBig);\n return 0;\n}`;
  const r = await run(code);
  const flat = r.outputs.map((a) => a.join("")).join(" || ");
  results.push({ id: "CPP-26-userdef-outside", body: code, note: "関数定義を main 外に置く正形", errors: r.errors, outputs: flat, channels: r.channels, vars: r.vars, traceHeads: [] });
  console.log(`CPP-26-userdef-outside\tERR=${r.errors.join(" ;; ") || "-"}\tOUT=${flat}`);
}
fs.writeFileSync(new URL("./probes-result.json", import.meta.url), JSON.stringify(results, null, 1));
console.log("TOTAL", results.length);
