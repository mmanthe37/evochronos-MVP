"""
Comprehensive Phase 6 Unit Tests for EvoChronos.

Verifies:
1. SBML Level 3 & BiGG Metabolic Model Importer:
   - Chemical formula parser to exact 7-element stoichiometry
   - Canonical Archean chemoautotrophic core model internal reaction conservation
   - Stoichiometric matrix construction S
   - JSON BiGG model deserialization
2. Classical Evolutionary & Biophysical Benchmarks:
   - Hardy-Weinberg binomial invariance
   - Kimura stochastic diffusion fixation probability
   - Monod chemostat demographic steady-state
   - Eigen quasispecies error catastrophe threshold
   - West-Brown-Enquist (WBE) quarter-power allometric scaling
3. Autonomous In-Simulation Research Agent:
   - Experimental research plan execution
   - Parameter sweep and hypothesis testing
   - Invariant mass conservation across all epochs
   - Automated scientific synthesis reporting
4. Model Context Protocol (MCP) Server:
   - Tool definitions and inputSchema verification
   - Tool dispatching for all 7 registered simulation capabilities
   - JSON-RPC 2.0 protocol handling
"""

import os
import sys
import json
import unittest

# Ensure evochronos python SDK is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
PYTHON_SDK_DIR = os.path.join(REPO_ROOT, "python")
MCP_SERVER_DIR = os.path.join(REPO_ROOT, "mcp-server")
for p in [PYTHON_SDK_DIR, MCP_SERVER_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from evochronos.ledger import AtomicComposition
from evochronos.importers import (
    parse_chemical_formula,
    get_canonical_archean_core_model,
    load_bigg_model_from_json,
    SbmlMetabolicModel,
)
from evochronos.benchmarks import (
    HardyWeinbergBenchmark,
    KimuraDiffusionBenchmark,
    MonodChemostatBenchmark,
    EigenErrorThresholdBenchmark,
    WestBrownEnquistBenchmark,
    run_all_evolutionary_benchmarks,
)
from evochronos.agents import (
    AutonomousSimulationAgent,
    AgentResearchPlan,
    run_autonomous_archean_sweep,
)
from evochronos_mcp import EvoChronosMCPServer


class TestPhase6SBMLImporter(unittest.TestCase):
    """Tests for SBML/BiGG metabolic network import and mass balancing."""

    def test_01_parse_chemical_formulas(self):
        """Validates chemical formula parsing to exact 7-element AtomicComposition."""
        # Glucose: C6 H12 O6
        glucose = parse_chemical_formula("C6H12O6")
        self.assertEqual(glucose.carbon, 6)
        self.assertEqual(glucose.hydrogen, 12)
        self.assertEqual(glucose.oxygen, 6)
        self.assertEqual(glucose.nitrogen, 0)
        self.assertEqual(glucose.phosphorus, 0)
        self.assertEqual(glucose.sulfur, 0)
        self.assertEqual(glucose.iron, 0)

        # ATP: C10 H16 N5 O13 P3
        atp = parse_chemical_formula("C10H16N5O13P3")
        self.assertEqual(atp.carbon, 10)
        self.assertEqual(atp.hydrogen, 16)
        self.assertEqual(atp.oxygen, 13)
        self.assertEqual(atp.nitrogen, 5)
        self.assertEqual(atp.phosphorus, 3)

        # Fe4S4 cluster
        fe4s4 = parse_chemical_formula("Fe4S4")
        self.assertEqual(fe4s4.iron, 4)
        self.assertEqual(fe4s4.sulfur, 4)
        self.assertEqual(fe4s4.carbon, 0)

        # Empty formula
        empty = parse_chemical_formula("")
        self.assertEqual(empty.total_atoms, 0)

    def test_02_canonical_archean_core_model(self):
        """Verifies canonical Archean core metabolic network and mass balance."""
        model = get_canonical_archean_core_model()
        self.assertEqual(model.model_id, "archean_methanogenesis_core")
        self.assertGreaterEqual(model.num_metabolites, 10)
        self.assertGreaterEqual(model.num_reactions, 6)

        # Check stoichiometric matrix dimensions
        S = model.build_stoichiometric_matrix()
        self.assertEqual(len(S), model.num_metabolites)
        self.assertEqual(len(S[0]), model.num_reactions)

        # Validate that all internal reactions strictly conserve atoms
        validation = model.validate_all_internal_reactions()
        self.assertTrue(validation["all_balanced"], f"Unbalanced reactions: {validation['violations']}")
        self.assertEqual(validation["unbalanced_reactions"], 0)
        self.assertGreaterEqual(validation["balanced_reactions"], 3)

    def test_03_load_bigg_model_json(self):
        """Verifies parsing of BiGG-compatible JSON metabolic model."""
        sample_json = json.dumps({
            "id": "e_coli_core_test",
            "name": "Escherichia coli core test model",
            "metabolites": [
                {"id": "glc__D_c", "name": "D-Glucose", "compartment": "c", "formula": "C6H12O6", "charge": 0},
                {"id": "pyr_c", "name": "Pyruvate", "compartment": "c", "formula": "C3H3O3", "charge": -1},
                {"id": "h_c", "name": "H+", "compartment": "c", "formula": "H", "charge": 1},
            ],
            "reactions": [
                {
                    "id": "GLYCOLYSIS_SPLIT",
                    "name": "Glucose to 2 Pyruvate + 6 H",
                    "metabolites": {"glc__D_c": -1.0, "pyr_c": 2.0, "h_c": 6.0},
                    "lower_bound": 0.0,
                    "upper_bound": 1000.0,
                    "objective_coefficient": 1.0,
                },
                {
                    "id": "EX_glc__D",
                    "name": "D-Glucose exchange",
                    "metabolites": {"glc__D_c": -1.0},
                    "lower_bound": -10.0,
                    "upper_bound": 1000.0,
                    "objective_coefficient": 0.0,
                },
            ],
        })

        model = load_bigg_model_from_json(sample_json)
        self.assertEqual(model.model_id, "e_coli_core_test")
        self.assertEqual(len(model.metabolites), 3)
        self.assertEqual(len(model.reactions), 2)

        validation = model.validate_all_internal_reactions()
        self.assertTrue(validation["all_balanced"])


class TestPhase6EvolutionaryBenchmarks(unittest.TestCase):
    """Tests for biophysical and evolutionary benchmarks."""

    def test_01_hardy_weinberg_equilibrium(self):
        """Verifies genotype invariance under neutral binomial reproduction."""
        res = HardyWeinbergBenchmark.evaluate(initial_p=0.7, generations=30)
        self.assertTrue(res.passed)
        self.assertAlmostEqual(res.relative_error, 0.0, places=6)

    def test_02_kimura_diffusion_fixation(self):
        """Verifies Kimura 1962 fixation probability formula."""
        res = KimuraDiffusionBenchmark.evaluate(Ne=1000, s=0.01)
        self.assertTrue(res.passed)
        self.assertAlmostEqual(res.relative_error, 0.0, places=6)
        self.assertGreater(res.empirical_value, 0.01)

    def test_03_monod_chemostat_steady_state(self):
        """Verifies Monod 1949 continuous culture substrate and biomass equilibria."""
        res = MonodChemostatBenchmark.evaluate(D=0.2, S_in=10.0, mu_max=1.0, Ks=0.5, Y=0.5)
        self.assertTrue(res.passed)
        self.assertAlmostEqual(res.relative_error, 0.0, places=6)

    def test_04_eigen_error_threshold(self):
        """Verifies Eigen 1971 quasispecies error catastrophe critical limit."""
        res = EigenErrorThresholdBenchmark.evaluate(L=100, sigma=10.0)
        self.assertTrue(res.passed)
        self.assertAlmostEqual(res.relative_error, 0.0, places=6)

    def test_05_west_brown_enquist_allometry(self):
        """Verifies 3/4 quarter-power metabolic scaling across body mass."""
        res = WestBrownEnquistBenchmark.evaluate(B0=1.5)
        self.assertTrue(res.passed)
        self.assertAlmostEqual(res.empirical_value, 0.75, places=6)

    def test_06_run_all_benchmarks(self):
        """Verifies batch execution of all evolutionary benchmarks."""
        results = run_all_evolutionary_benchmarks()
        self.assertEqual(len(results), 5)
        for r in results:
            self.assertTrue(r.passed, f"Benchmark failed: {r.benchmark_name}")


class TestPhase6AutonomousResearchAgent(unittest.TestCase):
    """Tests for autonomous in-simulation research agent."""

    def test_01_agent_archean_sweep_and_mass_conservation(self):
        """Verifies autonomous experimental plan execution and strict mass conservation."""
        agent, results = run_autonomous_archean_sweep()
        self.assertEqual(len(results), 3)  # dt = [0.5, 1.0, 2.0]

        for res in results:
            self.assertTrue(res.is_strictly_conserved, "Atomic drift occurred during autonomous sweep!")
            self.assertTrue(res.hypothesis_supported)
            self.assertGreater(res.epochs_completed, 0)
            self.assertGreaterEqual(res.final_regime, 1)

        # Verify synthesis report generation
        report = agent.generate_synthesis_report()
        self.assertIn("# Autonomous Research Synthesis Report", report)
        self.assertIn("Strict elemental mass conservation", report)


class TestPhase6MCPServer(unittest.TestCase):
    """Tests for Model Context Protocol (MCP) server tools and JSON-RPC dispatch."""

    def setUp(self):
        self.server = EvoChronosMCPServer(random_seed=123)

    def test_01_tools_list_schema(self):
        """Verifies tool definitions match MCP specification."""
        tools = self.server.get_tool_definitions()
        self.assertEqual(len(tools), 7)
        tool_names = {t["name"] for t in tools}
        expected = {
            "evochronos_step",
            "evochronos_get_ledger",
            "evochronos_promote_regime",
            "evochronos_load_metabolic_model",
            "evochronos_run_benchmark",
            "evochronos_fetch_sequence",
            "evochronos_render_structure",
        }
        self.assertEqual(tool_names, expected)

    def test_02_tool_invocations(self):
        """Verifies direct invocation of each tool via call_tool."""
        # 1. Step
        r_step = self.server.call_tool("evochronos_step", {"steps": 5, "dt": 1.0})
        self.assertTrue(r_step["success"])
        self.assertTrue(r_step["ledger_status"]["is_strictly_conserved"])

        # 2. Get Ledger
        r_ledger = self.server.call_tool("evochronos_get_ledger", {})
        self.assertTrue(r_ledger["success"])
        self.assertEqual(r_ledger["drift_atoms"], 0)

        # 3. Promote Regime
        r_promote = self.server.call_tool("evochronos_promote_regime", {"target_regime": 2})
        self.assertTrue(r_promote["success"])

        # 4. Load Metabolic Model
        r_model = self.server.call_tool("evochronos_load_metabolic_model", {"model_type": "canonical_archean"})
        self.assertTrue(r_model["success"])
        self.assertTrue(r_model["all_internal_reactions_balanced"])

        # 5. Run Benchmark
        r_bench = self.server.call_tool("evochronos_run_benchmark", {"benchmark_name": "kimura"})
        self.assertTrue(r_bench["success"])
        self.assertTrue(r_bench["passed"])

        # 6. Fetch Sequence
        r_seq = self.server.call_tool("evochronos_fetch_sequence", {"accession": "ferredoxin_archean"})
        self.assertTrue(r_seq["success"])
        self.assertGreaterEqual(r_seq["composition"]["iron"], 4)

        # 7. Render Structure
        r_struct = self.server.call_tool("evochronos_render_structure", {"complex_type": "atp_synthase_c_ring"})
        self.assertTrue(r_struct["success"])
        self.assertGreater(r_struct["total_atoms"], 50)

    def test_03_jsonrpc_protocol_handling(self):
        """Verifies JSON-RPC 2.0 request parsing and standard responses."""
        # initialize
        init_req = {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}
        init_resp = self.server.handle_jsonrpc(init_req)
        self.assertEqual(init_resp["id"], 1)
        self.assertEqual(init_resp["result"]["serverInfo"]["name"], "evochronos-mcp")

        # tools/list
        list_req = {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}
        list_resp = self.server.handle_jsonrpc(list_req)
        self.assertEqual(len(list_resp["result"]["tools"]), 7)

        # tools/call
        call_req = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {"name": "evochronos_step", "arguments": {"steps": 2}},
        }
        call_resp = self.server.handle_jsonrpc(call_req)
        self.assertEqual(call_resp["id"], 3)
        self.assertIn("content", call_resp["result"])

        # ping
        ping_req = {"jsonrpc": "2.0", "id": 4, "method": "ping", "params": {}}
        ping_resp = self.server.handle_jsonrpc(ping_req)
        self.assertEqual(ping_resp["result"], {})


if __name__ == "__main__":
    unittest.main()
