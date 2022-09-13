<template>
  <div>
    <background></background>
    <el-config-provider :locale="zhCn">
      <div class="common-layout">
        <el-container>
          <el-affix :offset="0">
            <el-header>
              <top></top>
            </el-header>
          </el-affix>
          <el-main><router-view></router-view></el-main>
          <el-footer>
            <footer1></footer1>
          </el-footer>
        </el-container>
      </div>
    </el-config-provider>
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue';
  import Background from './components/background.vue';
  import zhCn from 'element-plus/lib/locale/lang/zh-cn';
  import Top from './components/top.vue';
  import Footer1 from './components/footer.vue';
  import lwmh from 'live2d-widget-model-koharu/assets/koharu.model.json?url';
  import { L2Dwidget } from 'live2d-widget';
  onMounted(() => {
    // https://l2dwidget.js.org/docs/class/src/index.js~L2Dwidget.html#instance-method-init
    L2Dwidget.init({
      model: {
        scale: 1, //缩放
        jsonPath: import.meta.env.DEV ? lwmh : new URL('./live2d-widget-model-koharu/assets/koharu.model.json', import.meta.url).href
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
        hOffset: 0,
        vOffset: -80
      },
      mobile: {
        show: true,
        scale: 0.5
      },
      dialog: {
        enable: true,
        hitokoto: true
      }
    });
  });
</script>

<style scoped lang="scss">
  .common-layout {
    .el-header {
      --el-header-padding: 0 !important;
    }
    .el-main {
      height: calc(100vh - 60px - 60px);
      color: #fff;
    }
    .el-footer {
      --el-footer-padding: 0 !important;
    }
  }
</style>
