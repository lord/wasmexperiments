cd wasm && cargo +nightly build &&
lucetc target/wasm32-unknown-unknown/debug/wasm.wasm --output ../host/wasm.out --reserved-size 16MiB --opt-level 2