# wasmexperiments

u need wasm-opt to be installed and in ur $PATH

```sh
rustup target add wasm32-unknown-unknown
cargo install lucetc
sh build.sh
cd host
cargo run
```

TODO need to consider if the current setup can overflow the stack when processing messages repeatedly
