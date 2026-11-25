//! Bridge Operator B_{IV -> V}: Unicellular Eukaryote Cluster to Obligate Multicellular Organism.
//!
//! Evaluates Michod convexity gate, builds 3D spatial contact graph, determines germ-soma
//! differentiation, and constructs a MulticellularOrganism with exact 7-element mass conservation.

use evo_core::composition::AtomicComposition;
use evo_regime_eukaryote::chimera::ChimericEukaryote;
use evo_regime_multicell::michod_gating::{MichodEtiEvaluator, MichodEtiParams};
use evo_regime_multicell::organism::MulticellularOrganism;
use evo_regime_multicell::turing_morphogen::CellContactGraph;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MulticellularBridgeOperator {
    pub min_cluster_size: usize,
    pub contact_radius: f64,
    pub eti_evaluator: MichodEtiEvaluator,
}

impl Default for MulticellularBridgeOperator {
    fn default() -> Self {
        Self {
            min_cluster_size: 8,
            contact_radius: 1.5,
            eti_evaluator: MichodEtiEvaluator::new(MichodEtiParams::default()),
        }
    }
}

impl MulticellularBridgeOperator {
    pub fn new(min_cluster_size: usize, contact_radius: f64) -> Self {
        Self {
            min_cluster_size,
            contact_radius,
            eti_evaluator: MichodEtiEvaluator::new(MichodEtiParams::default()),
        }
    }

    /// Evaluates whether a clonal eukaryotic cluster qualifies for multicellular promotion:
    /// 1. Cluster size >= min_cluster_size
    /// 2. Satisfies Michod convexity synergy: W_group > max generalist fitness.
    pub fn can_promote(&self, cluster_size: usize) -> bool {
        if cluster_size < self.min_cluster_size {
            return false;
        }

        // Suppose 80% soma, 20% germ
        let soma = (cluster_size as f64 * 0.8).round() as usize;
        let germ = cluster_size - soma;
        let (passes, _, _) = self.eti_evaluator.satisfies_convexity_gate(soma, germ, 1.0, 0.0);
        passes
    }

    /// Promotes a cluster of eukaryotic cells into a unified MulticellularOrganism with exact atomic conservation.
    pub fn promote(
        &self,
        organism_id: u64,
        cells: &[ChimericEukaryote],
        coordinates: Vec<[f64; 3]>,
    ) -> Result<(MulticellularOrganism, AtomicComposition), &'static str> {
        let n = cells.len();
        if n < self.min_cluster_size {
            return Err("Cluster size below minimum threshold for multicellularity");
        }
        if coordinates.len() != n {
            return Err("Coordinate count must match cell count");
        }

        // Sum exact atomic inputs
        let mut total_input_atoms = AtomicComposition::zero();
        for cell in cells {
            total_input_atoms = total_input_atoms.add(&cell.biomass_composition_per_cell);
        }

        // Build contact graph
        let graph = CellContactGraph::from_coordinates(coordinates, self.contact_radius);

        // Assign initial cell types: outer 80% soma (1), core 20% germ (0)
        let soma_count = (n as f64 * 0.8).round() as usize;
        let mut cell_types = vec![1; n]; // Default soma
        for slot in cell_types.iter_mut().take(n - soma_count) {
            *slot = 0; // Germ
        }

        // Estimate initial structural volume from atom count (1e21 atoms/cm^3)
        let total_atoms = total_input_atoms.total_atoms();
        let vol = (total_atoms as f64 / 1e21).max(1e-6);
        let reserve = vol * 100.0; // 100 J/cm^3 initial reserve

        let organism = MulticellularOrganism::new(
            organism_id,
            cells[0].id as u64, // Inherit lineage ID from founder cell
            graph,
            cell_types,
            vol,
            reserve,
        );

        Ok((organism, total_input_atoms))
    }
}
