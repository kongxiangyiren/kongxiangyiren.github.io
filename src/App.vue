<template>
  <div>
    <background></background>
    <router-view></router-view>
  </div>
</template>

<script setup lang="ts">
  import Background from './components/background.vue';
</script>

<style scoped lang="scss">
  * {
    color: #fff;
  }
</style>
