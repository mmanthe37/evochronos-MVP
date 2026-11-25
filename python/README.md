# EvoChronos Scientific Python SDK

The `evochronos` Python SDK provides high-level programmatic access to the EvoChronos multi-scale evolutionary simulation engine.

## Capabilities

- **Multi-Regime Trajectory Analysis**: Seamlessly analyze trajectories spanning Regimes I through VI (Prebiotic Geochemistry -> Macroevolution).
- **Exact Invariant Verification**: Built-in verification tools for the 7 biogenic elements `[C, H, O, N, P, S, Fe]` with 0.0 drift tolerance.
- **Lande $G$-Matrix & Morphospace**: Compute developmental Jacobians $J_{G \to P}$, genetic covariance matrices, and phenotypic selection trajectories.
- **Tree Sequence Ancestry**: Inspect genealogies and MRCA coalescents formatted for `tskit`.
- **gRPC and REST Client**: Direct streaming integration with local and remote EvoChronos simulation servers.

## Installation

```bash
pip install -e ./evochronos/python
```

## Quickstart

```python
import evochronos as evo

# Create local simulation session with Archean boundary conditions
sim = evo.Simulation(config="default_earth_archean.yaml", random_seed=42)

# Advance simulation by 1000 epochs
result = sim.step(steps=1000, dt=1.0)

# Verify atomic conservation
ledger = sim.get_ledger()
assert ledger.is_strictly_conserved()
print(f"Active Regime: {sim.active_regime_name}, Living Carbon: {ledger.living_carbon} atoms")
```
