class Instance {
  constructor(bytes) {
    this.wasmBytes = bytes;
    this.instance = null;
    this.memoryView = null;
    this.memoryViewU32 = null;
    this.memoryViewI32 = null;

    this.rings = {};
    this.channels = {};
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

  wait(ptr, val, timeout) {
    let idx = ptr >> 2;
    if (val >= Math.pow(2, 31)) {
        val = val - Math.pow(2, 32)
    }
    Atomics.wait(this.memoryViewI32, idx, val, timeout);
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

  kp_channel_create(handle_a_ptr, handle_b_ptr) {
    const idA = this.nextHandleId;
    this.nextHandleId += 1;
    const idB = this.nextHandleId;
    this.nextHandleId += 1;

    this.setUint32(handle_a_ptr, idA);
    this.setUint32(handle_b_ptr, idB);
    postMessage({msg: "kp_channel_create", a: idA, b: idB});
  }

  kp_ring_create(handle_ptr, ring_params_ptr, buf_ptr, buf_len) {
    const id = this.nextHandleId;
    this.nextHandleId += 1;

    let calc_len = (n) => {
      let reqs = Math.pow(2, n);
      let size = 7*4 + reqs*28 + reqs*2*16;
      return size;
    };
    let n = 0;
    while (calc_len(n+1) < buf_len) {
      n += 1;
    }
    if (n === 0) {
      // buffer not long enough for even a tiny ring
      console.warn("buffer was too small for even zero length ring");
      return 1;
    }

    let ptrs = {
      flags: 0 * 4 + buf_ptr,

      request_head: 1*4 + buf_ptr,
      request_tail: 2*4 + buf_ptr,
      request_count: 3*4 + buf_ptr,
      request_first: 7*4 + buf_ptr,

      response_head: 4*4 + buf_ptr,
      response_tail: 5*4 + buf_ptr,
      response_count: 6*4 + buf_ptr,
      response_first: 7*4 + Math.pow(2, n)*28 + buf_ptr,
    };

    this.setUint32(ptrs.flags, 0);
    this.setUint32(ptrs.request_head, 0);
    this.setUint32(ptrs.request_tail, 0);
    this.setUint32(ptrs.request_count, 0);
    this.setUint32(ptrs.response_head, 0);
    this.setUint32(ptrs.response_tail, 0);
    this.setUint32(ptrs.response_count, 0);

    this.setUint32(ring_params_ptr + 0*4, ptrs.flags);
    this.setUint32(ring_params_ptr + 1*4, ptrs.request_head);
    this.setUint32(ring_params_ptr + 2*4, ptrs.request_tail);
    this.setUint32(ring_params_ptr + 3*4, ptrs.request_count);
    this.setUint32(ring_params_ptr + 4*4, ptrs.response_head);
    this.setUint32(ring_params_ptr + 5*4, ptrs.response_tail);
    this.setUint32(ring_params_ptr + 6*4, ptrs.response_count);

    postMessage({msg: "kp_ring_create", ring_id: id, ring: ptrs});

    this.setUint32(handle_ptr, id);
    this.rings[id] = ptrs;

    return 0;
  }

  completedItemsInRing(ring) {
    return roundUint32(this.getUint32(ring.response_tail, true) - this.getUint32(ring.response_head, true));
  }

  kp_ring_enter(ringId, min_complete, max_time) {
    if (max_time === 0) {
      max_time = Infinity;
    }
    let ring = this.rings[ringId];
    if (!ring) {
      console.error("unknown ring:", ring);
      return 1;
    }
    let flags = this.getUint32(ring.flags, true);
    if ((flags & 0b10) === 0) {
      postMessage({msg: "kp_ring_enter", ring_id: ringId});
    }

    let tail = this.getUint32(ring.response_tail, true);
    let head = this.getUint32(ring.response_head, true);

    while (roundUint32(tail-head) < min_complete) {
      console.info("THREAD WAITING ON", ring.response_tail)
      // TODO if this loops around because a flag was changed, we want to subtract the elapsed time from max_time
      this.wait(ring.response_tail, tail, max_time);
      tail = this.getUint32(ring.response_tail, true);
      head = this.getUint32(ring.response_head, true);
    }

    return 0;
  }

  kp_generic_close(handle) {
    if (this.rings[handle]) {
      this.rings[handle] = false;
    } else if (this.channels[handle]) {
      // TODO HANDLE CLOSE FROM OTHER SIDE
      this.channels[handle] = false;
    } else {
      console.error("attempted to close unknown handle:", handle);
      return
    }
    postMessage({msg: "kp_generic_close", handle: id});
  }

  // TODO fork should be at a higher level (like at process creation) than syscalls i think
  kp_fork(us) {
    this.wrap_async(done => {
      console.error("call to unimplemented function kp_fork")
      setTimeout(done, 1000)
    })
  }

  kp_debug_msg(num) {
    console.log(num)
  }

  kp_bootstrap(handle_ptr) {
    console.error("call to unimplemented function kp_args")
  }

  kp_atomic_store_u32(ptr, val) {
    Atomics.store(this.memoryViewU32, ptr >> 2, val)
  }

  kp_atomic_load_u32(ptr) {
    return Atomics.load(this.memoryViewU32, ptr >> 2)
  }

  async run_main(memory) {
    let env = {};
    env.memory = memory;
    this.memory = memory;
    [
      "kp_channel_create",
      "kp_ring_create",
      "kp_ring_enter",
      "kp_generic_close",
      "kp_fork",
      "kp_debug_msg",
      "kp_bootstrap",
      "kp_atomic_store_u32",
      "kp_atomic_load_u32",
    ].forEach(fn => {env[fn] = (...args) => this[fn](...args)});
    let results = await WebAssembly.instantiate(this.wasmBytes, {env});
    this.instance = results.instance;
    this.rewindBufferPtr = this.instance.exports.stack_buffer_alloc(1024 + 8);
    this.memoryView = new Uint8Array(this.memory.buffer);
    this.memoryViewU32 = new Uint32Array(this.memory.buffer);
    this.memoryViewI32 = new Int32Array(this.memory.buffer);
    this.instance.exports.main();
    this.instance.exports.asyncify_stop_unwind();
  }
}

const mod = (x, n) => (x % n + n) % n

function roundUint32(n) {
  return mod(n, Math.pow(2, 32));
}

let started = false;
onmessage = function(e) {
  if (started) {
    return;
  }
  started = true;

  fetch(e.data.wasmFile).then(response =>
    response.arrayBuffer()
  ).then(bytes => {
    let instance = new Instance(bytes);
    instance.run_main(e.data.memory).catch(console.error);
  })
}
