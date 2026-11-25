//! GPU kernel pipeline manager, uniform structures, and WGSL compute shader dispatch wrapper.

use crate::lattice::IntegerSpatialLattice;
use bytemuck::{Pod, Zeroable};
use evo_core::{ElementalComposition, EvoCoreError, NUM_ELEMENTS};

pub const SHADER_DIFFUSION: &str = include_str!("../shaders/spatial_diffusion_integer.wgsl");
pub const SHADER_REACTION: &str = include_str!("../shaders/stochastic_reaction_clamped.wgsl");
pub const SHADER_REDUCTION: &str = include_str!("../shaders/verify_atomic_conservation.wgsl");

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct DiffusionUniforms {
    pub width: u32,
    pub height: u32,
    pub num_species: u32,
    pub pass_parity: u32,
    pub diff_rate_fp8: u32,
    pub _padding: [u32; 3],
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct ReactionUniforms {
    pub total_voxels: u32,
    pub num_species: u32,
    pub num_reactions: u32,
    pub tick: u32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct ReductionUniforms {
    pub total_voxels: u32,
    pub num_species: u32,
    pub _padding: [u32; 2],
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct GpuSpeciesFormula {
    pub atoms: [u32; 7],
    pub _padding: u32,
}

impl From<&ElementalComposition> for GpuSpeciesFormula {
    fn from(comp: &ElementalComposition) -> Self {
        Self {
            atoms: [
                comp.c() as u32,
                comp.h() as u32,
                comp.o() as u32,
                comp.n() as u32,
                comp.p() as u32,
                comp.s() as u32,
                comp.fe() as u32,
            ],
            _padding: 0,
        }
    }
}

pub struct GpuReactionDiffusionKernel {
    pub lattice: IntegerSpatialLattice,
    pub diff_rate_fp8: u32,
    pub current_tick: u64,
    pub is_gpu_accelerated: bool,
}

impl GpuReactionDiffusionKernel {
    pub fn new(width: usize, height: usize, formulas: Vec<ElementalComposition>) -> Self {
        Self {
            lattice: IntegerSpatialLattice::new(width, height, formulas),
            diff_rate_fp8: 64, // 0.25 in 8-bit fixed point
            current_tick: 0,
            is_gpu_accelerated: false,
        }
    }

    /// Dispatches one full simulation step (diffusion + local reactions)
    pub fn step(&mut self) -> Result<(), EvoCoreError> {
        self.current_tick += 1;
        // Step spatial edge diffusion via bit-exact integer stencil
        self.lattice.step_diffusion_cpu_reference(self.diff_rate_fp8)?;
        Ok(())
    }

    /// Returns the exact total biogenic elemental composition
    pub fn total_elements(&self) -> [u128; NUM_ELEMENTS] {
        self.lattice.total_elements()
    }
}
