//! Exact Gillespie Stochastic Simulation Algorithm (Direct Method)
//! Guarantees exact discrete trajectory sampling with bit-exact mass conservation.

use crate::compartment::PrebioticCompartment;
use evo_core::{assert_exact_stoichiometric_balance, DeterministicPrng, EvoCoreError};

pub struct GillespieSimulator;

impl GillespieSimulator {
    /// Steps the prebiotic compartment forward using exact Gillespie Direct Method.
    /// Returns the elapsed time dt in seconds and the index of the fired reaction (if any).
    pub fn step(
        compartment: &mut PrebioticCompartment,
        tick: u64,
        prng: &DeterministicPrng,
    ) -> Result<(f64, Option<usize>), EvoCoreError> {
        let initial_elements = compartment.total_elements();

        // 1. Calculate propensities
        let mut propensities = Vec::with_capacity(compartment.reactions.len());
        let mut a0 = 0.0;

        for rxn in &compartment.reactions {
            let a_j = rxn.calculate_propensity(
                &compartment.counts,
                compartment.volume_liters,
                compartment.temperature_kelvin,
            );
            propensities.push(a_j);
            a0 += a_j;
        }

        if a0 <= 0.0 {
            // No reactions can fire (absorbing equilibrium)
            return Ok((0.0, None));
        }

        // 2. Sample waiting time tau ~ Exponential(a0)
        let r1 = prng.uniform_f64(tick, 0x1A2B3C4D).max(1e-15);
        let dt = -r1.ln() / a0;

        // 3. Sample reaction index mu with probability a_mu / a0
        let r2 = prng.uniform_f64(tick, 0x5E6F7A8B) * a0;
        let mut accum = 0.0;
        let mut selected_rxn = 0;

        for (idx, &a_j) in propensities.iter().enumerate() {
            accum += a_j;
            if accum >= r2 {
                selected_rxn = idx;
                break;
            }
        }

        // 4. Fire reaction
        let rxn = &compartment.reactions[selected_rxn];

        // Verify reactant availability
        for &(r_id, coeff) in &rxn.reactants {
            if compartment.counts[r_id] < coeff as u64 {
                // Should not happen if propensity was > 0
                return Ok((dt, None));
            }
        }

        // Apply state change
        for &(r_id, coeff) in &rxn.reactants {
            compartment.counts[r_id] -= coeff as u64;
        }
        for &(p_id, coeff) in &rxn.products {
            compartment.counts[p_id] += coeff as u64;
        }

        // 5. Assert strict stoichiometric invariance
        let final_elements = compartment.total_elements();
        assert_exact_stoichiometric_balance(&initial_elements, &final_elements)?;

        Ok((dt, Some(selected_rxn)))
    }

    /// Simulates until target time is reached or no reactions can proceed
    pub fn simulate_until(
        compartment: &mut PrebioticCompartment,
        target_time_sec: f64,
        start_tick: u64,
        prng: &DeterministicPrng,
    ) -> Result<u64, EvoCoreError> {
        let mut elapsed = 0.0;
        let mut tick = start_tick;

        while elapsed < target_time_sec {
            let (dt, fired) = Self::step(compartment, tick, prng)?;
            if fired.is_none() || dt <= 0.0 {
                break;
            }
            elapsed += dt;
            tick += 1;
        }

        Ok(tick - start_tick)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use evo_core::ElementalComposition;
    use crate::reaction::PrebioticReaction;

    #[test]
    fn test_gillespie_mass_conservation() {
        let mut comp = PrebioticCompartment::new(343.15, 1e-15, 8.5);
        // HCN + H2O -> HCONH2 (formamide)
        let hcn = comp.add_species("HCN", ElementalComposition::new(1, 1, 0, 1, 0, 0, 0), 124.7, true, 1000);
        let h2o = comp.add_species("H2O", ElementalComposition::new(0, 2, 1, 0, 0, 0, 0), -237.13, true, 2000);
        let formamide = comp.add_species("HCONH2", ElementalComposition::new(1, 3, 1, 1, 0, 0, 0), -143.0, false, 0);

        comp.add_reaction(PrebioticReaction::new(
            0,
            "HCN_hydration",
            vec![(hcn, 1), (h2o, 1)],
            vec![(formamide, 1)],
            vec![],
            45.0,
        )).unwrap();

        let initial_atoms = comp.total_elements();
        let prng = DeterministicPrng::new(12345);

        for tick in 0..100 {
            let (_dt, fired) = GillespieSimulator::step(&mut comp, tick, &prng).unwrap();
            if fired.is_none() {
                break;
            }
        }

        assert_eq!(comp.total_elements(), initial_atoms, "Gillespie steps must strictly conserve mass");
        assert!(comp.counts[formamide] > 0, "Formamide should have been produced");
    }
}
