# AGENTS.md — EvoChronos AI Session Bootstrap Context

Welcome to **EvoChronos**, the multi-scale evolutionary simulation sandbox spanning 29 orders of magnitude in time ($10^{-15}\text{ s}$ to $10^{14}\text{ s}$) and 12 orders in space with exact integer elemental mass conservation across $[\mathrm{C, H, O, N, P, S, Fe}]$.

## Quick Orientation

- **Project Root**: repository root (Cloud Agents: `/workspace`)
- **Core Crates**: `crates/evo-core`, `crates/evo-gpu`, `crates/evo-regime-prebiotic`, `crates/evo-regime-protocell`, `crates/evo-regime-prokaryote`, `crates/evo-regime-eukaryote`, `crates/evo-regime-multicell`, `crates/evo-regime-macro`, `crates/evo-bridge`, `crates/evo-storage`, `crates/evo-server`.
- **Applications**: `apps/workbench` (Pillar 2 WebGPU Workbench), `apps/desktop` (Tauri 2.0 Workstation), `apps/web` (Next.js 15 Platform), `python/evochronos` (Scientific SDK).

## Non-Negotiable Invariants

1. **Exact Integer Mass Conservation**:
   - Total count of $[C, H, O, N, P, S, Fe]$ must have **0.0 atomic drift** across all operations.
   - Any modification to `AtomicComposition` must maintain closed arithmetic.
2. **Deterministic PRNG**:
   - All stochastic steps use `Philox-4x32-10` counter-based PRNG with state $(k, c)$.
3. **Anti-Facade Testing & Zero-Tolerance Integrity**:
   - Never use mock echoes, hardcoded truth assertions, or relaxed numerical tolerances ($10^{-5}$) in functional tests.
   - Metabolic cycles must enforce thermodynamic loop laws (zero net flux through futile zero-free-energy cycles).
   - Nucleic acid and protein calculations must use true polymer stoichiometry with condensation capping.
   - Periodically verify the ConservationLedger with adversarial 1-atom leakage checks to guarantee zero drift tolerance.

## Cloud Agent environment

This repo’s Cloud Agent environment is dashboard-managed. Install upgrades
Rust to current `stable` (edition 2024; 1.83 cannot fetch this lockfile),
fetches Cargo crates, installs the Python SDK editable, and installs
Node deps for `apps/workbench` and `apps/web`. Start launches the Vite
workbench on `0.0.0.0:5173`. The Python master harness does not
`cargo test` the Rust crates.

## Verification Commands

Always run these commands before and after making changes:
```bash
# Master Full-System Verification Suite (Python harness; does not cargo-test Rust)
python3 verification/verify_master_full_system.py

# Automated Functional Testing
python3 quality/test_functional.py

# Scientific Data Adapters Suite
python3 tests/test_adapters.py

# Rust workspace compile check
cargo check --workspace --locked

# End-to-End Multi-Regime Demo
python3 python/examples/archean_to_macro_demo.py
```

## Quality Documentation
- **Quality Constitution**: `quality/QUALITY.md`
- **Code Review Protocol**: `quality/RUN_CODE_REVIEW.md`
- **Integration Test Protocol**: `quality/RUN_INTEGRATION_TESTS.md`
- **Spec Audit Protocol**: `quality/RUN_SPEC_AUDIT.md`
- **Implementation Plans**: `plan/`
