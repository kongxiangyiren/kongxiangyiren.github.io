<template>
  <el-card>
    <div class="header">
      <div class="name">文件名称</div>
      <div class="time">上传时间</div>
    </div>
    <div class="content">
      <div
        class="one click"
        v-for="(item, index) in file"
        :key="index"
        @click="getDown(item.name, item.file)"
      >
        <component :is="item.icon" />
        <div class="name">
          {{ item.name }}
        </div>
        <div class="time">
          {{ item.time }}
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
  import zip from '@/assets/zip.svg';
  const file = [
    {
      name: '蜜汁工坊-公主连结表情包.zip',
      icon: zip,
      time: '2022-09-15',
      file: import('@/down/蜜汁工坊-公主连结表情包.zip?url')
    },
    {
      name: '蜜汁工坊-猫猫头.zip',
      icon: zip,
      time: '2022-09-15',
      file: import('@/down/蜜汁工坊-猫猫头.zip?url')
    },
    {
      name: '蜜汁工坊-爬表情包.zip',
      icon: zip,
      time: '2022-09-15',
      file: import('@/down/蜜汁工坊-爬表情包.zip?url')
    },
    {
      name: '随机表情包.zip',
      icon: zip,
      time: '2022-09-15',
      file: import('@/down/随机表情包.zip?url')
    }
  ];

  async function getDown(name: string, file: Promise<typeof import('*?url')>) {
    //获取文件路径
    let url = await file;
    //非同源需转换成blob格式
    let response = await fetch(url.default);
    // // 内容转变成blob地址
    let blob = await response.blob();
    // // 创建隐藏的可下载链接
    let objectUrl = window.URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = objectUrl;
    a.download = name;
    a.click();
    a.remove();
  }
</script>

<style scoped lang="scss">
  .el-card {
    height: 99%;
    background-color: rgba(#fff, 0.7);
    border: none;
    width: 65%;
    margin: auto;
    :deep(.el-card__body) {
      padding: 0;
      height: 100%;
    }
    @media screen and (max-width: 768px) {
      width: 100%;
    }
    .header {
      display: flex;
      font-size: 16px;
      font-weight: bold;
      color: rgba(#4c4948, 0.5);
      padding: 15px 30px;
      .name {
        margin-right: auto;
      }
    }
    .content {
      height: 100%;
      overflow-y: auto;
      &::-webkit-scrollbar-thumb {
        background-color: rgba(gray, 0.6);
      }
      .one {
        margin: 0 10px 10px;
        border-radius: 5px;
        padding: 13px;
        display: flex;
        align-items: center;
        background: none;
        transition: all 0.5s;
        * {
          transition: all 0.5s;
        }
        &:hover {
          background: rgba(#000, 0.1);
          * {
            transform: translateX(-3px);
          }
        }

        svg {
          width: 20px;
          height: 20px;
          fill: gray;
        }
        .name {
          margin-left: 5px;
          margin-right: auto;
        }
      }
    }
  }
</style>
