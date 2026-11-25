#!/usr/bin/env python3
"""
EvoChronos Model Context Protocol (MCP) Server.

Exposes the full multi-scale evolutionary simulation engine, 7-element atomic
conservation ledger, SBML/BiGG metabolic models, classic evolutionary benchmarks,
biological sequence adapters, and 3D molecular structure generation to AI agents
and IDEs via the standard Model Context Protocol (MCP).
"""

import os
import sys
import json
import logging
from typing import Dict, Any, List, Optional

# Ensure evochronos python SDK is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
PYTHON_SDK_DIR = os.path.join(REPO_ROOT, "python")
if PYTHON_SDK_DIR not in sys.path:
    sys.path.insert(0, PYTHON_SDK_DIR)

from evochronos.client import Simulation, SimulationSession
from evochronos.ledger import AtomicComposition, ConservationLedger
from evochronos.importers import (
    load_bigg_model_from_json,
    get_canonical_archean_core_model,
    parse_chemical_formula,
)
from evochronos.benchmarks import (
    HardyWeinbergBenchmark,
    KimuraDiffusionBenchmark,
    MonodChemostatBenchmark,
    EigenErrorThresholdBenchmark,
    WestBrownEnquistBenchmark,
    run_all_evolutionary_benchmarks,
)
from evochronos.adapters import (
    NCBISequenceFetcher,
    sequence_to_atomic_composition,
    PyMOLRenderer,
)

logger = logging.getLogger("evochronos_mcp")


class EvoChronosMCPServer:
    """
    Stateful Model Context Protocol Server for EvoChronos.
    Maintains an active simulation session, conservation ledger, and tool suite.
    """

    def __init__(self, random_seed: int = 42):
        self.simulation = Simulation(random_seed=random_seed)
        self.ncbi_fetcher = NCBISequenceFetcher(offline_only=True)
        self.pymol_renderer = PyMOLRenderer()

    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "evochronos_step",
                "description": "Advances simulation epochs and returns atomic conservation ledger status.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "steps": {
                            "type": "integer",
                            "description": "Number of simulation epochs to advance (default 1).",
                            "default": 1,
                        },
                        "dt": {
                            "type": "number",
                            "description": "Time step interval in seconds (default 1.0).",
                            "default": 1.0,
                        },
                    },
                },
            },
            {
                "name": "evochronos_get_ledger",
                "description": "Queries the 7-element atomic conservation ledger across living and abiotic reservoirs.",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                },
            },
            {
                "name": "evochronos_promote_regime",
                "description": "Promotes the simulation to an advanced evolutionary regime (1 to 6) across coarse-grained bridge operators.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "target_regime": {
                            "type": "integer",
                            "description": "Target regime index (1: Prebiotic, 2: Protocells, 3: Prokaryotes, 4: Eukaryotes, 5: Multicellularity, 6: Macroevolution).",
                            "minimum": 1,
                            "maximum": 6,
                        },
                    },
                    "required": ["target_regime"],
                },
            },
            {
                "name": "evochronos_load_metabolic_model",
                "description": "Loads an SBML/BiGG metabolic network and verifies internal reaction elemental mass conservation.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "model_type": {
                            "type": "string",
                            "description": "Model source type ('canonical_archean' or 'json').",
                            "enum": ["canonical_archean", "json"],
                            "default": "canonical_archean",
                        },
                        "model_json": {
                            "type": "string",
                            "description": "Optional BiGG JSON model string if model_type is 'json'.",
                        },
                    },
                },
            },
            {
                "name": "evochronos_run_benchmark",
                "description": "Executes classical evolutionary and biophysical benchmarks against exact theoretical solutions.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "benchmark_name": {
                            "type": "string",
                            "description": "Benchmark to execute ('all', 'hardy_weinberg', 'kimura', 'monod', 'eigen', 'wbe').",
                            "enum": ["all", "hardy_weinberg", "kimura", "monod", "eigen", "wbe"],
                            "default": "all",
                        },
                    },
                },
            },
            {
                "name": "evochronos_fetch_sequence",
                "description": "Fetches biological sequences and computes exact 7-element stoichiometry [C, H, O, N, P, S, Fe].",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "accession": {
                            "type": "string",
                            "description": "Accession or identifier (e.g., 'ferredoxin_archean', 'cytochrome_c', or custom FASTA sequence).",
                        },
                        "seq_type": {
                            "type": "string",
                            "description": "Sequence type ('protein', 'rna', 'dna').",
                            "enum": ["protein", "rna", "dna"],
                            "default": "protein",
                        },
                    },
                    "required": ["accession"],
                },
            },
            {
                "name": "evochronos_render_structure",
                "description": "Generates 3D atomic coordinates (PDB format) for prebiotic active sites and verifies structural stoichiometry.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "complex_type": {
                            "type": "string",
                            "description": "Molecular complex to construct ('fe4s4', 'ribozyme_core', 'atp_synthase_c_ring').",
                            "enum": ["fe4s4", "ribozyme_core", "atp_synthase_c_ring"],
                            "default": "fe4s4",
                        },
                    },
                },
            },
        ]

    def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatches an MCP tool invocation to the corresponding simulation subsystem."""
        if tool_name == "evochronos_step":
            steps = int(arguments.get("steps", 1))
            dt = float(arguments.get("dt", 1.0))
            step_result = self.simulation.step(steps=steps, dt=dt)
            return {
                "success": True,
                "step_result": step_result,
                "ledger_status": {
                    "is_strictly_conserved": self.simulation.session.ledger.is_strictly_conserved(),
                    "total_epochs": self.simulation.session.current_epoch,
                    "simulated_time_seconds": self.simulation.session.simulated_time_seconds,
                    "active_regime": self.simulation.session.active_regime_name,
                },
            }

        elif tool_name == "evochronos_get_ledger":
            session = self.simulation.session
            initial = session.initial_budget
            living = session.living_biomass
            abiotic = session.abiotic_reservoir
            total = living.add(abiotic)
            drift = total.total_atoms - initial.total_atoms
            return {
                "success": True,
                "is_strictly_conserved": drift == 0,
                "drift_atoms": drift,
                "initial_budget": {
                    "carbon": initial.carbon,
                    "hydrogen": initial.hydrogen,
                    "oxygen": initial.oxygen,
                    "nitrogen": initial.nitrogen,
                    "phosphorus": initial.phosphorus,
                    "sulfur": initial.sulfur,
                    "iron": initial.iron,
                    "total_atoms": initial.total_atoms,
                },
                "living_biomass": {
                    "carbon": living.carbon,
                    "hydrogen": living.hydrogen,
                    "oxygen": living.oxygen,
                    "nitrogen": living.nitrogen,
                    "phosphorus": living.phosphorus,
                    "sulfur": living.sulfur,
                    "iron": living.iron,
                    "total_atoms": living.total_atoms,
                },
                "abiotic_reservoir": {
                    "carbon": abiotic.carbon,
                    "hydrogen": abiotic.hydrogen,
                    "oxygen": abiotic.oxygen,
                    "nitrogen": abiotic.nitrogen,
                    "phosphorus": abiotic.phosphorus,
                    "sulfur": abiotic.sulfur,
                    "iron": abiotic.iron,
                    "total_atoms": abiotic.total_atoms,
                },
            }

        elif tool_name == "evochronos_promote_regime":
            target = int(arguments.get("target_regime", 1))
            success = self.simulation.promote_regime(target)
            return {
                "success": success,
                "current_regime": self.simulation.session.active_regime,
                "regime_name": self.simulation.session.active_regime_name,
                "message": f"Successfully promoted to Regime {target}." if success else f"Cannot promote to Regime {target} from Regime {self.simulation.session.active_regime}.",
            }

        elif tool_name == "evochronos_load_metabolic_model":
            model_type = arguments.get("model_type", "canonical_archean")
            if model_type == "canonical_archean":
                model = get_canonical_archean_core_model()
            elif model_type == "json" and "model_json" in arguments:
                model = load_bigg_model_from_json(arguments["model_json"])
            else:
                model = get_canonical_archean_core_model()

            validation = model.validate_all_internal_reactions()
            return {
                "success": True,
                "model_id": model.model_id,
                "name": model.name,
                "num_metabolites": len(model.metabolites),
                "num_reactions": len(model.reactions),
                "all_internal_reactions_balanced": validation["all_balanced"],
                "validation_summary": {
                    "total_internal": validation["total_internal_reactions"],
                    "balanced": validation["balanced_reactions"],
                    "unbalanced": validation["unbalanced_reactions"],
                },
            }

        elif tool_name == "evochronos_run_benchmark":
            bench_name = arguments.get("benchmark_name", "all")
            if bench_name == "all":
                results = run_all_evolutionary_benchmarks()
                return {
                    "success": True,
                    "all_passed": all(r.passed for r in results),
                    "benchmarks": {
                        res.benchmark_name: {
                            "passed": res.passed,
                            "empirical": res.empirical_value,
                            "theoretical": res.theoretical_value,
                            "relative_error": res.relative_error,
                            "details": res.details,
                        }
                        for res in results
                    },
                }
            elif bench_name == "hardy_weinberg":
                r = HardyWeinbergBenchmark.evaluate()
            elif bench_name == "kimura":
                r = KimuraDiffusionBenchmark.evaluate()
            elif bench_name == "monod":
                r = MonodChemostatBenchmark.evaluate()
            elif bench_name == "eigen":
                r = EigenErrorThresholdBenchmark.evaluate()
            elif bench_name == "wbe":
                r = WestBrownEnquistBenchmark.evaluate()
            else:
                raise ValueError(f"Unknown benchmark: {bench_name}")

            return {
                "success": True,
                "passed": r.passed,
                "benchmark_name": r.benchmark_name,
                "empirical": r.empirical_value,
                "theoretical": r.theoretical_value,
                "relative_error": r.relative_error,
                "details": r.details,
            }

        elif tool_name == "evochronos_fetch_sequence":
            accession = arguments.get("accession", "")
            seq_type = arguments.get("seq_type", "protein")

            # Support common aliases
            alias_map = {
                "ferredoxin_archean": "NP_FERREDOXIN_4FE4S",
                "ferredoxin": "NP_FERREDOXIN_4FE4S",
                "16s_rrna": "NR_16S_RRNA_CORE",
                "rrna_core": "NR_16S_RRNA_CORE",
                "atp_synthase_c": "NP_ATP_SYNTHASE_C",
                "rubisco": "NP_RUBISCO_ANCIENT",
            }
            mapped_acc = alias_map.get(accession.lower(), accession)

            try:
                record = self.ncbi_fetcher.fetch_sequence(mapped_acc, seq_type=seq_type)
                seq = record.sequence
                seq_type = record.seq_type
                comp = record.atomic_composition
                description = record.description
            except Exception:
                # Fallback to direct sequence evaluation
                seq = accession
                comp = sequence_to_atomic_composition(seq, seq_type=seq_type)
                description = f"User sequence ({len(seq)} residues)"

            return {
                "success": True,
                "accession": accession,
                "description": description,
                "sequence_length": len(seq),
                "seq_type": seq_type,
                "composition": {
                    "carbon": comp.carbon,
                    "hydrogen": comp.hydrogen,
                    "oxygen": comp.oxygen,
                    "nitrogen": comp.nitrogen,
                    "phosphorus": comp.phosphorus,
                    "sulfur": comp.sulfur,
                    "iron": comp.iron,
                    "total_atoms": comp.total_atoms,
                },
            }

        elif tool_name == "evochronos_render_structure":
            complex_type = arguments.get("complex_type", "fe4s4")
            if complex_type == "fe4s4":
                struct = self.pymol_renderer.build_4fe4s_ferredoxin_core()
            elif complex_type == "ribozyme_core":
                struct = self.pymol_renderer.build_ribozyme_core()
            elif complex_type == "atp_synthase_c_ring":
                struct = self.pymol_renderer.build_atp_synthase_c_ring(num_subunits=10)
            else:
                raise ValueError(f"Unknown complex type: {complex_type}")

            pdb_str = struct.to_pdb_string()
            comp = struct.compute_atomic_composition()
            return {
                "success": True,
                "complex_name": struct.name,
                "description": struct.description,
                "total_atoms": struct.total_atoms,
                "total_bonds": len(struct.bonds),
                "composition": {
                    "carbon": comp.carbon,
                    "hydrogen": comp.hydrogen,
                    "oxygen": comp.oxygen,
                    "nitrogen": comp.nitrogen,
                    "phosphorus": comp.phosphorus,
                    "sulfur": comp.sulfur,
                    "iron": comp.iron,
                },
                "pdb_preview": "\n".join(pdb_str.strip().split("\n")[:12]) + "\n...",
                "full_pdb_lines": len(pdb_str.strip().split("\n")),
            }

        else:
            raise ValueError(f"Unknown tool: {tool_name}")

    def handle_jsonrpc(self, request: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Processes a single JSON-RPC 2.0 request according to the Model Context Protocol."""
        req_id = request.get("id")
        method = request.get("method")
        params = request.get("params", {})

        if method == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {
                        "name": "evochronos-mcp",
                        "version": "1.0.0",
                    },
                },
            }

        elif method == "notifications/initialized":
            return None

        elif method == "ping":
            return {"jsonrpc": "2.0", "id": req_id, "result": {}}

        elif method == "tools/list":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "tools": self.get_tool_definitions(),
                },
            }

        elif method == "tools/call":
            name = params.get("name")
            args = params.get("arguments", {})
            try:
                res = self.call_tool(name, args)
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": json.dumps(res, indent=2),
                            }
                        ]
                    },
                }
            except Exception as e:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "isError": True,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": f"Tool Execution Error: {str(e)}",
                            }
                        ]
                    },
                }

        else:
            if req_id is not None:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method '{method}' not found",
                    },
                }
            return None

    def run_stdio_server(self):
        """Standard stdio JSON-RPC loop reading line-by-line from sys.stdin."""
        logger.info("EvoChronos MCP Server initialized on stdio.")
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                req = json.loads(line)
                resp = self.handle_jsonrpc(req)
                if resp is not None:
                    sys.stdout.write(json.dumps(resp) + "\n")
                    sys.stdout.flush()
            except json.JSONDecodeError as e:
                err_resp = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {"code": -32700, "message": f"Parse error: {str(e)}"},
                }
                sys.stdout.write(json.dumps(err_resp) + "\n")
                sys.stdout.flush()

    def run_demo(self):
        """Executes a full interactive demonstration of all 7 MCP tools."""
        print("=" * 80)
        print("EVOCHRONOS MODEL CONTEXT PROTOCOL (MCP) DEMONSTRATION")
        print("=" * 80)

        # 1. Step simulation
        print("\n[1/7] Invoking 'evochronos_step' (advance 10 epochs)...")
        r_step = self.call_tool("evochronos_step", {"steps": 10, "dt": 2.0})
        print(f"  Result: Epoch {r_step['step_result']['epoch']}, Living C: {r_step['step_result']['living_carbon']:,}")
        print(f"  Conservation: {r_step['ledger_status']['is_strictly_conserved']}")
        assert r_step["ledger_status"]["is_strictly_conserved"], "Mass conservation failed in step!"

        # 2. Get Ledger
        print("\n[2/7] Invoking 'evochronos_get_ledger'...")
        r_ledger = self.call_tool("evochronos_get_ledger", {})
        print(f"  Initial Total Atoms: {r_ledger['initial_budget']['total_atoms']:,}")
        print(f"  Drift Atoms: {r_ledger['drift_atoms']} (STRICT ZERO DRIFT GUARANTEED)")
        assert r_ledger["drift_atoms"] == 0, "Non-zero drift in ledger!"

        # 3. Promote Regime
        print("\n[3/7] Invoking 'evochronos_promote_regime' (promoting to Regime 2: Protocells)...")
        r_promote = self.call_tool("evochronos_promote_regime", {"target_regime": 2})
        print(f"  Promoted: {r_promote['success']} -> {r_promote['regime_name']}")
        assert r_promote["success"], "Failed to promote regime!"

        # 4. Load Metabolic Model
        print("\n[4/7] Invoking 'evochronos_load_metabolic_model' (canonical Archean core)...")
        r_model = self.call_tool("evochronos_load_metabolic_model", {"model_type": "canonical_archean"})
        print(f"  Model: {r_model['name']} ({r_model['num_metabolites']} metabolites, {r_model['num_reactions']} reactions)")
        print(f"  All Internal Reactions Atomically Balanced: {r_model['all_internal_reactions_balanced']}")
        assert r_model["all_internal_reactions_balanced"], "Metabolic model reactions unbalanced!"

        # 5. Run Benchmarks
        print("\n[5/7] Invoking 'evochronos_run_benchmark' (evaluating all 5 biophysical benchmarks)...")
        r_bench = self.call_tool("evochronos_run_benchmark", {"benchmark_name": "all"})
        print(f"  All 5 Classic Evolutionary Benchmarks Passed: {r_bench['all_passed']}")
        for name, b in r_bench["benchmarks"].items():
            print(f"    - {name}: passed={b['passed']} (rel_err={b['relative_error']:.6f})")
        assert r_bench["all_passed"], "Evolutionary benchmarks failed!"

        # 6. Fetch Sequence
        print("\n[6/7] Invoking 'evochronos_fetch_sequence' ('ferredoxin_archean')...")
        r_seq = self.call_tool("evochronos_fetch_sequence", {"accession": "ferredoxin_archean"})
        print(f"  Fetched: {r_seq['description']} ({r_seq['sequence_length']} aa)")
        print(f"  Atomic Stoichiometry: {r_seq['composition']}")
        assert r_seq["composition"]["iron"] >= 4, "Expected Fe in ferredoxin!"

        # 7. Render Structure
        print("\n[7/7] Invoking 'evochronos_render_structure' ('fe4s4' and 'ribozyme_core')...")
        r_fe4s4 = self.call_tool("evochronos_render_structure", {"complex_type": "fe4s4"})
        r_ribozyme = self.call_tool("evochronos_render_structure", {"complex_type": "ribozyme_core"})
        print(f"  Generated: {r_fe4s4['complex_name']} ({r_fe4s4['total_atoms']} atoms, {r_fe4s4['total_bonds']} bonds)")
        print(f"  Generated: {r_ribozyme['complex_name']} ({r_ribozyme['total_atoms']} atoms, {r_ribozyme['total_bonds']} bonds)")
        assert r_fe4s4["composition"]["iron"] == 4, "Expected 4 Fe in 4Fe-4S structure!"

        print("\n" + "=" * 80)
        print("ALL 7 EVOCHRONOS MCP TOOLS VERIFIED FLAWLESSLY WITH ZERO DRIFT!")
        print("=" * 80)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="EvoChronos Model Context Protocol (MCP) Server")
    parser.add_argument("--demo", action="store_true", help="Run self-contained demonstration of all 7 tools")
    args = parser.parse_args()

    server = EvoChronosMCPServer()
    if args.demo:
        server.run_demo()
    else:
        server.run_stdio_server()


if __name__ == "__main__":
    main()
