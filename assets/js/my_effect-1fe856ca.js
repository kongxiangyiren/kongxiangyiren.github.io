import{j as e}from"./jquery-76d1a139.js";let t=(t=!0,a=!0)=>{if(t&&function(e,t,a){function r(){return"rgb("+~~(255*Math.random())+","+~~(255*Math.random())+","+~~(255*Math.random())+")"}var n,o=[];e.requestAnimationFrame=e.requestAnimationFrame||e.webkitRequestAnimationFrame||e.mozRequestAnimationFrame||e.oRequestAnimationFrame||e.msRequestAnimationFrame||function(e){setTimeout(e,1e3/60)},function(e){var a=t.createElement("style");a.type="text/css";try{a.appendChild(t.createTextNode(e))}catch(n){a.styleSheet.cssText=e}t.getElementsByTagName("head")[0].appendChild(a)}(".heart{width: 10px;height: 10px;position: fixed;background: #f00;transform: rotate(45deg);-webkit-transform: rotate(45deg);-moz-transform: rotate(45deg);}.heart:after,.heart:before{content: '';width: inherit;height: inherit;background: inherit;border-radius: 50%;-webkit-border-radius: 50%;-moz-border-radius: 50%;position: fixed;}.heart:after{top: -5px;}.heart:before{left: -5px;}"),n="function"==typeof e.onclick&&e.onclick,e.onclick=function(e){n&&n(),function(e){var a=t.createElement("div");a.className="heart",o.push({el:a,x:e.clientX-5,y:e.clientY-5,scale:1,alpha:1,color:r()}),t.body.appendChild(a)}(e)},function e(){for(var a=0;a<o.length;a++)o[a].alpha<=0?(t.body.removeChild(o[a].el),o.splice(a,1)):(o[a].y--,o[a].scale+=.004,o[a].alpha-=.013,o[a].el.style.cssText="left:"+o[a].x+"px;top:"+o[a].y+"px;opacity:"+o[a].alpha+";transform:scale("+o[a].scale+","+o[a].scale+") rotate(45deg);background:"+o[a].color+";z-index:99999");requestAnimationFrame(e)}()}(window,document),a){var r=0;e(document).ready((e=>{e("body").click((t=>{var a=new Array("富强","民主","文明","和谐","自由","平等","公正","法治","爱国","敬业","诚信","友善"),n=e("<span/>").text(a[r]);r=(r+1)%a.length;var o=t.pageX,i=t.pageY;n.css({"z-index":1e8,top:i-20,left:o,position:"absolute","font-weight":"bold",color:"#ff6651"}),e("body").append(n),n.animate({top:i-180,opacity:0},1500,(()=>{n.remove()}))}))}))}},a=(new Date).getFullYear(),r=(e=[{startingTime:a+"-12-13 00:00:00",timeEnd:a+"-12-14 00:00:00"}])=>{if(e){var t=Date.parse(new Date);for(let a of e){var r=Date.parse(new Date(a.startingTime)),n=Date.parse(new Date(a.timeEnd));r<t&&t<n&&document.body.setAttribute("style","\n            filter: grayscale(100%);\n        -webkit-filter: grayscale(100%);\n        -moz-filter: grayscale(100%);\n        -ms-filter: grayscale(100%);\n        -o-filter: grayscale(100%);")}}};export{t as c,r as m};
