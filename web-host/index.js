function startProcess(wasmFile) {
  let worker = new Worker("/thread.js");
  worker.postMessage({wasmFile});
}

startProcess("out.wasm")
