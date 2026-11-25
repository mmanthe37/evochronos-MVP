"""
Morphospace, Quantitative Genetics & Lande G-Matrix Analytics.
"""

import math
from typing import List, Tuple, Callable

class LandeTrajectory:
    def __init__(self, trait_names: List[str], initial_mean: List[float], optimum: List[float]):
        self.trait_names = trait_names
        self.k = len(trait_names)
        self.current_mean = list(initial_mean)
        self.optimum = list(optimum)
        self.history: List[List[float]] = [list(initial_mean)]

    def step(self, G: List[List[float]], selection_intensity: float = 0.1) -> List[float]:
        # beta = -Omega^{-1} * (z - theta)
        beta = [-selection_intensity * (self.current_mean[i] - self.optimum[i]) for i in range(self.k)]
        
        # Delta z = G * beta
        dz = [0.0] * self.k
        for i in range(self.k):
            dz[i] = sum(G[i][j] * beta[j] for j in range(self.k))
            self.current_mean[i] += dz[i]

        self.history.append(list(self.current_mean))
        return dz

class MorphospaceAnalyzer:
    @staticmethod
    def compute_developmental_jacobian(
        genotype: List[float],
        developmental_fn: Callable[[List[float]], List[float]],
        h: float = 1e-5,
    ) -> List[List[float]]:
        m = len(genotype)
        z0 = developmental_fn(genotype)
        k = len(z0)
        jac = [[0.0 for _ in range(m)] for _ in range(k)]

        x_perturbed = list(genotype)
        for j in range(m):
            orig = x_perturbed[j]
            x_perturbed[j] = orig + h
            z_plus = developmental_fn(x_perturbed)

            x_perturbed[j] = orig - h
            z_minus = developmental_fn(x_perturbed)

            for i in range(k):
                jac[i][j] = (z_plus[i] - z_minus[i]) / (2.0 * h)

            x_perturbed[j] = orig

        return jac

    @staticmethod
    def project_g_matrix(
        jac: List[List[float]],
        mutational_variance: List[float],
        standing_var: float = 0.05,
    ) -> List[List[float]]:
        k = len(jac)
        m = len(mutational_variance)
        G = [[0.0 for _ in range(k)] for _ in range(k)]

        for i in range(k):
            for j in range(k):
                s = sum(jac[i][r] * mutational_variance[r] * jac[j][r] for r in range(m))
                if i == j:
                    s += standing_var
                G[i][j] = s

        return G
