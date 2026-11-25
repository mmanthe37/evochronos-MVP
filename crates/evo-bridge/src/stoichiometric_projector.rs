//! Stoichiometric Projection and Microscopic-to-Macroscopic Kinetic Parameter Lifting.

use evo_core::constants::{eyring_prefactor, GAS_CONSTANT_R_KJ};
use evo_regime_prebiotic::{ChemicalSpecies, PrebioticReaction};
use evo_regime_prokaryote::{FluxBounds, MetaboliteRole};

pub struct StoichiometricProjector;

impl StoichiometricProjector {
    /// Extracts the stoichiometric matrix S from a microscopic reaction network:
    /// S[metabolite_i][reaction_j] = net stoichiometric coefficient
    pub fn extract_stoichiometric_matrix(
        species: &[ChemicalSpecies],
        reactions: &[PrebioticReaction],
    ) -> Vec<Vec<f64>> {
        let m = species.len();
        let n = reactions.len();
        let mut s_matrix = vec![vec![0.0; n]; m];

        for (j, rxn) in reactions.iter().enumerate() {
            for &(r_id, coeff) in &rxn.reactants {
                s_matrix[r_id][j] -= coeff as f64;
            }
            for &(p_id, coeff) in &rxn.products {
                s_matrix[p_id][j] += coeff as f64;
            }
        }

        s_matrix
    }

    /// Lifts microscopic Eyring transition state activation barriers into macroscopic dFBA flux bounds
    pub fn lift_kinetic_bounds(
        reactions: &[PrebioticReaction],
        temp_k: f64,
        scale_factor: f64,
    ) -> Vec<FluxBounds> {
        let rt = GAS_CONSTANT_R_KJ * temp_k;
        let nu = eyring_prefactor(temp_k);

        reactions
            .iter()
            .map(|rxn| {
                // Microscopic transition state rate constant k = (k_B * T / h) * exp(-E_a / RT)
                let k_forward = nu * (-rxn.activation_energy_kj_mol / rt).exp();
                let vmax = (k_forward * scale_factor).max(0.1);
                FluxBounds::irreversible(vmax)
            })
            .collect()
    }

    /// Classifies metabolite roles (Internal Intermediate, Substrate, Product, Biomass)
    pub fn classify_metabolite_roles(species: &[ChemicalSpecies]) -> Vec<MetaboliteRole> {
        species
            .iter()
            .map(|sp| {
                if sp.is_food_set {
                    MetaboliteRole::Substrate
                } else if sp.name.to_lowercase().contains("biomass") {
                    MetaboliteRole::BiomassPrecursor
                } else {
                    MetaboliteRole::InternalIntermediate
                }
            })
            .collect()
    }
}
