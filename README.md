# C + FFmpeg + wasm + web worker

## 运行

1. `pnpm run vite-build`

2. `pnpm run build`

## 说明

1. JS 调用 C 函数: `Module.cwrap`
2. C 调用 JS 函数: `emscripten_run_script`

## 其他方案

[ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm)
