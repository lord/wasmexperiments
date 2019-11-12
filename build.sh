cd wasm && cargo +nightly build &&
# lucetc target/wasm32-unknown-unknown /debug/wasm.wasm --output ../host/wasm.out --reserved-size 16MiB --opt-level 2
cp target/wasm32-unknown-unknown/debug/wasm.wasm ../web-host/out.wasm
# wasm-opt target/wasm32-unknown-unknown/debug/wasm.wasm -O -o ../web-host/out.wasm
