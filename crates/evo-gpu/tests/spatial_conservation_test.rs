use evo_core::ElementalComposition;
use evo_gpu::{GpuReactionDiffusionKernel, SHADER_DIFFUSION, SHADER_REACTION, SHADER_REDUCTION};

#[test]
fn test_shader_assets_embedded() {
    assert!(!SHADER_DIFFUSION.is_empty(), "Diffusion WGSL shader must be embedded");
    assert!(!SHADER_REACTION.is_empty(), "Reaction WGSL shader must be embedded");
    assert!(!SHADER_REDUCTION.is_empty(), "Reduction WGSL shader must be embedded");
    assert!(SHADER_DIFFUSION.contains("@compute"), "Shader must contain compute entry point");
}

#[test]
fn test_gpu_lattice_exact_conservation_100_passes() {
    let formulas = vec![
        ElementalComposition::new(1, 4, 0, 0, 0, 0, 0), // CH4
        ElementalComposition::new(0, 0, 2, 0, 0, 0, 0), // O2
        ElementalComposition::new(1, 0, 2, 0, 0, 0, 0), // CO2
        ElementalComposition::new(0, 2, 1, 0, 0, 0, 0), // H2O
    ];

    let mut kernel = GpuReactionDiffusionKernel::new(32, 32, formulas);

    // Initial localized bolus
    kernel.lattice.set(16, 16, 0, 500_000);
    kernel.lattice.set(16, 16, 1, 1_000_000);

    let initial_atoms = kernel.total_elements();

    for _ in 0..100 {
        kernel.step().expect("GPU kernel step must succeed");
    }

    let final_atoms = kernel.total_elements();
    assert_eq!(
        initial_atoms, final_atoms,
        "Zero mass drift allowed across 100 spatial edge-diffusion steps"
    );

    // Verify spatial distribution expanded
    assert!(kernel.lattice.get(15, 16, 0) > 0, "Mass must diffuse to adjacent cells");
    assert!(kernel.lattice.get(16, 15, 0) > 0, "Mass must diffuse vertically");
}
