//! Eukaryotic chimera guild entity with compartmentalized stoichiometry and genome allocation.

use crate::chimeric_matrix::IntermembraneTransportReaction;
use crate::hill_grn::HillGrnNetwork;
use crate::locus::{GeneLocation, GeneLocus};
use evo_core::{ElementalComposition, NUM_ELEMENTS};
use evo_regime_prokaryote::FluxBounds;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EukaryoticChimeraGuild {
    pub id: u32,
    pub name: String,
    pub host_progenitor_id: u32,
    pub symbiont_progenitor_id: u32,
    pub chimeric_stoichiometry: Vec<Vec<f64>>,
    pub base_flux_bounds: Vec<FluxBounds>,
    pub objective_coefficients: Vec<f64>,
    pub transport_reactions: Vec<IntermembraneTransportReaction>,
    pub genome: Vec<GeneLocus>,
    pub grn: HillGrnNetwork,
    pub biomass_composition_per_cell: ElementalComposition,
    pub cell_census_population: u64,
    pub mitochondria_per_cell: u32,
    pub growth_rate_per_hour: f64,
    pub atp_flux_mol_cell_sec: f64,
}

/// Type alias for ChimericEukaryote ensuring seamless cross-crate compatibility
pub type ChimericEukaryote = EukaryoticChimeraGuild;

impl EukaryoticChimeraGuild {
    /// Computes total elemental composition across all living cells in the eukaryotic guild
    pub fn total_population_atoms(&self) -> [u128; NUM_ELEMENTS] {
        self.biomass_composition_per_cell.scaled(self.cell_census_population)
    }

    /// Total base pairs allocated to the nuclear genome
    pub fn nuclear_genome_length_bp(&self) -> u32 {
        self.genome
            .iter()
            .filter(|g| g.location == GeneLocation::Nuclear)
            .map(|g| g.base_pairs)
            .sum()
    }

    /// Total base pairs retained in the organellar (mitochondrial) genome
    pub fn mitochondrial_genome_length_bp(&self) -> u32 {
        self.genome
            .iter()
            .filter(|g| g.location == GeneLocation::OrganellarMitochondrial)
            .map(|g| g.base_pairs)
            .sum()
    }
}
