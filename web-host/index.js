function startProcess(wasmFile) {
  let worker = new Worker("/thread.js");
  let memory = new WebAssembly.Memory({
    initial: 17,
    maximum: 10000,
    shared: true,
  });
  worker.postMessage({wasmFile, memory});
  worker.onmessage = (e) => {
    console.log("got msg:", e.data)
  };
}

startProcess("out.wasm")
