<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png">
  </div>
</template>

<script>

export default {
  name: 'App',
  components: {

  },
  mounted() {
    let s = document.createElement("script");
    console.log(__dirname);
    s.src = '../public/app.js';
    document.head.appendChild(s);
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
