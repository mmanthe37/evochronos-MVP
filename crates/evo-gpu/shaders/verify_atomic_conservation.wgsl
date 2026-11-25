// verify_atomic_conservation.wgsl
// Pillar 1: Parallel tree-reduction compute shader that sums total 7-element composition
// across all GPU voxels into a staging buffer, asserting zero mass drift.

struct ReductionUniforms {
    total_voxels: u32,
    num_species: u32,
}

struct SpeciesFormula {
    atoms: array<u32, 7>, // C, H, O, N, P, S, Fe
    _padding: u32,
}

@group(0) @binding(0) var<uniform> uniforms: ReductionUniforms;
@group(0) @binding(1) var<storage, read> state_grid: array<u32>; // [voxel_idx * num_species + species_idx]
@group(0) @binding(2) var<storage, read> formulas: array<SpeciesFormula>;
@group(0) @binding(3) var<storage, read_write> partial_sums: array<u32>; // [workgroup_id * 7 + element_idx]

var<workgroup> local_atoms: array<array<u32, 7>, 64>; // 64 threads per workgroup

@compute @workgroup_size(64, 1, 1)
fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>,
    @builtin(local_invocation_id) local_id: vec3<u32>,
    @builtin(workgroup_id) group_id: vec3<u32>
) {
    let voxel_idx = global_id.x;
    let tid = local_id.x;

    // Initialize local workgroup accumulator
    for (var e = 0u; e < 7u; e = e + 1u) {
        local_atoms[tid][e] = 0u;
    }

    if (voxel_idx < uniforms.total_voxels) {
        let base_idx = voxel_idx * uniforms.num_species;
        for (var s = 0u; s < uniforms.num_species; s = s + 1u) {
            let count = state_grid[base_idx + s];
            if (count > 0u) {
                let formula = formulas[s];
                for (var e = 0u; e < 7u; e = e + 1u) {
                    local_atoms[tid][e] = local_atoms[tid][e] + count * formula.atoms[e];
                }
            }
        }
    }

    workgroupBarrier();

    // In-workgroup tree reduction
    var stride = 32u;
    while (stride > 0u) {
        if (tid < stride) {
            for (var e = 0u; e < 7u; e = e + 1u) {
                local_atoms[tid][e] = local_atoms[tid][e] + local_atoms[tid + stride][e];
            }
        }
        workgroupBarrier();
        stride = stride / 2u;
    }

    // Thread 0 writes the workgroup's 7-element total
    if (tid == 0u) {
        let out_base = group_id.x * 7u;
        for (var e = 0u; e < 7u; e = e + 1u) {
            partial_sums[out_base + e] = local_atoms[0][e];
        }
    }
}
