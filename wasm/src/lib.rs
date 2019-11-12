mod bindings;

#[no_mangle]
pub extern fn main() {
    bindings::log(123u32);
}
