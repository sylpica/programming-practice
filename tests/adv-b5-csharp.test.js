// 高度モード ブロックB5（C# エンジン班）の回帰テスト。
// 期待値はすべて ~/dotnet（SDK 8.0.428）の実コンパイル・実走で採取した
// 一次情報に基づく（不変カルチャ。DateTime 既定書式・文字列の文化依存
// 比較を含む）。未対応に倒した項目は「名前を挙げて停止する」ことを固定する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const run = async (code) => {
  const d = getDefinition("csharp");
  return d.simulate(code, structuredClone(d.model.defaults));
};
const cs = (body) => `using System;\nclass Program {\n static void Main() {\n${body}\n }\n}`;
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
const outputs = (r) => (r.paths || []).flatMap((p) => p.outputs.map((o) => o.text));
const expectOut = async (body, expected) => {
  const r = await run(cs(body));
  assert.deepEqual(errors(r), [], `${body} -> errors`);
  assert.deepEqual(outputs(r), expected, body);
};
const expectErr = async (body, pattern) => {
  const r = await run(cs(body));
  const es = errors(r);
  assert.ok(es.some((e) => pattern.test(e)), `${body} -> ${JSON.stringify(es)} (expected ${pattern})`);
};

/* ---------------- String インスタンス ---------------- */
test("adv-b5 String: 基本メソッド", async () => {
  await expectOut(`string s = "Hello, World!"; Console.WriteLine(s.Contains("World")); Console.WriteLine(s.Contains('o')); Console.WriteLine(s.StartsWith("Hello")); Console.WriteLine(s.EndsWith("!"));`, ["True", "True", "True", "True"]);
  await expectOut(`string s = "Hello, World!"; Console.WriteLine(s.IndexOf('o')); Console.WriteLine(s.IndexOf("l")); Console.WriteLine(s.IndexOf("z")); Console.WriteLine(s.LastIndexOf('l'));`, ["4", "2", "-1", "10"]);
  await expectOut(`Console.WriteLine("abc".IndexOf("", 3)); Console.WriteLine("abca".LastIndexOf('a', 2));`, ["3", "0"]);
  await expectOut(`string s = "hello"; Console.WriteLine(s.IndexOfAny(new char[]{'x','l'})); Console.WriteLine(s.LastIndexOfAny(new char[]{'h','o'}));`, ["2", "4"]);
  await expectOut(`string s = "Hello, World!"; Console.WriteLine(s.Substring(7)); Console.WriteLine(s.Substring(0, 5)); Console.WriteLine(s.Substring(13));`, ["World!", "Hello", ""]);
  await expectOut(`Console.WriteLine("hello".Insert(5, "!")); Console.WriteLine("hello world".Remove(5)); Console.WriteLine("hello world".Remove(5, 3));`, ["hello!", "hello", "hellorld"]);
  await expectOut(`Console.WriteLine("aaa".Replace("aa", "b")); Console.WriteLine("aaa".Replace('a', 'b')); Console.WriteLine("aaa".Replace("a", (string)null));`, ["ba", "bbb", ""]);
  await expectOut(`Console.WriteLine("HeLLo".ToLower()); Console.WriteLine("HeLLo".ToUpper()); Console.WriteLine("  hi \t ".Trim()); Console.WriteLine("xxhixx".Trim('x'));`, ["hello", "HELLO", "hi", "hi"]);
  await expectOut(`Console.WriteLine("hi".PadLeft(5)); Console.WriteLine("hi".PadLeft(5, '*')); Console.WriteLine("hi".PadRight(4, '.')); Console.WriteLine("hi".PadLeft(1));`, ["   hi", "***hi", "hi..", "hi"]);
  await expectOut(`string s = "  abc  "; Console.WriteLine(s.Trim().ToUpper());`, ["ABC"]);
  await expectOut(`Console.WriteLine("abc".ToUpper());`, ["ABC"]);
});
test("adv-b5 String: 例外と境界", async () => {
  await expectErr(`string s = "hello"; Console.WriteLine(s.Substring(14));`, /ArgumentOutOfRangeException/);
  await expectErr(`string s = "hello"; Console.WriteLine(s.Substring(0, 14));`, /ArgumentOutOfRangeException/);
  await expectErr(`Console.WriteLine("hello".Insert(6, "!"));`, /ArgumentOutOfRangeException/);
  await expectErr(`Console.WriteLine("aaa".Replace("", "b"));`, /ArgumentException/);
  await expectErr(`string s = "abc"; Console.WriteLine(s.IndexOf('a', 4));`, /ArgumentOutOfRangeException/);
  await expectErr(`string s = null; Console.WriteLine(s.ToUpper());`, /NullReferenceException/);
});
test("adv-b5 String: Split / ToCharArray / CopyTo / Clone / CompareTo / Equals", async () => {
  await expectOut(`string s = "a,b,,c"; string[] p = s.Split(','); Console.WriteLine(p.Length); Console.WriteLine(p[2]);`, ["4", ""]);
  await expectOut(`Console.WriteLine("axxbxxc".Split("xx").Length); Console.WriteLine("axxbxxc".Split("xx", 2)[1]); Console.WriteLine("a,b,c,d".Split(',', 2)[1]); Console.WriteLine("a b  c".Split().Length);`, ["3", "bxxc", "b,c,d", "4"]);
  await expectOut(`Console.WriteLine("abcd".ToCharArray(1, 2).Length); Console.WriteLine("abcd".ToCharArray(1, 2)[0]);`, ["2", "b"]);
  await expectOut(`char[] d = new char[5]; "hello".CopyTo(1, d, 2, 3); Console.WriteLine(d[2]); Console.WriteLine(d[4]);`, ["e", "l"]);
  await expectErr(`char[] d = new char[2]; "hello".CopyTo(0, d, 0, 3);`, /ArgumentOutOfRangeException/);
  await expectOut(`Console.WriteLine("apple".CompareTo("banana") < 0); Console.WriteLine("a".CompareTo("B") < 0); Console.WriteLine("abc".Equals("abc"));`, ["True", "True", "True"]);
  await expectErr(`string s = "hi"; Console.WriteLine(s.GetHashCode());`, /未対応.*GetHashCode/);
});
test("adv-b5 String 静的: Concat / Join / Format / Compare / IsNullOr*", async () => {
  await expectOut(`Console.WriteLine(string.Concat("a", "b")); Console.WriteLine(string.Concat(1, 2.5, true));`, ["ab", "12.5True"]);
  await expectOut(`Console.WriteLine(string.Join("-", new string[]{"a","b","c"})); Console.WriteLine(string.Join("-", new int[]{1,2,3})); Console.WriteLine(string.Join("-", new string[]{"a","b","c"}, 1, 2)); Console.WriteLine(string.Join("-", new string[0]));`, ["a-b-c", "1-2-3", "b-c", ""]);
  await expectOut(`Console.WriteLine(string.Format("{0} + {1} = {2}", 1, 2, 3)); Console.WriteLine(string.Format("{0:F2}", 3.14159)); Console.WriteLine(string.Format("{0:D5}", 42)); Console.WriteLine(string.Format("{0:X}", 255));`, ["1 + 2 = 3", "3.14", "00042", "FF"]);
  await expectOut(`Console.WriteLine(string.Format("{0,6}|{1,-6}|", 42, "hi")); Console.WriteLine(string.Format("{{{0}}}", 7)); Console.WriteLine(string.Format("{0:P0}", 0.25)); Console.WriteLine(string.Format("{0:N0}", 1234567));`, ["    42|hi    |", "{7}", "25 %", "1,234,567"]);
  await expectErr(`Console.WriteLine(string.Format("{1}", 7));`, /FormatException/);
  await expectOut(`Console.WriteLine(string.Compare("a", "B") < 0); Console.WriteLine(string.Compare("B", "a") > 0); Console.WriteLine(string.Compare("abc", "ABC", true)); Console.WriteLine(string.Compare(null, "a") < 0);`, ["True", "True", "0", "True"]);
  await expectOut(`Console.WriteLine(string.IsNullOrEmpty(null)); Console.WriteLine(string.IsNullOrEmpty("")); Console.WriteLine(string.IsNullOrWhiteSpace("  ")); Console.WriteLine(String.Equals("a", "A"));`, ["True", "True", "True", "False"]);
  await expectErr(`Console.WriteLine(string.Intern("x"));`, /未対応/);
});

/* ---------------- Math ---------------- */
test("adv-b5 Math: 基本関数", async () => {
  await expectOut(`Console.WriteLine(Math.Abs(-3)); Console.WriteLine(Math.Abs(-2.5)); Console.WriteLine(Math.Max(3, 7)); Console.WriteLine(Math.Min(3, 7));`, ["3", "2.5", "7", "3"]);
  await expectOut(`Console.WriteLine(Math.Ceiling(2.1)); Console.WriteLine(Math.Ceiling(-2.1)); Console.WriteLine(Math.Floor(2.9)); Console.WriteLine(Math.Floor(-2.1)); Console.WriteLine(Math.Truncate(-2.9));`, ["3", "-2", "2", "-3", "-2"]);
  await expectOut(`Console.WriteLine(Math.Pow(2, 10)); Console.WriteLine(Math.Sqrt(16)); Console.WriteLine(Math.Log(Math.E)); Console.WriteLine(Math.Log(8, 2)); Console.WriteLine(Math.Log10(1000));`, ["1024", "4", "1", "3", "3"]);
  await expectOut(`Console.WriteLine(Math.Sin(1.5707963267948966)); Console.WriteLine(Math.Cos(0)); Console.WriteLine(Math.Atan2(1, 1)); Console.WriteLine(Math.Exp(0));`, ["1", "1", "0.7853981633974483", "1"]);
  await expectOut(`Console.WriteLine(Math.Sign(-3)); Console.WriteLine(Math.Sign(0)); Console.WriteLine(Math.Clamp(15, 0, 10)); Console.WriteLine(Math.BigMul(100000, 100000));`, ["-1", "0", "10", "10000000000"]);
});
test("adv-b5 Math.Round: 銀行丸め（dotnet 実測）", async () => {
  await expectOut(`Console.WriteLine(Math.Round(2.5)); Console.WriteLine(Math.Round(3.5)); Console.WriteLine(Math.Round(-2.5)); Console.WriteLine(Math.Round(3.14159, 2)); Console.WriteLine(Math.Round(2.345, 2));`, ["2", "4", "-2", "3.14", "2.35"]);
  await expectErr(`Console.WriteLine(Math.Round(123.456, -1));`, /ArgumentOutOfRangeException/);
  await expectErr(`Console.WriteLine(Math.Round(1.5, 16));`, /ArgumentOutOfRangeException/);
});
test("adv-b5 Math: 例外", async () => {
  await expectErr(`Console.WriteLine(Math.Abs(int.MinValue));`, /OverflowException/);
  await expectErr(`double d = double.Parse("NaN"); Console.WriteLine(Math.Sign(d));`, /ArithmeticException/);
  await expectErr(`Console.WriteLine(Math.Clamp(5, 10, 0));`, /ArgumentException/);
  await expectOut(`double nan = double.Parse("NaN"); Console.WriteLine(Math.Sqrt(-1)); Console.WriteLine(Math.Acos(2)); Console.WriteLine(Math.Max(nan, 1.0));`, ["NaN", "NaN", "NaN"]);
});

/* ---------------- Parse / Convert ---------------- */
test("adv-b5 Parse: 整数", async () => {
  await expectOut(`Console.WriteLine(int.Parse("  42  ")); Console.WriteLine(int.Parse("+42")); Console.WriteLine(long.Parse("9999999999")); Console.WriteLine(short.Parse("32767"));`, ["42", "42", "9999999999", "32767"]);
  await expectErr(`Console.WriteLine(int.Parse("1,000"));`, /FormatException/);
  await expectErr(`Console.WriteLine(int.Parse("4.2"));`, /FormatException/);
  await expectErr(`Console.WriteLine(int.Parse("9999999999"));`, /OverflowException/);
  await expectErr(`Console.WriteLine(int.Parse(null));`, /ArgumentNullException/);
  await expectErr(`Console.WriteLine(byte.Parse("256"));`, /OverflowException/);
  await expectErr(`Console.WriteLine(byte.Parse("-1"));`, /OverflowException/);
});
test("adv-b5 Parse: 浮動小数点・bool・char", async () => {
  await expectOut(`Console.WriteLine(double.Parse("1,000.5")); Console.WriteLine(double.Parse("1.5e3")); Console.WriteLine(double.Parse("NaN")); Console.WriteLine(double.Parse("-Infinity")); Console.WriteLine(double.Parse("1e999"));`, ["1000.5", "1500", "NaN", "-Infinity", "Infinity"]);
  await expectOut(`Console.WriteLine(float.Parse("1.5")); Console.WriteLine(float.Parse("1e100"));`, ["1.5", "Infinity"]);
  await expectOut(`Console.WriteLine(bool.Parse("  TrUe "));`, ["True"]);
  await expectErr(`Console.WriteLine(bool.Parse("1"));`, /FormatException/);
  await expectOut(`Console.WriteLine(char.Parse("x"));`, ["x"]);
  await expectErr(`Console.WriteLine(char.Parse("xy"));`, /FormatException/);
  await expectErr(`Console.WriteLine(decimal.Parse("1.5"));`, /未対応/);
});
test("adv-b5 Convert", async () => {
  await expectOut(`Console.WriteLine(Convert.ToInt32(2.5)); Console.WriteLine(Convert.ToInt32(3.5)); Console.WriteLine(Convert.ToInt32(-2.5)); Console.WriteLine(Convert.ToInt64(9.5));`, ["2", "4", "-2", "10"]);
  await expectOut(`Console.WriteLine(Convert.ToInt32("42")); Console.WriteLine(Convert.ToInt32(true)); Console.WriteLine(Convert.ToInt32((string)null));`, ["42", "1", "0"]);
  await expectErr(`Console.WriteLine(Convert.ToInt32("4.2"));`, /FormatException/);
  await expectOut(`Console.WriteLine(Convert.ToDouble(3)); Console.WriteLine(Convert.ToString(true)); Console.WriteLine(Convert.ToString(2.5)); Console.WriteLine(Convert.ToBoolean("true")); Console.WriteLine(Convert.ToBoolean(0));`, ["3", "True", "2.5", "True", "False"]);
  await expectOut(`Console.WriteLine(Convert.ToChar(65)); Console.WriteLine(Convert.ToByte("255"));`, ["A", "255"]);
  await expectErr(`Console.WriteLine(Convert.ToChar("ab"));`, /FormatException/);
  await expectOut(`Console.WriteLine(Convert.ToBase64String(new byte[]{72, 105})); Console.WriteLine(Convert.FromBase64String("SGk=")[0]);`, ["SGk=", "72"]);
  await expectErr(`Console.WriteLine(Convert.FromBase64String("!!"));`, /FormatException/);
  await expectOut(`Console.WriteLine(Convert.ToString(10, 2)); Console.WriteLine(Convert.ToString(-1, 16)); Console.WriteLine(Convert.ToInt32("ff", 16));`, ["1010", "ffffffff", "255"]);
  await expectErr(`Console.WriteLine(Convert.ToDecimal("1.5"));`, /未対応/);
  await expectErr(`Console.WriteLine(Convert.ChangeType("1", typeof(int)));`, /未対応|typeof/);
});

/* ---------------- Char 静的 ---------------- */
test("adv-b5 Char 静的", async () => {
  await expectOut(`Console.WriteLine(char.IsDigit('5')); Console.WriteLine(char.IsDigit('a')); Console.WriteLine(char.IsLetter('a')); Console.WriteLine(char.IsPunctuation(',')); Console.WriteLine(char.IsSymbol('+')); Console.WriteLine(char.IsWhiteSpace(' '));`, ["True", "False", "True", "True", "True", "True"]);
  await expectOut(`Console.WriteLine(char.ToUpper('a')); Console.WriteLine(char.ToLower('A')); Console.WriteLine(char.GetNumericValue('7')); Console.WriteLine(char.GetNumericValue('a'));`, ["A", "a", "7", "-1"]);
  await expectOut(`Console.WriteLine(char.GetUnicodeCategory('a')); Console.WriteLine(char.GetUnicodeCategory('5')); Console.WriteLine(char.GetUnicodeCategory(' '));`, ["LowercaseLetter", "DecimalDigitNumber", "SpaceSeparator"]);
  await expectOut(`Console.WriteLine(char.ConvertFromUtf32(0x1F600).Length); Console.WriteLine(char.ConvertToUtf32(char.ConvertFromUtf32(0x1F600), 0));`, ["2", "128512"]);
  await expectErr(`Console.WriteLine(char.ConvertFromUtf32(-1));`, /ArgumentOutOfRangeException/);
  await expectOut(`Console.WriteLine('a'.CompareTo('b') < 0); Console.WriteLine('a'.GetHashCode());`, ["True", "6357089"]);
});

/* ---------------- Array 静的・インスタンス ---------------- */
test("adv-b5 Array 静的", async () => {
  await expectOut(`int[] a = {5, 3, 8, 1}; Array.Sort(a); Console.WriteLine(a[0]); Console.WriteLine(a[3]);`, ["1", "8"]);
  await expectOut(`string[] a = {"a","B","A","b"}; Array.Sort(a); foreach (string x in a) { Console.WriteLine(x); }`, ["a", "A", "b", "B"]);
  await expectOut(`int[] a = {1, 2, 3, 4}; Array.Reverse(a, 1, 2); Console.WriteLine(a[1]); Console.WriteLine(a[2]); Array.Reverse(a); Console.WriteLine(a[0]);`, ["3", "2", "4"]);
  await expectOut(`int[] a = {5, 3, 8, 1}; Console.WriteLine(Array.IndexOf(a, 8)); Console.WriteLine(Array.IndexOf(a, 9)); Console.WriteLine(Array.LastIndexOf(new int[]{1,2,1}, 1));`, ["2", "-1", "2"]);
  await expectOut(`int[] a = {1, 3, 5, 7}; Console.WriteLine(Array.BinarySearch(a, 5)); Console.WriteLine(Array.BinarySearch(a, 4)); Console.WriteLine(Array.BinarySearch(a, 0));`, ["2", "-3", "-1"]);
  await expectOut(`int[] a = {1, 2, 3, 4}; Array.Clear(a, 1, 2); Console.WriteLine(a[1]); Console.WriteLine(a[3]);`, ["0", "4"]);
  await expectOut(`int[] src = {5, 3, 8, 1}; int[] d = new int[5]; Array.Copy(src, 1, d, 2, 2); Console.WriteLine(d[2]); Console.WriteLine(d[3]);`, ["3", "8"]);
  await expectOut(`int[] b = {1, 2, 3, 4}; Array.Copy(b, 0, b, 1, 3); Console.WriteLine(b[1]); Console.WriteLine(b[3]);`, ["1", "3"]);
  await expectErr(`int[] a = {1, 2}; Array.Resize(a, 3);`, /CS1620|ref/);
  await expectErr(`int[] a = {1, 2}; Console.WriteLine(Array.Find(a, x => x > 1));`, /ラムダ|アロー|未対応/);
});
test("adv-b5 Array インスタンス", async () => {
  await expectOut(`int[] a = {5, 3, 8, 1}; Console.WriteLine(a.GetLength(0)); Console.WriteLine(a.GetUpperBound(0)); Console.WriteLine(a.GetLowerBound(0)); Console.WriteLine(a.GetValue(2));`, ["4", "3", "0", "8"]);
  await expectOut(`int[,] a = {{1,2},{3,4}}; Console.WriteLine(a.GetLength(0)); Console.WriteLine(a.GetLength(1)); Console.WriteLine(a.GetValue(1, 0));`, ["2", "2", "3"]);
  await expectOut(`int[] a = {1, 2}; a.SetValue(9, 1); Console.WriteLine(a[1]);`, ["9"]);
  await expectOut(`int[] a = {5, 3}; Console.WriteLine(a.Clone()[1]); Console.WriteLine(a.ToString());`, ["3", "System.Int32[]"]);
  await expectOut(`int[] a = {7, 8}; int[] d = new int[4]; a.CopyTo(d, 1); Console.WriteLine(d[1]); Console.WriteLine(d[2]);`, ["7", "8"]);
  await expectErr(`int[] a = {1, 2}; Console.WriteLine(a.GetLength(1));`, /IndexOutOfRangeException/);
});

/* ---------------- LINQ ---------------- */
test("adv-b5 LINQ: 集約・要素", async () => {
  await expectOut(`int[] a = {3, 1, 2, 2}; Console.WriteLine(a.Count()); Console.WriteLine(a.LongCount()); Console.WriteLine(a.Sum()); Console.WriteLine(a.Min()); Console.WriteLine(a.Max()); Console.WriteLine(a.First()); Console.WriteLine(a.Last());`, ["4", "4", "8", "1", "3", "3", "2"]);
  await expectOut(`int[] e = {1, 2}; int[] z = new int[0]; Console.WriteLine(e.Average()); Console.WriteLine(z.Sum()); Console.WriteLine(z.Any()); Console.WriteLine(z.FirstOrDefault());`, ["1.5", "0", "False", "0"]);
  await expectErr(`int[] z = new int[0]; Console.WriteLine(z.Average());`, /InvalidOperationException/);
  await expectErr(`int[] z = new int[0]; Console.WriteLine(z.Min());`, /InvalidOperationException/);
  await expectErr(`int[] z = new int[0]; Console.WriteLine(z.First());`, /InvalidOperationException/);
  await expectErr(`int[] a = {1, 1}; Console.WriteLine(a.Single());`, /InvalidOperationException/);
  await expectOut(`int[] a = {3, 1, 2, 2}; Console.WriteLine(a.ElementAt(1)); Console.WriteLine(a.ElementAtOrDefault(9)); string[] es = new string[0]; Console.WriteLine(es.FirstOrDefault() == null);`, ["1", "0", "True"]);
  await expectErr(`int[] a = {1}; Console.WriteLine(a.ElementAt(9));`, /ArgumentOutOfRangeException/);
  await expectOut(`double[] dd = {0.1, 0.2}; string[] ss = {"a", "B"}; Console.WriteLine(dd.Sum()); Console.WriteLine(ss.Max()); Console.WriteLine(ss.Min());`, ["0.30000000000000004", "B", "a"]);
});
test("adv-b5 LINQ: 変換・集合", async () => {
  await expectOut(`int[] a = {3, 1, 2, 2}; Console.WriteLine(string.Join(",", a.Distinct())); Console.WriteLine(string.Join(",", a.Skip(1).Take(2))); Console.WriteLine(string.Join(",", a.Reverse()));`, ["3,1,2", "1,2", "2,2,1,3"]);
  await expectOut(`int[] a = {3, 1, 2, 2}; Console.WriteLine(string.Join(",", a.Concat(new int[]{9}))); Console.WriteLine(string.Join(",", a.Append(9).Prepend(0))); Console.WriteLine(a.Contains(2)); Console.WriteLine(a.SequenceEqual(new int[]{3,1,2,2}));`, ["3,1,2,2,9", "0,3,1,2,2,9", "True", "True"]);
  await expectOut(`int[] a = {3, 1, 2, 2}; Console.WriteLine(string.Join(",", a.Except(new int[]{2}))); Console.WriteLine(string.Join(",", a.Intersect(new int[]{2, 9}))); Console.WriteLine(string.Join(",", a.Union(new int[]{2, 9})));`, ["3,1", "2", "3,1,2,9"]);
  await expectOut(`Console.WriteLine(string.Join(",", Enumerable.Range(2, 3))); Console.WriteLine(string.Join(",", Enumerable.Repeat("x", 2))); int[] z = new int[0]; Console.WriteLine(string.Join(",", z.DefaultIfEmpty(7)));`, ["2,3,4", "x,x", "7"]);
  await expectOut(`int[] a = {1, 2}; Console.WriteLine(Enumerable.Count(a)); Console.WriteLine(a.Skip(-1).Count()); Console.WriteLine(a.Take(0).Count());`, ["2", "2", "0"]);
  await expectErr(`Console.WriteLine(Enumerable.Range(int.MaxValue, 2).Count());`, /ArgumentOutOfRangeException/);
  await expectErr(`int[] a = {1, 2}; Console.WriteLine(a.Where(x => x > 1).Count());`, /ラムダ|アロー/);
  await expectErr(`int[] a = {1, 2}; Console.WriteLine(a.Select(x => x * 2).Sum());`, /ラムダ|アロー/);
});

/* ---------------- List / HashSet（LINQ 生成経由） ---------------- */
test("adv-b5 List（ToList 生成・インライン利用）", async () => {
  await expectOut(`int[] a = {3, 1, 2, 2}; Console.WriteLine(a.ToList().Count); Console.WriteLine(a.ToList().IndexOf(2)); Console.WriteLine(a.ToList().Contains(9)); Console.WriteLine(a.ToList().ToString());`, ["4", "2", "False", "System.Collections.Generic.List`1[System.Int32]"]);
  await expectOut(`int[] a = {3, 1, 2, 2}; Console.WriteLine(string.Join(",", a.ToList().GetRange(1, 2))); Console.WriteLine(string.Join(",", a.ToList().ToArray()));`, ["1,2", "3,1,2,2"]);
  await expectOut(`int[] a = {1, 3, 5}; Console.WriteLine(a.ToList().BinarySearch(4));`, ["-3"]);
  await expectOut(`int[] a = {1, 2, 3}; Console.WriteLine(a.ToList().Remove(2)); Console.WriteLine(a.ToList().Remove(9));`, ["True", "False"]);
});
test("adv-b5 HashSet（ToHashSet 生成・インライン利用）", async () => {
  await expectOut(`int[] a = {1, 2, 2, 3}; Console.WriteLine(a.ToHashSet().Count); Console.WriteLine(a.ToHashSet().Contains(2)); Console.WriteLine(a.ToHashSet().ToString());`, ["3", "True", "System.Collections.Generic.HashSet`1[System.Int32]"]);
  await expectOut(`int[] a = {1, 2}; int[] b = {2, 1, 1}; int[] c = {1, 2, 3}; Console.WriteLine(a.ToHashSet().SetEquals(b)); Console.WriteLine(c.ToHashSet().Remove(2));`, ["True", "True"]);
  await expectOut(`int[] a = {1, 2, 2, 3}; Console.WriteLine(a.ToHashSet().Add(3)); Console.WriteLine(a.ToHashSet().Add(4));`, ["False", "True"]);
});

/* ---------------- DateTime / TimeSpan ---------------- */
test("adv-b5 DateTime: Parse と成分", async () => {
  await expectOut(`Console.WriteLine(DateTime.Parse("2024-02-29").Year); Console.WriteLine(DateTime.Parse("2024-02-29").DayOfWeek); Console.WriteLine(DateTime.Parse("2024-02-29").DayOfYear); Console.WriteLine(DateTime.Parse("02/29/2024").Month);`, ["2024", "Thursday", "60", "2"]);
  await expectOut(`Console.WriteLine(DateTime.Parse("2024-02-29 13:05:07").Hour); Console.WriteLine(DateTime.Parse("2024-02-29T13:04:05").Minute); Console.WriteLine(DateTime.Parse("2024-02-29").Kind);`, ["13", "4", "Unspecified"]);
  await expectErr(`Console.WriteLine(DateTime.Parse("2024-13-01"));`, /FormatException/);
  await expectErr(`Console.WriteLine(DateTime.Parse("13:04:05"));`, /未対応/);
  await expectOut(`Console.WriteLine(DateTime.DaysInMonth(2024, 2)); Console.WriteLine(DateTime.DaysInMonth(2023, 2));`, ["29", "28"]);
});
test("adv-b5 DateTime: 書式と演算", async () => {
  await expectOut(`Console.WriteLine(DateTime.Parse("2024-02-29 13:05:07").ToString()); Console.WriteLine(DateTime.Parse("2024-02-29").ToShortDateString()); Console.WriteLine(DateTime.Parse("2024-02-29").ToLongDateString());`, ["02/29/2024 13:05:07", "02/29/2024", "Thursday, 29 February 2024"]);
  await expectOut(`Console.WriteLine(DateTime.Parse("2024-02-29 13:05:07").ToString("s")); Console.WriteLine(DateTime.Parse("2024-02-29 13:05:07").ToString("yyyy-MM-dd HH:mm")); Console.WriteLine(DateTime.Parse("2024-02-29").ToString("yyyy/MM/dd"));`, ["2024-02-29T13:05:07", "2024-02-29 13:05", "2024/02/29"]);
  await expectOut(`Console.WriteLine(DateTime.Parse("2024-02-29").AddDays(1).Day); Console.WriteLine(DateTime.Parse("2024-01-31").AddMonths(1).Day); Console.WriteLine(DateTime.Parse("2024-02-29").AddYears(1).ToString("yyyy-MM-dd"));`, ["1", "29", "2025-02-28"]);
  await expectOut(`Console.WriteLine(DateTime.Parse("2024-03-01").Subtract(DateTime.Parse("2024-02-28")).TotalDays); Console.WriteLine(DateTime.Compare(DateTime.Parse("2024-01-01"), DateTime.Parse("2024-01-02"))); Console.WriteLine(DateTime.Parse("2024-01-01").Equals(DateTime.Parse("2024-01-01")));`, ["2", "-1", "True"]);
  await expectOut(`Console.WriteLine(DateTime.Parse("2024-02-29").Date.ToString()); Console.WriteLine(DateTime.Parse("2024-02-29 13:05:07").TimeOfDay.ToString());`, ["02/29/2024 00:00:00", "13:05:07"]);
  await expectOut(`Console.WriteLine(DateTime.Parse("2024-02-29 13:05:07.123").TimeOfDay.ToString());`, ["13:05:07.1230000"]);
  await expectErr(`Console.WriteLine(DateTime.Now);`, /未対応/);
});
test("adv-b5 TimeSpan", async () => {
  await expectOut(`Console.WriteLine(TimeSpan.FromDays(1.5).ToString()); Console.WriteLine(TimeSpan.FromHours(2.5).ToString()); Console.WriteLine(TimeSpan.FromMilliseconds(1500).ToString());`, ["1.12:00:00", "02:30:00", "00:00:01.5000000"]);
  await expectOut(`Console.WriteLine(TimeSpan.Parse("01:30:00").TotalMinutes); Console.WriteLine(TimeSpan.Parse("1.02:00:00").TotalHours); Console.WriteLine(TimeSpan.Parse("2").TotalDays); Console.WriteLine(TimeSpan.Parse("02:03").TotalMinutes);`, ["90", "26", "2", "123"]);
  await expectErr(`Console.WriteLine(TimeSpan.Parse("99:99"));`, /OverflowException/);
  await expectOut(`Console.WriteLine(TimeSpan.FromDays(1).Ticks); Console.WriteLine(TimeSpan.FromHours(-1.5).TotalHours); Console.WriteLine(TimeSpan.FromHours(-1.5).Hours);`, ["864000000000", "-1.5", "-1"]);
  await expectOut(`Console.WriteLine(TimeSpan.Parse("01:00:00").Add(TimeSpan.Parse("00:30:00")).TotalMinutes); Console.WriteLine(TimeSpan.FromHours(-2).Duration().TotalHours); Console.WriteLine(TimeSpan.Compare(TimeSpan.FromHours(1), TimeSpan.FromHours(2)));`, ["90", "2", "-1"]);
  await expectOut(`Console.WriteLine(Convert.ToDateTime("2024-02-29").ToString("yyyy-MM-dd"));`, ["2024-02-29"]);
});

/* ---------------- Console 追加 ---------------- */
test("adv-b5 Console 追加メンバー", async () => {
  await expectOut(`Console.Write("hi"); Console.Write(42); Console.Write(true);`, ["hi", "42", "True"]);
  await expectOut(`Console.Write("{0}+{1}", 1, 2);`, ["1+2"]);
  await expectErr(`Console.Clear();`, /未対応.*Console\.Clear/);
  await expectErr(`Console.Beep();`, /未対応.*Console\.Beep/);
  await expectErr(`Console.SetCursorPosition(0, 0);`, /未対応.*Console\.SetCursorPosition/);
});

/* ---------------- ToString / Equals 等（プリミティブ） ---------------- */
test("adv-b5 Char の ToString 等（数値・bool の ToString は棚卸し外）", async () => {
  await expectOut(`Console.WriteLine('x'.ToString()); Console.WriteLine(char.ToString('y'));`, ["x", "y"]);
  // 数値・bool のインスタンス ToString は棚卸し項目に無いため、従来どおり
  // 汎用の名指し停止のまま（ベースライン R24-N15／R25-N11 の契約と一致）。
  await expectErr(`Console.WriteLine(10.ToString());`, /この関数は説明に対応していません：\.ToString/);
  await expectErr(`bool b = true; Console.WriteLine(b.ToString());`, /この関数は説明に対応していません/);
});

/* ---------------- 未対応の正直な停止（生成経路なし等） ---------------- */
test("adv-b5 未対応: 生成経路のない型・カルチャ", async () => {
  await expectErr(`StringBuilder sb = new StringBuilder();`, /未対応/);
  await expectErr(`Random r = new Random();`, /未対応/);
  await expectErr(`List<int> xs = new List<int>();`, /未対応/);
  await expectErr(`DateTime d = new DateTime(2024, 1, 1);`, /未対応/);
  await expectErr(`Console.WriteLine(CultureInfo.GetCultureInfo("en-US"));`, /未対応/);
  await expectErr(`bool ok = long.TryParse("5", out long n);`, /\) が必要です|未対応/);
});

/* ---------------- 表示修正（C# 表示修正班） ----------------
   欠陥1〜5の回帰：__adv 値（DateTime／TimeSpan／List／HashSet）を
   ToString() 経由でなく直接 WriteLine／連結／補間したときも、C# の
   ToString 形になること。期待値は dotnet 8.0.428 実測（不変カルチャ）：
   DateTime 既定表示 11/17/2026 13:14:15、TimeSpan 1.12:00:00、
   List／HashSet はジェネリック型名。 */
test("adv-b5 表示修正: DateTime / TimeSpan の直接 WriteLine", async () => {
  await expectOut(`Console.WriteLine(DateTime.Parse("2026-11-17 13:14:15"));`, ["11/17/2026 13:14:15"]);
  await expectOut(`Console.WriteLine(DateTime.Parse("2024-02-29 13:05:07"));`, ["02/29/2024 13:05:07"]);
  await expectOut(`Console.WriteLine(TimeSpan.FromDays(1.5));`, ["1.12:00:00"]);
  await expectOut(`Console.WriteLine(TimeSpan.Parse("01:30:00"));`, ["01:30:00"]);
});
test("adv-b5 表示修正: ToList / ToHashSet の直接 WriteLine（型名）", async () => {
  await expectOut(`int[] a = new int[]{1,2,3}; Console.WriteLine(a.ToList());`, ["System.Collections.Generic.List`1[System.Int32]"]);
  await expectOut(`int[] a = new int[]{1,2,3}; Console.WriteLine(a.ToHashSet());`, ["System.Collections.Generic.HashSet`1[System.Int32]"]);
  await expectOut(`string[] b = {"x","y"}; Console.WriteLine(b.ToList());`, ["System.Collections.Generic.List`1[System.String]"]);
  await expectOut(`double[] b = {1.5, 2.5}; Console.WriteLine(b.ToHashSet());`, ["System.Collections.Generic.HashSet`1[System.Double]"]);
  // 通常配列の WriteLine（型名表示）は従来どおり壊れていないこと。
  await expectOut(`int[] a = {1,2,3}; Console.WriteLine(a); char[] c = {'h','i'}; Console.WriteLine(c);`, ["System.Int32[]", "hi"]);
});
test("adv-b5 表示修正: 連結・補間での ToString 形", async () => {
  await expectOut(`Console.WriteLine($"d={DateTime.Parse("2026-11-17")}");`, ["d=11/17/2026 00:00:00"]);
  await expectOut(`Console.WriteLine("d=" + DateTime.Parse("2026-11-17"));`, ["d=11/17/2026 00:00:00"]);
  await expectOut(`string s = "d=" + DateTime.Parse("2026-11-17"); Console.WriteLine(s);`, ["d=11/17/2026 00:00:00"]);
  await expectOut(`string s = "d="; s += DateTime.Parse("2026-11-17"); Console.WriteLine(s);`, ["d=11/17/2026 00:00:00"]);
  await expectOut(`Console.WriteLine(DateTime.Parse("2026-11-17") + "!");`, ["11/17/2026 00:00:00!"]);
  await expectOut(`Console.WriteLine("t=" + TimeSpan.FromDays(1.5)); Console.WriteLine($"t={TimeSpan.FromDays(1.5)}");`, ["t=1.12:00:00", "t=1.12:00:00"]);
  await expectOut(`int[] a = {1,2,3}; Console.WriteLine($"l={a.ToList()}"); Console.WriteLine("h=" + a.ToHashSet());`, ["l=System.Collections.Generic.List`1[System.Int32]", "h=System.Collections.Generic.HashSet`1[System.Int32]"]);
});

/* ---------------- Char.IsSurrogatePair オーバーロード（表示修正班） ----------------
   dotnet 8.0.428 実測で固定：(string, int) の範囲外インデックスは
   false ではなく ArgumentOutOfRangeException、null は
   ArgumentNullException、(string) 1引数形は存在しない（CS1501）。 */
test("adv-b5 Char.IsSurrogatePair: (string, int) 形", async () => {
  await expectOut(`Console.WriteLine(char.IsSurrogatePair("😀", 0)); Console.WriteLine(char.IsSurrogatePair("😀", 1));`, ["True", "False"]);
  await expectOut(`Console.WriteLine(char.IsSurrogatePair("ab", 0)); Console.WriteLine(char.IsSurrogatePair("ab", 1)); Console.WriteLine(char.IsSurrogatePair("a😀", 1)); Console.WriteLine(char.IsSurrogatePair("a😀", 2));`, ["False", "False", "True", "False"]);
  await expectOut(`string s = "😀"; Console.WriteLine(char.IsSurrogatePair(s, 0));`, ["True"]);
  await expectErr(`Console.WriteLine(char.IsSurrogatePair("ab", 2));`, /ArgumentOutOfRangeException/);
  await expectErr(`Console.WriteLine(char.IsSurrogatePair("ab", 5));`, /ArgumentOutOfRangeException/);
  await expectErr(`Console.WriteLine(char.IsSurrogatePair("ab", -1));`, /ArgumentOutOfRangeException/);
  await expectErr(`Console.WriteLine(char.IsSurrogatePair("", 0));`, /ArgumentOutOfRangeException/);
  await expectErr(`Console.WriteLine(char.IsSurrogatePair(null, 0));`, /ArgumentNullException/);
});
test("adv-b5 Char.IsSurrogatePair: (char, char) 形と存在しない1引数形", async () => {
  await expectOut(`Console.WriteLine(char.IsSurrogatePair("😀"[0], "😀"[1])); Console.WriteLine(char.IsSurrogatePair('a', 'b')); Console.WriteLine(char.IsSurrogatePair("😀"[0], 'x'));`, ["True", "False", "False"]);
  // (string) 1引数形は実 .NET に無いため、値を捏造せず名前付きで停止する。
  await expectErr(`Console.WriteLine(char.IsSurrogatePair("😀"));`, /説明に対応していません：char\.IsSurrogatePair/);
  await expectErr(`Console.WriteLine(char.IsSurrogatePair("ab"));`, /説明に対応していません：char\.IsSurrogatePair/);
});

/* ---------------- 修正2A（c-family 側）：CLR 型名レジストリ ----------------
   CS-F02／CS-F09-3。期待値は ~/dotnet（SDK 8.0.428）実走で裏付けた。
   CLR 名形はエイリアス形と完全に同じ挙動になること。Decimal は
   96ビット精度を再現できないため名前付き停止のまま、TimeSpan の
   Zero／MaxValue／MinValue も値を捏造せず名前付き停止にする。 */
test("adv-b5 修正2A 静的定数: CLR 型名形（CS-F02）", async () => {
  await expectOut(`Console.WriteLine(Int32.MaxValue); Console.WriteLine(Int32.MinValue); Console.WriteLine(Int16.MaxValue); Console.WriteLine(Int16.MinValue);`, ["2147483647", "-2147483648", "32767", "-32768"]);
  await expectOut(`Console.WriteLine(UInt32.MaxValue); Console.WriteLine(UInt32.MinValue); Console.WriteLine(SByte.MaxValue); Console.WriteLine(SByte.MinValue); Console.WriteLine(Byte.MaxValue); Console.WriteLine(Byte.MinValue);`, ["4294967295", "0", "127", "-128", "255", "0"]);
  await expectOut(`Console.WriteLine((int)Char.MaxValue); Console.WriteLine((int)Char.MinValue); byte n = Byte.MaxValue; Console.WriteLine(n); char c = Char.MaxValue; Console.WriteLine((int)c);`, ["65535", "0", "255", "65535"]);
  // 64ビット境界値はエイリアス形と同じく未確定値として返る。
  await expectOut(`Console.WriteLine(Int64.MaxValue);`, ["実行時に決まる：Int64.MaxValue（64ビット境界値）"]);
  await expectErr(`Console.WriteLine(UInt64.MinValue);`, /未対応:型 UInt64 のメンバー MinValue は未対応です/);
});
test("adv-b5 修正2A 静的定数: ushort／float／double／bool（CS-F09-3）", async () => {
  await expectOut(`Console.WriteLine(UInt16.MaxValue); Console.WriteLine(UInt16.MinValue); Console.WriteLine(ushort.MaxValue); Console.WriteLine(ushort.MinValue);`, ["65535", "0", "65535", "0"]);
  await expectOut(`Console.WriteLine(Single.MaxValue); Console.WriteLine(Single.MinValue); Console.WriteLine(float.MaxValue); Console.WriteLine(float.MinValue);`, ["3.4028235E+38", "-3.4028235E+38", "3.4028235E+38", "-3.4028235E+38"]);
  await expectOut(`Console.WriteLine(Double.MaxValue); Console.WriteLine(Double.MinValue); Console.WriteLine(double.MaxValue); Console.WriteLine(double.MinValue);`, ["1.7976931348623157E+308", "-1.7976931348623157E+308", "1.7976931348623157E+308", "-1.7976931348623157E+308"]);
  await expectOut(`Console.WriteLine(Boolean.TrueString); Console.WriteLine(Boolean.FalseString); Console.WriteLine(bool.TrueString); Console.WriteLine(bool.FalseString);`, ["True", "False", "True", "False"]);
  await expectOut(`float f = float.MaxValue; Console.WriteLine(f); double d = Double.MinValue; Console.WriteLine(d); ushort u = UInt16.MaxValue; Console.WriteLine(u); string s = Boolean.TrueString; Console.WriteLine(s);`, ["3.4028235E+38", "-1.7976931348623157E+308", "65535", "True"]);
});
test("adv-b5 修正2A 静的定数: 名前付き停止のままのもの（CS-F09-3）", async () => {
  await expectErr(`Console.WriteLine(TimeSpan.Zero);`, /未対応:型 TimeSpan のメンバー Zero は未対応です/);
  await expectErr(`Console.WriteLine(TimeSpan.MaxValue);`, /未対応:型 TimeSpan のメンバー MaxValue は未対応です/);
  await expectErr(`Console.WriteLine(TimeSpan.MinValue);`, /未対応:型 TimeSpan のメンバー MinValue は未対応です/);
  await expectErr(`Console.WriteLine(Decimal.MaxValue);`, /未対応:型 Decimal のメンバー MaxValue は未対応です/);
  await expectErr(`Console.WriteLine(decimal.MaxValue);`, /未対応:型 decimal のメンバー MaxValue は未対応です/);
  // 代入形も NameError ではなく名前付き停止になる。
  await expectErr(`Console.Title = "x";`, /未対応:型 Console のメンバー Title は未対応です/);
  await expectErr(`Console.ForegroundColor = ConsoleColor.Red;`, /未対応/);
  await expectErr(`Console.BackgroundColor = ConsoleColor.Blue;`, /未対応/);
});

/* ---------------- 修正2A：TryParse 一般化（CS-F08／CS-F09-1） ---------------- */
test("adv-b5 修正2A TryParse: CLR 名形はエイリアス形と同じく実行", async () => {
  await expectOut(`int n; Console.WriteLine(Int32.TryParse("42", out n)); Console.WriteLine(n);`, ["True", "42"]);
  await expectOut(`Console.WriteLine(Int32.TryParse("42", out int n)); Console.WriteLine(n);`, ["True", "42"]);
  await expectOut(`Console.WriteLine(Int32.TryParse("xx", out int n)); Console.WriteLine(n);`, ["False", "0"]);
  await expectOut(`Console.WriteLine(Int32.TryParse("42", out var n)); Console.WriteLine(n);`, ["True", "42"]);
  await expectOut(`Console.WriteLine(Int32.TryParse("42", out _));`, ["True"]);
  await expectOut(`double d; Console.WriteLine(Double.TryParse("1.5", out d)); Console.WriteLine(d);`, ["True", "1.5"]);
  await expectOut(`Console.WriteLine(Double.TryParse("xx", out double d)); Console.WriteLine(d);`, ["False", "0"]);
  // out 無しは CLR 名形でも CS1620 を名指す。
  await expectErr(`int n; Console.WriteLine(Int32.TryParse("42", n));`, /CS1620/);
});
test("adv-b5 修正2A TryParse: 他型は項目名を挙げた名前付き停止", async () => {
  await expectErr(`Console.WriteLine(Int64.TryParse("5", out long n));`, /未対応:Int64\.TryParse は未対応です（対応しているのは int と double のみ）/);
  await expectErr(`Console.WriteLine(long.TryParse("5", out long n));`, /未対応:long\.TryParse は未対応です/);
  await expectErr(`Console.WriteLine(Byte.TryParse("5", out byte n));`, /未対応:Byte\.TryParse は未対応です/);
  await expectErr(`Console.WriteLine(Char.TryParse("x", out char n));`, /未対応:Char\.TryParse は未対応です/);
  await expectErr(`Console.WriteLine(Boolean.TryParse("true", out bool n));`, /未対応:Boolean\.TryParse は未対応です/);
  await expectErr(`Console.WriteLine(Single.TryParse("1.5", out float n));`, /未対応:Single\.TryParse は未対応です/);
  await expectErr(`Console.WriteLine(Decimal.TryParse("1.5", out decimal n));`, /未対応:Decimal\.TryParse は未対応です/);
  await expectErr(`Console.WriteLine(DateTime.TryParse("2024-01-01", out DateTime n));`, /未対応:DateTime\.TryParse は未対応です/);
});

/* ---------------- 修正2A：ref 引数の解析（CS-F09-2） ----------------
   ref 修飾を受理してディスパッチ先（高度側の名前付き停止）へ届ける。
   停止文言は高度側の現行文言（Array.Resize を名指す）を固定する。 */
test("adv-b5 修正2A ref 引数: Array.Resize(ref ...) が解析を通る", async () => {
  await expectErr(`int[] a = {1, 2}; Array.Resize(ref a, 3);`, /Array\.Resize/);
  await expectErr(`int[] a = {1, 2}; Array.Resize(in a, 3);`, /Array\.Resize/);
});

/* ---------------- 修正2A：高度メソッドの戻り型推論（CS-F11） ---------------- */
test("adv-b5 修正2A 戻り型推論: char／short／sbyte／char[] の代入", async () => {
  await expectOut(`char c = Char.ToLower('A'); Console.WriteLine(c); char c2 = Char.ToUpper('a'); Console.WriteLine(c2); char c3 = Char.Parse("x"); Console.WriteLine(c3);`, ["a", "A", "x"]);
  await expectOut(`char c = char.ToLower('A'); Console.WriteLine(c); char c2 = Char.ToLowerInvariant('A'); Console.WriteLine(c2); char c3 = Char.ToUpperInvariant('a'); Console.WriteLine(c3);`, ["a", "a", "A"]);
  await expectOut(`char c = Convert.ToChar(65); Console.WriteLine(c); short n = Convert.ToInt16("42"); Console.WriteLine(n); sbyte b = Convert.ToSByte("5"); Console.WriteLine(b);`, ["A", "42", "5"]);
  await expectOut(`sbyte b = SByte.Parse("7"); Console.WriteLine(b); sbyte b2 = sbyte.Parse("3"); Console.WriteLine(b2); short n = Int16.Parse("9"); Console.WriteLine(n); short n2 = short.Parse("12"); Console.WriteLine(n2);`, ["7", "3", "9", "12"]);
  await expectOut(`char[] cs = "tea".ToCharArray(); Console.WriteLine(cs); Console.WriteLine(cs.Length); Console.WriteLine(cs[1]);`, ["tea", "3", "e"]);
  await expectOut(`char c; c = Char.ToLower('A'); Console.WriteLine(c);`, ["a"]);
  // 戻り型が int のメソッドから char への代入は従来どおり CS0266。
  await expectErr(`char c = Convert.ToInt32("65");`, /CS0266/);
});

/* ---------------- 修正2A：式結果の配列表示（CS-F05 表示側） ----------------
   高度側が生成する配列には要素型タグ __elemSys（非列挙）が付く前提で、
   csArrayTypeName のフォールバックと WriteLine の char[] 判定が
   タグを使うことを固定する（タグ付け自体は高度側エンジンの担当）。 */
test("adv-b5 修正2A 表示: 式結果の int 配列・シーケンスの型名", async () => {
  await expectOut(`int[] v = {1, 2}; Console.WriteLine(v.Clone());`, ["System.Int32[]"]);
  await expectOut(`int[] v = {1, 2}; Console.WriteLine(v.ToArray());`, ["System.Int32[]"]);
  await expectOut(`Console.WriteLine(Enumerable.Range(1, 3));`, ["System.Int32[]"]);
  await expectOut(`int[] v = {1, 2, 3}; Console.WriteLine(v.Skip(1)); Console.WriteLine("r=" + v.Skip(1));`, ["System.Int32[]", "r=System.Int32[]"]);
});
test("adv-b5 修正2A 表示: ToCharArray の結果は文字として出す", async () => {
  await expectOut(`Console.WriteLine("tea".ToCharArray());`, ["tea"]);
});

/* ---------------- CS-F03: Char.ConvertToUtf32 の振り分け ----------------
   dotnet 8.0.428 実測で固定：(char, char) 形は 128512、(string, int)
   形の単独サロゲート位置は ArgumentException、(char, char) の不正な
   ペアは ArgumentOutOfRangeException、null は ArgumentNullException。 */
test("adv-b5 CS-F03 Char.ConvertToUtf32: (char, char) 形が正値を返す", async () => {
  await expectOut(`Console.WriteLine(char.ConvertToUtf32('\uD83D', '\uDE00'));`, ["128512"]);
  await expectOut(`char h = '\uD83D'; char l = '\uDE00'; Console.WriteLine(char.ConvertToUtf32(h, l));`, ["128512"]);
  await expectOut(`Console.WriteLine(char.ConvertToUtf32("😀", 0)); Console.WriteLine(char.ConvertToUtf32("ab", 1));`, ["128512", "98"]);
  await expectErr(`Console.WriteLine(char.ConvertToUtf32('a', 'b'));`, /ArgumentOutOfRangeException/);
  await expectErr(`Console.WriteLine(char.ConvertToUtf32("😀", 1));`, /ArgumentException/);
  await expectErr(`Console.WriteLine(char.ConvertToUtf32(null, 0));`, /ArgumentNullException/);
  await expectErr(`Console.WriteLine(char.ConvertToUtf32("ab", 2));`, /ArgumentOutOfRangeException/);
  // 同型点検：(char, int) 形（実 .NET に無い）を文字列の基数変換へ誤振り分けしない。
  await expectErr(`Console.WriteLine(Convert.ToInt32('a', 16));`, /説明に対応していません/);
});

/* ---------------- CS-F13: Char.IsSurrogate(string, int) ----------------
   dotnet 実測：範囲外・空文字列は false でなく ArgumentOutOfRangeException、
   null は ArgumentNullException（IsSurrogatePair と同じ規則）。 */
test("adv-b5 CS-F13 Char.IsSurrogate: (string, int) オーバーロード", async () => {
  await expectOut(`Console.WriteLine(char.IsSurrogate("😀", 0)); Console.WriteLine(char.IsSurrogate("😀", 1)); Console.WriteLine(char.IsSurrogate("ab", 0)); Console.WriteLine(char.IsSurrogate('\uD83D'));`, ["True", "True", "False", "True"]);
  await expectErr(`Console.WriteLine(char.IsSurrogate("ab", 2));`, /ArgumentOutOfRangeException/);
  await expectErr(`Console.WriteLine(char.IsSurrogate("", 0));`, /ArgumentOutOfRangeException/);
  await expectErr(`Console.WriteLine(char.IsSurrogate(null, 0));`, /ArgumentNullException/);
});

/* ---------------- CS-F09-4: CultureInfo の名前付き停止 ---------------- */
test("adv-b5 CS-F09-4 CultureInfo: 直接呼び出し形は全て名前付き停止", async () => {
  await expectErr(`Console.WriteLine(CultureInfo.CreateSpecificCulture("ja"));`, /未対応.*CultureInfo\.CreateSpecificCulture/);
  await expectErr(`Console.WriteLine(CultureInfo.GetCultures(0));`, /未対応.*CultureInfo\.GetCultures/);
  await expectErr(`Console.WriteLine(CultureInfo.GetCultureInfoByIetfLanguageTag("ja-JP"));`, /未対応.*CultureInfo\.GetCultureInfoByIetfLanguageTag/);
});

/* ---------------- CS-F07: String.Format カスタム数値書式 ----------------
   期待値は全て dotnet 8.0.428 実走（不変カルチャ）。丸めは最短10進桁の
   half-away-from-zero（2.5→3、0.125→0.13、9.985→9.99）。
   なお "{0:0.0%}" の実値は "25.0%"（空白なし）。"25.0 %" は書式側に
   空白リテラルを含む "0.0 %" 形と標準 P 書式の結果である。 */
test("adv-b5 CS-F07 String.Format: カスタム数値書式の基本形", async () => {
  await expectOut(`Console.WriteLine(string.Format("{0:0.00}", 3.14159)); Console.WriteLine(string.Format("{0:000}", 42)); Console.WriteLine(string.Format("{0:#.##}", 3.14159)); Console.WriteLine(string.Format("{0:0.0%}", 0.25));`, ["3.14", "042", "3.14", "25.0%"]);
  await expectOut(`Console.WriteLine(string.Format("{0:0}", 2.5)); Console.WriteLine(string.Format("{0:0.00}", 0.125)); Console.WriteLine(string.Format("{0:0.0}", 5.25)); Console.WriteLine(string.Format("{0:0.00}", 9.985)); Console.WriteLine(string.Format("{0:0}", -2.5));`, ["3", "0.13", "5.3", "9.99", "-3"]);
  await expectOut(`Console.WriteLine(string.Format("{0:#,##0}", 1234567)); Console.WriteLine(string.Format("{0:0,,.0}", 1234567)); Console.WriteLine(string.Format("{0:0,}", 1234567)); Console.WriteLine(string.Format("{0:%0.0}", 0.25)); Console.WriteLine(string.Format("{0:0%}", 42));`, ["1,234,567", "1.2", "1235", "%25.0", "4200%"]);
  await expectOut(`Console.WriteLine(string.Format("{0:#.##}", 0.5)); Console.WriteLine(string.Format("{0:#}", 0)); Console.WriteLine(string.Format("{0:0#}", 5)); Console.WriteLine(string.Format("{0:.00}", 0.5)); Console.WriteLine(string.Format("{0:#.##}", -0.5));`, [".5", "", "05", ".50", "-.5"]);
  await expectOut(`double d = double.Parse("NaN"); Console.WriteLine(string.Format("{0:0.00}", d)); Console.WriteLine(string.Format("[{0,8:0.00}]", 3.14159));`, ["NaN", "[    3.14]"]);
});
test("adv-b5 CS-F07 String.Format: 範囲外書式は未対応と分かる文言で停止", async () => {
  await expectErr(`Console.WriteLine(string.Format("{0:0;0}", 5));`, /未対応/);
  await expectErr(`Console.WriteLine(string.Format("{0:0.00E+00}", 12345.678));`, /未対応/);
  await expectErr(`Console.WriteLine(string.Format("{0:0.00 kg}", 3.14159));`, /未対応/);
});

/* ---------------- CS-F06: String.ToCharArray の型保持と既存挙動 ---------------- */
test("adv-b5 CS-F06 String.ToCharArray: 添字・Length・foreach・Join は従来どおり", async () => {
  await expectOut(`Console.WriteLine("tea".ToCharArray()[0]); Console.WriteLine("tea".ToCharArray().Length); Console.WriteLine(string.Join(",", "tea".ToCharArray()));`, ["t", "3", "t,e,a"]);
  await expectOut(`foreach (char c in "tea".ToCharArray()) { Console.WriteLine(c); }`, ["t", "e", "a"]);
});

/* ---------------- CS-F05: 生成配列の要素型タグ（__elemSys） ----------------
   生成側の単体検証：handleAdvancedCall をスタブ ctx で直接呼び、
   返却配列の非列挙 __elemSys と、JSON／列挙へ漏れないことを固定する。
   表示側（csArrayTypeName がタグを読む）は別班の担当。 */
test("adv-b5 CS-F05 要素型タグ: 生成経路ごとの __elemSys", async () => {
  const { handleAdvancedCall } = await import("../js/types/csharp/advanced-engine.js");
  const call = ({ recvVal, recvType = "int[]", recvShape = { elem: "int", suffix: "[]" }, method, argVals = [], argTypes = [] }) => {
    const node = { target: { k: "member", name: method, target: { k: "var", name: "recv" } }, args: argVals.map((_, i) => ({ k: "lit", i })) };
    const ctx = {
      args: node.args, values: argVals, s: {},
      api: { read: () => recvVal, fail: (m, n, c) => { throw new Error(c + ":" + m); } },
      node,
      typeOf: (a) => argTypes[a?.i] ?? recvType,
      isUnknown: (v) => !!(v && typeof v === "object" && v.kind === "unknown"),
      unknown: (src) => ({ kind: "unknown", source: src }),
      csDoubleText: (v) => String(v), csFloatText: (v) => String(v),
      csArrayTypeName: () => null,
      csArrayShape: (n) => (n?.k === "var" ? recvShape : null),
      callName: () => null,
    };
    return handleAdvancedCall(ctx)?.value;
  };
  const callStatic = ({ typeName, method, argVals = [], argTypes = [] }) => {
    const node = { target: { k: "member", name: method, target: { k: "var", name: typeName } }, args: argVals.map((_, i) => ({ k: "lit", i })) };
    const ctx = {
      args: node.args, values: argVals, s: {},
      api: { read: () => null, fail: (m, n, c) => { throw new Error(c + ":" + m); } },
      node,
      typeOf: (a) => argTypes[a?.i] ?? "int",
      isUnknown: (v) => !!(v && typeof v === "object" && v.kind === "unknown"),
      unknown: (src) => ({ kind: "unknown", source: src }),
      csDoubleText: (v) => String(v), csFloatText: (v) => String(v),
      csArrayTypeName: () => null, csArrayShape: () => null,
      callName: (n) => (n?.k === "var" ? n.name : null),
    };
    return handleAdvancedCall(ctx)?.value;
  };
  const tag = (arr) => arr?.__elemSys ?? null;
  assert.equal(tag(call({ recvVal: [1, 2, 3], method: "Skip", argVals: [1] })), "Int32");
  assert.equal(tag(call({ recvVal: [1, 2, 3], recvType: "double[]", recvShape: { elem: "double", suffix: "[]" }, method: "Take", argVals: [2] })), "Double");
  assert.equal(tag(call({ recvVal: ["a", "b"], recvType: "string[]", recvShape: { elem: "string", suffix: "[]" }, method: "ToArray" })), "String");
  assert.equal(tag(call({ recvVal: [true, false, true], recvShape: null, recvType: "int", method: "Distinct" })), "Boolean");
  assert.equal(tag(call({ recvVal: [1, 2], method: "Clone" })), "Int32");
  assert.equal(tag(callStatic({ typeName: "Enumerable", method: "Range", argVals: [2, 3] })), "Int32");
  assert.equal(tag(callStatic({ typeName: "Enumerable", method: "Repeat", argVals: ["a", 2], argTypes: ["char", "int"] })), "Char");
  assert.equal(tag(callStatic({ typeName: "Enumerable", method: "Repeat", argVals: [2, 2], argTypes: ["double", "int"] })), "Double");
  assert.equal(tag(call({ recvVal: "tea", recvType: "string", recvShape: null, method: "ToCharArray" })), "Char");
  assert.equal(tag(call({ recvVal: "a,b", recvType: "string", recvShape: null, method: "Split", argVals: [","], argTypes: ["char"] })), "String");
  assert.equal(tag(callStatic({ typeName: "Convert", method: "FromBase64String", argVals: ["SGk="] })), "Byte");
  const listArr = call({ recvVal: [1, 2], method: "ToList" });
  assert.equal(tag(call({ recvVal: listArr, recvType: "int", recvShape: null, method: "ToArray" })), "Int32");
  // タグ伝播（Skip 結果→Concat）と、判定不能な場合にタグを付けないこと。
  const skipped = call({ recvVal: [1, 2], method: "Skip", argVals: [0] });
  assert.equal(tag(call({ recvVal: skipped, recvShape: null, recvType: "int", method: "Concat", argVals: [[3]] })), "Int32");
  assert.equal(tag(call({ recvVal: [{ x: 1 }], recvShape: null, recvType: "int", method: "ToArray" })), null);
  // 非列挙：Object.keys と JSON に漏れない。
  const tagged = call({ recvVal: [1, 2, 3], method: "Skip", argVals: [1] });
  assert.deepEqual(Object.keys(tagged).filter((k) => !/^\d+$/.test(k)), []);
  assert.equal(JSON.stringify(tagged), "[2,3]");
  // 統合経路：最終状態の JSON にもタグが漏れない。
  const r = await run(cs(`int[] v = {1, 2, 3}; int[] w = v.Skip(1).ToArray(); Console.WriteLine(w[0]);`));
  assert.deepEqual(errors(r), []);
  assert.ok(!JSON.stringify(r.paths[0].vars).includes("__elemSys"));
});

/* ---------------- 未確定値の伝播 ---------------- */
test("adv-b5 未確定値の伝播", async () => {
  const r = await run(cs(`string s = Console.ReadLine(); Console.WriteLine(s.ToUpper());`));
  assert.deepEqual(errors(r), []);
  const outs = outputs(r);
  assert.ok(outs.length === 1 && outs[0].includes("未確定"), JSON.stringify(outs));
  const r2 = await run(cs(`string s = Console.ReadLine(); Console.WriteLine(s.Length);`));
  assert.deepEqual(errors(r2), []);
});
