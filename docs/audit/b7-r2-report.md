# B7 追補 R2 報告書（G7/G3 例外属性・csv 是正）

作業ツリー: `~/workspace/programming-practice-audit/work/adv-b7-r2/`（自専用コピー）。
GitHub 書き込みなし。エンジン本体（engine.js）・advanced-manifest.js・
stdlib-registry.js は編集していない（基盤の例外属性チャンネル
`ctx.errAttrs(kind, msg, attrs, fix?)` を使用）。

## 1. csv.reader の反復対応と line_num 是正（impl-advanced-csv.js）

- 問題（着手前に実測で確認）: `next(csv.reader(...))` が
  「TypeError: reader は next() に使えません（イテレータではありません）」で
  失敗し、`line_num` の初期値が総行数（例: 2行入力で 2）になっていた。
- 実装: reader の値を、ネイティブ値（`__native: 'csv.csvreader'`）でありながら
  エンジンのイテレータ値（`__iter`／`pos`）としても振る舞うハイブリッド値にした。
  これにより `next()`／`iter()`（自分自身を返す）／`for`／`list()` がすべて
  同じ消費位置 `pos` を共有する。クラス定義には次を追加した:
  - `iter` フック: 残りの行を返し、消費位置を末尾へ進める（`list()` 等の
    一括展開用。for／next はエンジンがイテレータ値として直接 pos を進める）。
  - `__iter__` メソッド（自分自身を返す）／`__next__` メソッド
    （行を1つ返し、尽きたら StopIteration）。
  - `kind` は `typeName()` が isIter を先に見るため `'reader'` に揃えた
    （型名表示は従来どおり `reader`）。
- `line_num`: パーサ（`parseCsvDetailed` を新設し、`parseCsvText` はその
  ラッパとして互換維持）に各行の読了時点の累計入力行数を記録させ、
  属性は消費位置から導出する。初期値 0、行ごとに更新。引用フィールド内の
  改行（継続行）と空行も1行として数える。
- リファレンス `csv.csvreader.line_num` の description／caution を実態に合わせて
  是正（「一括評価のため総行数になる」「逐次値は再現できない」の記述を削除）。
  status は supported のまま（件数変動なし）。

## 2. codecs.codecs.* の status 是正（reference-advanced-codecs.js）

- `codecs.codecs.escape_decode`／`codecs.codecs.escape_encode` の2件を
  supported → **unverified** に変更。G10 の
  `urllib.parse.urllib.parse.SplitResult.geturl` の裁定と揃えた。
- CPython 3.12.3 実走で `hasattr(codecs, 'codecs')` が False（
  `module 'codecs' has no attribute 'codecs'`）であること、実在名
  `codecs.escape_decode`／`codecs.escape_encode` が存在し本アプリでも
  実装済み（impl-advanced-codecs.js の同名関数）であることを確認した。
- caution には「CPython に実在しない名前であること・ドキュメント表記の
  都合で棚卸しに現れたもの・実在名は実装済みであること・未検証」を含めた。
  あわせて escape_encode 側 description から旧裁定の「別表記」文面を除去した。

## 3. gettext の caution 是正（reference-advanced-gettext.js）

- unverified なのに caution に「未検証」を含まない1件は
  `gettext.translation` だった（全 unverified 件を走査して特定）。
  caution を「カタログの読み込み自体はファイル前提で未対応のため未検証。
  fallback=True の NullTranslations 返却のみ再現する。」に是正。
  status は unverified のまま（件数変動なし）。

## 4. re.PatternError の属性配線（impl-advanced-re.js）

- 送出箇所を `ctx.errAttrs` に切り替え、`except re.error as e` /
  `except re.PatternError as e` / `except ValueError as e` のいずれでも
  `e.msg`／`e.pattern`／`e.pos`／`e.lineno`／`e.colno` が読めるようにした。
  - コンパイルエラー（Translator の `__perr`）: msg は位置サフィックスを
    除いた本文、pattern はパターン文字列、pos はコードポイント単位
    （Translator の UTF-16 インデックスから換算）、lineno／colno は
    CPython と同じく pos から導出。str(e) は従来どおり
    「msg at position N」形式で CPython と一致。
  - 置換テンプレート（processRepl）の PatternError: CPython どおり
    pattern はテンプレート文字列になる。あわせて `missing <` の pos を
    CPython に合わせて是正（従来は1ずれ）。
  - JS RegExp への翻訳失敗（アプリ内部エラー）: 対応する CPython の
    位置が無いため pos／lineno／colno は None（課題指示どおり）。
- 照合中に見つけた Translator の pos のずれ2件も是正した
  （いずれも str(e) の表示位置も従来からずれていたもの）:
  - `min repeat greater than max repeat`: pos を「`,` の位置」から
    「`{` の次の桁位置」へ（例 `a{2,1}` で 3 → 2）。
  - グループ名の再定義: pos を「`>` の位置」から「名前の先頭位置」へ
    （例 `(?P<x>a)(?P<x>b)` で 13 → 12）。
- reference-advanced-re.js: `re.PatternError.msg`／`.pattern`／`.pos`／
  `.lineno`／`.colno` の5件を unverified → **supported** に変更
  （caution は空に是正）。親項目 `re.PatternError` の caution からも
  「属性の読み取りは未検証」の文面を除去した。

## 5. json.JSONDecodeError の属性配線（impl-advanced-json.js）

- `decodeError` を `ctx.errAttrs` に切り替え、`e.msg`／`e.doc`／`e.pos`／
  `e.lineno`／`e.colno` を返す。pos はコードポイント単位に換算
  （表示文の char 数も同じ換算値。BMP では従来と一致）。lineno／colno は
  CPython と同じ導出。
- 照合中に見つけた `Invalid \uXXXX escape` の pos のずれを是正
  （CPython は `u` の位置を指す。例 `"a\u12"` で 2 → 3）。
- 代表ケース `{bad`／`[1,]`／``（空）／`tru` を含む15件すべてで
  CPython 3.12.3 の msg／doc／pos／lineno／colno／str(e) と一致を確認した
  （追加ケース: `{`、`[1] x`、`{"a":01}`、改行を含む doc、`"abc`、
  `[1, 2`、`{"a": }`、`{"a":1,}`、エスケープ系2種、非 BMP 文字を含む
  doc でも一致）。一致しないケースは無かった。
- reference-advanced-json.js: 属性5件を unverified → **supported** に変更し、
  example を属性を実際に読む try/except 形に差し替えた。親項目
  `json.JSONDecodeError` の caution も実態に合わせて是正した。

## 区分別件数の変動

- G7（全406件）: supported 330 → **333**、unsupported 20（不変）、
  unverified 56 → **53**。（codecs −2 supported／+2 unverified、
  json +5 supported／−5 unverified。）
- G3（全207件）: supported 184 → **189**、unsupported 14（不変）、
  unverified 9 → **4**。（re.PatternError 属性5件の格上げ。）
- 群テストの件数ピン（g3／g7）と G3 の F-04 期待値表
  （属性5件の例題出力）を上記に合わせて更新した。

## 照合方法

- CPython 3.12.3 実走: csv（next／for＋break／list の消費共有、継続行・
  空行を含む line_num の遷移）、codecs（`codecs.codecs` の不存在と
  実在名の動作）、re（コンパイルエラー8パターン＋置換テンプレート
  エラー5件＋非 BMP 1件の msg／pattern／pos／lineno／colno／str）、
  json（15件＋JSONDecoder 経由＋非 BMP の msg／doc／pos／lineno／colno／str）。
- エンジン実走: 上記と同一ケースをアプリ側でも実行し全件一致を確認
  （新規テスト tests/muse-adv-b7-r2.test.js に固定）。

## 検証結果

- 新規テスト `tests/muse-adv-b7-r2.test.js`: 11件全合格。
- 既存の群テスト（g3／g7）＋基盤テスト: 331件全合格
  （R2 テストと合わせた4ファイルでは342件全合格）。
- 全テスト（`npm test`）: 5,996件中 5,994件合格。失敗2件は
  `tests/muse-adv-b7-u.test.js` の B7-U 件数照合で、本変更を除いた
  クリーンなツリー（git stash）でも同一に失敗する**既存の失敗**であり、
  R2 の変更範囲とは無関係（U 群の台帳側の不整合。コーディネーター側で
  の確認を推奨）。

## 残存・判断を仰ぐ事項

- re の置換テンプレートで、数値グループ参照が範囲外のとき
  （例: `re.sub('(a)', r'\2', 'a')`）は、CPython が PatternError
  （invalid group reference）を送出するのに対し、本アプリは従来から
  IndexError を送出している（名前による未知グループは CPython どおり
  IndexError で一致）。R2 の範囲（PatternError の属性配線）外の
  既存挙動のため変更していない。裁定があれば別途是正する。
- `raise re.PatternError('...')` のように利用者コードが例外クラスを
  直接送出した場合、例外値に属性は付かない（基盤の raise 経路の仕様で、
  全例外クラス共通）。R2 の対象はライブラリ側の送出箇所のみ。
- csv.DictReader には line_num 属性を付けていない（リファレンス項目が
  無く、課題範囲も csv.reader のみのため）。CPython の DictReader には
  line_num があるため、必要なら追補対象として検討されたい。
- なお本環境の python3（3.12.3）では `codecs.encode('a', 'utf-8')` が
  タプルでなく bytes を返すという標準 CPython と異なる挙動が観測された
  （escape_decode／escape_encode 自体の照合には影響なし。参考情報）。
