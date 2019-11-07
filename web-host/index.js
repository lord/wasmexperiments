class Instance {
  constructor(bytes) {
    this.wasmBytes = bytes;
    this.instance = null;
    this.memoryView = null;

    this.channels = {};
    this.nextHandleId = 1;

    this.rewindBufferPtr = null;
    this.rewindActive = false;
    this.rewindReturnValue = null;
  }
  getUInt32(ptr) {
    let n = 0;
    n += this.memoryView[ptr+3];
    n = n << 8;
    n += this.memoryView[ptr+2];
    n = n << 8;
    n += this.memoryView[ptr+1];
    n = n << 8;
    n += this.memoryView[ptr+0];
    return n;
  }
  setUInt32(ptr, value) {
    this.memoryView[ptr+3] = (0xFF000000 & value) >> (8*3);
    this.memoryView[ptr+2] = (0x00FF0000 & value) >> (8*2);
    this.memoryView[ptr+1] = (0x0000FF00 & value) >> 8;
    this.memoryView[ptr+0] = (0x000000FF & value);
  }
  wrap_async(async_fn) {
    if (this.rewindActive) {
      this.rewindActive = false;
      this.instance.exports.asyncify_stop_rewind();
      return this.rewindReturnValue
    }
    // pointer to start of temp buffer
    this.setUInt32(this.rewindBufferPtr, this.rewindBufferPtr + 8)
    // pointer to end of temp buffer
    this.setUInt32(this.rewindBufferPtr + 4, this.rewindBufferPtr + 8 + 1024)

    this.instance.exports.asyncify_start_unwind(this.rewindBufferPtr);

    async_fn().then((res) => {
      this.rewindReturnValue = res;
      this.rewindActive = true;
      this.instance.exports.asyncify_start_rewind(this.rewindBufferPtr);
      this.instance.exports.main();
    })
  }
  handleMessage(receivingHandleId, msg) {
    console.error("call to unimplemented function handleMessage")
  }
  kp_channel_create(handle_a_ptr, handle_b_ptr) {
    const idA = this.nextHandleId;
    this.nextHandleId += 1;
    const idB = this.nextHandleId;
    this.nextHandleId += 1;

    let channel = new MessageChannel();
    this.channels[idA] = channel.port1;
    this.channels[idB] = channel.port2;
    this.channels[idA].onmessage = (e) => this.handleMessage(idA, e.data);
    this.channels[idB].onmessage = (e) => this.handleMessage(idB, e.data);
  }
  kp_channel_write() {
    console.error("call to unimplemented function kp_channel_write")
  }
  kp_channel_read() {
    console.error("call to unimplemented function kp_channel_read")
  }
  kp_pollgroup_create() {
    console.error("call to unimplemented function kp_pollgroup_create")
  }
  kp_pollgroup_insert() {
    console.error("call to unimplemented function kp_pollgroup_insert")
  }
  kp_pollgroup_wait() {
    console.error("call to unimplemented function kp_pollgroup_wait")
  }
  kp_pollgroup_cancel() {
    console.error("call to unimplemented function kp_pollgroup_cancel")
  }
  kp_generic_close() {
    console.error("call to unimplemented function kp_generic_close")
  }
  kp_sleep(ns) {
    this.wrap_async(() => {
      return new Promise(resolve => setTimeout(resolve, ns / 1000))
    })
  }
  kp_debug_msg(num) {
    console.log(num)
  }
  async run_main() {
    let env = {};
    [
      "kp_channel_create",
      "kp_channel_write",
      "kp_channel_read",
      "kp_pollgroup_create",
      "kp_pollgroup_insert",
      "kp_pollgroup_wait",
      "kp_pollgroup_cancel",
      "kp_generic_close",
      "kp_sleep",
      "kp_debug_msg",
    ].forEach(fn => {env[fn] = (...args) => this[fn](...args)});
    let results = await WebAssembly.instantiate(this.wasmBytes, {env});
    this.instance = results.instance;
    this.rewindBufferPtr = this.instance.exports.stack_buffer_alloc(1024 + 8);
    this.memoryView = new Uint8Array(this.instance.exports.memory.buffer);
    this.instance.exports.main();
    this.instance.exports.asyncify_stop_unwind();
  }
}

fetch('out.wasm').then(response =>
  response.arrayBuffer()
).then(bytes => {
  let instance = new Instance(bytes);
  instance.run_main();
})
