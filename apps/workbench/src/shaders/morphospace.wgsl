// WebGPU WGSL 3D Phenotypic Morphospace & Lande G-Matrix Ellipsoid Shader

struct Uniforms {
    view_proj: mat4x4<f32>,
    theta_optimum: vec3<f32>,
    time: f32,
    g_matrix_col0: vec3<f32>,
    g_matrix_col1: vec3<f32>,
    g_matrix_col2: vec3<f32>,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) world_pos: vec3<f32>,
    @location(1) normal: vec3<f32>,
};

@vertex
fn vs_morphospace(input: VertexInput) -> VertexOutput {
    var out: VertexOutput;

    // Transform unit sphere by G-matrix sqrt to form covariance ellipsoid:
    let transformed_pos = input.position.x * u.g_matrix_col0
                        + input.position.y * u.g_matrix_col1
                        + input.position.z * u.g_matrix_col2;

    out.world_pos = transformed_pos;
    out.clip_position = u.view_proj * vec4<f32>(transformed_pos, 1.0);
    out.normal = input.normal;
    return out;
}

@fragment
fn fs_morphospace(in: VertexOutput) -> @location(0) vec4<f32> {
    let light_dir = normalize(vec3<f32>(1.0, 2.0, 1.5));
    let diff = max(dot(normalize(in.normal), light_dir), 0.2);

    // Color gradient based on distance to adaptive optimum theta
    let dist_to_theta = length(in.world_pos - u.theta_optimum);
    let fitness_color = mix(
        vec3<f32>(0.2, 0.8, 0.4), // Peak fitness (Green)
        vec3<f32>(0.9, 0.3, 0.2), // Low fitness (Crimson)
        clamp(dist_to_theta * 0.3, 0.0, 1.0)
    );

    return vec4<f32>(fitness_color * diff, 0.85);
}
