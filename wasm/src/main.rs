extern "C" {
    fn sleep();
    fn msg(msg: i32);
}

fn main() {
    let mut n: i32 = 5;
    loop {
        unsafe { msg(n); }
        unsafe { sleep() }
        n += 1;
    }
}

#[no_mangle]
pub extern "C" fn stack_buffer_alloc(len: usize) -> *mut u8 {
    let mut buf: Vec<u8> = Vec::with_capacity(len);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}
