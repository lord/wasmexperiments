class Instance {
  constructor(bytes) {
    this.wasmBytes = bytes;
    this.instance = null;

    this.rewind_buffer_ptr = null;
    this.rewind_view = null;
    this.rewind_active = false;
    this.rewind_return_val = null;
  }
  wrap_async(async_fn) {
    if (this.rewind_active) {
      this.rewind_active = false;
      this.instance.exports.asyncify_stop_rewind();
      return this.rewind_return_val
    }
    // pointer to start of temp buffer
    this.rewind_view[this.rewind_buffer_ptr >> 2] = this.rewind_buffer_ptr + 8;
    // pointer to end of temp buffer
    this.rewind_view[this.rewind_buffer_ptr + 4 >> 2] = this.rewind_buffer_ptr + 1024 + 8;

    this.instance.exports.asyncify_start_unwind(this.rewind_buffer_ptr);

    async_fn().then((res) => {
      this.rewind_return_val = res;
      this.rewind_active = true;
      this.instance.exports.asyncify_start_rewind(this.rewind_buffer_ptr);
      this.instance.exports.main();
    })
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
      "kp_debug_msg",
      "kp_sleep",
    ].forEach(fn => {env[fn] = (...args) => this[fn](...args)});
    let results = await WebAssembly.instantiate(this.wasmBytes, {env});
    this.instance = results.instance;
    this.rewind_buffer_ptr = this.instance.exports.stack_buffer_alloc(1024 + 8);
    this.rewind_view = new Int32Array(this.instance.exports.memory.buffer);
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
