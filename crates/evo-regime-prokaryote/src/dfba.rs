//! Dynamic Flux Balance Analysis (dFBA) time-stepping coupled to Monod nutrient uptake.

use crate::flux::ExchangeFluxSpec;
use crate::guild::ProkaryoticGuild;
use crate::lp_solver::{DampedPrimalDualLpSolver, LpSolution};
use evo_core::EvoCoreError;

pub struct DynamicFbaEngine {
    pub solver: DampedPrimalDualLpSolver,
    pub death_rate_per_hour: f64,
}

impl Default for DynamicFbaEngine {
    fn default() -> Self {
        Self {
            solver: DampedPrimalDualLpSolver::default(),
            death_rate_per_hour: 0.01,
        }
    }
}

impl DynamicFbaEngine {
    pub fn new(death_rate_per_hour: f64) -> Self {
        Self {
            solver: DampedPrimalDualLpSolver::default(),
            death_rate_per_hour,
        }
    }

    /// Evaluates Monod uptake flux: v = V_max * S / (K_m + S)
    #[inline]
    pub fn monod_uptake(substrate_conc_mmolar: f64, vmax: f64, km: f64) -> f64 {
        if substrate_conc_mmolar <= 0.0 {
            0.0
        } else {
            vmax * substrate_conc_mmolar / (km + substrate_conc_mmolar)
        }
    }

    /// Executes one dFBA time step for a prokaryotic guild in a well-mixed bioreactor/chemostat.
    /// Updates guild population, environmental nutrient pools, and growth rate.
    pub fn step(
        &self,
        guild: &mut ProkaryoticGuild,
        extracellular_pools: &mut [f64], // Concentrations in mmol / L
        exchanges: &[ExchangeFluxSpec],
        volume_liters: f64,
        dt_hours: f64,
    ) -> Result<LpSolution, EvoCoreError> {
        // 1. Constrain exchange reaction bounds using Monod kinetics on extracellular pools
        for spec in exchanges {
            if spec.is_intake {
                let conc = extracellular_pools[spec.metabolite_id];
                let v_intake = Self::monod_uptake(conc, spec.vmax_mmol_g_hr, spec.km_mmolar);
                guild.set_uptake_bound(spec.reaction_column, v_intake);
            }
        }

        // 2. Solve the instantaneous LP
        let solution = self
            .solver
            .solve(
                &guild.stoichiometric_matrix,
                &guild.flux_bounds,
                &guild.objective_coefficients,
            )
            .map_err(EvoCoreError::InvalidParameter)?;

        let growth_rate = solution.objective_value.max(0.0);
        guild.growth_rate_per_hour = growth_rate;

        // 3. Update demographic population: dN/dt = (mu - d) * N
        let net_growth = (growth_rate - self.death_rate_per_hour) * dt_hours;
        let pop_multiplier = (1.0 + net_growth).max(0.0);
        let new_pop = ((guild.cell_census_population as f64) * pop_multiplier).round() as u64;
        guild.cell_census_population = new_pop;

        // 4. Update extracellular nutrient pools based on exchange fluxes
        let dry_mass_per_cell_g = 1.0e-12; // Typical bacterial dry mass ~ 1 pg
        let total_biomass_g = (guild.cell_census_population as f64) * dry_mass_per_cell_g;

        for spec in exchanges {
            let flux_val = solution.fluxes[spec.reaction_column];
            // Delta mmol = flux (mmol/g/hr) * biomass (g) * dt (hr)
            let delta_mmol = flux_val * total_biomass_g * dt_hours;
            let delta_conc = delta_mmol / volume_liters;

            if spec.is_intake {
                extracellular_pools[spec.metabolite_id] =
                    (extracellular_pools[spec.metabolite_id] - delta_conc).max(0.0);
            } else {
                extracellular_pools[spec.metabolite_id] += delta_conc;
            }
        }

        Ok(solution)
    }
}
