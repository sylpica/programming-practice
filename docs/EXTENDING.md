# 言語・ツールの追加

## モジュール契約

`js/types/<id>/index.js` から `definition` をexportします。コアUIは種類名による条件分岐を持たず、定義の能力を読み取ります。

```js
export const definition = {
  id: "sample",
  name: "表示名",
  extensions: [".sample", ".txt"],
  syntax: { name: "構文名", caseSensitive: true, lineComment: "#" },
  reference: [
    {
      name: "print",
      category: "出力",
      syntax: "print(value)",
      description: "説明",
      example: "print(1)",
      caution: "注意",
      supported: true,
    },
  ],
  templates: [
    {
      id: "sample-basic",
      title: "基礎",
      level: "基礎", // 基礎 / 実践 / 応用
      code: "...",
      intro: "解説",
      refs: ["print"],
    },
  ],
  glossary: [["用語", "意味"]],
  model: {
    kind: "json",
    title: "モデル",
    hint: "編集方法",
    defaults: { variables: {} },
  },
  semantics: {
    description: "意味論",
    support: "対応範囲・未対応・未確認",
    sources: [{ title: "一次資料", url: "https://..." }],
  },
  scan(code) {
    return ["使用項目の名前"];
  },
  async simulate(code, model, limits) {
    return { paths: [], truncated: false };
  },
};
```

`js/types/registry.js` のimportと配列に登録し、`node scripts/precache.mjs` でオフライン一覧を更新します。登録時に必須項目とidの重複を検証します。

## 共通の結果

```js
{
  paths: [{
    id: 0, // 出現順で安定したID。ソートと選択の保持に使用
    trace: [{ line: 3, nodeId: 'action-2', text: '説明', kind: 'step', refs: ['print'] }],
    outputs: [{ channel: 'stdout', text: '出力', line: 3 }],
    groups: [{ title: '終了時のモデル状態', entries: [['名前', '表示文字列']] }],
    error: { line: 3, message: '原因', category: 'エラー種別' } // 任意
  }],
  error: { line: 1, message: '構文エラー等' }, // 解析そのものが失敗した場合だけ
  truncated: false,
  limits: { paths: 2000 },
  reasons: []
}
```

- 行番号は元ソースの1始まり。繰り返し文・重複文字列でも文字列検索で対応付けないでください。
- `nodeId` はアクション編集プラグインが提供する任意の識別子です。
- `trace.refs` はその手順で実際に評価した項目を出現順に入れます。未選択分岐の項目を混ぜません。
- `groups.entries` は変数・メモリ・モデル状態などを表示文字列へ整形したものです。コアUIは各言語の型を推定しません。
- 未確定値は `core/contract.js` の `unknown(source, id)` を使えます。固定の外部状態のIDと、呼び出すたびに変わる入力のIDを区別してください。
- 対応外・未確認・未定義動作は明示して停止し、後続の確定結果を生成しません。

## 再利用できる基盤

- `core/script.js`：字句・式・ブロックの構文解析、制御フローの実行、スコープ、予算管理。各モジュールの意味論フックで演算・入出力・メモリを定義します。
- `core/conditions.js`：未確定条件の論理積・論理和・等値／不等値・線形式の制約。一般的な定理証明器ではないため、対応外の比較は停止します。
- `core/data.js`：位置情報付きJSON解析。JSON構造からアクションの元行を対応付けます。
- `core/actions.js`：平坦なアクション列からIf / Else / End、ループのASTを生成します。
- `core/action-editor.js`：パレットの定義から追加・編集・上下移動・削除を行う編集画面を作ります。`editor.mount()` を定義に指定します。
- `core/c-family.js`：C系の構文を共有し、C/C++の未定義動作とC#の例外・オーバーフローを分けます。意味論をJavaScriptの挙動で代用しません。
- `types/shell/model.js` と `runtime.js`：cmd／PowerShell用のモデルFSと実行予算のアダプター。種類ごとのパーサ・意味論をコアUIへ追加せず実装します。
- VBA、Python、ImageJは独立した既存エンジンをアダプターで共通結果へ変換します。
- `worker.js`：種類のidで該当するsimulateを実行します。コアUIはWorkerを2.5秒で終了できます。

## 制限と試験

上限は共通契約の2,000パスを超えないようにしてください。探索回数と総時間にも制限を付けます。上限時は `truncated` と理由を返し、継続中のループを「完了」としないでください。

最低限、通常例・型／境界・未知条件・エラー行・対応外・大きい入力・拡張子・ブラウザ切替・保存復元・オフラインを試験します。新しいエンジンに応じた一次資料と独立した期待値を追加してください。

## 本体の保存状態

各種類の下書きはidで分離します。テンプレートには任意の `model` を指定でき、そのテンプレートを読み込んだときだけ初期モデルを切り替えます。表示中のモデルは自動で実環境から取得しません。

## 練習テンプレートの段階と入口

本体は練習モードのみです。テンプレート集のカードは、練習画面へ移ってそのコードを読み込む入口です。対象15種類では最低6件とし、基礎・実践・応用を含めます。現在の全104件の内訳は `docs/audit/REQUIREMENTS.md` に記録しています。応用も実装済みの部分集合内で構成し、未対応APIを実行できる教材に見せないでください。

`level` は定義データです。教材が増えた種類は `additional-templates.js` 等へデータを分離し、種類モジュールから取り込めます。コアUIに種類別の分岐を追加する必要はありません。モデルの起動イベント等が前提になる教材は `model` も明示し、ほかのテンプレートから選び直しても正しい前提で練習できるようにします。期待出力・状態のfixtureと、カード選択→画面遷移→コード全文一致の操作試験も更新してください。

契約試験の数値基準は、各種類でテンプレート6件以上（基礎・実践・応用を各1件以上）、リファレンス7件以上、意味論の一次資料1件以上です。種類数はregistryから取得し、種類追加時に固定件数の試験を書き換える必要はありません。
