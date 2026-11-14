# プログラミング練習 Muse 側第8ラウンド単独監査（0ee8c7a）

- 実施：2026-11-15、Muse 側単独（Codex 側は第3ラウンドで終了済み）。対象リビジョンは `0ee8c7a` 固定。コード修正・push・Codex への連絡なし。欠陥は残件として記録するのみ。
- 手法：関数バージョンバッテリー用プローブ（work/r8-func.mjs／r8-func2.mjs／r8-func3.mjs／r8-func4.mjs）、演算子・変換マトリクス（work/r8-matrix.mjs／r8-matrix2.mjs）、リファレンス例全件実行（work/r8-refs-run.mjs → work/r8-refs-results.json）＋実物比較（work/r8-real-refs.mjs）、用語集全件抽出（work/r8-gloss-dump.mjs）。不一致・候補は全件、実物（CPython／Node／gcc・g++）または一次情報（ImageJ 公式ソース ij.macro.Functions、Microsoft Learn）で裁定した。
- 既知残件（R3-N1、R4-N1〜N4、R5-N1〜N9、R6-N1〜N12、R7-N1〜N11）は再報告しない。同根の別表面は新規として数える（従来の取り決めどおり）。

## 結論（先に要約）

**このラウンドで新規欠陥ゼロではない。** 新規欠陥は **P2 が1件、P3 が10件**（累計残件は 37＋11＝48件：P2×8、P3×40）。

| ID | 重大度 | 角度 | 概要 |
|---|---|---|---|
| R8-N1 | P2 | 1 | Power Fx の LookUp の削減列引数が無視され、Text() が内部表現 "[object Object]" を表示する |
| R8-N2 | P3 | 2 | C# の文字列への関係演算子（<、>=）を黙って受理し結果を出す（実 C# はコンパイルエラー） |
| R8-N3 | P3 | 2 | C# の true == 1 が無言で True になる（実 C# はコンパイルエラー。R7-N4 と同根の別表面） |
| R8-N4 | P3 | 2 | C# の decimal リテラル（m サフィックス）が「) が必要です」という虚偽の原因表示で止まる |
| R8-N5 | P3 | 2 | Power Fx の Text(値, 書式) が書式引数を無言で無視し、整形前の値をそのまま表示する |
| R8-N6 | P3 | 2 | Power Fx の in / exactin 演算子が「) が必要です」という虚偽の原因表示で止まる |
| R8-N7 | P3 | 1 | R の is.na(NULL) が FALSE（長さ1）を返す（実 R は logical(0)。R7-N1 と同根の別表面） |
| R8-N8 | P3 | 1・2 | R の空ベクトルの表示が c() になる（実 R は numeric(0)／integer(0) 等の型つき表示） |
| R8-N9 | P3 | 1 | VBA Replace の任意引数（start 等）が「引数の数が一致していません」という不正確な原因表示で拒否される |
| R8-N10 | P3 | 1 | ImageJ の endsWith(string, "") が 0 を返す（実 ImageJ は Java 準拠で 1） |
| R8-N11 | P3 | 1 | ImageJ の d2s で Infinity／NaN の表示が "Infini.ty"／"N.aN" に破壊される |

**裁定で取り消した候補（重要）**：
1. ImageJ の substring の範囲外エラー停止は、当初「実物はクランプする」と想定して欠陥候補にしたが、一次情報（ij.macro.Functions 公式ソースの substring 実装は checkIndex で範囲外をエラーにし、クランプしない）で照合し、**エンジンの挙動が正しい**と確定した。
2. C の printf 未対応エラーの「未対応：」接頭辞二重化は、エンジンの生データ（category="未対応"、message="未対応：…"）では二重に見えたが、js/app.js の errorDescription が message の接頭辞を検出して二重化を防いでいるため、**実際の画面表示では二重にならない**。欠陥としない。

---

## 角度1：組み込み関数の振る舞いバッテリー

各種類のリファレンス掲載関数について、通常引数＋境界引数（空、0、負、範囲外、型違い）のケースを設計し、シミュレータで実行した。Python／JavaScript／C／C++ は実物（CPython 3.12／Node 24／gcc・g++ 13）でも同一コードを実行して照合した。

### R8-N1（P2・新規）：Power Fx LookUp の削減列引数が無視され "[object Object]" が表示される
再現：`ClearCollect(t, {v: 1}, {v: 5}); Notify(Text(LookUp(t, v > 2, v)))` → Notify の出力が **"[object Object]"** になる。
実 Power Fx：LookUp の第3引数（削減列）を指定するとその列の値（この場合は 5）を返す。第3引数を無視してレコード全体を返し、Text() が JavaScript 既定の文字列化で "[object Object]" という内部表現をそのまま学習者に提示している。LookUp はリファレンス掲載の主要関数であり、誤った結果表示＋内部表現の露出を伴うため P2。
なお Filter＋CountRows（`CountRows(Filter(t, v > 2))` → 1）、Sum（テーブル形式）、Sequence、Switch、If の Blank 返しは実物どおりだった。First は未対応として明示停止する（リファレンス未掲載のため正直な範囲宣言）。

### R8-N7（P3・新規）：R の is.na(NULL)
実測：`is.na(NULL)` → `c(FALSE)`（長さ1の FALSE）。実 R：is.na(NULL) は logical(0)（長さ0）。NULL を通常の値として扱う R7-N1 と同根だが、関数面の別表面のため新規として数える。その他の is.na（c(1, NA, NaN) → FALSE, TRUE, TRUE）は実物どおり。

### R8-N8（P3・新規）：R の空ベクトル表示
実測：`x[0]`（x は長さ3の数値ベクトル）→ 表示が **c()**。`seq_len(0)`、`rep(7, 0)` も c()。実 R の表示は numeric(0)／integer(0) のように型を含む。値は「空」であることは正しいが、実在しない表示形式を学習者に見せる点で表示系の欠陥とする（R7-N7 の Inf 表示と同類型の別表面）。なお非倍数リサイクルの値 c(2, 4, 6, 5) と警告文のトレース表示は実物どおりだった。

### R8-N9（P3・新規）：VBA Replace の任意引数
再現：`Debug.Print Replace("aaa", "a", "b", 2)` → 「引数の数が一致していません」で停止。実 VBA の Replace は start／count／compare の任意引数を持ち、この呼び出しは有効（start=2 のため戻り値は "bb"）。エンジンは3引数版のみ対応し（3引数版は正常動作を確認）、4引数以上を「引数の数が一致していません」と表現する。実際には引数の数自体は VBA として正しく、未対応なのは任意引数の解釈であるため、原因表示が実態と違う（代替の案内もない）。P3。

### R8-N10（P3・新規）：ImageJ endsWith の空サフィックス
実測：`endsWith("abc", "")` → **0**（`endsWith("abc", "c")` → 1 は正常）。一次情報（ij.macro.Functions の startsWithEndsWith 実装）は Java の String.endsWith をそのまま使い、空文字列に対しては true（1）を返す。startsWith("abc", "") はエンジンも 1 で一致しており、endsWith 側だけの欠落。P3。

### R8-N11（P3・新規）：ImageJ d2s の Infinity／NaN 表示破壊
実測：`d2s(1.0 / 0.0, 2)` → **"Infini.ty"**、`d2s(0.0 / 0.0, 2)` → **"N.aN"**。小数点位置の挿入処理が非数値の文字列表現にも適用され、文字列の途中に "." が差し込まれている。実 ImageJ の d2s は Infinity／NaN に対して "Infinity"／"NaN" を返す。通常の数値（d2s(3.14159, 2) → "3.14"）は正常。値を捏造はしないが表示が破壊されているため P3。

### 言語別の主な確認結果（欠陥でないもの）
- **Python**：境界バッテリー約22件すべて実物と一致（len の TypeError、max の ValueError、int の変換規則、round の銀行丸め、sorted の大文字小文字順、split／join の境界、zip の短い方への切り詰め等）。round の負 ndigits は「実行時に決まる：round の結果」と正直に宣言して止まる（捏造ではないため欠陥としない）。
- **JavaScript**：parseInt／Number／String／Boolean／Math 丸め／JSON.stringify／push・pop の境界すべて Node 実測と一致。
- **C**：printf の幅・精度指定（%05d、%.2f）や %x／%o／%u／%c は「未対応：このprintf書式はモデルで扱えません」と明示宣言で止まる（第7ラウンドの %g／%e と同じ正直な範囲宣言。欠陥としない）。
- **C++**：cout の bool（1）／char／整数の
...[truncated 8188 chars]