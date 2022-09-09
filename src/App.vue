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
  import Background from './components/background.vue';
  import zhCn from 'element-plus/lib/locale/lang/zh-cn';
  import Top from './components/top.vue';
  import Footer1 from './components/footer.vue';
</script>

<style scoped lang="scss">
  .common-layout {
    .el-header {
      --el-header-padding: 0 !important;
    }
    .el-main {
      min-height: calc(100vh - 60px - 60px);
    }
    .el-footer {
      --el-footer-padding: 0 !important;
    }
  }
</style>
