# Curated Scientific & Engineering Ecosystem Catalog

This reference catalog is used during Phase 4 of the `repo-check-up` workflow to evaluate candidate third-party APIs, MCP servers, developer tooling, and environment credentials.

---

## 1. Third-Party APIs

### Critical APIs
| Resource | Domain / Function | Project Usage | Cost / License Tier | Acquisition / Docs Link |
| :--- | :--- | :--- | :--- | :--- |
| **BiGG Models API** | Systems Biology / Genome-Scale Models | Load reference SBML metabolic networks (Regime III dFBA) | Free / Public Academic | [bigg.ucsd.edu](http://bigg.ucsd.edu/) |
| **eQuilibrator API** | Biochemical Thermodynamics | Calculate reaction $\Delta G^{\circ \prime}$ bounds (Regimes I–IV) | Free / Open-Source (MIT) | [equilibrator.weizmann.ac.il](https://equilibrator.weizmann.ac.il/) |
| **PubChem PUG REST** | Small Molecule Cheminformatics | Fetch exact elemental formulas & SMARTS structures (Regime I) | Free / Public Domain (NCBI) | [pubchem.ncbi.nlm.nih.gov](https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest) |
| **Apache Arrow Flight** | High-Throughput Streaming | Zero-copy tensor & telemetry streaming (`evo-server` $\leftrightarrow$ UI) | Free / Open-Source (Apache-2.0) | [arrow.apache.org](https://arrow.apache.org/docs/format/Flight.html) |

### Important APIs
| Resource | Domain / Function | Project Usage | Cost / License Tier | Acquisition / Docs Link |
| :--- | :--- | :--- | :--- | :--- |
| **Add-my-Pet (AmP) DEB** | Dynamic Energy Budget (DEB) | Calibrate Kooijman DEB $\kappa$ and maintenance priors (Regime V) | Free / Open-Access | [bio.vu.nl/thb/deb/deblab/add_my_pet](https://www.bio.vu.nl/thb/deb/deblab/add_my_pet/) |
| **Rhea & ChEBI APIs** | Curated Biochemical Reactions | Atom-balanced, mass-conserving reaction rules (Regimes I–III) | Free / Open-Source (CC-BY 4.0) | [rhea-db.org](https://www.rhea-db.org/) / [ebi.ac.uk/chebi](https://www.ebi.ac.uk/chebi/) |
| **UniProt REST API** | Protein Knowledgebase | Hydrophobicity, trans-membrane & redox metadata for CoRR EGT (Regime IV) | Free / Open-Access (CC-BY 4.0) | [uniprot.org](https://www.uniprot.org/) |
| **Open Tree of Life API**| Synthetic Phylogeny | Benchmark reconstructed phylogenetic topologies (Regime VI) | Free / Open-Source (BSD/CC0) | [opentreeoflife.org](https://tree.opentreeoflife.org/) |

### Low Priority / Commercial APIs
| Resource | Domain / Function | Project Usage | Cost / License Tier | Acquisition / Docs Link |
| :--- | :--- | :--- | :--- | :--- |
| **Paleobiology DB (PBDB)**| Fossil Occurrences | Macroevolutionary fossil & body-size baselines (Regime VI) | Free / Open-Access (CC-BY 4.0) | [paleobiodb.org](https://paleobiodb.org/) |
| **KEGG REST API** | Kyoto Encyclopedia of Genes/Genomes | Orthology & metabolic pathway lookups (Regimes III–IV) | Free Academic / Paid Commercial | [kegg.jp](https://www.kegg.jp/) |
| **Materials Project API** | Materials Science / Minerals | Hydrothermal mineral catalyst properties & surface energies (Regime I) | Free with API Key (CC-BY 4.0) | [materialsproject.org](https://materialsproject.org/) |

---

## 2. Model Context Protocol (MCP) Servers

| Server Name | Role & Agent Capability | Tier | Setup Method |
| :--- | :--- | :--- | :--- |
| **Rust Analyzer MCP** | Gives agents deep code intelligence (types, traits, definitions, diagnostics) across Rust crates. | Free / Open-Source | `mcp install rust-analyzer` |
| **DuckDB MCP** | Enables instant in-process SQL queries over Parquet/Arrow OLAP lineage ledgers and conservation logs. | Free / Open-Source | Standard MCP executable |
| **GitHub / Git MCP** | Equips agents with automated repository management, PR reviews, and provenance auditing. | Free / Open-Source | `gh` CLI token or personal access token |
| **Context7 MCP** | Provides version-pinned, current documentation for fast-moving libraries (`wgpu`, `tskit`, `tauri`, `next.js`). | Freemium (Free tier available) | Context7 API key |
| **PostgreSQL MCP** | Direct schema and transactional queries for database snapshot metadata. | Free / Open-Source | PostgreSQL connection string |
| **Prometheus / Grafana MCP** | Agent live telemetry inspection for scientific gauges and resource utilization metrics. | Free / Open-Source | Local Prometheus endpoint |
| **ArXiv & PubMed MCP** | Direct scholarly literature queries for parameter calibration and Empirical Grounding Matrices. | Free / Open-Source | NCBI Entrez email parameter |
| **Playwright MCP** | Headless browser execution for end-to-end testing of interactive WebGPU canvas and UI workbench. | Free / Open-Source | Node / Playwright runtime |
| **Docker / K8s MCP** | Container execution, reproducibility testing, and cluster orchestration. | Free / Open-Source | Local Docker daemon socket |

---

## 3. Linters, Static Analysis & Specialized Tooling

| Tool / Linter | Focus & Capabilities | Command / Invocation |
| :--- | :--- | :--- |
| **`cargo clippy`** | Strict Rust lints, integer arithmetic safety, and memory footprint validation. | `cargo clippy --workspace --all-targets` |
| **`naga-cli` & `wgsl-analyzer`** | Validation and syntax linting for WGSL compute and render shaders (`evo-gpu`). | `naga <shader.wgsl>` |
| **`proptest` & `cargo-nextest`** | High-performance property-based fuzzing of conservation invariants ($E \cdot S = 0$). | `cargo nextest run` |
| **`buf`** | Protobuf linting and breaking-change detection for gRPC interfaces (`simulation.proto`). | `buf lint` |
| **`ruff` & `pyright` / `mypy`** | Fast linting, static analysis, and type-checking for Python SDK and verification suites. | `ruff check .` / `pyright` |
| **`biome`** | Fast linting and formatting for TypeScript and React frontend workbench. | `npx @biomejs/biome check .` |
| **`num-dual`** | Exact forward-mode algorithmic differentiation for $J_{G \to P}$ developmental Jacobians. | Rust crate dependency |
| **`tskit-rust` & `msprime`**| Native succinct tree sequence (`.trees`) validation and coalescent genealogical interop. | Rust crate / Python bindings |
| **`ViennaRNA` (`RNAlib`)** | Empirical secondary structure RNA folding energetics for Regime II replicator quasispecies. | Native C/Python library |
| **`maturin`** | Build and package PyO3 native Rust extensions for high-speed Python bindings. | `maturin develop` |
| **`cargo-deny` & `cargo-udeps`** | Audit Rust dependency licenses, security CVEs, and detect dead crate dependencies. | `cargo deny check` / `cargo udeps` |
| **`sqlfluff` & `criterion.rs`** | SQL schema formatting and nanosecond-resolution solver benchmarking. | `sqlfluff lint` / `cargo bench` |

---

## 4. Credentials & Secrets Assessment Template

When auditing a project, generate this standardized table to report credential readiness:

| Secret / Environment Variable | Target Integration | Cost Tier | Status | Required vs. Optional | Where to Obtain |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GITHUB_TOKEN` | GitHub MCP / Releases | Free | Configured | Optional (Required for PRs/Push) | GitHub Settings $\to$ Developer Tokens |
| `CONTEXT7_API_KEY` | Context7 MCP | Freemium | Unset | Optional | [context7.com](https://context7.com) |
| `MATERIALS_PROJECT_API_KEY` | Materials Project API | Free Tier | Unset | Optional | [materialsproject.org](https://materialsproject.org) |
| `NCBI_API_KEY` | NCBI Entrez (Higher RPS) | Free | Unset | Optional (Enhances rate limit from 3 to 10 RPS) | [ncbi.nlm.nih.gov/account](https://www.ncbi.nlm.nih.gov/account/) |
