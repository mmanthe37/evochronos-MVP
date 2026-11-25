//! Gene locus definitions, intracellular locations, and CoRR hypothesis annotations.

use evo_core::ElementalComposition;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum GeneLocation {
    Nuclear,
    OrganellarMitochondrial,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GeneLocus {
    pub id: usize,
    pub name: String,
    pub base_pairs: u32,
    pub location: GeneLocation,
    pub is_redox_coupled: bool, // CoRR: core electron transport chain proteins requiring rapid redox feedback
    pub atp_synthesis_cost: f64,
}

impl GeneLocus {
    pub fn new(
        id: usize,
        name: impl Into<String>,
        base_pairs: u32,
        location: GeneLocation,
        is_redox_coupled: bool,
    ) -> Self {
        // Synthesis cost: ~2 ATP per nucleotide pair synthesized + proofreading
        let atp_synthesis_cost = (base_pairs as f64) * 4.0;
        Self {
            id,
            name: name.into(),
            base_pairs,
            location,
            is_redox_coupled,
            atp_synthesis_cost,
        }
    }

    /// Evaluates the exact elemental composition of the DNA base pairs for this locus.
    /// Average deoxyribonucleotide base pair: C19.5 H23.5 O12 N7.5 P2 (~618 Da)
    /// Modeled as integer counts per 2 base pairs (doubled to avoid fractional atoms):
    /// 2 bp = C39 H47 O24 N15 P4
    pub fn elemental_dna_atoms(&self) -> ElementalComposition {
        let pairs_of_bp = (self.base_pairs as u64) / 2;
        let c = pairs_of_bp * 39;
        let h = pairs_of_bp * 47;
        let o = pairs_of_bp * 24;
        let n = pairs_of_bp * 15;
        let p = pairs_of_bp * 4;
        ElementalComposition::new(c, h, o, n, p, 0, 0)
    }
}
