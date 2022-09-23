```javascript
// 点击效果

import { clicker, mourning } from 'my_effect';
//鼠标点击
/**
 * @description: 鼠标左键效果
 * @param {Boolean} love 爱心效果,默认true
 * @param {Boolean} value 社会主义核心价值观效果，默认true
 * @return {void}
 */
clicker(false, true);



// 默哀
let year = new Date().getFullYear(); //年
/**
 * @description: 默哀，网站灰色
 * @param {Array} mourning 默哀,默认 每年12月13日00:00:00-每年12月14日00:00:00 网站灰色
 * @return {void}
 */
mourning([
  {
    startingTime: year + '-12-13 00:00:00',
    timeEnd: year + '-12-14 00:00:00'
  }
]);
```