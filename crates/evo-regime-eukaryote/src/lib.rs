//! Regime IV: Eukaryotic Symbiogenesis, Block Metabolism, CoRR EGT, and Hill GRNs.

pub mod bioenergetics_egt;
pub mod chimera;
pub mod chimeric_matrix;
pub mod hill_grn;
pub mod locus;
pub mod rfba;

pub use bioenergetics_egt::BioenergeticEgtEngine;
pub use chimera::{ChimericEukaryote, EukaryoticChimeraGuild};
pub use chimeric_matrix::{CellularCompartment, CompartmentalizedMatrixMerger, IntermembraneTransportReaction};
pub use hill_grn::{AllostericMetaboliteSensor, HillGrnNetwork, HillGrnNode, HillRegulatoryEdge};
pub use locus::{GeneLocation, GeneLocus};
pub use rfba::RegulatoryFbaEngine;
