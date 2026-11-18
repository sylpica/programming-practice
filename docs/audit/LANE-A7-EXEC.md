# 高度A7班（Python 標準ライブラリ）監査・修正 報告書

- 対象ツリー: `work/lane-a7-exec/`（repo-reffix HEAD 04dfe2d の清浄なコピーで開始）
- 計画正本: `lanes/lane-a7/plan.md`（角度92件の班スコープ・ローテーション R1〜R10）／`probes.md`（プローブ132件）
- 照合ランタイム: CPython 3.12.3（`/usr/bin/python3`）。文書正本は docs 3.15 系。版差は計画 §0.2 の手順でのみ裁定した。
- 本報告書の合格判定は班スコープのものであり、アプリ全体の収束（U-46）ではない。

## 0. 環境ブロッカー（未実施分の明示）

本セッション中、exec 子プロセスからのファイル書き込みが全面的に EPERM で遮断された（shell リダイレクト／node `writeFileSync`／python／git のいずれも "Operation not permitted"。読み取りとファイルツール（muse.write／muse.edit）の書き込みは正常）。このため次の3件は**未実施**であり、書き込み回復後に親工程で実施されたい。

1. **例文是正400件の適用**: スクリプト `/tmp/a7work/fix-examples.mjs --apply`（dry-run 確定済み。import 追加377件＋クラス属性例文のインスタンス形書換23件、対象26ファイル）。適用後に sweep2／sweep-exec2 の再測と、自班テスト `A7例文是正` の合格確認までが一式。
2. **precache の再生成と `--check`**: 出荷ファイル（js/types/python 配下）を変更したため最終形で必須。
3. **ローカルコミット**: git index への書き込み自体が EPERM のため未実施。変更は全て作業ツリー上に残っている（§8 のファイル一覧が正）。

なお作業中に同 EPERM の副作用で `tests/muse-adv-b7-g7.test.js` が一度 0 バイト化したため、git オブジェクトから転記復元し、`git --no-optional-locks diff` で「意図した差分（codecs 是正分）以外はバイト同一」であることを検証済み。

### §0 追記（2026-11-18、仕上げ工程で実施）

上記3件のうち2件を実施し、1件は一部未適用のまま記録する。スクリプト `/tmp/a7work/fix-examples.mjs` は /tmp 消失で失われていたため、仕様（本節＋§2＋§3 是正2）から再構成した（再構成スクリプトは監査ワークスペース `a7-finish-work/fix-examples.mjs` に保存）。

1. **例文是正の適用（一部）**: import 追加を **374件／18ファイル** に適用した。再構成側の規則は前任の手がかりどおり「実在モジュール根（STDLIB_MODULES ∪ 棚卸し本文の根）をドット形で使うのに import で束縛されていない例文へ import を前置する」で、カンマ区切りの複数 import・as 別名・文字列リテラル内の出現を検証した厳密版である。内訳は実行スイープで NameError になる373件＋ `codecs.unregister`（lambda で先に正直に停止するため実行では NameError にならないが、静的には import 欠落）1件。前任 dry-run の377件との差は −3件（0.8%）。前任の数え方（複数根の数え方・トークナイズ境界）の差とみられ、適用集合の全件は実行スイープで裏付け済みのため、この差をもって適用した。適用はファイルテキスト上の `"example"` 文字列のみの差し替えで行い、全18ファイルで再 import による深い照合（対象外項目・対象項目の例文以外フィールドが不変であること）を通した。適用前ハッシュ一覧（監査ワークスペース `a7-pre-hashes.txt`、365ファイル）との突き合わせで、変更は対象18ファイルのみ・0バイト化なしを確認。**クラス属性例文のインスタンス形書換23件は未適用**：対象リストが残存しておらず、候補集合（supported 項目でクラス形アクセスが AttributeError になる例文48件：email.headerregistry 6／email.message 6／http.cookiejar 25／http.cookies 3／mimetypes 4／xml.etree.ElementTree 4）からは、実 CPython 3.12.3 でもクラス経由が失敗するもの35件・インスタンス形で実行が通るもの45件など複数の切り口のいずれでも23件へ一意に絞り込めなかった。推測で書き換えず未適用とし、必要なら親工程で対象を特定されたい。適用後の再測（例文実行スイープ、B7 5,664件）: NameError **578 → 218**（残存205件＝裸名使用・文脈変数前提の従来残存、＋13件＝ import 是正でモジュール名の NameError が解消した結果、後段の文脈変数 NameError が顕在化したもの）。import を補った373件のうち289件は実行合格に転じ、残り84件は従来から潜在していた別の理由（文脈変数・bytes 型の TypeError・正直な停止等）で止まるもので、是正2の範囲外として全件を仕上げ作業ファイルに記録した。自班テストの `A7例文是正` は通過（下記）。
2. **precache**: `node scripts/precache.mjs` で再生成し `--check` 合格（`precache.js` が更新された。高度モード差分ファイルは生成対象外のため、今回の例文是正自体はハッシュに影響しない）。
3. **ローカルコミット**: 本追記を含む全変更をローカルコミットした（GitHub 書き込みなし）。

仕上げ工程のテスト結果: 自班テスト `tests/muse-lane-a7-exec.test.js` **19/19 通過**。全スイート UTC **7,183/7,183 全通過**。全スイート JST **7,182/7,183**（失敗は既知の RG-630＝ `tests/adv-b2-wdl.test.js` の B2-WDL (f2) 日時形式のタイムゾーン依存のみで、基準線どおり）。仕上げで触った追加ファイル: 例文是正の18ファイル（`reference-advanced-base64.js`／`-binascii.js`／`-codecs.js`／`-colorsys.js`／`-configparser.js`／`-csv.js`／`-gettext.js`／`-hashlib.js`／`-hmac.js`／`-html-entities.js`／`-html.js`／`-json.js`／`-keyword.js`／`-plistlib.js`／`-quopri.js`／`-struct.js`／`-tomllib.js`／`-uuid.js`）と `precache.js`。

## 1. B7 取り込み（計画 §6）

B7 報告書（`work/adv-b7/docs/audit/b7-block-report.md`）から取り込み、統合ツリーで実測検証した。

- 分母の正: **全10,572件収載、対応3,251／未検証1,771／未対応5,541、problems 0**（棚卸し↔カタログ機械照合で欠落0、ステータス実測が申告と完全一致、検索到達性欠落0）。
- 合成リファレンス総数 11,117件（B6 の3部＋B7 の全 part、ロード190ファイル・失敗0）。
- F-16 配分: 呼び出し可能3,693＋束ね値1,986＋例外133が実装対象候補。未確認44モジュールは項目自体を作らない（R10 で実在しないことを確認済み、§4）。
- B7 残存の引き継ぎ: 統一 bytes 型なし（→是正5で相互運用に縮小）、複素数型なし（cmath は未対応／未検証のまま）、`with` が __enter__/__exit__ を呼ばない（R6-03 で正直な停止として確認）、gamma／lgamma の 1-ulp コインフリップ（真値が丸め境界約3e-18以内、B7 で追及終了。本班も引き継ぎ、§5）。

## 2. 機械照合（意味論監査に先行）

| 照合 | 是正前 | 是正後 |
|---|---|---|
| 棚卸し被覆・検索到達性 | 欠落0 | 欠落0（不変） |
| scan 自己到達（全数 5,664 例文） | 870件（15.4%） | 3,296件（58.2%）。残存NG 2,368件は**全件が合成正規形（import＋完全名参照）で到達可能＝到達不能0** |
| scan／トレース到達（層化サンプル365件、横断班と同条件） | scan 67／trace 33 | **scan 244／trace 168** |
| 例文実行分類（全数 5,664件） | ok 4,587／正直な停止 297／NameError 578／その他エラー 202 | その他エラー **189**（是正3〜5で13件解消）。NameError 578 は全件が import 欠落系で、うち400件が §0-1 の適用待ち集合、残りは裸名使用・文脈変数前提の例文（適用後に全件列挙して裁定すること） |

scan 残存NG（対応1,192件）の分類: attrForm 260件（継承属性・工場関数戻り値・メタクラス経由など静的解析の限界）／absent 830件（兄弟項目と共有される族例文＝B7 データ特性）／import 欠落系（§0-1 で是正）。F-02／D-06 の到達性要件は「正規形100%」で充足と判定する。

## 3. 新規欠陥と修正（是正1〜10、全て回帰テスト付き）

### 是正1analyzeCode が import を追跡せずモジュール関数が到達不能
- 原因: `js/types/python/index.js` の名前解決は「短名がカタログ全体で一意」な場合のみ成立する設計で、10,572件の合成では短名が大量衝突し、`math.gcd` のような通常のモジュール関数まで scan／トレースの双方から到達不能だった（横断班 §5-3 の所見の根本原因）。
- 修正: import 追跡（モジュール別名表／from-import 表／星型 import）、別名を実パスへ置換する chainName、レシーバがモジュール別名の場合の直接解決、exprHint への伝播、裸名参照（from-import 名）の push を実装。エンジン側の変更は不要（dynCalls は短名・完全名の両方を記録していた）。
- 検証: §2 のとおり到達性が回復。誤リンク防止（import の無い曖昧な短名 `sqrt` を解決しない、`math.sqrt` に `cmath.sqrt` を付けない）もテストで固定。

### 是正2例文の import 欠落377件＋クラス属性例文23件
モジュールを使うのに import が無い例文（実行すると NameError で、正直な停止にもならない欠陥例文）。§0-1 のとおりスクリプトと内容は確定済みで、適用のみ環境ブロッカーで未実施。

### 是正3 email.policy の既定値誤り＋クラス属性未実装
CPython 3.12.3 実走との乖離: compat32 の `mangle_from_`（True が正）、strict の `raise_on_defect`（True）、HTTP の `max_line_length`（None）、基底の `raise_on_defect` 欠落、クラス経由の属性読み（`Policy.max_line_length` 等）が未実装、compat32 に存在しない `utf8` 等が読めていた。`impl-advanced-email-policy.js` で既定値・classAttrs・クラス別属性リストを是正。クラス／インスタンス両経由の12ケースが CPython と一致。

### 是正4 http.cookiejar.CookiePolicy の attrs 生値による全体クラッシュ
`CookiePolicy().netscape` が未捕捉の JS TypeError で simulate 全体を落としていた（attrs は getter 関数の表であるところへ生値を置いていた）。CPython では netscape 等は DefaultCookiePolicy のインスタンス属性（既定 True／False／False）。PolicyDef から除去し DefaultCookiePolicy へ実装。あわせてエンジン側に防御（stdlibNativeAttr／stdlibNativeCall の attrs 参照に型ガード）を追加。全773クラスの attrs／methods／classMethods を走査し、不良はこの3件のみだったことを確認。

### 是正5 bytes 表現の不整合（エンジン形 bytes を G7／G13 が拒否）
`base64.b64encode(b'hello')` が「argument should be a bytes-like object, **not bytes**」という自己矛盾した TypeError になっていた。エンジン（B6）の bytes は `{__bytes}`、B7 の G7／G13 は独自形しか受け付けず、g13-common の冒頭コメントには統合ビルドでは誤りの前提（「エンジンに bytes 型は存在しない」）が明記されていた継ぎ目欠陥。bytesArr が両形を受理するよう是正し、eq／contains／binop／compare と ipaddress／plistlib／secrets／uuid の判定箇所を統一。検証: crc32(b'hello')=907060870、sha256／hmac は FIPS／RFC ベクトル一致、UUID(bytes=)・ip_address(bytes)・compare_digest が CPython 一致。

### 是正6 math 整数関数の UNK 引数への虚偽 TypeError
`math.isqrt(10**20)` が「不明が渡されました」と虚偽の理由で TypeError。確定モデルでは巨大整数は UNK になるのが正で、intArg が UNK を検査していなかった。isqrt／gcd／lcm／comb／perm／factorial／ldexp が UNK を正直に伝播するよう是正。

### 是正7 codecs.encode/decode の tuple 誤返し
モジュールレベルの `codecs.encode('hello','rot_13')` が `('uryyb', 5)` を返していた。CPython 3.12.3 実走＋docstring で確定: 裸の値を返すのは CodecInfo メソッドだけであり、モジュールレベル関数は裸の値。B7 自班テストが誤りを固定していたため、テスト側も CPython 正形へ是正した（[0] 添字の回避策17箇所を含む）。

### 是正8 types の単例クラスが type() の型値と別物
`type(None) is types.NoneType` が False、`isinstance(None, types.NoneType)` まで False だった。レジストリ def に `builtinTypes`（isinstance 用）と新設 `typevalAlias`（==／is 用）を宣言し、エンジンの eqVal／is 比較が型名で同一判定するよう是正。あわせて PyAPI が ELLIPSIS／NOTIMPLEMENTED 単例を公開し、`types.EllipsisType()`／`NotImplementedType()` が実単例を返すようになった（従来は「取得できないため再現できません」の未確定）。

### 是正9 標準ライブラリクラスの __name__ 等が AttributeError
`decimal.Decimal.__name__`、`type(calendar.MONDAY).__name__`、`type(b'').__name__` が AttributeError だった。stdlibClassAttr で `__name__`／`__qualname__`／`__module__` を限定名から合成して返すよう是正。

### 是正10 基底クラスの虚偽の理由
`class C(enum.Enum)` が「基底クラスには型だけを書いてください」という虚偽の理由で止まっていた（Enum は型である）。標準ライブラリクラスを基底にする継承は、クラス文と type() 3引数形の双方で「未対応：標準ライブラリのクラス「enum.Enum」を基底にする継承は対応していません」と名指しで正直に止めるよう是正。enum の対応経路は関数形 `Enum('Color',...)`（カタログ例文どおり）。

## 4. ローテーション別結果

- **R1（数値・数学）**: プローブ17/18合格。R1-06a は是正6で正直化。Decimal 28桁・random.Random(42)・nextafter／ulp が完全一致（完全一致群）。gamma／lgamma の 1-ulp は B7 残存を引き継ぎ（§5）。
- **R2（文字列・正規表現）**: 合格12、裁定4。R2-05／X2-04 の PatternError は版差裁定（文書正本3.15系では PatternError が正名。3.12.3 の re.error は旧名）。R2-06 破滅的バックトラッキングは正しい結果（None）を返す（上限告知なし＝性能残存、§5）。R2-10 unicodedata.name は未対応の名指し停止で合格。R2-14 は是正7で合格（プローブ側期待値は誤りだった）。
- **R3（反復・コレクション）**: 合格。lambda を引数に取る3件（R3-04／08a／08b）は基礎エンジンの lambda 非対応を正直に名指し停止（プラットフォーム制限）。R3-10 lru_cache は2回実行で cache_info が累積しないことを確認（状態漏れなし）。R3-14 の defaultdict repr「組み込み関数 list」は基礎エンジンの表示規約（§5）。
- **R4（日付・時刻）**: 全件合格。R4-12b now() は全表面で一貫して未確定（偽の日付を作らない）。
- **R5（データ形式）**: 合格16、裁定4。R5-07 深いネストの json は CPython の RecursionError に対しアプリは正しい parse＋切詰め明示（実装限界差）。R5-14 zlib／R5-17 UUID.int は未検証ステータスどおりのプレースホルダが正（R5-17 のプローブ blind 値は誤り）。R5-15b はプローブ側 blind の誤り（ip_address の工場関数は素の ValueError が CPython の正）。
- **R6（型・内省）**: R6-01 は是正8で合格。R6-03 `with` は B7 残存どおり正直な停止。R6-07 enum クラス構文は是正10で正直化。R6-08 dataclasses デコレータ形は未検証ステータスどおりの挙動（対応経路は make_dataclass）。R6-12 gc.collect は名指し停止で合格。
- **R7（決定的な OS 隣接・その他）**: 例文実行スイープの分類で担保（§2）。対応項目の正直な停止は codecs.unregister の1件のみ（例文が lambda を使用、§5）。
- **R8（束ね1,986＋例外133）**: X1（束ね値）8/10合格＋是正9で2件合格。X2（例外）残り7件中6件合格＋X2-04 版差裁定。例外の表示名・階層（decimal.InvalidOperation／configparser.DuplicateSectionError 等）は CPython 一致。
- **R9（未対応5,541の正直さ）**: X3 全12件が名指し停止（偽のパス・接続成功等の「実在を装う表示」は検出されず）。実行スイープでも未対応は honestStop 298件が支配的で、具体的な偽値を返す項目は検出されなかった。
- **R10（未確認44モジュール）**: 38件は項目0件、残り6件（compression／email.mime／profiling／test／urllib／wsgiref／xmlrpc 系）はパッケージでサブモジュール項目のみ存在し本体項目0件。「項目が存在しないことが正」を確認。

未検証1,771件の理由妥当性は層化サンプル48件で再検証: プレースホルダ22／正直な停止2／無出力22／具体表示1（呼び出し可能オブジェクトの repr プレースホルダで、偽値ではない）／NameError 1（codecs.getreader、§0-1 の適用待ち集合に包含）。

## 5. 残存・未確認（是正しないと判断したもの）

1. scan 到達の静的限界（attrForm 260件・族例文 absent 830件）: 正規形では全件到達可能であり、解決器の欠陥ではない。
2. 未対応／未検証項目の属性読みにおける汎用 AttributeError（名指し停止との灰色地帯）: B7 設計と整合する残存として引き継ぐ。
3. float 系 math 関数へ安全範囲超の整数を渡した場合の虚偽 TypeError 文言: 全 float 関数の UNK 伝播は変更範囲が大きく、値が UNK になること自体は確定モデルの範囲内。
4. codecs.unregister の例文が lambda を使い正直に停止する（対応項目の例文が実行不能な軽微な残存）。
5. R2-06: 破滅的バックトラッキングで正しい結果を返すが上限告知がない（当該 VM 実測で約33秒。結果の正しさ・正直さの問題ではない性能残存）。
6. gamma／lgamma の 1-ulp（B7 から引き継ぎ。真値が丸め境界約3e-18以内）。
7. dataclasses デコレータ形・enum クラス構文: それぞれ未検証／未対応として正直に振る舞う。対応経路は make_dataclass／関数形 Enum。
8. defaultdict の repr 等における「組み込み関数 list」表記: 基礎エンジン（B6）の型表示規約に由来する横断事項。A7 の範囲では変更しない。
9. 版差: re.PatternError（3.13+ の正名）を採用し 3.12.3 の re.error とは表示が異なる。文書正本 3.15 系に基づく意図的な差異。

## 6. プローブ結果の総括

132件を a/b 分割・重複（X2 の6件は R 側でカバー）・特殊プローブ（R3-10／R4-12b／X3-13／X4）の個別実施で全件網羅した。内訳: そのまま合格 約100件／是正により合格 6件（R1-06a、R2-14、R6-01、R6-07（正直化）、X1-07、X1-10）／版差・プローブ側誤り等の裁定で合格 約12件／正直な停止・未検証どおりの挙動として合格 約14件。新規の未裁定 CHECK は残っていない。

## 7. テスト結果

- 自班テスト `tests/muse-lane-a7-exec.test.js`（新規19件）: **18/19 通過**。失敗1件は §0-1 の例文是正テスト（適用待ちが原因で、適用後に通過する見込み）。
- B7 テスト群（G7／G13／G10／foundation）: 是正後も全通過。g7 は是正7に伴い期待値を CPython 正形へ更新。
- 全スイート UTC: **7,182/7,183 通過**（失敗は上記1件のみ。基準線 7,164＋自班19件＝7,183 と整合し、回帰ゼロ）。
- 全スイート JST: **7,181/7,183**（失敗は上記1件＋既知の RG-630（WDL タイムゾーン依存、本ツリーには A2 班の是正が未統合）のみで基準線どおり）。
- precache: §0-2 のとおり未実施（環境ブロッカー）。

## 8. 触ったファイル

- `js/types/python/index.js`（是正1: analyzeCode の import 追跡・裸名 push）
- `js/types/python/engine.js`（是正4の attrs 型ガード、是正8の PyAPI 単例公開＋eqVal／is の typevalAlias、是正9の __name__ 合成、是正10の基底クラス正直化）
- `js/types/python/impl-advanced-codecs.js`（是正7）
- `js/types/python/impl-advanced-email-policy.js`（是正3）
- `js/types/python/impl-advanced-http-cookiejar.js`（是正4）
- `js/types/python/impl-advanced-g7-common.js`／`impl-advanced-g13-common.js`（是正5。g13 冒頭の誤前提コメントも是正）
- `js/types/python/impl-advanced-ipaddress.js`／`impl-advanced-plistlib.js`／`impl-advanced-secrets.js`／`impl-advanced-uuid.js`（是正5の判定統一）
- `js/types/python/impl-advanced-math.js`（是正6）
- `js/types/python/impl-advanced-types.js`／`impl-advanced-g4-common.js`（是正8）
- `tests/muse-adv-b7-g7.test.js`（是正7の期待値是正＋ §0 の復元）
- `tests/muse-lane-a7-exec.test.js`（新規）
- 適用待ち: B7 reference part 26ファイル（§0-1）

## 9. 台帳への提案（共有ファイルは触っていない）

- 是正1〜10を新規 RG グループとして起票されたい。特に是正1（到達性）は横断班 §5-3／§5-6 の A7 宛て裁定材料への回答であり、A6 班側の §5-6（高度モードでの基礎 scan 喪失）も同根のため、統合時にあわせて閉じることを提案する。
- §5-5（complex.conjugate の後退、RG-624 マージ起因）は A6／親工程の材料であり本班では触っていない。
- §0 の3件（例文400件適用・precache・コミット）は書き込み回復後の親工程の作業として引き継ぐ。
