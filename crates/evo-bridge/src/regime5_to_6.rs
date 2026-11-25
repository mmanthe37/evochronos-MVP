//! Bridge Operator B_{V -> VI}: Multicellular Population to Macro-Evolutionary Lineage & Tree Sequence.
//!
//! Extracts population phenotypic trait distribution z_bar, constructs the initial
//! Lande G-matrix, registers a new coalescent lineage in the tskit TableCollection,
//! and links organism biomass to the global macro-biosphere elemental conservation ledger.

use evo_core::composition::AtomicComposition;
use evo_regime_macro::allometric_conservation::AllometricScaler;
use evo_regime_macro::jacobian_g2p::GenotypePhenotypeJacobian;
use evo_regime_macro::lande_g_matrix::LandeGMatrix;
use evo_regime_macro::lineage::Lineage;
use evo_regime_macro::tskit_recorder::TableCollection;
use evo_regime_multicell::organism::MulticellularOrganism;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacroBridgeOperator {
    pub min_effective_pop_size: u64,
    pub num_traits: usize,
    pub allometric_scaler: AllometricScaler,
}

impl Default for MacroBridgeOperator {
    fn default() -> Self {
        Self {
            min_effective_pop_size: 100,
            num_traits: 2, // Trait 0: log body mass (g), Trait 1: metabolic efficiency
            allometric_scaler: AllometricScaler::default(),
        }
    }
}

impl MacroBridgeOperator {
    pub fn new(min_effective_pop_size: u64, num_traits: usize) -> Self {
        Self {
            min_effective_pop_size,
            num_traits,
            allometric_scaler: AllometricScaler::default(),
        }
    }

    /// Evaluates population readiness for macro-evolutionary continuum coarse-graining:
    pub fn can_promote(&self, pop_size: u64) -> bool {
        pop_size >= self.min_effective_pop_size
    }

    /// Promotes a multicellular population to a macro-evolutionary Lineage and tskit recording.
    pub fn promote(
        &self,
        lineage_id: u64,
        parent_lineage_id: Option<u64>,
        current_time_myr: f64,
        organisms: &[MulticellularOrganism],
        tables: &mut TableCollection,
    ) -> Result<(Lineage, AtomicComposition), &'static str> {
        if organisms.is_empty() {
            return Err("Cannot promote empty organism population");
        }

        let n = organisms.len();

        // 1. Compute empirical phenotypic mean:
        // Trait 0: log10(mass in grams) where density ~ 1 g/cm^3
        let mut sum_log_mass = 0.0;
        let mut total_atoms = AtomicComposition::zero();

        for org in organisms {
            let mass_g = org.deb_state.structure_volume; // 1 cm^3 ~ 1 g
            sum_log_mass += mass_g.max(1e-12).log10();
            total_atoms = total_atoms.add(&org.total_composition());
        }

        let mean_log_mass = sum_log_mass / n as f64;
        let trait_mean = vec![mean_log_mass, 1.0]; // [log_mass, efficiency]

        // 2. Initialize default G-matrix with developmental sensitivity:
        let mut jac = GenotypePhenotypeJacobian::new(self.num_traits, self.num_traits);
        jac.matrix[0][0] = 1.0;
        jac.matrix[1][1] = 1.0;
        let g_matrix = LandeGMatrix::from_jacobian_and_mutation(&jac, &[0.02, 0.02], 0.05);

        // 3. Register root node in tskit TableCollection:
        let root_node_id = tables.add_node(current_time_myr, lineage_id as u32, 1);

        let lineage = Lineage::new(
            lineage_id,
            parent_lineage_id,
            current_time_myr,
            trait_mean,
            g_matrix,
            organisms.len() as u64,
            root_node_id,
        );

        Ok((lineage, total_atoms))
    }
}
