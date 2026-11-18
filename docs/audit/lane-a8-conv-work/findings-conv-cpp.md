# WS-CPP 収束判定 所見（高度A8班・C++ 実行・停止照合）

- 担当：全体監査・高度A8班の収束判定ラウンド **WS-CPP（C++ 実行・停止照合）**。対象は CPP-01〜24、CPP-B1〜B10、CPP-25〜31、未対応スイープ再確認（前回台帳305件）、対応288件の例の全件再実走、REG-04。アプリのソースは読み取り専用で一切変更していない。コミットなし。
- 対象ツリー：`~/workspace/programming-practice-audit/work/lane-a8-conv/`（統合ビルド 4771801 のコピー）。
- 計画・期待値の正本：`~/workspace/programming-practice-audit/lanes/lane-a8/probes.md`（盲検期待値）。入力は前回所見（`work/lane-a8-exec/docs/audit/lane-a8-work/findings-cpp-exec.md`／`findings-cpp-stop.md`）の記載と同一形（収束ラウンド＝同一プローブの再実行）。
- ハーネス：Node ESM。`js/types/registry.js` の `getDefinition("cpp")` → `await d.simulate(code, structuredClone(d.model.defaults))`。ラッパは前回と同形（#include 群＋`int main()`）。合成カタログは実経路 `loadAdvanced`（loaded 11／missing 0／failed 0）→ `mergeCatalog`（総数 4,948＝対応 321／未対応 4,627／未検証 0、problems 0。高度差分由来の対応は **288件**で、指示どおり 274→288 の増加を確認。新規対応14件＝`std::vector`／`std::pair` のクラス項目＋イテレータ型12件（string／vector／array × iterator／const_iterator／reverse_iterator／const_reverse_iterator））。
- 一次情報照合：g++ 13.3.0（当VM、`-std=c++2b -O0`）で等価プログラムを実走（本書と同ディレクトリ `gpp-check.cpp`／実行結果は本文に引用）。
- 判定線（U-44）：誤値・虚偽原因の停止・黙った誤分岐・捏造表示＝欠陥。正直な名指し停止＝合格。caution 開示済みのモデル差は欠陥にしない。ユーザー定義述語形・関数オブジェクト形は前回裁定（最初に到達する未対応構文の名指しで受理）を踏襲する。
- 使用スクリプト（同ディレクトリ）：`harness.mjs`、`probes.mjs`（＋`probes-result.json`／`probes-run.log`）、`sweep.mjs`（＋`ledger-conv-stop-sweep.tsv`／`sweep-result.json`）、`sweep-fix.mjs`、`examples.mjs`（＋`ledger-conv-cpp-examples.tsv`／`examples-result.json`）、`ext-ctx.mjs`、`catalog-check.mjs`、`gpp-check.cpp`。

## 総括

- **CPP-01〜24：全24件合格。CPP-B1〜B10：全10件合格。CPP-25〜31：全7件合格**（前回欠陥だった典型形の名指し停止が統合ビルドで成立していることを実測で確認。詳細は §3）。
- **未対応スイープ305件：「名指しでない停止」は実質ゼロ**（分類上の見かけ19件は内訳を切り分け済み。§4）。「黙った成功」は6件中5件が対応化（288件）に伴う正当な成功で、**残存する不一致は `std::NULL` の1件のみ**（欠陥2・低）。
- **対応288件の例：tier1 249件・tier2 29件・失敗10件**。失敗のうち9件は B8 生記録の9件と項目名・エラー文字列とも一致（8件は文脈前提不足で拡張文脈の再実行により全件成功を確認、1件 `std::forward` は caution 開示どおり）。**新規失敗1件＝`std::pair`**（欠陥1）。
- **REG-04：全パターン合格**（化けなし。§6）。
- **欠陥は2件**（§7）。前回ラウンドの A8-1〜A8-5・A8-13 相当の欠陥（transform／find_if／count_if のラムダ形、ranges:: 系統、execution::、filesystem::path、chrono、メンバ型宣言形、make_pair 明示テンプレート引数、optional 初期化子形、std::vector／std::pair の虚偽 caution）は、統合ビルドで**すべて解消**していることを実測で確認した。c-family.js を共有する C／C# 向け是正（A5／A6）の C++ 側への波及は、本書の全実行プローブが前回実測と同一結果であることから、C++ の実行・停止挙動に変化なしと確認した（REG-01〜03・05・06 自体は他班担当）。

---

## 1. CPP-01〜24（盲検再照合＋g++ 照合）

各節：入力／期待値（probes.md 盲検値、g++ 実走で裏付け）／実測／判定。実測の出力は paths の outputs を連結した実文。

### CPP-01 sort／binary_search — 合格
- 入力：`std::vector<int> v = {5,2,8,1,9,3}; std::sort(v.begin(), v.end()); for (int x: v) std::cout << x << " "; std::cout << "|" << std::binary_search(v.begin(), v.end(), 8) << std::binary_search(v.begin(), v.end(), 4);`
- 期待：並び 1 2 3 5 8 9、探索 8＝真・4＝偽。g++：`01:1 2 3 5 8 9 |10`。
- 実測：出力 `1 2 3 5 8 9 |10`、vars `v=[1,2,3,5,8,9]`、エラーなし。前回と同一。

### CPP-02 accumulate／inner_product — 合格
- 入力：`accumulate({1,2,3,4}, 初期値100)` をイテレータ形で、`inner_product({1,2,3},{4,5,6}, 0)`。
- 期待：110／32。g++：`02:110 32`。実測：出力 `110 32`、エラーなし。

### CPP-03 partial_sum／adjacent_difference／iota — 合格
- 期待：1 3 6 10／1 1 1 1／5 6 7 8。g++：`03:1 3 6 10 |1 1 1 1 |5 6 7 8 `。実測：出力 `1 3 6 10 |1 1 1 1 |5 6 7 8 `、vars 一致。

### CPP-04 string find／rfind／substr／npos — 合格
- 入力：`std::string s = "banana"; s.find("na") / s.rfind("na") / s.substr(1,3) / (s.find("q") == std::string::npos)`。
- 期待：2／4／"ana"／真。g++：`04:2 4 ana 1`。実測：出力 `2 4 ana 1`。

### CPP-05 replace／erase＋insert／push_back＋pop_back — 合格
- 期待："Jello"／"aXYd"／"ab"。g++：`05:Jello aXYd ab`。実測：(a) `Jello`、(b) `aXYd`、(c) `ab`。

### CPP-06 vector::at の境界 — 合格
- 入力：(a) `v={10,20,30}` で `v.at(2)`、(b) 別実行で `v.at(3)`。
- 期待：(a) 30。(b) std::out_of_range を原因とする正直な停止。g++：`06b:out_of_range: vector::_M_range_check: __n (which is 3) >= this->size() (which is 3)`。
- 実測：(a) `30`。(b) `例外:範囲外の添字です（std::out_of_range が送出されます）` で停止。前回と同一文言。

### CPP-07 clamp／minmax／min_element／max_element — 合格
- 期待：10／0／5／(first=3, second=7)／1 と 9。
- 実測：出力 `10 0 5 3 7 1 9`、vars の pair も first=3・second=7。
- 記録：g++ 側の等価プログラムでは `std::minmax(3,7)` の戻りが一時オブジェクトへの参照対であり、実走の表示が不定値になった（実C++側の形の事情）。アプリは値をコピーして保持し 3／7 を正しく返す。前回もアプリ実測は 3／7 で一致しており、欠陥ではない。

### CPP-08 pow／sqrt／hypot／fmod／remainder — 合格
- 期待：1024／1.4142135623730951／5／1.5／**-1.5**。g++（setprecision(17)）：`08:1024 1.4142135623730951 5 1.5 -1.5`。
- 実測：vars は a=1024、b=**1.4142135623730951**、c=5、e=1.5、f=-1.5 で g++ と倍精度で一致。生出力 `1024 1.41421 5 1.5 -1.5`（6桁表示仕様）。
- 記録：今回の範囲ブール出力は `10111`（sqrt の桁が 0）。これは本班の照合式の境界リテラル `1.4142135623730950`／`...952` が倍精度の桁間隔（約2.2e-16）未満の差しかなく同一の double に丸まるためで、保持値（vars）そのものは期待値と完全一致している。前回はより広い許容幅で `11111` を確認済み。値の欠陥ではない。

### CPP-09 round／nearbyint／rint — 合格
- 期待：3／-3／2／**2**／4／2。g++：`09:3 -3 2 2 4 2`。実測：出力 `3 -3 2 2 4 2`。

### CPP-10 div／ldiv — 合格
- 期待：(-3,-1)／(-3,1)／(3,1)。g++：`10:-3,-1 -3,1 3,1`。実測：出力 `-3,-1 -3,1 3,1`。C++ 側の div は C 側是正の影響を受けていない（前回と同一）。

### CPP-11 stoi／stod／to_string／invalid_argument — 合格
- 期待：42／-17／2.5／"3.500000"／"42"、`stoi("abc")` は invalid_argument。g++：`11:42 -17 2.5 3.500000 42`、`11b:invalid_argument: stoi`。
- 実測：出力 `42 -17 2.5 3.500000 42`。`stoi("abc")` は `std::invalid_argument:変換できる数値がありません（std::invalid_argument）` で停止。

### CPP-12 cctype／toupper／tolower＋returns 表記 — 合格
- 期待：真／偽／真／真／偽、'Q'／'q'。g++：`12:10110 Qq`。実測：出力 `10110 Qq`。
- カタログ確認（今回も再採取）：`std::isalpha` の returns は「当てはまれば 0 以外の値、そうでなければ 0」で、具体値を断定する表示は無い。

### CPP-13 cstring 群 — 合格
- 期待：5／0／負（符号のみ）／0、strchr 位置2・strrchr 位置3・strstr("hello world","wor") 位置6、無い場合は NULL の正直な表現。g++：`13:5 0 1 0 2 3 6 1`。
- 実測：(a) 出力 `5 0 10 0`（strcmp は符号条件で判定し一致）。(b) 受理形（返された部分文字列の出力）で `llo lo ello`（位置2／3、"ell" は位置1）。(c) nullptr 比較 `11`（両方真）。
- 表面形の記録：ポインタ差 `strchr(buf,'l') - buf` の形は今回も `エラー:未対応のポインタ演算です` と名指しで正直に停止（捏造位置なし）。前回と同一挙動。

### CPP-14 <bit> 群 — 合格
- 期待：8／0／3／0／8／0／1／16／偽／真／3／1／2147483648。g++：`14:8 0 3 0 8 0 1 16 0 1 3 1 2147483648`。実測：出力 `8 0 3 0 8 0 1 16 0 1 3 1 2147483648`。

### CPP-15 std::numbers 定数の全表面一貫性 — 合格
- 期待：3.141592653589793／2.718281828459045／1.4142135623730951／1.618033988749895／0.6931471805599453。g++（setprecision(17)）：`15:3.1415926535897931 2.7182818284590451 1.4142135623730951 1.6180339887498949 0.69314718055994529`。
- 実測：vars は **pi=3.141592653589793、e=2.718281828459045、sqrt2=1.4142135623730951、phi=1.618033988749895、ln2=0.6931471805599453** で期待値と完全一致。cout は `3.14159 2.71828 1.41421 1.61803 0.693147`、trace は `pi を double として用意します：3.14159` 等で、cout と trace は同一の6桁丸めで一致。
- 記録：範囲ブールは `11011`（sqrt2 の桁のみ 0）。CPP-08 と同じく本班の境界リテラルが倍精度の桁間隔未満で同一 double に丸まる照合式側の事情であり、vars の保持値は完全一致している。欠陥ではない。

### CPP-16 swap／exchange／make_pair／pair::swap — 合格
- (a) 関数形式キャスト `std::string("x")` を含む形：`未対応:キャストのこの形式は未対応です（関数形式ではなく (型)式 を使用してください）` で名指し停止（前回と同一、誤値なし）。
- (b) 切替形（文字列を変数で渡す形）：出力 `2 1 5 9 7 x 3,4 1,2`（swap 後 a=2,b=1／exchange 戻り旧値5・x=9／pair 7 と "x"／pair::swap で q={3,4}・w={1,2}）。(c) リテラル形 `make_pair(7, "x")` も `7 x`。

### CPP-17 next／prev／distance／advance — 合格
- 期待：30／40／4／40。実測：出力 `30 40 4 40`、エラーなし（advance の正常形が実行できることを含む）。

### CPP-18 count／find／equal／mismatch — 合格
- 期待：3／位置3／真／不一致は位置2（値 3 と 4）。g++：`18:3 3 1 2 3 4`。実測：出力 `3 3 1 2 3 4`。

### CPP-19 next_permutation／prev_permutation — 合格
- 実測：(a) `1132`、(b) `0123`（**偽で {1,2,3} に戻る**）、(c) `1123`。g++：`19:1132 0123 1123` と一致。

### CPP-20 lower_bound／upper_bound／equal_range／nth_element／is_sorted — 合格
- 実測：(a) 出力 `2 3 3 3 1`。(b) 出力 `0 4 1`、nth_element 後の vars は `[1,3,4,7,9]`（v[2]=4、分割性質を満たす。アプリが完全整列を主張したわけではない）。g++：`20a:2 3 3 3 1`／`20b:0 4 1`。

### CPP-21 remove／unique の論理範囲と残存要素 — 合格
- 実測：(a) 出力 `3 134 5`、vars `v=[1,3,4,2,4]`。(b) 出力 `3 123 5`、vars `v=[1,2,3,2,3]`。
- 裁定：論理範囲外の残存値は g++ 実走（`21a dist=3 full:1 3 4 2 4 size=5`／`21b dist=3 full:1 2 3 2 3 size=5`）と完全一致。捏造表示ではない（前回裁定を維持）。

### CPP-22 vector<pair> の sort／stable_sort — 合格（切替記録あり）
- (a) 既定順序 sort：出力 `1,3 1,9 2,1 ` で {{1,3},{1,9},{2,1}} と一致。g++：`22:1,3 1,9 2,1 `。
- (b) キーのみ比較のラムダ形：前回は汎用エラー `エラー:) が必要です` で停止したが、今回は **`未対応:この構文は説明に対応していません：stable_sort へ渡すラムダ式は未対応です`** と対象（stable_sort へのラムダ）を名指しして停止するよう改善されている。黙った誤整列はない。probes の指示どおり対象を pair 既定順序へ切り替えて判定する（切替を本節に記録）。同キー要素の元順序保持そのものは比較関数形が受理されないため本WSでは未検証である点も前回どおり併記する。
- (c) stable_sort 既定順序形：出力 `1,3 1,9 2,1 ` で (a) と一致。

### CPP-23 cerr／clog の channel と cin の一貫性 — 合格
- (a) 実測：outputs は `E1/L1/O1`、channel は **cerr／clog／cout** と正しく分離、vars への混入なし。
- (b) 実測：パスは2本（`pos`／`nonpos`）に分岐し、両パスとも vars の n は `{kind:"unknown", source:"標準入力"}`。未知値を確定していない（A-14 どおり）。

### CPP-24 合成プログラム — 合格
- 期待（g++）：`24:1 3 6 10 10 10 items 1 3`。実測：出力 `1 3 6 10 10 10 items 1 3`、vars（v=[1,2,3,4]、ps=[1,3,6,10]、mx=10、s="10 items"）も一致。機能間の干渉なし。

---

## 2. CPP-B1〜B10（境界・敵対的）

### CPP-B1 at／operator[] の範囲外 — 合格
- 実測：(a) `s.at(3)` → `std::out_of_range:添字／位置が文字列の範囲外です（std::out_of_range）` で停止（g++ も out_of_range）。(b) `s[10]` → `未定義動作:文字列の有効範囲外の添字です`、(c) `v[10]` → `未定義動作:範囲外の添字です`。捏造なし。前回と同一文言。

### CPP-B2 空範囲 — 合格
- 実測：(a) 出力 `7 1`（accumulate=7、sort 無変化で正常終了、empty=真）。(b) `*max_element(空)` → `未定義動作:イテレータの指す先がありません（範囲外の参照）`。(c) `substr(0,0)` → `[]`。(d) `substr(1)` → `std::out_of_range:…` で停止（g++：`B2d:out_of_range`）。

### CPP-B3 stoi／stod の範囲外 — 合格
- 実測：(a) `std::out_of_range:変換結果が int の範囲外です（std::out_of_range）`、(b) `std::out_of_range:変換結果が範囲外です（std::out_of_range）`。g++ も両方 out_of_range。クランプ・ラップなし。

### CPP-B4 ゼロ除算と inf 伝播 — 合格
- 実測：(a) `div(1,0)` → `未定義動作:0 で割る除算です`、(b) `5/0`・(c) `5%0` → `未定義動作:整数の0除算です`。(d) `1.0/0.0` は出力 `1 inf`、vars・trace とも `inf` で全表面一致（g++：`B4d:1 inf`）。

### CPP-B5 NaN／Inf の比較表と表示一貫性 — 合格
- 期待：isnan 真／isinf 真／+inf／isunordered **真**／isless **偽**。g++：`B5:1 1 1 1 0 -nan inf`。
- 実測：出力 `1 1 1 1 0 nan inf`。vars・trace も `nan`／`inf` で同一表記（g++ の "-nan" は符号ビット付き表示で値としては同一。前回裁定を維持）。

### CPP-B6 erase／insert の戻りイテレータ — 合格
- 期待：20／5。g++：`B6:20 5`。実測：出力 `20 5`、vars の v=[5,20,30]。

### CPP-B7 明示的テンプレート引数 make_pair<int,int> — 合格（前回の所見が解消）
- 入力：`std::make_pair<int, int>(1, 2)`（2形で試行）。
- 実測：両形とも **`未対応:この構文は説明に対応していません：明示的なテンプレート引数（make_pair<...>）は未対応です`** と対象を名指しして停止。pair への化け・黙った成功なし。
- 判定：前回は `SyntaxError:; が必要です` の汎用文言で「文面の改善余地（所見）」とされた点が、統合ビルドでは名指し文言に是正されている。合格。

### CPP-B8 size_t 宣言の型名制限 — 合格
- 実測：`std::size_t n = 3;`／`size_t n = 3;` とも `未対応:この構文は説明に対応していません：型 size_t の宣言は未対応です`。原因は型名の制限を正確に指す。前回と同一。

### CPP-B9 npos の caution 保持 — 合格
- 実測：出力 `-1 1 guarded`（find は -1 表示、等号比較は真、ガードは正しく分岐）。
- カタログ確認（今回も機械採取）：合成カタログの `std::string::npos` 項目に caution が原文のまま保持されている：「このシミュレータでは npos を -1 で表します。find 系の結果との比較（s.find(x) == std::string::npos 等）は実物どおり使えますが、値そのものを出力すると実物の 18446744073709551615 とは異なる表示になります」。g++ の npos 実値 18446744073709551615（`B9` 行）とも対応づけ済み。開示済みモデル差のまま。

### CPP-B10 llabs(LLONG_MIN) と符号なしラップ — 合格
- 実測：(a) `NameError:未定義の名前：LLONG_MIN` で停止。(a2) リテラル形 → `未確認:この整数リテラルは安全に計算できる範囲外です` で停止。負の「絶対値」を黙って返していない。(b) 出力 `4294967295 32`（g++：`B10b:4294967295 32` と一致）。前回と同一。

---

## 3. CPP-25〜31（名指し停止）— 全件合格（前回欠陥はすべて解消）

判定基準は前回 §0-4 と同一（停止文言に末尾名または完全名が現れること）。加えて本ラウンドの指示項目3の典型形（transform のラムダ形、find_if／count_if のラムダ形、ranges::sort、execution::par、filesystem::path、chrono、make_pair<int,int>、optional 宣言形、メンバ型宣言形）をすべて実測した。

### CPP-25 `std::transform` — 合格（前回：不合格→解消）
- 入力（典型形）：`std::vector<int> v = {1,2,3}; std::vector<int> w(3); std::transform(v.begin(), v.end(), w.begin(), [](int x){ return x*2; });`
- 前回実測：`エラー:) が必要です`（名指しなし）。
- 今回実測：**`未対応:この構文は説明に対応していません：transform へ渡すラムダ式は未対応です`**。transform を名指しして停止。黙った成功・誤値なし。
- 代替形：関数オブジェクト形 `std::transform(..., std::negate<int>())` → `未対応:…比較関数や演算を指定する形式（関数オブジェクト）は未対応です`（最初に到達する未対応構文＝関数オブジェクト形式の名指し。前回裁定により受理）。引数なし形 `std::transform();` → `エラー:この関数は説明に対応していません：transform`。

### CPP-26 `std::find_if`／`std::count_if` — 合格（前回：不合格→解消）
- ラムダ形（今回追加で確認した典型形）：`find_if(..., [](int x){ return x > 2; })` → **`未対応:…find_if へ渡すラムダ式は未対応です`**、`count_if` のラムダ形 → **`未対応:…count_if へ渡すラムダ式は未対応です`**。各名を名指し。
- ユーザー定義述語形（probes 指定形、関数定義を main 外に置く正形でも確認）：両者とも `未対応:…ユーザ定義関数 isBig の定義は未対応です`。関数定義の時点で停止し find_if／count_if には到達しないが、これは「最初に到達する未対応構文の名指し」であり、本ラウンドの踏襲裁定により受理する（前回はこの形のみをもって不合格としたが、今回の担当指示が裁定を明示したため判定を変更した。実測文言自体は前回と同一であることも併記する）。
- nullptr 述語形：`エラー:この関数は説明に対応していません：find_if`／`…：count_if` と各名が名指しされる（前回と同一）。

### CPP-27 `std::ranges::sort` — 合格（前回：不合格→解消）
- 入力：`std::ranges::sort(v)`／イテレータ形／裸参照形 `auto f = std::ranges::sort;` の3形。
- 前回実測：全形 `SyntaxError:; が必要です`。
- 今回実測：全形とも **`未対応:この構文は説明に対応していません：std::ranges::sort は未対応です`**。完全名で名指し。黙って整列が実行されることもない。

### CPP-28 `std::format`／`std::print` — 合格（前回も合格）
- 実測：`エラー:この関数は説明に対応していません：format`／`…：print`／`…：println`。前回と同一。

### CPP-29 項目単位の粒度 — 合格（前回の注記欠陥も解消）
- `std::map<int, int> m; m.at(1)` 相当 → `未対応:…ジェネリック型 map<...> の宣言は未対応です`。`std::deque` の push_back 形、`std::set` の contains 形も同様に各クラス名で名指し（前回と同一）。
- `std::optional<int> o;`（宣言のみ形）→ 前回は `NameError:未定義の名前：optional` だったが、今回は **`未対応:…ジェネリック型 optional<...> の宣言は未対応です`** と是正されている。
- 前回注記1（軽微欠陥）：`std::optional<int> o = 5;`／`= std::nullopt` 形は前回「代入先が不正です」の別要因文言だったが、今回は両形とも **`未対応:…ジェネリック型 optional<...> の宣言は未対応です`** と名指しに是正されている。**解消を確認。**
- 対応クラス内の未対応メンバ：`s.data()` → `エラー:この関数は説明に対応していません：s.data`、`s.c_str()`、`v.data()` も同様にメンバ名で名指し。クラス全体を拒まず項目単位で止まる粒度は維持。

### CPP-30 `std::sort(std::execution::par, …)` — 合格（前回：不合格→解消）
- 前回実測：`エラー:) が必要です` 等の汎用文言。
- 今回実測：par 形 → **`未対応:…std::execution::par は未対応です`**、seq 形 → **`未対応:…std::execution::seq は未対応です`**、参照形 `auto pol = std::execution::par;` も同文言。ポリシーを完全名で名指しし、黙って無視して整列を実行することもない（出力なし）。

### CPP-31 thread／regex_match／filesystem::path／chrono／メンバ型 — 合格（前回：filesystem::path のみ不合格→解消）
- `std::thread t;` → `未対応:…型 thread の宣言は未対応です`（前回と同一）。
- regex：正規形は `未対応:…型 regex の宣言は未対応です`（構成要素 regex の名指し）、文字列引数形は `エラー:この関数は説明に対応していません：regex_match`（前回と同一の裁定）。
- `std::filesystem::path`：前回は全形 `SyntaxError:; が必要です` だったが、今回は宣言＋`filename()` 形・宣言のみ形・括弧初期化形の全形で **`未対応:…std::filesystem::path は未対応です`** と名指し。**解消を確認。**
- chrono（指示項目3の追加確認）：`std::chrono::seconds sec(5);` → `未対応:…std::chrono::seconds は未対応です`、`std::chrono::system_clock::now()` → `未対応:…std::chrono::system_clock::now は未対応です`。
- メンバ型宣言形（同）：`std::string::size_type n = s.size();` → `未対応:…std::string::size_type は未対応です`、`std::vector<int>::size_type` 形 → `未対応:…std::vector::size_type は未対応です`。前回 §2-2(c) の26件群の文言問題も §4 のとおり解消。

---

## 4. 未対応スイープの再確認（前回台帳305件の全件再実行）

- 方法：前回台帳 `ledger-cpp-stop-sweep.tsv`（305件）の probe 欄の入力形をそのまま再実行し、現在の合成カタログの status と併せて分類した。再実行の全記録は `ledger-conv-stop-sweep.tsv`。
- 集計（本班の分類器による一次集計）：名指し停止 275／所有クラス名での停止 1／黙った成功 6／名指しでない停止 19／プローブ対象外 4。
- **「名指しでない停止」19件の切り分け（すべて人工物または分類差で、実質ゼロ）**：
  - (i) 9件（`std::array::`／`std::vector::` のイテレータ型8件＋`std::vector` クラス項目）：台帳 probe 欄が「(補正形で再実行) …obj.begin/rbegin/cbegin…」という**注記テキスト**であり、そのままでは実コードでないため `キャストのこの形式は未対応です（独自型・ポインタ型）` となったもの。前回所見の補正形（実インスタンスからの初期化）に直して再実行したところ（`sweep-fix.mjs`）、8件とも期待値どおり実行成功（array 7／7／9／9、vector 10／10／30／30）、`std::vector<int> probeObj;` も正常実行（出力 7）。これら9件は現在 status=supported（対応288件に含まれる）であり、**表示どおり実行できる＝整合**。エンジンの後退ではない（REG-04 の同形プローブも全件成功。§6）。
  - (ii) 10件（`std::flat_map::value_comp`、`std::flat_set::key_compare`、`std::function::second_argument_type`、`std::inplace_vector::assign_range`、`std::list::back`、`std::match_results::reference`、`std::set::value_type`、`std::stringstream::char_type`、`std::unordered_map::max_load_factor`、`std::unordered_multiset::hash_function`）：停止文言が所有クラスを**末尾名／ジェネリック型名**で指す形（例：`NameError:未定義の名前：flat_map`、`未対応:…ジェネリック型 set<...> の宣言は未対応です`）で、本班の分類器（完全な所有クラス名の一致を要求）が owner-named に数えなかったもの。文言実文は前回台帳の記録と同一であり、前回の「所有クラス名での停止」の実質のまま。後退ではない。
  - (iii) 残り：`std::filesystem::path::clear` は `未対応:…std::filesystem::path は未対応です`（所有クラス完全名での停止）で、前回の「名指しでない停止」から改善。
- **前回「名指しでない停止」97件の解消確認**：ranges:: 系59件・入れ子名前空間12件・非イテレータ系メンバ型26件は、今回すべて完全名の名指し停止になった（例：`未対応:…std::ranges::sort は未対応です`、`…std::string::size_type は未対応です`、`…std::chrono::seconds は未対応です`、`…std::meta::is_bounded_array_type は未対応です` 等。再実行台帳に全件記録）。
- **「黙った成功」6件の内訳**：`std::string::` イテレータ型4件と `std::pair` は現在 status=supported であり、成功は表示と整合する正当なもの（前回の status↔振る舞い不一致は、対応化と caution 是正により解消。`std::vector`／`std::pair` の caution「値モデルは未実装のため、実行できません」は今回のカタログでは除去され、両項目とも supported・caution なしであることを機械確認した）。**残る1件が `std::NULL`**（欠陥2）。
- **誤値**：305件の範囲で、未対応項目が黙って誤った値を返したケースは今回も確認されなかった。
- データ側：未対応は 4,627件（4,641−14＝対応化14件と整合）。合成カタログの problems は 0。

---

## 5. 対応288件の例の全件再実走

- 方法：前回方式を踏襲。合成カタログから高度差分由来で status="supported" の項目を全件抽出（**288件**）し、tier1＝例をそのまま `int main()` 内で実行、tier2＝B8 文脈（v/a/s/s1/x/word/text の宣言。例自身が宣言する名前は除く）を補って実行。全件の台帳は `ledger-conv-cpp-examples.tsv`。
- 結果：**tier1 249件・tier2 29件・失敗10件**。
- 失敗10件と B8 生記録（`work/b8-data/audit3-result.txt`）の9件との照合：9件（`std::forward`／`std::inner_product`／`std::partial_sum`／`std::adjacent_difference`／`std::mismatch`／`std::equal`／`std::copy`／`std::copy_n`／`std::lexicographical_compare`）は項目名・エラー文字列とも一致。**新規失敗は `std::pair` の1件のみ**（欠陥1）。
- 既知9件の切り分け（今回も再確認）：
  - 文脈前提不足8件：いずれも例が変数 `b` または `out` の宣言を前提とする断片で、B8 文脈に無いため `この関数は説明に対応していません：b.begin` 等で止まる。`b`・`out` を `std::vector<int>` として型整合に宣言する拡張文脈で再実行したところ**8件全件が正常実行**した（`ext-ctx.mjs`）。盲検プローブ CPP-02／03／18 でも同じ関数群が g++ 一致を確認済み。欠陥ではない。
  - `std::forward`：例は定義形 `template<class T> void wrap(T&& arg) { use(std::forward<T>(arg)); }` で、今回は `未対応:…明示的なテンプレート引数（forward<...>）は未対応です` と名指しで停止する（前回は `SyntaxError:; が必要です`。文言は改善）。項目の caution に「テンプレート関数の定義と std::forward<T>(arg) の明示的なテンプレート引数の形式は未対応」と開示済みであり、欠陥ではない。
- 新規対応14件の例：`std::vector` の例（`std::vector<int> v{1, 2, 3};`）とイテレータ型12件の例はすべて実行成功。失敗したのは `std::pair` の例のみ（欠陥1）。

---

## 6. REG-04（`std::string::iterator` 等の型名・transformSource 再発検出）— 合格

前回所見 §3 のパターンをすべて再実行した（中核11パターン＋周辺形7件）。

- 正しく実行された形（実C++どおり、化けなし）：for ループ宣言形（出力 `3`）、単独宣言（`a`）、宣言＋代入＋`++it`（`b`）、`std::string::const_iterator`（cbegin→`a`）、`std::string::reverse_iterator`（rbegin→`c`）、`std::vector<int>::iterator`（`10`）、`std::vector<int>::const_iterator`（`10`）、`std::array<int, 3>::iterator`（`7`）、`std::vector<std::string>::iterator`（`a`）、`std::distance(s.begin(), s.end())`（`3`）、カンマ区切り複数宣言（比較結果 `1`）。
- npos との混在：イテレータ宣言と `s.find("q") == std::string::npos` を同じプログラムで両順序で実行 → `1a`／`a1` と両方正しい（npos 限定書き換えがイテレータ型名を壊していない直接確認）。
- 正直に停止した形：`std::string::iterator* p;`（ポインタ宣言）→ `未対応:…イテレータへのポインタは未対応です`。`std::basic_string<char>::iterator` 形 → 前回は汎用文言だったが今回は **`未対応:…std::basic_string::iterator は未対応です`** と名指しに改善。`std::map<int,int>::iterator` 形 → **`未対応:…std::map::iterator は未対応です`** と名指しに改善。
- 対照（npos の正規形）：`s.find("q") == std::string::npos` → 真、`s.find("q")` の値表示 → `-1`（モデル表現）、npos 番兵の substr ガード形 → `na`、`std::cout << std::string::npos;` → `-1`。caution の保持は CPP-B9 で確認済み。
- 判定：書き換えで別のプログラムに化ける形跡は皆無で、実行されて誤値が出る最悪形は発生しなかった。**REG-04 は合格（欠陥1の再発なし）**。なおイテレータ型名が実行できることは、今回それら12件が supported に是正されたため、表示↔振る舞いの不一致ではなくなった（前回の関連注記は解消）。

---

## 7. 欠陥一覧

| # | 項目 | 内容 | 重大度 |
|---|---|---|---|
| 1 | `std::pair`（クラス項目・今回対応化された288件の1件）の例文 | 項目自身の例 `std::pair<int, std::string> p{1, "one"}; auto n = p.first;` がシミュレータで実行できない。再現入力：例文そのまま（tier1／tier2 とも同一エラー）。実測文：`未対応:auto の型推論はコンテナ・イテレータ・pair の初期化子だけ対応します（スカラーは未対応です）`。切り分け：`int n = p.first;` に置き換えた形は正常実行（出力 `1 one`）し、pair の機能自体（make_pair・メンバアクセス・swap）は CPP-16／22 で正常。すなわち不整合の所在は「supported と表示される項目の正規の例が、開示（caution）なしに実行不能」である点にある。`std::forward` の例は caution で同種の制限を開示して処置済みだが、`std::pair` 項目に caution は無い（カタログ実測で確認）。例文の修正（`int n = …` 形）または caution 開示のいずれかが必要。 | 中〜低（新規・データ側） |
| 2 | `std::NULL` | status=unsupported・caution「コンパイル時に評価・解決される仕組みのため、実行シミュレーションの対象外です」に反し、再現入力 `std::cout << std::NULL;` がエラーなく `null` と表示して黙って成功する（前回所見 §2-2(f) の低欠陥が未解消のまま残存。実C++では `std::NULL` 自体が存在せず、NULL の表示は 0）。本ラウンドの項目4「黙った成功ゼロ」は、この1件により厳密には未達。 | 低（前回からの残存） |

- 上記以外の全プローブ（CPP-01〜24 の24件、CPP-B1〜B10 の10件、CPP-25〜31 の7件、スイープ305件、例288件中の287件、REG-04 の全パターン）は合格。
- 本WSの範囲で「黙って誤値を返す」ケースは確認されなかった。
- 本WSでは REG-01〜03・05・06、CFN 群は実施していない（担当外）。ただし c-family.js 共有是正の C++ への波及については、本書の全実行プローブ（119形）が前回実測と同一の出力・文言であることをもって、C++ の実行・停止挙動に変化なしと確認した。
