pub type Handle = usize;

extern "C" {
    pub fn kp_channel_create(handle_a: *mut Handle, handle_b: *mut Handle);
    pub fn kp_channel_write(channel: Handle,
                            bytes: *mut u8,
                            handles: *mut Handle,
                            byte_count: usize,
                            handle_count: usize);
    pub fn kp_channel_read(channel: Handle,
                            bytes: *mut u8,
                            handles: *mut Handle,
                            byte_count: usize,
                            handle_count: usize,
                            byte_actual_count: *mut usize,
                            handle_actual_count: *mut usize);

    pub fn kp_pollgroup_create(handle: *mut Handle);
    pub fn kp_pollgroup_insert(pollgroup: Handle, channel: Handle, token: u32);
    pub fn kp_pollgroup_cancel(handle: Handle, token: u32);

    pub fn kp_generic_wait(handle: Handle, token: *mut u32);
    pub fn kp_generic_close(handle: Handle);

    pub fn kp_sleep(time: u32); // TODO sleep could be simplified into a pollgroup timeout
    pub fn kp_debug_msg(msg: u32);
    pub fn kp_args(bootstrap_handle: *mut Handle);
}

#[no_mangle]
pub extern "C" fn stack_buffer_alloc(len: usize) -> *mut u8 {
    let mut buf: Vec<u8> = Vec::with_capacity(len);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}
