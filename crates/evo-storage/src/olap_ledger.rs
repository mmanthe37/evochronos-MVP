//! OLAP Conservation Ledger & Lineage Analytics (DuckDB-compatible schema).
//!
//! Stores timestamped records of global elemental pools [C, H, O, N, P, S, Fe],
//! verifying 100% mass conservation invariants and tracking lineage diversifications.

use evo_core::composition::AtomicComposition;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerSnapshotRecord {
    pub epoch_tick: u64,
    pub simulated_time_seconds: f64,
    pub active_regime: u32,
    pub living_biomass_atoms: AtomicComposition,
    pub dissolved_metabolite_atoms: AtomicComposition,
    pub mineral_lithosphere_atoms: AtomicComposition,
    pub atmospheric_gas_atoms: AtomicComposition,
    pub total_system_atoms: AtomicComposition,
    pub drift_atoms: i128, // Invariant: must equal 0
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct OlapLedger {
    pub initial_budget: Option<AtomicComposition>,
    pub snapshots: Vec<LedgerSnapshotRecord>,
}

impl OlapLedger {
    pub fn new(initial_budget: AtomicComposition) -> Self {
        Self {
            initial_budget: Some(initial_budget),
            snapshots: Vec::new(),
        }
    }

    /// Records an atomic state snapshot across all four environmental pools:
    /// living biomass, dissolved metabolites, mineral lithosphere, atmospheric gas.
    #[allow(clippy::too_many_arguments)]
    pub fn record_snapshot(
        &mut self,
        epoch_tick: u64,
        simulated_time_seconds: f64,
        active_regime: u32,
        living: AtomicComposition,
        dissolved: AtomicComposition,
        mineral: AtomicComposition,
        atmosphere: AtomicComposition,
    ) -> Result<&LedgerSnapshotRecord, &'static str> {
        let total = living.add(&dissolved).add(&mineral).add(&atmosphere);

        let initial = self
            .initial_budget
            .ok_or("Cannot record snapshot before initial budget is initialized")?;

        // Invariant check:
        let is_exact = total == initial;
        let drift = (total.total_atoms() as i128) - (initial.total_atoms() as i128);

        let record = LedgerSnapshotRecord {
            epoch_tick,
            simulated_time_seconds,
            active_regime,
            living_biomass_atoms: living,
            dissolved_metabolite_atoms: dissolved,
            mineral_lithosphere_atoms: mineral,
            atmospheric_gas_atoms: atmosphere,
            total_system_atoms: total,
            drift_atoms: drift,
        };

        self.snapshots.push(record);

        if !is_exact {
            return Err("FATAL INVARIANT VIOLATION: Non-zero atomic drift in global conservation ledger!");
        }

        Ok(self.snapshots.last().unwrap())
    }

    /// Queries the latest drift status:
    pub fn verify_ledger_integrity(&self) -> bool {
        self.snapshots.iter().all(|s| s.drift_atoms == 0)
    }

    /// Computes fraction of total carbon sequestered in living biomass:
    pub fn current_biomass_carbon_fraction(&self) -> f64 {
        if let Some(last) = self.snapshots.last() {
            let total_c = last.total_system_atoms.carbon() as f64;
            if total_c == 0.0 {
                return 0.0;
            }
            last.living_biomass_atoms.carbon() as f64 / total_c
        } else {
            0.0
        }
    }
}
