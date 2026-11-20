# 監査報告：プログラミング練習（sylpica/programming-practice）

- 監査日：2026-11-20（JST）
- 対象：`main` の HEAD `40f60a3`（CI run #74：validate／validate-shells／deploy の3ジョブとも成功＝公開中の版）
- 監査者：Claude Code（報告のみ。リポジトリへの書き込み・修正・配信はしていない。使った書き込みコール数：0件）
- 位置づけ：独立監査の1ラウンド。新規の実質欠陥を検出したため、本ラウンドは**収束判定ラウンドではない**。

## 1. 結論

新規の実質欠陥を **P1相当1件・P2 3群・P3 多数** 検出した。収束はしていない。

最優先は F1（オフラインで ImageJ が実行不能。公開中の版に該当）と F2（Python 高度モードで、通っていない分岐の副作用が別パスの結果に混入する）。

## 2. 新規欠陥（検証済み）

重大度は本リポジトリの台帳の慣行（P1＝主要機能の不能、P2＝誤った結果・虚偽の表示、P3＝限定的な誤り・表記・基盤）に合わせた。

### F1【P1相当】オフラインで簡易モードの ImageJ が全教材で実行不能

- 再現：新規ブラウザで公開サイト（ローカル配信で再現）を開き、Service Worker の制御下に入ったら、ImageJ を一度も開かずにオフラインにして再読込する。ImageJ を選び任意の教材を実行すると、「1行：処理中に予期しないエラーが発生しました」となる。他の15種類は成功する。
- 真因：`js/types/imagej/engine.js` が `import{advancedEntry,…}from './engine-advanced.js'` と**空白なし**で静的 import している。`scripts/precache.mjs` の import 検出正規表現 `/(?:import|export)\s+(?:[^"']*?\s+from\s+)?…/` は空白を必須にしているため、この import を検出できない。結果として `engine-advanced.js`・`engine-advanced-pure.js`・`engine-advanced-state.js` の3ファイルが「遅延読み込み（precache 対象外）」に誤分類されている。失敗した要求は `js/types/imagej/engine-advanced.js` の1件だけで、オンラインに戻すと回復する。
- 発生条件：その世代のキャッシュで ImageJ をオンラインで一度も実行していないこと。新規インストール直後と、**新版の配信直後**（SW の activate が旧世代の実行時キャッシュを削除するため）に該当する。
- 同梱試験で見逃された理由：`tests/browser-types.py` は ImageJ をオンラインで実行してから切断するため、実行時キャッシュに入って欠陥が隠れる。`tests/muse-precache-closure.test.js` は precache.mjs と**同じ正規表現**で閉包を計算しているため、独立した角度になっていない（同じ前提を共有する角度）。
- 同根の兄弟面：空白なし import は `js/types/python/engine.js`（`../../core/conditions.js`）にもある。読み込み先が別経路で precache 済みのため現状は顕在化していない（潜在）。
- 関連：RG-681（出荷集合の分類欠陥、38ファイル）の是正の取りこぼしにあたる。

### F2【P2】Python（高度）：パス分岐の間で標準ライブラリのモジュール状態が共有される

- 再現（パスは2本列挙される）：
  ```python
  import calendar
  x = input()
  if x == "a":
      calendar.setfirstweekday(6)
  print(calendar.weekheader(2))
  ```
  `x == "a"` が偽のパスでも、出力が `Su Mo Tu We Th Fr Sa` になる（正しくは `Mo Tu We Th Fr Sa Su`）。
- 同根で確認した表面：`calendar.setfirstweekday`、`csv.register_dialect`（偽のパスの `list_dialects()` に登録名が出る）、`decimal.getcontext().prec`（偽のパスでも 3 桁になる）、`mimetypes.add_type`、モジュール属性への代入（`string.ascii_letters = "z"` が偽のパスにも出る）。
- 分離できていた表面：`random` の状態、`itertools.count` の状態。
- 補足：同じ Node プロセスで `simulate` を続けて呼ぶと、実行をまたいでも状態が残る。アプリは実行ごとに Worker を作り直すため、画面上は「実行をまたぐ漏れ」は出ない。画面に出るのはパス間の漏れである。

### F3【P2】Python（高度）：「シミュレーション対応」の使用例が実 Python では TypeError になるコードで、シミュレータはそれを受理して値を返す（30件）

実行できない例文を教えている点と、エンジンが型エラーを出さずに値を作っている点の二重の欠陥。実機判定は CPython 3.13 で行い、base64 と traceback は CPython 3.12 のソースでも同じ結論になることを確認した（csv・dataclasses・typing の3群は 3.12 のソース未照合）。

| 群 | 件数 | 例文の誤り |
|---|---|---|
| base64（a85／b16／b32／b32hex／b64／b85／encodebytes／standard／urlsafe 等）＋ quopri.encodestring | 13 | bytes ではなく str を渡している（例：`base64.b64encode('hello')`） |
| csv.writer／DictWriter とそのメソッド | 6 | ファイルではなくリストを渡している（`csv.writer(out)`、`out = []`） |
| traceback.FrameSummary とその属性、StackSummary.format_frame_summary | 9 | キーワード専用の `line` を第4位置引数で渡している |
| dataclasses.KW_ONLY | 1 | `make_dataclass` のフィールド列に `KW_ONLY` を直接置いている |
| typing.dataclass_transform | 1 | 組み込み型 `int` に適用している（実機は属性設定不可で TypeError） |

### F4【P2〜P3】Python（高度）：CPython 3.12 のソースと食い違う誤値・偽の停止（33件）

エンジン自身が CPython 3.12 準拠を明記しているため、3.12 のソースで裁定した。

| 項目 | アプリ | 正（CPython 3.12） |
|---|---|---|
| `datetime(…, tzinfo=timezone.utc).dst()` | `0:00:00` | `None`（`timezone.dst` は常に None） |
| `http.cookiejar.DefaultCookiePolicy.DomainRFC2965Match` | 2 | 4 |
| 同 `DomainStrict` | 1 | 3（NoDots\|NonDomain） |
| `ConfigParser.options('a')` | `['d', 'x']` | `['x', 'd']`（節の項目の後に DEFAULT） |
| `uuid.SafeUUID.safe.value` | AttributeError | 0（Enum） |
| `TypedDict` の `__required_keys__` 等4属性 | `set` | `frozenset`（`__readonly_keys__`・`__mutable_keys__` は 3.13+） |
| `configparser` の例外6種と `binascii.Incomplete` の `issubclass` | 偽の TypeError「クラスではない」 | True |
| `ConfigParser.read_file(['[s]', 'a = 1'])` | 偽の NoOptionError | 読める（行の反復可能体を受け付ける） |
| `email.headerregistry.Address`／`Group`、`http.cookies.Morsel`、`xml.etree.ElementTree.Element` のクラス属性13件 | 偽の AttributeError「属性がありません」 | property／属性記述子が存在する |
| `traceback.format_exception(e)`／`TracebackException.format()`／`.stack` | 最終行のみ・空リスト（注意書きなし） | `Traceback (most recent call last):` と呼び出し位置の行を含む |

### F5【P3】C++：未宣言の変数へのメンバー呼び出しが「未対応関数」と誤帰属される（両モード）

- 再現：`int main() { v.push_back(1); }` → 「この関数は説明に対応していません：v.push_back」。`s.size()`、`v.begin()` も同じ。
- 正しい原因は未宣言（g++：`'v' was not declared in this scope`）。未宣言の変数を使う同じ形を C（`p.x`）・C#（`list.Add(1)`）・JavaScript（`s.length`）・Python（`v.append(1)`）・R（`v$a`）で試すと、いずれも「未定義の名前」「NameError」と正しく出る。C++ のメンバー関数呼び出し経路だけが誤っている。
- 兄弟面（停止自体は正直だが原因が違う）：PowerShell の未定義 `$v.Add(1)` →「.NETメソッド呼び出し未対応」（実機は null 値へのメソッド呼び出しエラー）。VBA の未宣言 `s.Value` →「プロパティ value 未対応」（実機は実行時エラー424「オブジェクトが必要です」。文言でも `Value` が小文字化されている）。

### F6【P3】VBA（簡易）：「呼び出すと停止します」と書かれた4項目が実際は停止せずに実行される

- 対象：`StrConv`・`FormatDateTime`・`VarType`・`Weekday`。簡易モードのリファレンスの注意書きは「このアプリでは未対応です（参照専用の項目です）。呼び出すと関数名を挙げて停止します。」だが、実際は実行される。
- 誤値を伴う：`Dim i As Integer` の変数に `VarType(i)` が 5（vbDouble）、`TypeName(1)` が "Double" を返す（実 VBA はそれぞれ 2、"Integer"）。高度モードでは「数値を Double として保持する」と注意書きで開示済みだが、簡易モードには開示がなく、逆に「停止する」と書かれている。
- 同種の既決例：Python の `str.format` は CONV-A6-01 で注意書きを実態に合わせ済み。VBA 側がその横展開から漏れている。

### F7【P3】高度モードの開示文が、ユーザー決定で範囲を絞った種類について過大

- 表示：「高度モード：各言語・ツールの関数を網羅的に収録しています。」
- 食い違い：Power Automate（デスクトップ）は U-47 の決定で高度モードでも基礎の15件のまま。C# はユーザー決定で「代表的な項目のみ」。どちらも「網羅的」ではない。簡易モード側の開示（「全ての関数が実装されているわけではありません」）は要件どおり。

### F8【P3】検証基盤の陳腐化・可搬性（README 記載の検証手順の一部が現状失敗する）

| 対象 | 症状 |
|---|---|
| `tests/fuzz-audit.mjs` | 無限ループ用ケース表に第16種の擬似言語が無く、`undefined` をコードとして渡して例外終了する。擬似言語と高度モード（17種）はこのハーネスで一度もファズされていない |
| `tests/requirements-audit.py` | `tests/fixtures/audit-blind.json` に擬似言語のフィクスチャが無く、StopIteration で停止する（欠落時に教材コードで代替した作業用コピーでは32ケース全合格） |
| `tests/browser-audit.py` | 300,001バイトのファイルに旧文言「300KB」を期待して失敗する。現行アプリはコード長上限（10万文字）の文言を先に出し、挙動自体は正しい。この1行だけ直した作業用コピーでは15種類が合格し、擬似言語で同じフィクスチャ欠落により停止する |
| Python ブラウザ試験11本 | `executable_path='/usr/bin/chromium'` を決め打ちしていて、他環境では起動しない |
| `npm test` | 8件が「棚卸しファイル（advanced-inventory／adv-b7-tools）が無い」ため CI でも常にスキップされる |
| CI の実 cmd 照合 | 13ケースに「未定義の変数」が無く、教材の実 cmd 実行は終了コードしか見ていない |
| `tests/native-audit.py` | Python は「実行が成功したか」だけを見ていて、出力をシミュレータと照合していない（今回、私の側で照合した） |

### F9【P3】文書の乖離

- `README.md` は高度モード、第17種「Power Automate（クラウド）」、2層カタログに一切触れていない。
- `PROGRESS.md` の最終節は「deploy は未実施で公開サイトは旧ビルドのまま」としているが、run #72（46dec2c）と run #74（40f60a3）で配信に成功しており、記述が古い。

### F10【P3】性能

- 高度モードのリファレンス画面は全件を一括で描画する。Python（11,117件）で DOM 約10.8万ノード、375px 幅でページの高さ約394万px、表示まで約2.5秒（デスクトップ Chromium の実測。スマートフォン実機は未測定）。C++（4,948件）も約1.7秒。
- Python は `;` で区切った文の処理時間が2乗的に増える（`x=1;` を2,000個で2.8秒、4,000個で6.7秒。改行区切りなら4,000文でも0.07秒）。アプリでは2.5秒の監視で正直に停止表示される。

### F11【P3】保存の明示性

- 保存データ全体が壊れている場合（JSON として読めない場合）、原文は `programming-practice-recovery-v3` に退避されるが、**通知なしに**下書きが空の状態で起動する。一部だけ壊れている場合は通知が出る（README の「失敗時のみ通知」には合致するが、利用者からは無言で消えたように見える）。
- 2つのタブで同じ下書き枠を編集すると後勝ちになり、先に保存したタブの内容が通知なしに消える（RG-86／RG-588 の是正範囲は「別の枠」の消失まで）。

### F12【P3】Python（高度）：対象とする版が混在し、画面に示されていない

エンジンの中核は CPython 3.12 準拠を明記しているが、高度カタログには 3.13〜3.15 の項目・値が混在している。例として `importlib.util.cache_from_source` は `cpython-312`、`ast.TypeVar._fields` は 3.12 の形、`ast.Import._fields` は 3.15 の `is_lazy` を含み、`pickle.DEFAULT_PROTOCOL` と `token` の番号は 3.15 の値。項目ごとの注意書きで一部は開示済みだが、画面に「どの版の Python か」の表示がない。

### F13【方針違反】公開リポジトリ・公開サイトに利用者本人の氏名（ローマ字）が含まれる

- 場所：`js/types/python/templates.js`（教材 `tpl-strings` のコードと期待値。公開サイトに配信中）、`tests/fixtures/audit-templates.json`。
- CLAUDE.md の「個人情報を公開リポジトリに書かない」に抵触する。架空の名前への置き換えを推奨する。過去のコミット履歴には残る（履歴の書き換えは破壊的操作のため、別途ユーザー判断）。

### F14【要判断】アイコンの図柄が不一致

ホーム画面用 PNG 3点（11/19 にユーザー自身が差し替え：ノートPC＋パズル）と、ヘッダー・ブラウザタブの `icons/icon.svg`（旧デザイン `</>`）が別の図柄になっている。どちらを正とするかはユーザー判断。

### F15【P3】Python（高度）：「シミュレーション対応」の項目なのに、自分の使用例が未対応構文で停止する（3件）

`codecs.register`・`codecs.unregister`（例文が lambda を使い「lambda は解釈できません」で停止）、`codecs.IncrementalDecoder.decode`（例文が int のスライスで停止）。項目の状態表示と使用例の実行可否が食い違う。

## 3. 既存裁定への異議（一次証拠での決着を推奨）

### X1 cmd：バッチ内で未定義の `%VAR%` をリテラルのまま残す裁定（R26-N23）

- 現状：`echo [%NOPE%]` → `[%NOPE%]`。LANE-A1-CONV〜CONV3 で3回「実 Windows での .bat 実測なしに結論を変えない」と保留されている。
- 監査者の見解：cmd の構文解析の通説では、未定義変数は**バッチ内では空文字に置換され、対話コマンドラインでのみリテラルが残る**（このため、バッチ内の `echo %未定義%` は「ECHO は OFF です。」を出す）。R26-N23 のコメント自体がこの現象を「表面崩壊」として回避しているが、それは実 cmd の挙動である可能性が高い。
- 一次証拠：Microsoft Learn の原本（MicrosoftDocs/windowsserverdocs の set／cmd／echo）には明記が無く、本環境では確定できなかった。CI の validate-shells は `.cmd` ファイルとして実 cmd を実行しているので、ケース `('undefined','echo [%NOPE%]',[…])` を1件足せば次回の CI で決着できる。

## 4. 欠陥ではないと確認した事項（検証の実績）

| 角度 | 実施内容と結果 |
|---|---|
| E-07 テスト実測 | `npm test`：UTC・JST の両方で 7,545 合格／0 失敗／8 スキップ。`precache.mjs --check` 合格 |
| CI・配信 | run #74 の3ジョブ（validate／validate-shells／deploy）の成功を API で確認 |
| A-03 実処理系との差分照合 | 同梱 native-audit 297件合格（C# 59件は dotnet が無いため未実行、CI で実行済み）、新オラクル61件合格。簡易 Python 217件中216件が CPython と一致（残る1件は `input()` の仕様どおりの未確定表示）。JavaScript 30件中28件一致（2件は表示形式・`prompt` の仕様差）。C／C++ の高度テンプレート26件が gcc／g++（C17／C++23）と全件一致 |
| A-03 高度 Python | 対応項目（単一パス・確定値のもの）3,756件を CPython 3.13 で照合し、3,564件一致。差分192件の内訳は、実機が ModuleNotFoundError／AttributeError／NameError になる85件（大半は 3.14／3.15 で追加された機能で、項目に版の注記あり。手元の 3.13 では裁定できない）、出力差54件、実機だけが TypeError 等になる32件、シミュレータだけが停止する21件。版で説明できないものを CPython 3.12 のソースで裁定し、F2〜F4・F12・F15 に計上。`re.PatternError`・`plistlib.InvalidFileException` の2件は未裁定 |
| A-02 ブラインド解き直し | R・cmd・PowerShell・擬似言語の教材6件を、出力を見ずに手で解いて機械比較。4件一致。R の2件は「c(...) 表記」で、画面で開示済みの表示仕様の差（設計判断） |
| C-12 宣言×挙動マトリクス | 簡易1,403件・高度19,630件の使用例を全件実行。簡易の不一致は F6 の4件のみ。高度で「対応」なのに使用例が未対応停止する216件のうち、JavaScript 177件は既存の残存 R-B5-04（図式的な例文 `obj.method(...)`）と R-B5-09（Float16）に該当し、新規に数えない。C++ 36件（`<algorithm>` 等）は受け手 `v` を宣言しない断片で、停止理由の誤表示を F5 に計上。Python 3件は F15 |
| C-13 メタモルフィック | 同じ基礎項目の簡易／高度の結果を比較（41件の差）。高度側の機能拡張による正当な差と、例文の差し替えによるものを除くと、新規は F6 のみ |
| D-01／D-02 実ブラウザ | 375／1440px × 簡易16種＋高度17種 × 4画面＝264ケース：横はみ出し・文字切れ・実質縦書き・コンソールエラーは0件（検出器が機能することも確認）。同梱の browser／browser-types／templates-audit／storage-audit／extension-audit は合格。browser-audit・requirements-audit は F8 の陳腐化で停止（作業用コピーで続行した範囲は合格） |
| D-03 キーボード | 全フォーカス位置にフォーカス表示あり。エディタ内 Tab は字下げ、Esc→Tab で脱出 |
| E-01 保存 | 破損データの原文退避、モード保存値が不正なときの簡易モードへのフォールバック、容量超過の通知を確認 |
| E-02 オフライン | F1 以外の15種類は、インストール直後のオフラインで教材を実行できる。一度も開いていない種類の高度データは「読み込めませんでした」と正直に注記される |
| E-03 取り込み | 上限の境界（300,000／300,001／307,200／307,201バイト）で正しい拒否文言 |
| E-09 XSS | Python／JavaScript／VBA／PowerShell／R のコード・出力、モデル JSON に HTML 片を入れても実行・挿入されない。ダイアログも出ない |
| B-01 ファズ | 17種×両モード×約83ケース（BOM・ゼロ幅空白・CR・全角・スマート引用符・深い入れ子・20万文字等を含む）：ホスト例外の漏れ・クラッシュ・無応答はいずれも0件 |
| E-06 旧名 | 画面に出るファイルに「VBA練習」「マクロ練習」の残存はなし |
| セキュリティ | API キー・トークンの混入なし |
| アイコン | 180×180／192×192／512×512 の実物 PNG |
| モード開示（簡易） | 要件どおり「全ての関数が実装されているわけではありません」を表示 |

検証の上で取り下げた候補：`statistics.NormalDist.samples(seed=42)`（CPython 3.12 のアルゴリズムで計算すると完全一致）、ImageJ の `File.open` が返す `"~0~"`（ImageJ 本体ソース `Functions.java` と一致）、Python の `random` を含むモジュール概説3項目（既存の裁定どおり）。

## 5. 角度カタログの実施状況

既存カタログ（`docs/audit/muse/audit-angle-catalog.md`、A〜E群）に対して：

- 実施：A-01（部分）、A-02、A-03、A-17（部分）、B-01、B-11、B-13〜B-15（ファズのコーパスに含めた）、C-03、C-12、C-13、C-14、D-01、D-02（375／1440px、200%は同梱 browser.py で確認）、D-03、D-15、E-01〜E-03、E-06、E-07、E-08（代替検証）、E-09〜E-11
- 新設を提案する角度：
  1. 出荷集合の閉包を**別の手法**で計算すること（正規表現ではなく実際のモジュール解決。今回は寛容な正規表現と動的 import 追跡で再計算した）
  2. 「一度も開いていない種類」を含む、インストール直後のオフラインでの全種類実行
  3. 複数パスを持つプログラムでのパス間の状態分離（全言語）
  4. リファレンスの使用例を実処理系で実行すること（現状、Python は「実行成功」しか見ていない）
- 未実施：A-04〜A-16、B-02〜B-10、B-12、B-16〜B-17、C-01〜C-02、C-04〜C-11、C-15〜C-16、D-04〜D-14、D-16〜D-17、E-04〜E-05
  - 理由：本ラウンドの最初の角度群で新規の実質欠陥が出たため、収束判定ラウンドにはならないと確定した。そのため、既存ラウンドと前提を共有しない独立した角度（実処理系による照合・インストール直後のオフライン・宣言と挙動の全数照合・パス間状態）を優先した。収束判定には、修正後のビルドで全角度を実施する必要がある。

## 6. 制約（未確認事項）

- 公開URL（github.io）は本環境のネットワーク方針で遮断されていた。PROGRESS の記載どおり公開URLの直接操作は Muse の担当であり、本ラウンドでは deploy ジョブの成功と、配信物が HEAD のチェックアウトから直接コピーされる構成であることの確認で代替した。F1 は公開中の版にも該当する見込みが高い（未実測）。
- 一次資料のWebページ（docs.python.org、learn.microsoft.com、cppreference）は遮断されていた。代わりに GitHub 上の原本（CPython 3.12 の Lib、ImageJ のソース、MicrosoftDocs のドキュメント原本）と、実処理系（CPython 3.13.18、gcc／g++ 13.3、Node 22、Chromium）を使った。
- R・PowerShell・cmd・.NET の実処理系はこの環境に無い（シェル2種は CI の Windows ジョブが照合している）。
- iOS・Android の実機は未確認。

## 7. 推奨する修正の順序

1. F1：`scripts/precache.mjs` の import 検出を空白なしの形にも対応させる（あるいは対象ファイルの import を整形する）。閉包の試験を別手法で作り直す。precache を再生成する。インストール直後のオフラインで全種類を実行する試験を追加する。
2. F2：Python の標準ライブラリ実装が持つモジュール状態を、パスの分岐時に複製する（random と同じ扱いにする）。兄弟面を全数掃く。
3. F3・F4：誤った例文30件を正しいコードに直し、エンジンに型検査を入れる。F4 の誤値を 3.12 のソースに合わせる。
4. F13：教材の人名を架空の名前に置き換える。
5. F5〜F12・X1：表記・基盤・文書の是正。X1 は CI にケースを1件足して実 cmd で決着させる。
