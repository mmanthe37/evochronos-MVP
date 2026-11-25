use evo_core::{assert_exact_stoichiometric_balance, DeterministicPrng, ElementalComposition, NUM_ELEMENTS};

#[test]
fn test_elemental_composition_scaling_and_accumulation() {
    let mut total = [0u128; NUM_ELEMENTS];
    let ch4 = ElementalComposition::new(1, 4, 0, 0, 0, 0, 0);
    let o2 = ElementalComposition::new(0, 0, 2, 0, 0, 0, 0);

    ch4.accumulate_into(&mut total, 500);
    o2.accumulate_into(&mut total, 1000);

    assert_eq!(total[0], 500, "Carbon count");
    assert_eq!(total[1], 2000, "Hydrogen count");
    assert_eq!(total[2], 2000, "Oxygen count");

    let co2 = ElementalComposition::new(1, 0, 2, 0, 0, 0, 0);
    let h2o = ElementalComposition::new(0, 2, 1, 0, 0, 0, 0);

    let mut product_total = [0u128; NUM_ELEMENTS];
    co2.accumulate_into(&mut product_total, 500);
    h2o.accumulate_into(&mut product_total, 1000);

    assert_exact_stoichiometric_balance(&total, &product_total)
        .expect("Combustion of methane must conserve C, H, O bit-for-bit");
}

#[test]
fn test_philox_prng_distribution_and_bounds() {
    let prng = DeterministicPrng::new(0xDEADBEEFCAFE1234);
    let mut counts = [0u32; 10];
    let n = 50_000;

    for i in 0..n {
        let u = prng.uniform_f64(i, 1);
        assert!((0.0..1.0).contains(&u));
        let bin = ((u * 10.0).floor() as usize).min(9);
        counts[bin] += 1;
    }

    // Check roughly uniform distribution (each bin ~5000)
    for (bin, &c) in counts.iter().enumerate() {
        assert!(
            c > 4500 && c < 5500,
            "Bin {} count {} should be close to 5000",
            bin,
            c
        );
    }
}
