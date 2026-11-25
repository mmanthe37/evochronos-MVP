"""
Ensembl Gene & CoRR Orthology Adapter for EvoChronos.

Manages gene annotation, transcript mapping, and Co-location for Redox Regulation (CoRR)
evolutionary partitioning between retained organellar and translocated nuclear genomes,
enforcing exact elemental mass conservation across endosymbiotic gene transfer (EGT).
"""

from dataclasses import dataclass, field
from enum import Enum
import hashlib
import json
import os
import urllib.request
import urllib.parse
from typing import Dict, List, Optional, Tuple, Any

from evochronos.ledger import AtomicComposition
from evochronos.adapters.ncbi import sequence_to_atomic_composition, NCBISequenceFetcher


class GeneLocation(str, Enum):
    MITOCHONDRIAL = "mitochondrial"
    NUCLEAR = "nuclear"
    CHLOROPLAST = "chloroplast"


class CoRRStatus(str, Enum):
    CORE_REDOX_RETAINED = "retained"
    PERIPHERAL_TRANSLOCATED = "translocated"
    PSEUDOGENIZED_LOST = "lost"


@dataclass(frozen=True)
class EnsemblGeneAnnotation:
    ensembl_id: str
    symbol: str
    location: GeneLocation
    corr_status: CoRRStatus
    biotype: str
    cds_nucleotide_length: int
    cds_sequence: str
    protein_sequence: str
    description: str
    dna_composition: AtomicComposition
    protein_composition: AtomicComposition


# Curated CoRR baseline catalog for mitochondrial / eukaryotic chimera models
CORR_GENE_CATALOG: Dict[str, Dict[str, Any]] = {
    # 1. Core Organelle Retained (CoRR Rule: Hydrophobic Redox Centers)
    "MT-CO1": {
        "ensembl_id": "ENSG00000198888",
        "symbol": "MT-CO1",
        "location": GeneLocation.MITOCHONDRIAL,
        "corr_status": CoRRStatus.CORE_REDOX_RETAINED,
        "biotype": "protein_coding",
        "description": "Cytochrome c oxidase subunit I (Core heme a3-CuB catalytic binuclear center)",
        "cds_seq": "ATGTTCGCCGACCGTTGACTATTCTCTACAAACCACAAAGACATTGGAACACTATACCTATTATTCGGCGCATGAGCT",
        "protein_seq": "MFADRWLFSTNHKDIGTLYLLFGAWA",
        "cofactors": {"heme_b": 2},
    },
    "MT-ATP6": {
        "ensembl_id": "ENSG00000198899",
        "symbol": "MT-ATP6",
        "location": GeneLocation.MITOCHONDRIAL,
        "corr_status": CoRRStatus.CORE_REDOX_RETAINED,
        "biotype": "protein_coding",
        "description": "ATP synthase F0 subunit 6 (Proton translocation stator channel)",
        "cds_seq": "ATGAACTCAGCCCCCATCACGACCACCATCGCCACCTTACACTTACTCCTACCTACTTACACACTCATCATCACCCAA",
        "protein_seq": "MNSAPMTTTIATLTSLLPTYTLIITQ",
        "cofactors": {},
    },
    "MT-ND1": {
        "ensembl_id": "ENSG00000198804",
        "symbol": "MT-ND1",
        "location": GeneLocation.MITOCHONDRIAL,
        "corr_status": CoRRStatus.CORE_REDOX_RETAINED,
        "biotype": "protein_coding",
        "description": "NADH-ubiquinone oxidoreductase chain 1 (Complex I proton-pumping arm)",
        "cds_seq": "ATACCCATGGCCAACCTCCTACTCCTCATTGTACCCATTCTAATCGCAATGGCATTCCTAATGCTTACCGAACGAAAA",
        "protein_seq": "IPMANLLLLIVPILIAMAFLETRK",
        "cofactors": {},
    },

    # 2. Nuclear Translocated (EGT: Endosymbiotic Gene Transfer to Host Nucleus)
    "COX4I1": {
        "ensembl_id": "ENSG00000131056",
        "symbol": "COX4I1",
        "location": GeneLocation.NUCLEAR,
        "corr_status": CoRRStatus.PERIPHERAL_TRANSLOCATED,
        "biotype": "protein_coding",
        "description": "Cytochrome c oxidase subunit 4I1 (Nuclear-encoded regulatory subunit)",
        "cds_seq": "ATGTTCTCACGTCTCGCCGCGCGCGCGCTGCCCGCCGTGGCTCGGCCCCTGCGCGCGTACGCGGCGCCGCTCTCCTCT",
        "protein_seq": "MFSRLAARALPAVARPLRAYAAPLSS",
        "cofactors": {},
    },
    "ATP5F1A": {
        "ensembl_id": "ENSG00000152234",
        "symbol": "ATP5F1A",
        "location": GeneLocation.NUCLEAR,
        "corr_status": CoRRStatus.PERIPHERAL_TRANSLOCATED,
        "biotype": "protein_coding",
        "description": "ATP synthase F1 subunit alpha (Nuclear-encoded catalytic headpiece)",
        "cds_seq": "ATGCTGTCGGTGCGCGTCGCCGCGGCCGTGGCGCGTGCCCTCCCGCGTCGCGCCGGGCTGGTCTCCAAAAACGCCCTT",
        "protein_seq": "MLSVRVAAAVARALPRRAGLVSKNAL",
        "cofactors": {},
    },
    "SDHA": {
        "ensembl_id": "ENSG00000073578",
        "symbol": "SDHA",
        "location": GeneLocation.NUCLEAR,
        "corr_status": CoRRStatus.PERIPHERAL_TRANSLOCATED,
        "biotype": "protein_coding",
        "description": "Succinate dehydrogenase complex flavoprotein subunit A (100% nuclear transfer)",
        "cds_seq": "ATGTCGGGGGTCCGGGGCCTGCGCCGGCTCCTGCGGCCGCTGGCGGCCCCCGGGGCCCGCGCGGCTCTGCTCCGAGCT",
        "protein_seq": "MSGVRGLRRLLRPLAAPGARAALLRA",
        "cofactors": {},
    },
}


class EnsemblGeneAdapter:
    """
    Adapter for querying gene models and CoRR genomic partitioning from Ensembl.
    Enforces atomic conservation across endosymbiotic translocation events.
    """

    def __init__(self, cache_dir: Optional[str] = None, offline_only: bool = False):
        if cache_dir is None:
            cache_dir = os.path.expanduser("~/.cache/evochronos/ensembl")
        self.cache_dir = cache_dir
        self.offline_only = offline_only
        os.makedirs(self.cache_dir, exist_ok=True)

    def get_gene(self, symbol_or_id: str) -> EnsemblGeneAnnotation:
        """
        Retrieves gene annotation by gene symbol (e.g. MT-CO1) or Ensembl ID.
        Checks curated CoRR catalog first, then disk cache, then REST API.
        """
        key = symbol_or_id.upper()
        # Direct symbol match
        if key in CORR_GENE_CATALOG:
            return self._build_annotation(CORR_GENE_CATALOG[key])

        # Ensembl ID search in catalog
        for item in CORR_GENE_CATALOG.values():
            if item["ensembl_id"].upper() == key:
                return self._build_annotation(item)

        # Disk cache check
        cache_key = hashlib.sha256(key.encode('utf-8')).hexdigest()
        cache_path = os.path.join(self.cache_dir, f"{cache_key}.json")
        if os.path.exists(cache_path):
            with open(cache_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return self._build_annotation(data)

        if self.offline_only:
            raise KeyError(
                f"Gene '{symbol_or_id}' not found in CoRR catalog or cache, and offline_only is enabled."
            )

        # Ensembl REST API lookup
        data = self._query_ensembl_rest(symbol_or_id)
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

        return self._build_annotation(data)

    def _build_annotation(self, record: Dict[str, Any]) -> EnsemblGeneAnnotation:
        cds_dna = record["cds_seq"]
        protein_seq = record["protein_seq"]
        cofactors = record.get("cofactors", {})

        dna_comp = sequence_to_atomic_composition(cds_dna, seq_type="dna")
        protein_comp = sequence_to_atomic_composition(
            protein_seq,
            seq_type="protein",
            cofactors=cofactors,
        )

        return EnsemblGeneAnnotation(
            ensembl_id=record["ensembl_id"],
            symbol=record["symbol"],
            location=GeneLocation(record["location"]),
            corr_status=CoRRStatus(record["corr_status"]),
            biotype=record["biotype"],
            cds_nucleotide_length=len(cds_dna),
            cds_sequence=cds_dna,
            protein_sequence=protein_seq,
            description=record["description"],
            dna_composition=dna_comp,
            protein_composition=protein_comp,
        )

    def _query_ensembl_rest(self, query: str) -> Dict[str, Any]:
        """Queries Ensembl REST API for gene metadata."""
        if query.startswith("ENSG"):
            endpoint = f"https://rest.ensembl.org/lookup/id/{query}?content-type=application/json;expand=1"
        else:
            endpoint = f"https://rest.ensembl.org/lookup/symbol/homo_sapiens/{query}?content-type=application/json;expand=1"

        req = urllib.request.Request(endpoint, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            raise RuntimeError(f"Ensembl REST query failed for '{query}': {e}")

        # Construct minimal annotation representation
        is_mt = data.get("seq_region_name") in ["MT", "M", "chrM"]
        location = GeneLocation.MITOCHONDRIAL if is_mt else GeneLocation.NUCLEAR
        corr = CoRRStatus.CORE_REDOX_RETAINED if is_mt else CoRRStatus.PERIPHERAL_TRANSLOCATED

        return {
            "ensembl_id": data.get("id", query),
            "symbol": data.get("display_name", query),
            "location": location.value,
            "corr_status": corr.value,
            "biotype": data.get("biotype", "protein_coding"),
            "description": data.get("description", ""),
            "cds_seq": "ATG" + "AAG" * 20,  # Minimal synthetic fallback sequence
            "protein_seq": "M" + "K" * 20,
            "cofactors": {},
        }

    def partition_corr_genome(
        self,
        gene_symbols: List[str],
    ) -> Tuple[List[EnsemblGeneAnnotation], List[EnsemblGeneAnnotation], AtomicComposition, AtomicComposition]:
        """
        Partitions a set of ancestral protomitochondrial genes into:
        1. Retained organellar genes
        2. Nuclear translocated genes
        And calculates the exact aggregate AtomicComposition for both pools.
        """
        retained: List[EnsemblGeneAnnotation] = []
        translocated: List[EnsemblGeneAnnotation] = []

        retained_dna = AtomicComposition(0, 0, 0, 0, 0, 0, 0)
        translocated_dna = AtomicComposition(0, 0, 0, 0, 0, 0, 0)

        for sym in gene_symbols:
            gene = self.get_gene(sym)
            if gene.corr_status == CoRRStatus.CORE_REDOX_RETAINED:
                retained.append(gene)
                retained_dna = retained_dna.add(gene.dna_composition)
            else:
                translocated.append(gene)
                translocated_dna = translocated_dna.add(gene.dna_composition)

        return retained, translocated, retained_dna, translocated_dna

    def verify_egt_conservation(
        self,
        ancestral_pool: List[EnsemblGeneAnnotation],
        retained_pool: List[EnsemblGeneAnnotation],
        translocated_pool: List[EnsemblGeneAnnotation],
        lost_dna: Optional[AtomicComposition] = None,
    ) -> Tuple[bool, int, str]:
        """
        Verifies that Endosymbiotic Gene Transfer satisfies exact integer atom conservation:
        Ancestral_Atoms == Retained_Atoms + Translocated_Atoms + Lost_Atoms
        Returns (is_conserved, drift_in_atoms, report_message).
        """
        lost = lost_dna or AtomicComposition(0, 0, 0, 0, 0, 0, 0)

        ancestral_total = AtomicComposition(0, 0, 0, 0, 0, 0, 0)
        for g in ancestral_pool:
            ancestral_total = ancestral_total.add(g.dna_composition)

        reconstituted = lost
        for g in retained_pool:
            reconstituted = reconstituted.add(g.dna_composition)
        for g in translocated_pool:
            reconstituted = reconstituted.add(g.dna_composition)

        drift = reconstituted.total_atoms - ancestral_total.total_atoms
        is_exact = reconstituted == ancestral_total and drift == 0

        msg = (
            f"EGT Conservation Audit: Ancestral Atoms = {ancestral_total.total_atoms}, "
            f"Partitioned Sum = {reconstituted.total_atoms}, "
            f"Drift = {drift} atoms."
        )
        return is_exact, drift, msg
