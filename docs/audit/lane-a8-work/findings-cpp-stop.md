# 高度A8班 WS-CPP-STOP 所見（C++ 未対応の名指し停止照合・回帰 REG-04）

- 担当：全体監査・高度A8班（C++＋CloudFormation）**WS-CPP-STOP**。対象は CPP-25〜31（名指し停止）、未対応 4,641 件の機械スイープ（C-12 の本班分）、回帰 REG-04（transformSource）。アプリのソースは読み取り専用で一切変更していない。コミットなし。
- 対象ツリー：`~/workspace/programming-practice-audit/work/lane-a8-exec/`（repo-reffix @ 04dfe2d のコピー）
- 計画・期待値：`~/workspace/programming-practice-audit/lanes/lane-a8/probes.md` の CPP-25〜31、REG-04。判定の共通線（U-44）：「その名前を挙げた正直な停止＋画面の未対応表示と一致」が期待。黙って通す・誤値を返す・別要因を主因にする停止は不合格。
- 機械台帳：同ディレクトリ `ledger-cpp-stop-sweep.tsv`（305 行＝スイープ抽出全件の形状・結果・停止文言実文・出力を記録）。

## 0. 手順（ハーネスの再現）

1. 定義は `js/types/registry.js` の `getDefinition("cpp")`、実行は `await d.simulate(code, structuredClone(d.model.defaults))`。結果は `r.error` と `r.paths[]`（`outputs`／`error`）から採取し、エラーは文字列または `{category, message}` を `category:message` 形に正規化した。本書の「実測」はすべてこの実文である。
2. 合成カタログは機構の実経路で再現した：`js/core/advanced-loader.js` の `loadAdvanced`（loaded 11 ファイル／missing 0／failed 0）→ `js/core/catalog.js` の `mergeCatalog`、ステータス導出は同ファイルの `itemStatus` を正本とした。合成結果は総数 4,948（対応 307／未対応 4,641／未検証 0）、mergeCatalog の problems は 0。画面の未対応表示は `itemStatus` → `statusInfo("unsupported")`（バッジ「参照用 · 操作は未対応」）で導出されるため、データ上で `itemStatus` が unsupported であることが「画面の未対応表示と一致」のデータ側の条件になる。
3. CPP-25〜31 と REG-04 は probes.md の入力要旨どおりの形を第一形とし、名指しが成立しない場合は表面形（宣言形・引数形）を変えた代替形でも確認した（表記ゆれの扱いに従い、意味論の対象は変えていない）。代替形で初めて名指しが成立する場合は、その旨と第一形の実測を併記して判定した。
4. 名指しの判定基準：停止文言の実文に、対象項目の末尾名（例：`transform`、`data`）または完全名が含まれること。`s.data` のように「変数.メンバ」形でメンバ名が現れるものも名指しとみなした（既存テスト `muse-advanced-cpp-*.test.js` の ng 形式と同じ読み方）。汎用の構文エラー（`; が必要です` 等）に対象名が含まれない場合は「名指しでない停止」とした。

## 1. CPP-25〜31（名指し停止）

### CPP-25 `std::transform` — **不合格（欠陥）**

- 入力（第一形・典型形）：`std::vector<int> v = {1,2,3}; std::vector<int> w(3); std::transform(v.begin(), v.end(), w.begin(), [](int x){ return x*2; });`
- 期待：`std::transform` の名指し停止。
- 実測（第一形）：`エラー:) が必要です`（出力なし）。transform の名は現れず、原因も示さない汎用構文エラーである。
- 実測（代替形）：
  - 関数オブジェクト形 `std::transform(..., std::negate<int>())` → `未対応:この構文は説明に対応していません：比較関数や演算を指定する形式（関数オブジェクト）は未対応です`。停止理由は関数オブジェクト形であって transform ではない。
  - 述語に `nullptr` を渡す形／引数なし呼び出し形 `std::transform();` → `エラー:この関数は説明に対応していません：transform`。この形でのみ transform が名指しされる。
- 判定：黙った成功・誤値は無いが、学習者が実際に書く典型形（ラムダ）では対象名を挙げず、別要因の構文エラーを主因として停止する。U-44 の「別要因を主因にする停止は不合格」に該当する。**欠陥：CPP-25 std::transform は典型形で名指し停止しない。**

### CPP-26 `std::find_if`／`std::count_if` — **不合格（欠陥）**

- 入力（probes.md 指定形）：ユーザー定義の述語関数 `bool isBig(int x) { return x > 2; }` を定義し、`std::find_if(v.begin(), v.end(), isBig)`／`std::count_if(v.begin(), v.end(), isBig)` を使う。
- 期待：各名前（find_if／count_if）の名指し停止。
- 実測（指定形）：両者とも `未対応:この構文は説明に対応していません：ユーザ定義関数 isBig の定義は未対応です`。関数定義の時点で停止し、find_if／count_if には到達しない（名指しされない）。なおユーザー定義関数の定義自体が未対応であること自体は正直な申告だが、本プローブの対象名は名指しされない。
- 実測（代替形）：ラムダ形 → `エラー:) が必要です`（CPP-25 と同じ汎用エラー）。`nullptr` 述語形 → `エラー:この関数は説明に対応していません：find_if`／`…：count_if` と各名が名指しされる。
- 判定：指定形・典型形では対象名が名指しされず、到達可能な名指しは `nullptr` 述語という非典型形に限られる。**欠陥：CPP-26 std::find_if／std::count_if は指定形（ユーザー定義述語）で名指し停止しない。**（find／count 本体が対応であること自体は別班・既存テストで確認済みの範囲であり、本件は _if 形の停止文言のみを指す。）

### CPP-27 `std::ranges::sort` — **不合格（欠陥）**

- 入力：`std::vector<int> v = {3,1,2}; std::ranges::sort(v);`（イテレータ形 `std::ranges::sort(v.begin(), v.end())`、裸参照形 `auto f = std::ranges::sort;` でも確認）。
- 期待：名指し停止（B8 裁定：ranges:: は全件未対応・理由開示あり）。
- 実測：全形とも `SyntaxError:; が必要です`（出力なし）。ranges にも sort にも触れない汎用構文エラーである。黙って整列が実行されることは無い（停止はする）。
- 判定：停止はするが名指しでなく、原因の誤認を招く文言である。**欠陥：CPP-27 std::ranges::sort は名指し停止しない（汎用構文エラーで停止）。** §2 のスイープでも ranges:: 系は系統的に同型だった（後述）。

### CPP-28 `std::format`／`std::print` — **合格**

- 入力：`std::cout << std::format("{} {}", 1, 2);`、`std::print("hi");`（あわせて `std::println("hi");`）。
- 期待：各名前の名指し停止。
- 実測：`エラー:この関数は説明に対応していません：format`／`…：print`／`…：println`。いずれも対象名（末尾名）を挙げて停止し、誤値・黙った成功は無い。データ側も 3 件とも status=unsupported（§2-1 で機械照合済み）。
- 判定：**合格**（文言は完全名 `std::format` でなく末尾名での名指しである点は §0-4 の基準で名指しとみなした）。

### CPP-29 項目単位の粒度（map／optional／deque／set／string::data） — **合格（注記 2 件）**

- 入力と実測：
  - `std::map<int, int> m; m[1] = 2; std::cout << m.at(1);` → `未対応:この構文は説明に対応していません：ジェネリック型 map<...> の宣言は未対応です`。宣言時点で map を名指し。
  - `std::deque<int> q; q.push_back(1);` → `未対応:…ジェネリック型 deque<...> の宣言は未対応です`。
  - `std::set<int> s = {1,2}; std::cout << s.contains(1);` → `未対応:…ジェネリック型 set<...> の宣言は未対応です`。
  - `std::optional<int> o;`（宣言のみ形）→ `NameError:未定義の名前：optional`。optional を名指しして停止。
  - 対応クラス内の未対応メンバ（項目単位の粒度の本丸）：`std::string s = "abc"; char* p = s.data();` → `エラー:この関数は説明に対応していません：s.data`。同様に `s.c_str()` → `…：s.c_str`、`s.capacity()` → `…：s.capacity`、`s.max_size()`／`s.copy(buf, 2)`／`s.get_allocator()`、`std::vector` の `v.data()`／`v.capacity()`、`std::array` の `a.data()` もすべてメンバ名で名指し停止した（§2 スイープ層 A のメンバ関数 19 件全件が名指し）。クラス全体を拒むのではなく未対応メンバだけが止まる粒度が成立している。
- 注記 1（optional の初期化子形）：`std::optional<int> o = 5;` および `= std::nullopt` 形は `SyntaxError:代入先が不正です：演算の結果には代入できません（Invalid left-hand side in assignment）` となり、optional を名指ししない別要因の文言で停止する。宣言のみ形では名指しが成立するため CPP-29 全体は合格とするが、この表面形の文言は虚偽原因気味であり、軽微な欠陥として記録する。
- 注記 2（未対応クラス側メンバの到達性）：`std::set::contains` や `std::map::at` のような未対応クラス配下のメンバ項目は、所有クラスの宣言時点でクラス名を挙げて停止するため、メンバ名そのものは文言に現れない。これは「クラス単位でなく項目単位」の要請に反するものではなく、当該コードに対して operative な未対応項目がクラス項目（std::map 等）であるためと解する。§2 のスイープでも同型 10 件を「所有クラス名での停止」として分離集計した。
- 判定：**合格**（注記 1 は軽微欠陥として §4 に再掲）。

### CPP-30 `std::sort(std::execution::par, …)` — **不合格（欠陥）**

- 入力：`std::sort(std::execution::par, v.begin(), v.end())`。代替形として `std::execution::seq` 形、`auto pol = std::execution::par;`／`par_unseq` の参照形でも確認。
- 期待：実行ポリシーの名指し停止。ポリシーを黙って無視して整列を実行しないこと。
- 実測：par 形 → `エラー:) が必要です`、seq 形 → `エラー:) が必要です`、参照形 → `SyntaxError:; が必要です`。いずれも出力なし（整列は実行されない＝黙って無視して実行する最悪形ではない）。しかし execution にも par にも触れない汎用構文エラーであり、ポリシーは名指しされない。
- 判定：**欠陥：CPP-30 std::execution::par（seq／par_unseq も同型）は名指し停止しない。**

### CPP-31 thread／regex_match／filesystem::path — **部分不合格（filesystem::path のみ欠陥）**

- `std::thread t;` → `未対応:この構文は説明に対応していません：型 thread の宣言は未対応です`。thread を名指し。**合格**。
- `std::regex_match`：正規形（`std::regex re("a.*"); std::regex_match(s, re)`）は regex の宣言時点で `未対応:…型 regex の宣言は未対応です` と構成要素 regex を名指しして停止する。文字列引数形 `std::regex_match("abc", "a.*")` では `エラー:この関数は説明に対応していません：regex_match` と regex_match 自体が名指しされる。**合格**（名指しされる名前が形により regex／regex_match のいずれかになる点は併記する）。
- `std::filesystem::path p = "/a/b.txt"; p.filename();` → `SyntaxError:; が必要です`。宣言のみ形・括弧初期化形 `path p("/a/b.txt")` でも同じ汎用エラーで、path にも filesystem にも filename にも触れない。**欠陥：CPP-31 std::filesystem::path（filename() を含む）は名指し停止しない。**

## 2. 未対応スイープ（C-12 の本班分）

### 2-1. データ上の一貫性（全 4,641 件・機械照合） — **合格**

合成カタログの status=未対応 全 4,641 件について機械照合した結果：

| 照合項目 | 結果 |
|---|---|
| 件数（itemStatus 導出で unsupported） | 4,641（B8 報告書 §2 の公称値と一致） |
| 生の `status` フィールドが `"unsupported"` でない件数 | **0**（全件が明示の 3 値 status を持ち、導出フォールバックに頼る項目なし） |
| `supported === true` との矛盾（status=unsupported なのに supported 真） | **0** |
| 名前の重複 | **0** |
| category／syntax の欠落 | **0／0** |
| mergeCatalog の problems（duplicate-name／status-missing／status-invalid 等） | **0** |

データ上、未対応 4,641 件は一貫しており、supported 導出との矛盾はない。**この範囲は合格。** ただし §2-2 の実行側では、status と実際の振る舞いが食い違う項目が見つかっている（データの内部一貫性と、データ↔振る舞いの一致は別の判定である）。

### 2-2. 実行プローブ（層化抽出 305 件）

- 抽出方法と内訳（合計 **305 件**、全件の台帳は `ledger-cpp-stop-sweep.tsv`）：
  - **層 A（対応クラスのメンバ）58 件**：対応クラス std::string（25）／std::vector（19）／std::array（12）／std::pair（2）の未対応メンバ全件。「対応に見える」最も危険な群として全数抽出した。
  - **層 B（同名異実体・同名同綴り）71 件**：末尾名が対応項目の末尾名と一致する未対応項目のうち、`std::ranges::` 配下と名前空間スコープの自由関数（std::begin／end／cbegin／size／empty／erase／find_first_of 等）。対応項目と同名に見える名前を優先した。
  - **層 C（頻出名）131 件**：transform／find_if／map／unordered_map／optional／variant／tuple／span／thread／mutex／regex／format／print／execution::par 等、学習者が実際に書く頻出名の手作業リスト 136 名のうち未対応として実在した 131 件（残り 5 件 std::stoul／stoull／apply／endl／getline は未対応集合に無かった）。
  - **層 D（系統抽出）45 件**：上記で選ばれなかった残りを (category, name) 順に整列し等間隔で 45 件。未対応クラスのメンバ・新しめの名前空間（meta／linalg／flat_* 等）を含む。
  - 重複は除き、層の優先順位は A＞B＞C＞D で 1 件 1 層に数えた（内訳 A 58／B 71／C 131／D 45）。
- プローブ形状：項目の形に応じて、メンバ関数＝実インスタンスからの呼び出し、メンバ型＝型名での変数宣言（イテレータ型は `begin()` 等からの初期化を含む）、クラス＝宣言、名前空間スコープ関数＝呼び出し（引数なし形を第一形とし、名指しも成功も無い場合に引数形・参照形を追加）、定数・オブジェクト＝参照。メンバ型のプローブは初回にテンプレート引数を欠いた形（`std::vector::iterator` 等、C++ として不正な形）で汎用エラーになった 24 件があり、**正しい形（`std::vector<int>::iterator` 等）で再実行して結果を差し替えた**（台帳の該当行は probe 欄に「補正形で再実行」と明記）。識別子でない名前（演算子名等）4 件はコードとして直接書けないため「プローブ対象外」とし、欠陥には数えない（DATA 班所見のとおり識別子で構成できない名前は scan でも対象外と開示済みの群）。
- 結果集計（305 件）：

| 結果 | 件数 | 内訳 |
|---|---:|---|
| 名指し停止 | 179 | A 19／B 12／C 125／D 23 |
| 所有クラス名での停止（未対応クラス配下のメンバ） | 10 | D 10（§1 CPP-29 注記 2 と同型。メンバ名は出ないが operative なクラス項目名で停止） |
| **名指しでない停止** | **97** | A 26／B 56／C 6／D 9 |
| **黙った成功** | **15** | A 12／B 3 |
| プローブ対象外（識別子でない名前） | 4 | A 1／D 3 |

- **名指しでない停止 97 件（全件列挙・類型別）**：
  - (a) `std::ranges::` 系 **59 件**：std::ranges::sort／stable_sort／partial_sort／nth_element／lower_bound／upper_bound／equal_range／binary_search／find／find_first_of／count／mismatch／equal／starts_with／copy／copy_n／move／replace／fill／fill_n／remove／unique／reverse／rotate／min／max／minmax／min_element／max_element／clamp／lexicographical_compare／next_permutation／prev_permutation／begin／end／cbegin／cend／rbegin／rend／crbegin／crend／size／empty／iter_swap／swap／advance／distance／next／prev／iota／contains／is_sorted、および std::ranges::views::empty／iota／reverse／as_const／lazy_split、結果型 std::ranges::remove_copy_result／uninitialized_copy_result。全件 `SyntaxError:; が必要です`。**系統的欠陥**（CPP-27 と同根）。
  - (b) 入れ子名前空間の型・関数 **12 件**：std::execution::par／seq／par_unseq、std::filesystem::path、std::filesystem::path::clear、std::chrono::seconds、std::chrono::system_clock、std::chrono::November、std::execution::empty_env、std::linalg::vector_sum_of_squares、std::meta::is_bounded_array_type、std::meta::is_special_member_function。全件 `SyntaxError:; が必要です`（CPP-30／CPP-31 と同根）。
  - (c) 対応クラスの非イテレータ系メンバ型 **26 件**：std::string::{allocator_type, const_pointer, const_reference, difference_type, pointer, reference, size_type, traits_type, value_type}、std::vector::{allocator_type, const_pointer, const_reference, difference_type, pointer, reference, size_type, value_type}、std::array::{const_pointer, const_reference, difference_type, pointer, reference, size_type, value_type}、std::pair::{first_type, second_type}。正しい C++ の宣言形（例：`std::string::size_type n = s.size();`、`std::vector<int>::size_type probeVar;`）でも `エラー:変数名が必要です`（string 系）／`エラー:式を解釈できません：::`（vector／array／pair 系）という汎用文言で停止し、型名を名指ししない。これらの項目の caution は「型や概念そのものを表す項目で、実行時の操作はありません」であり項目自体は概念項目だが、学習者が有効な C++ を書いた際の停止文言が原因を示さない点は (a)(b) より軽いものの同種の問題として列挙する。
- **黙った成功 15 件（全件列挙）**：
  - (d) イテレータ系メンバ型 **12 件**：std::string::{iterator, const_iterator, reverse_iterator, const_reverse_iterator}、std::vector::{同 4 件}、std::array::{同 4 件}。宣言して使うと**正しい値で実行される**（例：`std::string::iterator` で走査して文字数 3、`std::vector<int>::reverse_iterator` の参照先 30——§3 REG-04 の実測と一致）。誤値ではないが、status=unsupported（画面は未対応表示）に対してエンジンは実行できており、**status と振る舞いの不一致**である。各項目の caution「型や概念そのものを表す項目で、実行時の操作はありません」とも読みが食い違う。重大度は低い（誤値・虚偽表示ではなく、できることが表示より多い方向）が、C-12 の宣言↔振る舞いマトリクス上の不一致として列挙する。
  - (e) クラス名項目 **2 件**：**std::vector** と **std::pair**。両項目は status=unsupported で、caution は「このクラス／機能の値モデルは未実装のため、実行できません」と明記するが、実際には `std::vector<int> probeObj;`／`std::pair<int, int> probeObj;` は正常に実行され、両クラスは本ブロックの中核として実装済みである（std::array のクラス名項目は supported であり対照的に正しい）。**caution の記述が事実と反する欠陥**（学習者が「vector は実行できない」と誤認する）。黙った成功そのものは正しい振る舞いであり、欠陥の所在はデータ側（status と caution）にある。
  - (f) **std::NULL** 1 件：`std::cout << std::NULL;` がエラーなく `null` と表示して成功する。caution は「実行シミュレーションの対象外です」とするが実際には評価されている。実 C++ では `std::NULL` 自体が存在せず NULL の表示は 0 であり、`null` はモデルのポインタ表示である。軽微な不一致として列挙する（基礎側の NULL リテラル表示と同根の可能性があり、本班では A8 の項目データ側の所見に留める）。
- **誤値**：抽出 305 件の実行プローブ範囲では、未対応項目が黙って**誤った値を返した**ケースは確認されなかった（黙った成功 15 件はいずれも上記のとおり正しい値での実行か表示上の不一致）。

## 3. REG-04 `std::string::iterator` 等の型名（transformSource 再発検出） — **再発なし（合格・関連注記あり）**

- 背景：B8 欠陥 1 は transformSource の `string::`→`string.` 無条件書き換えが `std::string::iterator` 等の型名まで壊し、別のプログラムに化けるものだった。統合ツリーの実装は npos の場合に限定されている（`js/core/c-family.js` の transformSource 該当部で確認）。
- 入力パターンと実測（すべて `#include` 群＋`int main()` 内）：
  - for ループ宣言形 `for (std::string::iterator it = s.begin(); it != s.end(); ++it) n++;`（s="abc"）→ エラーなし、出力 `3`（正しい）。
  - 単独宣言 `std::string::iterator it = s.begin(); std::cout << *it;` → `a`（正しい）。初期化なし宣言＋代入形 → `a`。`++it` 後 → `b`。
  - `std::string::const_iterator`（cbegin）→ `a`、`std::string::reverse_iterator`（rbegin）→ `c`、`std::vector<int>::iterator` → `10`、`std::vector<int>::const_iterator` → `10`、`std::array<int, 3>::iterator` → `7`、`std::vector<std::string>::iterator` → `a`、`std::distance(s.begin(), s.end())` → `3`、カンマ区切り複数宣言 → 比較結果 `1`。いずれも実 C++ の意味どおりで、**書き換えで別のプログラムに化けた形跡（誤値・別要因の停止）は皆無**。
  - npos との混在：イテレータ宣言と `s.find("q") == std::string::npos` を同じプログラムで両順序で実行 → `1a`／`a1` と両方正しい（npos 限定書き換えがイテレータ型名を壊していないことの直接確認）。
  - 周辺形：`std::string::iterator* p;`（ポインタ宣言）→ `未対応:この構文は説明に対応していません：イテレータへのポインタは未対応です` と正直に名指し停止。`std::basic_string<char>::iterator` 形と `std::map<int,int>::iterator` 形は `エラー:式を解釈できません：::` の汎用文言で停止（誤値にはならない。名指しでない点は §2-2(c) と同種の軽微な文言問題）。
  - `std::string::size_type n = s.size();`／`std::vector<int>::size_type` 宣言は汎用文言で停止（§2-2(c) の 26 件と同一群。誤値なし）。
- 対照（CPP-B9 相当・npos の正規形が壊れていないこと）：`s.find("q") == std::string::npos` → 真（出力 `1`）、`s.find("q")` の値表示 → `-1`（モデル表現）、npos を番兵に使う substr ガード形 → `na` と正しく動作、`std::cout << std::string::npos;` → `-1`。統合カタログの std::string::npos 項目には caution「このシミュレータでは npos を -1 で表します。find 系の結果との比較（s.find(x) == std::string::npos 等）は実物どおり使えますが、値そのものを出力すると実物の 18446744073709551615 とは異なる表示になります」が保持されている（開示済みモデル差として処置済みの形のまま）。**対照は合格。**
- 判定：**REG-04 は合格（欠陥 1 の再発なし）**。実行されて誤値が出る最悪形はどのパターンでも発生しなかった。関連注記として、イテレータ型名が「正しく実行される」こと自体が §2-2(d) の status 不一致（項目は unsupported 表示）を生んでいる点を併記する。probes.md の REG-04 期待値（「正直に停止する」）との関係では、現行の振る舞いは停止ではなく正しい実行であり、誤値でない以上これを REG-04 の欠陥とはしない。ただし「未対応表示なのに実行できる」という表示↔振る舞いのずれは §2-2(d) 側の所見として親工程の裁定に委ねる。

## 4. 欠陥一覧（要約）

| # | 項目 | 内容 | 重大度 |
|---|---|---|---|
| 1 | CPP-27 ほか ranges:: 系統（スイープで 59 件確認） | `std::ranges::sort` を筆頭に ranges::／ranges::views:: の項目が全形で `SyntaxError:; が必要です` の汎用文言で停止し、対象名を名指ししない（黙った実行は無い） | 中（系統的・件数大） |
| 2 | CPP-30 std::execution::par／seq／par_unseq | 実行ポリシーが汎用構文エラーで停止し、ポリシーを名指ししない（黙って無視して整列する形ではない） | 中 |
| 3 | CPP-31 std::filesystem::path ほか入れ子名前空間 12 件 | path の宣言・filename() を含め全形が汎用構文エラーで、名前を名指ししない（chrono／meta／linalg／execution::empty_env も同型） | 中 |
| 4 | CPP-25 std::transform／CPP-26 std::find_if・std::count_if | 典型形（ラムダ・ユーザー定義述語・関数オブジェクト）では対象名が名指しされず、`) が必要です` 等の別要因の文言が主因になる。名指しは nullptr 述語等の非典型形に限られる | 中 |
| 5 | std::vector／std::pair（クラス名項目） | status=unsupported かつ caution「値モデルは未実装のため、実行できません」が事実と反する（両クラスは実装済みで正しく実行される。std::array は supported で正しい） | 中（データの虚偽申告） |
| 6 | 対応クラスの非イテレータ系メンバ型 26 件 | 有効な C++ の宣言形でも型名を名指ししない汎用文言で停止する（§2-2(c)） | 低 |
| 7 | イテレータ系メンバ型 12 件 | status=unsupported 表示に対してエンジンが正しく実行できる（status↔振る舞いの不一致。誤値なし） | 低 |
| 8 | CPP-29 注記：std::optional の初期化子形 | `std::optional<int> o = 5;` 等が「代入先が不正です」という別要因の文言で停止する（宣言のみ形では名指し成立） | 低 |
| 9 | std::NULL | unsupported かつ「対象外」の caution に反して評価され `null` と表示される | 低 |

- 合格だったもの：CPP-28（format／print／println）、CPP-29 本体（map／deque／set／optional の名指しと、対応クラス内未対応メンバの項目単位粒度）、CPP-31 の thread／regex_match、スイープのデータ一貫性（4,641 件全件）、REG-04（再発なし）＋CPP-B9 対照（npos の正規形と caution の保持）。
- 本班の範囲で「黙って誤値を返す」ケースは確認されなかった。欠陥はすべて「名指しでない停止文言」と「status／caution と振る舞いの不一致」に集中している。
