### 实现一个大文件上传和断点续传

### 整体思路

核心利用`Blob.prototype.sice`方法和数组的 slice 方法累死，调用的 slice 方法可以返回原文件的某个切片
然后根据预先设置好的切片数量将文件切分为一个个切片，然后借助 http 的可并性(6 个)，同时上传切片，这样就从原来的大文件，变成了同时上传多个小的文件切片。

`注意`：由于是并发，传输到服务端的顺序可能会发生变化，所以我们还需要给每个切片记录顺序

### 问题延伸

- 上传多个文件时，如何保证上传完成的文件顺序？

- 上传大文件时，利用切片，如果保证上传完成的文件不会丢失？

- 上传大文件时，如何实现断点续传？

- 上传文件切片的核心是？