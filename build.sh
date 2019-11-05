cd wasm && cargo +nightly build &&
# lucetc target/wasm32-unknown-unknown/debug/wasm.wasm --output ../host/wasm.out --reserved-size 16MiB --opt-level 2
wasm-opt target/wasm32-unknown-unknown/debug/wasm.wasm -O --asyncify -o ../web-host/out.wasm
