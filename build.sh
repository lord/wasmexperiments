cd wasm && cargo +nightly build &&
# lucetc target/wasm32-unknown-unknown /debug/wasm.wasm --output ../host/wasm.out --reserved-size 16MiB --opt-level 2
wasm-opt target/wasm32-unknown-unknown/debug/wasm.wasm -O --asyncify --pass-arg=asyncify-imports@env.kp_sleep,env.kp_generic_wait -o ../web-host/out.wasm &&
wasm2wat ../web-host/out.wasm -o ../web-host/out.wat &&
sed -i "" "s/(memory (;0;) \([0-9]*\))/(memory (;0;) \1 10000 shared)/g" ../web-host/out.wat &&
wat2wasm ../web-host/out.wat -o ../web-host/out.wasm --enable-threads
