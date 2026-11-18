# 高度A8班 WS-REG findings（REG-01〜03、REG-05、E-02 データ面）

- 担当：WS-REG（共有核 `js/core/c-family.js` の C／C# への波及確認＋ precache 静的確認）
- 対象ツリー：`~/workspace/programming-practice-audit/work/lane-a8-exec/`（repo-reffix @ 04dfe2d のコピー、C++ 意味論が共有核に入った統合ツリー）
- 対照ツリー：`~/workspace/programming-practice-audit/deliver-stage18/`（簡易モード最終ビルド d2f2198）
- 実施方法：ツリーごとに**別プロセス**で `js/types/registry.js` の `getDefinition` を読み、`await d.simulate(code, structuredClone(d.model.defaults))` を実行（同一プロセスに両ツリーを混在させていない）。比較は正規化オブジェクト（`topError`／`notes`／`truncated`／`reasons`／`operations`／パスごとの `outputs{text,channel}`・`trace{line,text,category,kind}` 全件・`error`・`halt`・`signal`・`vars`・`model.variables`・`groups`・`facts`）の **JSON 完全一致** で機械判定した（経過時間のみ除外）。以下「完全一致」はこの意味。
- C コードのラッパ（全 REG-01／02 共通）：`#include <stdio.h>`／`#include <stdlib.h>`／`#include <string.h>`／`#include <math.h>`（各1行）＋ `int main() { <本文> return 0; }`。エラー位置 `@L6` は本文行を指す。
- 総合判定：**回帰欠陥ゼロ**。REG-01（19件）・REG-02 簡易層（14件）・REG-03（全6本）は対照と完全一致。REG-05 はモード間で完全一致（CFN は注記のみ差分で設計どおり）。E-02 は高度ファイル混入なし。REG-02 の div 期待値については §REG-02 末尾の申し送りを参照（両ツリー一致のため回帰ではないが、probes の期待値そのものは両ツリーとも未達）。

---

## REG-01：C printf 形と NaN 表示（対照突合）

判定：**合格（回帰なし）**。19件すべて完全一致。NaN の printf 表示は両ツリーとも `nan` で、基礎決定 RG-04 の表記が対象ツリーでも維持されている。

| # | 入力（本文） | 対照の実測 | 対象の実測 | 判定 |
|---|---|---|---|---|
| d-single | `printf("%d", 42);` | 出力 `42`、エラーなし | 出力 `42`、エラーなし | 一致 |
| d-neg-nl | `printf("%d\n", -7);` | 出力 `-7\n` | 出力 `-7\n` | 一致 |
| s-basic | `printf("%s", "hello");` | 出力 `hello` | 出力 `hello` | 一致 |
| multi-nl | `printf("%d\n", 1); printf("%s\n", "ab"); printf("%f\n", 0.5);` | 出力 `1\nab\n0.500000\n`（trace 4ステップ） | 同左 | 一致 |
| f-basic | `printf("%f", 2.5);` | 出力 `2.500000` | 出力 `2.500000` | 一致 |
| f-dot1 | `printf("%.1f", 3.14159);` | 停止：`未対応:このprintf書式はモデルで扱えません@L6`、出力なし | 同左 | 一致（両ツリーとも精度指定子は未対応で正直に停止） |
| mixed-dsf | `printf("%d %s %f", 1, "x", 2.5);` | 出力 `1 x 2.500000` | 出力 `1 x 2.500000` | 一致 |
| mixed-fd | `printf("%f %d", 1.5, 7);` | 出力 `1.500000 7` | 出力 `1.500000 7` | 一致 |
| c-char | `printf("%c", 65);` | 出力 `A` | 出力 `A` | 一致 |
| i-form | `printf("%i", 123);` | 出力 `123` | 出力 `123` | 一致 |
| percent | `printf("100%%");` | 出力 `100%` | 出力 `100%` | 一致 |
| u-form | `unsigned int u = 42; printf("%u", u);` | 出力 `42` | 出力 `42` | 一致 |
| nan-var | `double x = 0.0 / 0.0; printf("%f", x);` | 出力 `nan` | 出力 `nan` | 一致（RG-04 維持） |
| nan-direct | `printf("%f", 0.0 / 0.0);` | 出力 `nan` | 出力 `nan` | 一致（RG-04 維持） |
| inf-pos | `printf("%f", 1.0 / 0.0);` | 出力 `inf` | 出力 `inf` | 一致 |
| inf-neg | `printf("%f", -1.0 / 0.0);` | 出力 `-inf` | 出力 `-inf` | 一致 |
| inf-var | `double a = 5.0; double b = a / 0.0; printf("%f", b);` | 出力 `inf` | 出力 `inf` | 一致 |
| width-form | `printf("%5d", 42);` | 停止：`未対応:このprintf書式はモデルで扱えません@L6` | 同左 | 一致 |
| ld-form | `printf("%ld", 42L);` | 停止：`未対応:このprintf書式はモデルで扱えません@L6` | 同左 | 一致 |

補足：受理される書式は両ツリーとも `%d %i %s %f %c %u %%` のみ（c-family の `formatPrintf` の受理範囲）。`%.1f` 等の精度・幅・長さ指定は両ツリーとも未対応停止であり、対象ツリーで受理範囲が広がったり狭まったりしていない。

---

## REG-02：C `div`／文字列関数群（対照突合＋高度層）

### 第1層：簡易モード相当（フック未適用、対照ツリーと突合）

判定：**合格（回帰なし）**。14件すべて完全一致。簡易モードでは両ツリーとも `div`／文字列関数は意味論を持たず、全件が同文言で停止する（基礎の挙動そのもの）。

| # | 入力（本文） | 対照の実測 | 対象の実測 | 判定 |
|---|---|---|---|---|
| div-decl | `div_t d = div(10, 3); printf("%d %d", d.quot, d.rem);` | 停止：`未対応:この構文は説明に対応していません：型 div_t の宣言は未対応です@L6`（パス0件） | 同左 | 一致 |
| div-direct | `printf("%d %d", div(10, 3).quot, div(10, 3).rem);` | 停止：`エラー:この関数は説明に対応していません：div@L6` | 同左 | 一致 |
| div-neg | `printf("%d %d", div(-7, 2).quot, div(-7, 2).rem);` | 停止：`エラー:…：div@L6`（同上文） | 同左 | 一致 |
| ldiv-direct | `printf("%ld %ld", ldiv(10L, 3L).quot, ldiv(10L, 3L).rem);` | 停止：`エラー:この関数は説明に対応していません：ldiv@L6` | 同左 | 一致 |
| strcmp-lit-neg | `printf("%d", strcmp("abc", "abd"));` | 停止：`エラー:…：strcmp@L6` | 同左 | 一致 |
| strcmp-eq | `printf("%d", strcmp("abc", "abc"));` | 停止：`エラー:…：strcmp@L6` | 同左 | 一致 |
| strcmp-arr | `char a[8] = "abc"; char b[8] = "abd"; printf("%d", strcmp(a, b));` | 停止：`エラー:…：strcmp@L6` | 同左 | 一致 |
| strncmp | `printf("%d %d", strncmp("abcx", "abcy", 3), strncmp("abcx", "abcy", 4));` | 停止：`エラー:…：strncmp@L6` | 同左 | 一致 |
| strlen | `printf("%d %d", (int)strlen("hello"), (int)strlen(""));` | 停止：`エラー:…：strlen@L6` | 同左 | 一致 |
| strchr | `char buf[8] = "hello"; printf("%s", strchr(buf, 'l'));` | 停止：`エラー:…：strchr@L6` | 同左 | 一致 |
| strrchr | `char buf[8] = "hello"; printf("%s", strrchr(buf, 'l'));` | 停止：`エラー:…：strrchr@L6` | 同左 | 一致 |
| strstr | `char buf[16] = "hello world"; printf("%s", strstr(buf, "wor"));` | 停止：`エラー:…：strstr@L6` | 同左 | 一致 |
| strstr-null | `char buf[8] = "abc"; printf("%d", strstr(buf, "z") == NULL);` | 停止：`エラー:…：strstr@L6` | 同左 | 一致 |
| strcpy-pipe | `char buf[32]; strcpy(buf, "foo"); strcat(buf, "bar"); printf("%s %d %d", buf, (int)strlen(buf), strcmp(buf, "foobar"));` | 停止：`エラー:…：strcpy@L6` | 同左 | 一致 |

### 第2層：対象ツリーの高度モード相当（アプリ／Worker と同じ手順：`loadAdvanced`→`mergeCatalog`→`applyAdvancedEngine` で C ライブラリを装着）

対照ツリーには高度機構自体が無いため、この層は対象ツリー内での意味論確認＋混線確認である。C カタログは基礎27件→合成638件（problems 0、failed なし）。

| # | 入力（第1層と同一） | 対象（高度装着後）の実測 | 判定 |
|---|---|---|---|
| div-decl／div-direct／div-neg／ldiv-direct | 同上 | 第1層と**完全に同一の停止**（文言・位置・パス数まで一致） | 下記申し送り参照 |
| strcmp-lit-neg | 同上 | 出力 `-1` | 正常（符号は負。リテラル経由） |
| strcmp-eq | 同上 | 出力 `0` | 正常 |
| strcmp-arr | 同上 | 出力 `-1`（配列経由＝glibc 式の符号なしバイト差 `'c'-'d'`） | 正常 |
| strncmp | 同上 | 出力 `0 -1`（n=3 で一致、n=4 で `'x'-'y'`=-1） | 正常 |
| strlen | 同上 | 出力 `5 0` | 正常 |
| strchr | 同上 | 出力 `llo` | 正常 |
| strrchr | 同上 | 出力 `lo` | 正常 |
| strstr | 同上 | 出力 `world` | 正常 |
| strstr-null | 同上 | 出力 `1`（NULL 比較が真） | 正常 |
| strcpy-pipe | 同上 | 出力 `foobar 6 0` | 正常 |
| printf-check（追加） | REG-01 mixed-dsf と同一コード | 出力 `1 x 2.500000`（フック装着前と同一） | フックで printf 不変 |
| nan-check（追加） | REG-01 nan-var と同一コード | 出力 `nan`（同一） | フックで NaN 表示不変 |
| cpp-std-div（混線確認・同プロセスで C フック装着後に実行） | `#include <iostream>`／`#include <cstdlib>`＋`std::div_t r = std::div(10, 3); std::cout << r.quot << "," << r.rem;` | 出力 `3,1`、エラーなし | C++ 側 `std::div` は quot=3／rem=1 を正しく返し、C フック装着の影響を受けない。C の無名 `div` と `std::div` の混線なし |

### REG-02 申し送り（欠陥ではなく裁定事項として記録）

- probes.md REG-02 の期待値「`div(10,3)` の quot=3／rem=1」は、**C モードでは対照・対象の両ツリーとも、簡易・高度の両モードとも得られない**。実測は全モード共通で上記の停止（関数 `div` は「説明に対応していません」、型 `div_t` の宣言は未対応）。
- これは回帰ではない根拠：(1) 対照ツリー（統合前）と対象ツリーで停止文言・位置・パス数が完全一致する。(2) 対象ツリーの高度カタログでも `div`／`ldiv`／`lldiv` は `status: "unsupported"` と**開示済み**であり（対照的に `strcmp`／`strncmp`／`strlen` は `supported` で実測どおり動作する）、カタログ表示とエンジン挙動が矛盾しない。(3) quot=3／rem=1 の値自体は C++ の `std::div(10, 3)` で対象ツリーが正しく返しており（上表 cpp-std-div）、共有核内の div 実装（0方向切り捨て）が壊れているわけではない。
- すなわち「C の `div` が未対応」なのは基礎からの既存仕様であり、B8 統合で生じた差異ではない。probes の期待値側が C++ の `std::div` と C の `div` を取り違えている可能性を含め、**期待値の是非は親側の裁定事項**として申し送る（本WSでは両側実測を上記のとおり残した）。
- 付記：`div` 等の停止カテゴリは両ツリーとも汎用の「エラー」（フォールスルー）であり「未対応」カテゴリではない。これも両ツリー一致の既存挙動。

---

## REG-03：C# 基礎テンプレート全本（対照突合）

判定：**合格（回帰なし）**。対象ツリーの csharp テンプレートは全6本（対照も6本で、**コード文字列自体が全本バイト一致**していることを先に確認）。6本すべて、正規化オブジェクト（出力・trace 文言列全件・最終 vars・エラー・halt）が完全一致。

| テンプレート id | 対照の実測（出力／エラー／trace ステップ数／最終 vars） | 対象の実測 | 判定 |
|---|---|---|---|
| csharp-array | 出力 `6`／エラーなし／14ステップ／`{values:[1,2,3], total:6}` | 同左（trace 文言列も全件一致） | 一致 |
| cs-object | 出力 `5`／エラーなし／4ステップ／`{first:Counter{Value:5}, same:Counter{Value:5}}` | 同左 | 一致 |
| csharp-error | 出力なし／`IndexOutOfRangeException:配列範囲外です@L5`／2ステップ／`{values:[1,2]}` | 同左 | 一致 |
| csharp-price | 出力 `360`／エラーなし／4ステップ／`{price:120, count:3, total:360}` | 同左 | 一致 |
| csharp-positive-total | 出力 `11`／エラーなし／19ステップ／`{values:[-2,4,0,7], total:11}` | 同左 | 一致 |
| cs-shared-total | 出力 `15`／エラーなし／21ステップ／`{first:Counter{Total:15}, same:Counter{Total:15}, values:[1,2,3,4,5]}` | 同左 | 一致 |

trace 文言列の実測例（両ツリー共通・全件一致を確認済み）：

- csharp-array：`values を int[] として用意します：[1, 2, 3]` → `total を int として用意します：0` → `i を int として用意します：0` →（`繰り返し n回目`／`式を評価します：1→3→6`／`i を増やします（後置式の値は変更前の n）`）×3 → `3回実行してループを終了します` → `標準出力へ出します：6`
- csharp-error：`values を int[] として用意します：[1, 2]` → `配列範囲外です`
- cs-shared-total：`first／same を Counter として用意します` → `values を int[] として用意します：[1, 2, 3, 4, 5]` → ループ5回（評価値 1→3→6→10→15）→ `5回実行してループを終了します` → `標準出力へ出します：15`

c-family.js への C++ 追加（対象で 7,022行→10,747行）の C#（managed）経路への波及は検出されなかった。

---

## REG-05：単一エンジン原則（簡易／高度の実行一致）

### C++（CPP-01／CPP-04）

手順：(a) 対象ツリーの基礎 definition のまま simulate。(b) アプリの高度モード相当を Worker（`js/worker.js` の `activateAdvanced`）と同手順で再現：`loadAdvanced(cpp)`→`mergeCatalog`→（engineModule があればフック適用）→`definition.__catalogReference` に合成カタログを保持して simulate。cpp の manifest には engineFile が無く `engineModule` は null（意味論は核内蔵のため simulate 自体は同一関数）であることを実測で確認したうえで、カタログ装着前後の実行結果を突合した。

カタログ装着の実測：基礎 reference 33件→合成 4,948件、templates 6本→14本、loaded 11ファイル、missing／failed なし、merge problems 0、engineModule なし。

| プローブ | 入力 | (a) 基礎の実測 | (b) 高度装着の実測 | 判定 |
|---|---|---|---|---|
| CPP-01 | `std::vector<int> v = {5,2,8,1,9,3}; std::sort(v.begin(), v.end());` 後、範囲 for で各要素＋`" "` を出力し、`std::binary_search(…, 8)` と `(…, 4)` を出力（コード全文は下記） | 出力 `1 2 3 5 8 9 10`（整列 1 2 3 5 8 9＋探索 真=1／偽=0）、trace 16ステップ、最終 vars `{v:[1,2,3,5,8,9]}`、halt=false、reasons=[]、エラーなし | (a) と**完全一致**（出力・trace 全件・最終状態 groups 含む・停止理由まで） | 一致（期待値 1 2 3 5 8 9／真／偽とも合致） |
| CPP-04 | `std::string s = "banana";` で `s.find("na")`、`s.rfind("na")`、`s.substr(1, 3)`、`s.find("q") == std::string::npos` を空白区切りで出力（コード全文は下記） | 出力 `2 4 ana 1`、trace 3ステップ、最終 vars `{s:"banana"}`、halt=false、エラーなし | (a) と**完全一致** | 一致（期待値 2／4／"ana"／真とも合致） |

CPP-01 コード全文：
```cpp
#include <iostream>
#include <vector>
#include <algorithm>
int main() {
 std::vector<int> v = {5, 2, 8, 1, 9, 3};
 std::sort(v.begin(), v.end());
 for (int x : v) std::cout << x << " ";
 std::cout << std::binary_search(v.begin(), v.end(), 8) << std::binary_search(v.begin(), v.end(), 4);
 return 0;
}
```
CPP-04 コード全文：
```cpp
#include <iostream>
#include <string>
int main() {
 std::string s = "banana";
 std::cout << s.find("na") << " " << s.rfind("na") << " " << s.substr(1, 3) << " " << (s.find("q") == std::string::npos);
 return 0;
}
```

### CloudFormation（CFN-09 相当：フック未適用＝簡易／適用＝高度）

手順：簡易＝対象ツリーの cloudformation definition のまま simulate。高度＝`loadAdvanced`→`mergeCatalog`（基礎 reference 226件→合成 2,024件、台帳＝AWS::／Alexa:: 名 **1,798件**）→浅いコピーへ `applyAdvancedEngine` を適用して simulate（リポジトリ既存テスト `tests/muse-advanced-cfn-engine.test.js` と同じ適用方法）。

入力（fake）：`{"Resources":{"Thing":{"Type":"AWS::FakeService::Thing"}}}`（JSON 形）。対照入力（bucket）：`{"Resources":{"Bucket":{"Type":"AWS::S3::Bucket"}}}`。例外確認（custom）：`Custom::MyResource` と `AWS::CloudFormation::CustomResource` の2リソース。

| 対象 | 簡易（フック未適用）の実測 | 高度（フック適用）の実測 | 判定 |
|---|---|---|---|
| fake（JSON） | `notes` プロパティなし（undefined）、エラーなし、パス1件（断片 groups は入力＝変換後で不変） | `notes` 1件（文面は下記）。**notes を除いた正規化オブジェクトは簡易と完全一致** | 設計どおり（注記以外の結果一致） |
| fake（YAML 形 `Resources:\n  Thing:\n    Type: AWS::FakeService::Thing`） | （簡易 JSON 形と同結果） | `notes` 1件（同文面）。notes 除外で簡易 JSON 形と完全一致 | 設計どおり |
| fake 再実行 | — | 2回目の実行も notes 1件で、結果全体が1回目と完全一致（増殖なし＝冪等） | 設計どおり |
| bucket（台帳内） | notes なし、エラーなし | notes なし。notes 除外でなく**全体が簡易と完全一致** | 誤注記なし |
| custom（例外2種） | notes なし、エラーなし | notes なし、エラーなし | 例外が正しく除外 |
| scan（fake） | 要素 `[]`、notes プロパティなし | 要素 `[]`（基礎と同一）、配列に `notes` 1件を付属 | 要素不変＋注記付属は設計どおり |

注記の実測文面（fake、JSON／YAML 共通）：
> 注記：Resources の「Thing」の Type「AWS::FakeService::Thing」は、このアプリのリソースタイプ台帳に載っていません。台帳は 2026-11-16 時点の AWS 公式リソース仕様のスナップショットであり、それ以降に追加された新しいタイプなど、実在しても台帳に未収録の場合があります。これはエラーではなく、このタイプはこのアプリでは検証・参照の対象外であることを示す注記です。

文面は「台帳未収録」＋スナップショット日 2026-11-16＋「エラーではなく」をすべて含み、simulate の成否・パスには影響していない（エラー化なし）。

---

## E-02 静的面：precache への高度ファイル混入確認

判定：**合格（混入なし）**。

- 対象ツリー `precache.js` の `PROGRAMMING_ASSETS`（86件）を機械走査し、課題定義の高度ファイルパターン（名前に `-advanced` を含む .js／`advanced-manifest.js`／`advanced-engine.js`、`scripts/precache.mjs` の `ADVANCED_FILE_RE` と同一）への一致は **0件**。
- ディスク上に実在する同パターンの高度ファイルは **487件**あり、そのいずれも precache 一覧に含まれていないことを突合済み（漏れ0件）。
- 「advanced」の部分文字列を含む資産は `./js/core/advanced-loader.js` の1件のみ。これは種類別高度差分ファイルではなくモード機構のコアローダー（`js/app.js`／`js/worker.js` が静的 import する基盤ファイル）であり、課題定義のパターン（`-advanced`／`advanced-manifest.js`／`advanced-engine.js`）には該当しない。欠陥とは判定しない。
- `node scripts/precache.mjs --check` を対象ツリーで実行：**終了コード 0**（マニフェストは最新で陳腐化なし）。

---

## まとめ

| プローブ | 判定 |
|---|---|
| REG-01 | 合格：19件すべて対照と完全一致。NaN=`nan`（RG-04）維持 |
| REG-02 | 合格（回帰なし）：簡易層14件完全一致。高度層で文字列関数群は正値動作、C printf／NaN はフック前後不変、C++ `std::div` との混線なし。ただし C `div` の quot/rem 期待値は両ツリー・両モードとも未達（基礎からの既存仕様＋カタログで unsupported 開示済み）→ 期待値の是非は親側裁定へ申し送り |
| REG-03 | 合格：C# テンプレート全6本、コード自体も含め完全一致 |
| REG-05 | 合格：CPP-01／CPP-04 はカタログ装着前後で完全一致。CFN-09 相当は注記のみ差分（文面・冪等・例外・scan とも設計どおり、台帳1,798件） |
| E-02（データ面） | 合格：precache に高度ファイル混入なし（487件中0件）、`--check` 通過 |

回帰欠陥：**0件**。未確認として残す差異：なし（REG-02 の div は「差異」ではなく両ツリー一致の既存仕様として上記に実測を残した）。
