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
    <!-- <live2d></live2d> -->
  </div>
</template>

<script setup lang="ts">
  import Background from './components/background.vue';
  import zhCn from 'element-plus/lib/locale/lang/zh-cn';
  import Top from './components/top.vue';
  import Footer1 from './components/footer.vue';
  // import Live2d from './components/live2d.vue';

  var OriginTitile = document.title;
  var titleTime: NodeJS.Timeout;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      document.title = '糟糕,网页崩溃了!!!';
      clearTimeout(titleTime);
    } else {
      document.title = '哎呀,又好了!!!';
      titleTime = setTimeout(function () {
        document.title = OriginTitile;
      }, 2000); // 2秒后恢复原标题
    }
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
