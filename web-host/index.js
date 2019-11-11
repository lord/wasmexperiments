function startProcess(wasmFile) {
  let worker = new Worker("/thread.js");
  let memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 1024,
    shared: true,
  });
  worker.postMessage({wasmFile, memory});
}

startProcess("out.wasm")
