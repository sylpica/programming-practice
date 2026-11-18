// 高度モード B8：C++ 高度差分（cppreference 2025-02-09 スナップショットに基づく）。
// 項目形式は機構契約（docs/audit/muse/advanced-interface.md）第4章の正規形。

export const templatesAdvanced = [
 {
  "id": "cpp-adv-sort-search",
  "title": "vectorを並べ替えて二分探索する",
  "level": "実践",
  "code": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <iterator>\nint main() {\nstd::vector<int> v;\nv.push_back(5);\nv.push_back(2);\nv.push_back(8);\nv.push_back(1);\nstd::sort(v.begin(), v.end());\nstd::cout << v.front() << std::endl;\nstd::cout << v.back() << std::endl;\nstd::cout << std::binary_search(v.begin(), v.end(), 8) << std::endl;\nstd::cout << std::distance(v.begin(), std::lower_bound(v.begin(), v.end(), 5)) << std::endl;\nreturn 0;\n}",
  "intro": "std::sortで小さい順に並べ替え、front／backで両端、二分探索（binary_search／lower_bound）で値の有無と位置を確認します。lower_boundが返すイテレータは「指す位置」として扱います。",
  "refs": [
   "std::vector::push_back",
   "std::vector::begin",
   "std::vector::end",
   "std::vector::front",
   "std::vector::back",
   "std::sort",
   "std::binary_search",
   "std::lower_bound",
   "std::distance"
  ]
 },
 {
  "id": "cpp-adv-numeric-accumulate",
  "title": "累積和と内積を計算する",
  "level": "応用",
  "code": "#include <iostream>\n#include <array>\n#include <vector>\n#include <numeric>\n#include <algorithm>\nint main() {\nstd::array<int, 5> a;\nstd::iota(a.begin(), a.end(), 1);\nstd::vector<int> sums;\nsums.resize(5);\nstd::partial_sum(a.begin(), a.end(), sums.begin());\nstd::cout << std::accumulate(a.begin(), a.end(), 0) << std::endl;\nstd::cout << sums.back() << std::endl;\nstd::cout << std::inner_product(a.begin(), a.end(), a.begin(), 0) << std::endl;\nstd::cout << *std::max_element(a.begin(), a.end()) << std::endl;\nreturn 0;\n}",
  "intro": "std::iotaで1から5を生成し、合計（accumulate）、途中までの累積和（partial_sum）、内積（inner_product）、最大の要素（max_element）を求めます。演算を指定する形式は未対応のため、既定の加算・乗算だけを使います。",
  "refs": [
   "std::array",
   "std::array::begin",
   "std::array::end",
   "std::iota",
   "std::accumulate",
   "std::partial_sum",
   "std::inner_product",
   "std::max_element",
   "std::vector::resize",
   "std::vector::begin",
   "std::vector::back"
  ]
 },
 {
  "id": "cpp-adv-string-search",
  "title": "文字列を検索して部分文字列を取り出す",
  "level": "実践",
  "code": "#include <iostream>\n#include <string>\nint main() {\nstd::string s = \"programming practice\";\nstd::cout << s.size() << std::endl;\nstd::cout << s.find(\"practice\") << std::endl;\nstd::cout << s.substr(12) << std::endl;\nstd::cout << s.starts_with(\"pro\") << std::endl;\nstd::cout << s.contains(\"gram\") << std::endl;\nif (s.find(\"xyz\") == std::string::npos) {\n    std::cout << \"not found\" << std::endl;\n}\nreturn 0;\n}",
  "intro": "findで部分文字列の位置を探し、substrで取り出します。見つからない場合はnposが返ることを確認し、starts_with／containsで先頭と含むかどうかも調べます。",
  "refs": [
   "std::string::size",
   "std::string::find",
   "std::string::substr",
   "std::string::starts_with",
   "std::string::contains",
   "std::string::npos"
  ]
 },
 {
  "id": "cpp-adv-string-edit",
  "title": "文字列を組み立てて編集する",
  "level": "実践",
  "code": "#include <iostream>\n#include <string>\nint main() {\nstd::string s = \"tea\";\ns.append(\" time\");\ns.push_back('!');\ns.insert(0, \"hot \");\nstd::cout << s << std::endl;\ns.erase(0, 4);\ns.replace(0, 3, \"ice\");\nstd::cout << s << std::endl;\nstd::cout << s.compare(\"ice time!\") << std::endl;\nreturn 0;\n}",
  "intro": "append／push_back／insertで文字列を組み立て、eraseとreplaceで先頭を書き換えます。最後にcompareで期待どおりの文字列と等しい（戻り値0）ことを確認します。",
  "refs": [
   "std::string::append",
   "std::string::push_back",
   "std::string::insert",
   "std::string::erase",
   "std::string::replace",
   "std::string::compare"
  ]
 },
 {
  "id": "cpp-adv-math-numbers",
  "title": "数学関数と数学定数で計算する",
  "level": "実践",
  "code": "#include <iostream>\n#include <cmath>\n#include <numbers>\nint main() {\ndouble r = 2.0;\ndouble area = std::numbers::pi * std::pow(r, 2.0);\nstd::cout << area << std::endl;\nstd::cout << std::hypot(3.0, 4.0) << std::endl;\nstd::cout << std::sqrt(2.0) << std::endl;\nstd::cout << std::numbers::sqrt2 << std::endl;\nstd::cout << std::floor(2.7) << std::endl;\nstd::cout << std::ceil(2.3) << std::endl;\nreturn 0;\n}",
  "intro": "std::numbers::piとpowで円の面積、hypotで直角三角形の斜辺、sqrtで平方根を求めます。floor／ceilで切り捨てと切り上げも確認します。特殊関数は使っていません。",
  "refs": [
   "std::pow",
   "std::hypot",
   "std::sqrt",
   "std::floor",
   "std::ceil",
   "std::numbers::pi",
   "std::numbers::sqrt2"
  ]
 },
 {
  "id": "cpp-adv-convert",
  "title": "文字列と数値を相互に変換する",
  "level": "実践",
  "code": "#include <iostream>\n#include <string>\n#include <cstdlib>\nint main() {\nstd::string text = \"42\";\nint n = std::stoi(text);\ndouble d = std::stod(\"2.5\");\nstd::cout << n + 8 << std::endl;\nstd::cout << d << std::endl;\nstd::cout << std::to_string(n) + \" points\" << std::endl;\nstd::cout << std::atoi(\"17\") + 3 << std::endl;\nreturn 0;\n}",
  "intro": "std::stoi／std::stodで文字列を数値へ、std::to_stringで数値を文字列へ変換します。C由来のstd::atoiでも同じ変換ができることを比べます。",
  "refs": [
   "std::stoi",
   "std::stod",
   "std::to_string",
   "std::atoi"
  ]
 },
 {
  "id": "cpp-adv-cstring-cctype",
  "title": "C文字列と文字種を調べる",
  "level": "応用",
  "code": "#include <iostream>\n#include <cstring>\n#include <cctype>\nint main() {\nchar word[] = \"Tea2026\";\nstd::cout << std::strlen(word) << std::endl;\nint digits = 0;\nint letters = 0;\nfor (int i = 0; word[i] != '\\0'; i++) {\n    if (std::isdigit(word[i])) { digits += 1; }\n    else if (std::isalpha(word[i])) { letters += 1; }\n}\nstd::cout << letters << std::endl;\nstd::cout << digits << std::endl;\nstd::cout << std::strcmp(\"tea\", \"tea\") << std::endl;\nchar c = std::tolower('A');\nstd::cout << c << std::endl;\nif (std::strstr(\"green tea\", \"tea\") != nullptr) {\n    std::cout << \"found\" << std::endl;\n}\nreturn 0;\n}\n",
  "intro": "std::strlenで長さ、std::isdigit／std::isalphaで文字種を数え、std::strcmpで文字列の一致、std::tolowerで小文字化、std::strstrで部分文字列の有無を調べます。",
  "refs": [
   "std::strlen",
   "std::strcmp",
   "std::strstr",
   "std::isdigit",
   "std::isalpha",
   "std::tolower"
  ]
 },
 {
  "id": "cpp-adv-bit-pair",
  "title": "pairの交換とビットを数える",
  "level": "応用",
  "code": "#include <iostream>\n#include <utility>\n#include <bit>\nint main() {\nstd::pair<int, int> p = std::make_pair(3, 7);\nstd::cout << p.first + p.second << std::endl;\nstd::swap(p.first, p.second);\nstd::cout << p.first << std::endl;\nunsigned int x = 12;\nstd::cout << std::popcount(x) << std::endl;\nstd::cout << std::bit_width(x) << std::endl;\nunsigned int flag = 8;\nstd::cout << std::has_single_bit(flag) << std::endl;\nint old = std::exchange(p.first, 100);\nstd::cout << old << std::endl;\nstd::cout << p.first << std::endl;\nreturn 0;\n}",
  "intro": "std::make_pairで組を作り、std::swapで要素を入れ替え、std::exchangeで置き換え前の値を取り出します。std::popcount／std::bit_width／std::has_single_bitで符号なし整数のビットも調べます。",
  "refs": [
   "std::make_pair",
   "std::pair::first",
   "std::pair::second",
   "std::swap",
   "std::exchange",
   "std::popcount",
   "std::bit_width",
   "std::has_single_bit"
  ]
 }
];
