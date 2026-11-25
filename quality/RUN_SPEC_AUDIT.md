# Council of Three Multi-Model Spec Audit Protocol

This protocol coordinates independent audits of EvoChronos code against specifications by three distinct AI models (e.g. Gemini 2.5 Pro, Claude 3.5 Sonnet, GPT-4o) to eliminate model-specific blind spots.

## Audit Scrutiny Areas

1. **Stoichiometric Balance**: Verify reaction templates in `config/biochemistry_rules.json` and block-angular mergers in `evo-regime-eukaryote`.
2. **Eigen Quasispecies Equilibrium**: Check numerical integration against analytical limit $\mu_{\text{crit}} = \frac{\ln \sigma}{L}$.
3. **Loop-Law Formulation**: Ensure nullspace projection eliminates thermodynamic cycles with $\sum \Delta G = 0$.
4. **Michod Convexity Verification**: Check that germ-soma trade-offs are strictly super-linear ($\alpha > 1$).
5. **Lande G-Matrix Invariance**: Verify positive-definiteness under mutational input $M$ and standing variance.

## Audit Prompt Template

```
You are an expert theoretical biologist and mathematical software auditor.
Review the code in crates/evo-[component] against the mathematical specifications in docs/ and QUALITY.md.
Rules:
- Line numbers are mandatory for all findings.
- Verify whether the implementation matches the specified mathematical formulas.
- Flag any risk of non-zero atomic drift, numerical instability, or thermodynamic violations.
- Label findings as [CRITICAL], [WARNING], or [QUESTION].
```

## Triage & Resolution Protocol
1. Merge findings across all 3 auditor reports.
2. Group by subsystem.
3. Fix verified issues in small batches and execute `quality/test_functional.py` after each change.
