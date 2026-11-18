// ADV-B2 AutoHotkey v2 高度差分のテスト。
// (a) カタログ完全性：棚卸し未収録398件＋列挙確定7件（InputHook 4・
//     RegExMatchInfo 3。String 固有メソッドは公式に存在せず0件）が
//     referenceAdvanced に過不足なくあること。
// (b) F-01：実装した全項目の典型・境界・異常・組み合わせ。
// (c) 未対応項目が名前を挙げて正直に停止すること。
import test from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { referenceAdvanced } from "../js/types/autohotkey/reference-advanced.js";
import { advancedState } from "../js/types/autohotkey/semantics-advanced.js";
import { applyAdvancedEngine } from "../js/types/autohotkey/advanced-engine.js";
import { templatesAdvanced } from "../js/types/autohotkey/templates-advanced.js";
import { glossaryAdvanced } from "../js/types/autohotkey/glossary-advanced.js";

const d = getDefinition("autohotkey");
const run = async (code) =>
  d.simulate(code, structuredClone({ ...d.model.defaults, event: null }));
const errOf = (r) => r.error ?? r.paths?.[0]?.error ?? null;
const vars = (r) => r.paths[0].vars;
const outs = (r) => (r.paths[0].outputs || []).map((o) => o.text);

// ---------------------------------------------------------------- (a)
const EXPECTED_NAMES = [
  "Abs", "ACos", "ASin", "ATan", "BlockInput", "Buffer",
  "CallbackCreate", "CallbackFree", "CaretGetPos", "Catch", "Ceil", "Chr",
  "ClipboardAll", "ClipWait", "ComCall", "ComObjActive", "ComObjArray", "ComObjConnect",
  "ComObject", "ComObjFlags", "ComObjFromPtr", "ComObjGet", "ComObjQuery", "ComObjType",
  "ComObjValue", "ComValue", "ControlAddItem", "ControlChooseIndex", "ControlChooseString", "ControlClick",
  "ControlDeleteItem", "ControlFindItem", "ControlFocus", "ControlGetChecked", "ControlGetChoice", "ControlGetClassNN",
  "ControlGetEnabled", "ControlGetExStyle", "ControlGetFocus", "ControlGetHwnd", "ControlGetIndex", "ControlGetItems",
  "ControlGetPos", "ControlGetStyle", "ControlGetText", "ControlGetVisible", "ControlHide", "ControlHideDropDown",
  "ControlMove", "ControlSend", "ControlSendText", "ControlSetChecked", "ControlSetEnabled", "ControlSetExStyle",
  "ControlSetStyle", "ControlSetText", "ControlShow", "ControlShowDropDown", "CoordMode", "Cos",
  "Critical", "DateAdd", "DateDiff", "DetectHiddenText", "DetectHiddenWindows", "DirCopy",
  "DirCreate", "DirDelete", "DirExist", "DirMove", "DirSelect", "DllCall",
  "Download", "DriveEject", "DriveGetCapacity", "DriveGetFileSystem", "DriveGetLabel", "DriveGetList",
  "DriveGetSerial", "DriveGetSpaceFree", "DriveGetStatus", "DriveGetStatusCD", "DriveGetType", "DriveLock",
  "DriveRetract", "DriveSetLabel", "DriveUnlock", "Edit", "EditGetCurrentCol", "EditGetCurrentLine",
  "EditGetLine", "EditGetLineCount", "EditGetSelectedText", "EditPaste", "Else", "EnvGet",
  "EnvSet", "Exit", "ExitApp", "Exp", "FileAppend", "FileCopy",
  "FileCreateShortcut", "FileDelete", "FileEncoding", "FileExist", "FileGetAttrib", "FileGetShortcut",
  "FileGetSize", "FileGetTime", "FileGetVersion", "FileInstall", "FileMove", "FileOpen",
  "FileRead", "FileRecycle", "FileRecycleEmpty", "FileSelect", "FileSetAttrib", "FileSetTime",
  "Finally", "Float", "Floor", "Format", "FormatTime", "GetKeyName",
  "GetKeySC", "GetKeyState", "GetKeyVK", "GetMethod", "Goto", "GroupActivate",
  "GroupAdd", "GroupClose", "GroupDeactivate", "Gui", "GuiCtrlFromHwnd", "GuiFromHwnd",
  "HasBase", "HasMethod", "HasProp", "HotIf", "IL_Add", "IL_Create",
  "IL_Destroy", "ImageSearch", "IniDelete", "IniRead", "IniWrite", "InputHook",
  "InstallKeybdHook", "InstallMouseHook", "InStr", "Integer", "IsLabel", "IsObject",
  "KeyHistory", "KeyWait", "ListHotkeys", "ListLines", "ListVars", "ListViewGetContent",
  "Ln", "LoadPicture", "Log", "Loop Files", "Loop Parse", "Loop Read",
  "Loop Reg", "LTrim", "Map", "Max", "Menu", "MenuBar",
  "MenuFromHandle", "MenuSelect", "Min", "Mod", "MonitorGet", "MonitorGetCount",
  "MonitorGetName", "MonitorGetPrimary", "MonitorGetWorkArea", "MouseClick", "MouseClickDrag", "MouseGetPos",
  "Number", "NumGet", "NumPut", "ObjAddRef", "ObjBindMethod", "ObjFromPtr",
  "ObjFromPtrAddRef", "ObjGetBase", "ObjGetCapacity", "ObjHasOwnProp", "ObjOwnPropCount", "ObjOwnProps",
  "ObjPtr", "ObjPtrAddRef", "ObjRelease", "ObjSetBase", "ObjSetCapacity", "OnClipboardChange",
  "OnError", "OnExit", "OnMessage", "Ord", "OutputDebug", "Pause",
  "Persistent", "PixelGetColor", "PixelSearch", "PostMessage", "ProcessClose", "ProcessExist",
  "ProcessGetName", "ProcessGetParent", "ProcessGetPath", "ProcessSetPriority", "ProcessWait", "ProcessWaitClose",
  "Random", "RegCreateKey", "RegDelete", "RegDeleteKey", "RegExMatch", "RegExReplace",
  "RegRead", "RegWrite", "Reload", "Round", "RTrim", "Run",
  "RunAs", "RunWait", "SendEvent", "SendInput", "SendLevel", "SendMessage",
  "SendMode", "SendPlay", "SetCapsLockState", "SetControlDelay", "SetDefaultMouseSpeed", "SetKeyDelay",
  "SetMouseDelay", "SetNumLockState", "SetRegView", "SetScrollLockState", "SetStoreCapsLockMode", "SetTimer",
  "SetWinDelay", "SetWorkingDir", "Shutdown", "Sin", "Sort", "SoundBeep",
  "SoundGetInterface", "SoundGetMute", "SoundGetName", "SoundGetVolume", "SoundPlay", "SoundSetMute",
  "SoundSetVolume", "SplitPath", "Sqrt", "StatusBarGetText", "StatusBarWait", "StrCompare",
  "StrGet", "String", "StrLen", "StrLower", "StrPtr", "StrPut",
  "StrReplace", "StrSplit", "StrTitle", "StrUpper", "SubStr", "Suspend",
  "Switch", "SysGet", "SysGetIPAddresses", "Tan", "Thread", "Throw",
  "ToolTip", "TraySetIcon", "TrayTip", "Trim", "Try", "Type",
  "Until", "VarSetStrCapacity", "VerCompare", "WinActivateBottom", "WinGetClass", "WinGetClientPos",
  "WinGetControls", "WinGetControlsHwnd", "WinGetCount", "WinGetExStyle", "WinGetID", "WinGetIDLast",
  "WinGetList", "WinGetMinMax", "WinGetPID", "WinGetPos", "WinGetProcessName", "WinGetProcessPath",
  "WinGetStyle", "WinGetText", "WinGetTitle", "WinGetTransColor", "WinGetTransparent", "WinHide",
  "WinKill", "WinMaximize", "WinMinimize", "WinMinimizeAll", "WinMinimizeAllUndo", "WinMove",
  "WinMoveBottom", "WinMoveTop", "WinRedraw", "WinRestore", "WinSetAlwaysOnTop", "WinSetEnabled",
  "WinSetExStyle", "WinSetRegion", "WinSetStyle", "WinSetTitle", "WinSetTransColor", "WinSetTransparent",
  "WinShow", "WinWait", "WinWaitActive", "WinWaitClose", "WinWaitNotActive", "Array.Call",
  "Array.Clone", "Array.Delete", "Array.Get", "Array.Has", "Array.InsertAt", "Array.Pop",
  "Array.Push", "Array.RemoveAt", "Array.__New", "Array.__Enum", "Map.Call", "Map.Clear",
  "Map.Clone", "Map.Delete", "Map.Get", "Map.Has", "Map.Set", "Map.__Enum",
  "Map.__New", "Object.Clone", "Object.DefineProp", "Object.DeleteProp", "Object.GetOwnPropDesc", "Object.HasOwnProp",
  "Object.OwnProps", "Buffer.Call", "Buffer.__New", "File.Read", "File.Write", "File.ReadLine",
  "File.WriteLine", "File.ReadNumType", "File.WriteNumType", "File.RawRead", "File.RawWrite", "File.Seek",
  "File.Close", "Func.Call", "Func.Bind", "Func.IsByRef", "Func.IsOptional", "Menu.Call",
  "Menu.Add", "Menu.AddStandard", "Menu.Check", "Menu.Delete", "Menu.Disable", "Menu.Enable",
  "Menu.Insert", "Menu.Rename", "Menu.SetColor", "Menu.SetIcon", "Menu.Show", "Menu.ToggleCheck",
  "Menu.ToggleEnable", "Menu.Uncheck", "InputHook.KeyOpt", "InputHook.Start", "InputHook.Stop", "InputHook.Wait",
  "RegExMatchInfo.Pos", "RegExMatchInfo.Len", "RegExMatchInfo.Name",
];

test("adv-b2 catalog: 405件が過不足なく収載されている", () => {
  const names = referenceAdvanced.map((e) => e.name);
  assert.equal(names.length, 405);
  assert.equal(new Set(names).size, 405, "重複がある");
  assert.deepEqual([...names].sort(), [...EXPECTED_NAMES].sort());
});

test("adv-b2 catalog: 項目の形・status・source（supported は併記しない）", () => {
  for (const e of referenceAdvanced) {
    for (const k of ["name", "category", "syntax", "description", "example", "caution", "returns", "source"])
      assert.equal(typeof e[k], "string", `${e.name}.${k} は文字列`);
    assert.ok(["supported", "unsupported", "unverified"].includes(e.status), e.name);
    // 契約 3.2：高度項目は status のみで状態を表し、supported は持たない。
    assert.ok(!("supported" in e), e.name);
    assert.ok(e.source.startsWith("https://www.autohotkey.com/docs/v2/"), `${e.name}: ${e.source}`);
    if (e.status === "unsupported")
      assert.ok(e.caution.includes("未対応"), `${e.name} の caution に理由（未対応）が必要`);
  }
  const sup = referenceAdvanced.filter((e) => e.status === "supported");
  assert.equal(sup.length, 98, "supported は98件");
  assert.equal(referenceAdvanced.filter((e) => e.status === "unsupported").length, 307);
  assert.equal(referenceAdvanced.filter((e) => e.status === "unverified").length, 0);
});

test("adv-b2 catalog: メソッド項目は「型名.メソッド名」の綴りで収載", () => {
  for (const n of ["Array.Push", "Map.Get", "Object.DefineProp", "Buffer.Call", "RegExMatchInfo.Pos", "InputHook.Start"])
    assert.ok(referenceAdvanced.some((e) => e.name === n), n);
});

// -------------------------------------------------- ゲーティング（合成分離）
// 本テストはファイル内で最初に simulate を使うテストとして宣言する
// （node:test のトップレベルテストは宣言順に逐次実行される）。未適用
// （既定・無効）状態の確認を先に行い、その後フック経由で有効化する。
// 以後の (b)〜(c) は有効化済みの状態で実行される。
test("adv-b2 gating: 未適用では基礎どおり停止し、applyAdvancedEngine 適用後に高度構文・関数が動く", async () => {
  assert.equal(advancedState.enabled, false, "既定は無効でなければならない");
  // 高度関数は基礎どおり名前を挙げて未対応として停止する。
  let r = await run('x := StrLen("abc")');
  assert.equal(errOf(r)?.message, "このAutoHotkey関数は未対応です：StrLen");
  // 高度構文は prescan が基礎どおり構文名を挙げて停止する。
  r = await run("try {\n x := 1\n} catch {\n x := 2\n}");
  assert.match(errOf(r)?.message ?? "", /Try／Catch/);
  r = await run('Loop Parse "a,b", "," {\n}');
  assert.match(errOf(r)?.message ?? "", /Loop Parse/);
  r = await run("x := 1\nswitch x {\n case 1:\n  y := 2\n}");
  assert.match(errOf(r)?.message ?? "", /Switch/);
  // フック経由で有効化する（フラグの直接操作はしない）。
  applyAdvancedEngine(d, null);
  assert.equal(advancedState.enabled, true);
  r = await run('x := StrLen("abc")');
  assert.equal(errOf(r), null);
  assert.equal(vars(r).x, 3);
});

// ---------------------------------------------------------------- (b) 数学
test("adv-b2 math: 典型・境界・異常", async () => {
  let r = await run("a := Abs(-5)\nb := Ceil(1.2)\nc := Floor(1.8)\ne := Exp(0)");
  assert.equal(errOf(r), null);
  // Float 入力の結果は Float として保持され、スナップショットでは "2.0" の形で見える。
  assert.deepEqual([vars(r).a, vars(r).b, vars(r).c, vars(r).e], [5, "2.0", "1.0", 1]);
  r = await run("x := Sqrt(9)\ny := Log(100)\nz := Ln(1)");
  assert.equal(vars(r).x, 3);
  assert.equal(vars(r).y, 2);
  assert.equal(vars(r).z, 0);
  r = await run("x := Mod(-5, 3)"); // 符号は除数に一致 → 1
  assert.equal(vars(r).x, 1);
  // A2監査 F4：Round の戻り値の型は桁数で決まる（省略・0・負→Integer、
  // 正→Float）。従来の期待値 "3.0" は入力 Float に引きずられた誤り。
  r = await run("x := Round(2.5)\ny := Round(3.14159, 2)\nz := Round(1234, -2)");
  assert.deepEqual([vars(r).x, vars(r).y, vars(r).z], [3, "3.14", 1200]);
  r = await run("x := Max(3, 7, 5)\ny := Min([4, 2, 9])\nz := Max()");
  assert.deepEqual([vars(r).x, vars(r).y, vars(r).z], [7, 2, ""]);
  r = await run("x := Sqrt(-1)");
  assert.match(errOf(r).message, /定義域/);
  r = await run("x := ACos(2)");
  assert.equal(errOf(r).category, "ValueError");
  r = await run("x := Mod(1, 0)");
  assert.equal(errOf(r).category, "ZeroDivisionError");
  r = await run("x := Random(1, 6)"); // 未確定の値になる
  assert.equal(errOf(r), null);
  assert.equal(typeof vars(r).x, "object");
});

test("adv-b2 型変換: Integer/Float/Number/String/Type", async () => {
  let r = await run('a := Integer("0x1F")\nb := Float("2.5")\nc := Number("42")\ne := Number("4.5")');
  // Float はスナップショットで "2.5" の形で見える（基礎モデルの表示規約）。
  assert.deepEqual([vars(r).a, vars(r).b, vars(r).c, vars(r).e], [31, "2.5", 42, "4.5"]);
  r = await run('s := String(42)\nt := Type(42)\nu := Type("x")\nv := Type([1])');
  assert.deepEqual([vars(r).s, vars(r).t, vars(r).u, vars(r).v], ["42", "Integer", "String", "Array"]);
  r = await run('x := Integer("abc")');
  assert.equal(errOf(r).category, "TypeError");
});

// ---------------------------------------------------------------- (b) 文字列
test("adv-b2 string: 典型", async () => {
  let r = await run('a := StrLen("abc")\nb := Chr(65)\nc := Ord("A")\ne := StrLower("AbC")\nf := StrUpper("aBc")\ng := StrTitle("hello world")');
  assert.deepEqual([vars(r).a, vars(r).b, vars(r).c, vars(r).e, vars(r).f, vars(r).g],
    [3, "A", 65, "abc", "ABC", "Hello World"]);
  r = await run('a := Trim("  x  ")\nb := LTrim("  x  ")\nc := RTrim("  x  ")\ne := Trim("xxhixx", "x")');
  assert.deepEqual([vars(r).a, vars(r).b, vars(r).c, vars(r).e], ["x", "x  ", "  x", "hi"]);
  r = await run('a := SubStr("abcdef", 2, 3)\nb := SubStr("abcdef", -2)\nc := SubStr("abcdef", 2, -1)');
  assert.deepEqual([vars(r).a, vars(r).b, vars(r).c], ["bcd", "ef", "bcde"]);
  r = await run('a := InStr("abcabc", "bc")\nb := InStr("abc", "z")\nc := InStr("aBc", "bc", "On")');
  assert.deepEqual([vars(r).a, vars(r).b, vars(r).c], [2, 0, 0]);
  r = await run('a := StrReplace("aaa", "a", "b")\nb := StrReplace("aaa", "a", "b", , &n, 2)');
  assert.equal(vars(r).a, "bbb");
  assert.equal(vars(r).b, "bba");
  assert.equal(vars(r).n, 2);
  r = await run('a := StrSplit("a,b,c", ",")\nb := a.Length\nc := a[3]\ne := StrSplit("a1b2c", "12")');
  assert.equal(vars(r).b, 3);
  assert.equal(vars(r).c, "c");
  assert.deepEqual(vars(r).e, ["a", "b", "c"]);
  r = await run('a := StrCompare("a", "b")\nb := StrCompare("B", "a", "Off")\nc := VerCompare("1.10", "1.9")\ne := VerCompare("2.0", "2.0")');
  assert.deepEqual([vars(r).a, vars(r).b, vars(r).c, vars(r).e], [-1, 1, 1, 0]);
});

test("adv-b2 string: 境界・異常", async () => {
  let r = await run('a := SubStr("abc", 10)\nb := StrLen("")\nc := InStr("", "a")');
  assert.deepEqual([vars(r).a, vars(r).b, vars(r).c], ["", 0, 0]);
  r = await run("x := Trim(5)"); // 数値は公式に未対応
  assert.match(errOf(r).message, /数値は使えません/);
  r = await run('x := Chr(0x110000)');
  assert.equal(errOf(r).category, "ValueError");
});

test("adv-b2 Sort: オプションの組み合わせ", async () => {
  let r = await run('a := Sort("b`na`nc")\nb := Sort("10`n2`n1", "N")\nc := Sort("b`nA`na", "C")\ne := Sort("a`nb`na", "U")\nf := Sort("a,b,c", "D, R")');
  assert.equal(vars(r).a, "a\nb\nc");
  assert.equal(vars(r).b, "1\n2\n10");
  assert.equal(vars(r).c, "A\na\nb");
  assert.equal(vars(r).e, "a\nb");
  assert.equal(vars(r).f, "c,b,a");
});

test("adv-b2 Format: 書式指定", async () => {
  let r = await run('a := Format("{:05d}", 42)\nb := Format("{}-{}", "x", 3)\nc := Format("{2} {1}", "a", "b")\ne := Format("{:x}", 255)\nf := Format("{:.2f}", 3.14159)\ng := Format("{:s}", "str")');
  assert.deepEqual([vars(r).a, vars(r).b, vars(r).c, vars(r).e, vars(r).f, vars(r).g],
    ["00042", "x-3", "b a", "ff", "3.14", "str"]);
  r = await run('x := Format("{:q}", 1)');
  assert.match(errOf(r).message, /未対応/);
});

test("adv-b2 SplitPath: &書き戻し", async () => {
  const r = await run('SplitPath("C:\\dir\\sub\\file.txt", &name, &dir, &ext, &nameNoExt, &drive)\nSplitPath("https://example.com/a/b.png", &n2)');
  assert.equal(errOf(r), null);
  assert.equal(vars(r).name, "file.txt");
  assert.equal(vars(r).dir, "C:\\dir\\sub");
  assert.equal(vars(r).ext, "txt");
  assert.equal(vars(r).nameNoExt, "file");
  assert.equal(vars(r).drive, "C:");
  assert.equal(vars(r).n2, "b.png");
});

// ---------------------------------------------------------------- (b) 日時
test("adv-b2 date: DateAdd/DateDiff/FormatTime", async () => {
  let r = await run('a := DateAdd("20240101000000", 1, "Days")\nb := DateAdd("20240101000000", -36, "Hours")\nc := DateDiff("20240103000000", "20240101000000", "Days")\ne := DateDiff("20240101120000", "20240101000000", "Minutes")');
  assert.equal(vars(r).a, "20240102000000");
  assert.equal(vars(r).b, "20231230120000");
  assert.equal(vars(r).c, 2);
  assert.equal(vars(r).e, 720);
  r = await run('a := FormatTime("20240102030405", "yyyy-MM-dd HH:mm:ss")\nb := FormatTime("20240107", "WDay")\nc := FormatTime("20240101", "YDay")');
  assert.equal(vars(r).a, "2024-01-02 03:04:05");
  assert.equal(vars(r).b, "1"); // 2024-01-07 は日曜
  assert.equal(vars(r).c, "1");
  r = await run('x := DateAdd("15000101000000", 1, "Days")');
  assert.equal(errOf(r).category, "ValueError");
  r = await run('x := DateDiff("20240101000000", "20240102000000", "Weeks")');
  assert.equal(errOf(r).category, "ValueError");
});

// ---------------------------------------------------------------- (b) 正規表現
test("adv-b2 regex: RegExMatch と マッチオブジェクト", async () => {
  let r = await run('p := RegExMatch("abc123def", "\\d+")');
  assert.equal(vars(r).p, 4);
  r = await run([
    'pos := RegExMatch("abc123def", "(?P<digits>\\d+)", &m)',
    "whole := m[0]",
    'g := m["digits"]',
    "p1 := m.Pos(1)",
    "l1 := m.Len(1)",
    "n1 := m.Name(1)",
    "cnt := m.Count",
  ].join("\n"));
  assert.equal(errOf(r), null);
  assert.deepEqual(
    [vars(r).pos, vars(r).whole, vars(r).g, vars(r).p1, vars(r).l1, vars(r).n1, vars(r).cnt],
    [4, "123", "123", 4, 3, "digits", 1]);
  r = await run('p := RegExMatch("abc", "\\d+", &m)\ne := m = ""');
  assert.equal(vars(r).p, 0);
  assert.equal(vars(r).e, 1); // 不一致では &変数 は空になる
  r = await run('p := RegExMatch("a1b2", "\\d", , -1)');
  assert.equal(vars(r).p, 4); // 負の開始位置は右から数える
});

test("adv-b2 regex: RegExReplace", async () => {
  let r = await run('a := RegExReplace("abc123", "\\d+", "#")\nb := RegExReplace("a1b2c3", "\\d", "[$0]", &n)\nc := RegExReplace("2024-01", "(\\d+)-(\\d+)", "$2/$1")');
  assert.equal(vars(r).a, "abc#");
  assert.equal(vars(r).b, "a[1]b[2]c[3]");
  assert.equal(vars(r).n, 3);
  assert.equal(vars(r).c, "01/2024");
  r = await run('x := RegExReplace("aaa", "a", "b", , 2)');
  assert.equal(vars(r).x, "bba");
});

// ---------------------------------------------------------------- (b) 配列・Map・Object
test("adv-b2 Array メソッド: 典型・境界・異常", async () => {
  let r = await run("a := [3, 1]\na.Push(5, 6)\np := a.Pop()\nl := a.Length");
  assert.deepEqual([vars(r).p, vars(r).l], [6, 3]);
  r = await run('a := [1, 3]\na.InsertAt(2, 2)\na.InsertAt(0, 4)\nx := a[1] . a[2] . a[3] . a[4]');
  assert.equal(vars(r).x, "1234");
  r = await run("a := [1, 2, 3, 4]\nv := a.RemoveAt(2)\nb := a.Length\nc := a[2]");
  assert.deepEqual([vars(r).v, vars(r).b, vars(r).c], [2, 3, 3]);
  r = await run("a := [1, 2, 3]\nv := a.Delete(2)\nh := a.Has(2)\ng := a.Get(2, \"none\")\nl := a.Length");
  assert.deepEqual([vars(r).v, vars(r).h, vars(r).g, vars(r).l], [2, 0, "none", 3]);
  r = await run("a := [1]\nb := a.Clone()\nb.Push(2)\nx := a.Length");
  assert.equal(vars(r).x, 1); // Clone は独立
  r = await run("a := []\nx := a.Pop()");
  assert.equal(errOf(r).category, "Error");
  r = await run("a := [1]\nx := a.Get(5)");
  assert.equal(errOf(r).category, "IndexError");
  r = await run("a := [1]\nx := a.Delete(5)");
  assert.equal(errOf(r).category, "ValueError");
  r = await run("a := Array(7, 8)\nx := a[1] + a[2]");
  assert.equal(vars(r).x, 15);
});

test("adv-b2 Map メソッド: 典型・境界・異常", async () => {
  let r = await run('m := Map("a", 1)\nm.Set("b", 2)\nx := m.Get("a")\ny := m.Has("b")\nz := m.Count');
  assert.deepEqual([vars(r).x, vars(r).y, vars(r).z], [1, 1, 2]);
  r = await run('m := Map()\nx := m.Get("missing", "def")');
  assert.equal(vars(r).x, "def");
  r = await run('m := Map()\nx := m.Get("missing")');
  assert.equal(errOf(r).category, "UnsetItemError");
  r = await run('m := Map("a", 1)\nv := m.Delete("a")\nx := m.Has("a")');
  assert.deepEqual([vars(r).v, vars(r).x], [1, 0]);
  r = await run('m := Map("a", 1)\nm.Delete("zzz")');
  assert.equal(errOf(r).category, "UnsetItemError");
  r = await run('m := Map("Key", 1)\nx := m.Has("key")'); // 既定は大小区別あり
  assert.equal(vars(r).x, 0);
  r = await run("m := Map(1, \"int\")\nx := m.Has(1.0)"); // IntegerキーとFloatキーは別
  assert.equal(vars(r).x, 0);
  r = await run('m := Map("a", 1)\nn := m.Clone()\nn.Set("b", 2)\nx := m.Has("b")');
  assert.equal(vars(r).x, 0);
  r = await run('m := Map("a", 1, "b")');
  assert.equal(errOf(r).category, "TypeError");
  r = await run('m := Map()\nm["a"] := 5\nx := m["a"]\ny := m.Get("a")\nz := m.Count');
  assert.deepEqual([vars(r).x, vars(r).y, vars(r).z], [5, 5, 1]); // 添字とメソッドは同じ組を見る
  r = await run('m := Map("a", 1)\nx := m["zzz"]');
  assert.equal(errOf(r).category, "UnsetItemError");
});

test("adv-b2 Object 関数とメソッド", async () => {
  let r = await run('o := {x: 1}\na := ObjHasOwnProp(o, "x")\nb := ObjOwnPropCount(o)\nc := HasProp(o, "x")\ne := HasMethod([1], "Push")\nf := IsObject(o)\ng := HasBase(o)');
  assert.deepEqual([vars(r).a, vars(r).b, vars(r).c, vars(r).e, vars(r).f, vars(r).g],
    [1, 1, 1, 1, 1, 1]);
  r = await run('o := {x: 1}\no.DefineProp("y", {Value: 9})\nv := o.y\nd := o.GetOwnPropDesc("x")\nw := d.Value');
  assert.equal(vars(r).v, 9);
  assert.equal(vars(r).w, 1);
  r = await run('o := {x: 5}\nv := o.DeleteProp("x")\nh := o.HasOwnProp("x")');
  assert.deepEqual([vars(r).v, vars(r).h], [5, 0]);
  r = await run('o := {}\nx := o.GetOwnPropDesc("zzz")');
  assert.equal(errOf(r).category, "PropertyError");
  r = await run('b := IsLabel("nowhere")');
  assert.equal(vars(r).b, 0);
});

// ---------------------------------------------------------------- (b) メモリ
test("adv-b2 Buffer/NumGet/NumPut/StrPut/StrGet", async () => {
  let r = await run('buf := Buffer(8)\nNumPut("Int", 305419896, buf)\nv := NumGet(buf, 0, "Int")\ns := buf.Size');
  assert.equal(vars(r).v, 305419896);
  assert.equal(vars(r).s, 8);
  r = await run('buf := Buffer(16)\nNumPut("Short", -2, "Int64", 5000000000, buf)\na := NumGet(buf, 0, "Short")\nb := NumGet(buf, 2, "Int64")');
  assert.deepEqual([vars(r).a, vars(r).b], [-2, 5000000000]);
  r = await run('buf := Buffer(16)\nn := StrPut("abc", buf, , "UTF-8")\ns := StrGet(buf, , "UTF-8")');
  assert.equal(vars(r).n, 4); // 終端文字を含む
  assert.equal(vars(r).s, "abc");
  r = await run('n := StrPut("abc", "UTF-8")'); // サイズ問い合わせ
  assert.equal(vars(r).n, 4);
  r = await run('buf := Buffer(8)\nv := NumGet(buf, 0, "Double")');
  assert.equal(vars(r).v, "0.0"); // Double は Float として返る
  r = await run('buf := Buffer(4)\nv := NumGet(buf, 0, "Double")'); // 範囲外はエラー
  assert.match(errOf(r).message, /外です/);
  r = await run('v := NumGet(12345, 0, "Int")'); // 実アドレスは未対応
  assert.match(errOf(r).message, /未対応/);
  r = await run("p := StrPtr(\"abc\")\nt := Type(p)");
  assert.equal(errOf(r), null); // 未確定の値として返る
});

// ---------------------------------------------------------------- (b) 制御文
test("adv-b2 Try/Catch/Finally/Throw", async () => {
  let r = await run([
    "Try {",
    '  Throw Error("boom")',
    "} Catch Error as e {",
    "  msg := e.Message",
    "} Finally {",
    '  fin := "yes"',
    "}",
  ].join("\n"));
  assert.equal(errOf(r), null);
  assert.equal(vars(r).msg, "boom");
  assert.equal(vars(r).fin, "yes");
  r = await run([ // クラスで絞る：ValueError は TypeError の Catch に入らない
    "Try {",
    '  Throw ValueError("v")',
    "} Catch TypeError {",
    '  hit := "type"',
    "} Catch ValueError as e {",
    '  hit := "value:" . e.Message',
    "}",
  ].join("\n"));
  assert.equal(vars(r).hit, "value:v");
  r = await run([ // 演算エラーも Catch できる
    "Try {",
    "  x := 1 / 0",
    "} Catch Error as e {",
    '  hit := "caught"',
    "}",
  ].join("\n"));
  assert.equal(vars(r).hit, "caught");
  r = await run([ // Catch の中の引数なし Throw は再スロー
    "Try {",
    "  Try {",
    '    Throw Error("inner")',
    "  } Catch Error {",
    "    Throw",
    "  }",
    "} Catch Error as e {",
    "  msg := e.Message",
    "}",
  ].join("\n"));
  assert.equal(vars(r).msg, "inner");
  r = await run('Throw Error("uncaught")'); // 受けなければエラーとして停止
  assert.equal(errOf(r).message, "uncaught");
  r = await run([ // Finally はエラー時も実行される
    "Try {",
    '  Throw Error("x")',
    "} Finally {",
    '  fin := "ran"',
    "}",
  ].join("\n"));
  assert.equal(vars(r).fin, "ran");
  assert.equal(errOf(r).message, "x");
});

test("adv-b2 Try/Catch Else: 例外がなければ Else が実行される（公式 Else.htm：Try で例外が投げられなかった場合）", async () => {
  let r = await run([ // } Else { 形式（Catch の後）
    "Try {",
    "  x := 1",
    "} Catch {",
    "  c := 1",
    "} Else {",
    "  e := 1",
    "}",
  ].join("\n"));
  assert.equal(errOf(r), null);
  assert.equal(vars(r).x, 1);
  assert.equal(vars(r).e, 1);
  assert.equal(vars(r).c, undefined);
  r = await run([ // Else が独立行に来る形式
    "Try {",
    "  x := 1",
    "} Catch {",
    "  c := 1",
    "}",
    "Else {",
    "  e := 1",
    "}",
  ].join("\n"));
  assert.equal(errOf(r), null);
  assert.equal(vars(r).e, 1);
  r = await run([ // Catch なしで Try の直後に Else
    "Try {",
    "  x := 1",
    "} Else {",
    "  e := 1",
    "}",
  ].join("\n"));
  assert.equal(errOf(r), null);
  assert.equal(vars(r).e, 1);
  r = await run([ // Else の後に Finally：例外なしでは両方実行される
    "Try {",
    "  x := 1",
    "} Catch {",
    "  c := 1",
    "} Else {",
    "  e := 1",
    "} Finally {",
    "  f := 1",
    "}",
  ].join("\n"));
  assert.equal(errOf(r), null);
  assert.deepEqual([vars(r).e, vars(r).f], [1, 1]);
});

test("adv-b2 Try/Catch Else: Catch が発動した場合は Else は実行されない", async () => {
  let r = await run([
    "Try {",
    '  Throw Error("boom")',
    "} Catch Error as ex {",
    "  c := ex.Message",
    "} Else {",
    "  e := 1",
    "} Finally {",
    "  f := 1",
    "}",
  ].join("\n"));
  assert.equal(errOf(r), null);
  assert.equal(vars(r).c, "boom");
  assert.equal(vars(r).e, undefined);
  assert.equal(vars(r).f, 1); // Finally は実行される
  r = await run([ // 演算エラーで Catch が発動した場合も同じ
    "Try {",
    "  x := 1 / 0",
    "} Catch Error {",
    "  c := 1",
    "} Else {",
    "  e := 1",
    "}",
  ].join("\n"));
  assert.equal(vars(r).c, 1);
  assert.equal(vars(r).e, undefined);
});

test("adv-b2 Try/Catch Else: 例外が Catch で受けられず伝播する場合は Else は実行されず、Finally の後で伝播する（公式 v2 変更点：一致する Catch がなくても投げられれば Else は実行されない）", async () => {
  let r = await run([
    "Try {",
    '  Throw ValueError("v")',
    "} Catch TypeError {",
    "  c := 1",
    "} Else {",
    "  e := 1",
    "} Finally {",
    "  f := 1",
    "}",
  ].join("\n"));
  assert.equal(errOf(r)?.message, "v"); // 例外はそのまま伝播する
  assert.equal(vars(r).c, undefined);
  assert.equal(vars(r).e, undefined); // Else は実行されない
  assert.equal(vars(r).f, 1); // Finally だけが実行される
  r = await run([ // Catch 自体がない形でも、投げられれば Else は実行されない
    "Try {",
    '  Throw "oops"',
    "} Else {",
    "  e := 1",
    "}",
  ].join("\n"));
  assert.equal(errOf(r)?.message, "oops");
  assert.equal(vars(r).e, undefined);
});

test("adv-b2 Try/Catch Else: ブロック形式でない Try/Catch Else は Else 節を名指して停止し、If の Else は従来どおり動く", async () => {
  let r = await run([ // ブロック形式でない Else は「対応する if のない else」と誤らない
    "Try {",
    "  x := 1",
    "} Catch {",
    "  c := 1",
    "} Else",
    "  e := 1",
  ].join("\n"));
  assert.ok(errOf(r));
  assert.match(errOf(r).message, /Try／Catch の Else 節/);
  assert.ok(!/対応する if のない else/.test(errOf(r).message));
  r = await run([ // Try の内側・Catch の内側にある If の Else は Try の Else と取り違えない
    "Try {",
    "  if 0 {",
    "    a := 1",
    "  } else {",
    "    a := 2",
    "  }",
    "} Catch {",
    "  c := 1",
    "} Else {",
    "  e := 1",
    "}",
  ].join("\n"));
  assert.equal(errOf(r), null);
  assert.equal(vars(r).a, 2); // If の Else が実行された
  assert.equal(vars(r).e, 1); // Try の Else も実行された
  r = await run([
    "Try {",
    '  Throw Error("x")',
    "} Catch {",
    "  if 1 {",
    "    a := 1",
    "  } else {",
    "    a := 2",
    "  }",
    "} Else {",
    "  e := 1",
    "}",
  ].join("\n"));
  assert.equal(vars(r).a, 1);
  assert.equal(vars(r).e, undefined);
});

test("adv-b2 Switch: 一致・Default・大小区別・フォールスルーなし", async () => {
  const code = (v) => [
    `x := ${v}`,
    "Switch x {",
    "Case 1:",
    '  r := "one"',
    "Case 2, 3:",
    '  r := "two-three"',
    "Default:",
    '  r := "other"',
    "}",
  ].join("\n");
  assert.equal(vars(await run(code(1))).r, "one");
  assert.equal(vars(await run(code(3))).r, "two-three");
  assert.equal(vars(await run(code(9))).r, "other");
  let r = await run([ // 文字列は既定で大小区別あり
    'Switch "a" {',
    'Case "A":',
    '  r := "upper"',
    "Default:",
    '  r := "other"',
    "}",
  ].join("\n"));
  assert.equal(vars(r).r, "other");
  r = await run([ // CaseSense "Off" で区別なし
    'Switch "a", "Off" {',
    'Case "A":',
    '  r := "upper"',
    "Default:",
    '  r := "other"',
    "}",
  ].join("\n"));
  assert.equal(vars(r).r, "upper");
  r = await run([ // 値なし Switch は真になる Case を実行
    "Switch {",
    "Case 1 > 2:",
    '  r := "no"',
    "Case 2 > 1:",
    '  r := "yes"',
    "}",
  ].join("\n"));
  assert.equal(vars(r).r, "yes");
  r = await run(['x := 2', "Switch x {", 'Case 2: r := "same-line"', "}"].join("\n"));
  assert.equal(vars(r).r, "same-line"); // Case と同じ行の文
});

test("adv-b2 Loop Parse: 区切り・CSV・A_LoopField", async () => {
  let r = await run('out := ""\nLoop Parse, "a,b,c", "," {\n  out .= A_LoopField\n}');
  assert.equal(vars(r).out, "abc");
  r = await run('out := ""\nLoop Parse, "a,,b", "," {\n  out .= "[" . A_LoopField . "]"\n}');
  assert.equal(vars(r).out, "[a][][b]"); // 連続区切りは空の部分
  r = await run('out := ""\nLoop Parse, "ab" {\n  out .= A_LoopField . "-"\n}');
  assert.equal(vars(r).out, "a-b-"); // 区切り省略で1文字ずつ
  r = await run('out := ""\nLoop Parse, "a,`"b,c`"", "CSV" {\n  out .= A_LoopField . "|"\n}');
  assert.equal(vars(r).out, "a|b,c|");
  r = await run('cnt := 0\nLoop Parse, "", "," {\n  cnt += 1\n}');
  assert.equal(vars(r).cnt, 0); // 空文字列は0回
  r = await run('out := ""\nLoop Parse, "x;y;z", ";" {\n  if A_LoopField = "y"\n    break\n  out .= A_LoopField\n}');
  assert.equal(vars(r).out, "x"); // break が効く
});

test("adv-b2 Exit と OutputDebug", async () => {
  let r = await run('x := 1\nExit\ny := 2');
  assert.equal(vars(r).x, 1);
  assert.equal(vars(r).y, undefined);
  r = await run('OutputDebug "hello"');
  assert.ok(outs(r).includes("hello"));
});

// ---------------------------------------------------------------- テンプレート・用語集
test("adv-b2 templates: 全テンプレートがエラーなく実行できる", async () => {
  assert.ok(templatesAdvanced.length >= 4 && templatesAdvanced.length <= 6);
  for (const t of templatesAdvanced) {
    const r = await d.simulate(t.code, structuredClone(t.model));
    assert.equal(errOf(r), null, `${t.id}: ${errOf(r)?.message}`);
    for (const ref of t.refs)
      assert.ok(
        referenceAdvanced.some((e) => e.name === ref) ||
        ["MsgBox"].includes(ref),
        `${t.id} の refs ${ref} は高度差分か基礎に存在する`);
  }
});

test("adv-b2 glossary: 形の確認", () => {
  assert.ok(glossaryAdvanced.length >= 10);
  for (const [term, def] of glossaryAdvanced) {
    assert.equal(typeof term, "string");
    assert.ok(def.length > 10, term);
  }
});

// ---------------------------------------------------------------- (c) 未対応の正直な停止
test("adv-b2 unsupported: 名前を挙げて停止する", async () => {
  const cases = [
    ['x := WinGetTitle("A")', /WinGetTitle/],
    ['x := FileOpen("a.txt", "r")', /FileOpen/],
    ['x := EnvGet("PATH")', /EnvGet/],
    ['x := ObjPtr({})', /ObjPtr/],
    ['m := Menu()', /Menu/],
    ['ih := InputHook()', /InputHook/],
    ['x := RegRead("HKCU\\Software", "v")', /RegRead/],
    ['x := DriveGetCapacity("C:")', /DriveGetCapacity/],
  ];
  for (const [code, re] of cases) {
    const r = await run(code);
    assert.ok(errOf(r), code);
    assert.match(errOf(r).message, re, code);
  }
});

test("adv-b2 unsupported: Goto と Loop Files/Read/Reg は構文として停止", async () => {
  let r = await run(["x := 1", "Goto, there", "there:", "x := 2"].join("\n"));
  assert.ok(errOf(r));
  assert.match(errOf(r).message, /Goto/);
  r = await run('Loop Files, "C:\\*" {\n}');
  assert.match(errOf(r).message, /Loop Files/);
  r = await run('Loop Read, "a.txt" {\n}');
  assert.match(errOf(r).message, /Loop Read/);
  r = await run('Loop Reg, "HKCU\\Software" {\n}');
  assert.match(errOf(r).message, /Loop Reg/);
});

test("adv-b2 unsupported: 列挙子・Func・コールバック系は未対応で停止", async () => {
  let r = await run("a := [1]\ne := a.__Enum()");
  assert.ok(errOf(r));
  r = await run('f := Func("MsgBox")');
  assert.ok(errOf(r));
  assert.match(errOf(r).message, /Func/);
});

// ---------------------------------------------------------------- 監査班C 是正の回帰
// A2監査 F1 で是正：クラスなし Catch が受けるのは Error のみ（公式
// Throw ページ："if Catch is used without specifying a class ..., it
// will only catch instances of the Error class"）。B2 当時の本テストは
// 逆の意味論（何でも受ける）を固定していたため、公式どおりに書き換えた。
test("adv-b2 auditC: クラスなし Catch は Error のみを受ける（Error でない値は伝播する）", async () => {
  let r = await run('Try {\n  Throw Error("boom")\n} Catch e {\n  v := e.Message\n}');
  assert.equal(errOf(r), null);
  assert.equal(vars(r).v, "boom");
  r = await run("Try {\n  x := 1 / 0\n} Catch {\n  hit := 1\n}");
  assert.equal(vars(r).hit, 1); // 実行時エラー（Error）も受ける
  r = await run('Try {\n  Throw Error("boom")\n} Catch as e {\n  v := e.Message\n}');
  assert.equal(errOf(r), null);
  assert.equal(vars(r).v, "boom");
  // Error でない値はクラスなし Catch では受けず、そのまま伝播する。
  r = await run('Try {\n  Throw "oops"\n} Catch e {\n  v := e\n}');
  assert.ok(errOf(r));
  assert.equal(errOf(r).message, "oops");
  assert.equal(vars(r).v, undefined);
  r = await run("Try {\n  Throw 42\n} Catch {\n  hit := 1\n}");
  assert.ok(errOf(r));
  assert.equal(vars(r).hit, undefined);
  r = await run("Try {\n  Throw {code: 7}\n} Catch e {\n  v := e.code\n}");
  assert.ok(errOf(r));
  assert.equal(vars(r).v, undefined);
  // Error でない値を受けるのは明示のクラス指定（Any／型名）。
  r = await run('Try {\n  Throw "oops"\n} Catch Any as e {\n  v := e\n  t := Type(e)\n}');
  assert.equal(errOf(r), null);
  assert.equal(vars(r).v, "oops");
  assert.equal(vars(r).t, "String");
  r = await run("Try {\n  Throw 42\n} Catch Any as e {\n  v := e\n}");
  assert.equal(vars(r).v, 42);
  r = await run("Try {\n  Throw {code: 7}\n} Catch Any as e {\n  v := e.code\n}");
  assert.equal(vars(r).v, 7);
  // クラス指定は従来どおり絞り込む（Error 指定で文字列は受けない）。
  r = await run('Try {\n  Throw "oops"\n} Catch Error {\n  hit := 1\n}');
  assert.ok(errOf(r));
  r = await run('Try {\n  Throw "oops"\n} Catch String as e {\n  v := e\n}');
  assert.equal(vars(r).v, "oops");
});

test("adv-b2 auditC: Map.CaseSense の公式仕様（既定On・空Mapのみ変更可・Off で大小区別なし）", async () => {
  let r = await run('m := Map()\ncs := m.CaseSense');
  assert.equal(vars(r).cs, "On");
  r = await run('m := Map()\nm.CaseSense := "Off"\nm.Set("Key", 1)\nx := m.Has("key")\ny := m.Get("KEY")');
  assert.equal(errOf(r), null);
  assert.deepEqual([vars(r).x, vars(r).y], [1, 1]);
  r = await run('m := Map("a", 1)\nm.CaseSense := "Off"');
  assert.ok(errOf(r), "要素のある Map への CaseSense 代入は例外");
  r = await run('m := Map()\nm.CaseSense := "Bogus"');
  assert.ok(errOf(r));
  r = await run('m := Map()\nm.CaseSense := "Off"\nn := m.Clone()\nn.Set("Key", 1)\nx := n.Has("key")');
  assert.equal(vars(r).x, 1); // Clone は CaseSense を引き継ぐ
});

test("adv-b2 auditC: 正規表現の PCRE 変換（\\p は等価変換、\\K 等は名指し停止、\\z は厳密な末尾）", async () => {
  const BS = "\u005c";
  let r = await run(`p := RegExMatch("abc", "${BS}p{L}+")`);
  assert.equal(vars(r).p, 1);
  r = await run(`p := RegExMatch("abc123", "abc${BS}K${BS}d+")`);
  assert.ok(errOf(r));
  assert.match(errOf(r).message, /\\K/);
  r = await run(`p := RegExMatch("a b", "a${BS}hb")`);
  assert.match(errOf(r).message, /\\h/);
  r = await run(`p := RegExMatch("abc", "bc${BS}Z")`);
  assert.match(errOf(r).message, /\\Z/);
  r = await run(`p := RegExMatch("abc\`n", "bc${BS}z")`);
  assert.equal(vars(r).p, 0); // \z は最終改行の前には一致しない
  r = await run(`p := RegExMatch("abc", "bc${BS}z")`);
  assert.equal(vars(r).p, 2);
  r = await run(`p := RegExMatch("x${BS}Ky", "${BS}${BS}K")`); // 字句としての \\K は停止しない
  assert.equal(vars(r).p, 2);
});

test("adv-b2 auditC: 高度値の表示に内部表現（__ahkType 等）が漏れない", async () => {
  const r = await run('m := Map("a", 1)\nbuf := Buffer(4)');
  const texts = (r.paths[0].trace || []).map((t) => t.text).join("\n");
  assert.ok(!/__ahkType|entries/.test(texts), texts);
  assert.match(texts, /a/);
});
