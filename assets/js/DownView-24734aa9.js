import{b as e,d as a,a as s,u as t,o as i,c as n,n as l,e as c,r as d,f as o,t as r,g as m,h,i as v,_,w as p,j as u,k as f,l as w,m as y,F as z,p as E,q as b,s as V,v as g}from"./index-8c9c9112.js";const k=e({header:{type:String,default:""},bodyStyle:{type:a([String,Object,Array]),default:""},shadow:{type:String,values:["always","hover","never"],default:"always"}}),j=s({name:"ElCard"});const A=p(_(s({...j,props:k,setup(e){const a=t("card");return(e,s)=>(i(),n("div",{class:l([c(a).b(),c(a).is(`${e.shadow}-shadow`)])},[e.$slots.header||e.header?(i(),n("div",{key:0,class:l(c(a).e("header"))},[d(e.$slots,"header",{},(()=>[o(r(e.header),1)]))],2)):m("v-if",!0),h("div",{class:l(c(a).e("body")),style:v(e.bodyStyle)},[d(e.$slots,"default")],6)],2))}}),[["__file","/home/runner/work/element-plus/element-plus/packages/components/card/src/card.vue"]])),D={class:"icon",viewBox:"0 0 1024 1024",xmlns:"http://www.w3.org/2000/svg",width:"200",height:"200"},I=[h("path",{d:"M296 392h64v64h-64zm0 190v160h128V582h-64v-62h-64v62zm80 48v64h-32v-64h32zm-16-302h64v64h-64zm-64-64h64v64h-64zm64 192h64v64h-64zm0-256h64v64h-64z"},null,-1),h("path",{d:"M854.6 288.6 639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h64v64h64v-64h174v216c0 23.2 18.8 42 42 42h216v494z"},null,-1)];const L={render:function(e,a){return i(),n("svg",D,I)}},O=(e=>(b("data-v-13d6271b"),e=e(),V(),e))((()=>h("div",{class:"header"},[h("div",{class:"name"},"文件名称"),h("div",{class:"time"},"上传时间")],-1))),P={class:"content"},R=["onClick"],S={class:"name"},T={class:"time"},x=g(s({__name:"DownView",setup(e){const a=[{name:"孤独摇滚表情包.zip",icon:L,time:"2022-12-09",file:u((()=>import("./孤独摇滚表情包-73e76a8a.js")),[])},{name:"蜜汁工坊-公主连结表情包.zip",icon:L,time:"2022-09-15",file:u((()=>import("./蜜汁工坊-公主连结表情包-c22b0d93.js")),[])},{name:"蜜汁工坊-猫猫头.zip",icon:L,time:"2022-09-15",file:u((()=>import("./蜜汁工坊-猫猫头-0991eeb4.js")),[])},{name:"蜜汁工坊-爬表情包.zip",icon:L,time:"2022-09-15",file:u((()=>import("./蜜汁工坊-爬表情包-9adfd5da.js")),[])},{name:"随机表情包.zip",icon:L,time:"2022-09-15",file:u((()=>import("./随机表情包-e98c7a02.js")),[])}];return(e,s)=>{const t=A;return i(),f(t,null,{default:w((()=>[O,h("div",P,[(i(),n(z,null,y(a,((e,a)=>h("div",{class:"one click",key:a,onClick:a=>async function(e,a){let s=await a,t=document.createElement("a");t.href=s.default,t.download=e,t.click(),t.remove()}(e.name,e.file)},[(i(),f(E(e.icon))),h("div",S,r(e.name),1),h("div",T,r(e.time),1)],8,R))),64))])])),_:1})}}}),[["__scopeId","data-v-13d6271b"]]);export{x as default};
