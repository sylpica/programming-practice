# 高度モード ブロックB5（C#／JavaScript）設計メモ

作成：2026-11-17、B5コーディネーター。正本は `advanced-mode-plan.md`（計画）と監査要件まとめ。本メモは B5 内の作業規約であり、計画と矛盾する場合は計画が優先する。

## 1. 成果物ファイル（最終形・納品時）

### C#（`js/types/csharp/`）
- `reference-advanced.js`：`export const referenceAdvanced = [...]`（440件、下記フォーマット）＋ `export const referenceOverrides = [...]`（基礎と同名の5件：String.Empty、Math.E、Math.PI、Console.ReadLine、Console.WriteLine。契約どおり同名重複は高度側に置かず上書きとして分離）
- `advanced-engine.js`：高度側の意味論本体（呼び出しディスパッチ・表示形・型タグ等）。c-family.js の managed 限定ブロックから委譲される
- `templates-advanced.js`：`export const templatesAdvanced = [...]`（8件。基礎テンプレートと同形のデータ。model フィールドは持たず、実行時は種別既定モデルを使う）
- `glossary-advanced.js`：`export const glossaryAdvanced = [[用語, 説明], ...]`（24件）
- `advanced-manifest.js`：`export const advancedManifest = { referenceParts, templatesFile, glossaryFile, engineFile }`（契約 第5章のファイル構成宣言）

### JavaScript（`js/types/javascript/`）
- `reference-advanced.js`：`export const referenceAdvanced = [...]`（489件。基礎との同名重複は0件のため上書きなし）
- `advanced-engine.js`：高度側の意味論本体。index.js のディスパッチ各所から委譲される
- `templates-advanced.js`：`export const templatesAdvanced = [...]`（8件）
- `glossary-advanced.js`：`export const glossaryAdvanced = [...]`（21件）
- `advanced-manifest.js`：C# と同形

### 契約（advanced-interface.md）との差異（受容済み・報告書に記録）
1. `scan`（両種別）／`inventoryNames`（JS）フィールドは契約 第4.1 の項目表に無い追加フィールドとして保持する（F-02 到達性のメタデータ。加算のみで契約の必須フィールドは全て満たす）。なお現行アプリの `scanScript` は `name` のみを読むため、`scan` の機構側消費は未検証。
2. エンジン接続は `applyAdvancedEngine` フックではなく静的合成（C#：c-family.js 内の managed 限定委譲ブロック＋区切り明示した表示系分岐。JS：index.js 内の委譲点）。フックの具体仕様が契約 R-3 で未決のためであり、意味論は全て `advanced-engine.js` に分離してあるので、フック方式への移行は配線のみで可能。モード条件分岐は一切入れていない（単一エンジン原則どおり、実行結果はモードで変わらない）。

## 2. リファレンス項目フォーマット

```js
{
  name: "String.Substring",   // 正規名（一意）。インベントリの項目名と一致させる
  scan: "Substring",          // コード中で解決されるトークン形。name と同じなら省略可
  category: "文字列",
  syntax: "string.Substring(startIndex)",
  description: "…（一次情報に基づく正確な説明）",
  example: "…",
  caution: "…（なければ空文字）",
  status: "supported" | "unsupported" | "unverified",
  returns: "…",
  source: "https://…（一次情報URL）",
}
```

- C# はインベントリ1行＝1項目（445件全件）。基礎カタログと名前が重複した5件のみ `referenceOverrides` に分離し、残り440件を `referenceAdvanced` に収載する（棚卸し↔カタログの双方向照合で 445＝440＋5 を監査確認済み）。
- JavaScript は「コードで解決される名前（scan名）」を単位に項目化する。インベントリの複数行が1項目に束なる場合は `inventoryNames: [...]` にカバーするインベントリ名を全て列挙する（例：scan "join" の項目が Array.prototype.join と Iterator.prototype.join をカバー）。インベントリ721行の全てがいずれかの項目の name または inventoryNames に現れること（F-02 存在の機械照合対象）。
- JS の静的・グローバル項目は name=scan（例 "Math.max"、"Object.keys"、"JSON.parse"）。プロトタイプメソッドは name をインベントリ正規名（例 "Array.prototype.map"）、scan を末尾要素（例 "map"）とする。
- status の意味（計画 第4章）：supported＝意味論を実装し一次情報で検証済み／unsupported＝未対応（名指し停止）／unverified＝未検証（意味論を一次情報で確定できず、エンジンも正直に停止する）。
- 部分実装の項目（主要な形は実装し、特定の形だけ未対応として名指し停止する場合）は、基礎カタログの既存慣行どおり supported とし、未対応の形を caution に明記する。項目の唯一の形が未実装なら unsupported とする。

## 3. エンジン統合方式

- エンジンは単一（計画 1.1）。高度差分はカタログ側の分離であり、エンジン拡張は単一エンジンへの追加である。簡易モードで従来サポートされていたコードの挙動を変えてはならない（回帰は全テストで担保）。
- JavaScript：`js/types/javascript/index.js` の call ディスパッチを拡張する。関数値はこの方言に存在しない（JSON.stringify の replacer に関する既存コメントが明言）ため、**コールバックを必須とする呼び出しはモデル境界として名指し未対応**とする。コールバックなしの形がある項目（sort の比較関数なし形等）はその形を実装する。
- C#：`js/core/c-family.js` は C／C++ と共有のため、編集は全て **managed（`language === "csharp"`）限定・区切りコメント明示** とする。実際の接点（納品時）：呼び出しディスパッチの委譲ブロック、表示系の区切り分岐（transformDisplay／WriteLine の配列分岐／csConcatText）、静的定数の型名レジストリ（CLR 名＝エイリアス等価）、TryParse の解析形一般化、ref／out／in 引数修飾の解析パス、戻り型推論テーブル、要素型タグ `__elemSys` の表示側読み取り。意味論の本体は `js/types/csharp/advanced-engine.js` に分離し、advanced-engine.js は c-family.js を import しない（循環回避）。必要な内部ヘルパはフック側から引数で渡す。
- 時刻・乱数など実行時に決まる値は捏造しない。既存エンジンの流儀（freshUnknown による未確定値）に従う。
- 値サイズ・パス数などの上限ガード（contract.js の LIMITS、P-N1 の 200000 文字ガード等）を迂回しない。

## 4. テストと監査

- 実装チームは `tests/adv-b5-csharp.test.js`／`tests/adv-b5-javascript.test.js` を追加し、全テスト（`npm test`、ベースライン 4,597 件）を通す。パスキャップ系の時間予算テスト（tests/engine.test.js、cmd.test.js:128、powershell.test.js）は当VMのCPUスロットリングで間欠失敗しうる既知の環境要因であり、失敗時は単体再実行とベースツリー対照で切り分ける。
- 実物照合：C# は `~/dotnet`（SDK 8.0.428）で実コンパイル・実走し、期待値を一次情報とする。JS は Node 実走と照合する。照合に使ったケースはテストまたは照合台帳として残す。
- テンプレートのコードは supported 項目だけに依存すること（未対応項目に触れる場合は intro で明示する。計画 4.2-4）。

## 5. 触ってはいけないもの

- 台帳 `docs/audit/muse/consolidated-residual-register.md`、状態ファイル等の共有ファイル。
- precache（`scripts/precache.mjs` の再生成を含む）。高度差分は全量 precache に入れない。
- 他種別・他ブロックのファイル。C# の作業で C／C++ の挙動を変えない（managed ガード必須）。
