# Integration Test Protocol for EvoChronos

This protocol exercises end-to-end multi-scale simulation workflows across all biological regimes, analytical storage engines, and network interfaces.

## Working Directory
All commands must be executed from the `evochronos/` workspace root using relative paths.

## Field Reference Table

Copied character-for-character from source schema definitions (`migrations/001_initial_olap_schema.sql` and `proto/evochronos/v1/simulation.proto`):

| Schema / Component | Field Name | Type | Range / Constraints |
|---|---|---|---|
| `conservation_ledger` | `epoch_tick` | `UBIGINT` | $\ge 0$, monotonically increasing |
| `conservation_ledger` | `simulated_time_seconds` | `DOUBLE` | $\ge 0.0$ |
| `conservation_ledger` | `active_regime` | `INTEGER` | $1 \dots 6$ |
| `conservation_ledger` | `living_biomass_c` | `UBIGINT` | $\ge 0$ |
| `conservation_ledger` | `abiotic_reservoir_c` | `UBIGINT` | $\ge 0$ |
| `conservation_ledger` | `drift_atoms` | `BIGINT` | Must strictly equal `0` |
| `SimulationState` (proto) | `simulation_id` | `string` | Non-empty UUID |
| `SimulationState` (proto) | `current_epoch` | `uint64` | Monotonically increasing |
| `SimulationState` (proto) | `mass_conserved` | `bool` | Must be `true` |

## Execution UX & Commands

### Phase 1: Pre-Flight Check
```bash
python3 -c "import evochronos as evo; print('SDK OK')"
```

### Phase 2: Master Verification Harness
```bash
python3 verification/verify_master_full_system.py
```

### Phase 3: Functional Scenario Verification
```bash
python3 quality/test_functional.py
```

### Expected Output
- Pass Count: 100% (5/5 master suites, 13/13 functional tests)
- Atomic Drift: 0.0 atoms
