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

Chrome currently only works in the Canary version, until https://chromium.googlesource.com/v8/v8.git/+/766827d25fd2ed3391b3fdb97d64815c1733a2f8 is available in the release branch.

Firefox should work if `javascript.options.shared_memory` is turned on.
