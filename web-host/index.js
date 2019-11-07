class Instance {
  constructor(bytes) {
    this.wasmBytes = bytes;
    this.instance = null;
    this.memoryView = null;

    this.channels = {};
    this.pollgroups = {};
    this.nextHandleId = 1;

    this.rewindBufferPtr = null;
    this.rewindActive = false;
    this.rewindReturnValue = null;
  }
  getUint32(ptr) {
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
  setUint32(ptr, value) {
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
    this.setUint32(this.rewindBufferPtr, this.rewindBufferPtr + 8)
    // pointer to end of temp buffer
    this.setUint32(this.rewindBufferPtr + 4, this.rewindBufferPtr + 8 + 1024)

    this.instance.exports.asyncify_start_unwind(this.rewindBufferPtr);

    async_fn().then((res) => {
      this.rewindReturnValue = res;
      this.rewindActive = true;
      this.instance.exports.asyncify_start_rewind(this.rewindBufferPtr);
      this.instance.exports.main();
    })
  }
  handleOnMessage(receivingHandleId, msg) {
    console.error("call to unimplemented function handleOnMessage")
  }
  kp_channel_create(handle_a_ptr, handle_b_ptr) {
    const idA = this.nextHandleId;
    this.nextHandleId += 1;
    const idB = this.nextHandleId;
    this.nextHandleId += 1;

    let channel = new MessageChannel();
    channel.port1.onmessage = (e) => this.handleOnMessage(idA, e.data);
    channel.port2.onmessage = (e) => this.handleOnMessage(idB, e.data);
    this.channels[idA] = {port: channel.port1, queue: []};
    this.channels[idB] = {port: channel.port2, queue: []};
    this.setUint32(handle_a_ptr, idA);
    this.setUint32(handle_b_ptr, idB);
  }
  kp_channel_write(channel, byte_ptr, handle_ptr, byte_count, handle_count) {
    if (!this.channels.hasOwnProperty(channel)) {
      console.error("attempted to write to unknown channel:", channel)
      return
    }
    let data = this.instance.exports.memory.buffer.slice(byte_ptr, byte_ptr+byte_count);
    let handles = [];
    for (let i = 0; i < handle_count; i++) {
      let handleId = this.getUint32(handle_ptr + 4*i);
      if (handleId == channel) {
        console.error("attempted to write channel handle into itself:", channel)
        return
      } else if (!this.channels.hasOwnProperty(handle)) {
        console.error("attempted to write message containing an unknown channel handle:", channel)
        return
      }
      handles.push(this.channels[handle])
      delete this.channels[handle];
    }
    let transferList = [];
    let addToTransferList = (msg) => {
      transferList.push(msg.data);
      msg.handles.forEach(handle => {
        transferList.push(handle.port)
        handle.queue.forEach(addToTransferList)
      })
    };
    let msg = {data, handles};
    addToTransferList(msg)
    this.channels[channel].postMessage(msg, transferList);
  }
  kp_channel_read() {
    console.error("call to unimplemented function kp_channel_read")
  }
  kp_pollgroup_create(handle_ptr) {
    const id = this.nextHandleId;
    this.nextHandleId += 1;

    this.pollgroups[id] = {queue: []};
    this.setUint32(handle_ptr, id);
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
  kp_generic_close(handle) {
    if (this.pollgroups.hasOwnProperty(handle)) {
      delete this.pollgroups[handle];
    } else if (this.channels.hasOwnProperty(handle)) {
      // TODO SEND CLOSE MESSAGE OR SOMETHING??
      delete this.channels[handle];
    } else {
      console.error("attempted to close unknown handle:", handle);
    }
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
