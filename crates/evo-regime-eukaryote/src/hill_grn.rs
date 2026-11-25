//! Non-Linear Hill-Function Gene Regulatory Network (GRN) with RK4 Integration.
//! Couples transcription factor cascades to metabolic reaction flux bounds.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HillRegulatoryEdge {
    pub source_node: usize,
    pub target_node: usize,
    pub is_repressor: bool,
    pub hill_coefficient: f64,
    pub dissociation_constant_k: f64,
    pub weight: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AllostericMetaboliteSensor {
    pub metabolite_idx: usize,
    pub target_node: usize,
    pub is_inhibitor: bool,
    pub hill_coefficient: f64,
    pub affinity_km: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HillGrnNode {
    pub id: usize,
    pub name: String,
    pub baseline_expression: f64,
    pub degradation_rate: f64,
    pub target_reaction_column: Option<usize>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HillGrnNetwork {
    pub nodes: Vec<HillGrnNode>,
    pub edges: Vec<HillRegulatoryEdge>,
    pub sensors: Vec<AllostericMetaboliteSensor>,
    pub expression_levels: Vec<f64>,
}

impl HillGrnNetwork {
    pub fn new(nodes: Vec<HillGrnNode>, edges: Vec<HillRegulatoryEdge>, sensors: Vec<AllostericMetaboliteSensor>) -> Self {
        let n = nodes.len();
        let expression_levels = vec![1.0; n];
        Self {
            nodes,
            edges,
            sensors,
            expression_levels,
        }
    }

    /// Evaluates rate of change dE/dt for each GRN node
    pub fn compute_derivatives(&self, state: &[f64], metabolite_conc: &[f64]) -> Vec<f64> {
        let n = self.nodes.len();
        let mut derivatives = vec![0.0; n];

        for i in 0..n {
            let node = &self.nodes[i];
            let mut reg_factor = 1.0;

            // Incoming regulatory edges
            for edge in self.edges.iter().filter(|e| e.target_node == i) {
                let e_src = state[edge.source_node].max(0.0);
                let k_pow = edge.dissociation_constant_k.powf(edge.hill_coefficient);
                let src_pow = e_src.powf(edge.hill_coefficient);

                let hill_term = if edge.is_repressor {
                    k_pow / (k_pow + src_pow)
                } else {
                    src_pow / (k_pow + src_pow)
                };

                reg_factor *= (1.0 - edge.weight) + edge.weight * hill_term;
            }

            // Incoming metabolite sensors (allosteric feedback)
            for sensor in self.sensors.iter().filter(|s| s.target_node == i) {
                if sensor.metabolite_idx < metabolite_conc.len() {
                    let m_conc = metabolite_conc[sensor.metabolite_idx].max(0.0);
                    let km_pow = sensor.affinity_km.powf(sensor.hill_coefficient);
                    let m_pow = m_conc.powf(sensor.hill_coefficient);

                    let term = if sensor.is_inhibitor {
                        km_pow / (km_pow + m_pow)
                    } else {
                        m_pow / (km_pow + m_pow)
                    };
                    reg_factor *= term;
                }
            }

            // Production - Degradation
            derivatives[i] = node.baseline_expression * reg_factor - node.degradation_rate * state[i];
        }

        derivatives
    }

    /// Steps the GRN forward using 4th-order Runge-Kutta (RK4)
    pub fn step_rk4(&mut self, metabolite_conc: &[f64], dt: f64, substeps: usize) {
        let n = self.nodes.len();
        if n == 0 {
            return;
        }

        let h = dt / (substeps as f64);

        for _ in 0..substeps {
            let k1 = self.compute_derivatives(&self.expression_levels, metabolite_conc);

            let mut y2 = vec![0.0; n];
            for i in 0..n {
                y2[i] = (self.expression_levels[i] + 0.5 * h * k1[i]).max(0.0);
            }
            let k2 = self.compute_derivatives(&y2, metabolite_conc);

            let mut y3 = vec![0.0; n];
            for i in 0..n {
                y3[i] = (self.expression_levels[i] + 0.5 * h * k2[i]).max(0.0);
            }
            let k3 = self.compute_derivatives(&y3, metabolite_conc);

            let mut y4 = vec![0.0; n];
            for i in 0..n {
                y4[i] = (self.expression_levels[i] + h * k3[i]).max(0.0);
            }
            let k4 = self.compute_derivatives(&y4, metabolite_conc);

            for i in 0..n {
                let delta = (h / 6.0) * (k1[i] + 2.0 * k2[i] + 2.0 * k3[i] + k4[i]);
                self.expression_levels[i] = (self.expression_levels[i] + delta).max(0.0);
            }
        }
    }

    /// Computes the multiplier for maximum flux V_max on a target reaction column
    pub fn enzyme_multiplier_for_column(&self, col_idx: usize) -> f64 {
        for (i, node) in self.nodes.iter().enumerate() {
            if node.target_reaction_column == Some(col_idx) {
                // Return normalized expression level
                return (self.expression_levels[i] / node.baseline_expression).max(0.0);
            }
        }
        1.0 // Unregulated columns maintain standard baseline
    }
}
