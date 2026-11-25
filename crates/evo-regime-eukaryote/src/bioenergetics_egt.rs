//! Nick Lane's Bioenergetic Scaling and CoRR-Constrained Endosymbiotic Gene Transfer (EGT).

use crate::locus::{GeneLocation, GeneLocus};
use evo_core::{assert_exact_stoichiometric_balance, EvoCoreError, NUM_ELEMENTS};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BioenergeticEgtEngine {
    pub prokaryote_baseline_atp_per_gene_sec: f64,
    pub mitochondrial_cristae_density: f64,
    pub bioenergetic_expansion_ratio: f64,
}

impl Default for BioenergeticEgtEngine {
    fn default() -> Self {
        Self {
            prokaryote_baseline_atp_per_gene_sec: 1.0e-17, // ~10^-17 mol ATP / gene / sec
            mitochondrial_cristae_density: 40.0,           // Surface area multiplier of folded inner membrane
            bioenergetic_expansion_ratio: 2.0e4,           // 20,000x expansion in ATP per gene locus (Lane & Martin 2010)
        }
    }
}

impl BioenergeticEgtEngine {
    /// Computes the energetic surplus (ATP per gene locus per second) available to the eukaryote
    pub fn compute_atp_per_gene(&self, num_mitochondria: u32) -> f64 {
        let organelle_boost = (num_mitochondria as f64) * self.mitochondrial_cristae_density;
        self.prokaryote_baseline_atp_per_gene_sec * organelle_boost.min(self.bioenergetic_expansion_ratio)
    }

    /// Evaluates which genes can be safely transferred to the nucleus under the CoRR hypothesis.
    /// Genes coupled to local redox regulation (ETC core) MUST stay in the organelle.
    /// All other metabolic, ribosomal, and structural genes are transferred to the nucleus.
    pub fn execute_corr_gene_transfer(
        &self,
        symbiont_genome: &mut [GeneLocus],
    ) -> Result<(u32, [u128; NUM_ELEMENTS]), EvoCoreError> {
        let mut initial_dna_atoms = [0u128; NUM_ELEMENTS];
        for gene in symbiont_genome.iter() {
            gene.elemental_dna_atoms().accumulate_into(&mut initial_dna_atoms, 1);
        }

        let mut transferred_genes_count = 0u32;

        for gene in symbiont_genome.iter_mut() {
            if gene.location == GeneLocation::OrganellarMitochondrial && !gene.is_redox_coupled {
                // Transfer gene to nuclear genome
                gene.location = GeneLocation::Nuclear;
                transferred_genes_count += 1;
            }
        }

        let mut final_dna_atoms = [0u128; NUM_ELEMENTS];
        for gene in symbiont_genome.iter() {
            gene.elemental_dna_atoms().accumulate_into(&mut final_dna_atoms, 1);
        }

        // Strict bit-exact mass conservation across gene translocation
        assert_exact_stoichiometric_balance(&initial_dna_atoms, &final_dna_atoms)?;

        Ok((transferred_genes_count, final_dna_atoms))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_corr_egt_atomic_conservation() {
        let mut genome = vec![
            GeneLocus::new(1, "Cox1_core_redox", 1500, GeneLocation::OrganellarMitochondrial, true),
            GeneLocus::new(2, "Atp6_core_redox", 800, GeneLocation::OrganellarMitochondrial, true),
            GeneLocus::new(3, "Citrate_synthase", 1200, GeneLocation::OrganellarMitochondrial, false),
            GeneLocus::new(4, "Pyruvate_dehydrogenase", 2400, GeneLocation::OrganellarMitochondrial, false),
        ];

        let engine = BioenergeticEgtEngine::default();
        let (transferred, _atoms) = engine
            .execute_corr_gene_transfer(&mut genome)
            .expect("EGT must conserve mass bit-for-bit");

        assert_eq!(transferred, 2, "Only non-redox genes should transfer to nucleus");
        assert_eq!(genome[0].location, GeneLocation::OrganellarMitochondrial);
        assert_eq!(genome[1].location, GeneLocation::OrganellarMitochondrial);
        assert_eq!(genome[2].location, GeneLocation::Nuclear);
        assert_eq!(genome[3].location, GeneLocation::Nuclear);
    }
}
