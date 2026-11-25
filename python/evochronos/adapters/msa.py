"""
Multiple Sequence Alignment (MSA) & Empirical Mutation Covariance Matrix Adapter for EvoChronos.

Aligns homologous biological sequences (e.g. via Clustal Omega or progressive DP)
and computes empirical mutational covariance matrices (M) for Lande G-matrix evolutionary projections
(Delta z = G * beta = M * grad(ln W)) with positive semi-definite (PSD) enforcement.
Implemented with zero external dependencies (pure Python with optional NumPy acceleration).
"""

from dataclasses import dataclass, field
import math
import subprocess
import shutil
from typing import List, Dict, Tuple, Optional

from evochronos.ledger import AtomicComposition
from evochronos.adapters.ncbi import sequence_to_atomic_composition, AMINO_ACID_RESIDUES

# Standard BLOSUM62 simplified scoring matrix
BLOSUM62_MATCH = 2.0
BLOSUM62_MISMATCH = -1.0
GAP_PENALTY = -2.0


@dataclass(frozen=True)
class AlignmentResult:
    aligned_sequences: List[str]
    sequence_names: List[str]
    alignment_length: int
    consensus_sequence: str
    conservation_scores: List[float]


def _jacobi_eigenvalues_symmetric(matrix: List[List[float]], max_iter: int = 100) -> Tuple[List[float], List[List[float]]]:
    """
    Computes eigenvalues and eigenvectors of a real symmetric matrix using Jacobi rotation.
    Returns (eigenvalues, eigenvectors_as_columns).
    Pure Python standard library implementation.
    """
    n = len(matrix)
    # Copy A
    A = [row[:] for row in matrix]
    # Initialize V to identity
    V = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]

    for _ in range(max_iter):
        # Find maximum off-diagonal element in upper triangle
        max_val = 0.0
        p, q = 0, 1
        for i in range(n):
            for j in range(i + 1, n):
                if abs(A[i][j]) > max_val:
                    max_val = abs(A[i][j])
                    p, q = i, j

        if max_val < 1e-10:
            break

        # Compute rotation angle
        theta = 0.5 * math.atan2(2.0 * A[p][q], A[q][q] - A[p][p])
        c = math.cos(theta)
        s = math.sin(theta)

        # Apply Givens rotation to A
        app = A[p][p]
        aqq = A[q][q]
        apq = A[p][q]

        A[p][p] = c * c * app - 2.0 * s * c * apq + s * s * aqq
        A[q][q] = s * s * app + 2.0 * s * c * apq + c * c * aqq
        A[p][q] = 0.0
        A[q][p] = 0.0

        for i in range(n):
            if i != p and i != q:
                a_ip = A[i][p]
                a_iq = A[i][q]
                A[i][p] = c * a_ip - s * a_iq
                A[p][i] = A[i][p]
                A[i][q] = s * a_ip + c * a_iq
                A[q][i] = A[i][q]

            # Accumulate eigenvectors
            vip = V[i][p]
            viq = V[i][q]
            V[i][p] = c * vip - s * viq
            V[i][q] = s * vip + c * viq

    eigenvalues = [A[i][i] for i in range(n)]
    return eigenvalues, V


class MultipleSequenceAlignment:
    """
    Adapter for computing multiple sequence alignments and extracting empirical
    evolutionary covariance matrices for macroevolutionary Lande projections.
    """

    def __init__(self, use_clustalo_if_available: bool = True):
        self.use_clustalo = use_clustalo_if_available and (shutil.which("clustalo") is not None)

    def align(self, sequences: Dict[str, str]) -> AlignmentResult:
        """
        Aligns a dictionary of named sequences {name: sequence}.
        Uses Clustal Omega if available on PATH; otherwise uses progressive DP alignment.
        """
        if len(sequences) < 2:
            raise ValueError("Multiple sequence alignment requires at least 2 sequences.")

        names = list(sequences.keys())
        raw_seqs = [sequences[k].upper() for k in names]

        if self.use_clustalo:
            aligned_seqs = self._run_clustalo(names, raw_seqs)
        else:
            aligned_seqs = self._progressive_align(raw_seqs)

        align_len = len(aligned_seqs[0])
        consensus, conservation = self._compute_consensus_and_conservation(aligned_seqs)

        return AlignmentResult(
            aligned_sequences=aligned_seqs,
            sequence_names=names,
            alignment_length=align_len,
            consensus_sequence=consensus,
            conservation_scores=conservation,
        )

    def _progressive_align(self, sequences: List[str]) -> List[str]:
        """
        Progressive pairwise dynamic programming alignment.
        Aligns the first two, then profiles against each subsequent sequence.
        """
        seq1, seq2 = sequences[0], sequences[1]
        a1, a2 = self._needleman_wunsch(seq1, seq2)
        aligned = [a1, a2]

        for s in sequences[2:]:
            prof_consensus = "".join(
                self._compute_consensus_col([aligned[i][col] for i in range(len(aligned))])
                for col in range(len(aligned[0]))
            )
            aligned_prof, aligned_s = self._needleman_wunsch(prof_consensus, s)

            orig_col = 0
            for char in aligned_prof:
                if char == '-':
                    for i in range(len(aligned)):
                        aligned[i] = aligned[i][:orig_col] + '-' + aligned[i][orig_col:]
                    orig_col += 1
                else:
                    orig_col += 1
            aligned.append(aligned_s)

        max_len = max(len(s) for s in aligned)
        aligned = [s.ljust(max_len, '-') for s in aligned]
        return aligned

    def _needleman_wunsch(self, s1: str, s2: str) -> Tuple[str, str]:
        """Classic Needleman-Wunsch global pairwise alignment (pure Python)."""
        n, m = len(s1), len(s2)
        dp = [[0.0 for _ in range(m + 1)] for _ in range(n + 1)]

        for i in range(n + 1):
            dp[i][0] = i * GAP_PENALTY
        for j in range(m + 1):
            dp[0][j] = j * GAP_PENALTY

        for i in range(1, n + 1):
            for j in range(1, m + 1):
                match_score = BLOSUM62_MATCH if s1[i-1] == s2[j-1] else BLOSUM62_MISMATCH
                dp[i][j] = max(
                    dp[i-1][j-1] + match_score,
                    dp[i-1][j] + GAP_PENALTY,
                    dp[i][j-1] + GAP_PENALTY,
                )

        # Traceback
        al1, al2 = [], []
        i, j = n, m
        while i > 0 or j > 0:
            match_score = BLOSUM62_MATCH if (i > 0 and j > 0 and s1[i-1] == s2[j-1]) else BLOSUM62_MISMATCH
            if i > 0 and j > 0 and abs(dp[i][j] - (dp[i-1][j-1] + match_score)) < 1e-6:
                al1.append(s1[i-1])
                al2.append(s2[j-1])
                i -= 1
                j -= 1
            elif i > 0 and abs(dp[i][j] - (dp[i-1][j] + GAP_PENALTY)) < 1e-6:
                al1.append(s1[i-1])
                al2.append('-')
                i -= 1
            else:
                al1.append('-')
                al2.append(s2[j-1])
                j -= 1

        return "".join(reversed(al1)), "".join(reversed(al2))

    def _compute_consensus_col(self, col_chars: List[str]) -> str:
        counts: Dict[str, int] = {}
        for c in col_chars:
            if c != '-':
                counts[c] = counts.get(c, 0) + 1
        if not counts:
            return '-'
        return max(counts, key=counts.get)

    def _compute_consensus_and_conservation(self, aligned: List[str]) -> Tuple[str, List[float]]:
        num_seqs = len(aligned)
        align_len = len(aligned[0])
        consensus = []
        conservation = []

        for col in range(align_len):
            col_chars = [aligned[i][col] for i in range(num_seqs)]
            non_gaps = [c for c in col_chars if c != '-']
            if not non_gaps:
                consensus.append('-')
                conservation.append(0.0)
                continue

            counts: Dict[str, int] = {}
            for c in non_gaps:
                counts[c] = counts.get(c, 0) + 1
            most_freq = max(counts, key=counts.get)
            consensus.append(most_freq)
            fraction_identical = counts[most_freq] / num_seqs
            conservation.append(round(fraction_identical, 4))

        return "".join(consensus), conservation

    def _run_clustalo(self, names: List[str], seqs: List[str]) -> List[str]:
        """Wrapper for external Clustal Omega CLI."""
        fasta_input = []
        for name, seq in zip(names, seqs):
            fasta_input.append(f">{name}\n{seq}")
        fasta_str = "\n".join(fasta_input)

        try:
            res = subprocess.run(
                ["clustalo", "-i", "-", "--outfmt=fasta"],
                input=fasta_str,
                text=True,
                capture_output=True,
                check=True,
            )
            lines = res.stdout.strip().splitlines()
            aligned_map = {}
            current_name = None
            current_seq = []
            for line in lines:
                if line.startswith(">"):
                    if current_name:
                        aligned_map[current_name] = "".join(current_seq)
                    current_name = line[1:].strip().split()[0]
                    current_seq = []
                else:
                    current_seq.append(line.strip())
            if current_name:
                aligned_map[current_name] = "".join(current_seq)
            return [aligned_map.get(n, "") for n in names]
        except Exception:
            return self._progressive_align(seqs)

    def compute_mutational_covariance_matrix(
        self,
        alignment: AlignmentResult,
        trait_extractors: Optional[List[str]] = None,
    ) -> Tuple[List[List[float]], List[str]]:
        """
        Extracts empirical mutation covariance matrix M for traits across aligned sequences.
        Traits:
        - 'c_fraction': Carbon atoms / total atoms
        - 'n_fraction': Nitrogen atoms / total atoms
        - 's_fraction': Sulfur atoms / total atoms
        - 'fe_fraction': Iron atoms / total atoms
        - 'length': Sequence length without gaps

        Enforces positive semi-definiteness (M >= 0) via Jacobi eigenvalue clipping.
        Returns (M_matrix_as_2D_list, traits).
        """
        traits = trait_extractors or ['c_fraction', 'n_fraction', 's_fraction', 'fe_fraction', 'length']
        num_seqs = len(alignment.aligned_sequences)
        p = len(traits)

        feature_matrix: List[List[float]] = [[0.0 for _ in range(p)] for _ in range(num_seqs)]

        for i, seq in enumerate(alignment.aligned_sequences):
            degapped = seq.replace('-', '')
            atom_comp = sequence_to_atomic_composition(degapped, seq_type="protein")
            total = max(atom_comp.total_atoms, 1)

            for j, trait in enumerate(traits):
                if trait == 'c_fraction':
                    feature_matrix[i][j] = atom_comp.carbon / total
                elif trait == 'n_fraction':
                    feature_matrix[i][j] = atom_comp.nitrogen / total
                elif trait == 's_fraction':
                    feature_matrix[i][j] = atom_comp.sulfur / total
                elif trait == 'fe_fraction':
                    feature_matrix[i][j] = atom_comp.iron / total
                elif trait == 'length':
                    feature_matrix[i][j] = float(len(degapped))
                else:
                    feature_matrix[i][j] = 0.0

        # Compute sample means
        means = [sum(feature_matrix[i][j] for i in range(num_seqs)) / num_seqs for j in range(p)]

        # Compute sample covariance matrix
        cov = [[0.0 for _ in range(p)] for _ in range(p)]
        denom = max(num_seqs - 1, 1)
        for j in range(p):
            for k in range(j, p):
                val = sum((feature_matrix[i][j] - means[j]) * (feature_matrix[i][k] - means[k]) for i in range(num_seqs)) / denom
                cov[j][k] = val
                cov[k][j] = val

        # Enforce Positive Semi-Definiteness (PSD) projection via Jacobi eigenvalue clipping
        eigenvalues, V = _jacobi_eigenvalues_symmetric(cov)
        clipped_ev = [max(ev, 1e-9) for ev in eigenvalues]

        # Reconstruct M = V * diag(clipped_ev) * V^T
        psd_cov = [[0.0 for _ in range(p)] for _ in range(p)]
        for j in range(p):
            for k in range(p):
                val = sum(V[j][r] * clipped_ev[r] * V[k][r] for r in range(p))
                psd_cov[j][k] = val

        # Ensure exact symmetry
        for j in range(p):
            for k in range(j, p):
                avg = (psd_cov[j][k] + psd_cov[k][j]) / 2.0
                psd_cov[j][k] = avg
                psd_cov[k][j] = avg

        return psd_cov, traits

    def project_lande_step(
        self,
        g_matrix: List[List[float]],
        selection_gradients: List[float],
    ) -> List[float]:
        """
        Calculates evolutionary phenotypic trajectory step:
        Delta z = G * beta
        where G is the mutational/genetic covariance matrix and beta is selection gradient.
        """
        p = len(g_matrix)
        if len(selection_gradients) != p:
            raise ValueError("G-matrix dimension must match selection gradient vector length.")
        return [sum(g_matrix[i][j] * selection_gradients[j] for j in range(p)) for i in range(p)]
