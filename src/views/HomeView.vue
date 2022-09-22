<template>
  <el-row :gutter="20">
    <el-col :md="18">
      <div class="left">
        <div class="search">
          <el-input
            :size="size() ? 'large' : 'small'"
            v-model="input"
            placeholder="请输入搜索内容"
            class="input-with-select"
            @keydown.enter="search"
          >
            <template #prepend>
              <el-select
                :size="size() ? 'large' : 'small'"
                v-model="select"
                placeholder="搜索引擎"
                :style="size() ? 'width:150px' : 'width:100px'"
              >
                <el-option
                  :label="item.label"
                  :value="item.value"
                  v-for="item in cities"
                  :key="item.value"
                />
              </el-select>
            </template>
            <template #append>
              <el-button :size="size() ? 'large' : 'small'" :icon="Search" @click="search" />
            </template>
          </el-input>
        </div>
      </div>
    </el-col>
    <el-col :md="6">
      <div class="right">
        <div class="time">
          <div class="currentTime">
            {{ time }}
          </div>
          <div class="today">
            <span class="mouth">
              {{ month }}
            </span>
            月
            <span class="day">
              {{ today }}
            </span>
            日
            {{ wstr }}
          </div>
        </div>
        <div class="history">
          <div class="title">历史上的今天</div>
          <div class="list">
            <div class="one" v-for="(item, index) in history" :key="index">
              {{ item.year }}&nbsp;
              <span v-html="item.title"></span>
            </div>
          </div>
        </div>
      </div>
      <div class="right2">
        <span id="busuanzi_container_site_pv">
          本站总访问量
          <span id="busuanzi_value_site_pv">99</span>
          次
        </span>
        <br />
        <span id="busuanzi_container_site_uv">
          本站总访客数
          <span id="busuanzi_value_site_uv">99</span>
          人
        </span>
      </div>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
  import { getHistory } from '@/api/api';
  import { Search } from '@element-plus/icons-vue';
  const input = ref('');
  const select = ref('开发者搜索');
  const cities = [
    {
      value: '开发者搜索',
      label: '开发者搜索',
      href: 'https://kaifa.baidu.com/searchPage?module=SUG&wd='
    },
    {
      value: '必应',
      label: '必应',
      href: 'https://cn.bing.com/search?q='
    },
    {
      value: '百度',
      label: '百度',
      href: 'https://www.baidu.com/s?&tn=68018901_2_oem_dgie=utf-8&wd='
    }
  ];
  function search() {
    for (let item of cities) {
      if (select.value.includes(item.value)) {
        window.open(item.href + input.value, '_blank');
        break;
      }
    }
  }

  function size() {
    return window.screen.availWidth >= 768 ? true : false;
  }

  // 右

  let month =
    new Date().getMonth() + 1 < 10 ? '0' + (new Date().getMonth() + 1) : new Date().getMonth() + 1;
  let today = new Date().getDate() < 10 ? '0' + new Date().getDate() : new Date().getDate();

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

  // 历史上的今天
  let history = ref([{ year: String, title: String, link: String }]);
  getHistory(month).then(res => {
    history.value = res.data[month][month + '' + today].slice(0, 10);
  });
</script>

<style>
  .el-select-dropdown__item {
    cursor: url('@/assets/Crystal/link.png'), pointer !important;
  }
</style>

<style scoped lang="scss">
  .el-row {
    height: 100%;
    @media screen and (max-width: 992px) {
      .el-col {
        margin: 20px 0;
      }
    }

    .left {
      width: 100%;
      min-height: 400px;
      height: 100%;
      background-color: rgba($color: #fff, $alpha: 0.7);
      border-radius: 4px;
      @media screen and (max-height: 600px) {
        height: calc(100% - 20px);
      }
      .search {
        width: 80%;
        margin: auto;
        padding: 50px 0;
        .el-select {
          :deep(.el-input) {
            cursor: url('@/assets/Crystal/link.png'), pointer;
            .el-input__inner {
              cursor: url('@/assets/Crystal/link.png'), pointer;
            }
            .el-input__wrapper {
              cursor: url('@/assets/Crystal/link.png'), pointer;
              .el-select__caret {
                cursor: url('@/assets/Crystal/link.png'), pointer;
              }
            }
          }
        }
      }
    }
    .right {
      width: 100%;
      min-height: 400px;
      background-color: rgba($color: #fff, $alpha: 0.7);
      border-radius: 4px;
      margin-bottom: 20px;

      .time {
        text-align: center;
        .currentTime {
          padding-top: 30px;
          font-size: 32px;
          font-family: 'sa-digital-number';
        }
      }
      .history {
        width: calc(100% - 40px);
        padding: 20px;
        .title {
          font-size: 20px;
          text-align: center;
          margin-bottom: 15px;
        }
        .list {
          width: 100%;
          line-height: 1.5em;
          padding-bottom: 20px;

          color: rgba($color: #000, $alpha: 0.5);
          .one {
            width: 100%;
            display: flex;

            span {
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
              -o-text-overflow: ellipsis;
              :deep(a) {
                color: rgb(3, 172, 250);
              }
            }
          }
        }
      }
    }
    .right2 {
      width: 100%;
      background-color: rgba($color: #fff, $alpha: 0.7);
      border-radius: 4px;
      margin-bottom: 20px;
      text-align: center;
      padding: 20px 0;
    }
  }
</style>
