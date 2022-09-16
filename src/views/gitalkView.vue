<template>
  <div id="gitalk-container"></div>
</template>

<script setup lang="ts">
  import 'gitalk/dist/gitalk.css';
  import Gitalk from 'gitalk';
  let gitalk = new Gitalk({
    id: location.pathname,
    clientID: 'ec80f8d5535a10722a9b',
    clientSecret: '172a10e063464cc41bb6e30c675302657f40f289',
    repo: 'kongxiangyiren.github.io',
    owner: 'kongxiangyiren', //
    admin: ['kongxiangyiren'], //github用户名
    labels: ['kongxiangyiren'],
    perPage: 50,
    distractionFreeMode: false,
    proxy: 'https://www.feiyuhao0729.com/login/oauth/access_token'
  });
  onMounted(() => {
    gitalk.render('gitalk-container');
  });
</script>

<style scoped lang="scss"></style>
