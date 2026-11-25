# Code Review Protocol for EvoChronos

This protocol defines the process and guardrails for reviewing code in the EvoChronos project.

## Mandatory Review Guardrails

1. **Line Numbers are Mandatory**: Every finding must cite exact file paths and line numbers. No line number = finding discarded.
2. **Read Function Bodies**: Never review function signatures alone; inspect loops, error handlers, and boundary branches.
3. **Grep Before Claiming Missing**: Before stating an invariant check or function is missing, grep the codebase to confirm.
4. **Distinguish Bugs vs. Questions**: If unsure about an author's modeling intention, label as `[QUESTION]`, not `[BUG]`.
5. **No Style Nitpicking**: Focus on physical invariants, numerical stability, and algorithmic correctness.

## High-Priority Review Focus Areas

1. **Atomic Conservation Invariants**: Check all functions modifying `AtomicComposition` for integer subtraction underflows or unrecorded leaks.
2. **Thermodynamic Directionality**: Verify that reaction kinetic propensities and $\Delta G$ calculations respect the Second Law.
3. **LP Matrix Singularity**: Verify that dFBA and rFBA solvers handle degenerate bases and enforce loop-law constraints.
4. **Spatial Boundary Fluxes**: Confirm that 3D grid stencils in WGSL shaders enforce periodic, reflective, or Dirichlet boundary conditions without losing mass.
5. **Regime Gating Edge Cases**: Ensure bridge operators refuse promotion when conditions are not rigorously met.

## Regression Test Protocol

For every confirmed `[BUG]` finding:
1. Write a reproducing test in `quality/test_regression.py`.
2. Confirm the test fails on current code.
3. Apply the fix and confirm the test passes.
