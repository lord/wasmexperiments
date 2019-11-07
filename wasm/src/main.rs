mod bindings;

fn main() {
    let mut n: i32 = 1;
    loop {
        let mut a: bindings::Handle = 1337;
        let mut b: bindings::Handle = 1337;
        unsafe { bindings::kp_channel_create(&mut a as *mut bindings::Handle, &mut b as *mut bindings::Handle); }
        unsafe { bindings::kp_debug_msg(a as u32); }
        unsafe { bindings::kp_debug_msg(b as u32); }
        unsafe { bindings::kp_sleep(500000) }
        n += 1;
    }
}
