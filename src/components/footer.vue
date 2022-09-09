<template>
  <div class="footer">
    <div>
      版权所有 &copy;2022{{ new Date().getFullYear() === 2022 ? '' : ` - ${new Date().getFullYear()}` }}
      <redHeart class="redHeart"></redHeart>
      空巷
    </div>
  </div>
</template>

<script setup lang="ts">
  import redHeart from '@/assets/红心.svg';
</script>

<style scoped lang="scss">
  .footer {
    background-color: rgba(0, 0, 0, 0.7);
    height: 100%;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    .redHeart {
      width: 25px;
      height: 25px;
      margin-bottom: -6px;
      animation-name: likes; // 动画名称
      animation-direction: alternate; // 动画在奇数次（1、3、5...）正向播放，在偶数次（2、4、6...）反向播放。
      animation-timing-function: linear; // 动画执行方式，linear：匀速；ease：先慢再快后慢；ease-in：由慢速开始；ease-out：由慢速结束；ease-in-out：由慢速开始和结束；
      animation-delay: 0s; // 动画延迟时间
      animation-iteration-count: infinite; //  动画播放次数，infinite：一直播放
      animation-duration: 1s; // 动画完成时间
    }
  }

  @keyframes likes {
    0% {
      transform: scale(1);
    }
    25% {
      transform: scale(0.9);
    }
    50% {
      transform: scale(0.85);
    }
    75% {
      transform: scale(0.9);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
