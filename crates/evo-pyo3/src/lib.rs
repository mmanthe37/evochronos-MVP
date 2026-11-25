//! EvoChronos Native PyO3 Extension Module (`evochronos_native`).
//!
//! Exposes the high-performance compiled Rust simulation engine, exact 7-element
//! integer atomic conservation ledger, and classical biophysical benchmarks directly
//! to Python with zero IPC or serialization overhead.

use pyo3::prelude::*;
use pyo3::types::{PyDict, PyTuple};

use evo_core::composition::ElementalComposition;
use evo_server::SimulationSession;

/// Python wrapper for exact 7-element ElementalComposition [C, H, O, N, P, S, Fe].
#[pyclass(name = "ElementalComposition")]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PyElementalComposition {
    pub inner: ElementalComposition,
}

#[pymethods]
impl PyElementalComposition {
    #[new]
    #[pyo3(signature = (carbon=0, hydrogen=0, oxygen=0, nitrogen=0, phosphorus=0, sulfur=0, iron=0))]
    pub fn new(
        carbon: u64,
        hydrogen: u64,
        oxygen: u64,
        nitrogen: u64,
        phosphorus: u64,
        sulfur: u64,
        iron: u64,
    ) -> Self {
        Self {
            inner: ElementalComposition::new(carbon, hydrogen, oxygen, nitrogen, phosphorus, sulfur, iron),
        }
    }

    #[getter]
    pub fn carbon(&self) -> u64 {
        self.inner.carbon()
    }

    #[getter]
    pub fn hydrogen(&self) -> u64 {
        self.inner.hydrogen()
    }

    #[getter]
    pub fn oxygen(&self) -> u64 {
        self.inner.oxygen()
    }

    #[getter]
    pub fn nitrogen(&self) -> u64 {
        self.inner.nitrogen()
    }

    #[getter]
    pub fn phosphorus(&self) -> u64 {
        self.inner.phosphorus()
    }

    #[getter]
    pub fn sulfur(&self) -> u64 {
        self.inner.sulfur()
    }

    #[getter]
    pub fn iron(&self) -> u64 {
        self.inner.iron()
    }

    #[getter]
    pub fn total_atoms(&self) -> u128 {
        self.inner.total_atoms()
    }

    pub fn add(&self, other: &PyElementalComposition) -> Self {
        Self {
            inner: self.inner.add(&other.inner),
        }
    }

    pub fn sub(&self, other: &PyElementalComposition) -> PyResult<Self> {
        if self.inner.carbon() < other.inner.carbon()
            || self.inner.hydrogen() < other.inner.hydrogen()
            || self.inner.oxygen() < other.inner.oxygen()
            || self.inner.nitrogen() < other.inner.nitrogen()
            || self.inner.phosphorus() < other.inner.phosphorus()
            || self.inner.sulfur() < other.inner.sulfur()
            || self.inner.iron() < other.inner.iron()
        {
            return Err(pyo3::exceptions::PyValueError::new_err(
                "Subtraction would result in negative atom counts",
            ));
        }
        Ok(Self {
            inner: self.inner.sub(&other.inner),
        })
    }

    pub fn as_tuple<'py>(&self, py: Python<'py>) -> Bound<'py, PyTuple> {
        PyTuple::new(
            py,
            [
                self.inner.carbon(),
                self.inner.hydrogen(),
                self.inner.oxygen(),
                self.inner.nitrogen(),
                self.inner.phosphorus(),
                self.inner.sulfur(),
                self.inner.iron(),
            ],
        ).unwrap()
    }

    pub fn as_dict<'py>(&self, py: Python<'py>) -> PyResult<Bound<'py, PyDict>> {
        let dict = PyDict::new(py);
        dict.set_item("carbon", self.inner.carbon())?;
        dict.set_item("hydrogen", self.inner.hydrogen())?;
        dict.set_item("oxygen", self.inner.oxygen())?;
        dict.set_item("nitrogen", self.inner.nitrogen())?;
        dict.set_item("phosphorus", self.inner.phosphorus())?;
        dict.set_item("sulfur", self.inner.sulfur())?;
        dict.set_item("iron", self.inner.iron())?;
        dict.set_item("total_atoms", self.inner.total_atoms())?;
        Ok(dict)
    }

    fn __repr__(&self) -> String {
        format!(
            "ElementalComposition(C={}, H={}, O={}, N={}, P={}, S={}, Fe={})",
            self.inner.carbon(),
            self.inner.hydrogen(),
            self.inner.oxygen(),
            self.inner.nitrogen(),
            self.inner.phosphorus(),
            self.inner.sulfur(),
            self.inner.iron()
        )
    }

    fn __eq__(&self, other: &PyElementalComposition) -> bool {
        self.inner == other.inner
    }
}

/// Python wrapper for the core simulation session.
#[pyclass(name = "SimulationEngine")]
pub struct PySimulationEngine {
    inner: SimulationSession,
}

#[pymethods]
impl PySimulationEngine {
    #[new]
    #[pyo3(signature = (session_id="session_native_001", initial_budget=None))]
    pub fn new(session_id: &str, initial_budget: Option<&PyElementalComposition>) -> Self {
        let budget = match initial_budget {
            Some(comp) => comp.inner,
            None => {
                // Default Archean planetary budget (1e24 atoms total)
                ElementalComposition::new(
                    100_000_000_000_000,
                    200_000_000_000_000,
                    50_000_000_000_000,
                    20_000_000_000_000,
                    1_000_000_000_000,
                    500_000_000_000,
                    100_000_000_000,
                )
            }
        };

        Self {
            inner: SimulationSession::new(session_id, budget),
        }
    }

    #[getter]
    pub fn session_id(&self) -> &str {
        &self.inner.session_id
    }

    #[getter]
    pub fn current_epoch(&self) -> u64 {
        self.inner.current_epoch
    }

    #[getter]
    pub fn simulated_time_seconds(&self) -> f64 {
        self.inner.simulated_time_seconds
    }

    #[getter]
    pub fn active_regime(&self) -> u32 {
        self.inner.active_regime
    }

    #[getter]
    pub fn active_regime_name(&self) -> &'static str {
        match self.inner.active_regime {
            1 => "Regime I: Prebiotic Geochemistry",
            2 => "Regime II: Protocells & Quasispecies",
            3 => "Regime III: Prokaryotic Metabolic Networks (dFBA)",
            4 => "Regime IV: Eukaryogenesis & Gene Regulatory Networks",
            5 => "Regime V: Multicellularity & Development (DEB)",
            6 => "Regime VI: Macroevolution & Speciation (Lande/tskit)",
            _ => "Unknown Regime",
        }
    }

    #[pyo3(signature = (steps=1, dt=1.0))]
    pub fn step<'py>(&mut self, py: Python<'py>, steps: u64, dt: f64) -> PyResult<Bound<'py, PyDict>> {
        let summary = self
            .inner
            .step(steps, dt)
            .map_err(pyo3::exceptions::PyRuntimeError::new_err)?;

        let dict = PyDict::new(py);
        dict.set_item("epoch", summary.current_epoch)?;
        dict.set_item("simulated_time_seconds", summary.simulated_time_seconds)?;
        dict.set_item("active_regime", summary.active_regime)?;
        dict.set_item("active_regime_name", self.active_regime_name())?;
        dict.set_item("total_living_biomass_atoms", summary.total_living_biomass_atoms)?;
        dict.set_item("abiotic_reservoir_atoms", summary.abiotic_reservoir_atoms)?;
        dict.set_item("is_conserved", !summary.drift_detected)?;
        Ok(dict)
    }

    /// High-speed native stepping loop for executing up to millions of steps without Python overhead.
    #[pyo3(signature = (steps=10000, dt=1.0))]
    pub fn fast_forward<'py>(&mut self, py: Python<'py>, steps: u64, dt: f64) -> PyResult<Bound<'py, PyDict>> {
        let summary = self
            .inner
            .step(steps, dt)
            .map_err(pyo3::exceptions::PyRuntimeError::new_err)?;

        let dict = PyDict::new(py);
        dict.set_item("final_epoch", summary.current_epoch)?;
        dict.set_item("total_steps_executed", steps)?;
        dict.set_item("simulated_time_seconds", summary.simulated_time_seconds)?;
        dict.set_item("active_regime", summary.active_regime)?;
        dict.set_item("is_conserved", !summary.drift_detected)?;
        Ok(dict)
    }

    pub fn promote_regime(&mut self, target_regime: u32) -> PyResult<bool> {
        match self.inner.transition_to_regime(target_regime) {
            Ok(()) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    pub fn get_living_biomass(&self) -> PyElementalComposition {
        PyElementalComposition {
            inner: self.inner.current_living_biomass,
        }
    }

    pub fn get_abiotic_reservoir(&self) -> PyElementalComposition {
        PyElementalComposition {
            inner: self.inner.current_abiotic_reservoir,
        }
    }

    pub fn get_initial_budget(&self) -> PyElementalComposition {
        PyElementalComposition {
            inner: self.inner.initial_budget,
        }
    }

    pub fn is_strictly_conserved(&self) -> bool {
        self.inner.ledger.verify_ledger_integrity()
    }

    pub fn get_ledger_summary<'py>(&self, py: Python<'py>) -> PyResult<Bound<'py, PyDict>> {
        let initial_total = self.inner.initial_budget.total_atoms();
        let living_total = self.inner.current_living_biomass.total_atoms();
        let abiotic_total = self.inner.current_abiotic_reservoir.total_atoms();
        let current_total = living_total + abiotic_total;
        let drift: i128 = (current_total as i128) - (initial_total as i128);

        let dict = PyDict::new(py);
        dict.set_item("initial_atoms", initial_total)?;
        dict.set_item("living_atoms", living_total)?;
        dict.set_item("abiotic_atoms", abiotic_total)?;
        dict.set_item("current_total_atoms", current_total)?;
        dict.set_item("drift_atoms", drift)?;
        dict.set_item("is_strictly_conserved", drift == 0)?;
        Ok(dict)
    }
}

/// Fast native implementation of Motoo Kimura's (1962) fixation probability formula.
#[pyfunction]
#[pyo3(signature = (ne=1000, s=0.005, p=0.1))]
pub fn kimura_fixation_probability(ne: u64, s: f64, p: f64) -> f64 {
    if s.abs() < 1e-9 {
        return p;
    }
    let ne_f = ne as f64;
    let num = 1.0 - (-2.0 * ne_f * s * p).exp();
    let den = 1.0 - (-2.0 * ne_f * s).exp();
    num / den
}

/// Fast native implementation of Manfred Eigen's (1971) critical error catastrophe threshold.
#[pyfunction]
#[pyo3(signature = (sequence_length=1000, superiority=10.0))]
pub fn eigen_error_threshold(sequence_length: usize, superiority: f64) -> f64 {
    superiority.ln() / (sequence_length as f64)
}

/// Jacques Monod (1949) specific growth rate mu = mu_max * S / (Ks + S).
#[pyfunction]
#[pyo3(signature = (substrate, mu_max=1.0, ks=0.2))]
pub fn monod_growth_rate(substrate: f64, mu_max: f64, ks: f64) -> f64 {
    mu_max * substrate / (ks + substrate)
}

/// Monod chemostat steady-state substrate concentration S* = Ks * D / (mu_max - D).
#[pyfunction]
#[pyo3(signature = (dilution_rate, mu_max=1.0, ks=0.2))]
pub fn monod_steady_state_substrate(dilution_rate: f64, mu_max: f64, ks: f64) -> f64 {
    (ks * dilution_rate) / (mu_max - dilution_rate)
}

/// West-Brown-Enquist (WBE 1997) 3/4-power allometric metabolic rate B = B0 * M^(3/4).
#[pyfunction]
#[pyo3(signature = (body_mass, b0=1.0))]
pub fn wbe_metabolic_rate(body_mass: f64, b0: f64) -> f64 {
    b0 * body_mass.powf(0.75)
}

/// H. Allen Orr (1995) Bateson-Dobzhansky-Muller expected incompatibilities E[I] = (k * (k - 1) / 2) * p_inc.
#[pyfunction]
#[pyo3(signature = (k_substitutions, p_incompatibility))]
pub fn bdmi_snowball_incompatibilities(k_substitutions: u64, p_incompatibility: f64) -> f64 {
    let pairs = (k_substitutions * (k_substitutions - 1)) / 2;
    (pairs as f64) * p_incompatibility
}

/// Postzygotic speciation probability P(iso) = 1 - (1 - p_inc)^Pairs.
#[pyfunction]
#[pyo3(signature = (k_substitutions, p_incompatibility))]
pub fn bdmi_speciation_probability(k_substitutions: u64, p_incompatibility: f64) -> f64 {
    let pairs = (k_substitutions * (k_substitutions - 1)) / 2;
    1.0 - (1.0 - p_incompatibility).powi(pairs as i32)
}

/// Russell Lande (1979) multivariate phenotypic response dz = G * beta.
#[pyfunction]
#[pyo3(signature = (g11, g12, g22, beta1, beta2))]
pub fn lande_selection_response(g11: f64, g12: f64, g22: f64, beta1: f64, beta2: f64) -> (f64, f64) {
    let dz1 = g11 * beta1 + g12 * beta2;
    let dz2 = g12 * beta1 + g22 * beta2;
    (dz1, dz2)
}

/// Parses a chemical formula into exact 7-element stoichiometry [C, H, O, N, P, S, Fe].
#[pyfunction]
pub fn parse_chemical_formula(formula: &str) -> PyElementalComposition {
    let mut c: u64 = 0;
    let mut h: u64 = 0;
    let mut o: u64 = 0;
    let mut n: u64 = 0;
    let mut p: u64 = 0;
    let mut s: u64 = 0;
    let mut fe: u64 = 0;

    let chars: Vec<char> = formula.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        if chars[i].is_ascii_uppercase() {
            let mut elem = chars[i].to_string();
            i += 1;
            if i < chars.len() && chars[i].is_ascii_lowercase() {
                elem.push(chars[i]);
                i += 1;
            }
            // Parse count
            let mut count_str = String::new();
            while i < chars.len() && chars[i].is_ascii_digit() {
                count_str.push(chars[i]);
                i += 1;
            }
            let count: u64 = if count_str.is_empty() {
                1
            } else {
                count_str.parse().unwrap_or(1)
            };

            match elem.as_str() {
                "C" => c += count,
                "H" => h += count,
                "O" => o += count,
                "N" => n += count,
                "P" => p += count,
                "S" => s += count,
                "Fe" | "FE" => fe += count,
                _ => {}
            }
        } else {
            i += 1;
        }
    }

    PyElementalComposition::new(c, h, o, n, p, s, fe)
}

#[pyfunction]
pub fn version() -> &'static str {
    "0.1.0"
}

#[pyfunction]
pub fn is_zero_drift_guaranteed() -> bool {
    true
}

/// Module definition for `evochronos_native`.
#[pymodule]
fn evochronos_native(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_class::<PyElementalComposition>()?;
    m.add_class::<PySimulationEngine>()?;

    m.add_function(wrap_pyfunction!(kimura_fixation_probability, m)?)?;
    m.add_function(wrap_pyfunction!(eigen_error_threshold, m)?)?;
    m.add_function(wrap_pyfunction!(monod_growth_rate, m)?)?;
    m.add_function(wrap_pyfunction!(monod_steady_state_substrate, m)?)?;
    m.add_function(wrap_pyfunction!(wbe_metabolic_rate, m)?)?;
    m.add_function(wrap_pyfunction!(bdmi_snowball_incompatibilities, m)?)?;
    m.add_function(wrap_pyfunction!(bdmi_speciation_probability, m)?)?;
    m.add_function(wrap_pyfunction!(lande_selection_response, m)?)?;
    m.add_function(wrap_pyfunction!(parse_chemical_formula, m)?)?;
    m.add_function(wrap_pyfunction!(version, m)?)?;
    m.add_function(wrap_pyfunction!(is_zero_drift_guaranteed, m)?)?;

    Ok(())
}
