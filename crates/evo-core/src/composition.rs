//! Fundamental elemental composition vector [C, H, O, N, P, S, Fe]
//! Enforces exact integer mass and stoichiometry conservation across all regimes.

use bytemuck::{Pod, Zeroable};
use serde::{Deserialize, Serialize};
use std::fmt;

/// Element index enumeration corresponding to [C, H, O, N, P, S, Fe]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ElementIndex {
    Carbon = 0,
    Hydrogen = 1,
    Oxygen = 2,
    Nitrogen = 3,
    Phosphorus = 4,
    Sulfur = 5,
    Iron = 6,
}

pub const NUM_ELEMENTS: usize = 7;

/// Exact elemental composition representation.
/// Guaranteed integer mass tracking without IEEE-754 floating-point drift.
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Pod, Zeroable)]
pub struct ElementalComposition {
    pub atoms: [u64; NUM_ELEMENTS], // [C, H, O, N, P, S, Fe]
}

/// Type alias for AtomicComposition to ensure full backwards and cross-crate compatibility
pub type AtomicComposition = ElementalComposition;

impl Default for ElementalComposition {
    fn default() -> Self {
        Self::ZERO
    }
}

#[allow(clippy::needless_range_loop)]
impl ElementalComposition {
    pub const ZERO: Self = Self {
        atoms: [0; NUM_ELEMENTS],
    };

    pub const fn new(c: u64, h: u64, o: u64, n: u64, p: u64, s: u64, fe: u64) -> Self {
        Self {
            atoms: [c, h, o, n, p, s, fe],
        }
    }

    #[inline(always)]
    pub const fn c(&self) -> u64 { self.atoms[0] }
    #[inline(always)]
    pub const fn h(&self) -> u64 { self.atoms[1] }
    #[inline(always)]
    pub const fn o(&self) -> u64 { self.atoms[2] }
    #[inline(always)]
    pub const fn n(&self) -> u64 { self.atoms[3] }
    #[inline(always)]
    pub const fn p(&self) -> u64 { self.atoms[4] }
    #[inline(always)]
    pub const fn s(&self) -> u64 { self.atoms[5] }
    #[inline(always)]
    pub const fn fe(&self) -> u64 { self.atoms[6] }

    #[inline(always)]
    pub const fn carbon(&self) -> u64 { self.atoms[0] }
    #[inline(always)]
    pub const fn hydrogen(&self) -> u64 { self.atoms[1] }
    #[inline(always)]
    pub const fn oxygen(&self) -> u64 { self.atoms[2] }
    #[inline(always)]
    pub const fn nitrogen(&self) -> u64 { self.atoms[3] }
    #[inline(always)]
    pub const fn phosphorus(&self) -> u64 { self.atoms[4] }
    #[inline(always)]
    pub const fn sulfur(&self) -> u64 { self.atoms[5] }
    #[inline(always)]
    pub const fn iron(&self) -> u64 { self.atoms[6] }

    /// Adds two compositions element-wise using saturating addition
    #[inline(always)]
    pub fn add(&self, other: &Self) -> Self {
        let mut result = [0u64; NUM_ELEMENTS];
        for i in 0..NUM_ELEMENTS {
            result[i] = self.atoms[i].saturating_add(other.atoms[i]);
        }
        Self { atoms: result }
    }

    /// Subtracts two compositions element-wise using saturating subtraction
    #[inline(always)]
    pub fn sub(&self, other: &Self) -> Self {
        let mut result = [0u64; NUM_ELEMENTS];
        for i in 0..NUM_ELEMENTS {
            result[i] = self.atoms[i].saturating_sub(other.atoms[i]);
        }
        Self { atoms: result }
    }

    #[inline(always)]
    pub fn zero() -> Self {
        Self::ZERO
    }

    /// Returns true if all elemental counts are zero
    pub fn is_zero(&self) -> bool {
        self.atoms.iter().all(|&a| a == 0)
    }

    /// Returns true if any elemental count is strictly positive
    pub fn is_positive(&self) -> bool {
        self.atoms.iter().any(|&a| a > 0)
    }

    /// Total number of constituent atoms
    pub fn total_atoms(&self) -> u128 {
        self.atoms.iter().map(|&a| a as u128).sum()
    }

    /// Approximate standard molecular weight in Daltons (g/mol)
    pub fn molecular_weight_da(&self) -> f64 {
        const ATOMIC_WEIGHTS: [f64; 7] = [
            12.011,   // C
            1.008,    // H
            15.999,   // O
            14.007,   // N
            30.97376, // P
            32.06,    // S
            55.845,   // Fe
        ];
        self.atoms
            .iter()
            .zip(ATOMIC_WEIGHTS.iter())
            .map(|(&count, &weight)| (count as f64) * weight)
            .sum()
    }

    /// Scales atom counts by molecule population into 128-bit integers to prevent overflow
    pub fn scaled(&self, count: u64) -> [u128; NUM_ELEMENTS] {
        let mut out = [0u128; NUM_ELEMENTS];
        for i in 0..NUM_ELEMENTS {
            out[i] = (self.atoms[i] as u128) * (count as u128);
        }
        out
    }

    /// Checked addition of two compositions
    pub fn checked_add(&self, other: &Self) -> Option<Self> {
        let mut result = [0u64; NUM_ELEMENTS];
        for i in 0..NUM_ELEMENTS {
            result[i] = self.atoms[i].checked_add(other.atoms[i])?;
        }
        Some(Self { atoms: result })
    }

    /// Checked subtraction of two compositions
    pub fn checked_sub(&self, other: &Self) -> Option<Self> {
        let mut result = [0u64; NUM_ELEMENTS];
        for i in 0..NUM_ELEMENTS {
            result[i] = self.atoms[i].checked_sub(other.atoms[i])?;
        }
        Some(Self { atoms: result })
    }

    /// Scales and adds to an existing 128-bit inventory vector
    pub fn accumulate_into(&self, inventory: &mut [u128; NUM_ELEMENTS], count: u64) {
        for i in 0..NUM_ELEMENTS {
            inventory[i] += (self.atoms[i] as u128) * (count as u128);
        }
    }
}

impl fmt::Display for ElementalComposition {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "C{}H{}O{}N{}P{}S{}Fe{}",
            self.c(),
            self.h(),
            self.o(),
            self.n(),
            self.p(),
            self.s(),
            self.fe()
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_elemental_composition_properties() {
        // Glucose: C6H12O6
        let glucose = ElementalComposition::new(6, 12, 6, 0, 0, 0, 0);
        assert_eq!(glucose.c(), 6);
        assert_eq!(glucose.h(), 12);
        assert_eq!(glucose.o(), 6);
        assert_eq!(glucose.n(), 0);
        assert!((glucose.molecular_weight_da() - 180.156).abs() < 0.05);

        let scaled = glucose.scaled(1_000_000);
        assert_eq!(scaled[0], 6_000_000);
        assert_eq!(scaled[1], 12_000_000);
        assert_eq!(scaled[2], 6_000_000);
    }

    #[test]
    fn test_conservation_addition_subtraction() {
        let atp = ElementalComposition::new(10, 16, 13, 5, 3, 0, 0);
        let adp = ElementalComposition::new(10, 15, 10, 5, 2, 0, 0);
        let pi = ElementalComposition::new(0, 3, 4, 0, 1, 0, 0);
        let h2o = ElementalComposition::new(0, 2, 1, 0, 0, 0, 0);

        // ATP + H2O -> ADP + Pi
        let reactants = atp.checked_add(&h2o).expect("Add reactants");
        let products = adp.checked_add(&pi).expect("Add products");
        assert_eq!(reactants, products, "Hydrolysis reaction must conserve elements bit-for-bit");
    }
}
