use std::collections::HashSet;

use nimbus_domain::entities::edge::Edge;
use nimbus_domain::entities::node::{Node, NodeType};
use nimbus_domain::errors::DomainError;

pub fn validate_ai_output(nodes: &[Node], edges: &[Edge]) -> Result<(), DomainError> {
    // 1. At least 1 node
    if nodes.is_empty() {
        return Err(DomainError::Validation("Diagram must have at least 1 node".into()));
    }

    // 8. Max limits
    if nodes.len() > 50 {
        return Err(DomainError::Validation(format!(
            "Too many nodes: {} (max 50)",
            nodes.len()
        )));
    }
    if edges.len() > 100 {
        return Err(DomainError::Validation(format!(
            "Too many edges: {} (max 100)",
            edges.len()
        )));
    }

    // 3. No duplicate node IDs
    let mut node_ids = HashSet::new();
    for node in nodes {
        if !node_ids.insert(node.id) {
            return Err(DomainError::Validation(format!(
                "Duplicate node ID: {}",
                node.id
            )));
        }
    }

    // 6. Non-empty labels, max 100 chars
    for node in nodes {
        if node.label.trim().is_empty() {
            return Err(DomainError::Validation(format!(
                "Node {} has an empty label",
                node.id
            )));
        }
        if node.label.len() > 100 {
            return Err(DomainError::Validation(format!(
                "Node {} label exceeds 100 characters",
                node.id
            )));
        }
    }

    // 7. Parent must exist and be a Group type
    for node in nodes {
        if let Some(parent_id) = node.parent_id {
            let parent = nodes.iter().find(|n| n.id == parent_id);
            match parent {
                None => {
                    return Err(DomainError::Validation(format!(
                        "Node {} references non-existent parent {}",
                        node.id, parent_id
                    )));
                }
                Some(p) => {
                    if !matches!(p.node_type, NodeType::Group(_)) {
                        return Err(DomainError::Validation(format!(
                            "Node {} parent {} is not a Group type",
                            node.id, parent_id
                        )));
                    }
                }
            }
        }
    }

    // 2. Edge source/target reference existing node IDs
    for edge in edges {
        if !node_ids.contains(&edge.source_id) {
            return Err(DomainError::Validation(format!(
                "Edge references non-existent source node: {}",
                edge.source_id
            )));
        }
        if !node_ids.contains(&edge.target_id) {
            return Err(DomainError::Validation(format!(
                "Edge references non-existent target node: {}",
                edge.target_id
            )));
        }
    }

    // 4. No self-loops
    for edge in edges {
        if edge.source_id == edge.target_id {
            return Err(DomainError::Validation(format!(
                "Self-loop detected on node {}",
                edge.source_id
            )));
        }
    }

    // 5. No duplicate edges (same source+target)
    let mut edge_pairs = HashSet::new();
    for edge in edges {
        if !edge_pairs.insert((edge.source_id, edge.target_id)) {
            return Err(DomainError::Validation(format!(
                "Duplicate edge from {} to {}",
                edge.source_id, edge.target_id
            )));
        }
    }

    Ok(())
}
