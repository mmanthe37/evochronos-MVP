//! Tests for Zarr tensor storage, OLAP conservation ledger, and checkpointing.

use evo_core::composition::AtomicComposition;
use evo_storage::checkpoint::SimulationCheckpoint;
use evo_storage::olap_ledger::OlapLedger;
use evo_storage::zarr_tensor::ZarrTensorStore;

#[test]
fn test_zarr_tensor_chunking() {
    let mut store = ZarrTensorStore::new(vec![10, 64, 64], vec![1, 16, 16], "float64");
    assert_eq!(store.metadata.chunks, vec![1, 16, 16]);

    let chunk_data = vec![1.23; 256]; // 1 * 16 * 16 = 256
    assert!(store.write_chunk(&[0, 2, 3], chunk_data).is_ok());

    let retrieved = store.read_chunk(&[0, 2, 3]).unwrap();
    assert_eq!(retrieved.len(), 256);
    assert_eq!(retrieved[0], 1.23);
}

#[test]
fn test_olap_ledger_exact_conservation_and_drift_detection() {
    let total = AtomicComposition::new(1000, 2000, 500, 100, 20, 10, 2);
    let mut ledger = OlapLedger::new(total);

    let living = AtomicComposition::new(100, 200, 50, 10, 2, 1, 0);
    let dissolved = AtomicComposition::new(400, 800, 200, 40, 8, 4, 1);
    let mineral = AtomicComposition::new(300, 600, 150, 30, 6, 3, 1);
    let atmosphere = AtomicComposition::new(200, 400, 100, 20, 4, 2, 0);

    let res = ledger.record_snapshot(1, 10.0, 1, living, dissolved, mineral, atmosphere);
    assert!(res.is_ok());
    assert!(ledger.verify_ledger_integrity());
    assert_eq!(ledger.current_biomass_carbon_fraction(), 0.10);
}

#[test]
fn test_checkpoint_serialization_roundtrip() {
    let total = AtomicComposition::new(1000, 2000, 500, 100, 20, 10, 2);
    let ledger = OlapLedger::new(total);
    let cp = SimulationCheckpoint::new("ckpt_001", 100, 5000.0, 3, total, ledger);

    let json = cp.to_json().unwrap();
    let deserialized = SimulationCheckpoint::from_json(&json).unwrap();
    assert_eq!(deserialized.checkpoint_id, "ckpt_001");
    assert_eq!(deserialized.current_epoch, 100);
}
