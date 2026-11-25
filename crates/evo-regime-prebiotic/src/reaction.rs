//! Chemical species and prebiotic reaction definitions with thermodynamic validation.

use evo_core::{ElementalComposition, GAS_CONSTANT_R_KJ, NUM_ELEMENTS};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ChemicalSpecies {
    pub id: usize,
    pub name: String,
    pub formula: ElementalComposition,
    pub gibbs_formation_kj_mol: f64,
    pub is_food_set: bool,
    pub diffusion_coeff_m2_s: f64,
}

impl ChemicalSpecies {
    pub fn new(
        id: usize,
        name: impl Into<String>,
        formula: ElementalComposition,
        gibbs_formation_kj_mol: f64,
        is_food_set: bool,
    ) -> Self {
        Self {
            id,
            name: name.into(),
            formula,
            gibbs_formation_kj_mol,
            is_food_set,
            diffusion_coeff_m2_s: 1.0e-9, // default small molecule diffusion in water
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PrebioticReaction {
    pub id: usize,
    pub name: String,
    pub reactants: Vec<(usize, u32)>, // (species_id, stoichiometric_coeff)
    pub products: Vec<(usize, u32)>,
    pub catalysts: Vec<(usize, f64)>, // (species_id, catalytic_enhancement_factor)
    pub activation_energy_kj_mol: f64,
}

impl PrebioticReaction {
    pub fn new(
        id: usize,
        name: impl Into<String>,
        reactants: Vec<(usize, u32)>,
        products: Vec<(usize, u32)>,
        catalysts: Vec<(usize, f64)>,
        activation_energy_kj_mol: f64,
    ) -> Self {
        Self {
            id,
            name: name.into(),
            reactants,
            products,
            catalysts,
            activation_energy_kj_mol,
        }
    }

    /// Asserts that total elements on reactant side exactly equal product side
    pub fn validate_stoichiometry(&self, species: &[ChemicalSpecies]) -> Result<(), String> {
        let mut reactant_atoms = [0u128; NUM_ELEMENTS];
        let mut product_atoms = [0u128; NUM_ELEMENTS];

        for &(r_id, coeff) in &self.reactants {
            if r_id >= species.len() {
                return Err(format!("Reactant species ID {} out of bounds", r_id));
            }
            species[r_id].formula.accumulate_into(&mut reactant_atoms, coeff as u64);
        }

        for &(p_id, coeff) in &self.products {
            if p_id >= species.len() {
                return Err(format!("Product species ID {} out of bounds", p_id));
            }
            species[p_id].formula.accumulate_into(&mut product_atoms, coeff as u64);
        }

        if reactant_atoms != product_atoms {
            return Err(format!(
                "Reaction '{}' violates elemental conservation! Reactants: {:?}, Products: {:?}",
                self.name, reactant_atoms, product_atoms
            ));
        }

        Ok(())
    }

    /// Evaluates standard Gibbs free energy change Delta G°_rxn in kJ/mol
    pub fn delta_g_standard_kj(&self, species: &[ChemicalSpecies]) -> f64 {
        let prod_g: f64 = self
            .products
            .iter()
            .map(|&(p, coeff)| species[p].gibbs_formation_kj_mol * (coeff as f64))
            .sum();
        let react_g: f64 = self
            .reactants
            .iter()
            .map(|&(r, coeff)| species[r].gibbs_formation_kj_mol * (coeff as f64))
            .sum();
        prod_g - react_g
    }

    /// Max firings permitted before any reactant molecule pool is exhausted
    pub fn max_possible_firings(&self, counts: &[u64]) -> u64 {
        let mut max_firings = u64::MAX;
        for &(r_id, coeff) in &self.reactants {
            if (coeff as u64) == 0 {
                continue;
            }
            let available = counts[r_id];
            max_firings = max_firings.min(available / (coeff as u64));
        }
        max_firings
    }

    /// Calculates stochastic propensity a_j(x) for Gillespie / tau-leaping
    pub fn calculate_propensity(
        &self,
        counts: &[u64],
        volume_liters: f64,
        temp_k: f64,
    ) -> f64 {
        // Arrhenius/Eyring rate constant: k = exp(-Ea / RT)
        let rt = GAS_CONSTANT_R_KJ * temp_k;
        let base_k = (-self.activation_energy_kj_mol / rt).exp();

        // Catalytic boost from mineral surfaces or autocatalytic species
        let mut cat_boost = 1.0;
        for &(cat_id, factor) in &self.catalysts {
            let cat_count = counts[cat_id] as f64;
            cat_boost += cat_count * factor;
        }

        // Combinatorial substrate dependence
        let mut substrate_factor = 1.0;
        for &(r_id, coeff) in &self.reactants {
            let n = counts[r_id];
            if n < (coeff as u64) {
                return 0.0;
            }
            let c = coeff as usize;
            if c == 1 {
                substrate_factor *= n as f64;
            } else if c == 2 {
                substrate_factor *= (n as f64) * ((n - 1) as f64) * 0.5;
            } else {
                let mut term = 1.0;
                for k in 0..c {
                    term *= (n - (k as u64)) as f64;
                }
                substrate_factor *= term;
            }
        }

        // Scale by volume (macroscopic concentration normalization)
        let total_order: u32 = self.reactants.iter().map(|&(_, coeff)| coeff).sum();
        let vol_scale = if total_order > 1 {
            volume_liters.powi(1 - (total_order as i32))
        } else {
            1.0
        };

        (base_k * cat_boost * substrate_factor * vol_scale).max(0.0)
    }
}
