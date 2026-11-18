# 高度モード ブロックB6（C＋Python コア／組み込み）実装・監査報告

- 担当: ブロックB6 コーディネーター（フェイリス）＋ 7 実装班 ＋ 監査班（統合後に追記）
- ベース: repo-reffix HEAD bba3b26（修正バッチ13、テスト 4,597 件）
- 範囲: C（インベントリ 692 件）＋ Python 組み込み（同 528 件）の高度差分実装とブロック監査
- GitHub 書き込み: なし（本ツリーへのローカルコミットのみ）

## 1. 基盤と契約適合（コーディネーター実装）

### 1.1 C エンジン基盤

- `js/core/c-family.js` にライブラリ委譲フックを新設した。センチネル `LIBRARY_UNHANDLED` を export し、`createCFamily` の呼び出し経路の最終段（既存の全分岐で扱えなかった呼び出し）でライブラリへ委譲する。printf 書式処理は `formatPrintf` クロージャへ抽出し、printf 本体と sprintf／snprintf／sscanf で共有する（挙動不変）。`typeOf` の呼び出し式はライブラリの戻り型照会（`libraryReturnType`）を参照する。
- 統合時にモード機構コーディネーターの確定契約（`advanced-interface.md`）へ寄せ、ライブラリ導入経路を契約第5章(e)のフックへ変更した：`createCFamily` の `library` オプションは可変な `libraryFactory` として保持され、定義オブジェクトの `installAdvancedLibrary(factory)` で後付けできる。`js/types/c/advanced-engine.js` が `applyAdvancedEngine(definition, merged)` を export し、`library-advanced.js`（エリア別ハンドラの集約、重複検出付き）を導入する。`js/types/c/index.js` は高度差分を静的 import しない。エンジン本体にモード分岐は無い（導入後は単一エンジンの一部として両モードで同じ結果を返す。契約第1章）。
- エリア別ファイル：`lib-{math,string,stdlib,stdio,wide}-advanced.js`（意味論）、`ref-{math,string,stdlib,stdio,wide,unsupported}-advanced.js`（リファレンス）、`templates-advanced.js`、`glossary-advanced.js`、`advanced-manifest.js`（referenceParts 列挙）。

### 1.2 Python エンジン基盤

- Python の拡張は関数テーブルではなくパーサ／シミュレータ中核（クラス機構・値モデル・特殊メソッド発火）の拡張であり、3班の編集を `git merge-file` で3方向マージした（競合8領域はコーディネーターが解消：`iterableChecked` の形状集合と `__iter__` 判定の統合、PY_BUILTINS／ARITY／KW_ALLOWED の和集合、`eval 'attr'` の値属性処理と `getAttrClass` の併合、`binOpInPlace` の `__i*__` 発火と bytearray 処理の併合、`subGet` の `__getitem__` 発火と slice／bytes／memoryview 処理の併合、`repr`／`iter` のインスタンス対応、`callBuiltin0` への3班の case 群34件の連結）。
- 統合時の連携修正：`abs()` の複素数対応（`Math.hypot`、CPython 実走と一致）、`hash()` の複素数対応（CPython の complex_hash 式＝実部ハッシュ＋1000003×虚部ハッシュ。安全整数を超える場合は既存方針どおり「実行時に決まる値」）。
- Python には `advanced-engine.js` を置かない（manifest の `engineFile: null`）。中核拡張はフック化できないため単一エンジン本体へ実装した（§6 の差異 D-2）。

### 1.3 契約形式への変換（統合時）

- 全高度項目を契約第4章の正規形（name／category／syntax／description／example／caution／status／returns／source）へ変換し、`status` を必須とした。高度項目への `supported` 真偽値の併記は契約第3.2章に従い全件除去した。
- 基礎カタログと同名の高度項目は `referenceOverrides` へ分離した（Python の2件のみ：`open`→未対応、`str.format`→対応。C は基礎との同名0件）。
- Python 班の生データ形式（summary／pitfalls／doc／args／expected 等）は正規形へ写した（summary→description、pitfalls→caution、doc→source、id→name）。契約第4.1章の許可集合に無い `args`／`importance`／`level`／`related`／`lesson` は差分ファイルから外した（R-7 未決。検証用の `expected` は `tests/fixtures-b6-python.mjs` に保存し、各班テストは `tests/helpers-b6.mjs` 経由で合成カタログを参照する）。
- テンプレートは契約第4.2章の形（id／title／code／intro／refs／level）に統一した。Python テンプレート6件の refs は実コードの使用名からコーディネーターが選定した。用語集は両種別とも [語, 定義] ペア（契約第4.3章）。
- precache：契約第7.2章のパターン（`advanced-manifest.js`／`advanced-engine.js`／`-advanced` を含むファイル）を `scripts/precache.mjs` の除外規則として実装し、`precache.js` を再生成した（`--check` 合格）。機構側の実装が統合時に正本となる（§6 D-4）。

## 2. 裁定（インベントリ候補からの変更を含む）

正本は `~/workspace/programming-practice-audit/work/b6-notes/adjudications.md`。要約：

- **C**：Annex K の `*_s` 系68件は全件未対応（glibc 未提供・実走照合不能）。tgmath は math 項目へ一本化し引数型で振り分ける（二重計数しない）。printf／abs は基礎実装済みのため高度項目を作らない。va_*、qsort／bsearch（ユーザ定義関数・関数ポインタ不可）、div 系・localeconv・struct tm 依存の time 関数、`<complex.h>` 69件、ワイド文字列系（wchar_t 不可）は未対応。値渡しで完結するワイド関数のみ実装。malloc 系は実装（calloc は0初期化、free で寿命切り、要素数上限 16,777,216 超は NULL。モデル簡略化を caution に明記）。rand は [0, 2147483647] の「実行時に決まる値」、srand は受け取るのみで対応。ctype は引数域 EOF(-1) と 0..255 のみ（域外は未定義動作として停止）、"C" ロケール。strerror は glibc メッセージ表（0〜133 を実走で全数確認）＋未知番号は "Unknown error n"。strtol 系の endptr は NULL 完全対応、非NULL は `&p` 書き戻しを実装し統合時に実証した。sscanf は printf と同じ変換集合＋抑止＋%s／%c の幅のみ。sprintf は宛先超過を未定義動作として停止、snprintf は切り捨て＋本来の長さを返す。
- **Python**：未対応は breakpoint、help、open、__import__、quit、exit（インベントリ候補）＋ eval、exec、compile（動的実行は経路モデルと両立しない）＋ aiter、anext（非同期なし）。input は基礎実装済みのため対応のまま。copyright／credits／license は未検証（site 定数、値は版依存）。WindowsError は未検証（Windows 専用エイリアス、例外階層へは登録しない）。ImportCycleError（ImportError の子）／PythonFinalizationError（RuntimeError の子）は階層登録して対応。float.numerator／float.denominator は項目を作らない（未確認、計画 §4.1）。int 属性4件＋float.real／imag は対応で収載。特殊メソッドの非同期系5件・バッファ系2件・module 系2件は未対応、__annotate__ は未検証、クラス作成フック系（__set_name__／__init_subclass__ 等）はエンジンが発火しないため未対応（理由を caution に明記）。
- **班の独自裁定**（各班報告より）：C math 班—FP_NAN=0 等の定数と ilogb(0)=INT_MIN は glibc 実測で確定、lgamma の signgam 格納は未対応（caution 明記）。C string 班—strcmp は符号なし差の定義で実装（glibc の ±1 経路は caution 併記）、ctype 分類の戻り値は規格どおり 1/0（glibc 実値はビットマスク）。C wide 班—mblen／mbrlen の 128..255 バイトは gcc LC_ALL=C 実走に基づき -1。Python 型班—frozendict の変更系メソッドは PEP 814 正本どおり AttributeError（添字代入のみ TypeError）。Python 特殊班—要求範囲を超えて C3 線形化による多重継承まで実装、__hash__ は同一性キー前提の限界を pitfalls 明記、property.__name__ は 3.12 実走（AttributeError）と 3.15 ドキュメントが食い違うためドキュメント優先で対応とした。

## 3. 実装結果（種別ごとの件数）

カバレッジ照合（`b6-notes/coverage-check-final.mjs`）：棚卸し全行の所在を確認し、欠落0件。

### C（インベントリ 692 行・一意名 613）

高度差分 611 項目（基礎との同名0件のため上書き0件）：

| 区分 | 対応 | 未対応 | 未検証 | 計 |
|---|---:|---:|---:|---:|
| math／tgmath | 183 | 0 | 0 | 183 |
| string／ctype | 36 | 0 | 0 | 36 |
| stdlib | 25 | 0 | 0 | 25 |
| stdio（sprintf／snprintf／sscanf） | 3 | 0 | 0 | 3 |
| wide（値渡しで完結する変換・分類） | 22 | 44 | 0 | 66 |
| 未対応収載（Annex K、complex、fenv、stdio ストリーム、stdarg、threads、stdatomic 他） | 0 | 298 | 0 | 298 |
| **合計** | **269** | **342** | **0** | **611** |

テンプレート 8 件、用語集 13 件（いずれも追加分のみ）。

### Python（インベントリ 528 件）

高度差分 339 項目＋上書き 2 項目＝341 項目：

| 区分 | 対応 | 未対応 | 未検証 | 計 |
|---|---:|---:|---:|---:|
| 組み込み関数・定数・例外 | 20 | 10 | 4 | 34 |
| 組み込み型とメソッド・属性 | 172 | 0 | 0 | 172 |
| 特殊メソッド・クラス機構 | 99 | 33 | 1 | 133 |
| 上書き（str.format→対応、open→未対応） | 1 | 1 | 0 | 2 |
| **合計** | **292** | **44** | **5** | **341** |

※ 上書き2件は基礎項目の状態変更であり、新規収載は 339 件。
テンプレート 6 件、用語集 8 件（いずれも追加分のみ）。float.numerator／float.denominator は未確認のため項目を作らない（計画 §4.1）。

## 4. ブロック監査（角度カタログ全件・ブロック範囲）

監査は3班に分けて実施した：A-P（Python 意味論監査）、A-C（C の gcc 実走照合・未対応停止確認）、A-X（契約適合・モード不変性・全スイート対照）。

### 4.1 A-P（Python 意味論監査）— 完了

- **方法**：対応292件の example を CPython 3.12.3（PYTHONHASHSEED=0）と全件照合。相互作用プローブ96件（型班の値を組み込み関数班の経路へ通す等、班境界をまたぐ組み合わせ）。未対応44件＋未検証5件の停止確認64ラン。
- **結果**：example は完全一致274件、宣言済みモデル差4件（dir／globals／locals／id は「実行時に決まる値」が正）、版差14件は docs.python.org/3（3.15.2）・PEP 661／814・gh-84978／101860／114570／125420 で照合し正とした。停止確認は55件が正しく停止。欠陥18件（P1：8件、P2：7件、P3：3件）を検出し、D19（hash のプレースホルダ化）は caution 開示済みのモデル判断として欠陥としない。
- **欠陥と処置**（全件 adv-b6 本体で修正し、再現コード31件の検証プローブで全件解消を確認）：
  - D1 hash() が frozenset を unhashable と誤って拒否 → CPython 3.12 `Objects/setobject.c` の `frozenset_hash` の式を実装（shuffle 合成＋拡散。実走9ケースで完全一致を検証）。frozendict は合成規則を実走確定できないため未確定値（エラーにしない）。結果が安全整数を超える場合はエンジン既定方針どおり未確定値。
  - D2 hash(bytearray) が黙って成功 → 書き換え可能 memoryview とともに TypeError で停止。
  - D3 getattr／hasattr が型班の値（bytes メソッド、slice.stop、memoryview.nbytes、complex.real 等）で全面故障 → pyGetAttr に complex／slice／memoryview の属性群を追加し、メソッド参照の対象型を拡張。
  - D4／D5 dict の int↔complex キー統一欠落（ホスト例外文言の漏れ・二重登録） → dictKeyId で虚部0の複素数を数値キーへ統一し、参照・代入・in のフォールバックを実エントリ照合（eqByVal）へ変更。
  - D6 ユーザー定義 __eq__／__hash__ が set の重複排除・等価に効かない → 集合ファミリの等価判定を eqByVal（特殊メソッド発火）へ統一し、compare の集合等価も同経路へ。
  - D7 bytearray.take_bytes の境界意味論が docs 3.15 と逆 → 負数は末尾から数え、範囲外は IndexError に是正（項目 caution の誤写も是正）。
  - D8 memoryview.count／index のバイト列引数が部分列意味論 → 要素一致へ是正（docs 3.14／gh-125420 裁定）。型班のテスト期待値と count の example も裁定に合わせて更新。
  - D9 __dir__ 定義時 dir() が黙って誤値 → 未対応で停止。D10 __del__ が無言完了 → インスタンス生成時に未対応で停止（破棄タイミングをモデル化しない旨を明示）。D11 __init_subclass__／__set_name__ が停止せずプレースホルダ成功 → クラス生成時に未対応で停止。D12 __annotate__（未検証）がプレースホルダ成功 → 未検証で停止。
  - D13 bytearray スライス代入が虚偽の TypeError → assignTo のスライス経路で bytearray を subSet へ委譲し、int の list／tuple も受付。D14 float.from_number が __float__ を委譲しない → 委譲を追加。D15 bytes() の __bytes__ が虚偽原因で停止 → 真因（__bytes__ 未対応）で停止。
  - D16 PythonFinalizationError の caution「3.15 で追加」は誤り → 3.13（gh-114570）に是正。D17 ImportCycleError の description が docs より広い → 遅延 import の定義へ是正。
  - D18 id(x) == id(x) が未確定値になる（P3）→ 残存とする（§6）。同一性依存値（関数・クラス等）も未確定値とするエンジン既定方針と一貫させるため。

### 4.2 A-C（C 意味論監査）— 完了

- **方法**：対応269件全件の example を完全なプログラムに包んで gcc 13.3.0（-std=c11、LC_ALL=C）で実走し、エンジンの断片実行と突合。未対応342件全件の停止確認。難所の敵対・境界プローブ100件超（endptr 書き戻し、snprintf 切り捨て、sscanf 抑止・幅、malloc／free 寿命、strerror 表、ctype の EOF・域外、rand）。
- **結果**：完全一致246件、不一致23件は全件裁定済み（21件は ctype／ワイド ctype の戻り値で、glibc のビットマスク値に対し規格どおり「0以外」を返し returns 欄に明記済みの宣言どおり＝欠陥ではない。2件は下記 P3-2）。未対応342件は全件が名指しのエラーで正直に停止（黙って成功したもの0件）。難所は endptr 10/10、snprintf 5/5、strerror 6/6 が gcc と完全一致し、use-after-free・二重 free・範囲外書き込みは全て未定義動作として正しく停止した。P1 は0件。
- **欠陥と処置**：
  - P2-1 rand() の値を printf すると虚偽原因（「書式と引数型が一致しません」・未定義動作）で停止 → `formatPrintf` を是正：「実行時に決まる値」は宣言型と書式の整合だけを検査し、値はラベルで表示する。`%f` に rand()（int）を渡す場合は従来どおり真の型不一致として停止する。sprintf／snprintf も共有経路のため同時に是正された。rand の5形式＋sprintf 経由で解消を確認。
  - P3-1 NaN の符号が gcc と系統的に異なる → 実測で確定した範囲（log／log2／log1p／atanh／acosh／fmod／remainder の定義域 NaN は負、log10／asin／acos は正）を lib-math に反映し、signbit が gcc と一致するようにした（テストに固定）。printf の表示は基礎エンジンの既存決定 RG-04（NaN は符号なし "nan" で統一し、出力とメモリ表示を一致させる）を優先し、"-nan" 表示への変更は行わない（差異として §6 に記録）。
  - P3-2 modff／modfl の example が型不正な C → modff は float 形の正しい C に是正。modfl はエンジンが long double 型自体を扱わないため example は double 代用のまま据え置き、caution に「実際の C では long double で宣言すること（double* は未定義動作）」を明記した。
  - P3-3 RAND_MAX マクロがエンジンに存在しない → rand 項目の caution に「マクロ自体は使えない（未定義の名前で停止）。上限値は 2147483647」を開示した。
- **観察（欠陥としない）**：未対応項目の停止は汎用の「エラー」カテゴリで、未知関数（タイプミス）と同一文言のため、利用者からは未対応項目とタイプミスの区別がつかない。停止自体は正直であり、文言の出し分けは基礎エンジン側の事項として記録する。
- **角度カタログ**：実施＝A-01／A-02／A-03／A-10／A-11／A-12／A-14／A-17、B-07／B-16、C-04／C-07／C-10／C-11／C-12／C-13／C-14、F-01／F-04、M-01、E-07。対象外＝基本エンジン・他言語・UI／表示層・保存／公開基盤の所掌に属する角度（A-04〜A-09 等、B-01〜B-06 等、D群、E-01〜E-06 等。B6 C ライブラリ差分の意味論監査ではないため）。

### 4.3 A-X（契約・横断監査）— 完了

- **合格**：チェックリスト (a) status の付け方（全952項目で3値のみ・`supported` 併記0件）、(b) name／id 重複0件、(c) override 対象の実在（Python 2件）、(e) supported なのに未定義扱いになる項目なし（定数3件の留保つき）、manifest 整合（C／Python とも）、項目形状（全950項目＋overrides 2件で許可集合のみ・必須欠落0件）、モード不変性（C の抜き打ちで導入前後の基礎範囲コードが完全一致し、導入前は高度関数が名指しで停止、導入後に正常実行へ転じることを確認）、全テスト 4,803 件全合格。
- **欠陥と処置**：
  - P2 (f) Python 高度テンプレート5件の refs 10件が不存在の項目名（`__add__` 等）を指し死んだリンクになる → 実在名 `object.__add__` 等へ是正し、合成カタログとの機械照合で未解消 refs 0件を確認。
  - P2 (g) precache.js の陳腐化（`--check` 失敗） → 全修正の完了後に再生成し、`--check` 合格を確認（高度ファイルの混入は元々0件）。
  - P2 (d) **Python のドット形高度項目 254/291 件がコードビューの名前解決（scan・トレース参照）で到達不能** → 原因は機構側の名前解決の限界（`analyzeCode` のレシーバ型ヒントに bytes／bytearray／frozenset／memoryview が無い、数値・range 属性が基礎の束ね項目に影になる、object.__*__ が呼び出しノードにならない）であり、B6 差分側だけでは解消しない。統合時に機構コーディネーターとの共同是正が必要な引き継ぎ事項として §6 に明記する。実行意味論の誤りではないため P1 ではない。なおリファレンス一覧の名前検索からは到達できる。
  - P3 (d) 定数形3件（True／False／None）は scan 到達不能だが、リテラルとして処理され未定義名にはならない。「経路が異なる」分類として記録する。
  - P3（観察）Python のエンジン拡張がフックでなく基礎 engine.js の直接編集である点は、契約の未決事項 R-2／R-3 に触れるため違反断定せず、差異 D-2 として記録済み。

## 5. 回帰確認

- 全スイート：**4,803 件・全合格**（全監査修正後の最終実行。ベース 4,597 件＋B6 新規テスト 206 件。既存テストの無傷を確認）。
- supersede 修正2件（いずれも高度モードで実装済みになった機能に「未対応で止まる」ことを前提としていた既存テストの前提更新。最小限の変更＋理由コメント付き）：`tests/muse-fix-ref-python.test.js`（casefold／ascii）、`tests/muse-fix-batch8-ui.test.js`（str.format。CloudFormation の同名項目も Python エンジン委譲のため同扱い）。
- 監査是正に伴うテスト更新：`tests/muse-adv-b6-pytypes.test.js` の memoryview.count 期待値を裁定（要素意味論）へ更新。`tests/muse-adv-b6-math.test.js` は定義域 NaN の signbit 期待値を gcc 実測で固定（log／log2／log1p／acosh／atanh／fmod／remainder は 1、log10／asin は 0）。
- precache：全修正後に再生成し `scripts/precache.mjs --check` 合格（高度差分は precache 対象外、簡易側方式は不変）。
- カバレッジ照合：C 692 行・Python 528 行とも欠落 0 件（`b6-notes/coverage-check-final.mjs`）。

## 6. 残存・統合への引き継ぎ事項

### 契約との差異（統合時に機構側で解消または承認が必要なもの）

- **D-2（Python の engineFile: null）**：Python の高度拡張はパーサ／シミュレータ中核の拡張であり、`applyAdvancedEngine` フックでは差分化できない。manifest で `engineFile: null` とし、中核拡張は単一エンジン本体へ実装した。実行結果がモードで変わらない（契約第1章）ため実害はないが、高度差分の遅延ロード対象は Python ではリファレンス／テンプレート／用語集のみになる。
- **D-4（precache.mjs への契約適合編集）**：契約第7.2章の除外パターンを機構所有ファイル `scripts/precache.mjs` に実装し `precache.js` を再生成した（`--check` 合格）。統合時は機構側の実装を正本として、本ツリーの編集と突き合わせること。
- **R-7（許可集合外フィールド）**：契約第4.1章の許可集合に無い `args`／`importance`／`level`／`related`／`lesson` は高度差分から外した。原データは各班ツリー（`work/b6-py1` 等）と `tests/fixtures-b6-python.mjs`（expected）に残る。許可集合への追加が決まれば復元可能。
- **動的 import 化**：高度差分の遅延ロード（動的 import への置換）は機構側の作業であり、本ツリーでは静的 import のまま（テスト用に `tests/helpers-b6.mjs` が合成カタログを提供）。統合時に機構コーディネーターのローダーへ差し替えること。
- **semantics.support 文面との緊張関係**：C の `semantics.support` には「動的確保・解放は未対応」の趣旨の文面が残る一方、B6 では malloc 系をモデル実装した（寿命・上限を caution 開示）。統合時に文面を実態へ合わせて更新するか、機構側の判断を仰ぐこと。

### 統合時の共同是正事項

- **Python ドット形項目の名前解決（A-X (d) P2）**：ドット形高度項目 254 件（bytes.*／bytearray.*／object.*／memoryview.*／frozenset.*／float.*／int.* 等）が、コードビューの名前解決（definition.scan・トレース参照）で到達できない。機構側で (1) `analyzeCode` のレシーバ型ヒントへの bytes／bytearray／frozenset／memoryview の追加、(2) 数値・range 等の属性解決で基礎の束ね項目より個別項目を優先する経路、(3) object.__*__ の暗黙呼び出し・演算子経由の参照解決、のいずれか（または併用）が必要。解消するまでは当該項目へはリファレンス一覧の名前検索からのみ到達できる。項目データと実行意味論は正しく、A-P／A-X の照合でも内容面の欠陥は検出されていない。
- **printf の NaN 表示（A-C P3-1 の残存分）**：定義域 NaN の符号は値として gcc 一致させた（signbit で確認可能）が、printf %f の表示は基礎決定 RG-04 により符号なし "nan" で統一されているため、gcc の "-nan" 表示とは異なる。表示まで gcc に寄せる場合は、出力とメモリ表示の一致（R27-N10／R28-N23 の不変条件）ごと基礎側で再裁定が必要。

### 残存（既知の限界・画面開示済みのものを含む）

- **id() の同一性（A-P D18、P3）**：`id(x) == id(x)` も未確定値になる。同一性依存の値は未確定とするエンジン既定方針（関数・クラス・イテレータ等も同様）と一貫させ、残存とした。
- **frozenset ハッシュの安全整数超過**：式自体は CPython 3.12 と完全一致させたが、結果が安全整数を超える場合はエンジン既定方針どおり未確定値になる（大きな int の hash と同じ扱い）。frozendict のハッシュは合成規則を確定できないため未確定値。
- **未検証5件**（copyright／credits／license／WindowsError／__annotate__）は画面開示のうえ未検証として収載。未対応項目はすべて実行時に理由付きで停止する（黙って誤った結果を返さない）。
- テストの時間予算系フレーキー（path-cap 10,000ms）は VM 環境要因として既知であり、本ブロックの変更とは無関係（ベースツリー対照で切り分け済み）。
