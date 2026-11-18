# B7 G3チーム（テキスト処理系）報告書

担当：re / string / textwrap / difflib / unicodedata / stringprep / fnmatch / shlex
作業ツリー：`adv-b7-g3`（adv-b7 のコピー）。GitHub への書き込みは行っていない（ローカルコミットまで）。

## 1. 区分別件数（全207件、全てリファレンス収載済み）

| 区分 | 件数 | 内訳 |
|---|---|---|
| 個別実装（supported） | 159 | 関数・メソッド・クラスを意味論実装 |
| 束ね値（supported） | 25 | re フラグ定数16件、string 定数9件 |
| 未検証（unverified） | 9 | 下記 |
| 未対応（unsupported） | 14 | 下記 |
| 例外対応付け | 1クラス | re.PatternError（ValueError 子として登録。項目自体は未検証に含む） |

モジュール別（supported / unverified / unsupported）：
re 58/6/0、string 25/0/0、textwrap 20/0/0、difflib 25/0/1、unicodedata 11/2/9、stringprep 16/0/3、fnmatch 5/0/0、shlex 24/1/1。合計 184/9/14 = 207。

- 未検証9件：re.PatternError.msg /.pattern /.pos /.lineno /.colno（例外オブジェクトへ属性を保持する基盤が無く、値は再現できない）、re.RegexFlag（フラグは整数として扱う。`re.I` 等の値は正確）、unicodedata.unidata_version（実行環境の Unicode 版に依存し固定値を主張できない）、unicodedata.ucd_3_2_0（3.2.0 データベース実体が無い）、shlex.shlex.instream（ファイルが無いため入力文字列そのものを返す近似）。
- 未対応14件：difflib.diff_bytes（bytes 型が無い）、unicodedata.name / lookup / decomposition / bidirectional / block / extended_pictographic / grapheme_cluster_break / indic_conjunct_break / iter_graphemes（名前・分解・双方向クラス等のデータベースが無い。捏造しない）、stringprep.in_table_a1 / in_table_d1 / in_table_d2（Unicode 3.2.0 基準の Cn／双方向クラスが必要で現在のデータでは再現不可）、shlex.shlex.sourcehook（ファイル入出力が無い）。

## 2. 再分類・訂正

- **string の件数**：任務文は37件だったが、バックログ正本（adv-b7-tools/backlog.json）の string 項目は25件。全25件を収載した（差分12件はバックログに存在しない）。
- **difflib.SequenceMatcher.get_grouped_opcodes**：任務文の「get_grouping_opcodes」は誤りで、CPython の実在メソッド名は get_grouped_opcodes。正しい名前で収載・実装した。
- **current 欄の誤検出**：fnmatch.filter、string.Formatter.format 等の current 付き項目も、コーディネーター指示どおり全て新規項目として referenceAdvanced に収載した（referenceOverrides は不使用）。
- **re.error の扱い**：CPython 3.12 では re.error は ValueError の子ではないが、公式ドキュメント 3.15（3.13 で re.PatternError へ改名され ValueError の子）に従い、PatternError を ValueError 子として登録した。except re.PatternError / except re.error / except ValueError のいずれでも捕捉できる。

## 3. 照合方法と範囲（全て実測値）

裏付けは CPython 3.12.3 実走と公式ドキュメント 3.15 のみ。

1. **F-04 例題照合**：supported 184件全てのリファレンス例題をアプリエンジンで実行し、CPython 実走出力と突合（178件一致）。残り6件は CPython 3.12 に存在しない 3.13 以降の項目（re.prefixmatch、re.Pattern.prefixmatch、re.PatternError、unicodedata.isxidstart、unicodedata.isxidcontinue、fnmatch.filterfalse）で、アプリ側出力を個別に確認済み（期待値はテスト側ファイルに手書きで保持）。
2. **意味論バッテリー177件**（モジュール別に典型・境界・異常ケースを自作）：167件が CPython と完全一致。残り10件は全て説明済み（re の空マッチ代替の取りこぼし1件、3.12 と 3.15 の例外仕様差4件、設計どおり未対応2件、エンジンの `is` が不明値を返す1件、HtmlDiff のプロセス通算カウンタ差2件——内容自体はバイト単位で一致）。
3. **全範囲表突合**：unicodedata の combining / east_asian_width / mirrored は全 1,114,112 コードポイントで CPython 3.12.3（Unicode 15.0.0）と完全一致。digit 例外表128件・numeric 例外表1232件も完全一致。decimal は Nd 全680文字で導出規則を照合済み。XID_Start 666範囲・XID_Continue 775範囲は `str.isidentifier` からの導出と完全一致。
4. **stringprep サンプル照合**：ステップ401の 2,776 コードポイント × テーブル関数14件と、ステップ733の 1,519 件の map_table_b2/b3 が CPython と完全一致。map_table_b3 は差分のある全 2,055 コードポイントで照合済み。
5. **テスト**：`tests/muse-adv-b7-g3.test.js` 全298件通過（F-04 184件＋未対応14件＋F-01 91件＋異常系8件＋構造1件）。既存の math/foundation テスト 99 件も従来どおり通過。

## 4. re の既知の意味差リスト

1. **未対応エラーで停止する構文**（黙って別意味にしない）：possessive 量指定子（`a*+` 等）、原子グループ `(?>...)`、条件パターン `(?(...)...)`、`\N{...}`、文字クラス内の `\D` `\S` `\W`。
2. **空マッチの代替**：直前の空マッチと同じ位置で、空を優先する代替（例 `|a`）が非空マッチを持つ場合、その非空マッチを取りこぼすことがある（`re.finditer('|a', 'ba')` で (1,2) が欠ける）。貪欲量指定子など通常のケースは一致する。
3. **MULTILINE の行境界**：JS の `^`/`$` は `\r`、U+2028、U+2029 の前後でもマッチする（Python は `\n` のみ）。
4. **文字クラス**：Unicode モードの `\d` = `\p{Nd}`、`\w` = `[\p{L}\p{M}\p{N}\p{Pc}]`、`\s` = `[\p{White_Space}\x1c-\x1f]`（Python の str.isspace との差を吸収）。`\b` は前後参照で再現。
5. **IGNORECASE + ASCII**：折り畳みは JS の Unicode 折り畳みに寄るため、`ſ` のような文字で差が出うる。
6. **finditer 等はリストを返す**（イテレータではない。difflib のジェネレータ系関数も同様）。
7. **Match の戻り値**：difflib の Match は namedtuple ではなく通常のタプルとして返す（要素アクセスは一致、型名表示のみ差）。

## 5. Unicode の版ずれ（測定済み）

- **unicodedata.category**：JS の Unicode プロパティエスケープ由来のため、CPython 3.12（Unicode 15.0.0）と比較して 10,617 コードポイントで差異がある。内訳はほぼ全て「15.0 で未割り当て（Cn）だった文字が新しい Unicode で割り当て済み」であり、Python 3.15 の UCD 16.0 の方向と一致する。
- **stringprep.map_table_b2**：CPython は Unicode 3.2.0 の NFKC を使うが、本アプリは実行環境の NFKC を使うため、184 コードポイントで結果が異なる（全範囲照合で測定）。なお in_table_c12 の Zs 集合は 3.2.0 に合わせ、U+205F（4.0 で追加）を含めないことで CPython と一致させた。

## 6. 基盤要請・確認事項

1. **kwargs の二重評価**：`module.Class(kw=...)` の構築経路では、engine.js の stdlibModuleCall（約2580行）が kwargs を評価した後、stdlibConstruct（約2630行）が stdlibKwargs で再評価するため、kwargs 値が全て不明値（UNK）になる。G3 では kwargs が意味を持つクラス（textwrap.TextWrapper、shlex.shlex、string.Template、string.Formatter、difflib.SequenceMatcher / Differ / HtmlDiff）に**関数シャドウ**（モジュール関数として同名関数を登録し construct を直接呼ぶ）を実装して暫定回避した。基盤側で stdlibConstruct が評価済み kwargs をそのまま受け取るよう直れば、シャドウは不要になる。
2. **ネイティブオブジェクトへの属性代入が未対応**：クラス定義の attrs は読み取りのみ有効で、`obj.attr = value` が効かない。TextWrapper 等の設定変更は生成時に kwargs で行う前提とした。
3. **例外オブジェクトへ属性を保持できない**：PatternError の msg/pattern/pos を未検証とした理由。基盤に例外属性の保持が入れば supported に上げられる。
4. **統合（共有ファイル）のお願い**：G3 の取り込みには共有ファイルの変更が必要なため未実施。`advanced-engine.js` に `group-advanced-g3.js` の import を追加し、`advanced-manifest.js` の referenceParts に reference-advanced-{re,string,textwrap,difflib,unicodedata,stringprep,fnmatch,shlex}.js の8ファイルを追加してほしい（現状は math のみ登録済み）。
5. **エンジンの制約（既知として記録）**：lambda は解釈できない（difflib の key 引数等は文字列キー名のみ対応）。ネイティブ値同士の `is` は不明値を返す（`re.compile(p) is p` のような同一性判定は再現できない）。

## 7. 残存

- 上記「未検証9件」「未対応14件」は理由付きで確定（基盤要請3が解消されれば PatternError 属性5件を supported 化可能）。
- re の空マッチ代替の取りこぼし（意味差2）は、走査規則の再実装が必要なため既知の差として残す。
- unicodedata の名前・双方向クラス等のデータベース系9件は、データ表を用意する判断が別途あれば実装可能。

## 8. 作成ファイル一覧

実装（js/types/python/ 直下）：
- impl-advanced-re.js / impl-advanced-string.js / impl-advanced-textwrap.js / impl-advanced-difflib.js / impl-advanced-unicodedata.js / impl-advanced-unicodedata-tables.js（CPython 実走走査からの転記表）/ impl-advanced-stringprep.js / impl-advanced-stringprep-tables.js / impl-advanced-fnmatch.js / impl-advanced-shlex.js
- group-advanced-g3.js（8モジュールの集約、REF_G3 を export）

リファレンス（js/types/python/ 直下、全て正規形 {name, category, syntax, description, example, caution, status, returns?, source?}）：
- reference-advanced-re.js（64件）/ reference-advanced-string.js（25件）/ reference-advanced-textwrap.js（20件）/ reference-advanced-difflib.js（26件）/ reference-advanced-unicodedata.js（22件）/ reference-advanced-stringprep.js（19件）/ reference-advanced-fnmatch.js（5件）/ reference-advanced-shlex.js（26件）

テスト：
- tests/muse-adv-b7-g3.test.js / tests/muse-adv-b7-g3-expected.js（F-04 期待値。出典は CPython 実走＋3.13 以降項目は個別検証）

報告書：docs/audit/b7-g3-report.md（本書）
