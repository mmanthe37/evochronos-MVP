//! Russell Lande Quantitative Genetics & G-Matrix Phenotypic Trajectory Engine.
//!
//! Evaluates the multivariate Lande equation:
//! Delta z_bar = G * beta = G * grad_{z_bar} ln W_bar
//! Where:
//! G = J * M * J^T + G_standing
//! beta = -Omega^{-1} * (z_bar - theta) for Gaussian stabilizing selection.

use crate::jacobian_g2p::GenotypePhenotypeJacobian;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LandeParameters {
    pub num_traits: usize,
    /// Selection strength inverse-variance matrix Omega^{-1} (k x k).
    pub omega_inv: Vec<Vec<f64>>,
    /// Fitness optimum trait vector theta (k).
    pub theta: Vec<f64>,
    /// Base standing genetic variance (House-of-Cards component).
    pub hoc_variance: f64,
}

#[allow(clippy::needless_range_loop)]
impl LandeParameters {
    pub fn isotropic(num_traits: usize, selection_intensity: f64, theta: Vec<f64>) -> Self {
        let mut omega_inv = vec![vec![0.0; num_traits]; num_traits];
        for i in 0..num_traits {
            omega_inv[i][i] = selection_intensity;
        }
        Self {
            num_traits,
            omega_inv,
            theta,
            hoc_variance: 0.05,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LandeGMatrix {
    pub num_traits: usize,
    pub g: Vec<Vec<f64>>, // k x k genetic covariance matrix
}

#[allow(clippy::needless_range_loop)]
impl LandeGMatrix {
    pub fn new(num_traits: usize) -> Self {
        Self {
            num_traits,
            g: vec![vec![0.0; num_traits]; num_traits],
        }
    }

    /// Constructs G from developmental Jacobian J and mutational covariance M:
    /// G = J * M * J^T + diag(hoc_variance)
    pub fn from_jacobian_and_mutation(
        jac: &GenotypePhenotypeJacobian,
        mutational_variance: &[f64], // diagonal of M (size m)
        hoc_variance: f64,
    ) -> Self {
        let k = jac.num_traits;
        let m = jac.num_genotypes;
        let mut g = vec![vec![0.0; k]; k];

        // G_ij = sum_r J_ir * M_rr * J_jr
        for i in 0..k {
            for j in 0..k {
                let mut sum = 0.0;
                for r in 0..m {
                    let m_rr = if r < mutational_variance.len() { mutational_variance[r] } else { 1e-4 };
                    sum += jac.matrix[i][r] * m_rr * jac.matrix[j][r];
                }
                if i == j {
                    sum += hoc_variance;
                }
                g[i][j] = sum;
            }
        }

        Self { num_traits: k, g }
    }

    /// Computes directional selection gradient beta = -Omega^{-1} * (z_bar - theta).
    pub fn compute_selection_gradient(&self, z_bar: &[f64], params: &LandeParameters) -> Vec<f64> {
        let k = self.num_traits;
        let mut beta = vec![0.0; k];

        for i in 0..k {
            let mut sum = 0.0;
            for j in 0..k {
                let diff = z_bar[j] - params.theta[j];
                sum += params.omega_inv[i][j] * diff;
            }
            beta[i] = -sum;
        }

        beta
    }

    /// Evaluates phenotypic evolutionary step: Delta z_bar = G * beta.
    pub fn step_evolution(&self, z_bar: &mut [f64], params: &LandeParameters) -> Vec<f64> {
        let beta = self.compute_selection_gradient(z_bar, params);
        let k = self.num_traits;
        let mut delta_z = vec![0.0; k];

        for i in 0..k {
            let mut sum = 0.0;
            for j in 0..k {
                sum += self.g[i][j] * beta[j];
            }
            delta_z[i] = sum;
            z_bar[i] += sum;
        }

        delta_z
    }
}
