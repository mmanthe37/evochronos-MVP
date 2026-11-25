# EvoChronos Model Context Protocol (MCP) Server

The **EvoChronos MCP Server** exposes the full multi-scale evolutionary simulation engine, conservation ledger, biological adapters, and benchmarking suites to AI agents and workstations via the standard Model Context Protocol (MCP).

---

## Capabilities & Available Tools

| Tool Name | Parameters | Purpose |
| :--- | :--- | :--- |
| `evochronos_step` | `steps` (int), `dt` (float) | Advances simulation epochs and returns conservation state. |
| `evochronos_get_ledger` | *(none)* | Queries the 7-element atomic ledger across all 4 environmental pools. |
| `evochronos_promote_regime` | `target_regime` (int, 1–6) | Promotes the simulation across coarse-grained bridge operators ($\mathcal{B}$). |
| `evochronos_load_metabolic_model` | `model_type` ("canonical_archean" \| "json"), `model_json` (str) | Loads SBML/BiGG networks and checks elemental balance. |
| `evochronos_run_benchmark` | `benchmark_name` ("all" \| "hardy_weinberg" \| "kimura" \| "monod" \| "eigen" \| "wbe") | Executes classical evolutionary validation benchmarks. |
| `evochronos_fetch_sequence` | `accession` (str), `seq_type` ("protein" \| "rna") | Fetches biological sequences and computes elemental stoichiometry. |
| `evochronos_render_structure` | `complex_type` ("fe4s4" \| "ribozyme_core" \| "atp_synthase_c_ring") | Generates 3D atomic coordinates (PDB) and verifies stoichiometry. |

---

## Quick Start

### 1. Standalone Verification / Demonstration
```bash
python3 mcp-server/evochronos_mcp.py --demo
```

### 2. Registering in Antigravity or Claude Desktop
Add to your `mcp_servers` configuration:
```json
{
  "evochronos": {
    "command": "python3",
    "args": [
      "/absolute/path/to/evochronos/mcp-server/evochronos_mcp.py"
    ]
  }
}
```
