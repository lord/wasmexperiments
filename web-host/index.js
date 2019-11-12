function startProcess(wasmFile) {
  let worker = new Worker("/thread.js");
  let memory = new WebAssembly.Memory({
    initial: 17,
    maximum: 10000,
    shared: true,
  });
  worker.postMessage({wasmFile, memory});
}

startProcess("out.wasm")
