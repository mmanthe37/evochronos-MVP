//! Fundamental physical, chemical, and biological constants for EvoChronos.

/// Avogadro constant N_A in particles / mol
pub const AVOGADRO: f64 = 6.02214076e23;

/// Universal gas constant R in J / (mol * K)
pub const GAS_CONSTANT_R_J: f64 = 8.314462618;

/// Universal gas constant R in kJ / (mol * K)
pub const GAS_CONSTANT_R_KJ: f64 = 0.008314462618;

/// Boltzmann constant k_B in J / K
pub const BOLTZMANN_K: f64 = 1.380649e-23;

/// Planck constant h in J * s
pub const PLANCK_H: f64 = 6.62607015e-34;

/// Faraday constant F in C / mol
pub const FARADAY_F: f64 = 96485.33212;

/// Standard laboratory temperature (25 °C) in Kelvin
pub const STANDARD_TEMP_K: f64 = 298.15;

/// Standard atmospheric pressure in Pascals
pub const STANDARD_PRESSURE_PA: f64 = 101325.0;

// Archean / Hydrothermal Vent Boundary Defaults
/// Estimated Archean surface ocean temperature in Kelvin (~45-55 °C)
pub const ARCHEAN_OCEAN_TEMP_K: f64 = 323.15;

/// Alkaline hydrothermal vent serpentinization fluid temperature (~60-80 °C)
pub const ALKALINE_VENT_FLUID_TEMP_K: f64 = 343.15;

/// Ambient Archean ocean pH (acidic due to high atmospheric CO2)
pub const ARCHEAN_OCEAN_PH: f64 = 6.0;

/// Alkaline hydrothermal vent pore fluid pH (rich in hydroxide ions)
pub const ALKALINE_VENT_PH: f64 = 9.5;

/// Resulting natural proton gradient across inorganic FeS/NiS chimney pores (pH units)
pub const NATURAL_PROTON_GRADIENT_DELTAPH: f64 = ALKALINE_VENT_PH - ARCHEAN_OCEAN_PH;

// Biological & Biophysical Scaling Anchors
/// Oxygen diffusion coefficient in water/cytoplasm at 37 °C in m^2 / s
pub const O2_DIFFUSION_COEFF_M2_S: f64 = 2.0e-9;

/// Approximate average molar mass of a DNA base pair in Daltons (g/mol)
pub const DNA_BASE_PAIR_MASS_DA: f64 = 618.0;

/// Approximate average molar mass of an amino acid residue in Daltons (g/mol)
pub const AMINO_ACID_RESIDUE_MASS_DA: f64 = 110.0;

/// Kleiber / West-Brown-Enquist (WBE) fractal vascular allometric scaling exponent (3/4)
pub const WBE_ALLOMETRIC_EXPONENT: f64 = 0.75;

/// Euclidean surface-area-to-volume allometric scaling exponent (2/3)
pub const SURFACE_VOLUME_ALLOMETRIC_EXPONENT: f64 = 2.0 / 3.0;

/// Computes the thermal energy scale RT in kJ / mol
#[inline]
pub fn thermal_energy_rt_kj(temperature_kelvin: f64) -> f64 {
    GAS_CONSTANT_R_KJ * temperature_kelvin
}

/// Computes Eyring transition-state rate constant pre-factor (k_B * T / h) in s^-1
#[inline]
pub fn eyring_prefactor(temperature_kelvin: f64) -> f64 {
    (BOLTZMANN_K * temperature_kelvin) / PLANCK_H
}
