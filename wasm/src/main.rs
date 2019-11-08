mod bindings;

fn main() {
    let mut n: u32 = 1;
    loop {
        let mut buf = Vec::new();
        let mut handles = Vec::new();

        let (a, b) = bindings::Channel::new();

        b.write(&vec![10, 9, 8, 7, 6, 5, 4, 3, 2,  1], vec![]);
        a.write(&vec![1, 9, 8, 7, 6, 5, 4, 3, 2,  1], vec![]);

        a.sync_wait();
        a.read(&mut buf, &mut handles);

        for byte in &buf {
            bindings::log(*byte);
        }

        b.sync_wait();
        b.read(&mut buf, &mut handles);

        for byte in &buf {
            bindings::log(*byte);
        }

        bindings::sleep(1_000_000);
        n += 1;
    }
}
