interface CMsgRetType {
  width: number
  height: number
  duration: number
  imageDataBuffer: Uint8ClampedArray
}

class ImageCapture {
  isMKDIR: boolean
  cCaptureByCount: (info: number, path: string, id: number) => number
  cCaptureByMs: any
  captureInfo: Record<number, number>
  imageList: Record<number, CMsgRetType[]>
  imgDataPtrList: number[]
  imgBufferPtrList: number[]
  constructor() {
    this.isMKDIR = false
    this.cCaptureByCount = null
    this.cCaptureByMs = null // c的方法
    this.imageList = {}
    this.captureInfo = {}
    this.imgDataPtrList = []
    this.imgBufferPtrList = []
  }
  /**
   *
   * @param imgDataPtr
   * @returns
   */
  getImageInfo(imgDataPtr: number): CMsgRetType {
    // 对应 c 中的 结构体 ImageData,
    const width = Module.HEAPU32[imgDataPtr]
    const height = Module.HEAPU32[imgDataPtr + 1]
    const duration = Module.HEAPU32[imgDataPtr + 2]
    const imageBufferPtr = Module.HEAPU32[imgDataPtr + 3]
    const imageBuffer = Module.HEAPU8.slice(imageBufferPtr, imageBufferPtr + width * height * 3)
    //   Module._free(imgDataPtr);
    //   Module._free(imageBufferPtr);
    this.imgDataPtrList.push(imgDataPtr)
    this.imgBufferPtrList.push(imageBufferPtr)

    const imageDataBuffer = new Uint8ClampedArray(width * height * 4)

    let j = 0
    for (let i = 0; i < imageBuffer.length; i++) {
      if (i && i % 3 === 0) {
        imageDataBuffer[j] = 255
        j += 1
      }

      imageDataBuffer[j] = imageBuffer[i]
      j += 1
    }
    return {
      width,
      height,
      duration,
      imageDataBuffer,
    }
  }

  /**
   * 在wasm容器中创建文件
   * @param file      文件
   * @param MOUNT_DIR 文件路径
   * @param id        文件id
   */
  protected mountFile(file: File | Blob, MOUNT_DIR: string, id: number) {
    if (!this.isMKDIR) {
      FS.mkdir(MOUNT_DIR)
      this.isMKDIR = true
    }
    const data: { files?: File[]; blobs?: Array<{ name: string; data: Blob }> } = {}
    let name: string = ''
    // 判断类型 如果是blob转file
    if (file instanceof File) {
      data.files = [file]
      name = file.name
    } else {
      name = `${id}.mp4`
      data.blobs = [{ name, data: file }]
    }

    try {
      FS.mount(WORKERFS, data, MOUNT_DIR)
    } finally {
      return name
    }
  }

  /**
   * 释放内存
   */
  protected free() {
    // 释放指针内存
    this.imgDataPtrList.forEach(ptr => {
      Module._free(ptr)
    })
    this.imgDataPtrList = []
    this.imgBufferPtrList.forEach(ptr => {
      Module._free(ptr)
    })
    this.imgBufferPtrList = []
  }

  /**
   * 截取关键帧
   * @param id    文件id
   * @param info  截取数量
   * @param path  文件存放路径
   * @param file  文件
   */
  capture({
    id,
    info,
    path = '/working',
    file,
  }: {
    id: number
    info: number[] | number
    path: string
    file: File | Blob
  }) {
    try {
      const name = this.mountFile(file, path, id)
      let retData = 0
      this.imageList[id] = []
      if (info instanceof Array) {
        // 说明是按照时间抽
        this.captureInfo[id] = info.length
        if (!this.cCaptureByMs) {
          this.cCaptureByMs = cwrap('captureByMs', 'number', ['string', 'string', 'number'])
        }
        // const imgDataPtr =
        retData = this.cCaptureByMs(info.join(','), `${path}/${name}`, id)
        this.free()
      } else {
        this.captureInfo[id] = info
        if (!this.cCaptureByCount) {
          this.cCaptureByCount = cwrap('captureByCount', 'number', ['number', 'string', 'number'])
        }
        retData = this.cCaptureByCount(info, `${path}/${name}`, id)
        this.free()
        FS.unmount(path)
        // 完善信息 这里需要一种模式 是否只一次性postmsg 不一张张读取
        if (retData === 0) {
          throw new Error('Frame draw exception!')
        }
      }
    } catch (e) {
      console.log('Error occurred', e)
      // 如果发生错误 通知
      self.postMessage({
        type: 'receiveError',
        errmsg: e.toString(),
        id,
      })
    }
  }
}

const imageCapture = new ImageCapture()

type Meta = {
  angle: number
  description: string
}
const metaMap: Record<number, Meta> = {}

function transpostFrame(ptr: number, id: number) {
  // uint32 对应的 TypedArray 数组是 Module.HEAPU32 , 由于是4字节无符号整数，因此js拿到的ptr需除以4（既右移2位）获得正确的索引
  const data = imageCapture.getImageInfo(ptr / 4)
  // push到数组列表
  imageCapture.imageList[id].push({
    ...data,
  })
  self.postMessage({
    type: 'receiveImageOnchange',
    ...data,
    id,
    meta: metaMap[id] || {},
  })
  if (imageCapture.imageList[id].length >= imageCapture.captureInfo[id]) {
    // 说明已经到了数目 可以postonfinish事件
    self.postMessage({
      type: 'receiveImageOnSuccess',
      id,
      meta: metaMap[id] || {},
      // ...imageCapture.imageList[id], // TODO: 这个是否post未确定
    })
  }
}

function setAngle(a: string, id: number) {
  metaMap[id].angle = +a
}

function setDescription(a: string, id: number) {
  metaMap[id].description = a
}

/**
 * exports
 */
self.transpostFrame = transpostFrame
self.setAngle = setAngle
self.setDescription = setDescription

const createPromise = function <T>() {
  let _resolve: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>(resolve => (_resolve = resolve))

  // @ts-ignore
  return [promise, _resolve] as [typeof promise, typeof _resolve]
}

const [initPromise, goOnInit] = createPromise<string>()

let isInit = false

self.addEventListener('message', e => {
  const { type, id, info, path, file } = e.data
  if (type === 'initPath') {
    goOnInit(info as string)
  }
  if (isInit && type === 'startCapture') {
    metaMap[id] = {
      angle: -1,
      description: '',
    }
    imageCapture.capture({
      id,
      info,
      path,
      file,
    })
  }
})
self.Module = {
  instantiateWasm: async (info: WebAssembly.Imports, receiveInstance: (module: WebAssembly.Module) => void) => {
    const url = await initPromise
    fetch(url || './capture.worker.wasm')
      .then(response => response.arrayBuffer())
      .then(bytes => WebAssembly.instantiate(bytes, info))
      .then(instance => receiveInstance(instance.instance))
  },
  onRuntimeInitialized: () => {
    isInit = true
    self.postMessage({
      type: 'init',
      data: {},
    })
  },
}
