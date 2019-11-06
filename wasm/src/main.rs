mod bindings;

fn main() {
    let mut n: i32 = 1;
    loop {
        unsafe { bindings::kp_debug_msg(n); }
        unsafe { bindings::kp_sleep(500000) }
        n += 1;
    }
}
