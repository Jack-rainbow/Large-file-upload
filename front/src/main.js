import { createApp } from 'vue'
import { ElUpload, ElButton, ElMessageBox } from 'element-plus'
import App from './App.vue'

const app = createApp(App)
app.config.globalProperties.$message = ElMessageBox
app.config.globalProperties.$confirm = ElMessageBox.confirm
app.use(ElUpload).use(ElButton)
app.mount('#app')
