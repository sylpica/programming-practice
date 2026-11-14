# 第1ラウンド 角度A（一次情報照合）所見

- 対象: sylpica/programming-practice、コミット bfa897f（2026-11-14 11:55 JST の節目コミット）
- 実施: 2026-11-14、Muse 側独立監査（Codex 側の指摘は参照していない）
- 位置づけ: 角度B（ブラインド解き直し＋ファズ、findings-round1-blind-fuzz.md）とローカル検証（findings-round1-local.md）とは独立した角度。本ファイルの新規欠陥は A-1、A-2 の2件。
- コード修正・push はしていない（書き込みコール0件）。

## 1. 抽出

- 抽出スクリプト: `work/extract-refs.mjs`、出力: `work/refs-extracted.json`
- 抽出方法: アプリのレジストリ経由でデータ定義を全件読み出し。項目形式は `js/core/data.js` の rows() ヘルパーによる [name, category, syntax, description, example, caution, supported]。C/C++/C# は `js/core/c-family.js` の単一リストを共用（後述 A-1 の原因箇所）。
- `supported` フラグは UI 上「シミュレーション対応」／「参照用 · 操作は未対応」のバッジとして表示される（js/app.js:296-297）。「その言語に属さない」という意味ではない点が A-1 の判断材料。
- 抽出件数: リファレンス **453件**（種類別内訳は下表）。これとは別に Python 用語集（glossary.js）**34件**がある。

| 種類 | 件数 | 主な照合方法 | 結果 |
|---|---|---|---|
| Excel VBA | 66 | 名称・構文の実在性は全件確認。説明文の数値的事実は知識ベースで照合 | 明らかな誤りなし（公式ページ文面照合は未実施＝未確認範囲参照） |
| ImageJ | 141 | 公式 Built-in Macro Functions の原文で要点項目を深掘り照合 | 照合した要点は全て一致。未確認の細部あり（§4） |
| CloudFormation | 49 | マクロ固有7件は AWS 公式で照合。残り42件は Python リファレンスの再利用 | 一致（status の大小区別なしも公式確認済み） |
| Power Automate | 14 | アクション名の実在性（Power Automate for Desktop） | 一致 |
| AutoHotkey | 17 | 公式ドキュメント v2 で照合 | 一致（WinActivate の TargetError は公式原文で確認） |
| UI.Vision RPA | 17 | コマンド名の実在性＋公式ドキュメント | 一致（type の意味論も公式表現で確認） |
| Power Apps | 23 | Power Fx 関数の実在性と説明 | 一致（Filter の委任注意なしは角度Bで P3 記録済み、相互参照） |
| Python | 42 | **実物 CPython 3.12.3 で使用例を全件実行** | 一致 41件、未確認 1件（input()） |
| R | 23 | 説明文を知識ベースで照合 | 大筋一致。使用例の実行確認は未実施（§4） |
| C | 13 | cppreference 等と照合 | **不一致 A-1（混入5件）** |
| C++ | 13 | 同上 | **不一致 A-1（混入3件）＋ A-2** |
| C# | 13 | Microsoft Learn と照合 | **不一致 A-1（混入2件）** |
| JavaScript | 22 | 説明照合＋要点を Node で実測 | 一致 |
| Python 用語集 | 34 | 冒頭数件のみ精査 | 残りは未確認（§4） |

## 2. 不一致の詳細

### A-1（P2）: C/C++/C# リファレンスが単一リストを共用し、他言語の項目が混入している

- 場所: `js/core/c-family.js` の共用13項目リスト（int／double／array／pointer／if／for／while／printf／cout／Console.WriteLine／Console.ReadLine／class／checked）が、C・C++・C# の3言語すべてにそのまま表示される。
- 混入の内訳（延べ10項目）:
  - **C に表示される他言語項目（5件）**: `cout`（C++）、`Console.WriteLine`（C#/.NET）、`Console.ReadLine`（C#/.NET）、`class`（C にクラスキーワードは存在しない）、`checked`（C#）
  - **C++ に表示される他言語項目（3件）**: `Console.WriteLine`、`Console.ReadLine`、`checked`（いずれも C#/.NET）
  - **C# に表示される他言語項目（2件）**: `printf`（C/C++）、`cout`（C++）
- 緩和事情と、それでも P2 とする理由: 混入項目はいずれも supported=false で「参照用 · 操作は未対応」バッジが付く。しかしこのバッジの意味は「アプリのシミュレーションが未対応」であって「別言語の項目」ではない。説明文も他言語の所有物と明示せず肯定形で述べる（例: C の画面で Console.WriteLine に「標準出力に値と改行を出します。」、使用例 `Console.WriteLine(total);`）。学習者が「C にも Console.WriteLine がある」と誤認しうる。要件 R11（リファレンス各項目が一次情報と一致）違反として P2。
- 一次情報の根拠:
  - `cout` は C++ 標準ライブラリのオブジェクト `std::cout`（ヘッダ `<iostream>` で定義）であり、C には存在しない。cppreference「std::cout, std::wcout」: https://www.cs.helsinki.fi/group/boi2016/doc/cppreference/reference/en.cppreference.com/w/cpp/io/cout.html （cppreference ミラー）
  - `Console.WriteLine` / `Console.ReadLine` は .NET の System.Console のメソッド。Microsoft Learn「Console.WriteLine Method (System)」: https://learn.microsoft.com/en-us/dotnet/api/system.console.writeline
  - `checked` は C# のオーバーフロー検査文脈キーワードであり、C/C++ には存在しない（Microsoft Learn C# リファレンス）。
  - `printf` は C の標準ライブラリ関数（`<stdio.h>`）であり、C# には存在しない。
- 付随観察: C# の `pointer` 項目は構文が C 式だが、注意書きに「C#のunsafeポインタは未対応です」と明記があり部分的に正直な扱い。不一致には数えない。

### A-2（P3）: C++ リファレンスの cout 項目の構文・使用例に std:: がない

- 場所: 共用リストの `cout` 項目。syntax・example ともに `cout << n << endl;` で、`#include <iostream>`、`std::`、`using namespace std;` のいずれも示されていない。そのまま実コンパイラに渡しても通らない。
- 根拠: cppreference の cout は `std::cout` として定義され、使用例も `std::cout` を用いる（上記 A-1 の URL）。
- 備考: findings-round1-local.md で記録した C++ テンプレート cpp-pointer の `#include <iostream>`／`std::` 欠落（P2）と同族の問題だが、こちらはリファレンス表示側のため P3 として別件記録し相互参照する。

## 3. 一致を確認した主な要点（一次情報の原文・実物で確認したもの）

- **Python（実物 CPython 3.12.3 で全42件の使用例を実行）**: 41件が expected と完全一致。round の銀行丸め、isinstance(True, int) が True、dict.get の引数が位置専用である等の急所も正しい。open の注意書き「3.15から既定はUTF-8」は PEP 686 と整合。input() のみ対話入力待ちで実行が完了せず（expected の記録はあるが実行確認は未実施＝未確認）。
- **JavaScript**: Math.round は同点で正の無限大側に丸める（Math.round(-1.5) = -1 を Node で実測）、Math.floor は負の無限大方向、push は新しい長さを返す、getElementById は不在時 null、等の説明が実物意味論と一致。使用例の多くは未定義変数を参照する断片で、単独実行の対象にはならない。
- **ImageJ（公式 Built-in Macro Functions 原文で照合、https://wsr.imagej.net/backup/functions/temp/functions.html ＝ imagej.net 公式 functions.html のミラー、2026-11-14 閲覧）**:
  - d2s: decimalPlaces が負なら指数表記を用いる ✓
  - getThreshold: 閾値未設定時は両変数が -1 ✓
  - getPixel: 非整数座標では双線形補間 ✓
  - getSelectionBounds: 選択なしでは (0, 0, 画像幅, 画像高さ) ✓
  - selectionType のコード表（矩形0〜点10、選択なし -1）✓
  - setThreshold の第3引数に "raw" が有効 ✓（公式列挙: "red", "black & white", "over/under", "no color", "raw"）
  - setBatchMode(false): アクティブ画像を除く隠れた画像を破棄する ✓
  - replace: old/new が1文字ならリテラル、2文字以上なら正規表現として扱う ✓
  - split: 区切り文字の重なりは1つにまとめられ、空文字列を避けるには ",," のように重ねる ✓
  - random: 公式の見出し自体が括弧なしの `random` で、0以上1未満の一様分布 ✓（アプリの構文表記と一致）
  - Array.sort: 文字列ソートは大文字小文字を区別しない（v1.44i 以降）✓
- **CloudFormation**: マクロ応答の `status` について「success（大文字小文字を区別しない）以外は失敗」は AWS 公式ドキュメントの記載どおり ✓ 根拠: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html （"The status of the request (case-insensitive). Should be set to `success`."）。先頭7件（Transform、Fn::Transform、fragment、params、requestId、status、templateParameterValues）がマクロ固有項目、残り42件は Python リファレンスの再利用で、マクロハンドラの言語が Python であることと整合する設計。
- **AutoHotkey**: WinActivate は対象ウィンドウが見つからなければ v2 で TargetError を投げる（公式 https://www.autohotkey.com/docs/v2/lib/WinActivate.htm ）✓。既定のタイトル一致モード2＝部分一致、InputBox の戻り値が .Value を持つオブジェクト、Send と SendText の区別も公式と整合。
- **UI.Vision RPA**: コマンド名は全て実在。`type` の説明「入力要素の値を置き換えます」は、公式の表現「set an input/textarea value」（UI.Vision 公式 AI システムプロンプト https://ui.vision/ai/ai-system-prompt ）と整合し、追記型の sendKeys と区別される意味論として正しい。
- **Power Automate**: アクション名は Power Automate for Desktop の実在名称と一致。JSON 形式が製品形式ではなく学習用モデルである旨を全項目の注意書きで明示しており、一次情報との齟齬を学習者が誤認しない扱いになっている。
- **Excel VBA**: エラー番号（6=オーバーフロー、9=インデックスの範囲外、13=型の不一致、91=オブジェクト変数未設定、94=Null の無効使用）、CInt の偶数丸め、Int(-1.5) = -2／Fix(-1.5) = -1、`Dim a, b As Long` で a が Variant になる、Boolean の True = -1、等の急所が正確（知識ベース照合。公式ページ文面照合の扱いは §4）。

## 4. 未確認の範囲（正直な明記）

- **Excel VBA（66件）**: 名称・構文の実在性確認と説明文の知識ベース照合までで、Microsoft Learn VBA 言語リファレンスの各ページ文面との個別照合は未実施。使用例の実行確認は VBA 実行環境がないため不可。Row/Column/Count の注意書きにある「結果は3です」等の記述はアプリの実行モデル依存の値であり、一次情報との矛盾ではないため不一致には数えていない。
- **R（23件）**: R ランタイム未導入のため使用例の実行確認は未実施。説明文は知識ベース照合で大筋一致。c() の型強制階層「logical → numeric → character」は integer/double の区別と complex を省いた単純化だが、CRAN 公式マニュアル原文での照合が未了のため正式な不一致とはせず、要追加確認の観察事項とする。mean（文字列ベクトル）の扱いの差異は角度Bで P3 記録済み（相互参照、本ファイルでは重複計上しない）。
- **ImageJ の細部（141件中）**: 次の主張は公式 functions.html に明記がなく未確認。getPixel の範囲外座標で 0 を返す、newArray の「1.53g 以降は自動拡張」、showStatus の "!" 接頭辞の扱い、getLine で直線がない場合 x1 = -1。d2s(5.5, 0) が "6" になる丸め方式も公式ページに明記がなく未確認（ただし矛盾は見当たらない）。これら以外の項目は名称・構文の実在性確認レベルであり、全141件の説明文を原文と逐語照合したわけではない。
- **Python 用語集（34件）**: 冒頭数件（変数＝オブジェクトへの参照に付けた名前、等）は正確であることを確認したが、全件の精査は未完。
- **JavaScript の使用例**: 説明文は照合済みだが、使用例は未定義変数を含む断片が多く、実物実行による検証は要点（Math.round 等）に限る。

## 5. まとめ

- 照合対象: リファレンス 453件（全件抽出・実在性確認済み）＋ Python 用語集34件（部分）。
- 角度Aの新規不一致: **2件**（P2×1: A-1＝C ファミリー混入、延べ10項目／P3×1: A-2＝C++ リファレンス cout の std:: 欠落）。
- 実物実行で確認できた範囲: Python 41/42件が完全一致。ImageJ・CloudFormation・AutoHotkey・UI.Vision の深掘り項目は公式原文と一致。
- 未確認は §4 の範囲（VBA の公式文面照合、R の実行確認、ImageJ の細部4点＋逐語照合範囲、用語集の残り）に残る。
