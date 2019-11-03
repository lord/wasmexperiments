use lucet_runtime::{DlModule, Limits, MmapRegion, Region};

fn main() {
    let module = DlModule::load("./wasm.out").expect("load failed");
    let limits = Limits {
        heap_memory_size: 1024 * 1024 * 64,
        heap_address_space_size: 0x200000000,
        stack_size: 128 * 1024,
        globals_size: 4096,
    };

    let region = MmapRegion::create(1, &limits).expect("mmap region fail");
    let mut inst = region.new_instance(module).expect("instance creation failed");

    let retval = inst.run("add_one", &[5i32.into()]).expect("add one failed").unwrap_returned();
    println!("{:?}", i32::from(retval));
}
