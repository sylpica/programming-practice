# 高度モード ブロックB8（C++＋CloudFormation）報告書

- 作業ツリー：`~/workspace/programming-practice-audit/work/adv-b8/`（ベース bba3b26＝main d2f2198 と同一内容）
- 最終コミット：5ba45ed（本報告書のコミットを除く）
- GitHub 書き込み：なし（配信は親工程）
- 一次情報：C++ は cppreference オフラインアーカイブ v20250209（棚卸しの母集団と同一版。スナップショットに無い <meta>／<hive>／<contracts> のみライブ版で補完）＋ g++ 13.3.0 実走。CloudFormation は AWS 公式ドキュメント＋公式 Resource Specification JSON 272.0.0。

## 1. U-48：C++ 主要クラスの列挙結果（ブロック開始時点で確定）

名前空間スコープ項目 3,648 行の棚卸しから実装済み 11 行を除き、重複名 248 件を統合して **3,182 件** を作業範囲とした。これに加え、主要クラス **61 クラス**を列挙し、クラスページの Member types／functions／objects／constants 表からメンバ **1,733 件**を確定した（継承メンバの二重計上・定義行の混入は裁定で除去。hive は C++26 のためライブ版 cppreference から 49 件を補完）。

主要クラス 61 件（作業データ `b8-data/cpp-members.json` の classes が正本。basic_* は表示名への読み替え後の対象を含む）：basic_string, basic_string_view, array, vector, deque, list, forward_list, map, multimap, set, multiset, unordered_map, unordered_multimap, unordered_set, unordered_multiset, flat_map, flat_multimap, flat_set, flat_multiset, inplace_vector, stack, queue, priority_queue, span, mdspan, pair, tuple, optional, variant, any, expected, function, initializer_list, complex, valarray, bitset, unique_ptr, shared_ptr, weak_ptr, basic_istream, basic_ostream, basic_iostream, basic_streambuf, basic_stringstream, basic_istringstream, basic_ostringstream, basic_ifstream, basic_ofstream, basic_fstream, basic_regex, match_results, sub_match, chrono::duration, chrono::time_point, chrono::system_clock, chrono::steady_clock, chrono::high_resolution_clock, thread, atomic, filesystem::path, hive。

## 2. 実装件数（ステータス別）

| 区分 | 総数 | 対応 supported | 未対応 unsupported | 未検証 unverified |
|---|---:|---:|---:|---:|
| C++ 名前空間スコープ | 3,182 | 178 | 3,004 | 0 |
| C++ 主要クラスメンバ | 1,733 | 96 | 1,637 | 0 |
| C++ 合計 | 4,915 | 274 | 4,641 | 0 |
| CloudFormation リソース種別 | 1,798 | 1,798 | 0 | 0 |
| テンプレート（C++ 8＋CFN 4） | 12 | 全本が対応項目のみに依存 | ― | ― |
| 用語集（C++ 12＋CFN 6） | 18 | ― | ― | ― |

- C++ の対応範囲は裁定どおり：<cmath>／<cstdlib> 変換系／<cctype>／<cstring> 6 関数／<string> 変換系／<algorithm>／<numeric>／<utility>／<bit>／<numbers>／<iterator>、cin・cerr・clog、std::string／std::vector／std::array／std::pair の裁定メンバ。ranges::・execution:: は全件未対応（理由を開示）。
- CloudFormation は U-50 の深さ（種別名＋概要＋主要プロパティ要約）で全件収載し全件 supported。1,798 件中 1,786 件は公式仕様 JSON と照合済み、残り 12 件（docsOnly）は公式ドキュメントから採取。プロパティ 0 件の種別は仕様 JSON でも Properties が空であることを確認済み。
- 未検証ゼロは「確定できない項目を作らない／ライブ版一次情報で補完する」方針の結果であり、未確認の範囲（<meta> 248 件・<hive> 3 件・<contracts> 5 件）は全てライブ版 cppreference で裏付けて未対応として収載した。

## 3. エンジン実装

- **cpp-engine-a**（c-family.js、language === "cpp" ガード内）：<cmath> 63、<cstdlib> 変換系＋div 系（div_t の .quot／.rem）、<cctype> 13、<cstring> 6、stoi 系＋to_string、<bit> 12、std::numbers 定数 12、cerr／clog、std::string メンバ 30 種＋npos。g++ 照合 32 件中 30 件完全一致（残り 2 件は try 文自体が既存未対応のため例外カテゴリの一致を単体テストで確認）。
- **cpp-engine-b**（同上＋cpp/index.js の scan 拡張）：vector／array／pair の値モデルと裁定メンバ全件、イテレータモデル（通常・逆向き・const、範囲 for 併用可）、<algorithm> 36、<numeric> 5、<utility> 6、<iterator> 4＋base()、std::string のイテレータ取得。g++ 照合 51 件全件一致。
- **cfn-engine**：契約どおり `advanced-engine.js` の `applyAdvancedEngine` フック。台帳（合成カタログの AWS::／Alexa:: 名）外の Type にエラーでなく注記を付ける。Custom:: と AWS::CloudFormation::CustomResource は対象外、冪等、台帳 0 件時は無言。テスト 13 件通過。
- C／C# の挙動は不変（対照テスト＋全体スイートで確認）。

## 4. 契約（advanced-interface.md）への適合と差異

適合：status 3 値の必須付け・旧 `supported` 真偽値の不使用、項目形状（リファレンス 9 フィールド／テンプレート 6 キー／用語ペア）、基礎との name・id・語の重複ゼロ（したがって referenceOverrides は不要かつ未使用）、manifest の referenceParts への part 直接列挙、ファイル名の precache 除外パターン一致、CFN エンジンのフック経由、モードで実行結果を変えない単一エンジン原則（B8 の変更にモード分岐は無い）。

差異（報告書への明記で足りるとされた分）：
1. **C++ の意味論は `advanced-engine.js` フック経由ではなく共有エンジン核（c-family.js）に実装した。** 理由：契約 R-3 がフックの具体的用法を未確定とし「フックを使わずに済む差分を原則」としていること、C++ の意味論はパーサ・値モデルレベルの拡張で (definition, merged) フックでは到達できないこと。モード分岐は持ち込んでおらず第 1 章の不変条件（単一エンジン・実行結果はモードで変えない）は満たす。cpp/index.js の scan 拡張も同様にモード分岐なし（合成カタログの reference を参照する方式で、高度ファイルの静的 import はしていない）。
2. **precache 除外・SW の network-first・ローダーは機構側ファイルの変更を要するため B8 では触っていない**（sw.js／scripts/precache.mjs／js/core/* は無変更）。ファイル名は除外パターンに一致させてあるので、機構側の実装で自動的に対象外になる。

## 5. ブロック監査（角度カタログを B8 範囲で実施）

実施した角度：A-01（一次情報照合：全チャンク検証＋サンプル 12 件を原典と照合）、A-02／A-03（g++ 差分照合：両エンジン班 83 件＋監査側の新規 16 件）、C-10／C-11（組み込み関数・公式カタログ完全性：棚卸し→項目の全数突合せ）、C-12（宣言と振る舞いのマトリクス：対応 274 件の例を全件実走し文脈付きで再検証）、D-06（チップ・検索の到達性：合成カタログでの scan 検証）、D-07（テンプレート trace 全 12 本実走）、D-08／T-01（テンプレート解説と出力の照合）、F-01（対応関数の典型・境界ケースを g++ 照合に含む）、F-02（3 方向突合せ：棚卸し→項目 6,713 件漏れ 0、実装→項目、テンプレート refs→項目）、F-03（用語の基礎重複 0・定義はモデルに即して記述）、F-04（文面正確性：サンプル照合＋例の実行可能性）、J-01（文字化け走査 0 件）、M-01（新規停止文言の原因正確性：比較関数指定形・コンテナ出力・ジェネリック宣言等の名指し文言を確認）、X-01（危険パターン走査：実質 0 件。bitset::to_string の `one = '1'` は引数名の誤検知）、E-07（テスト実測：後述）。

対象外とした角度と理由：D-01〜D-05、D-09〜D-17、E-01〜E-06、E-08〜E-11、A-04〜A-18 の他種類分、B 群の他種類パーサ分、C-01〜C-09／C-13〜C-16 の全種類分、N-01、P-01、S-01 は、UI・セッション・他種類・公開物に及ぶ全体監査（機構統合後）の範囲であり、B8 の差分（C++／CFN のデータ＋エンジン）からは検証不能なため対象外。B8 範囲のパーサ・パス系（B-02 の cpp 分、C-04 の cpp 分）はエンジン班テストと本監査の実走でカバーした。収束判定は全体監査ラウンドの条件であり、本ブロック監査はその代わりにならない（U-46）。

### 監査で発見しブロック内で修正した欠陥

1. **transformSource の過剰変換**（統合時）：engine-a の `string::`→`string.` 書き換えが `std::string::iterator` 等の型名まで壊していた。npos の場合に限定して修正。
2. **std::to_string の代表項目取り違え**：同名異実体（<string> 数値変換＝実装済み／<stacktrace> 版＝未対応）の統合項目が stacktrace 側代表になっており、ステータスと実装・テンプレート参照が矛盾していた。代表を <string> 側（対応）に差し替え、stacktrace 版は caution で開示。
3. **supported 例 44 件がシミュレータで停止する形式だった**（スカラー auto、明示的テンプレート引数、const ポインタ宣言、size_t 宣言、参照宣言）。全件を実行できる形式へ修復し実走検証。std::forward は本来の使用形自体が未対応のため caution で開示（例は定義形のまま＝実 C++ として正しい形を保持）。
4. **テンプレート cpp-adv-cstring-cctype が const 宣言で停止**：char 配列形へ修復し、出力（7／3／4／0／a／found）を実走確認。
5. **scan で名前空間スコープ名が到達不能**：std::sort 等の `::` 名がチップ解決できなかった。cpp/index.js の scan 拡張にトークン列照合を追加（演算子名等の識別子で構成できない名前は対象外で、リファレンス検索で到達可能）。
6. **ワークリストの項目名破損 2 件**（`std::operator`／`std::operator\`）：一次情報（スナップショットの <cstddef> synopsis）で std::operator|= と std::operator| に同定し修復。全ワークリストの破損走査で同種は他に無いことを確認。
7. **仕様反転した既存テスト 4 件**（vector 宣言を未対応とする旧仕様の主張 3 件＋engine-a テストの string イテレータ主張 1 件）を B8 実装後の仕様へ更新。

### 検証結果サマリ

- 全体テスト：**4,624 件全通過**（ベース 4,597＋B8 新規 27。既知の時間予算系フレークは本実行では発生せず）。
- 対応項目の例：274 件中 273 件が実行可能（文脈付き含む）を確認。残り 1 件（std::forward）は定義形の例＋caution 開示で処置。
- g++ 独立照合（監査側新規 16 件）：14 件完全一致、1 件は監査スニペット側の auto 使用（div_t 形では完全一致を確認）、1 件は <cctype> の戻り値（実物 glibc は 4、モデルは真偽の 1。一次情報の規定は「0 以外の値」であり、項目の returns もそのとおり記載＝実装定義差として記録）。
- CFN フック：台帳内タイプ（サンプル 36 件＋テンプレート使用分）に誤注記なし、台帳外タイプに注記、Custom:: 系に注記なし。

## 6. 統合時申し送り（親工程・機構側へ）

1. **precache**：B8 の高度ファイルは全て除外パターン（`advanced-manifest.js`／`advanced-engine.js`／`-advanced` を含む .js）に一致する。機構側の precache.mjs 実装で自動的に対象外になることの確認を統合時に行うこと。
2. **CFN 注記の画面描画**：現行 app.js は simulate 結果の `notes` を表示しない。フックの注記を学習者に見せるには、統合時に結果表示への notes 描画（または scan の notes プロパティの表示）が必要。
3. **scan 拡張の活性化条件**：cpp の scan 拡張は合成後のカタログ（definition.reference に高度項目が合成された状態）で高度名を返す。機構の mergeCatalog が cpp 定義へ合成を反映する経路で自動的に効く。
4. **size_t 型名**：`size_t`／`std::size_t` の宣言は基礎エンジン側の型名体系の話（C にも波及）として未対応のまま。B8 では該当する例を unsigned long 形に寄せて回避した。対応する場合は全体監査側のエンジン課題として扱うこと。
5. **明示的テンプレート引数の呼び出し構文**（例：`std::make_pair<int,int>(...)`、`std::byteswap<unsigned>(...)`）は基礎パーサの制限として未対応（誠実に停止する）。B8 の例は全て型推論形に寄せた。
6. 既知のモデル制限（各項目の caution／エンジン班報告書に開示済み）：npos は -1 で表現（比較は実物どおり、値の表示のみ実物と異なる）、イテレータ無効化の厳密な追跡なし、コンテナへのポインタ・名前付き参照・要素ポインタは未対応、sort の等価要素順序は実装依存、rand は未確定値。

## 7. 残存

- 本ブロックの残存作業はない。全体の収束判定は機構統合後の全体監査ラウンドで行うこと（U-46）。
- 任意の積み残しとして新規に発生したものはない（上記申し送りは統合工程の必須確認事項であり、任意残件ではない）。
