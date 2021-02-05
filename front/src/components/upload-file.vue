<template>
  <el-upload class="upload-file"
    :action="actions"
    :on-preview="handlePreview"
    :on-remove="handleRemove"
    :before-remove="beforeRemove"
    multiple
    :limit="3"
    :on-exceed="handleExceed"
    :http-request="httpRequest"
    :on-change="handleChange"
    :file-list="fileList">
    <img v-if="imageUrl"
      :src="imageUrl"
      class="avatar">
    <i v-else
      class="el-icon-plus upload-file-icon"></i>
    <template #tip>
      <div class="el-upload__tip">只能上传 jpg/png 文件，且不超过 500kb</div>
    </template>
  </el-upload>
  <el-button @click="handleUpload"
    type="primary">上传</el-button>
</template>

<script>
import { ref, reactive, getCurrentInstance } from 'vue'
import request from '@/http'
export default {
  name: 'upload-file',
  props: {
    // 必选参数，上传的地址
    action: {
      type: String,
      default: '',
      required: true,
    },
    // 上传时附带的额外参数
    data: {
      type: Object,
      default: () => ({}),
    },
    //是否在选取文件后立即进行上传
    autoUpload: {
      type: Boolean,
      default: true,
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      default: false,
    },
    // 文件列表的类型
    listType: {
      type: String,
      default: '',
    },
    // 上传的文件字段名
    name: {
      type: String,
      default: 'file',
    },
    // 切片大小
    fileSize: {
      type: Number,
      default: 10 * 1024 * 1024,
    },
    httpRequest: {
      type: Function,
      default: () => {},
    },
  },
  setup(props) {
    //getCurrentInstance 获取当前组件实例(根节点)
    const { ctx } = getCurrentInstance()
    let fileList = ref([])
    let container = reactive({
      file: null,
      data: [],
    })
    /**
    upload-file方法
     */
    const handleRemove = () => {
      container.file = null
      fileList = []
    }
    const handlePreview = (file) => {
      console.log(file)
    }
    const handleExceed = (files, fileList) => {
      ctx.$message.warning(
        `当前限制选择 3 个文件，本次选择了 ${files.length} 个文件，共选择了 ${
          files.length + fileList.length
        } 个文件`
      )
    }
    const beforeRemove = (file) => {
      return ctx.$confirm(`确定移除 ${file.name}？`)
    }

    // 文件状态改变时的钩子，添加文件、上传成功和上传失败时都会被调用
    const handleChange = (response) => {
      console.log(response, 'response')
      const file = response.raw
      if (!file) return
      container.file = file
    }

    // 上传文件按钮
    const handleUpload = async () => {
      if (!container.file) return
      const fileChunkList = generFileChunk(container.file)
      container.data = fileChunkList.map(({ file }, index) => ({
        chunk: file,
        hash: container.file.name + '-' + index, // 文件名 + 数组下标
      }))

      await uploadChunks()
    }

    // 生成文件chunk
    const generFileChunk = (file, size = props.fileSize) => {
      // 文件chunk集合
      const fileChunkList = []
      let cur = 0
      while (cur < file.size) {
        //   截取切片大小
        fileChunkList.push({ file: file.slice(cur, cur + size) })
        cur += size
      }
      return fileChunkList
    }
    // 上传文件所有chunk
    const uploadChunks = async () => {
      const requestList = container.data
        .map(({ chunk, hash }) => {
          console.log(chunk, hash)
          // 每个切片一个标识作为 hash
          // 这样后端可以知道当前切片是第几个切片，用于之后的合并切片
          const formData = new FormData()
          formData.append('chunk', chunk)
          formData.append('hash', hash)
          formData.append('filename', container.file.name)
          return { formData }
        })
        .map(({ formData }) => {
          // 请求后端接口
          request({
            url: 'http://localhost:3000',
            method: 'post',
            data: formData,
          })
        })

      await Promise.all(requestList) // 并发切片

      // 之前上传的切片数量 + 本次上传的切片数量 = 所有切片数量时
      // 合并切片
      console.log(container.data, 'container')
      console.log(mergeRequest)
      //   if(){
      await mergeRequest()
      //   }
    }

    // 合并切片
    const mergeRequest = async () => {
      await request({
        url: 'http://localhost:3000/merge',
        headers: {
          'content-type': 'application/json',
        },
        data: JSON.stringify({
          size: props.fileSize,
          fileHash: container.hash,
          filename: container.file.name,
        }),
      })
      ctx.$message.success('上传成功')
    }

    return {
      imageUrl: ref(''),
      fileList,
      handleRemove,
      handlePreview,
      handleExceed,
      beforeRemove,
      handleUpload,
      handleChange,
      actions: props.action,
      'http-request': props.httpRequest,
    }
  },
}
</script>

<style scoped lang="scss">
.upload-file {
  &::v-deep {
    .el-upload {
      border: 1px dashed red;
      border-radius: 6px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      &:hover {
        border-color: #409eff;
      }
    }
  }
  &-icon {
    font-size: 28px;
    color: #8c939d;
    width: 178px;
    height: 178px;
    line-height: 178px;
    text-align: center;
  }
}

.avatar {
  width: 178px;
  height: 178px;
  display: block;
}
</style>
