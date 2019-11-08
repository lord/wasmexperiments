mod bindings;

fn main() {
    let mut n: u32 = 1;
    let mut msgbuf1: Vec<u8> = vec![ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let mut msgbuf2: Vec<u8> = vec![10, 9, 8, 7, 6, 5, 4, 3, 2,  1];
    let mut msgbuf3: Vec<u8> = vec![ 0, 0, 0, 0, 0, 0, 0, 0, 0,  0];
    let mut buf_len: usize = 0;
    let mut handle_len: usize = 0;
    loop {
        let (a, b) = bindings::Channel::new();

        unsafe { bindings::sys::kp_channel_write(b.handle, msgbuf2.as_mut_ptr(), 0 as *mut bindings::Handle, 10, 0); }
        unsafe { bindings::sys::kp_channel_write(a.handle, msgbuf1.as_mut_ptr(), 0 as *mut bindings::Handle, 10, 0); }

        unsafe { bindings::sys::kp_generic_wait(a.handle, 0 as *mut u32); }
        unsafe {
            bindings::sys::kp_channel_read(a.handle, msgbuf3.as_mut_ptr(), 0 as *mut bindings::Handle,
                                         10, 0,
                                        &mut buf_len as *mut usize, &mut handle_len as *mut usize); }

        for byte in &msgbuf3 {
            unsafe { bindings::sys::kp_debug_msg(*byte as u32); }
        }

        unsafe { bindings::sys::kp_generic_wait(b.handle, 0 as *mut u32); }
        unsafe {
            bindings::sys::kp_channel_read(b.handle, msgbuf3.as_mut_ptr(), 0 as *mut bindings::Handle,
                                         10, 0,
                                        &mut buf_len as *mut usize, &mut handle_len as *mut usize); }

        for byte in &msgbuf3 {
            unsafe { bindings::sys::kp_debug_msg(*byte as u32); }
        }

        unsafe { bindings::sys::kp_sleep(500000) }
        unsafe { bindings::sys::kp_generic_close(a.handle); }
        unsafe { bindings::sys::kp_generic_close(b.handle); }
        n += 1;
    }
}
