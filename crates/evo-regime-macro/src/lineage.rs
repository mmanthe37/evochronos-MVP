//! Macro-Evolutionary Lineage Entity.

use crate::lande_g_matrix::LandeGMatrix;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lineage {
    pub id: u64,
    pub parent_id: Option<u64>,
    pub origin_time_myr: f64,
    pub extinction_time_myr: Option<f64>,
    pub trait_mean: Vec<f64>, // Phenotypic mean vector z_bar (size k)
    pub g_matrix: LandeGMatrix,
    pub effective_pop_size: u64,
    pub root_node_id: u32,
    pub tip_node_ids: Vec<u32>,
    pub is_extant: bool,
}

impl Lineage {
    pub fn new(
        id: u64,
        parent_id: Option<u64>,
        origin_time_myr: f64,
        trait_mean: Vec<f64>,
        g_matrix: LandeGMatrix,
        effective_pop_size: u64,
        root_node_id: u32,
    ) -> Self {
        Self {
            id,
            parent_id,
            origin_time_myr,
            extinction_time_myr: None,
            trait_mean,
            g_matrix,
            effective_pop_size,
            root_node_id,
            tip_node_ids: vec![root_node_id],
            is_extant: true,
        }
    }

    pub fn mark_extinct(&mut self, time_myr: f64) {
        self.is_extant = false;
        self.extinction_time_myr = Some(time_myr);
        self.effective_pop_size = 0;
    }
}
