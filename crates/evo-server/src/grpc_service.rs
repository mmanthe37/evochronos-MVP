//! gRPC Protocol Service Implementation for EvoChronos.
//!
//! Exposes SimulationService RPC handlers conforming to proto/evochronos/v1/simulation.proto.

use crate::session::SimulationSession;
use evo_core::composition::AtomicComposition;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrpcInitRequest {
    pub config_yaml: String,
    pub random_seed: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrpcInitResponse {
    pub simulation_id: String,
    pub success: bool,
    pub active_regime: u32,
    pub initial_atom_count: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrpcStepRequest {
    pub simulation_id: String,
    pub steps_to_advance: u64,
    pub delta_time_seconds: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrpcStepResponse {
    pub current_epoch: u64,
    pub simulated_time_seconds: f64,
    pub active_regime: u32,
    pub mass_conserved: bool,
    pub living_carbon_atoms: u128,
}

#[derive(Clone)]
pub struct SimulationGrpcService {
    session: Arc<Mutex<SimulationSession>>,
}

impl SimulationGrpcService {
    pub fn new(initial_budget: AtomicComposition) -> Self {
        let session = SimulationSession::new("sim_primary_session", initial_budget);
        Self {
            session: Arc::new(Mutex::new(session)),
        }
    }

    pub fn handle_initialize(&self, _req: GrpcInitRequest) -> GrpcInitResponse {
        let s = self.session.lock().unwrap();
        GrpcInitResponse {
            simulation_id: s.session_id.clone(),
            success: true,
            active_regime: s.active_regime,
            initial_atom_count: s.initial_budget.total_atoms(),
        }
    }

    pub fn handle_step(&self, req: GrpcStepRequest) -> Result<GrpcStepResponse, &'static str> {
        let mut s = self.session.lock().unwrap();
        let summary = s.step(req.steps_to_advance, req.delta_time_seconds)?;
        Ok(GrpcStepResponse {
            current_epoch: summary.current_epoch,
            simulated_time_seconds: summary.simulated_time_seconds,
            active_regime: summary.active_regime,
            mass_conserved: !summary.drift_detected,
            living_carbon_atoms: s.current_living_biomass.carbon() as u128,
        })
    }
}
