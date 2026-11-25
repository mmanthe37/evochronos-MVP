//! Macro-Evolutionary Allometric Scaling & Global Biosphere Elemental Conservation.
//!
//! Maps log body size z_0 to discrete atomic organism count: M_body = 10^{z_0}.
//! Conserves global biogenic elements [C, H, O, N, P, S, Fe] between extant species biomass
//! and the planetary abiotic reservoir with exact integer precision.

use evo_core::composition::AtomicComposition;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllometricScaler {
    pub base_atoms_per_gram: u128, // e.g. 1e22 atoms/g
}

impl Default for AllometricScaler {
    fn default() -> Self {
        Self {
            base_atoms_per_gram: 10_000_000_000_000_000_000_000u128, // 1e22
        }
    }
}

impl AllometricScaler {
    /// Computes individual organism atomic composition from log body size trait z_0:
    /// Mass in grams = 10^{z_0}.
    pub fn compute_individual_composition(&self, log_body_mass: f64) -> AtomicComposition {
        let mass_g = 10.0f64.powf(log_body_mass).max(1e-12);
        let total_atoms = (mass_g * self.base_atoms_per_gram as f64) as u128;

        // Proportions: C: 10000, H: 18000, O: 5000, N: 2000, P: 100, S: 50, Fe: 1 (Total = 35151)
        let max_units = (u64::MAX / 20000) as u128;
        let base = ((total_atoms / 35151).min(max_units)) as u64;
        AtomicComposition::new(
            base * 10000,
            base * 18000,
            base * 5000,
            base * 2000,
            base * 100,
            base * 50,
            base,
        )
    }

    /// Computes species population total biomass composition: N_e * individual_composition.
    pub fn compute_species_biomass(&self, log_body_mass: f64, population_size: u64) -> AtomicComposition {
        let ind = self.compute_individual_composition(log_body_mass);
        let n = population_size;
        AtomicComposition::new(
            ind.carbon().saturating_mul(n),
            ind.hydrogen().saturating_mul(n),
            ind.oxygen().saturating_mul(n),
            ind.nitrogen().saturating_mul(n),
            ind.phosphorus().saturating_mul(n),
            ind.sulfur().saturating_mul(n),
            ind.iron().saturating_mul(n),
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BiosphereGeosphereLedger {
    pub total_initial_atoms: AtomicComposition,
    pub abiotic_reservoir: AtomicComposition,
}

impl BiosphereGeosphereLedger {
    pub fn new(total_atoms: AtomicComposition) -> Self {
        Self {
            total_initial_atoms: total_atoms,
            abiotic_reservoir: total_atoms,
        }
    }

    /// Deducts biomass assimilation from abiotic reservoir upon speciation/growth.
    pub fn assimilate_biomass(&mut self, biomass: &AtomicComposition) -> Result<(), &'static str> {
        if self.abiotic_reservoir.carbon() < biomass.carbon()
            || self.abiotic_reservoir.hydrogen() < biomass.hydrogen()
            || self.abiotic_reservoir.oxygen() < biomass.oxygen()
            || self.abiotic_reservoir.nitrogen() < biomass.nitrogen()
            || self.abiotic_reservoir.phosphorus() < biomass.phosphorus()
            || self.abiotic_reservoir.sulfur() < biomass.sulfur()
            || self.abiotic_reservoir.iron() < biomass.iron()
        {
            return Err("Planetary elemental depletion: insufficient abiotic atoms for biomass expansion");
        }

        self.abiotic_reservoir = self.abiotic_reservoir.sub(biomass);
        Ok(())
    }

    /// Returns biomass back to abiotic reservoir upon species extinction or mortality.
    pub fn return_to_reservoir(&mut self, biomass: &AtomicComposition) {
        self.abiotic_reservoir = self.abiotic_reservoir.add(biomass);
    }

    /// Verifies that abiotic reservoir + all species biomass exactly equals initial total budget.
    pub fn verify_exact_conservation(&self, all_biomass: &[AtomicComposition]) -> bool {
        let mut total_living = AtomicComposition::zero();
        for b in all_biomass {
            total_living = total_living.add(b);
        }
        let total_system = self.abiotic_reservoir.add(&total_living);
        total_system == self.total_initial_atoms
    }
}
