//! Host-side representation of the 2D quantized integer lattice for reaction-diffusion.

use evo_core::{assert_exact_stoichiometric_balance, ElementalComposition, EvoCoreError, NUM_ELEMENTS};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IntegerSpatialLattice {
    pub width: usize,
    pub height: usize,
    pub num_species: usize,
    pub data: Vec<u32>, // Size: width * height * num_species
    pub formulas: Vec<ElementalComposition>,
}

impl IntegerSpatialLattice {
    pub fn new(width: usize, height: usize, formulas: Vec<ElementalComposition>) -> Self {
        let num_species = formulas.len();
        let size = width * height * num_species;
        Self {
            width,
            height,
            num_species,
            data: vec![0u32; size],
            formulas,
        }
    }

    #[inline]
    pub fn index(&self, x: usize, y: usize, s: usize) -> usize {
        (y * self.width + x) * self.num_species + s
    }

    #[inline]
    pub fn get(&self, x: usize, y: usize, s: usize) -> u32 {
        self.data[self.index(x, y, s)]
    }

    #[inline]
    pub fn set(&mut self, x: usize, y: usize, s: usize, val: u32) {
        let idx = self.index(x, y, s);
        self.data[idx] = val;
    }

    /// Computes total molecules of a specific species across the entire lattice
    pub fn total_species_molecules(&self, species_id: usize) -> u64 {
        let mut sum = 0u64;
        for y in 0..self.height {
            for x in 0..self.width {
                sum += self.get(x, y, species_id) as u64;
            }
        }
        sum
    }

    /// Computes total 7-element composition across all voxels
    pub fn total_elements(&self) -> [u128; NUM_ELEMENTS] {
        let mut total = [0u128; NUM_ELEMENTS];
        for s in 0..self.num_species {
            let total_mols = self.total_species_molecules(s);
            self.formulas[s].accumulate_into(&mut total, total_mols);
        }
        total
    }

    /// CPU reference implementation of the antisymmetric edge-flux integer diffusion stencil.
    /// Bit-for-bit mirrors the WGSL compute shader for testing and fallback headless runners.
    pub fn step_diffusion_cpu_reference(&mut self, diff_rate_fp8: u32) -> Result<(), EvoCoreError> {
        let initial_elements = self.total_elements();

        // 4 sub-passes matching the shader directional checkerboard
        for pass_parity in 0..4u32 {
            if pass_parity == 0 || pass_parity == 1 {
                // Horizontal passes
                for y in 0..self.height {
                    for x in 0..self.width.saturating_sub(1) {
                        if (x as u32 % 2) == pass_parity {
                            for s in 0..self.num_species {
                                let c1 = self.get(x, y, s);
                                let c2 = self.get(x + 1, y, s);

                                let mut flux = 0i32;
                                if c1 > c2 {
                                    let diff = (c1 - c2) as i32;
                                    flux = (diff * (diff_rate_fp8 as i32)) / 256;
                                    flux = flux.min((c1 / 4) as i32);
                                } else if c2 > c1 {
                                    let diff = (c2 - c1) as i32;
                                    let neg_flux = (diff * (diff_rate_fp8 as i32)) / 256;
                                    flux = -neg_flux.min((c2 / 4) as i32);
                                }

                                self.set(x, y, s, (c1 as i32 - flux) as u32);
                                self.set(x + 1, y, s, (c2 as i32 + flux) as u32);
                            }
                        }
                    }
                }
            } else {
                // Vertical passes
                let v_parity = pass_parity - 2;
                for y in 0..self.height.saturating_sub(1) {
                    if (y as u32 % 2) == v_parity {
                        for x in 0..self.width {
                            for s in 0..self.num_species {
                                let c1 = self.get(x, y, s);
                                let c2 = self.get(x, y + 1, s);

                                let mut flux = 0i32;
                                if c1 > c2 {
                                    let diff = (c1 - c2) as i32;
                                    flux = (diff * (diff_rate_fp8 as i32)) / 256;
                                    flux = flux.min((c1 / 4) as i32);
                                } else if c2 > c1 {
                                    let diff = (c2 - c1) as i32;
                                    let neg_flux = (diff * (diff_rate_fp8 as i32)) / 256;
                                    flux = -neg_flux.min((c2 / 4) as i32);
                                }

                                self.set(x, y, s, (c1 as i32 - flux) as u32);
                                self.set(x, y + 1, s, (c2 as i32 + flux) as u32);
                            }
                        }
                    }
                }
            }
        }

        let final_elements = self.total_elements();
        assert_exact_stoichiometric_balance(&initial_elements, &final_elements)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cpu_integer_diffusion_mass_conservation() {
        let formulas = vec![
            ElementalComposition::new(1, 0, 0, 1, 0, 0, 0), // HCN
            ElementalComposition::new(0, 2, 1, 0, 0, 0, 0), // H2O
        ];
        let mut lattice = IntegerSpatialLattice::new(16, 16, formulas);

        // Place a high concentration droplet in center
        lattice.set(8, 8, 0, 100_000);
        lattice.set(8, 8, 1, 500_000);

        let initial_atoms = lattice.total_elements();

        // Step diffusion 100 times
        for _ in 0..100 {
            lattice.step_diffusion_cpu_reference(64).unwrap();
        }

        let final_atoms = lattice.total_elements();
        assert_eq!(
            initial_atoms, final_atoms,
            "Antisymmetric integer stencil must never leak or create atoms"
        );

        // Verify molecules diffused to neighboring cells
        assert!(lattice.get(7, 8, 0) > 0, "Molecules must diffuse horizontally");
        assert!(lattice.get(8, 7, 0) > 0, "Molecules must diffuse vertically");
        assert!(lattice.get(8, 8, 0) < 100_000, "Center concentration must drop");
    }
}
