//! Taxonomic and functional compartmentalization filters for analytical slicing.

use crate::regime::EvolutionaryRegime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct CompartmentFilter {
    pub regime: Option<EvolutionaryRegime>,
    pub clade_id_prefix: Option<String>,
    pub min_metabolic_free_energy_yield_kj: Option<f64>,
    pub required_genetic_motif: Option<Vec<u8>>,
    pub biome_id: Option<u32>,
    pub min_population_size: Option<f64>,
}

impl CompartmentFilter {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_regime(mut self, regime: EvolutionaryRegime) -> Self {
        self.regime = Some(regime);
        self
    }

    pub fn with_clade_prefix(mut self, prefix: impl Into<String>) -> Self {
        self.clade_id_prefix = Some(prefix.into());
        self
    }

    pub fn with_biome(mut self, biome_id: u32) -> Self {
        self.biome_id = Some(biome_id);
        self
    }

    pub fn matches_clade(&self, clade_id: &str) -> bool {
        if let Some(ref prefix) = self.clade_id_prefix {
            if !clade_id.starts_with(prefix) {
                return false;
            }
        }
        true
    }

    pub fn matches_regime(&self, regime: EvolutionaryRegime) -> bool {
        if let Some(target) = self.regime {
            if target != regime {
                return false;
            }
        }
        true
    }

    pub fn matches_biome(&self, biome_id: u32) -> bool {
        if let Some(target) = self.biome_id {
            if target != biome_id {
                return false;
            }
        }
        true
    }
}
