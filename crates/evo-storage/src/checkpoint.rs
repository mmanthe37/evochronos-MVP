//! Full Simulation Checkpoint & State Serialization Engine.

use crate::olap_ledger::OlapLedger;
use crate::zarr_tensor::ZarrTensorStore;
use evo_core::composition::AtomicComposition;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationCheckpoint {
    pub checkpoint_id: String,
    pub timestamp_utc: String,
    pub current_epoch: u64,
    pub simulated_time_seconds: f64,
    pub active_regime: u32,
    pub initial_budget: AtomicComposition,
    pub ledger: OlapLedger,
    pub concentration_store: Option<ZarrTensorStore>,
}

impl SimulationCheckpoint {
    pub fn new(
        checkpoint_id: &str,
        current_epoch: u64,
        simulated_time_seconds: f64,
        active_regime: u32,
        initial_budget: AtomicComposition,
        ledger: OlapLedger,
    ) -> Self {
        Self {
            checkpoint_id: checkpoint_id.to_string(),
            timestamp_utc: "2026-10-15T12:00:00Z".to_string(),
            current_epoch,
            simulated_time_seconds,
            active_regime,
            initial_budget,
            ledger,
            concentration_store: None,
        }
    }

    /// Serializes checkpoint to a compact JSON string.
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }

    /// Deserializes checkpoint from JSON string.
    pub fn from_json(json_str: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json_str)
    }
}
