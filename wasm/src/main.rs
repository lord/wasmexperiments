mod bindings;

fn main() {
    let mut n: i32 = 1;
    loop {
        unsafe { bindings::kx_debug_msg(n); }
        unsafe { bindings::kx_sleep() }
        n += 1;
    }
}
