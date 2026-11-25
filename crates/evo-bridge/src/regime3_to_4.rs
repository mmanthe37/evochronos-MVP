//! Bridge Operator B_III->IV: Promotes syntrophic prokaryotic pairs to Eukaryotic Chimeras.

use crate::syntrophy::SyntrophyDetector;
use evo_core::{assert_exact_stoichiometric_balance, ElementalComposition, EvoCoreError, NUM_ELEMENTS};
use evo_regime_eukaryote::{
    BioenergeticEgtEngine, CompartmentalizedMatrixMerger, EukaryoticChimeraGuild,
    GeneLocus, HillGrnNetwork, IntermembraneTransportReaction,
};
use evo_regime_prokaryote::ProkaryoticGuild;

pub struct EndosymbiosisBridgeOperator;

impl EndosymbiosisBridgeOperator {
    /// Merges a syntrophic host archaeon and endosymbiont bacterium into a unified Eukaryotic Chimera Guild.
    /// Strictly guarantees exact elemental mass conservation across the endosymbiotic merger.
    #[allow(clippy::too_many_arguments)]
    pub fn promote_syntrophic_pair(
        chimera_id: u32,
        chimera_name: impl Into<String>,
        host: &mut ProkaryoticGuild,
        symbiont: &mut ProkaryoticGuild,
        shared_metabolite: &str,
        delta_g_syntrophy_kj: f64,
        transport_reactions: Vec<IntermembraneTransportReaction>,
        mut symbiont_genome: Vec<GeneLocus>,
        grn: HillGrnNetwork,
    ) -> Result<EukaryoticChimeraGuild, EvoCoreError> {
        // 1. Verify thermodynamic syntrophic pull gate
        SyntrophyDetector::evaluate_syntrophic_coupling(
            host,
            symbiont,
            shared_metabolite,
            delta_g_syntrophy_kj,
        )
        .map_err(|e| EvoCoreError::InvalidParameter(e.to_string()))?;

        // 2. Measure initial total atoms across both progenitor populations
        let host_initial_atoms = host.total_population_atoms();
        let symbiont_initial_atoms = symbiont.total_population_atoms();
        let mut total_progenitor_atoms = [0u128; NUM_ELEMENTS];
        for e in 0..NUM_ELEMENTS {
            total_progenitor_atoms[e] = host_initial_atoms[e] + symbiont_initial_atoms[e];
        }

        // 3. Block-angular chimeric stoichiometry merger
        let (chimeric_matrix, _rows, total_cols) = CompartmentalizedMatrixMerger::merge(
            &host.stoichiometric_matrix,
            &symbiont.stoichiometric_matrix,
            &transport_reactions,
        );

        // Merge flux bounds and objectives
        let mut chimeric_bounds = host.flux_bounds.clone();
        chimeric_bounds.extend(symbiont.flux_bounds.clone());
        for tr in &transport_reactions {
            chimeric_bounds.push(evo_regime_prokaryote::FluxBounds::new(tr.lower_bound, tr.upper_bound));
        }

        let mut chimeric_obj = host.objective_coefficients.clone();
        chimeric_obj.extend(symbiont.objective_coefficients.clone());
        chimeric_obj.resize(total_cols, 0.0);

        // 4. CoRR-constrained Endosymbiotic Gene Transfer (EGT)
        let bio_engine = BioenergeticEgtEngine::default();
        let (_transferred_count, _dna_atoms) = bio_engine.execute_corr_gene_transfer(&mut symbiont_genome)?;

        // 5. Conserved Atomic Condensation into founding eukaryotic population
        // Foundational census count based on host cells (each host assimilates endosymbionts)
        let founding_census = host.cell_census_population.max(1);
        let mut per_cell_atoms = [0u64; NUM_ELEMENTS];
        for e in 0..NUM_ELEMENTS {
            per_cell_atoms[e] = (total_progenitor_atoms[e] / (founding_census as u128)) as u64;
        }

        let chimera_biomass_per_cell = ElementalComposition {
            atoms: per_cell_atoms,
        };

        let chimera = EukaryoticChimeraGuild {
            id: chimera_id,
            name: chimera_name.into(),
            host_progenitor_id: host.id,
            symbiont_progenitor_id: symbiont.id,
            chimeric_stoichiometry: chimeric_matrix,
            base_flux_bounds: chimeric_bounds,
            objective_coefficients: chimeric_obj,
            transport_reactions,
            genome: symbiont_genome,
            grn,
            biomass_composition_per_cell: chimera_biomass_per_cell,
            cell_census_population: founding_census,
            mitochondria_per_cell: 10,
            growth_rate_per_hour: 0.0,
            atp_flux_mol_cell_sec: 1.0e-14, // Eukaryotic energetic expansion
        };

        // Assert exact mass conservation
        let chimera_atoms = chimera.total_population_atoms();
        assert_exact_stoichiometric_balance(&total_progenitor_atoms, &chimera_atoms)?;

        // Zero out progenitor populations after merger
        host.cell_census_population = 0;
        symbiont.cell_census_population = 0;

        Ok(chimera)
    }
}
