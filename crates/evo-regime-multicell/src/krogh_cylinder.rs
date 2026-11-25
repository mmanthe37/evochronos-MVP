//! August Krogh Diffusion-Reaction Geometry & Metabolic Anoxia Limit.
//!
//! Models steady-state diffusion of oxygen / essential nutrient into spherical and cylindrical tissue aggregates:
//! Spherical cluster:
//! C(r) = C_0 - (R_met / (6 * D)) * (R^2 - r^2)
//! Core anoxia occurs when R > R_crit = sqrt(6 * D * C_0 / R_met).
//! Enforces physical tissue size ceilings for avascular multicellularity.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KroghDiffusionParams {
    pub diffusion_coeff: f64,   // D: e.g. 2.0e-5 cm^2/s (O2 in water/tissue)
    pub consumption_rate: f64,  // R_met: mol / (cm^3 * s)
    pub boundary_conc: f64,     // C_0: external concentration (mol / cm^3)
    pub critical_anoxia_threshold: f64, // C_min: below which necrosis triggers (default 0.0)
}

impl Default for KroghDiffusionParams {
    fn default() -> Self {
        Self {
            diffusion_coeff: 1.0e-5,
            consumption_rate: 2.0e-6,
            boundary_conc: 1.0e-4,
            critical_anoxia_threshold: 1.0e-7,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KroghCylinderEvaluator {
    pub params: KroghDiffusionParams,
}

impl KroghCylinderEvaluator {
    pub fn new(params: KroghDiffusionParams) -> Self {
        Self { params }
    }

    /// Computes the critical radius (cm) for a spherical multicellular cluster before core necrosis.
    /// R_crit = sqrt( 6 * D * (C_0 - C_min) / R_met )
    pub fn critical_spherical_radius(&self) -> f64 {
        let delta_c = (self.params.boundary_conc - self.params.critical_anoxia_threshold).max(0.0);
        ((6.0 * self.params.diffusion_coeff * delta_c) / self.params.consumption_rate).sqrt()
    }

    /// Computes steady-state nutrient concentration at radius r from center of a sphere of radius R.
    pub fn spherical_concentration_profile(&self, r: f64, cluster_radius: f64) -> f64 {
        let r_clamped = r.clamp(0.0, cluster_radius);
        let deficit = (self.params.consumption_rate / (6.0 * self.params.diffusion_coeff))
            * (cluster_radius * cluster_radius - r_clamped * r_clamped);
        (self.params.boundary_conc - deficit).max(0.0)
    }

    /// Evaluates necrotic core radius: returns r_necrotic inside which cells die of anoxia.
    /// If cluster_radius <= R_crit, returns 0.0 (fully oxygenated).
    pub fn necrotic_core_radius(&self, cluster_radius: f64) -> f64 {
        let r_crit = self.critical_spherical_radius();
        if cluster_radius <= r_crit {
            0.0
        } else {
            // Solve C(r) = C_min:
            // (R_met / (6 * D)) * (R^2 - r^2) = C_0 - C_min = (R_met / (6 * D)) * R_crit^2
            // => R^2 - r^2 = R_crit^2 => r = sqrt(R^2 - R_crit^2)
            (cluster_radius * cluster_radius - r_crit * r_crit).sqrt()
        }
    }
}
