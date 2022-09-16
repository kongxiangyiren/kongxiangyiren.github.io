<template></template>

<script setup lang="ts">
  import lwmh from 'live2d-widget-model-koharu/assets/koharu.model.json?url';
  import { L2Dwidget } from 'live2d-widget';
  onMounted(() => {
    // https://l2dwidget.js.org/docs/class/src/index.js~L2Dwidget.html#instance-method-init
    L2Dwidget.init({
      model: {
        scale: 1, //缩放
        jsonPath: import.meta.env.DEV
          ? lwmh
          : import.meta.env.BASE_URL + 'live2d-widget-model-koharu/assets/koharu.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-chitose@1.0.5/assets/chitose.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-epsilon2_1@1.0.5/assets/Epsilon2.1.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-gf@1.0.5/assets/Gantzert_Felixander.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-haru01@1.0.2/assets/haru01.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-haru02@1.0.2/assets/haru02.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-haruto@1.0.5/assets/haruto.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-hibiki@1.0.5/assets/hibiki.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-hijiki@1.0.5/assets/hijiki.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-izumi@1.0.5/assets/izumi.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-koharu@1.0.5/assets/koharu.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-miku@1.0.5/assets/miku.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-nico@1.0.5/assets/nico.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-ni-j@1.0.5/assets/ni-j.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-nipsilon@1.0.5/assets/nipsilon.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-nito@1.0.5/assets/nito.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-shizuku@1.0.5/assets/shizuku.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-tororo@1.0.5/assets/tororo.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-tsumiki@1.0.5/assets/tsumiki.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-unitychan@1.0.5/assets/unitychan.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-wanko@1.0.5/assets/wanko.model.json'
        // jsonPath: 'https://unpkg.com/live2d-widget-model-z16@1.0.5/assets/z16.model.json'
      },
      display: {
        position: 'right', //位置
        width: 200, //宽度
        height: 400, //高度
        hOffset: 40,
        vOffset: -80
      },
      mobile: {
        show: false,
        scale: 0.5
      },
      dialog: {
        enable: false,
        hitokoto: false
      }
    });

    // // 复制
    // document.addEventListener('copy', event => {
    //   let text = document.querySelector('#live2d-widget > div > div') as HTMLElement;
    //   text.style.opacity = '1';
    //   text.innerHTML = '你复制了些什么啊,能不能让我看看？';
    //   setTimeout(() => {
    //     text.style.opacity = '0';
    //   }, 4000);
    // });
    // //剪切
    // document.addEventListener('cut', event => {
    //   let text = document.querySelector('#live2d-widget > div > div') as HTMLElement;
    //   text.style.opacity = '1';
    //   text.innerHTML = '你剪切了些什么啊,能不能让我看看？';
    //   setTimeout(() => {
    //     text.style.opacity = '0';
    //   }, 4000);
    // });
    // // 回来
    // document.addEventListener('visibilitychange', () => {
    //   if (!document.hidden) {
    //     let text = document.querySelector('#live2d-widget > div > div') as HTMLElement;
    //     text.style.opacity = '1';
    //     text.innerHTML = '欢迎回来！';
    //     setTimeout(() => {
    //       text.style.opacity = '0';
    //     }, 4000);
    //   }
    // });
  });
</script>

<style scoped lang="scss"></style>
