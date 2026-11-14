# Codex 第3ラウンド：修正と全面再監査

対象の開始SHAは`636f8d0b21143312d2ff1f0ea48542be789e0f22`。Museの第2回再監査・裁定を受けたR2-N1〜N3とR2-O3を扱い、さらに全13種類・角度A〜F・新正本37項目で新規欠陥を探索した。第1回の独立記録を書き換えず、今回はMuse指摘を知った後の修正監査として区別する。

**新規指摘は12件（P0=0、P1=0、P2=11、P3=1）。全12件を本節目で修正・再検証した。** 別枠の指定P3 3件も修正した。修正後の実施範囲で追加の未修正P0〜P2は検出していないが、今回を「新規欠陥ゼロのラウンド」とは数えない。**二重監査の収束は未判定。Museによる本コミットの最終再監査・公開サイト確認を待つ。**

本書とPROGRESSを含むコミット自身が配信単位。自分自身のSHAを埋めるだけの追補コミットは作らない。SHAは`git log -1 --format=%H -- docs/audit/CODEX-R3.md`で取得できる。

## 引き継ぎ時の照合

- 開始時はmainを636f8d0まで同期し、作業ツリーに既存の未コミット変更がないことを確認。構成は共通UI／契約／解析器、registryと種類別モジュール、88教材、441リファレンス、オフライン資産、試験・監査文書。
- 開始時のNode試験は682件合格、失敗0。precache整合も確認。
- PROGRESSの「新アイコン未反映」「Muse再監査前」「63e0beeのCI未確定」は古い。実物はMuseの25e40db・07326b6・636f8d0でアイコン／theme_color／precache更新済み。63e0beeのActions run 43590621784もvalidate・Pages成功済み。Museの再監査結果は今回のユーザー指示として受領した。
- 指定されたアイコンは保持し、再取得・差し替えは行っていない。実PNGの寸法は180×180、192×192、512×512を確認。

## 指定された修正

| 項目 | 修正 | 検証方法・結果 |
| --- | --- | --- |
| R2-N1 / P3 | 共通の表示専用unknownLabelを追加。VBAの演算ツリーから由来・条件を再構成し、旧い接頭辞の入れ子と内部modelトークンを除去。「実行時に決まる：モデルで未指定の値 >= 80」の形にする。未知値の識別子・制約用データは変更しない。Python・共通表示も統一。 | 元のmodel未知セル、合成条件、旧形式の入れ子、変更前後の値データ同一性をNodeで確認。全88教材のtrace/終了状態を横断し、新しい65例でも露出を検査。VBA未知セルは両幅の実画面でも確認。 |
| R2-N2 / P3 | formatModelValueでモデルDOM・クラス・ポインタ・NA・画像等を人間向けに表示。DOMは「DOM要素 <p>」「テキスト: …」等とし、内部kindやtagNameの生JSONをtrace・最終状態へ出さない。通常データの配列表示、明示的JSON.stringify、CFNの断片JSONは保つ。 | DOM要素を変数へ代入・別名で更新・要素自体をconsole.logする経路を両幅で操作。全種類の教材の最終状態とtrace、循環・別名・入れ子モデルの表示を検査して合格。 |
| R2-N3 / P3 | C形式の基本単項キャストを追加。int/double/float/char/long/short、signed/unsignedの掲載形式とC++ bool。優先順位、入れ子、sizeof、整数昇格、unsignedの通常算術変換とmodulo、%uを扱う。 | 新しい代表例とキャスト回帰、GCC/G++で値・出力を独立確認。`(int)sizeof(a)`、`(double)7/2`、`(unsigned char)257`、unsignedの加減算／比較、sizeof内の副作用非評価を確認。未対応キャストは明示停止。 |
| R2-O3 | 後置++の式の値が変更前である点は仕様どおり。説明を「iを増やします（後置式の値は変更前の0）」へ変更し、更新の事実を併記。式を二度評価しない。 | C N1570 §6.5.2.4、C++ [expr.post.incr]。GCC/G++で`int i=0; int before=i++;`の表示が`0 1`となることを確認。モデルのforループも正しい合計で終了し、説明文をNodeで照合。 |

## 新規欠陥と裁定

修正前の実出力・エラー・traceは、元SHAを一時展開して再現し、[findings-r3.json](findings-r3.json)へ保存した。これを修正後の期待値の生成元にはしていない。各再現は初期モデルで実行し、AHKだけevent=nullとする。C/C++は両種類を回帰検証した。

| ID・重大度 | 種類・再現と修正前の問題 | 一次情報による裁定・修正 | 再検証 |
| --- | --- | --- | --- |
| R3-F1 / P2 | AHK `x := 1/0` がエラーにならずInfinityを保持する。 | 公式Variables「MulDiv」・ZeroDivisionError。0除算を位置つきZeroDivisionErrorにする。 | 通常式と`/=`をNodeで検査。実画面2幅でも原因表示を確認。 |
| R3-F2 / P2 | AHK `MsgBox "2"+"3"`が23、数値との混在は型不一致。非数値の単項マイナスもNaNになる。 | 公式Variablesの数値・演算子。数値文字列を数値へ変換し、非数値はTypeError。単項式・16進数値文字列も検証。 | 5、-3、17の独立期待値、非数値エラー。数値文字列加算は実画面でも5。 |
| R3-F3 / P2 | AHK `"Ab" != "ab"`がtrue。 | 公式Variables「equal」。!=はASCIIの大小文字を無視し、!==は区別する。両文字列の比較を修正。 | =/==の既存試験に加え、!=/!==の真偽と実画面の分岐を検証。 |
| R3-F4 / P2 | AHK `x := 7//2`をコメント扱いして7、`2^3`を冪扱いして8と断定。 | 公式Variables：//は整数除算、^は64ビットXOR。今回の部分集合では両方を明示的な未対応停止に変更。他言語の結果を流用しない。 | Nodeで未対応分類、UIで未対応の原因表示。DEVELOPMENTと画面の対応範囲にも明記。 |
| R3-F5 / P2 | C/C++ `char n=256; printf("%d",n);`が256。charを32ビットとして変換していた。 | N1570 §6.2.5、§6.3.1.3。8ビットモデルのcharは共通表現範囲0〜127だけ計算。符号や範囲に依存する変換は環境依存で停止。 | C/C++の代入・キャストで範囲外停止、ASCII範囲とsigned/unsigned charのキャストは実コンパイラと照合。 |
| R3-F6 / P2 | C/C++ `float n=1e100;`がInfinityを確定値として保持。浮動小数点→整数の範囲外も型範囲を判定する前に一律未確認だった。 | N1570 §6.3.1.4〜5、C++浮動小数点変換。表現範囲を確認して未定義動作を明示し、整数間の処理系依存変換と区別する。 | C/C++の暗黙／明示変換をNodeで検証。未定義動作例はネイティブ実行しない。 |
| R3-F7 / P2 | C/C++ `double x=2; double n=sizeof x/3;`が2.666667。sizeofの結果型をオペランドのdoubleとしていた。 | N1570 §6.5.3.4、C++ [expr.sizeof]：結果はsize_t。このモデルではLP64/ILP32に対応するunsigned型とし、整数除算の後にdoubleへ拡張する。 | モデルとGCC/G++の出力が2.000000で一致。実画面両幅でも一致。 |
| R3-F8 / P3 | C/C++ `int n=-(-2147483647-1);`は停止するが、「環境依存」と分類。 | N1570 §6.5、§6.5.3.3。符号付き単項マイナスの表現範囲外は未定義動作。演算箇所で分類して停止する。 | C/C++の分類をNode・UIで確認。値を実物の実行で推測しない。 |
| R3-F9 / P2 | UI.Vision times内の`echo ${!times}`が「変数がありません」で停止。 | 公式times：現在のtimesレベルの1始まりカウンター。専用counterNameをループ基盤へ渡し、入れ子から戻ると外側を復元。 | 1,2、内側1〜3／外側1〜2、break、continueを独立期待値で検証。両幅のUIでも1,2を表示。 |
| R3-F10 / P2 | C/C++/C# `float a=16777216; float b=1; double n=a+b;`が16777217。float演算を丸めずdoubleへ渡していた。 | N1570 §6.3.1.8、§6.5.6、C++通常算術変換。floatリテラルと演算をbinary32で丸めてから拡張する。C/C++の非有限のfloat演算結果は未確認停止。 | モデルとGCC/G++の出力が16777216.000000で一致。 |
| R3-F11 / P2 | AHK `MsgBox 9007199254740993`が9007199254740992。64ビット整数をJS Numberへ丸めて提示。 | 公式Variables「Integers and floating point」。このモデルの整数範囲を安全整数に限定し、リテラル・数値文字列・モデル変数・演算・++の範囲外を未確認停止。 | 境界リテラル、文字列変換、加算、インクリメントをNodeで確認。対応範囲を画面とDEVELOPMENTへ明記。 |
| R3-F12 / P2 | C# `class Box {public double D;} … b.D=2; b.D/=3;`が0。double配列要素の複合代入も同じ。 | [Microsoft compound assignment](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/arithmetic-operators#compound-assignment)：演算の型を求めてから左辺型へ変換する。メンバーの宣言型を解決し、未確定の型をintと決めつけない。 | フィールド／配列の2÷3とfloat拡張をNode・両幅UIで確認。ローカルSDKなし。CI用に実C#の新規3例を追加。 |

R3-F4は//や64ビットビット演算を実装済みにしたという意味ではない。正しい処理系の意味を確認したうえで明示的な未対応にした。R3-F5も特定実機のchar符号を仮定して値を返さない。仕様の独断裁定を要する保留項目は今回なし。

## A〜Fの実施範囲

| 角度 | 実施した範囲 | 限界・未実施 |
| --- | --- | --- |
| A 一次資料 | 全13種類で新しい5例の意味・関数・制御・エラーを一次資料から再導出。変換・sizeof・後置式、AHKの数値／比較、UI.Vision timesを重点照合。441リファレンスの文面は第2回レビュー個票と全件同一であることも機械確認し、380対応使用例を再実行。 | 全441項目を今回新たに全文読み直したという主張ではない。前回の全件一次照合を保持し、今回の照合重点を下表に明示。実Windows・Excel・ImageJ・R・Power Platform等の実機全面試験は行っていない。 |
| B ブラインド再導出 | 新規65件、各種類5件。分岐・繰り返し・エラー／未対応を含め、期待値をアプリ出力を見る前に固定した。未知分岐はパス数に加え全分岐の出力／CFN断片集合を照合。既存65例・全88教材の独立期待値も再実行。 | 指定N1〜N3の回帰を新しいブラインド件数へ加えない。AHKの1例は掲載範囲外のStrLenで、明示停止が正しいと裁定。 |
| C 実操作 | ローカルChromium、13種類×4画面×7状態×375/1440px＝728。加えて新規65入力×2幅＝130、今回の欠陥表示42、DOM表示2。正本操作26、全教材カード176、下書き26、R2表示24、既存VBA・種類別ブラウザ試験。 | 「全状態」は初期／入力後／実行後／エラー／パス切替／ファイル／オフラインの定義した7状態。任意の状態空間全部の証明ではない。公開サイト操作はユーザー裁定によりMuse担当。iOS実機・全OS/ブラウザは未実施。テーマ切替機能なし。 |
| D ファズ・敵対入力 | 別シード20261114、各種73件・計949件。64ランダム構文＋空／不正／深い入れ子／10万文字超／日本語・絵文字等＋種類別ループ。workerを隔離し親期限15秒。C/C++のキャスト・数値境界も追加回帰。VBA/CFNの2,000超過とUIの偽装拡張子・300KB超過を再確認。 | 有限のコーパス。期限超過・例外漏れ0は全入力の証明ではない。 |
| E オフライン/PWA | 全13種類の冷オフライン再訪・実行・画面移動、SW登録・制御とキャッシュ更新。manifest名とPNG寸法、生成precacheの整合を確認。 | iOSホーム画面への実機インストールは未実施。新デザインの描画を再制作せず、Muse反映分を保持。 |
| F 保存 | 破損・旧キー保持・移行・容量失敗等9ケース、実SW更新後の全13下書きとオフライン復元。confirm禁止環境で種類別自由下書きとテンプレート往復26ケース。 | 全破損形状・全ストレージ実装の網羅ではない。 |

## 種類別の新しい再導出と一次資料

「最初の文字列照合差分」は欠陥の件数とは別。期待値側の表記／適用範囲の補正を隠さない。

| 種類 | 新規サンプル | 最初の照合差分→裁定後 | 今回重点的に照合した一次資料 |
| --- | ---: | --- | --- |
| Excel VBA | 5 | 1→0。エラーは正しく出ており、期待regexの「未定義」を実文面「定義されていません」に修正。 | [Microsoft型変換](https://learn.microsoft.com/en-us/office/vba/language/concepts/getting-started/type-conversion-functions)、Option Explicit、For/Step、Range。 |
| ImageJ | 5 | 0→0 | [公式Built-in Macro Functions](https://imagej.net/ij/developer/macro/functions.html)：substringの終了位置非包含、newArray、getNumber、添字、ループ。 |
| CloudFormation | 5 | 0→0 | [公式Macros](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros.html)、Transformとevent/response、順序、ハンドラ。Pythonハンドラ1例もCPythonで独立実行。 |
| Power Automate | 5 | 0→0 | [Microsoft Desktop loops](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/loops)、variables、conditionals、file。製品エクスポート形式ではない学習用JSONとして検証。 |
| AutoHotkey v2 | 5 | 2→0。StrLenは非掲載・未対応なので停止を適合と裁定。0除算は実欠陥として修正。 | [公式v2 Variables](https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/Variables.htm)、[Loop](https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/lib/Loop.htm)、StrLen、Error。 |
| UI.Vision | 5 | 0→0。別の一次資料追跡で!timesの欠陥を検出。 | [公式times](https://ui.vision/rpa/docs/selenium-ide/times)、[echo](https://ui.vision/rpa/docs/selenium-ide/echo)、if、Classic Commands。 |
| Power Apps | 5 | 0→0 | [Microsoft Filter/LookUp](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-filter-lookup)、If、Sequence、Clear/Collect。委任注意も維持。 |
| Python | 5 | 0→0 | [CPython stdtypes](https://docs.python.org/3/library/stdtypes.html)、実CPython。負数の床除算、剰余、参照共有、global、独立入力、IndexError。 |
| R | 5 | 1→0。値24は一致。長さ1のベクトルをアプリのc(24)表記へ正規化。実Rコンソールの[1]接頭辞とのバイト一致を要求しない。 | [CRAN R Language Definition](https://cran.r-project.org/doc/manuals/r-release/R-lang.html)、base Control/meanの公式原本。 |
| C | 5 | 0→0。指定キャスト修正後の65件比較。別途、周辺の型・範囲不具合を検出。 | [N1570](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf) §6.3.1.3〜5/8、§6.5.2.4、§6.5.3.3〜4、§6.5.4/6、GCC C17。 |
| C++ | 5 | 0→0。同上。 | [cast notation](https://eel.is/c++draft/expr.cast)、[floating-integral](https://eel.is/c++draft/conv.fpint)、[sizeof](https://eel.is/c++draft/expr.sizeof)、[postfix](https://eel.is/c++draft/expr.post.incr)、G++ C++17。最新版の符号付き整数変換をC++17へ無条件に適用しない。 |
| C# | 5 | 0→0 | [Microsoft arithmetic operators](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/arithmetic-operators)、class/reference、array。新しい5例のネイティブ実行はローカル未実施。 |
| JavaScript | 5 | 0→0 | [ECMAScript](https://tc39.es/ecma262/)、[MDN getElementById](https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById)、Node実行。型強制・参照・TDZ・DOM。 |

新規65件の最初の機械的照合差分は4件。実欠陥1件、未対応範囲の裁定1件、エラー文regexとR表示の正規化2件だった。修正／裁定後は65件すべて一致。別途の境界・一次資料追跡で増えた欠陥も上の12件へ含めた。65件を「実物13処理系で全件実行済み」とは表現しない。

公式AHK Webホストは403だったため公式Docsリポジトリの原本を取得した。今回追加取得のURL・SHAは[primary-sources-r3.json](primary-sources-r3.json)。前回取得174ファイル・441項目の出典と文面は[REFERENCE-R2.md](REFERENCE-R2.md)、[primary-sources-r2.json](primary-sources-r2.json)を保持。全441件の現在の説明・戻り値・注意・例・出典がその個票に一致することをNodeで検査した。

## 実測結果と再実行

- `npm test`：**844件合格、失敗0**。新規65例・追加回帰・全441文面の同一性を含む。従来の65代表例、88教材、380対応使用例の期待値も変更せず合格。
- `python3 tests/native-audit.py`：既存教材・例81件。C/C++29件コンパイル、UB教材2件を実行せず、27件のstdoutがモデルと一致。Python52件構文検査、43件実行、外部依存等9件は実行しない。
- 同コマンドから`tests/native-r3.py`も実行：**新しい独立オラクル61件合格**（C24、C++24、Python8、JS4、CFNのPythonハンドラ1）。安全なC/C++例は実コンパイル・stdout照合。Pythonは入力4組とIndexError、JSはReferenceErrorも実確認。AWSへの接続・デプロイは行わない。
- ローカル環境：GCC/G++ 14.2.0、CPython 3.12.14、Node 24.22.1、Chromium 156.0.8078.79。ローカルdotnet SDKなし、C#ネイティブ実行は0。CIでは既存のC#全16教材・例に加え、今回のフィールド・配列・floatの新規3例を実ビルド／実行する。
- 実ブラウザ：728状態マトリクスで問題0、新しい代表入力130・欠陥表示42・DOM表示2、正本26・教材カード176・下書き26・R2表示24を合格。browser-typesは13種類・88教材・104表示と全13オフライン、browser.pyは16表示・200%・取込・パス連動・オフラインを合格。
- 保存9＋実SW更新後13下書き、ダミー14種類目（追加は新モジュール・registry・生成precache、コア変更0）を合格。
- ファズ949件：例外漏れ0、親期限超過0。上限時の通知・巨大ファイル拒否・不正拡張子等はNode／実ブラウザでも確認。
- `node scripts/precache.mjs --check`、`git diff --check`を最終確認する。静的サイトでビルド工程なし。全変更後にprecacheを再生成して配信する。

途中の失敗を成功へ混ぜていない。最初の65件比較の4差分は上記のとおり。キャスト導入時のsizeof(int)の曖昧性、共有C#の未確定型幅参照、追加UI試験のDOMタグ期待値と構文エラー表示位置、AHKの単項テストの呼び出し構文を検出・修正／正規化し、最終の全件へ再実行した。旧来の教材オラクルを今回の都合で変更していない。

## 要件・残件・収束・配信

新正本37項目の一対一表は[REQUIREMENTS.md](REQUIREMENTS.md)。**修正後の限定範囲で適合32／未確認5／不適合0**。未確認は2-4（任意コードの非捏造の全面性）、4-1（任意コードの全到達パス）、10-1〜3（他主体の実操作・最終監査・収束）。本ラウンドで欠陥を見つけた事実をこの修正後集計へ混ぜて消さない。

テンプレートは全13種類で必須のまま、VBA8、ImageJ10、Python10、残る10種類各6、計88。全て基礎・実践・応用を含み、カードから練習へコードを読み込む。リファレンスは441、対応例380／参照専用61。件数の種類別表はREQUIREMENTSに保持した。

残る対応範囲外はDEVELOPMENTに明記した。キャストのポインタ／修飾・独自型／long long等、unsigned変数宣言、AHKの//・64ビットビット演算・非掲載関数・安全整数外、times外の!timesなどを、実行できると称さない。一般のSTL、C# LINQ、外部実環境等の既存未対応も維持する。今回見つけたP3はF8も含めて対応済み。任意P3の積み残しとして実施しない項目は今回なし。iOS実機と公開サイト実操作は上記の未実施／担当範囲どおり。

モデル設定の切替は行っていない。GitHubへの書き込みは本節目の全ファイルをまとめた**git push 1回**のみを予定し、PR・マージ・付随書き込みなし（push-filesツール不在のためGitを使用）。配信前にActions／Pages成功を記録しない。**使った書き込みコール数は配信後の会話報告で実績を確定する。** PROGRESSを同梱し、CIの成否とPages結果・SHAを会話へ報告する。Museの最終再監査結果を受けるまで、収束済みとは宣言しない。
