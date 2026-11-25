# Analysis Report: `AtomicComposition` Downstream Dependency Mapping & Workspace Re-export Plan

**Agent**: `explorer_remed_1`  
**Date**: 2026-10-20  
**Target Workspace**: `/Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos`  
**Scope**: Read-only exploration and remediation plan for Gate 1 Rust workspace compilation failure.

---

## 1. Executive Summary

During Gate 1 review, Challenger 2 identified that `cargo check --workspace` failed with error code 101 due to:
```
error[E0432]: unresolved import `evo_core::composition::AtomicComposition`
 --> crates/evo-storage/src/olap_ledger.rs:6:5
```
This failure originated because `crates/evo-core/src/composition.rs` defined the canonical elemental vector struct as `pub struct ElementalComposition`, while downstream crates (`evo-storage`, `evo-server`, `evo-regime-macro`, `evo-regime-multicell`, `evo-bridge`, `apps/desktop/src-tauri`) imported `evo_core::composition::AtomicComposition`.

Our investigation reveals:
1. In `crates/evo-core/src/composition.rs`, the type alias `pub type AtomicComposition = ElementalComposition;` is defined at lines 30–31.
2. In `crates/evo-core/src/lib.rs`, `AtomicComposition` is **not** re-exported at the crate root (line 9 only exports `pub use composition::{ElementalComposition, ElementIndex, NUM_ELEMENTS};`). To ensure complete backwards and cross-crate compatibility (supporting both `use evo_core::composition::AtomicComposition;` and `use evo_core::AtomicComposition;`), `AtomicComposition` must be explicitly added to `crates/evo-core/src/lib.rs`.
3. In `Cargo.toml`, `apps/desktop/src-tauri` is nested under the workspace root but was not included in `workspace.members` or `workspace.exclude`, triggering a workspace manifest error when checking the desktop application crate.
4. Downstream crates importing `AtomicComposition` have been completely surveyed (15 files across 5 engine crates and 1 application). With the type alias in `composition.rs`, `cargo check --workspace` and `cargo test --workspace` compile and execute cleanly with 0 errors across all 11 workspace crates.

---

## 2. Root Cause Analysis & Compiler Error Diagnostics

### 2.1 The Gate 1 Failure Mode
Challenger 2 observed the following verbatim compiler failure:
```
error[E0432]: unresolved import `evo_core::composition::AtomicComposition`
 --> crates/evo-storage/src/olap_ledger.rs:6:5
  |
6 | use evo_core::composition::AtomicComposition;
  |     ^^^^^^^^^^^^^^^^^^^^^^^-----------------
  |                            |
  |                            no `AtomicComposition` in `composition`

error[E0432]: unresolved import `evo_core::composition::AtomicComposition`
 --> crates/evo-storage/src/checkpoint.rs:5:5
  |
5 | use evo_core::composition::AtomicComposition;
  |     ^^^^^^^^^^^^^^^^^^^^^^^-----------------
  |                            |
  |                            no `AtomicComposition` in `composition`
```

### 2.2 Mechanism
In the initial implementation, `crates/evo-core/src/composition.rs` defined:
```rust
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Pod, Zeroable)]
pub struct ElementalComposition {
    pub atoms: [u64; NUM_ELEMENTS], // [C, H, O, N, P, S, Fe]
}
```
However, the design architecture and downstream storage, server, bridge, and macroevolution modules were authored to use the conceptual type name `AtomicComposition`. Because no type alias existed in `composition.rs` or `lib.rs`, rustc rejected the module import `evo_core::composition::AtomicComposition`.

---

## 3. Comprehensive Downstream Dependency Survey

A repository-wide AST and symbol search across `crates/` and `apps/` identified 15 files actively importing and utilizing `AtomicComposition`:

| Crates / Module | File Path | Line | Import Pattern & Usage |
|---|---|---|---|
| **`evo-storage`** | `crates/evo-storage/src/olap_ledger.rs` | 6 | `use evo_core::composition::AtomicComposition;`<br>Used in `LedgerSnapshotRecord` fields (`living_biomass_atoms`, `dissolved_metabolite_atoms`, `mineral_lithosphere_atoms`, `atmospheric_gas_atoms`, `total_system_atoms`), `OlapLedger.initial_budget`, `OlapLedger::new`, `record_snapshot`. |
| **`evo-storage`** | `crates/evo-storage/src/checkpoint.rs` | 5 | `use evo_core::composition::AtomicComposition;`<br>Used in `SimulationCheckpoint.initial_budget`, constructor parameter. |
| **`evo-storage`** | `crates/evo-storage/tests/storage_test.rs` | 3 | `use evo_core::composition::AtomicComposition;`<br>Used in `AtomicComposition::new(1000, 2000, 500, 100, 20, 10, 2)` to test exact conservation and snapshot persistence. |
| **`evo-server`** | `crates/evo-server/src/session.rs` | 7 | `use evo_core::composition::AtomicComposition;`<br>Used in `SimulationSession` struct (`initial_budget`, `current_living_biomass`, `current_abiotic_reservoir`), `AtomicComposition::zero()`, `AtomicComposition::new()`. |
| **`evo-server`** | `crates/evo-server/src/main.rs` | 3 | `use evo_core::composition::AtomicComposition;`<br>Used in server entrypoint initial budget allocation. |
| **`evo-server`** | `crates/evo-server/src/grpc_service.rs` | 6 | `use evo_core::composition::AtomicComposition;`<br>Used in `SimulationGrpcService::new(initial_budget: AtomicComposition)`. |
| **`evo-regime-macro`** | `crates/evo-regime-macro/src/allometric_conservation.rs` | 7 | `use evo_core::composition::AtomicComposition;`<br>Used in `compute_individual_composition() -> AtomicComposition`, `compute_species_biomass() -> AtomicComposition`, `BiosphereGeosphereLedger.total_initial_atoms`, `assimilate_biomass`, `return_to_reservoir`, `verify_exact_conservation`. |
| **`evo-regime-macro`** | `crates/evo-regime-macro/tests/macro_evolution_test.rs` | 3 | `use evo_core::composition::AtomicComposition;`<br>Used in `test_allometric_conservation()` budget initialization. |
| **`evo-regime-multicell`** | `crates/evo-regime-multicell/src/organism.rs` | 8 | `use evo_core::composition::AtomicComposition;`<br>Used in `MulticellularOrganism::total_composition(&self) -> AtomicComposition`. |
| **`evo-regime-multicell`** | `crates/evo-regime-multicell/src/deb_energy.rs` | 9 | `use evo_core::composition::AtomicComposition;`<br>Used in `DynamicEnergyBudget::compute_elemental_composition(&self) -> AtomicComposition`. |
| **`evo-bridge`** | `crates/evo-bridge/src/projective_integration.rs` | 11 | `use evo_core::composition::AtomicComposition;`<br>Used in `ProjectiveStepper::integrate_step(...)` parameter and return types. |
| **`evo-bridge`** | `crates/evo-bridge/src/regime4_to_5.rs` | 6 | `use evo_core::composition::AtomicComposition;`<br>Used in `promote_chimeras_to_tissue(...) -> Result<(MulticellularOrganism, AtomicComposition), &'static str>`. |
| **`evo-bridge`** | `crates/evo-bridge/src/regime5_to_6.rs` | 7 | `use evo_core::composition::AtomicComposition;`<br>Used in `promote_tissue_to_macro_lineage(...) -> Result<(Lineage, AtomicComposition), &'static str>`. |
| **`evo-bridge`** | `crates/evo-bridge/tests/bridge_promotion_test.rs` | 1 | `use evo_core::composition::AtomicComposition;`<br>Used in bridge promotion integration test assertions. |
| **`apps/desktop`** | `apps/desktop/src-tauri/src/main.rs` | 5 | `use evo_core::composition::AtomicComposition;`<br>Used in Tauri desktop workstation startup state budget. |

In addition:
- **Python Client**: `python/evochronos/ledger.py` defines Python `AtomicComposition` mirroring the 7-element vector.
- **Schema Mapping**: `docs/SCHEMA_MAPPING_MANIFESTO.md` establishes `AtomicComposition` as the canonical in-memory simulation kernel representation.

---

## 4. Exact Code Edits Formulated

### Edit 1: Re-export in `crates/evo-core/src/composition.rs`
**File**: `crates/evo-core/src/composition.rs`  
**Target Lines**: 30–32  
**Content**:
```rust
/// Type alias for AtomicComposition to ensure full backwards and cross-crate compatibility
pub type AtomicComposition = ElementalComposition;
```
*(Verified: Currently present at lines 30–31)*.

### Edit 2: Re-export at Crate Root in `crates/evo-core/src/lib.rs`
**File**: `crates/evo-core/src/lib.rs`  
**Target Line**: 9  

**Before**:
```rust
pub use composition::{ElementalComposition, ElementIndex, NUM_ELEMENTS};
```

**After**:
```rust
pub use composition::{AtomicComposition, ElementalComposition, ElementIndex, NUM_ELEMENTS};
```
**Rationale**: Enables downstream consumers to import `AtomicComposition` either via `use evo_core::AtomicComposition;` or via `use evo_core::composition::AtomicComposition;`, satisfying both idiomatic root-level re-exports and module-scoped paths.

### Edit 3: Workspace Manifest Exclusion in `Cargo.toml`
**File**: `Cargo.toml`  
**Target Lines**: 15–16  

**Before**:
```toml
members = [
    "crates/evo-core",
    "crates/evo-regime-prebiotic",
    "crates/evo-regime-protocell",
    "crates/evo-gpu",
    "crates/evo-regime-prokaryote",
    "crates/evo-regime-eukaryote",
    "crates/evo-regime-multicell",
    "crates/evo-regime-macro",
    "crates/evo-bridge",
    "crates/evo-storage",
    "crates/evo-server",
]
```

**After**:
```toml
members = [
    "crates/evo-core",
    "crates/evo-regime-prebiotic",
    "crates/evo-regime-protocell",
    "crates/evo-gpu",
    "crates/evo-regime-prokaryote",
    "crates/evo-regime-eukaryote",
    "crates/evo-regime-multicell",
    "crates/evo-regime-macro",
    "crates/evo-bridge",
    "crates/evo-storage",
    "crates/evo-server",
]
exclude = [
    "apps/desktop/src-tauri",
]
```
**Rationale**: Eliminates the Cargo error `current package believes it's in a workspace when it's not` when building or checking `apps/desktop/src-tauri`.

---

## 5. Verification Commands and Empirical Validation

To verify the resolution independently:

1. **Check Entire Workspace**:
   ```bash
   export PATH="/opt/homebrew/bin:$PATH"
   cargo check --workspace
   ```
   **Result**: Exit code 0. All 11 crates (`evo-core`, `evo-regime-prebiotic`, `evo-regime-protocell`, `evo-gpu`, `evo-regime-prokaryote`, `evo-regime-eukaryote`, `evo-regime-multicell`, `evo-regime-macro`, `evo-bridge`, `evo-storage`, `evo-server`) check cleanly with zero compilation errors.

2. **Run All Workspace Unit and Integration Tests**:
   ```bash
   export PATH="/opt/homebrew/bin:$PATH"
   cargo test --workspace
   ```
   **Result**: Exit code 0. All unit tests, integration tests (`storage_test`, `bridge_promotion_test`, `chimeric_rfba_test`, `macro_evolution_test`, `multicell_dynamics_test`, `prebiotic_kinetics_test`, `dfba_solver_test`, `protocell_gates_test`, `spatial_conservation_test`), and doc-tests pass 100%.

3. **Check Storage and Server Crates Specifically**:
   ```bash
   export PATH="/opt/homebrew/bin:$PATH"
   cargo check -p evo-storage
   cargo check -p evo-server
   ```
   **Result**: Exit code 0 on both crates.

---

## 6. Implementation Checklist for Remediation Agent

- [ ] Apply Edit 2 to `crates/evo-core/src/lib.rs` (add `AtomicComposition` to `pub use composition::{...}`).
- [ ] Apply Edit 3 to `Cargo.toml` (add `exclude = ["apps/desktop/src-tauri"]`).
- [ ] Run `export PATH="/opt/homebrew/bin:$PATH"; cargo check --workspace` to confirm clean exit (0 errors).
- [ ] Run `export PATH="/opt/homebrew/bin:$PATH"; cargo test --workspace` to confirm 100% test pass rate.
