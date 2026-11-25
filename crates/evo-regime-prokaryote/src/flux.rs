//! Flux bounds and metabolite roles for Flux Balance Analysis (FBA).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct FluxBounds {
    pub lower: f64,
    pub upper: f64,
}

impl FluxBounds {
    pub const fn new(lower: f64, upper: f64) -> Self {
        Self { lower, upper }
    }

    pub const fn fixed(val: f64) -> Self {
        Self { lower: val, upper: val }
    }

    pub const fn irreversible(max: f64) -> Self {
        Self { lower: 0.0, upper: max }
    }

    pub const fn reversible(max: f64) -> Self {
        Self { lower: -max, upper: max }
    }

    pub fn clamp(&self, val: f64) -> f64 {
        val.clamp(self.lower, self.upper)
    }

    pub fn is_feasible(&self, val: f64, tol: f64) -> bool {
        val >= self.lower - tol && val <= self.upper + tol
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum MetaboliteRole {
    Substrate,
    InternalIntermediate,
    Product,
    WasteExcretion,
    BiomassPrecursor,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExchangeFluxSpec {
    pub metabolite_id: usize,
    pub reaction_column: usize,
    pub is_intake: bool,
    pub km_mmolar: f64,
    pub vmax_mmol_g_hr: f64,
}
