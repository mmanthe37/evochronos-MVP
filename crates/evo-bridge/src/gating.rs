//! Autopoietic Closure Detection and Prebiotic -> Prokaryotic Gating.

use evo_regime_prebiotic::{PrebioticCompartment, RafDetector};
use evo_regime_protocell::{ChemotonState, QuasispeciesReplicator};

pub struct AutopoieticClosureDetector;

impl AutopoieticClosureDetector {
    /// Comprehensive non-teleological gating test for Regime I/II -> III promotion.
    /// Requires simultaneous:
    /// 1. Emergent RAF autocatalysis in the chemical reaction network
    /// 2. Chemoton stoichiometric synchrony (|v_pol - v_mem| / v_met <= tolerance)
    /// 3. Informational preservation below Manfred Eigen's error catastrophe threshold
    /// 4. Sufficient protocell population density to establish a self-sustaining guild
    pub fn evaluate_gating(
        compartment: &PrebioticCompartment,
        chemoton: &ChemotonState,
        replicator: &QuasispeciesReplicator,
        protocell_count: usize,
        min_density: usize,
    ) -> Result<(), &'static str> {
        // 1. Minimum population threshold
        if protocell_count < min_density {
            return Err("Insufficient protocell population density for macro-guild condensation");
        }

        // 2. Information threshold (Eigen catastrophe check)
        if replicator.is_beyond_error_catastrophe() {
            return Err("Mutation rate exceeds Eigen threshold: genetic sequence identity lost to error catastrophe");
        }

        // 3. Chemoton synchrony check
        if !chemoton.is_synchronized() {
            return Err("Desynchronized chemoton: membrane expansion decoupled from template replication");
        }

        // 4. Emergent autocatalysis check
        if !RafDetector::is_autocatalytic_closure_achieved(compartment) {
            return Err("Reaction network lacks self-sustaining RAF autocatalytic closure");
        }

        Ok(())
    }
}
