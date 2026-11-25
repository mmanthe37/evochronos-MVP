//! Block-Angular Tri-Compartment Stoichiometric Matrix Builder.
//! Separates cytosolic and mitochondrial metabolites to preserve proton gradients.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CellularCompartment {
    HostCytosol,
    MitochondrialMatrix,
    IntermembraneSpace,
    Extracellular,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IntermembraneTransportReaction {
    pub name: String,
    pub cytosol_metabolite_idx: usize,
    pub mito_metabolite_idx: usize,
    pub stoichiometry_cytosol_to_mito: f64, // e.g. -1 in cytosol, +1 in mito
    pub is_proton_coupled: bool,
    pub lower_bound: f64,
    pub upper_bound: f64,
}

pub struct CompartmentalizedMatrixMerger;

impl CompartmentalizedMatrixMerger {
    /// Constructs a partitioned block-angular stoichiometric matrix:
    /// [ S_cytosol     0        T_cytosol ]
    /// [    0       S_mito      T_mito    ]
    pub fn merge(
        host_stoichiometry: &[Vec<f64>], // M_host x N_host
        mito_stoichiometry: &[Vec<f64>], // M_mito x N_mito
        transport_rxns: &[IntermembraneTransportReaction],
    ) -> (Vec<Vec<f64>>, usize, usize) {
        let m_host = host_stoichiometry.len();
        let n_host = if m_host > 0 { host_stoichiometry[0].len() } else { 0 };

        let m_mito = mito_stoichiometry.len();
        let n_mito = if m_mito > 0 { mito_stoichiometry[0].len() } else { 0 };

        let n_transport = transport_rxns.len();

        let total_rows = m_host + m_mito;
        let total_cols = n_host + n_mito + n_transport;

        let mut chimeric_matrix = vec![vec![0.0; total_cols]; total_rows];

        // 1. Fill top-left block: Host Cytosol
        for i in 0..m_host {
            for j in 0..n_host {
                chimeric_matrix[i][j] = host_stoichiometry[i][j];
            }
        }

        // 2. Fill bottom-center block: Mitochondrial Matrix
        for i in 0..m_mito {
            for j in 0..n_mito {
                chimeric_matrix[m_host + i][n_host + j] = mito_stoichiometry[i][j];
            }
        }

        // 3. Fill right block: Intermembrane Transport columns
        for (t_idx, tr) in transport_rxns.iter().enumerate() {
            let col = n_host + n_mito + t_idx;
            if tr.cytosol_metabolite_idx < m_host {
                chimeric_matrix[tr.cytosol_metabolite_idx][col] = -tr.stoichiometry_cytosol_to_mito;
            }
            if tr.mito_metabolite_idx < m_mito {
                chimeric_matrix[m_host + tr.mito_metabolite_idx][col] = tr.stoichiometry_cytosol_to_mito;
            }
        }

        (chimeric_matrix, total_rows, total_cols)
    }
}
