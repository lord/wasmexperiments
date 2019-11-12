pub type Handle = usize;

/// Contains a bunch of offsets that index into the created buffer, corresponding to various parts
/// of the ring.
#[repr(C)]
struct RingParams {
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

#[repr(C)]
struct RingRequest {
    /// - `1`: channel read
    /// - `2`: channel write
    req_type: u16,
    user_token: u64,
    target_handle: Handle,

    buffer_ptr: *mut u8,
    buffer_len: usize,

    handles_ptr: *mut Handle,
    handles_len: usize,
}

#[repr(C)]
struct RingResponse {
    /// - `0`: ok
    /// - `1`: unknown handle
    /// - `2`: buffer/handles not long enough; use lengths in buffer_len and handles_len
    resp_type: u16,
    user_token: u64,

    buffer_len: usize,
    handles_len: usize,
}

mod sys {
    use super::{Handle, RingParams};
    extern "C" {
        pub fn kp_channel_create(handle_a: *mut Handle, handle_b: *mut Handle);
        pub fn kp_channel_write(
            channel: Handle,
            bytes: *const u8,
            handles: *const Handle,
            byte_count: usize,
            handle_count: usize,
        ); // DEPRECATED
        pub fn kp_channel_read(
            channel: Handle,
            bytes: *mut u8,
            handles: *mut Handle,
            byte_count: usize,
            handle_count: usize,
            byte_actual_count: *mut usize,
            handle_actual_count: *mut usize,
        ) -> u32; // DEPRECATED

        pub fn kp_ring_create(ring: *mut Handle, ring_params: *mut RingParams, buf_ptr: usize, buf_len: usize);
        pub fn kp_ring_enter(ring: Handle, min_process: u32, min_complete: u32, max_time: u32);

        pub fn kp_generic_wait(handle: Handle, token: *mut u32); // DEPRECATED
        pub fn kp_generic_close(handle: Handle);

        pub fn kp_sleep(time: u32); // DEPRECATED
        pub fn kp_debug_msg(msg: u32); // DEPRECATED
        pub fn kp_bootstrap(bootstrap_handle: *mut Handle);
    }
}

pub fn log<T: Into<u32>>(msg: T) {
    unsafe {
        sys::kp_debug_msg(msg.into());
    }
}

pub fn sleep(us: u32) {
    unsafe {
        sys::kp_sleep(us);
    }
}

pub struct Channel {
    handle: Handle,
    /// if true, drop will not close the channel
    moved: bool,
}
impl Channel {
    pub fn new() -> (Channel, Channel) {
        let mut a: Handle = 0;
        let mut b: Handle = 0;
        unsafe {
            sys::kp_channel_create(&mut a as *mut Handle, &mut b as *mut Handle);
        }
        (
            Channel {
                handle: a,
                moved: false,
            },
            Channel {
                handle: b,
                moved: false,
            },
        )
    }

    pub fn close(self) {
        // drop self
    }

    pub fn write(&self, buf: &[u8], channels: Vec<Channel>) {
        let handles: Vec<Handle> = channels
            .into_iter()
            .map(|mut chan| {
                chan.moved = true;
                chan.handle
            })
            .collect();
        unsafe {
            sys::kp_channel_write(
                self.handle,
                buf.as_ptr(),
                handles.as_ptr(),
                buf.len(),
                handles.len(),
            );
        }
    }

    pub fn read(&self, buf: &mut Vec<u8>, channels: &mut Vec<Channel>) {
        buf.clear();
        channels.clear();
        let mut handles = Vec::with_capacity(channels.capacity());
        let mut buf_len: usize = 0;
        let mut channel_len: usize = 0;
        let res = unsafe {
            sys::kp_channel_read(
                self.handle,
                buf.as_mut_ptr(),
                handles.as_mut_ptr(),
                buf.capacity(),
                handles.capacity(),
                &mut buf_len as *mut usize,
                &mut channel_len as *mut usize,
            )
        };
        match res {
            // OK
            0 => {
                unsafe {
                    buf.set_len(buf_len);
                    handles.set_len(channel_len);
                }
                for handle in handles {
                    channels.push(Channel {
                        handle,
                        moved: false,
                    });
                }
            }
            // need longer buffers
            2 => {
                buf.reserve(buf_len);
                channels.reserve(channel_len);
                self.read(buf, channels);
            }
            // other error
            _ => {
                panic!("error while reading from channel");
            }
        }
    }

    pub fn sync_wait(&self) {
        unsafe {
            sys::kp_generic_wait(self.handle, 0 as *mut u32);
        }
    }
}
impl Drop for Channel {
    fn drop(&mut self) {
        if !self.moved {
            unsafe {
                sys::kp_generic_close(self.handle);
            }
        }
    }
}

#[no_mangle]
pub extern "C" fn stack_buffer_alloc(len: usize) -> *mut u8 {
    let mut buf: Vec<u8> = Vec::with_capacity(len);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}
