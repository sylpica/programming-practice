# 高度モード ブロックB4（Excel VBA＋R）作業仕様（コーディネーター発行）

本書は B4 の全チーム共通の作業契約である。計画書（advanced-mode-plan.md）、監査要件まとめ（U-44／U-45／U-46、F-01〜F-04）、角度カタログを正本とし、本書はその B4 への適用を定める。

## 1. 成果物の置き場所（高度差分に閉じる）

基礎層（content.js、既存の reference／templates／glossary 配列、既存エンジン挙動）には項目を追加しない。成果は次のファイルに閉じる。

### VBA（js/types/vba/）
- `reference-advanced.js`：高度リファレンス項目（export const referenceAdvanced = [...]）
- `templates-advanced.js`：export const templatesAdvanced = [...]
- `glossary-advanced.js`：export const glossaryAdvanced = [[用語, 説明], ...]（基礎層と同じ形式）
- `functions-advanced.js`：export const advancedBuiltins = { 小文字名: (args, ctx) => 値 }
- `constants-advanced.js`：export const advancedConstants = { 小文字名: 値 }（engine.js の VBA_ENUM_CONSTANTS へ統合済み）

### R（js/types/r/）
- `reference-advanced.js`：集約（part1／part2 を import して referenceAdvanced を export）
- `reference-advanced-part1.js`／`reference-advanced-part2.js`：高度リファレンス項目
- `names-advanced.js`：集約（part1／part2 の名前配列を結合して advancedNames を export）
- `names-advanced-part1.js`／`names-advanced-part2.js`：export const names = [...]
- `templates-advanced.js`／`glossary-advanced.js`：VBA と同じ形式
- `functions-advanced.js`：集約（グループファイルを import し、advancedBuiltins: Map と advancedNames を export）
- `functions-advanced-<group>.js`：export const builtins = new Map([[名前, handler], ...])

### エンジン側フック（コーディネーターが設置済み。チームは触らない）
- VBA：engine.js が functions-advanced.js／constants-advanced.js を import し、(1) 定数を VBA_ENUM_CONSTANTS へ統合、(2) STATIC_BUILTIN_FUNCS へ関数名を登録、(3) call 評価で基礎関数の後に高度関数をディスパッチする。`known` リストにも自動で加わる。
- R：r/index.js が functions-advanced.js を import し、(1) advancedNames を FUNCTION_NAMES へ統合、(2) call 評価で基礎 IMPLEMENTED の後に高度関数をディスパッチする。

## 2. リファレンス項目の形式

基礎層の項目形式（name／category／syntax／description／example／caution／supported）に次を追加する。

```js
{
  name: "DateAdd",                 // 表示名。VBA は公式表記（PascalCase）、R は関数名そのまま
  category: "日付と時刻",           // 基礎層のカテゴリ慣行に合わせる
  syntax: "DateAdd(interval, number, date)",
  description: "一次情報に基づく事実のみを書く。モデルの範囲で実物と異なる点は caution に正直に書く",
  example: "実行可能な例コード（未対応項目では文書としての正しい使用例）",
  caution: "",                     // 無ければ空文字
  supported: false,                // status === "supported" のときだけ true
  status: "supported",             // "supported" | "unsupported" | "unverified"
  reason: "",                      // unsupported／unverified のとき名指し理由（必須・空欄禁止）
  topic: "MathFun"                 // R のみ：所属ヘルプトピック名
}
```

- status の定義（計画 §4.1）：supported＝意味論を実装し一次情報で検証済み。unsupported＝範囲外・原理的に再現できない・極小意味論の名指し停止（U-44(2)）。unverified＝意味論を一次情報で確定できなかった。
- 到達性（F-02）：R は関数名単位で項目を作る（トピック単位の束ね項目にしない）。VBA の定数はメンバー名単位（「グループ名.メンバー名」）で項目を作り、名前解決はメンバー名で届くこと。
- description／syntax／example の事実は一次情報（VBA＝Microsoft Learn、R＝公式ヘルプページ）で裏付ける。裏付けのない記述は書かない（F-04）。

## 3. VBA ハンドラ契約（functions-advanced.js）

- engine.js を import しないこと（循環参照になる）。必要な道具は ctx で渡される。
- シグネチャ：`(args, ctx) => VBA値`
  - args：評価済み・value() 解決済みの値の配列。未知値（isU）はエンジン側の汎用伝播で処理済みのため渡ってこない。**Null（{kind:"null"}）は渡ってくる**ので、関数ごとの Null 規則（伝播／エラー94／特殊扱い）を一次情報どおりに実装すること。
  - ctx：{ fail(message, code), unsupported(what), unknown(source, meta), isU, value(v, s), s, display, str, num, cast, toLong, roundEven, EMPTY, NULL, NOTHING }
  - 戻り値：VBA 値モデル（number／string／boolean、{kind:"empty"|"null"|"nothing"|"array"|"range"|"err", ...}、unknown(...)）。
- 引数の個数・型の検査は関数ごとに一次情報どおり行い、エラーは実 VBA のエラー番号・文言の規則（fail(文言, 番号)）に従う。個数不一致は 450、型不一致は 13、引数不正は 5、Null の不正使用は 94、オーバーフローは 6。
- 日付の表現：基礎エンジンの Date／Now は「実行時に決まる値」。日付関数の実装に当たっては、シリアル値（1899-12-30 起点の Double）と文字列解釈の規則を一次情報で確定し、チーム内で表現方式を統一して報告書に明記する。確定できない関数は unverified にせず、根拠を記録したうえで裁定する（多くは supported か unsupported のどちらかに決まるはずである）。

## 4. R ハンドラ契約（functions-advanced-<group>.js）

- r/index.js を import しないこと。道具は ctx で渡される。
- シグネチャ：`(ctx) => R値`
  - ctx：{ name, args（AST 引数：argName を持つ）, vals（評価済みの値）, named, pos, api: { fail(message, node), read(a, s), freshUnknown(source, s) }, s, node, matchArgs(formals), H }
  - H：{ vec, flat, isNA, isNaNVal, isMissing, withNames, namesOf, coerce, show, unknown, isUnknown, formatRNum, dfNrow, NA }
  - 未知値：原則としてフック側で汎用伝播する（vals に未知値があれば unknown を返す）。未知値でも判定・処理できる関数（is.* 系等）は、ハンドラ関数に `acceptsUnknown = true` のプロパティを付けると vals がそのまま渡る。
- 引数照合は matchArgs(formals) を使い、実 R の規則（名前付き完全一致→位置の順）に従う。`...` を持たない関数で余分な引数があれば実 R どおり `unused argument (...)` で api.fail する。必須引数の欠落も実 R の文言で fail する。
- 戻り値：R 値モデル（配列＋.names 属性、null＝NULL、{kind:"NA"}、{kind:"data.frame", columns, rowNames}、unknown(...)）。NA の伝播、名前属性の引き継ぎ、再利用規則（recycling）は実 R どおりにする。長さ 0 の扱い、警告で済むものとエラーになるものの区別も一次情報どおり（警告は値に影響しない範囲で再現し、trace への出し方は基礎層の慣行に従う）。
- 遅延評価・言語オブジェクト・環境・S3 ディスパッチ等、値モデルで忠実に表せないものは実装せず、リファレンス側で unsupported（名指し理由つき）とする。**誤った値を返すくらいなら止める**（U-44 エラーゼロ原則）。

## 5. ステータス裁定の原則

- インベントリの「未対応候補」は候補であり、最終裁定は各チームが一次情報とモデル範囲で確定する。
- 基礎層で既に実装済みの項目は高度差分に重複させない（VBA の現行のみ存在する項目 48 件は表記差異の対応表を報告書に残す）。
- 参照のみ（supported:false）だった項目は高度モードで definitive に裁定する（実装して supported、または unsupported として理由を確定）。
- VBA ステートメント：パーサが受理しない文は、現状の停止が「名指しの正直な停止」（F-03）になっているかを監査で確認する。受理して黙って捨てる経路があれば欠陥として直す。実装する場合はパーサ変更を最小限にし、既存テストを壊さない。
- R のトピックが「ドキュメントのみ」（演算子・キーワード・概念）の場合、その対象名は基礎パーサ／評価器が扱う範囲で supported、扱わない名前は個別に裁定する。

## 6. テスト

- 新規テストは `tests/adv-b4-<担当>.test.js` に置く（node --test tests/*.test.js で拾われる）。
- 各実装関数に F-01 のケース分類（典型／境界／異常／組み合わせ）を最低限そろえる。
- 全体テスト（npm test）は約140秒かかる。開発中は担当テストファイル＋関連する既存テスト（VBA: tests/engine.test.js と muse-fix-batch*-vba.test.js、R: muse-fix-batch*-r.test.js 等）だけを回し、統合時に全件を回す。
- 時間予算系の既知フレーキーは、失敗したらベースツリー（repo-reffix）で対照実行して切り分ける。

## 7. ブロック監査（角度カタログの B4 スコープ適用）

- A群・B群・C群・F群（F-01〜F-04）：B4 の新規・変更表面に全件適用する。F-01 は新規実装関数全件にケース台帳を作る。F-02 はインベントリ↔高度カタログ↔エンジン登録の3方向突き合わせ＋名前到達性（検索述語による機械照合）。F-04 は文面・使用例の全件照合（一次情報）。
- D群：機構依存（モード切替 UI 等）は対象外（理由：モード機構は別工程。B4 はデータとエンジンに閉じる）。ただし D-05（検索の正確性）・D-06（チップ・リファレンス連携）は合成カタログ（基礎＋高度）で機械照合する。D-07 は新規テンプレートの trace を機械走査する。D-08／D-09／T-01 は新規テンプレート・用語集に適用する。
- E群：E-02 は precache の整合（統合時に再生成し --check を通す）。E-07 は実測。E-06（旧名残存）・X-01（追加データ面の表示安全性：新規文面が HTML として解釈されないこと）は適用する。その他（E-01／E-03〜E-05／E-08〜E-11、D-15 テーマ等）は対象外（理由を報告書に明記：B4 の変更表面に保存・公開・テーマを含まないため。D-15 は計画 A-12 で対象外確定）。
- M-01／J-01／N-01：新規の停止文言・説明文・日本語文面に適用する。
- R の実物照合：実 R が使える場合は実走で差分照合（A-03）する。使えない場合は Codex 監査（CODEX-R7.md）の実測記録＋公式ヘルプで裁定し、その旨と未検証範囲を報告書に明記する。

## 8. 進め方・報告

- 各チームは担当ファイルだけを編集する。共有ファイル（engine.js、r/index.js、集約ファイル、台帳、状態ファイル）には触らない（フックと集約の配線はコーディネーターが行う）。
- 欠陥を見つけたら、同根の兄弟表面を洗ってから直す（U-34）。
- チーム報告書を `docs/audit/ADV-B4-<担当>.md` に残し、最終報告には「種別ごとの実装件数（対応／未対応／未検証）・一次情報の根拠・残存」を含める。
