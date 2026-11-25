"""
EvoChronos Simulation Client Interface.
"""

from typing import Optional, Dict, Any
from .ledger import AtomicComposition, ConservationLedger

try:
    from . import evochronos_native
    HAS_NATIVE_ENGINE = True
except ImportError:
    try:
        import evochronos_native
        HAS_NATIVE_ENGINE = True
    except ImportError:
        evochronos_native = None
        HAS_NATIVE_ENGINE = False

REGIME_NAMES = {
    1: "Regime I: Prebiotic Geochemistry",
    2: "Regime II: Protocells & Quasispecies",
    3: "Regime III: Prokaryotic Metabolic Networks (dFBA)",
    4: "Regime IV: Eukaryogenesis & Gene Regulatory Networks",
    5: "Regime V: Multicellularity & Development (DEB)",
    6: "Regime VI: Macroevolution & Speciation (Lande/tskit)",
}

class SimulationSession:
    def __init__(self, session_id: str, initial_budget: AtomicComposition):
        self.session_id = session_id
        self.active_regime = 1
        self.current_epoch = 0
        self.simulated_time_seconds = 0.0
        self.initial_budget = initial_budget
        self.living_biomass = AtomicComposition(0, 0, 0, 0, 0, 0, 0)
        self.abiotic_reservoir = initial_budget
        self.ledger = ConservationLedger(initial_budget)

    @property
    def active_regime_name(self) -> str:
        return REGIME_NAMES.get(self.active_regime, "Unknown Regime")

    def step(self, steps: int = 1, dt: float = 1.0) -> Dict[str, Any]:
        for _ in range(steps):
            self.current_epoch += 1
            self.simulated_time_seconds += dt

            # Assimilate small fraction of carbon into biomass during early regimes
            if self.active_regime <= 2:
                dc = min(100, self.abiotic_reservoir.carbon // 100_000)
                if dc > 0:
                    d_bio = AtomicComposition(dc, dc * 2, dc, dc // 5, dc // 20, dc // 50, 0)
                    self.abiotic_reservoir = self.abiotic_reservoir.sub(d_bio)
                    self.living_biomass = self.living_biomass.add(d_bio)

            # Record in ledger
            self.ledger.record_epoch(
                epoch=self.current_epoch,
                time_sec=self.simulated_time_seconds,
                regime=self.active_regime,
                living=self.living_biomass,
                dissolved=self.abiotic_reservoir,
                mineral=AtomicComposition(0, 0, 0, 0, 0, 0, 0),
                atmosphere=AtomicComposition(0, 0, 0, 0, 0, 0, 0),
            )

        return {
            "epoch": self.current_epoch,
            "simulated_time_seconds": self.simulated_time_seconds,
            "active_regime": self.active_regime,
            "active_regime_name": self.active_regime_name,
            "living_carbon": self.living_biomass.carbon,
            "is_conserved": self.ledger.is_strictly_conserved(),
        }

    def promote_to_regime(self, target_regime: int) -> bool:
        if target_regime > self.active_regime and target_regime <= 6:
            self.active_regime = target_regime
            return True
        return False

class Simulation:
    """Entrypoint for spawning and interacting with an EvoChronos simulation session."""

    def __init__(
        self,
        config: str = "default_earth_archean.yaml",
        random_seed: int = 42,
        initial_atoms: Optional[AtomicComposition] = None,
        use_native: Optional[bool] = None,
    ):
        self.config = config
        self.random_seed = random_seed
        self.use_native = HAS_NATIVE_ENGINE if use_native is None else (use_native and HAS_NATIVE_ENGINE)

        # Default planetary budget (1e14 atoms for native exact u64, 1e24 in pure python fallback)
        if initial_atoms is None:
            if self.use_native:
                initial_atoms = AtomicComposition(
                    carbon=100_000_000_000_000,
                    hydrogen=200_000_000_000_000,
                    oxygen=50_000_000_000_000,
                    nitrogen=20_000_000_000_000,
                    phosphorus=1_000_000_000_000,
                    sulfur=500_000_000_000,
                    iron=100_000_000_000,
                )
            else:
                initial_atoms = AtomicComposition(
                    carbon=100_000_000_000_000_000_000_000,
                    hydrogen=200_000_000_000_000_000_000_000,
                    oxygen=50_000_000_000_000_000_000_000,
                    nitrogen=20_000_000_000_000_000_000_000,
                    phosphorus=1_000_000_000_000_000_000_000,
                    sulfur=500_000_000_000_000_000_000,
                    iron=100_000_000_000_000_000_000,
                )

        self.initial_atoms = initial_atoms
        self.session = SimulationSession("session_local_001", initial_atoms)
        self._native_engine = None

        if self.use_native and evochronos_native is not None:
            try:
                # If budget fits in u64, pass it; otherwise let native engine use its default budget
                u64_max = 18_446_744_073_709_551_615
                if initial_atoms.total_atoms <= u64_max:
                    native_budget = initial_atoms.to_native()
                    self._native_engine = evochronos_native.SimulationEngine("session_native_001", native_budget)
                else:
                    self._native_engine = evochronos_native.SimulationEngine("session_native_001")
            except Exception:
                self._native_engine = None
                self.use_native = False

    def step(self, steps: int = 1, dt: float = 1.0) -> Dict[str, Any]:
        if self._native_engine is not None:
            res = self._native_engine.step(steps, dt)
            living_native = self._native_engine.get_living_biomass()
            abiotic_native = self._native_engine.get_abiotic_reservoir()
            living_comp = AtomicComposition.from_native(living_native)
            abiotic_comp = AtomicComposition.from_native(abiotic_native)

            # Record in session ledger for historical auditability
            self.session.current_epoch = self._native_engine.current_epoch
            self.session.simulated_time_seconds = self._native_engine.simulated_time_seconds
            self.session.active_regime = self._native_engine.active_regime
            self.session.living_biomass = living_comp
            self.session.abiotic_reservoir = abiotic_comp
            self.session.ledger.record_epoch(
                epoch=self.session.current_epoch,
                time_sec=self.session.simulated_time_seconds,
                regime=self.session.active_regime,
                living=living_comp,
                dissolved=abiotic_comp,
                mineral=AtomicComposition(0, 0, 0, 0, 0, 0, 0),
                atmosphere=AtomicComposition(0, 0, 0, 0, 0, 0, 0),
            )

            res["living_carbon"] = living_comp.carbon
            return res

        return self.session.step(steps, dt)

    def fast_forward(self, steps: int = 10000, dt: float = 1.0) -> Dict[str, Any]:
        """High-speed accelerated stepping without per-epoch Python overhead."""
        if self._native_engine is not None:
            res = self._native_engine.fast_forward(steps, dt)
            living_native = self._native_engine.get_living_biomass()
            abiotic_native = self._native_engine.get_abiotic_reservoir()
            living_comp = AtomicComposition.from_native(living_native)
            abiotic_comp = AtomicComposition.from_native(abiotic_native)

            self.session.current_epoch = self._native_engine.current_epoch
            self.session.simulated_time_seconds = self._native_engine.simulated_time_seconds
            self.session.active_regime = self._native_engine.active_regime
            self.session.living_biomass = living_comp
            self.session.abiotic_reservoir = abiotic_comp
            self.session.ledger.record_epoch(
                epoch=self.session.current_epoch,
                time_sec=self.session.simulated_time_seconds,
                regime=self.session.active_regime,
                living=living_comp,
                dissolved=abiotic_comp,
                mineral=AtomicComposition(0, 0, 0, 0, 0, 0, 0),
                atmosphere=AtomicComposition(0, 0, 0, 0, 0, 0, 0),
            )
            res["living_carbon"] = living_comp.carbon
            return res

        return self.session.step(steps, dt)

    def promote_regime(self, target: int) -> bool:
        if self._native_engine is not None:
            ok = self._native_engine.promote_regime(target)
            if ok:
                self.session.active_regime = target
            return ok
        return self.session.promote_to_regime(target)

    def get_ledger(self) -> ConservationLedger:
        return self.session.ledger

    @property
    def active_regime_name(self) -> str:
        if self._native_engine is not None:
            return self._native_engine.active_regime_name
        return self.session.active_regime_name

    @property
    def current_epoch(self) -> int:
        if self._native_engine is not None:
            return self._native_engine.current_epoch
        return self.session.current_epoch

    @property
    def is_native(self) -> bool:
        return self._native_engine is not None
