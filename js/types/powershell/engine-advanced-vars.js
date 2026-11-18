/* 高度モード差分（ブロックB3）: PowerShell 自動変数の高度ハンドラ。
 * 登録形式は engine-advanced.js のコメントを参照。一次情報は Microsoft Learn
 * の about_Automatic_Variables（PowerShell 7.4）。
 *
 * 裁定方針（PS-ENG）:
 * - モデルが Windows パス・PowerShell 7.4 Core 相当であることから決定的に
 *   定まるもの（$PSEdition、$IsWindows 等）は値を返す。
 * - 文脈でのみ設定される変数（$Event 等）は、モデルにその文脈（イベント・
 *   リモートセッション）が存在しないため、文脈外の実挙動どおり $null を返す。
 *   $foreach／$switch は、ループ実行中は列挙子オブジェクトをモデルで表現
 *   できないため未検証の未確定値、文脈外では $null を返す。
 * - 実行環境・セッション履歴・カルチャ等に依存するものは値を捏造せず、
 *   未検証の未確定値（H.unknown）を返す。
 * - 関数内で基礎が設定する変数（$input／$MyInvocation／$PSBoundParameters
 *   等）は、利用者代入と同様に基礎側の値が優先される（engine.js の get()）。
 *
 * FIX-PS-B（高度A3監査是正）:
 * - $ConsoleFileName は、モデルに .psc1 読込・Export-Console の経路が存在
 *   しないため、未使用時の確定値である空文字列を返す（格上げ。T2 §3-7）。
 * - $$／$^ は未検証のまま（コーディネーター裁定変更 2026-11-18）、理由文を
 *   「対話行入力がモデルに保持されていない」趣旨へ統一した。裸形のパーサ
 *   受理は FIX-PS-A2 担当であり、本ファイルは宣言側の理由文のみを担う。
 * - $input／$MyInvocation／$PSCmdlet は T2 §4-4 の修正案どおり理由を是正
 *   した（分類は未検証のまま）。
 */
const unk = (name, reason) => (s, H) =>
  H.unknown("未検証：$" + name + " は" + reason, "ps:adv:" + name.toLowerCase());

export const AUTOVARS = {
  /* ---- 未検証（実行環境・セッション状態に依存） ---- */
  $: unk("$", "対話行入力（セッションが受け取った最後の行）がモデルに保持されておらず、最後の行の最後のトークンを確定できないため"),
  "^": unk("^", "対話行入力（セッションが受け取った最後の行）がモデルに保持されておらず、最後の行の最初のトークンを確定できないため"),
  error: unk("Error", "エラー記録のコレクションであり、モデルに保持されていないため確定できません"),
  executioncontext: unk("ExecutionContext", "実行エンジンの内部オブジェクト（EngineIntrinsics）であり、モデル化されていないため確定できません"),
  host: unk("Host", "ホスト情報（UI・色設定等）であり、実行ホストに依存するため確定できません"),
  input: unk("input", "関数内では基礎が設定する入力列が確定します。関数外の値と、列挙子の単回列挙等の意味論はモデルで確定できないため"),
  myinvocation: unk("MyInvocation", "関数内では MyCommand.Name が確定します。その他のフィールドは呼び出し形態（スクリプトパス等）に依存し、モデルでは確定できないため"),
  pid: unk("PID", "プロセスIDであり、実プロセスに依存するため確定できません"),
  profile: unk("PROFILE", "プロファイルのパスであり、実環境（ユーザー・ホスト）に依存するため確定できません"),
  pscmdlet: unk("PSCmdlet", "高度な関数（CmdletBinding）の実行コンテキストでのみ値を取るオブジェクトであり、その文脈はモデル化されていないため確定できません（通常関数内では $null）"),
  psculture: unk("PSCulture", "カルチャであり、実行環境（OSのロケール）に依存するため確定できません"),
  pshome: unk("PSHOME", "PowerShellのインストール先パスであり、実環境に依存するため確定できません"),
  psuiculture: unk("PSUICulture", "UIカルチャであり、実行環境（OSのロケール）に依存するため確定できません"),
  stacktrace: unk("StackTrace", "直近のエラーのスタックトレースであり、モデルに保持されていないため確定できません"),
  /* ---- 決定的な値 ---- */
  consolefilename: () => "",
  psedition: () => "Core",
  iscoreclr: () => true,
  iswindows: () => true,
  islinux: () => false,
  ismacos: () => false,
  nestedpromptlevel: () => 0,
  enabledexperimentalfeatures: () => [],
  psboundparameters: (s, H) => H.hash([]),
  shellid: () => "Microsoft.PowerShell",
  pscommandpath: () => "",
  psscriptroot: () => "",
  psdebugcontext: () => null,
  /* ---- 文脈でのみ設定される変数（モデルに文脈が無いため $null） ---- */
  event: () => null,
  eventargs: () => null,
  eventsubscriber: () => null,
  sender: () => null,
  pssenderinfo: () => null,
  this: () => null,
  foreach: (s, H) =>
    (s.ps?.loops ?? []).some((f) => Array.isArray(f.items))
      ? H.unknown(
          "未検証：$foreach は foreach ループの列挙子であり、モデルでは列挙子オブジェクトを表現できないため確定できません",
          "ps:adv:foreach",
        )
      : null,
  switch: (s, H) =>
    (s.ps?.switches ?? []).length
      ? H.unknown(
          "未検証：$switch は switch ループの列挙子であり、モデルでは列挙子オブジェクトを表現できないため確定できません",
          "ps:adv:switch",
        )
      : null,
};
