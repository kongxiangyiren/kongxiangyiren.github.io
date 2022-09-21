// 需要安装jquery
import jQuery from 'jquery';
/**
 * @description: 鼠标左键效果
 * @param {Boolean} love 爱心效果,默认true
 * @param {Boolean} value 社会主义核心价值观效果，默认true
 * @return {void}
 */

export let clicker = (love = true, value = true) => {
  if (love) {
    // 爱心效果
    !(function (e, t, a) {
      function r() {
        for (var e = 0; e < s.length; e++) s[e].alpha <= 0 ? (t.body.removeChild(s[e].el), s.splice(e, 1)) : (s[e].y--, (s[e].scale += 0.004), (s[e].alpha -= 0.013), (s[e].el.style.cssText = 'left:' + s[e].x + 'px;top:' + s[e].y + 'px;opacity:' + s[e].alpha + ';transform:scale(' + s[e].scale + ',' + s[e].scale + ') rotate(45deg);background:' + s[e].color + ';z-index:99999'));
        requestAnimationFrame(r);
      }

      function n() {
        var t = 'function' == typeof e.onclick && e.onclick;
        e.onclick = function (e) {
          t && t(), o(e);
        };
      }

      function o(e) {
        var a = t.createElement('div');
        (a.className = 'heart'),
          s.push({
            el: a,
            x: e.clientX - 5,
            y: e.clientY - 5,
            scale: 1,
            alpha: 1,
            color: c()
          }),
          t.body.appendChild(a);
      }

      function i(e) {
        var a = t.createElement('style');
        a.type = 'text/css';
        try {
          a.appendChild(t.createTextNode(e));
        } catch (t) {
          a.styleSheet.cssText = e;
        }
        t.getElementsByTagName('head')[0].appendChild(a);
      }

      function c() {
        return 'rgb(' + ~~(255 * Math.random()) + ',' + ~~(255 * Math.random()) + ',' + ~~(255 * Math.random()) + ')';
      }
      var s = [];
      (e.requestAnimationFrame =
        e.requestAnimationFrame ||
        e.webkitRequestAnimationFrame ||
        e.mozRequestAnimationFrame ||
        e.oRequestAnimationFrame ||
        e.msRequestAnimationFrame ||
        function (e) {
          setTimeout(e, 1e3 / 60);
        }),
        i(".heart{width: 10px;height: 10px;position: fixed;background: #f00;transform: rotate(45deg);-webkit-transform: rotate(45deg);-moz-transform: rotate(45deg);}.heart:after,.heart:before{content: '';width: inherit;height: inherit;background: inherit;border-radius: 50%;-webkit-border-radius: 50%;-moz-border-radius: 50%;position: fixed;}.heart:after{top: -5px;}.heart:before{left: -5px;}"),
        n(),
        r();
    })(window, document);
  }

  if (value) {
    // 社会主体核心价值观效果
    var a_idx = 0;
    jQuery(document).ready($ => {
      $('body').click(e => {
        var a = new Array('富强', '民主', '文明', '和谐', '自由', '平等', '公正', '法治', '爱国', '敬业', '诚信', '友善');
        var $i = $('<span/>').text(a[a_idx]);
        a_idx = (a_idx + 1) % a.length;
        var x = e.pageX,
          y = e.pageY;
        $i.css({
          'z-index': 100000000,
          top: y - 20,
          left: x,
          position: 'absolute',
          'font-weight': 'bold',
          color: '#ff6651'
        });
        $('body').append($i);
        $i.animate(
          {
            top: y - 180,
            opacity: 0
          },
          1500,
          () => {
            $i.remove();
          }
        );
      });
    });
  }
};

/**
 * @description:
 * @param {Array} val 默哀,默认 每年12月13日00:00:00-每年12月14日00:00:00 网站灰色
 * @return {void}
 */
let year = new Date().getFullYear(); //年
export let mourning = (
  value = [
    {
      startingTime: year + '-12-13 00:00:00',
      timeEnd: year + '-12-14 00:00:00'
    }
  ]
) => {
  if (value) {
    var timeNow = Date.parse(new Date()); //当前时间

    for (let item of value) {
      var startingTime = Date.parse(new Date(item.startingTime));
      var timeEnd = Date.parse(new Date(item.timeEnd));

      if (startingTime < timeNow && timeNow < timeEnd) {
        document.body.setAttribute(
          'style',
          `
            filter: grayscale(100%);
        -webkit-filter: grayscale(100%);
        -moz-filter: grayscale(100%);
        -ms-filter: grayscale(100%);
        -o-filter: grayscale(100%);`
        );
      }
    }
  }
};