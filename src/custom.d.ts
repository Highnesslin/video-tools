// / <reference types="emscripten" />
declare module '*.worker.ts' {
  class CaptureWorker extends Worker {
      constructor();
  }

  export default CaptureWorker;
}

declare const Module: EmscriptenModule;

interface Window {
  Module: {
    instantiateWasm: EmscriptenModule.instantiateWasm
    onRuntimeInitialized: () => void
  };
  goOnInit: (url: URL | string) => void;
}

declare const WORKERFS: {
    DIR_MODE: number;
    FILE_MODE: number;
    reader: unknown;
    mount: unknown;
}
