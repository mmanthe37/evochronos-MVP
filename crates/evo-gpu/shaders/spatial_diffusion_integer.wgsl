// spatial_diffusion_integer.wgsl
// Pillar 1: Stoichiometrically exact integer-lattice spatial diffusion shader.
// Eliminates floating-point IEEE-754 drift by evaluating antisymmetric edge fluxes
// on a 2D checkerboard stencil.

struct Uniforms {
    width: u32,
    height: u32,
    num_species: u32,
    pass_parity: u32, // 0: Horizontal East-West pairs, 1: Vertical North-South pairs
    diff_rate_fp8: u32, // Fixed-point diffusion multiplier: (D * dt / dx^2) * 256
}

@group(0) @binding(0) var<uniform> params: Uniforms;
@group(0) @binding(1) var<storage, read> state_in: array<u32>;
@group(0) @binding(2) var<storage, read_write> state_out: array<u32>;

fn get_index(x: u32, y: u32, s: u32) -> u32 {
    return (y * params.width + x) * params.num_species + s;
}

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;

    if (x >= params.width || y >= params.height) {
        return;
    }

    // Directional pair stencil to prevent race conditions during pairwise flux updates
    // pass_parity == 0: Even columns trade with East neighbor (x, x+1)
    // pass_parity == 1: Odd columns trade with East neighbor (x, x+1)
    // pass_parity == 2: Even rows trade with South neighbor (y, y+1)
    // pass_parity == 3: Odd rows trade with South neighbor (y, y+1)

    for (var s = 0u; s < params.num_species; s = s + 1u) {
        let idx = get_index(x, y, s);
        var current_val = state_in[idx];

        if (params.pass_parity == 0u || params.pass_parity == 1u) {
            let is_active_pair_origin = (x % 2u) == params.pass_parity;
            if (is_active_pair_origin && (x + 1u) < params.width) {
                let neighbor_idx = get_index(x + 1u, y, s);
                let neighbor_val = state_in[neighbor_idx];

                // Compute integer flux J = (current - neighbor) * rate / 256
                var flux: i32 = 0;
                if (current_val > neighbor_val) {
                    let diff = i32(current_val - neighbor_val);
                    flux = (diff * i32(params.diff_rate_fp8)) / 256;
                    // Clamp to maximum 1/4 of available to prevent oscillation
                    let max_flux = i32(current_val / 4u);
                    flux = min(flux, max_flux);
                } else if (neighbor_val > current_val) {
                    let diff = i32(neighbor_val - current_val);
                    let neg_flux = (diff * i32(params.diff_rate_fp8)) / 256;
                    let max_flux = i32(neighbor_val / 4u);
                    flux = -min(neg_flux, max_flux);
                }

                // Bit-exact conserved update: subtracted from origin, added to neighbor
                state_out[idx] = u32(i32(current_val) - flux);
                state_out[neighbor_idx] = u32(i32(neighbor_val) + flux);
            } else if (!is_active_pair_origin && x == 0u) {
                // Leftmost boundary when not part of active pair
                state_out[idx] = current_val;
            } else if (!is_active_pair_origin && x == (params.width - 1u)) {
                // Rightmost boundary when not part of active pair
                state_out[idx] = current_val;
            }
        } else {
            // Vertical pass
            let vertical_parity = params.pass_parity - 2u;
            let is_active_pair_origin = (y % 2u) == vertical_parity;
            if (is_active_pair_origin && (y + 1u) < params.height) {
                let neighbor_idx = get_index(x, y + 1u, s);
                let neighbor_val = state_in[neighbor_idx];

                var flux: i32 = 0;
                if (current_val > neighbor_val) {
                    let diff = i32(current_val - neighbor_val);
                    flux = (diff * i32(params.diff_rate_fp8)) / 256;
                    let max_flux = i32(current_val / 4u);
                    flux = min(flux, max_flux);
                } else if (neighbor_val > current_val) {
                    let diff = i32(neighbor_val - current_val);
                    let neg_flux = (diff * i32(params.diff_rate_fp8)) / 256;
                    let max_flux = i32(neighbor_val / 4u);
                    flux = -min(neg_flux, max_flux);
                }

                state_out[idx] = u32(i32(current_val) - flux);
                state_out[neighbor_idx] = u32(i32(neighbor_val) + flux);
            } else if (!is_active_pair_origin && y == 0u) {
                state_out[idx] = current_val;
            } else if (!is_active_pair_origin && y == (params.height - 1u)) {
                state_out[idx] = current_val;
            }
        }
    }
}
