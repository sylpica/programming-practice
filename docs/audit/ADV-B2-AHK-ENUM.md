# ADV-B2 AutoHotkey v2 未確認3グループ列挙結果

- 作業: 高度モード ブロックB2（AutoHotkey v2班）
- 対象棚卸し: `advanced-inventory/inventory-autohotkey.md`（総数424、未収録398、未確認3グループ）
- 確認日: 2026-11-17
- 数え方は棚卸しの規則に揃える：メソッドのみを数え、プロパティは数えない。静的メソッド Call と __New／__Enum も、公式ページ／公式索引にメソッドとして掲げられている場合に限りメソッドとして数える。

## 1. InputHook オブジェクトのメソッド群 → 4件

一次情報: 公式ドキュメント InputHook ページ（https://www.autohotkey.com/docs/v2/lib/InputHook.htm）の Methods 節、および公式索引（同ドキュメントの索引が各項目を "method (InputHook)" / "property (InputHook)" と分類していること）。

メソッド（4件）:

| 項目名 | 根拠 |
|---|---|
| InputHook.KeyOpt | InputHook.htm Methods 節／索引 "KeyOpt method (InputHook)" |
| InputHook.Start | InputHook.htm Methods 節／索引 "Start method (InputHook)" |
| InputHook.Stop | InputHook.htm Methods 節／索引 "Stop method (InputHook)" |
| InputHook.Wait | InputHook.htm Methods 節／索引 "Wait method (InputHook)" |

数えないもの（プロパティのため）: BackspaceIsUndo、CaseSensitive、EndKey、EndMods、EndReason、FindAnywhere、InProgress、Input、Match、MinSendLevel、NotifyNonText、OnChar、OnEnd、OnKeyDown、OnKeyUp、Timeout、VisibleNonText、VisibleText（いずれも索引で "property (InputHook)" と分類）。

Call／__New／__Enum: InputHook ページに Call／__New／__Enum のメソッド節は存在しない（コンストラクタ呼び出し自体は関数項目 InputHook として棚卸し済み）。Array／Map／Buffer のように公式ページが Call／__New をメソッドとして掲げる場合と扱いを揃え、本グループでは数えない。

## 2. RegExMatchInfo オブジェクトのメソッド群 → 3件

一次情報: 公式ドキュメント RegExMatch ページ（https://www.autohotkey.com/docs/v2/lib/RegExMatch.htm）の "Match Object (RegExMatchInfo)" 節、および公式索引の分類（"Pos method/property (Match)" 等）。

メソッド（3件。いずれも呼び出し形 `Match.Pos(N)` と添字形 `Match.Pos[N]` の両方が公式に示される method/property）:

| 項目名 | 根拠 |
|---|---|
| RegExMatchInfo.Pos | RegExMatch.htm MatchObject 節／索引 "Pos method/property (Match)" |
| RegExMatchInfo.Len | RegExMatch.htm MatchObject 節／索引 "Len method/property (Match)" |
| RegExMatchInfo.Name | RegExMatch.htm MatchObject 節／索引 "Name method/property (Match)" |

数えないもの（プロパティのため）: Count（索引 "Count property (Match)"）、Mark（索引 "Mark property (Match)"）。また `Match[N]` の添字アクセスと `Match.<名前>` はプロパティ的なアクセスであり、メソッドとして数えない。

__Enum: RegExMatch.htm 本文は「列挙に対応する」と述べるが、公式索引にも同ページにも __Enum というメソッド項目は掲げられていない（Array／Map では公式ページが __Enum をメソッドとして明示する）。棚卸しの規則（公式にメソッドとして掲げられたものを数える）に揃え、本グループでは数えない。

## 3. String オブジェクト固有メソッド群 → 0件

一次情報と事実関係:

- 公式ドキュメントに String 固有メソッドの一覧を載せる専用ページは存在しない。lib/String.htm は変換関数 String() のページであり、メソッド一覧ではない。
- 代替の一次情報として Objects.htm の "Primitive Values" 節（https://www.autohotkey.com/docs/v2/Objects.htm#primitive）を確認した。同節は「プリミティブ値（文字列・数値）は固有のプロパティ・メソッドを持つことができない。メソッド呼び出しは対応するクラスの Prototype オブジェクトへ委譲される」と明記し、String はプリミティブ値のクラスとして挙げられている。組み込みで String.Prototype に用意されたメソッドの一覧は公式ドキュメントのどこにも掲げられていない（スクリプトが String.Prototype へ追加する使い方が説明されるのみ）。
- したがって String 固有メソッド群の実数は **0件** で確定する。文字列操作は関数部の Str* 等（棚卸し済み）でカバーされる。

## 確定した母数

- 未収録（棚卸し確定分）: 398件
- InputHook メソッド群: 4件
- RegExMatchInfo メソッド群: 3件
- String 固有メソッド群: 0件
- **高度差分の母数合計: 405件**（棚卸し総数424 − 未確認グループ3件 + 実項目7件 = 428件が v2 全体の確定総数）
