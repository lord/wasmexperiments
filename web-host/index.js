function startProcess(wasmFile) {
  let worker = new Worker("/thread.js");
  let memory = new WebAssembly.Memory({
    initial: 20,
    maximum: 10000,
    shared: true,
  });
  worker.postMessage({wasmFile, memory});
  worker.onmessage = (e) => {
    console.log("got msg:", e.data)
  };
  window.mem = () => new Int32Array(memory.buffer)
}

startProcess("out.wasm")
