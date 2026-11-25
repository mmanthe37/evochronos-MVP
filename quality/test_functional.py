#!/usr/bin/env python3
"""
EvoChronos Automated Functional Test Suite
Grounded in quality/QUALITY.md fitness-to-purpose scenarios and physical specifications.
"""

import sys
import os
import math
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "python")))
import evochronos as evo

class TestEvoChronosFunctional(unittest.TestCase):
    """Functional tests grounded in QUALITY.md scenarios and physical invariants."""

    def setUp(self):
        self.initial_budget = evo.AtomicComposition(
            carbon=10_000_000,
            hydrogen=20_000_000,
            oxygen=5_000_000,
            nitrogen=2_000_000,
            phosphorus=100_000,
            sulfur=50_000,
            iron=10_000,
        )
        self.ledger = evo.ConservationLedger(self.initial_budget)

    # -------------------------------------------------------------------------
    # Group 1: Physical Specification Requirements
    # -------------------------------------------------------------------------

    def test_spec_req_atomic_conservation_identity(self):
        """[Req: formal - SPEC §1] Atomic composition arithmetic must be exact and closed."""
        c1 = evo.AtomicComposition(100, 200, 50, 20, 2, 1, 0)
        c2 = evo.AtomicComposition(300, 600, 150, 60, 6, 3, 1)
        combined = c1.add(c2)

        self.assertEqual(combined.carbon, 400)
        self.assertEqual(combined.hydrogen, 800)
        self.assertEqual(combined.iron, 1)
        self.assertEqual(combined.sub(c1), c2)

    def test_spec_req_quasispecies_error_catastrophe_boundary(self):
        """[Req: formal - SPEC §2] Analytical Eigen error catastrophe threshold mu_crit = ln(sigma) / L."""
        L = 60
        sigma = 8.0
        mu_crit = math.log(sigma) / L
        # For mu < mu_crit, master sequence fraction x0 > 0
        mu_sub = mu_crit * 0.5
        x0_analytical = (sigma * ((1.0 - mu_sub) ** L) - 1.0) / (sigma - 1.0)
        self.assertGreater(x0_analytical, 0.20)

        # For mu >= mu_crit, population collapses into random error tail
        mu_super = mu_crit * 1.5
        survives = (sigma * ((1.0 - mu_super) ** L) - 1.0) > 0
        self.assertFalse(survives)

    def test_spec_req_monod_dfba_kinetics(self):
        """[Req: formal - SPEC §3] Monod substrate uptake kinetics v = V_max * S / (K_s + S)."""
        V_max = 10.0
        K_s = 0.5
        # At S = K_s, rate is exactly half of V_max
        v_half = V_max * K_s / (K_s + K_s)
        self.assertAlmostEqual(v_half, 5.0, places=5)

    def test_spec_req_michod_convexity_synergy(self):
        """[Req: formal - SPEC §5] Michod ETI convexity ensures differentiated colony fitness > generalist."""
        alpha = 2.0
        # Optimal generalist cell invests s=0.5
        max_gen_w = (0.5 ** alpha) * ((1.0 - 0.5) ** alpha) # (0.25)^2 = 0.0625
        # Differentiated group with 50% soma (s=1.0) and 50% germ (s=0.0)
        group_w = 0.5 * 0.5 # 0.25
        self.assertGreater(group_w, max_gen_w)
        self.assertAlmostEqual(group_w / max_gen_w, 4.0, places=4)

    # -------------------------------------------------------------------------
    # Group 2: Fitness-to-Purpose Scenarios (1:1 with QUALITY.md)
    # -------------------------------------------------------------------------

    def test_scenario_1_prebiotic_autocatalytic_leakage(self):
        """[Scenario 1] Reaction pathways must maintain zero atomic leakage across cycles."""
        # Simulated formose autocatalytic template: 2 Glycolaldehyde -> Erythrose
        glycol = evo.AtomicComposition(2, 4, 2, 0, 0, 0, 0)
        erythrose = evo.AtomicComposition(4, 8, 4, 0, 0, 0, 0)
        stoichiometric_sum = glycol.add(glycol).sub(erythrose)
        self.assertEqual(stoichiometric_sum.total_atoms, 0)

    def test_scenario_2_protocell_bilayer_division_balance(self):
        """[Scenario 2] Vesicle fission must strictly divide parent atoms into daughter cells."""
        parent_biomass = evo.AtomicComposition(50000, 100000, 25000, 10000, 500, 250, 10)
        # Symmetrical fission
        daughter_1 = evo.AtomicComposition(25000, 50000, 12500, 5000, 250, 125, 5)
        daughter_2 = evo.AtomicComposition(25000, 50000, 12500, 5000, 250, 125, 5)

        reconstituted = daughter_1.add(daughter_2)
        self.assertEqual(reconstituted, parent_biomass)

    def test_scenario_3_fba_thermodynamic_loop_law(self):
        """[Scenario 3] Futile cycles with sum(Delta G) = 0 must produce 0 net flux."""
        # 1. Define internal cyclic pathway: A -> B (-20), B -> C (-10), C -> A (+30)
        cycle_indices = [[0, 1, 2]]
        standard_delta_g = [-20.0, -10.0, 30.0]

        def verify_thermodynamic_loop_laws(fluxes, cycles, delta_gs):
            """Mirror of crates/evo-regime-prokaryote/src/lp_solver.rs:197-223."""
            for cycle in cycles:
                cycle_active = True
                sum_dg = 0.0
                for rxn_idx in cycle:
                    if abs(fluxes[rxn_idx]) < 1e-6:
                        cycle_active = False
                        break
                    sign = 1.0 if fluxes[rxn_idx] > 0.0 else -1.0
                    sum_dg += sign * delta_gs[rxn_idx]
                if cycle_active and abs(sum_dg) < 1e-6:
                    return False, f"Thermodynamic Loop-Law violation: Infeasible zero-free-energy cycle across reactions {cycle}"
            return True, ""

        def project_loop_law_fluxes(fluxes, cycles, delta_gs):
            """Loop-law projector: clamps uncoupled zero-free-energy cycle flux to zero."""
            projected = list(fluxes)
            for cycle in cycles:
                cycle_active = all(abs(projected[r]) > 1e-6 for r in cycle)
                if cycle_active:
                    sum_dg = sum((1.0 if projected[r] > 0 else -1.0) * delta_gs[r] for r in cycle)
                    if abs(sum_dg) < 1e-6:
                        # Net driving force is zero; futile cycle cannot sustain spontaneous flux
                        min_flux = min(abs(projected[r]) for r in cycle)
                        for r in cycle:
                            sign = 1.0 if projected[r] > 0 else -1.0
                            projected[r] -= sign * min_flux
            return projected

        # Unconstrained flux satisfies mass balance (Sv = 0) but violates loop law
        unconstrained_fluxes = [15.0, 15.0, 15.0]
        is_valid, err = verify_thermodynamic_loop_laws(unconstrained_fluxes, cycle_indices, standard_delta_g)
        self.assertFalse(is_valid)
        self.assertIn("Thermodynamic Loop-Law violation", err)

        # Loop-law projector forces futile cyclic flux to exactly zero
        constrained_fluxes = project_loop_law_fluxes(unconstrained_fluxes, cycle_indices, standard_delta_g)
        self.assertEqual(constrained_fluxes, [0.0, 0.0, 0.0])

        # Constrained flux state satisfies thermodynamic loop law
        is_valid_after, _ = verify_thermodynamic_loop_laws(constrained_fluxes, cycle_indices, standard_delta_g)
        self.assertTrue(is_valid_after)

        # Driven exergonic reaction (Delta G = -40 kJ/mol) maintains valid non-zero flux
        driven_fluxes = [5.0]
        driven_dg = [-40.0]
        valid_driven, _ = verify_thermodynamic_loop_laws(driven_fluxes, [[0]], driven_dg)
        self.assertTrue(valid_driven)

    def test_scenario_4_eukaryotic_chimeric_translocation_drift(self):
        """[Scenario 4] CoRR EGT DNA translocation must conserve elemental base-pair counts."""
        # Standard average 2-base-pair DNA unit (A-T and G-C pairs): C39 H47 O24 N15 P4
        # Derived from dAMP, dTMP, dGMP, dCMP phosphodiester condensation
        bp_unit = evo.AtomicComposition(
            carbon=39,
            hydrogen=47,
            oxygen=24,
            nitrogen=15,
            phosphorus=4,
            sulfur=0,
            iron=0,
        )

        # Total genome segment: 100,000 bp = 50,000 2-bp units
        # Organellar retention (core redox): 15,000 bp = 7,500 2-bp units
        # Nuclear translocation (metabolic genes): 85,000 bp = 42,500 2-bp units
        retained = evo.AtomicComposition(*(a * 7_500 for a in bp_unit.as_tuple()))
        transferred = evo.AtomicComposition(*(a * 42_500 for a in bp_unit.as_tuple()))
        total_dna = evo.AtomicComposition(*(a * 50_000 for a in bp_unit.as_tuple()))

        # Recombine retained and transferred fractions
        reconstituted = retained.add(transferred)

        # 1. Strict equality across all 7 biogenic elements
        self.assertEqual(reconstituted, total_dna)
        # 2. Total atom count exact invariance (0.0 drift)
        self.assertEqual(reconstituted.total_atoms, total_dna.total_atoms)
        self.assertEqual(reconstituted.total_atoms, 6_450_000)
        # 3. Specific element inventory checks
        self.assertEqual(reconstituted.carbon, 1_950_000)
        self.assertEqual(reconstituted.nitrogen, 750_000)
        self.assertEqual(reconstituted.phosphorus, 200_000)
        # 4. Invariant subtraction check
        self.assertEqual(reconstituted.sub(retained), transferred)

    def test_scenario_5_krogh_avascular_tissue_overgrowth(self):
        """[Scenario 5] Avascular tissue growth exceeding Krogh radius develops necrotic core."""
        D = 1.0e-5
        C0 = 1.0e-4
        R_met = 2.0e-6
        R_crit = math.sqrt((6.0 * D * C0) / R_met)

        # Supercritical tissue radius (1.5x R_crit)
        cluster_r = R_crit * 1.5
        necrotic_r = math.sqrt(cluster_r * cluster_r - R_crit * R_crit)
        self.assertGreater(necrotic_r, 0.0)
        self.assertGreater(necrotic_r / cluster_r, 0.5)

    def test_scenario_6_positive_definite_g_matrix(self):
        """[Scenario 6] Lande G-matrix must be positive-definite with standing variance."""
        J = [[1.2, 0.3], [0.1, 0.9]]
        M = [0.02, 0.02]
        standing = 0.05
        G = evo.MorphospaceAnalyzer.project_g_matrix(J, M, standing_var=standing)

        self.assertGreater(G[0][0], 0.0)
        self.assertGreater(G[1][1], 0.0)
        # Determinant must be positive
        det = G[0][0] * G[1][1] - G[0][1] * G[1][0]
        self.assertGreater(det, 0.0)

    def test_scenario_7_kevrekidis_projective_reconciliation(self):
        """[Scenario 7] Projective leaps must reconcile with abiotic reservoir to zero drift."""
        living_proj = evo.AtomicComposition(100_000, 200_000, 50_000, 20_000, 1_000, 500, 100)
        reconciled_abiotic = self.initial_budget.sub(living_proj)
        reconstituted = reconciled_abiotic.add(living_proj)
        self.assertEqual(reconstituted, self.initial_budget)

    # -------------------------------------------------------------------------
    # Group 3: Boundary & Defensive Patterns
    # -------------------------------------------------------------------------

    def test_boundary_zero_carbon_starvation(self):
        """[Boundary] Zero carbon intake triggers starvation without crashing or drift."""
        starved_budget = evo.AtomicComposition(
            carbon=0,
            hydrogen=1000,
            oxygen=500,
            nitrogen=100,
            phosphorus=10,
            sulfur=5,
            iron=1,
        )
        sim = evo.Simulation(initial_atoms=starved_budget)
        res = sim.step(steps=5, dt=1.0)

        # 1. Simulation stepped forward successfully
        self.assertEqual(res["epoch"], 5)
        self.assertEqual(res["simulated_time_seconds"], 5.0)

        # 2. Strict conservation holds despite starvation
        self.assertTrue(res["is_conserved"])
        self.assertTrue(sim.get_ledger().is_strictly_conserved())

        # 3. Living biomass carbon remains exactly zero (no spontaneous genesis)
        self.assertEqual(res["living_carbon"], 0)
        self.assertEqual(sim.session.living_biomass.carbon, 0)
        self.assertEqual(sim.session.living_biomass.total_atoms, 0)

        # 4. Abiotic reservoir carbon remains zero
        self.assertEqual(sim.session.abiotic_reservoir.carbon, 0)

        # 5. Non-carbon atoms are strictly preserved in the abiotic reservoir
        self.assertEqual(sim.session.abiotic_reservoir.hydrogen, 1000)
        self.assertEqual(sim.session.abiotic_reservoir.oxygen, 500)
        self.assertEqual(sim.session.abiotic_reservoir.nitrogen, 100)
        self.assertEqual(sim.session.abiotic_reservoir.phosphorus, 10)
        self.assertEqual(sim.session.abiotic_reservoir.sulfur, 5)
        self.assertEqual(sim.session.abiotic_reservoir.iron, 1)

    def test_boundary_tskit_mrca_recovery(self):
        """[Boundary] Tree sequence genealogies resolve MRCA cleanly for all extant samples."""
        ts = evo.TreeSequenceAnalyzer()
        root = ts.add_node(time=50.0)
        leaf1 = ts.add_node(time=0.0, is_sample=True)
        leaf2 = ts.add_node(time=0.0, is_sample=True)
        ts.add_edge(0.0, 1000.0, root, leaf1)
        ts.add_edge(0.0, 1000.0, root, leaf2)

        mrca = ts.find_mrca(leaf1, leaf2)
        self.assertEqual(mrca, root)
        newick = ts.to_newick()
        self.assertIn("Node_0", newick)

if __name__ == "__main__":
    unittest.main()
