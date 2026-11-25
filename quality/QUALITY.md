# EvoChronos Quality Constitution (QUALITY.md)

> **Quality is Built-In, Not Inspected** (W. Edwards Deming)  
> **Fitness for Purpose** (Joseph Juran)  
> **Zero Defects as Physical Invariant** (Philip Crosby)

---

## 1. Purpose & Philosophy

EvoChronos is a multi-scale evolutionary simulation platform spanning 29 orders of magnitude in time ($10^{-15}\text{ s}$ to $10^{14}\text{ s}$) and 12 orders in space. In a simulation of this scope, conventional unit testing alone is insufficient. Code can execute cleanly and report high test coverage while silently generating physical absurdities — non-conserved atoms, thermodynamically impossible futile cycles, or false speciation events.

For EvoChronos, **quality means physical truth and algorithmic determinism**:
1. **Absolute Invariant Conservation**: The exact count of atoms across the 7 biogenic elements $[\mathrm{C, H, O, N, P, S, Fe}]$ must be preserved with **0.0 integer drift** across every tick, vesicle division, endosymbiotic merger, developmental step, and projective leap.
2. **Thermodynamic Validity**: Internal reactions must not generate free energy or uncoupled futile cycles ($\sum_{\text{cycle}} \Delta G = 0 \implies \text{flux} = 0$).
3. **Emergence Without Teleology**: Regime transitions ($\mathcal{B}_{\text{I/II}\to\text{III}}, \mathcal{B}_{\text{III}\to\text{IV}}, \mathcal{B}_{\text{IV}\to\text{V}}, \mathcal{B}_{\text{V}\to\text{VI}}$) must occur strictly when objective dynamical gating thresholds are met.

---

## 2. Subsystem Coverage Targets & Risk Rationales

| Subsystem | Target Coverage | Rationale & Failure Mode Prevented |
|---|---|---|
| `crates/evo-core` | **100%** | Fundamental arithmetic for 7-element stoichiometry and Philox PRNG. A single off-by-one error or overflow corrupts the entire planetary ledger. |
| `crates/evo-gpu` | **95%** | WGSL spatial diffusion compute kernels. Prevents edge-flux numerical leakage across spatial lattice boundaries. |
| `crates/evo-regime-prebiotic` | **90%** | Gillespie SSA and maxRAF detectors. Prevents non-autocatalytic sets from falsely triggering autopoiesis. |
| `crates/evo-regime-protocell` | **90%** | Bilayer mechanics and Eigen quasispecies replicator. Prevents division without mass balance or false error catastrophe equilibrium. |
| `crates/evo-regime-prokaryote` | **95%** | Gauss-Jordan nullspace reduction LP solver and loop-law elimination. Prevents steady-state $Sv = 0$ violations and futile biomass generation. |
| `crates/evo-regime-eukaryote` | **90%** | Block-angular chimeric stoichiometry, Nick Lane bioenergetics, and Hill GRN. Prevents illegal cytosol-mitochondrion atomic transport. |
| `crates/evo-regime-multicell` | **90%** | Michod ETI convexity, 3D Graph-Laplacian Turing, and Krogh anoxia. Prevents selfish cheater takeover and unphysical tissue growth beyond diffusion limits. |
| `crates/evo-regime-macro` | **90%** | Developmental Jacobian $J_{G \to P}$, Lande $G$-matrix, Orr BDMI snowball, and `tskit` tables. Prevents non-positive definite $G$-matrices and coalescent cycle corruption. |
| `crates/evo-bridge` | **95%** | Multi-scale bridge operators and Kevrekidis projective integration. Prevents atomic drift across macro-leaps. |
| `crates/evo-storage` | **90%** | Zarr chunked tensors and DuckDB OLAP ledger. Prevents corrupt checkpoint resumption and data loss. |

---

## 3. Coverage Theater Prevention

Do not write tests that artificially inflate coverage without asserting physical truth. The following anti-patterns are explicitly banned:

- ❌ **The Presence Fallacy**: Asserting that a function returned a result without verifying its values (e.g. `assert result is not None`).
- ❌ **The Mock Echo**: Testing mocked solvers that only assert what the mock was programmed to return.
- ❌ **Tolerant Conservation**: Asserting that mass conservation was "close enough" (e.g. `abs(drift) < 1.0`). In EvoChronos, drift must be **identically zero ($0.0$)**.
- ❌ **Unchecked Steady-State**: Asserting that an LP solver converged without multiplying $S \cdot v$ and asserting maximum residual $< 10^{-6}$.

---

## 4. Fitness-to-Purpose Scenarios

### Scenario 1: Prebiotic Autocatalytic Leakage
- **Vulnerability**: A reaction template with misbalanced hydrogen coefficients could generate net atoms from futile loops.
- **Physical Consequence**: Artificial accumulation of living biomass, breaking planetary conservation.
- **Verification**: Verify that every reaction stoichiometry in `biochemistry_rules.json` sums to $[0, 0, 0, 0, 0, 0, 0]$ across all 7 elements.

### Scenario 2: Protocell Bilayer Division Mass Imbalance
- **Vulnerability**: Vesicle fission upon surface area doubling ($A = 2 A_0$) divides encapsulated metabolites between daughter cells with integer truncation.
- **Physical Consequence**: Lost atoms during division cascade across generations, leaking planetary carbon.
- **Verification**: Assert that $\sum \text{Daughter Atoms} \equiv \text{Parent Atoms}$ bit-for-bit.

### Scenario 3: FBA Thermodynamic Loop Law Bypass
- **Vulnerability**: Standard LP maximization can exploit internal cycles with zero net stoichiometric exchange to circulate infinite futile flux.
- **Physical Consequence**: Organisms produce biomass without substrate consumption.
- **Verification**: Assert that for any cycle $\sum \Delta G = 0$, the loop-law projector forces cyclic flux to zero.

### Scenario 4: Eukaryotic Chimeric Translocation Drift
- **Vulnerability**: Endosymbiotic Gene Transfer (EGT) moves genes from organellar chromosome to nuclear chromosome without updating base-pair stoichiometry.
- **Physical Consequence**: Unaccounted DNA nitrogen/phosphorus mass shifts.
- **Verification**: Verify that 100,000 base pairs undergoing translocation preserve exact $[C, H, O, N, P]$ counts.

### Scenario 5: Krogh Avascular Tissue Overgrowth
- **Vulnerability**: Multicellular tissue volume increases without vascular delivery or anoxia checks.
- **Physical Consequence**: Living cells survive deep in anoxic cores ($C_{O_2} \le 0$).
- **Verification**: Verify that when tissue radius exceeds $R_{\text{crit}} = \sqrt{\frac{6 D C_0}{R_{\text{met}}}}$, inner cells trigger necrotic apoptosis.

### Scenario 6: Non-Positive Definite Lande G-Matrix
- **Vulnerability**: Developmental Jacobian transformations $J M J^T$ without standing variance regularization yield negative eigenvalues.
- **Physical Consequence**: Phenotypic mean evolves in the opposite direction of the selection gradient $\boldsymbol{\beta}$ (descending adaptive peaks).
- **Verification**: Assert that $G$ has strictly positive diagonal entries and all eigenvalues $\lambda_i > 0$.

### Scenario 7: Kevrekidis Projective Extrapolation Drift
- **Vulnerability**: Macroscopic time leaps ($\Delta T = 100 \times \delta t$) extrapolate continuous state variables, causing non-integer atomic deviations.
- **Physical Consequence**: Roundoff error produces atomic mass discrepancies against the geosphere.
- **Verification**: Reconcile projective leaps against the abiotic reservoir, asserting $\Delta N_{\text{atoms}} \equiv 0$ strictly.

---

## 5. AI Session Quality Discipline

Every AI session touching EvoChronos must adhere to these rules:
1. **Never alter the 7-element invariant**: Do not change $u128$ counts to floating-point values without integer reconciliation.
2. **Always run the master verification suite**: Run `python3 evochronos/verification/verify_master_full_system.py` before and after modifying code.
3. **Preserve existing tests**: Do not delete or disable existing tests to make a build pass.

---

## 6. The Human Gate

The following decisions require explicit human review and authorization:
- Adding or modifying fundamental biogenic elements beyond $[\mathrm{C, H, O, N, P, S, Fe}]$.
- Modifying planetary initial boundary conditions in `default_earth_archean.yaml`.
- Altering the gating thresholds for major evolutionary regime promotions.
