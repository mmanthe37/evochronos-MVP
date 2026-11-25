"""
NCBI Biological Sequence Adapter for EvoChronos.

Fetches and translates empirical ancient RNA and protein sequences from NCBI,
converting them to exact stoichiometric AtomicComposition vectors across the 7 biogenic
elements [C, H, O, N, P, S, Fe] with zero atomic drift.
"""

from dataclasses import dataclass, field
import hashlib
import json
import os
import re
import urllib.request
import urllib.parse
from typing import Dict, Optional, Tuple, Any

from evochronos.ledger import AtomicComposition

# Amino acid condensed residue compositions (amino acid - H2O in peptide bond)
# Format: (C, H, O, N, P, S, Fe)
AMINO_ACID_RESIDUES: Dict[str, Tuple[int, int, int, int, int, int, int]] = {
    'A': (3, 5, 1, 1, 0, 0, 0),    # Alanine
    'R': (6, 12, 1, 4, 0, 0, 0),   # Arginine
    'N': (4, 6, 2, 2, 0, 0, 0),    # Asparagine
    'D': (4, 5, 3, 1, 0, 0, 0),    # Aspartate
    'C': (3, 5, 1, 1, 0, 1, 0),    # Cysteine (contains S)
    'Q': (5, 8, 2, 2, 0, 0, 0),    # Glutamine
    'E': (5, 7, 3, 1, 0, 0, 0),    # Glutamate
    'G': (2, 3, 1, 1, 0, 0, 0),    # Glycine
    'H': (6, 7, 1, 3, 0, 0, 0),    # Histidine
    'I': (6, 11, 1, 1, 0, 0, 0),   # Isoleucine
    'L': (6, 11, 1, 1, 0, 0, 0),   # Leucine
    'K': (6, 12, 1, 2, 0, 0, 0),   # Lysine
    'M': (5, 9, 1, 1, 0, 1, 0),    # Methionine (contains S)
    'F': (9, 9, 1, 1, 0, 0, 0),    # Phenylalanine
    'P': (5, 7, 1, 1, 0, 0, 0),    # Proline
    'S': (3, 5, 2, 1, 0, 0, 0),    # Serine
    'T': (4, 7, 2, 1, 0, 0, 0),    # Threonine
    'W': (11, 10, 1, 2, 0, 0, 0),  # Tryptophan
    'Y': (9, 9, 2, 1, 0, 0, 0),    # Tyrosine
    'V': (5, 9, 1, 1, 0, 0, 0),    # Valine
}

# RNA mononucleotide condensed residues in phosphodiester polymer:
# Base + ribose + monophosphate - H2O
RNA_RESIDUES: Dict[str, Tuple[int, int, int, int, int, int, int]] = {
    'A': (10, 12, 7, 5, 1, 0, 0),  # AMP residue: C10 H12 N5 O7 P
    'U': (9, 11, 9, 2, 1, 0, 0),   # UMP residue: C9 H11 N2 O9 P
    'G': (10, 12, 8, 5, 1, 0, 0),  # GMP residue: C10 H12 N5 O8 P
    'C': (9, 12, 8, 3, 1, 0, 0),   # CMP residue: C9 H12 N3 O8 P
}

# DNA monodeoxynucleotide condensed residues in phosphodiester polymer:
# Base + deoxyribose + monophosphate - H2O
DNA_RESIDUES: Dict[str, Tuple[int, int, int, int, int, int, int]] = {
    'A': (10, 12, 6, 5, 1, 0, 0),  # dAMP residue: C10 H12 N5 O6 P
    'T': (10, 13, 7, 2, 1, 0, 0),  # dTMP residue: C10 H13 N2 O7 P (Wait: Thymine C5 H6 N2 O2 + dRib C5 H8 O3 + HPO3 -> C10 H13 N2 O7 P)
    'G': (10, 12, 7, 5, 1, 0, 0),  # dGMP residue: C10 H12 N5 O7 P
    'C': (9, 12, 7, 3, 1, 0, 0),   # dCMP residue: C9 H12 N3 O7 P
}

# Metallocluster cofactors
COFACTORS: Dict[str, Tuple[int, int, int, int, int, int, int]] = {
    '2Fe-2S': (0, 0, 0, 0, 0, 2, 2),
    '4Fe-4S': (0, 0, 0, 0, 0, 4, 4),
    'heme_b': (34, 32, 4, 4, 0, 0, 1), # C34 H32 Fe N4 O4
}

# Standard Genetic Code table
GENETIC_CODE: Dict[str, str] = {
    'ATA': 'I', 'ATC': 'I', 'ATT': 'I', 'ATG': 'M',
    'ACA': 'T', 'ACC': 'T', 'ACG': 'T', 'ACT': 'T',
    'AAC': 'N', 'AAT': 'N', 'AAA': 'K', 'AAG': 'K',
    'AGC': 'S', 'AGT': 'S', 'AGA': 'R', 'AGG': 'R',
    'CTA': 'L', 'CTC': 'L', 'CTG': 'L', 'CTT': 'L',
    'CCA': 'P', 'CCC': 'P', 'CCG': 'P', 'CCT': 'P',
    'CAC': 'H', 'CAT': 'H', 'CAA': 'Q', 'CAG': 'Q',
    'CGA': 'R', 'CGC': 'R', 'CGG': 'R', 'CGT': 'R',
    'GTA': 'V', 'GTC': 'V', 'GTG': 'V', 'GTT': 'V',
    'GCA': 'A', 'GCC': 'A', 'GCG': 'A', 'GCT': 'A',
    'GAC': 'D', 'GAT': 'D', 'GAA': 'E', 'GAG': 'E',
    'GGA': 'G', 'GGC': 'G', 'GGG': 'G', 'GGT': 'G',
    'TCA': 'S', 'TCC': 'S', 'TCG': 'S', 'TCT': 'S',
    'TTC': 'F', 'TTT': 'F', 'TTA': 'L', 'TTG': 'L',
    'TAC': 'Y', 'TAT': 'Y', 'TAA': '*', 'TAG': '*',
    'TGC': 'C', 'TGT': 'C', 'TGA': '*', 'TGG': 'W',
}

# Curated reference sequences for prebiotic and ancient regime anchoring
OFFLINE_FIXTURES: Dict[str, Dict[str, Any]] = {
    "NP_FERREDOXIN_4FE4S": {
        "accession": "NP_FERREDOXIN_4FE4S",
        "description": "Ancient clostridial 2x[4Fe-4S] ferredoxin catalytic redox core",
        "seq_type": "protein",
        "sequence": "AYVINDSCIACGACKPECPVNIIQGSIYAIDADSCIDCGSCASVCPVGAPNPED",
        "cofactors": {"4Fe-4S": 2},
    },
    "NR_16S_RRNA_CORE": {
        "accession": "NR_16S_RRNA_CORE",
        "description": "Conserved archaic catalytic decoding center RNA loop (Helices 44-45)",
        "seq_type": "rna",
        "sequence": "AGUCGUAACAAGGUAACCGUAGGAGAACCUGCGGUUGGAUCACCUCCUUA",
        "cofactors": {},
    },
    "NP_ATP_SYNTHASE_C": {
        "accession": "NP_ATP_SYNTHASE_C",
        "description": "Archaic F0 rotor c-subunit proteolipid proton channel",
        "seq_type": "protein",
        "sequence": "MDLIAIAVLGIAAGIGLGIAAGLAVGAGAIGIGILGIAAGVGLAIGVGL",
        "cofactors": {},
    },
    "NP_RUBISCO_ANCIENT": {
        "accession": "NP_RUBISCO_ANCIENT",
        "description": "Deep-branching Archaea/Prokaryote Form III Rubisco large subunit motif",
        "seq_type": "protein",
        "sequence": "MVTLPEYIKGEWYGVDYEVEDGYIAFLTDPEVEKIEEYLRERGVPIVMHD",
        "cofactors": {},
    },
}


@dataclass(frozen=True)
class BiologicalSequenceRecord:
    accession: str
    description: str
    seq_type: str
    sequence: str
    atomic_composition: AtomicComposition
    cofactors: Dict[str, int] = field(default_factory=dict)

    @property
    def length(self) -> int:
        return len(self.sequence)

    @property
    def total_atoms(self) -> int:
        return self.atomic_composition.total_atoms


def sequence_to_atomic_composition(
    sequence: str,
    seq_type: str = "protein",
    cofactors: Optional[Dict[str, int]] = None,
) -> AtomicComposition:
    """
    Computes exact elemental stoichiometry [C, H, O, N, P, S, Fe] for a sequence.

    Includes end-capping water (+H2O: H=2, O=1) for peptide or nucleic acid polymers,
    and coordinates any explicit metallocluster cofactors (e.g. 4Fe-4S).
    """
    cleaned = re.sub(r'[^A-Z]', '', sequence.upper())
    c, h, o, n, p, s, fe = 0, 0, 0, 0, 0, 0, 0

    if seq_type == "protein":
        # Add residue contributions
        for aa in cleaned:
            if aa in AMINO_ACID_RESIDUES:
                rc, rh, ro, rn, rp, rs, rfe = AMINO_ACID_RESIDUES[aa]
                c += rc
                h += rh
                o += ro
                n += rn
                p += rp
                s += rs
                fe += rfe
            elif aa != '*':  # Ignore stop codon if present
                raise ValueError(f"Unknown amino acid symbol '{aa}' in protein sequence.")
        # Terminal cap (+H on N-term, +OH on C-term = +H2O)
        if len(cleaned) > 0:
            h += 2
            o += 1

    elif seq_type == "rna":
        cleaned_rna = cleaned.replace('T', 'U')
        for nuc in cleaned_rna:
            if nuc in RNA_RESIDUES:
                rc, rh, ro, rn, rp, rs, rfe = RNA_RESIDUES[nuc]
                c += rc
                h += rh
                o += ro
                n += rn
                p += rp
                s += rs
                fe += rfe
            else:
                raise ValueError(f"Unknown nucleotide symbol '{nuc}' in RNA sequence.")
        # Terminal caps: 5'-phosphate already in each residue; 3'-OH adds +H +O
        if len(cleaned_rna) > 0:
            h += 1
            o += 1

    elif seq_type == "dna":
        cleaned_dna = cleaned.replace('U', 'T')
        for nuc in cleaned_dna:
            if nuc in DNA_RESIDUES:
                rc, rh, ro, rn, rp, rs, rfe = DNA_RESIDUES[nuc]
                c += rc
                h += rh
                o += ro
                n += rn
                p += rp
                s += rs
                fe += rfe
            else:
                raise ValueError(f"Unknown nucleotide symbol '{nuc}' in DNA sequence.")
        # Terminal 3'-OH adds +H +O
        if len(cleaned_dna) > 0:
            h += 1
            o += 1

    else:
        raise ValueError(f"Unsupported seq_type '{seq_type}'. Choose 'protein', 'rna', or 'dna'.")

    # Add metallocluster / cofactor atoms
    if cofactors:
        for cofactor_name, count in cofactors.items():
            if count <= 0:
                continue
            if cofactor_name in COFACTORS:
                cc, ch, co, cn, cp, cs, cfe = COFACTORS[cofactor_name]
                c += cc * count
                h += ch * count
                o += co * count
                n += cn * count
                p += cp * count
                s += cs * count
                fe += cfe * count
            else:
                raise ValueError(f"Unknown cofactor '{cofactor_name}'. Available: {list(COFACTORS.keys())}")

    return AtomicComposition(
        carbon=c,
        hydrogen=h,
        oxygen=o,
        nitrogen=n,
        phosphorus=p,
        sulfur=s,
        iron=fe,
    )


class NCBISequenceFetcher:
    """
    Adapter for retrieving and translating biological sequences from NCBI E-Utilities,
    backed by local caching and curated ancient fixtures.
    """

    def __init__(self, cache_dir: Optional[str] = None, offline_only: bool = False):
        if cache_dir is None:
            cache_dir = os.path.expanduser("~/.cache/evochronos/ncbi")
        self.cache_dir = cache_dir
        self.offline_only = offline_only
        os.makedirs(self.cache_dir, exist_ok=True)

    def fetch_sequence(
        self,
        accession: str,
        seq_type: str = "protein",
        cofactors: Optional[Dict[str, int]] = None,
    ) -> BiologicalSequenceRecord:
        """
        Retrieves a sequence by accession ID. Checks offline fixtures first,
        then disk cache, and finally queries NCBI E-Utilities.
        """
        acc_upper = accession.upper()
        # 1. Curated Offline Fixtures
        if acc_upper in OFFLINE_FIXTURES:
            fixture = OFFLINE_FIXTURES[acc_upper]
            merged_cofactors = dict(fixture.get("cofactors", {}))
            if cofactors:
                merged_cofactors.update(cofactors)
            atom_comp = sequence_to_atomic_composition(
                fixture["sequence"],
                seq_type=fixture["seq_type"],
                cofactors=merged_cofactors,
            )
            return BiologicalSequenceRecord(
                accession=fixture["accession"],
                description=fixture["description"],
                seq_type=fixture["seq_type"],
                sequence=fixture["sequence"],
                atomic_composition=atom_comp,
                cofactors=merged_cofactors,
            )

        # 2. Local Disk Cache
        cache_key = hashlib.sha256(f"{accession}_{seq_type}".encode('utf-8')).hexdigest()
        cache_path = os.path.join(self.cache_dir, f"{cache_key}.json")
        if os.path.exists(cache_path):
            with open(cache_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            atom_comp = sequence_to_atomic_composition(
                data["sequence"],
                seq_type=data["seq_type"],
                cofactors=cofactors,
            )
            return BiologicalSequenceRecord(
                accession=data["accession"],
                description=data.get("description", ""),
                seq_type=data["seq_type"],
                sequence=data["sequence"],
                atomic_composition=atom_comp,
                cofactors=cofactors or {},
            )

        if self.offline_only:
            raise RuntimeError(
                f"Accession '{accession}' not found in offline fixtures or cache, and offline_only is enabled."
            )

        # 3. Remote NCBI E-Utilities fetch
        db = "protein" if seq_type == "protein" else "nuccore"
        params = urllib.parse.urlencode({
            "db": db,
            "id": accession,
            "rettype": "fasta",
            "retmode": "text",
        })
        url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?{params}"

        try:
            req = urllib.request.Request(url, headers={"User-Agent": "EvoChronos-Simulation/1.0"})
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read().decode('utf-8')
        except Exception as e:
            raise RuntimeError(f"Failed to query NCBI E-Utilities for {accession}: {e}")

        # Parse FASTA
        lines = content.strip().splitlines()
        if not lines or not lines[0].startswith('>'):
            raise ValueError(f"Invalid FASTA response from NCBI for accession {accession}: {content[:100]}")

        description = lines[0][1:].strip()
        sequence = "".join(line.strip() for line in lines[1:])

        # Save to disk cache
        cache_data = {
            "accession": accession,
            "description": description,
            "seq_type": seq_type,
            "sequence": sequence,
        }
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, indent=2)

        atom_comp = sequence_to_atomic_composition(
            sequence,
            seq_type=seq_type,
            cofactors=cofactors,
        )
        return BiologicalSequenceRecord(
            accession=accession,
            description=description,
            seq_type=seq_type,
            sequence=sequence,
            atomic_composition=atom_comp,
            cofactors=cofactors or {},
        )

    def translate_dna(self, dna_sequence: str) -> str:
        """Translates a DNA coding sequence to amino acid sequence using standard genetic code."""
        dna = re.sub(r'[^A-Z]', '', dna_sequence.upper())
        protein = []
        for i in range(0, len(dna) - 2, 3):
            codon = dna[i:i+3]
            amino_acid = GENETIC_CODE.get(codon, 'X')
            if amino_acid == '*':
                break
            protein.append(amino_acid)
        return "".join(protein)
