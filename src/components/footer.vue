<template>
  <div class="footer">
    <div>
      版权所有 &copy;2022{{ new Date().getFullYear() === 2022 ? '' : `${new Date().getFullYear()}` }}
      <span>by</span>
      空巷
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
  .footer {
    background-color: rgba(0, 0, 0, 0.7);
    height: 100%;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
