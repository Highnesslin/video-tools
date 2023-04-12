import React, { lazy, useState } from 'react'
import cheetahCapture from '../src/index'
import VideoPreviewer from './VideoPreviewer'

const Demo = lazy(async () => {
  const instance = await cheetahCapture.initialize({
    workerPath: new URL(location.origin + '/dist/capture.worker.js'),
    wasmPath: new URL(location.origin + '/dist/capture.worker.wasm'),
  })

  return {
    default: () => {
      const [preview, setPreview] = useState<string[]>([])
      const [text, setText] = useState('')

      const handleChange: React.ChangeEventHandler<HTMLInputElement> = async e => {
        if (!e.target.files || !e.target.files.length) return

        const [file] = e.target.files

        const startTime = Date.now()

        instance.capture({
          file,
          info: 11,
          onChange: (list, now, info) => {
            console.log('==>onchange', list, now, info)
            const { width, height, duration } = info
            setText(`耗时：${Date.now() - startTime}ms<br>宽度：${width}<br>高度：${height}<br>时长：${duration}s`)
          },
          onSuccess: list => {
            console.log('==>onSuccess', list)
            setPreview(list.url)
          },
        })
      }

      return (
        <>
          <input type='file' onChange={handleChange} />
          <div
            dangerouslySetInnerHTML={{
              __html: text,
            }}
          />
          {!!preview.length && <VideoPreviewer imgs={preview} />}
        </>
      )
    },
  }
})

export default Demo
