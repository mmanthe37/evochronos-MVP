//! REST API Gateway Models & JSON Handlers.

use crate::session::SessionSummary;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub engine: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestStepRequest {
    pub steps: u64,
    pub dt: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestStepResponse {
    pub success: bool,
    pub summary: SessionSummary,
}

pub struct RestGateway;

impl RestGateway {
    pub fn health() -> HealthResponse {
        HealthResponse {
            status: "healthy".to_string(),
            version: "0.1.0".to_string(),
            engine: "EvoChronos Distributed Orchestration Platform".to_string(),
        }
    }
}
