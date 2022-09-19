<template>
  <div class="message">
    <Gitalk1></Gitalk1>
  </div>
</template>

<script setup lang="ts">
  import Gitalk1 from '@/components/gitalk.vue';
</script>

<style scoped lang="scss">
  .message {
    width: 80%;
    margin: 0 auto;
    @media screen and (max-width: 768px) {
      width: 100%;
    }
  }
</style>
