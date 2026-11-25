//! Malcolm Steinberg Differential Adhesion Hypothesis (DAH) & Cellular Potts Sorting.
//!
//! Simulates tissue self-organization, cell sorting, and germ-layer engulfment
//! by minimizing interfacial adhesion energy across cell contact interfaces:
//! H = sum_{<i, j>} J_{tau(i), tau(j)} + lambda_vol * sum_i (V_i - V_0)^2
//! Interfacial tension: gamma_{AB} = (J_{AA} + J_{BB})/2 - J_{AB}

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DahParams {
    /// Adhesion energy matrix J[tau_i][tau_j]. More negative = stronger cell-cell adhesion.
    pub j_matrix: Vec<Vec<f64>>,
    pub temperature: f64, // Effective membrane fluctuation temperature (Boltzmann factor)
}

impl Default for DahParams {
    fn default() -> Self {
        // Default 2-cell type system: Type 0 = Strongly cohesive core, Type 1 = Less cohesive shell
        Self {
            j_matrix: vec![
                vec![-10.0, -4.0], // J[0][0] = -10 (high affinity), J[0][1] = -4 (heterophilic)
                vec![-4.0, -2.0],  // J[1][0] = -4, J[1][1] = -2 (low affinity)
            ],
            temperature: 1.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PottsCellTissue {
    pub num_cells: usize,
    pub cell_types: Vec<usize>, // Type ID for each cell
    pub adj_list: Vec<Vec<usize>>, // Neighboring contact graph
    pub params: DahParams,
}

impl PottsCellTissue {
    pub fn new(cell_types: Vec<usize>, adj_list: Vec<Vec<usize>>, params: DahParams) -> Self {
        let num_cells = cell_types.len();
        Self {
            num_cells,
            cell_types,
            adj_list,
            params,
        }
    }

    /// Computes total interfacial adhesion energy H.
    pub fn total_adhesion_energy(&self) -> f64 {
        let mut h = 0.0;
        for i in 0..self.num_cells {
            let t_i = self.cell_types[i];
            for &j in &self.adj_list[i] {
                if i < j {
                    let t_j = self.cell_types[j];
                    h += self.params.j_matrix[t_i][t_j];
                }
            }
        }
        h
    }

    /// Computes the change in Hamiltonian Delta H if the cell types of i and j are swapped.
    pub fn delta_h_swap(&self, i: usize, j: usize) -> f64 {
        let ti_old = self.cell_types[i];
        let tj_old = self.cell_types[j];

        if ti_old == tj_old {
            return 0.0;
        }

        // Energy before swap:
        let mut e_before = 0.0;
        for &k in &self.adj_list[i] {
            if k != j {
                e_before += self.params.j_matrix[ti_old][self.cell_types[k]];
            }
        }
        for &k in &self.adj_list[j] {
            if k != i {
                e_before += self.params.j_matrix[tj_old][self.cell_types[k]];
            }
        }
        // Direct interaction between i and j (invariant under swap because J is symmetric)

        // Energy after swap (i gets tj_old, j gets ti_old):
        let mut e_after = 0.0;
        for &k in &self.adj_list[i] {
            if k != j {
                e_after += self.params.j_matrix[tj_old][self.cell_types[k]];
            }
        }
        for &k in &self.adj_list[j] {
            if k != i {
                e_after += self.params.j_matrix[ti_old][self.cell_types[k]];
            }
        }

        e_after - e_before
    }

    /// Performs one Metropolis Monte Carlo step attempting cell swaps.
    pub fn metropolis_step(&mut self, rng_sample: f64, i: usize, j: usize) -> bool {
        let dh = self.delta_h_swap(i, j);
        let accept = if dh <= 0.0 {
            true
        } else {
            let p = (-dh / self.params.temperature).exp();
            rng_sample < p
        };

        if accept {
            self.cell_types.swap(i, j);
        }
        accept
    }

    /// Computes Steinberg interfacial surface tension between two cell types A and B:
    /// gamma_AB = (J_AA + J_BB)/2 - J_AB
    pub fn interfacial_tension(&self, a: usize, b: usize) -> f64 {
        let jaa = self.params.j_matrix[a][a];
        let jbb = self.params.j_matrix[b][b];
        let jab = self.params.j_matrix[a][b];
        0.5 * (jaa + jbb) - jab
    }
}
