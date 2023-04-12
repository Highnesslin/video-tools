import { Events } from './consts'

let captureWorker: Worker | null = null

function workerPost(info: { type: string; [key: string]: unknown }) {
  captureWorker && captureWorker.postMessage({ ...info })
}

async function initWorker(url: URL, wasmPath: URL): Promise<Worker> {
  if (captureWorker) {
    return captureWorker
  }
  captureWorker = new Worker(url)
  workerPost({
    type: 'initPath',
    info: wasmPath.toString(),
  })
  const promise = new Promise<Worker>(resolve => {
    captureWorker &&
      captureWorker.addEventListener('message', ({ data }) => {
        if (data.type === 'init') {
          // wasm初始化完毕
          resolve(captureWorker as Worker)
        }
      })
  })
  return promise
}
interface PrevType {
  url: string[]
  blob?: Blob[]
}
interface nowType {
  url: string
  blob?: Blob
}
interface MetaDatatype {
  description: string
}
interface CallbackType {
  onChange?: (prev: PrevType, now: nowType, info: { width: number; height: number; duration: number }) => void
  onSuccess?: (prev: PrevType & { meta: MetaDatatype }) => void
  onError?: (errmeg: string) => void
}
interface MapInfoType extends CallbackType {
  url: string[]
}
interface CaptureInfo extends CallbackType {
  info: number[] | number
  path?: string
  file: File
  returnType?: 'blob' | 'base64' // 默认blob
}

function createRequest() {
  let currentId = 0
  const map: Map<number, MapInfoType> = new Map()
  return {
    // 获取视频唯一id
    setFrameCallback(item: CallbackType) {
      const id = ++currentId
      map.set(currentId, {
        ...item,
        url: [],
      })
      return id
    },
    // 设置
    getCbk(idx: number) {
      return map.get(idx) as MapInfoType
    },
  }
}
const pool = createRequest()
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')!

function rotateImage(imageData: ImageData, direction = 'l') {
  const H = imageData.height
  const W = imageData.width
  const imgDt1 = new ImageData(H, W)
  const imgDt2 = new ImageData(H, W)
  const dt0 = imageData.data
  const dt1 = imgDt1.data
  const dt2 = imgDt2.data

  // 2. Transposex
  let r = 0
  let r1 = 0 // index of red pixel in old and new ImageData, respectively
  for (let y = 0, lenH = H; y < lenH; y++) {
    for (let x = 0, lenW = W; x < lenW; x++) {
      r = (x + lenW * y) * 4
      r1 = (y + lenH * x) * 4
      dt1[r1 + 0] = dt0[r + 0]
      dt1[r1 + 1] = dt0[r + 1]
      dt1[r1 + 2] = dt0[r + 2]
      dt1[r1 + 3] = dt0[r + 3]
    }
  }

  // 3. Reverse width / height
  for (let y = 0, lenH = W; y < lenH; y++) {
    for (let x = 0, lenW = H; x < lenW; x++) {
      r = (x + lenW * y) * 4
      r1 = direction === 'l' ? (x + lenW * (lenH - 1 - y)) * 4 : (lenW - 1 - x + lenW * y) * 4
      dt2[r1 + 0] = dt1[r + 0]
      dt2[r1 + 1] = dt1[r + 1]
      dt2[r1 + 2] = dt1[r + 2]
      dt2[r1 + 3] = dt1[r + 3]
    }
  }
  return imgDt2
}

async function getUrl(
  width: number,
  height: number,
  imageDataBuffer: Uint8ClampedArray,
  angle: number
): Promise<{ url: string; blob?: Blob }> {
  let canvasWith = width
  let canvasHeight = height
  const imageData = new ImageData(imageDataBuffer, width, height)
  let imgData = null
  switch (angle / 90) {
    case 1:
      imgData = rotateImage(imageData, 'r')
      canvasWith = height
      canvasHeight = width
      break
    case 2:
      imgData = rotateImage(imageData, 'r')
      imgData = rotateImage(imageData, 'r')
      break
    case 3:
      imgData = rotateImage(imageData, 'l')
      canvasWith = height
      canvasHeight = width
      break
    default:
      imgData = imageData
      break
  }
  canvas.width = canvasWith
  canvas.height = canvasHeight
  ctx.putImageData(imgData, 0, 0, 0, 0, canvasWith, canvasHeight)
  // const blob = new Blob([imageDataBuffer.buffer], {type: 'image/png'} /* (1) */);
  return {
    url: canvas.toDataURL('image/jpeg'),
    // blob: blob,
  }
}

async function initialize({ workerPath, wasmPath }: { workerPath: URL; wasmPath: URL }) {
  const worker = await initWorker(workerPath, wasmPath)

  worker.addEventListener('message', async ({ data }) => {
    switch (data.type) {
      case Events.receiveImageOnchange: {
        const { imageDataBuffer, width, height, duration, id, meta = {} } = data || {}
        const { angle = 0 } = meta
        const img = await getUrl(width, height, imageDataBuffer, angle)
        const { onChange, url } = pool.getCbk(id)
        const info = { width, height, duration: duration / 1000000 }
        onChange && onChange({ url }, img, info)
        url.push(img.url)
        break
      }
      case Events.receiveImageOnSuccess: {
        const { id, meta } = data || {}
        const { onSuccess, url } = pool.getCbk(id)
        onSuccess && onSuccess({ url, meta })
        break
      }
      case Events.receiveError: {
        const { errmsg, id } = data || {}
        const { onError } = pool.getCbk(id)
        onError && onError(errmsg)
        break
      }
    }
  })

  return {
    capture(data: CaptureInfo) {
      const { info, path, file, ...func } = data
      const id = pool.setFrameCallback(func)

      workerPost({
        type: Events.startCapture,
        id,
        info,
        path,
        file,
      })
    },
  }
}

export default {
  initialize
}