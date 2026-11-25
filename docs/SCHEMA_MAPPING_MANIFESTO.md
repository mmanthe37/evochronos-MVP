# EvoChronos Semantic Schema Mapping Manifesto

## 1. Executive Summary

This manifesto documents the formal cross-system schema mappings, transformations, and data integrity guarantees connecting the four primary data layers in the **EvoChronos Evolutionary Sandbox**:
1. **Simulation In-Memory Kernel**: Live Rust structures (`AtomicComposition`, `SimulationSession`)
2. **DuckDB Columnar OLAP Database**: `migrations/001_initial_olap_schema.sql`
3. **Zarr v2/v3 Chunked Tensor Store**: Multi-dimensional spatial grids `(T, X, Y, Z, S)`
4. **gRPC Protobuf Contracts**: `proto/evochronos/v1/simulation.proto`

---

## 2. Table-by-Table Semantic Mapping

### Mapping 1: Conservation Ledger

| Canonical Attribute | In-Memory Core (`AtomicComposition`) | DuckDB OLAP Column | Zarr Tensor Path | gRPC Protobuf Field | Transformation / Type Cast |
|---|---|---|---|---|---|
| Epoch Index | `u64` | `tick UBIGINT` | `meta.epoch` | `uint64 current_epoch` | Exact $1:1$ integer cast |
| Physical Time | `f64` (seconds) | `simulated_time_seconds DOUBLE` | `time_axis` | `double simulated_time_seconds` | Exact IEEE 754 64-bit float |
| Biological Regime | `u32` ($1 \dots 6$) | `regime UTINYINT` | `meta.regime` | `uint32 active_regime` | Enum / integer ID mapping |
| Living Carbon | `u128` | `carbon_atoms_u128 VARCHAR` | `c_field[0]` | `uint64 living_carbon_atoms` | Exact 128-bit string cast (overflow guard) |
| Living Hydrogen | `u128` | `hydrogen_atoms_u128 VARCHAR` | `c_field[1]` | `uint64 living_hydrogen_atoms` | Exact 128-bit string cast |
| Living Oxygen | `u128` | `oxygen_atoms_u128 VARCHAR` | `c_field[2]` | `uint64 living_oxygen_atoms` | Exact 128-bit string cast |
| Living Nitrogen | `u128` | `nitrogen_atoms_u128 VARCHAR` | `c_field[3]` | `uint64 living_nitrogen_atoms` | Exact 128-bit string cast |
| Living Phosphorus | `u128` | `phosphorus_atoms_u128 VARCHAR` | `c_field[4]` | `uint64 living_phosphorus_atoms` | Exact 128-bit string cast |
| Living Sulfur | `u128` | `sulfur_atoms_u128 VARCHAR` | `c_field[5]` | `uint64 living_sulfur_atoms` | Exact 128-bit string cast |
| Living Iron | `u128` | `iron_atoms_u128 VARCHAR` | `c_field[6]` | `uint64 living_iron_atoms` | Exact 128-bit string cast |
| Drift Invariant | `i128` | `drift_detected BOOLEAN` | N/A | `bool mass_conserved` | `drift == 0 ? false : true` (FALSE = conserved) |

### Mapping 2: Spatial Lattice & Concentrations

| Coordinate Dimension | Simulation Stencil | DuckDB Metric | Zarr Dimension | WebGPU Vertex / Texture |
|---|---|---|---|---|
| Time Step | `t: u64` | `epoch_tick` | Axis 0 (`shape[0]`) | Time uniform `u.time` |
| X Lattice Coordinate | `0 .. 63` | `x_cell` | Axis 1 (`shape[1]`) | Vertex `position.x` |
| Y Lattice Coordinate | `0 .. 63` | `y_cell` | Axis 2 (`shape[2]`) | Vertex `position.y` |
| Z Lattice Coordinate | `0 .. 63` | `z_cell` | Axis 3 (`shape[3]`) | Vertex `position.z` |
| Chemical Species | `0 .. 15` | `species_id` | Axis 4 (`shape[4]`) | Texture channel / color lookup |

---

## 3. Data Integrity & Invariant Validation Rules

1. **Exact 7-Element Balance**:
   $$\sum_{p \in \{\text{living}, \text{dissolved}, \text{mineral}, \text{atmosphere}\}} \text{Atoms}(p) \equiv \text{Initial Budget}$$
   DuckDB migration `001_initial_olap_schema.sql` records exact conservation state via `drift_detected BOOLEAN NOT NULL DEFAULT FALSE`.
2. **Chunk Boundary Alignment**:
   Zarr chunk dimensions `[1, 16, 16, 16, 16]` represent a 5D tensor slice `(T=1, X=16, Y=16, Z=16, S=16)` totaling 65,536 f32 elements (256 KiB). Each chunk encapsulates a $16 \times 16 \times 16$ spatial voxel subvolume with all 16 chemical species concentration channels contiguous in memory, aligning directly with WebGPU $(16 \times 16 \times 1)$ compute workgroup dispatches across the 16 $z$-slices for zero-copy DMA streaming into WebGPU storage buffers.
