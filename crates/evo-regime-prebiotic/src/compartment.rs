//! Prebiotic compartment state containing species inventories, reaction topology, and biophysical bounds.

use crate::reaction::{ChemicalSpecies, PrebioticReaction};
use evo_core::{ElementalComposition, NUM_ELEMENTS};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PrebioticCompartment {
    pub species: Vec<ChemicalSpecies>,
    pub counts: Vec<u64>,
    pub reactions: Vec<PrebioticReaction>,
    pub temperature_kelvin: f64,
    pub volume_liters: f64,
    pub ph: f64,
}

impl PrebioticCompartment {
    pub fn new(temperature_kelvin: f64, volume_liters: f64, ph: f64) -> Self {
        Self {
            species: Vec::new(),
            counts: Vec::new(),
            reactions: Vec::new(),
            temperature_kelvin,
            volume_liters,
            ph,
        }
    }

    /// Adds a chemical species to the compartment with an initial molecular count
    pub fn add_species(
        &mut self,
        name: impl Into<String>,
        formula: ElementalComposition,
        gibbs_formation_kj_mol: f64,
        is_food_set: bool,
        initial_count: u64,
    ) -> usize {
        let id = self.species.len();
        self.species.push(ChemicalSpecies::new(
            id,
            name,
            formula,
            gibbs_formation_kj_mol,
            is_food_set,
        ));
        self.counts.push(initial_count);
        id
    }

    /// Registers a reaction into the compartment network
    pub fn add_reaction(&mut self, reaction: PrebioticReaction) -> Result<usize, String> {
        reaction.validate_stoichiometry(&self.species)?;
        let id = self.reactions.len();
        self.reactions.push(reaction);
        Ok(id)
    }

    /// Computes total elemental inventory across all species in the compartment
    pub fn total_elements(&self) -> [u128; NUM_ELEMENTS] {
        let mut total = [0u128; NUM_ELEMENTS];
        for (sp, &count) in self.species.iter().zip(self.counts.iter()) {
            sp.formula.accumulate_into(&mut total, count);
        }
        total
    }

    /// Validates that all registered reactions strictly conserve elemental stoichiometry
    pub fn validate_all_reactions(&self) -> Result<(), String> {
        for (idx, rxn) in self.reactions.iter().enumerate() {
            rxn.validate_stoichiometry(&self.species)
                .map_err(|e| format!("Reaction index {} failed: {}", idx, e))?;
        }
        Ok(())
    }
}
