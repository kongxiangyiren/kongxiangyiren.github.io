/**
 * @description: 鼠标左键效果
 * @param {Boolean} love 爱心效果,默认true
 * @param {Boolean} value 社会主义核心价值观效果，默认true
 * @return {void}
 */
export declare function clicker(love: Boolean, value: Boolean): void;
/**
 * @description: 默哀，网站灰色
 * @param {Array} mourning 默哀,默认 每年12月13日00:00:00-每年12月14日00:00:00 网站灰色
 * let year = new Date().getFullYear(); //年
 * mourning([
 * {
 * startingTime: year + '-12-13 00:00:00',
 * timeEnd: year + '-12-14 00:00:00'
 * }
 * ]);
 * @return {void}
 */
export declare function mourning(mourning: [{ startingTime: string; timeEnd: string }]): void;
