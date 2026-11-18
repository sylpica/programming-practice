# B7 G7チーム（書式・データ系）報告書

対象: プログラミング練習アプリ 高度モード ブロックB7（Python 標準ライブラリ）のうち G7 担当19モジュール・全406件。
作業ツリー: `~/workspace/programming-practice-audit/work/adv-b7-g7`（GitHub への書き込みは行っていない。ローカルコミットのみ）。
契約: `advanced-interface.md`（正規形・配置・命名）を `b7-team-conventions.md` より優先して適用した。

## 1. 区分別件数（全406件）

| 区分 | 件数 | 内訳 |
|---|---|---|
| 個別実装（supported のうち function/method/class） | 218 | json 9、csv 18、configparser 24、base64 20、binascii 18、codecs 28、struct 10、hashlib 23、hmac 8、uuid 9、colorsys 6、quopri 2、html 2、html.parser 16、tomllib 1、plistlib 3、keyword 2、gettext 19 |
| 束ね値（supported のうち data/attribute） | 91 | csv 19、configparser 2、binascii 8、codecs 15、struct 2、hashlib 5、hmac 3、uuid 28、html.entities 4、plistlib 3、keyword 2 |
| 例外対応付け（supported のうち exception） | 21 | json 1、csv 1、configparser 14、binascii 2、struct 1、tomllib 1、plistlib 1 |
| 未対応（status: unsupported） | 20 | 下記「再分類」参照 |
| 未検証（status: unverified） | 56 | 下記「再分類」参照 |

status 換算では supported 330 / unsupported 20 / unverified 56。リファレンスは全406件を正規形 `{name, category, syntax, description, example, caution, status, returns?, source?}` で収載し、名前は backlog のインベントリと完全一致（生成時に機械照合済み）。expected はリファレンスに入れず、テストファイルのケース表に保持した。

## 2. 再分類（backlog の candidate から裁定を変えた主な項目と理由）

- **ファイル前提のため未対応（unsupported）**: json.dump / json.load、configparser.ConfigParser.read / write、base64.encode / decode、quopri.encode / decode、codecs.open / EncodedFile / StreamReader / StreamWriter / StreamReaderWriter / StreamRecoder、hashlib.file_digest、tomllib.load、plistlib.load / dump、uuid.getnode（ハードウェア依存）、gettext.GNUTranslations（.mo ファイル前提）。
  - なお csv.writer / DictWriter は「書き込み先としてリストを代用する」裁定で supported とした（行文字列がリストへ追加される。writerow の戻り値は文字数）。configparser.read_file も行のイテラブルで代用し supported。plistlib.dumps の UID は CPython 実走で XML 形式では TypeError になることを確認し、そのとおり実装した。
- **意味論を確定できないため未検証（unverified）**:
  - 例外属性10件: json.JSONDecodeError.{msg,doc,pos,lineno,colno}、tomllib.TOMLDecodeError.{msg,doc,pos,lineno,colno}。例外クラス自体の対応付けと送出時のメッセージ文面（位置情報を含む）は CPython どおり再現したが、例外「値」に属性を持たせることがエンジンでできない。
  - hashlib.blake2b/blake2s の MAX_DIGEST_SIZE 等8件: 値自体は確定している（b: 64/64/16/16、s: 32/32/8/8）が、関数オブジェクトの属性を値モデルで保持できず到達経路が無い。
  - binascii.UU_ALPHABET / BINHEX_ALPHABET: 3.15 で追加された定数だが公式ドキュメントに値の掲載がなく、一次情報で確定できない（他の8件の alphabet は確定し supported）。
  - uuid.UUID.int（128ビット整数は安全整数範囲を常時超過）、uuid.UUID.time（version 7 のミリ秒は正確だが 1/6 は60ビットで確定できないため項目としては未検証）。
  - struct.pack_into / Struct.pack_into（書き込み可能バッファを表せない）。
  - csv.Sniffer.sniff / has_header（頻度分析ヒューリスティクスの再現範囲を確定できない。preferred は supported）。
  - codecs のエラーハンドラ関数群（*_errors、lookup_error、register_error）: errors='strict' 等の変換動作自体は encode/decode 内で再現済みだが、ハンドラ関数は例外オブジェクトの属性に依存するため呼び出し結果を確定できない。codecs.getreader/getwriter、CodecInfo.streamreader/streamwriter、StreamReader/StreamWriter のメソッド群、readbuffer_encode も同系の理由で未検証。
  - configparser.ConfigParser.SECTCRE（正規表現オブジェクトを表せない）、configparser.UNNAMED_SECTION（3.13+ の特殊センチネル）。
  - gettext.find / install / NullTranslations.install（ファイル探索・builtins 組み込みを再現できない）、gettext.translation（fallback=True で NullTranslations を返す部分のみ再現し、それ以外は未対応エラー。項目としては未検証）、GNUTranslations のメソッド4件（クラス自体が未対応で到達不能）。
  - plistlib のバイナリ形式: loads（bplist00 入力）・dumps(fmt=FMT_BINARY) は未検証に倒した。FMT_XML/FMT_BINARY の列挙値自体は supported（int と等しくならない Enum 意味論まで再現）。
  - tomllib.loads / plistlib.loads の日時値: パース検証は行うが、対応する datetime 実装が自群に無いため値は UNK（diag で明示）。項目自体は supported。
- **インベントリ名の読み替え**: `codecs.codecs.escape_encode` / `escape_decode` は codecs モジュール自身の属性（codecs.escape_encode 等）の別表記として実装・収載した。
- **インベントリ外で実装したもの（リファレンスには収載しない）**: configparser.DEFAULTSECT（data）、configparser.SectionProxy（get の内部動作に必要）、gettext.bind_textdomain_codeset。いずれも担当モジュールの意味論に必須のため実装側にのみ含めた。
- html はモジュール単体では2件（escape/unescape）で、html.entities 4件・html.parser 16件と合わせて22件が html 系の全量である（タスク提示の「html 22件」はこの合算）。

## 3. bytes 表現の調査結果と裁定への影響

調査（engine.js、着手前に実施）:

- エンジンの値モデルに bytes 型は存在しない。bytes リテラル `b"..."` は eval の `case 'byteslit'` で常に UNK（「バイト列（bytes）」）になる。組み込み `bytes()` / `bytearray()` と `str.encode()` は「未対応」で停止する。
- 実測: `print(b"abc")` はエラーにならず「実行時に決まる：バイト列（bytes）」と表示される。例外値の属性アクセスも UNK になる。

裁定:

- G7 共通基盤（impl-advanced-g7-common.js）に内部ネイティブ bytes 値（限定名 `g7.bytes`、typeName `bytes`）を新設した。repr は CPython の `b'...'` 表記に一致させ、連結・等価・ハッシュ・len・添字・スライス・反復・contains・比較・hex()・decode() を bytes 意味論どおり実装した。これにより「生成→消費の連鎖」（例: base64.b64decode の結果を hashlib に渡す）は実値で検証できる。
- 利用者が書いた bytes リテラルを引数に取る関数は、引数が UNK で届く範囲では結果を確定せず UNK を返す（diag で未検証と注記）。str も受け付ける関数（binascii a2b_*、base64.b64decode、codecs.decode の hex 等）は str 経路で実装・検証した。binascii の b2a_* と crc 系は CPython どおり bytes のみ（str は TypeError）とした。base64 モジュール関数は利便のため ASCII str 入力も受ける（リファレンスに明記した意図的な緩和）。

## 4. 照合方法と範囲

- 一次情報: CPython 3.12.3 実走（/usr/bin/python3）と公式ドキュメント 3.15（docs.python.org/ja/3.15/library/<module>.html）。期待値はすべて実走出力または仕様ベクタから取り、記憶で書かないことを徹底した（検証中に判明した自分の期待値誤り: hashlib.sha512_224 のベクタ、colorsys の YIQ 係数式——いずれも CPython 側が正しく実装を直した）。
- ハッシュ: md5/sha1/sha224/sha256/sha384/sha512/sha512_224/sha512_256/sha3_*/shake_*/blake2b/blake2s（key・salt・person・digest_size 付きを含む）について空文字列・'abc' 等の digest を CPython と照合。pbkdf2_hmac('sha256', password, salt, 100000) の既知ベクタ、scrypt は RFC 7914 ベクタ2件、HMAC は RFC 4231 テストケース1で照合。
- binascii: 15サンプル×各モードで CPython と照合（crc32 15件、crc_hqx 30件（初期値0/0xffff）、QP encode 60件（通常/header/quotetabs/istext=False）/decode 15件、UU encode/decode 45件、hexlify（sep 付き含む）45件）。QP の改行規則は CPython の C 実装の挙動を実走で確定した（=XX トークンは linelen>72 で改行、等）。
- その他: uuid3/uuid5 は公式ドキュメント値、uuid8 はドキュメント例、z85 は Z85 仕様ベクタ（HelloWorld）、struct はサイズ・アライメント表と 'e'（half）変換を実走照合、colorsys は CPython の Lib/colorsys.py の式を転記し9点で照合（浮動小数の結合順序まで一致させた）、html.unescape は実走文字列（レガシー実体・前方一致・数値参照の不正値置換を含む）で照合、tomllib はエラー文面・位置形式6件を実走照合、plistlib は XML 出力のバイト列一致と往復、configparser の補間エラ
...[truncated 3396 chars]