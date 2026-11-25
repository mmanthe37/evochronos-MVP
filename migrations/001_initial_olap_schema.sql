-- 001_initial_olap_schema.sql
-- DuckDB / Apache Parquet Columnar Schema for EvoChronos Lineages & Invariant Audits

CREATE TABLE IF NOT EXISTS evolutionary_lineages (
    experiment_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    tick UBIGINT NOT NULL,
    simulated_time_years DOUBLE NOT NULL,
    regime UTINYINT NOT NULL,
    clade_id VARCHAR NOT NULL,
    parent_clade_id VARCHAR,
    taxonomic_path VARCHAR[],             -- e.g., ['LUCA', 'Bacteria', 'Cyanobacteria', 'Clade_409']
    metabolic_guild VARCHAR NOT NULL,     -- e.g., 'Hydrogenotrophic_Methanogen', 'Oxygenic_Phototroph'
    biome_id UINTEGER NOT NULL,
    population_size DOUBLE NOT NULL,
    effective_pop_size_ne DOUBLE NOT NULL,
    mean_genome_length_bp UINTEGER NOT NULL,
    shannon_allelic_diversity DOUBLE NOT NULL,
    atp_flux_mol_cell_sec DOUBLE NOT NULL,
    trait_vector DOUBLE[],                -- Quantitative phenotypic vector z_bar
    zarr_tensor_chunk_ref VARCHAR NOT NULL,
    PRIMARY KEY (experiment_id, branch_id, tick, clade_id)
);

CREATE TABLE IF NOT EXISTS prebiotic_compartments (
    experiment_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    tick UBIGINT NOT NULL,
    simulated_time_seconds DOUBLE NOT NULL,
    regime UTINYINT NOT NULL,              -- 1: Prebiotic, 2: Protocell
    temperature_kelvin DOUBLE NOT NULL,
    ph DOUBLE NOT NULL,
    volume_liters DOUBLE NOT NULL,
    total_molecules UBIGINT NOT NULL,
    raf_active_reactions UINTEGER[],
    is_autocatalytic_closed BOOLEAN NOT NULL,
    zarr_chemical_slice_ref VARCHAR NOT NULL,
    PRIMARY KEY (experiment_id, branch_id, tick)
);

CREATE TABLE IF NOT EXISTS protocell_vesicle_census (
    experiment_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    tick UBIGINT NOT NULL,
    vesicle_id UINTEGER NOT NULL,
    radius_nm DOUBLE NOT NULL,
    membrane_lipid_count UBIGINT NOT NULL,
    osmotic_pressure_bar DOUBLE NOT NULL,
    chemoton_synchrony_index DOUBLE NOT NULL,
    eigen_master_fraction DOUBLE NOT NULL,
    is_ready_for_promotion BOOLEAN NOT NULL,
    PRIMARY KEY (experiment_id, branch_id, tick, vesicle_id)
);

CREATE TABLE IF NOT EXISTS conservation_audit_ledger (
    experiment_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    tick UBIGINT NOT NULL,
    regime UTINYINT NOT NULL,
    carbon_atoms_u128 VARCHAR NOT NULL,
    hydrogen_atoms_u128 VARCHAR NOT NULL,
    oxygen_atoms_u128 VARCHAR NOT NULL,
    nitrogen_atoms_u128 VARCHAR NOT NULL,
    phosphorus_atoms_u128 VARCHAR NOT NULL,
    sulfur_atoms_u128 VARCHAR NOT NULL,
    iron_atoms_u128 VARCHAR NOT NULL,
    drift_detected BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (experiment_id, branch_id, tick)
);
