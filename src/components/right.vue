<template>
  <ul id="caidan1" ref="caidan1">
    <li @click="$router.push({ path: '/' })">首页</li>
    <li @click="$router.push({ path: '/download' })">资源下载</li>
    <li @click="$router.push({ path: '/message' })">留言</li>
  </ul>
</template>

<script setup lang="ts">
  const $router = useRouter();
  const caidan1 = ref();

  document.oncontextmenu = function (e) {
    // console.log(e.clientX, e.clientY);

    caidan1.value.style.display = 'block';
    if (document.documentElement.clientWidth > e.clientX + caidan1.value.offsetWidth + 20) {
      caidan1.value.style.left = e.clientX + 'px';
    } else {
      caidan1.value.style.left = e.clientX - caidan1.value.offsetWidth - 10 + 'px';
    }

    if (document.documentElement.clientHeight > e.clientY + caidan1.value.offsetHeight + 20) {
      caidan1.value.style.top = e.clientY + 'px';
    } else {
      caidan1.value.style.top = e.clientY - caidan1.value.offsetHeight - 10 + 'px';
    }

    return false; //返回一个错误的指使，禁止菜单弹出
  };
  //鼠标左键单击
  document.onclick = function () {
    caidan1.value.style.display = 'none';
  };
</script>

<style scoped lang="scss">
  ul {
    background-color: white;
    color: #000;
    width: 150px;
    display: none;
    position: absolute;
    padding: 10px;
    border-radius: 10px;
    z-index: 99999;
    li {
      list-style: none;
      line-height: 40px;
      border-radius: 5px;
      padding: 5px;
      transition: all 0.5s;
      &:hover {
        color: white;
        background-color: darkgrey;
      }
    }
  }
</style>
