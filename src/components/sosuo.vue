<template>
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
</template>

<script setup lang="ts">
  import { Search } from '@element-plus/icons-vue';
  const input = ref('');
  const select = ref('开发者搜索');
  const cities = [
    {
      value: '开发者搜索',
      label: '开发者搜索',
      href: 'https://kaifa.baidu.com/searchPage?wd='
    },
    {
      value: '必应',
      label: '必应',
      href: 'https://cn.bing.com/search?q='
    },
    {
      value: '百度',
      label: '百度',
      href: 'https://www.baidu.com/s?wd='
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
</script>

<style scoped lang="scss">
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
</style>
