/* 高度モード B7 G6（日時・カレンダー系）の集約エントリ。
 * import の副作用で datetime／time／calendar／zoneinfo の意味論が
 * stdlib レジストリへ登録され、referenceAdvanced に G6 全259件が集まる。
 * 配置・命名は advanced-interface.md 契約（-advanced パターン）に従う。 */
import './impl-advanced-datetime.js';
import './impl-advanced-time.js';
import './impl-advanced-calendar.js';
import './impl-advanced-zoneinfo.js';
import { referenceAdvanced as REF_DATETIME } from './reference-advanced-datetime.js';
import { referenceAdvanced as REF_TIME } from './reference-advanced-time.js';
import { referenceAdvanced as REF_CALENDAR } from './reference-advanced-calendar.js';
import { referenceAdvanced as REF_ZONEINFO } from './reference-advanced-zoneinfo.js';

export const referenceAdvanced = [...REF_DATETIME, ...REF_TIME, ...REF_CALENDAR, ...REF_ZONEINFO];
export { REF_DATETIME, REF_TIME, REF_CALENDAR, REF_ZONEINFO };
