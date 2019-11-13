class WasmProcess {
  constructor(wasmFile) {
    this.worker = new Worker("/thread.js");
    this.memory = new WebAssembly.Memory({
      initial: 20,
      maximum: 10000,
      shared: true,
    });
    this.worker.postMessage({wasmFile, memory: this.memory});
    this.worker.onmessage = (e) => {
      this.handleMsg(e.data);
    };
  }

  handleMsg (data) {
    console.log("got msg", data)
  }
}

let p = new WasmProcess("out.wasm")
