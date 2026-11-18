# B7 G10 報告書（email・XML・Webテキスト系）

担当範囲：backlog から抽出した G10 全 **950件**（37モジュール）。全件をリファレンス収載した（reference-advanced-<module>.js ×37ファイル）。作業ツリーは専用コピー `adv-b7-g10`、新規ファイル追加のみ、共有ファイルは無変更。GitHub 書き込みなし。

## 区分別件数（合計950）

| 区分 | 件数 |
|---|---|
| 個別実装（supported の function/method/class） | 296 |
| 束ね値（supported の data/attribute） | 181 |
| 例外対応付け（supported の exception） | 47 |
| 未対応（unsupported） | 24 |
| 未検証（unverified） | 402 |
| supported 合計 | 524 |

status 別の機械照合：自群テストで全950件の形状・status・name一意性を検証し、別途照合スクリプトで **supported 524件全件がレジストリ実在（モジュール／クラス／メソッド／属性／定数／例外のいずれかで到達可能）** であることを確認した（未実装のまま supported の項目はゼロ）。

## モジュール別の要点

- **urllib.parse（17/23 supported）**：最優先で完全寄りに実装。urlparse/urlsplit（ParseResult/SplitResult/DefragResult は namedtuple 相当：属性・添字・len・iter・geturl・等価・repr）、urlunparse/urlunsplit、urljoin（RFC 3986 相対解決。CPython 実走ケース：`g`／`../g`／`/g`／`?y`／`#s`／`//x/y` 等を照合）、quote/quote_plus/unquote/unquote_plus（UTF-8 %符号化）、parse_qs/parse_qsl（keep_blank_values・separator・strict）、urlencode、urldefrag、unwrap。
- **http.cookies（20/29）**：SimpleCookie/BaseCookie（load・output・value_encode/decode）、Morsel（set/setdefault/update/copy/isReservedKey/OutputString/output、予約キーは getitem/setitem）。CookieError 例外対応付け。
- **http.cookiejar（55/65）**：Cookie（属性群・is_expired・nonstandard 属性）、CookieJar（set_cookie/clear/clear_session_cookies/set_policy）、CookiePolicy/DefaultCookiePolicy（許可・ブロック判定、Domain* 定数群）。ファイル保存系は未対応、request/response 依存は未検証。
- **email.utils（13/17）**：parsedate/parsedate_tz/mktime_tz/formatdate（usegmt 経路で照合）/parseaddr/formataddr/getaddresses/quote/unquote/RFC2231 系（decode_rfc2231/encode_rfc2231/collapse_rfc2231_value/decode_params）。
- **email.message（84/97）**：Message/EmailMessage のヘッダ辞書的挙動（get/get_all/keys/values/items/replace_header/add_header、添字読み書き・contains・len）、payload、attach、walk、Content-Type 系（get_content_type・get/set/del_param(s)・get_filename・get/set_boundary・get/set_charset・get_charsets・set_type はパラメータ保持）、EmailMessage.set_content/get_content/get_body/iter_parts/iter_attachments/is_attachment/clear/clear_content。MIMEPart も同実装で収載。
- **email.parser（4/12）／email（1/4）**：Parser.parsestr、HeaderParser、FeedParser（feed/close）、message_from_string。multipart は境界分割で再帰解析。
- **email.policy（20/41）**：EmailPolicy/Compat32 の生成・clone・主要属性、既定インスタンス群（default/strict/compat32/HTTP/SMTP/SMTPUTF8）を束ね値で収載。**Policy は抽象クラスであり CPython どおり生成時 TypeError** にした。fold/header_*_parse 等は未検証。
- **email.headerregistry（13/41）**：Address（display_name/username/domain/addr_spec・str・等価）、Group、HeaderRegistry（map_to_type・添字）。ヘッダ型クラス群は policy 経由生成のため未検証。
- **email.errors（20/20）**：全例外を MRO 由来の親で対応付け（例：HeaderParseError→MessageParseError→MessageError、MultipartConversionError は MessageError＋TypeError、MessageDefect 系は ValueError 側）。
- **email.encoders（4/4）**：文字列ペイロードの Message に対する base64/quopri/7or8bit/noop。**email.header（6/8）**：Header（append/encode/str/等価）。decode_header/make_header は戻り値が bytes を含むため未検証。
- **email.mime.text/multipart/base（各1/1）**：Message 実装を流用して実装。他の mime.* は bytes データ前提のため未検証。
- **xml.etree.ElementTree（60/71）**：Element/SubElement/ElementTree（メモリ内）、fromstring/XML/fromstringlist/XMLID、自前 XML パーサ（属性・テキスト・コメント・PI・CDATA・実体参照・重複属性/タグ不一致で ParseError）、tostring は **encoding="unicode" のみ文字列化**（既定の bytes 戻り値は未検証経路で正直に停止）、XPath 部分文法（タグ・*・.//・[@attr]・[@attr='v']・[n]・[tag]・[.='text']）、find/findall/findtext/iter/iterfind/itertext、TreeBuilder、XMLParser/XMLPullParser（feed/close/read_events）、QName、Comment/ProcessingInstruction、indent、iselement、register_namespace。ParseError は SyntaxError 子として対応付け（code/position 属性は未検証）。
- **xml.dom.minidom（4/6）**：parseString と Node.toxml/toprettyxml/unlink、documentElement・getAttribute 等。parse はファイル前提で未対応、writexml は未検証。
- **xml.dom（49/176）**：名前空間定数・Node.*_NODE 定数・エラーコード定数（CPython 実走抽出）と DOMException 系統の例外対応付けのみ supported。ノードクラス意味論は未検証。
- **xml.sax 系**：例外対応付け（xml.sax 5件。親は公開名 `xml.sax.SAXException` に正規化 ― CPython の実体は `xml.sax._exceptions` のため MRO 生値では照合が外れることを実測で発見）、handler の定数群＋基底ハンドラの no-op メソッド群（37件）、saxutils の escape/unescape/quoteattr、xmlreader の AttributesImpl/AttributesNSImpl/InputSource（13件）。パーサドライバ依存は未検証。
- **xml.parsers.expat**：errors の定数45件＋codes/messages（CPython 実走抽出。`XML_ERROR_NOT_STARTED` はローカル 3.12 に存在せず未検証）、model の定数10件、ErrorString と ExpatError/error の対応付け。パーサ本体は未検証（理由は基盤要請参照）。
- **mimetypes（17/26）**：types_map（149件）・common_types・encodings_map・suffix_map を **CPython 3.12.3 の既定表から実走抽出して埋め込み**、guess_type/guess_extension/guess_all_extensions/MimeTypes/add_type を実装。初期化ファイルは読まない（guess_all_extensions は /etc/mime.types 等のシステムファイルで結果が増える環境差があり、テストでは環境非依存のケースで照合）。init/read 系は未対応、guess_file_type/inited/knownfiles は未検証。
- **urllib.robotparser（6/10）**：parse(lines)・can_fetch（最長一致）・crawl_delay・site_maps・set_url。read は未対応、modified/mtime/request_rate は未検証（request_rate の戻り値 RequestRate は backlog 外の型のため）。
- **netrc（1/9）**：NetrcParseError の対応付けのみ。netrc クラスはファイルパス前提のため未対応（authenticators 等の従属項目も未対応）。

## 再分類（F-16 候補からの変更・特記）

- `urllib.parse.urllib.parse.SplitResult.geturl`：backlog の誤記名（モジュール名の二重化）と判断し、そのまま収載して **unverified** とした。実在の geturl は ParseResult/SplitResult/DefragResult のメソッドとして実装済み。コーディネーターでの台帳修正を推奨。
- `http.cookies.Morsel.{comment,domain,expires,httponly,partitioned,path,samesite,secure,version}`（9件）：CPython では属性ではなく **dict の予約キー**（getattr は AttributeError を実測）。属性としては存在しないため unverified に倒し、キー経由（`morsel['path']`）は実装済みである旨を caution に明記した。
- `xml.parsers.expat.errors.XML_ERROR_NOT_STARTED`：3.15 ドキュメントにはあるがローカル CPython 3.12.3 の同モジュールに存在しないため unverified。
- `email.base64mime`／`email.quoprimime`／`email.feedparser`：backlog に項目が存在しない（0件）ため収載対象外。base64/quopri 符号化は email.encoders 側で実装した。なおローカル CPython 3.12.3 では email.quoprimime.body_encode／email.base64mime.body_encode が bytes 引数でも TypeError になる実挙動を確認した（ライブラリ側の不整合とみられ、根拠には使っていない）。
- 基礎との重複：自群は全て新規（基礎の標準ライブラリ項目は math の9件のみ）という前提どおり、referenceOverrides は発行していない。

## 照合方法と範囲

- CPython 3.12.3 実走：urllib.parse（urljoin 9ケース含む）・http.cookies・email.utils（日付は 784111777 等の実値）・email.message/parser/encoders・email.policy（Policy 抽象性の発見含む）・cookiejar・mimetypes・ElementTree（述語・ParseError 文面含む）・minidom・robotparser・headerregistry・sax 系定数/例外 MRO・xml.dom 定数/expat 定数を個別に実行して期待値を採取。
- 公式ドキュメント（docs.python.org/ja/3.15）を source として全項目に付与（backlog の 3.x URL を 3.15 に読み替え、アンカーは項目名）。
- テスト：`tests/muse-adv-b7-g10.test.js`（44テスト）全通過。あわせて基盤テスト・math テストも同ツリーで全通過（合計143テスト）。F-04（例題照合）は supported の中核項目についてテストケース表で実施（950件全例題の機械実行は行っていない ― 例題フィールドは supported でも原則「import 行＋代表形」に留めたため、報告書に明記する）。
- 既知の微差：formatdate の地方時経路はエンジン内で UTC オフセット0として扱う（usegmt 経路のみ実走照合）。urljoin のドットセグメント処理は CPython の簡易規則に合わせた実装で、RFC 3986 厳密処理とは一部入力で異なり得る。mimetypes は初期化ファイルを読まないためシステム依存の拡張子（例：.shtml）が欠ける。email の as_string はヘッダ折り畳みを行わない。

## 基盤要請

1. **`import a.b.c as x` の束縛バグ**：基盤の tryStdlibImport は別名束縛時に `mv.mod` を先頭要素（例 `xml`）にしてしまい、`import xml.etree.ElementTree as ET` が壊れる（ET.fromstring が「モジュール xml には属性 fromstring はありません」になる）。別名がある場合は `mv.mod = p.mod`（完全名）にする修正を要請。自群テストでは回避形（`from xml.etree import ElementTree as ET`、無別名の完全修飾）を使った。
2. **native 属性代入フック（setattr）の欠如**：クラス定義に setattr 相当が無く、`element.text = ...`、`parser.StartElementHandler = ...`、`msg.preamble = ...` が扱えない。これが expat/SAX パーサ本体（58件＋関連）を未検証に倒した主因。追加されれば再裁定可能。
3. **bytes 表現**：bytes リテラルが UNK になるため、quote_from_bytes/unquote_to_bytes、email の Bytes 系、tostring 既定戻り値、decode_header の戻り値などが未検証（合計で数十件）。bytes 値型の追加を要請。
4. **delitem フックの欠如**：`del msg['Subject']` 等の `__delitem__` 相当が扱えず、email.message の `__delitem__` 2件を未検証とした。
5. **datetime 型との連携**：email.utils.parsedate_to_datetime/format_datetime は datetime ブロック所管の型との受け渡し API が無く未検証。モジュール横断の値生成 API（例：他ブロック登録クラスを construct する公開経路）を要請。
6. **raise の形**：`raise module.Class(...)` 形式は基盤が解釈できず、from-import した例外名での raise のみ対応（自群の例外対応付け自体は捕捉まで検証済み）。

## 残存

- 未検証402件の内訳の大半は、xml.dom のノード意味論（127件）、xml.parsers.expat のハンドラ群（58件）、xml.sax.xmlreader のドライバ系（33件）、email.headerregistry のヘッダ型（28件）、email.policy のヘッダ処理メソッド（21件）で、いずれも基盤要請2・3・5の解消後に再裁定可能なものが多い。
- email.charset（18件）・email.contentmanager（8件）・email.generator（9件）は意味論を確定できず全件未検証（捏造回避）。
- 判断を仰ぐ事項：上記「再分類」の backlog 誤記名1件の台帳修正可否。
