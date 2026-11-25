//! 3D Graph-Laplacian Turing Morphogen Reaction-Diffusion System.
//!
//! Models Gierer-Meinhardt activator-inhibitor morphogen dynamics on arbitrary 3D cell adjacency graphs.
//! Discretizes diffusion via the combinatorial/graph Laplacian L = D - A:
//! du_i/dt = D_u sum_{j in N(i)} (u_j - u_i) + rho * u_i^2 / v_i - mu_u * u_i + rho_0
//! dv_i/dt = D_v sum_{j in N(i)} (v_j - v_i) + rho * u_i^2 - mu_v * v_i

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TuringParams {
    pub d_u: f64,       // Activator diffusion rate
    pub d_v: f64,       // Inhibitor diffusion rate (d_v >> d_u for Turing pattern formation)
    pub rho: f64,       // Cross-reaction production rate
    pub rho_0: f64,     // Baseline constitutive activator influx
    pub mu_u: f64,      // Activator degradation
    pub mu_v: f64,      // Inhibitor degradation
    pub fate_threshold: f64, // Concentration threshold for fate specification
}

impl Default for TuringParams {
    fn default() -> Self {
        Self {
            d_u: 0.02,
            d_v: 0.40, // 20x faster diffusion for inhibitor
            rho: 1.0,
            rho_0: 0.05,
            mu_u: 0.5,
            mu_v: 0.8,
            fate_threshold: 1.2,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CellContactGraph {
    pub num_cells: usize,
    pub positions: Vec<[f64; 3]>,
    pub adj_list: Vec<Vec<usize>>,
}

impl CellContactGraph {
    /// Constructs a contact graph from cell coordinates in 3D based on contact radius.
    pub fn from_coordinates(positions: Vec<[f64; 3]>, contact_radius: f64) -> Self {
        let num_cells = positions.len();
        let r2 = contact_radius * contact_radius;
        let mut adj_list = vec![Vec::new(); num_cells];

        for i in 0..num_cells {
            for j in (i + 1)..num_cells {
                let dx = positions[i][0] - positions[j][0];
                let dy = positions[i][1] - positions[j][1];
                let dz = positions[i][2] - positions[j][2];
                let dist2 = dx * dx + dy * dy + dz * dz;
                if dist2 <= r2 {
                    adj_list[i].push(j);
                    adj_list[j].push(i);
                }
            }
        }

        Self {
            num_cells,
            positions,
            adj_list,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TuringMorphogenEngine {
    pub params: TuringParams,
    pub graph: CellContactGraph,
    pub u: Vec<f64>, // Activator concentration per cell
    pub v: Vec<f64>, // Inhibitor concentration per cell
}

impl TuringMorphogenEngine {
    pub fn new(params: TuringParams, graph: CellContactGraph) -> Self {
        let n = graph.num_cells;
        // Homogeneous initial steady state with small random perturbation
        let u0 = 1.0;
        let v0 = 1.0;
        let u = vec![u0; n];
        let v = vec![v0; n];
        Self {
            params,
            graph,
            u,
            v,
        }
    }

    /// Evaluates time derivatives [du/dt, dv/dt] using the graph Laplacian.
    pub fn compute_derivatives(&self, u_curr: &[f64], v_curr: &[f64]) -> (Vec<f64>, Vec<f64>) {
        let n = self.graph.num_cells;
        let mut du = vec![0.0; n];
        let mut dv = vec![0.0; n];

        for i in 0..n {
            // Graph Laplacian diffusion: sum_{j in N(i)} (c_j - c_i)
            let mut diff_u = 0.0;
            let mut diff_v = 0.0;
            for &j in &self.graph.adj_list[i] {
                diff_u += u_curr[j] - u_curr[i];
                diff_v += v_curr[j] - v_curr[i];
            }

            let u_val = u_curr[i].max(1e-6);
            let v_val = v_curr[i].max(1e-6);

            // Gierer-Meinhardt reaction terms:
            let reaction_u = self.params.rho * (u_val * u_val) / v_val - self.params.mu_u * u_val + self.params.rho_0;
            let reaction_v = self.params.rho * (u_val * u_val) - self.params.mu_v * v_val;

            du[i] = self.params.d_u * diff_u + reaction_u;
            dv[i] = self.params.d_v * diff_v + reaction_v;
        }

        (du, dv)
    }

    /// Advances the morphogen field by time dt using 4th-order Runge-Kutta (RK4).
    pub fn step_rk4(&mut self, dt: f64) {
        let n = self.graph.num_cells;

        // k1
        let (du1, dv1) = self.compute_derivatives(&self.u, &self.v);

        // k2
        let mut u2 = vec![0.0; n];
        let mut v2 = vec![0.0; n];
        for i in 0..n {
            u2[i] = (self.u[i] + 0.5 * dt * du1[i]).max(0.0);
            v2[i] = (self.v[i] + 0.5 * dt * dv1[i]).max(0.0);
        }
        let (du2, dv2) = self.compute_derivatives(&u2, &v2);

        // k3
        let mut u3 = vec![0.0; n];
        let mut v3 = vec![0.0; n];
        for i in 0..n {
            u3[i] = (self.u[i] + 0.5 * dt * du2[i]).max(0.0);
            v3[i] = (self.v[i] + 0.5 * dt * dv2[i]).max(0.0);
        }
        let (du3, dv3) = self.compute_derivatives(&u3, &v3);

        // k4
        let mut u4 = vec![0.0; n];
        let mut v4 = vec![0.0; n];
        for i in 0..n {
            u4[i] = (self.u[i] + dt * du3[i]).max(0.0);
            v4[i] = (self.v[i] + dt * dv3[i]).max(0.0);
        }
        let (du4, dv4) = self.compute_derivatives(&u4, &v4);

        // Update
        for i in 0..n {
            self.u[i] = (self.u[i] + (dt / 6.0) * (du1[i] + 2.0 * du2[i] + 2.0 * du3[i] + du4[i])).max(0.0);
            self.v[i] = (self.v[i] + (dt / 6.0) * (dv1[i] + 2.0 * dv2[i] + 2.0 * dv3[i] + dv4[i])).max(0.0);
        }
    }

    /// Evaluates differentiated cell fates: returns bool slice where true = organizer/germ, false = soma/structural.
    pub fn cell_fates(&self) -> Vec<bool> {
        self.u.iter().map(|&val| val >= self.params.fate_threshold).collect()
    }
}
