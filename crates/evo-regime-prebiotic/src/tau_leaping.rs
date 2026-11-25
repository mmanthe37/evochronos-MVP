//! Adaptive Tau-Leaping Solver with Non-Negative Substrate Clamping and Mass Balance Assertions.

use crate::compartment::PrebioticCompartment;
use evo_core::{assert_exact_stoichiometric_balance, DeterministicPrng, EvoCoreError};

pub struct TauLeapingSimulator;

impl TauLeapingSimulator {
    /// Steps the compartment forward over a specified time window tau_sec.
    /// Uses Poisson-sampled reaction firings clamped to ensure non-negative substrate pools
    /// while strictly maintaining exact elemental mass conservation.
    pub fn step(
        compartment: &mut PrebioticCompartment,
        tau_sec: f64,
        tick: u64,
        prng: &DeterministicPrng,
    ) -> Result<u64, EvoCoreError> {
        let initial_elements = compartment.total_elements();
        let num_species = compartment.species.len();
        let mut delta_counts = vec![0i64; num_species];
        let mut total_firings = 0u64;

        // Track consumed molecules per species to ensure non-negative pools during concurrent leaps
        let mut remaining_counts = compartment.counts.clone();

        for (rxn_idx, rxn) in compartment.reactions.iter().enumerate() {
            // Thermodynamic filter: do not permit uncoupled endergonic reactions with high activation
            let dg = rxn.delta_g_standard_kj(&compartment.species);
            if dg > 60.0 {
                continue;
            }

            let propensity = rxn.calculate_propensity(
                &compartment.counts,
                compartment.volume_liters,
                compartment.temperature_kelvin,
            );

            if propensity <= 0.0 {
                continue;
            }

            // Expected firings via Poisson distribution
            let expected_lambda = propensity * tau_sec;
            let stream_id = (rxn_idx as u64).wrapping_mul(0x9E3779B97F4A7C15);
            let raw_firings = prng.poisson(expected_lambda, tick, stream_id);

            if raw_firings == 0 {
                continue;
            }

            // Bound firings by available substrate in remaining_counts
            let mut clamped_firings = raw_firings;
            for &(r_id, coeff) in &rxn.reactants {
                let needed_per_firing = coeff as u64;
                if let Some(max_for_substrate) = remaining_counts[r_id].checked_div(needed_per_firing) {
                    clamped_firings = clamped_firings.min(max_for_substrate);
                }
            }

            if clamped_firings == 0 {
                continue;
            }

            // Apply to remaining counts to prevent cross-reaction overdraft
            for &(r_id, coeff) in &rxn.reactants {
                remaining_counts[r_id] -= clamped_firings * (coeff as u64);
                delta_counts[r_id] -= (clamped_firings * (coeff as u64)) as i64;
            }
            for &(p_id, coeff) in &rxn.products {
                delta_counts[p_id] += (clamped_firings * (coeff as u64)) as i64;
            }

            total_firings += clamped_firings;
        }

        // Apply net deltas to compartment state
        for (i, &delta) in delta_counts.iter().enumerate() {
            let updated = (compartment.counts[i] as i64) + delta;
            assert!(
                updated >= 0,
                "Negative species count encountered after clamped tau-leaping"
            );
            compartment.counts[i] = updated as u64;
        }

        // Assert absolute conservation of elemental stoichiometry
        let final_elements = compartment.total_elements();
        assert_exact_stoichiometric_balance(&initial_elements, &final_elements)?;

        Ok(total_firings)
    }

    /// Computes adaptive tau step using Gillespie-Petzold relative change criteria
    pub fn compute_adaptive_tau(
        compartment: &PrebioticCompartment,
        epsilon: f64,
        min_tau: f64,
        max_tau: f64,
    ) -> f64 {
        let mut min_step = max_tau;

        for rxn in &compartment.reactions {
            let a = rxn.calculate_propensity(
                &compartment.counts,
                compartment.volume_liters,
                compartment.temperature_kelvin,
            );
            if a <= 1e-12 {
                continue;
            }

            for &(r_id, coeff) in &rxn.reactants {
                let x = compartment.counts[r_id] as f64;
                if x > 0.0 {
                    let allowed_change = (epsilon * x).max(1.0);
                    let tau_cand = allowed_change / (a * (coeff as f64));
                    min_step = min_step.min(tau_cand);
                }
            }
        }

        min_step.clamp(min_tau, max_tau)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use evo_core::ElementalComposition;
    use crate::reaction::PrebioticReaction;

    #[test]
    fn test_tau_leaping_conservation() {
        let mut comp = PrebioticCompartment::new(343.15, 1e-12, 8.5);
        // Formose reaction step: 2 CH2O (formaldehyde) -> C2H4O2 (glycolaldehyde)
        let ch2o = comp.add_species("CH2O", ElementalComposition::new(1, 2, 1, 0, 0, 0, 0), -109.9, true, 100_000);
        let c2h4o2 = comp.add_species("C2H4O2", ElementalComposition::new(2, 4, 2, 0, 0, 0, 0), -285.0, false, 0);

        comp.add_reaction(PrebioticReaction::new(
            0,
            "Formaldehyde_dimerization",
            vec![(ch2o, 2)],
            vec![(c2h4o2, 1)],
            vec![],
            35.0,
        )).unwrap();

        let initial_atoms = comp.total_elements();
        let prng = DeterministicPrng::new(999);

        for tick in 0..50 {
            TauLeapingSimulator::step(&mut comp, 0.01, tick, &prng).unwrap();
        }

        assert_eq!(comp.total_elements(), initial_atoms, "Tau-leaping must preserve total elements exactly");
        assert!(comp.counts[c2h4o2] > 0, "Dimer must be produced");
    }
}
