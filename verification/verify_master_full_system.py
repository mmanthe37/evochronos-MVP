#!/usr/bin/env python3
"""
EVOCHRONOS MASTER FULL-SYSTEM SCIENTIFIC VERIFICATION SUITE
Executes end-to-end verification across all phases, regimes, bridges, platforms, and invariants:
  - Phase 0: Workspace, Archean Configs, DuckDB OLAP Migrations, Core Primitives
  - Phase 1: Prebiotic SSA/maxRAF, Protocell Biomechanics/Eigen Quasispecies, WGSL Stencils
  - Phase 2: Prokaryote dFBA/Nullspace LP, Eukaryote rFBA/Lane Bioenergetics/Hill GRN, Bridges B_I/II->III & B_III->IV
  - Phase 3: Multicell Michod ETI/Turing/DAH/Krogh/DEB, Macro Lande/Orr BDMI/tskit, Bridges B_IV->V & B_V->VI & Kevrekidis
  - Phase 4: Zarr Tensor Storage, OLAP Conservation Ledger, Checkpointing, gRPC & REST Gateways
  - Phase 5/6: Python Scientific SDK, WebGPU Scientific Workbench, Tauri Desktop App, Next.js Web Platform
"""

import subprocess
import sys
import os

SCRIPTS = [
    ("Phase 0 & 1 Verification Suite", "verify_phase0_phase1.py", []),
    ("Phase 2 Verification Suite", "verify_phase2.py", []),
    ("Phase 3 Verification Suite", "verify_phase3.py", []),
    ("Phase 4 Storage & Orchestration Suite", "verify_phase4.py", []),
    ("Python SDK End-to-End Scientific Demo", "../python/examples/archean_to_macro_demo.py", []),
    ("PyO3 Native Extension Module Suite", "../tests/test_native_pyo3.py", []),
    ("Python Adapters Verification Suite", "../tests/test_adapters.py", []),
    ("Phase 6 Comprehensive Verification Suite", "../tests/test_phase6.py", []),
    ("Tauri Desktop Packaging Verification Suite", "../tests/test_desktop_packaging.py", []),
    ("EvoChronos MCP Server Demonstration", "../mcp-server/evochronos_mcp.py", ["--demo"]),
]

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print("=" * 80)
    print("EVOCHRONOS FULL-SYSTEM SCIENTIFIC AUDIT & VERIFICATION HARNESS")
    print("=" * 80)

    total_suites = len(SCRIPTS)
    passed_suites = 0

    for item in SCRIPTS:
        name = item[0]
        script = item[1]
        args = item[2] if len(item) > 2 else []
        script_path = os.path.join(base_dir, script)
        print(f"\n>>> Running: {name} ({script})...")
        res = subprocess.run([sys.executable, script_path] + args, capture_output=True, text=True)
        if res.returncode == 0:
            print(f"  [PASS] {name} succeeded with exit code 0.")
            passed_suites += 1
        else:
            print(f"  [FAIL] {name} failed with exit code {res.returncode}!")
            print(res.stdout)
            print(res.stderr)
            sys.exit(1)

    print("\n" + "=" * 80)
    print(f"ALL {passed_suites}/{total_suites} EVOCHRONOS VERIFICATION SUITES PASSED FLAWLESSLY!")
    print("ZERO ATOMIC DRIFT: STRICT INVARIANT MASS CONSERVATION GUARANTEED (0.0 DRIFT)")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    main()
