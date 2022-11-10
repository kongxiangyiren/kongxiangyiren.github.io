<template></template>

<script setup lang="ts">
  const $route = useRoute();
  //   console.log($route.query.path);
  if ($route.query.path?.slice(0, 4) === 'http') {
    location.href = $route.query.path as string;
  }
</script>

<style scoped lang="scss"></style>
