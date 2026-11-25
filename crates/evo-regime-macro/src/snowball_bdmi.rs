//! H. Allen Orr Snowball Effect & Bateson-Dobzhansky-Muller Incompatibilities (BDMI).
//!
//! Models quadratic accumulation of postzygotic genetic incompatibilities between allopatric lineages:
//! Total pairwise derived interactions: P(t) = K_1(t) * K_2(t) = (mu * t)^2
//! Expected incompatibilities: E[I(t)] = p_inc * (mu * t)^2
//! Reproductive isolation index: I_iso(t) = 1.0 - exp(-lambda * E[I(t)])
//! Triggers cladogenesis when I_iso >= speciation_threshold.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnowballBdmiParams {
    pub substitution_rate: f64,     // mu: substitutions per lineage per million years (Myr)
    pub incompatibility_prob: f64,  // p_inc: probability that a pair of derived alleles is incompatible
    pub isolation_scaling: f64,     // lambda: fitness loss scaling per incompatibility
    pub speciation_threshold: f64,  // I_crit: threshold for irreversible cladogenesis (e.g. 0.90)
}

impl Default for SnowballBdmiParams {
    fn default() -> Self {
        Self {
            substitution_rate: 0.1,    // 0.1 substitutions / Myr
            incompatibility_prob: 0.05,// 5% of divergent interactions cause incompatibility
            isolation_scaling: 0.5,
            speciation_threshold: 0.90,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnowballBdmiEngine {
    pub params: SnowballBdmiParams,
}

impl SnowballBdmiEngine {
    pub fn new(params: SnowballBdmiParams) -> Self {
        Self { params }
    }

    /// Evaluates accumulated divergent substitutions K(t) = mu * t for each lineage.
    pub fn accumulated_substitutions(&self, divergence_time_myr: f64) -> f64 {
        self.params.substitution_rate * divergence_time_myr
    }

    /// Evaluates expected number of BDMI incompatibilities: E[I] = p_inc * (mu * t)^2.
    pub fn expected_incompatibilities(&self, divergence_time_myr: f64) -> f64 {
        let k = self.accumulated_substitutions(divergence_time_myr);
        self.params.incompatibility_prob * (k * k)
    }

    /// Computes reproductive isolation index I_iso in [0, 1].
    pub fn reproductive_isolation_index(&self, divergence_time_myr: f64) -> f64 {
        let bdmi_count = self.expected_incompatibilities(divergence_time_myr);
        1.0 - (-self.params.isolation_scaling * bdmi_count).exp()
    }

    /// Determines if cladogenetic speciation has occurred.
    pub fn is_speciation_achieved(&self, divergence_time_myr: f64) -> bool {
        self.reproductive_isolation_index(divergence_time_myr) >= self.params.speciation_threshold
    }

    /// Calculates the critical divergence time t_crit required for speciation.
    /// 1 - exp(-lambda * p_inc * mu^2 * t^2) = I_crit
    /// => lambda * p_inc * mu^2 * t^2 = -ln(1 - I_crit)
    /// => t_crit = sqrt( -ln(1 - I_crit) / (lambda * p_inc * mu^2) )
    pub fn critical_speciation_time(&self) -> f64 {
        let numerator = -(1.0 - self.params.speciation_threshold).ln();
        let denominator = self.params.isolation_scaling
            * self.params.incompatibility_prob
            * (self.params.substitution_rate * self.params.substitution_rate);
        (numerator / denominator).sqrt()
    }
}
