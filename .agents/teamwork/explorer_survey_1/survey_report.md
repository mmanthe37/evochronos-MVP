# EvoChronos Technical Survey Report: Codebase Structure, Developer Tooling & WebGPU Workbench

**Surveying Agent**: `explorer_survey_1` (`teamwork_preview_explorer`)  
**Date & Timestamp**: 2026-10-20T03:34:00Z  
**Workspace Root**: `/Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos`  
**Working Directory**: `/Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos/.agents/teamwork/explorer_survey_1`

---

## Executive Summary

A comprehensive, read-only technical audit of the EvoChronos platform was conducted covering developer tooling (`lsp.json`), the WebGPU Scientific Workbench application (`apps/workbench`), and a repository-wide inventory of all 11 Rust crates, 3 frontend applications, Python SDK, Protobuf contracts, quality infrastructure, and verification suites.

Key survey outcomes:
1. **LSP Configuration (`lsp.json`)**: Fully configured and active for Rust (`rust-analyzer`), TypeScript/JavaScript (`typescript-language-server`), and Python (`pyright-langserver`), matching all file extensions in the repository (`.rs`, `.ts`, `.tsx`, `.js`, `.jsx`, `.py`).
2. **WebGPU Workbench Application (`apps/workbench`)**:
   - **Typography**: Conforms to Inter typography, importing `Inter:wght@400;500;600;700` and `JetBrains+Mono:wght@400;500;700` in `index.html` (lines 8–10), activating Inter character variants (`cv02, cv03, cv04, cv11`) in `src/index.css` (line 8), and using `font-sans` across key interface components.
   - **Grid System**: Conforms to the Superhuman 4px grid system using strict Tailwind CSS spacing multiples (4px base units with 2px half-grid increments for compact HUD elements).
   - **Dynamic Viewport**: Implements `h-dvh` in `src/App.tsx` (line 119) with `w-full` and `overflow-hidden` for dynamic mobile and desktop viewport adaptation without viewport jumping or unintended scrolling.
   - **Build Configuration & Viability**: Cleanly builds with `tsc && vite build` in **15.49s** with **0 errors, 0 warnings**, generating optimized production assets (`dist/index.html` 0.87 kB, `dist/assets/index-C4-4rbh6.css` 14.78 kB, `dist/assets/index-ADrCfr3R.js` 172.51 kB).
3. **Repository Architecture**: Multi-scale polyglot monorepo comprising 11 Cargo workspace crates, 3 user-facing applications (Workbench, Desktop Tauri, Next.js Web), Python scientific SDK, gRPC protobuf schemas, SQL migrations, YAML configurations, and 100% passing automated test suites (`test_functional.py` 13/13 passing; `verify_master_full_system.py` 5/5 suites passing with 0.0 atomic drift).

---

## 1. Developer Tooling: `lsp.json` Audit

### 1.1 Configuration Analysis
The workspace root contains `lsp.json` configuring language servers for the three primary programming languages utilized in EvoChronos.

**Exact File Path**: `evochronos/lsp.json`  
**File Size**: 563 bytes (29 lines)

```json
1: {
2:   "lspServers": {
3:     "rust": {
4:       "command": "rust-analyzer",
5:       "args": [],
6:       "fileExtensions": {
7:         ".rs": "rust"
8:       }
9:     },
10:     "typescript": {
11:       "command": "typescript-language-server",
12:       "args": ["--stdio"],
13:       "fileExtensions": {
14:         ".ts": "typescript",
15:         ".tsx": "typescriptreact",
16:         ".js": "javascript",
17:         ".jsx": "javascriptreact"
18:       }
19:     },
20:     "python": {
21:       "command": "pyright-langserver",
22:       "args": ["--stdio"],
23:       "fileExtensions": {
24:         ".py": "python"
25:       }
26:     }
27:   }
28: }
```

### 1.2 Verification Matrix
| Language | Server Command | Mode / Flags | Extension Mappings | Repository Coverage |
| :--- | :--- | :--- | :--- | :--- |
| **Rust** | `rust-analyzer` | Standard stdio | `.rs` (`rust`) | 11 crates in `crates/`, `apps/desktop/src-tauri` |
| **TypeScript / JS** | `typescript-language-server` | `--stdio` | `.ts` (`typescript`), `.tsx` (`typescriptreact`), `.js` (`javascript`), `.jsx` (`javascriptreact`) | `apps/workbench/src/`, `apps/web/src/`, root config files |
| **Python** | `pyright-langserver` | `--stdio` | `.py` (`python`) | `python/evochronos/`, `quality/test_functional.py`, `verification/*.py` |

The `lsp.json` adheres to standard IDE/agent LSP protocols, correctly mapping language identifiers to standard language servers.

---

## 2. WebGPU Scientific Workbench (`apps/workbench`)

The Workbench serves as the interactive scientific cockpit for real-time visualization of the 6 biological regimes, the discrete 7-element mass conservation ledger, metabolic flux networks, Lande phenotypic morphospace, and coalescent genealogies.

### 2.1 Typography Audit
- **Font Family Imports**:
  In `apps/workbench/index.html` (lines 8–10):
  ```html
  8:     <link rel="preconnect" href="https://fonts.googleapis.com">
  9:     <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  10:     <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  ```
  Both Google Fonts CDN preconnect and font stylesheet are loaded, providing weights `400`, `500`, `600`, and `700` for **Inter**, alongside **JetBrains Mono**.
- **Character Variant Feature Settings**:
  In `apps/workbench/src/index.css` (lines 5–10):
  ```css
  5: @layer base {
  6:   body {
  7:     @apply bg-[#090d16] text-slate-100;
  8:     font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  9:   }
  10: }
  ```
  The specific OpenType character variants (`cv02`, `cv03`, `cv04`, `cv11`) are Inter-specific typographic features enabling open four (`cv02`), single-story open 'a' (`cv03`), disambiguated capital I/l/1 (`cv04`), and single-story 'y' (`cv11`).
- **Typography Application Across Components**:
  - `body` in `index.html` (line 12): `font-sans antialiased`
  - `App.tsx` (line 119): `font-sans` applied to root viewport container
  - `ConservationHud.tsx` (line 62): `font-sans uppercase` for regime badge; `font-mono` (line 47) for numerical elemental atom counts
  - `RegimeControls.tsx` (line 99): `text-[11px] font-bold tracking-tight`
  - `MetabolicFluxView.tsx` (lines 24, 38, 56, 73): clear hierarchical typography combining sans-serif headings with monospace reaction matrices
  - `PhylogenyTreeCanvas.tsx` (line 10): `font-sans text-sm` heading with monospace metadata labels

### 2.2 Grid Styling Audit (4px Grid System Conformance)
The user interface follows the 4px baseline grid system popularized by Superhuman UI. All spacing parameters are multiples of 4px (or 2px half-grid steps for tight dense data layouts):

| Spacing Class | Pixel Equivalent | Multiplier | Concrete Component Usage |
| :--- | :--- | :--- | :--- |
| `p-1`, `py-1`, `gap-1` | 4 px | 1 × 4px | `ConservationHud.tsx:71`, `RegimeControls.tsx:61` |
| `px-2`, `py-0.5`, `p-2` | 8 px / 2 px | 2 × 4px / 0.5 × 4px | `MetabolicFluxView.tsx:39, 43`, `RegimeControls.tsx:78` |
| `px-3`, `py-1.5`, `gap-1.5` | 12 px / 6 px | 3 × 4px / 1.5 × 4px | `ConservationHud.tsx:67`, `WebGpuSpatialCanvas.tsx:182` |
| `p-2.5` | 10 px | 2.5 × 4px | `App.tsx:152, 163, 173, 183` (Side toolbar buttons) |
| `p-4`, `px-4`, `py-2`, `gap-2` | 16 px / 8 px | 4 × 4px / 2 × 4px | `RegimeControls.tsx:41, 46`, `ConservationHud.tsx:50` |
| `p-6`, `px-6`, `py-3`, `gap-3` | 24 px / 12 px | 6 × 4px / 3 × 4px | `ConservationHud.tsx:47`, `MetabolicFluxView.tsx:20` |
| `gap-4`, `gap-6` | 16 px / 24 px | 4 × 4px / 6 × 4px | `App.tsx:149`, `ConservationHud.tsx:47` |
| `w-14` | 56 px | 14 × 4px | `App.tsx:149` (Fixed side navigation bar) |
| `w-4 h-4`, `w-5 h-5` | 16 × 16 px / 20 × 20 px | 4 × 4px / 5 × 4px | Icon dimensions across all toolbars |

### 2.3 Viewport Configuration
Dynamic viewport sizing is explicitly declared in `apps/workbench/src/App.tsx` (line 119):
```tsx
119: <div className="flex flex-col h-dvh w-full bg-[#090d16] text-slate-100 select-none overflow-hidden font-sans">
```
- `h-dvh` (Dynamic Viewport Height): Guarantees 100% dynamic viewport utilization, expanding and contracting as mobile or desktop address bars and browser chrome show or hide, eliminating the 100vh scrolling bug.
- `overflow-hidden`: Prevents outer document scrollbars, allowing sub-panels (`MetabolicFluxView` with `overflow-y-auto`, canvas with `relative overflow-hidden`) to control scroll isolation.
- `w-full`: Guarantees full-width horizontal responsive anchoring.

### 2.4 Build Configuration, Dependencies, Scripts & Viability
- **`package.json` (`apps/workbench/package.json`)**:
  - Name: `"evochronos-workbench"` (v0.1.0)
  - Type: `"module"`
  - Scripts:
    - `"dev": "vite"`
    - `"build": "tsc && vite build"`
    - `"preview": "vite preview"`
  - Runtime Dependencies:
    - `react`: `^18.3.1`
    - `react-dom`: `^18.3.1`
    - `lucide-react`: `^0.453.0`
    - `clsx`: `^2.1.1`
    - `tailwind-merge`: `^2.5.4`
  - Dev Dependencies:
    - `@types/react`: `^18.3.11`
    - `@types/react-dom`: `^18.3.1`
    - `@webgpu/types`: `^0.1.44`
    - `@vitejs/plugin-react`: `^4.3.2`
    - `autoprefixer`: `^10.4.20`
    - `postcss`: `^8.4.47`
    - `tailwindcss`: `^3.4.14`
    - `typescript`: `^5.6.3`
    - `vite`: `^5.4.9`
- **Compiler Configuration (`tsconfig.json`)**:
  - Target: `ES2022`, Module: `ESNext`, ModuleResolution: `bundler`.
  - Type definitions include `@webgpu/types` for native WGSL / WebGPU typing.
  - Strict mode enabled (`"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`).
- **Bundler Configuration (`vite.config.ts`)**:
  - React plugin enabled.
  - Development server headers configured for SharedArrayBuffer / WebGPU cross-origin isolation:
    - `Cross-Origin-Opener-Policy: same-origin`
    - `Cross-Origin-Embedder-Policy: require-corp`
- **Build Viability Verification**:
  - Executed command: `npm run build` (`tsc && vite build`)
  - Execution result: **Exit code 0 (Success)**
  - Total duration: **15.49 seconds**
  - Transformed modules: **1,577 modules**
  - Generated bundle artifacts in `dist/`:
    - `dist/index.html`: `0.87 kB` (gzip: `0.50 kB`)
    - `dist/assets/index-C4-4rbh6.css`: `14.78 kB` (gzip: `3.60 kB`)
    - `dist/assets/index-ADrCfr3R.js`: `172.51 kB` (gzip: `54.03 kB`)

### 2.5 WebGPU Shaders and Visualizers
The workbench includes dedicated WGSL shader files:
- `apps/workbench/src/shaders/volumetric_grid.wgsl` (58 lines): WebGPU WGSL volumetric raymarched spatial grid shader rendering 3D Archean mineral chimneys, pore networks, and chemical concentration fields.
- `apps/workbench/src/shaders/morphospace.wgsl` (55 lines): WebGPU WGSL 3D phenotypic morphospace and Lande $G$-matrix covariance ellipsoid shader.
- `apps/workbench/src/components/WebGpuSpatialCanvas.tsx`: Dual-engine architecture featuring native `navigator.gpu` initialization with automatic fallback to high-fidelity Canvas2D reaction-diffusion particle rendering (120 particles, thermal gradients, and 16 reaction channels).

---

## 3. Comprehensive Repository Codebase Inventory

### 3.1 Cargo Workspace Crates (`crates/`)
The repository contains 11 modular crates defined in the root `Cargo.toml`:

```
crates/
├── evo-core/                 # Foundational primitives, mass invariants & PRNG
├── evo-regime-prebiotic/     # Regime I: Prebiotic geochemistry & maxRAF
├── evo-regime-protocell/     # Regime II: Protocells, vesicles & quasispecies
├── evo-gpu/                  # Pillar 1: WebGPU integer-lattice reaction-diffusion
├── evo-regime-prokaryote/    # Regime III: Prokaryote dFBA & thermodynamic loop-laws
├── evo-regime-eukaryote/     # Regime IV: Syntrophy & tri-compartment rFBA
├── evo-regime-multicell/     # Regime V: Michod convexity & Turing morphogenesis
├── evo-regime-macro/         # Regime VI: Lande G-matrix, BDMI speciation & tskit
├── evo-bridge/               # Coarse-graining operators & Projective Integration
├── evo-storage/              # Zarr tensor stores & DuckDB OLAP ledger
└── evo-server/               # gRPC SimulationService & REST gateway
```

#### Detailed Crates Inventory Table
| Crate Name | Path | Key Modules / Files | Primary Role & Theoretical Grounding |
| :--- | :--- | :--- | :--- |
| **`evo-core`** | `crates/evo-core` | `composition.rs`, `constants.rs`, `filter.rs`, `lib.rs`, `prng.rs`, `regime.rs`, `tests/invariants_test.rs` | 7-element $[C, H, O, N, P, S, Fe]$ exact integer composition arithmetic; Philox-4x32-10 counter PRNG; physical constants |
| **`evo-regime-prebiotic`** | `crates/evo-regime-prebiotic` | `compartment.rs`, `lib.rs`, `raf.rs`, `reaction.rs`, `ssa.rs`, `tau_leaping.rs`, `tests/prebiotic_kinetics_test.rs` | Gillespie SSA, clamped adaptive $\tau$-leaping, Hordijk-Steel maxRAF autocatalytic set detection |
| **`evo-regime-protocell`** | `crates/evo-regime-protocell` | `chemoton.rs`, `lib.rs`, `quasispecies.rs`, `vesicle.rs`, `tests/protocell_gates_test.rs` | Fatty acid bilayer division, Manfred Eigen quasispecies replicator with analytical error threshold $\mu_{\text{crit}} = \frac{\ln \sigma}{L}$, Gánti chemoton |
| **`evo-gpu`** | `crates/evo-gpu` | `kernel.rs`, `lattice.rs`, `lib.rs`, `shaders/*.wgsl`, `tests/spatial_conservation_test.rs` | WebGPU WGSL compute shaders with antisymmetric edge fluxes, operator splitting, and zero-copy parallel reduction |
| **`evo-regime-prokaryote`** | `crates/evo-regime-prokaryote` | `dfba.rs`, `flux.rs`, `guild.rs`, `lib.rs`, `lp_solver.rs`, `tests/dfba_solver_test.rs` | Dynamic Flux Balance Analysis (dFBA), Monod uptake kinetics, Gauss-Jordan nullspace basis reduction LP solver, loop-law elimination |
| **`evo-regime-eukaryote`** | `crates/evo-regime-eukaryote` | `bioenergetics_egt.rs`, `chimera.rs`, `chimeric_matrix.rs`, `hill_grn.rs`, `lib.rs`, `locus.rs`, `rfba.rs`, `tests/chimeric_rfba_test.rs` | Syntrophic hydrogen pull ($\Delta G < -15\text{ kJ/mol}$), block-angular chimeric stoichiometric matrix, Nick Lane 400x ATP/gene, Hill-GRN RK4 regulation |
| **`evo-regime-multicell`** | `crates/evo-regime-multicell` | `adhesion_potts.rs`, `deb_energy.rs`, `krogh_cylinder.rs`, `lib.rs`, `michod_gating.rs`, `organism.rs`, `turing_morphogen.rs`, `tests/multicell_dynamics_test.rs` | Michod germ-soma convexity criterion, 3D Graph-Laplacian Turing pattern morphogens, Steinberg DAH cell sorting, Kooijman DEB $\kappa$-rule |
| **`evo-regime-macro`** | `crates/evo-regime-macro` | `allometric_conservation.rs`, `jacobian_g2p.rs`, `lande_g_matrix.rs`, `lib.rs`, `lineage.rs`, `snowball_bdmi.rs`, `tskit_recorder.rs`, `tests/macro_evolution_test.rs` | Developmental genotype-phenotype Jacobian $J_{G \to P}$, Russell Lande quantitative genetics $\Delta \bar{z} = G \beta$, Orr snowball BDMI speciation ($I \propto t^2$), Jerome Kelleher `tskit` succinct trees |
| **`evo-bridge`** | `crates/evo-bridge` | `gating.rs`, `lib.rs`, `projective_integration.rs`, `regime1_2_to_3.rs`, `regime3_to_4.rs`, `regime4_to_5.rs`, `regime5_to_6.rs`, `stoichiometric_projector.rs`, `syntrophy.rs`, `tests/bridge_promotion_test.rs` | Formal coarse-graining bridge operators ($\mathcal{B}_{\text{I/II}\to\text{III}}, \mathcal{B}_{\text{III}\to\text{IV}}, \mathcal{B}_{\text{IV}\to\text{V}}, \mathcal{B}_{\text{V}\to\text{VI}}$), Kevrekidis Equation-Free Projective Integration |
| **`evo-storage`** | `crates/evo-storage` | `checkpoint.rs`, `lib.rs`, `olap_ledger.rs`, `zarr_tensor.rs`, `tests/storage_test.rs` | Zarr v2/v3 4D chunked tensor storage, DuckDB-compatible OLAP ledger, atomic state checkpoints |
| **`evo-server`** | `crates/evo-server` | `grpc_service.rs`, `lib.rs`, `main.rs`, `rest_gateway.rs`, `session.rs` | gRPC SimulationService protocol handlers (`simulation.proto`), REST JSON gateway |

### 3.2 User-Facing Applications (`apps/`)
1. **`apps/workbench`**:
   - Scientific WebGPU workbench with real-time HUD, regime playback controls, 3D spatial canvas, dFBA flux tables, Lande morphospace, and `tskit` tree viewer.
2. **`apps/desktop`**:
   - Tauri 2.0 cross-platform native workstation application.
   - Files: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`.
3. **`apps/web`**:
   - Next.js 15 web platform.
   - Files: `next.config.js`, `package.json`, `tailwind.config.js`, `tsconfig.json`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`.

### 3.3 Python Scientific SDK (`python/`)
- Root: `python/`
- Configuration: `pyproject.toml`
- Modules in `python/evochronos/`:
  - `__init__.py`: Package entrypoint exporting `AtomicComposition`, `ConservationLedger`, `LandeMorphospace`, `SuccinctTreeSequence`.
  - `ledger.py`: Python wrapper for the 7-element atomic ledger and closed stoichiometric arithmetic.
  - `client.py`: High-level simulation client interface.
  - `morphospace.py`: Lande quantitative genetics trajectory solver.
  - `trees.py`: Succinct tree sequence wrapper.
- Demonstration: `python/examples/archean_to_macro_demo.py` (simulates cross-regime transition from prebiotic hydrothermal vent through macroevolution with 0.0 drift).

### 3.4 gRPC Interface Definition (`proto/`)
- File: `proto/evochronos/v1/simulation.proto`
- Defines `SimulationService` gRPC service with endpoints:
  - `InitializeSimulation(InitializeRequest) returns (InitializeResponse)`
  - `StepSimulation(StepRequest) returns (StepResponse)`
  - `StreamSimulationState(StreamRequest) returns (stream SimulationStateChunk)`
  - `PromoteRegimeBridge(PromoteRequest) returns (PromoteResponse)`
  - `AuditConservationLedger(AuditRequest) returns (AuditResponse)`

### 3.5 Quality & Review Infrastructure (`quality/`)
- `quality/QUALITY.md`: EvoChronos Quality Constitution defining fitness-to-purpose scenarios across all 6 regimes and mathematical invariance bounds.
- `quality/test_functional.py`: 13 automated tests directly evaluating physical specifications and scenarios (all 13 passing).
- `quality/RUN_CODE_REVIEW.md`: Review guidelines, code quality standards, and approval gates.
- `quality/RUN_INTEGRATION_TESTS.md`: Integration test execution protocol.
- `quality/RUN_SPEC_AUDIT.md`: Physical and mathematical invariant audit protocol.

### 3.6 Verification Test Suites (`verification/`)
- `verification/verify_master_full_system.py`: Master test orchestrator running all 5 phase suites:
  1. `verify_phase0_phase1.py`: Mass conservation, PRNG determinism, prebiotic SSA, maxRAF sets, protocell division, quasispecies error threshold.
  2. `verify_phase2.py`: GPU integer lattice edge-flux stencils and bit-exact conservation.
  3. `verify_phase3.py`: Prokaryote dFBA nullspace solver, eukaryotic syntrophy, multicellular Michod convexity, and macroevolutionary Lande trajectories.
  4. `verify_phase4.py`: Zarr tensor chunks, DuckDB OLAP ledger, and Kevrekidis projective integration leaps.
  5. `archean_to_macro_demo.py`: Multi-regime end-to-end integration demo.
- Result: **All 5/5 verification suites pass with exit code 0 and 0.0 atomic drift**.

### 3.7 Documentation, Plans, Configuration & Database Migrations
- `docs/SCHEMA_MAPPING_MANIFESTO.md`: Formal mapping specifications connecting the in-memory Rust simulation state, Zarr chunked arrays, DuckDB relational OLAP schemas, and gRPC protobuf contracts.
- `plan/feature-tool-integrations-1.md`: Architectural implementation plan for 14 empirical science and agent capabilities.
- `config/biochemistry_rules.json`: Thermodynamic and stoichiometric rule definitions.
- `config/default_earth_archean.yaml`: Environmental baseline parameterization for Archean Earth (3.8 Ga hydrothermal vent).
- `migrations/001_initial_olap_schema.sql`: SQL DDL defining the relational ledger schema for DuckDB persistence.

---

## 4. Synthesis of Findings & Key Takeaways

1. **Robust Structural Coherence**: The repository possesses clean domain separation. Biological mechanisms are strictly isolated within individual crates (`crates/evo-regime-*`), connected only via formalized bridge operators (`crates/evo-bridge`), ensuring coarse-graining mathematically respects atom conservation.
2. **Strict Invariant Verification**: Integer conservation ($\Delta N_{\text{atoms}} \equiv 0$) is upheld across Rust, WGSL shaders, Python SDK, and frontend UI displays. Both automated functional tests (`quality/test_functional.py`) and master verification (`verify_master_full_system.py`) execute in fractions of a second with zero failures.
3. **Frontend Production Readiness**: `apps/workbench` builds cleanly without warnings or errors. Typography adheres to Inter specifications with character variants enabled. Grid layouts strictly conform to 4px multiples. Dynamic viewport height is enforced via `h-dvh`.
4. **Tooling Alignment**: `lsp.json` provides unified code intelligence for Rust, TypeScript, and Python across the entire monorepo.
