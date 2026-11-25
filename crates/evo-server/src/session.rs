//! Unified Multi-Regime Simulation Session Manager.
//!
//! Orchestrates the multi-scale simulation pipeline across Regimes I through VI,
//! maintaining active entities, advancing discrete time steps, recording OLAP ledgers,
//! and enforcing the 7-element exact integer conservation invariant.

use evo_core::composition::AtomicComposition;
use evo_storage::olap_ledger::OlapLedger;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSummary {
    pub session_id: String,
    pub current_epoch: u64,
    pub simulated_time_seconds: f64,
    pub active_regime: u32,
    pub total_living_biomass_atoms: u128,
    pub abiotic_reservoir_atoms: u128,
    pub drift_detected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationSession {
    pub session_id: String,
    pub current_epoch: u64,
    pub simulated_time_seconds: f64,
    pub active_regime: u32,
    pub initial_budget: AtomicComposition,
    pub current_living_biomass: AtomicComposition,
    pub current_abiotic_reservoir: AtomicComposition,
    pub ledger: OlapLedger,
}

impl SimulationSession {
    pub fn new(session_id: &str, initial_budget: AtomicComposition) -> Self {
        let ledger = OlapLedger::new(initial_budget);
        Self {
            session_id: session_id.to_string(),
            current_epoch: 0,
            simulated_time_seconds: 0.0,
            active_regime: 1, // Start in Regime I (Prebiotic)
            initial_budget,
            current_living_biomass: AtomicComposition::zero(),
            current_abiotic_reservoir: initial_budget,
            ledger,
        }
    }

    /// Advances simulation by a batch of steps.
    pub fn step(&mut self, step_count: u64, dt_seconds: f64) -> Result<SessionSummary, &'static str> {
        for _ in 0..step_count {
            self.current_epoch += 1;
            self.simulated_time_seconds += dt_seconds;

            // In Regime I/II, synthesize proto-biomass from abiotic reservoir:
            if self.active_regime <= 2 {
                let synthesis_c = (self.current_abiotic_reservoir.carbon() / 100_000).min(100);
                if synthesis_c > 0 {
                    let d_biomass = AtomicComposition::new(
                        synthesis_c,
                        synthesis_c * 2,
                        synthesis_c,
                        synthesis_c / 5,
                        synthesis_c / 20,
                        synthesis_c / 50,
                        0,
                    );
                    self.current_abiotic_reservoir = self.current_abiotic_reservoir.sub(&d_biomass);
                    self.current_living_biomass = self.current_living_biomass.add(&d_biomass);
                }
            }

            // Record snapshot in conservation ledger
            let living = self.current_living_biomass;
            let dissolved = self.current_abiotic_reservoir;
            let mineral = AtomicComposition::zero();
            let atmosphere = AtomicComposition::zero();

            self.ledger.record_snapshot(
                self.current_epoch,
                self.simulated_time_seconds,
                self.active_regime,
                living,
                dissolved,
                mineral,
                atmosphere,
            )?;
        }

        Ok(self.summary())
    }

    /// Triggers a regime transition via coarse-graining bridge.
    pub fn transition_to_regime(&mut self, target_regime: u32) -> Result<(), &'static str> {
        if target_regime <= self.active_regime || target_regime > 6 {
            return Err("Invalid regime transition target");
        }
        self.active_regime = target_regime;
        Ok(())
    }

    /// Returns session summary status.
    pub fn summary(&self) -> SessionSummary {
        SessionSummary {
            session_id: self.session_id.clone(),
            current_epoch: self.current_epoch,
            simulated_time_seconds: self.simulated_time_seconds,
            active_regime: self.active_regime,
            total_living_biomass_atoms: self.current_living_biomass.total_atoms(),
            abiotic_reservoir_atoms: self.current_abiotic_reservoir.total_atoms(),
            drift_detected: !self.ledger.verify_ledger_integrity(),
        }
    }
}
