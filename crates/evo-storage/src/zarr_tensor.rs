//! Zarr Multi-Scale Tensor Array Storage Engine.
//!
//! Provides chunked, compressed, multi-dimensional array storage for spatial concentration
//! fields (T, X, Y, Z, S) and lineage morphospaces conforming to the Zarr array specification.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZarrArrayMetadata {
    pub zarr_format: u32,
    pub shape: Vec<usize>,
    pub chunks: Vec<usize>,
    pub dtype: String,
    pub order: String, // "C" (row-major) or "F" (column-major)
    pub fill_value: f64,
    pub compressor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZarrChunk {
    pub chunk_index: Vec<usize>,
    pub data: Vec<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZarrTensorStore {
    pub metadata: ZarrArrayMetadata,
    pub attributes: HashMap<String, String>,
    pub chunks: HashMap<String, Vec<f64>>, // Key format: "c.0.1.2"
}

impl ZarrTensorStore {
    pub fn new(shape: Vec<usize>, chunks: Vec<usize>, dtype: &str) -> Self {
        let metadata = ZarrArrayMetadata {
            zarr_format: 2,
            shape,
            chunks,
            dtype: dtype.to_string(),
            order: "C".to_string(),
            fill_value: 0.0,
            compressor: Some("blosc:zstd".to_string()),
        };

        Self {
            metadata,
            attributes: HashMap::new(),
            chunks: HashMap::new(),
        }
    }

    /// Formats a chunk key: e.g. [0, 1, 2] -> "0.1.2".
    pub fn chunk_key(indices: &[usize]) -> String {
        indices
            .iter()
            .map(|i| i.to_string())
            .collect::<Vec<_>>()
            .join(".")
    }

    /// Writes data to a specific chunk by chunk indices.
    pub fn write_chunk(&mut self, chunk_indices: &[usize], data: Vec<f64>) -> Result<(), &'static str> {
        let expected_size: usize = self.metadata.chunks.iter().product();
        if data.len() != expected_size {
            return Err("Chunk data length does not match specified chunk volume");
        }
        let key = Self::chunk_key(chunk_indices);
        self.chunks.insert(key, data);
        Ok(())
    }

    /// Reads data from a specific chunk.
    pub fn read_chunk(&self, chunk_indices: &[usize]) -> Option<&Vec<f64>> {
        let key = Self::chunk_key(chunk_indices);
        self.chunks.get(&key)
    }

    /// Computes total elements stored across all chunks.
    pub fn total_stored_values(&self) -> usize {
        self.chunks.values().map(|c| c.len()).sum()
    }
}
