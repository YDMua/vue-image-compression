import { ref } from 'vue'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export interface CompressedResult {
  originalFile: File
  compressedBlob: Blob
  originalSize: number
  compressedSize: number
}

export interface CompressionOptions {
  quality: number
  maxWidth: number
  format: 'webp' | 'jpeg' | 'png'
}

export function useImageCompression() {
  const isCompressing = ref(false)
  const compressionProgress = ref('')

  /**
   * 检测图片是否有透明度
   */
  const hasTransparency = (img: HTMLImageElement): boolean => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return false

    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          return true
        }
      }
    } catch (e) {
      return false
    }

    return false
  }

  /**
   * 执行图片压缩
   */
  const performCompression = (
    file: File,
    quality: number,
    maxWidth: number,
    format: 'webp' | 'jpeg' | 'png'
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const img = new Image()

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              reject(new Error('无法创建 Canvas 上下文'))
              return
            }

            // 计算缩放后的尺寸
            let width = img.width
            let height = img.height

            if (width > maxWidth) {
              height = Math.round((maxWidth / width) * height)
              width = maxWidth
            }

            canvas.width = width
            canvas.height = height

            // 使用高质量渲染设置
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'

            // 根据格式处理背景
            if (format === 'png') {
              // PNG 保持透明背景
            } else if (format === 'jpeg') {
              // JPEG 不支持透明，填充白色背景
              ctx.fillStyle = '#FFFFFF'
              ctx.fillRect(0, 0, width, height)
            } else if (format === 'webp') {
              // WebP 支持透明，但如果原图没有透明度，填充白色
              if (!hasTransparency(img)) {
                ctx.fillStyle = '#FFFFFF'
                ctx.fillRect(0, 0, width, height)
              }
            }

            // 绘制图片
            ctx.drawImage(img, 0, 0, width, height)

            // 根据格式转换
            let mimeType: string
            switch (format) {
              case 'webp':
                mimeType = 'image/webp'
                break
              case 'jpeg':
                mimeType = 'image/jpeg'
                break
              case 'png':
                mimeType = 'image/png'
                break
              default:
                mimeType = 'image/jpeg'
            }

            // PNG 格式不支持 quality 参数（无损格式）
            const blobQuality = format === 'png' ? undefined : quality

            // 转换为 Blob
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob)
                } else {
                  reject(new Error('转换失败'))
                }
              },
              mimeType,
              blobQuality
            )
          } catch (error) {
            reject(error)
          }
        }

        img.onerror = () => {
          reject(new Error('图片加载失败'))
        }

        img.src = e.target?.result as string
      }

      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }

      reader.readAsDataURL(file)
    })
  }

  /**
   * 批量压缩图片
   */
  const compressImages = async (
    files: File[],
    options: CompressionOptions
  ): Promise<CompressedResult[]> => {
    isCompressing.value = true
    const results: CompressedResult[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        compressionProgress.value = `正在压缩 ${i + 1}/${files.length}...`

        const compressedBlob = await performCompression(
          file,
          options.quality / 100,
          options.maxWidth,
          options.format
        )

        results.push({
          originalFile: file,
          compressedBlob,
          originalSize: file.size,
          compressedSize: compressedBlob.size,
        })
      }

      return results
    } finally {
      isCompressing.value = false
      compressionProgress.value = ''
    }
  }

  /**
   * 下载单个图片
   */
  const downloadSingle = (result: CompressedResult, format: string) => {
    const extension = format === 'jpeg' ? 'jpg' : format
    const originalName = result.originalFile.name.split('.')[0]
    const fileName = `${originalName}_compressed.${extension}`

    const url = URL.createObjectURL(result.compressedBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * 批量下载所有图片（打包成 ZIP）
   */
  const downloadAll = async (results: CompressedResult[], format: string) => {
    if (results.length === 0) {
      throw new Error('没有可下载的图片')
    }

    // 如果只有一张图片，直接下载
    if (results.length === 1) {
      downloadSingle(results[0], format)
      return
    }

    try {
      compressionProgress.value = '正在打包...'

      const zip = new JSZip()
      const extension = format === 'jpeg' ? 'jpg' : format

      // 添加所有图片到 ZIP
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const originalName = result.originalFile.name.split('.')[0]
        const fileName = `${originalName}_compressed.${extension}`

        zip.file(fileName, result.compressedBlob)
        compressionProgress.value = `打包中 ${i + 1}/${results.length}`
      }

      // 生成 ZIP 文件
      compressionProgress.value = '生成压缩包...'
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6,
        },
      })

      // 下载 ZIP 文件
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const zipFileName = `compressed_images_${timestamp}.zip`

      saveAs(zipBlob, zipFileName)
    } finally {
      compressionProgress.value = ''
    }
  }

  /**
   * 格式化文件大小
   */
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) {
      return bytes + ' B'
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB'
    } else {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    }
  }

  return {
    isCompressing,
    compressionProgress,
    compressImages,
    downloadSingle,
    downloadAll,
    formatSize,
  }
}
