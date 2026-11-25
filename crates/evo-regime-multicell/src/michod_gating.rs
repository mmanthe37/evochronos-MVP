//! Michod Evolutionary Transition in Individuality (ETI) & Germ-Soma Convexity Gate.
//!
//! Evaluates the viability vs. fecundity trade-off curve:
//! v(s) = 1 - (1 - s)^alpha_v
//! b(s) = (1 - s)^alpha_b
//! Where s in [0, 1] represents investment in somatic function (viability), and 1-s in reproduction (fecundity).
//! When the trade-off is convex, differentiated groups outperform any generalist unicell.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MichodEtiParams {
    pub alpha_v: f64,
    pub alpha_b: f64,
    pub cheater_mutation_rate: f64,
    pub policing_efficiency: f64,
    pub bottleneck_size: usize,
}

impl Default for MichodEtiParams {
    fn default() -> Self {
        Self {
            alpha_v: 2.0, // Super-linear / convex returns to specialization
            alpha_b: 2.0,
            cheater_mutation_rate: 1e-4,
            policing_efficiency: 0.95,
            bottleneck_size: 1, // Single-cell bottleneck suppresses intra-organismal conflict
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MichodEtiEvaluator {
    pub params: MichodEtiParams,
}

impl MichodEtiEvaluator {
    pub fn new(params: MichodEtiParams) -> Self {
        Self { params }
    }

    /// Computes cell viability v(s) for soma investment s in [0, 1].
    pub fn viability(&self, s: f64) -> f64 {
        let s_clamped = s.clamp(0.0, 1.0);
        s_clamped.powf(self.params.alpha_v)
    }

    /// Computes cell fecundity b(s) for soma investment s in [0, 1].
    pub fn fecundity(&self, s: f64) -> f64 {
        let s_clamped = s.clamp(0.0, 1.0);
        (1.0 - s_clamped).powf(self.params.alpha_b)
    }

    /// Individual generalist cell fitness w(s) = v(s) * b(s).
    pub fn individual_fitness(&self, s: f64) -> f64 {
        self.viability(s) * self.fecundity(s)
    }

    /// Finds maximum fitness achievable by an undifferentiated unicellular generalist.
    pub fn max_generalist_fitness(&self, resolution: usize) -> (f64, f64) {
        let mut best_s = 0.5;
        let mut best_w = 0.0;
        for i in 0..=resolution {
            let s = i as f64 / resolution as f64;
            let w = self.individual_fitness(s);
            if w > best_w {
                best_w = w;
                best_s = s;
            }
        }
        (best_s, best_w)
    }

    /// Computes group fitness for a differentiated collective:
    /// Soma cells invest s_soma (e.g. 1.0), Germ cells invest s_germ (e.g. 0.0).
    /// Group viability V = sum(v_i) / N, Group fecundity B = sum(b_i) / N.
    /// W_group = V * B * (1 - penalty_from_cheaters).
    pub fn group_fitness(
        &self,
        soma_count: usize,
        germ_count: usize,
        s_soma: f64,
        s_germ: f64,
        cheater_count: usize,
    ) -> f64 {
        let total = (soma_count + germ_count + cheater_count) as f64;
        if total == 0.0 {
            return 0.0;
        }

        let v_soma = self.viability(s_soma);
        let b_soma = self.fecundity(s_soma);

        let v_germ = self.viability(s_germ);
        let b_germ = self.fecundity(s_germ);

        // Cheaters: somatic cells that revert to selfish reproduction (s = 0.0)
        let v_cheat = self.viability(0.0);
        let b_cheat = self.fecundity(0.0);

        let mean_v = (soma_count as f64 * v_soma
            + germ_count as f64 * v_germ
            + cheater_count as f64 * v_cheat)
            / total;
        let mean_b = (soma_count as f64 * b_soma
            + germ_count as f64 * b_germ
            + cheater_count as f64 * b_cheat)
            / total;

        // Policing suppresses cheater reproductive contribution:
        let cheater_penalty = (cheater_count as f64 / total) * (1.0 - self.params.policing_efficiency);
        let effective_b = (mean_b * (1.0 - cheater_penalty)).max(0.0);

        mean_v * effective_b
    }

    /// Checks if the group differentiation satisfies the Michod Convexity Criterion:
    /// Group fitness strictly exceeds maximum generalist fitness.
    pub fn satisfies_convexity_gate(
        &self,
        soma_count: usize,
        germ_count: usize,
        s_soma: f64,
        s_germ: f64,
    ) -> (bool, f64, f64) {
        let (_, max_gen) = self.max_generalist_fitness(100);
        let w_group = self.group_fitness(soma_count, germ_count, s_soma, s_germ, 0);
        (w_group > max_gen, w_group, max_gen)
    }
}
