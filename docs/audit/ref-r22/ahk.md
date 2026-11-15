# リファレンス完全性修正 R22 — AutoHotkey 裁定記録

- 対象報告書：`reference-completeness-round22.md` の AutoHotkey 節（第1層118名・第2層1件）
- 変更ファイル：`js/types/autohotkey/index.js`（rows への項目追加・Loop 項目の文面変更・scan ラッパの A_* 別名解決）、`js/types/autohotkey/reference-details.js`（新規項目の returns／source）、新規テスト `tests/muse-fix-ref-ahk.test.js`
- 抽出成果物：`docs/audit/ref-r22/ahk-r2.json`（10行＝新規9件＋変更1件（Loop）。ビルド後の定義オブジェクトから node スクリプトで抽出）
- 追加後の AutoHotkey リファレンス総数：26件（従前17件＋新規9件。全件 supported）
- 検証：`node --test tests/muse-fix-ref-ahk.test.js` 8件合格、`node --test tests/muse-fix-ahk.test.js`（既存）と合わせて50件合格。`node --test tests/audit.test.js`（全890件）では AutoHotkey 分は全件合格（新規項目の runnable reference を含む）。同テストの失敗4件と `tests/types.test.js` の失敗1件はいずれも ImageJ 分（ij-3 テンプレート／PI／fromCharCode／toString）で、本担当の変更とは無関係。

## 個別裁定（A_* 以外）

| 対象 | 裁定 | 理由 | 一次情報の根拠 |
|---|---|---|---|
| `IsSet`（第1層） | 個別項目を追加 | 引数を評価せず未代入を確認する専用処理（index.js の call ハンドラ）があり、DEVELOPMENT 宣言内。未代入変数の読み取りがエラーになる言語仕様上、学習者の到達経路として必須 | AutoHotkey v2 公式「Variables and Expressions」：未代入変数の読み取りはエラーであり IsSet で検出できる https://www.autohotkey.com/docs/v2/Variables.htm |
| `IsSetRef`（第1層） | 個別項目を追加 | IsSet と対の専用処理。参照（&変数）を受け取る形が IsSet と異なるため分離。本文の caution にモデルの実装どおり「参照先が配列・オブジェクトのときに1、数値・文字列のときに0」を明記 | 同上（v2 変更点公式要約でも `IsSet(Var)`／`IsSetRef(&Ref)` は対で「代入済みなら1」と定義） |
| `for`（`for Key, Value in Collection`、第1層） | 個別項目を追加 | ahkForEach ノードとして専用実行があり、trace の refs が `for` を出すのに解決先がなかった。配列では Key=1始まり添字、オブジェクトでは Key=プロパティ名である旨を明記 | AutoHotkey v2 公式「For Loop」：列挙子が返す値を変数へ格納して繰り返す https://www.autohotkey.com/docs/v2/lib/For.htm |
| `break`（第1層） | 個別項目を追加 | 共有パーサ・実行器に専用処理があり、if／Loop／while が項目化されている以上、ループ終了の基本文が不可視なのは不揃い。ループ外ではエラーになる旨を caution に明記（実装で確認） | AutoHotkey v2 公式「Language」：Break はループを終了（terminate）する https://www.autohotkey.com/docs/v2/Language.htm |
| `continue`（第1層） | 個別項目を追加 | break と対の専用処理。現在の繰り返しの残りを飛ばして次へ進む | AutoHotkey v2 公式「Continue」：残りを飛ばして新しい繰り返しを始める https://www.autohotkey.com/docs/v2/lib/Continue.htm |
| `return`（第1層） | 個別項目を追加 | 専用処理があり、ホットキー本体を途中で終える実用形が既存テストでも使われている。使用例はモデルで実行できるホットキー本体の早期終了形とし、式付きは関数内のみと caution に明記（モデルはユーザー関数定義が未対応） | AutoHotkey v2 公式「Return」：関数・ホットキーから呼び出し側へ戻る。式は関数内でのみ https://www.autohotkey.com/docs/v2/lib/Return.htm |
| `Length`（プロパティ、第1層） | 個別項目を追加 | 配列・文字列への読み書き専用実装（RG-48）がある。配列では取得・設定（伸長は値なし要素、短縮は切り捨て）、文字列では文字数の取得、プロパティ名は大文字小文字不区別である旨を明記 | AutoHotkey v2 公式「Array Object」Length プロパティ：配列の長さを取得・設定する https://www.autohotkey.com/docs/v2/lib/Array.htm |
| Loop の Until 節（第2層） | 既存 `Loop` 項目の syntax と本文に Until 形式を追記（変更行として ahk-r2.json に収録） | `rewriteUntil` で実装され DEVELOPMENT でも宣言済みなのに項目文面に記載がなかった。syntax を「Loop 回数 { … } / Loop { … } Until 条件」とし、本文に「本体を1回実行するごとにその後で条件を評価し、成立したら終了する」を追記 | AutoHotkey v2 公式「Loop」／「Language」：Until は各繰り返しの後に式を評価し真ならループを終了する https://www.autohotkey.com/docs/v2/lib/Loop.htm |

## 組み込み変数 A_* 全111件の裁定

処置は2区分：**A_Index のみ個別項目**（テンプレート・テストでも使われる中心的な変数で、ループ内での意味が独立しているため）、**残り110件は束ね項目「A_*（組み込み変数）」**。束ね項目の本文には固定値／実行時に決まる値の区別と代表名を列挙し、caution に未対応21件の扱いを明記した。

あわせて **scan の別名解決**を index.js の scan ラッパ後処理として実装した（cmd の動的変数を束ね項目へ寄せる前例に倣う方法）。コード内の A_* 名（照合は大文字小文字不区別）が、A_Index は個別項目へ、それ以外の実装済み110件は束ね項目へ、使用中チップとして解決される。機械検証では実装済み111件全件の解決と、未対応21件・未知の名前（A_Banana）が解決されないことを確認した（テスト `tests/muse-fix-ref-ahk.test.js` は代表名＋未対応21件全件を固定している）。

一次情報の根拠：AutoHotkey v2 公式「Variables and Expressions」の Built-in Variables 一覧（正本） https://www.autohotkey.com/docs/v2/Variables.htm 。A_Index は同ページ Loop 節で「最初の実行で1、2回目で2、…、ループ外では0、最内ループ優先」と定義される。

### 個別項目（1件）

| 名前 | 区分 | 値の性質 |
|---|---|---|
| A_Index | 個別項目 | ループの繰り返し回数（実行時に決まる値。ループ外では0） |

### 束ね項目「A_*（組み込み変数）」— 固定値（2件）

A_Space（空白1文字）、A_Tab（タブ1文字）

### 束ね項目「A_*（組み込み変数）」— 実行時に決まる値（108件、全名）

A_AhkPath、A_AhkVersion、A_AllowMainWindow、A_AppData、A_AppDataCommon、A_Args、A_Clipboard、A_ComSpec、A_ComputerName、A_ControlDelay、A_CoordModeCaret、A_CoordModeMenu、A_CoordModeMouse、A_CoordModePixel、A_CoordModeToolTip、A_Cursor、A_DD、A_DDD、A_DDDD、A_DefaultMouseSpeed、A_Desktop、A_DesktopCommon、A_DetectHiddenText、A_DetectHiddenWindows、A_EndChar、A_EventInfo、A_FileEncoding、A_HotkeyInterval、A_HotkeyModifierTimeout、A_Hour、A_IconFile、A_IconHidden、A_IconNumber、A_IconTip、A_InitialWorkingDir、A_Is64bitOS、A_IsAdmin、A_IsCompiled、A_IsCritical、A_IsPaused、A_IsSuspended、A_KeyDelay、A_KeyDelayPlay、A_KeyDuration、A_KeyDurationPlay、A_Language、A_LastError、A_LineFile、A_LineNumber、A_ListLines、A_MDay、A_MM、A_MMM、A_MMMM、A_MSec、A_MaxHotkeysPerInterval、A_MenuMaskKey、A_Min、A_Mon、A_MouseDelay、A_MouseDelayPlay、A_MyDocuments、A_Now、A_NowUTC、A_OSVersion、A_PriorHotkey、A_PriorKey、A_ProgramFiles、A_Programs、A_ProgramsCommon、A_PtrSize、A_RegView、A_ScreenDPI、A_ScreenHeight、A_ScreenWidth、A_ScriptDir、A_ScriptFullPath、A_ScriptHwnd、A_ScriptName、A_Sec、A_SendLevel、A_SendMode、A_StartMenu、A_StartMenuCommon、A_Startup、A_StartupCommon、A_StoreCapsLockMode、A_Temp、A_ThisHotkey、A_TickCount、A_TimeIdle、A_TimeIdleKeyboard、A_TimeIdleMouse、A_TimeIdlePhysical、A_TimeSincePriorHotkey、A_TimeSinceThisHotkey、A_TitleMatchMode、A_TitleMatchModeSpeed、A_TrayMenu、A_UserName、A_WDay、A_WinDelay、A_WinDir、A_WorkingDir、A_YDay、A_YWeek、A_YYYY、A_Year

（全108名はエンジンの `AHK_BUILTIN_RUNTIME` 集合と機械照合済み。モデルではいずれも値を捏造せず「実行時に決まる値」として扱う。）

### 解決対象に含めないもの（21件、漏れではない）

`AHK_BUILTIN_UNSUPPORTED` の21件は、読み取り時に名前を挙げて未対応で停止する実装であり、報告書でも漏れに数えられていない。scan でも解決対象に含めない：A_LoopField、A_LoopFileName、A_LoopFileExt、A_LoopFileDir、A_LoopFileFullPath、A_LoopFileShortPath、A_LoopFileShortName、A_LoopFileTimeModified、A_LoopFileTimeCreated、A_LoopFileTimeAccessed、A_LoopFileAttrib、A_LoopFileSize、A_LoopFileSizeKB、A_LoopFileSizeMB、A_LoopReadLine、A_LoopRegName、A_LoopRegType、A_LoopRegKey、A_LoopRegSubKey、A_LoopRegTimeModified、A_ThisFunc。

## 裁定の内訳

- 第1層118名 → 新規9項目で全件処置：個別8件（IsSet、IsSetRef、for、break、continue、return、Length、A_Index）＋束ね1件（A_*（組み込み変数）で110件：固定値2件＋実行時に決まる値108件）。
- 第2層1件（Loop の Until 節）→ 既存 Loop 項目の syntax・本文へ追記（変更1件）。
- 新規項目の使用例はすべて参照・実行できる形（A_* は参照形、return はホットキー本体の早期終了形）とし、`node --test tests/audit.test.js` の runnable reference で自種分エラーなしを確認した。
- ahk-r2.json は追加・変更の全10項目分を収録。
