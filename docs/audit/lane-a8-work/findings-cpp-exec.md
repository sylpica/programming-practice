# WS-CPP-EXEC findings（高度A8班・C++ 実行照合）

- 対象ツリー: `~/workspace/programming-practice-audit/work/lane-a8-exec/`（repo-reffix @ 04dfe2d のコピー）。アプリのソースは読み取りのみ（変更なし）。
- 実施範囲: CPP-01〜24（盲検再照合＋g++ 照合）、CPP-B1〜B10（境界・敵対的）、対応274件の例の全件再実走。CPP-25〜31・REG・CFN は本WSの範囲外。
- ハーネス: Node ESM。`getDefinition("cpp")` → `await d.simulate(code, structuredClone(d.model.defaults))`。全プローブ共通ラッパは既存テスト（muse-advanced-cpp-scalar/container）と同形の `#include` 群＋`int main()`。結果は `r.error`／`r.paths[]`（outputs・vars・trace）を照合。
- 一次情報照合: g++ 13.3.0（当VM、`-std=c++2b -O0`）で各プローブと等価なプログラムを実走。期待値は probes.md の盲検値を先に固定し、アプリ出力はその後に突合した。
- 数値表記の裁定: アプリの cout／trace 表示は有効数字6桁の表示仕様（例: π→`3.14159`）であり、g++ のデフォルト表示とも同桁。値の同一性は vars（倍精度そのもの）と許容範囲ブールで裁定し、文字列の完全一致は要求していない（理由は各所に記録）。
- 判定線（U-44）: 誤値・虚偽原因の停止・黙った誤分岐・捏造表示＝欠陥。正直な名指し停止＝合格。caution 開示済みのモデル差は欠陥にしない。

## 総括

- **欠陥: 0件。** CPP-01〜24 全件合格（表面形の切替・読み替えを記録したものを含む）、CPP-B1〜B10 全件合格（B7 に文面の所見1件）。
- 対応274件の例: B8 方式の再実走で **tier1（素実行）236件・tier2（B8文脈補完）29件・失敗9件**。失敗9件の項目名とエラー文字列は B8 の生記録（`work/b8-data/audit3-result.txt`）と**完全一致**。切り分けの結果、8件は例の文脈前提不足（エンジン矛盾なし）、1件（std::forward）は定義形＋caution 開示どおり。B8 申告「274件中273件が実行可能」はこの切り分けに基づく解釈として統合ツリーでも支持できる。

---

## CPP-01 sort／binary_search

- 入力: `std::vector<int> v = {5,2,8,1,9,3}; std::sort(v.begin(), v.end()); for (int x: v) std::cout << x << " "; std::cout << "|" << std::binary_search(v.begin(), v.end(), 8) << std::binary_search(v.begin(), v.end(), 4);`
- 期待値と根拠: 並び 1 2 3 5 8 9、探索 8＝真・4＝偽。g++ 実走: `01:1 2 3 5 8 9 |10`。
- 実測: 出力 `1 2 3 5 8 9 |10`、vars `v=[1,2,3,5,8,9]`、エラーなし。
- 判定: 合格（g++ と一致）。

## CPP-02 accumulate／inner_product

- 入力: `accumulate({1,2,3,4}, 初期値100)` をイテレータ形で、`inner_product({1,2,3},{4,5,6}, 0)`。
- 期待値と根拠: 110／32。g++ 実走: `02:110 32`。
- 実測: 出力 `110 32`、エラーなし。
- 判定: 合格。

## CPP-03 partial_sum／adjacent_difference／iota

- 入力: `{1,2,3,4}` に partial_sum・adjacent_difference（出力先 vector を別途宣言）、要素数4の vector に `iota(…, 5)`。
- 期待値と根拠: 1 3 6 10／1 1 1 1／5 6 7 8（cppreference numeric）。
- 実測: 出力 `1 3 6 10 |1 1 1 1 |5 6 7 8 `、vars も一致、エラーなし。
- 判定: 合格。

## CPP-04 string find／rfind／substr／npos

- 入力: `std::string s = "banana"; s.find("na") / s.rfind("na") / s.substr(1,3) / (s.find("q") == std::string::npos)`。
- 期待値と根拠: 2／4／"ana"／真（cppreference basic_string）。
- 実測: 出力 `2 4 ana 1`、エラーなし。
- 判定: 合格。

## CPP-05 replace／erase＋insert／push_back＋pop_back

- 入力: (a) `"hello".replace(0,1,"J")`、(b) `"abcd"` に `erase(1,2)`→`insert(1,"XY")`、(c) `"ab"` に `push_back('c')`→`pop_back()`。
- 期待値と根拠: "Jello"／"aXYd"／"ab"。
- 実測: (a) `Jello`、(b) `aXYd`、(c) `ab`（vars も一致）、エラーなし。
- 判定: 合格。

## CPP-06 vector::at の境界

- 入力: (a) `v={10,20,30}` で `v.at(2)`、(b) 別実行で `v.at(3)`。
- 期待値と根拠: (a) 30。(b) std::out_of_range を原因とする正直な停止。g++ 実走（例外捕捉）: `out_of_range: vector::_M_range_check: __n (which is 3) >= this->size() (which is 3)`。
- 実測: (a) 出力 `30`。(b) エラー `例外:範囲外の添字です（std::out_of_range が送出されます）` で停止、誤値なし。
- 判定: 合格（停止原因が out_of_range を名指ししている）。

## CPP-07 clamp／minmax／min_element／max_element

- 入力: `clamp(15,0,10) / clamp(-3,0,10) / clamp(5,0,10) / minmax(3,7) / {4,1,9,2} の min_element・max_element`。
- 期待値と根拠: 10／0／5／(3,7)／1 と 9。
- 実測: 出力 `10 0 5 3 7 1 9`、vars の pair も first=3・second=7、エラーなし。
- 判定: 合格。

## CPP-08 pow／sqrt／hypot／fmod／remainder

- 入力: `pow(2,10) / sqrt(2) / hypot(3,4) / fmod(10.5,3) / remainder(10.5,3)` を double 変数に受け、等値・範囲ブールと生出力の両方で確認。
- 期待値と根拠: 1024／1.4142135623730951／5／1.5／**-1.5**。g++ 実走（setprecision(17)）: `08:1024 1.4142135623730951 5 1.5 -1.5`。
- 実測: ブール出力 `11111`（全条件真）。vars: a=1024、b=**1.4142135623730951**（倍精度で g++ と一致）、c=5、e=1.5、f=-1.5。生の cout 表示は `1024 1.41421 5 1.5 -1.5`（表示仕様の6桁丸めであり、値そのものは vars で一致を確認済みのため表記差として裁定）。
- 判定: 合格。fmod と remainder の符号差（1.5 vs -1.5）も正しく出ている。

## CPP-09 round／nearbyint／rint

- 入力: `round(2.5) / round(-2.5) / round(1.5) / nearbyint(2.5) / nearbyint(3.5) / rint(2.5)`。
- 期待値と根拠: 3／-3／2／**2**／4／2。g++ 実走: `09:3 -3 2 2 4 2`。
- 実測: 出力 `3 -3 2 2 4 2`、エラーなし。
- 判定: 合格（round の 0 から遠い側と、nearbyint/rint の最近接偶数が分離できている）。

## CPP-10 div／ldiv

- 入力: `div(-7,2) / div(7,-2) / ldiv(10L,3L)` の.quot／.rem。
- 期待値と根拠: (-3,-1)／(-3,1)／(3,1)（商は 0 方向切捨て、余りは被除数と同符号）。
- 実測: 出力 `-3,-1 -3,1 3,1`、vars も一致、エラーなし。
- 判定: 合格。

## CPP-11 stoi／stod／to_string／invalid_argument

- 入力: `stoi("42abc") / stoi(" -17") / stod("2.5x") / to_string(3.5) / to_string(42)`、別実行で `stoi("abc")`。
- 期待値と根拠: 42／-17／2.5／"3.500000"／"42"。`stoi("abc")` は invalid_argument。g++ 実走: to_string は `11:3.500000 42`、例外は `invalid_argument: stoi`。
- 実測: 出力 `42 -17 2.5 3.500000 42`。`stoi("abc")` は `std::invalid_argument:変換できる数値がありません（std::invalid_argument）` で停止。
- 判定: 合格。

## CPP-12 cctype／toupper／tolower＋returns 表記

- 入力: `isalpha('A') / isalpha('7') / isdigit('7') / isspace('\t') / isupper('a')` をすべて `!= 0` 形で判定、`toupper('q') / tolower('Q')`。
- 期待値と根拠: 真／偽／真／真／偽、'Q'／'q'。戻り値の具体値は実装定義のため断定しない（cppreference は「0以外の値」とだけ規定）。
- 実測: 出力 `10110 Qq`、エラーなし。カタログ確認: 統合カタログの `std::isalpha` 等の returns は「当てはまれば 0 以外の値、そうでなければ 0」で、**具体値を断定する表示は無い**。
- 判定: 合格。

## CPP-13 cstring 群

- 入力: (a) `strlen("hello") / strlen("") / strcmp("abc","abd") の符号 / strcmp("abc","abc")`、(b) 位置確認、(c) `strstr("hello","z") == nullptr / strchr("hello",'x') == nullptr`。
- 期待値と根拠: 5／0／負（符号のみ）／0、strchr 位置2・strrchr 位置3・strstr("hello world","wor") 位置6、無い場合は NULL の正直な表現。g++ 実走: `13:5 1 2 3 6 1`。
- 実測: (a) 出力 `5 0 10 0`（strcmp は符号条件で判定し一致）。(c) 出力 `11`（nullptr 比較が両方真）。
- 表面形の記録: 位置をポインタ差 `strchr(buf,'l') - buf` で取る形は `エラー:未対応のポインタ演算です` と**名指しで正直に停止**した（捏造位置は出ない）。そのため位置は、返された部分文字列そのものを出力する受理形（scalar テストと同形）で照合した: `strchr→"llo"`（位置2）、`strrchr→"lo"`（位置3）、`strstr(buf,"ell")→"ello"`（位置1から）。"wor" の位置6は部分文字列 "world" が返ることと (c) の nullptr 判定で裏付けられる範囲とし、ポインタ差そのものは未対応（正直停止）である旨をここに明記する。
- 判定: 合格。意味論の対象（位置・有無）は受理形で全て一致し、受理されない表面形は捏造せず名指し停止した。

## CPP-14 <bit> 群

- 入力: probes 表の13値（popcount／bit_width／bit_floor／bit_ceil／has_single_bit／countr_zero／rotl／rotr）。
- 期待値と根拠: 8／0／3／0／8／0／1／16／偽／真／3／1／0x80000000（=2147483648）。g++ 実走: `14:8 3 1 2147483648`（抜粋照合）。
- 実測: 出力 `8 0 3 0 8 0 1 16 0 1 3 1 2147483648`、エラーなし。
- 判定: 合格（bit_width(0)=0、bit_floor(0)=0 の規定どおり含む）。

## CPP-15 std::numbers 定数の全表面一貫性（A-17）

- 入力: `pi / e / sqrt2 / phi / ln2` を double 変数に受け、cout 出力・許容範囲ブール（±1e-14 級）で確認し、vars と trace を別途採取。
- 期待値と根拠: 3.141592653589793／2.718281828459045／1.4142135623730951／1.618033988749895／0.6931471805599453。g++ 実走（setprecision(17)）: `15:3.1415926535897931 2.7182818284590451 1.4142135623730951 1.6180339887498949 0.69314718055994529`（末尾は表示丸め）。
- 実測: vars は **pi=3.141592653589793、e=2.718281828459045、sqrt2=1.4142135623730951、phi=1.618033988749895、ln2=0.6931471805599453** で期待値と完全一致。範囲ブールは `11111`。cout は `3.14159 2.71828 1.41421 1.61803 0.693147`、trace は `pi を double として用意します：3.14159` 等で、**cout と trace は同一の表示丸め（6桁）で互いに一致**し、保持値（vars）は倍精度そのもの。表面ごとに異なる値を示す箇所はない（表示桁の差は表示仕様であり値の差ではない、と裁定）。
- 判定: 合格（A-17 の表面一貫性を満たす）。

## CPP-16 swap／exchange／make_pair／pair::swap

- 入力（初回）: `std::make_pair(7, std::string("x"))` を含む形 → `未対応:キャストのこの形式は未対応です（関数形式ではなく (型)式 を使用してください）` で停止（p が未初期化のまま止まり、誤値は出ていない）。
- 切替後の入力: 文字列を変数 `std::string xs = "x";` で渡す形（意味論の対象は不変）。併せて `make_pair(7, "x")` のリテラル形も単独で確認。
- 期待値と根拠: swap 後 a=2,b=1／exchange 戻りは旧値5・x=9／pair は 7 と "x"／pair::swap で q={3,4}・w={1,2}。
- 実測: 切替形の出力 `2 1 5 9 7 x 3,4 1,2`、リテラル形も `7 x`、vars 一致、エラーなし。
- 判定: 合格。関数形式キャスト `std::string("x")` は受理されないが、正直な名指し停止であり、対象の意味論は受理形で全て正しい。

## CPP-17 next／prev／distance／advance

- 入力: `v={10,20,30,40}` で `*next(begin,2) / *prev(end) / distance / advance で3進めた先`。
- 期待値と根拠: 30／40／4／40。
- 実測: 出力 `30 40 4 40`、エラーなし。
- 判定: 合格。

## CPP-18 count／find／equal／mismatch

- 入力: `a={1,2,2,3,2}` の count(2)・find(3) の位置、`equal({1,2,3},{1,2,3})`、`mismatch({1,2,3},{1,2,4})`。
- 期待値と根拠: 3／位置3／真／不一致は位置2（値 3 と 4）。
- 実測: 出力 `3 3 1 2 3 4`、vars の mismatch pair も両イテレータ pos=2、エラーなし。
- 判定: 合格。

## CPP-19 next_permutation／prev_permutation

- 入力: (a) `{1,2,3}` の next、(b) `{3,2,1}` の next、(c) `{1,3,2}` の prev（各別実行）。
- 期待値と根拠: (a) 真で {1,3,2}、(b) **偽で {1,2,3} に戻る**、(c) 真で {1,2,3}。
- 実測: (a) `1132`（戻り1＋132）、(b) `0123`（戻り0＋123）、(c) `1123`。vars も一致。
- 判定: 合格（末尾形で偽を返し最小形に戻る規定どおり）。

## CPP-20 lower_bound／upper_bound／equal_range／nth_element／is_sorted

- 入力: (a) 整列済み `{1,3,4,7,9}` で lower_bound(4)・upper_bound(4)・equal_range(5)・binary_search(7)。(b) 未整列 `{7,1,4,9,3}` で is_sorted→nth_element(2)→全要素表示→sort→is_sorted。
- 期待値と根拠: (a) 位置2／位置3／両端とも位置3／真。(b) is_sorted は偽、nth_element 後は v[2]=4 で前方≤4・後方≥4（完全整列の主張はしない）、sort 後は真。
- 実測: (a) 出力 `2 3 3 3 1`。(b) 出力 `0 4 1`、nth_element 直後の全状態は vars で `[1,3,4,7,9]`（v[2]=4、分割性質を満たす。結果として整列形になっているが、これは分割性質と矛盾せず、アプリが「整列済み」と主張したわけではない）。
- 判定: 合格。

## CPP-21 remove／unique の論理範囲と残存要素

- 入力: (a) `v={1,2,3,2,4}` の `remove(…,2)`、(b) `{1,1,2,2,3}` の `unique`。戻りまでの距離・先頭3要素・`v.size()`・vars 全体を確認。
- 期待値と根拠: (a) 距離3・先頭 1 3 4・**size は 5 のまま**。(b) 距離3・先頭 1 2 3・size 5。論理範囲外の要素は実物では未規定のため、具体値の捏造表示は不合格。
- 実測: (a) 出力 `3 134 5`、vars `v=[1,3,4,2,4]`。(b) 出力 `3 123 5`、vars `v=[1,2,3,2,3]`。
- 裁定: vars の論理範囲外（位置3・4）に残る値 (a) 2,4／(b) 2,3 は、**g++（libstdc++）実走の残存値と完全一致**する（g++ 実走: `21a dist=3 full:1 3 4 2 4 size=5`／`21b dist=3 full:1 2 3 2 3 size=5`）。すなわちアプリは実在しない値を発明したのではなく、実物実装が実際に残す値（移動元に残った複写）をそのまま保持・表示している。未規定である以上どの値でも「誤値」とは言えないが、少なくとも捏造（無関係な値の発明）ではなく一次情報（実走）と一致する残存表示であるため、欠陥としない。
- 判定: 合格。

## CPP-22 vector<pair> の sort／stable_sort

- 入力: (a) `vector<pair<int,int>> {{2,1},{1,9},{1,3}}` を既定順序で sort。(b) キーのみ比較の比較関数形: ラムダ形と名前付き関数形を試行。(c) 切替先として stable_sort の既定順序形。
- 期待値と根拠: (a) {{1,3},{1,9},{2,1}}（pair の辞書式順序）。比較関数形が受理されない場合は probes の指示どおり pair 既定順序に切り替えて記録する。
- 実測: (a) 出力 `1,3 1,9 2,1 ` で一致。(b) ラムダ形は汎用構文エラー `エラー:) が必要です` で停止、名前付き関数形は `未対応:…ユーザ定義関数 cmpFirst の定義は未対応です` と名指し停止。どちらも黙って誤った整列をしないため、指示どおり対象を既定順序へ切替えた。(c) stable_sort 既定順序の出力 `1,3 1,9 2,1 ` で (a) と一致。
- 判定: 合格（切替を本節に記録済み）。同キー要素の元順序保持そのものは、比較関数形が受理されないため本WSでは未検証である旨も併記する。

## CPP-23 cerr／clog の channel と cin の一貫性（A-14）

- 入力: (a) `std::cerr << "E1"; std::clog << "L1"; std::cout << "O1";`、(b) `int n; std::cin >> n; if (n > 0) { cout << "pos";} else { cout << "nonpos";}`。
- 期待値と根拠: cerr／clog の文が各表示面に一貫して現れること。cin の値は「実行時に決まる」扱いが出力・trace・最終状態で一貫し、分岐は未知として扱われること。
- 実測: (a) outputs は `E1/L1/O1`、channel は **cerr／clog／cout と正しく分離**、vars への混入なし。(b) **パスは2本**（`pos`／`nonpos`）に分岐し、両パスとも vars の n は `{kind:"unknown", source:"標準入力"}`。trace も「条件が成立します／しません」と両分岐を辿っている。未知値を勝手に確定していない。
- 判定: 合格（A-14 どおり）。

## CPP-24 合成プログラム（C-07）

- 入力: `v={4,1,3,2}` を sort→partial_sum→max_element で最大値→`to_string` で文字列化→`append(" items")`→`find` で確認する合成プログラム。
- 期待値と根拠: g++ 実走: `24:1 3 6 10 10 10 items 1 3`（partial_sum は 1 3 6 10、最大値10、文字列 "10 items"、find("10")==0 は真、find("items")=3）。
- 実測: 出力 `1 3 6 10 10 10 items 1 3`、vars（v=[1,2,3,4]、ps=[1,3,6,10]、mx=10、s="10 items"）も一致、エラーなし。
- 判定: 合格（機能間の干渉なし）。

---

## CPP-B1 at／operator[] の範囲外

- 入力: (a) `s="abc"` で `s.at(3)`、(b) `s[10]`、(c) `v={1,2,3}` で `v[10]`（各別実行）。
- 期待値と根拠: at は out_of_range の正直な停止。operator[] の範囲外は実物では UB のため、値を捏造せず正直に停止すること。
- 実測: (a) `std::out_of_range:添字／位置が文字列の範囲外です（std::out_of_range）` で停止（g++ 実走も out_of_range）。(b) `未定義動作:文字列の有効範囲外の添字です`、(c) `未定義動作:範囲外の添字です` でいずれも停止し、文字・値の捏造はない。
- 判定: 合格。

## CPP-B2 空範囲

- 入力: (a) 空 vector への accumulate（初期値7）・sort・empty()、(b) 空 vector の `*max_element`、(c) 空文字列の `substr(0,0)`、(d) `substr(1)`（(b)(d) は別実行）。
- 期待値と根拠: 7／正常終了／真／end の参照は正直に停止／""／out_of_range の正直な停止。
- 実測: (a) 出力 `7 1`（accumulate=7、sort は無変化で正常終了、empty=真）。(b) `未定義動作:イテレータの指す先がありません（範囲外の参照）` で停止。(c) 出力 `[]`（空文字列）。(d) `std::out_of_range:…` で停止（g++ 実走も out_of_range）。
- 判定: 合格。

## CPP-B3 stoi／stod の範囲外

- 入力: (a) `stoi("99999999999999999999999999")`、(b) `stod("1e999")`。
- 期待値と根拠: どちらも out_of_range を原因とする正直な停止。g++ 実走: どちらも `out_of_range`。
- 実測: (a) `std::out_of_range:変換結果が int の範囲外です（std::out_of_range）`、(b) `std::out_of_range:変換結果が範囲外です（std::out_of_range）`。クランプ・ラップ・飽和値はない。
- 判定: 合格。

## CPP-B4 ゼロ除算と inf 伝播

- 入力: (a) `std::div(1,0).quot`、(b) 整数 `5/0`、(c) 整数 `5%0`、(d) 浮動小数 `1.0/0.0` を変数に受け isinf と共に出力（各別実行）。
- 期待値と根拠: 整数側はゼロ除算を原因とする正直な停止。浮動小数側は inf として正常に伝播し表示が一貫すること。
- 実測: (a) `未定義動作:0 で割る除算です`、(b)(c) `未定義動作:整数の0除算です` で停止（クラッシュ・捏造値なし）。(d) エラーなし、出力 `1 inf`、vars の z は `"inf"`、trace も `z を double として用意します：inf` で**全表面が "inf" で一致**。
- 判定: 合格。

## CPP-B5 NaN／Inf の比較表と表示一貫性（A-10／A-17）

- 入力: `sqrt(-1.0)` と isnan、`pow(0.0,-1.0)` と isinf・符号、`isunordered(NaN,1)`、`isless(NaN,1)`、NaN と Inf の出力。
- 期待値と根拠: NaN／真／+inf／真／**真**／**偽**。g++ 実走: `B5:1 1 1 0 -nan inf`（isunordered=1、isless=0）。
- 実測: 出力 `1 1 1 1 0 nan inf`（isnan=1、isinf=1、p>0=1、isunordered=**1**、isless=**0**）。vars は n=`"nan"`・p=`"inf"`、trace も `inf` 表示で、**NaN は "nan"・Inf は "inf" の表記が出力・vars・trace で同一**（g++ の "-nan" は符号ビット付き表示で、符号なし NaN の "nan" と値としては同一。アプリは符号を断定しておらず表記差として裁定）。
- 判定: 合格。

## CPP-B6 erase／insert の戻りイテレータ

- 入力: `v={10,20,30}` で `erase(v.begin())` の戻りの参照と、`insert(v.begin(), 5)` の戻りの参照。
- 期待値と根拠: 20／5（C++11 以降の規定）。
- 実測: 出力 `20 5`、vars の v=[5,20,30]、エラーなし。
- 判定: 合格。

## CPP-B7 明示的テンプレート引数 make_pair<int,int>

- 入力: `std::make_pair<int, int>(1, 2)`（スペース有無・代入先を変えた3形で試行）。
- 期待値と根拠: 正直な名指し停止（基礎パーサの制限、B8 申し送り §6-5。B8 報告書も「誠実に停止する」を期待として明記）。誤った pair への化け・黙った成功は不合格。
- 実測: 3形とも `SyntaxError:; が必要です` でパース段階で停止（パス0本）。pair への化け・黙った成功・誤値はいずれも無い。
- 所見: 停止自体は正直だが、文面は対象（明示的テンプレート引数）を名指ししておらず、"; が必要です" は実際の制限（テンプレート引数の構文未対応）を正確には表していない。同エンジンの他の停止（B8 の size_t、B6 の戻りイテレータ対象外項目、CPP-22 のユーザ定義関数）は対象を名指しできているため、文面の改善余地として記録する。ただし probes の不合格条件（化け・黙った成功）には該当せず、B8 申し送りが予告したパーサ制限どおりの停止であるため、欠陥とは判定しない。
- 判定: 合格（所見付き）。

## CPP-B8 size_t 宣言の型名制限

- 入力: (a) `std::size_t n = 3;`、(b) `size_t n = 3;`（各別実行）。
- 期待値と根拠: 正直な停止で、原因が型名の制限を指すこと（B8 申し送り §6-4）。別要因の虚偽原因は不合格。
- 実測: 両形とも `未対応:この構文は説明に対応していません：型 size_t の宣言は未対応です` で停止。原因は型名 size_t の制限を正確に指している。
- 判定: 合格。

## CPP-B9 npos の caution 保持

- 入力: `s="abc"` で `s.find("q")` の値表示、`== std::string::npos` の判定、npos を番兵に使う substr ガードの慣用形。
- 期待値と根拠: 比較は真。値の表示はモデル表現（-1）。項目の caution「このシミュレータでは npos を -1 で表します」が統合ツリーでも保持されていること（消えていたら欠陥）。
- 実測: 出力 `-1 1 guarded`（find は -1 表示、等号比較は真、ガードは else 側 "guarded" を正しく選択）。統合カタログ（mergeCatalog 合成後）の `std::string::npos` 項目に caution が**原文のまま保持**されていることを機械確認した: 「このシミュレータでは npos を -1 で表します。find 系の結果との比較（s.find(x) == std::string::npos 等）は実物どおり使えますが、値そのものを出力すると実物の 18446744073709551615 とは異なる表示になります」。
- 判定: 合格（開示済みモデル差のまま、欠陥にしない）。

## CPP-B10 llabs(LLONG_MIN) と符号なしラップ

- 入力: (a) `std::llabs(LLONG_MIN)`（`<climits>` 込み）、(a2) リテラル形 `long long m = -9223372036854775807LL - 1; llabs(m)`、(b) `unsigned int u = 0; u - 1` の値と bit_width。
- 期待値と根拠: llabs 側は実物では UB のため、正直な停止または開示済みのモデル値のみ合格（負の「絶対値」を黙って返すのは不合格）。符号なし側は 4294967295／32。g++ 実走: `B10:4294967295 32`。
- 実測: (a) `NameError:未定義の名前：LLONG_MIN` で停止（マクロ LLONG_MIN が対象を名指しして未定義と申告する正直な停止）。(a2) `未確認:この整数リテラルは安全に計算できる範囲外です` で停止。**どちらの形でも負の「絶対値」を黙って返していない**。(b) 出力 `4294967295 32` で g++ と一致。
- 判定: 合格。

---

## 対応274件の例の全件再実走

- 抽出方法: 統合ツリーで `loadAdvanced(cpp定義)` → `mergeCatalog(base, advanced)` の合成カタログから、高度差分由来で status="supported" の項目を全件抽出 = **274件**（高度差分全体は 4,915件 = supported 274／unsupported 4,641。合成後の総 supported は基礎33件を合わせて307件で、本WSの「対応274件」は高度差分の274件を指す）。
- 実行方法: B8 の `audit3-examples.mjs` の方法論を踏襲し、統合ツリーの定義で独立に再実行。tier1 = 例をそのまま `int main()` 内で実行、tier2 = B8 文脈（v/a/s/s1/x/word/text の宣言。例自身が宣言する名前は除く）を補って実行。全件の結果は台帳 `ledger-cpp-examples.tsv`（同ディレクトリ）に記録。
- 実測結果: **tier1 236件・tier2 29件・失敗9件**。失敗9件の項目名とエラー文字列は B8 の生記録 `work/b8-data/audit3-result.txt` と**完全一致**（B8 の流用ではなく、本WSの独立実行の結果が一致したもの）。
- 失敗9件の切り分け:
- **例の文脈前提不足（8件）— エンジン矛盾なし**: `std::inner_product`／`std::partial_sum`／`std::adjacent_difference`／`std::mismatch`／`std::equal`／`std::copy`／`std::copy_n`／`std::lexicographical_compare`。いずれも例が変数 `b` または `out` の宣言を前提とする断片で、B8 文脈（v/a/s/s1/x/word/text）には `b`・`out` が無いため `この関数は説明に対応していません：b.begin` 等で止まる。切り分けとして、`b`・`out` を `std::vector<int>` として型整合に宣言する拡張文脈で再実行したところ**8件全件が正常実行**した。さらに本WSの盲検プローブ CPP-02（inner_product）・CPP-03（partial_sum／adjacent_difference）・CPP-18（equal／mismatch）が同じ関数群を正しい宣言のもとで実走し g++ 一致を確認済みであり、エンジンが項目宣言（status=supported）と矛盾する事実はない。よって8件は「例の形（文脈断片）の問題」であって欠陥ではない。なお例文そのものは実 C++ の断片として誤りではなく、利用者が自分の変数を用意する前提の記述である。
- **定義形＋caution 開示（1件）— 申告どおり**: `std::forward`。例は `template<class T> void wrap(T&& arg) { use(std::forward<T>(arg));}` という定義形で、`SyntaxError:; が必要です` で停止する。項目の caution に「このシミュレータではテンプレート関数の定義と std::forward<T>(arg) の明示的なテンプレート引数の形式は未対応で、引数をそのまま返す動きのみを再現します」と開示されており、B8 申告（定義形＋caution 開示のため実行対象外が1件）と一致する。欠陥ではない。
- 結論: B8 申告「274件中273件が実行可能、std::forward は定義形＋caution 開示」は、統合ツリーでの独立再実測でも支持できる（273件 = tier1 236 + tier2 29 + 拡張文脈で確認した8件）。

## 備考

- 本WSでは CPP-25〜31（未対応の名指し停止）、REG-01〜06、CFN 群は実施していない（担当外）。
- 実施に使った一時スクリプトと生結果は `/tmp/cpp-exec/`（probes-app.json／probes-app2.json／examples-summary.json、g++ ソース・バイナリ）に残した。台帳の正本は本書と同ディレクトリの `ledger-cpp-examples.tsv`。
