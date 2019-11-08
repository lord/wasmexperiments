pub type Handle = usize;

pub mod sys {
    use super::Handle;
    extern "C" {
        pub fn kp_channel_create(handle_a: *mut Handle, handle_b: *mut Handle);
        pub fn kp_channel_write(channel: Handle,
                                bytes: *const u8,
                                handles: *const Handle,
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
}

pub fn log<T: Into<u32>>(msg: T) {
    unsafe { sys::kp_debug_msg(msg.into()); }
}

pub fn sleep(us: u32) {
    unsafe { sys::kp_sleep(us); }
}

pub struct Channel {
    pub handle: Handle,
}
impl Channel {
    pub fn new() -> (Channel, Channel) {
        let mut a: Handle = 0;
        let mut b: Handle = 0;
        unsafe {sys::kp_channel_create(&mut a as *mut Handle, &mut b as *mut Handle);}
        (Channel{handle: a}, Channel{handle: b})
    }

    pub fn close(self) {
        // drop self
    }

    pub fn write(&self, buf: &[u8], channels: Vec<Channel>) {
        let handles: Vec<Handle> = channels.into_iter().map(|chan| chan.handle).collect();
        unsafe { sys::kp_channel_write(self.handle, buf.as_ptr(), handles.as_ptr(), buf.len(), handles.len()); }
    }

    pub fn sync_wait(&self) {
        unsafe { sys::kp_generic_wait(self.handle, 0 as *mut u32); }
    }
}
impl Drop for Channel {
    fn drop(&mut self) {
        unsafe {sys::kp_generic_close(self.handle);}
    }
}

#[no_mangle]
pub extern "C" fn stack_buffer_alloc(len: usize) -> *mut u8 {
    let mut buf: Vec<u8> = Vec::with_capacity(len);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}
