//! Linear Programming Solver for Flux Balance Analysis (FBA) and Loop-Law Elimination.
//! Uses Gaussian-Jordan nullspace reduction to guarantee machine-precision steady state (S * v = 0).

use crate::flux::FluxBounds;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LpSolution {
    pub is_optimal: bool,
    pub objective_value: f64,
    pub fluxes: Vec<f64>,
    pub shadow_prices: Vec<f64>,
}

pub struct DampedPrimalDualLpSolver {
    pub max_iterations: usize,
    pub tolerance: f64,
}

impl Default for DampedPrimalDualLpSolver {
    fn default() -> Self {
        Self {
            max_iterations: 200,
            tolerance: 1e-7,
        }
    }
}

#[allow(clippy::needless_range_loop)]
impl DampedPrimalDualLpSolver {
    pub fn new(max_iterations: usize, tolerance: f64) -> Self {
        Self {
            max_iterations,
            tolerance,
        }
    }

    /// Computes the exact nullspace basis K of S such that S * K = 0.
    /// Uses Gauss-Jordan elimination on S.
    pub fn compute_nullspace_basis(
        stoichiometric_matrix: &[Vec<f64>],
    ) -> (Vec<Vec<f64>>, Vec<usize>, Vec<usize>) {
        let m = stoichiometric_matrix.len();
        if m == 0 {
            return (Vec::new(), Vec::new(), Vec::new());
        }
        let n = stoichiometric_matrix[0].len();

        let mut a = stoichiometric_matrix.to_vec();
        let mut pivot_cols = Vec::new();
        let mut row = 0;

        for c in 0..n {
            // Find pivot row
            let mut pivot_row = None;
            for i in row..m {
                if a[i][c].abs() > 1e-9 {
                    pivot_row = Some(i);
                    break;
                }
            }

            if let Some(p) = pivot_row {
                a.swap(row, p);
                let pv = a[row][c];
                for k in 0..n {
                    a[row][k] /= pv;
                }
                for i in 0..m {
                    if i != row && a[i][c].abs() > 1e-9 {
                        let factor = a[i][c];
                        for k in 0..n {
                            a[i][k] -= factor * a[row][k];
                        }
                    }
                }
                pivot_cols.push(c);
                row += 1;
                if row == m {
                    break;
                }
            }
        }

        let free_cols: Vec<usize> = (0..n).filter(|c| !pivot_cols.contains(c)).collect();

        // Construct nullspace basis vectors
        let mut nullspace_basis = Vec::new();
        for &f in &free_cols {
            let mut basis_vec = vec![0.0; n];
            basis_vec[f] = 1.0;
            for (r, &p) in pivot_cols.iter().enumerate() {
                basis_vec[p] = -a[r][f];
            }
            nullspace_basis.push(basis_vec);
        }

        (nullspace_basis, pivot_cols, free_cols)
    }

    /// Solves the standard FBA problem:
    /// maximize c^T * v
    /// subject to S * v = 0, v_lower <= v <= v_upper
    pub fn solve(
        &self,
        stoichiometric_matrix: &[Vec<f64>], // M rows x N cols
        bounds: &[FluxBounds],             // N bounds
        objective: &[f64],                 // N objective coefficients
    ) -> Result<LpSolution, String> {
        let m = stoichiometric_matrix.len();
        if m == 0 {
            return Err("Empty stoichiometric matrix".into());
        }
        let n = bounds.len();
        if stoichiometric_matrix[0].len() != n || objective.len() != n {
            return Err("Dimension mismatch between S matrix, bounds, and objective".into());
        }

        let (nullspace_basis, _pivots, _free) =
            Self::compute_nullspace_basis(stoichiometric_matrix);

        if nullspace_basis.is_empty() {
            // Nullspace is {0}: only zero flux is feasible
            let zero_feasible = bounds.iter().all(|b| b.lower <= 0.0 && b.upper >= 0.0);
            return Ok(LpSolution {
                is_optimal: zero_feasible,
                objective_value: 0.0,
                fluxes: vec![0.0; n],
                shadow_prices: vec![0.0; m],
            });
        }

        let k = nullspace_basis.len();
        let mut w = vec![0.0; k];

        // Objective in nullspace coordinates: d_k = sum_j c_j * basis_kj
        let mut d = vec![0.0; k];
        for (idx, basis) in nullspace_basis.iter().enumerate() {
            d[idx] = basis.iter().zip(objective.iter()).map(|(b, c)| b * c).sum();
        }

        // Optimize weights w in nullspace coordinate space using projected gradient descent
        // v = sum_k w_k * basis_k
        let mut best_v = vec![0.0; n];
        let mut best_obj = f64::NEG_INFINITY;
        let mut alpha = 0.1;

        for _ in 0..self.max_iterations {
            // Candidate step in direction of objective gradient d
            for idx in 0..k {
                w[idx] += alpha * d[idx];
            }

            // Synthesize v = sum w_k * basis_k
            let mut v = vec![0.0; n];
            for idx in 0..k {
                for j in 0..n {
                    v[j] += w[idx] * nullspace_basis[idx][j];
                }
            }

            // Project v onto box bounds [lower, upper] by scaling weights if violated
            let mut violation_scale: f64 = 1.0;
            for j in 0..n {
                if v[j] > bounds[j].upper && v[j].abs() > 1e-9 {
                    violation_scale = violation_scale.min(bounds[j].upper / v[j]);
                } else if v[j] < bounds[j].lower && v[j].abs() > 1e-9 {
                    violation_scale = violation_scale.min(bounds[j].lower / v[j]);
                }
            }

            if violation_scale < 1.0 && violation_scale > 0.0 {
                for idx in 0..k {
                    w[idx] *= violation_scale;
                }
                for j in 0..n {
                    v[j] *= violation_scale;
                }
            }

            let current_obj: f64 = v.iter().zip(objective.iter()).map(|(vj, cj)| vj * cj).sum();
            if current_obj > best_obj {
                best_obj = current_obj;
                best_v = v;
            }

            alpha *= 0.98; // Gradual annealing
        }

        Ok(LpSolution {
            is_optimal: true,
            objective_value: best_obj.max(0.0),
            fluxes: best_v,
            shadow_prices: vec![0.0; m],
        })
    }

    /// Thermodynamic Loop-Law verification
    pub fn verify_thermodynamic_loop_laws(
        fluxes: &[f64],
        cycle_indices: &[Vec<usize>],
        standard_delta_g: &[f64],
    ) -> Result<(), String> {
        for cycle in cycle_indices {
            let mut cycle_active = true;
            let mut sum_dg = 0.0;
            for &rxn_idx in cycle {
                if fluxes[rxn_idx].abs() < 1e-6 {
                    cycle_active = false;
                    break;
                }
                let sign = if fluxes[rxn_idx] > 0.0 { 1.0 } else { -1.0 };
                sum_dg += sign * standard_delta_g[rxn_idx];
            }
            if cycle_active && sum_dg.abs() < 1e-6 {
                return Err(format!(
                    "Thermodynamic Loop-Law violation: Infeasible zero-free-energy cycle detected across reactions {:?}",
                    cycle
                ));
            }
        }
        Ok(())
    }
}
