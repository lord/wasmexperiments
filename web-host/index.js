class Instance {
  constructor(bytes) {
    this.wasmBytes = bytes;
    this.instance = null;

    this.rewindBufferPtr = null;
    this.rewindView = null;
    this.rewindActive = false;
    this.rewindReturnValue = null;
  }
  wrap_async(async_fn) {
    if (this.rewindActive) {
      this.rewindActive = false;
      this.instance.exports.asyncify_stop_rewind();
      return this.rewindReturnValue
    }
    // pointer to start of temp buffer
    this.rewindView[this.rewindBufferPtr >> 2] = this.rewindBufferPtr + 8;
    // pointer to end of temp buffer
    this.rewindView[this.rewindBufferPtr + 4 >> 2] = this.rewindBufferPtr + 1024 + 8;

    this.instance.exports.asyncify_start_unwind(this.rewindBufferPtr);

    async_fn().then((res) => {
      this.rewindReturnValue = res;
      this.rewindActive = true;
      this.instance.exports.asyncify_start_rewind(this.rewindBufferPtr);
      this.instance.exports.main();
    })
  }
  kp_channel_create() {
    console.error("call to unimplemented function kp_channel_create")
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
    this.rewindView = new Int32Array(this.instance.exports.memory.buffer);
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
