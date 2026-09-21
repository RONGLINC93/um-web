<template>
  <el-container id="app">
    <el-main>
      <Home />
    </el-main>
  </el-container>
</template>

<script>
import Home from '@/view/Home';

export default {
  name: 'app',
  components: {
    Home,
  },
  created() {
    this.$nextTick(() => this.finishLoad());
  },
  methods: {
    finishLoad() {
      const mask = document.getElementById('loader-mask');
      if (!!mask) mask.remove();
    },
  },
};
</script>

<style lang="scss">
@import 'scss/unlock-music';
</style>
