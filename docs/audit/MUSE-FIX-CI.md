# Muse 修正報告書（第6バッチ：CI 実コンパイル照合の失敗是正）

対象：統合配信コミット `6763392` に対する GitHub Actions validate ジョブの失敗
（ステップ「Compile teaching examples with native runtimes」＝ `tests/native-audit.py`）。
台帳グループ：RG-143（元項目 3件）。累計は 727件／143グループ。

## 失敗の全数把握

`tests/native-audit.py` は最初の失敗で停止する設計のため、同スクリプトと同一の
データ抽出（`js/types/registry.js` の definitions から simulate で期待出力を算出）、
同一のコンパイル条件（C: gcc -std=c17 -Wall -Wextra／C++: g++ -std=c++17 -Wall -Wextra／
Python: 実 CPython 実行／C#: 実 dotnet build＋実行、入力・合否条件も同一）で、
失敗を全件収集する収集器を別途用意して照合した。

照合範囲と結果：

| 種類 | テンプレート | リファレンス | 失敗 |
|---|---|---|---|
| C | 6 | 26 | 1 |
| C++ | 6 | 31 | 2 |
| C# | 6 | 53 | 0 |
| Python | 10 | 160 | 0 |
| 合計 | 28 | 270 | **3** |

### 失敗の全件リスト（3件）

1. **C／リファレンス `bool`**（コンパイル失敗）：使用例
   `#include <stdio.h>\nint main() {\nbool ok = true;\nreturn 0;\n}` が
   実 gcc で `unknown type name 'bool'`／`'true' undeclared`。C17 では
   bool／true／false は `<stdbool.h>` のマクロであり、インクルードが必須。
2. **C++／リファレンス `string`**（コンパイル失敗）：使用例の `string s = "ab";` が
   無修飾のため実 g++ で未宣言。`std::string` と `<string>` が必要。
3. **C++／リファレンス `getline`**（コンパイル失敗）：使用例の `string line;` が
   同じ根本原因で未宣言（`std::getline` 自体も `<string>` 宣言）。

Python は全170件（コンパイル＋対応項目の実実行）が合格。C# は下記のとおり
全59件を実コンパイル・実実行で照合し、失敗ゼロ（うち `-error` 項目は
IndexOutOfRangeException での停止まで確認）。

注：初回の全件収集は、この VM の /tmp（512MB の tmpfs）が dotnet 導入の
ダウンロードで満杯になり、収集器側の OSError（No space left）で多数の
「失敗」が混入した。TMPDIR をホーム側ファイルシステムへ移して再収集し、
上記の3件が実在の失敗であることを切り分けた。

## dotnet の導入

- dotnet-install スクリプト（公式）で .NET SDK **8.0.428** を
  `~/dotnet`（ユーザー領域のみ、システム領域の変更なし）へ導入した。
- 導入時の障害と対処：(1) 初回は /tmp（tmpfs 512MB）の容量不足で展開失敗。
  (2) TMPDIR をホーム側へ移しても、tar が所有権（uid 2001）の復元に失敗して
  展開が失敗した（`Cannot change ownership ... Operation not permitted`）。
  `TAR_OPTIONS="--no-same-owner"` を指定して再実行し、導入成功
  （`dotnet --list-sdks` で 8.0.428 を確認、容量 574MB）。
- C# の照合は2経路で実施した。(a) まず、同一の Roslyn（csc.dll）＋同一の
  参照パック（Microsoft.NETCore.App.Ref 8.0.34）＋ `dotnet new console`
  テンプレートと同一の暗黙 using 集合で直接コンパイルし、同一入力・同一
  合否条件で実行する方式で全59件を照合し、全件合格を確認した（`dotnet build`
  方式は MSBuild の起動がこの VM の CPU 制約下では1件あたり約20秒を要する
  ため、全件収集の高速化に用いた）。(b) 最終確認として native-audit.py 本体
  （`dotnet build` 方式を含む全範囲）を完走させ、結果を下記に記録した。

## 根本原因と処置

根本原因：`js/core/c-family.js` のリファレンス使用例ラッパーが、使用例を
`int main()` に包む際にインクルードを一律固定（C: `<stdio.h>`／C++:
`<iostream>`＋`<cstdio>`）し、C++ の std:: 修飾も cout／endl／printf のみで、
使用例が実際に必要とする前提（ヘッダーと名前空間修飾）を満たしていなかった。

処置（`js/core/c-family.js`、ラッパー部のみ）：

- C：使用例が bool／true／false を使う場合にだけ `#include <stdbool.h>` を追加。
- C++：`string` を `std::string` へ修飾する対象に追加し、使用例が
  `std::string` を使う場合にだけ `#include <string>` を追加。
- どちらの変更も、該当しない使用例の表示・挙動は一切変えない（追加は
  対象トークンを使う例に限定）。C++ `string` 項目の説明文はもともと
  「std::string 型の文字列です」と明記しており、修飾後の使用例と一致する。
  C `bool` 項目の説明文（「本来は <stdbool.h> の bool」）とも矛盾しない。

照合個票の同期：`docs/audit/reference-r2.json` の該当3行（c/bool、cpp/string、
cpp/getline）の `fields.example` を新しい定義文面に差し替え、sha256 を
fields の JSON（キーソート、UTF-8）から再計算して自己整合させた
（従来の sha256 は算出方式が再現不能だったため。差分は該当6行のみ）。

## 回帰テスト

`tests/muse-fix-ci.test.js` に静的検査2件を追加した（npm test 側で同じ
失敗クラスを捕まえるため）。

- C のテンプレート・リファレンス使用例で bool／true／false を使うものは
  `#include <stdbool.h>` を含むこと。
- C++ のテンプレート・リファレンス使用例に無修飾の `string` 宣言がないこと、
  および `std::string` を使うものは `#include <string>` を含むこと。

修正前の配信内容（deliver-stage）に対して両検査を適用し、失敗3件全てを
検出できることを確認した。`tests/native-audit.py` 自体には一切手を入れていない
（検査の弱体化なし）。

## 最終確認

- npm test：**2,054件全件合格**（従来2,052件＋新規2件。パス上限の実時間
  予算テストも含め全件合格）。
- native-audit.py（dotnet を含む全範囲）：**完走し exit 0**。要約出力は
  `{"checks": 298, "C_CPP_stdout_matches_simulator": true,
  "Csharp_native_execution": 59, "Csharp_expected": 59, "Csharp_skipped": 0,
  "Csharp_compiler_available": true, "python_execution": 161}` で、
  C# は全59件が実コンパイル・実実行され、スキップゼロ。末尾で実行される
  native-r3.py も `all_passed: true`（新規オラクル64件、C# 3/3 実行）。
  なお初回実行では、C++ `getline` の使用例（標準入力を読む）が、実行環境の
  開いたままの標準入力を継承して3秒の実行上限に達したため、CI と同じく
  標準入力を EOF（/dev/null）にして再実行した（スクリプト自体は無変更）。
- precache：再生成し `node scripts/precache.mjs --check` 通過。

## 変更ファイル（6件）

- `js/core/c-family.js`（ラッパーの是正）
- `docs/audit/reference-r2.json`（該当3行の文面・sha256 同期）
- `tests/muse-fix-ci.test.js`（回帰テスト2件追加）
- `precache.js`（再生成）
- `docs/audit/muse/consolidated-residual-register.md`（RG-143 追記）
- `docs/audit/MUSE-FIX-CI.md`（本報告書）

GitHub への書き込みは行っていない（是正配信は本線が実施）。
