"""
Atomic Composition and Conservation Ledger Utilities.
"""

from dataclasses import dataclass
from typing import List, Tuple, Dict, Any

@dataclass(frozen=True)
class AtomicComposition:
    carbon: int
    hydrogen: int
    oxygen: int
    nitrogen: int
    phosphorus: int
    sulfur: int
    iron: int

    @property
    def total_atoms(self) -> int:
        return (
            self.carbon
            + self.hydrogen
            + self.oxygen
            + self.nitrogen
            + self.phosphorus
            + self.sulfur
            + self.iron
        )

    def as_tuple(self) -> Tuple[int, ...]:
        return (
            self.carbon,
            self.hydrogen,
            self.oxygen,
            self.nitrogen,
            self.phosphorus,
            self.sulfur,
            self.iron,
        )

    def add(self, other: "AtomicComposition") -> "AtomicComposition":
        return AtomicComposition(
            self.carbon + other.carbon,
            self.hydrogen + other.hydrogen,
            self.oxygen + other.oxygen,
            self.nitrogen + other.nitrogen,
            self.phosphorus + other.phosphorus,
            self.sulfur + other.sulfur,
            self.iron + other.iron,
        )

    def sub(self, other: "AtomicComposition") -> "AtomicComposition":
        return AtomicComposition(
            self.carbon - other.carbon,
            self.hydrogen - other.hydrogen,
            self.oxygen - other.oxygen,
            self.nitrogen - other.nitrogen,
            self.phosphorus - other.phosphorus,
            self.sulfur - other.sulfur,
            self.iron - other.iron,
        )

    def to_native(self) -> Any:
        """Convert to compiled PyO3 native ElementalComposition."""
        try:
            from . import evochronos_native
            return evochronos_native.ElementalComposition(
                carbon=self.carbon,
                hydrogen=self.hydrogen,
                oxygen=self.oxygen,
                nitrogen=self.nitrogen,
                phosphorus=self.phosphorus,
                sulfur=self.sulfur,
                iron=self.iron,
            )
        except ImportError:
            import evochronos_native
            return evochronos_native.ElementalComposition(
                carbon=self.carbon,
                hydrogen=self.hydrogen,
                oxygen=self.oxygen,
                nitrogen=self.nitrogen,
                phosphorus=self.phosphorus,
                sulfur=self.sulfur,
                iron=self.iron,
            )

    @classmethod
    def from_native(cls, native: Any) -> "AtomicComposition":
        """Construct AtomicComposition from a compiled PyO3 native ElementalComposition."""
        return cls(
            carbon=native.carbon,
            hydrogen=native.hydrogen,
            oxygen=native.oxygen,
            nitrogen=native.nitrogen,
            phosphorus=native.phosphorus,
            sulfur=native.sulfur,
            iron=native.iron,
        )

class ConservationLedger:
    def __init__(self, initial_budget: AtomicComposition):
        self.initial_budget = initial_budget
        self.history: List[Dict[str, Any]] = []

    def record_epoch(
        self,
        epoch: int,
        time_sec: float,
        regime: int,
        living: AtomicComposition,
        dissolved: AtomicComposition,
        mineral: AtomicComposition,
        atmosphere: AtomicComposition,
    ) -> bool:
        total = living.add(dissolved).add(mineral).add(atmosphere)
        drift = total.total_atoms - self.initial_budget.total_atoms
        is_exact = total == self.initial_budget and drift == 0

        self.history.append({
            "epoch": epoch,
            "time_sec": time_sec,
            "regime": regime,
            "living": living,
            "dissolved": dissolved,
            "mineral": mineral,
            "atmosphere": atmosphere,
            "total": total,
            "drift": drift,
            "is_exact": is_exact,
        })
        return is_exact

    def is_strictly_conserved(self) -> bool:
        return all(entry["is_exact"] for entry in self.history)

    @property
    def latest_living_biomass(self) -> AtomicComposition:
        if not self.history:
            return AtomicComposition(0, 0, 0, 0, 0, 0, 0)
        return self.history[-1]["living"]

    @property
    def living_carbon(self) -> int:
        return self.latest_living_biomass.carbon
