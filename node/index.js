const http = require('http')
const path = require('path')
const fse = require('fs-extra')
const multiparty = require('multiparty')

const server = http.createServer()

// 大文件存储目录
const UPLOAD_DIR = path.resolve(__dirname, '.', 'target')

// 合并切片--------接收请求到的内容
const resolvePost = (req) => {
	return new Promise((resolve) => {
		let chunk = ''
		req.on('data', (data) => {
			chunk += data
		})
		req.on('end', () => {
			// 将chunk转换为 json
			resolve(JSON.parse(chunk))
		})
	})
}
// TODO 管流  具体作用？？
const pipeStream = (path, writeStream) =>
	new Promise((resolve) => {
		// 创建可读流，传输合并到目标文件中
		const readStream = fse.createReadStream(path)
		readStream.on('end', () => {
			fse.unlinkSync(path)
			resolve()
		})
		readStream.pipe(writeStream)
	})
/**
 * @desc: 合并切片
 * @param {*} filePath  文件路径
 * @param {*} fileName 文件名称
 * @param {*} size 文件大小
 */
const mergeFileChunk = async (filePath, fileName, size) => {
	const chunkDir = path.resolve(UPLOAD_DIR, fileName)
	const chunkPaths = await fse.readdir(chunkDir)

	// 根据切片下标进行排序
	// 否则直接读取目录的获得的顺序可能会错乱
	chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1])
	try {
		await Promise.all(
			chunkPaths.map((chunkPath, index) =>
				pipeStream(
					path.resolve(chunkDir, chunkPath),
					// 指定位置创建可写流
					fse.createWriteStream(filePath, {
						start: index * size,
						end: (index + 1) * size,
					})
				)
			)
		)
	} catch (error) {
		console.log(error, '合并切片')
	}
	// 合并后删除保存切片的目录
	fse.rmdirSync(chunkDir)
}

//接收请求
server.on('request', async (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Headers', '*')
	if (req.method === 'OPTIONS') {
		res.status = 200
		res.end()
		return
	}
	if (req.url === '/merge') {
		try {
			const data = await resolvePost(req)
			const { filename, size } = data
			const filePath = path.resolve(UPLOAD_DIR, `${filename}`)
			// TODO 合并出现bug~~~~~~~~~~
			await mergeFileChunk(filePath, filename, size)
			res.end(
				JSON.stringify({
					code: '0',
					message: '合并成功！！',
				})
			)
		} catch (error) {
			console.log(error, 'error')
		}
	}

	if (req.url === '/') {
		const multipart = new multiparty.Form()
		/**
		 * @desc:
		 * @param {*} err 错误信息
		 * @param {*} fields  每个切片的chunk和hash
		 * @param {*} files  files是一个对象，其中属性名是字段名，值是文件对象的数组进入翻译页面
		 */
		multipart.parse(req, async (err, fields, files) => {
			if (err) {
				return
			}
			const [chunk] = files.chunk
			const [hash] = fields.hash
			const [filename] = fields.filename
			const chunkDir = path.resolve(UPLOAD_DIR, filename)
			// 切片目录不存在，创建切片目录
			if (!fse.existsSync(chunkDir)) {
				try {
					await fse.mkdirs(chunkDir)
				} catch (error) {
					console.log(error, '创建切片存放目录')
				}
			}
			// fs-extra 专用方法，类似 fs.rename 并且跨平台
			// fs-extra 的 rename 方法 windows 平台会有权限问题
			// https://github.com/meteor/meteor/issues/7852#issuecomment-255767835
			try {
				await fse.move(chunk.path, `${chunkDir}/${hash}`)
			} catch (error) {
				console.log(error, '移除切片存放的目录')
			}
			res.end('切片上传完成。')
		})
	}
})

server.listen(3000, () => console.log('正在监听 3000 端口'))
