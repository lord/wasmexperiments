mod bindings;

fn main() {
    let mut n: u32 = 1;
    let mut msgbuf1: Vec<u8> = vec![ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let mut msgbuf2: Vec<u8> = vec![10, 9, 8, 7, 6, 5, 4, 3, 2,  1];
    let mut msgbuf3: Vec<u8> = vec![ 0, 0, 0, 0, 0, 0, 0, 0, 0,  0];
    let mut buf_len: usize = 0;
    let mut handle_len: usize = 0;
    loop {
        let mut a: bindings::Handle = 0;
        let mut b: bindings::Handle = 0;
        unsafe { bindings::kp_channel_create(&mut a as *mut bindings::Handle, &mut b as *mut bindings::Handle); }

        unsafe { bindings::kp_channel_write(b, msgbuf2.as_mut_ptr(), 0 as *mut bindings::Handle, 10, 0); }
        unsafe { bindings::kp_channel_write(a, msgbuf1.as_mut_ptr(), 0 as *mut bindings::Handle, 10, 0); }

        unsafe { bindings::kp_generic_wait(a, 0 as *mut u32); }
        unsafe {
            bindings::kp_channel_read(a, msgbuf3.as_mut_ptr(), 0 as *mut bindings::Handle,
                                         10, 0,
                                        &mut buf_len as *mut usize, &mut handle_len as *mut usize); }

        for byte in &msgbuf3 {
            unsafe { bindings::kp_debug_msg(*byte as u32); }
        }

        unsafe { bindings::kp_generic_wait(b, 0 as *mut u32); }
        unsafe {
            bindings::kp_channel_read(b, msgbuf3.as_mut_ptr(), 0 as *mut bindings::Handle,
                                         10, 0,
                                        &mut buf_len as *mut usize, &mut handle_len as *mut usize); }

        for byte in &msgbuf3 {
            unsafe { bindings::kp_debug_msg(*byte as u32); }
        }

        unsafe { bindings::kp_sleep(500000) }
        unsafe { bindings::kp_generic_close(a); }
        unsafe { bindings::kp_generic_close(b); }
        n += 1;
    }
}
