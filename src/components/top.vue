<template>
  <div class="top">
    <div class="title">
      <router-link to="/">空巷</router-link>
    </div>
    <div class="menus">
      <router-link to="/">首页</router-link>
      <router-link to="/404.html">404</router-link>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

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
    }
  }
</style>
