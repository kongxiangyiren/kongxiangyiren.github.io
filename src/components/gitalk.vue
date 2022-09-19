<template>
  <div id="gitalk-container"></div>
</template>

<script setup lang="ts">
  import 'gitalk/dist/gitalk.css';
  import Gitalk from 'gitalk';

  let gitalk = new Gitalk({
    id:
      location.pathname[location.pathname.length - 1] === '/'
        ? location.pathname + location.search
        : location.pathname + '/' + location.search,
    clientID: 'ec80f8d5535a10722a9b',
    clientSecret: '172a10e063464cc41bb6e30c675302657f40f289',
    repo: 'kongxiangyiren.github.io',
    owner: 'kongxiangyiren', //
    admin: ['kongxiangyiren'], //github用户名
    labels: ['评论'],
    perPage: 50,
    distractionFreeMode: false,
    // https://dash.cloudflare.com/
    proxy: 'https://cors-anywhere.herokuapp.com/https://github.com/login/oauth/access_token'
  });
  onMounted(() => {
    gitalk.render('gitalk-container');
  });
</script>

<style scoped lang="scss">
  #gitalk-container {
    margin: 30px auto;
  }
</style>
