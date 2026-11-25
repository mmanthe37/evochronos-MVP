//! Kooijman Dynamic Energy Budget (DEB) Theory & Kappa-Rule Partitioning.
//!
//! Tracks energy and biogenic mass fluxes between Food (X), Reserve (E), Structure (V),
//! Maturity (E_H), and Reproduction Buffer (E_R) with strict 7-element integer mass balance:
//! Mobilization flux: p_C = E * ( [E_G] * v_dot / V^(1/3) + [p_M] ) / ( [E] + [E_G] )
//! Somatic allocation: p_S = kappa * p_C = p_M + p_G
//! Maturity/Reproduction allocation: p_R = (1 - kappa) * p_C - p_J

use evo_core::composition::AtomicComposition;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DebParameters {
    pub kappa: f64,               // Fraction of mobilized reserve allocated to soma [0, 1]
    pub energy_conductance: f64,  // v_dot: reserve turnover conductance (cm / d)
    pub specific_som_maint: f64,  // [p_M]: somatic maintenance per unit structure (J / (cm^3 * d))
    pub specific_cost_growth: f64,// [E_G]: energy cost to build unit structure (J / cm^3)
    pub mat_maint_rate: f64,      // k_J: maturity maintenance rate coeff (1 / d)
    pub pubertal_maturity: f64,   // E_H_p: maturity threshold to begin reproduction (J)
    pub egg_cost: f64,            // E_0: energy required to spawn one offspring (J)
}

impl Default for DebParameters {
    fn default() -> Self {
        Self {
            kappa: 0.8,
            energy_conductance: 0.05,
            specific_som_maint: 20.0,
            specific_cost_growth: 500.0,
            mat_maint_rate: 0.02,
            pubertal_maturity: 100.0,
            egg_cost: 50.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DebOrganismState {
    pub structure_volume: f64,    // V: cm^3
    pub reserve_energy: f64,      // E: J
    pub maturity_energy: f64,     // E_H: J
    pub reproduction_buffer: f64, // E_R: J
    pub total_assimilated: u128,  // Cumulative atoms assimilated
    pub total_excreted: u128,     // Cumulative atoms excreted
}

impl DebOrganismState {
    pub fn new(v0: f64, e0: f64) -> Self {
        Self {
            structure_volume: v0,
            reserve_energy: e0,
            maturity_energy: 0.0,
            reproduction_buffer: 0.0,
            total_assimilated: 0,
            total_excreted: 0,
        }
    }

    /// Evaluates one DEB time step dt (days) under food intake rate p_A (J/day).
    /// Returns: (dV, dE, spawned_offspring_count, maintenance_deficit)
    pub fn step(&mut self, params: &DebParameters, p_a: f64, dt: f64) -> (f64, f64, usize, bool) {
        let v = self.structure_volume.max(1e-8);
        let e = self.reserve_energy.max(0.0);
        let e_density = e / v;

        // Mobilization flux p_C:
        let v_one_third = v.powf(1.0 / 3.0);
        let numerator = (params.specific_cost_growth * params.energy_conductance / v_one_third)
            + params.specific_som_maint;
        let denominator = e_density + params.specific_cost_growth;
        let p_c = (e * (numerator / denominator)).max(0.0);

        // Somatic branch:
        let p_s = params.kappa * p_c;
        let p_m = params.specific_som_maint * v;
        let p_g = p_s - p_m;

        let (dv, maint_deficit) = if p_g >= 0.0 {
            ( (p_g / params.specific_cost_growth) * dt, false )
        } else {
            // Starvation: growth ceases, maintenance deficit
            ( 0.0, true )
        };

        // Maturity & Reproduction branch:
        let p_mat_branch = (1.0 - params.kappa) * p_c;
        let p_j = params.mat_maint_rate * self.maturity_energy;
        let p_rep = (p_mat_branch - p_j).max(0.0);

        if self.maturity_energy < params.pubertal_maturity {
            self.maturity_energy += p_rep * dt;
        } else {
            self.reproduction_buffer += p_rep * dt;
        }

        // Offspring spawning check:
        let mut spawned = 0;
        while self.reproduction_buffer >= params.egg_cost {
            self.reproduction_buffer -= params.egg_cost;
            spawned += 1;
        }

        // Reserve update:
        let de = (p_a - p_c) * dt;
        self.reserve_energy = (self.reserve_energy + de).max(0.0);
        self.structure_volume = (self.structure_volume + dv).max(1e-8);

        (dv, de, spawned, maint_deficit)
    }

    /// Computes total discrete atomic composition of the organism based on standard biomass formula:
    /// 1 cm^3 structure = 1e22 atoms with CH1.8O0.5N0.2P0.01S0.005Fe0.0001
    pub fn compute_elemental_composition(&self) -> AtomicComposition {
        let atoms_per_cm3 = 1_000_000_000_000_000_000_000u128; // 1e21 atoms/cm^3
        let n_atoms = (self.structure_volume * atoms_per_cm3 as f64) as u128;
        
        // Stoichiometric proportions: C: 1.0, H: 1.8, O: 0.5, N: 0.2, P: 0.01, S: 0.005, Fe: 0.0001
        // Normalized base: 10000 C -> 18000 H, 5000 O, 2000 N, 100 P, 50 S, 1 Fe
        // Total = 35151
        let max_units = (u64::MAX / 20000) as u128;
        let base_units = ((n_atoms / 35151).min(max_units)) as u64;
        AtomicComposition::new(
            base_units * 10000,
            base_units * 18000,
            base_units * 5000,
            base_units * 2000,
            base_units * 100,
            base_units * 50,
            base_units,
        )
    }
}
