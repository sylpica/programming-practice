# Muse 修正報告書（第7バッチ：CI 実コンパイル照合の再発是正）

対象：是正配信コミット `41cc179` に対する GitHub Actions ラン #20 の validate
ジョブ失敗（ステップ「Compile teaching examples with native runtimes」＝
`tests/native-audit.py`）。
台帳グループ：RG-144（元項目 2件）。累計は 729件／144グループ。

## 失敗内容（一次情報）

CI のログ（サインインして実物を確認）によれば、AssertionError のタプルは
`('c', 'reference', 'abs', <stderr>)` で、C リファレンス項目 `abs` の使用例
（`#include <stdio.h>` のみで `abs(-3)` を呼ぶ）が、CI の gcc では
`error: implicit declaration of function 'abs'`（`<stdlib.h>` が必要）で
コンパイルできなかった。native-audit は最初の失敗で停止する設計のため、
背後に同種の項目が隠れている可能性を collect-all で潰すのが本バッチの
第一の目的である。

根本原因クラスは RG-143 と同じ「コンパイラ環境差」だが、内訳が異なる。
RG-143 の3件はどの gcc でもエラーになる前提欠如だったのに対し、本件は
**暗黙の関数宣言が GCC 13 以前では警告、GCC 14 以降では既定でエラー**という
世代差であり、ローカル（gcc 13.3）では再現しなかった。

## CI 条件のローカル再現（collect-all）

`tests/native-audit.py` と同一のデータ抽出（`js/types/registry.js` の
definitions からテンプレート `code`／リファレンス `example` を取得）・
同一の基本条件（C: gcc -std=c17 -Wall -Wextra／C++: g++ -std=c++17
-Wall -Wextra）で、失敗を全件収集する収集器を別途用意し、2つのパスで
C／C++ 全69件（テンプレート12＋リファレンス57）を照合した。

- **Pass A（CI 厳格コンパイル）**：GCC 14 が既定エラー化した診断を
  `-Werror=` で明示した：`implicit-function-declaration`、
  `implicit-int`、`int-conversion`、`incompatible-pointer-types`。
  （`return-mismatch` は GCC 14 以降のオプション名で、この VM の
  GCC 13 では cc1 が受け付けないため除外した。その対象クラスは
  ローカルではハードエラー／-Wreturn-type の範囲で、今回の失敗
  クラスではない。）C++ は暗黙宣言の概念自体がなく未宣言名は常に
  ハードエラーになるため、基本条件のみで収集した。
- **Pass B（宣言ヘッダーの自己充足監査）**：コンパイラ世代差のもう一つの
  形として、libstdc++／glibc の**推移的インクルードへの偶然の依存**を
  洗う。各使用例について、呼び出す既知のライブラリ関数（約80種）ごとに
  その宣言ヘッダーを直接インクルードしているかを機械照合した。あわせて
  全使用例の呼び出し識別子を走査し、照合表に無い未知の関数呼び出しが
  ないことも確認した（表の網羅性チェック）。

### 影響項目の全リスト（2件）

| # | 種類 | 区分 | 項目 | Pass A | Pass B | 内容 |
|---|---|---|---|---|---|---|
| 1 | C | リファレンス | `abs` | **失敗** | 該当 | `<stdio.h>` のみで `abs(-3)` を呼ぶ。`<stdlib.h>` が必要。CI の AssertionError そのもの |
| 2 | C++ | リファレンス | `abs` | 合格 | **該当** | `<iostream>`＋`<cstdio>` のみで `abs(-3)` を呼ぶ。宣言ヘッダー `<cstdlib>` を欠き、ローカルでは libstdc++ 13 の推移的インクルードで偶然宣言されていた。コンパイラ／ライブラリ世代が変われば同じ失敗になる同根項目 |

Pass A の失敗は #1 の **1件のみ** で、assert の背後に隠れた同種項目は
存在しなかった。Pass B の該当も上記2件のみで、C／C++ の他の全67件は
どちらのパスでも問題なし。

## 根本原因と処置

根本原因：RG-143 で是正した `js/core/c-family.js` のリファレンス使用例
ラッパーは、条件付きインクルードが bool／std::string の場合に限られ、
`abs` のように「基本ヘッダー（stdio.h／iostream＋cstdio）以外の宣言
ヘッダーを必要とする関数」を使う使用例をカバーしていなかった。`abs`
項目自身の説明文は「int の絶対値を返します（<stdlib.h>／<cstdlib> の
関数）」と正しく宣言元を示しており、使用例側の前提だけが欠けていた。

処置（`js/core/c-family.js`、ラッパー部のみ・RG-143 と同じ方針）：

- 使用例が整数 abs 系（`abs`／`labs`／`llabs` の呼び出し）を含む場合に
  だけ、C では `#include <stdlib.h>` を、C++ では `#include <cstdlib>`
  を追加する。該当しない使用例の表示・挙動は一切変えない。
- 是正後の使用例：C `abs` は `#include <stdio.h>`＋`#include <stdlib.h>`、
  C++ `abs` は `#include <iostream>`＋`#include <cstdio>`＋
  `#include <cstdlib>` を含む形になった。

照合個票の同期：`docs/audit/reference-r2.json` の該当2行（c/abs、
cpp/abs）の `fields.example` を新しい定義文面に差し替え、sha256 を
RG-143 で確立した方式（fields の JSON をキーソート・UTF-8 で再計算）
で更新し、自己整合を再計算で確認した。同期に先立ち、C／C++ の全
リファレンス行について定義文面との差分を機械確認し、差分が abs の
2行だけであることも確認した（差分は該当4行のみ）。

`tests/native-audit.py` 自体には一切手を入れていない（検査の弱体化なし）。

## 回帰テスト

`tests/muse-fix-ci.test.js` に静的検査1件を追加した（RG-143 の2件と
同じファイル・同じ考え方）。

- 「C/C++ examples include the header declaring every library function
  they call」：C／C++ の全教材例（テンプレート＋リファレンス）について、
  呼び出すライブラリ関数（約80種の関数→宣言ヘッダー表）ごとに宣言
  ヘッダー（C／C++ どちらの表記でも可）の直接インクルードを必須とし、
  C++ の `std::string`／`std::getline`／`std::cout`／`std::cin`／
  `std::endl` についても宣言ヘッダーを必須とする。これにより、CI の
  コンパイラ世代に依存せず、暗黙宣言クラスと推移的インクルード依存の
  両方を npm test で捕まえられる。
- 修正前の内容に対してこの検査を実行し、`c reference abs` で失敗する
  ことを確認した。さらに、C++ 側の追加だけを巻き戻した複製ツリーでは
  `cpp reference abs` で失敗することも確認し、2件とも独立に検出できる
  ことを証明した。修正後は全件合格。

## 最終確認

- 収集器の再実行：Pass A 失敗 **0件**／Pass B 該当 **0件**（全69件）。
- npm test：**2,055件全件合格**（従来2,054件＋新規1件）。
- native-audit.py（dotnet を含む全範囲、標準入力は /dev/null で EOF）：
  **完走し exit 0**。要約出力は `{"checks": 298,
  "C_CPP_stdout_matches_simulator": true, "Csharp_native_execution": 59,
  "Csharp_expected": 59, "Csharp_skipped": 0,
  "Csharp_compiler_available": true, "python_execution": 161}` で、
  C# は全59件が実コンパイル・実実行され、スキップゼロ。末尾で実行される
  native-r3.py も `all_passed: true`（新規オラクル64件、C# 3/3 実行）。
- precache：再生成し `node scripts/precache.mjs --check` 通過。

## 変更ファイル（6件）

- `js/core/c-family.js`（ラッパーの条件付きインクルード拡張）
- `docs/audit/reference-r2.json`（該当2行の文面・sha256 同期）
- `tests/muse-fix-ci.test.js`（回帰テスト1件追加）
- `precache.js`（再生成）
- `docs/audit/muse/consolidated-residual-register.md`（RG-144 追記）
- `docs/audit/MUSE-FIX-CI2.md`（本報告書）

GitHub への書き込みは行っていない（是正配信は本線が実施）。

## 未確認事項

- CI ランナーの gcc の正確なバージョンは未確認（ログの診断文言
  「implicit declaration ... error」は GCC 14 以降の既定挙動と一致する
  が、バージョン番号そのものはログから確定していない）。本修正は
  バージョンに依存しない形（宣言ヘッダーの自己充足）で是正している
  ため、この未確認は是正の成否に影響しない。
