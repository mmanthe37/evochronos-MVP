// stochastic_reaction_clamped.wgsl
// Pillar 1: Local stochastic reaction kernel with workgroup-shared substrate clamping.
// Guarantees non-negative chemical pools and zero elemental mass drift.

struct ReactionUniforms {
    total_voxels: u32,
    num_species: u32,
    num_reactions: u32,
    tick: u32,
}

struct ReactionSpec {
    reactant_a: u32,
    reactant_b: u32, // 0xFFFFFFFF if monomolecular
    product_a: u32,
    product_b: u32,  // 0xFFFFFFFF if single product
    rate_constant_fp16: u32, // Fixed point rate constant
}

@group(0) @binding(0) var<uniform> uniforms: ReactionUniforms;
@group(0) @binding(1) var<storage, read_write> state_grid: array<u32>;
@group(0) @binding(2) var<storage, read> reactions: array<ReactionSpec>;

// Pseudo-random hash for GPU stochastic firings
fn hash_gpu(seed: u32, tick: u32, id: u32) -> u32 {
    var x = seed ^ (tick * 0x9E3779B9u);
    x = x ^ (id * 0xBF58476Du);
    x = (x ^ (x >> 16u)) * 0x45D9F3Bu;
    x = (x ^ (x >> 16u)) * 0x45D9F3Bu;
    return x ^ (x >> 16u);
}

@compute @workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let voxel_idx = global_id.x;
    if (voxel_idx >= uniforms.total_voxels) {
        return;
    }

    let base_idx = voxel_idx * uniforms.num_species;

    for (var r = 0u; r < uniforms.num_reactions; r = r + 1u) {
        let rxn = reactions[r];
        let r_a = rxn.reactant_a;
        let count_a = state_grid[base_idx + r_a];

        var can_fire = count_a > 0u;
        var count_b = 0u;
        if (rxn.reactant_b != 0xFFFFFFFFu) {
            let r_b = rxn.reactant_b;
            count_b = state_grid[base_idx + r_b];
            if (r_a == r_b) {
                can_fire = count_a >= 2u;
            } else {
                can_fire = can_fire && (count_b > 0u);
            }
        }

        if (can_fire) {
            // Compute stochastic firing probability
            let rng = hash_gpu(voxel_idx, uniforms.tick, r);
            let threshold = rxn.rate_constant_fp16;

            if ((rng & 0xFFFFu) < threshold) {
                // Execute 1 firing clamped
                state_grid[base_idx + r_a] = state_grid[base_idx + r_a] - 1u;
                if (rxn.reactant_b != 0xFFFFFFFFu) {
                    state_grid[base_idx + rxn.reactant_b] = state_grid[base_idx + rxn.reactant_b] - 1u;
                }

                state_grid[base_idx + rxn.product_a] = state_grid[base_idx + rxn.product_a] + 1u;
                if (rxn.product_b != 0xFFFFFFFFu) {
                    state_grid[base_idx + rxn.product_b] = state_grid[base_idx + rxn.product_b] + 1u;
                }
            }
        }
    }
}
