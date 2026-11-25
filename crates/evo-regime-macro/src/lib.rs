//! EvoChronos Macro-Evolution & Speciation Engine (Regime VI).
//!
//! Encompasses:
//! - Developmental Genotype-Phenotype Mapping Jacobian (J_{G -> P})
//! - Russell Lande Quantitative Genetics & G-Matrix Phenotypic Trajectory Engine
//! - H. Allen Orr Snowball Effect & BDMI Postzygotic Speciation Engine
//! - Jerome Kelleher Succinct Tree Sequence Recording Architecture (tskit format)
//! - Dynamic Allometric Scaling & Biosphere-Geosphere Elemental Mass Conservation

pub mod jacobian_g2p;
pub mod lande_g_matrix;
pub mod snowball_bdmi;
pub mod tskit_recorder;
pub mod allometric_conservation;
pub mod lineage;
