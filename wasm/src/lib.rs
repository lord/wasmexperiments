mod bindings;

#[no_mangle]
pub extern fn main() {
    loop {
        let mut buf = Vec::new();
        let mut handles = Vec::new();
        let mut handles2 = Vec::new();

        let (a, b) = bindings::Channel::new();
        let (c, d) = bindings::Channel::new();

        c.write(&vec![4, 3, 2, 1], vec![]);
        a.write(&vec![1, 2, 3, 4], vec![d]);

        b.sync_wait();
        b.read(&mut buf, &mut handles);

        for byte in &buf {
            bindings::log(*byte);
        }

        handles[0].sync_wait();
        handles[0].read(&mut buf, &mut handles2);

        for byte in &buf {
            bindings::log(*byte);
        }

        bindings::sleep(1_000_000);
    }
}
