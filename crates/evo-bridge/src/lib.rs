//! Coarse-Graining Bridge Operators for Emergent Regime Transitions.

pub mod gating;
pub mod regime1_2_to_3;
pub mod regime3_to_4;
pub mod regime4_to_5;
pub mod regime5_to_6;
pub mod stoichiometric_projector;
pub mod syntrophy;
pub mod projective_integration;

pub use gating::AutopoieticClosureDetector;
pub use regime1_2_to_3::Regime12To3BridgeOperator;
pub use regime3_to_4::EndosymbiosisBridgeOperator;
pub use regime4_to_5::MulticellularBridgeOperator;
pub use regime5_to_6::MacroBridgeOperator;
pub use stoichiometric_projector::StoichiometricProjector;
pub use syntrophy::{SyntrophicLink, SyntrophyDetector};
pub use projective_integration::{ProjectiveIntegrationConfig, ProjectiveStepper};
