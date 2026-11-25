---
goal: Comprehensive Integration and Phased Implementation Plan for EvoChronos Tooling, Science Databases, and Quality Ecosystem
version: 1.0.0
date_created: 2026-10-19
last_updated: 2026-10-19
owner: EvoChronos Architecture & Multi-Agent Team
status: 'In progress'
tags: [feature, architecture, quality, science-data, mcp, lsp, ui, integration]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

This implementation plan defines the systematic analysis, architectural mapping, immediate execution steps, and long-term phased roadmaps for 14 specialized tooling, science data, UI, and quality capabilities within the **EvoChronos Evolutionary Sandbox** project.

## 1. Requirements & Constraints

- **REQ-001**: Every integration must preserve the fundamental physical invariant: exact integer mass conservation across the 7 biogenic elements $[\mathrm{C, H, O, N, P, S, Fe}]$ with 0.0 drift.
- **REQ-002**: Integrations must be partitioned into **Immediate Implementation** (core developer experience, quality protocols, schema mappings, UI ergonomics) and **Deferred/Planned Integrations** (external API adapters, biological sequence pipelines, 3D PyMOL rendering, Google Antigravity autonomous agents, MCP server export).
- **REQ-003**: All implementation steps must adhere to clean architecture, keeping existing crates modular and fully testable without breaking existing verification benchmarks.
- **SEC-001**: External API integrations (NCBI, Ensembl, GTEx, arXiv, UCSC) must respect rate limits, use caching, and safely handle optional API keys without exposing secrets.
- **GUD-001**: User interfaces must follow the Superhuman UI design system constraints (Inter font, 4px grid spacing, high contrast, composited animations).
- **PAT-001**: Follow the Quality Playbook standard for quality constitutions, functional tests, Council of Three spec audits, and regression protocols.

---

## 2. Capability Examination & Analysis Matrix

| Capability | Domain | Relevant EvoChronos Component | Implementation Timing | Implementation Strategy |
|---|---|---|---|---|
| `/lsp-setup` | Dev Experience | Workspace Root (`lsp.json`) | **Now** | Configure `rust-analyzer`, `tsserver`, and `pyright` in repo-level `lsp.json`. |
| `/quality-playbook` | Testing & Verification | `quality/` directory & `AGENTS.md` | **Now** | Generate `quality/QUALITY.md`, `quality/test_functional.py`, `RUN_CODE_REVIEW.md`, `RUN_INTEGRATION_TESTS.md`, `RUN_SPEC_AUDIT.md`. |
| `/superhuman-ui-skills` | UI / UX Design | `apps/workbench` & `apps/web` | **Now** | Refine layout, typography (Inter + JetBrains Mono), 4px grid scale, and accessible semantic colors. |
| `/building-data-apps` | Data Visualization | `apps/workbench` & `apps/web` | **Now** | Implement structured KPI cards, z-index overlays, and ECharts-compatible telemetry views. |
| `/schema-mapping` | Data Architecture | `migrations/` & `crates/evo-storage` | **Now** | Write the Semantic Schema Mapping Manifesto linking DuckDB OLAP, Zarr tensors, and gRPC Protobuf. |
| `/review-and-refactor` | Code Quality | All Crates & Apps | **Now** | Perform architectural code audit, eliminate dead code, and ensure all tests continue passing with 0 errors. |
| `/literature-search-arxiv` | Literature Grounding | `crates/evo-server` / Python SDK | **Phase 5b** | Automated research adapter for fetching cited prebiotic chemistry & macroevolution papers. |
| `/ncbi-sequence-fetch` | Genomics & Sequences | `crates/evo-regime-protocell`, `crates/evo-regime-eukaryote` | **Phase 5b** | Seed empirical ancient RNA/protein sequences (e.g. ferredoxin, ancient ribosomal RNAs). |
| `/ensembl-database` | Gene & ID Translation | `crates/evo-regime-eukaryote`, `crates/evo-regime-macro` | **Phase 5b** | Cross-reference CoRR mitochondrial gene loci and ortholog sets. |
| `/protein-sequence-msa` | Bio-Informatics | `crates/evo-regime-macro` | **Phase 5b** | Clustal Omega alignment to construct empirical mutation variance matrices ($M$) for Lande $G$-matrix. |
| `/pymol` | 3D Visualization | `apps/workbench` / Artifacts | **Phase 5c** | Headless PyMOL rendering for 3D Fe-S catalytic active sites and ATP synthase complexes. |
| `/gtex-database` | Expression Data | `crates/evo-regime-eukaryote`, `crates/evo-regime-multicell` | **Phase 5c** | Empirical gene expression baselines for validating Hill GRN dynamic ranges. |
| `/ucsc-conservation-and-tfbs` | Evolutionary Genomics | `crates/evo-regime-macro` | **Phase 5c** | Calibrate phyloP/phastCons constraint distributions against Lande phenotypic selection gradients. |
| `/google-antigravity-sdk` | Agent Orchestration | `python/evochronos` / `agents/` | **Phase 6** | Build autonomous in-simulation research agents to conduct unsupervised parameter sweeps. |
| `/mcp-apps-builder` | Platform Extensibility | `mcp-server/` | **Phase 6** | Package EvoChronos as a standalone Model Context Protocol server with interactive UI widgets. |

---

## 3. Implementation Steps

### Implementation Phase 1: Developer Experience & Quality Constitution (Immediate)

- GOAL-001: Establish developer code intelligence and the full Quality Playbook system.

| Task | Description | Completed | Date |
|---|---|:---:|:---:|
| TASK-001 | Configure repo-level `lsp.json` with `rust-analyzer`, `typescript-language-server`, and `pyright` | ✅ | 2026-10-19 |
| TASK-002 | Create `quality/QUALITY.md` defining fitness-to-purpose scenarios and coverage targets | ✅ | 2026-10-19 |
| TASK-003 | Create `quality/test_functional.py` with 1:1 mapping to QUALITY.md scenarios and spec sections | ✅ | 2026-10-19 |
| TASK-004 | Create `quality/RUN_CODE_REVIEW.md` with strict guardrails against hallucinated findings | ✅ | 2026-10-19 |
| TASK-005 | Create `quality/RUN_INTEGRATION_TESTS.md` with Field Reference Table and execution UX | ✅ | 2026-10-19 |
| TASK-006 | Create `quality/RUN_SPEC_AUDIT.md` for Council of Three multi-model audits | ✅ | 2026-10-19 |
| TASK-007 | Create/Update `AGENTS.md` with project bootstrap context and quality docs pointers | ✅ | 2026-10-19 |

### Implementation Phase 2: UI Refinements & Schema Mapping Manifesto (Immediate)

- GOAL-002: Polish workbench UI aesthetics according to Superhuman guidelines and map data schemas.

| Task | Description | Completed | Date |
|---|---|:---:|:---:|
| TASK-008 | Apply Superhuman 4px grid, Inter font, semantic colors to `apps/workbench` and `apps/web` | ✅ | 2026-10-19 |
| TASK-009 | Author Semantic Schema Mapping Manifesto (`docs/SCHEMA_MAPPING_MANIFESTO.md`) for DuckDB, Zarr, and Protobuf | ✅ | 2026-10-19 |
| TASK-010 | Review and refactor core crates, ensuring all verification benchmarks pass cleanly | ✅ | 2026-10-19 |

### Implementation Phase 3: Scientific Data & Empirical Sequence Pipeline (Completed)

- GOAL-003: Integrate NCBI, Ensembl, Clustal Omega, and PyMOL empirical data adapters into Python SDK and Workbench.

| Task | Description | Completed | Date |
|---|---|:---:|:---:|
| TASK-011 | Create `evochronos/python/evochronos/adapters/ncbi.py` wrapping sequence retrieval | ✅ | 2026-10-20 |
| TASK-012 | Create `evochronos/python/evochronos/adapters/ensembl.py` for CoRR gene annotations | ✅ | 2026-10-20 |
| TASK-013 | Implement Clustal Omega alignment wrapper for mutational covariance matrix $M$ calculation | ✅ | 2026-10-20 |
| TASK-014 | Implement headless PyMOL renderer producing 3D PNG/PSE structure sessions for the workbench | ✅ | 2026-10-20 |
| TASK-015 | Implement arXiv literature search tool for automated parameter provenance citations | ✅ | 2026-10-20 |

### Implementation Phase 4: Autonomous Agents & MCP Extensibility (Planned)

- GOAL-004: Implement Google Antigravity Agent integrations and Model Context Protocol server.

| Task | Description | Completed | Date |
|---|---|:---:|:---:|
| TASK-016 | Integrate Google Antigravity SDK (`LocalAgentConfig`) for autonomous sandbox exploration | | |
| TASK-017 | Scaffold and build `evochronos-mcp` using `mcp-use` exposing simulation tools and React widgets | | |

---

## 4. Alternatives

- **ALT-001**: Implementing all external science APIs synchronously inside the core Rust engine. Rejected because external web API calls introduce network fragility and non-determinism into the core simulation loop. External databases must be integrated via asynchronous Python SDK adapters and ingested via pre-computed configurations.
- **ALT-002**: Pure client-side WebGPU PyMOL viewer. Rejected because PyMOL requires native C/Python libraries; headless server-side generation with `.pse` export and sidecar streaming is the standard pattern.

## 5. Dependencies

- `rust-analyzer` (Rust LSP)
- `typescript-language-server` (TS LSP)
- `pyright` (Python LSP)
- `uv` (Fast Python package and script runner for science plugins)
- `mcp-use` (for future MCP server export)

## 6. Testing

- `python3 evochronos/quality/test_functional.py`
- `python3 evochronos/verification/verify_master_full_system.py`
- Integration test suite: `python3 -m pytest evochronos/`

## 7. Risks & Assumptions

- **RISK-001**: External scientific databases (NCBI, Ensembl, GTEx, UCSC) may enforce strict rate limits or downtime. Mitigated by using local fixture caches and explicit offline modes.
- **ASSUMPTION-001**: Developers and AI agents working on the codebase have access to Python 3.10+ and standard Node/TypeScript toolchains.
