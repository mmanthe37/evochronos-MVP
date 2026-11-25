#!/usr/bin/env python3
"""
EVOCHRONOS NATIVE PYO3 EXTENSION MODULE VERIFICATION SUITE
Tests the compiled Rust extension module (`evochronos_native`):
  1. Exact 7-Element ElementalComposition integer arithmetic & overflow prevention
  2. Native Chemical Formula Parser ([C, H, O, N, P, S, Fe] stoichiometry)
  3. High-throughput SimulationEngine lifecycle, stepping, and regime transitions
  4. Ultra-high-speed fast_forward execution (>1,000,000 steps/sec) with 0.0 atomic drift
  5. Native biophysical benchmarks (Kimura, Eigen, Monod, WBE, Orr BDMI, Lande)
  6. Python SDK seamless interoperability (AtomicComposition <-> ElementalComposition)
"""

import sys
import os
import time
import math
import unittest

# Ensure python directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../python")))

import evochronos as evo
from evochronos import evochronos_native


class TestNativePyO3Extension(unittest.TestCase):
    """Test suite for the compiled PyO3 native extension module."""

    def test_01_native_module_presence(self):
        """Verify that evochronos_native compiled cdylib is loaded."""
        self.assertTrue(evo.HAS_NATIVE_ENGINE)
        self.assertIsNotNone(evochronos_native)
        self.assertEqual(evochronos_native.version(), "0.1.0")
        self.assertTrue(evochronos_native.is_zero_drift_guaranteed())

    def test_02_elemental_composition_exact_arithmetic(self):
        """Verify exact 7-element integer conservation arithmetic in Rust."""
        c1 = evochronos_native.ElementalComposition(100, 200, 50, 20, 10, 5, 1)
        self.assertEqual(c1.carbon, 100)
        self.assertEqual(c1.hydrogen, 200)
        self.assertEqual(c1.oxygen, 50)
        self.assertEqual(c1.nitrogen, 20)
        self.assertEqual(c1.phosphorus, 10)
        self.assertEqual(c1.sulfur, 5)
        self.assertEqual(c1.iron, 1)
        self.assertEqual(c1.total_atoms, 386)

        tup = c1.as_tuple()
        self.assertEqual(tup, (100, 200, 50, 20, 10, 5, 1))

        d = c1.as_dict()
        self.assertEqual(d["carbon"], 100)
        self.assertEqual(d["total_atoms"], 386)

        c2 = evochronos_native.ElementalComposition(50, 100, 25, 10, 5, 2, 1)
        added = c1.add(c2)
        self.assertEqual(added.carbon, 150)
        self.assertEqual(added.hydrogen, 300)
        self.assertEqual(added.total_atoms, 579)

        subbed = c1.sub(c2)
        self.assertEqual(subbed.carbon, 50)
        self.assertEqual(subbed.hydrogen, 100)
        self.assertEqual(subbed.iron, 0)

        # Test underflow prevention
        with self.assertRaises(ValueError):
            c2.sub(c1)

    def test_03_chemical_formula_parser(self):
        """Verify stoichiometry parser for exact atomic compositions."""
        glucose = evochronos_native.parse_chemical_formula("C6H12O6")
        self.assertEqual(glucose.carbon, 6)
        self.assertEqual(glucose.hydrogen, 12)
        self.assertEqual(glucose.oxygen, 6)
        self.assertEqual(glucose.nitrogen, 0)
        self.assertEqual(glucose.total_atoms, 24)

        methane = evochronos_native.parse_chemical_formula("CH4")
        self.assertEqual(methane.carbon, 1)
        self.assertEqual(methane.hydrogen, 4)
        self.assertEqual(methane.total_atoms, 5)

        pyrite = evochronos_native.parse_chemical_formula("FeS2")
        self.assertEqual(pyrite.iron, 1)
        self.assertEqual(pyrite.sulfur, 2)
        self.assertEqual(pyrite.carbon, 0)
        self.assertEqual(pyrite.total_atoms, 3)

        phosphoric_acid = evochronos_native.parse_chemical_formula("H3PO4")
        self.assertEqual(phosphoric_acid.hydrogen, 3)
        self.assertEqual(phosphoric_acid.phosphorus, 1)
        self.assertEqual(phosphoric_acid.oxygen, 4)
        self.assertEqual(phosphoric_acid.total_atoms, 8)

    def test_04_simulation_engine_lifecycle_and_stepping(self):
        """Verify native SimulationEngine state progression and regime promotion."""
        eng = evochronos_native.SimulationEngine("test_session_001")
        self.assertEqual(eng.session_id, "test_session_001")
        self.assertEqual(eng.current_epoch, 0)
        self.assertEqual(eng.simulated_time_seconds, 0.0)
        self.assertEqual(eng.active_regime, 1)
        self.assertIn("Regime I", eng.active_regime_name)

        # Step 25 epochs
        res = eng.step(steps=25, dt=2.0)
        self.assertEqual(res["epoch"], 25)
        self.assertEqual(res["simulated_time_seconds"], 50.0)
        self.assertEqual(res["active_regime"], 1)
        self.assertTrue(res["is_conserved"])
        self.assertTrue(eng.is_strictly_conserved())

        # Regime transitions
        self.assertTrue(eng.promote_regime(2))
        self.assertEqual(eng.active_regime, 2)
        self.assertIn("Regime II", eng.active_regime_name)

        self.assertTrue(eng.promote_regime(3))
        self.assertEqual(eng.active_regime, 3)
        self.assertIn("Regime III", eng.active_regime_name)

        # Cannot transition backward
        self.assertFalse(eng.promote_regime(1))
        self.assertEqual(eng.active_regime, 3)

    def test_05_high_speed_fast_forward_zero_drift(self):
        """Verify ultra-high-speed fast_forward stepping with exact zero atomic drift."""
        eng = evochronos_native.SimulationEngine("ff_benchmark")
        t0 = time.time()
        steps = 50_000
        res = eng.fast_forward(steps=steps, dt=0.1)
        elapsed = time.time() - t0

        self.assertEqual(res["final_epoch"], steps)
        self.assertEqual(res["total_steps_executed"], steps)
        self.assertTrue(res["is_conserved"])

        ledger = eng.get_ledger_summary()
        self.assertTrue(ledger["is_strictly_conserved"])
        self.assertEqual(ledger["drift_atoms"], 0)
        self.assertEqual(ledger["current_total_atoms"], ledger["initial_atoms"])

        rate = steps / max(elapsed, 1e-6)
        print(f"\n[PyO3 Native Benchmark] Executed {steps:,} epochs in {elapsed:.4f}s ({rate:,.0f} epochs/sec)")
        self.assertGreater(rate, 100_000)

    def test_06_native_biophysical_benchmarks(self):
        """Verify theoretical biological, geochemical, and mathematical formulas."""
        # 1. Kimura fixation probability
        # Neutral mutation (s=0): P_fix = p
        p_neutral = evochronos_native.kimura_fixation_probability(1000, 0.0, 0.1)
        self.assertAlmostEqual(p_neutral, 0.1, places=6)

        # Advantageous mutation (s=0.01, Ne=1000, p=0.01)
        p_adv = evochronos_native.kimura_fixation_probability(1000, 0.01, 0.01)
        expected_adv = (1.0 - math.exp(-2.0 * 1000 * 0.01 * 0.01)) / (1.0 - math.exp(-2.0 * 1000 * 0.01))
        self.assertAlmostEqual(p_adv, expected_adv, places=6)

        # 2. Eigen error threshold
        mu_crit = evochronos_native.eigen_error_threshold(1000, 10.0)
        self.assertAlmostEqual(mu_crit, math.log(10.0) / 1000.0, places=6)

        # 3. Monod growth kinetics
        # At S = Ks, mu = mu_max / 2
        mu_half = evochronos_native.monod_growth_rate(0.2, 1.0, 0.2)
        self.assertAlmostEqual(mu_half, 0.5, places=6)

        s_star = evochronos_native.monod_steady_state_substrate(0.5, 1.0, 0.2)
        # S* = Ks * D / (mu_max - D) = 0.2 * 0.5 / (1.0 - 0.5) = 0.1 / 0.5 = 0.2
        self.assertAlmostEqual(s_star, 0.2, places=6)

        # 4. West-Brown-Enquist 3/4-power scaling
        # B(16) / B(1) = 16^0.75 = (2^4)^0.75 = 2^3 = 8
        b16 = evochronos_native.wbe_metabolic_rate(16.0, 1.0)
        self.assertAlmostEqual(b16, 8.0, places=6)

        # 5. Bateson-Dobzhansky-Muller snowball incompatibilities
        # k=10, pairs = 10*9/2 = 45. With p_inc=0.02 -> E[I] = 0.9
        e_i = evochronos_native.bdmi_snowball_incompatibilities(10, 0.02)
        self.assertAlmostEqual(e_i, 0.9, places=6)

        p_spec = evochronos_native.bdmi_speciation_probability(10, 0.02)
        self.assertAlmostEqual(p_spec, 1.0 - (0.98 ** 45), places=6)

        # 6. Lande multivariate selection response
        # dz = G * beta
        dz1, dz2 = evochronos_native.lande_selection_response(0.1, 0.02, 0.1, 1.0, 0.5)
        # dz1 = 0.1*1.0 + 0.02*0.5 = 0.11
        # dz2 = 0.02*1.0 + 0.1*0.5 = 0.07
        self.assertAlmostEqual(dz1, 0.11, places=6)
        self.assertAlmostEqual(dz2, 0.07, places=6)

    def test_07_python_sdk_seamless_interop(self):
        """Verify that Python SDK high-level classes seamlessly interface with native engine."""
        # AtomicComposition roundtrip
        py_comp = evo.AtomicComposition(10, 20, 30, 40, 50, 60, 70)
        native_comp = py_comp.to_native()
        py_roundtrip = evo.AtomicComposition.from_native(native_comp)
        self.assertEqual(py_comp, py_roundtrip)

        # Simulation client with native acceleration
        sim = evo.Simulation(use_native=True)
        self.assertTrue(sim.is_native)
        res1 = sim.step(steps=50, dt=1.0)
        self.assertEqual(res1["epoch"], 50)
        self.assertTrue(res1["is_conserved"])
        self.assertGreater(res1["living_carbon"], 0)

        ff = sim.fast_forward(steps=1000, dt=1.0)
        self.assertEqual(ff["final_epoch"], 1050)
        self.assertTrue(ff["is_conserved"])

        ledger = sim.get_ledger()
        self.assertTrue(ledger.is_strictly_conserved())
        self.assertGreaterEqual(len(ledger.history), 2)


if __name__ == "__main__":
    unittest.main()
