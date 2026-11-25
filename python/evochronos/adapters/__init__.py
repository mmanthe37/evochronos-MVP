"""
Scientific Data & Empirical Tool Adapters for EvoChronos.

Exposes adapters for:
- NCBI Sequence Fetching (ncbi-sequence-fetch) & Stoichiometric Composition
- Ensembl Gene & CoRR Orthology Mapping (ensembl-database)
- Multiple Sequence Alignment & Lande Mutation Covariance (protein-sequence-msa)
- Headless 3D Molecular Structure Rendering & PyMOL Sessions (pymol)
- arXiv Literature Grounding & Parameter Calibration (literature-search-arxiv)
"""

from .ncbi import (
    NCBISequenceFetcher,
    BiologicalSequenceRecord,
    sequence_to_atomic_composition,
    AMINO_ACID_RESIDUES,
    RNA_RESIDUES,
    DNA_RESIDUES,
    COFACTORS,
    GENETIC_CODE,
)

from .ensembl import (
    EnsemblGeneAdapter,
    EnsemblGeneAnnotation,
    GeneLocation,
    CoRRStatus,
    CORR_GENE_CATALOG,
)

from .msa import (
    MultipleSequenceAlignment,
    AlignmentResult,
)

from .pymol_renderer import (
    PyMOLRenderer,
    MolecularStructure,
    AtomCoordinate,
)

from .arxiv import (
    ArXivLiteratureAdapter,
    LiteratureCitation,
    EMPIRICAL_PROVENANCE_CATALOG,
)

__all__ = [
    # NCBI
    "NCBISequenceFetcher",
    "BiologicalSequenceRecord",
    "sequence_to_atomic_composition",
    "AMINO_ACID_RESIDUES",
    "RNA_RESIDUES",
    "DNA_RESIDUES",
    "COFACTORS",
    "GENETIC_CODE",
    # Ensembl
    "EnsemblGeneAdapter",
    "EnsemblGeneAnnotation",
    "GeneLocation",
    "CoRRStatus",
    "CORR_GENE_CATALOG",
    # MSA
    "MultipleSequenceAlignment",
    "AlignmentResult",
    # PyMOL
    "PyMOLRenderer",
    "MolecularStructure",
    "AtomCoordinate",
    # arXiv
    "ArXivLiteratureAdapter",
    "LiteratureCitation",
    "EMPIRICAL_PROVENANCE_CATALOG",
]
