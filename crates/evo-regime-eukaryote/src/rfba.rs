//! Regulatory Flux Balance Analysis (rFBA) Solver for Eukaryotic Chimeras.

use crate::chimera::EukaryoticChimeraGuild;
use evo_core::EvoCoreError;
use evo_regime_prokaryote::{DampedPrimalDualLpSolver, LpSolution};

#[derive(Default)]
pub struct RegulatoryFbaEngine {
    pub lp_solver: DampedPrimalDualLpSolver,
}

impl RegulatoryFbaEngine {
    /// Steps the eukaryotic chimera through a coupled GRN + rFBA cycle:
    /// 1. Updates GRN states using current internal metabolite concentrations
    /// 2. Scales maximum flux bounds V_max based on enzyme transcription levels
    /// 3. Solves the compartmentalized chimeric LP for optimal biomass synthesis
    pub fn step(
        &self,
        chimera: &mut EukaryoticChimeraGuild,
        internal_metabolite_conc: &[f64],
        dt_hours: f64,
    ) -> Result<LpSolution, EvoCoreError> {
        // 1. Advance GRN state
        chimera.grn.step_rk4(internal_metabolite_conc, dt_hours, 10);

        // 2. Modulate reaction flux bounds via GRN enzyme multipliers
        let mut modulated_bounds = chimera.base_flux_bounds.clone();
        for (col_idx, bound) in modulated_bounds.iter_mut().enumerate() {
            let mult = chimera.grn.enzyme_multiplier_for_column(col_idx);
            bound.upper *= mult;
            if bound.lower < 0.0 {
                bound.lower *= mult;
            }
        }

        // 3. Solve chimeric LP
        let solution = self
            .lp_solver
            .solve(
                &chimera.chimeric_stoichiometry,
                &modulated_bounds,
                &chimera.objective_coefficients,
            )
            .map_err(EvoCoreError::InvalidParameter)?;

        chimera.growth_rate_per_hour = solution.objective_value.max(0.0);

        // Demographic update: dN/dt = mu * N
        let growth_factor = (1.0 + chimera.growth_rate_per_hour * dt_hours).max(0.0);
        chimera.cell_census_population =
            ((chimera.cell_census_population as f64) * growth_factor).round() as u64;

        Ok(solution)
    }
}
