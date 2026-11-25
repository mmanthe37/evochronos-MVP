"""
EvoChronos SBML Level 3 (fbc) and BiGG Metabolic Model Importer.

Parses systems biology metabolic networks, extracts metabolite formulas,
constructs stoichiometric matrices, and validates strict elemental conservation
across all internal reactions.
"""

from dataclasses import dataclass, field
import json
import re
from typing import Dict, List, Optional, Tuple, Any
import xml.etree.ElementTree as ET

from evochronos.ledger import AtomicComposition


def parse_chemical_formula(formula_str: str) -> AtomicComposition:
    """
    Parses a chemical formula string (e.g., 'C6H12O6', 'C10H16N5O13P3', 'Fe4S4')
    into an exact 7-element AtomicComposition.
    """
    if not formula_str or not isinstance(formula_str, str):
        return AtomicComposition(0, 0, 0, 0, 0, 0, 0)

    # Standard elements regex
    counts = {"C": 0, "H": 0, "O": 0, "N": 0, "P": 0, "S": 0, "Fe": 0}
    pattern = r"([A-Z][a-z]?)(\d*)"

    for elem, num in re.findall(pattern, formula_str):
        count = int(num) if num else 1
        if elem in counts:
            counts[elem] += count

    return AtomicComposition(
        carbon=counts["C"],
        hydrogen=counts["H"],
        oxygen=counts["O"],
        nitrogen=counts["N"],
        phosphorus=counts["P"],
        sulfur=counts["S"],
        iron=counts["Fe"],
    )


@dataclass
class MetabolicMetabolite:
    id: str
    name: str
    compartment: str
    formula: str
    charge: int = 0
    atomic_composition: AtomicComposition = field(default_factory=lambda: AtomicComposition(0, 0, 0, 0, 0, 0, 0))

    def __post_init__(self):
        if self.atomic_composition.total_atoms == 0 and self.formula:
            self.atomic_composition = parse_chemical_formula(self.formula)


@dataclass
class MetabolicReaction:
    id: str
    name: str
    lower_bound: float
    upper_bound: float
    objective_coefficient: float
    metabolites: Dict[str, float]  # metabolite_id -> stoichiometric coefficient (negative=reactant, positive=product)
    is_exchange: bool = False

    def validate_mass_balance(self, metabolite_lookup: Dict[str, MetabolicMetabolite]) -> Tuple[bool, AtomicComposition]:
        """
        Calculates net elemental delta for this reaction.
        Returns (is_balanced, net_drift).
        Exchange reactions are intentionally open to the environment.
        """
        if self.is_exchange or len(self.metabolites) <= 1:
            return True, AtomicComposition(0, 0, 0, 0, 0, 0, 0)

        net_c = 0.0
        net_h = 0.0
        net_o = 0.0
        net_n = 0.0
        net_p = 0.0
        net_s = 0.0
        net_fe = 0.0

        for met_id, coeff in self.metabolites.items():
            if met_id in metabolite_lookup:
                comp = metabolite_lookup[met_id].atomic_composition
                net_c += coeff * comp.carbon
                net_h += coeff * comp.hydrogen
                net_o += coeff * comp.oxygen
                net_n += coeff * comp.nitrogen
                net_p += coeff * comp.phosphorus
                net_s += coeff * comp.sulfur
                net_fe += coeff * comp.iron

        drift = AtomicComposition(
            carbon=int(round(abs(net_c))),
            hydrogen=int(round(abs(net_h))),
            oxygen=int(round(abs(net_o))),
            nitrogen=int(round(abs(net_n))),
            phosphorus=int(round(abs(net_p))),
            sulfur=int(round(abs(net_s))),
            iron=int(round(abs(net_fe))),
        )
        is_balanced = (drift.total_atoms == 0)
        return is_balanced, drift


@dataclass
class SbmlMetabolicModel:
    model_id: str
    name: str
    metabolites: List[MetabolicMetabolite]
    reactions: List[MetabolicReaction]
    compartments: Dict[str, str] = field(default_factory=dict)

    @property
    def num_metabolites(self) -> int:
        return len(self.metabolites)

    @property
    def num_reactions(self) -> int:
        return len(self.reactions)

    def get_metabolite_lookup(self) -> Dict[str, MetabolicMetabolite]:
        return {m.id: m for m in self.metabolites}

    def build_stoichiometric_matrix(self) -> List[List[float]]:
        """
        Constructs stoichiometric matrix S where S[i][j] is coefficient of metabolite i in reaction j.
        """
        met_idx = {m.id: i for i, m in enumerate(self.metabolites)}
        matrix = [[0.0 for _ in range(len(self.reactions))] for _ in range(len(self.metabolites))]

        for j, rxn in enumerate(self.reactions):
            for met_id, coeff in rxn.metabolites.items():
                if met_id in met_idx:
                    i = met_idx[met_id]
                    matrix[i][j] = coeff

        return matrix

    def validate_all_internal_reactions(self) -> Dict[str, Any]:
        """
        Checks elemental conservation across all internal reactions.
        """
        lookup = self.get_metabolite_lookup()
        balanced_count = 0
        unbalanced_count = 0
        violations = []

        for rxn in self.reactions:
            if not rxn.is_exchange:
                is_balanced, drift = rxn.validate_mass_balance(lookup)
                if is_balanced:
                    balanced_count += 1
                else:
                    unbalanced_count += 1
                    violations.append({
                        "reaction_id": rxn.id,
                        "reaction_name": rxn.name,
                        "drift": {
                            "C": drift.carbon,
                            "H": drift.hydrogen,
                            "O": drift.oxygen,
                            "N": drift.nitrogen,
                            "P": drift.phosphorus,
                            "S": drift.sulfur,
                            "Fe": drift.iron,
                        }
                    })

        return {
            "total_internal_reactions": balanced_count + unbalanced_count,
            "balanced_reactions": balanced_count,
            "unbalanced_reactions": unbalanced_count,
            "all_balanced": (unbalanced_count == 0),
            "violations": violations,
        }


def load_bigg_model_from_json(json_str_or_path: str) -> SbmlMetabolicModel:
    """
    Parses a BiGG JSON model string or file path.
    """
    try:
        with open(json_str_or_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (FileNotFoundError, OSError):
        data = json.loads(json_str_or_path)

    model_id = data.get("id", "bigg_model")
    name = data.get("name", model_id)
    compartments = data.get("compartments", {})

    metabolites = []
    for met in data.get("metabolites", []):
        formula = met.get("formula", "")
        m = MetabolicMetabolite(
            id=met["id"],
            name=met.get("name", met["id"]),
            compartment=met.get("compartment", "c"),
            formula=formula,
            charge=met.get("charge", 0),
        )
        metabolites.append(m)

    reactions = []
    for rxn in data.get("reactions", []):
        rxn_id = rxn["id"]
        is_exchange = rxn_id.startswith("EX_") or rxn_id.startswith("DM_")
        r = MetabolicReaction(
            id=rxn_id,
            name=rxn.get("name", rxn_id),
            lower_bound=float(rxn.get("lower_bound", 0.0)),
            upper_bound=float(rxn.get("upper_bound", 1000.0)),
            objective_coefficient=float(rxn.get("objective_coefficient", 0.0)),
            metabolites={k: float(v) for k, v in rxn.get("metabolites", {}).items()},
            is_exchange=is_exchange,
        )
        reactions.append(r)

    return SbmlMetabolicModel(
        model_id=model_id,
        name=name,
        metabolites=metabolites,
        reactions=reactions,
        compartments=compartments,
    )


def load_bigg_model_from_sbml_xml(xml_content_or_path: str) -> SbmlMetabolicModel:
    """
    Parses an SBML Level 3 XML document or file path into SbmlMetabolicModel.
    """
    try:
        tree = ET.parse(xml_content_or_path)
        root = tree.getroot()
    except (FileNotFoundError, OSError):
        root = ET.fromstring(xml_content_or_path)

    # Namespaces
    ns = {"sbml": "http://www.sbml.org/sbml/level3/version1/core"}
    model_elem = root.find("sbml:model", ns)
    if model_elem is None:
        model_elem = root.find(".//model")
        if model_elem is None:
            model_elem = root

    model_id = model_elem.attrib.get("id", "sbml_model")
    name = model_elem.attrib.get("name", model_id)

    metabolites = []
    # Search for species
    for sp in model_elem.findall(".//{http://www.sbml.org/sbml/level3/version1/core}species") or model_elem.findall(".//species"):
        sp_id = sp.attrib.get("id", "")
        sp_name = sp.attrib.get("name", sp_id)
        comp = sp.attrib.get("compartment", "c")
        charge = int(sp.attrib.get("charge", 0))
        formula = sp.attrib.get("{http://www.sbml.org/sbml/level3/version1/fbc/version2}chemicalFormula", "")
        if not formula:
            formula = sp.attrib.get("chemicalFormula", "")

        metabolites.append(MetabolicMetabolite(
            id=sp_id,
            name=sp_name,
            compartment=comp,
            formula=formula,
            charge=charge,
        ))

    reactions = []
    for rxn in model_elem.findall(".//{http://www.sbml.org/sbml/level3/version1/core}reaction") or model_elem.findall(".//reaction"):
        r_id = rxn.attrib.get("id", "")
        r_name = rxn.attrib.get("name", r_id)
        is_reversible = rxn.attrib.get("reversible", "true").lower() == "true"
        lb = -1000.0 if is_reversible else 0.0
        ub = 1000.0

        met_map = {}
        # Reactants
        for r_spec in rxn.findall(".//{http://www.sbml.org/sbml/level3/version1/core}speciesReference") or rxn.findall(".//speciesReference"):
            s_id = r_spec.attrib.get("species", "")
            stoich = float(r_spec.attrib.get("stoichiometry", "1.0"))
            # Reactants are negative in convention
            if rxn.find(f".//listOfReactants//speciesReference[@species='{s_id}']") is not None:
                met_map[s_id] = -stoich
            else:
                met_map[s_id] = stoich

        is_ex = r_id.startswith("EX_") or r_id.startswith("DM_")
        reactions.append(MetabolicReaction(
            id=r_id,
            name=r_name,
            lower_bound=lb,
            upper_bound=ub,
            objective_coefficient=0.0,
            metabolites=met_map,
            is_exchange=is_ex,
        ))

    return SbmlMetabolicModel(
        model_id=model_id,
        name=name,
        metabolites=metabolites,
        reactions=reactions,
    )


def get_canonical_archean_core_model() -> SbmlMetabolicModel:
    """
    Returns the canonical Archean Methanogenesis & Wood-Ljungdahl metabolic core model.
    Fully mass-balanced across all internal reactions in [C, H, O, N, P, S, Fe].
    """
    metabolites = [
        MetabolicMetabolite("co2_c", "Carbon Dioxide", "c", "CO2"),
        MetabolicMetabolite("h2_c", "Molecular Hydrogen", "c", "H2"),
        MetabolicMetabolite("h2o_c", "Water", "c", "H2O"),
        MetabolicMetabolite("ch4_c", "Methane", "c", "CH4"),
        MetabolicMetabolite("atp_c", "ATP", "c", "C10H16N5O13P3"),
        MetabolicMetabolite("adp_c", "ADP", "c", "C10H15N5O10P2"),
        MetabolicMetabolite("pi_c", "Orthophosphate", "c", "H3O4P"),
        MetabolicMetabolite("acetyl_coa_c", "Acetyl-CoA", "c", "C23H38N7O17P3S"),
        MetabolicMetabolite("coa_c", "Coenzyme A", "c", "C21H36N7O16P3S"),
        MetabolicMetabolite("biomass_c", "Archaeon Biomass", "c", "C5H7O2N"),
        MetabolicMetabolite("nh3_c", "Ammonia", "c", "H3N"),
    ]

    reactions = [
        # R1: Methanogenesis: CO2 + 4 H2 -> CH4 + 2 H2O
        # C1 O2 + H8 -> C1 H4 + H4 O2
        MetabolicReaction(
            id="METHANOGENESIS",
            name="Methanogenesis Pathway (CO2 + 4 H2 -> CH4 + 2 H2O)",
            lower_bound=0.0,
            upper_bound=100.0,
            objective_coefficient=0.0,
            metabolites={"co2_c": -1.0, "h2_c": -4.0, "ch4_c": 1.0, "h2o_c": 2.0},
            is_exchange=False,
        ),
        # R2: Wood-Ljungdahl Acetyl-CoA synthesis: 2 CO2 + 4 H2 + CoA -> Acetyl-CoA + 3 H2O
        # 2 CO2 (C2 O4) + 4 H2 (H8) + CoA (C21 H36 N7 O16 P3 S) = C23 H44 N7 O20 P3 S
        # Acetyl-CoA (C23 H38 N7 O17 P3 S) + 3 H2O (H6 O3) = C23 H44 N7 O20 P3 S (Exact)
        MetabolicReaction(
            id="WOOD_LJUNGDHAL",
            name="Wood-Ljungdahl Acetogenic Pathway",
            lower_bound=0.0,
            upper_bound=50.0,
            objective_coefficient=0.0,
            metabolites={"co2_c": -2.0, "h2_c": -4.0, "coa_c": -1.0, "acetyl_coa_c": 1.0, "h2o_c": 3.0},
            is_exchange=False,
        ),
        # R3: Chemoautotrophic Biomass synthesis: 5 CO2 + 10 H2 + NH3 -> Biomass + 8 H2O
        # 5 CO2 (C5 O10) + 10 H2 (H20) + NH3 (H3 N) = C5 H23 N O10
        # Biomass (C5 H7 O2 N) + 8 H2O (H16 O8) = C5 H23 N O10 (Exact)
        MetabolicReaction(
            id="BIOMASS_SYNTHESIS",
            name="Chemoautotrophic Biomass Synthesis",
            lower_bound=0.0,
            upper_bound=10.0,
            objective_coefficient=1.0,  # FBA Objective
            metabolites={"co2_c": -5.0, "h2_c": -10.0, "nh3_c": -1.0, "biomass_c": 1.0, "h2o_c": 8.0},
            is_exchange=False,
        ),
        # Exchanges
        MetabolicReaction(id="EX_co2", name="CO2 Exchange", lower_bound=-100.0, upper_bound=100.0, objective_coefficient=0.0, metabolites={"co2_c": -1.0}, is_exchange=True),
        MetabolicReaction(id="EX_h2", name="H2 Exchange", lower_bound=-200.0, upper_bound=200.0, objective_coefficient=0.0, metabolites={"h2_c": -1.0}, is_exchange=True),
        MetabolicReaction(id="EX_nh3", name="NH3 Exchange", lower_bound=-50.0, upper_bound=50.0, objective_coefficient=0.0, metabolites={"nh3_c": -1.0}, is_exchange=True),
        MetabolicReaction(id="EX_ch4", name="CH4 Exchange", lower_bound=0.0, upper_bound=100.0, objective_coefficient=0.0, metabolites={"ch4_c": 1.0}, is_exchange=True),
        MetabolicReaction(id="EX_h2o", name="H2O Exchange", lower_bound=-100.0, upper_bound=100.0, objective_coefficient=0.0, metabolites={"h2o_c": 1.0}, is_exchange=True),
        MetabolicReaction(id="EX_biomass", name="Biomass Export", lower_bound=0.0, upper_bound=10.0, objective_coefficient=0.0, metabolites={"biomass_c": 1.0}, is_exchange=True),
    ]

    return SbmlMetabolicModel(
        model_id="archean_methanogenesis_core",
        name="Archean Chemoautotrophic Core Network (Regime III)",
        metabolites=metabolites,
        reactions=reactions,
        compartments={"c": "Archaeal Cytoplasm"},
    )
