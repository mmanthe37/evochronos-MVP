//! Syntrophic Cross-Feeding & Thermodynamic Hydrogen Pull Detector (Martin-Müller Hypothesis).

use evo_regime_prokaryote::ProkaryoticGuild;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SyntrophicLink {
    pub host_guild_id: u32,
    pub symbiont_guild_id: u32,
    pub exchanged_metabolite: String,
    pub delta_g_coupling_kj_mol: f64,
}

pub struct SyntrophyDetector;

impl SyntrophyDetector {
    /// Minimum exergonic driving force required to overcome thermodynamic barriers for syntrophy
    pub const CRITICAL_SYNSTROPHY_DELTA_G_KJ: f64 = -15.0;

    /// Evaluates whether two prokaryotic guilds (e.g. anaerobic fermenter producing H2 + methanogen consuming H2)
    /// exhibit thermodynamic mutualism sufficient to trigger endosymbiotic engulfment.
    pub fn evaluate_syntrophic_coupling(
        host: &ProkaryoticGuild,
        symbiont: &ProkaryoticGuild,
        exchanged_metabolite: &str,
        delta_g_overall_kj: f64,
    ) -> Result<SyntrophicLink, &'static str> {
        if host.cell_census_population == 0 || symbiont.cell_census_population == 0 {
            return Err("Both candidate guilds must have active living populations");
        }

        // Thermodynamic Hydrogen Pull Condition
        if delta_g_overall_kj > Self::CRITICAL_SYNSTROPHY_DELTA_G_KJ {
            return Err("Thermodynamic pull insufficient: Delta G is not sufficiently exergonic (must be < -15 kJ/mol)");
        }

        Ok(SyntrophicLink {
            host_guild_id: host.id,
            symbiont_guild_id: symbiont.id,
            exchanged_metabolite: exchanged_metabolite.to_string(),
            delta_g_coupling_kj_mol: delta_g_overall_kj,
        })
    }
}
