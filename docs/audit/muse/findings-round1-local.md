# プログラミング練習 Muse側独立監査 第1ラウンド（ローカル実施分）結果

- 実施日：2026-11-14
- 対象：sylpica/programming-practice、最新コミット `bfa897f`（"Expand programming practice to 13 modular languages and tools with persistent progress"）。クローンして実物で検証した。
- 独立性：Codex 側の監査指摘は一切見ていない。本書は Muse 側の単独作業結果。
- 本ラウンドの実施範囲：テスト実測、R31 grep、角度Eの静的確認、R01/R02 の構造確認、角度Bの下準備（ブラインド再導出の期待値確定。アプリ出力との突き合わせは未実施＝次段）、角度Dの下準備（投入サンプル作成。アプリへの投入は未実施）。
- コード修正・push はしていない（監査専任）。使った書き込みコール数：0件（ローカルファイル作成のみ）。

## 1. 実測した検証と結果

### 1.1 テスト実行（実測）
- コマンド：`npm test`（package.json の指定どおり `node --test tests/*.test.js`）
- 結果：**68件中 68件合格、失敗0、スキップ0**（所要 2,703ms）
- PROGRESS.md の申告「Nodeテスト：68件合格」と**一致**。

### 1.2 precache 整合（角度E・静的確認分）
- コマンド：`node scripts/precache.mjs --check` → **exit 0**（スクリプトは precache.js を再生成してバイト比較し、不一致なら exit 1 になる実装であることをコードで確認済み。空振りのチェックではない）
- precache.js の資産一覧：44エントリ。全 js/ 配下と icons/ 配下を走査して生成される構造で、実在しないファイルへの参照はなし（"./" はルートの仮想エントリ）。
- sw.js：`importScripts("./precache.js")` で一覧を読み、install で全資産をキャッシュ、activate で旧キャッシュ（`programming-practice-` および旧 `vba-practice-` 接頭辞）を削除、fetch は同一オリジン GET のみキャッシュ優先。登録コードは js/app.js:742-745 にあり。

### 1.3 R31：旧名・旧URLの残存（grep 実測）
- index.html / manifest.webmanifest / README.md / style.css に「VBA練習」「マクロ練習」の文字列は**なし**。旧URL（/VBA/、/macro/）も**なし**。
- リポジトリ全体で旧名が残るのは **PROGRESS.md のみ**（改名の経緯を記した開発文書であり、アプリの画面・公開物の文言ではないため欠陥とはしない。観察事項として記録）。
- index.html の `<title>` は「プログラミング練習」。

### 1.4 角度E：manifest とアイコン（実測）
- manifest.webmanifest：`name` / `short_name` ともに「プログラミング練習」。
- icons/apple-touch-icon.png：**実物 PNG、180×180**（`file` コマンドで実測）。index.html から `<link rel="apple-touch-icon">` で参照されている。icon-192.png（192×192）、icon-512.png（512×512）も実物 PNG で寸法一致。

### 1.5 R01/R02：構造確認（コードリーディング）
- R01：`js/types/registry.js` に13種類すべての定義 import と配列があり、起動時に `validateDefinition` で必須キー（id / name / extensions / syntax / reference / templates / semantics / model / scan / simulate）の存在と id 重複を検証する構造。定義の実数も実測した（下記テンプレート一覧）。
- R02：保存は localStorage 単一キー `programming-practice-v3` に `{active, drafts}` を保存し、下書きは `drafts[種類id]` に種類別に保持（code / templateId / auto / sort / pathId / model / modelText を種類ごとに格納）。旧キー `macro-practice-v2` と `vba-practice-v1` からの移行コードあり。破損データは `programming-practice-recovery-v3` へ生テキストを退避し、上書きを止めて通知する実装（js/app.js:11-55、147-155）。**構造上は要件を満たす。実際の復元動作の確認は角度F（次段・ブラウザ）で実施する。**
- 上限値（R07/R12 の構造確認）：`js/core/contract.js` の LIMITS に paths: 2000、operations: 100000、steps: 600、iterations: 100、milliseconds: 1200 が定数として存在。ImageJ エンジン側にも MAXP=2000 等の独自上限あり。

### 1.6 テンプレート総数（実測）
registry から実測：VBA 8、ImageJ 10、CloudFormation 3、Power Automate 3、AutoHotkey 3、UI.Vision 3、Power Apps 3、Python 10、R 3、C 3、C++ 3、C# 3、JavaScript 3 ＝ **合計58件**。PROGRESS.md の申告「全58テンプレート」と一致。全テンプレートのコード実物は `~/workspace/programming-practice-audit/templates-dump.txt` に抽出済み。

## 2. 見つけた欠陥

### 欠陥1（P2）C++ テンプレート「cpp-pointer」が実物の C++ としてコンパイルできない
- 該当：js/types/cpp/index.js のテンプレート [cpp-pointer]「ポインタと配列の更新」
- 内容：`#include <iostream>` がなく、`cout` / `endl` も `std::` なしで使われている。兄弟テンプレート [cpp-array] は `#include <iostream>` と `std::cout` を正しく書いており、表記が不統一。
- 再現（実測）：テンプレートのコードそのままを `g++ -std=c++17 -pedantic-errors` でコンパイルすると `error: 'cout' was not declared in this scope` で失敗する（本監査で実測）。
- 根拠：R10「テンプレートを挿入すると、そのまま説明・シミュレーションにかけられる正しいコードになる」。シミュレータ内では動いても、学習者が実コンパイラへ持ち込めないコードを雛形として出すのは教材として不正確（R23 にも関連）。
- 期待される修正：`#include <iostream>` の追加と `std::cout` / `std::endl` への統一（[cpp-array] と同じ流儀）。

### 欠陥2（P2）C テンプレート「c-pointer」が printf の宣言なしで使われている
- 該当：js/types/c/index.js のテンプレート [c-pointer]「ポインタと配列の更新」
- 内容：`#include <stdio.h>` がないまま `printf` を呼んでいる。兄弟テンプレート [c-array] は `#include <stdio.h>` を書いており不統一。
- 再現（実測）：テンプレートのコードそのままを `gcc -std=c11 -pedantic-errors` でコンパイルすると `error: implicit declaration of function 'printf'` で失敗する（本監査で実測）。C99 以降、暗黙の関数宣言は規格違反であり、現在の標準的なコンパイラではエラーになる。
- 根拠：R10、R22。根拠資料は cppreference（C リファレンス：printf は <stdio.h> で宣言される）。
- 期待される修正：`#include <stdio.h>` の追加。

※ 両欠陥とも「アプリのシミュレーション結果」ではなく「テンプレート＝教材コードの正確さ」の問題。次段のブラインド突き合わせでは、アプリ側シミュレータの期待結果は「values[1] が 99 になること」として別途照合する。

## 3. 角度B 下準備：ブラインド再導出の期待結果表

方法：アプリの出力（説明・シミュレーション結果・パス列挙）を一切見ずに、各言語の公式仕様から期待結果を導出した。Python / JavaScript / C / C++ はこのマシンの実物インタプリタ・コンパイラ（Python 3.12.3、Node v24.22.1、gcc/g++ 13.3）で実行して期待値を確定した。R と C# は実物がないため公式ドキュメント（CRAN『An Introduction to R』、Microsoft Learn）の意味論から導出（その旨を明記）。モデル依存のサンプル（セル値・入力・モデルページの内容で結果が変わるもの）は「モデル条件 → 期待結果」の形で分岐ごとに記録した。**アプリ出力との突き合わせは本書では行っていない（次段で機械的に照合する）。**

### 3.1 Excel VBA（根拠：Microsoft Learn VBA 言語リファレンス）
| # | サンプル | 種別 | 期待結果 |
|---|---------|------|---------|
| V1 | [cells] | 基礎 | A1=100（Long）、B1="りんご"。Debug.Print の出力は `100` |
| V2 | [if] | 分岐 | B2 の値で3分岐：≧80→C2="合格"、60〜79→"再挑戦"、<60→"復習しよう"（パスは3本） |
| V3 | [for] | ループ | total=1+2+3+4+5=15。A5=15、MsgBox に 15 |
| V4 | [array] | エラー | Option Base 1 のため LBound=1、UBound=3。items(4) は「添字が範囲を超えています」（エラー9）。On Error Resume Next により実行継続し、Debug.Print Err.Number は `9` |
| V5 | [text] | 基礎 | Trim→"excel vba"、UCase→"EXCEL VBA" が A1 へ。Len=9、Left(…,5)="EXCEL" |
| V6 | [do] | ループ | Debug.Print に 1、2、3 の順で出力（Do While n<3） |
| V7 | [input] | 分岐 | Select Case で3分岐："はい"→MsgBox「開始します」、"いいえ"→「終了します」、その他→「入力を確認してください」（パス3本） |

### 3.2 ImageJマクロ（根拠：公式 Built-in Macro Functions）
| # | サンプル | 種別 | 期待結果 |
|---|---------|------|---------|
| I1 | [ij-0] | 基礎 | Log 出力：`a + b = 7`、`a / b = 0.75`（マクロ言語の / は実数除算）、`sample.tif` |
| I2 | [ij-1] | 分岐＋ループ | 1 は奇数／2 は偶数／3 は奇数／4 は偶数／5 は奇数（% は剰余） |
| I3 | [ij-2] | ループ | 合計 = 47、平均 = 11.75（47/4） |
| I4 | [ij-3] | 関数 | circleArea(r)=π·r²。r=1→π、r=2→4π、r=3→9π（表示桁は ImageJ の数値書式に従う） |
| I5 | [ij-4] | 分岐 | 画像が開いていないモデル（nImages=0）では `画像が開かれていません` のみ。開いている場合はタイトル・幅・高さ・スライス数・ビット深度を出力 |
| I6 | 独自：配列の範囲外 | エラー | `a = newArray(3); print(a[3]);` は実行時エラーとなりマクロが中止する（範囲外インデックスは値を返さない） |

### 3.3 AWS CloudFormation Macros（根拠：AWS 公式ドキュメント）
| # | サンプル | 種別 | 期待結果 |
|---|---------|------|---------|
| C1 | [cfn-transform] | 変換 | テンプレート全体が断片としてマクロへ渡る。対になるハンドラの意味論では Metadata が付与された断片が返り、Transform キー自体は展開後に残らない |
| C2 | [cfn-local] | 変換 | Fn::Transform は Properties 内のその要素だけを変換対象とし、Parameters の Stage="test" がマクロへ渡る。BucketName="practice-bucket" は無関係に保持 |
| C3 | [cfn-handler] | 関数 | event.fragment に Metadata={"Stage": params.Stage（無ければ "dev"）} を追加し、`{"requestId": event.requestId, "status": "success", "fragment": …}` を返す |
| C4 | 独自：失敗応答 | エラー | ハンドラが status="failure"（または例外）を返すと、そのマクロ展開は失敗しスタック操作が失敗する（成功した断片は返らない） |
| C5 | 独自：Transform＋Parameters（テンプレート全体） | 変換 | トップレベル Transform に Parameters を付けると、断片＝テンプレート全体と共にパラメータがマクロへ渡る。Fn::Transform の局所変換とは対象範囲が異なる |

### 3.4 Power Automate（根拠：Microsoft Learn のデスクトップフローアクション。対象は Desktop の学習用表現という前提）
| # | サンプル | 種別 | 期待結果 |
|---|---------|------|---------|
| P1 | [pa-counter] | ループ | Count は 0→3回繰り返しで 3。表示メッセージは `合計 3`（%Count% が値に置換される） |
| P2 | [pa-branch] | 分岐 | Answer="はい"→ファイル C:/model/result.txt に「完了」を書き、メール送信（モデル）。それ以外→Else 側で `終了` を表示し、ファイル・メールは実行されない（パス2本） |
| P3 | [pa-files] | ループ | For each で A、B、C の順に append=true で追記されるため、ファイルの最終内容は A、B、C の順の3件 |
| P4 | 独自：空リストの For each | ループ | リストが空なら本体は0回実行され、後続処理へそのまま進む（エラーにならない） |
| P5 | 独自：If の入れ子 | 分岐 | 外側条件が偽なら内側の条件・アクションは一切評価・実行されない |

### 3.5 AutoHotkey v2（根拠：公式ドキュメント v2）
| # | サンプル | 種別 | 期待結果 |
|---|---------|------|---------|
| A1 | [ahk-hotkey] | イベント | Ctrl+Alt+N で「メモ帳」を含むタイトルのウィンドウをアクティブ化し、SendText で `こんにちは` を文字どおり入力、続けて Enter キーを送る |
| A2 | [ahk-hotstring] | イベント | `btw` と入力し終了文字を打つと `by the way` に置換される |
| A3 | [ahk-loop] | 分岐＋ループ | InputBox の .Value が "はい"→SendText "A" が2回（結果として "AA"）。それ以外→MsgBox `終了`。`=` は v2 の式内では等値比較で、文字列比較は大文字小文字を区別しない |
| A4 | 独自：式と連結 | 基礎 | `x := 1 + 2 * 3` は x=7（演算子優先順位）。文字列連結は `.` 演算子で行う |
| A5 | 独自：未代入変数の参照 | エラー | v2 では代入されていない変数を式で参照すると実行時エラーになる（v1 の「空文字列として扱う」とは異なる） |

### 3.6 UI.Vision RPA（根拠：公式コマンドリファレンス）
| # | サンプル | 種別 | 期待結果 |
|---|---------|------|---------|
| U1 | [ui-form] | 基礎 | open でモデルページを開き、type で id=name に「学習者」を入力（type は既存値を置き換える）、click で id=submit をクリック、storeText で id=result のテキストを変数 Result に格納、echo で ${Result} を出力 |
| U2 | [ui-loop] | ループ | count=0 で開始し while (${count} < 3) の間、type で 0、1、2 を順に入力、executeScript_Sandbox で count を+1。ループ終了後の echo は `3`、入力欄の最終値は "2" |
| U3 | [ui-runtime] | 分岐 | storeText で取得した Remote が "OK" のときだけ type「成功」を実行。それ以外は else 側の echo のみ（設計時には決まらない実行時分岐。パス2本） |
| U4 | 独自：存在しない要素への click | エラー | 要素が見つからなければエラーとなり、マクロは（エラー処理を書いていない限り）停止する。成功したことにはならない |
| U5 | 独自：store と echo | 基礎 | `store | 42 | answer` の後 `echo | ${answer}` は `42` を出力する（store の Target が値、Value が変数名） |

### 3.7 Power Apps / Power Fx（根拠：Microsoft Learn Power Fx 関数リファレンス）
| # | サンプル | 種別 | 期待結果 |
|---|---------|------|---------|
| F1 | [fx-state] | 分岐 | Count=Value(Input1.Text)。Count≧3→Status="十分"、それ未満→"追加しよう"。Notify は Status を表示。If は選ばれた分岐だけを評価する（遅延評価） |
| F2 | [fx-table] | テーブル | Sequence(3) は 1,2,3。ForAll で Items={Number:1,Square:1},{2,4},{3,9}。Sum(Items, Square)=14。Notify は "14" |
| F3 | [fx-record] | 作成 | Patch(Orders, Defaults(Orders), {…}) は Orders に新規レコードを作成（{Name: Input1.Text, Done: false}）。UpdateContext で Saved=true。Navigate(Detail) で画面遷移 |
| F4 | 独自：値の変換 | 基礎 | Value("42") + 8 = 50。文字列連結 `"a" & 1` は "a1"（数値は自動で文字列化） |
| F5 | 独自：Filter の委任 | 注意 | Filter はデータソース側で処理される委任可能な関数だが、大規模データでは委任警告と取得上限（既定500件）の影響を受ける。「全件取れる」と断定してはいけない |

### 3.8 Python（根拠：実物 CPython 3.12.3 で実行して確定）
| # | サンプル | 種別 | 期待結果（実測） |
|---|---------|------|---------|
| Y1 | [tpl-calc] | 基礎 | `小計: 360円`、`税込: 396円` |
| Y2 | [tpl-branch] | 分岐 | `72点は B 判定です` |
| Y3 | [tpl-list-loop] | ループ | `合計: 108`、`最大: 42`、`2倍: [8, 16, 30, 32, 46, 84]` |
| Y4 | [tpl-try] | エラー | divide(10,2)=`5.0`、divide(10,0)=`ゼロでは割れません`（ZeroDivisionError を捕捉） |
| Y5 | 独自：急所セット | 急所 | round(2.5)=2、round(3.5)=4、round(0.5)=0（銀行丸め）。可変デフォルト引数：add(1)→[1] の後 add(2)→[1, 2]（リストが共有される）。print("a", end="") の後に print("b") で `ab`。0.1+0.2=0.30000000000000004 |
| Y6 | [tpl-dict-count] | ループ | 出現順に tea 3、coffee 2、juice 1 を出力（辞書は挿入順を保持） |

### 3.9 R（根拠：CRAN『An Introduction to R』『R Language Definition』の意味論。実物 R はこのマシンに無いため未実行）
| # | サンプル | 種別 | 期待結果 |
|---|---------|------|---------|
| R1 | [r-vectors] | NA | mean(c(10,20,NA,40)) は NA。mean(…, na.rm=TRUE) は 70/3 ≒ 23.33333。x*2 は 20 40 NA 80。is.na(x) は FALSE FALSE TRUE FALSE |
| R2 | [r-frame] | データフレーム | df$bonus は 55 85 100。mean(df$bonus)=80。df[1, ] は name="A", score=50, bonus=55 の1行 |
| R3 | [r-loop] | 分岐＋ループ | total=15。total>10 なので `大きい` と 15 を出力 |
| R4 | 独自：リサイクルと添字 | 基礎 | c(1,2,3,4)+c(10,20) は 11 22 13 24（短い側が繰り返される）。添字は1始まりで、x[0] は空のベクトル、x[-1] は先頭を除いた残り |
| R5 | 独自：NA の代数とエラー | エラー | NA + 1 は NA、NA == NA は NA（TRUE ではない）。文字ベクトルの mean() は NA を返し警告を出す |

### 3.10 C（根拠：ISO C の意味論。定義される範囲は gcc 13.3 -std=c11 で実測）
| # | サンプル | 種別 | 期待結果 |
|---|---------|------|---------|
| N1 | [c-array] | ループ | 出力 `6`（実測） |
| N2 | [c-pointer] | ポインタ | values[1] が 99 になり、出力は `99`（実測。ただしテンプレート自体のヘッダ欠落は欠陥2を参照） |
| N3 | [c-error] | エラー（未定義動作） | values[2] の読み出しは配列の範囲外で**未定義動作**。結果の値を断定してはいけない。「未定義動作のため停止／明示」が正しい扱い |
| N4 | 独自：整数除算 | 基礎 | -7/2 = -3、-7%2 = -1、7/2 = 3（0方向への切り捨て。実測） |
| N5 | 独自：文字列と sizeof | 基礎 | char buf[6]="hello" の sizeof は 6（終端の '\0' を含む）。出力は buf の内容 "hello"（実測） |

### 3.11 C++（根拠：cppreference。定義される範囲は g++ 13.3 -std=c++17 で実測）
| # | サンプル | 種別 | 期待結果 |
|---|---------|------|---------|
| G1 | [cpp-array] | ループ | 出力 `6`（実測） |
| G2 | [cpp-pointer] | ポインタ | values[1] が 99 になる（意味論としての期待値。ただしテンプレート自体がコンパイルできない点は欠陥1） |
| G3 | [cpp-error] | エラー（未定義動作） | 範囲外アクセスは未定義動作。値を断定してはいけない |
| G4 | 独自：参照 | 基礎 | int a=10; int& r=a; r=42; の後 a は 42（実測。参照は別名でありコピーではない） |
| G5 | 独自：std::string | 基礎 | "ab" に "cd" を += すると "abcd"、size() は 4（実測） |

### 3.12 C#（根拠：Microsoft Learn C# 言語リファレンス。実物ランタイムはこのマシンに無いため未実行）
| # | サンプル | 種別 | 期待結果 |
|---|---------|------|---------|
| S1 | [csharp-array] | ループ | 出力 `6` |
| S2 | [cs-object] | 参照 | Counter はクラス（参照型）のため same と first は同一オブジェクト。same.Value=5 の後 first.Value は 5、出力 `5` |
| S3 | [csharp-error] | エラー | values[2] は IndexOutOfRangeException を投げ、未処理ならプログラムが異常終了する（C/C++ の未定義動作とは扱いが異なる） |
| S4 | 独自：整数除算と剰余 | 基礎 | 7/2=3、-7/2=-3、-7%2=-1（0方向への切り捨て、剰余の符号は被除数に従う） |
| S5 | 独自：checked 溢れ | エラー | checked 文脈での int 溢れは OverflowException。通常（unchecked）文脈ではラップアラウンドする |

### 3.13 JavaScript（根拠：実物 Node v24.22.1 で実行して確定。ブラウザの DOM／prompt 等はモデル条件として分岐記録）
| # | サンプル | 種別 | 期待結果（実測） |
|---|---------|------|---------|
| J1 | [js-array] | 参照 | 配列は参照共有されるため same.push(4) の後 values は [1,2,3,4]。total=10、values は `[1, 2, 3, 4]` |
| J2 | 独自：型強制 | 基礎 | "5"+3="53"、"5"-3=2、1=="1" は true、1==="1" は false、typeof null は "object"、0.1+0.2=0.30000000000000004 |
| J3 | 独自：ループ＋分岐 | ループ | 1〜5 の偶数だけ加算すると 6 |
| J4 | 独自：巻き上げ | 基礎 | var 宣言前の console.log(x) は undefined（エラーにならない）、代入後は 5 |
| J5 | 独自：TDZ | エラー | let 宣言前の参照は ReferenceError（TDZ）で実行が止まる（実測：Node がエラーを投げて終了） |
| J6 | [js-runtime] | 分岐 | prompt の答えが "はい"（=== で厳密比較）のときだけ result に「開始」。それ以外（null を含む）は alert「終了」側（パス2本） |

## 4. 角度D 下準備：投入サンプル（作成済み・未投入）

`~/workspace/programming-practice-audit/samples/` に作成。次段でアプリ（公開サイト／ローカル）へ実際に投入して確認する。
- `d_path_explosion.py`：独立した条件の12段ネスト if（葉パス 2^12=4,096 本 > 上限2,000）。上限注記が出て黙って切り捨てないことの確認用。
- `d_path_explosion_seq.py`：独立した if の12連（同様に 4,096 パス）。
- `d_infinite_loop.py` / `d_infinite_loop.js` / `d_infinite_loop.bas` / `d_infinite_loop.R`：各言語の無限ループ。ステップ上限で打ち切って明示すること（固まらないこと）の確認用。アプリ側の上限定数は LIMITS（steps 600 / iterations 100 / operations 100000 / 1200ms）を確認済み。
- 未作成（次段で追加）：空入力、構文エラーだらけのコード、巨大ファイル、特殊文字・絵文字・日本語識別子、拡張子詐称ファイル。

## 5. 未実施範囲（次段以降）

- 角度A（一次情報照合）の本格実施：リファレンス全項目（13種類・合計453項目）の説明・戻り値・使用例と公式情報源の照合は未実施。本書では角度B の期待値導出に必要な範囲のみ公式意味論を用いた。
- 角度B の突き合わせ：期待結果表（本書 §3、全13種類・計70サンプル）とアプリ実出力の機械的照合は未実施（次段）。
- 角度C（実ブラウザ全操作）：全種類×全画面×全状態、375px／PC幅、コンソールエラー、表示崩れ、オフライン時操作は未実施（ブラウザ担当の段で実施）。
- 角度D（ファズ投入）：サンプル作成まで。アプリへの投入と挙動確認は未実施。
- 角度E の実地分：Service Worker の実登録、オフライン再訪での全機能動作は未実施（本書は静的確認のみ）。
- 角度F（保存データ保全）：種類別復元、SW 更新時の下書き保持、破損データでの起動の実地確認は未実施（構造確認のみ §1.5）。
- 拡張設計の実地テスト：ダミーの新規種類を実際に追加する手順の試行（第1部の監査項目）は未実施。
- R26〜R30 の UI 実測（画面収まり・文字切れ・テーマ・キーボード操作）は角度C と一体で未実施。

## 6. 収束判定について

本書は第1ラウンドのローカル実施分のみであり、収束判定は行わない。現時点の欠陥は P2 が2件（C/C++ テンプレートのヘッダ・名前空間欠落）。角度B の突き合わせと角度C の結果が出揃ってから統合・裁定する。
