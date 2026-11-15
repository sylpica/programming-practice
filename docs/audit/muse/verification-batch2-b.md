# 独立検証報告 VERIFY-B（修正バッチ2・検証班B）

- 対象ツリー: `~/workspace/programming-practice-audit/work/fix-batch2/verify-b/`（修正済み統合ツリーのスナップショット。コード変更は一切行っていない）
- 検証方法: 各所見原文の再現手順を修正後ツリーで実際に実行（Node ESM から各 `definition.simulate()` を実行。VBA は `js/engine.js`、他は `js/types/registry.js` の `getDefinition()` 経由）。文面項目は定義実体（全995項目を機械抽出）と個票 `reference-r2.json`／`reference-r6.json` の全フィールド機械照合＋sha256 再計算で確認。
- 対象件数: **144件**（funcheck 60件＋refacc RA-1〜71 の71件＋round23 R23-N1〜13 の13件）
- 結果: **解消 143件／一部解消 1件（R23-N2）／未解消 0件**
- `npm test` 独立実行: **2,493件・全合格（fail 0、skipped 0、exit 0）**（verify-b コピーで実施）

---

## 1. funcheck VBA（F-VBA-01〜10）— 10/10 解消

| ID | 再現手順（修正後ツリーでの実行結果） | 判定 |
|---|---|---|
| F-VBA-01 | `If Null Then … Else …` → エラー94「Null の使い方が不正です」で停止（Else 出力なし）。`Do While Null` も94で停止 | 解消 |
| F-VBA-02 | `CStr(1/3)`→`0.333333333333333`、`CStr(0.1+0.2)`→`0.3`、`CStr(1000000000000000)`→`1E+15`、`CStr(0.00001)`→`1E-05`、`Dim s As String: s=1/3`→`0.333333333333333` | 解消 |
| F-VBA-03 | `CStr(Array(1,2))`／`Len(Array(1,2,3))`／`Left(Array(1,2),1)` → いずれもエラー13で停止（捏造値なし） | 解消 |
| F-VBA-04 | `Len(Integer変数=7)`→2、`Len(Long=12345)`→4、`Len(Double=1.5)`→8、`Len(Boolean=True)`→2 | 解消 |
| F-VBA-05 | `IsNumeric(Null)`→False、`IsNumeric(Empty)`→True、`Replace(Null,"a","b")`→エラー94、`Val(Null)`→エラー94 | 解消 |
| F-VBA-06 | `Left("Excel",2.5)`→`Ex`、`Mid("Excel",2.5,2)`→`xc`、`Mid("Excel",2,3.5)`→`xcel`、配列添字 `x(1.5)`→30、`Round(2.567,1.5)`→2.57、`Replace("abcabc","b","X",1.5)`→`XcaXc`（start=2への銀行丸め変換と一致） | 解消 |
| F-VBA-07 | `InStr("", "")`→0 | 解消 |
| F-VBA-08 | `InStr(3,"abcabc","bc")`→5（start=3以降の最初の一致位置として正しい値。所見本文の期待値「3」は開始位置の数え違いと判断：有効形式が受理され正値が返る点が本旨）、`InStr(1,"ABC","a",1)`→1、`InputBox("p","t","d",100)`→エラーにならず未確定値で継続 | 解消 |
| F-VBA-09 | `(-8)^(1/3)`・`(-8)^0.5` → エラー5。対照 `10^400`→エラー6（正） | 解消 |
| F-VBA-10 | `Dim s As String: s="5": s+3`→8（実VBAどおり暗黙変換。過去裁定 RG-12 は所見側の一次資料どおりに覆った形） | 解消 |

## 2. funcheck ImageJ（D1〜D13）— 13/13 解消

| ID | 再現結果 | 判定 |
|---|---|---|
| D1 | `setVoxelSize(0.5,0.5,1.0,"um")` 後 `getVoxelSize`→a=0.5・u=`µm`、`getStatistics` の area→65536 | 解消 |
| D2 | `requires("99.99"); print("after")` → バージョン不足エラーで停止し `after` は出力されない。`requires("1.50")` は通過 | 解消 |
| D3 | `getWidth(1,2)`／`abs()`／`abs(1,2)`／`indexOf("abc")`／2点 `makePolygon` → いずれも引数個数エラーで停止し後続出力なし。ユーザー関数 `area2(3)` も呼び出し地点で停止（先行する `area2(3,4)` の `12` のみ出力） | 解消 |
| D4 | `getInfo("image.title")`→`demo.tif`（`getTitle()` と一致） | 解消 |
| D5 | 空の結果表で `setResult("X",99,1)` → 「行（99）が結果表の範囲外です」で停止。`setResult("X",0,1)` の行追加は正常（nResults=1） | 解消 |
| D6 | 8-bit で `getHistogram(v,c,10)` → nBins は256必須の旨で停止。nBins=0／-4 も不正として停止 | 解消 |
| D7 | `charCodeAt("AB",5)` → 範囲外エラーで停止（NaN 継続なし） | 解消 |
| D8 | 文字列セル `"ok"` への `getResult`→NaN、`isNaN(getResult(...))`→1 | 解消 |
| D9 | `getResultLabel(99)` → 範囲外エラーで停止 | 解消 |
| D10 | ROI なしで `getProfile()` → 「選択（ROI）が必要です」で停止 | 解消 |
| D11 | `newImage("x","8-bit black",-5,10,1)` → 寸法が負として停止 | 解消 |
| D12 | `parseInt("10",99)`→10、`parseInt("42xyz",16)`→NaN、`parseInt("3.9",16)`→NaN。対照の10進 `parseInt("3.9")`→4 は従来どおり | 解消 |
| D13 | 空配列の `Array.getStatistics` → 引数変数へ書き込まれる（mn=Infinity を表示でき、未代入エラーにならない）。文字列配列では呼び出し自体が「数値の配列ではありません」と真因で停止。正常配列 [1,2,3,4]→min1/max4/mean2.5/std1.291 | 解消 |

## 3. funcheck script（PY-01〜04／R-01／R-02／JS-01）— 7/7 解消

| ID | 再現結果 | 判定 |
|---|---|---|
| PY-01 | `sorted(s.intersection({2,3,9}))`→`[2, 3]`、`intersection({2,3},{3})`→`[3]` | 解消 |
| PY-02 | `'½'.isdigit(), '½'.isnumeric(), '²'.isdigit(), '¼'.isdigit()`→`False True True False` | 解消 |
| PY-03 | `xs.extend(5)` → TypeError で停止 | 解消 |
| PY-04 | `zip(5,[1])`／`','.join(5)`／`','.join(None)`／`isinstance(1,5)`／`isinstance(1,'int')` → いずれも TypeError で停止。`isinstance(1,(str,int)), isinstance('a',(str,int))`→`True True` | 解消 |
| R-01 | `if (1)`／`if (0)`／`while (1)` → いずれも `argument is not interpretable as logical` で停止 | 解消 |
| R-02 | `df$xy`（列 xyz の部分一致）→`c(1, 2)`。存在しない `df$zz`→NULL（正） | 解消 |
| JS-01 | `Math.max(1,2)`／`Math.ceil(1.5)`／`Math.sqrt(4)`／`JSON.parse('{}')` → いずれも「このJavaScript関数は説明に対応していません：＜名前＞」と名前を挙げて停止（虚偽の ReferenceError は解消）。`Math.abs`・`JSON.stringify` は従来どおり動作 | 解消 |

## 4. funcheck shell（SH-C1〜C3／SH-P1〜P7）— 10/10 解消

「フェーズ1で解消済み」とされた SH-P1／SH-P4 も含め全件を実測した。

| ID | 再現結果 | 判定 |
|---|---|---|
| SH-C1 | `echo hi > nul`／`> NUL` 後に `dir /b` → ファイル `nul` は作られず一覧に出ない。`> con` はコンソールへ `hi` を出力 | 解消 |
| SH-C2 | 裸の `echo` → `ECHO は OFF です。` が標準出力に出る。`echo on` 後は `ECHO は ON です。` | 解消 |
| SH-C3 | `dir /b *.xyz`／`dir /b nope` → `ファイルが見つかりません` を表示 | 解消 |
| SH-P1 | フォルダの `$_.Length`→空表示で `isnull=True`。`Select-Object Name, Length` でもフォルダ行は `Length : $null` | 解消（フェーズ1解消済みの主張を実測で確認） |
| SH-P2 | `$r = @(1,3) -eq 2` の後 `$null -eq $r`→True | 解消 |
| SH-P3 | `-contains`→True、`-in`→True、`-notin`→True、`-cmatch "abc"`（"ABC"）→False、`-cgt`→True、`-igt`→True と全て正規に動作。`-f` は「未対応：書式演算子 -f」と名前を挙げて停止（虚偽の `) が必要です` は解消） | 解消 |
| SH-P4 | `Write-Host "a","b" -Separator "@@"`→`a@@b` | 解消（フェーズ1解消済みの主張を実測で確認） |
| SH-P5 | `Write-Output 9` の後に `$x = 5` を実行しても、最終状態「最後に評価したパイプライン」の値は `9` のまま | 解消 |
| SH-P6 | `foreach ($n in $null)` → `iter:` が1回出てから `END`（空配列の0回と区別される） | 解消 |
| SH-P7 | `$a[1..2]`→`2, 3`（範囲添字が動作） | 解消 |

## 5. funcheck cfamily（D1〜D14）— 14/14 解消

「フェーズ1で解消済み」とされた D1／D2 も含め全件を実測した。

| ID | 再現結果 | 判定 |
|---|---|---|
| D1 | C/C++: `unsigned char c=300`→44、`255` に `c=c+1`→0、`c=-1`→255、配列要素への `300` 代入→44 | 解消（実測で確認） |
| D2 | C/C++: `unsigned int a=3000000000u`→3000000000、`u=u-1u`→4294967295、`u+=2000000000u`→4000000000、`unsigned short s=70000`→4464、`65535` に `s=s+1`→0（虚偽の「処理系依存」停止なし） | 解消（実測で確認） |
| D3 | C#: `byte b=200`→200、`ushort s=65535`→65535、`uint u=4000000000u`→4000000000、`uint.MaxValue相当+1u`→0、`byte b+b`→400（虚偽の OverflowException なし） | 解消 |
| D4 | C: `abs(-5.5)` を `%d` で→5（int 変換）。C++: 同形は書式不一致として停止（UB を確定値で出さない） | 解消 |
| D5 | C/C++: `5.5 % 2.0`・`5 % 2.0` → 「剰余演算子 % の被演算子は整数型でなければなりません」で停止。C# の `5.5 % 2.0`→1.5 は従来どおり正 | 解消 |
| D6 | C++: `std::cout << (unsigned char)65`・`(signed char)65` → どちらも `A` | 解消 |
| D7 | C++: `std::cin >> n`（n=42 初期値）→ 旧値を保持せず「実行時に決まる：標準入力」の未確定値になる。文字列変数も同様 | 解消 |
| D8 | `printf("%f", 1e21)`→`1000000000000000000000.000000`、`float 1e30f` も固定小数表記（指数表記にならない） | 解消 |
| D9 | `printf("%f", 1 ? 2 : 3.5)`→`2.000000`、`c ? 10 : 2.5`（c=0）→`2.500000` | 解消 |
| D10 | `printf("%d", *v)`（配列名の逆参照）→4 | 解消 |
| D11 | C#: `(int)1e30`（unchecked）→「範囲外の浮動小数点から整数への変換結果は不定（unspecified）」として停止（黙って 0 を出さない） | 解消 |
| D12 | C#: `Console.ReadLine()` 結果の `.Length` → 「実行時に決まる：未確定の対象の Length」（虚偽の「フィールドがありません」は解消） | 解消 |
| D13 | `printf("%d %d", i++, i)`・`i++, i, ++i` → いずれも「引数の評価順が未規定なため…競合します」として停止（確定値の捏造なし） | 解消 |
| D14 | C#: `abs(-5)` → 「C# に abs 関数はありません（Math.Abs は未対応です）」で停止。`unsigned int` 型名 → 「C# に『unsigned int』という型名はありません（uint を使います）」で停止 | 解消 |

## 6. funcheck declared（D-1〜D-6）— 6/6 解消

| ID | 再現結果 | 判定 |
|---|---|---|
| D-1 | Power Apps: `Set(R, If(false, 1)); Notify(Text(R))`→`""` で R が Blank として定義される。`Set(R, Switch(9, 1, "one"))` も同様 | 解消 |
| D-2 | `LookUp(C, Value=99).Value`→`""`（Blank 伝播）。`Set(R, LookUp(...)); Text(R.Value)`・`Blank().Value` も同様にエラーにならない | 解消 |
| D-3 | `Value("")`→Blank（Text で `""`）。対照 `Value("abc")` は従来どおりエラー停止 | 解消 |
| D-4 | `CountRows(Blank())` → 日本語「テーブルが必要です」で停止（内部 JS 例外文の漏出なし） | 解消 |
| D-5 | UI.Vision: 製品綴り `elseIf` のマクロ → 出力 `two, after`（正しく分岐し、黙殺されない） | 解消 |
| D-6 | UI.Vision: `storeText id=nope` 後 `!statusOK`→`false`、変数は `#LNF`。`storeValue` も同様。成功時は `true`（正） | 解消 |

## 7. refacc（RA-1〜71）— 71/71 解消

文面項目は定義実体の現行フィールドで照合した。あわせて全995項目について定義⇔個票（r2 917行＋r6 78行）の全フィールド機械照合を行い **不一致0件**、欠落・孤児0件だった。

### RA-1〜4（VBA）
- RA-1 Nothing: description に `変数 Is Nothing` 判定、caution に「値式の位置で使うとエラー91。Is Nothing は正規の使い方でエラーにならない（本アプリでは未対応として停止）」と切り分けが明記 — 解消
- RA-2 For Each: caution が「配列の要素変数は Variant のみ。コレクション（Range を含む）は Variant、Object、または要素の特定の型（例：Range）」に是正 — 解消
- RA-3 Len: description が「文字数、または変数を格納するのに必要なバイト数」に是正（挙動は F-VBA-04 で実測済み） — 解消
- RA-4 Exit For: example が `For i = 1 To 5 … Next i` で囲まれた完結形 — 解消

### RA-5〜15（ImageJ）
- RA-5/6/7 Math.sinh/cosh/tanh: caution に「実物の ImageJ マクロ言語には存在しない…このアプリでは未確認として停止する」と明記され、実測でも `Math.sinh(1)` は「未確認：Math.sinh はモデルで未対応です」で停止（実在関数として計算しない） — 解消
- RA-8 replace: description が「old が1文字なら文字置換、2文字以上なら正規表現（new の長さは判定に関係しない）」に是正 — 解消
- RA-9 open: caution に `open(path, n)` 形式を併記 — 解消
- RA-10 setBatchMode: description に `"show"`／`"hide"`／`"exit and display"` の文字列形式を併記 — 解消
- RA-11 getString: caution に「空文字列を入力して確定した場合もマクロは中止される」を追加 — 解消
- RA-12 getNumber: caution に「数値として読めない値を入力した場合は defaultValue が返る」を追加 — 解消
- RA-13 Roi.contains: caution に「選択（ROI）が無い状態で呼び出すとマクロは中止される」を追加 — 解消
- RA-14 getValue: description に「RGB 画像では輝度値を返し、画像外の座標では NaN を返す」を追加 — 解消
- RA-15 出典フラグメント: getInfo／roiManager／Dialog.create／contains／charAt／minOf／maxOf の source は実在しないフラグメントを外し、アンカー無しのページ URL（functions2.html）に是正 — 解消

### RA-16〜22（Python）
- RA-16: ModuleNotFoundError／UnicodeError／FileNotFoundError／LookupError／ArithmeticError／NameError の各 caution に「本アプリの except 照合は例外名の完全一致のみで、親クラス（子クラス）での捕捉は再現されない」旨の開示を追加 — 解消
- RA-17: KeyboardInterrupt／Exception の caution に「本アプリの照合は簡略化されており、except Exception でも捕捉されてしまう（実際の Python と異なる）」と開示 — 解消
- RA-18 global: description が「global 文はモジュールレベルの変数、nonlocal 文は外側の関数の変数（両者は別の文）」に是正 — 解消
- RA-19: comprehension の returns が「リスト／集合／辞書（内包表記が生成するコレクション）」、f-string の returns が「str: 整形済み文字列」に是正 — 解消
- RA-20 with: supported が実挙動（部分実行）に合わせて true になり、caution の重複説明は1回に整理。実測でも本文 `print('body')` が実行される — 解消
- RA-21 math: caution に「本アプリで確定計算できるのは math.sqrt／fabs／floor／ceil と定数（pi／e／tau／inf／nan）のみ」と開示 — 解消
- RA-22 dict: caution が「キーにはハッシュ可能な値のみ使える。リスト・辞書・集合や、それらを含むタプルはキーにできない」に是正 — 解消

### RA-23〜28（CloudFormation）
- RA-23 errorMessage: example が失敗応答（`status: "failure"`＋`errorMessage` を返すハンドラ）に差し替え — 解消
- RA-24 region／accountId／transformId／templateParameterValues: 各 example が対象フィールド（`event["region"]` 等）を実際に読む例に差し替え — 解消
- RA-25 Fn::Transform: description に「（Fn::Transform自身はfragmentに含まれません）」を追加 — 解消
- RA-26 params: description に「トップレベルTransformのマクロでは空が渡されます」を含めた — 解消
- RA-27 Transform: returns が「変換後のテンプレート全体（Transform節を除く）」に是正 — 解消
- RA-28 fragment／用語集: fragment の description と用語集「断片（フラグメント）」の定義が「トップレベルTransformでは Transform 節を除くテンプレート全体、Fn::Transform では同階層の兄弟範囲」に是正 — 解消

### RA-29〜39（C／C++／C#）
- RA-29 getline（P1）: caution の虚偽の「停止します」を是正し「cin >> x の抽出も、モデルでは抽出先の変数が未確定値になります」と現行挙動（funcheck D7 の処置後の挙動）と一致させた。example も `std::string` 修飾形 — 解消
- RA-30 string／getline: 両 example とも `std::string`（＋`<string>`）を使用 — 解消
- RA-31 C bool: example に `#include <stdbool.h>` を追加 — 解消
- RA-32 short／unsigned short／float／signed char（C・C++）: いずれも「モデルでは…。実環境では少なくとも16ビットで幅は処理系依存」等、モデル限定の断りに是正 — 解消
- RA-33 C# キャスト: description／caution に「bool へキャストできるのは bool の値だけ、string へは文字列と参照型だけ。数値から bool／string へのキャストはできません」と制約を明記 — 解消
- RA-34 long.MaxValue／long.MinValue／ulong.MaxValue: returns に実値（9223372036854775807／-9223372036854775808／18446744073709551615）を明記し他16件と形式を統一 — 解消
- RA-35 signed 系別名: int の caution に「signed、signed int（signed 単独でも int）」、long に「signed long int」、short に「signed short int」が明記され4形が揃った — 解消
- RA-36 C abs: example に `#include <stdlib.h>` あり（RG-144 で解消済みとされる件を現行ツリーで再確認） — 解消
- RA-37 ulong.MinValue: ulong の caution に「ulong.MinValue は静的メンバーの表になく未対応として停止します（実値は 0）」と開示 — 解消
- RA-38 C# int／return: int の caution が「C# では常に32ビット固定」、return の caution（C#）が「Main の終了にも使います」に差し替え — 解消
- RA-39 C／C++ return: example が条件分岐内の return と末尾 return の形になり、到達不能な重複行が解消 — 解消

### RA-40〜44（R）
- RA-40 %/%: description が「floor除算（負の無限大方向へ丸めた商）。例えば -7 %/% 3 は -3」に是正 — 解消
- RA-41 NA: description に例外（`NA | TRUE` は TRUE、`NA & FALSE` は FALSE、`NA ^ 0` は 1）を明記 — 解消
- RA-42 $: description に部分一致の説明を追加（挙動は R-02 で実測済み） — 解消
- RA-43 data.frame: description が「四則演算ができるのは数値列（numeric／logical）のみで、文字列などの列を含む場合はエラー。比較も型の組み合わせに制約」に限定 — 解消
- RA-44 data.frame: source が `data.frame.html`（404 の `dataframe.html` から是正） — 解消

### RA-45〜48（JavaScript）
- RA-45 typeof: returns の列挙に `"symbol"` を追加（8種） — 解消
- RA-46 BigInt: caution が「関数としての BigInt(...) 呼び出し…。BigInt はコンストラクタではなく、new BigInt() は実 JavaScript でもエラー」に是正 — 解消
- RA-47 break: description が「最も内側のループ、switch文、またはラベル付き文を直ちに終了します」に是正 — 解消
- RA-48 オブジェクトリテラル: source が MDN の Object initializer ページに是正 — 解消

### RA-49〜52（AutoHotkey）
- RA-49 IsSetRef: returns は実物どおり「代入済みなら1、未代入なら0」を保ち、caution で「この教材のモデルは実物と異なり、参照先が配列・オブジェクトのときにだけ1を返す（モデル側の制限です）」と差異を明示し、項目内矛盾を解消 — 解消
- RA-50 WinClose: caution に「対象ウィンドウが見つからなければ TargetError を投げます」を追加 — 解消
- RA-51 SetTitleMatchMode: syntax に `"RegEx"`／`"Fast"`／`"Slow"` を含め returns と範囲を一致させ、caution でモデル対応は 1／2／3 のみと明記 — 解消
- RA-52 A_*（組み込み変数）: description に「一部は代入で設定を変更できます（A_WorkingDir・A_Clipboard・A_TitleMatchMode・A_SendMode・A_FileEncoding など）」と例外を明記 — 解消

### RA-53〜58（Power Apps）
- RA-53 And／Or: syntax が `And(LogicalFormula1, LogicalFormula2 [, LogicalFormula3, ...])`（第2引数必須）に是正され、実測でも `And(true)`／`Or(true)` は「2個以上が必要です」で停止、2引数形は正常動作 — 解消
- RA-54 Filter: syntax が `Filter(Table, Formula1 [, Formula2, ...])` になり、実測でも2条件形 `Filter(Items, Value > 0, Value < 3)` が動作（該当2件） — 解消
- RA-55 Sum: syntax に数値可変長形 `Sum(NumericalFormula1 [, ...])` を併記し、実測でも `Sum(1,2,3)`→6 — 解消
- RA-56 Patch: syntax が `Patch(Source, BaseRecord, ChangeRecord1 [, ChangeRecord2, ...])` になり、実測でも複数変更レコード形が動作 — 解消
- RA-57 Notify: syntax が `Notify(Message [, NotificationType [, Timeout]])`、description に既定値（Information／10秒）を明記し、実測でも引数付き形が動作 — 解消
- RA-58 Value: syntax が `Value(Text [, LanguageTag])` に是正（Text 項目と統一） — 解消

### RA-59〜60（Power Automate）
- RA-59: Else if の source が `#elseif`、Write text to file が `#writetext`、Display input dialog が `#inputdialog`、Display message が `#showmessagedialog` に是正 — 解消
- RA-60 End: source に個別アンカー `#end` を付与 — 解消

### RA-61〜63（UI.Vision）
- RA-61 assertText: description が「期待パターンと照合…ワイルドカードを使った glob 形式、exact: で完全一致、regexp: で正規表現」に是正 — 解消
- RA-62 echo: syntax／description に任意の color 引数を併記 — 解消
- RA-63 break／continue／!statusOK／!errorIgnore: source が一覧トップのみから、各コマンド・変数の箇所を指すアンカー付き URL（`selenium-ide#break`／`#continue`、`docs/#!statusok`／`#!errorignore`）に是正 — 解消

### RA-64〜69（cmd／PowerShell）
- RA-64 算術・代入演算子: description／syntax に前置形式（`++$x`／`--$x`）を明記し、実測でも `++$x`→増減後の値、`$x++`→増減前の値と意味論まで正しい — 解消
- RA-65 Where-Object: 文面「別名 where・? でも同じ処理をします」が実測でも真になった（`1..5 |? { $_ -gt 2 }`→`3,4,5`、`where` も同様） — 解消
- RA-66 Write-Host: 「-Separator も実装されています」の文面が SH-P4 の処置により実測でも真になった — 解消
- RA-67 型変換（キャスト）: syntax に `[int32]`／`[boolean]` を併記し全7表記が構文欄に揃った — 解消
- RA-68: cmd「rd」は本文で /q の要否を明記、「move」は /y、「del」は /q と全件削除時の扱いを本文に明記。PowerShell「Test-Path」は本文で -PathType を説明、「Remove-Item」は syntax と本文で -Recurse／-Force の開示軸を統一 — 解消
- RA-69 $_／$PSItem: 両 description に「switch の節の中では判定中の値を表すなど、パイプライン以外の場面でも現在のオブジェクトを表します」を追加 — 解消

### RA-70〜71（個票・記録）
- RA-70 cmd/dir: 機械照合で r6 の dir を含む全995項目（r2 917＋r6 78）が定義実体と全フィールド一致、不一致0件 — 解消
- RA-71 sha256: r2 の全917行について、正規方式＝ `fields` をキーソートした JSON（Python `json.dumps(fields, sort_keys=True, ensure_ascii=False)`、既定の区切り・UTF-8）の sha256 で再計算し、**917/917 行が記録値と一致**。sha256 を持たない行は0件 — 解消

## 8. round23（R23-N1〜13）— 12 解消／1 一部解消

| ID | 再現結果 | 判定 |
|---|---|---|
| N1 | `$PWD.Path`→`C:\Practice`、`if ($PWD.Path -eq "C:\Practice")`→`here`（誤分岐解消）、`$PSVersionTable` は null でなく `PSVersion`→7.4 を保持。`$HOME` は固定値を持たず「実行時に決まる値」として扱われ、`$null -eq $HOME` の分岐は null 側／値あり側の両パスが列挙される（黙って $null に確定しない） | 解消 |
| N2 | `0x1F`→31（裸・代入・括弧内・配列内すべて）、`1KB`→1024、`1MB`／`2GB`／`1.5KB`／`0x10KB` も単一の数値として動作し、虚偽原因の停止は解消。**ただし `0b101` だけ未処置**（下記「一部解消の詳細」） | **一部解消** |
| N3 | Power Apps: `Set(abc, 42); Notify('abc')`→`42`（識別子として解決）、未定義名 `'abc'`→「未定義の名前：abc」で停止、`'Order Id'` も文字列でなく識別子として扱われる | 解消 |
| N4 | R: `print()`／`length()`／`is.na()`／`rep()`／`as.numeric()` → いずれも `argument "x" is missing, with no default` で停止（値の捏造なし。従来正しかった `mean()` も同旨） | 解消 |
| N5 | C++ `a[1.5]`・`a["x"]` の cout 経路、C# `a[1.5]`・`a[true]`、C `a[1.5]` の printf 経路 → いずれも「添字は整数型でなければなりません」と真因で停止（「未設定」捏造・虚偽の例外名は解消）。正常な `a[1]` は動作 | 解消 |
| N6 | Python の math 定数5名に項目が新設され（math.pi／math.e／math.tau／math.inf／math.nan、CloudFormation 側にも伝播し r2 は917行）、実測でも `math.pi`→3.141592653589793 等の実値を返す。個票とも同期（§7 機械照合） | 解消 |
| N7 | PowerShell に「プロパティ」項目が新設され syntax／description が .Length／.Count／.Extension／.Keys／.Values／.PSIsContainer／.Path の7名をカバー。自動変数 $PWD／$PSVersionTable／$HOME の項目も新設（PowerShell は計50項目、r6 と同期）。実測でも `"abc".Length`→3、`@(1,2).Count`→2、`$h.Keys`／`$h.Values`、`(Get-Location).Path` が動作 | 解消 |
| N8 | 先頭 BOM・2行目頭 BOM・NBSP 区切り → いずれも正常実行され値を返す（不可視の空原因で止まらない） | 解消 |
| N9 | Python: `1e`／`1e+`／`1e-`／`1.5e`／`1_`／`1__0`／`1_e2`／`1_.5` → 全て SyntaxError「数値の書き方が正しくありません」で停止。正当な `1_000`→1000 は動作 | 解消 |
| N10 | Python: `;;;`／`x = 1;;`／行頭 `;x = 1`／ブロック内の単独 `;` → 全て SyntaxError「『;』の前には文が必要です（空の文は書けません）」で停止。正当な `x = 1; print(x)` は動作 | 解消 |
| N11 | Python: `1 = x`（x 未定義）→「SyntaxError：リテラルには代入できません（cannot assign to literal）」。x 定義済みでも同一（帰属が右辺に依存しない） | 解消 |
| N12 | ImageJ: `print("\101")`→`A`、`print("\040")`→空白と、文書化された8進エスケープが機能する。なお `\u0041`→`u0041` 等、未知エスケープでバックスラッシュが脱落する挙動自体は残るが、これは修正側が実 ImageJ の StreamTokenizer 規則と同旨であると明示した扱いで、所見自身も `\x`／`\u` の実 ImageJ での扱いは一次情報で確定できないとしていた範囲であり、欠陥根拠の中核（8進エスケープの不発）は解消したため解消と判定する | 解消 |
| N13 | ImageJ: 関数形 `charAt(s, 1)`・`charAt(s)` → 「charAt は関数形式では使えません」と真因で停止（虚偽の「引数の数が違います」は解消）。メソッド形 `s.charAt(1)`→`b` は動作 | 解消 |

### 一部解消の詳細（差し戻し用）

**R23-N2（残存表面: 2進接頭辞 `0b`）**
- 再現（修正後ツリー）: `Write-Output 0b101` → 出力 `"0"` と `"b101"` の2件（所見原文の再現1と同一の分割）。`$x = 0b101` → 「未対応のPowerShellコマンドレット／関数：b101」で停止（b101 はコマンドではなく、所見再現2と同型の虚偽原因）。
- 期待: 所見の処置方針どおりなら、`0b101` が単一の数値リテラルとして扱われるか、少なくともリテラル形式の問題として名前を挙げて停止すること。
- 補足: 所見自身の一次根拠は 16進 `0x` と単位接尾辞（KB 等）についてのみ示されており、実 PowerShell に `0b` リテラルが存在するかは所見内でも裏付けられていない。処置要否（リテラルとして実装するか、未対応として名指し停止にするか）は統合役の裁定を要する。16進・単位接尾辞・括弧内／代入位置の虚偽原因はいずれも解消済みであるため、本件は N2 の一部解消として記録する。

## 9. 再分類項目（SEM-1〜4／PAR-1）の二重処置チェック

round23 §3 で「新規に数えない」と裁定された5件について、既知項目と同一の単一処置で解消しており、二重処置（別個の重複した修正）にはなっていないことを確認した。

| 申告 | 既知との関係 | 実測結果 |
|---|---|---|
| SEM-1 | funcheck-cfamily D1 と同一の変換経路 | `signed char c = 200;`（C）→「整数への変換結果は処理系依存です」で停止（黙って 200 を保持しない）。D1 の処置でカバー |
| SEM-2 | funcheck-cfamily D2 と文字どおり同一 | §5 D2 の実測どおり解消 |
| SEM-3 | funcheck-cfamily D3 と同根（様相は演算代入側） | C# `uint u = 0; u = u - 1;`→4294967295（黙って -1 を出さない）。`(byte)300`→44、`(ushort)(s + 1)`（s=65535）→0 とキャスト側とも揃った。D3 への追加再現として解消 |
| SEM-4 | funcheck-shell SH-P3 と同一（対象演算子に -f を含む） | `Write-Output ("{0}" -f 42)` →「未対応：書式演算子 -f」と名前を挙げて停止。傍証の `[math]::Round(2.5)` も「未対応：.NET型の静的メンバーアクセス（::）」と対象を名指して停止 |
| PAR-1 | narrcheck NX-N8 と同一 | `Write-Output $?`→`True`、`Write-Host $?`→`True`（文字列 `"?"` の出力なし） |

## 10. テスト独立実行

- コマンド: verify-b コピーで `npm test`（`node --test tests/*.test.js`）
- 結果: **tests 2,493／pass 2,493／fail 0／skipped 0**、終了コード0

## 11. 総括

- 対象144件中、**解消143件・一部解消1件（R23-N2 の `0b` 表面）・未解消0件**。
- 「フェーズ1等で解消済み」とされた項目（cfamily D1／D2、shell SH-P1／SH-P4、refacc RA-29〜31）も全て実際に動かして解消を確認した。
- RA-36 は RG-144 で解消済みとされる件を現行ツリーで再確認した（C abs の example に `<stdlib.h>` あり）。
- 唯一の残存は R23-N2 の `0b101` で、再現手順と期待／実際の差分は §8 に記載した（処置要否は統合役の裁定事項として補足した）。
