//! Manfred Eigen's Quasispecies Replicator Dynamics and Mutational Error Catastrophe.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QuasispeciesReplicator {
    pub genome_length: usize,
    pub mutation_rate_per_base: f64,
    pub master_replication_rate: f64,
    pub mutant_replication_rate: f64,
    pub degradation_rate: f64,
    pub master_fraction: f64,
    pub mutant_fraction: f64,
}

impl QuasispeciesReplicator {
    pub fn new(
        genome_length: usize,
        mutation_rate_per_base: f64,
        master_superiority: f64,
        degradation_rate: f64,
    ) -> Self {
        let mutant_replication_rate = 1.0;
        let master_replication_rate = mutant_replication_rate * master_superiority;

        Self {
            genome_length,
            mutation_rate_per_base,
            master_replication_rate,
            mutant_replication_rate,
            degradation_rate,
            master_fraction: 1.0,
            mutant_fraction: 0.0,
        }
    }

    /// Exact analytical fidelity of replicating the entire genome without error: Q_00 = (1 - mu)^L
    pub fn master_replication_fidelity(&self) -> f64 {
        (1.0 - self.mutation_rate_per_base).powi(self.genome_length as i32)
    }

    /// Superiority parameter sigma = (A_0 / D_0) / (A_mut / D_mut)
    pub fn superiority_sigma(&self) -> f64 {
        self.master_replication_rate / self.mutant_replication_rate
    }

    /// Theoretical Eigen error catastrophe threshold: mu_crit = ln(sigma) / L
    pub fn theoretical_error_threshold(&self) -> f64 {
        let sigma = self.superiority_sigma();
        if sigma <= 1.0 {
            0.0
        } else {
            sigma.ln() / (self.genome_length as f64)
        }
    }

    /// Returns true if mutation rate has crossed the error catastrophe, destroying genetic information
    pub fn is_beyond_error_catastrophe(&self) -> bool {
        self.mutation_rate_per_base > self.theoretical_error_threshold()
    }

    /// Steps the quasispecies distribution forward via 4th-order Runge-Kutta (RK4) integration
    pub fn step_rk4(&mut self, dt: f64) {
        let q00 = self.master_replication_fidelity();
        let a0 = self.master_replication_rate;
        let a_mut = self.mutant_replication_rate;
        let d = self.degradation_rate;

        // Derivative function for [x0, x_mut]
        let deriv = |x0: f64, x_mut: f64| -> (f64, f64) {
            let total = (x0 + x_mut).max(1e-15);
            let p0 = x0 / total;
            let p_mut = x_mut / total;

            // Average excess productivity: phi = (A0 - D)*p0 + (A_mut - D)*p_mut
            let phi = (a0 - d) * p0 + (a_mut - d) * p_mut;

            let dx0 = (a0 * q00 - d - phi) * p0;
            let dx_mut = (a0 * (1.0 - q00) * p0) + (a_mut - d - phi) * p_mut;
            (dx0, dx_mut)
        };

        // RK4 integration
        let (k1_0, k1_m) = deriv(self.master_fraction, self.mutant_fraction);
        let (k2_0, k2_m) = deriv(
            self.master_fraction + 0.5 * dt * k1_0,
            self.mutant_fraction + 0.5 * dt * k1_m,
        );
        let (k3_0, k3_m) = deriv(
            self.master_fraction + 0.5 * dt * k2_0,
            self.mutant_fraction + 0.5 * dt * k2_m,
        );
        let (k4_0, k4_m) = deriv(
            self.master_fraction + dt * k3_0,
            self.mutant_fraction + dt * k3_m,
        );

        let new_x0 = (self.master_fraction
            + (dt / 6.0) * (k1_0 + 2.0 * k2_0 + 2.0 * k3_0 + k4_0))
            .max(0.0);
        let new_xm = (self.mutant_fraction
            + (dt / 6.0) * (k1_m + 2.0 * k2_m + 2.0 * k3_m + k4_m))
            .max(0.0);

        let sum = (new_x0 + new_xm).max(1e-15);
        self.master_fraction = new_x0 / sum;
        self.mutant_fraction = new_xm / sum;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_eigen_error_threshold_delocalization() {
        // 50-base genome, superiority sigma = 5.0
        let l = 50;
        let sigma = 5.0;
        let mut model_sub = QuasispeciesReplicator::new(l, 0.01, sigma, 0.1);
        let mut model_super = QuasispeciesReplicator::new(l, 0.05, sigma, 0.1);

        let crit = model_sub.theoretical_error_threshold();
        // ln(5) / 50 = 1.6094 / 50 = 0.03218
        assert!((crit - 0.0322).abs() < 0.001);

        assert!(!model_sub.is_beyond_error_catastrophe());
        assert!(model_super.is_beyond_error_catastrophe());

        // Run RK4 steps for sub-critical
        for _ in 0..500 {
            model_sub.step_rk4(0.1);
        }
        // Subcritical maintains high master fraction
        assert!(
            model_sub.master_fraction > 0.3,
            "Subcritical mutation rate must preserve master sequence peak, got {}",
            model_sub.master_fraction
        );

        // Run RK4 steps for supercritical
        for _ in 0..500 {
            model_super.step_rk4(0.1);
        }
        // Supercritical experiences error catastrophe (delocalizes to mutants)
        assert!(
            model_super.master_fraction < 0.05,
            "Supercritical mutation rate must experience mutational meltdown, got {}",
            model_super.master_fraction
        );
    }
}
