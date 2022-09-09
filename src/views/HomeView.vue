<template>
  <el-row>
    <el-col :md="18">1</el-col>
    <el-col :md="6">
      <div class="time">
        <div class="currentTime">
          {{ time }}
        </div>
        <div class="today">
          <span class="mouth">{{ new Date().getMonth() + 1 < 10 ? '0' + (new Date().getMonth() + 1) : new Date().getMonth() + 1 }}</span>
          月
          <span class="day">{{ new Date().getDate() < 10 ? '0' + new Date().getDate() : new Date().getDate() }}</span>
          日
          {{ wstr }}
        </div>
      </div>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  const time = ref(getTime());
  // 获取时分秒
  function getTime() {
    let date = new Date();
    // 获取当前时分秒
    let hour = date.getHours() + '',
      minutes = date.getMinutes() + '',
      seconds = date.getSeconds() + '';
    if (Number(hour) < 10) {
      hour = '0' + hour;
    }
    if (Number(minutes) < 10) {
      minutes = '0' + minutes;
    }
    if (Number(seconds) < 10) {
      seconds = '0' + seconds;
    }
    return hour + ':' + minutes + ':' + seconds;
  }
  const wstr = getWeek();
  // 获取星期
  function getWeek() {
    let date = new Date();
    let week = date.getDay();
    let wst = '';

    switch (week) {
      case 0:
        wst = '星期日';
        break;
      case 1:
        wst = '星期一';
        break;
      case 2:
        wst = '星期二';
        break;
      case 3:
        wst = '星期三';
        break;
      case 4:
        wst = '星期四';
        break;
      case 5:
        wst = '星期五';
        break;
      case 6:
        wst = '星期六';
        break;
    }
    return wst;
  }
  setInterval(() => {
    time.value = getTime();
  }, 1000);
</script>

<style scoped lang="scss">
  .time {
    width: 100%;
    min-height: 400px;
    background-color: rgba($color: #fff, $alpha: 0.7);
    border-radius: 4px;
    text-align: center;
    .currentTime {
      padding-top: 30px;
      font-size: 50px;
      font-family: dsdigi;
    }
  }
</style>
