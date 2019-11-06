class Instance {
  constructor(bytes) {
    this.wasmBytes = bytes;
    this.instance = null;
    this.buffer_ptr = null;
    this.view = null;
    this.sleeping = false;
  }
  async build() {
    let importObject = {
      env: {
        kp_debug_msg: (num) => console.log(num),
        kp_sleep: (time) => {
          if (!this.sleeping) {
            // We are called in order to start a sleep/unwind.
            // Fill in the data structure. The first value has the stack location,
            // which for simplicity we can start right after the data structure itself.
            this.view[this.buffer_ptr >> 2] = this.buffer_ptr + 8;
            // The end of the stack will not be reached here anyhow.
            this.view[this.buffer_ptr + 4 >> 2] = this.buffer_ptr + 1024 + 8;
            this.instance.exports.asyncify_start_unwind(this.buffer_ptr);
            this.sleeping = true;
            // Resume after the proper delay.
            setTimeout(() => {
              this.instance.exports.asyncify_start_rewind(this.buffer_ptr);
              // The code is now ready to rewind; to start the process, enter the
              // first function that should be on the call stack.
              this.instance.exports.main();
            }, time / 1000);
          } else {
            // We are called as part of a resume/rewind. Stop sleeping.
            this.instance.exports.asyncify_stop_rewind();
            this.sleeping = false;
          }
        },
      }
    };
    let results = await WebAssembly.instantiate(this.wasmBytes, importObject);
    this.instance = results.instance;
    this.buffer_ptr = this.instance.exports.stack_buffer_alloc(1024 + 8);
    this.view = new Int32Array(this.instance.exports.memory.buffer);
    this.instance.exports.main();
    this.instance.exports.asyncify_stop_unwind();
  }
}

fetch('out.wasm').then(response =>
  response.arrayBuffer()
).then(bytes => {
  let instance = new Instance(bytes);
  instance.build();
})
