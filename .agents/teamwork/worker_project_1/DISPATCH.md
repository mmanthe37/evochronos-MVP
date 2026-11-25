## 2026-10-20T03:38:42Z
You are worker_project_1, a teamwork_preview_worker agent.
Your working directory is:
/Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos/.agents/teamwork/worker_project_1

MANDATORY: Read /Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos/.agents/teamwork/ORIGINAL_REQUEST.md before starting work. Do NOT summarize or skip this step.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

The project workspace directory is:
/Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos

Context from Survey Phase:
The 3 survey agents have completed their findings in:
1. /Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos/.agents/teamwork/explorer_survey_1/survey_report.md
2. /Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos/.agents/teamwork/explorer_survey_2/survey_report.md
3. /Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos/.agents/teamwork/spec_miner_survey_3/survey_report.md

Your assignment:
1. Synthesize and write `PROJECT.md` at the project workspace root:
   /Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos/PROJECT.md
   Follow the project pattern decomposition template:
   - `# Project: EvoChronos Platform Expansion`
   - `## Architecture`: 11 Rust crates, 3 frontend apps (workbench, desktop, web), Python Scientific SDK, DuckDB OLAP migrations, Zarr 5D tensor stores, gRPC Protobuf specs.
   - `## Feature Inventory`: Complete inventory of all features discovered during survey across R1, R2, R3, mapped to Milestones M1 through M7. Every feature from survey must have an assigned milestone.
   - `## Milestones`:
     - M1: Developer Tooling & LSP Setup (`lsp.json` for Rust, TS, Python) - Status: DONE
     - M2: Quality Constitution & Scenario Protocol (`quality/QUALITY.md`, `RUN_CODE_REVIEW.md`, `RUN_SPEC_AUDIT.md`, `RUN_INTEGRATION_TESTS.md`) - Status: DONE
     - M3: Functional Testing & Physical Conservation Verification (`quality/test_functional.py` 13/13 passing, 5/5 invariant verification suites with \Delta N_{atoms} \equiv 0$) - Status: DONE
     - M4: WebGPU Scientific Workbench Standards (Inter font, 4px grid, `h-dvh` layout, production build verified) - Status: DONE
     - M5: Cross-System Semantic Schema Mapping (`docs/SCHEMA_MAPPING_MANIFESTO.md` across Rust, DuckDB, Zarr, Protobuf) - Status: DONE
     - M6: Empirical Science & Agent Integration Plan (`plan/feature-tool-integrations-1.md` covering all 14 capabilities, PyMOL, Antigravity SDK, MCP server) - Status: DONE
     - M7: Full Verification, Gate & Victory Attestation (all acceptance criteria verified, review, adversarial stress-testing, forensic integrity audit) - Status: IN_PROGRESS
   - `## Interface Contracts`: Detail cross-module interfaces (Kernel <-> DuckDB, Kernel <-> Zarr, Kernel <-> Protobuf, WebGPU <-> Simulation Stream).
   - `## Code Layout`: Document layout of crates/, apps/, python/, proto/, quality/, verification/, docs/, plan/.

2. Verify all build and test commands directly:
   - Run `python3 quality/test_functional.py` and capture output.
   - Run `python3 verification/verify_master_full_system.py` and capture output.
   - Run `PATH="/usr/local/bin:$PATH" npm --prefix apps/workbench run build` and capture output.

3. Deliver your work:
   - Write a detailed execution report to:
     /Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos/.agents/teamwork/worker_project_1/worker_report.md
   - Write a complete handoff report (Observation, Logic Chain, Caveats, Conclusion, Verification Method) to:
     /Users/michaelmanthejr/Downloads/EvoChronos Evolutionary Sandbox/Docs/AI Generated Project Documents/Original Gemini Argon 4 Oct 14 2026 Project Files/evochronos/.agents/teamwork/worker_project_1/handoff.md
   - Send a completion message via send_message to orchestrator_1 when finished.
