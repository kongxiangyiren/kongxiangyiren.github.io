<template>
  <div class="top">
    <div class="title">
      <router-link to="/">空巷</router-link>
    </div>
    <div class="menus hidden-xs-only">
      <router-link to="/">首页</router-link>
      <router-link to="/download">资源下载</router-link>
      <router-link to="/message">留言</router-link>
    </div>
    <div class="menus hidden-sm-and-up">
      <Menu @click="drawer = !drawer"></Menu>
      <el-drawer v-model="drawer" size="75%" title="菜单" :with-header="false">
        <div class="title">菜单</div>
        <hr />
        <div class="router">
          <router-link to="/">首页</router-link>
          <router-link to="/download">资源下载</router-link>
          <router-link to="/message">留言</router-link>
        </div>
      </el-drawer>
    </div>
  </div>
</template>

<script setup lang="ts">
  import 'element-plus/theme-chalk/display.css';
  import Menu from '@/assets/menu.svg';
  const drawer = ref(false);
</script>

<style scoped lang="scss">
  .top {
    background-color: rgba(255, 255, 255, 0.7);
    height: 100%;
    display: flex;
    align-items: center;
    .title {
      width: calc(100% / 2);
      a {
        font-weight: bold;
        font-size: 20px;
        margin-left: 35px;
      }
    }
    .menus {
      width: calc(100% / 2);
      display: flex;
      justify-content: right;
      margin-right: 35px;
      a {
        margin: 0 10px;
        -webkit-transition: all 0.3s;
        transition: all 0.3s;
        &:hover {
          color: #409eff;
        }
      }

      svg {
        width: 20px;
        height: 20px;
        fill: #4c4948;
        cursor: url('@/assets/Crystal/link.png'), pointer !important;
      }
      :deep(.el-drawer) {
        background-color: #f6f8fa !important;
        .el-drawer__body {
          padding: 0;
          .title {
            font-size: 24px;
            margin: 15px 20px;
          }

          .router {
            a {
              display: block;
              margin: 20px;
              padding: 10px;
              color: #4c4948;
              border-radius: 5px;
              background: rgba(#000, 0);
              -webkit-transition: all 0.3s;
              transition: all 0.3s;
              &:hover {
                color: #409eff;
                background: rgba(#000, 0.1);
              }
            }
          }
        }
      }
    }
  }
</style>
