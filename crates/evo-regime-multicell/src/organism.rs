//! Multicellular Organism Assembly: Cell Graph, Differentiation, DAH Adhesion, DEB Energetics.

use crate::deb_energy::{DebOrganismState, DebParameters};
use crate::krogh_cylinder::{KroghCylinderEvaluator, KroghDiffusionParams};
use crate::michod_gating::{MichodEtiEvaluator, MichodEtiParams};
use crate::turing_morphogen::CellContactGraph;
use evo_core::composition::AtomicComposition;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MulticellularOrganism {
    pub id: u64,
    pub lineage_id: u64,
    pub graph: CellContactGraph,
    pub cell_types: Vec<usize>, // 0 = Germ, 1 = Soma, 2 = Cheater
    pub deb_state: DebOrganismState,
    pub deb_params: DebParameters,
    pub eti_evaluator: MichodEtiEvaluator,
    pub krogh_evaluator: KroghCylinderEvaluator,
    pub is_alive: bool,
    pub age_days: f64,
}

impl MulticellularOrganism {
    pub fn new(
        id: u64,
        lineage_id: u64,
        graph: CellContactGraph,
        cell_types: Vec<usize>,
        initial_volume: f64,
        initial_reserve: f64,
    ) -> Self {
        Self {
            id,
            lineage_id,
            graph,
            cell_types,
            deb_state: DebOrganismState::new(initial_volume, initial_reserve),
            deb_params: DebParameters::default(),
            eti_evaluator: MichodEtiEvaluator::new(MichodEtiParams::default()),
            krogh_evaluator: KroghCylinderEvaluator::new(KroghDiffusionParams::default()),
            is_alive: true,
            age_days: 0.0,
        }
    }

    /// Evaluates organism effective radius from spherical volume: V = 4/3 * pi * R^3 => R = (3V / 4pi)^(1/3)
    pub fn physical_radius_cm(&self) -> f64 {
        let v = self.deb_state.structure_volume;
        ( (3.0 * v) / (4.0 * std::f64::consts::PI) ).cbrt()
    }

    /// Step organism forward in time by dt (days) under ambient food flux.
    pub fn step(&mut self, food_flux: f64, dt: f64) -> usize {
        if !self.is_alive {
            return 0;
        }

        self.age_days += dt;

        // 1. DEB metabolic progression
        let (_dv, _de, offspring_count, starved) = self.deb_state.step(&self.deb_params, food_flux, dt);
        if starved && self.deb_state.reserve_energy <= 0.0 {
            self.is_alive = false;
            return 0;
        }

        // 2. Krogh anoxia check: if physical radius exceeds critical limit without vasculature, core cells die
        let radius = self.physical_radius_cm();
        let necrotic_r = self.krogh_evaluator.necrotic_core_radius(radius);
        if necrotic_r > 0.0 && necrotic_r / radius > 0.5 {
            // Catastrophic anoxic necrosis
            self.is_alive = false;
            return 0;
        }

        // 3. Michod cheater evaluation
        let mut soma_c = 0;
        let mut germ_c = 0;
        let mut cheat_c = 0;
        for &t in &self.cell_types {
            match t {
                0 => germ_c += 1,
                1 => soma_c += 1,
                _ => cheat_c += 1,
            }
        }

        let w_group = self.eti_evaluator.group_fitness(soma_c, germ_c, 1.0, 0.0, cheat_c);
        if w_group < 0.01 {
            // Fitness collapse from cheater load
            self.is_alive = false;
            return 0;
        }

        offspring_count
    }

    /// Total atomic composition of the organism (strictly conserved integer counts).
    pub fn total_composition(&self) -> AtomicComposition {
        self.deb_state.compute_elemental_composition()
    }
}
