//! Hordijk-Steel Reflexively Autocatalytic and Food-generated (RAF) Set Detection Engine.
//! Identifies emergent catalytic phase transitions that trigger Regime II promotion.

use crate::compartment::PrebioticCompartment;

pub struct RafDetector;

impl RafDetector {
    /// Computes the closure of the food set under a given reaction subset.
    /// Returns a boolean mask of species that can be produced from food molecules alone.
    pub fn compute_food_closure(
        compartment: &PrebioticCompartment,
        active_reactions: &[usize],
    ) -> Vec<bool> {
        let mut available: Vec<bool> = compartment.species.iter().map(|s| s.is_food_set).collect();
        let mut changed = true;

        while changed {
            changed = false;
            for &rxn_idx in active_reactions {
                let rxn = &compartment.reactions[rxn_idx];
                // Check if all reactants are available in current closure
                let reactants_available = rxn
                    .reactants
                    .iter()
                    .all(|&(r_id, _)| available[r_id]);

                if reactants_available {
                    for &(p_id, _) in &rxn.products {
                        if !available[p_id] {
                            available[p_id] = true;
                            changed = true;
                        }
                    }
                }
            }
        }

        available
    }

    /// Finds the maximal RAF set (maxRAF) within the compartment's reaction network.
    /// Returns the indices of reactions belonging to the maxRAF, or None if no RAF exists.
    pub fn find_max_raf(compartment: &PrebioticCompartment) -> Option<Vec<usize>> {
        let mut active_rxns: Vec<usize> = (0..compartment.reactions.len()).collect();
        let mut changed = true;

        while changed {
            changed = false;
            let available_species = Self::compute_food_closure(compartment, &active_rxns);

            let prev_count = active_rxns.len();
            active_rxns.retain(|&r_idx| {
                let rxn = &compartment.reactions[r_idx];

                // 1. Food-generated requirement: All reactants must be in closure
                let reactants_ok = rxn
                    .reactants
                    .iter()
                    .all(|&(sp, _)| available_species[sp]);

                // 2. Reflexively autocatalytic requirement: At least one catalyst in closure
                let catalyst_ok = if rxn.catalysts.is_empty() {
                    // Uncatalyzed reactions don't satisfy autocatalytic self-sustainment
                    false
                } else {
                    rxn.catalysts
                        .iter()
                        .any(|&(cat, _)| available_species[cat])
                };

                reactants_ok && catalyst_ok
            });

            if active_rxns.len() != prev_count {
                changed = true;
            }
        }

        if active_rxns.is_empty() {
            None
        } else {
            Some(active_rxns)
        }
    }

    /// Evaluates whether an emergent self-sustaining autocatalytic network has formed.
    /// This is the non-teleological mathematical trigger for Regime I -> II handoff.
    pub fn is_autocatalytic_closure_achieved(compartment: &PrebioticCompartment) -> bool {
        match Self::find_max_raf(compartment) {
            Some(raf_rxns) => {
                // Must contain at least 2 coupled reactions with non-zero molecular populations
                if raf_rxns.len() < 2 {
                    return false;
                }
                // Verify that products of the RAF are currently present in positive counts
                let closure = Self::compute_food_closure(compartment, &raf_rxns);
                let non_food_raf_species_active = compartment
                    .species
                    .iter()
                    .enumerate()
                    .any(|(id, sp)| !sp.is_food_set && closure[id] && compartment.counts[id] > 10);
                non_food_raf_species_active
            }
            None => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use evo_core::ElementalComposition;
    use crate::reaction::PrebioticReaction;

    #[test]
    fn test_raf_set_detection() {
        let mut comp = PrebioticCompartment::new(343.15, 1e-15, 7.0);

        // Species: Food A, Food B, Product X, Product Y
        let sp_a = comp.add_species("A", ElementalComposition::new(1, 0, 0, 0, 0, 0, 0), 0.0, true, 1000);
        let sp_b = comp.add_species("B", ElementalComposition::new(1, 0, 0, 0, 0, 0, 0), 0.0, true, 1000);
        let sp_x = comp.add_species("X", ElementalComposition::new(1, 0, 0, 0, 0, 0, 0), 0.0, false, 10);
        let sp_y = comp.add_species("Y", ElementalComposition::new(1, 0, 0, 0, 0, 0, 0), 0.0, false, 10);

        // Reaction 1: A -> X, catalyzed by Y
        comp.add_reaction(PrebioticReaction::new(
            0,
            "R1",
            vec![(sp_a, 1)],
            vec![(sp_x, 1)],
            vec![(sp_y, 10.0)],
            20.0,
        )).unwrap();

        // Reaction 2: B -> Y, catalyzed by X
        comp.add_reaction(PrebioticReaction::new(
            1,
            "R2",
            vec![(sp_b, 1)],
            vec![(sp_y, 1)],
            vec![(sp_x, 10.0)],
            20.0,
        )).unwrap();

        let raf = RafDetector::find_max_raf(&comp);
        assert!(raf.is_some(), "Mutually catalytic pair (X catalyzed by Y, Y catalyzed by X) must form a valid RAF set");
        let raf_rxns = raf.unwrap();
        assert_eq!(raf_rxns.len(), 2);
    }
}
