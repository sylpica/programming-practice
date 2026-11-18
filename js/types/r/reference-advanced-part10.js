// 高度モード B4S：R 高度リファレンス項目 part10（utils その他全般：umisc 班）。
// 項目形式は B4 最終形（BRIEF §4）：追加フィールドは付けず、未対応の理由は
// description に名指しで明記する。syntax／description／example の事実は
// 公式ヘルプ（stat.ethz.ch R-manual R-devel、utils 4.6.0）の Usage／
// Description と実 R 4.3.3 の実測（名前空間の機械確認・args）で裏付けた。
// 本班は原則として、パッケージ管理・ヘルプ表示・対話/GUI・ファイル／
// ネットワーク・セッション情報・文書生成・デバッグ・クラス付き構造化
// オブジェクト・環境／S3 内省など、値モデルで忠実に再現できない対象を
// 未対応とし、純粋な文字列整形である formatUL／formatOL のみ実装した
// （functions-advanced-utilsmisc.js、実 R 4.3.3 との差分バッテリで照合）。
export const referenceAdvanced = [
 {
  "name": "BATCH",
  "category": "パッケージ",
  "syntax": "R CMD BATCH [options] infile [outfile]",
  "description": "R CMD BATCH により、入力ファイルからRを非対話的に実行し、出力をファイルへ送るコマンドライン実行の文書です。呼び出せるR関数ではありません。【未対応の理由】R関数ではなくコマンドラインツール（R CMD BATCH）の文書見出しであり、シミュレータ内で呼び出せる関数ではないため",
  "example": "BATCH",
  "caution": "outfileを省略すると infile の拡張子を.Rout に変えたファイルへ出力されます。",
  "status": "unsupported"
 },
 {
  "name": "COMPILE",
  "category": "パッケージ",
  "syntax": "R CMD COMPILE [options] srcfiles",
  "description": "R CMD COMPILE により、ソースファイルをRで使うためにコンパイルする（Unix系）コマンドライン操作の文書です。呼び出せるR関数ではありません。【未対応の理由】R関数ではなくコマンドラインツール（R CMD COMPILE）の文書見出しであり、シミュレータ内で呼び出せる関数ではないため",
  "example": "COMPILE",
  "caution": "主に Unix 系向けで、通常は R CMD SHLIB 経由で使われます。",
  "status": "unsupported"
 },
 {
  "name": "utils-package",
  "category": "パッケージ",
  "syntax": "utils-package",
  "description": "utils パッケージ全体の概要文書（パッケージの説明）です。呼び出せるR関数ではありません。【未対応の理由】パッケージ概要の文書見出しであり、呼び出せる関数ではないため",
  "example": "utils-package",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "utils",
  "category": "パッケージ",
  "syntax": "utils",
  "description": "utils パッケージ全体の概要文書（パッケージの説明）です。呼び出せるR関数ではありません。【未対応の理由】パッケージ概要の文書見出しであり、呼び出せる関数ではないため",
  "example": "utils",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "completion",
  "category": "環境と言語",
  "syntax": ".DollarNames(x, pattern)",
  "description": "コマンドライン補完の候補を生成する機構（補完ジェネレータ）の内部設定・照会ユーティリティです。補完機構の状態を読み書きし、環境やリストに対する名前補完を行います。【未対応の理由】対話的コマンドライン補完機構の内部状態（rc.settings の設定や補完候補生成）に依存し、値モデルに無いため",
  "example": "completion",
  "caution": "この機構は補完フロントエンドと組み合わせて使う内部機構で、単独では使われません。",
  "status": "unsupported"
 },
 {
  "name": "findMatches",
  "category": "環境と言語",
  "syntax": "findMatches(pattern, values, fuzzy)",
  "description": "コマンドライン補完の候補を生成する機構（補完ジェネレータ）の内部設定・照会ユーティリティです。補完機構の状態を読み書きし、環境やリストに対する名前補完を行います。【未対応の理由】対話的コマンドライン補完機構の内部状態（rc.settings の設定や補完候補生成）に依存し、値モデルに無いため",
  "example": "findMatches(x)",
  "caution": "この機構は補完フロントエンドと組み合わせて使う内部機構で、単独では使われません。",
  "status": "unsupported"
 },
 {
  "name": "rc.settings",
  "category": "環境と言語",
  "syntax": "rc.settings(ops, ns, args, dots, func, ipck, S3, data, help, argdb, fuzzy, quotes, files)",
  "description": "コマンドライン補完の候補を生成する機構（補完ジェネレータ）の内部設定・照会ユーティリティです。補完機構の状態を読み書きし、環境やリストに対する名前補完を行います。【未対応の理由】対話的コマンドライン補完機構の内部状態（rc.settings の設定や補完候補生成）に依存し、値モデルに無いため",
  "example": "rc.settings(x)",
  "caution": "この機構は補完フロントエンドと組み合わせて使う内部機構で、単独では使われません。",
  "status": "unsupported"
 },
 {
  "name": "rcompgen",
  "category": "環境と言語",
  "syntax": "rcompgen",
  "description": "コマンドライン補完の候補を生成する機構（補完ジェネレータ）の内部設定・照会ユーティリティです。補完機構の状態を読み書きし、環境やリストに対する名前補完を行います。【未対応の理由】対話的コマンドライン補完機構の内部状態（rc.settings の設定や補完候補生成）に依存し、値モデルに無いため",
  "example": "rcompgen",
  "caution": "この機構は補完フロントエンドと組み合わせて使う内部機構で、単独では使われません。",
  "status": "unsupported"
 },
 {
  "name": ".AtNames",
  "category": "環境と言語",
  "syntax": ".AtNames(x, pattern)",
  "description": "コマンドライン補完の候補を生成する機構（補完ジェネレータ）の内部設定・照会ユーティリティです。補完機構の状態を読み書きし、環境やリストに対する名前補完を行います。【未対応の理由】対話的コマンドライン補完機構の内部状態（rc.settings の設定や補完候補生成）に依存し、値モデルに無いため",
  "example": ".AtNames(x)",
  "caution": "この機構は補完フロントエンドと組み合わせて使う内部機構で、単独では使われません。",
  "status": "unsupported"
 },
 {
  "name": ".DollarNames",
  "category": "環境と言語",
  "syntax": ".DollarNames(x, pattern)",
  "description": "コマンドライン補完の候補を生成する機構（補完ジェネレータ）の内部設定・照会ユーティリティです。補完機構の状態を読み書きし、環境やリストに対する名前補完を行います。【未対応の理由】対話的コマンドライン補完機構の内部状態（rc.settings の設定や補完候補生成）に依存し、値モデルに無いため",
  "example": ".DollarNames(x)",
  "caution": "この機構は補完フロントエンドと組み合わせて使う内部機構で、単独では使われません。",
  "status": "unsupported"
 },
 {
  "name": "REMOVE",
  "category": "パッケージ",
  "syntax": "R CMD REMOVE [options] [-l lib] pkgs",
  "description": "R CMD REMOVE により、アドオンパッケージをライブラリから削除するコマンドライン操作の文書です。呼び出せるR関数ではありません。【未対応の理由】R関数ではなくコマンドラインツール（R CMD REMOVE）の文書見出しであり、シミュレータ内で呼び出せる関数ではないため",
  "example": "REMOVE",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "getClipboardFormats",
  "category": "入出力",
  "syntax": "getClipboardFormats(numeric = FALSE)",
  "description": "MS Windows のクリップボードを読み書きする関数群です（形式の取得・テキストの読み書き）。【未対応の理由】Windows のクリップボードという OS の外部リソースを操作するため（このシミュレータにはクリップボードが無い）",
  "example": "writeClipboard(\"hello\")",
  "caution": "Windows 専用です。format はクリップボード形式の番号です。",
  "status": "unsupported"
 },
 {
  "name": "readClipboard",
  "category": "入出力",
  "syntax": "readClipboard(format = 13, raw = FALSE)",
  "description": "MS Windows のクリップボードを読み書きする関数群です（形式の取得・テキストの読み書き）。【未対応の理由】Windows のクリップボードという OS の外部リソースを操作するため（このシミュレータにはクリップボードが無い）",
  "example": "readClipboard(x)",
  "caution": "Windows 専用です。format はクリップボード形式の番号です。",
  "status": "unsupported"
 },
 {
  "name": "writeClipboard",
  "category": "入出力",
  "syntax": "writeClipboard(str, format = 13)",
  "description": "MS Windows のクリップボードを読み書きする関数群です（形式の取得・テキストの読み書き）。【未対応の理由】Windows のクリップボードという OS の外部リソースを操作するため（このシミュレータにはクリップボードが無い）",
  "example": "writeClipboard(x)",
  "caution": "Windows 専用です。format はクリップボード形式の番号です。",
  "status": "unsupported"
 },
 {
  "name": "DLL.version",
  "category": "システム",
  "syntax": "DLL.version(path)",
  "description": "MS Windows の DLL ファイルのバージョン情報を取得します。【未対応の理由】Windows の DLL ファイルという外部ファイルのメタ情報を読むため",
  "example": "DLL.version(path)",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "INSTALL",
  "category": "パッケージ",
  "syntax": "R CMD INSTALL [options] [-l lib] pkgs",
  "description": "R CMD INSTALL により、アドオンパッケージをインストールするコマンドライン操作の文書です。呼び出せるR関数ではありません（R_INSTALL_STAGED／R_INSTALL_TAR はその過程で使われる環境変数の文書名です）。【未対応の理由】R関数ではなくコマンドラインツール（R CMD INSTALL）とその環境変数の文書見出しであり、シミュレータ内で呼び出せる関数ではないため",
  "example": "INSTALL",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "R_INSTALL_STAGED",
  "category": "パッケージ",
  "syntax": "R_INSTALL_STAGED",
  "description": "R CMD INSTALL により、アドオンパッケージをインストールするコマンドライン操作の文書です。呼び出せるR関数ではありません（R_INSTALL_STAGED／R_INSTALL_TAR はその過程で使われる環境変数の文書名です）。【未対応の理由】R関数ではなくコマンドラインツール（R CMD INSTALL）とその環境変数の文書見出しであり、シミュレータ内で呼び出せる関数ではないため",
  "example": "R_INSTALL_STAGED",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "R_INSTALL_TAR",
  "category": "パッケージ",
  "syntax": "R_INSTALL_TAR",
  "description": "R CMD INSTALL により、アドオンパッケージをインストールするコマンドライン操作の文書です。呼び出せるR関数ではありません（R_INSTALL_STAGED／R_INSTALL_TAR はその過程で使われる環境変数の文書名です）。【未対応の理由】R関数ではなくコマンドラインツール（R CMD INSTALL）とその環境変数の文書見出しであり、シミュレータ内で呼び出せる関数ではないため",
  "example": "R_INSTALL_TAR",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "LINK",
  "category": "パッケージ",
  "syntax": "R CMD LINK [options] linkcmd",
  "description": "R CMD LINK により、実行可能プログラムを作成する（Unix系）コマンドライン操作の文書です。呼び出せるR関数ではありません。【未対応の理由】R関数ではなくコマンドラインツール（R CMD LINK）の文書見出しであり、シミュレータ内で呼び出せる関数ではないため",
  "example": "LINK",
  "caution": "主に Unix 系向けです。",
  "status": "unsupported"
 },
 {
  "name": "build",
  "category": "パッケージ",
  "syntax": "R CMD build [options] pkgdirs",
  "description": "R CMD build／R CMD check により、アドオンパッケージのソースからパッケージを構築し、動作を検査するコマンドラインユーティリティの文書です。呼び出せるR関数ではありません。【未対応の理由】R関数ではなくコマンドラインツール（R CMD build／check）の文書見出しであり、シミュレータ内で呼び出せる関数ではないため",
  "example": "build",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "check",
  "category": "パッケージ",
  "syntax": "R CMD check [options] pkgdirs",
  "description": "R CMD build／R CMD check により、アドオンパッケージのソースからパッケージを構築し、動作を検査するコマンドラインユーティリティの文書です。呼び出せるR関数ではありません。【未対応の理由】R関数ではなくコマンドラインツール（R CMD build／check）の文書見出しであり、シミュレータ内で呼び出せる関数ではないため",
  "example": "check",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "Question",
  "category": "その他",
  "syntax": "?topic",
  "description": "ヘルプ表示のショートカット（?topic 形式）です。help() と同じくトピックの文書を表示します。【未対応の理由】ヘルプ文書の表示操作であり、値の計算ではないため（? はヘルプ演算子として文書を表示するもので、シミュレータにはヘルプ表示機構が無い）",
  "example": "Question",
  "caution": "予約語や演算子には引用符・バッククォートが必要です。",
  "status": "unsupported"
 },
 {
  "name": "?",
  "category": "その他",
  "syntax": "?topic",
  "description": "ヘルプ表示のショートカット（?topic 形式）です。help() と同じくトピックの文書を表示します。【未対応の理由】ヘルプ文書の表示操作であり、値の計算ではないため（? はヘルプ演算子として文書を表示するもので、シミュレータにはヘルプ表示機構が無い）",
  "example": "?mean",
  "caution": "予約語や演算子には引用符・バッククォートが必要です。",
  "status": "unsupported"
 },
 {
  "name": "RHOME",
  "category": "システム",
  "syntax": "R RHOME",
  "description": "R RHOME により、インストールされた R ツリーのルート（R ホームディレクトリ）の場所を返すコマンドライン操作の文書です。呼び出せるR関数ではありません。【未対応の理由】R関数ではなくコマンドラインツール（R RHOME）の文書見出しであり、実際のインストール場所は実行環境依存の値で、シミュレータには対応する実在ディレクトリが無いため",
  "example": "RHOME",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "RShowDoc",
  "category": "その他",
  "syntax": "RShowDoc(what, type = c(\"pdf\", \"html\", \"txt\"), package)",
  "description": "R のマニュアルやその他の文書ファイルを表示します。【未対応の理由】インストールされた文書ファイルを開いて表示する操作であり、ファイルシステムと表示機構に依存するため",
  "example": "RShowDoc(\"R-intro\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "loadRconsole",
  "category": "システム",
  "syntax": "loadRconsole(file)",
  "description": "MS Windows の R GUI（Rgui）コンソールを設定するファイル Rconsole と、その読み込み関数 loadRconsole、およびグラフィックスデバイス設定ファイル Rdevga の文書です。【未対応の理由】Windows 版 Rgui の設定ファイルを読み込む GUI 設定操作であり、シミュレータには Rgui が無いため（Rconsole／Rdevga は設定ファイル名であり関数ではない）",
  "example": "loadRconsole(file)",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "Rconsole",
  "category": "システム",
  "syntax": "Rconsole",
  "description": "MS Windows の R GUI（Rgui）コンソールを設定するファイル Rconsole と、その読み込み関数 loadRconsole、およびグラフィックスデバイス設定ファイル Rdevga の文書です。【未対応の理由】Windows 版 Rgui の設定ファイルを読み込む GUI 設定操作であり、シミュレータには Rgui が無いため（Rconsole／Rdevga は設定ファイル名であり関数ではない）",
  "example": "Rconsole",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "Rdevga",
  "category": "システム",
  "syntax": "Rdevga",
  "description": "MS Windows の R GUI（Rgui）コンソールを設定するファイル Rconsole と、その読み込み関数 loadRconsole、およびグラフィックスデバイス設定ファイル Rdevga の文書です。【未対応の理由】Windows 版 Rgui の設定ファイルを読み込む GUI 設定操作であり、シミュレータには Rgui が無いため（Rconsole／Rdevga は設定ファイル名であり関数ではない）",
  "example": "Rdevga",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "Rprof",
  "category": "システム",
  "syntax": "Rprof(filename = \"Rprof.out\", append = FALSE, interval = 0.02, memory.profiling = FALSE, gc.profiling = FALSE, line.profiling = FALSE, filter.callframes = FALSE, numfiles = 100L, bufsize = 10000L)",
  "description": "R の実行プロファイリング（一定間隔でコールスタックをサンプリングし、結果をファイルへ書く）を有効化・無効化します。【未対応の理由】実行プロファイラというインタプリタの計測機構と、結果ファイルへの出力に依存するため",
  "example": "Rprof(interval = 0.01)",
  "caution": "filename = NULL でプロファイリングを停止します。",
  "status": "unsupported"
 },
 {
  "name": "Rprofmem",
  "category": "システム",
  "syntax": "Rprofmem(filename = \"Rprofmem.out\", append = FALSE, threshold = 0)",
  "description": "R のメモリ使用のプロファイリングを有効化し、割り当て履歴をファイルへ書きます。【未対応の理由】メモリプロファイラというインタプリタの計測機構と、結果ファイルへの出力に依存するため",
  "example": "Rprofmem(\"Rprofmem.out\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "Rscript",
  "category": "システム",
  "syntax": "Rscript [options] file [args]",
  "description": "Rscript は R のスクリプト実行用フロントエンド（コマンドラインツール）の文書です。呼び出せるR関数ではありません。【未対応の理由】R関数ではなくコマンドラインツール（Rscript）の文書見出しであり、シミュレータ内で呼び出せる関数ではないため",
  "example": "Rscript",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "RSiteSearch",
  "category": "その他",
  "syntax": "RSiteSearch(string, restrict = c(\"functions\", \"descriptions\", \"news\", \"Rfunctions\", \"Rmanuals\", \"READMEs\", \"views\", \"vignettes\"), format, sortby = c(\"score\", \"date:late\", \"date:early\", \"subject\", \"subject:descending\", \"size\", \"size:descending\"), matchesPerPage = 20, words = c(\"all\", \"any\"))",
  "description": "R の文書・メーリングリストアーカイブ等を対象に、キーワードやフレーズを外部サイトで検索し、ブラウザで結果を表示します。【未対応の理由】外部検索サイトへのネットワークアクセスとブラウザ表示に依存するため",
  "example": "RSiteSearch(\"linear model\")",
  "caution": "検索は外部サイト（search.r-project.org）で行われます。",
  "status": "unsupported"
 },
 {
  "name": "Rtangle",
  "category": "その他",
  "syntax": "Rtangle()",
  "description": "Sweave の Stangle 用ドライバ（Rtangle）とその内部関数群です。文書ファイルから R コードを抽出してファイルへ書き出します。【未対応の理由】Sweave 文書処理ドライバであり、ファイルの読み書きと文書処理の内部状態に依存するため",
  "example": "Rtangle()",
  "caution": "通常は Stangle() 経由で使われ、内部関数を直接呼ぶことは想定されていません。",
  "status": "unsupported"
 },
 {
  "name": "RtangleFinish",
  "category": "その他",
  "syntax": "RtangleFinish(object, error = FALSE)",
  "description": "Sweave の Stangle 用ドライバ（Rtangle）とその内部関数群です。文書ファイルから R コードを抽出してファイルへ書き出します。【未対応の理由】Sweave 文書処理ドライバであり、ファイルの読み書きと文書処理の内部状態に依存するため",
  "example": "RtangleFinish(x)",
  "caution": "通常は Stangle() 経由で使われ、内部関数を直接呼ぶことは想定されていません。",
  "status": "unsupported"
 },
 {
  "name": "RtangleRuncode",
  "category": "その他",
  "syntax": "RtangleRuncode(object, chunk, options)",
  "description": "Sweave の Stangle 用ドライバ（Rtangle）とその内部関数群です。文書ファイルから R コードを抽出してファイルへ書き出します。【未対応の理由】Sweave 文書処理ドライバであり、ファイルの読み書きと文書処理の内部状態に依存するため",
  "example": "RtangleRuncode(x)",
  "caution": "通常は Stangle() 経由で使われ、内部関数を直接呼ぶことは想定されていません。",
  "status": "unsupported"
 },
 {
  "name": "RtangleSetup",
  "category": "その他",
  "syntax": "RtangleSetup(file, syntax, output = NULL, annotate = TRUE, split = FALSE, quiet = FALSE, drop.evalFALSE = FALSE, ...)",
  "description": "Sweave の Stangle 用ドライバ（Rtangle）とその内部関数群です。文書ファイルから R コードを抽出してファイルへ書き出します。【未対応の理由】Sweave 文書処理ドライバであり、ファイルの読み書きと文書処理の内部状態に依存するため",
  "example": "RtangleSetup(x)",
  "caution": "通常は Stangle() 経由で使われ、内部関数を直接呼ぶことは想定されていません。",
  "status": "unsupported"
 },
 {
  "name": "RtangleWritedoc",
  "category": "その他",
  "syntax": "RtangleWritedoc(object, chunk)",
  "description": "Sweave の Stangle 用ドライバ（Rtangle）とその内部関数群です。文書ファイルから R コードを抽出してファイルへ書き出します。【未対応の理由】Sweave 文書処理ドライバであり、ファイルの読み書きと文書処理の内部状態に依存するため",
  "example": "RtangleWritedoc(x)",
  "caution": "通常は Stangle() 経由で使われ、内部関数を直接呼ぶことは想定されていません。",
  "status": "unsupported"
 },
 {
  "name": "makeRweaveLatexCodeRunner",
  "category": "その他",
  "syntax": "makeRweaveLatexCodeRunner(evalFunc = RweaveEvalWithOpt)",
  "description": "Sweave の R／LaTeX 用ドライバ（RweaveLatex）とその内部関数群です。R コード入りの LaTeX 文書を処理してファイルへ書き出します。【未対応の理由】Sweave 文書処理ドライバであり、ファイルの読み書きと文書処理の内部状態に依存するため",
  "example": "RweaveLatex()",
  "caution": "通常は Sweave() 経由で使われ、内部関数を直接呼ぶことは想定されていません。",
  "status": "unsupported"
 },
 {
  "name": "RweaveLatex",
  "category": "その他",
  "syntax": "RweaveLatex()",
  "description": "Sweave の R／LaTeX 用ドライバ（RweaveLatex）とその内部関数群です。R コード入りの LaTeX 文書を処理してファイルへ書き出します。【未対応の理由】Sweave 文書処理ドライバであり、ファイルの読み書きと文書処理の内部状態に依存するため",
  "example": "RweaveLatex(x)",
  "caution": "通常は Sweave() 経由で使われ、内部関数を直接呼ぶことは想定されていません。",
  "status": "unsupported"
 },
 {
  "name": "RweaveLatexFinish",
  "category": "その他",
  "syntax": "RweaveLatexFinish(object, error = FALSE)",
  "description": "Sweave の R／LaTeX 用ドライバ（RweaveLatex）とその内部関数群です。R コード入りの LaTeX 文書を処理してファイルへ書き出します。【未対応の理由】Sweave 文書処理ドライバであり、ファイルの読み書きと文書処理の内部状態に依存するため",
  "example": "RweaveLatexFinish(x)",
  "caution": "通常は Sweave() 経由で使われ、内部関数を直接呼ぶことは想定されていません。",
  "status": "unsupported"
 },
 {
  "name": "RweaveLatexOptions",
  "category": "その他",
  "syntax": "RweaveLatexOptions(options)",
  "description": "Sweave の R／LaTeX 用ドライバ（RweaveLatex）とその内部関数群です。R コード入りの LaTeX 文書を処理してファイルへ書き出します。【未対応の理由】Sweave 文書処理ドライバであり、ファイルの読み書きと文書処理の内部状態に依存するため",
  "example": "RweaveLatexOptions(x)",
  "caution": "通常は Sweave() 経由で使われ、内部関数を直接呼ぶことは想定されていません。",
  "status": "unsupported"
 },
 {
  "name": "RweaveLatexSetup",
  "category": "その他",
  "syntax": "RweaveLatexSetup(file, syntax, output = NULL, quiet = FALSE, debug = FALSE, stylepath, ...)",
  "description": "Sweave の R／LaTeX 用ドライバ（RweaveLatex）とその内部関数群です。R コード入りの LaTeX 文書を処理してファイルへ書き出します。【未対応の理由】Sweave 文書処理ドライバであり、ファイルの読み書きと文書処理の内部状態に依存するため",
  "example": "RweaveLatexSetup(x)",
  "caution": "通常は Sweave() 経由で使われ、内部関数を直接呼ぶことは想定されていません。",
  "status": "unsupported"
 },
 {
  "name": "RweaveLatexWritedoc",
  "category": "その他",
  "syntax": "RweaveLatexWritedoc(object, chunk)",
  "description": "Sweave の R／LaTeX 用ドライバ（RweaveLatex）とその内部関数群です。R コード入りの LaTeX 文書を処理してファイルへ書き出します。【未対応の理由】Sweave 文書処理ドライバであり、ファイルの読み書きと文書処理の内部状態に依存するため",
  "example": "RweaveLatexWritedoc(x)",
  "caution": "通常は Sweave() 経由で使われ、内部関数を直接呼ぶことは想定されていません。",
  "status": "unsupported"
 },
 {
  "name": "SHLIB",
  "category": "パッケージ",
  "syntax": "R CMD SHLIB [options] [-o dllname] files",
  "description": "R CMD SHLIB により、動的読み込み用の共有オブジェクト／DLL を構築するコマンドライン操作の文書です。呼び出せるR関数ではありません。【未対応の理由】R関数ではなくコマンドラインツール（R CMD SHLIB）の文書見出しであり、シミュレータ内で呼び出せる関数ではないため",
  "example": "SHLIB",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "Stangle",
  "category": "その他",
  "syntax": "Stangle(file, driver = Rtangle(), syntax = getOption(\"SweaveSyntax\"), encoding = \"\", ...)",
  "description": "Sweave は、R コードを含む文書（noweb／LaTeX 等）からレポートを自動生成する仕組みです。Sweave() は文書を処理して出力ファイルを書き、Stangle() は R コードだけを抽出します。SweaveSyntaxLatex／SweaveSyntaxNoweb は構文定義オブジェクトです。【未対応の理由】文書ファイルの読み書きとレポート生成（外部ツール連携を含む）に依存するため（SweaveSyntax* は関数ではなく構文定義オブジェクト）",
  "example": "Sweave(\"file.Rnw\")",
  "caution": "入力ファイルのコードチャンクが実際に実行されます。",
  "status": "unsupported"
 },
 {
  "name": "Sweave",
  "category": "その他",
  "syntax": "Sweave(file, driver = RweaveLatex(), syntax = getOption(\"SweaveSyntax\"), encoding = \"\", ...)",
  "description": "Sweave は、R コードを含む文書（noweb／LaTeX 等）からレポートを自動生成する仕組みです。Sweave() は文書を処理して出力ファイルを書き、Stangle() は R コードだけを抽出します。SweaveSyntaxLatex／SweaveSyntaxNoweb は構文定義オブジェクトです。【未対応の理由】文書ファイルの読み書きとレポート生成（外部ツール連携を含む）に依存するため（SweaveSyntax* は関数ではなく構文定義オブジェクト）",
  "example": "Sweave(x)",
  "caution": "入力ファイルのコードチャンクが実際に実行されます。",
  "status": "unsupported"
 },
 {
  "name": "SweaveSyntaxLatex",
  "category": "その他",
  "syntax": "SweaveSyntaxLatex",
  "description": "Sweave は、R コードを含む文書（noweb／LaTeX 等）からレポートを自動生成する仕組みです。Sweave() は文書を処理して出力ファイルを書き、Stangle() は R コードだけを抽出します。SweaveSyntaxLatex／SweaveSyntaxNoweb は構文定義オブジェクトです。【未対応の理由】文書ファイルの読み書きとレポート生成（外部ツール連携を含む）に依存するため（SweaveSyntax* は関数ではなく構文定義オブジェクト）",
  "example": "SweaveSyntaxLatex",
  "caution": "入力ファイルのコードチャンクが実際に実行されます。",
  "status": "unsupported"
 },
 {
  "name": "SweaveSyntaxNoweb",
  "category": "その他",
  "syntax": "SweaveSyntaxNoweb",
  "description": "Sweave は、R コードを含む文書（noweb／LaTeX 等）からレポートを自動生成する仕組みです。Sweave() は文書を処理して出力ファイルを書き、Stangle() は R コードだけを抽出します。SweaveSyntaxLatex／SweaveSyntaxNoweb は構文定義オブジェクトです。【未対応の理由】文書ファイルの読み書きとレポート生成（外部ツール連携を含む）に依存するため（SweaveSyntax* は関数ではなく構文定義オブジェクト）",
  "example": "SweaveSyntaxNoweb",
  "caution": "入力ファイルのコードチャンクが実際に実行されます。",
  "status": "unsupported"
 },
 {
  "name": "SweaveSyntConv",
  "category": "その他",
  "syntax": "SweaveSyntConv(file, syntax, output = NULL)",
  "description": "Sweave の構文で書かれたファイルを別の構文へ変換し、ファイルへ書き出します。【未対応の理由】ファイルの読み書きを伴う Sweave 文書変換であるため",
  "example": "SweaveSyntConv(\"file.Rnw\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "View",
  "category": "入出力",
  "syntax": "View(x, title)",
  "description": "データビューア（スプレッドシート状の表示）を起動してオブジェクトを表示します。【未対応の理由】GUI のデータビューアを起動する表示操作であり、シミュレータにはビューアが無いため",
  "example": "View(mtcars)",
  "caution": "表示専用で、ビューアでの変更はオブジェクトへ反映されません。",
  "status": "unsupported"
 },
 {
  "name": "alarm",
  "category": "システム",
  "syntax": "alarm()",
  "description": "ベルを鳴らす（Unix 系では \"\\a\" を出力する）ことでユーザーに注意を促します。戻り値は不可視の NULL です。【未対応の理由】音を鳴らす副作用のみの関数で、戻り値も不可視 NULL（不可視性は値モデルに無い）であり、忠実に再現できないため",
  "example": "alarm()",
  "caution": "プラットフォームによって鳴らし方が異なります。",
  "status": "unsupported"
 },
 {
  "name": "apropos",
  "category": "環境と言語",
  "syntax": "apropos(what, where = FALSE, ignore.case = TRUE, dot_internals = FALSE, mode = \"any\")",
  "description": "名前の一部に文字列を含むオブジェクトを、検索パス上の環境から探して返します（find は該当オブジェクトのある環境の位置を返します）。【未対応の理由】検索パスと環境群の内省に依存し、値モデルで忠実に再現できないため",
  "example": "apropos(\"^glm\")",
  "caution": "正規表現として解釈されます。検索対象は検索パス上の環境です。",
  "status": "unsupported"
 },
 {
  "name": "find",
  "category": "環境と言語",
  "syntax": "find(what, mode = \"any\", numeric = FALSE, simple.words = TRUE)",
  "description": "名前の一部に文字列を含むオブジェクトを、検索パス上の環境から探して返します（find は該当オブジェクトのある環境の位置を返します）。【未対応の理由】検索パスと環境群の内省に依存し、値モデルで忠実に再現できないため",
  "example": "find(x)",
  "caution": "正規表現として解釈されます。検索対象は検索パス上の環境です。",
  "status": "unsupported"
 },
 {
  "name": "arrangeWindows",
  "category": "システム",
  "syntax": "arrangeWindows(action, windows, preserve = TRUE, outer = FALSE)",
  "description": "MS Windows で、R の開いているウィンドウを再配置します。【未対応の理由】Windows 版 Rgui のウィンドウ操作であり、シミュレータにはウィンドウが無いため",
  "example": "arrangeWindows()",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "askYesNo",
  "category": "入出力",
  "syntax": "askYesNo(msg, default = TRUE, prompts = getOption(\"askYesNo\", gettext(c(\"Yes\", \"No\", \"Cancel\"))), ...)",
  "description": "ユーザーに Yes／No／Cancel の質問を対話的に提示し、回答を論理値（または NA）で返します。【未対応の理由】対話的な入力待ち（ユーザーの回答）に依存し、非対話のシミュレータでは再現できないため",
  "example": "askYesNo(\"Continue?\")",
  "caution": "非対話セッションではエラーになります。",
  "status": "unsupported"
 },
 {
  "name": "aspell",
  "category": "その他",
  "syntax": "aspell(files, filter, control = list(), encoding = \"unknown\", program = NULL, dictionaries = character())",
  "description": "スペルチェックプログラム（Aspell／Hunspell 等）へのインタフェースで、ファイルのスペルを検査して結果を返します。【未対応の理由】外部スペルチェックプログラムの実行とファイル読み取りに依存するため",
  "example": "aspell(\"file.txt\")",
  "caution": "対象プログラムがインストールされている必要があります。",
  "status": "unsupported"
 },
 {
  "name": "aspell-utils",
  "category": "その他",
  "syntax": "aspell-utils",
  "description": "パッケージの Rd ファイル・R ファイル・ヴィネット等を対象にしたスペルチェックの内部ユーティリティ群です。【未対応の理由】外部スペルチェックプログラムの実行とパッケージファイルの読み取りに依存する内部ユーティリティであるため",
  "example": "aspell-utils",
  "caution": "aspell 本体（外部プログラム）が必要です。",
  "status": "unsupported"
 },
 {
  "name": "aspell_package_C_files",
  "category": "その他",
  "syntax": "aspell_package_C_files(dir, ignore = character(), control = list(), program = NULL, dictionaries = character())",
  "description": "パッケージの Rd ファイル・R ファイル・ヴィネット等を対象にしたスペルチェックの内部ユーティリティ群です。【未対応の理由】外部スペルチェックプログラムの実行とパッケージファイルの読み取りに依存する内部ユーティリティであるため",
  "example": "aspell_package_C_files(x)",
  "caution": "aspell 本体（外部プログラム）が必要です。",
  "status": "unsupported"
 },
 {
  "name": "aspell_package_Rd_files",
  "category": "その他",
  "syntax": "aspell_package_Rd_files(dir, drop = c(\"\\\\author\", \"\\\\references\"), control = list(), program = NULL, dictionaries = character())",
  "description": "パッケージの Rd ファイル・R ファイル・ヴィネット等を対象にしたスペルチェックの内部ユーティリティ群です。【未対応の理由】外部スペルチェックプログラムの実行とパッケージファイルの読み取りに依存する内部ユーティリティであるため",
  "example": "aspell_package_Rd_files(x)",
  "caution": "aspell 本体（外部プログラム）が必要です。",
  "status": "unsupported"
 },
 {
  "name": "aspell_package_R_files",
  "category": "その他",
  "syntax": "aspell_package_R_files(dir, ignore = character(), control = list(), program = NULL, dictionaries = character())",
  "description": "パッケージの Rd ファイル・R ファイル・ヴィネット等を対象にしたスペルチェックの内部ユーティリティ群です。【未対応の理由】外部スペルチェックプログラムの実行とパッケージファイルの読み取りに依存する内部ユーティリティであるため",
  "example": "aspell_package_R_files(x)",
  "caution": "aspell 本体（外部プログラム）が必要です。",
  "status": "unsupported"
 },
 {
  "name": "aspell_package_vignettes",
  "category": "その他",
  "syntax": "aspell_package_vignettes(dir, control = list(), program = NULL, dictionaries = character())",
  "description": "パッケージの Rd ファイル・R ファイル・ヴィネット等を対象にしたスペルチェックの内部ユーティリティ群です。【未対応の理由】外部スペルチェックプログラムの実行とパッケージファイルの読み取りに依存する内部ユーティリティであるため",
  "example": "aspell_package_vignettes(x)",
  "caution": "aspell 本体（外部プログラム）が必要です。",
  "status": "unsupported"
 },
 {
  "name": "aspell_write_personal_dictionary_file",
  "category": "その他",
  "syntax": "aspell_write_personal_dictionary_file(x, out, language = \"en\", program = NULL)",
  "description": "パッケージの Rd ファイル・R ファイル・ヴィネット等を対象にしたスペルチェックの内部ユーティリティ群です。【未対応の理由】外部スペルチェックプログラムの実行とパッケージファイルの読み取りに依存する内部ユーティリティであるため",
  "example": "aspell_write_personal_dictionary_file(x)",
  "caution": "aspell 本体（外部プログラム）が必要です。",
  "status": "unsupported"
 },
 {
  "name": "available.packages",
  "category": "パッケージ",
  "syntax": "available.packages(contriburl = contrib.url(repos, type), method, fields = NULL, type = getOption(\"pkgType\"), filters = NULL, repos = getOption(\"repos\"), ignore_repo_cache = FALSE, max_repo_cache_age, quiet = TRUE, ...)",
  "description": "CRAN のようなリポジトリで現在利用可能なパッケージの詳細を行列で返します。一覧はインターネットからダウンロード（またはローカルミラーからコピー）されます。R_AVAILABLE_PACKAGES_CACHE_CONTROL_MAX_AGE はそのキャッシュ制御に関する環境変数の文書名です。【未対応の理由】リポジトリへのネットワークアクセスとダウンロードしたパッケージ一覧（実行環境・時点依存）を返すため（環境変数名は関数ではない）",
  "example": "available.packages()",
  "caution": "結果はリポジトリの時点の状態に依存します。",
  "status": "unsupported"
 },
 {
  "name": "R_AVAILABLE_PACKAGES_CACHE_CONTROL_MAX_AGE",
  "category": "パッケージ",
  "syntax": "R_AVAILABLE_PACKAGES_CACHE_CONTROL_MAX_AGE",
  "description": "CRAN のようなリポジトリで現在利用可能なパッケージの詳細を行列で返します。一覧はインターネットからダウンロード（またはローカルミラーからコピー）されます。R_AVAILABLE_PACKAGES_CACHE_CONTROL_MAX_AGE はそのキャッシュ制御に関する環境変数の文書名です。【未対応の理由】リポジトリへのネットワークアクセスとダウンロードしたパッケージ一覧（実行環境・時点依存）を返すため（環境変数名は関数ではない）",
  "example": "R_AVAILABLE_PACKAGES_CACHE_CONTROL_MAX_AGE",
  "caution": "結果はリポジトリの時点の状態に依存します。",
  "status": "unsupported"
 },
 {
  "name": "bibentry",
  "category": "その他",
  "syntax": "bibentry(bibtype, textVersion = NULL, header = NULL, footer = NULL, key = NULL, ..., other = list(), mheader = NULL, mfooter = NULL)",
  "description": "書誌情報のエントリ（クラス \"bibentry\" の構造化オブジェクト）を作成します。その表示・整形・並べ替え・BibTeX 化は S3 メソッドが行います。【未対応の理由】クラス \"bibentry\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため",
  "example": "bibentry(bibtype = \"Manual\", title = \"R\", author = \"R Core Team\")",
  "caution": "bibtype は \"Article\" や \"Book\" 等の種別です。",
  "status": "unsupported"
 },
 {
  "name": "format.bibentry",
  "category": "その他",
  "syntax": "format.bibentry(x, style = \"text\", .bibstyle = NULL, bibtex = length(x) <= 1, citMsg = missing(bibtex), sort = FALSE, macros = NULL, ...)",
  "description": "書誌情報のエントリ（クラス \"bibentry\" の構造化オブジェクト）を作成します。その表示・整形・並べ替え・BibTeX 化は S3 メソッドが行います。【未対応の理由】クラス \"bibentry\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため（format.bibentry はそのクラス向けのメソッドです。）",
  "example": "format.bibentry(x)",
  "caution": "bibtype は \"Article\" や \"Book\" 等の種別です。",
  "status": "unsupported"
 },
 {
  "name": "format.citation",
  "category": "その他",
  "syntax": "format.citation(x, style = \"citation\", ...)",
  "description": "書誌情報のエントリ（クラス \"bibentry\" の構造化オブジェクト）を作成します。その表示・整形・並べ替え・BibTeX 化は S3 メソッドが行います。【未対応の理由】クラス \"bibentry\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため（format.citation はそのクラス向けのメソッドです。）",
  "example": "format.citation(x)",
  "caution": "bibtype は \"Article\" や \"Book\" 等の種別です。",
  "status": "unsupported"
 },
 {
  "name": "print.bibentry",
  "category": "その他",
  "syntax": "print.bibentry(x, style = \"text\", .bibstyle = NULL, bibtex = length(x) <= getOption(\"citation.bibtex.max\", 1L), ...)",
  "description": "書誌情報のエントリ（クラス \"bibentry\" の構造化オブジェクト）を作成します。その表示・整形・並べ替え・BibTeX 化は S3 メソッドが行います。【未対応の理由】クラス \"bibentry\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため（print.bibentry はそのクラス向けのメソッドです。）",
  "example": "print.bibentry(x)",
  "caution": "bibtype は \"Article\" や \"Book\" 等の種別です。",
  "status": "unsupported"
 },
 {
  "name": "print.citation",
  "category": "その他",
  "syntax": "print.citation(x, style = \"citation\", ...)",
  "description": "書誌情報のエントリ（クラス \"bibentry\" の構造化オブジェクト）を作成します。その表示・整形・並べ替え・BibTeX 化は S3 メソッドが行います。【未対応の理由】クラス \"bibentry\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため（print.citation はそのクラス向けのメソッドです。）",
  "example": "print.citation(x)",
  "caution": "bibtype は \"Article\" や \"Book\" 等の種別です。",
  "status": "unsupported"
 },
 {
  "name": "sort.bibentry",
  "category": "その他",
  "syntax": "sort.bibentry(x, decreasing = FALSE, .bibstyle = NULL, drop = FALSE, ...)",
  "description": "書誌情報のエントリ（クラス \"bibentry\" の構造化オブジェクト）を作成します。その表示・整形・並べ替え・BibTeX 化は S3 メソッドが行います。【未対応の理由】クラス \"bibentry\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため（sort.bibentry はそのクラス向けのメソッドです。）",
  "example": "sort.bibentry(x)",
  "caution": "bibtype は \"Article\" や \"Book\" 等の種別です。",
  "status": "unsupported"
 },
 {
  "name": "toBibtex.bibentry",
  "category": "その他",
  "syntax": "toBibtex.bibentry(object, escape = FALSE, ...)",
  "description": "書誌情報のエントリ（クラス \"bibentry\" の構造化オブジェクト）を作成します。その表示・整形・並べ替え・BibTeX 化は S3 メソッドが行います。【未対応の理由】クラス \"bibentry\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため（toBibtex.bibentry はそのクラス向けのメソッドです。）",
  "example": "toBibtex.bibentry(x)",
  "caution": "bibtype は \"Article\" や \"Book\" 等の種別です。",
  "status": "unsupported"
 },
 {
  "name": "browseEnv",
  "category": "環境と言語",
  "syntax": "browseEnv(envir = .GlobalEnv, pattern, excludepatt = \"^last\\\\.warning\", html = .Platform$GUI != \"AQUA\", expanded = TRUE, properties = NULL, main = NULL, debugMe = FALSE)",
  "description": "環境内のオブジェクトを HTML ページ状のブラウザで表示・閲覧します（wsbrowser はその内部関数です）。【未対応の理由】環境の内省と HTML ブラウザ表示という GUI 操作に依存するため",
  "example": "browseEnv()",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "wsbrowser",
  "category": "環境と言語",
  "syntax": "wsbrowser(IDS, IsRoot, IsContainer, ItemsPerContainer, ParentID, NAMES, TYPES, DIMS, expanded = TRUE, kind = \"HTML\", main = \"R Workspace\", properties = list(), browser = getOption(\"browser\"))",
  "description": "環境内のオブジェクトを HTML ページ状のブラウザで表示・閲覧します（wsbrowser はその内部関数です）。【未対応の理由】環境の内省と HTML ブラウザ表示という GUI 操作に依存するため",
  "example": "wsbrowser(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "browseURL",
  "category": "入出力",
  "syntax": "browseURL(url, browser = getOption(\"browser\"), encodeIfNeeded = FALSE)",
  "description": "URL を HTML ブラウザへ読み込んで表示します。【未対応の理由】外部ブラウザの起動という OS 連携操作であり、シミュレータにはブラウザ表示機構が無いため",
  "example": "browseURL(\"https://www.r-project.org\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "browseVignettes",
  "category": "その他",
  "syntax": "browseVignettes(package = NULL, lib.loc = NULL, all = TRUE)",
  "description": "パッケージのヴィネット一覧を HTML ブラウザで表示します（print.browseVignettes はその表示メソッドです）。【未対応の理由】インストール済みパッケージの走査と HTML ブラウザ表示に依存するため",
  "example": "browseVignettes()",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "print.browseVignettes",
  "category": "その他",
  "syntax": "print.browseVignettes(x, ...)",
  "description": "パッケージのヴィネット一覧を HTML ブラウザで表示します（print.browseVignettes はその表示メソッドです）。【未対応の理由】インストール済みパッケージの走査と HTML ブラウザ表示に依存するため（print.browseVignettes はそのクラス向けのメソッドです。）",
  "example": "print.browseVignettes(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "bug.report",
  "category": "その他",
  "syntax": "bug.report(subject = \"\", address, file = \"R.bug.report\", package = NULL, lib.loc = NULL, ...)",
  "description": "R やパッケージのバグ報告を作成し、メール作成やブラウザでの報告ページ表示を行います。【未対応の理由】メール／ブラウザ等の外部ツール起動と対話的な報告作成に依存するため",
  "example": "bug.report()",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "changedFiles",
  "category": "ファイル",
  "syntax": "changedFiles(before, after, path = before$path, timestamp = before$timestamp, check.file.info = c(\"size\", \"isdir\", \"mode\", \"mtime\"), md5sum = before$md5sum, digest = before$digest, full.names = before$full.names, ...)",
  "description": "ディレクトリのスナップショット（fileSnapshot）を取り、2つのスナップショット間で変更されたファイルを検出します（クラス \"fileSnapshot\"／\"changedFiles\" のオブジェクトを扱います）。【未対応の理由】ファイルシステムの実状態（サイズ・更新時刻・チェックサム）の読み取りと比較に依存するため",
  "example": "fileSnapshot()",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "fileSnapshot",
  "category": "ファイル",
  "syntax": "fileSnapshot(path = \".\", file.info = TRUE, timestamp = NULL, md5sum = FALSE, digest = NULL, full.names = length(path) > 1, ...)",
  "description": "ディレクトリのスナップショット（fileSnapshot）を取り、2つのスナップショット間で変更されたファイルを検出します（クラス \"fileSnapshot\"／\"changedFiles\" のオブジェクトを扱います）。【未対応の理由】ファイルシステムの実状態（サイズ・更新時刻・チェックサム）の読み取りと比較に依存するため",
  "example": "fileSnapshot(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "print.changedFiles",
  "category": "ファイル",
  "syntax": "print.changedFiles(x, verbose = FALSE, ...)",
  "description": "ディレクトリのスナップショット（fileSnapshot）を取り、2つのスナップショット間で変更されたファイルを検出します（クラス \"fileSnapshot\"／\"changedFiles\" のオブジェクトを扱います）。【未対応の理由】ファイルシステムの実状態（サイズ・更新時刻・チェックサム）の読み取りと比較に依存するため（print.changedFiles はそのクラス向けのメソッドです。）",
  "example": "print.changedFiles(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "charClass",
  "category": "文字列",
  "syntax": "charClass(x, class)",
  "description": "C99 のワイド文字分類関数（wctype）へのインタフェースで、コードポイントが指定した文字クラス（\"digit\"、\"alpha\" 等）に属するかを返します。【未対応の理由】分類結果が C ライブラリのロケール（wctype テーブル）に依存し、環境によって値が変わるため、値モデルで忠実に再現できないため",
  "example": "charClass(48:57, \"digit\")",
  "caution": "クラス名が不正だとエラーになります。分類はロケール依存です。",
  "status": "unsupported"
 },
 {
  "name": "choose.dir",
  "category": "入出力",
  "syntax": "choose.dir(default = \"\", caption = \"Select folder\")",
  "description": "MS Windows で、フォルダを対話的に選択するダイアログを表示し、選択されたパスを返します。【未対応の理由】Windows のフォルダ選択ダイアログという対話的 GUI 操作に依存するため",
  "example": "choose.dir()",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "choose.files",
  "category": "入出力",
  "syntax": "choose.files(default = \"\", caption = \"Select files\", multi = TRUE, filters = Filters, index = nrow(Filters))",
  "description": "MS Windows で、ファイルを対話的に選択するダイアログを表示し、選択されたパスを返します。Filters はそのフィルタ定義の行列オブジェクトです。【未対応の理由】Windows のファイル選択ダイアログという対話的 GUI 操作に依存するため（Filters は関数ではなくフィルタ定義オブジェクト）",
  "example": "choose.files()",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "Filters",
  "category": "入出力",
  "syntax": "Filters",
  "description": "MS Windows で、ファイルを対話的に選択するダイアログを表示し、選択されたパスを返します。Filters はそのフィルタ定義の行列オブジェクトです。【未対応の理由】Windows のファイル選択ダイアログという対話的 GUI 操作に依存するため（Filters は関数ではなくフィルタ定義オブジェクト）",
  "example": "Filters",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "chooseBioCmirror",
  "category": "パッケージ",
  "syntax": "chooseBioCmirror(graphics = getOption(\"menu.graphics\"), ind = NULL, local.only = FALSE)",
  "description": "Bioconductor のミラーを対話的に（または番号で）選択し、オプションに設定します。【未対応の理由】ミラー一覧の取得（ネットワーク）と対話的選択、セッションオプションの変更に依存するため（getBioCmirrors は実 R 4.3.3 の名前空間にも現行ヘルプの Usage にも存在しない旧名で、実在関数として確認できない）",
  "example": "chooseBioCmirror()",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "getBioCmirrors",
  "category": "パッケージ",
  "syntax": "getBioCmirrors()",
  "description": "Bioconductor のミラーを対話的に（または番号で）選択し、オプションに設定します。【未対応の理由】ミラー一覧の取得（ネットワーク）と対話的選択、セッションオプションの変更に依存するため（getBioCmirrors は実 R 4.3.3 の名前空間にも現行ヘルプの Usage にも存在しない旧名で、実在関数として確認できない）",
  "example": "getBioCmirrors",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "chooseCRANmirror",
  "category": "パッケージ",
  "syntax": "chooseCRANmirror(graphics = getOption(\"menu.graphics\"), ind = NULL, local.only = FALSE)",
  "description": "CRAN のミラーを対話的に（または番号で）選択し、オプションに設定します（getCRANmirrors はミラー一覧を返します）。【未対応の理由】ミラー一覧の取得（ネットワーク）と対話的選択、セッションオプションの変更に依存するため",
  "example": "chooseCRANmirror()",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "getCRANmirrors",
  "category": "パッケージ",
  "syntax": "getCRANmirrors(all = FALSE, local.only = FALSE)",
  "description": "CRAN のミラーを対話的に（または番号で）選択し、オプションに設定します（getCRANmirrors はミラー一覧を返します）。【未対応の理由】ミラー一覧の取得（ネットワーク）と対話的選択、セッションオプションの変更に依存するため",
  "example": "getCRANmirrors(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "CITATION",
  "category": "その他",
  "syntax": "CITATION",
  "description": "R 本体やパッケージの、出版物での引用の仕方（クラス \"bibentry\"／\"citation\" のオブジェクト）を返します。readCitationFile は CITATION ファイルを読み、citHeader／citFooter は引用文の頭・末尾の文を生成します。CITATION は引用情報ファイルの名前です。【未対応の理由】クラス付き書誌オブジェクト（bibentry／citation）を返し、パッケージの CITATION ファイルの読み取りにも依存するため",
  "example": "CITATION",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "citation",
  "category": "その他",
  "syntax": "citation(package = \"base\", lib.loc = NULL, auto = NULL)",
  "description": "R 本体やパッケージの、出版物での引用の仕方（クラス \"bibentry\"／\"citation\" のオブジェクト）を返します。readCitationFile は CITATION ファイルを読み、citHeader／citFooter は引用文の頭・末尾の文を生成します。CITATION は引用情報ファイルの名前です。【未対応の理由】クラス付き書誌オブジェクト（bibentry／citation）を返し、パッケージの CITATION ファイルの読み取りにも依存するため",
  "example": "citation(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "citFooter",
  "category": "その他",
  "syntax": "citFooter(...)",
  "description": "R 本体やパッケージの、出版物での引用の仕方（クラス \"bibentry\"／\"citation\" のオブジェクト）を返します。readCitationFile は CITATION ファイルを読み、citHeader／citFooter は引用文の頭・末尾の文を生成します。CITATION は引用情報ファイルの名前です。【未対応の理由】クラス付き書誌オブジェクト（bibentry／citation）を返し、パッケージの CITATION ファイルの読み取りにも依存するため",
  "example": "citFooter(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "citHeader",
  "category": "その他",
  "syntax": "citHeader(...)",
  "description": "R 本体やパッケージの、出版物での引用の仕方（クラス \"bibentry\"／\"citation\" のオブジェクト）を返します。readCitationFile は CITATION ファイルを読み、citHeader／citFooter は引用文の頭・末尾の文を生成します。CITATION は引用情報ファイルの名前です。【未対応の理由】クラス付き書誌オブジェクト（bibentry／citation）を返し、パッケージの CITATION ファイルの読み取りにも依存するため",
  "example": "citHeader(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "readCitationFile",
  "category": "その他",
  "syntax": "readCitationFile(file, meta = NULL)",
  "description": "R 本体やパッケージの、出版物での引用の仕方（クラス \"bibentry\"／\"citation\" のオブジェクト）を返します。readCitationFile は CITATION ファイルを読み、citHeader／citFooter は引用文の頭・末尾の文を生成します。CITATION は引用情報ファイルの名前です。【未対応の理由】クラス付き書誌オブジェクト（bibentry／citation）を返し、パッケージの CITATION ファイルの読み取りにも依存するため",
  "example": "readCitationFile(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "cite",
  "category": "その他",
  "syntax": "cite(keys, bib, ...)",
  "description": "書誌エントリを、文書中で引用するための文字列（キー等）に変換します。【未対応の理由】クラス \"bibentry\" の書誌オブジェクトを入力とする S3 処理であり、値モデルで書誌オブジェクトを表せないため",
  "example": "cite(\"R\", bib = \"bib\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "citeNatbib",
  "category": "その他",
  "syntax": "citeNatbib(keys, bib, textual = FALSE, before = NULL, after = NULL, mode = c(\"authoryear\", \"numbers\", \"super\"), abbreviate = TRUE, longnamesfirst = TRUE, bibpunct = c(\"(\", \")\", \";\", \"a\", \"\", \",\"), previous)",
  "description": "書誌エントリを、文書中で引用するための文字列（キー等）に変換します。【未対応の理由】クラス \"bibentry\" の書誌オブジェクトを入力とする S3 処理であり、値モデルで書誌オブジェクトを表せないため",
  "example": "citeNatbib(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "citEntry",
  "category": "その他",
  "syntax": "citEntry(entry, textVersion = NULL, header = NULL, footer = NULL, ...)",
  "description": "書誌情報のエントリを作成する旧インタフェースで、クラス \"bibentry\" のオブジェクトを返します。【未対応の理由】クラス \"bibentry\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため",
  "example": "citEntry(entry = \"Manual\", title = \"R\")",
  "caution": "旧インタフェースで、新規には bibentry() が推奨されます。",
  "status": "unsupported"
 },
 {
  "name": "close.socket",
  "category": "入出力",
  "syntax": "close.socket(socket, ...)",
  "description": "ソケット接続を閉じます。【未対応の理由】ソケットという外部リソース（接続オブジェクト）に依存するため",
  "example": "close.socket(socket)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "contrib.url",
  "category": "パッケージ",
  "syntax": "contrib.url(repos, type = getOption(\"pkgType\"))",
  "description": "CRAN のようなリポジトリについて、パッケージ種別に応じた適切なパス（contrib URL）を構成して返します。【未対応の理由】リポジトリ設定（options の repos）とパッケージ種別のセッション状態に依存するパス構成であり、対象リポジトリの実在を前提とするパッケージ管理機能のため",
  "example": "contrib.url(\"https://cloud.r-project.org\")",
  "caution": "末尾のパスは R のバージョンや種別（source／binary）で変わります。",
  "status": "unsupported"
 },
 {
  "name": "create.post",
  "category": "その他",
  "syntax": "create.post(instructions = character(), description = \"post\", subject = \"\", method = getOption(\"mailer\"), address = \"the relevant mailing list\", ccaddress = getOption(\"ccaddress\", \"\"), filename = \"R.post\", info = character())",
  "description": "メールや投稿の作成を補助する内部関数で、エディタを開いて文面を用意します。【未対応の理由】外部エディタの起動とメール作成という対話的操作に依存する補助関数であるため",
  "example": "create.post()",
  "caution": "bug.report 等から使われる補助関数です。",
  "status": "unsupported"
 },
 {
  "name": "data.entry",
  "category": "入出力",
  "syntax": "data.entry(..., Modes = NULL, Names = NULL)",
  "description": "スプレッドシート状のデータエディタを開き、データの入力・編集を行います（de／dataentry はその別名・内部関数です）。【未対応の理由】GUI のスプレッドシートエディタという対話的編集操作に依存するため",
  "example": "data.entry(x)",
  "caution": "編集結果は戻り値として返りますが、エディタ自体が対話機構です。",
  "status": "unsupported"
 },
 {
  "name": "dataentry",
  "category": "入出力",
  "syntax": "dataentry(data, modes)",
  "description": "スプレッドシート状のデータエディタを開き、データの入力・編集を行います（de／dataentry はその別名・内部関数です）。【未対応の理由】GUI のスプレッドシートエディタという対話的編集操作に依存するため",
  "example": "dataentry(x)",
  "caution": "編集結果は戻り値として返りますが、エディタ自体が対話機構です。",
  "status": "unsupported"
 },
 {
  "name": "de",
  "category": "入出力",
  "syntax": "de(..., Modes = list(), Names = NULL)",
  "description": "スプレッドシート状のデータエディタを開き、データの入力・編集を行います（de／dataentry はその別名・内部関数です）。【未対応の理由】GUI のスプレッドシートエディタという対話的編集操作に依存するため",
  "example": "de(x)",
  "caution": "編集結果は戻り値として返りますが、エディタ自体が対話機構です。",
  "status": "unsupported"
 },
 {
  "name": "debugcall",
  "category": "システム",
  "syntax": "debugcall(call, once = FALSE)",
  "description": "呼び出し（call）を指定してデバッガで実行します（undebugcall はその解除です）。【未対応の理由】対話的デバッガと呼び出しオブジェクト・関数のデバッグ状態に依存するため",
  "example": "debugcall(mean(x))",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "undebugcall",
  "category": "システム",
  "syntax": "undebugcall(call)",
  "description": "呼び出し（call）を指定してデバッガで実行します（undebugcall はその解除です）。【未対応の理由】対話的デバッガと呼び出しオブジェクト・関数のデバッグ状態に依存するため",
  "example": "undebugcall(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "debugger",
  "category": "システム",
  "syntax": "debugger(dump = last.dump)",
  "description": "エラー発生時のコールスタック等をダンプしたオブジェクト（dump.frames）を、事後デバッグ（debugger）で対話的に検査します。limitedLabels はその表示用ラベルを作る内部関数です。【未対応の理由】対話的デバッガと、エラー時の実行フレームのダンプに依存するため",
  "example": "dump.frames()",
  "caution": "dump.frames はエラー時の状態を保存するもので、通常の値計算ではありません。",
  "status": "unsupported"
 },
 {
  "name": "dump.frames",
  "category": "システム",
  "syntax": "dump.frames(dumpto = \"last.dump\", to.file = FALSE, include.GlobalEnv = FALSE)",
  "description": "エラー発生時のコールスタック等をダンプしたオブジェクト（dump.frames）を、事後デバッグ（debugger）で対話的に検査します。limitedLabels はその表示用ラベルを作る内部関数です。【未対応の理由】対話的デバッガと、エラー時の実行フレームのダンプに依存するため",
  "example": "dump.frames(x)",
  "caution": "dump.frames はエラー時の状態を保存するもので、通常の値計算ではありません。",
  "status": "unsupported"
 },
 {
  "name": "limitedLabels",
  "category": "システム",
  "syntax": "limitedLabels(value, maxwidth = getOption(\"width\") - 5L)",
  "description": "エラー発生時のコールスタック等をダンプしたオブジェクト（dump.frames）を、事後デバッグ（debugger）で対話的に検査します。limitedLabels はその表示用ラベルを作る内部関数です。【未対応の理由】対話的デバッガと、エラー時の実行フレームのダンプに依存するため",
  "example": "limitedLabels(x)",
  "caution": "dump.frames はエラー時の状態を保存するもので、通常の値計算ではありません。",
  "status": "unsupported"
 },
 {
  "name": "demo",
  "category": "その他",
  "syntax": "demo(topic, package = NULL, lib.loc = NULL, character.only = FALSE, verbose = getOption(\"verbose\"), type = c(\"console\", \"html\"), echo = TRUE, ask = getOption(\"demo.ask\"), encoding = getOption(\"encoding\"))",
  "description": "パッケージに収録されたデモスクリプトを実行（表示しながら評価）します。【未対応の理由】インストール済みパッケージのデモファイルの読み取りと、そのコードの実行・対話的確認に依存するため",
  "example": "demo(graphics)",
  "caution": "デモコードが実際に実行されます。",
  "status": "unsupported"
 },
 {
  "name": "download.file",
  "category": "ファイル",
  "syntax": "download.file(url, destfile, method, quiet = FALSE, mode = \"w\", cacheOK = TRUE, extra = getOption(\"download.file.extra\"), headers = NULL, ...)",
  "description": "インターネット上のファイルをダウンロードしてローカルファイルへ保存します。【未対応の理由】ネットワークアクセスとローカルファイルへの書き込みに依存するため",
  "example": "download.file(url, destfile)",
  "caution": "戻り値は成否の状態コードです。",
  "status": "unsupported"
 },
 {
  "name": "download.packages",
  "category": "パッケージ",
  "syntax": "download.packages(pkgs, destdir, available = NULL, repos = getOption(\"repos\"), contriburl = contrib.url(repos, type), method, type = getOption(\"pkgType\"), ...)",
  "description": "CRAN のようなリポジトリからパッケージをダウンロードしてローカルへ保存します。【未対応の理由】リポジトリへのネットワークアクセスとファイルのダウンロード・保存に依存するため",
  "example": "download.packages(\"pkg\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "edit",
  "category": "入出力",
  "syntax": "edit(name, ...)",
  "description": "テキストエディタを起動してオブジェクトやファイルを編集し、編集結果を返します（vi／emacs／pico／xemacs／xedit は各エディタを指定するラッパーです）。【未対応の理由】外部テキストエディタの起動という対話的操作に依存するため",
  "example": "edit(x)",
  "caution": "使われるエディタはオプション editor で決まります。",
  "status": "unsupported"
 },
 {
  "name": "emacs",
  "category": "入出力",
  "syntax": "emacs(name = NULL, file = \"\")",
  "description": "テキストエディタを起動してオブジェクトやファイルを編集し、編集結果を返します（vi／emacs／pico／xemacs／xedit は各エディタを指定するラッパーです）。【未対応の理由】外部テキストエディタの起動という対話的操作に依存するため",
  "example": "emacs(x)",
  "caution": "使われるエディタはオプション editor で決まります。",
  "status": "unsupported"
 },
 {
  "name": "pico",
  "category": "入出力",
  "syntax": "pico(name = NULL, file = \"\")",
  "description": "テキストエディタを起動してオブジェクトやファイルを編集し、編集結果を返します（vi／emacs／pico／xemacs／xedit は各エディタを指定するラッパーです）。【未対応の理由】外部テキストエディタの起動という対話的操作に依存するため",
  "example": "pico(x)",
  "caution": "使われるエディタはオプション editor で決まります。",
  "status": "unsupported"
 },
 {
  "name": "vi",
  "category": "入出力",
  "syntax": "vi(name = NULL, file = \"\")",
  "description": "テキストエディタを起動してオブジェクトやファイルを編集し、編集結果を返します（vi／emacs／pico／xemacs／xedit は各エディタを指定するラッパーです）。【未対応の理由】外部テキストエディタの起動という対話的操作に依存するため",
  "example": "vi(x)",
  "caution": "使われるエディタはオプション editor で決まります。",
  "status": "unsupported"
 },
 {
  "name": "xedit",
  "category": "入出力",
  "syntax": "xedit(name = NULL, file = \"\")",
  "description": "テキストエディタを起動してオブジェクトやファイルを編集し、編集結果を返します（vi／emacs／pico／xemacs／xedit は各エディタを指定するラッパーです）。【未対応の理由】外部テキストエディタの起動という対話的操作に依存するため",
  "example": "xedit(x)",
  "caution": "使われるエディタはオプション editor で決まります。",
  "status": "unsupported"
 },
 {
  "name": "xemacs",
  "category": "入出力",
  "syntax": "xemacs(name = NULL, file = \"\")",
  "description": "テキストエディタを起動してオブジェクトやファイルを編集し、編集結果を返します（vi／emacs／pico／xemacs／xedit は各エディタを指定するラッパーです）。【未対応の理由】外部テキストエディタの起動という対話的操作に依存するため",
  "example": "xemacs(x)",
  "caution": "使われるエディタはオプション editor で決まります。",
  "status": "unsupported"
 },
 {
  "name": "edit.data.frame",
  "category": "データフレーム",
  "syntax": "edit.data.frame(name, factor.mode = c(\"character\", \"numeric\"), edit.row.names = any(row.names(name) != 1L:nrow(name)), ...)",
  "description": "データフレームや行列をスプレッドシート状のエディタで編集します（edit のデータフレーム用メソッドです）。【未対応の理由】GUI のスプレッドシートエディタという対話的編集操作に依存するため",
  "example": "edit.data.frame(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "example",
  "category": "その他",
  "syntax": "example(topic, package = NULL, lib.loc = NULL, character.only = FALSE, give.lines = FALSE, local = FALSE, type = c(\"console\", \"html\"), echo = TRUE, verbose = getOption(\"verbose\"), setRNG = FALSE, ask = getOption(\"example.ask\"), prompt.prefix = abbreviate(topic, 6), run.dontrun = FALSE, run.donttest = interactive())",
  "description": "オンラインヘルプの Examples 節のコードを実行します。【未対応の理由】ヘルプ文書の読み取りと、そのコードの実行・対話的確認（ask）に依存するため",
  "example": "example(mean)",
  "caution": "例示コードが実際に実行されます。",
  "status": "unsupported"
 },
 {
  "name": "file.edit",
  "category": "ファイル",
  "syntax": "file.edit(..., title = file, editor = getOption(\"editor\"), fileEncoding = \"\")",
  "description": "1つ以上のファイルをテキストエディタで開いて編集します。【未対応の理由】外部テキストエディタの起動という対話的操作とファイルシステムに依存するため",
  "example": "file.edit(\"file.R\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "findCRANmirror",
  "category": "パッケージ",
  "syntax": "findCRANmirror(type = c(\"src\", \"web\"))",
  "description": "設定やロケール等から、利用者に適した CRAN ミラーの候補を探して返します。【未対応の理由】セッションのリポジトリ設定・ロケール等の実行環境情報とミラー一覧に依存するパッケージ管理機能のため",
  "example": "findCRANmirror()",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "findLineNum",
  "category": "システム",
  "syntax": "findLineNum(srcfile, line, nameonly = TRUE, envir = parent.frame(), lastenv)",
  "description": "ソースファイルの行番号に対応するコード位置を探し（findLineNum）、そこにブレークポイントを設定します（setBreakpoint）。【未対応の理由】ソース参照（srcref）付きの関数オブジェクトとデバッガのブレークポイント機構に依存するため",
  "example": "findLineNum(\"file.R\", 10)",
  "caution": "keep.source でソースが保持されている必要があります。",
  "status": "unsupported"
 },
 {
  "name": "setBreakpoint",
  "category": "システム",
  "syntax": "setBreakpoint(srcfile, line, nameonly = TRUE, envir = parent.frame(), lastenv, verbose = TRUE, tracer, print = FALSE, clear = FALSE, ...)",
  "description": "ソースファイルの行番号に対応するコード位置を探し（findLineNum）、そこにブレークポイントを設定します（setBreakpoint）。【未対応の理由】ソース参照（srcref）付きの関数オブジェクトとデバッガのブレークポイント機構に依存するため",
  "example": "setBreakpoint(x)",
  "caution": "keep.source でソースが保持されている必要があります。",
  "status": "unsupported"
 },
 {
  "name": "fix",
  "category": "入出力",
  "syntax": "fix(x, ...)",
  "description": "オブジェクトをテキストエディタで編集し、編集結果を元の名前へ代入し直します。【未対応の理由】外部テキストエディタの起動という対話的操作と、環境への代入に依存するため",
  "example": "fix(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "flush.console",
  "category": "入出力",
  "syntax": "flush.console()",
  "description": "コンソールへの出力をフラッシュ（即時表示）します。戻り値は不可視の NULL です。【未対応の理由】コンソール出力のフラッシュという副作用のみの関数で、戻り値も不可視 NULL（不可視性は値モデルに無い）であり、忠実に再現できないため",
  "example": "flush.console()",
  "caution": "GUI 等のフロントエンドで意味を持ちます。",
  "status": "unsupported"
 },
 {
  "name": "formatOL",
  "category": "文字列",
  "syntax": "formatOL(x, type = \"arabic\", offset = 0, start = 1, width = 0.9 * getOption(\"width\"))",
  "description": "順序なしリスト（formatUL、箇条書き）と順序付きリスト（formatOL、番号付き）を、ラベル付きの文字列ベクトルに整形します。各項目は width に収まるよう単語境界で折り返され、継続行はラベルの幅だけ字下げされます",
  "example": "formatOL(c(\"first\", \"second\"))",
  "caution": "width の既定値はオプション width（既定80）の 0.9 倍＝72 です。offset が負だとエラーになります。arabic の数値ラベルは formatRNum（15有効桁）による近似整形のため、実 R の as.character が科学表記に切り替える極端な大きさ（例：start = 1e+12 付近）では実 R と整形が異なることがあります。",
  "status": "supported"
 },
 {
  "name": "formatUL",
  "category": "文字列",
  "syntax": "formatUL(x, label = \"*\", offset = 0, width = 0.9 * getOption(\"width\"))",
  "description": "順序なしリスト（formatUL、箇条書き）と順序付きリスト（formatOL、番号付き）を、ラベル付きの文字列ベクトルに整形します。各項目は width に収まるよう単語境界で折り返され、継続行はラベルの幅だけ字下げされます",
  "example": "formatUL(c(\"apple\", \"banana\"))",
  "caution": "width の既定値はオプション width（既定80）の 0.9 倍＝72 です。offset が負だとエラーになります。数値ラベルは formatRNum（as.character 相当・15有効桁）による近似整形のため、実 R の format() が行う小数点位置の統一（例：1.5 と 200 で \"200.0\"）や科学表記への切替は再現せず、数値ラベルのベクトルや極端な桁数では実 R と整形が異なることがあります。",
  "status": "supported"
 },
 {
  "name": "argsAnywhere",
  "category": "環境と言語",
  "syntax": "argsAnywhere(x)",
  "description": "名前でオブジェクトを、名前空間の中まで含めて検索して取得します（クラス \"getAnywhere\" のオブジェクトを返します）。argsAnywhere はその引数情報を返し、print／[ はそのメソッドです。【未対応の理由】検索パス・名前空間を含む環境の内省に依存し、関数オブジェクトを含む任意のオブジェクトを返すため",
  "example": "getAnywhere(\"mean\")",
  "caution": "同名のオブジェクトが複数ある場合は全てが返ります。",
  "status": "unsupported"
 },
 {
  "name": "getAnywhere",
  "category": "環境と言語",
  "syntax": "getAnywhere(x)",
  "description": "名前でオブジェクトを、名前空間の中まで含めて検索して取得します（クラス \"getAnywhere\" のオブジェクトを返します）。argsAnywhere はその引数情報を返し、print／[ はそのメソッドです。【未対応の理由】検索パス・名前空間を含む環境の内省に依存し、関数オブジェクトを含む任意のオブジェクトを返すため",
  "example": "getAnywhere(x)",
  "caution": "同名のオブジェクトが複数ある場合は全てが返ります。",
  "status": "unsupported"
 },
 {
  "name": "print.getAnywhere",
  "category": "環境と言語",
  "syntax": "print.getAnywhere(x, ...)",
  "description": "名前でオブジェクトを、名前空間の中まで含めて検索して取得します（クラス \"getAnywhere\" のオブジェクトを返します）。argsAnywhere はその引数情報を返し、print／[ はそのメソッドです。【未対応の理由】検索パス・名前空間を含む環境の内省に依存し、関数オブジェクトを含む任意のオブジェクトを返すため（print.getAnywhere はそのクラス向けのメソッドです。）",
  "example": "print.getAnywhere(x)",
  "caution": "同名のオブジェクトが複数ある場合は全てが返ります。",
  "status": "unsupported"
 },
 {
  "name": "[.getAnywhere",
  "category": "環境と言語",
  "syntax": "[.getAnywhere(x, i)",
  "description": "名前でオブジェクトを、名前空間の中まで含めて検索して取得します（クラス \"getAnywhere\" のオブジェクトを返します）。argsAnywhere はその引数情報を返し、print／[ はそのメソッドです。【未対応の理由】検索パス・名前空間を含む環境の内省に依存し、関数オブジェクトを含む任意のオブジェクトを返すため（[.getAnywhere はそのクラス向けのメソッドです。）",
  "example": "getAnywhere(\"mean\")[1]",
  "caution": "同名のオブジェクトが複数ある場合は全てが返ります。",
  "status": "unsupported"
 },
 {
  "name": "assignInMyNamespace",
  "category": "環境と言語",
  "syntax": "assignInMyNamespace(x, value)",
  "description": "名前空間の開発用ユーティリティです。getFromNamespace は名前空間からオブジェクトを取得し、assignInNamespace／assignInMyNamespace は名前空間内の束縛を変更し、fixInNamespace はエディタで修正します。【未対応の理由】名前空間（環境）内の束縛の取得・変更という環境操作に依存し、関数オブジェクトを含む任意のオブジェクトを扱うため",
  "example": "getFromNamespace(\"mean\", \"base\")",
  "caution": "名前空間の束縛は通常ロックされています。",
  "status": "unsupported"
 },
 {
  "name": "assignInNamespace",
  "category": "環境と言語",
  "syntax": "assignInNamespace(x, value, ns, pos = -1, envir = as.environment(pos))",
  "description": "名前空間の開発用ユーティリティです。getFromNamespace は名前空間からオブジェクトを取得し、assignInNamespace／assignInMyNamespace は名前空間内の束縛を変更し、fixInNamespace はエディタで修正します。【未対応の理由】名前空間（環境）内の束縛の取得・変更という環境操作に依存し、関数オブジェクトを含む任意のオブジェクトを扱うため",
  "example": "assignInNamespace(x)",
  "caution": "名前空間の束縛は通常ロックされています。",
  "status": "unsupported"
 },
 {
  "name": "fixInNamespace",
  "category": "環境と言語",
  "syntax": "fixInNamespace(x, ns, pos = -1, envir = as.environment(pos), ...)",
  "description": "名前空間の開発用ユーティリティです。getFromNamespace は名前空間からオブジェクトを取得し、assignInNamespace／assignInMyNamespace は名前空間内の束縛を変更し、fixInNamespace はエディタで修正します。【未対応の理由】名前空間（環境）内の束縛の取得・変更という環境操作に依存し、関数オブジェクトを含む任意のオブジェクトを扱うため",
  "example": "fixInNamespace(x)",
  "caution": "名前空間の束縛は通常ロックされています。",
  "status": "unsupported"
 },
 {
  "name": "getFromNamespace",
  "category": "環境と言語",
  "syntax": "getFromNamespace(x, ns, pos = -1, envir = as.environment(pos))",
  "description": "名前空間の開発用ユーティリティです。getFromNamespace は名前空間からオブジェクトを取得し、assignInNamespace／assignInMyNamespace は名前空間内の束縛を変更し、fixInNamespace はエディタで修正します。【未対応の理由】名前空間（環境）内の束縛の取得・変更という環境操作に依存し、関数オブジェクトを含む任意のオブジェクトを扱うため",
  "example": "getFromNamespace(x)",
  "caution": "名前空間の束縛は通常ロックされています。",
  "status": "unsupported"
 },
 {
  "name": "getParseData",
  "category": "言語オブジェクト",
  "syntax": "getParseData(x, includeText = NA)",
  "description": "パース結果の詳細情報（構文要素ごとのデータフレーム）をオブジェクトから取得します（getParseText はそのテキストを取り出します）。【未対応の理由】パースデータという言語オブジェクトの内部表現とデータフレーム表現に依存するため",
  "example": "getParseData(parse(text = \"x <- 1\"))",
  "caution": "keep.source＝TRUE でパースされた式が対象です。",
  "status": "unsupported"
 },
 {
  "name": "getParseText",
  "category": "言語オブジェクト",
  "syntax": "getParseText(parseData, id)",
  "description": "パース結果の詳細情報（構文要素ごとのデータフレーム）をオブジェクトから取得します（getParseText はそのテキストを取り出します）。【未対応の理由】パースデータという言語オブジェクトの内部表現とデータフレーム表現に依存するため",
  "example": "getParseText(x)",
  "caution": "keep.source＝TRUE でパースされた式が対象です。",
  "status": "unsupported"
 },
 {
  "name": "getS3method",
  "category": "環境と言語",
  "syntax": "getS3method(f, class, optional = FALSE, envir = parent.frame())",
  "description": "S3 ジェネリック関数とクラスに対応するメソッド関数を取得して返します。【未対応の理由】メソッド関数オブジェクトそのものを返し、名前空間・環境でのメソッド探索に依存するため",
  "example": "getS3method(\"print\", \"data.frame\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "getWindowsHandle",
  "category": "システム",
  "syntax": "getWindowsHandle(which = \"Console\")",
  "description": "MS Windows で、R のウィンドウのハンドルを取得します。【未対応の理由】Windows 版 Rgui のウィンドウハンドルという GUI リソースに依存するため",
  "example": "getWindowsHandle()",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "getWindowsHandles",
  "category": "システム",
  "syntax": "getWindowsHandles(which = \"R\", pattern = \"\", minimized = FALSE)",
  "description": "MS Windows の RGui で開いているウィンドウのハンドル一覧を取得します。【未対応の理由】Windows 版 Rgui のウィンドウハンドルという GUI リソースに依存するため",
  "example": "getWindowsHandles()",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "globalVariables",
  "category": "パッケージ",
  "syntax": "globalVariables(names, package, add = TRUE)",
  "description": "パッケージ検査（R CMD check）のための宣言で、グローバル変数として使う名前をパッケージの名前空間へ登録します（suppressForeignCheck は外部呼び出し検査の抑制宣言です）。登録した名前を不可視に返します。【未対応の理由】パッケージ名前空間への登録という副作用を持つ宣言であり、シミュレータにはパッケージ名前空間が無く、戻り値も不可視であるため",
  "example": "globalVariables(\"x\")",
  "caution": "R CMD check の「no visible binding」注記を抑えるための宣言です。",
  "status": "unsupported"
 },
 {
  "name": "suppressForeignCheck",
  "category": "パッケージ",
  "syntax": "suppressForeignCheck(names, package, add = TRUE)",
  "description": "パッケージ検査（R CMD check）のための宣言で、グローバル変数として使う名前をパッケージの名前空間へ登録します（suppressForeignCheck は外部呼び出し検査の抑制宣言です）。登録した名前を不可視に返します。【未対応の理由】パッケージ名前空間への登録という副作用を持つ宣言であり、シミュレータにはパッケージ名前空間が無く、戻り値も不可視であるため",
  "example": "suppressForeignCheck(x)",
  "caution": "R CMD check の「no visible binding」注記を抑えるための宣言です。",
  "status": "unsupported"
 },
 {
  "name": "clrhash",
  "category": "その他",
  "syntax": "clrhash(h)",
  "description": "可変のハッシュ表（実験的機能）を作成・操作します。ハッシュ表は参照で渡される可変オブジェクトで、キーと値の組を保持します。【未対応の理由】参照意味論を持つ可変オブジェクト（ハッシュ表）を値モデルで表せないため（実験的機能であり、API が変わりうる点も理由に含む）",
  "example": "h <- hashtab()",
  "caution": "実験的機能です。ハッシュ表は環境のように参照で共有されます。",
  "status": "unsupported"
 },
 {
  "name": "format.hashtab",
  "category": "その他",
  "syntax": "format.hashtab(x, ...)",
  "description": "可変のハッシュ表（実験的機能）を作成・操作します。ハッシュ表は参照で渡される可変オブジェクトで、キーと値の組を保持します。【未対応の理由】参照意味論を持つ可変オブジェクト（ハッシュ表）を値モデルで表せないため（実験的機能であり、API が変わりうる点も理由に含む）（format.hashtab はそのクラス向けのメソッドです。）",
  "example": "format.hashtab(x)",
  "caution": "実験的機能です。ハッシュ表は環境のように参照で共有されます。",
  "status": "unsupported"
 },
 {
  "name": "gethash",
  "category": "その他",
  "syntax": "gethash(h, key, nomatch = NULL)",
  "description": "可変のハッシュ表（実験的機能）を作成・操作します。ハッシュ表は参照で渡される可変オブジェクトで、キーと値の組を保持します。【未対応の理由】参照意味論を持つ可変オブジェクト（ハッシュ表）を値モデルで表せないため（実験的機能であり、API が変わりうる点も理由に含む）",
  "example": "gethash(x)",
  "caution": "実験的機能です。ハッシュ表は環境のように参照で共有されます。",
  "status": "unsupported"
 },
 {
  "name": "hashtab",
  "category": "その他",
  "syntax": "hashtab(type = c(\"identical\", \"address\"), size)",
  "description": "可変のハッシュ表（実験的機能）を作成・操作します。ハッシュ表は参照で渡される可変オブジェクトで、キーと値の組を保持します。【未対応の理由】参照意味論を持つ可変オブジェクト（ハッシュ表）を値モデルで表せないため（実験的機能であり、API が変わりうる点も理由に含む）",
  "example": "hashtab(x)",
  "caution": "実験的機能です。ハッシュ表は環境のように参照で共有されます。",
  "status": "unsupported"
 },
 {
  "name": "is.hashtab",
  "category": "その他",
  "syntax": "is.hashtab(x)",
  "description": "可変のハッシュ表（実験的機能）を作成・操作します。ハッシュ表は参照で渡される可変オブジェクトで、キーと値の組を保持します。【未対応の理由】参照意味論を持つ可変オブジェクト（ハッシュ表）を値モデルで表せないため（実験的機能であり、API が変わりうる点も理由に含む）",
  "example": "is.hashtab(x)",
  "caution": "実験的機能です。ハッシュ表は環境のように参照で共有されます。",
  "status": "unsupported"
 },
 {
  "name": "length.hashtab",
  "category": "その他",
  "syntax": "length.hashtab(x)",
  "description": "可変のハッシュ表（実験的機能）を作成・操作します。ハッシュ表は参照で渡される可変オブジェクトで、キーと値の組を保持します。【未対応の理由】参照意味論を持つ可変オブジェクト（ハッシュ表）を値モデルで表せないため（実験的機能であり、API が変わりうる点も理由に含む）（length.hashtab はそのクラス向けのメソッドです。）",
  "example": "length.hashtab(x)",
  "caution": "実験的機能です。ハッシュ表は環境のように参照で共有されます。",
  "status": "unsupported"
 },
 {
  "name": "maphash",
  "category": "その他",
  "syntax": "maphash(h, FUN)",
  "description": "可変のハッシュ表（実験的機能）を作成・操作します。ハッシュ表は参照で渡される可変オブジェクトで、キーと値の組を保持します。【未対応の理由】参照意味論を持つ可変オブジェクト（ハッシュ表）を値モデルで表せないため（実験的機能であり、API が変わりうる点も理由に含む）",
  "example": "maphash(x)",
  "caution": "実験的機能です。ハッシュ表は環境のように参照で共有されます。",
  "status": "unsupported"
 },
 {
  "name": "numhash",
  "category": "その他",
  "syntax": "numhash(h)",
  "description": "可変のハッシュ表（実験的機能）を作成・操作します。ハッシュ表は参照で渡される可変オブジェクトで、キーと値の組を保持します。【未対応の理由】参照意味論を持つ可変オブジェクト（ハッシュ表）を値モデルで表せないため（実験的機能であり、API が変わりうる点も理由に含む）",
  "example": "numhash(x)",
  "caution": "実験的機能です。ハッシュ表は環境のように参照で共有されます。",
  "status": "unsupported"
 },
 {
  "name": "print.hashtab",
  "category": "その他",
  "syntax": "print.hashtab(x, ...)",
  "description": "可変のハッシュ表（実験的機能）を作成・操作します。ハッシュ表は参照で渡される可変オブジェクトで、キーと値の組を保持します。【未対応の理由】参照意味論を持つ可変オブジェクト（ハッシュ表）を値モデルで表せないため（実験的機能であり、API が変わりうる点も理由に含む）（print.hashtab はそのクラス向けのメソッドです。）",
  "example": "print.hashtab(x)",
  "caution": "実験的機能です。ハッシュ表は環境のように参照で共有されます。",
  "status": "unsupported"
 },
 {
  "name": "remhash",
  "category": "その他",
  "syntax": "remhash(h, key)",
  "description": "可変のハッシュ表（実験的機能）を作成・操作します。ハッシュ表は参照で渡される可変オブジェクトで、キーと値の組を保持します。【未対応の理由】参照意味論を持つ可変オブジェクト（ハッシュ表）を値モデルで表せないため（実験的機能であり、API が変わりうる点も理由に含む）",
  "example": "remhash(x)",
  "caution": "実験的機能です。ハッシュ表は環境のように参照で共有されます。",
  "status": "unsupported"
 },
 {
  "name": "sethash",
  "category": "その他",
  "syntax": "sethash(h, key, value)",
  "description": "可変のハッシュ表（実験的機能）を作成・操作します。ハッシュ表は参照で渡される可変オブジェクトで、キーと値の組を保持します。【未対応の理由】参照意味論を持つ可変オブジェクト（ハッシュ表）を値モデルで表せないため（実験的機能であり、API が変わりうる点も理由に含む）",
  "example": "sethash(x)",
  "caution": "実験的機能です。ハッシュ表は環境のように参照で共有されます。",
  "status": "unsupported"
 },
 {
  "name": "str.hashtab",
  "category": "その他",
  "syntax": "str.hashtab(object, ...)",
  "description": "可変のハッシュ表（実験的機能）を作成・操作します。ハッシュ表は参照で渡される可変オブジェクトで、キーと値の組を保持します。【未対応の理由】参照意味論を持つ可変オブジェクト（ハッシュ表）を値モデルで表せないため（実験的機能であり、API が変わりうる点も理由に含む）（str.hashtab はそのクラス向けのメソッドです。）",
  "example": "str.hashtab(x)",
  "caution": "実験的機能です。ハッシュ表は環境のように参照で共有されます。",
  "status": "unsupported"
 },
 {
  "name": "typhash",
  "category": "その他",
  "syntax": "typhash(h)",
  "description": "可変のハッシュ表（実験的機能）を作成・操作します。ハッシュ表は参照で渡される可変オブジェクトで、キーと値の組を保持します。【未対応の理由】参照意味論を持つ可変オブジェクト（ハッシュ表）を値モデルで表せないため（実験的機能であり、API が変わりうる点も理由に含む）",
  "example": "typhash(x)",
  "caution": "実験的機能です。ハッシュ表は環境のように参照で共有されます。",
  "status": "unsupported"
 },
 {
  "name": "[[.hashtab",
  "category": "その他",
  "syntax": "[[.hashtab(h, key, nomatch = NULL, ...)",
  "description": "可変のハッシュ表（実験的機能）を作成・操作します。ハッシュ表は参照で渡される可変オブジェクトで、キーと値の組を保持します。【未対応の理由】参照意味論を持つ可変オブジェクト（ハッシュ表）を値モデルで表せないため（実験的機能であり、API が変わりうる点も理由に含む）（[[.hashtab はそのクラス向けのメソッドです。）",
  "example": "h[[\"key\"]]",
  "caution": "実験的機能です。ハッシュ表は環境のように参照で共有されます。",
  "status": "unsupported"
 },
 {
  "name": "help",
  "category": "その他",
  "syntax": "help(topic, package = NULL, lib.loc = NULL, verbose = getOption(\"verbose\"), try.all.packages = getOption(\"help.try.all.packages\"), help_type = getOption(\"help_type\"))",
  "description": "トピックのオンラインヘルプ文書を表示します。【未対応の理由】ヘルプ文書の検索と表示（ページャ／ブラウザ）という表示機構に依存するため",
  "example": "help(mean)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "help.request",
  "category": "その他",
  "syntax": "help.request(subject = \"\", address = \"r-help@R-project.org\", file = \"R.help.request\", ...)",
  "description": "R-help メーリングリストへの投稿メールを作成します（セッション情報等を含む文面を用意し、メールツールを起動します）。【未対応の理由】メールツールの起動とセッション情報の収集という外部連携・対話操作に依存するため",
  "example": "help.request()",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "help.search",
  "category": "その他",
  "syntax": "help.search(pattern, fields = c(\"alias\", \"concept\", \"title\"), apropos, keyword, whatis, ignore.case = TRUE, package = NULL, lib.loc = NULL, help.db = getOption(\"help.db\"), verbose = getOption(\"verbose\"), rebuild = FALSE, agrep = NULL, use_UTF8 = FALSE, types = getOption(\"help.search.types\"))",
  "description": "ヘルプシステムをキーワード等で検索し、一致した文書の一覧（クラス \"hsearch\"）を返します（??pattern はその短縮記法、print.hsearch は表示メソッドです）。【未対応の理由】インストール済みパッケージ全体のヘルプデータベースの検索と、そのクラス付き結果オブジェクト・表示に依存するため",
  "example": "help.search(\"linear model\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "print.hsearch",
  "category": "その他",
  "syntax": "print.hsearch(x, ...)",
  "description": "ヘルプシステムをキーワード等で検索し、一致した文書の一覧（クラス \"hsearch\"）を返します（??pattern はその短縮記法、print.hsearch は表示メソッドです）。【未対応の理由】インストール済みパッケージ全体のヘルプデータベースの検索と、そのクラス付き結果オブジェクト・表示に依存するため（print.hsearch はそのクラス向けのメソッドです。）",
  "example": "print.hsearch(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "??",
  "category": "その他",
  "syntax": "??pattern",
  "description": "ヘルプシステムをキーワード等で検索し、一致した文書の一覧（クラス \"hsearch\"）を返します（??pattern はその短縮記法、print.hsearch は表示メソッドです）。【未対応の理由】インストール済みパッケージ全体のヘルプデータベースの検索と、そのクラス付き結果オブジェクト・表示に依存するため",
  "example": "??regression",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "help.start",
  "category": "その他",
  "syntax": "help.start(update = FALSE, gui = \"irrelevant\", browser = getOption(\"browser\"), remote = NULL)",
  "description": "HTML 版ヘルプのトップページをブラウザで開きます。【未対応の理由】ブラウザ表示という GUI 操作とヘルプサーバに依存するため",
  "example": "help.start()",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "hsearch_db",
  "category": "その他",
  "syntax": "hsearch_db(package = NULL, lib.loc = NULL, types = getOption(\"help.search.types\"), verbose = getOption(\"verbose\"), rebuild = FALSE, use_UTF8 = FALSE)",
  "description": "ヘルプ検索システムのデータベースを構築・照会する内部ユーティリティです（文書オブジェクト・キーワード・概念の一覧データベースを返します）。【未対応の理由】インストール済みパッケージ全体から構築されるヘルプデータベース（実行環境依存の大規模な内部データ）に依存するため",
  "example": "hsearch_db()",
  "caution": "データベースの再構築には時間がかかります。",
  "status": "unsupported"
 },
 {
  "name": "hsearch_db_concepts",
  "category": "その他",
  "syntax": "hsearch_db_concepts(db = hsearch_db())",
  "description": "ヘルプ検索システムのデータベースを構築・照会する内部ユーティリティです（文書オブジェクト・キーワード・概念の一覧データベースを返します）。【未対応の理由】インストール済みパッケージ全体から構築されるヘルプデータベース（実行環境依存の大規模な内部データ）に依存するため",
  "example": "hsearch_db_concepts(x)",
  "caution": "データベースの再構築には時間がかかります。",
  "status": "unsupported"
 },
 {
  "name": "hsearch_db_keywords",
  "category": "その他",
  "syntax": "hsearch_db_keywords(db = hsearch_db())",
  "description": "ヘルプ検索システムのデータベースを構築・照会する内部ユーティリティです（文書オブジェクト・キーワード・概念の一覧データベースを返します）。【未対応の理由】インストール済みパッケージ全体から構築されるヘルプデータベース（実行環境依存の大規模な内部データ）に依存するため",
  "example": "hsearch_db_keywords(x)",
  "caution": "データベースの再構築には時間がかかります。",
  "status": "unsupported"
 },
 {
  "name": "install.packages",
  "category": "パッケージ",
  "syntax": "install.packages(pkgs, lib, repos = getOption(\"repos\"), contriburl = contrib.url(repos, type), method, available = NULL, destdir = NULL, dependencies = NA, type = getOption(\"pkgType\"), configure.args = getOption(\"configure.args\"), configure.vars = getOption(\"configure.vars\"), clean = FALSE, Ncpus = getOption(\"Ncpus\", 1L), verbose = getOption(\"verbose\"), libs_only = FALSE, INSTALL_opts, quiet = FALSE, keep_outputs = FALSE, ...)",
  "description": "パッケージをリポジトリ（またはローカルファイル）からダウンロードしてライブラリへインストールします。【未対応の理由】ネットワークからのダウンロードと、ライブラリへのインストールというファイルシステム変更を伴うパッケージ管理操作のため",
  "example": "install.packages(\"pkg\")",
  "caution": "依存パッケージも含めてインストールされます。",
  "status": "unsupported"
 },
 {
  "name": "installed.packages",
  "category": "パッケージ",
  "syntax": "installed.packages(lib.loc = NULL, priority = NULL, noCache = FALSE, fields = NULL, subarch = .Platform$r_arch, ...)",
  "description": "ライブラリにインストールされているパッケージの一覧と詳細を行列で返します。【未対応の理由】実際のライブラリ（ファイルシステム）にあるインストール済みパッケージの走査結果であり、実行環境に依存するため",
  "example": "installed.packages()",
  "caution": "結果はライブラリの実状態に依存します。",
  "status": "unsupported"
 },
 {
  "name": "isS3method",
  "category": "環境と言語",
  "syntax": "isS3method(method, f, class, envir = parent.frame())",
  "description": "名前が S3 メソッドの名前かどうかを判定します（ジェネリック名やクラスを指定しての判定もできます）。【未対応の理由】判定が、読み込まれた名前空間・環境に実際に登録されているメソッド群の探索に依存し、名前文字列だけからは確定できないため",
  "example": "isS3method(\"print.data.frame\")",
  "caution": "メソッドが見つかるかは、探索する環境と読み込み済みパッケージに依存します。",
  "status": "unsupported"
 },
 {
  "name": "isS3stdGeneric",
  "category": "環境と言語",
  "syntax": "isS3stdGeneric(f)",
  "description": "関数が標準的な S3 ジェネリックとして振る舞うか（本体が UseMethod を呼ぶか等）を判定します。【未対応の理由】関数オブジェクトの本体（言語オブジェクト）の内省に依存し、値モデルで忠実に再現できないため",
  "example": "isS3stdGeneric(print)",
  "caution": "引数は関数オブジェクトです（名前文字列ではありません）。",
  "status": "unsupported"
 },
 {
  "name": "localeToCharset",
  "category": "システム",
  "syntax": "localeToCharset(locale = Sys.getlocale(\"LC_CTYPE\"))",
  "description": "ロケール名から、そのロケールに適した文字エンコーディング名の候補を返します。【未対応の理由】引数を省略した場合の値が現在のセッションのロケール（Sys.getlocale）という実行環境の状態に依存し、プラットフォーム（Windows／Unix）でも規則が異なるため、セッション状態を持たないモデルでは値を捏造せず未対応とする",
  "example": "localeToCharset(\"en_US.UTF-8\")",
  "caution": "未知のロケールでは NA が返ります。",
  "status": "unsupported"
 },
 {
  "name": "ls.str",
  "category": "環境と言語",
  "syntax": "ls.str(pos = -1, name, envir, all.names = FALSE, pattern, mode = \"any\")",
  "description": "環境内のオブジェクトを一覧し、それぞれの構造（str）を表示します（lsf.str は関数だけが対象です。print.ls_str はその表示メソッドです）。【未対応の理由】環境の内省と、オブジェクト構造の表示（str の出力機構）に依存するため",
  "example": "ls.str()",
  "caution": "戻り値は表示のためのクラス \"ls_str\" 付きオブジェクトです。",
  "status": "unsupported"
 },
 {
  "name": "lsf.str",
  "category": "環境と言語",
  "syntax": "lsf.str(pos = -1, envir, ...)",
  "description": "環境内のオブジェクトを一覧し、それぞれの構造（str）を表示します（lsf.str は関数だけが対象です。print.ls_str はその表示メソッドです）。【未対応の理由】環境の内省と、オブジェクト構造の表示（str の出力機構）に依存するため",
  "example": "lsf.str(x)",
  "caution": "戻り値は表示のためのクラス \"ls_str\" 付きオブジェクトです。",
  "status": "unsupported"
 },
 {
  "name": "print.ls_str",
  "category": "環境と言語",
  "syntax": "print.ls_str(x, max.level = 1, give.attr = FALSE, ..., digits = max(1, getOption(\"str\")$digits.d))",
  "description": "環境内のオブジェクトを一覧し、それぞれの構造（str）を表示します（lsf.str は関数だけが対象です。print.ls_str はその表示メソッドです）。【未対応の理由】環境の内省と、オブジェクト構造の表示（str の出力機構）に依存するため（print.ls_str はそのクラス向けのメソッドです。）",
  "example": "print.ls_str(x)",
  "caution": "戻り値は表示のためのクラス \"ls_str\" 付きオブジェクトです。",
  "status": "unsupported"
 },
 {
  "name": "maintainer",
  "category": "パッケージ",
  "syntax": "maintainer(pkg)",
  "description": "パッケージのメンテナ（\"person\" オブジェクト）を示します。【未対応の理由】インストール済みパッケージの DESCRIPTION の読み取りと、クラス \"person\" オブジェクトの返却に依存するため",
  "example": "maintainer(\"utils\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "make.packages.html",
  "category": "パッケージ",
  "syntax": "make.packages.html(lib.loc = .libPaths(), temp = FALSE, verbose = TRUE, docdir = R.home(\"doc\"))",
  "description": "ライブラリのパッケージ一覧 HTML ページを再生成します。【未対応の理由】ライブラリ内の HTML ファイルの再生成というファイル書き込みと、インストール済みパッケージの走査に依存するため",
  "example": "make.packages.html()",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "make.socket",
  "category": "入出力",
  "syntax": "make.socket(host = \"localhost\", port, fail = TRUE, server = FALSE)",
  "description": "ソケット接続を作成します（クラス \"socket\" の接続オブジェクトを返します。print.socket はその表示メソッドです）。【未対応の理由】ソケットという外部リソース（接続オブジェクト）に依存するため",
  "example": "make.socket(\"localhost\", 1234)",
  "caution": "server＝TRUE では接続待ちになります。",
  "status": "unsupported"
 },
 {
  "name": "print.socket",
  "category": "入出力",
  "syntax": "print.socket(x, ...)",
  "description": "ソケット接続を作成します（クラス \"socket\" の接続オブジェクトを返します。print.socket はその表示メソッドです）。【未対応の理由】ソケットという外部リソース（接続オブジェクト）に依存するため（print.socket はそのクラス向けのメソッドです。）",
  "example": "print.socket(x)",
  "caution": "server＝TRUE では接続待ちになります。",
  "status": "unsupported"
 },
 {
  "name": "menu",
  "category": "入出力",
  "syntax": "menu(choices, graphics = FALSE, title = NULL)",
  "description": "選択肢のメニューを対話的に表示し、ユーザーが選んだ番号を返します。【未対応の理由】対話的な入力待ち（ユーザーの選択）に依存し、非対話のシミュレータでは再現できないため",
  "example": "menu(c(\"a\", \"b\"))",
  "caution": "非対話セッションではエラーになります。",
  "status": "unsupported"
 },
 {
  "name": "format.MethodsFunction",
  "category": "環境と言語",
  "syntax": "format.MethodsFunction(x, byclass = attr(x, \"byclass\"), ...)",
  "description": "S3 ジェネリック関数のメソッド、またはクラスを持つメソッドの一覧（クラス \"MethodsFunction\" の文字列ベクトル）を返します（.S3methods はその内部版、format／print はそのメソッドです）。【未対応の理由】読み込まれた名前空間・環境に登録されているメソッド群の探索結果であり、実行環境の状態に依存するため",
  "example": "methods(\"print\")",
  "caution": "一覧は読み込み済みパッケージによって変わります。",
  "status": "unsupported"
 },
 {
  "name": "methods",
  "category": "環境と言語",
  "syntax": "methods(generic.function, class, dropPath = FALSE)",
  "description": "S3 ジェネリック関数のメソッド、またはクラスを持つメソッドの一覧（クラス \"MethodsFunction\" の文字列ベクトル）を返します（.S3methods はその内部版、format／print はそのメソッドです）。【未対応の理由】読み込まれた名前空間・環境に登録されているメソッド群の探索結果であり、実行環境の状態に依存するため",
  "example": "methods(x)",
  "caution": "一覧は読み込み済みパッケージによって変わります。",
  "status": "unsupported"
 },
 {
  "name": "print.MethodsFunction",
  "category": "環境と言語",
  "syntax": "print.MethodsFunction(x, byclass = attr(x, \"byclass\"), ...)",
  "description": "S3 ジェネリック関数のメソッド、またはクラスを持つメソッドの一覧（クラス \"MethodsFunction\" の文字列ベクトル）を返します（.S3methods はその内部版、format／print はそのメソッドです）。【未対応の理由】読み込まれた名前空間・環境に登録されているメソッド群の探索結果であり、実行環境の状態に依存するため（print.MethodsFunction はそのクラス向けのメソッドです。）",
  "example": "print.MethodsFunction(x)",
  "caution": "一覧は読み込み済みパッケージによって変わります。",
  "status": "unsupported"
 },
 {
  "name": ".S3methods",
  "category": "環境と言語",
  "syntax": ".S3methods(generic.function, class, envir = parent.frame(), dropPath = FALSE)",
  "description": "S3 ジェネリック関数のメソッド、またはクラスを持つメソッドの一覧（クラス \"MethodsFunction\" の文字列ベクトル）を返します（.S3methods はその内部版、format／print はそのメソッドです）。【未対応の理由】読み込まれた名前空間・環境に登録されているメソッド群の探索結果であり、実行環境の状態に依存するため",
  "example": ".S3methods(x)",
  "caution": "一覧は読み込み済みパッケージによって変わります。",
  "status": "unsupported"
 },
 {
  "name": "checkCRAN",
  "category": "パッケージ",
  "syntax": "checkCRAN(method)",
  "description": "CRAN 等のリポジトリネットワークの管理者向け関数群です（ミラー一覧の HTML 化 mirror2html、ミラーの検査 checkCRAN）。【未対応の理由】リポジトリ管理用の関数であり、ミラー一覧ファイルの読み書きとネットワーク上のミラー検査に依存するため（mirrorAdmin 自体は関数ではなく文書見出し）",
  "example": "checkCRAN()",
  "caution": "主に CRAN 管理者向けです。",
  "status": "unsupported"
 },
 {
  "name": "mirror2html",
  "category": "パッケージ",
  "syntax": "mirror2html(mirrors = NULL, file = \"mirrors.html\", head = \"mirrors-head.html\", foot = \"mirrors-foot.html\")",
  "description": "CRAN 等のリポジトリネットワークの管理者向け関数群です（ミラー一覧の HTML 化 mirror2html、ミラーの検査 checkCRAN）。【未対応の理由】リポジトリ管理用の関数であり、ミラー一覧ファイルの読み書きとネットワーク上のミラー検査に依存するため（mirrorAdmin 自体は関数ではなく文書見出し）",
  "example": "mirror2html(x)",
  "caution": "主に CRAN 管理者向けです。",
  "status": "unsupported"
 },
 {
  "name": "mirrorAdmin",
  "category": "パッケージ",
  "syntax": "mirrorAdmin",
  "description": "CRAN 等のリポジトリネットワークの管理者向け関数群です（ミラー一覧の HTML 化 mirror2html、ミラーの検査 checkCRAN）。【未対応の理由】リポジトリ管理用の関数であり、ミラー一覧ファイルの読み書きとネットワーク上のミラー検査に依存するため（mirrorAdmin 自体は関数ではなく文書見出し）",
  "example": "mirrorAdmin",
  "caution": "主に CRAN 管理者向けです。",
  "status": "unsupported"
 },
 {
  "name": "news",
  "category": "その他",
  "syntax": "news(query, package = \"R\", lib.loc = NULL, format = NULL, reader = NULL, db = NULL)",
  "description": "R やパッケージのニュース（変更履歴）データベースを構築・照会し、クラス \"news_db\" のオブジェクトを返します（print.news_db は表示メソッドです）。【未対応の理由】パッケージの NEWS ファイルの読み取りと、クラス付きデータベースオブジェクト・ブラウザ表示に依存するため",
  "example": "news(package = \"utils\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "print.news_db",
  "category": "その他",
  "syntax": "print.news_db(x, doBrowse = interactive(), browser = getOption(\"browser\"), ...)",
  "description": "R やパッケージのニュース（変更履歴）データベースを構築・照会し、クラス \"news_db\" のオブジェクトを返します（print.news_db は表示メソッドです）。【未対応の理由】パッケージの NEWS ファイルの読み取りと、クラス付きデータベースオブジェクト・ブラウザ表示に依存するため（print.news_db はそのクラス向けのメソッドです。）",
  "example": "print.news_db(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "nsl",
  "category": "入出力",
  "syntax": "nsl(hostname)",
  "description": "ホスト名から IP アドレスを引いて返します（Unix 系）。【未対応の理由】DNS 参照というネットワーク操作に依存し、結果が実行環境の名前解決に依存するため",
  "example": "nsl(\"www.r-project.org\")",
  "caution": "主に Unix 系向けです。",
  "status": "unsupported"
 },
 {
  "name": "format.object_size",
  "category": "システム",
  "syntax": "format.object_size(x, units = \"b\", standard = \"auto\", digits = 1L, ...)",
  "description": "オブジェクトの格納に使われているメモリ量の見積もり（クラス \"object_size\" 付きの数値）を返します（format／print はそのメソッドです）。【未対応の理由】サイズの値自体が R の内部表現（実装・プラットフォーム）に依存する見積もりであり、値モデル上のオブジェクトとは対応しないため（誤ったサイズを返すくらいなら未対応とする）。クラス付き数値である点も理由に含む",
  "example": "object.size(letters)",
  "caution": "あくまで見積もりで、環境や関数では実効サイズと異なることがあります。",
  "status": "unsupported"
 },
 {
  "name": "object.size",
  "category": "システム",
  "syntax": "object.size(x)",
  "description": "オブジェクトの格納に使われているメモリ量の見積もり（クラス \"object_size\" 付きの数値）を返します（format／print はそのメソッドです）。【未対応の理由】サイズの値自体が R の内部表現（実装・プラットフォーム）に依存する見積もりであり、値モデル上のオブジェクトとは対応しないため（誤ったサイズを返すくらいなら未対応とする）。クラス付き数値である点も理由に含む",
  "example": "object.size(x)",
  "caution": "あくまで見積もりで、環境や関数では実効サイズと異なることがあります。",
  "status": "unsupported"
 },
 {
  "name": "print.object_size",
  "category": "システム",
  "syntax": "print.object_size(x, quote = FALSE, units = \"b\", standard = \"auto\", digits = 1L, ...)",
  "description": "オブジェクトの格納に使われているメモリ量の見積もり（クラス \"object_size\" 付きの数値）を返します（format／print はそのメソッドです）。【未対応の理由】サイズの値自体が R の内部表現（実装・プラットフォーム）に依存する見積もりであり、値モデル上のオブジェクトとは対応しないため（誤ったサイズを返すくらいなら未対応とする）。クラス付き数値である点も理由に含む（print.object_size はそのクラス向けのメソッドです。）",
  "example": "print.object_size(x)",
  "caution": "あくまで見積もりで、環境や関数では実効サイズと異なることがあります。",
  "status": "unsupported"
 },
 {
  "name": "package.skeleton",
  "category": "パッケージ",
  "syntax": "package.skeleton(name = \"anRpackage\", list = character(), environment = .GlobalEnv, path = \".\", force = FALSE, code_files = character(), encoding = \"unknown\")",
  "description": "新しいソースパッケージの雛形（ディレクトリ・ファイル群）をファイルシステム上に作成します。【未対応の理由】パッケージ雛形のファイル群を書き出すファイル生成操作であるため",
  "example": "package.skeleton(\"mypackage\")",
  "caution": "既存ファイルは上書きされません。",
  "status": "unsupported"
 },
 {
  "name": "asDateBuilt",
  "category": "パッケージ",
  "syntax": "asDateBuilt(built)",
  "description": "インストール済みパッケージの DESCRIPTION 情報を読みます。packageDescription はクラス \"packageDescription\" 付きリスト、packageVersion はクラス \"package_version\" 付きのバージョン、packageDate／asDateBuilt はその日付を返し、print は表示メソッドです。【未対応の理由】実際のライブラリにあるパッケージの DESCRIPTION ファイル（実行環境の状態）の読み取りと、クラス付きオブジェクトの返却に依存するため",
  "example": "packageDescription(\"utils\")",
  "caution": "結果はインストール状態に依存します。",
  "status": "unsupported"
 },
 {
  "name": "packageDate",
  "category": "パッケージ",
  "syntax": "packageDate(pkg, lib.loc = NULL, date.fields = c(\"Date\", \"Packaged\", \"Date/Publication\", \"Built\"), tryFormats = c(\"%Y-%m-%d\", \"%Y/%m/%d\", \"%D\", \"%m/%d/%y\"), desc = packageDescription(pkg, lib.loc = lib.loc, fields = date.fields))",
  "description": "インストール済みパッケージの DESCRIPTION 情報を読みます。packageDescription はクラス \"packageDescription\" 付きリスト、packageVersion はクラス \"package_version\" 付きのバージョン、packageDate／asDateBuilt はその日付を返し、print は表示メソッドです。【未対応の理由】実際のライブラリにあるパッケージの DESCRIPTION ファイル（実行環境の状態）の読み取りと、クラス付きオブジェクトの返却に依存するため",
  "example": "packageDate(x)",
  "caution": "結果はインストール状態に依存します。",
  "status": "unsupported"
 },
 {
  "name": "packageDescription",
  "category": "パッケージ",
  "syntax": "packageDescription(pkg, lib.loc = NULL, fields = NULL, drop = TRUE, encoding = \"\")",
  "description": "インストール済みパッケージの DESCRIPTION 情報を読みます。packageDescription はクラス \"packageDescription\" 付きリスト、packageVersion はクラス \"package_version\" 付きのバージョン、packageDate／asDateBuilt はその日付を返し、print は表示メソッドです。【未対応の理由】実際のライブラリにあるパッケージの DESCRIPTION ファイル（実行環境の状態）の読み取りと、クラス付きオブジェクトの返却に依存するため",
  "example": "packageDescription(x)",
  "caution": "結果はインストール状態に依存します。",
  "status": "unsupported"
 },
 {
  "name": "packageVersion",
  "category": "パッケージ",
  "syntax": "packageVersion(pkg, lib.loc = NULL)",
  "description": "インストール済みパッケージの DESCRIPTION 情報を読みます。packageDescription はクラス \"packageDescription\" 付きリスト、packageVersion はクラス \"package_version\" 付きのバージョン、packageDate／asDateBuilt はその日付を返し、print は表示メソッドです。【未対応の理由】実際のライブラリにあるパッケージの DESCRIPTION ファイル（実行環境の状態）の読み取りと、クラス付きオブジェクトの返却に依存するため",
  "example": "packageVersion(x)",
  "caution": "結果はインストール状態に依存します。",
  "status": "unsupported"
 },
 {
  "name": "print.packageDescription",
  "category": "パッケージ",
  "syntax": "print.packageDescription(x, abbrCollate = 0.8 * getOption(\"width\"), ...)",
  "description": "インストール済みパッケージの DESCRIPTION 情報を読みます。packageDescription はクラス \"packageDescription\" 付きリスト、packageVersion はクラス \"package_version\" 付きのバージョン、packageDate／asDateBuilt はその日付を返し、print は表示メソッドです。【未対応の理由】実際のライブラリにあるパッケージの DESCRIPTION ファイル（実行環境の状態）の読み取りと、クラス付きオブジェクトの返却に依存するため（print.packageDescription はそのクラス向けのメソッドです。）",
  "example": "print.packageDescription(x)",
  "caution": "結果はインストール状態に依存します。",
  "status": "unsupported"
 },
 {
  "name": "packageName",
  "category": "環境と言語",
  "syntax": "packageName(env = parent.frame())",
  "description": "環境に関連付けられたパッケージの名前を返します。【未対応の理由】環境オブジェクトとパッケージ名前空間の結び付きの内省に依存し、値モデルに環境が無いため",
  "example": "packageName()",
  "caution": "パッケージでない環境では NULL が返ります。",
  "status": "unsupported"
 },
 {
  "name": "packageStatus",
  "category": "パッケージ",
  "syntax": "packageStatus(lib.loc = NULL, repositories = NULL, method, type = getOption(\"pkgType\"), ...)",
  "description": "ライブラリのパッケージの状態（リポジトリ版との比較を含む）を要約したクラス \"packageStatus\" のオブジェクトを返します（print／summary／update／upgrade はそのメソッドです）。【未対応の理由】ライブラリとリポジトリ双方の実状態（ファイルシステムとネットワーク）に依存し、クラス付きオブジェクトを返すため",
  "example": "packageStatus()",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "print.packageStatus",
  "category": "パッケージ",
  "syntax": "print.packageStatus(x, ...)",
  "description": "ライブラリのパッケージの状態（リポジトリ版との比較を含む）を要約したクラス \"packageStatus\" のオブジェクトを返します（print／summary／update／upgrade はそのメソッドです）。【未対応の理由】ライブラリとリポジトリ双方の実状態（ファイルシステムとネットワーク）に依存し、クラス付きオブジェクトを返すため（print.packageStatus はそのクラス向けのメソッドです。）",
  "example": "print.packageStatus(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "summary.packageStatus",
  "category": "パッケージ",
  "syntax": "summary.packageStatus(object, ...)",
  "description": "ライブラリのパッケージの状態（リポジトリ版との比較を含む）を要約したクラス \"packageStatus\" のオブジェクトを返します（print／summary／update／upgrade はそのメソッドです）。【未対応の理由】ライブラリとリポジトリ双方の実状態（ファイルシステムとネットワーク）に依存し、クラス付きオブジェクトを返すため（summary.packageStatus はそのクラス向けのメソッドです。）",
  "example": "summary.packageStatus(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "update.packageStatus",
  "category": "パッケージ",
  "syntax": "update.packageStatus(object, lib.loc = levels(object$inst$LibPath), repositories = levels(object$avail$Repository), ...)",
  "description": "ライブラリのパッケージの状態（リポジトリ版との比較を含む）を要約したクラス \"packageStatus\" のオブジェクトを返します（print／summary／update／upgrade はそのメソッドです）。【未対応の理由】ライブラリとリポジトリ双方の実状態（ファイルシステムとネットワーク）に依存し、クラス付きオブジェクトを返すため",
  "example": "update.packageStatus(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "upgrade.packageStatus",
  "category": "パッケージ",
  "syntax": "upgrade.packageStatus(object, ask = TRUE, ...)",
  "description": "ライブラリのパッケージの状態（リポジトリ版との比較を含む）を要約したクラス \"packageStatus\" のオブジェクトを返します（print／summary／update／upgrade はそのメソッドです）。【未対応の理由】ライブラリとリポジトリ双方の実状態（ファイルシステムとネットワーク）に依存し、クラス付きオブジェクトを返すため",
  "example": "upgrade.packageStatus(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "page",
  "category": "入出力",
  "syntax": "page(x, method = c(\"dput\", \"print\"), ...)",
  "description": "オブジェクトをページャ（pager）で表示します。【未対応の理由】ページャという表示機構（対話的表示）に依存するため",
  "example": "page(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "as.character.person",
  "category": "その他",
  "syntax": "as.character.person(x, ...)",
  "description": "人物情報（名前・メール・役割等）を表すクラス \"person\" の構造化オブジェクトを作成・変換します。その整形・表示・部分取り出しは S3 メソッド（format／print／as.character／c／toBibtex／$／[）が行います。【未対応の理由】クラス \"person\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため",
  "example": "person(\"John\", \"Doe\", email = \"john@example.com\")",
  "caution": "role は \"aut\"（著者）や \"cre\"（作成者）等のコードです。",
  "status": "unsupported"
 },
 {
  "name": "as.person",
  "category": "その他",
  "syntax": "as.person(x)",
  "description": "人物情報（名前・メール・役割等）を表すクラス \"person\" の構造化オブジェクトを作成・変換します。その整形・表示・部分取り出しは S3 メソッド（format／print／as.character／c／toBibtex／$／[）が行います。【未対応の理由】クラス \"person\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため（as.person はそのクラス向けのメソッドです。）",
  "example": "as.person(x)",
  "caution": "role は \"aut\"（著者）や \"cre\"（作成者）等のコードです。",
  "status": "unsupported"
 },
 {
  "name": "c.person",
  "category": "その他",
  "syntax": "c.person(..., recursive = FALSE)",
  "description": "人物情報（名前・メール・役割等）を表すクラス \"person\" の構造化オブジェクトを作成・変換します。その整形・表示・部分取り出しは S3 メソッド（format／print／as.character／c／toBibtex／$／[）が行います。【未対応の理由】クラス \"person\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため（c.person はそのクラス向けのメソッドです。）",
  "example": "c.person(x)",
  "caution": "role は \"aut\"（著者）や \"cre\"（作成者）等のコードです。",
  "status": "unsupported"
 },
 {
  "name": "format.person",
  "category": "その他",
  "syntax": "format.person(x, include = c(\"given\", \"family\", \"email\", \"role\", \"comment\"), braces = list(given = \"\", family = \"\", email = c(\"<\", \">\"), role = c(\"[\", \"]\"), comment = c(\"(\", \")\")), collapse = list(given = \" \", family = \" \", email = \", \", role = \", \", comment = \", \"), ..., style = c(\"text\", \"R\"))",
  "description": "人物情報（名前・メール・役割等）を表すクラス \"person\" の構造化オブジェクトを作成・変換します。その整形・表示・部分取り出しは S3 メソッド（format／print／as.character／c／toBibtex／$／[）が行います。【未対応の理由】クラス \"person\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため（format.person はそのクラス向けのメソッドです。）",
  "example": "format.person(x)",
  "caution": "role は \"aut\"（著者）や \"cre\"（作成者）等のコードです。",
  "status": "unsupported"
 },
 {
  "name": "person",
  "category": "その他",
  "syntax": "person(given = NULL, family = NULL, middle = NULL, email = NULL, role = NULL, comment = NULL, first = NULL, last = NULL)",
  "description": "人物情報（名前・メール・役割等）を表すクラス \"person\" の構造化オブジェクトを作成・変換します。その整形・表示・部分取り出しは S3 メソッド（format／print／as.character／c／toBibtex／$／[）が行います。【未対応の理由】クラス \"person\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため",
  "example": "person(x)",
  "caution": "role は \"aut\"（著者）や \"cre\"（作成者）等のコードです。",
  "status": "unsupported"
 },
 {
  "name": "print.person",
  "category": "その他",
  "syntax": "print.person(x, ...)",
  "description": "人物情報（名前・メール・役割等）を表すクラス \"person\" の構造化オブジェクトを作成・変換します。その整形・表示・部分取り出しは S3 メソッド（format／print／as.character／c／toBibtex／$／[）が行います。【未対応の理由】クラス \"person\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため（print.person はそのクラス向けのメソッドです。）",
  "example": "print.person(x)",
  "caution": "role は \"aut\"（著者）や \"cre\"（作成者）等のコードです。",
  "status": "unsupported"
 },
 {
  "name": "toBibtex.person",
  "category": "その他",
  "syntax": "toBibtex.person(object, escape = FALSE, ...)",
  "description": "人物情報（名前・メール・役割等）を表すクラス \"person\" の構造化オブジェクトを作成・変換します。その整形・表示・部分取り出しは S3 メソッド（format／print／as.character／c／toBibtex／$／[）が行います。【未対応の理由】クラス \"person\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため（toBibtex.person はそのクラス向けのメソッドです。）",
  "example": "toBibtex.person(x)",
  "caution": "role は \"aut\"（著者）や \"cre\"（作成者）等のコードです。",
  "status": "unsupported"
 },
 {
  "name": "$.person",
  "category": "その他",
  "syntax": "$.person(x, name)",
  "description": "人物情報（名前・メール・役割等）を表すクラス \"person\" の構造化オブジェクトを作成・変換します。その整形・表示・部分取り出しは S3 メソッド（format／print／as.character／c／toBibtex／$／[）が行います。【未対応の理由】クラス \"person\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため（$.person はそのクラス向けのメソッドです。）",
  "example": "person(\"John\", \"Doe\", email = \"john@example.com\")$email",
  "caution": "role は \"aut\"（著者）や \"cre\"（作成者）等のコードです。",
  "status": "unsupported"
 },
 {
  "name": "[.person",
  "category": "その他",
  "syntax": "[.person(x, i)",
  "description": "人物情報（名前・メール・役割等）を表すクラス \"person\" の構造化オブジェクトを作成・変換します。その整形・表示・部分取り出しは S3 メソッド（format／print／as.character／c／toBibtex／$／[）が行います。【未対応の理由】クラス \"person\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため（[.person はそのクラス向けのメソッドです。）",
  "example": "person(\"John\", \"Doe\")[1]",
  "caution": "role は \"aut\"（著者）や \"cre\"（作成者）等のコードです。",
  "status": "unsupported"
 },
 {
  "name": "as.personList",
  "category": "その他",
  "syntax": "as.personList(x)",
  "description": "人物（person）の集合を表す旧インタフェースで、クラス \"person\" のオブジェクトを作成します。【未対応の理由】クラス \"person\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため",
  "example": "personList(person(\"John\", \"Doe\"))",
  "caution": "旧インタフェースで、新規には person() が推奨されます。",
  "status": "unsupported"
 },
 {
  "name": "personList",
  "category": "その他",
  "syntax": "personList(...)",
  "description": "人物（person）の集合を表す旧インタフェースで、クラス \"person\" のオブジェクトを作成します。【未対応の理由】クラス \"person\" 付きの構造化リストオブジェクトを返すため、値モデルで忠実に再現できないため",
  "example": "personList(x)",
  "caution": "旧インタフェースで、新規には person() が推奨されます。",
  "status": "unsupported"
 },
 {
  "name": "process.events",
  "category": "システム",
  "syntax": "process.events()",
  "description": "OS のイベント（キー入力・マウスクリック等）の処理を即時にトリガーします。【未対応の理由】GUI フロントエンドのイベント処理という内部機構であり、シミュレータにはイベントループが無いため",
  "example": "process.events()",
  "caution": "主に Windows GUI 等のフロントエンドで意味を持ちます。",
  "status": "unsupported"
 },
 {
  "name": "prompt",
  "category": "その他",
  "syntax": "prompt(object, filename = NULL, name = NULL, ...)",
  "description": "R 文書ファイル（Rd）の雛形を生成してファイルへ書き出します（promptImport は import 項目用です）。【未対応の理由】文書ファイル（Rd）の雛形をファイルへ書き出す生成操作であるため",
  "example": "prompt(mean)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "promptImport",
  "category": "その他",
  "syntax": "promptImport(object, filename = NULL, name = NULL, importedFrom = NULL, importPage = name, ...)",
  "description": "R 文書ファイル（Rd）の雛形を生成してファイルへ書き出します（promptImport は import 項目用です）。【未対応の理由】文書ファイル（Rd）の雛形をファイルへ書き出す生成操作であるため",
  "example": "promptImport(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "promptData",
  "category": "その他",
  "syntax": "promptData(object, filename = NULL, name = NULL)",
  "description": "データセットの概要文書（Rd）の雛形を生成してファイルへ書き出します。【未対応の理由】文書ファイル（Rd）の雛形をファイルへ書き出す生成操作であるため",
  "example": "promptData(women)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "promptPackage",
  "category": "パッケージ",
  "syntax": "promptPackage(package, lib.loc = NULL, filename = NULL, name = NULL, final = FALSE)",
  "description": "パッケージ文書の雛形（Rd）を生成してファイルへ書き出します。【未対応の理由】パッケージの実ファイル構成の走査と、文書ファイルの書き出しに依存するため",
  "example": "promptPackage(\"utils\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "read.socket",
  "category": "入出力",
  "syntax": "read.socket(socket, maxlen = 256L, loop = FALSE)",
  "description": "ソケット接続から読み取り（read.socket）、または書き込み（write.socket）を行います。【未対応の理由】ソケットという外部リソース（接続オブジェクト）に依存するため",
  "example": "read.socket(socket)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "write.socket",
  "category": "入出力",
  "syntax": "write.socket(socket, string)",
  "description": "ソケット接続から読み取り（read.socket）、または書き込み（write.socket）を行います。【未対応の理由】ソケットという外部リソース（接続オブジェクト）に依存するため",
  "example": "write.socket(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "readRegistry",
  "category": "システム",
  "syntax": "readRegistry(key, hive = c(\"HLM\", \"HCR\", \"HCU\", \"HU\", \"HCC\", \"HPD\"), maxdepth = 1, view = c(\"default\", \"32-bit\", \"64-bit\"))",
  "description": "MS Windows のレジストリハイブを読み取って返します。【未対応の理由】Windows レジストリという OS の外部データストアの読み取りに依存するため",
  "example": "readRegistry(\"SOFTWARE\\\\R-core\")",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "recover",
  "category": "システム",
  "syntax": "recover()",
  "description": "エラー発生後に、呼び出しフレームを対話的にブラウズできる状態に入ります。【未対応の理由】対話的デバッガとエラー時の実行フレームに依存するため",
  "example": "recover()",
  "caution": "options(error = recover) と組み合わせて使います。",
  "status": "unsupported"
 },
 {
  "name": "remove.packages",
  "category": "パッケージ",
  "syntax": "remove.packages(pkgs, lib)",
  "description": "インストール済みパッケージをライブラリから削除します。【未対応の理由】ライブラリ内のパッケージファイルの削除というファイルシステム変更を伴うパッケージ管理操作のため",
  "example": "remove.packages(\"pkg\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "removeSource",
  "category": "言語オブジェクト",
  "syntax": "removeSource(fn)",
  "description": "関数や言語オブジェクトに保持されているソース（srcref 属性）を取り除いたコピーを返します。【未対応の理由】言語オブジェクトとその srcref 属性の操作に依存し、値モデルで忠実に再現できないため",
  "example": "removeSource(fn)",
  "caution": "keep.source で保持されたソースが対象です。",
  "status": "unsupported"
 },
 {
  "name": "rtags",
  "category": "パッケージ",
  "syntax": "rtags(path = \".\", pattern = \"\\\\.[RrSs]$\", recursive = FALSE, src = list.files(path = path, pattern = pattern, full.names = TRUE, recursive = recursive), keep.re = NULL, ofile = \"\", append = FALSE, verbose = getOption(\"verbose\"), type = c(\"etags\", \"ctags\"))",
  "description": "R 用の etags 形式タグファイルを生成するユーティリティです（ファイル群を走査してタグファイルへ書き出します）。【未対応の理由】ソースファイル群の走査とタグファイルへの書き出しというファイル操作であるため",
  "example": "rtags()",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "history",
  "category": "システム",
  "syntax": "history(max.show = 25, reverse = FALSE, pattern, ...)",
  "description": "対話セッションのコマンド履歴をファイルへ保存（savehistory）・読み込み（loadhistory）し、表示（history）します。timestamp は履歴へ時刻印のコメントを挿入します。【未対応の理由】対話セッションの履歴という実行環境の状態と、履歴ファイルの読み書きに依存するため",
  "example": "savehistory()",
  "caution": "非対話セッションでは履歴が存在しません。",
  "status": "unsupported"
 },
 {
  "name": "loadhistory",
  "category": "システム",
  "syntax": "loadhistory(file = \".Rhistory\")",
  "description": "対話セッションのコマンド履歴をファイルへ保存（savehistory）・読み込み（loadhistory）し、表示（history）します。timestamp は履歴へ時刻印のコメントを挿入します。【未対応の理由】対話セッションの履歴という実行環境の状態と、履歴ファイルの読み書きに依存するため",
  "example": "loadhistory(x)",
  "caution": "非対話セッションでは履歴が存在しません。",
  "status": "unsupported"
 },
 {
  "name": "savehistory",
  "category": "システム",
  "syntax": "savehistory(file = \".Rhistory\")",
  "description": "対話セッションのコマンド履歴をファイルへ保存（savehistory）・読み込み（loadhistory）し、表示（history）します。timestamp は履歴へ時刻印のコメントを挿入します。【未対応の理由】対話セッションの履歴という実行環境の状態と、履歴ファイルの読み書きに依存するため",
  "example": "savehistory(x)",
  "caution": "非対話セッションでは履歴が存在しません。",
  "status": "unsupported"
 },
 {
  "name": "timestamp",
  "category": "システム",
  "syntax": "timestamp(stamp = date(), prefix = \"##------ \", suffix = \" ------##\", quiet = FALSE)",
  "description": "対話セッションのコマンド履歴をファイルへ保存（savehistory）・読み込み（loadhistory）し、表示（history）します。timestamp は履歴へ時刻印のコメントを挿入します。【未対応の理由】対話セッションの履歴という実行環境の状態と、履歴ファイルの読み書きに依存するため",
  "example": "timestamp(x)",
  "caution": "非対話セッションでは履歴が存在しません。",
  "status": "unsupported"
 },
 {
  "name": "select.list",
  "category": "入出力",
  "syntax": "select.list(choices, preselect = NULL, multiple = FALSE, title = NULL, graphics = getOption(\"menu.graphics\"))",
  "description": "選択肢のリストを対話的に（テキストまたはグラフィックスで）提示し、ユーザーが選んだ要素を返します。【未対応の理由】対話的な入力待ち（ユーザーの選択）に依存し、非対話のシミュレータでは再現できないため",
  "example": "select.list(c(\"a\", \"b\"))",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "osVersion",
  "category": "システム",
  "syntax": "osVersion",
  "description": "現在の R セッションについての情報（R のバージョン、OS、ロケール、読み込み済みパッケージ等）をクラス \"sessionInfo\" のオブジェクトとして集めます（print／toLatex はそのメソッド、osVersion は OS 名の文字列オブジェクトです）。【未対応の理由】実行環境そのものの情報（バージョン・OS・ロケール・読み込み状態）を返すため、シミュレータで値を捏造せず未対応とする（クラス付きオブジェクトである点も含む）",
  "example": "osVersion",
  "caution": "結果は実行環境ごとに異なります。",
  "status": "unsupported"
 },
 {
  "name": "print.sessionInfo",
  "category": "システム",
  "syntax": "print.sessionInfo(x, locale = TRUE, tzone = locale, RNG = !identical(x$RNGkind, .RNGdefaults), ...)",
  "description": "現在の R セッションについての情報（R のバージョン、OS、ロケール、読み込み済みパッケージ等）をクラス \"sessionInfo\" のオブジェクトとして集めます（print／toLatex はそのメソッド、osVersion は OS 名の文字列オブジェクトです）。【未対応の理由】実行環境そのものの情報（バージョン・OS・ロケール・読み込み状態）を返すため、シミュレータで値を捏造せず未対応とする（クラス付きオブジェクトである点も含む）（print.sessionInfo はそのクラス向けのメソッドです。）",
  "example": "print.sessionInfo(x)",
  "caution": "結果は実行環境ごとに異なります。",
  "status": "unsupported"
 },
 {
  "name": "sessionInfo",
  "category": "システム",
  "syntax": "sessionInfo(package = NULL)",
  "description": "現在の R セッションについての情報（R のバージョン、OS、ロケール、読み込み済みパッケージ等）をクラス \"sessionInfo\" のオブジェクトとして集めます（print／toLatex はそのメソッド、osVersion は OS 名の文字列オブジェクトです）。【未対応の理由】実行環境そのものの情報（バージョン・OS・ロケール・読み込み状態）を返すため、シミュレータで値を捏造せず未対応とする（クラス付きオブジェクトである点も含む）",
  "example": "sessionInfo(x)",
  "caution": "結果は実行環境ごとに異なります。",
  "status": "unsupported"
 },
 {
  "name": "toLatex.sessionInfo",
  "category": "システム",
  "syntax": "toLatex.sessionInfo(object, locale = TRUE, tzone = locale, RNG = !identical(object$RNGkind, .RNGdefaults), ...)",
  "description": "現在の R セッションについての情報（R のバージョン、OS、ロケール、読み込み済みパッケージ等）をクラス \"sessionInfo\" のオブジェクトとして集めます（print／toLatex はそのメソッド、osVersion は OS 名の文字列オブジェクトです）。【未対応の理由】実行環境そのものの情報（バージョン・OS・ロケール・読み込み状態）を返すため、シミュレータで値を捏造せず未対応とする（クラス付きオブジェクトである点も含む）（toLatex.sessionInfo はそのクラス向けのメソッドです。）",
  "example": "toLatex.sessionInfo(x)",
  "caution": "結果は実行環境ごとに異なります。",
  "status": "unsupported"
 },
 {
  "name": "R_BIOC_VERSION",
  "category": "パッケージ",
  "syntax": "R_BIOC_VERSION",
  "description": "使うパッケージリポジトリを対話的に（または番号・名前で）選択し、オプションに設定します。R_BIOC_VERSION／R_REPOSITORIES は関連する環境変数・設定の文書名です。【未対応の理由】リポジトリ選択という対話操作とセッションオプションの変更に依存するため（環境変数名は関数ではない）",
  "example": "R_BIOC_VERSION",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "R_REPOSITORIES",
  "category": "パッケージ",
  "syntax": "R_REPOSITORIES",
  "description": "使うパッケージリポジトリを対話的に（または番号・名前で）選択し、オプションに設定します。R_BIOC_VERSION／R_REPOSITORIES は関連する環境変数・設定の文書名です。【未対応の理由】リポジトリ選択という対話操作とセッションオプションの変更に依存するため（環境変数名は関数ではない）",
  "example": "R_REPOSITORIES",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "setRepositories",
  "category": "パッケージ",
  "syntax": "setRepositories(graphics = getOption(\"menu.graphics\"), ind = NULL, addURLs = character())",
  "description": "使うパッケージリポジトリを対話的に（または番号・名前で）選択し、オプションに設定します。R_BIOC_VERSION／R_REPOSITORIES は関連する環境変数・設定の文書名です。【未対応の理由】リポジトリ選択という対話操作とセッションオプションの変更に依存するため（環境変数名は関数ではない）",
  "example": "setRepositories(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "getIdentification",
  "category": "システム",
  "syntax": "getIdentification()",
  "description": "MS Windows の RGui のウィンドウタイトルやステータスバーを設定・取得します（getIdentification は識別文字列、getWindowTitle は現在のタイトルを返します）。【未対応の理由】Windows 版 Rgui のウィンドウ・ステータスバーという GUI 要素の操作に依存するため",
  "example": "setWindowTitle(\"title\")",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "getWindowTitle",
  "category": "システム",
  "syntax": "getWindowTitle()",
  "description": "MS Windows の RGui のウィンドウタイトルやステータスバーを設定・取得します（getIdentification は識別文字列、getWindowTitle は現在のタイトルを返します）。【未対応の理由】Windows 版 Rgui のウィンドウ・ステータスバーという GUI 要素の操作に依存するため",
  "example": "getWindowTitle(x)",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "setStatusBar",
  "category": "システム",
  "syntax": "setStatusBar(text)",
  "description": "MS Windows の RGui のウィンドウタイトルやステータスバーを設定・取得します（getIdentification は識別文字列、getWindowTitle は現在のタイトルを返します）。【未対応の理由】Windows 版 Rgui のウィンドウ・ステータスバーという GUI 要素の操作に依存するため",
  "example": "setStatusBar(x)",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "setWindowTitle",
  "category": "システム",
  "syntax": "setWindowTitle(suffix, title = paste(getIdentification(), suffix))",
  "description": "MS Windows の RGui のウィンドウタイトルやステータスバーを設定・取得します（getIdentification は識別文字列、getWindowTitle は現在のタイトルを返します）。【未対応の理由】Windows 版 Rgui のウィンドウ・ステータスバーという GUI 要素の操作に依存するため",
  "example": "setWindowTitle(x)",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "shortPathName",
  "category": "システム",
  "syntax": "shortPathName(path)",
  "description": "MS Windows で、ファイルパスを短い形式（8.3 形式）で表して返します。【未対応の理由】Windows のファイルシステムのパス形式に依存するため",
  "example": "shortPathName(path)",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "getSrcDirectory",
  "category": "言語オブジェクト",
  "syntax": "getSrcDirectory(x, unique = TRUE)",
  "description": "ソース参照（srcref）から、ソースファイル名・ディレクトリ・位置を取り出すユーティリティ群です。【未対応の理由】関数オブジェクトに付随するソース参照（srcref 属性）という言語オブジェクトの内省に依存するため",
  "example": "getSrcFilename(fn)",
  "caution": "keep.source でソースが保持されている必要があります。",
  "status": "unsupported"
 },
 {
  "name": "getSrcFilename",
  "category": "言語オブジェクト",
  "syntax": "getSrcFilename(x, full.names = FALSE, unique = TRUE)",
  "description": "ソース参照（srcref）から、ソースファイル名・ディレクトリ・位置を取り出すユーティリティ群です。【未対応の理由】関数オブジェクトに付随するソース参照（srcref 属性）という言語オブジェクトの内省に依存するため",
  "example": "getSrcFilename(x)",
  "caution": "keep.source でソースが保持されている必要があります。",
  "status": "unsupported"
 },
 {
  "name": "getSrcLocation",
  "category": "言語オブジェクト",
  "syntax": "getSrcLocation(x, which = c(\"line\", \"column\", \"byte\", \"parse\"), first = TRUE)",
  "description": "ソース参照（srcref）から、ソースファイル名・ディレクトリ・位置を取り出すユーティリティ群です。【未対応の理由】関数オブジェクトに付随するソース参照（srcref 属性）という言語オブジェクトの内省に依存するため",
  "example": "getSrcLocation(x)",
  "caution": "keep.source でソースが保持されている必要があります。",
  "status": "unsupported"
 },
 {
  "name": "getSrcref",
  "category": "言語オブジェクト",
  "syntax": "getSrcref(x)",
  "description": "ソース参照（srcref）から、ソースファイル名・ディレクトリ・位置を取り出すユーティリティ群です。【未対応の理由】関数オブジェクトに付随するソース参照（srcref 属性）という言語オブジェクトの内省に依存するため",
  "example": "getSrcref(x)",
  "caution": "keep.source でソースが保持されている必要があります。",
  "status": "unsupported"
 },
 {
  "name": "summaryRprof",
  "category": "システム",
  "syntax": "summaryRprof(filename = \"Rprof.out\", chunksize = 5000, memory = c(\"none\", \"both\", \"tseries\", \"stats\"), lines = c(\"hide\", \"show\", \"both\"), index = 2, diff = TRUE, exclude = NULL, basenames = 1)",
  "description": "サンプリングプロファイラ（Rprof）の出力ファイルを読み取り、関数ごとの時間内訳に要約します。【未対応の理由】プロファイル出力ファイルの読み取りと、クラス付き要約オブジェクトの生成に依存するため",
  "example": "summaryRprof()",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "tar",
  "category": "ファイル",
  "syntax": "tar(tarfile, files = NULL, compression = c(\"none\", \"gzip\", \"bzip2\", \"xz\"), compression_level = 6, tar = Sys.getenv(\"tar\"), extra_flags = \"\")",
  "description": "tar アーカイブを作成します。【未対応の理由】ファイルシステム上のファイルのアーカイブ作成（外部 tar 実装または内部実装によるファイル書き出し）に依存するため",
  "example": "tar(\"file.tar\", files)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "print.Bibtex",
  "category": "その他",
  "syntax": "print.Bibtex(x, prefix = \"\", ...)",
  "description": "オブジェクトを BibTeX（toBibtex）や LaTeX（toLatex）形式へ変換する S3 ジェネリックです（クラス \"Bibtex\"／\"Latex\" 付き文字列を返します。print はそのメソッドです）。【未対応の理由】任意クラスへの S3 ディスパッチと、クラス付き文字列オブジェクトの返却に依存するため",
  "example": "toLatex(sessionInfo())",
  "caution": "対象クラスごとにメソッドが定義されます。",
  "status": "unsupported"
 },
 {
  "name": "print.Latex",
  "category": "その他",
  "syntax": "print.Latex(x, prefix = \"\", ...)",
  "description": "オブジェクトを BibTeX（toBibtex）や LaTeX（toLatex）形式へ変換する S3 ジェネリックです（クラス \"Bibtex\"／\"Latex\" 付き文字列を返します。print はそのメソッドです）。【未対応の理由】任意クラスへの S3 ディスパッチと、クラス付き文字列オブジェクトの返却に依存するため（print.Latex はそのクラス向けのメソッドです。）",
  "example": "print.Latex(x)",
  "caution": "対象クラスごとにメソッドが定義されます。",
  "status": "unsupported"
 },
 {
  "name": "toBibtex",
  "category": "その他",
  "syntax": "toBibtex(object, ...)",
  "description": "オブジェクトを BibTeX（toBibtex）や LaTeX（toLatex）形式へ変換する S3 ジェネリックです（クラス \"Bibtex\"／\"Latex\" 付き文字列を返します。print はそのメソッドです）。【未対応の理由】任意クラスへの S3 ディスパッチと、クラス付き文字列オブジェクトの返却に依存するため",
  "example": "toBibtex(x)",
  "caution": "対象クラスごとにメソッドが定義されます。",
  "status": "unsupported"
 },
 {
  "name": "toLatex",
  "category": "その他",
  "syntax": "toLatex(object, ...)",
  "description": "オブジェクトを BibTeX（toBibtex）や LaTeX（toLatex）形式へ変換する S3 ジェネリックです（クラス \"Bibtex\"／\"Latex\" 付き文字列を返します。print はそのメソッドです）。【未対応の理由】任意クラスへの S3 ディスパッチと、クラス付き文字列オブジェクトの返却に依存するため",
  "example": "toLatex(x)",
  "caution": "対象クラスごとにメソッドが定義されます。",
  "status": "unsupported"
 },
 {
  "name": "close.txtProgressBar",
  "category": "入出力",
  "syntax": "close.txtProgressBar(con, ...)",
  "description": "テキスト進捗バーをコンソールに表示します。バーは可変のハンドルオブジェクト（クラス \"txtProgressBar\"）で、get／set で値を読み書きし、close で閉じます。【未対応の理由】コンソール表示という副作用と、参照で更新される可変ハンドルオブジェクトに依存し、値モデルで表せないため",
  "example": "pb <- txtProgressBar()",
  "caution": "setTxtProgressBar は以前の値を不可視に返します。",
  "status": "unsupported"
 },
 {
  "name": "getTxtProgressBar",
  "category": "入出力",
  "syntax": "getTxtProgressBar(pb)",
  "description": "テキスト進捗バーをコンソールに表示します。バーは可変のハンドルオブジェクト（クラス \"txtProgressBar\"）で、get／set で値を読み書きし、close で閉じます。【未対応の理由】コンソール表示という副作用と、参照で更新される可変ハンドルオブジェクトに依存し、値モデルで表せないため",
  "example": "getTxtProgressBar(x)",
  "caution": "setTxtProgressBar は以前の値を不可視に返します。",
  "status": "unsupported"
 },
 {
  "name": "setTxtProgressBar",
  "category": "入出力",
  "syntax": "setTxtProgressBar(pb, value, title = NULL, label = NULL)",
  "description": "テキスト進捗バーをコンソールに表示します。バーは可変のハンドルオブジェクト（クラス \"txtProgressBar\"）で、get／set で値を読み書きし、close で閉じます。【未対応の理由】コンソール表示という副作用と、参照で更新される可変ハンドルオブジェクトに依存し、値モデルで表せないため",
  "example": "setTxtProgressBar(x)",
  "caution": "setTxtProgressBar は以前の値を不可視に返します。",
  "status": "unsupported"
 },
 {
  "name": "txtProgressBar",
  "category": "入出力",
  "syntax": "txtProgressBar(min = 0, max = 1, initial = 0, char = \"=\", width = NA, title, label, style = 1, file = \"\")",
  "description": "テキスト進捗バーをコンソールに表示します。バーは可変のハンドルオブジェクト（クラス \"txtProgressBar\"）で、get／set で値を読み書きし、close で閉じます。【未対応の理由】コンソール表示という副作用と、参照で更新される可変ハンドルオブジェクトに依存し、値モデルで表せないため",
  "example": "txtProgressBar(x)",
  "caution": "setTxtProgressBar は以前の値を不可視に返します。",
  "status": "unsupported"
 },
 {
  "name": "untar",
  "category": "ファイル",
  "syntax": "untar(tarfile, files = NULL, list = FALSE, exdir = \".\", compressed = NA, extras = NULL, verbose = FALSE, restore_times = TRUE, support_old_tars = Sys.getenv(\"R_SUPPORT_OLD_TARS\", FALSE), tar = Sys.getenv(\"TAR\"))",
  "description": "tar アーカイブを展開、または内容を一覧します。【未対応の理由】ファイルシステム上のアーカイブの読み取り・展開に依存するため",
  "example": "untar(\"file.tar\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "unzip",
  "category": "ファイル",
  "syntax": "unzip(zipfile, files = NULL, list = FALSE, overwrite = TRUE, junkpaths = FALSE, exdir = \".\", unzip = \"internal\", setTimes = FALSE)",
  "description": "zip アーカイブを展開、または内容を一覧します。【未対応の理由】ファイルシステム上のアーカイブの読み取り・展開に依存するため",
  "example": "unzip(\"file.zip\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "new.packages",
  "category": "パッケージ",
  "syntax": "new.packages(lib.loc = NULL, repos = getOption(\"repos\"), contriburl = contrib.url(repos, type), instPkgs = installed.packages(lib.loc = lib.loc, ...), method, available = NULL, ask = FALSE, ..., type = getOption(\"pkgType\"))",
  "description": "インストール済みパッケージをリポジトリの版と比較し、新しい版があれば更新します（old.packages は古い一覧、new.packages は未導入で利用可能な一覧を返します）。【未対応の理由】ライブラリとリポジトリ双方の実状態（ファイルシステムとネットワーク）に依存するパッケージ管理操作のため",
  "example": "update.packages()",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "old.packages",
  "category": "パッケージ",
  "syntax": "old.packages(lib.loc = NULL, repos = getOption(\"repos\"), contriburl = contrib.url(repos, type), instPkgs = installed.packages(lib.loc = lib.loc, ...), method, available = NULL, checkBuilt = FALSE, ..., type = getOption(\"pkgType\"))",
  "description": "インストール済みパッケージをリポジトリの版と比較し、新しい版があれば更新します（old.packages は古い一覧、new.packages は未導入で利用可能な一覧を返します）。【未対応の理由】ライブラリとリポジトリ双方の実状態（ファイルシステムとネットワーク）に依存するパッケージ管理操作のため",
  "example": "old.packages(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "update.packages",
  "category": "パッケージ",
  "syntax": "update.packages(lib.loc = NULL, repos = getOption(\"repos\"), contriburl = contrib.url(repos, type), method, instlib = NULL, ask = TRUE, available = NULL, oldPkgs = NULL, ..., checkBuilt = FALSE, type = getOption(\"pkgType\"))",
  "description": "インストール済みパッケージをリポジトリの版と比較し、新しい版があれば更新します（old.packages は古い一覧、new.packages は未導入で利用可能な一覧を返します）。【未対応の理由】ライブラリとリポジトリ双方の実状態（ファイルシステムとネットワーク）に依存するパッケージ管理操作のため",
  "example": "update.packages(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "upgrade",
  "category": "その他",
  "syntax": "upgrade(object, ...)",
  "description": "オブジェクトを（旧形式から）アップグレードするジェネリック関数です。【未対応の理由】任意クラスへの S3 ディスパッチによるオブジェクト変換であり、対象クラスとその内部形式に依存するため",
  "example": "upgrade(object)",
  "caution": "主に旧形式オブジェクトの移行用です。",
  "status": "unsupported"
 },
 {
  "name": "url.show",
  "category": "入出力",
  "syntax": "url.show(url, title = url, file = tempfile(), delete.file = TRUE, method, ...)",
  "description": "URL のテキスト内容を表示します。【未対応の理由】ネットワークアクセスとページャ表示に依存するため",
  "example": "url.show(\"https://example.com\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "utils-deprecated",
  "category": "その他",
  "syntax": "utils-deprecated",
  "description": "utils パッケージの廃止予定（deprecated）関数の文書見出しです（現在、該当項目はありません）。【未対応の理由】文書見出しであり、呼び出せる関数ではないため",
  "example": "utils-deprecated",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "edit.vignette",
  "category": "その他",
  "syntax": "edit.vignette(name, ...)",
  "description": "パッケージのヴィネット（解説文書）を表示、または一覧します（クラス \"vignette\" のオブジェクトを返します。print／edit はそのメソッドです）。【未対応の理由】インストール済みパッケージの文書ファイルの読み取りと表示に依存するため（vignettes は実 R 4.3.3 の名前空間に存在しない見出し名で、実在関数として確認できない）",
  "example": "vignette(\"intro\")",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "print.vignette",
  "category": "その他",
  "syntax": "print.vignette(x, ...)",
  "description": "パッケージのヴィネット（解説文書）を表示、または一覧します（クラス \"vignette\" のオブジェクトを返します。print／edit はそのメソッドです）。【未対応の理由】インストール済みパッケージの文書ファイルの読み取りと表示に依存するため（vignettes は実 R 4.3.3 の名前空間に存在しない見出し名で、実在関数として確認できない）（print.vignette はそのクラス向けのメソッドです。）",
  "example": "print.vignette(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "vignette",
  "category": "その他",
  "syntax": "vignette(topic, package = NULL, lib.loc = NULL, all = TRUE)",
  "description": "パッケージのヴィネット（解説文書）を表示、または一覧します（クラス \"vignette\" のオブジェクトを返します。print／edit はそのメソッドです）。【未対応の理由】インストール済みパッケージの文書ファイルの読み取りと表示に依存するため（vignettes は実 R 4.3.3 の名前空間に存在しない見出し名で、実在関数として確認できない）",
  "example": "vignette(x)",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "vignettes",
  "category": "その他",
  "syntax": "vignette(topic, package = NULL, lib.loc = NULL, all = TRUE)",
  "description": "パッケージのヴィネット（解説文書）を表示、または一覧します（クラス \"vignette\" のオブジェクトを返します。print／edit はそのメソッドです）。【未対応の理由】インストール済みパッケージの文書ファイルの読み取りと表示に依存するため（vignettes は実 R 4.3.3 の名前空間に存在しない見出し名で、実在関数として確認できない）",
  "example": "vignettes",
  "caution": "",
  "status": "unsupported"
 },
 {
  "name": "warnErrList",
  "category": "その他",
  "syntax": "warnErrList(x, warn = TRUE, errValue = NULL)",
  "description": "リスト内のエラーオブジェクト（tryCatch で捕捉された \"error\" オブジェクト）を集め、要約の警告としてまとめます（内部ユーティリティ）。【未対応の理由】条件（condition）オブジェクトを含むリストを対象とする内部ユーティリティであり、値モデルに条件オブジェクトが無いため",
  "example": "warnErrList(x)",
  "caution": "主にパッケージ内部で使われます。",
  "status": "unsupported"
 },
 {
  "name": "winDialog",
  "category": "入出力",
  "syntax": "winDialog(type = c(\"ok\", \"okcancel\", \"yesno\", \"yesnocancel\"), message)",
  "description": "MS Windows でダイアログボックスを表示します（winDialogString は文字列入力ダイアログです）。【未対応の理由】Windows のダイアログという対話的 GUI 操作に依存するため",
  "example": "winDialog(\"ok\")",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "winDialogString",
  "category": "入出力",
  "syntax": "winDialogString(message, default)",
  "description": "MS Windows でダイアログボックスを表示します（winDialogString は文字列入力ダイアログです）。【未対応の理由】Windows のダイアログという対話的 GUI 操作に依存するため",
  "example": "winDialogString(x)",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "winMenuAdd",
  "category": "システム",
  "syntax": "winMenuAdd(menuname)",
  "description": "MS Windows の RGui のユーザーメニューを追加・削除・照会します。【未対応の理由】Windows 版 Rgui のメニューという GUI 要素の操作に依存するため",
  "example": "winMenuAdd(\"Menu\")",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "winMenuAddItem",
  "category": "システム",
  "syntax": "winMenuAddItem(menuname, itemname, action)",
  "description": "MS Windows の RGui のユーザーメニューを追加・削除・照会します。【未対応の理由】Windows 版 Rgui のメニューという GUI 要素の操作に依存するため",
  "example": "winMenuAddItem(x)",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "winMenuDel",
  "category": "システム",
  "syntax": "winMenuDel(menuname)",
  "description": "MS Windows の RGui のユーザーメニューを追加・削除・照会します。【未対応の理由】Windows 版 Rgui のメニューという GUI 要素の操作に依存するため",
  "example": "winMenuDel(x)",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "winMenuDelItem",
  "category": "システム",
  "syntax": "winMenuDelItem(menuname, itemname)",
  "description": "MS Windows の RGui のユーザーメニューを追加・削除・照会します。【未対応の理由】Windows 版 Rgui のメニューという GUI 要素の操作に依存するため",
  "example": "winMenuDelItem(x)",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "winMenuItems",
  "category": "システム",
  "syntax": "winMenuItems(menuname)",
  "description": "MS Windows の RGui のユーザーメニューを追加・削除・照会します。【未対応の理由】Windows 版 Rgui のメニューという GUI 要素の操作に依存するため",
  "example": "winMenuItems(x)",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "winMenuNames",
  "category": "システム",
  "syntax": "winMenuNames()",
  "description": "MS Windows の RGui のユーザーメニューを追加・削除・照会します。【未対応の理由】Windows 版 Rgui のメニューという GUI 要素の操作に依存するため",
  "example": "winMenuNames(x)",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "close.winProgressBar",
  "category": "入出力",
  "syntax": "close.winProgressBar(con, ...)",
  "description": "MS Windows の進捗バーを表示します（可変のハンドルオブジェクトで、get／set／close が操作します）。【未対応の理由】Windows の GUI 進捗バーと、参照で更新される可変ハンドルオブジェクトに依存するため",
  "example": "pb <- winProgressBar()",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "getWinProgressBar",
  "category": "入出力",
  "syntax": "getWinProgressBar(pb)",
  "description": "MS Windows の進捗バーを表示します（可変のハンドルオブジェクトで、get／set／close が操作します）。【未対応の理由】Windows の GUI 進捗バーと、参照で更新される可変ハンドルオブジェクトに依存するため",
  "example": "getWinProgressBar(x)",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "setWinProgressBar",
  "category": "入出力",
  "syntax": "setWinProgressBar(pb, value, title = NULL, label = NULL)",
  "description": "MS Windows の進捗バーを表示します（可変のハンドルオブジェクトで、get／set／close が操作します）。【未対応の理由】Windows の GUI 進捗バーと、参照で更新される可変ハンドルオブジェクトに依存するため",
  "example": "setWinProgressBar(x)",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "winProgressBar",
  "category": "入出力",
  "syntax": "winProgressBar(title = \"R progress bar\", label = \"\", min = 0, max = 1, initial = 0, width = 300)",
  "description": "MS Windows の進捗バーを表示します（可変のハンドルオブジェクトで、get／set／close が操作します）。【未対応の理由】Windows の GUI 進捗バーと、参照で更新される可変ハンドルオブジェクトに依存するため",
  "example": "winProgressBar(x)",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "win.version",
  "category": "システム",
  "syntax": "win.version()",
  "description": "MS Windows のバージョン情報を取得します（win.version）。【未対応の理由】実行環境（Windows のバージョン）そのものの情報を返すため、シミュレータで値を捏造せず未対応とする",
  "example": "win.version()",
  "caution": "Windows 専用です。",
  "status": "unsupported"
 },
 {
  "name": "zip",
  "category": "ファイル",
  "syntax": "zip(zipfile, files, flags = \"-r9X\", extras = \"\", zip = Sys.getenv(\"R_ZIPCMD\", \"zip\"))",
  "description": "zip アーカイブを作成します。【未対応の理由】ファイルシステム上のファイルのアーカイブ作成（外部 zip プログラムによるファイル書き出し）に依存するため",
  "example": "zip(\"file.zip\", files)",
  "caution": "外部の zip プログラムが必要です。",
  "status": "unsupported"
 }
];
