# B7 G9 報告書（sys・環境データ系）

担当：sys（178件）、errno（156件）、stat（103件）、locale（85件）、platform（26件）、
sysconfig（15件）、site（15件）、gc（25件）、faulthandler（9件）、warnings（9件）。
合計 **621件**（backlog.json から自群モジュールを抽出。担当表記の sys 190件／stat 172件は
概数であり、正本の backlog 実数は上記のとおり）。

## 区分別件数

| 区分 | 件数 | 内訳 |
|---|---|---|
| 個別実装（supported・関数） | 14 | stat の S_IFMT／S_IMODE／S_ISBLK／S_ISCHR／S_ISDIR／S_ISFIFO／S_ISLNK／S_ISREG／S_ISSOCK／filemode（10）、sys.exit、sys.getrecursionlimit、sysconfig.get_path_names、warnings.formatwarning |
| 束ね値（supported・data） | 49 | stat 定数36（権限・特殊ビット19、ファイル種別7、ST_* インデックス10）、sys.float_info 本体＋属性11、sys.maxunicode |
| 例外対応付け（supported） | 1 | locale.Error（→ Exception） |
| 未対応（unsupported） | 67 | sys 43、gc 7、faulthandler 9、site 6、sysconfig 1（parse_config_h）、warnings 1（catch_warnings） |
| 未検証（unverified） | 490 | errno 156、sys 120、stat 57、locale 84、platform 26、sysconfig 13、site 9、gc 18、warnings 7 |
| 合計 | 621 | supported 64 ＋ unsupported 67 ＋ unverified 490 |

## 裁定の要点（F-16 候補は全件「実装」だったため、以下は全て再分類である）

- **stat**：POSIX で値が定まるビット定数（S_IRUSR 等）と ST_* インデックスは束ね値、
  S_IFMT／S_IMODE／S_IS*（7種）／filemode はビット演算として個別実装した。
  Windows の FILE_ATTRIBUTE_*／IO_REPARSE_TAG_*、BSD の SF_*／UF_*、Linux の
  STATX_ATTR_*、ドア／ポート／ホワイトアウト（S_IFDOOR 等と S_ISDOOR 等）は
  特定 OS 固有のため未検証に倒した（値を固定しない）。
- **sys**：エンジン自身について真であるものだけ実値化した（下記）。残りは
  実体がないもの（フック・フレーム・トレーサ・標準ストリーム・監査・JIT・
  Windows/Android 専用 API 等 43件）を未対応、環境・ビルド・起動状態の事実を
  未検証（120件）とした。
- **errno**：全156件を未検証。公式ドキュメントが「値はプラットフォーム依存」と
  明記するため、Linux の値を正として固定しなかった。errorcode の
  「番号→名前」という構造自体はリファレンスの説明文で正確に扱い、値自体は
  番号依存のため未検証とした。
- **locale**：Error の例外対応付けのみ supported。他はロケール環境依存で未検証
  （LC_* カテゴリ定数の数値も C ライブラリ依存のため固定しない）。
- **platform／sysconfig／site**：識別情報・パス・ビルド設定は環境依存で未検証。
  例外は sysconfig.get_path_names（公式ドキュメントで定まるパス名の集合）のみ
  supported。sysconfig.parse_config_h と site.StartupState 系・addsitedir は
  実体（実ファイル／sys.path の書き換え）がないため未対応。
- **gc**：操作系7件（collect／enable／disable／freeze／unfreeze／set_debug／
  set_threshold）は未対応、状態照会・DEBUG_* フラグ・callbacks／garbage は
  未検証（get_count 等の値を捏造しない。DEBUG_* の数値も公式ドキュメントに
  値が明記されないため束ね値にしなかった）。
- **faulthandler**：全9件未対応（is_enabled も実体がないため未対応と裁定）。
- **warnings**：formatwarning は純粋な書式化のため supported（書式は CPython
  実走で照合）。warn／warn_explicit／showwarning／simplefilter／filterwarnings／
  resetwarnings／deprecated はフィルタ・レジストリ意味論がエンジンにないため
  未検証。catch_warnings は未対応。警告カテゴリ（UserWarning 等）はエンジンの
  組み込み例外表に既にあるため二重登録しなかった。

## 実値化しなかった主な環境依存値（判断根拠）

| 項目 | 判断 | 根拠 |
|---|---|---|
| sys.maxsize | 未検証 | エンジンに Py_ssize_t が存在しない。CPython 64bit の 2**63-1 は CPython の事実、JS の安全整数 2**53-1 は JS の事実であり、どちらも「エンジンの maxsize」として確定できない |
| sys.float_info 以外の構造体（int_info／hash_info／flags／version_info／thread_info／abi_info） | 未検証 | int_info の bits_per_digit=30 等は CPython の内部表現、hash_info の siphash13 等は CPython のビルド事実であり、エンジン自身の事実ではない。float_info だけは属性値が全て IEEE 754 binary64 の事実（エンジンの float も binary64）ため実値化した |
| sys.argv／executable／path／platform／version／prefix 等 | 未検証 | CPython プロセスの起動・配置の事実であり、ブラウザ上のエンジンには対応する事実が存在しない |
| sys.byteorder／float_repr_style／getdefaultencoding 等 | 未検証 | ホスト・インタプリタの事実であり、エンジンについて真と確定できない |
| errno 全定数・errorcode | 未検証 | プラットフォーム依存（上記） |
| stat の OS 固有定数群 | 未検証 | 特定 OS 固有の値（上記） |
| locale の LC_*・nl_langinfo 項目 | 未検証 | C ライブラリ／ロケール依存 |
| gc.get_count／get_stats／get_threshold 等 | 未検証 | GC の実体がなく、値を捏造しない |
| platform の全関数・sysconfig／site のパス系 | 未検証 | 実行環境の識別・配置情報がエンジンに実在しない |

sys.getrecursionlimit はエンジンの実在する上限（engine.js の MAX_CALL_DEPTH = 40）を
返すため supported としたが、CPython の既定 1000 とは異なる値であり、その旨を
caution と本報告書に明記した（コーディネーターの裁定を仰ぎたい点の1つ）。

## 照合方法と範囲

- CPython 3.12.3 実走（/usr/bin/python3）：stat 定数値・S_IS*／filemode の値、
  sys.float_info の全属性と repr、sysconfig.get_path_names のタプル、
  warnings.formatwarning の書式（line 引数あり／なし）を照合した。
- 独立スイープ：stat の filemode／S_IFMT／S_IMODE／S_ISDIR／S_ISREG／S_ISLNK／
  S_ISSOCK を 116 モード（0〜0o200000 の刻み＋代表値）で CPython と全数比較し
  不一致 0。
- 公式ドキュメント（docs.python.org/ja/3.15/library/&lt;module&gt;.html）を
  各項目の source として付し、説明・裁定の根拠とした。3.13 以降の新項目
  （sys.lazy_modules 系、abi_info、warnings.deprecated 等）はドキュメントで
  存在を確認し、意味論は未検証に倒した。
- テスト：tests/muse-adv-b7-g9.test.js（54件、全合格）。リファレンス全621件の
  形状（正規形フィールドのみ・status 必須・一意性）／supported 64件の例題の
  F-04 機械照合／典型・境界・異常ケース／未検証項目が「実行時に決まる値」と
  して返る（実値化されていない）ことの検証を含む。
- 回帰確認：muse-adv-b7-foundation.test.js と muse-adv-b7-math.test.js
  （計99件）も全合格。

## 基盤要請（コーディネーターへの依頼）

1. **raise 文でのモジュール属性形の例外クラス生成**：`raise locale.Error('x')`
   がエンジンの raise 解釈で「対応外」になる（`from locale import Error` 形は
   正常に動作し、except での捕捉・親クラス捕捉も確認済み）。属性形の生成を
   raise 経路でも stdlibConstruct へ通すよう基盤側の確認をお願いしたい。
   本群の locale.Error の例題は動作する from-import 形で収載した。
2. **sys.exception／sys.exc_info の接続**：ctx に「現在処理中の例外」への
   アクセス手段がないため、両項目は未検証とした。ctx への currentException
   相当のフックがあれば再裁定できる。
3. **data 項目のアクセス時停止**：レジストリの data は値しか持てないため、
   未対応とした data（sys.stdin 等）も属性アクセス時は未検証と同じ UNK で
   返る。status との不整合として記録する（画面表示は status が正）。
4. **sys.getrecursionlimit = 40 の扱い**：エンジン事実として返したが、
   CPython（1000）との差が学習者にどう見えるか、コーディネーターの裁定を
   仰ぎたい。不可なら未検証へ格下げする。
5. **gc.DEBUG_* と stat の OS 固有定数の束ね可否**：今回は未検証に倒した。
   「ドキュメントに値が明記される定数だけ束ねる」等の統一基準があれば従う。

## 残存

- warnings の warn 系は diag 接続による部分的実装の余地があるが、フィルタの
  error 化・once レジストリ等の意味論を確定できないため未検証のままにした
  （基盤要請2と同様、警告状態を ctx で扱えるようになれば再裁定可能）。
- sys の内部項目（_jit、_emscripten_info 等）は親が UNK のため属性アクセスも
  UNK になる。status は親に準じて未対応／未検証を付けた。
- 浮動小数点等の微差：本群に超越関数等の数値計算はないため該当なし。
  float_info の repr は CPython 実走の repr と完全一致を確認した。

## 作成ファイル

- js/types/python/impl-advanced-{sys,errno,stat,locale,platform,sysconfig,site,gc,faulthandler,warnings}.js（10件）
- js/types/python/reference-advanced-{sys,errno,stat,locale,platform,sysconfig,site,gc,faulthandler,warnings}.js（10件）
- tests/muse-adv-b7-g9.test.js
- docs/audit/b7-g9-report.md（本書）

共有ファイル（engine.js、stdlib-registry.js、advanced-engine.js、
advanced-manifest.js、既存テスト）には触れていない。統合時は
advanced-engine.js への import 追加と advanced-manifest.js の
referenceParts 追加（reference-advanced-{sys,errno,stat,locale,platform,
sysconfig,site,gc,faulthandler,warnings}.js）をコーディネーターにお願いする。
