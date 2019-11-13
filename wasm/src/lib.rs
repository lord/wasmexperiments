mod bindings;

#[no_mangle]
pub extern fn main() {
    bindings::log(123u32);
    let BUF_CAPACITY = 100000;
    let mut buf = vec![0; BUF_CAPACITY];
    let mut handle: bindings::Handle = 0;
    let mut params = bindings::RingParams::new_zero();
    unsafe {bindings::sys::kp_ring_create(&mut handle as *mut bindings::Handle, &mut params as *mut bindings::RingParams, buf.as_mut_ptr(), buf.len());}
    bindings::log(1);
    unsafe {bindings::sys::kp_ring_enter(handle, 1, 0);}
    bindings::log(2);
}
