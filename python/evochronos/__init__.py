"""
EvoChronos Scientific Python SDK: Multi-Scale Evolutionary Simulation & Invariant Ledger.
"""

from .client import Simulation, SimulationSession, HAS_NATIVE_ENGINE
from .ledger import ConservationLedger, AtomicComposition
from .morphospace import MorphospaceAnalyzer, LandeTrajectory
from .trees import TreeSequenceAnalyzer
from . import adapters
from . import importers
from . import benchmarks
from . import agents

# Re-export native PyO3 acceleration symbols if available
try:
    from . import evochronos_native
    from .evochronos_native import (
        ElementalComposition,
        SimulationEngine,
        kimura_fixation_probability,
        eigen_error_threshold,
        monod_growth_rate,
        monod_steady_state_substrate,
        wbe_metabolic_rate,
        bdmi_snowball_incompatibilities,
        bdmi_speciation_probability,
        lande_selection_response,
        parse_chemical_formula,
    )
except ImportError:
    try:
        import evochronos_native
        from evochronos_native import (
            ElementalComposition,
            SimulationEngine,
            kimura_fixation_probability,
            eigen_error_threshold,
            monod_growth_rate,
            monod_steady_state_substrate,
            wbe_metabolic_rate,
            bdmi_snowball_incompatibilities,
            bdmi_speciation_probability,
            lande_selection_response,
            parse_chemical_formula,
        )
    except ImportError:
        evochronos_native = None
        ElementalComposition = None
        SimulationEngine = None
        kimura_fixation_probability = None
        eigen_error_threshold = None
        monod_growth_rate = None
        monod_steady_state_substrate = None
        wbe_metabolic_rate = None
        bdmi_snowball_incompatibilities = None
        bdmi_speciation_probability = None
        lande_selection_response = None
        parse_chemical_formula = None

__version__ = "0.1.0"
__all__ = [
    "Simulation",
    "SimulationSession",
    "HAS_NATIVE_ENGINE",
    "ConservationLedger",
    "AtomicComposition",
    "MorphospaceAnalyzer",
    "LandeTrajectory",
    "TreeSequenceAnalyzer",
    "adapters",
    "importers",
    "benchmarks",
    "agents",
    "evochronos_native",
    "ElementalComposition",
    "SimulationEngine",
    "kimura_fixation_probability",
    "eigen_error_threshold",
    "monod_growth_rate",
    "monod_steady_state_substrate",
    "wbe_metabolic_rate",
    "bdmi_snowball_incompatibilities",
    "bdmi_speciation_probability",
    "lande_selection_response",
    "parse_chemical_formula",
]
