extern "C" {
    pub fn kp_debug_msg(msg: u32);
}
#[no_mangle]
pub extern fn main() {
    // panic::set_hook(Box::new(|_| {
    //     let s = panic_info.payload().downcast_ref::<&str>().unwrap();
    //     println!("panic occurred: {:?}", s);
    // }));
    unsafe {kp_debug_msg(333u32)};
    let u = Box::new(123u32);
    unsafe {kp_debug_msg(*u)};
    // loop {
    //     let mut buf = Vec::new();
    //     let mut handles = Vec::new();
    //     let mut handles2 = Vec::new();

    //     let (a, b) = bindings::Channel::new();
    //     let (c, d) = bindings::Channel::new();

    //     c.write(&vec![4, 3, 2, 1], vec![]);
    //     a.write(&vec![1, 2, 3, 4], vec![d]);

    //     b.sync_wait();
    //     b.read(&mut buf, &mut handles);

    //     for byte in &buf {
    //         bindings::log(*byte);
    //     }

    //     handles[0].sync_wait();
    //     handles[0].read(&mut buf, &mut handles2);

    //     for byte in &buf {
    //     }

    //     bindings::sleep(1_000_000);
    // }
}
