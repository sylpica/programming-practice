import { run } from "./harness.mjs";
const HDR = `#include <iostream>\n#include <string>\n#include <vector>\n#include <array>\n#include <utility>\n#include <cmath>\n#include <cstdlib>\n#include <cctype>\n#include <cstring>\n#include <numeric>\n#include <algorithm>\n#include <bit>\n#include <numbers>\nint main() {\n`;
const CTX = `std::vector<int> v = {3, 1, 2};\nstd::array<int, 3> a = {1, 2, 3};\nstd::string s = "abc";\nstd::string s1 = "a";\nint x = 5;\nchar word[] = "Tea2026";\nchar text[] = "green tea";\nstd::vector<int> b = {4, 5, 6};\nstd::vector<int> out(3);\n`;
const exs = {
  "std::inner_product": `int ip = std::inner_product(a.begin(), a.end(), b.begin(), 0);`,
  "std::partial_sum": `std::partial_sum(v.begin(), v.end(), out.begin());`,
  "std::adjacent_difference": `std::adjacent_difference(v.begin(), v.end(), out.begin());`,
  "std::mismatch": `auto p = std::mismatch(a.begin(), a.end(), b.begin());`,
  "std::equal": `bool same = std::equal(a.begin(), a.end(), b.begin());`,
  "std::copy": `std::copy(v.begin(), v.end(), out.begin());`,
  "std::copy_n": `std::copy_n(v.begin(), 3, out.begin());`,
  "std::lexicographical_compare": `bool less = std::lexicographical_compare(a.begin(), a.end(), b.begin(), b.end());`,
};
for (const [n, ex] of Object.entries(exs)) {
  const r = await run(HDR + CTX + ex + `\n return 0;\n}`);
  console.log(n, "\tERR=", r.errors.join(" ;; ") || "-");
}
