<template>
  <div class="background">
    <video autoplay loop muted="true" preload="true">
      <source src="@/assets/04.mp4" type="video/webm" />
    </video>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
  .background {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: -9999;
    video {
      height: 100%;
      width: 100%;
      object-fit: cover;
      // 亮度
      -webkit-filter: brightness(70%);
      filter: brightness(70%);
    }
  }
</style>
