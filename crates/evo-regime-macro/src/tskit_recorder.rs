//! Jerome Kelleher Succinct Tree Sequence Recording Architecture (tskit format).
//!
//! Encodes ancestral recombination graphs and coalescent genealogies in O(N + M log M)
//! table collections: NodeTable, EdgeTable, SiteTable, MutationTable.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NodeRecord {
    pub id: u32,
    pub time: f64, // Geological time of node appearance (e.g. Myr before present)
    pub population: u32,
    pub flags: u32, // Bit 0: IS_SAMPLE (extant individual), Bit 1: SPECIATION_EVENT
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EdgeRecord {
    pub id: u32,
    pub left: f64,   // Left coordinate on chromosome [0, L)
    pub right: f64,  // Right coordinate on chromosome [0, L)
    pub parent: u32, // Parent node ID
    pub child: u32,  // Child node ID
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SiteRecord {
    pub id: u32,
    pub position: f64,
    pub ancestral_state: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MutationRecord {
    pub id: u32,
    pub site: u32,
    pub node: u32,
    pub derived_state: String,
    pub parent: Option<u32>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TableCollection {
    pub sequence_length: f64,
    pub nodes: Vec<NodeRecord>,
    pub edges: Vec<EdgeRecord>,
    pub sites: Vec<SiteRecord>,
    pub mutations: Vec<MutationRecord>,
}

impl TableCollection {
    pub fn new(sequence_length: f64) -> Self {
        Self {
            sequence_length,
            nodes: Vec::new(),
            edges: Vec::new(),
            sites: Vec::new(),
            mutations: Vec::new(),
        }
    }

    /// Appends a new node to the table collection.
    pub fn add_node(&mut self, time: f64, population: u32, flags: u32) -> u32 {
        let id = self.nodes.len() as u32;
        self.nodes.push(NodeRecord {
            id,
            time,
            population,
            flags,
        });
        id
    }

    /// Appends a transmission edge from parent to child over chromosomal interval [left, right).
    pub fn add_edge(&mut self, left: f64, right: f64, parent: u32, child: u32) -> u32 {
        let id = self.edges.len() as u32;
        self.edges.push(EdgeRecord {
            id,
            left,
            right,
            parent,
            child,
        });
        id
    }

    /// Appends a polymorphic genomic site.
    pub fn add_site(&mut self, position: f64, ancestral_state: String) -> u32 {
        let id = self.sites.len() as u32;
        self.sites.push(SiteRecord {
            id,
            position,
            ancestral_state,
        });
        id
    }

    /// Appends a mutation event at site occurring on node lineage.
    pub fn add_mutation(
        &mut self,
        site: u32,
        node: u32,
        derived_state: String,
        parent: Option<u32>,
    ) -> u32 {
        let id = self.mutations.len() as u32;
        self.mutations.push(MutationRecord {
            id,
            site,
            node,
            derived_state,
            parent,
        });
        id
    }

    /// Finds the Most Recent Common Ancestor (MRCA) of two sample nodes.
    pub fn find_mrca(&self, node_a: u32, node_b: u32) -> Option<u32> {
        if node_a == node_b {
            return Some(node_a);
        }

        // Trace ancestors of node_a
        let mut ancestors_a = std::collections::HashSet::new();
        let mut queue = vec![node_a];
        while let Some(curr) = queue.pop() {
            ancestors_a.insert(curr);
            for edge in &self.edges {
                if edge.child == curr {
                    queue.push(edge.parent);
                }
            }
        }

        // Trace ancestors of node_b and find earliest intersection
        let mut queue_b = vec![node_b];
        let mut candidate_mrca: Option<u32> = None;
        let mut min_time = f64::INFINITY;

        while let Some(curr) = queue_b.pop() {
            if ancestors_a.contains(&curr) {
                let t = self.nodes[curr as usize].time;
                if t < min_time {
                    min_time = t;
                    candidate_mrca = Some(curr);
                }
            }
            for edge in &self.edges {
                if edge.child == curr {
                    queue_b.push(edge.parent);
                }
            }
        }

        candidate_mrca
    }
}
