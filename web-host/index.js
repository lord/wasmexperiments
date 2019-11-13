class Dispatch {
  constructor() {
    // maps process ids to WasmProcess instances
    this.processes = {}
    // maps global channel ids -> {pid, handle}
    this.channels = {}
    this.nextId = 1;
  }

  newProcess(wasmFile) {
    let id = this.nextId;
    this.nextId += 1;

    this.processes[id] = new WasmProcess("out.wasm", id, this);

    return id;
  }

  newChannel(pid, handleA, handleB) {
    let global_a = this.nextId;
    this.nextId += 1;
    let global_b = this.nextId;
    this.nextId += 1;

    this.processes[pid].channels[handleA] = global_a;
    this.processes[pid].channels[handleB] = global_b;

    this.channels[global_a] = {pid, handle: handleA, queue: []};
    this.channels[global_b] = {pid, handle: handleB, queue: []};
  }

  closeChannel(globalId) {
    console.error("unimplemented closeChannel on Dispatch")
  }
}

class WasmProcess {
  constructor(wasmFile, pid, dispatch){
    this.dispatch = dispatch;
    this.pid = pid;
    this.worker = new Worker("/thread.js");
    /// maps internal channel ids to global ids in dispatch
    this.channels = {};
    /// maps ring ids -> ptr structs
    this.rings = {};
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
    // TODO channel create message could come AFTER I/O is enqueued.
    this.dispatch.newChannel(this.pid, a_id, b_id);
  }

  kp_ring_create({ring_id, ptrs}) {
    this.rings[ring_id] = ptrs;
  }

  kp_ring_enter({ring_id}) {
    console.warn("called unimplemented host fn kp_ring_enter:", ring_id)
  }

  kp_generic_close({handle}) {
    if (this.rings[handle]) {
      this.rings[handle] = false;
    } else if (this.channels[handle]) {
      this.dispatch.closeChannel(this.channels[handle])
    } else {
      console.error("attempted to close unknown handle:", handle);
    }
  }
}

let dispatch = new Dispatch()
dispatch.newProcess("out.wasm")
