# B7 G13 報告書：パス・アドレス等の純粋ロジック系（全261件）

担当：G13チーム。作業場所：`work/adv-b7-g13`（adv-b7 の専用コピー）。GitHub 書き込みなし（ローカルコミットのみ）。共有ファイル（engine.js、stdlib-registry.js、advanced-engine.js、advanced-manifest.js、既存テスト）は一切変更していない。追加は新規ファイルのみ。

## 1. 区分別件数

| 区分 | 件数 | 内訳 |
|---|---|---|
| 個別実装（supported） | 163 | 呼び出し可能オブジェクト・クラス・メソッド・属性を意味論実装 |
| 束ね値（supported） | 2 | filecmp.DEFAULT_IGNORES、secrets.DEFAULT_ENTROPY（データ定数） |
| 例外対応付け（supported） | 3 | ipaddress.AddressValueError、ipaddress.NetmaskValueError、pathlib.UnsupportedOperation |
| 未対応（unsupported） | 85 | FS 前提・言語構文前提のもの。リファレンス収載＋未対応ラベル＋呼び出し時は「未対応」エラー |
| 未検証（unverified） | 8 | secrets の生成系 7 件＋pathlib.PurePath.parser |
| 合計 | 261 | backlog の自群11モジュール全件を各1回収載 |

モジュール別：ipaddress 115（全件 supported）、pathlib 76（supported 30／未対応 45／未検証 1）、pathlib.types 5（全件未対応）、filecmp 22（supported 2／未対応 20）、glob 4（supported 2／未対応 2）、copyreg 2（全件 supported）、secrets 9（supported 2／未検証 7）、math.integer 6（全件 supported）、string.templatelib 12（全件未対応）、wsgiref.headers 3（全件 supported）、wsgiref.util 7（supported 6／未対応 1）。

## 2. 再分類（棚卸しの「未対応候補」から実装へ）

モジュール単位の粗い判定では未対応候補側だったものから、純粋ロジックとして以下を実装に振り分けた。

- **ipaddress 全115件**：完全実装。アドレス解析（IPv4 オクテット検証・IPv6 圧縮／展開・スコープID）、特殊用途レジストリ表（CPython 3.12.3 の `_constants` を転記し実走で照合）、ネットワーク演算（subnets/supernet/address_exclude/hosts/overlaps/subnet_of/supernet_of/compare_networks）、ファクトリ、summarize_address_range、collapse_addresses、__format__（b/x/X/n、#、_ グルーピング）まで。
- **pathlib の純粋部分**：PurePath 系の全操作（parts/parent/parents/drive/root/anchor/name/stem/suffix/suffixes、joinpath、with_name/with_stem/with_suffix、match/full_match、relative_to（walk_up 含む）、演算子 /、as_posix）を CPython 3.14 の意味論で実装。Windows flavor（ドライブ・UNC・大文字小文字を区別しない等価性）も含む。Path/PosixPath の生成と純粋操作、Path.as_uri、Path.from_uri（3.14）も実装。WindowsPath は POSIX 環境での CPython の動作そのもの（生成で UnsupportedOperation）を再現したため supported とした。
- **glob.translate / glob.escape**：translate は 3.13 で公開された純粋なパターン変換として実装（CPython 3.13 の glob.py/fnmatch.py 実物ソースを実走させて出力一致を確認）。glob/iglob は FS 走査のため未対応のまま。
- **filecmp.clear_cache / DEFAULT_IGNORES**：周辺の純粋部分として実装（本アプリはファイル比較キャッシュを持たないため clear_cache は常に None を返すのが正確な再現）。
- **copyreg.pickle / constructor**：登録表としての値の保持と callable 検証（CPython と同じ TypeError 文言）を実装。
- **wsgiref.headers.Headers / wsgiref.util の environ 純粋関数**：Headers はクラス表面一体で実装。util は application_uri/request_uri/guess_scheme/is_hop_by_hop/shift_path_info/setup_testing_defaults を実装（shift_path_info は 3.12.3 の現行アルゴリズムに追随）。
- **math.integer 全6件**：3.15 ドキュメントで実在と意味を確認し、math 群の検証済み意味論（BigInt 内部計算、安全整数を超える結果は未確定）を流用して実装。
- **secrets.compare_digest / DEFAULT_ENTROPY**：純粋比較として実装（str は ASCII のみ、bytes は本群の内部 bytes 値で対応）。

未対応のままにしたもの：pathlib の FS 操作45件＋pathlib.types 5件（FS 前提）、filecmp の cmp/cmpfiles/dircmp 系20件（実ファイル前提）、glob.glob/iglob（FS 走査）、string.templatelib 全12件（t 文字列リテラル＝言語構文にパーサが未対応。属性意味論はリファレンスに正確に記載）、wsgiref.util.FileWrapper（ストリーム前提）。

未検証にしたもの：secrets の生成系（choice/randbelow/randbits/token_bytes/token_hex/token_urlsafe/SystemRandom）。生成値そのものは OS 乱数源依存で再現・検証できないため値を捏造せず、未確定値として返す。ただし値に依らない決定論的な振る舞い（randbelow(1)=0、randbits(0)=0、n<=0 の ValueError、空シーケンスの IndexError、token_*(0) の空結果、引数の型エラー）は正確に再現する。pathlib.PurePath.parser はモジュールオブジェクト自体が他群の担当範囲のため未検証（posixpath/ntpath の別名である旨は caution に明記）。

## 3. 照合方法と範囲

- **CPython 3.12.3 実走**（/usr/bin/python3）：ipaddress、pathlib の基礎意味論、filecmp、copyreg、secrets、wsgiref の期待値の大半を取得・照合。supported 項目の例題168件は、生成した期待値表を実 CPython でも一括実走して突き合わせた（158件を実走照合、残り10件はバージョン依存で下記の別経路）。
- **CPython 3.13 実物ソースの実走**：glob.translate / fnmatch._translate（3.13 の Lib ソースを取得し、そのまま実行して出力一致を確認）。
- **CPython 3.14 ソース＋公式ドキュメント（3.15）**：pathlib の stem/suffix/suffixes の現行意味論、full_match、Path.from_uri、Path.copy/move 等の有無。ローカル 3.12 と意味が変わる箇所は 3.14/3.15 側を正とした。
- **公式ドキュメント（3.15）のみ**：math.integer（3.15 新規、ローカル実走不可。意味論は math の同名関数の検証済みに同一）、string.templatelib（属性意味論の記述のみ）、IPv6Address.ipv6_mapped 等の 3.13 追加項目。
- **テスト**：`tests/muse-adv-b7-g13.test.js` 全107件通過（F-04：supported 168件の例題を実行し期待出力と一致／典型・境界・異常ケース表／未対応エラーの文言照合／未検証の正直な停止の確認）。基盤・math の既存テスト99件も併せて通過し、干渉がないことを確認した。

## 4. 基盤要請

1. **組み込み関数の native 委譲**：`int()`、`format()`／f文字列の書式指定、`hash()` が stdlib クラスの `__int__` 相当・`__format__`・`hash` 定義へ委譲されない。このため `int(IPv4Address(...))`、`format(addr, 'b')`、`hash(path)` が CPython と乖離する（メソッド直接呼び出しでは再現済み）。委譲が入れば解消する。
2. **bytes 型の統一**：エンジンに bytes 値型がなく、bytes リテラルは未確定値になる。G7（g7.bytes）と本群（g13.bytes）がそれぞれ内部型を持つ状態で、群をまたぐ bytes の受け渡しは等価性が取れない。基盤側で単一の bytes 型を用意し、各群が生成する bytes をそれに寄せることを要請する。
3. **遅延イテレータの基盤公開**：反復終了センチネル（EXH）がエンジン内部に閉じており、有限イテレータは実体化するしかない。本群は上限100,000件で実体化し、超過時は未確定として正直に止める。EXH の公開か、有限遅延イテレータの基盤提供があると大規模ネットワークの列挙が正確になる。
4. **異なる qualname 間の eq 委譲**：eqVal が「異なる native 型同士は無条件に False」を先に返すため、CPython では True になる `IPv4Interface(...) == IPv4Address(...)`（および PurePosixPath と PosixPath の等価性）が本アプリでは False になる。def.eq への委譲を先に行う形への変更を要請する（順序比較は委譲されるため非対称になっている）。
5. **ドット付きモジュール名の import**：`import math.integer as mi` がトップレベルの math モジュール値を束ねてしまう（`from math.integer import comb` は正常）。エンジンの import 解決の修正を要請する。
6. **クラスメソッドのインスタンス経由アクセス**：現行エンジンでは到達できない（全群共通の既知挙動として記録）。
7. **copyreg と pickle の連動**：本群の登録表は copyreg 内部に閉じている。pickle モジュール担当群と dispatch_table の共有方法を統合時に決める必要がある。
8. **統合時の配線**：`js/types/python/group-advanced-g13.js` が本群の集約 import。統合時に advanced-engine.js へこの import を1行追加すること（共有ファイルのため本群では触っていない）。

## 5. 残存・意図的な乖離

- **scoped IPv6 の exploded / reverse_pointer**：CPython 3.12 ではスコープ付きアドレスでこれらが例外になる不具合があるが、本群はアドレス部に対して正しく処理する（意味論として正しい側を採用）。
- **collapse_addresses の interface 混在時のソート**：アドレス値順で近似している（CPython は interface 同士でネットワーク優先の順序を使う）。ネットワーク／アドレスのみの入力では完全一致。
- **summarize_address_range の first > last 判定**：アドレス値の単純比較で近似（CPython は interface の順序規則を含む演算子比較）。
- **num_addresses 等の巨大整数**：エンジンの数値で安全に表せない結果（IPv6 の大きな個数、2**53 を超える階乗など）は未確定値として返し、caution に明記した（捏造しないための仕様）。
- **get_mixed_type_key**：IP オブジェクト以外に CPython は NotImplemented を返すが、本アプリでは NotImplemented 値を表現できないため未確定として扱う（caution 明記）。
- **setup_testing_defaults の wsgi.input / wsgi.errors**：ストリームのため未確定値を入れる（他のキー21件は完全再現、caution 明記）。
- **pathlib の予約名チェック**：Windows の予約デバイス名（CON、NUL 等）は CPython の PureWindowsPath でも検証されないため、本群も検証しない（実走確認済み）。

## 6. 作成ファイル（全25件、新規のみ）

実装（js/types/python/）：
- impl-advanced-g13-common.js（共通基盤：内部 bytes 型 g13.bytes、fnmatch/glob.translate ポート、引数検証ヘルパ）
- impl-advanced-ipaddress.js、impl-advanced-pathlib.js（pathlib.types の登録も含む）、impl-advanced-filecmp.js、impl-advanced-glob.js、impl-advanced-copyreg.js、impl-advanced-secrets.js、impl-advanced-math-integer.js、impl-advanced-string-templatelib.js、impl-advanced-wsgiref-headers.js、impl-advanced-wsgiref-util.js
- group-advanced-g13.js（集約 import）

リファレンス（js/types/python/）：
- reference-advanced-ipaddress.js（115）、reference-advanced-pathlib.js（76）、reference-advanced-pathlib-types.js（5）、reference-advanced-filecmp.js（22）、reference-advanced-glob.js（4）、reference-advanced-copyreg.js（2）、reference-advanced-secrets.js（9）、reference-advanced-math-integer.js（6）、reference-advanced-string-templatelib.js（12）、reference-advanced-wsgiref-headers.js（3）、reference-advanced-wsgiref-util.js（7）

テスト：
- tests/muse-adv-b7-g13.test.js、tests/muse-adv-b7-g13-expected.js（例題の期待出力表）

報告書：docs/audit/b7-g13-report.md（本ファイル）
