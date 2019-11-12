pub type Handle = usize;

/// Contains a bunch of offsets that index into the created buffer, corresponding to various parts
/// of the ring.
#[repr(C)]
pub struct RingParams {
    dropped: u32,

    request_head: u32,
    request_tail: u32,
    request_count: u32,
    request_first: u32,

    response_head: u32,
    response_tail: u32,
    response_count: u32,
    response_first: u32,
}

// size: 28
#[repr(C)]
pub struct RingRequest {
    /// - `1`: channel read
    /// - `2`: channel write
    req_type: u32,
    user_token: u32,
    target_handle: Handle,

    buffer_ptr: *mut u8,
    buffer_len: u32,

    handles_ptr: *mut Handle,
    handles_len: u32,
}

// size: 16
#[repr(C)]
pub struct RingResponse {
    /// - `0`: ok
    /// - `1`: unknown handle
    /// - `2`: buffer/handles not long enough; use lengths in buffer_len and handles_len
    resp_type: u32,
    user_token: u32,

    buffer_len: u32,
    handles_len: u32,
}

mod sys {
    use super::{Handle, RingParams};
    extern "C" {
        pub fn kp_channel_create(handle_a: *mut Handle, handle_b: *mut Handle);

        pub fn kp_ring_create(ring: *mut Handle, ring_params: *mut RingParams, buf_ptr: usize, buf_len: usize);
        pub fn kp_ring_enter(ring: Handle, min_process: u32, min_complete: u32, max_time: u32);

        pub fn kp_generic_close(handle: Handle);

        // TODO if forking is possible here, we need handle duplication at the os level, right?
        // need to think about what this means, think about forking a group of processes
        pub fn kp_fork(handle: *mut Handle);
        pub fn kp_debug_msg(msg: u32);
        pub fn kp_bootstrap(bootstrap_handle: *mut Handle);
    }
}

pub fn log<T: Into<u32>>(msg: T) {
    unsafe {
        sys::kp_debug_msg(msg.into());
    }
}

#[no_mangle]
pub extern "C" fn stack_buffer_alloc(len: usize) -> *mut u8 {
    let mut buf: Vec<u8> = Vec::with_capacity(len);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}
