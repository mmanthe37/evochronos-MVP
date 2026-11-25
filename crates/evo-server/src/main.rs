//! EvoChronos Server CLI Entrypoint.

use evo_core::composition::AtomicComposition;
use evo_server::grpc_service::{GrpcInitRequest, GrpcStepRequest, SimulationGrpcService};
use evo_server::rest_gateway::RestGateway;

fn main() {
    println!("=================================================================");
    println!("EVOCHRONOS DISTRIBUTED SIMULATION & ORCHESTRATION SERVER v0.1.0");
    println!("=================================================================");

    let health = RestGateway::health();
    println!("Server Status: {} (Engine: {})", health.status, health.engine);

    // Initialize 10^17 planetary atomic budget fitting in u64
    let budget = AtomicComposition::new(
        10_000_000_000_000_000,
        20_000_000_000_000_000,
        5_000_000_000_000_000,
        2_000_000_000_000_000,
        100_000_000_000_000,
        50_000_000_000_000,
        10_000_000_000_000,
    );

    let grpc = SimulationGrpcService::new(budget);
    let init_resp = grpc.handle_initialize(GrpcInitRequest {
        config_yaml: "default_earth_archean.yaml".to_string(),
        random_seed: 42,
    });
    println!("Initialized Simulation Session: {}", init_resp.simulation_id);
    println!("Initial Invariant Atom Count: {}", init_resp.initial_atom_count);

    let step_resp = grpc.handle_step(GrpcStepRequest {
        simulation_id: init_resp.simulation_id,
        steps_to_advance: 10,
        delta_time_seconds: 1.0,
    }).expect("Step must succeed");

    println!("Advanced 10 steps -> Epoch: {}, Mass Conserved: {}", step_resp.current_epoch, step_resp.mass_conserved);
    println!("Living Carbon Sequestered: {} atoms", step_resp.living_carbon_atoms);
    println!("=================================================================");
}
