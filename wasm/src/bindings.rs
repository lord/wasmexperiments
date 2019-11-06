extern "C" {
    pub fn kx_sleep();
    pub fn kx_channel_create(handle_a: *mut usize, handle_b: *mut usize);
    pub fn kx_channel_read(handle_a: *mut usize, handle_b: *mut usize);
    pub fn kx_debug_msg(msg: i32);
}

#[no_mangle]
pub extern "C" fn stack_buffer_alloc(len: usize) -> *mut u8 {
    let mut buf: Vec<u8> = Vec::with_capacity(len);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}
