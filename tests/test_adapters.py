"""
Comprehensive Unit Tests for EvoChronos Biological & Scientific Data Adapters.

Verifies:
1. NCBI Adapter: Sequence-to-stoichiometry calculation, iron-sulfur metalloclusters, and zero atomic drift.
2. Ensembl Adapter: CoRR mitochondrial vs. nuclear partitioning and EGT mass conservation.
3. MSA Adapter: Alignment, Positive Semi-Definite (PSD) mutational covariance matrix, and Lande projection.
4. PyMOL Renderer Adapter: 3D atom coordinate generation, PDB formatting, and elemental conservation.
5. arXiv Literature Adapter: Empirical parameter calibration lookup and provenance citations.
"""

import os
import sys
import unittest
import math

# Ensure evochronos python SDK is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
PYTHON_SDK_DIR = os.path.join(REPO_ROOT, "python")
if PYTHON_SDK_DIR not in sys.path:
    sys.path.insert(0, PYTHON_SDK_DIR)

from evochronos.ledger import AtomicComposition
from evochronos.adapters import (
    NCBISequenceFetcher,
    sequence_to_atomic_composition,
    EnsemblGeneAdapter,
    GeneLocation,
    CoRRStatus,
    MultipleSequenceAlignment,
    PyMOLRenderer,
    ArXivLiteratureAdapter,
    EMPIRICAL_PROVENANCE_CATALOG,
)


class TestEvoChronosAdapters(unittest.TestCase):

    def setUp(self):
        self.ncbi = NCBISequenceFetcher(offline_only=True)
        self.ensembl = EnsemblGeneAdapter(offline_only=True)
        self.msa = MultipleSequenceAlignment(use_clustalo_if_available=False)
        self.pymol = PyMOLRenderer()
        self.arxiv = ArXivLiteratureAdapter(offline_only=True)

    def test_01_ncbi_sequence_stoichiometry_and_iron_sulfur_clusters(self):
        """NCBI adapter computes exact elemental stoichiometry with zero drift."""
        # Test 1: Simple peptide (Gly-Ala-Cys)
        # Gly (C2 H3 N O) + Ala (C3 H5 N O) + Cys (C3 H5 N O S) + H2O (H2 O)
        # Sum = C8 H15 N3 O4 S1, P0, Fe0
        comp = sequence_to_atomic_composition("GAC", seq_type="protein")
        self.assertEqual(comp.carbon, 8)
        self.assertEqual(comp.hydrogen, 15)
        self.assertEqual(comp.oxygen, 4)
        self.assertEqual(comp.nitrogen, 3)
        self.assertEqual(comp.phosphorus, 0)
        self.assertEqual(comp.sulfur, 1)
        self.assertEqual(comp.iron, 0)

        # Test 2: Ancient clostridial ferredoxin with 2x[4Fe-4S] clusters
        record = self.ncbi.fetch_sequence("NP_FERREDOXIN_4FE4S")
        self.assertEqual(record.seq_type, "protein")
        self.assertEqual(record.atomic_composition.iron, 8)  # 2 * 4 Fe = 8
        self.assertGreaterEqual(record.atomic_composition.sulfur, 8)  # At least 8 S from clusters + Cysteines
        self.assertGreater(record.total_atoms, 0)

        # Test 3: RNA stoichiometry (16S rRNA core helix)
        rna_record = self.ncbi.fetch_sequence("NR_16S_RRNA_CORE")
        self.assertEqual(rna_record.seq_type, "rna")
        self.assertEqual(rna_record.atomic_composition.phosphorus, rna_record.length)
        self.assertEqual(rna_record.atomic_composition.iron, 0)

        # Test 4: Cleavage mass conservation: A sequence cleaved in two preserves total atoms identically
        part1 = "AYVINDSCIACGACKP"
        part2 = "ECPVNIIQGSIYAIDADSCIDCGSCASVCPVGAPNPED"
        full = part1 + part2

        comp_full = sequence_to_atomic_composition(full, seq_type="protein")
        comp_part1 = sequence_to_atomic_composition(part1, seq_type="protein")
        comp_part2 = sequence_to_atomic_composition(part2, seq_type="protein")

        # Peptide hydrolysis consumes 1 H2O molecule (H=2, O=1)
        water = AtomicComposition(0, 2, 1, 0, 0, 0, 0)
        hydrolyzed_sum = comp_part1.add(comp_part2)
        reconstituted = comp_full.add(water)

        self.assertEqual(hydrolyzed_sum, reconstituted)
        drift = hydrolyzed_sum.total_atoms - reconstituted.total_atoms
        self.assertEqual(drift, 0, "Hydrolysis reaction must conserve atoms with exactly 0.0 drift.")

    def test_02_ensembl_corr_egt_partitioning_and_conservation(self):
        """Ensembl adapter partitions genomes and proves zero drift in Endosymbiotic Gene Transfer."""
        # Retained core redox gene (MT-CO1)
        mt_co1 = self.ensembl.get_gene("MT-CO1")
        self.assertEqual(mt_co1.location, GeneLocation.MITOCHONDRIAL)
        self.assertEqual(mt_co1.corr_status, CoRRStatus.CORE_REDOX_RETAINED)
        self.assertEqual(mt_co1.protein_composition.iron, 2)  # 2 heme b cofactors

        # Translocated nuclear gene (COX4I1)
        cox4 = self.ensembl.get_gene("COX4I1")
        self.assertEqual(cox4.location, GeneLocation.NUCLEAR)
        self.assertEqual(cox4.corr_status, CoRRStatus.PERIPHERAL_TRANSLOCATED)

        # Partition ancestral gene set
        gene_set = ["MT-CO1", "MT-ATP6", "MT-ND1", "COX4I1", "ATP5F1A", "SDHA"]
        ancestral_genes = [self.ensembl.get_gene(g) for g in gene_set]

        retained, translocated, ret_dna, trans_dna = self.ensembl.partition_corr_genome(gene_set)
        self.assertEqual(len(retained), 3)
        self.assertEqual(len(translocated), 3)

        # Verify EGT conservation: Ancestral == Retained + Translocated
        is_conserved, drift, msg = self.ensembl.verify_egt_conservation(
            ancestral_genes, retained, translocated
        )
        self.assertTrue(is_conserved)
        self.assertEqual(drift, 0)
        self.assertIn("Drift = 0 atoms", msg)

    def test_03_msa_alignment_and_positive_semidefinite_g_matrix(self):
        """Multiple sequence alignment computes symmetric, Positive Semi-Definite (PSD) M-matrix."""
        homologs = {
            "Species_A": "MDLIAIAVLGIAAGIGLGIAAGLAVGAGA",
            "Species_B": "MDLIAVAVLGIAAGIGLGIAAGLAVGAGA",
            "Species_C": "MDLIAIAVLGVAAGIGLGIAAGLAVGAGA",
            "Species_D": "MDLIAIAVLGIAAGIGLGVAAGLAVGAGA",
        }

        alignment = self.msa.align(homologs)
        self.assertEqual(len(alignment.aligned_sequences), 4)
        self.assertEqual(alignment.alignment_length, 29)
        self.assertGreater(alignment.conservation_scores[0], 0.9)  # Initial Met conserved

        # Compute empirical mutation covariance matrix M
        m_matrix, traits = self.msa.compute_mutational_covariance_matrix(alignment)
        p = len(traits)
        self.assertEqual(len(m_matrix), p)
        self.assertEqual(len(m_matrix[0]), p)

        # Check symmetry: M[i][j] == M[j][i]
        for i in range(p):
            for j in range(p):
                self.assertAlmostEqual(m_matrix[i][j], m_matrix[j][i], places=7)

        # Check Positive Semi-Definiteness: all eigenvalues >= 0
        from evochronos.adapters.msa import _jacobi_eigenvalues_symmetric
        eigenvalues, _ = _jacobi_eigenvalues_symmetric(m_matrix)
        for ev in eigenvalues:
            self.assertGreaterEqual(ev, -1e-8, f"Eigenvalues must be non-negative: {eigenvalues}")

        # Lande equation projection: Delta z = M * beta
        selection_gradients = [0.1, -0.05, 0.2, 0.0, 1.5]
        delta_z = self.msa.project_lande_step(m_matrix, selection_gradients)
        self.assertEqual(len(delta_z), len(traits))
        self.assertTrue(all(not math.isnan(x) for x in delta_z))

    def test_04_pymol_renderer_3d_coordinates_and_elemental_audit(self):
        """PyMOL adapter generates 3D PDB structures whose atom counts match exact composition."""
        structure = self.pymol.build_4fe4s_ferredoxin_core()
        self.assertGreater(structure.total_atoms, 0)

        # 4 Fe and at least 8 S (4 inorganic cubane + 4 Cys thiolates)
        atom_comp = structure.compute_atomic_composition()
        self.assertEqual(atom_comp.iron, 4)
        self.assertEqual(atom_comp.sulfur, 8)
        self.assertEqual(atom_comp.carbon, 12)  # 4 * 3 (Cys CB, CA, C)
        self.assertEqual(atom_comp.nitrogen, 4)  # 4 * 1 (Cys N)
        self.assertEqual(atom_comp.oxygen, 4)    # 4 * 1 (Cys O)

        # Export PDB and verify formatting
        pdb_path = self.pymol.export_pdb(structure)
        self.assertTrue(os.path.exists(pdb_path))

        with open(pdb_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        atom_lines = [l for l in lines if l.startswith("ATOM  ") or l.startswith("HETATM")]
        self.assertEqual(len(atom_lines), structure.total_atoms)

        # Render SVG projection
        svg_path = self.pymol.render_structure_svg(structure)
        self.assertTrue(os.path.exists(svg_path))
        with open(svg_path, 'r', encoding='utf-8') as f:
            svg_content = f.read()
        self.assertIn("<svg", svg_content)
        self.assertIn("FE", svg_content)

    def test_05_arxiv_literature_grounding_and_provenance(self):
        """arXiv adapter resolves parameter provenance and cites peer-reviewed foundational papers."""
        # Chemiosmotic PMF parameter provenance
        pmf, citation = self.arxiv.get_calibrated_parameter("proton_motive_force_mv")
        self.assertEqual(pmf, -180.0)
        self.assertIn("Lane, N.", citation.authors[0])
        self.assertEqual(citation.regime, 1)

        # CoRR retained gene count parameter provenance
        genes, cor_cit = self.arxiv.get_calibrated_parameter("core_respiratory_retained_genes")
        self.assertEqual(genes, 13)
        self.assertEqual(cor_cit.regime, 4)

        # Search catalog
        results = self.arxiv.search_arxiv("chemiosmosis")
        self.assertGreater(len(results), 0)
        self.assertIn("origin of membrane bioenergetics", results[0].title.lower())


if __name__ == "__main__":
    unittest.main()
