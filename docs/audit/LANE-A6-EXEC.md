# 高度A6班（C＋Pythonコア）監査・修正報告

- 土台：repo-reffix HEAD 04dfe2d の完全コピーを `work/lane-a6-exec/` に作って作業した。repo-reffix 本体・共有記録ファイル（台帳・状態ファイル・DEVELOPMENT.md・PROGRESS.md）には触っていない。GitHub 書き込みなし。
- 計画正本：`lanes/lane-a6/plan.md`／`probes.md`（Python 42件／C 44件、角度92件の判定付き）。期待値は一次情報（C11、Python 公式文書、CPython ソース、glibc 実測）からブロック監査と入力を変えてブラインドに確定した。
- 実施体制：読み取り専用の実測3班（Python班／C班／横断スイープ班）＋本コーディネーターの裁定・修正。外部所見はすべて一次情報・実測で裏取りしてから採用した（CF-01 の裁定覆しがその最たる例。下記）。

## 1. 実施角度と結果の要約

| 角度 | 件数 | 結果 |
|---|---|---|
| プローブ Python（PY-01〜42） | 42 | 一致36／宣言済みモデル差5／ドット形記録1（§7）／欠陥候補0。期待値側の誤りを2件裁定（PY-05 は実CPython の sum 補償加算で 1.0 が正。PY-20／PY-21 は docs 3.15 系機能で 3.12.3 に存在しない版差） |
| プローブ C（C-01〜44） | 44 | 一致29／宣言済みモデル差13／欠陥候補2（C-21→CF-01、C-34→CF-06）。C-21 の期待値は CF-01 裁定で「アプリが正しい」に確定 |
| C-12 全数スイープ Python コア | 341 | 宣言どおり332／不一致9（→PYF-01〜04）。定義のみで発火しない未対応5件は実CPython でも合法として観察裁定 |
| C-12 全数スイープ C 高度差分 | 611 | 全件宣言どおり（対応269はエラーなく完了、未対応342は全件名指し停止。無言の成功・ホスト例外漏れ0） |
| 再導出（§2） | 7系 | frozenset ハッシュ／dict・set キー等価／ctype 表／strerror 表／printf マトリクス／NaN 符号表／malloc 寿命モデルを実施 |
| §6 必須5視点（§3） | 5 | 全て実施。モード不変性は修正前・修正後とも差異0 |
| F-02 三方向突合 | C 692行／Pythonコア 528行 | C は全名が1件・状態付き・検索到達可能。Python コアの欠落は2件のみ（SWF-01、未確認のまま記録） |
| 高度テンプレート trace 走査 | 14本 | 全件実行成功、内部トークン漏れ0、出力は intro の主張と全件一致 |
| 用語集 F-03／J-01 文面走査 | 21件／952件 | 誤り0／記録すべき異常0（生ヒット46件は全て正当な記法） |

## 2. 再導出の結果（実装式・表そのものの検証）

- **frozenset ハッシュ**：エンジン式は CPython `Objects/setobject.c` の `frozenset_hash` と項単位で一致。独立転記は実CPython とランダム300集合で 300/300 一致、アプリのスポットチェックも完全一致。
- **dict／set キー等価**：1／True／1.0／complex(1,0) 等の等価クラス、カスタム __eq__／__hash__ の発火・例外伝播まで全件一致。**ハッシュ未確定値の等価性は安全**（未確定同士の == は一貫して未確定に倒れ、偽の True／False なし。証明可能に True な比較まで未確定になる点は hash／id 項目 caution が宣言するモデル差として裁定）。
- **ctype 分類表**：11関数 × -1..255 ＝ 2,827点、規格・実gcc・アプリの3者全点一致。戻り値 1/0 化は returns 欄の宣言どおり（F-04 合格）。
- **strerror 表**：0..133 全数＋未知番号で不一致1件のみ（96番 → CF-04 修正済み）。
- **printf 書式マトリクス**：宣言範囲内（%d %i %f %s %c %u %% の素形）は printf／sprintf／snprintf／sscanf の4経路とも実gccと一致。範囲外は全経路で正直に停止。
- **NaN 符号表**：CF-01 裁定参照（§4）。glibc **実行時**セマンティクスではアプリの固定符号表が全14点で一致（log／log2／log1p／atanh／acosh／fmod／remainder／sqrt／pow／0.0/0.0 は負、log10／asin／acos／tgamma(-1) は正）。
- **malloc 寿命モデル**：calloc 0初期化・free後使用・二重free・realloc（データ保持）は裁定どおり。範囲外アクセスの緩み → CF-03 修正済み。

## 3. §6 必須5視点（Python コア拡張の回帰震源対策）

1. **基礎テスト全件**：全スイートで担保（§6）。
2. **モード不変性**：基礎テンプレート16本＋example付き基礎リファレンス234件＝250件を、統合ツリー簡易モードと deliver-stage18（バッチ13ビルド d2f2198）で機械比較 → **差異0件**。本班の修正（コアエンジンへの PYF-04 追加等）を入れた後にも同じ比較を再実行し、**差異0件**を再確認した。
3. **モード往復・非破壊性**：mergeCatalog 前後で基礎 reference／templates／glossary は完全一致。Python `open` オブジェクト不変（merged 側でのみ unsupported に上書き）。往復後の基礎テンプレート16本も結果不変。merged 件数 C 638／Python 11,117、problems 0。
4. **C ライブラリ導入の冪等性**：未有効化では strtol／strerror／isalpha が名指し停止（基礎挙動）。applyAdvancedEngine 2回適用後もプローブ3件は1回目と完全一致、カタログ件数不変。
5. **referenceOverrides 2件**：`open` は unsupported に上書き、`str.format` は supported に上書きされることを確認。str.format の旧フィールド矛盾は PYF-05 で是正。

## 4. 新規欠陥と修正

### Python

| ID | 重さ | 内容と真因 | 修正 |
|---|---|---|---|
| PYF-01 | P2 | `object.__trunc__`／`__floor__`／`__ceil__` は supported 宣言で文面も「math.trunc 等で呼ばれる」と明記するのに、math 経由では TypeError で各項目の example 自体が失敗。真因：`impl-advanced-math.js` の `unaryInt` が dunder 委譲より前に `numArg` で型検査して弾いていた | `unaryInt` がインスタンスの対応 dunder を先に発火させ、整数の戻り値を検証する（非整数の戻り値は TypeError、CPython の Integral 規則どおり） |
| PYF-02 | P2 | `object.__length_hint__`（unsupported）の example が停止せず誤値 `0` を無言で返す（実物は5）。真因：`impl-advanced-operator.js` の `lengthHintImpl` のインスタンス分岐が `__len__` しか見ず、無ければ既定値に倒れていた | クラスが `__length_hint__` を定義していれば object.__length_hint__ の名指し未対応停止にする（CPython は __len__ より __length_hint__ を優先するため、両定義時も停止が正） |
| PYF-03 | P3 | `anext` の例題 `anext(aiter([1, 2]))` は内側の aiter 呼び出しが先に評価され、anext でなく aiter の名前で止まる（エンジンの評価順自体は正しい） | 例題を `anext(aiter)` に変更し、anext 自身を名指して止まる形にした |
| PYF-04 | P3 | 未対応4件が項目を名指しせず停止：`object.__mro_entries__`（汎用の bases TypeError）、`object.__missing__`（「__getitem__ が定義されていません」は原因として誤導的）、`object.__complex__`、`object.__buffer__`（`__release_buffer__` も同じ停止に帰着） | コアエンジン（`js/types/python/engine.js`）の各経路で、原因となった dunder を名指す未対応停止を追加。__mro_entries__ は class 文と type() 3引数形の両方（兄弟横掃）。__missing__ は dict 派生クラスに限定（素のクラスでは従来の __getitem__ TypeError が正） |
| PYF-05 | P3 | 合成カタログの str.format 項目に旧形 `supported: false` が `status: "supported"` と併存（表示は itemStatus が status 優先のため正常だったが、データ自己矛盾。横断班 SWF-02 と同一件） | override 側に `supported: true` を明記し両フィールドを一致させた。回帰テストで合成カタログ全件の矛盾ゼロを固定 |

### C

| ID | 重さ | 内容と真因 | 修正 |
|---|---|---|---|
| CF-01 | （欠陥にあらず） | C班は「定義域 NaN の符号表が一般形で誤り（atanh／acosh／fmod）」と報告したが、コーディネーターの独立実測で**アプリが正しい**と裁定。C班の期待値は `signbit(f(リテラル))` を1つの printf 式に書いたため gcc が MPFR でコンパイル時畳み込みした値であり、glibc の実行時セマンティクスと異なる。引数を実行時に与える2形式（argv 経由／noinline 分離）で測ると、アプリの固定符号表が全点一致する。B6 の固定表も実行時測定由来で正しかった | アプリは変更しない。実行時表を回帰テストで固定し、畳み込みの罠をテスト内コメントに明記（将来の監査が再び誤検出しないため） |
| CF-02 | P2 | 非NULLポインタと NULL の比較が「このポインタ比較・演算は未対応です」で停止し、確保成功時の定石 `if (p == NULL)` が書けなかった（NULL は JS の null で isPtr でない）。派生観察：NULL 参照が汎用文言「処理を完了できませんでした」に化けていた | `binary` のポインタ分岐で ==／!= を具体評価（ポインタ対 NULL、ポインタ対整数0、ポインタ同士は object＋offset の同一性）。関係演算は未対応停止を維持。NULL 参照は deref／targetPointer／添字読みの各経路で「NULLポインタの参照／へのアクセスです」と名指す |
| CF-03 | P2 | ヒープ範囲外アクセスの緩み。真因：確保（`lib-stdlib-advanced.js` の allocObject）は char 型メモリに**バイト数**の values を作るが、ポインタの offset と境界検査は**要素単位**だった（malloc(2*sizeof(int))＝8スロットに int* の添字0〜7が通り、書き込みが無言で成功、読みは「未初期化」と誤帰属） | 共通チョークポイント `deref()` に要素型を渡し、要素幅がメモリ要素幅より広い場合だけバイト単位で判定（(offset+1)×要素幅 ≦ バイトサイズ）。ポインタ形成（binary の +/-）も同じくバイト判定。要素型の導出はポインタ側オペランドへの再帰（`pointeeTypeOf`）で行い、`*(p - 1)` 形で typeOf の算術型畳み込みに引きずられないようにした。char アクセス・スタック配列・C++／C# の経路は不変 |
| CF-04 | P3 | strerror(96) の文面誤り（アプリ "Protocol family not supported by protocol"、glibc 正 "Protocol family not supported"） | `lib-string-advanced.js` の表を1行修正 |
| CF-05 | P3（部分成立） | sprintf／snprintf の caution に printf 書式の対応範囲の開示がない、との指摘。実測では両項目とも**説明文に受理範囲の記載があった**（sprintf は変換列挙付き、snprintf は「printf と同じ」まで）。残る差は snprintf の説明文に変換の列挙がない点のみ | snprintf の説明文に変換列挙（%d %i %s %f %c %u %%）を追加し、sprintf と揃えた |
| CF-06 | P3 | `double complex z = ...` が汎用 SyntaxError「; が必要です」で止まり項目を名指ししない（div_t は名指し停止と対照的） | 宣言パーサ前段のトークン走査に複素数型宣言の検出を追加し、div_t と同方式の名指し停止（「型 double complex の宣言は未対応です」）にした。変数名としての complex（`int complex = 3;` 等）は形で区別して誤停止しない |
| CF-07 | P3 | `printf("%s", rand())` が型検査をすり抜けてラベル出力で完了する。真因：`formatPrintf`（c-family.js）の未確定値ブランチが %s の宣言型検査を省略していた（B6 P2-1 裁定は「未確定値は宣言型検査のみ＋ラベル表示」であり、rand の宣言型 int は %s と不一致で停止すべき） | 未確定値ブランチに %s の検査を追加（char ポインタ／char 配列の宣言型のみ通過） |

### 自分の修正が起こした回帰（是正済み）

- CF-03 の初版は、逆参照の要素型を `typeOf(式)` から取ったため、`*(p - 1)` 形で算術型（int）に畳まれ、char 配列への正当なアクセス（B6S memchr テスト）を範囲外と誤判定した。全スイートで検出し、要素型導出をポインタ側オペランドへの再帰（`pointeeTypeOf`）に改めて是正。回帰テストに同形（memchr＋`*(p - 1)`、ヒープ int の `*(p + 1)`／`*(p + 7)`）を追加した。

## 5. ドット形到達記録（横断班引き継ぎ・本班では修正しない）

計画 §7 の6フィールドによる記録。是正はしない（実行意味論・項目データの誤りではなく到達経路の問題。検索でも届かない場合は無かった）。

| # | (1) 項目名 | (2) 検出した表面 | (3) 最小コード | (4) 期待される解決 | (5) 実際の挙動 | (6) 合成カタログの名前検索 |
|---|---|---|---|---|---|---|
| D-1 | object.__add__（scan の解決先） | コードビューの scan／simulate | `print((5).__add__(3))` | supported 宣言の object.__add__ に届き 8 を返す（実 CPython） | scan は object.__add__ を返すが、実行は `AttributeError：int には「__add__」という属性（メソッド）はありません` で停止 | 到達可（object.__add__、status=supported が存在） |
| D-2 | object.__len__（scan の解決先） | コードビューの scan／simulate | `print([1, 2, 3].__len__())`（`"abc".__len__()` も同型） | supported 宣言の object.__len__ に届き 3 を返す（実 CPython） | scan は object.__len__ を返すが、実行は `AttributeError：list には「__len__」という属性（メソッド）はありません` で停止 | 到達可（object.__len__、status=supported が存在） |

- 備考1：PY-36（`(258).to_bytes(...)`、`int.from_bytes(...)`）は高度モード scan が正しく解決し実行も一致。ただし簡易モード（基礎定義）の scan では `(258).to_bytes` 形のリテラルレシーバから int.to_bytes の ref が出なかった（基礎側 scan の表面差として併記）。
- 備考2：PY-37（range.start／stop／step）は scan が正しく解決し実行も一致。
- 備考3：カスタムクラスで定義した特殊メソッドの明示呼び出しは動作する一方、組み込み型の値への明示的なダンダー呼び出しだけが AttributeError になる形。項目自体はカタログに存在し検索到達も可能なため、本班の欠陥には数えず横断班への引き継ぎとする。

## 6. テスト結果

- **基準線の裁定**：着手時点の全スイート（UTC）で 7,164件中5件失敗したが、全てパス上限・時間予算系の既知フレーク族（audit／cmd／engine／powershell の2000パス系＋P-N4 のC準備コスト）と裁定。単体再実行と原ツリー（repo-reffix）対照で裏付けた（cmd は単体で原ツリー・自ツリーとも通過。powershell は単体でも原ツリー・自ツリーとも同じく10秒予算超過で失敗＝このVMの負荷状態に依存する既存事象で、本班の変更対象外のエンジン）。
- **修正後の全スイート（UTC）**：**7,179件中 7,178件合格**。唯一の失敗は powershell のパス上限テスト（上記の既存フレーク、原ツリー対照で同一失敗を確認済み）。途中の実行で B6S memchr の回帰を1件検出し、是正後に当該ファイル群71件と全スイートで再確認した。
- **JST スポット確認**：`tests/adv-b2-wdl.test.js` は TZ=Asia/Tokyo で既知の RG-630（B2-WDL (f2) formatDateTime のタイムゾーン依存）1件のみ失敗し、TZ=UTC では全通過。基準線どおり。
- **回帰テスト**：`tests/muse-lane-a6-exec.test.js` を新設（15件：PYF-01〜05、CF-02〜07、CF-01裁定の符号表固定、CF-03回帰形、C++／C# 共有核スモーク）。全件合格。
- **precache**：コアファイル（c-family.js／python engine.js）の変更に伴い再生成し、`scripts/precache.mjs --check` で一致を確認（キャッシュ名 programming-practice-f274ec260fe569）。

## 7. 残存・未確認

- **CF-08（P3／未確認、記録のみ）**：中規模 calloc（約400,000要素〜）はステップ上限で停止し、上限ちょうど（char要素16,777,216）の成功は制限内で到達不能。値の捏造・無言の打ち切りはなく告知つき停止のため欠陥にしない。CF-03 修正後もこの性質は不変であることを確認した。
- **SWF-01（未確認）**：Python `float.numerator`／`float.denominator` がカタログに無い（F-02 唯一の欠落）。ただし棚卸し自身の「未確認」節の項目であり、CPython 3.12.3 実測では float に当該属性自体が存在しないため、欠落が正しい可能性が高い。Python 3.15 系列 docs での一次確認が格上げの条件（本班では未実施）。
- **SWF-03（観察）**：逆方向で対応先のない項目3件（C `NULL`、Python `rangeの属性`、`__annotations__`）は全てバッチ13基礎項目で、スナップショットとの件数差と正確に対応する。処置不要。
- C-12 の Python 対応289件は「エラーなく完了」までの確認で、出力値の全数実物照合は未実施（プローブ・再導出・スポットで別角度から担保した）。
- 下書き保全（localStorage）のモード往復はヘッドレスで測定不能のため未実施（実行結果の往復不変性は実測済み）。
- `iterOrPtrAdvance`（C++ イテレータ前進）はコンテナ基準のモデルでバイトメモリではないため CF-03 の対象外とした。生ポインタの前進は binary の +/- 経路を共有し、そちらはバイト判定を入れた。
- PYF-02 の代替案（object.__length_hint__ を supported に昇格して実装する）は採らなかった。B6 の未対応裁定を維持し、名指し停止に倒した。昇格の是非は親工程の判断事項として残す。

## 8. 触ったファイル

- `js/core/c-family.js`：CF-02（等価比較・NULL名指し）、CF-03（deref バイト判定・pointeeTypeOf／byteSizeOf ヘルパー・ポインタ形成のバイト判定）、CF-06（複素数型宣言のトークン走査）、CF-07（formatPrintf の %s 宣言型検査）
- `js/types/python/engine.js`：PYF-04（__mro_entries__／__missing__／__complex__／__buffer__ の原因名指し）
- `js/types/python/impl-advanced-math.js`：PYF-01（unaryInt の dunder 委譲）
- `js/types/python/impl-advanced-operator.js`：PYF-02（length_hint の名指し停止）
- `js/types/python/ref-builtins-advanced.js`：PYF-03（anext 例題）
- `js/types/python/ref-types-advanced.js`：PYF-05（str.format override の supported 明記）
- `js/types/c/lib-string-advanced.js`：CF-04（strerror 96番）
- `js/types/c/ref-stdio-advanced.js`：CF-05（snprintf 説明文への変換列挙追加）
- `tests/muse-lane-a6-exec.test.js`：新規（回帰テスト15件）
- `precache.js`：再生成
- `docs/audit/LANE-A6-EXEC.md`：本報告書

## 9. 注記

本班の合格はアプリ全体の収束ではない（U-46）。収束判定は全班合流の全角度ラウンドで新規の実質的欠陥がゼロになった場合にのみ行う。ドット形2件（D-1／D-2）は横断班への引き継ぎとして本報告書 §5 に記録した。
