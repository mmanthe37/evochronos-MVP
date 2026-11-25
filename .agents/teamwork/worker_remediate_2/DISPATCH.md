## 2026-10-20T04:03:41Z
You are worker_remediate_2, a teamwork_preview_worker agent.
Your working directory is:
/Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos/.agents/teamwork/worker_remediate_2

MANDATORY: Read /Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos/.agents/teamwork/ORIGINAL_REQUEST.md before starting work. Do NOT summarize or skip this step.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

The project workspace directory is:
/Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos

Your assignment is to implement the exact remediation plans formulated by the three remediation explorers:

1. **Rust Workspace Compilation Remediation** (from `.agents/teamwork/explorer_remed_1/analysis.md`):
   - Edit `crates/evo-core/src/lib.rs` (line 9) to re-export `AtomicComposition`:
     `pub use composition::{AtomicComposition, ElementalComposition, ElementIndex, NUM_ELEMENTS};`
   - Edit `Cargo.toml` workspace block to add:
     `exclude = ["apps/desktop/src-tauri"]`
   - Verify `PATH="/opt/homebrew/bin:~/.cargo/bin:$PATH" cargo check --workspace` and `cargo test -p evo-core`.

2. **Functional Test Facade Remediation** (from `.agents/teamwork/explorer_remed_2/analysis.md`):
   - Edit `quality/test_functional.py`:
     - Replace `test_scenario_3_fba_thermodynamic_loop_law` with genuine loop-law flux constraint and projection logic.
     - Replace `test_scenario_4_eukaryotic_chimeric_translocation_drift` with genuine `evo.AtomicComposition` base-pair stoichiometry (A-T and G-C average formula C39 H47 O24 N15 P4) and exact 7-element invariant conservation ($6,450,000$ atoms).
     - Replace `test_boundary_zero_carbon_starvation` with explicit zero-carbon budget (`starved_budget = evo.AtomicComposition(carbon=0, hydrogen=1000, ...)`).
   - Edit `PROJECT.md` line 130 to update path for Feature 13 to `crates/evo-regime-prokaryote/src/lp_solver.rs`.
   - Verify `python3 quality/test_functional.py` passes all 13 tests.

3. **Workbench UI & Schema Manifesto Remediation** (from `.agents/teamwork/explorer_remed_3/analysis.md`):
   - Edit `apps/workbench/tailwind.config.js` to add `fontFamily` under `theme.extend`:
     `fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'] },`
   - Edit the 6 workbench component files in `apps/workbench/src/` to harmonize all 22 fractional classes to exact 4px grid multiples (`py-1`, `py-2`, `gap-2`, `w-4 h-4`, `p-2`, etc.) per the table in `explorer_remed_3/analysis.md`.
   - Edit `docs/SCHEMA_MAPPING_MANIFESTO.md` to update Section 3 Rule 2 chunk shape from `[1, 16, 16, 16]` to `[1, 16, 16, 16, 16]`.
   - Verify `PATH="/usr/local/bin:$PATH" npm --prefix apps/workbench run build` succeeds cleanly.

4. **Run Full Verification**:
   - `python3 quality/test_functional.py`
   - `python3 verification/verify_master_full_system.py`
   - `PATH="/usr/local/bin:$PATH" npm --prefix apps/workbench run build`
   - `PATH="/opt/homebrew/bin:~/.cargo/bin:$PATH" cargo check --workspace`

5. **Deliverables**:
   - Write execution report to:
     /Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos/.agents/teamwork/worker_remediate_2/worker_report.md
   - Write 5-component handoff report to:
     /Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos/.agents/teamwork/worker_remediate_2/handoff.md
   - Send completion message via send_message to orchestrator_1 when finished.
