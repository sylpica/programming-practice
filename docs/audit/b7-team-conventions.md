# B7 群チーム規約（Python 標準ライブラリ高度差分）

全群チームはこの規約に従うこと。基盤とパイロット（math）はコーディネーターが
実装・検証済み（tests/muse-adv-b7-foundation.test.js、
tests/muse-adv-b7-math.test.js が見本）。

**契約の優先（2026-11-17 追記）**：モード機構コーディネーターの契約
（`~/workspace/programming-practice-audit/work/adv-mech/docs/audit/muse/advanced-interface.md`）
が本規約より優先する。本規約の §1（配置・命名）と §3（項目形状）は契約に
合わせて改訂済み。

## 1. 成果物の置き場所と形

- 作業ツリーは自チーム専用コピー（コーディネーターが指定）。共有ファイル
  （engine.js、stdlib-registry.js、advanced/index.js、既存テスト）には
  **触らない**。成果は新規ファイルの追加のみ。
- 高度ファイルは `js/types/python/` 直下に置き、ファイル名に必ず
  `-advanced` を含める（契約第7章の precache 除外パターンに一致させるため。
  パターン外の名前は precache に混入し契約違反になる）。
- 群ごとに次のファイルを作る（`<g>` は群名、`<m>` はモジュール名）：
  - `js/types/python/impl-advanced-<m>.js`：意味論実装。import の副作用で
    `registerStdlibModule` を呼ぶ。
  - `js/types/python/reference-advanced-<m>.js`：契約の export 形式で
    `export const referenceAdvanced = [...]` と、基礎項目への上書きがある
    場合のみ `export const referenceOverrides = [...]` を export する。
  - `tests/muse-adv-b7-<g>.test.js`：群のテスト。
- モジュールが複数ある群はモジュール単位にファイルを分ける。群の集約が
  必要な場合は `js/types/python/group-advanced-<g>.js`（これも -advanced を
  含む名前にする）。`advanced-engine.js` と `advanced-manifest.js` は
  コーディネーターが所有し、統合時に import と referenceParts を追加する
  ので、チームは触らない。

## 2. 実装 API（engine.js が提供）

- `import { PyAPI } from '../engine.js'`：値コンストラクタ NUM(v, isFloat)／
  BOOL／NONE／LIST／TUPLE／DICT／SET／RANGE／ITER／UNK(desc) と、判定
  isNum／isBool／isNone／isList／isTuple／isDict／isSet／isUnk／isFunc、
  表示 reprVal／reprFull／strVal／typeName、truthy、dictGet／dictSet／dictKeyId。
  **NONE は単例。複製・新規生成は禁止**（必ず PyAPI のものを返す）。
- `import { registerStdlibModule, registerStdlibClass, registerStdlibException, NOT_HANDLED } from '../stdlib-registry.js'`。
- モジュール定義：`registerStdlibModule('名前', { constants, data, functions, classes })`
  - constants／data：名前→エンジン値（束ね値。値は正確に解決すること）。
  - functions：名前→`(ctx, args, kwargs) => エンジン値`。
  - classes：単純名→クラス定義（下記）。例外クラスもここに入れる。
- クラス定義（stdlib-registry.js のコメントが正本）：
  `{ typeName, construct(ctx,args,kwargs), methods, classMethods, attrs,
     classAttrs, repr, str, truthy, eq, hash, call, binop, compare, len, iter,
     getitem, setitem, contains, exc, excParents, parents }`
  - `call(ctx, self, args, kwargs)` を定義するとインスタンス自体が呼び出し
    可能になる（functools.partial、operator.attrgetter 等はこちら）。
  - `eq` を定義するクラスは必ず `hash` も定義する（値で等しい型は値ハッシュ、
    CPython でハッシュ不可の型は `hash: () => null`）。
  - 例外クラスは `{ exc: 'モジュール.クラス名', excParents: ['ValueError', ...] }`
    を付け、`construct` は書かない（エンジンが例外値を作る）。
  - `parents` は isinstance 用の親クラス限定名の配列。
- ctx（実装関数へ渡される実行コンテキスト）：
  - `ctx.V`（値コンストラクタ群）、`ctx.isNum` 等の判定、`ctx.num(v)`（数値化、
    できなければ null）、`ctx.int(v)`、`ctx.str(v)`、`ctx.listOf(v)`、
    `ctx.repr(v)`、`ctx.strOf(v)`、`ctx.typeName(v)`、`ctx.truthy(v)`
    （true／false／null）、`ctx.eq(a, b)`（true／false／null）。
  - `ctx.err(kind, msg, fix)`：その場で例外として停止する（throw される）。
    kind は CPython の例外名（限定名可）。msg は CPython の str(例外）に
    相当する文面を英語のまま使う（既存エンジンの慣例：例外メッセージは
    CPython の原文、説明文は日本語）。
  - `ctx.diag(text)`／`ctx.step(text)`：説明の注記・ステップ。
  - `ctx.unk(desc)`：未確定値。安易に使わない（§4）。
  - `ctx.call(fn, args)`：コールバック呼び出し（位置引数のみ）。
  - `ctx.iterable(v)`：並びの配列化（できなければ null）。
  - `ctx.binop(op, a, b)`／`ctx.compare(op, a, b)`：エンジンの演算へ委譲。
  - `ctx.native(限定名, data)`／`ctx.ncls(限定名)`：ネイティブ値の生成。
  - `ctx.NOT_HANDLED`：binop／getitem で「自分は扱わない」を返すセンチネル。
- kwargs は**評価済みの値**が渡る（AST ではない）。位置専用関数では
  kwargs が空でないことを確認して TypeError にする（math パイロット参照）。
- import の形（import a.b／as／from／star／括弧）は基盤が処理する。
  実装側で import 文を解析する必要はない。

## 3. リファレンス項目の形（契約第4章の正規形）

高度項目は正規形で書く（生データ形式は禁止）：
`{ name, category, syntax, description, example, caution, status, returns?, source? }`
- name はインベントリの項目名そのもの（例 `datetime.date.fromisoformat`）。
  合成の照合キーであり、カタログ内で一意でなければならない。
- description は説明文、caution は注意点（無ければ空文字列）、source は
  公式ドキュメント 3.15 の該当アンカー
  （`https://docs.python.org/ja/3.15/library/<module>.html#<...>`）。
- 上記以外のフィールド（id、importance、level、summary、args、expected、
  pitfalls、related、lesson、doc 等）を足してはならない。引数の詳細や
  例題の期待出力などの情報は description／caution の文面に含めるか、
  テストファイル側のケース表に保持する（F-04 照合はテストで実施）。
- status は次の3値のみで、全高度項目に必須：
  - `supported`：意味論を実装し、実走照合済み。
  - `unsupported`：未対応（F-16 の未対応区分、または項目裁定で未対応に
    分類したもの）。caution に「本アプリの高度モードでは未対応です」と
    理由（一文）を必ず書く。
  - `unverified`：意味論を一次情報で確定できず未検証に倒したもの。
    caution に何が確定できなかったかを書く。
- example は supported 項目では必須（実際にエンジンで実行して期待出力と
  一致することをテストで機械照合する）。unsupported／unverified では
  example は公式ドキュメント由来の代表例を入れてよい（その場合も
  caution で状態と理由を明示する）。
- **基礎カタログとの重複**：基礎リファレンス（215件）に限定名が完全一致
  する標準ライブラリ項目は math の9件（math.ceil／e／fabs／floor／inf／
  nan／pi／sqrt／tau）のみで、コーディネーターが referenceOverrides で
  処理済み。他の項目は全て新規であり referenceAdvanced に入れる。
  backlog.json の current 欄は接尾辞一致の誤検出を含むため、重複判定には
  使わないこと。基礎の素名項目（例 'datetime'）の状態を変えたい場合は
  勝手に override せず、報告書に記録してコーディネーターの裁定を仰ぐ。

## 4. 品質規則（U-44／U-45／A-10）

- 値・型・エラー種別・例外メッセージは CPython と一致させる。推測で
  実装しない。一次情報は公式ドキュメント（3.15）と CPython 実走
  （ローカル 3.12.3。3.13 以降の新機能はドキュメントで裏付ける）。
- 確定できない意味論は捏造せず、項目を `unverified` に倒すか、
  実装関数の中で `ctx.err('未検証', ...)` ではなく **diag で未検証と
  注記して ctx.unk を返す**（正直な停止。A-10）。どちらにしたかを
  群の報告書に明記する。
- プラットフォーム依存値（OS のエラー番号、ロケール、時刻帯データの
  具体値など）は実値化しない。定数として正確に定まるものだけ束ね値に
  する（例：errno の数値はプラットフォーム依存→ data は未検証扱いの
  判断をコーディネーターに確認）。
- 浮動小数点の超越関数は、可能な限り正確に丸める。単純な JS 実装で
  CPython と 1ulp ずれる場合は、その旨と実測範囲を報告書に書く
  （math パイロットの erf＝厳密級数、gamma＝DD Stirling が前例）。
- 日時・暦の計算はタイムゾーンなし（naive）を基本とし、暦規則は
  proleptic Gregorian で公式ドキュメントどおりに実装する。

## 5. テスト規則（F-01）

- 群のテストファイルに、実装した全項目について最低限のケースを置く：
  典型（正常系）／境界（空・0・最大最小・端点）／異常（型違い・範囲外で
  正しい例外種別になること）。クラスは生成・メソッド・属性・演算・
  等価・repr の表面を覆う。
- 期待値は CPython 実走（python3 コマンド）で裏付けた値だけを書く。
  実走できない項目（3.13+ 新機能）はドキュメントの例で裏付ける。
- テストは `node --test tests/muse-adv-b7-<g>.test.js` で単独実行できる
  こと（advanced の自群ファイルだけを import する。他群へ依存しない）。

## 6. 報告（群の完了時）

群フォルダの報告書 `docs/audit/b7-<g>-report.md` に次を書く：
- 区分別件数（個別実装／束ね値／例外対応付け／未対応／未検証）と、
  F-16 候補からの再分類があれば項目名と理由。
- 照合方法（CPython 実走の範囲、ドキュメント照合の範囲）と、
  浮動小数点等の既知の微差。
- 残存（未検証の内訳、判断を仰ぐ事項）。
