//! Ioannis Kevrekidis Equation-Free Projective Integration Stepper.
//!
//! Bridges astronomical time gaps (microscopic seconds to macro-evolutionary millions of years)
//! by alternating short inner fine-scale simulation bursts with macroscopic extrapolation:
//! 1. Inner microscopic burst: advance system by k inner steps of size delta_t.
//! 2. Macro-derivative estimation: d_macro = (X(t + k*delta_t) - X(t)) / (k * delta_t).
//! 3. Projective forward leap: X(t + Delta_T) = X(t + k*delta_t) + (Delta_T - k*delta_t) * d_macro.
//! 4. Atomic healing filter: rebalances discrete [C, H, O, N, P, S, Fe] integer counts
//!    against the abiotic reservoir to guarantee zero integer drift across multi-scale leaps.

use evo_core::composition::AtomicComposition;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectiveIntegrationConfig {
    pub inner_steps: usize, // k: number of micro-steps per burst
    pub micro_dt: f64,      // delta_t: micro time step
    pub macro_jump_dt: f64, // Delta_T: macro projective extrapolation interval
}

impl Default for ProjectiveIntegrationConfig {
    fn default() -> Self {
        Self {
            inner_steps: 10,
            micro_dt: 0.1,
            macro_jump_dt: 100.0, // 100x acceleration leap
        }
    }
}

pub struct ProjectiveStepper;

impl ProjectiveStepper {
    /// Projects a continuous scalar or vector quantity across a macroscopic time interval Delta_T.
    /// Returns: (projected_value, estimated_derivative)
    pub fn project_vector(
        x_initial: &[f64],
        x_after_burst: &[f64],
        burst_duration: f64,
        macro_jump_dt: f64,
    ) -> (Vec<f64>, Vec<f64>) {
        let n = x_initial.len();
        let mut d_macro = vec![0.0; n];
        let mut x_projected = vec![0.0; n];

        let jump = macro_jump_dt - burst_duration;

        for i in 0..n {
            let deriv = (x_after_burst[i] - x_initial[i]) / burst_duration;
            d_macro[i] = deriv;
            x_projected[i] = (x_after_burst[i] + jump * deriv).max(0.0);
        }

        (x_projected, d_macro)
    }

    /// Enforces exact integer mass conservation during a projective jump.
    /// Any fractional or round-off atomic deviation is reconciled against the abiotic reservoir,
    /// ensuring total system [C, H, O, N, P, S, Fe] remains 100% constant.
    pub fn reconcile_projective_mass_ledger(
        initial_total_atoms: &AtomicComposition,
        living_biomass_projected: &AtomicComposition,
    ) -> Result<AtomicComposition, &'static str> {
        if initial_total_atoms.carbon() < living_biomass_projected.carbon()
            || initial_total_atoms.hydrogen() < living_biomass_projected.hydrogen()
            || initial_total_atoms.oxygen() < living_biomass_projected.oxygen()
            || initial_total_atoms.nitrogen() < living_biomass_projected.nitrogen()
            || initial_total_atoms.phosphorus() < living_biomass_projected.phosphorus()
            || initial_total_atoms.sulfur() < living_biomass_projected.sulfur()
            || initial_total_atoms.iron() < living_biomass_projected.iron()
        {
            return Err("Projective extrapolation exceeded available planetary atomic budget");
        }

        // Remaining atoms form the reconciled abiotic reservoir
        let reconciled_reservoir = initial_total_atoms.sub(living_biomass_projected);
        Ok(reconciled_reservoir)
    }
}
