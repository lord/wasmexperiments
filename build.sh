cd wasm && cargo +nightly build &&
# lucetc target/wasm32-unknown-unknown /debug/wasm.wasm --output ../host/wasm.out --reserved-size 16MiB --opt-level 2
wasm-opt target/wasm32-unknown-unknown/debug/wasm.wasm -O --asyncify --pass-arg=asyncify-imports@env.kp_sleep,env.kp_generic_wait -o ../web-host/out.wasm
