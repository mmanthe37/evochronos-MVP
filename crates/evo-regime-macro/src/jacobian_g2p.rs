//! Developmental Genotype-Phenotype Mapping Jacobian (J_{G -> P}).
//!
//! Evaluates the first-order sensitivity matrix J in R^{k x m} relating
//! m developmental/genetic parameters to k macro-phenotypic traits:
//! J_ij = partial z_i / partial x_j
//! Evaluated via centered finite difference perturbations.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenotypePhenotypeJacobian {
    pub num_traits: usize,     // k
    pub num_genotypes: usize,  // m
    pub matrix: Vec<Vec<f64>>, // k x m
}

impl GenotypePhenotypeJacobian {
    pub fn new(num_traits: usize, num_genotypes: usize) -> Self {
        Self {
            num_traits,
            num_genotypes,
            matrix: vec![vec![0.0; num_genotypes]; num_traits],
        }
    }

    /// Evaluates the developmental Jacobian J at genotype x using centered finite differences.
    pub fn evaluate_finite_difference<F>(
        genotype: &[f64],
        num_traits: usize,
        mapping: F,
        h: f64,
    ) -> Self
    where
        F: Fn(&[f64]) -> Vec<f64>,
    {
        let m = genotype.len();
        let k = num_traits;
        let mut jac = Self::new(k, m);

        let mut x_plus = genotype.to_vec();
        let mut x_minus = genotype.to_vec();

        for j in 0..m {
            let orig = genotype[j];
            x_plus[j] = orig + h;
            x_minus[j] = orig - h;

            let z_plus = mapping(&x_plus);
            let z_minus = mapping(&x_minus);

            for i in 0..k {
                jac.matrix[i][j] = (z_plus[i] - z_minus[i]) / (2.0 * h);
            }

            // Restore
            x_plus[j] = orig;
            x_minus[j] = orig;
        }

        jac
    }

    /// Computes phenotypic delta dz given a mutational/genotypic change dx: dz = J * dx.
    #[allow(clippy::needless_range_loop)]
    pub fn project_genotype_delta(&self, dx: &[f64]) -> Vec<f64> {
        let mut dz = vec![0.0; self.num_traits];
        for i in 0..self.num_traits {
            let mut sum = 0.0;
            for j in 0..self.num_genotypes {
                sum += self.matrix[i][j] * dx[j];
            }
            dz[i] = sum;
        }
        dz
    }
}
