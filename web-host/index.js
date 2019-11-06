let buffer_location;
let view;
let sleeping = false;
let wasmExports;
var importObject = {
  env: {
    kp_debug_msg: (num) => console.log(num),
    kp_sleep: (time) => {
      if (!sleeping) {
        // We are called in order to start a sleep/unwind.
        // Fill in the data structure. The first value has the stack location,
        // which for simplicity we can start right after the data structure itself.
        view[buffer_location >> 2] = buffer_location + 8;
        // The end of the stack will not be reached here anyhow.
        view[buffer_location + 4 >> 2] = buffer_location + 1024 + 8;
        wasmExports.asyncify_start_unwind(buffer_location);
        sleeping = true;
        // Resume after the proper delay.
        setTimeout(function() {
          wasmExports.asyncify_start_rewind(buffer_location);
          // The code is now ready to rewind; to start the process, enter the
          // first function that should be on the call stack.
          wasmExports.main();
        }, time / 1000);
      } else {
        // We are called as part of a resume/rewind. Stop sleeping.
        wasmExports.asyncify_stop_rewind();
        sleeping = false;
      }
    },
  }
};
fetch('out.wasm').then(response =>
  response.arrayBuffer()
).then(bytes =>
  WebAssembly.instantiate(bytes, importObject)
).then(results => {
  wasmExports = results.instance.exports;
  buffer_location = wasmExports.stack_buffer_alloc(1024 + 8);
  view = new Int32Array(wasmExports.memory.buffer);
  wasmExports.main();
  wasmExports.asyncify_stop_unwind();
});
