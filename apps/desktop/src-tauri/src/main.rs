//! EvoChronos Native Desktop Workstation Entrypoint (Tauri 2.0).

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use evo_core::composition::AtomicComposition;
use evo_server::grpc_service::{GrpcInitRequest, GrpcStepRequest, SimulationGrpcService};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

struct AppState {
    grpc_service: Mutex<SimulationGrpcService>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DesktopStatus {
    is_ready: bool,
    native_backend: String,
    threads_available: usize,
}

#[tauri::command]
fn get_system_status() -> DesktopStatus {
    DesktopStatus {
        is_ready: true,
        native_backend: "Vulkan / Metal Hardware Acceleration".to_string(),
        threads_available: std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(4),
    }
}

#[tauri::command]
fn get_simulation_summary(state: tauri::State<AppState>) -> Result<serde_json::Value, String> {
    let service = state.grpc_service.lock().map_err(|e| e.to_string())?;
    let resp = service.handle_initialize(GrpcInitRequest {
        config_yaml: "default_archean.yaml".to_string(),
        random_seed: 42,
    });
    Ok(serde_json::json!({
        "simulation_id": resp.simulation_id,
        "success": resp.success,
        "active_regime": resp.active_regime,
        "initial_atom_count": resp.initial_atom_count,
    }))
}

#[tauri::command]
fn step_simulation(state: tauri::State<AppState>, steps: u64, dt: f64) -> Result<serde_json::Value, String> {
    let service = state.grpc_service.lock().map_err(|e| e.to_string())?;
    let resp = service.handle_step(GrpcStepRequest {
        simulation_id: "sim_primary_session".to_string(),
        steps_to_advance: steps,
        delta_time_seconds: dt,
    })?;
    Ok(serde_json::json!({
        "current_epoch": resp.current_epoch,
        "simulated_time_seconds": resp.simulated_time_seconds,
        "active_regime": resp.active_regime,
        "mass_conserved": resp.mass_conserved,
        "living_carbon_atoms": resp.living_carbon_atoms,
    }))
}

fn main() {
    let budget = AtomicComposition::new(
        100_000_000_000,
        200_000_000_000,
        50_000_000_000,
        20_000_000_000,
        1_000_000_000,
        500_000_000,
        100_000_000,
    );

    let state = AppState {
        grpc_service: Mutex::new(SimulationGrpcService::new(budget)),
    };

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            get_system_status,
            get_simulation_summary,
            step_simulation
        ])
        .run(tauri::generate_context!())
        .expect("error while running EvoChronos desktop application");
}
