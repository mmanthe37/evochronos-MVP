//! Protocell vesicle biophysics: lipid bilayer curvature, osmotic balance, and stochastic division.

use evo_core::{assert_exact_stoichiometric_balance, DeterministicPrng, ElementalComposition, EvoCoreError, NUM_ELEMENTS};
use evo_regime_prebiotic::ChemicalSpecies;
use serde::{Deserialize, Serialize};

/// Area per lipid headgroup in a fluid bilayer (nm^2)
pub const LIPID_HEADGROUP_AREA_NM2: f64 = 0.65;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProtocellVesicle {
    pub id: usize,
    pub radius_nm: f64,
    pub membrane_lipid_count: u64,
    pub lumen_species_counts: Vec<u64>,
    pub lipid_formula: ElementalComposition,
    pub osmotic_pressure_bar: f64,
}

impl ProtocellVesicle {
    pub fn new(
        id: usize,
        radius_nm: f64,
        lumen_species_counts: Vec<u64>,
        lipid_formula: ElementalComposition,
    ) -> Self {
        // Bilayer surface area: outer + inner leaflet = 2 * 4 * pi * R^2
        // Lipid count = 2 * (4 * pi * R^2) / area_per_headgroup
        let area_nm2 = 4.0 * std::f64::consts::PI * radius_nm * radius_nm;
        let lipid_count = ((2.0 * area_nm2) / LIPID_HEADGROUP_AREA_NM2).round() as u64;

        Self {
            id,
            radius_nm,
            membrane_lipid_count: lipid_count,
            lumen_species_counts,
            lipid_formula,
            osmotic_pressure_bar: 0.0,
        }
    }

    /// Internal volume in liters
    pub fn volume_liters(&self) -> f64 {
        // V = (4/3) * pi * R^3 in nm^3 -> 1 nm^3 = 1e-24 L
        (4.0 / 3.0) * std::f64::consts::PI * self.radius_nm.powi(3) * 1.0e-24
    }

    /// Membrane surface area in nm^2
    pub fn surface_area_nm2(&self) -> f64 {
        4.0 * std::f64::consts::PI * self.radius_nm * self.radius_nm
    }

    /// Computes total elemental composition (membrane lipids + lumen solutes)
    pub fn total_elements(&self, lumen_species: &[ChemicalSpecies]) -> [u128; NUM_ELEMENTS] {
        let mut total = [0u128; NUM_ELEMENTS];
        // 1. Membrane lipids
        self.lipid_formula.accumulate_into(&mut total, self.membrane_lipid_count);

        // 2. Lumen solutes
        for (idx, &count) in self.lumen_species_counts.iter().enumerate() {
            if idx < lumen_species.len() {
                lumen_species[idx].formula.accumulate_into(&mut total, count);
            }
        }
        total
    }

    /// Incorporates free lipid monomers from surrounding environment into vesicle bilayer.
    /// Increases surface area and adjusts radius accordingly.
    pub fn incorporate_lipids(&mut self, additional_lipids: u64) {
        self.membrane_lipid_count += additional_lipids;
        let total_area_nm2 = (self.membrane_lipid_count as f64 * LIPID_HEADGROUP_AREA_NM2) / 2.0;
        self.radius_nm = (total_area_nm2 / (4.0 * std::f64::consts::PI)).sqrt();
    }

    /// Evaluates whether the vesicle has doubled its membrane area and is ready to divide
    pub fn is_ready_to_divide(&self, baseline_lipid_count: u64) -> bool {
        self.membrane_lipid_count >= 2 * baseline_lipid_count
    }

    /// Divides the vesicle into two daughter vesicles via stochastic binomial partitioning.
    /// Strictly guarantees exact elemental mass conservation between mother and daughters.
    pub fn divide_stochastically(
        &mut self,
        daughter_id: usize,
        prng: &DeterministicPrng,
        tick: u64,
        lumen_species: &[ChemicalSpecies],
    ) -> Result<ProtocellVesicle, EvoCoreError> {
        let mother_initial_atoms = self.total_elements(lumen_species);

        // 1. Partition lipids: exactly half to each daughter (handling odd counts)
        let daughter_lipids = self.membrane_lipid_count / 2;
        self.membrane_lipid_count -= daughter_lipids;

        // Recalculate mother radius
        let mother_area_nm2 = (self.membrane_lipid_count as f64 * LIPID_HEADGROUP_AREA_NM2) / 2.0;
        self.radius_nm = (mother_area_nm2 / (4.0 * std::f64::consts::PI)).sqrt();

        // 2. Partition lumen molecules binomially (~p=0.5)
        let mut daughter_lumen = vec![0u64; self.lumen_species_counts.len()];

        for (i, count) in self.lumen_species_counts.iter_mut().enumerate() {
            let total_molecules = *count;
            if total_molecules == 0 {
                continue;
            }

            // Sample daughter fraction
            let stream_id = (i as u64).wrapping_add(0x42);
            let daughter_share = if total_molecules < 50 {
                // Exact coin flips for small counts
                let mut d_count = 0u64;
                for k in 0..total_molecules {
                    let u = prng.uniform_f64(tick, stream_id.wrapping_add(k * 13));
                    if u < 0.5 {
                        d_count += 1;
                    }
                }
                d_count
            } else {
                // Gaussian approximation to binomial B(N, 0.5)
                let mean = (total_molecules as f64) * 0.5;
                let std = (total_molecules as f64 * 0.25).sqrt();
                let g = prng.gaussian(mean, std, tick, stream_id);
                (g.round().clamp(0.0, total_molecules as f64)) as u64
            };

            daughter_lumen[i] = daughter_share;
            *count = total_molecules - daughter_share;
        }

        let daughter_area_nm2 = (daughter_lipids as f64 * LIPID_HEADGROUP_AREA_NM2) / 2.0;
        let daughter_radius = (daughter_area_nm2 / (4.0 * std::f64::consts::PI)).sqrt();

        let daughter = ProtocellVesicle {
            id: daughter_id,
            radius_nm: daughter_radius,
            membrane_lipid_count: daughter_lipids,
            lumen_species_counts: daughter_lumen,
            lipid_formula: self.lipid_formula,
            osmotic_pressure_bar: self.osmotic_pressure_bar,
        };

        // Assert mass conservation: Mother_before == Mother_after + Daughter
        let mother_final_atoms = self.total_elements(lumen_species);
        let daughter_atoms = daughter.total_elements(lumen_species);

        let mut combined_atoms = [0u128; NUM_ELEMENTS];
        for k in 0..NUM_ELEMENTS {
            combined_atoms[k] = mother_final_atoms[k] + daughter_atoms[k];
        }

        assert_exact_stoichiometric_balance(&mother_initial_atoms, &combined_atoms)?;

        Ok(daughter)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vesicle_division_mass_conservation() {
        // Oleic acid lipid: C18 H34 O2
        let oleic_acid = ElementalComposition::new(18, 34, 2, 0, 0, 0, 0);
        // Encapsulated RNA monomer AMP: C10 H14 N5 O7 P
        let lumen_species = vec![ChemicalSpecies::new(
            0,
            "AMP",
            ElementalComposition::new(10, 14, 7, 5, 1, 0, 0),
            -1000.0,
            false,
        )];

        let mut mother = ProtocellVesicle::new(1, 20.0, vec![5000], oleic_acid);
        let initial_lipids = mother.membrane_lipid_count;

        // Incorporate lipids to double size
        mother.incorporate_lipids(initial_lipids);
        assert!(mother.is_ready_to_divide(initial_lipids));

        let prng = DeterministicPrng::new(777);
        let daughter = mother
            .divide_stochastically(2, &prng, 100, &lumen_species)
            .expect("Division must succeed and conserve mass");

        assert_eq!(
            mother.membrane_lipid_count + daughter.membrane_lipid_count,
            2 * initial_lipids
        );
        assert_eq!(
            mother.lumen_species_counts[0] + daughter.lumen_species_counts[0],
            5000
        );
    }
}
