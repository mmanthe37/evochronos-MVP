---
name: repo-check-up
description: >-
  Audits repository health, performs surgical non-breaking remediations for
  compiler/linter warnings, verifies test suites and domain invariants, checks
  for candidate third-party APIs/MCPs/secrets (free vs low-cost), and delivers
  clear diagnostic summaries with beginner-friendly explanations.
---

# Repo Check-Up

## Overview
The `repo-check-up` skill executes an end-to-end repository health inspection, compiler/lint remediation, multi-tier test verification, and external ecosystem readiness evaluation. It is designed to run after completing major project phases or before release milestones to ensure the codebase remains clean, performant, strictly aligned with physical/mathematical invariants, and equipped with modern developer integrations.

## Dependencies
- [`credentials`](file:///Users/michaelmanthejr/.gemini/config/plugins/science/skills/credentials/SKILL.md): Mandatory for safe handling and verification of API keys and environment tokens without printing secrets to logs.
- [`polyglot-test-agent`](file:///Users/michaelmanthejr/.gemini/config/skills/polyglot-test-agent/SKILL.md): Guides multi-language test suite orchestration across Rust, Python, and TypeScript.
- [`refactor`](file:///Users/michaelmanthejr/.gemini/config/skills/refactor/SKILL.md): Enforces surgical, non-breaking edits, dead code elimination, and memory layout optimization.

---

## Quick Start
To trigger a full repo check-up on the current project:
```bash
# Invocation prompt example:
"Run a repo check-up on the current codebase, fix any genuine compiler or linter issues, verify all tests, and check ecosystem readiness."
```

---

## Workflow

### 1. Workspace Health & Diagnostics Audit
Perform a comprehensive, non-destructive diagnostic scan across all technology stacks present in the repository:
1. **Rust Workspace**:
   - Run `cargo check --workspace --all-targets` to detect compiler warnings, unused imports, dead parameters, or deprecated features.
   - Run `cargo clippy --workspace --all-targets` to identify performance bottlenecks, oversized `Result<T, E>` variants (`clippy::result_large_err`), needless loop indices, and numeric conversion oversights.
2. **Python SDK & Tooling**:
   - Verify bytecode syntax across all modules with `python3 -m py_compile <files>`.
   - Run static analysis / lint checks using `ruff check .` or `pyright` if configured.
3. **Web / Frontend**:
   - Run type checking and production bundling (e.g. `npm run build` or `tsc --noEmit`).
4. **Protobuf & Interface Schemas**:
   - If `.proto` schemas or IDLs are present, run schema linters (e.g. `buf lint`).

*Tally every objective diagnostic finding. Do not invent artificial problems or enforce pedantic cosmetic churn.*

---

### 2. Surgical Remediation & Invariant Guardrails (Option A)
Methodically apply targeted, non-breaking remediations:
1. **Low-Risk Automatic Fixes**:
   - **Prune dead imports** and prefix intentionally unused arguments with an underscore (e.g., `_req`).
   - **Optimize Memory Layout**: Box oversized enum variants (e.g., arrays in error types) to reduce memory footprint across call stacks.
   - **Derive Trait Implementations**: Replace boilerplate manual implementations (such as empty `Default`) with `#[derive(Default)]`.
   - **Numeric & Kinetic Safety**: Replace raw integer divisions with checked operations (e.g. `.checked_div()`) to prevent division by zero in simulation kinetics.
   - **Attribute Management**: Add explicit allowances (`#[allow(non_camel_case_types)]`, `#[allow(clippy::needless_range_loop)]`) where mathematical or Roman numeral notations provide greater scientific clarity than default linter suggestions.
2. **Invariant Preservation**:
   - Ensure all fundamental scientific, mathematical, and architectural invariants (e.g., zero atomic drift $\Delta N_{\text{atoms}} \equiv 0$, energy conservation, public API backwards compatibility) remain strictly preserved.
3. **Escalation Protocol**:
   - If an issue is ambiguous, alters core architecture, or could introduce behavioral regressions, **pause and ask the user for guidance** before modifying the code.

---

### 3. Multi-Tier Verification Suite
Execute and verify the full spectrum of project tests:
1. **Core Unit & Integration Tests**:
   - Run `cargo test --workspace` and verify 100% test pass rates across all crates.
2. **Language SDK & Scientific Harnesses**:
   - Run Python functional tests (`python3 quality/test_functional.py`) and external data adapter suites (`python3 tests/test_adapters.py`).
   - Execute domain-specific master verification harnesses (`python3 verification/verify_master_full_system.py`).
3. **Frontend Production Build**:
   - Re-run `npm run build` to guarantee zero bundling or type-check regressions.
4. **Post-Remediation Linter Check**:
   - Re-run `cargo clippy --workspace --all-targets` and ensure the workspace is 100% warning-free.

---

### 4. Ecosystem, Integrations & Credentials Assessment
Evaluate candidate external integrations using the curated [Ecosystem Catalog](file:///Users/michaelmanthejr/.gemini/config/skills/repo-check-up/references/ecosystem_catalog.md):
1. **Third-Party APIs**:
   - Prioritize zero-cost, open-access public resources (e.g., BiGG Models for SBML networks, eQuilibrator for thermodynamic $\Delta G^{\circ \prime}$ bounds, PubChem PUG REST for elemental formulas, Add-my-Pet for DEB parameters, UniProt for redox/CoRR metadata, Open Tree of Life for phylogenies).
   - Flag commercial/paid services separately (e.g., KEGG REST) and detail cost implications.
2. **Model Context Protocol (MCP) Servers**:
   - Assess available MCP servers that would accelerate development (e.g., Rust Analyzer MCP for semantic navigation, DuckDB MCP for ledger querying, GitHub MCP for repository releases, Context7 MCP for versioned documentation, Playwright MCP for E2E WebGPU testing).
3. **Credentials & Secrets Checklist**:
   - Generate a markdown table summarizing required and optional environment keys:
     | Secret / Variable | Target Integration | Cost Tier | Status | Required vs. Optional | Acquisition Link |
     | :--- | :--- | :--- | :--- | :--- | :--- |

---

### 5. Synthesis, Git Sync & Beginner-Friendly Explanations
Deliver the final report structured for both engineering rigor and intuitive clarity:
1. **Sectional Plain-Language Notes**:
   - At the conclusion of each report section (Code Health, Remediations, Verification, Ecosystem), include a 1–2 sentence callout:
     > **💡 What this means in simple terms:** [Clear, non-technical explanation of the section's findings].
2. **High-Level Concluding Summary**:
   - Provide a final 1-paragraph explanation of what happened, written for someone new to programming, evolutionary biology, and mathematics. Explain how the changes keep the simulation stable and what the code accomplished.
3. **Version Control Synchronization**:
   - If clean and approved, stage modified files and commit with a standard message (`chore(repo-checkup): ...`), then push to the upstream repository.

---

## Common Mistakes
1. **Inventing Artificial Problems**: Do not refactor functional code or rewrite established architectures merely to satisfy an audit prompt. Only fix legitimate compiler/linter warnings, memory bloat, and verified test defects.
2. **Breaking Invariants for Linter Satisfaction**: Never compromise exact conservation laws (e.g. integer mass balance) or API contracts to satisfy a stylistic lint suggestion.
3. **Exposing Secrets**: Never print API keys or tokens to terminal stdout or log files when auditing credentials. Always follow the safe checking conventions of the `credentials` skill.
