//! Enumeration and metadata for the Six Biological Regimes in EvoChronos.

use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[repr(u8)]
#[allow(non_camel_case_types)]
pub enum EvolutionaryRegime {
    I_PrebioticGeochemistry = 1,
    II_ProtocellQuasispecies = 2,
    III_ProkaryoticMetabolism = 3,
    IV_EukaryoticSymbiogenesis = 4,
    V_MulticellularMorphogenesis = 5,
    VI_MacroevolutionaryEcology = 6,
}

impl EvolutionaryRegime {
    pub const ALL: [EvolutionaryRegime; 6] = [
        EvolutionaryRegime::I_PrebioticGeochemistry,
        EvolutionaryRegime::II_ProtocellQuasispecies,
        EvolutionaryRegime::III_ProkaryoticMetabolism,
        EvolutionaryRegime::IV_EukaryoticSymbiogenesis,
        EvolutionaryRegime::V_MulticellularMorphogenesis,
        EvolutionaryRegime::VI_MacroevolutionaryEcology,
    ];

    pub fn id(&self) -> u8 {
        *self as u8
    }

    pub fn name(&self) -> &'static str {
        match self {
            Self::I_PrebioticGeochemistry => "Regime I: Prebiotic Geochemistry",
            Self::II_ProtocellQuasispecies => "Regime II: Information Polymers & Protocells",
            Self::III_ProkaryoticMetabolism => "Regime III: Prokaryotic Metabolism & dFBA",
            Self::IV_EukaryoticSymbiogenesis => "Regime IV: Eukaryogenesis & Non-Linear GRNs",
            Self::V_MulticellularMorphogenesis => "Regime V: Multicellularity & Ecophysiology",
            Self::VI_MacroevolutionaryEcology => "Regime VI: Macroevolution & Lineage Dynamics",
        }
    }

    pub fn description(&self) -> &'static str {
        match self {
            Self::I_PrebioticGeochemistry => {
                "Stochastic chemical kinetics, RAF autocatalytic networks, and mass-conserving spatial diffusion."
            }
            Self::II_ProtocellQuasispecies => {
                "Vesicle membrane biophysics, Eigen quasispecies replicators, error catastrophe, and Chemoton synchrony."
            }
            Self::III_ProkaryoticMetabolism => {
                "Dynamic Flux Balance Analysis (dFBA), thermodynamic loop laws, and biogeochemical nutrient fields."
            }
            Self::IV_EukaryoticSymbiogenesis => {
                "Syntrophic cross-feeding, chimeric block stoichiometry, CoRR EGT, Nick Lane bioenergetics, and Hill GRNs."
            }
            Self::V_MulticellularMorphogenesis => {
                "Michod germ-soma convexity, 3D Graph-Laplacian Turing reaction-diffusion, DAH sorting, and Kooijman DEB."
            }
            Self::VI_MacroevolutionaryEcology => {
                "Developmental Jacobian, Lande G-matrix evolution, Orr snowball BDMI speciation, and tskit genealogies."
            }
        }
    }

    /// Typical timescale range in seconds: (dt_min, dt_max)
    pub fn timescale_range_seconds(&self) -> (f64, f64) {
        match self {
            Self::I_PrebioticGeochemistry => (1e-6, 1e2),
            Self::II_ProtocellQuasispecies => (1e1, 1e5),
            Self::III_ProkaryoticMetabolism => (1e3, 1e7),
            Self::IV_EukaryoticSymbiogenesis => (1e5, 1e9),
            Self::V_MulticellularMorphogenesis => (1e7, 1e11),
            Self::VI_MacroevolutionaryEcology => (1e9, 1e14),
        }
    }

    /// Typical spatial scale range in meters: (dx_min, dx_max)
    pub fn spatial_scale_range_meters(&self) -> (f64, f64) {
        match self {
            Self::I_PrebioticGeochemistry => (1e-10, 1e-3),
            Self::II_ProtocellQuasispecies => (1e-7, 1e-2),
            Self::III_ProkaryoticMetabolism => (1e-6, 1e0),
            Self::IV_EukaryoticSymbiogenesis => (1e-5, 1e1),
            Self::V_MulticellularMorphogenesis => (1e-4, 1e2),
            Self::VI_MacroevolutionaryEcology => (1e-2, 1e5),
        }
    }

    /// Next sequential evolutionary regime, if not terminal
    pub fn next_regime(&self) -> Option<Self> {
        match self {
            Self::I_PrebioticGeochemistry => Some(Self::II_ProtocellQuasispecies),
            Self::II_ProtocellQuasispecies => Some(Self::III_ProkaryoticMetabolism),
            Self::III_ProkaryoticMetabolism => Some(Self::IV_EukaryoticSymbiogenesis),
            Self::IV_EukaryoticSymbiogenesis => Some(Self::V_MulticellularMorphogenesis),
            Self::V_MulticellularMorphogenesis => Some(Self::VI_MacroevolutionaryEcology),
            Self::VI_MacroevolutionaryEcology => None,
        }
    }

    /// Prior regime in the coarse-graining hierarchy
    pub fn prev_regime(&self) -> Option<Self> {
        match self {
            Self::I_PrebioticGeochemistry => None,
            Self::II_ProtocellQuasispecies => Some(Self::I_PrebioticGeochemistry),
            Self::III_ProkaryoticMetabolism => Some(Self::II_ProtocellQuasispecies),
            Self::IV_EukaryoticSymbiogenesis => Some(Self::III_ProkaryoticMetabolism),
            Self::V_MulticellularMorphogenesis => Some(Self::IV_EukaryoticSymbiogenesis),
            Self::VI_MacroevolutionaryEcology => Some(Self::V_MulticellularMorphogenesis),
        }
    }
}

impl fmt::Display for EvolutionaryRegime {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.name())
    }
}
