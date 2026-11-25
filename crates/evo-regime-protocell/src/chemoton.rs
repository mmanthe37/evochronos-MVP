//! Tibor Gánti's Chemoton Model and Autopoietic Closure Synchrony Evaluator.
//! Couples metabolic flux, template polymer replication, and lipid membrane expansion.

use crate::quasispecies::QuasispeciesReplicator;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ChemotonState {
    pub metabolic_flux: f64,
    pub template_replication_flux: f64,
    pub membrane_growth_flux: f64,
    pub synchrony_tolerance: f64,
}

impl ChemotonState {
    pub fn new(
        metabolic_flux: f64,
        template_replication_flux: f64,
        membrane_growth_flux: f64,
        synchrony_tolerance: f64,
    ) -> Self {
        Self {
            metabolic_flux,
            template_replication_flux,
            membrane_growth_flux,
            synchrony_tolerance,
        }
    }

    /// Evaluates stoichiometric synchrony index: |v_pol - v_mem| / v_met
    pub fn synchrony_index(&self) -> f64 {
        if self.metabolic_flux <= 1e-12 {
            return f64::INFINITY;
        }
        (self.template_replication_flux - self.membrane_growth_flux).abs() / self.metabolic_flux
    }

    /// Returns true if polymer replication and membrane growth rates are stoichiometrically coupled
    pub fn is_synchronized(&self) -> bool {
        self.synchrony_index() <= self.synchrony_tolerance
    }

    /// Complete Autopoietic Closure Gate for Regime II -> III Promotion.
    /// Requires simultaneous:
    /// 1. Positive metabolic self-maintenance flux (v_met > 0)
    /// 2. Chemoton stoichiometric synchrony (|v_pol - v_mem| / v_met < tolerance)
    /// 3. Informational preservation (below the Eigen error catastrophe threshold)
    pub fn evaluate_autopoietic_closure_gate(
        &self,
        replicator: &QuasispeciesReplicator,
    ) -> Result<bool, &'static str> {
        if self.metabolic_flux <= 0.0 {
            return Err("Metabolic cycle is inactive or decaying");
        }

        if !self.is_synchronized() {
            return Err("Chemoton desynchronized: membrane growth and template replication decoupled");
        }

        if replicator.is_beyond_error_catastrophe() {
            return Err("Informational catastrophe: mutation rate exceeds Eigen threshold, destroying genetic identity");
        }

        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chemoton_autopoietic_closure_gate() {
        let chemoton_good = ChemotonState::new(10.0, 5.0, 5.1, 0.05);
        let replicator_good = QuasispeciesReplicator::new(100, 0.005, 10.0, 0.1);

        assert!(chemoton_good.is_synchronized());
        assert!(!replicator_good.is_beyond_error_catastrophe());
        assert!(chemoton_good
            .evaluate_autopoietic_closure_gate(&replicator_good)
            .is_ok());

        // Desynchronized chemoton
        let chemoton_bad = ChemotonState::new(10.0, 5.0, 8.0, 0.05);
        assert!(!chemoton_bad.is_synchronized());
        assert!(chemoton_bad
            .evaluate_autopoietic_closure_gate(&replicator_good)
            .is_err());

        // Replicator beyond error threshold
        let replicator_bad = QuasispeciesReplicator::new(100, 0.05, 10.0, 0.1);
        assert!(replicator_bad.is_beyond_error_catastrophe());
        assert!(chemoton_good
            .evaluate_autopoietic_closure_gate(&replicator_bad)
            .is_err());
    }
}
