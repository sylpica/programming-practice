// 高度モード B4：VBA 追加組み込み定数（高度差分）。
// js/engine.js が VBA_ENUM_CONSTANTS へ統合する。キーは小文字の定数名。
//
// 棚卸し（advanced-inventory/inventory-vba.md）の定数「未収録」46件を登録する。
// 値はグループ単位で Microsoft Learn の各定数ページ（確認日 2026-11-17）で裏付けた：
//  - DriveType constants（Unknown=0, Removable=1, Fixed=2, Remote=3, CDROM=4, RAMDisk=5）
//    https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/drivetype-constants
//  - File Attribute constants（Normal=0, ReadOnly=1, Hidden=2, System=4, Volume=8,
//    Directory=16, Archive=32, Alias=64, Compressed=128）
//    https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/file-attribute-constants
//    ※ vb 接頭辞付きの VbFileAttribute（vbNormal 等）は基礎層に登録済みのため、
//      ここでは接頭辞なしのメンバー名（FileSystemObject 系型ライブラリの定数）を登録する。
//  - File Input/Output constants（ForReading=1, ForWriting=2, ForAppending=8）
//    https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/file-input-output-constants
//  - SpecialFolder constants（WindowsFolder=0, SystemFolder=1, TemporaryFolder=2）
//    https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/specialfolder-constants
//  - System Color constants（vbScrollBars=&H80000000 〜 vbInfoBackground=&H80000018）
//    https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/system-color-constants
//    ※ 値は Long の 16 進リテラル &H800000xx であり、符号付き Long としては
//      -2147483648 + 0x00 〜 0x18 の負値になる。JS 数値でも符号付き値で登録する。
// 文字列定数（vbCrLf 等）は基礎層が解決済みなので登録しない。
export const advancedConstants = {
  // DriveType constants
  unknown: 0,
  removable: 1,
  fixed: 2,
  remote: 3,
  cdrom: 4,
  ramdisk: 5,
  // File Attribute constants（メンバー名）
  normal: 0,
  readonly: 1,
  hidden: 2,
  system: 4,
  volume: 8,
  directory: 16,
  archive: 32,
  alias: 64,
  compressed: 128,
  // File Input/Output constants
  forreading: 1,
  forwriting: 2,
  forappending: 8,
  // SpecialFolder constants
  windowsfolder: 0,
  systemfolder: 1,
  temporaryfolder: 2,
  // System Color constants（&H80000000 + 連番、符号付き Long 値）
  vbscrollbars: -2147483648,
  vbdesktop: -2147483647,
  vbactivetitlebar: -2147483646,
  vbinactivetitlebar: -2147483645,
  vbmenubar: -2147483644,
  vbwindowbackground: -2147483643,
  vbwindowframe: -2147483642,
  vbmenutext: -2147483641,
  vbwindowtext: -2147483640,
  vbtitlebartext: -2147483639,
  vbactiveborder: -2147483638,
  vbinactiveborder: -2147483637,
  vbapplicationworkspace: -2147483636,
  vbhighlight: -2147483635,
  vbhighlighttext: -2147483634,
  vbbuttonface: -2147483633,
  vbbuttonshadow: -2147483632,
  vbgraytext: -2147483631,
  vbbuttontext: -2147483630,
  vbinactivecaptiontext: -2147483629,
  vb3dhighlight: -2147483628,
  vb3ddkshadow: -2147483627,
  vb3dlight: -2147483626,
  vbinfotext: -2147483625,
  vbinfobackground: -2147483624,
};
