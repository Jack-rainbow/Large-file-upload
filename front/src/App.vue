<template>
  <div class="main">
    <upload-file></upload-file>
  </div>
</template>

<script>
import UploadFile from '@/components/upload-file.vue'
export default {
  name: 'App',
  components: {
    [UploadFile.name]: UploadFile,
  },
}
</script>
<style lang="scss">
.main {
  text-align: center;
  background: #fafafa;
  height: 500px;
}
</style>