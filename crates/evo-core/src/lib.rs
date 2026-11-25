//! Core physical invariants, deterministic PRNG, and regime definitions for EvoChronos.

pub mod composition;
pub mod constants;
pub mod filter;
pub mod prng;
pub mod regime;

pub use composition::{AtomicComposition, ElementalComposition, ElementIndex, NUM_ELEMENTS};
pub use constants::*;
pub use filter::CompartmentFilter;
pub use prng::DeterministicPrng;
pub use regime::EvolutionaryRegime;

use thiserror::Error;

#[derive(Error, Debug, Clone, PartialEq)]
pub enum EvoCoreError {
    #[error("Stoichiometric mass conservation violated! Expected {expected:?}, got {actual:?}")]
    StoichiometryViolation {
        expected: Box<[u128; NUM_ELEMENTS]>,
        actual: Box<[u128; NUM_ELEMENTS]>,
    },

    #[error("Thermodynamic violation: reaction Delta G = {delta_g:.2} kJ/mol is uncoupled and exergonic violation")]
    ThermodynamicViolation { delta_g: f64 },

    #[error("Numerical overflow in atom scaling or concentration accumulation")]
    NumericalOverflow,

    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),
}

/// Asserts that two 7-element inventories are bit-for-bit identical
pub fn assert_exact_stoichiometric_balance(
    expected: &[u128; NUM_ELEMENTS],
    actual: &[u128; NUM_ELEMENTS],
) -> Result<(), EvoCoreError> {
    if expected != actual {
        return Err(EvoCoreError::StoichiometryViolation {
            expected: Box::new(*expected),
            actual: Box::new(*actual),
        });
    }
    Ok(())
}
