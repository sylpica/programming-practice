# プログラミング練習 Muse 側第2ラウンド再監査（63e0bee）

- 実施：2026-11-14、Muse 側。対象リビジョンは `63e0bee` 固定（追加 pull なし）。コード修正・push なし（書き込みは本ファイルと work/ のプローブのみ）。
- 材料：integration-round1-draft.md（INT-01〜20）、fix-instruction-round2.md、Codex の CODEX-R2.md／REQUIREMENTS.md／REFERENCE-R2.md。
- 手法：npm test 実測、Node エンジン駆動（第1ラウンドと同一サンプルで再実行）、gcc／g++ 実コンパイラ、レジストリ実測、ローカル配信＋Playwright 実地（work/audit-r2-ui.mjs 26件、work/audit-r2-int17.mjs）。

## 1. テスト実測

| 項目 | 結果 |
| --- | --- |
| `npm test`（63e0bee、Muse 側実行） | **682件合格・失敗0**（約3.7秒）。Codex 申告「682件」と一致 |

## 2. INT-01〜INT-20 判定表

| ID | 判定 | Muse 側の確認内容 |
| --- | --- | --- |
| INT-01 | **修正済み** | `loadTemplate` から confirm 撤去（コード確認）。編集は種類別下書き＋freeDraft に保持され、「なし」選択で復元される実装（app.js の save()/changed()/loadTemplate）。Playwright で `window.confirm` を「呼ばれたら例外」にしたダイアログ禁止環境でも、未編集テンプレート間切替・カードボタン経路が動作し、編集マーカー入りのコードが別テンプレート経由で「なし」に戻すと復元された。pageerror 0件。残存注記：`window.confirm` は app.js に1件だけ残るが、それはファイル取込の上書き確認（importFile）であり INT-01 の対象経路（テンプレート読込）ではない（観察 R2-O1） |
| INT-02 | **修正済み** | 第1ラウンドと同一サンプルを再実行：R r-vectors の trace は「NA（欠損値）」、C/C++ のポインタは「モデル上の参照先 object-1・要素位置 0（実アドレスではありません）」と人間向け表示。Playwright の UI でも C c-pointer／C++ cpp-pointer／R r-vectors／C# 先頭テンプレートの trace・最終状態に `"kind":` を含む生 JSON は出なかった。ただし JavaScript の最終状態に同種の露出が残る（新規 R2-N2） |
| INT-03 | **修正済み** | JS `console.log("hi");` の trace は「処理を実行します（表示する戻り値はありません）」で「未設定」なし。Power Apps `Set(x, 1 + 2); Notify(Text(x))` に「null」なし。AutoHotkey ahk-hotkey の trace の「式を評価します：null」3件は 0件 |
| INT-04 | **修正済み** | レジストリから c-pointer 実物を取り出し `gcc -std=c11 -pedantic-errors` でコンパイル成功、実行出力 `99`（シミュレータ出力とも一致）。`#include <stdio.h>` 追加を確認 |
| INT-05 | **修正済み** | cpp-pointer を `g++ -std=c++17 -pedantic-errors` でコンパイル成功、実行出力 `99`。`#include <iostream>` と `std::cout`／`std::endl` を確認 |
| INT-06 | **修正済み** | `typeof 5`→"number"、`typeof (null)`→"object"、未宣言名の `typeof`→"undefined"（実物どおりエラーにしない）、TDZ の `typeof`→ReferenceError で停止 |
| INT-07 | **修正済み** | `char buf[6] = "hello"; printf("%s", buf)` → `hello`。要素代入 `buf[0] = 'h';` と `%c` → `h`。非 ASCII 初期化・文字列ポインタ初期化は DEVELOPMENT.md に未対応と明示された範囲 |
| INT-08 | **修正済み** | `int a = 10; int& r = a; r = 42;` → a が 42 になり出力 `42`（g++ の期待と一致） |
| INT-09 | **修正済み** | トップレベル Transform のオブジェクト形式（単体・リスト内とも）を受理しマクロが実行される。トップレベル params が空である挙動は AWS 公式（template-macros-author.html の params 説明「For macros included in the Transform template section, this section is empty」）と一致することを一次資料で確認。Fn::Transform の params 保持も同資料どおり |
| INT-10 | **修正済み** | `mean(c("a","b"))` が NA＋警告（実物の警告文 "argument is not numeric or logical: returning NA" を含む）で継続し、次の文（print）まで実行される |
| INT-11 | **修正済み** | C の `for (;;)` ＋break で出力 `3`（期待どおり）。軽微な観察：trace の「式を評価します：N」はインクリメント前の値を表示する（R2-O3） |
| INT-12 | **修正済み（限定範囲つき）** | `int n = sizeof(buf);` → 6、`sizeof(int)` → 4（代入形式で実測）。`printf("%d", sizeof(buf))` は size_t と %d の不一致を「未定義動作」として明示停止（実物の UB と整合）。ただし `(int)sizeof(...)` の慣用形はキャスト構文自体が未対応のため失敗する（新規 R2-N3） |
| INT-13 | **修正済み** | `s += "cd"` と `s = s + "cd"` の両方で `abcd`。`size()`／`length()` は未対応のまま明示停止（宣言済み STL 制限の範囲。観察 R2-O2） |
| INT-14 | **修正済み** | レジストリ実測：Filter の caution に委任条件・非委任時の既定500件／最大2,000件・ローカルモデルとの差が明記された（第1ラウンドは空） |
| INT-15 | **修正済み** | cout 項目の使用例が `#include <iostream>` と `std::cout` を含む完全なプログラムになり、`g++ -std=c++17 -pedantic-errors` でコンパイル成功・出力 `3`。syntax 欄は依然 `cout << n << endl;` の略記だが、これは記法の提示でありプログラムそのものではない |
| INT-16 | **修正済み** | tests/types.test.js は registry 駆動（`definitions.length > 0` と一意性のみ検証、13 のハードコードなし）。tests/browser-types.py にも固定件数なし。EXTENDING.md に「種類数は registry から取得し、固定件数の試験を書き換える必要はない」と明記 |
| INT-17 | **修正済み** | エンジン：未定義名・TDZ ともエラー分類が `ReferenceError`（第1ラウンドは NameError）。UI 露出も Playwright で確認：JS で `console.log(notDefinedName);` を実行すると trace に「ReferenceError：未定義の名前：notDefinedName」、最終状態の見出しにも「1行で停止：ReferenceError：…」と表示される |
| INT-18 | **修正済み** | EXTENDING.md に契約テストの数値基準そのものが明記された（テンプレート6件以上・基礎／実践／応用を各1件以上、リファレンス7件以上、一次資料1件以上） |
| INT-19 | **修正済み** | コード：changed() が「選択中テンプレートと内容が異なれば templateId を外し解説を消す」。Playwright 実地：テンプレート選択中は解説パネル表示 → エディタに1文字入力 → テンプレート選択が「なし」に戻り解説パネルが消えた |
| INT-20 | **部分修正** | 修正を確認：JS の同一行説明の重複は解消（各行1回のみ）、Python の「うそだった」等の表現は消滅（成立／不成立の表現に）、VBA の Date（実行日）と Now（実行日時）の説明は区別された。残存：VBA の未知条件ラベルに二重括弧が残る（新規 R2-N1） |

内訳：**修正済み 18件／限定範囲つき修正済み 1件（INT-12）／部分修正 1件（INT-20）／未修正 0件**。

## 3. 第1ラウンド未確認項目の Muse 側実地確認（Playwright、ローカル配信）

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| 375px 幅レイアウト | **合格** | 全13種類で document／body の scrollWidth = 375（横はみ出しなし）。練習画面内の可視要素に scrollWidth が clientWidth を超えるもの（文字の切れ・はみ出し候補）は検出されず。画面記録：work/r2-375-python.png |
| ファイル読込 | **合格** | Python で.py をファイル選択で取り込み、エディタに内容が反映。ドラッグ＆ドロップ（DataTransfer による drop イベント）でも同様に反映。両経路とも取込前に上書き確認ダイアログ（window.confirm）が出る（自動受理で確認）。ダイアログを抑制する環境では取込自体が完了しない点は観察 R2-O1 |
| オフライン再読込 | **合格** | Service Worker が有効化された状態でネットワークを遮断して再読込し、アプリが起動、Python テンプレートの実行シミュレーションと出力（小計360円・税込396円）まで動作した |

Playwright スイート全体は 26/26 PASS（INT-01／INT-19／INT-02 の UI 確認を含む）。

## 4. REFERENCE-R2.md spot-check（種類ごとに無作為2件、計26件）

方法：reference-r2.json（441件）からシード固定の乱数で種類ごとに2件を抽出し、各項目の説明・戻り値・注意点を一次資料（公式ドキュメント）と突き合わせた。**26件すべて一次資料と矛盾せず、Codex の「照合済」申告と異なる点は見つからなかった。**

内訳（種類：項目 → 照合した一次資料と要点）：
- vba：Cells（MicrosoftDocs VBA-Docs、Range を返し行列番号は1始まりで一致）／For（同 For...Next 資料、開始・終了・Step は開始時評価、終了値を含むことで一致）
- imagej：endsWith（公式 functions2.html「Returns true (1) if string ends with suffix」で一致）／isOpen（同、ID・タイトルで開いているか否かを返すことで一致）
- cloudformation：max／min（Python 公式ドキュメント。空イテラブルで ValueError・default の扱い、混在型で TypeError、文字列は辞書式順序で一致。CFN の Python ハンドラ項目として再利用されている点も REFERENCE-R2 の前文どおり）
- powerautomate：Write text to file（PAD 公式。追記／上書きの記述で一致）／End（同。ブロック・ループの終了アクションで一致）
- autohotkey：if（公式 v2 ドキュメントで一致）／WinExist（公式「returns the unique ID (HWND)... (or 0 if none)」、SetTitleMatchMode の既定2＝部分一致で、注意文とも一致）
- uivision：open（公式。URL を開くコマンドで一致）／click（同。要素をクリックで一致。モデル限定の注意はアプリ固有の範囲表示）
- powerapps：UpdateContext（Microsoft Learn「UpdateContext has no return value」、画面スコープの記述で一致）／CountRows（同。行数を返すことで一致）
- python：str.join（公式。非文字列要素で TypeError、sum() で文字列連結不可の注意まで一致）／try（同。裸の except への注意は公式の作法と矛盾しない）
- r：as.numeric（R 公式。変換不能は NA＋警告で一致）／cat（同。戻り値は不可視の NULL で一致）
- c：double（cppreference。浮動小数点型の記述で一致）／for（同。初期化・条件・更新の記述で一致）
- cpp：if（cppreference で一致）／for（同で一致）
- csharp：while（Microsoft Learn。条件成立中の繰り返しで一致）／if（同で一致）
- javascript：Number（MDN。数値変換・変換不能なら NaN で一致）／document.querySelector（MDN。最初に一致する Element、なければ null で一致。注意文はモデル範囲の明示）

## 5. 新規欠陥

### R2-N1（P3）VBA の未知条件ラベルに二重括弧と内部トークン "(model)" が残る
- 再現：Node エンジンで VBA テンプレート `if` を、モデルシート B2 = 未知値（`{kind:"unknown"}`）で実行。
- 実測：パス見出しが「条件が成立する場合：実行時に決まる（**実行時に決まる（model）** >= 80）」となり、第1ラウンドで指摘した二重括弧構造が形を変えて残っている。あわせて「score ← 実行時に決まる（model）」のように、学習者向け表示に内部トークン `(model)` が露出する。
- 期待：未知の条件は二重に包まず、内部表現を含まない文で示す（例：「条件：モデルシート B2 の値（実行時に決まる） >= 80」）。
- 備考：INT-20 の他項目（重複・文言・Date/Now）は修正済みのため、本件は INT-20 の部分修正の残存として切り出した。

### R2-N2（P3）JavaScript の最終状態にモデル DOM の生 JSON が露出する
- 再現：Playwright で JavaScript の任意コード（例：`console.log(notDefinedName);`）を実行し、「終わったときの状態」を表示。
- 実測：最終状態に `{ "name": { "id": "name", "tagName": "INPUT", "value": "学習者", "textContent": ""}, "result": {...}}` のような英字キーの生 JSON がそのまま表示される。R・C・C++・C# は INT-02 で人間向け整形に直ったが、JS の DOM モデル表示は同じ問題が残っている。
- 期待：他の種類と同様、DOM 要素も人間向けの要約表示（要素名・役割・値）にする。

### R2-N3（P3）C／C++ の型キャスト構文が未対応で、誤導的なエラーになる
- 再現（Node エンジン）：
- C `int n = (int)d;`（d は double）→ パスが停止しエラー「未定義の名前：int」（分類 NameError）。
- C `printf("%d", (int)sizeof(buf));` → 解析エラー「) が必要です」でパス 0 件（全体失敗）。
- C++ `static_cast<int>(d)` → 「未定義の名前：static_cast」で停止。
- 期待：キャストは C／C++ の基礎構文であり、対応するか、少なくとも「未対応」と明示して止める。現状は「名前が未定義」「括弧が足りない」という誤った原因表示で学習者を誤導する。
- 備考：DEVELOPMENT.md の対応範囲にもキャスト未対応の明記はない。INT-12（sizeof）の慣用形 `(int)sizeof(x)` がこの問題で失敗するため、INT-12 は「限定範囲つき修正済み」とした。

## 6. 観察事項（欠陥としない）

- R2-O1：ファイル取込（選択・ドロップの両経路）は取込前に `window.confirm` の上書き確認を出す。人間の利用では妥当な確認だが、ダイアログを抑制する環境では取込が完了しない。INT-01 の裁定範囲（テンプレート読込経路）とは別経路のため欠陥とはしない。
- R2-O2：C++ の `std::string::size()`／`length()` は未対応のまま明示停止する。DEVELOPMENT.md の「一般の文字列メソッドは未対応」と整合。
- R2-O3：INT-11 の `for(;;)` サンプルで、trace の「式を評価します：N」がインクリメント前の値を表示する（出力結果は正しい）。文言の細部。
- C# の実コンパイラ確認はローカルに SDK がなく未実施（Codex も同様に未実施と明記）。対象リビジョン 63e0bee 自体が CI 検出の C# 教材不整合への追補コミットであり、CI の再検証結果は本監査では独立確認していない。
- アイコン差し替えは本監査の対象外（別コミット予定）。Codex は取得不能で未反映と報告しており、その申告の真偽は判定していない。

## 7. 収束可否の見立て

- 本ラウンドの確認範囲では、**新規の P0〜P2 はゼロ**。INT-01〜INT-20 は未修正ゼロ（修正済み18、限定範囲つき1、部分修正1）。
- 残る実質事項は P3 のみ：R2-N1（INT-20 残存）、R2-N2（INT-02 同種の JS 版）、R2-N3（キャスト）。いずれも「明示的に止まる／表示の品質」の範囲で、誤った値を断定する類ではない。
- したがって、収束条件が「双方の監査で新規の実質欠陥（P0〜P2）ゼロ」であれば**収束は目前**であり、残る P3 3件をもう1節目で直すか、残件として記録して閉じるかは統合側の裁定事項。条件に P3 の残存解消まで含めるなら、もう1回の修正節目＋本3件の再確認が必要。
- 本見立てはローカル（63e0bee）に対するもの。公開サイト（GitHub Pages）での再監査、C# 教材の CI 再検証、アイコン反映は本監査の範囲外であり、収束宣言の前に別途確認が要る。
