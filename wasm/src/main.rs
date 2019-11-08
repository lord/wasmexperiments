mod bindings;

fn main() {
    let mut n: u32 = 1;
    let mut msgbuf3: Vec<u8> = vec![ 0, 0, 0, 0, 0, 0, 0, 0, 0,  0];
    let mut buf_len: usize = 0;
    let mut handle_len: usize = 0;
    loop {
        let (a, b) = bindings::Channel::new();

        b.write(&vec![10, 9, 8, 7, 6, 5, 4, 3, 2,  1], vec![]);
        a.write(&vec![10, 9, 8, 7, 6, 5, 4, 3, 2,  1], vec![]);

        a.sync_wait();
        unsafe {
            bindings::sys::kp_channel_read(a.handle, msgbuf3.as_mut_ptr(), 0 as *mut bindings::Handle,
                                         10, 0,
                                        &mut buf_len as *mut usize, &mut handle_len as *mut usize); }

        for byte in &msgbuf3 {
            bindings::log(*byte);
        }

        b.sync_wait();
        unsafe {
            bindings::sys::kp_channel_read(b.handle, msgbuf3.as_mut_ptr(), 0 as *mut bindings::Handle,
                                         10, 0,
                                        &mut buf_len as *mut usize, &mut handle_len as *mut usize); }

        for byte in &msgbuf3 {
            bindings::log(*byte);
        }

        unsafe { bindings::sys::kp_sleep(500000) }
        n += 1;
    }
}
