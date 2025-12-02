<script setup lang="ts">
import { ref, computed } from 'vue'
import { useImageCompression, type CompressedResult } from '../composables/useImageCompression'

const {
  isCompressing,
  compressionProgress,
  compressImages,
  downloadSingle,
  downloadAll,
  formatSize,
} = useImageCompression()

// 状态管理
const selectedFiles = ref<File[]>([])
const compressedResults = ref<CompressedResult[]>([])
const showSettings = ref(false)
const showResults = ref(false)

// 压缩设置
const quality = ref(92)
const maxWidth = ref(1920)
const format = ref<'webp' | 'jpeg' | 'png'>('webp')

// 文件上传相关
const fileInput = ref<HTMLInputElement>()
const isDragging = ref(false)

// 计算属性
const fileCount = computed(() => selectedFiles.value.length)

const totalStats = computed(() => {
  if (compressedResults.value.length === 0) {
    return {
      originalSize: 0,
      compressedSize: 0,
      ratio: 0,
      saved: 0,
    }
  }

  const originalSize = compressedResults.value.reduce(
    (sum, r) => sum + r.originalSize,
    0
  )
  const compressedSize = compressedResults.value.reduce(
    (sum, r) => sum + r.compressedSize,
    0
  )
  const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1)
  const saved = originalSize - compressedSize

  return {
    originalSize,
    compressedSize,
    ratio,
    saved,
  }
})

// 方法
const handleUploadClick = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  handleFiles(files)
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false

  const files = Array.from(event.dataTransfer?.files || [])
  handleFiles(files)
}

const handleFiles = (files: File[]) => {
  const imageFiles = files.filter((file) => file.type.startsWith('image/'))

  if (imageFiles.length === 0) {
    alert('请选择图片文件！')
    return
  }

  selectedFiles.value = [...selectedFiles.value, ...imageFiles]
  showSettings.value = true
  showResults.value = false
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

const handleCompress = async () => {
  if (selectedFiles.value.length === 0) {
    alert('请先选择图片！')
    return
  }

  try {
    const results = await compressImages(selectedFiles.value, {
      quality: quality.value,
      maxWidth: maxWidth.value,
      format: format.value,
    })

    compressedResults.value = results
    showResults.value = true

    // 滚动到结果区域
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 100)
  } catch (error) {
    console.error('压缩失败:', error)
    alert('压缩失败，请重试！')
  }
}

const handleDownloadAll = async () => {
  try {
    await downloadAll(compressedResults.value, format.value)
  } catch (error) {
    console.error('下载失败:', error)
    alert('下载失败，请重试！')
  }
}

const handleDownloadSingle = (index: number) => {
  downloadSingle(compressedResults.value[index], format.value)
}

const reset = () => {
  selectedFiles.value = []
  compressedResults.value = []
  showSettings.value = false
  showResults.value = false
  quality.value = 92
  maxWidth.value = 1920
  format.value = 'webp'

  if (fileInput.value) {
    fileInput.value.value = ''
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const getCompressionRatio = (result: CompressedResult) => {
  return ((1 - result.compressedSize / result.originalSize) * 100).toFixed(1)
}

const createObjectURL = (file: File | Blob) => {
  return URL.createObjectURL(file)
}
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <!-- 上传区域 -->
    <div class="bg-white rounded-3xl p-10 shadow-2xl mb-8">
      <div
        class="border-4 border-dashed rounded-2xl py-16 px-5 text-center cursor-pointer transition-all duration-300 bg-indigo-50"
        :class="{ 
          'border-purple-600 bg-indigo-100 scale-105': isDragging,
          'border-indigo-500 hover:border-purple-600 hover:bg-indigo-100 hover:-translate-y-0.5': !isDragging
        }"
        @click="handleUploadClick"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <div class="text-xl text-gray-800 mb-2.5">点击或拖拽图片到这里</div>
        <div class="text-gray-600 text-sm">支持 JPG、PNG、WebP 格式</div>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="hidden"
        @change="handleFileSelect"
      />
    </div>

    <!-- 设置区域 -->
    <div v-if="showSettings" class="bg-white rounded-3xl p-8 shadow-2xl mb-8">
      <h2 class="mb-6 text-gray-800 text-2xl font-semibold">压缩设置</h2>
      
      <div class="mb-6">
        <label class="block font-semibold mb-2.5 text-gray-800">
          压缩质量 
          <input
            v-model.number="quality"
            type="number"
            min="1"
            max="100"
            class="w-[70px] px-2 py-1 border-2 border-gray-300 rounded-md text-sm ml-2.5 text-center font-semibold text-gray-800 transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 hover:border-indigo-500"
          />
          <span class="ml-1">%</span>
        </label>
        <input
          v-model.number="quality"
          type="range"
          min="1"
          max="100"
          step="0.1"
        />
        <p class="text-gray-600 text-sm mt-1">
          推荐：90-95%（视觉无损）<br />
          <span class="text-red-500">注意：PNG 格式为无损压缩，质量参数不生效</span>
        </p>
      </div>

      <div class="mb-6">
        <label class="block font-semibold mb-2.5 text-gray-800">
          最大宽度 
          <input
            v-model.number="maxWidth"
            type="number"
            min="100"
            max="8000"
            class="w-[90px] px-2 py-1 border-2 border-gray-300 rounded-md text-sm ml-2.5 text-center font-semibold text-gray-800 transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 hover:border-indigo-500"
          />
          <span class="ml-1">px</span>
        </label>
        <input
          v-model.number="maxWidth"
          type="range"
          min="100"
          max="8000"
          step="10"
        />
        <p class="text-gray-600 text-sm mt-1">
          常用尺寸：1920 (FHD) / 2560 (2K) / 3840 (4K)
        </p>
      </div>

      <div class="mb-6">
        <label class="block font-semibold mb-2.5 text-gray-800">输出格式</label>
        <div class="flex gap-4">
          <label 
            class="flex-1 p-4 border-2 rounded-xl cursor-pointer text-center transition-all duration-300"
            :class="format === 'webp' ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50'"
          >
            <input v-model="format" type="radio" value="webp" class="hidden" />
            <div><strong>WebP</strong></div>
            <div class="text-sm mt-1">最佳压缩</div>
          </label>
          <label 
            class="flex-1 p-4 border-2 rounded-xl cursor-pointer text-center transition-all duration-300"
            :class="format === 'jpeg' ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50'"
          >
            <input v-model="format" type="radio" value="jpeg" class="hidden" />
            <div><strong>JPEG</strong></div>
            <div class="text-sm mt-1">兼容性好</div>
          </label>
          <label 
            class="flex-1 p-4 border-2 rounded-xl cursor-pointer text-center transition-all duration-300"
            :class="format === 'png' ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50'"
          >
            <input v-model="format" type="radio" value="png" class="hidden" />
            <div><strong>PNG</strong></div>
            <div class="text-sm mt-1">无损格式</div>
          </label>
        </div>
      </div>

      <!-- 文件列表 -->
      <div v-if="fileCount > 0" class="mt-8">
        <h3 class="mb-4 text-gray-800 text-lg font-semibold">已选择 <span>{{ fileCount }}</span> 张图片</h3>
        <div class="max-h-[300px] overflow-y-auto">
          <div
            v-for="(file, index) in selectedFiles"
            :key="index"
            class="flex items-center p-3 bg-gray-100 rounded-xl mb-2.5 gap-3"
          >
            <img :src="createObjectURL(file)" :alt="file.name" class="w-12 h-12 object-cover rounded-md" />
            <div class="flex-1">
              <div class="font-semibold text-gray-800 mb-1">{{ file.name }}</div>
              <div class="text-sm text-gray-600">{{ formatSize(file.size) }}</div>
            </div>
            <button 
              class="bg-red-600 text-white border-0 px-3 py-1 rounded-md cursor-pointer text-sm hover:bg-red-700 transition-colors"
              @click="removeFile(index)"
            >
              删除
            </button>
          </div>
        </div>
      </div>

      <div class="flex gap-4 justify-center mt-6">
        <button
          class="px-10 py-4 border-0 rounded-xl text-base font-semibold cursor-pointer transition-all duration-300 inline-flex items-center gap-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-400/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          :disabled="isCompressing || fileCount === 0"
          @click="handleCompress"
        >
          ⚡ 开始批量压缩
        </button>
      </div>
    </div>

    <!-- 加载动画 -->
    <div v-if="isCompressing" class="text-center p-5 bg-white rounded-3xl shadow-2xl mb-8">
      <div class="border-4 border-gray-200 border-t-indigo-500 rounded-full w-12 h-12 animate-spin-custom mx-auto mb-4"></div>
      <p class="text-gray-700">{{ compressionProgress }}</p>
    </div>

    <!-- 对比区域 -->
    <div v-if="showResults" id="comparisonSection" class="bg-white rounded-3xl p-8 shadow-2xl mb-8">
      <h2 class="mb-6 text-gray-800 text-2xl font-semibold">压缩结果</h2>
      
      <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 mb-8">
        <div class="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5 rounded-2xl text-center">
          <div class="text-sm opacity-90 mb-1">原始大小</div>
          <div class="text-3xl font-bold">{{ formatSize(totalStats.originalSize) }}</div>
        </div>
        <div class="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5 rounded-2xl text-center">
          <div class="text-sm opacity-90 mb-1">压缩后大小</div>
          <div class="text-3xl font-bold">{{ formatSize(totalStats.compressedSize) }}</div>
        </div>
        <div class="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5 rounded-2xl text-center">
          <div class="text-sm opacity-90 mb-1">压缩率</div>
          <div class="text-3xl font-bold">{{ totalStats.ratio }}%</div>
        </div>
        <div class="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5 rounded-2xl text-center">
          <div class="text-sm opacity-90 mb-1">节省空间</div>
          <div class="text-3xl font-bold">{{ formatSize(totalStats.saved) }}</div>
        </div>
      </div>

      <!-- 批量结果展示 -->
      <div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5 mb-8">
        <div
          v-for="(result, index) in compressedResults"
          :key="index"
          class="bg-gray-100 rounded-2xl overflow-hidden border-2 border-gray-300"
        >
          <div class="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 font-semibold">
            {{ result.originalFile.name }}
          </div>
          <div class="p-4">
            <img 
              :src="createObjectURL(result.compressedBlob)" 
              :alt="result.originalFile.name" 
              class="w-full h-52 object-cover rounded-xl mb-4"
            />
            <div class="flex justify-between mb-2.5 text-sm">
              <span class="text-gray-600">原始: <strong class="text-gray-800">{{ formatSize(result.originalSize) }}</strong></span>
              <span class="text-gray-600">压缩: <strong class="text-gray-800">{{ formatSize(result.compressedSize) }}</strong></span>
            </div>
            <div class="flex justify-between mb-2.5 text-sm">
              <span class="text-gray-600">压缩率: <strong class="text-gray-800">{{ getCompressionRatio(result) }}%</strong></span>
              <span class="text-gray-600">节省: <strong class="text-gray-800">{{ formatSize(result.originalSize - result.compressedSize) }}</strong></span>
            </div>
            <button 
              class="px-5 py-2 border-0 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-300 inline-flex items-center gap-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-400/40 w-full justify-center"
              @click="handleDownloadSingle(index)"
            >
              💾 下载
            </button>
          </div>
        </div>
      </div>

      <div class="flex gap-4 justify-center">
        <button 
          class="px-10 py-4 border-0 rounded-xl text-base font-semibold cursor-pointer transition-all duration-300 inline-flex items-center gap-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-400/40"
          @click="handleDownloadAll"
        >
          💾 批量下载全部
        </button>
        <button 
          class="px-10 py-4 border-0 rounded-xl text-base font-semibold cursor-pointer transition-all duration-300 inline-flex items-center gap-2.5 bg-gray-600 text-white hover:bg-gray-700 hover:-translate-y-0.5"
          @click="reset"
        >
          🔄 重新上传
        </button>
      </div>
    </div>
  </div>
</template>
