//! Regime II: Information Polymers, Quasispecies Replicators, Vesicles, and Chemotons.

pub mod chemoton;
pub mod quasispecies;
pub mod vesicle;

pub use chemoton::ChemotonState;
pub use quasispecies::QuasispeciesReplicator;
pub use vesicle::{ProtocellVesicle, LIPID_HEADGROUP_AREA_NM2};
