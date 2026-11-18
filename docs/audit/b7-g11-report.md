# B7 G11 報告書（アーカイブ・圧縮・永続化系）

担当：zipfile 64、tarfile 84、zlib 41、bz2 21、lzma 40、gzip 9、wave 39、marshal 5、pickle 23、io 76、compression.zstd 68、zipimport 13、pkgutil 8 ＝ **全491件**をリファレンス収載し、裁定どおり実装した。作業は専用コピー `adv-b7-g11` 内のみ、共有ファイルには触れていない。GitHub 書き込みなし。

## 区分別件数

| 区分 | 件数 | 内訳 |
|---|---|---|
| supported（個別実装） | 85 | ZipInfo 14（クラス・is_dir・属性12）、TarInfo＋抽出フィルタ 30、io 基底クラス群＋StringIO 41 |
| supported（束ね値） | 58 | zipfile 定数5、tarfile 形式定数4、zlib 整数定数20、lzma 定数21、wave 定数3、marshal.version、pickle プロトコル定数2、io.DEFAULT_BUFFER_SIZE、zstd COMPRESSION_LEVEL_DEFAULT |
| supported（例外対応付け） | 27 | zipfile 3、tarfile 13、zlib.error、lzma.LZMAError、gzip.BadGzipFile、wave.Error、pickle 3、io 2、zstd.ZstdError、zipimport.ZipImportError |
| unsupported（未対応） | 157 | 実ファイル／アーカイブ実体／インポート機構が前提のもの |
| unverified（未検証） | 164 | bytes 入出力・版／ビルド依存・形式のバイト単位照合ができないもの |
| 合計 | 491 | |

モジュール別（supported／unsupported／unverified）：zipfile 22／36／6、tarfile 47／20／17、zlib 21／0／20、bz2 0／11／10、lzma 22／5／13、gzip 1／6／2、wave 4／35／0、marshal 1／2／2、pickle 5／13／5、io 44／5／27、compression.zstd 2／5／61、zipimport 1／12／0、pkgutil 0／7／1。

## bytes 表現の調査結果と裁定への影響

着手前に `engine.js` を実物確認した。**エンジンに bytes 型は存在しない**：

- bytes リテラルは評価時に常に `UNK('バイト列（bytes）')` になる（`case 'byteslit'`）。
- 組み込み `bytes()`／`bytearray()` は未実装で、呼び出すと「対応外」の経路エラーになる。
- `str.encode()` も未実装（名簿に名前だけある）。str は JS 文字列として保持される。

したがって「利用者が書いた bytes を入出力とする意味論」は実値で確定できず、本群の主成果は正直な未検証／未対応への振り分けになった。他チーム（G7）の群内専用 bytes 型は、群をまたぐ互換性がなく、利用者リテラルの消費が主である本群では UNK が届いて無効なため採用しなかった。代わりに下記「基盤要請①」を挙げる。

個別の影響：

- zlib.crc32／adler32 は純粋関数だが入力 bytes が UNK になるため unverified。ただし str／list を渡したときの `TypeError: a bytes-like object is required` は CPython どおり再現した。
- io.BytesIO はメモリ内ストリームとして実装可能に見えたが、保持する値が bytes のため unverified。StringIO は文字列のみで完結するため全実装した。
- tarfile の型定数12件は値が確定している（例 REGTYPE=`b'0'`）が、返せる値が bytes のため unverified。TarInfo の種別判定は内部表現で再現し is*() は supported にした。

## 再分類（当初想定から変えた項目と理由）

- `io.IOBase.readlines`：空リストを返す想定だったが、CPython 3.12.3 実測では AttributeError（'IOBase' object has no attribute 'read'）。実測を正として supported（例外挙動として実装）。
- `pickle.DEFAULT_PROTOCOL`：ローカル CPython 3.12.3 実測は 4 だが、正本ドキュメント 3.15 では 5（3.14 で変更）。docs 基準で 5 を束ね、caution に版差を明記。
- `zlib.crc32_combine`／`adler32_combine`：3.14 新設でローカル 3.12.3 に存在しない。docs 3.15 で収載し unverified。
- `compression.zstd.Strategy` 系・パラメータ系 IntEnum：ドキュメント自身が「値は zstd のバージョン間で一定ではない」「範囲はライブラリ依存」と明記するため、値が推測できても unverified。
- `lzma.FILTER_LZMA1`：値 4611686018427387905 は確定しているが JS の安全整数（2^53-1）を超過し正確に表せないため unverified。
- `zipfile.is_zipfile`：存在しないパスに False を返す部分は純粋だが、本体が実ファイル検査のため unsupported。
- `io.Reader`／`io.Writer`：3.14 追加の typing プロトコル（runtime_checkable）と判明。isinstance 判定の再現・照合ができないため unverified。
- `zipfile.ZipInfo.CRC`／`header_offset`：新規生成時は属性自体が存在しない（3.12 実測）ため、値を捏造せず unverified。
- `tarfile.FilterError.tarinfo`：例外への属性代入をエンジンが保持できないため unverified（基盤要請②）。

## 照合方法と範囲

- CPython 3.12.3（/usr/bin/python3）実走プローブ：定数値、例外階層、io 基底クラスの素のインスタンスの全メソッド、StringIO の改行変換・シーク・truncate・閉鎖後の例外とメッセージ文言、TarInfo／ZipInfo の既定値と検証規則、フィルタ例外のコンストラクタ引数。
- tarfile 抽出フィルタは CPython 3.12 の `tarfile.py` の `_get_filtered_attrs` ソースを正本として移植し、mode マスク・宛先検査・リンク検査をエンジン／CPython 双方で突合（0o777→493 等）。
- 公式ドキュメント 3.15：compression.zstd（COMPRESSION_LEVEL_DEFAULT=3 の明記、Strategy の非恒常性の明記）、pickle（DEFAULT_PROTOCOL の版差）、io（Reader／Writer の位置づけ）等をページ実物で確認。
- F-04：supported 170件の example を全件エンジンで実行し期待出力表と照合（テストに保持）。さらに同じ例題を CPython 3.12.3 でも実行して相互検証した（166件実施）。不一致は zipfile.ZIP_ZSTANDARD（3.14 新設で 3.12 には存在しない版差）1件と、FilterError 系6件の例題のコンスタラクタ形の誤り（TarInfo 引数が必要）で、後者は修正し、修正形を個別プローブで検証済み。
- テスト：`tests/muse-adv-b7-g11.test.js` 11件＋基盤・math の既存テスト、合計110件合格。

## 基盤要請

1. **エンジン水準の具体 bytes 表現の統一**：bytes リテラル・`bytes()`・`bytearray()`・`str.encode()` が実値になれば、本群の unverified 164件の多く（zlib、bz2、lzma、gzip、pickle、marshal、BytesIO 等）が実装可能になる。群内専用型ではなく基盤の型として必要。
2. **native オブジェクトへの setattr フック**：現状、native への属性代入は diag のみで無効。TarInfo.type の設定、ZipInfo 属性の設定、FilterError.tarinfo の保持ができない。
3. **モジュール属性経由のクラス呼び出しで kwargs が二重評価される**：`zipfile.ZipInfo("a", date_time=(...))` が UNK 化する（from-import 経由は正常）。stdlibModuleCall→stdlibConstruct の評価経路の重複が原因とみられる。
4. **raise の属性形**：`raise zipfile.BadZipFile(...)` が「対応外」になる（名前形のみ受理）。except の属性形は動作する。
5. **classmethod のインスタンス到達**：stdlibNativeCall が methods／attrs のみ参照するため classMethods はインスタンスから届かない。本群では methods 側への複製で回避した。
6. **反復・with 文フック**：IOBase の `__iter__`／`__enter__` 相当が無く、行イテレーションや with は再現できない。

## 残存

- 抽出フィルタのパス解決は字句モデル（POSIX normpath／realpath 相当）で、実ファイルシステムのシンボリックリンク解決とカレントディレクトリは再現しない。
- StringIO の newline=None の書き込み変換は os.linesep='\n'（Linux）前提。Windows 環境では '\r\n' になる。
- TarInfo の repr はアドレスを含むため定義していない（捏造回避）。ZipInfo の repr は再現済み。
- compression.zstd はローカル CPython 3.12 に存在しないため実走照合できず、docs 3.15 のみが根拠（COMPRESSION_LEVEL_DEFAULT と例外以外は全て unverified に倒してある）。
- pickle.DEFAULT_PROTOCOL は docs 3.15 基準の 5 で、実行環境（3.12 系）では 4 になる版差が残る。

## 作成ファイル

- 実装14件：`js/types/python/impl-advanced-g11-common.js`、`impl-advanced-{zipfile,tarfile,zlib,bz2,lzma,gzip,wave,marshal,pickle,io,compression.zstd,zipimport,pkgutil}.js`
- リファレンス13件：`js/types/python/reference-advanced-<module>.js`（同上モジュール分）
- テスト：`tests/muse-adv-b7-g11.test.js`
- 本報告書：`docs/audit/b7-g11-report.md`
