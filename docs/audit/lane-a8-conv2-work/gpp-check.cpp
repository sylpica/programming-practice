// g++ 13.3.0 (-std=c++2b -O0) 一次情報照合：プローブと等価なプログラム
#include <iostream>
#include <iomanip>
#include <string>
#include <vector>
#include <array>
#include <utility>
#include <cmath>
#include <cstdlib>
#include <cctype>
#include <cstring>
#include <numeric>
#include <algorithm>
#include <bit>
#include <numbers>
#include <climits>
int main() {
  { std::vector<int> v = {5,2,8,1,9,3}; std::sort(v.begin(), v.end()); std::cout << "01:"; for (int x: v) std::cout << x << " "; std::cout << "|" << std::binary_search(v.begin(), v.end(), 8) << std::binary_search(v.begin(), v.end(), 4) << "\n"; }
  { std::vector<int> a = {1,2,3,4}; std::vector<int> b = {4,5,6}; std::vector<int> c = {1,2,3}; std::cout << "02:" << std::accumulate(a.begin(), a.end(), 100) << " " << std::inner_product(c.begin(), c.end(), b.begin(), 0) << "\n"; }
  { std::vector<int> a = {1,2,3,4}; std::vector<int> ps(4), ad(4); std::partial_sum(a.begin(), a.end(), ps.begin()); std::adjacent_difference(a.begin(), a.end(), ad.begin()); std::cout << "03:"; for (int x: ps) std::cout << x << " "; std::cout << "|"; for (int x: ad) std::cout << x << " "; std::cout << "|"; std::vector<int> io(4); std::iota(io.begin(), io.end(), 5); for (int x: io) std::cout << x << " "; std::cout << "\n"; }
  { std::string s = "banana"; std::cout << "04:" << s.find("na") << " " << s.rfind("na") << " " << s.substr(1,3) << " " << (s.find("q") == std::string::npos) << "\n"; }
  { std::string a = "hello"; a.replace(0,1,"J"); std::string b = "abcd"; b.erase(1,2); b.insert(1,"XY"); std::string c = "ab"; c.push_back('c'); c.pop_back(); std::cout << "05:" << a << " " << b << " " << c << "\n"; }
  { std::vector<int> v = {10,20,30}; std::cout << "06a:" << v.at(2) << "\n"; try { (void)v.at(3); std::cout << "06b:no-throw\n"; } catch (const std::out_of_range& e) { std::cout << "06b:out_of_range:" << e.what() << "\n"; } }
  { auto mm = std::minmax(3,7); std::vector<int> v = {4,1,9,2}; std::cout << "07:" << std::clamp(15,0,10) << " " << std::clamp(-3,0,10) << " " << std::clamp(5,0,10) << " " << mm.first << " " << mm.second << " " << *std::min_element(v.begin(), v.end()) << " " << *std::max_element(v.begin(), v.end()) << "\n"; }
  { std::cout << "08:" << std::setprecision(17) << std::pow(2.0,10.0) << " " << std::sqrt(2.0) << " " << std::hypot(3.0,4.0) << " " << std::fmod(10.5,3.0) << " " << std::remainder(10.5,3.0) << "\n"; std::cout << std::setprecision(6); }
  { std::cout << "09:" << std::round(2.5) << " " << std::round(-2.5) << " " << std::round(1.5) << " " << std::nearbyint(2.5) << " " << std::nearbyint(3.5) << " " << std::rint(2.5) << "\n"; }
  { std::div_t d1 = std::div(-7,2); std::div_t d2 = std::div(7,-2); std::ldiv_t d3 = std::ldiv(10L,3L); std::cout << "10:" << d1.quot << "," << d1.rem << " " << d2.quot << "," << d2.rem << " " << d3.quot << "," << d3.rem << "\n"; }
  { std::cout << "11:" << std::stoi("42abc") << " " << std::stoi("  -17") << " " << std::stod("2.5x") << " " << std::to_string(3.5) << " " << std::to_string(42) << "\n"; try { (void)std::stoi("abc"); } catch (const std::invalid_argument& e) { std::cout << "11b:invalid_argument:" << e.what() << "\n"; } }
  { std::cout << "12:" << (std::isalpha('A') != 0) << (std::isalpha('7') != 0) << (std::isdigit('7') != 0) << (std::isspace('\t') != 0) << (std::isupper('a') != 0) << " " << (char)std::toupper('q') << (char)std::tolower('Q') << "\n"; }
  { char buf[] = "hello"; char buf2[] = "hello world"; std::cout << "13:" << std::strlen("hello") << " " << std::strlen("") << " " << (std::strcmp("abc","abd") < 0) << " " << std::strcmp("abc","abc") << " " << (std::strchr(buf,'l') - buf) << " " << (std::strrchr(buf,'l') - buf) << " " << (std::strstr(buf2,"wor") - buf2) << " " << (std::strstr(buf,"z") == nullptr) << "\n"; }
  { std::cout << "14:" << std::popcount(0xFFu) << " " << std::popcount(0u) << " " << std::bit_width(5u) << " " << std::bit_width(0u) << " " << std::bit_floor(9u) << " " << std::bit_floor(0u) << " " << std::bit_ceil(1u) << " " << std::bit_ceil(9u) << " " << std::has_single_bit(0u) << " " << std::has_single_bit(16u) << " " << std::countr_zero(8u) << " " << std::rotl(0x80000000u, 1) << " " << std::rotr(1u, 1) << "\n"; }
  { std::cout << "15:" << std::setprecision(17) << std::numbers::pi << " " << std::numbers::e << " " << std::numbers::sqrt2 << " " << std::numbers::phi << " " << std::numbers::ln2 << "\n"; std::cout << std::setprecision(6); }
  { int a=1,b=2; std::swap(a,b); int x=5; int old = std::exchange(x,9); auto p = std::make_pair(7, std::string("x")); std::pair<int,int> q = {1,2}, w = {3,4}; q.swap(w); std::cout << "16:" << a << " " << b << " " << old << " " << x << " " << p.first << " " << p.second << " " << q.first << "," << q.second << " " << w.first << "," << w.second << "\n"; }
  { std::vector<int> v = {10,20,30,40}; auto it = v.begin(); std::advance(it, 3); std::cout << "17:" << *std::next(v.begin(), 2) << " " << *std::prev(v.end()) << " " << std::distance(v.begin(), v.end()) << " " << *it << "\n"; }
  { std::vector<int> a = {1,2,2,3,2}; std::vector<int> b = {1,2,3}; std::vector<int> c = {1,2,4}; auto m = std::mismatch(b.begin(), b.end(), c.begin()); std::cout << "18:" << std::count(a.begin(), a.end(), 2) << " " << (std::find(a.begin(), a.end(), 3) - a.begin()) << " " << std::equal(b.begin(), b.end(), b.begin()) << " " << (m.first - b.begin()) << " " << *m.first << " " << *m.second << "\n"; }
  { std::vector<int> a = {1,2,3}; bool r1 = std::next_permutation(a.begin(), a.end()); std::vector<int> b = {3,2,1}; bool r2 = std::next_permutation(b.begin(), b.end()); std::vector<int> c = {1,3,2}; bool r3 = std::prev_permutation(c.begin(), c.end()); std::cout << "19:" << r1; for (int x: a) std::cout << x; std::cout << " " << r2; for (int x: b) std::cout << x; std::cout << " " << r3; for (int x: c) std::cout << x; std::cout << "\n"; }
  { std::vector<int> v = {1,3,4,7,9}; auto er = std::equal_range(v.begin(), v.end(), 5); std::cout << "20a:" << (std::lower_bound(v.begin(), v.end(), 4) - v.begin()) << " " << (std::upper_bound(v.begin(), v.end(), 4) - v.begin()) << " " << (er.first - v.begin()) << " " << (er.second - v.begin()) << " " << std::binary_search(v.begin(), v.end(), 7) << "\n"; std::vector<int> u = {7,1,4,9,3}; std::cout << "20b:" << std::is_sorted(u.begin(), u.end()) << " "; std::nth_element(u.begin(), u.begin()+2, u.end()); std::cout << u[2] << " "; std::sort(u.begin(), u.end()); std::cout << std::is_sorted(u.begin(), u.end()) << "\n"; }
  { std::vector<int> v = {1,2,3,2,4}; auto e = std::remove(v.begin(), v.end(), 2); std::cout << "21a dist=" << (e - v.begin()) << " full:"; for (int x: v) std::cout << x << " "; std::cout << "size=" << v.size() << "\n"; std::vector<int> w = {1,1,2,2,3}; auto e2 = std::unique(w.begin(), w.end()); std::cout << "21b dist=" << (e2 - w.begin()) << " full:"; for (int x: w) std::cout << x << " "; std::cout << "size=" << w.size() << "\n"; }
  { std::vector<std::pair<int,int>> v = {{2,1},{1,9},{1,3}}; std::sort(v.begin(), v.end()); std::cout << "22:"; for (auto& pr: v) std::cout << pr.first << "," << pr.second << " "; std::cout << "\n"; }
  { std::vector<int> v = {4,1,3,2}; std::sort(v.begin(), v.end()); std::vector<int> ps(4); std::partial_sum(v.begin(), v.end(), ps.begin()); std::cout << "24:"; for (int x: ps) std::cout << x << " "; int mx = *std::max_element(ps.begin(), ps.end()); std::string s = std::to_string(mx); s.append(" items"); std::cout << mx << " " << s << " " << (s.find("10") == 0) << " " << s.find("items") << "\n"; }
  { std::string s = "abc"; try { (void)s.at(3); } catch (const std::out_of_range& e) { std::cout << "B1a:out_of_range\n"; } std::vector<int> v; std::cout << "B2a:" << std::accumulate(v.begin(), v.end(), 7) << " " << v.empty() << "\n"; std::string es = ""; std::cout << "B2c:[" << es.substr(0,0) << "]\n"; try { (void)es.substr(1); } catch (const std::out_of_range&) { std::cout << "B2d:out_of_range\n"; } }
  { try { (void)std::stoi("99999999999999999999999999"); } catch (const std::out_of_range&) { std::cout << "B3a:out_of_range\n"; } try { (void)std::stod("1e999"); } catch (const std::out_of_range&) { std::cout << "B3b:out_of_range\n"; } }
  { double z = 1.0/0.0; std::cout << "B4d:" << std::isinf(z) << " " << z << "\n"; double n = std::sqrt(-1.0); double p = std::pow(0.0,-1.0); std::cout << "B5:" << std::isnan(n) << " " << std::isinf(p) << " " << (p > 0) << " " << std::isunordered(n, 1.0) << " " << std::isless(n, 1.0) << " " << n << " " << p << "\n"; }
  { std::vector<int> v = {10,20,30}; auto it = v.erase(v.begin()); int a = *it; auto it2 = v.insert(v.begin(), 5); std::cout << "B6:" << a << " " << *it2 << "\n"; }
  { std::string s = "abc"; std::cout << "B9:" << (long long)(std::make_signed_t<std::size_t>)s.find("q") << " cmp:" << (s.find("q") == std::string::npos) << " npos=" << std::string::npos << "\n"; }
  { unsigned int u = 0; std::cout << "B10b:" << (u - 1) << " " << std::bit_width(u - 1) << "\n"; }
  return 0;
}
