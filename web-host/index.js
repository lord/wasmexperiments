class Instance {
  constructor(bytes) {
    this.wasmBytes = bytes;
    this.instance = null;
    this.memoryView = null;

    this.channels = {};
    this.pollgroups = {};
    this.nextHandleId = 1;

    this.waitQueue = null;
    this.waitDone = null;

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

    let done = (res) => {
      this.rewindReturnValue = res;
      this.rewindActive = true;
      this.instance.exports.asyncify_start_rewind(this.rewindBufferPtr);
      this.instance.exports.main();
      this.instance.exports.asyncify_stop_unwind();
    }
    async_fn(done)
  }

  handleOnMessage(queue, msg) {
    queue.push(msg);
    let bindOnMessage = (msg) => {
      msg.handles.forEach(handle => {
        handle.port.onmessage = (e) => this.handleOnMessage(handle.queue, e.data)
        handle.queue.forEach(bindOnMessage)
      })
    }
    bindOnMessage(msg)
    this.maybeWake();
  }

  maybeWake() {
    if (this.waitQueue !== null && this.waitQueue.length > 0) {
      this.waitQueue = null;
      this.waitDone();
    }
  }

  kp_channel_create(handle_a_ptr, handle_b_ptr) {
    const idA = this.nextHandleId;
    this.nextHandleId += 1;
    const idB = this.nextHandleId;
    this.nextHandleId += 1;

    let channel = new MessageChannel();
    let queueA = [];
    let queueB = [];
    channel.port1.onmessage = (e) => this.handleOnMessage(queueA, e.data);
    channel.port2.onmessage = (e) => this.handleOnMessage(queueB, e.data);
    this.channels[idA] = {port: channel.port1, queue: queueA};
    this.channels[idB] = {port: channel.port2, queue: queueB};
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
    this.channels[channel].port.postMessage(msg, transferList);
  }

  kp_channel_read(channel, byte_ptr, handle_ptr,
                           byte_count, handle_count,
                           byte_actual_count_ptr, handle_actual_count_ptr) {
    if (!this.channels.hasOwnProperty(channel)) {
      console.error("attempted to read from unknown channel:", channel)
      return 1
    }
    if (this.channels[channel].queue.length === 0) {
      console.error("channel had no pending messages", channel)
      return 1
    }
    if (byte_actual_count_ptr !== 0) {
      this.setUint32(byte_actual_count_ptr, this.channels[channel].queue[0].data.byteLength)
    }
    if (handle_actual_count_ptr !== 0) {
      this.setUint32(handle_actual_count_ptr, this.channels[channel].queue[0].handles.length)
    }
    if (this.channels[channel].queue[0].data.byteLength > byte_count
      || this.channels[channel].queue[0].handles.length > handle_count) {
      console.warn("buffer was not long enough to receive message on channel", channel)
      return 2;
    }
    let msg = this.channels[channel].queue.shift();
    let handleIds = msg.handles.map(handle => {
      let id = this.nextHandleId;
      this.nextHandleId += 1;
      this.handles[id] = handle;
      return id;
    });

    this.memoryView.set(new Uint8Array(msg.data), byte_ptr);
    for (let i = 0; i < handleIds.length; i++) {
      this.setUint32(handle_ptr + i*4, handleIds[i]);
    }
    return 0;
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

  kp_pollgroup_cancel() {
    console.error("call to unimplemented function kp_pollgroup_cancel")
  }

  kp_generic_wait(handle, token) {
    this.wrap_async(done => {
      if (!this.channels.hasOwnProperty(handle)) {
        console.error("attempted to wait on unknown channel:", channel)
        return
      }
      this.waitQueue = this.channels[handle].queue;
      this.waitDone = done;
      setTimeout(() => this.maybeWake(), 0);
    })
  }

  kp_generic_close(handle) {
    if (this.pollgroups.hasOwnProperty(handle)) {
      delete this.pollgroups[handle];
    } else if (this.channels.hasOwnProperty(handle)) {
      // TODO HANDLE CLOSE FROM OTHER SIDE
      this.channels[handle].port.close()
      delete this.channels[handle];
    } else {
      console.error("attempted to close unknown handle:", handle);
    }
  }

  kp_sleep(us) {
    this.wrap_async(done => {
      setTimeout(done, us / 1000)
    })
  }

  kp_debug_msg(num) {
    console.log(num)
  }

  kp_args(handle_ptr) {
    console.error("call to unimplemented function kp_args")
  }

  async run_main() {
    let env = {};
    [
      "kp_channel_create",
      "kp_channel_write",
      "kp_channel_read",
      "kp_pollgroup_create",
      "kp_pollgroup_insert",
      "kp_pollgroup_cancel",
      "kp_generic_wait",
      "kp_generic_close",
      "kp_sleep",
      "kp_debug_msg",
      "kp_args",
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
