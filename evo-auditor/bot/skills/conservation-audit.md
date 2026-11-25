# Conservation audit

When the user asks whether mass is conserved:

1. Call `inspect_composition` for arithmetic questions about two vectors.
2. Call `run_verification` with `functional` for the Python functional suite.
3. Call `run_verification` with `cargo_check` if they ask whether the Rust workspace compiles.
4. In the reply, name the layer that ran. Do not upgrade a Python harness pass into a Rust kernel proof.
5. If they mention gRPC, DuckDB, Zarr files, or GPU shaders, say those paths are not exercised by these tools.
