//! Prokaryotic metabolic guild definition and cellular state.

use crate::flux::{FluxBounds, MetaboliteRole};
use evo_core::{ElementalComposition, NUM_ELEMENTS};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProkaryoticGuild {
    pub id: u32,
    pub name: String,
    pub stoichiometric_matrix: Vec<Vec<f64>>, // [num_metabolites][num_reactions]
    pub flux_bounds: Vec<FluxBounds>,
    pub objective_coefficients: Vec<f64>,
    pub metabolite_names: Vec<String>,
    pub metabolite_roles: Vec<MetaboliteRole>,
    pub metabolite_formulas: Vec<ElementalComposition>,
    pub biomass_composition_per_cell: ElementalComposition,
    pub cell_census_population: u64,
    pub growth_rate_per_hour: f64,
    pub atp_flux_mol_cell_sec: f64,
}

impl ProkaryoticGuild {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        id: u32,
        name: impl Into<String>,
        stoichiometric_matrix: Vec<Vec<f64>>,
        flux_bounds: Vec<FluxBounds>,
        objective_coefficients: Vec<f64>,
        metabolite_names: Vec<String>,
        metabolite_roles: Vec<MetaboliteRole>,
        metabolite_formulas: Vec<ElementalComposition>,
        biomass_composition_per_cell: ElementalComposition,
        cell_census_population: u64,
    ) -> Self {
        Self {
            id,
            name: name.into(),
            stoichiometric_matrix,
            flux_bounds,
            objective_coefficients,
            metabolite_names,
            metabolite_roles,
            metabolite_formulas,
            biomass_composition_per_cell,
            cell_census_population,
            growth_rate_per_hour: 0.0,
            atp_flux_mol_cell_sec: 1.0e-17, // Baseline prokaryotic ATP flux (~10^-17 to 10^-16 mol/cell/s)
        }
    }

    /// Computes total elemental composition across all living cells in the guild
    pub fn total_population_atoms(&self) -> [u128; NUM_ELEMENTS] {
        self.biomass_composition_per_cell.scaled(self.cell_census_population)
    }

    /// Sets the upper intake flux for a specific nutrient uptake column based on Monod availability
    pub fn set_uptake_bound(&mut self, reaction_col: usize, upper_bound: f64) {
        if reaction_col < self.flux_bounds.len() {
            self.flux_bounds[reaction_col].upper = upper_bound.max(0.0);
        }
    }

    /// Validates that all internal reactions (non-exchange) conserve elemental mass
    #[allow(clippy::needless_range_loop)]
    pub fn validate_internal_stoichiometries(&self) -> Result<(), String> {
        let m = self.stoichiometric_matrix.len();
        let n = self.flux_bounds.len();

        for j in 0..n {
            // Skip pure exchange reactions (where only 1 metabolite has non-zero coefficient)
            let non_zeros = (0..m)
                .filter(|&i| self.stoichiometric_matrix[i][j].abs() > 1e-9)
                .count();
            if non_zeros <= 1 {
                continue;
            }

            let mut atom_balance = [0i128; NUM_ELEMENTS];
            for i in 0..m {
                let s_ij = self.stoichiometric_matrix[i][j];
                if s_ij.abs() > 1e-9 {
                    let formula = &self.metabolite_formulas[i];
                    for e in 0..NUM_ELEMENTS {
                        atom_balance[e] += (s_ij * (formula.atoms[e] as f64)).round() as i128;
                    }
                }
            }

            if atom_balance.iter().any(|&net| net != 0) {
                return Err(format!(
                    "Reaction column {} in guild '{}' violates elemental balance: net {:?}",
                    j, self.name, atom_balance
                ));
            }
        }

        Ok(())
    }
}
