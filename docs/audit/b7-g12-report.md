# B7 G12 報告書（CLI・テスト・デバッグ・ログ・インポート系）

担当範囲：argparse／optparse／getopt／cmd／doctest／unittest（＋mock）／bdb／pdb／
profile／pstats／tracemalloc／timeit／trace／sched／queue／logging（＋handlers／config）／
importlib 一族。バックログ自群分は **907件**（backlog.json の module 欄で抽出。
current 欄は重複判定に使っていない）。

## 区分別件数（F-16）

| 区分 | 件数 |
|---|---|
| 個別実装（supported の class/method/function） | 292 |
| 束ね値（supported の attribute/data） | 149 |
| 例外対応付け（supported の exception 18種） | 18 |
| 未対応（unsupported） | 129 |
| 未検証（unverified） | 319 |
| 合計 | 907 |

status 別では supported 459／unsupported 129／unverified 319。
モジュール別内訳は生成時の集計どおり（例：logging 103件中 supported 94、
unittest 140件中 supported 92、argparse 32件中 supported 22、
logging.handlers 68件中 supported 13・unsupported 55、importlib.abc は全34件 unverified）。

## 実装の要点と裁定（モジュール別）

- **getopt（4/4 supported）**：純粋実装。長いオプションの一意接頭辞、曖昧時の
  文面「option --X not a unique prefix」まで CPython 実走と一致。GetoptError は
  例外対応付け（str は msg と一致）。msg/opt 属性は例外値の固定属性として
  エンジンから読めない（基盤要請1）。
- **queue（23/23 supported）**：Queue/LifoQueue/PriorityQueue/SimpleQueue の
  非ブロッキング意味論を実装。**裁定**：単一スレッドのシミュレーションでは
  待機を再現できないため、timeout 指定時も待たずに Empty/Full を即時送出する
  （CPython との差異）。timeout<0 の ValueError、task_done の過剰呼び出し
  ValueError、unfinished_tasks 計数、join は未完了時に diag で差異を明記して
  進む。ShutDown（3.13+）は shutdown 後の put/get の例外として実装。
  PriorityQueue の同順位要素の順序は安定ソート近似（CPython はヒープ順）。
- **sched（7/7 supported）**：timefunc/delayfunc 注入前提で enter/enterabs/
  cancel/empty/queue/run を実装し、フェイククロックで検証した。
  イベント実行時の kwargs 渡しは ctx.call が位置引数のみのため未対応範囲。
- **argparse（22 supported／1 unsupported／9 unverified）**：ArgumentParser の
  解析を実装（action 群 store/store_const/store_true/store_false/append/
  append_const/count/help/version/BooleanOptionalAction、nargs None/?/*/+/整数、
  choices、type 変換（ctx.call）、default、required、相互排他グループ、
  サブコマンド、長いオプションの省略形、'--' 終端）。**裁定**：解析失敗は
  CPython の stderr 出力＋SystemExit(2) を、エンジンでは SystemExit 例外として
  送出し、メッセージに「<prog>: error: <詳細> (exit code 2)」を含める形にした。
  parse_args(args=None) は sys.argv が無いため空リストとして扱い diag で明記。
  FileType は実ファイルを開くため unsupported。parse_intermixed_args 系・
  register・各 HelpFormatter の整形差異は unverified。
  Namespace の動的属性は基盤要請1の workaround（dest 判明時にクラス定義の
  attrs へ登録）で実現した。
- **optparse（39 supported／2 unverified）**：OptionParser/Option/Values/
  OptionGroup と型（string/int/long/float/choice）・action 群・callback
  （引数形式は簡略）・interspersed 切替を実装。エラーは argparse と同じ
  SystemExit 裁定。BadOptionError 等5例外は対応付け（階層つき）。
  Option.TYPE_CHECKER と get_option_group は unverified。
- **cmd（17 supported／1 unsupported／4 unverified）**：parseline は CPython
  実走どおり（'?foo'→help、'!ls'→(None,None,'!ls')、空行→(None,None,'')）。
  クラス属性は束ね値。cmdloop は対話入出力前提で unsupported。onecmd は
  ユーザー定義サブクラスの do_* 実行が到達不能のため unverified（基盤要請3）。
- **doctest（41 supported／1 unsupported／29 unverified）**：DocTestParser
  （get_examples/parse/get_doctest）、Example/DocTest のデータ形、フラグ定数、
  OutputChecker（完全一致・<BLANKLINE>・ELLIPSIS・NORMALIZE_WHITESPACE）、
  script_from_examples、TestResults を実装。DocTestRunner/testmod 等の実行系は
  エンジンの simulate へ委ねられないため unverified、testfile は unsupported。
- **logging（94 supported／3 unsupported／6 unverified）**：Logger 階層・伝播・
  実効レベル、Formatter（% 形式・{ 形式・$ 形式、datefmt）、LogRecord
  （getMessage の % 書式展開）、Handler/StreamHandler/NullHandler/Filter/
  LoggerAdapter、basicConfig、レベル定数と getLevelName 系を実装。
  **裁定**：StreamHandler の出力先はエンジンに無いため整形済みレコードを
  diag（シミュレーション注記）へ出し、ハンドラ内にも保持する（print 出力とは
  別系統）。LogRecord.created は決定的に 0.0 とし、asctime の絶対値（環境の
  タイムゾーン依存）は検証対象にしない。FileHandler は unsupported。
  captureWarnings/getHandlerByName/getHandlerNames は unverified。
- **logging.handlers（13 supported／55 unsupported）**：MemoryHandler と
  QueueHandler（自群 queue 実装への enqueue まで）と BufferingHandler を実装。
  ファイル／ソケット／SMTP／SysLog／NT／HTTP／ローテーション系と
  QueueListener（スレッド前提）は unsupported。
- **logging.config（3 unsupported／1 unverified）**：dictConfig/fileConfig/
  listen は unsupported、stopListening は unverified。
- **unittest（92 supported／2 unsupported／46 unverified）**：TestCase の
  assert 群（assertEqual 等の失敗メッセージ書式、msg の位置・キーワード両形、
  longMessage の「標準文 : msg」連結まで）を直接生成して呼ぶ形で実装。
  TestResult/TestSuite の計数・保持、TestLoader の固定属性、skip 系デコレータ、
  SkipTest 対応付けも実装。**基盤検証の結果**：ユーザー定義 TestCase
  サブクラスのメソッド収集・実行はエンジンに到達手段が無いため、
  TestCase.run/TextTestRunner.run/loadTestsFrom* は unverified、main と
  discover は unsupported と分けた。assertRaises/assertWarns は呼び出し可能
  形式でも「送出された内部例外の種別取り出し」が基盤で保証されないため
  unverified（with 形式はコンテキストマネージャ前提で同じく unverified）。
  assertHasAttr/assertIsSubclass 等の内省系も unverified。
  assertAlmostEqual の丸めは Python の銀行家丸めでなく JS の Math.round
  （境界値で差異がありうる既知の微差）。
- **unittest.mock（25 supported／32 unverified）**：Mock/MagicMock/
  NonCallable* 自体の呼び出し記録（called/call_count/call_args/call_args_list/
  mock_calls）、assert_called_* 群、return_value、side_effect（例外・並び・
  関数・DEFAULT）、reset_mock、configure_mock、call/_Call の等価と repr、
  ANY/DEFAULT/FILTER_DIR を実装。**動的属性生成（m.foo で子モックが自動生成
  される仕組み）は基盤に動的属性フックが無く到達不能**のため、子モック前提の
  項目・attach_mock・mock_add_spec・patch 群・create_autospec・mock_open・
  seal・sentinel・AsyncMock/ThreadingMock/PropertyMock は unverified。
- **bdb（28 supported／10 unsupported／26 unverified）**：Breakpoint の
  データ管理（bpformat の CPython 書式「%d   breakpoint   keep yes   at %s:%d」
  まで）と Bdb のブレークポイント管理メソッド群、BdbQuit 対応付けを実装。
  実行・ディスパッチ系は unverified、set_trace/set_step 等は unsupported。
  Breakpoint.bplist は実辞書の再現ができないため unverified。
- **pdb（12 unsupported／2 unverified）**：対話デバッガ前提でほぼ unsupported。
  get_default_backend/set_default_backend は unverified。
- **profile（11 unsupported）／trace（8 unsupported）**：実行計測・トレース
  前提のため全件 unsupported（理由は各 caution に明記）。
- **pstats（10 supported／1 unsupported／9 unverified）**：SortKey とその
  メンバ（値 'calls' 等）は束ね値として supported。Stats は統計データが
  無いため unverified、dump_stats は unsupported。
- **tracemalloc（27 supported／12 unsupported／8 unverified）**：Frame/
  Traceback/Trace/Statistic/StatisticDiff/Filter/DomainFilter の「値としての
  形」（属性・Traceback.format・Snapshot.statistics の集計部分）を実装。
  Frame クラス自体は CPython では直接生成できない内部クラスのため
  unverified（属性項目は supported）。計測系関数は全て unsupported。
- **timeit（8 unverified）**：Timer の生成は行うが、計測値は環境依存のため
  timeit/repeat/autorange/default_timer は全て unverified（捏造しない）。
- **importlib（2 supported／2 unverified）**：import_module は **stdlib
  レジストリ済みモジュールに限り**エンジンのモジュール値へ接続する
  （未登録名は diag＋未確定値）。invalidate_caches は None を返す形で
  supported。reload/__import__ は unverified。
- **importlib.abc（34 unverified）／resources.abc（17 unverified）**：
  ABC は参照＋形のみ。**importlib.machinery（10 supported／42 unverified）**：
  ModuleSpec のデータ形と SOURCE_SUFFIXES は supported、その他のサフィックス
  はプラットフォーム依存値（Linux/CPython 3.12 の実値）を入れた上で
  unverified。**importlib.metadata（2 supported／31 unverified）**：
  PackageNotFoundError/MetadataNotFound の対応付けのみ supported、パッケージ
  情報は環境依存で unverified。**importlib.resources（9 unsupported／
  1 unverified）**：ファイル前提で unsupported、Anchor は unverified。
  **importlib.util（3 supported／10 unverified）**：cache_from_source/
  source_from_cache/resolve_name の純粋文字列規則を実装（cache_tag は
  CPython 3.12 の 'cpython-312' 固定で、版が変われば変わる旨を注意）。
  MAGIC_NUMBER はバイト値を提供できないため unverified（属性アクセスは
  基盤の AttributeError で正直に停止する）。

## 再分類（バックログ candidate からの変更）

バックログの candidate は大半が「実装」だったが、F-16 と裁定により次を再分類した
（項目名の列挙は status 別集計と各 reference ファイルが正本）：
- 実行トレース・計測・ファイル/ネットワーク前提の全項目 → unsupported
  （profile 11件、trace 8件、pdb 12件、logging.handlers 55件、
  importlib.resources 9件、tracemalloc 計測関数 12件ほか）。
- 基盤到達不能・意味論未確定の項目 → unverified（unittest のフレームワーク
  実行系、mock の動的属性系、importlib.abc 34件、timeit 8件ほか）。
- 例外18種は「実装」でなく例外対応付けとして区分した。

## 照合方法と範囲

- CPython 3.12.3 実走（/usr/bin/python3）で期待値を裏付けた範囲：getopt の
  全分岐とエラー文面、queue/sched の基本動作、argparse の解析・Namespace・
  エラー時の SystemExit(2) と usage/error 書式、optparse の解析と Values、
  cmd.parseline、doctest の Example 抽出、logging の Formatter/LogRecord/
  getLevelNamesMapping、unittest の失敗メッセージ書式、mock の呼び出し記録、
  bdb.Breakpoint.bpformat、pstats.SortKey、importlib.util のパス規則、
  importlib.metadata.PackageNotFoundError の MRO。
- 公式ドキュメント 3.15（docs.python.org/ja/3.15/library/<module>.html）で
  裏付けた範囲：3.13+ の queue.ShutDown、logging の新 API、pdb の backend API
  など実走できない項目の存在と形。
- テスト `tests/muse-adv-b7-g12.test.js`（37テスト、全合格）：
  リファレンス全907件の形状・一意性・status 検証に加え、**supported 459件の
  example を全件エンジンで実行してエラー無しを機械照合（F-04）**し、
  各モジュールの典型／境界／異常ケースを個別に検証した。

## 基盤要請（コーディネーター宛て）

1. **動的属性フックの欠如**：ネイティブクラスの属性アクセスは classDef の
   attrs/methods の固定名しか引けない。argparse.Namespace/optparse.Values は
   「dest 判明時に attrs へ動的登録する」workaround で実現したが、
   unittest.mock の子モック自動生成（m.foo）、getopt.GetoptError の msg/opt
   属性、logging.LogRecord への任意属性付与は到達不能。classDef に
   `attr(ctx, self, name)` フォールバックフックの追加を要請する。
2. **モジュール修飾クラス呼び出しで kwargs が落ちる**：`logging.Formatter(...)`
   のような `mod.Class(kw=...)` 形は stdlibModuleCall→stdlibConstruct の
   二重評価で kwargs が失われる（実測：optparse.Option の type/default、
   argparse.Namespace の中身、queue.Queue(maxsize=) が落ちた）。
   from-import 形では正常。stdlibConstruct 側の再評価を片付ける修正を要請する。
3. **ユーザー定義クラスの実行基盤**：TestCase サブクラスの収集・実行、
   cmd.Cmd の do_* ディスパッチ、unittest.mock.patch の差し替えには、
   ネイティブクラスを基底とするユーザー定義クラスの生成・メソッド呼び出し・
   属性代入が必要（現状は属性代入も「未対応」で停止する）。到達すれば
   unverified の大半（mock 32件、unittest 46件の一部）が supported 化できる。
4. **例外の送出形**：`raise mod.ExceptionClass()`（モジュール修飾形）は
   「この形の raise は未対応」で停止する（from-import 形は動作）。
   あわせて、ctx.call で送出された例外の種別を実装側 JS で判別する公式な
   手段が無い（assertRaises の呼び出し可能形式が unverified な理由）。
5. **同一性演算**：ネイティブ値同士の `is` が未確定（UNK）になるため、
   getLogger の同一オブジェクト性などを学習者のコードで検証できない。

## 残存

- unverified 319件の内訳は上記の基盤要請に紐づくものが大半で、基盤が
  届けば再裁定する。届かない場合は現状の正直な停止が仕様になる。
- logging の asctime 絶対値、queue.PriorityQueue の同順位順序、
  assertAlmostEqual の丸め境界、optparse の callback 引数形式は既知の微差
  として残る（いずれも本文に明記済み）。
- 共有ファイル（advanced-engine.js／advanced-manifest.js／stdlib-registry.js）
  には触っていない。統合時は impl-advanced-{getopt,queue,sched,argparse,
  optparse,cmd,doctest,logging,unittest,unittest-mock,debugtools}.js の
  import 追加と、reference-advanced-<module>.js 全26ファイルの
  referenceParts 追加が必要。
