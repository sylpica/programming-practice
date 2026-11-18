# 高度A8班 WS-DATA-CPP 所見（C++ カタログ完全性・到達性突合）

- 担当：全体監査・高度A8班（C++＋CloudFormation）WS-DATA-CPP。対象は C-11／F-02／REG-06（データ面）／F-03（収載面）／テンプレート refs のデータ面のみ。アプリのソースは読み取り専用で一切変更していない。コミットなし。
- 対象ツリー：`~/workspace/programming-practice-audit/work/lane-a8-exec/`（repo-reffix @ 04dfe2d のコピー）
- 母集団の正本：`~/workspace/programming-practice-audit/work/b8-data/cpp-namespace.json`（3,648行）／`cpp-members.json`（61クラス・メンバ1,733件）。作業用に整形された `cpp-namespace-work.json`（3,182名）／`cpp-members-work.json`（1,733名）も突合に用い、両者の変換経緯を §1-2 で検証した。
- 検証対象の主張：B8報告書 `work/adv-b8/docs/audit/MUSE-B8-ADVANCED.md` §1・§2・§5・§6-3。
- 機械台帳：同ディレクトリ `ledger-cpp-names.tsv`（4,969行＝高度4,915＋基礎33＋母集団のみ21。各行に status／検索到達／scan到達を記録）。

## 0. 手順（ハーネスの忠実な再現）

1. 基礎カタログは `js/types/cpp/index.js` の `definition`（`definition.reference` 33件／templates 6本／glossary 6語）を正本とした。
2. 高度差分は推測でなく機構の実経路で取得した：`js/core/advanced-loader.js` の `loadAdvanced(definition)` を実走し、`advanced-manifest.js` の referenceParts（part1〜8）＋`templates-advanced.js`＋`glossary-advanced.js` を集約。結果は loaded 11ファイル／missing 0／failed 0。集約ファイル `reference-advanced.js` の直接 import とも名前列が完全一致した。
3. 合成は `js/core/catalog.js` の `mergeCatalog`、ステータス導出は同ファイルの `itemStatus` をそのまま使用。
4. 検索述語は `js/app.js` 944行付近の `refSearchText` を1字単位で複写して使用（name＋category＋description＋syntax＋inventoryNames＋scan文字列を空白連結し小文字化、クエリは小文字化して `includes` 照合。950〜990行のフィルタ処理と同一述語）。
5. scan は合成済みカタログを `definition.reference` にセットした上で `definition.scan`（`js/types/cpp/index.js` 171行付近の拡張込み）を実走。名前ごとの断片は、修飾名そのままの断片と、メンバについては宣言＋ドット綴り断片（`std::string objS; objS.<member>;` 等、対象クラス string／vector／array／pair）を150件ずつのチャンクにまとめて投入した（scan の名前空間照合はカタログ全名×トークン列照合のため、チャンク化は結果を変えない）。
6. REG-06 は `definition.reference` を基礎のみに戻して同一の検索・scan を再実行し対照した。

## 1. C-11 完全性

### 1-1. 件数・ステータス（期待値との照合）

| 対象 | 期待（計画・B8報告書） | 実測 | 判定 |
|---|---|---|---|
| 高度項目 総数 | 4,915 | **4,915** | 一致 |
| 対応 supported | 274 | **274** | 一致 |
| 未対応 unsupported | 4,641 | **4,641** | 一致 |
| 未検証 unverified | 0 | **0** | 一致 |
| 名前空間スコープ | 3,182（対応178） | **3,182（対応178）**（§1-3 の内訳参照） | 一致 |
| 主要クラスメンバ | 1,733（対応96） | **1,733（対応96）**（同上） | 一致 |
| mergeCatalog problems | 0 を期待 | **0**（duplicate-name／status-missing／status-invalid 等すべて0） | 一致 |
| 高度項目の status 明示 | 全件3値のいずれか | 全4,915件が明示の3値（導出フォールバックに頼る項目0） | 一致 |
| 合成後カタログ内重複名 | 0 | **0** | 一致 |

注記（件数の読み方）：合成カタログ全体は **4,948件**（対応307／未対応4,641／未検証0）である。これは高度4,915件に基礎33件（全件 supported、§1-4）が加わったもので、期待値4,915は高度母集団に対する値として正確に成立する。基礎33件は簡易モードの正本であり、B8母集団の対象外。

### 1-2. 母集団（生データ）→作業母集団の変換の検証

- `cpp-namespace.json`：3,648行 → `std::` を付けた相異なる名前は **3,188**（重複は249名・余分460行）。
- `current = 実装済み` の行は実測 **12行**（相異なる名前7件：abs（6行）／array／getline／string／printf／cout／endl）。このうち `std::array` は他ヘッダの未収録行も存在するため作業母集団に残り、残る6名（std::abs／std::getline／std::string／std::printf／std::cout／std::endl）は基礎項目（接頭辞なしの abs／getline／string／printf／cout／endl、§1-4）が正本として存在するため高度母集団から外れている。
- 3,188 − 6 ＝ **3,182** で `cpp-namespace-work.json` と完全一致（作業母集団−生データ由来集合の差分は `std::array` のみで上記のとおり説明できる。逆方向の差分は0）。
- `cpp-members.json`：classes 61件・members 1,733件。`cpp-members-work.json` は1,733名で、表示クラス名への読み替え（basic_string→string 等）済みの名前列が正本形。
- 作業母集団の和集合：名前空間3,182 ∪ メンバ1,733 ＝ **4,915**（両集合の交わり0）。

B8報告書 §1 の prose との差異（結論に影響しない参考情報）：報告書は「実装済み 11 行」「重複名 248 件」と記すが、生データの実測は実装済み12行・重複249名（余分460行）だった。最終件数3,182は上記のとおり正確に再現できるため、欠陥とはしない（D-17 文書ドリフトとして親工程で報告書 prose の数値を実測に合わせるのが望ましい旨、ここに記録する）。

### 1-3. 母集団↔カタログの集合差分（21件↔21件、全件列挙・裁定で説明可能）

名前の文字列そのままでは、母集団（作業母集団4,915名）のうち **4,894名** が同名でカタログに存在し、21名が同名では存在せず、代わりにカタログ側に母集団に無い21名が存在する。内訳は次の2群で、いずれも B8 の裁定（報告書 §1「basic_* は表示名への読み替え後の対象を含む」、§5 欠陥6 の演算子名修復、`b8-data/operator-repair.json` の一次情報根拠）で説明できるため、**欠陥にしない**。

(a) コンストラクタ／デストラクタの表示名読み替え（19件、メンバ側）。母集団名 → カタログ名：

| 母集団名（作業母集団） | カタログ名 |
|---|---|
| std::string::basic_string | std::string::string |
| std::string::~basic_string | std::string::~string |
| std::string_view::basic_string_view | std::string_view::string_view |
| std::istream::basic_istream | std::istream::istream |
| std::istream::~basic_istream | std::istream::~istream |
| std::ostream::basic_ostream | std::ostream::ostream |
| std::ostream::~basic_ostream | std::ostream::~ostream |
| std::iostream::basic_iostream | std::iostream::iostream |
| std::iostream::~basic_iostream | std::iostream::~iostream |
| std::streambuf::basic_streambuf | std::streambuf::streambuf |
| std::streambuf::~basic_streambuf | std::streambuf::~streambuf |
| std::stringstream::basic_stringstream | std::stringstream::stringstream |
| std::istringstream::basic_istringstream | std::istringstream::istringstream |
| std::ostringstream::basic_ostringstream | std::ostringstream::ostringstream |
| std::ifstream::basic_ifstream | std::ifstream::ifstream |
| std::ofstream::basic_ofstream | std::ofstream::ofstream |
| std::fstream::basic_fstream | std::fstream::fstream |
| std::regex::basic_regex | std::regex::regex |
| std::regex::~basic_regex | std::regex::~regex |

(b) 棚卸し時の項目名破損の修復（2件、名前空間側）。母集団の破損名 `std::operator`（生データで source 欄に `=` が漏れた痕跡あり）→ カタログ `std::operator|=`（<cstddef> の std::byte 演算子。operator-repair.json に cppreference スナップショット synopsis での確認記録あり）；破損名 `std::operator\`（`|` が表区切りで壊れたもの）→ カタログ `std::operator|`（<bitset> の非メンバ演算子）。

この21↔21の読み替えを踏まえた区分別件数は完全一致する：名前空間側＝母集団名一致3,180＋修復2＝**3,182**（対応178は母集団名一致分のみで再現し、修復2件は未対応）；メンバ側＝母集団名一致1,714＋読み替え19＝**1,733**（対応は母集団名一致分94＋読み替え分の std::string::string／std::string::~string の2件＝**96**）。

### 1-4. 基礎33件（合成で加わる分）

int／double／array／pointer／NULL／nullptr／if／for／while／return／printf／cout／long／float／char／short／bool／unsigned int／unsigned long／unsigned short／unsigned char／signed char／string／参照／do／sizeof／キャスト／三項演算子／abs／break／continue／getline／endl（全件 supported、内部重複0）。いずれも母集団（std:: 名）とは別名の基礎項目であり、高度項目との name 重複は0（mergeCatalog が重複を破棄した形跡も0）。

**C-11 判定：合格**（件数・ステータス・集合は期待値と一致。母集団との差分21↔21は裁定で説明可能として上記に明記）。

## 2. F-02 到達性（検索述語による機械照合）

手順：§0-4 の述語で、(1) 合成カタログ全4,948件について自名が自項目にヒットするか、(2) 束ね項目の syntax 欄から抽出した全綴り（`::` 綴り・ドット綴り）が自項目にヒットするか、(3) 母集団4,915名が合成カタログのいずれかの項目に到達するか、を照合した。

- (1) 自名到達：**4,948／4,948件**（失敗0）。高度項目に `inventoryNames` を持つものは0件、`scan` 文字列メタデータを持つものも0件（C++ では束ねは inventoryNames 方式でなく項目分割方式）。
- (2) 束ね綴り：syntax から修飾名綴り（`::` を含むもの1,834出現、ドット綴り11出現）を抽出できた項目は1,143件。抽出綴りの自項目ヒット失敗は **0件**。ドット綴りの実例は `std::begin` 等の自由関数の syntax に併記された `c.begin`／`c.end`／`c.cbegin`／`c.cend`／`c.rbegin`／`c.rend`／`c.crbegin`／`c.crend`／`c.size`／`c.empty`／`c.data` の11件で、全て到達した。
- (3) 母集団名の到達：4,894名は自項目に到達。残り21名のうち `std::operator` は他演算子項目の部分文字列としてのみヒットし（自項目は存在しない）、次の20名は文字列としても到達しない：`std::operator\`、`std::string::basic_string`、`std::string::~basic_string`、`std::string_view::basic_string_view`、`std::istream::basic_istream`、`std::istream::~basic_istream`、`std::ostream::basic_ostream`、`std::ostream::~basic_ostream`、`std::iostream::basic_iostream`、`std::iostream::~basic_iostream`、`std::streambuf::basic_streambuf`、`std::streambuf::~basic_streambuf`、`std::stringstream::basic_stringstream`、`std::istringstream::basic_istringstream`、`std::ostringstream::basic_ostringstream`、`std::ifstream::basic_ifstream`、`std::ofstream::basic_ofstream`、`std::fstream::basic_fstream`、`std::regex::basic_regex`、`std::regex::~basic_regex`。これは §1-3 の読み替え・修復に対応する作業母集団側の中間名であり、カタログ項目の名前としては存在しないことが裁定済みのため、**欠陥にしない**。参考：`basic_string` という部分文字列での検索は47項目にヒットし、`std::string::~string`（syntax が `~basic_string()`）等を含むため、学習者が旧名の一部で探す経路は部分的に残る。ただし完全な修飾名 `std::string::basic_string` 等では到達しない点は事実として記録する。
- 補足観察（判定対象外）：項目名の `::` を `.` に置換した綴り（例 `std::string.find`、`string.find`）は全4,915件でヒットしなかった。計画の到達性定義は「syntax 欄に列挙された綴り」が対象であり、C++ の syntax にそのような綴りは列挙されていないため欠陥とはしない（ドット経由の到達は scan 側の責務で §3 で検証）。

**F-02 判定：合格**（カタログ項目の到達性は全件成立。母集団中間名20件の未到達は §1-3 の裁定で説明可能）。

## 3. scan 到達性（チップ解決）

手順：§0-5。対応274件を主対象とし、参考に全高度項目でも照合した。

- 対応274件：**264件が解決**、未解決は次の **10件のみ**（全件列挙）：
  `std::string::operator+=`、`std::string::operator=`、`std::string::operator[]`、`std::string::~string`、`std::array::operator=`、`std::array::operator[]`、`std::vector::operator=`、`std::vector::operator[]`、`std::vector::~vector`、`std::pair::operator=`。
- 10件はいずれもメンバ名部分が識別子でない演算子名／デストラクタ名であり、`js/types/cpp/index.js` の scan 拡張が識別子トークン列で照合する設計上、対象外になるものである（同ファイルの名前空間照合コメントおよび B8報告書 §5 欠陥5「演算子名など識別子だけで構成できない名前は対象外（リファレンス検索で到達可能）」で開示済み）。10件すべて §2 (1) の検索到達は成立している（自名ヒットを確認）。計画 §2-3 の「届かない項目は『項目あり』と数えない」は検索・チップの双方で届かない項目を指すと解され、本10件は検索で届くため項目として数えてよい。**重大度：欠陥ではない（開示済みの設計上の対象外）**。残る実務上の含意として、`s[i]` や `s = t;` のようなコード断片からは operator[]／operator= のチップが出ない点をここに明記する。
- 全高度項目での参考結果：識別子のみで構成できる名前 **4,679件は全件解決**（対応・未対応を問わない。未対応項目のチップは参照用項目へ到達する設計）。識別子で構成できない名前は236件（演算子、operator"" リテラル、`std::operator new` 等）で、全て設計上の対象外。
- 実コード断片の確認：テンプレート `cpp-adv-sort-search` のコードに対する scan 結果は `std::vector::push_back`、`std::vector::begin`、`std::vector::end`、`std::vector::front`、`std::vector::back`、`std::vector`、`std::distance`、`std::sort`、`std::lower_bound`、`std::binary_search` の10件で、同テンプレートの refs 9件を全て含む（＋クラス名 `std::vector`）。名前空間名 `std::sort` 等のチップ解決は合成カタログでのみ成立し（§4）、B8報告書 §6-3 の申し送り（mergeCatalog 反映後に scan 拡張が活性化する）は統合ツリーで成立している。

**scan 判定：合格**（対応項目の未解決10件は開示済みの設計上の対象外で、全件検索到達済み）。

## 4. REG-06（データ面：簡易モードへの漏れ）

手順：基礎のみのカタログ（簡易モード相当）と合成カタログで、検索・scan を対照。

- 検索サンプル9名（std::sort／std::accumulate／std::binary_search／std::numbers::pi／std::string::npos／std::vector::push_back／std::popcount／std::clamp／std::stoi）：基礎のみでは **全件ヒット0**、合成では全件が自項目にヒットし、ステータスは全件 **supported** で表示される側のデータになっている（例：`std::sort` の合成側ヒットは std::sort 本体＋部分文字列の std::ranges::sort 等9件で、これは部分文字列検索の通常動作）。
- scan：基礎のみで `std::sort(v.begin(), v.end());` を走査した結果は空、`std::accumulate(...)` は基礎項目 `int` のみ。合成では `std::sort` が解決した。全高度名を対象にした基礎 scan の漏れ照合でも、解決される高度名は **0件**。
- 全数検索漏れ照合の参考：高度4,915名のうち5名（std::end／std::cin／std::nullptr_t／std::NULL／std::get）が基礎項目の検索テキストに部分文字列として現れるが、いずれも高度項目そのものの出現ではなく、基礎項目自身の文面内の言及・部分文字列であることをフィールド単位で確認した：std::end ← 基礎 `endl` の syntax `std::endl` の部分文字列；std::cin ← 基礎 `getline` の description／syntax（`std::getline(std::cin, stringVariable)`）内の言及；std::nullptr_t／std::NULL ← 基礎 `nullptr` の description 内の言及（std::NULL は `std::nullptr_t` の部分文字列としても一致）；std::get ← 基礎 `getline` の syntax の部分文字列。**漏れとは判定しない**。
- 用語集・テンプレートも基礎側に高度分は含まれない（基礎 glossary 6語／templates 6本は高度分と別管理で、合成時にのみ加わる。§5・§6）。

**REG-06（データ面）判定：合格**（高度項目の簡易モードへの漏れ0。状態件数・フィルタの UI 非表示そのものは D 班の範囲）。

## 5. F-03 収載面（用語集 高度分）

手順：`glossary-advanced.js` の12語が合成時に現れること、基礎用語との重複が無いことを照合し、各語の定義文を抜き出した。定義の正確性そのものの裁定は別班・親工程の範囲であり、ここでは収載・重複・ビュー間整合まで。

- 合成後 glossary は **18語**＝基礎6語（配列／ポインタ／未定義動作／添字／参照／未確定（値））＋高度12語。高度12語は全て合成結果に現れ、基礎との語の重複は **0**（mergeCatalog の glossary-duplicate も0）。合成は基礎・高度の単一配列に対して行われ、アプリの2つの表示面（glossaryList／sideGlossary）は同一配列を描画するため、ビュー間の不一致は生じない構造であることを app.js の renderGlossary で確認した。
- 高度12語と定義文（原文どおり抜粋）：
  1. イテレータ：「コンテナの要素の位置を指す値です。begin／endで範囲を指定したり、アルゴリズム関数の戻り値として受け取ったりします。このシミュレータでは「指す位置」を表す値として扱います。」
  2. 半開区間：「始点を含み終点を含まない範囲の表し方で、[first, last) と書きます。アルゴリズム関数はこの形で対象の範囲を指定します。」
  3. コンテナ：「複数の要素をまとめて保持する型です。高度モードで値モデルがあるのは std::string、std::vector、std::array などです。」
  4. メンバ関数：「クラスに属し、オブジェクトに対して呼び出す関数です。s.size() のように、オブジェクトの後にドットと関数名を書きます。」
  5. コンストラクタ：「オブジェクトの生成時に自動で呼ばれる特別なメンバ関数で、初期化を行います。クラス名と同じ名前を持ちます。」
  6. デストラクタ：「オブジェクトの寿命が終わるときに自動で呼ばれる特別なメンバ関数です。自分で呼び出すものではありません。」
  7. 名前空間：「名前の衝突を避けるために名前をグループ化する仕組みです。標準ライブラリの名前は std 名前空間に属し、std::sort のように書きます。」
  8. ヘッダ：「宣言をまとめたファイルで、#include で取り込みます。使う機能に対応するヘッダ（<algorithm> や <string> など）が必要です。」
  9. 標準ライブラリ：「言語とともに提供されるライブラリの総称です。文字列、コンテナ、アルゴリズム、数学関数などが含まれます。」
  10. テンプレート：「型をパラメータとして受け取る仕組みです。std::vector<int> の <int> のように使う型を指定し、具体的な型を作ります。」
  11. ムーブ：「値をコピーせず、所有権を移す考え方です。このシミュレータでは所有権の移転を再現せず、std::move の結果は値そのものとして扱います。」
  12. 符号なし整数：「0以上の整数だけを表す型です。std::popcount などの <bit> の関数は、符号なし型の値を受け取ります。」

**F-03（収載面）判定：合格**（12語の収載・重複なし・単一配列によるビュー整合を確認）。

## 6. テンプレート refs（テンプレート→項目の突合）

手順：`templates-advanced.js` の C++ 8本について、全 refs が合成カタログの実在項目を指すかを照合し、あわせて参照先のステータスも確認した。

| テンプレート id | refs 数 | dangling | 参照先ステータス |
|---|---|---|---|
| cpp-adv-sort-search | 9 | 0 | 全件 supported |
| cpp-adv-numeric-accumulate | 11 | 0 | 全件 supported |
| cpp-adv-string-search | 6 | 0 | 全件 supported |
| cpp-adv-string-edit | 6 | 0 | 全件 supported |
| cpp-adv-math-numbers | 7 | 0 | 全件 supported |
| cpp-adv-convert | 4 | 0 | 全件 supported |
| cpp-adv-cstring-cctype | 6 | 0 | 全件 supported |
| cpp-adv-bit-pair | 8 | 0 | 全件 supported |
| 合計 | **57** | **0** | 全件 supported |

全 refs は高度項目そのものを指し（基礎項目への参照0）、B8報告書 §2「全本が対応項目のみに依存」と一致する。合成後テンプレート総数は14本（基礎6＋高度8）。

**テンプレート refs 判定：合格**（dangling 0）。

## 7. 総合判定（WS-DATA-CPP）

- **欠陥：0件**。C-11／F-02／scan到達性／REG-06（データ面）／F-03（収載面）／テンプレート refs の全てで、判定線（U-44：件数・ステータスの不一致、到達不能、簡易への漏れ、refs の dangling）に触れる事象は無かった。
- 裁定で説明できる差分として記録したもの（欠陥にしない）：
  1. 母集団↔カタログの名前差分21↔21（表示名読み替え19＋破損名修復2。§1-3）。これに伴い母集団中間名20件は検索文字列としても到達しない（§2 (3)）。
  2. scan で解決できない対応項目10件（演算子・デストラクタ名。開示済みの設計上の対象外で全件検索到達済み。§3）。
  3. B8報告書 §1 の prose 数値（実装済み11行／重複248件）と生データ実測（12行／249名・余分460行）の僅かなずれ。最終件数3,182・4,915は正確に再現できる（§1-2）。D-17 として親工程での prose 是正が望ましい旨を記録するに留める。
- 本所見の範囲外：用語定義・項目文面の正確性（F-03／F-04 の内容面）、対応274件の実挙動（F-01）、未対応項目の名指し停止（C-12）、UI表示（D群）、CFN 分は他担当の範囲。
