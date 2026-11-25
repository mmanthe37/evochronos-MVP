//! Pillar 1: Stoichiometrically Exact GPU Spatial Reaction-Diffusion Kernel.

pub mod kernel;
pub mod lattice;

pub use kernel::{
    GpuReactionDiffusionKernel, SHADER_DIFFUSION, SHADER_REACTION, SHADER_REDUCTION,
};
pub use lattice::IntegerSpatialLattice;
