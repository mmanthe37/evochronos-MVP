# EvoChronos: Evolutionary Sandbox & Multi-Scale Biosimulation Platform

EvoChronos is a deterministic, biophysically grounded evolutionary simulation platform spanning **29 orders of magnitude in time** ($10^{-15}\text{ s}$ to $10^{14}\text{ s}$) and **12 orders of magnitude in space** ($10^{-10}\text{ m}$ to $10^2\text{ m}$), with **100% exact integer mass conservation across the 7 biogenic elements $[\mathrm{C, H, O, N, P, S, Fe}]$**.

---

## 🏗️ Architecture & Crates Structure

### Scientific Core & Biological Regimes
1. **`crates/evo-core`** (Foundation): Fundamental stoichiometric invariants (`AtomicComposition`), counter-based deterministic PRNG (`Philox-4x32-10`), physical constants, SI units, and regime domain definitions.
2. **`crates/evo-regime-prebiotic`** (Regime I): Mineral-catalyzed chemical kinetics in Archean hydrothermal alkaline vents, Gillespie SSA, clamped adaptive $\tau$-leaping, and Hordijk-Steel maxRAF set detection.
3. **`crates/evo-regime-protocell`** (Regime II): Fatty acid bilayer membrane biophysics, spontaneous mass-conserving division, Manfred Eigen quasispecies replicator dynamics with analytical error threshold $\mu_{\text{crit}} = \frac{\ln \sigma}{L}$, and Gánti chemoton synchrony.
4. **`crates/evo-gpu`** (Pillar 1): Hardware-accelerated integer-lattice spatial reaction-diffusion WGSL compute shaders with antisymmetric edge fluxes, operator splitting, and zero-copy parallel tree reduction.
5. **`crates/evo-regime-prokaryote`** (Regime III): Dynamic Flux Balance Analysis (dFBA) with Monod uptake kinetics, exact Gauss-Jordan nullspace basis reduction LP solver, and thermodynamic loop-law constraints eliminating internal futile cycles.
6. **`crates/evo-regime-eukaryote`** (Regime IV): Syntrophic hydrogen pull gating ($\Delta G < -15\text{ kJ/mol}$), tri-compartment block-angular chimeric stoichiometric merger, Nick Lane bioenergetic expansion (400x ATP/gene), and non-linear Hill-GRN RK4 regulation.
7. **`crates/evo-regime-multicell`** (Regime V): Richard Michod germ-soma convexity criterion, 3D Graph-Laplacian Turing activator-inhibitor reaction-diffusion, Malcolm Steinberg Differential Adhesion Hypothesis (DAH) cell sorting, and Kooijman DEB $\kappa$-rule.
8. **`crates/evo-regime-macro`** (Regime VI): Developmental genotype-phenotype Jacobian $J_{G \to P}$, Russell Lande quantitative genetics $\Delta \bar{z} = G \beta$, H. Allen Orr snowball effect quadratic BDMI speciation, and Jerome Kelleher $O(N + M \log M)$ `tskit` succinct tree sequence recording.

### Bridges, Storage & Distributed Platform
9. **`crates/evo-bridge`**: Formal coarse-graining bridge operators ($\mathcal{B}_{\text{I/II}\to\text{III}}, \mathcal{B}_{\text{III}\to\text{IV}}, \mathcal{B}_{\text{IV}\to\text{V}}, \mathcal{B}_{\text{V}\to\text{VI}}$) and Ioannis Kevrekidis Equation-Free Projective Integration Time-Stepper.
10. **`crates/evo-storage`**: Zarr v2/v3 multi-dimensional chunked tensor storage for 4D concentration fields, DuckDB-compatible OLAP conservation ledger, and atomic checkpoint persistence.
11. **`crates/evo-server`**: gRPC SimulationService protocol handlers (`proto/evochronos/v1/simulation.proto`) and REST JSON API gateway.

---

## 🖥️ User-Facing Applications & Ecosystem

1. **`apps/workbench` (Pillar 2 WebGPU Scientific Workbench)**:
   - React 18 / TypeScript / Tailwind / Vite with custom WGSL shaders.
   - Interactive 3D spatial hydrothermal lattice, metabolic flux diagrams, 3D Lande morphospace covariance ellipsoids, and coalescent trees.
   - Real-time Global Atomic Conservation HUD with 0.0 drift status indicator.
2. **`apps/desktop` (Tauri 2.0 Workstation App)**:
   - Native cross-platform desktop application bundling the workbench and Rust engine with native hardware acceleration (Vulkan / Metal).
3. **`apps/web` (Next.js 15 Web Platform)**:
   - Full-stack web application featuring interactive regime deep-dives, live atomic ledger calculator, scientific documentation, and cloud simulation launcher.
4. **`python/evochronos` (Python Scientific SDK)**:
   - Programmatic client for simulation control, Lande phenotypic trajectories, and `tskit` tree sequence genealogical analysis.

---

## 🧪 Scientific & Mathematical Verification

Run the master verification suite to audit all physical invariants, numerical convergence, and bridge operators:

```bash
python3 evochronos/verification/verify_master_full_system.py
```

### Verified Benchmark Criteria
- [x] **Mass Conservation**: 100% exact integer conservation across all 7 biogenic elements $[\mathrm{C, H, O, N, P, S, Fe}]$ with 0.0 drift.
- [x] **Prebiotic Kinetics**: Gillespie SSA distribution & Hordijk-Steel maxRAF closure.
- [x] **Protocells & Quasispecies**: Analytical Eigen error catastrophe $\mu_{\text{crit}} = \frac{\ln \sigma}{L}$ and chemoton cycle closure.
- [x] **GPU Integer Kernel**: Anti-symmetric edge-flux stencil bit-exact integer mass conservation.
- [x] **Prokaryote dFBA**: Sparse Gauss-Jordan nullspace LP solver ($S v = 0$ to $0.00$ residual) & loop-law elimination.
- [x] **Eukaryogenesis & rFBA**: Syntrophy hydrogen pull ($\Delta G < -15\text{ kJ/mol}$), block-angular chimeric transport, Nick Lane 400x ATP/gene scaling, and Hill-GRN RK4 regulation.
- [x] **Multicellularity**: Michod germ-soma convexity synergy ($W_{\text{group}} > \max w_{\text{indiv}}$), 3D Graph-Laplacian Turing pattern formation, Steinberg DAH interfacial tension, Krogh avascular diffusion limit, and Kooijman DEB $\kappa$-rule.
- [x] **Macroevolution**: Centered finite difference developmental Jacobian, Lande $G$-matrix phenotypic selection trajectory, Orr's snowball quadratic BDMI speciation ($I \propto t^2$), and `tskit` MRCA resolution.
- [x] **Equation-Free Time-Stepping**: Kevrekidis projective integration leaps with atomic rebalancing.
- [x] **Storage & Distribution**: Zarr chunking, OLAP ledger audits, gRPC protocol handlers, and Python SDK end-to-end integration.

---

## 📜 License
Distributed under the MIT OR Apache-2.0 License.
