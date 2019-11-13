class Dispatch {
  constructor() {
    // maps process ids to WasmProcess instances
    this.processes = {}
    // maps global channel ids to 
    this.channels = {}
    this.nextId = 1;
  }

  newProcess(wasmFile) {
    let id = this.nextId;
    this.nextId += 1;

    this.processes[id] = new WasmProcess("out.wasm");

    return id;
  }
}

class WasmProcess {
  constructor(wasmFile, dispatch){
    this.dispatch = dispatch;
    this.worker = new Worker("/thread.js");
    this.channels = {};
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
    if (data.msg === "kp_channel_create") {
      this.kp_channel_create(data)
    } else if (data.msg === "kp_ring_create") {
      this.kp_ring_create(data)
    } else if (data.msg === "kp_ring_enter") {
      this.kp_ring_enter(data)
    } else if (data.msg === "kp_generic_close") {
      this.kp_generic_close(data)
    } else {
      console.error("unknown msg:", data)
    }
  }

  kp_channel_create({a_id, b_id}) {
    console.warn("called unimplemented host fn kp_channel_create:", a_id, b_id)
  }

  kp_ring_create({ring_id, ptrs}) {
    console.warn("called unimplemented host fn kp_ring_create:", ring_id, ptrs)
  }

  kp_ring_enter({ring_id}) {
    console.warn("called unimplemented host fn kp_ring_enter:", ring_id)
  }

  kp_generic_close({handle}) {
    console.warn("called unimplemented host fn kp_generic_close:", handle)
  }
}

let dispatch = new Dispatch()
dispatch.newProcess("out.wasm")
