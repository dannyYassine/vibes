use std::collections::{HashMap, HashSet};

use uuid::Uuid;

use crate::entities::diagram::Diagram;
use crate::entities::edge::EdgeType;
use crate::entities::node::NodeType;
use crate::entities::validation::{
    Severity, ValidationResult, ValidationRule, ValidationWarning,
};

pub struct ValidationService;

impl ValidationService {
    pub fn validate(diagram: &Diagram) -> ValidationResult {
        let mut warnings = Vec::new();

        warnings.extend(Self::check_orphan_nodes(diagram));
        warnings.extend(Self::check_single_target_lb(diagram));
        warnings.extend(Self::check_invalid_containment(diagram));
        warnings.extend(Self::check_circular_sync_dependencies(diagram));
        warnings.extend(Self::check_single_point_of_failure(diagram));
        warnings.extend(Self::check_missing_observability(diagram));
        warnings.extend(Self::check_missing_security(diagram));
        warnings.extend(Self::check_database_without_backup(diagram));
        warnings.extend(Self::check_sync_chain_too_deep(diagram));
        warnings.extend(Self::check_message_queue_without_dlq(diagram));

        let valid = !warnings
            .iter()
            .any(|w| matches!(w.severity, Severity::Error));

        ValidationResult { valid, warnings }
    }

    fn check_orphan_nodes(diagram: &Diagram) -> Vec<ValidationWarning> {
        let connected: HashSet<Uuid> = diagram
            .edges
            .iter()
            .flat_map(|e| [e.source_id, e.target_id])
            .collect();

        diagram
            .nodes
            .iter()
            .filter(|n| !matches!(n.node_type, NodeType::Group(_)))
            .filter(|n| !connected.contains(&n.id))
            .map(|n| ValidationWarning {
                id: Uuid::new_v4(),
                severity: Severity::Warning,
                message: format!("Node '{}' has no connections", n.label),
                node_ids: vec![n.id],
                edge_ids: vec![],
                rule: ValidationRule::OrphanNode,
            })
            .collect()
    }

    fn check_single_target_lb(diagram: &Diagram) -> Vec<ValidationWarning> {
        let lb_ids: HashSet<Uuid> = diagram
            .nodes
            .iter()
            .filter(|n| {
                matches!(
                    n.node_type,
                    NodeType::Networking(
                        crate::entities::node::NetworkingComponent::LoadBalancer
                    )
                )
            })
            .map(|n| n.id)
            .collect();

        lb_ids
            .iter()
            .filter_map(|&lb_id| {
                let outgoing = diagram
                    .edges
                    .iter()
                    .filter(|e| e.source_id == lb_id)
                    .count();
                if outgoing == 1 {
                    let node = diagram.nodes.iter().find(|n| n.id == lb_id)?;
                    Some(ValidationWarning {
                        id: Uuid::new_v4(),
                        severity: Severity::Warning,
                        message: format!(
                            "Load balancer '{}' has only 1 target, defeating its purpose",
                            node.label
                        ),
                        node_ids: vec![lb_id],
                        edge_ids: vec![],
                        rule: ValidationRule::SingleTargetLb,
                    })
                } else {
                    None
                }
            })
            .collect()
    }

    fn check_invalid_containment(diagram: &Diagram) -> Vec<ValidationWarning> {
        let mut warnings = Vec::new();
        let node_map: HashMap<Uuid, &crate::entities::node::Node> =
            diagram.nodes.iter().map(|n| (n.id, n)).collect();

        for node in &diagram.nodes {
            if let Some(parent_id) = node.parent_id {
                match node_map.get(&parent_id) {
                    None => {
                        warnings.push(ValidationWarning {
                            id: Uuid::new_v4(),
                            severity: Severity::Error,
                            message: format!(
                                "Node '{}' references non-existent parent",
                                node.label
                            ),
                            node_ids: vec![node.id],
                            edge_ids: vec![],
                            rule: ValidationRule::InvalidContainment,
                        });
                    }
                    Some(parent) if !matches!(parent.node_type, NodeType::Group(_)) => {
                        warnings.push(ValidationWarning {
                            id: Uuid::new_v4(),
                            severity: Severity::Error,
                            message: format!(
                                "Node '{}' has parent '{}' which is not a Group node",
                                node.label, parent.label
                            ),
                            node_ids: vec![node.id, parent_id],
                            edge_ids: vec![],
                            rule: ValidationRule::InvalidContainment,
                        });
                    }
                    _ => {}
                }

                // Check circular nesting
                let mut visited = HashSet::new();
                let mut current = Some(parent_id);
                while let Some(cid) = current {
                    if !visited.insert(cid) {
                        warnings.push(ValidationWarning {
                            id: Uuid::new_v4(),
                            severity: Severity::Error,
                            message: format!(
                                "Node '{}' is part of a circular nesting chain",
                                node.label
                            ),
                            node_ids: vec![node.id],
                            edge_ids: vec![],
                            rule: ValidationRule::InvalidContainment,
                        });
                        break;
                    }
                    current = node_map.get(&cid).and_then(|n| n.parent_id);
                }
            }
        }

        warnings
    }

    fn check_circular_sync_dependencies(diagram: &Diagram) -> Vec<ValidationWarning> {
        // Build adjacency list for synchronous edges only
        let mut adj: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        for edge in &diagram.edges {
            if matches!(edge.edge_type, EdgeType::Synchronous) {
                adj.entry(edge.source_id)
                    .or_default()
                    .push(edge.target_id);
            }
        }

        let node_ids: Vec<Uuid> = diagram.nodes.iter().map(|n| n.id).collect();
        let mut visited = HashSet::new();
        let mut in_stack = HashSet::new();
        let mut cycle_nodes = HashSet::new();

        fn dfs(
            node: Uuid,
            adj: &HashMap<Uuid, Vec<Uuid>>,
            visited: &mut HashSet<Uuid>,
            in_stack: &mut HashSet<Uuid>,
            cycle_nodes: &mut HashSet<Uuid>,
        ) {
            visited.insert(node);
            in_stack.insert(node);

            if let Some(neighbors) = adj.get(&node) {
                for &next in neighbors {
                    if !visited.contains(&next) {
                        dfs(next, adj, visited, in_stack, cycle_nodes);
                    } else if in_stack.contains(&next) {
                        cycle_nodes.insert(next);
                        cycle_nodes.insert(node);
                    }
                }
            }

            in_stack.remove(&node);
        }

        for &node_id in &node_ids {
            if !visited.contains(&node_id) {
                dfs(node_id, &adj, &mut visited, &mut in_stack, &mut cycle_nodes);
            }
        }

        if cycle_nodes.is_empty() {
            vec![]
        } else {
            vec![ValidationWarning {
                id: Uuid::new_v4(),
                severity: Severity::Warning,
                message: "Circular synchronous dependency detected".to_string(),
                node_ids: cycle_nodes.into_iter().collect(),
                edge_ids: vec![],
                rule: ValidationRule::CircularSyncDependency,
            }]
        }
    }

    fn check_single_point_of_failure(diagram: &Diagram) -> Vec<ValidationWarning> {
        let mut incoming_count: HashMap<Uuid, usize> = HashMap::new();
        for edge in &diagram.edges {
            *incoming_count.entry(edge.target_id).or_insert(0) += 1;
        }

        // Check which nodes are "redundant" (have a sibling of same type in same group)
        let type_group_map: HashMap<Uuid, (String, Option<Uuid>)> = diagram
            .nodes
            .iter()
            .map(|n| {
                (
                    n.id,
                    (format!("{:?}", n.node_type), n.parent_id),
                )
            })
            .collect();

        let mut type_group_counts: HashMap<(String, Option<Uuid>), usize> = HashMap::new();
        for (type_str, parent_id) in type_group_map.values() {
            *type_group_counts
                .entry((type_str.clone(), *parent_id))
                .or_insert(0) += 1;
        }

        diagram
            .nodes
            .iter()
            .filter(|n| {
                let count = incoming_count.get(&n.id).copied().unwrap_or(0);
                if count < 3 {
                    return false;
                }
                // Check if non-redundant
                let key = (format!("{:?}", n.node_type), n.parent_id);
                type_group_counts.get(&key).copied().unwrap_or(0) <= 1
            })
            .map(|n| ValidationWarning {
                id: Uuid::new_v4(),
                severity: Severity::Warning,
                message: format!(
                    "Node '{}' is a single point of failure with {} incoming connections",
                    n.label,
                    incoming_count.get(&n.id).unwrap_or(&0)
                ),
                node_ids: vec![n.id],
                edge_ids: vec![],
                rule: ValidationRule::SinglePointOfFailure,
            })
            .collect()
    }

    fn check_missing_observability(diagram: &Diagram) -> Vec<ValidationWarning> {
        let has_obs = diagram
            .nodes
            .iter()
            .any(|n| matches!(n.node_type, NodeType::Observability(_)));

        if has_obs {
            vec![]
        } else {
            vec![ValidationWarning {
                id: Uuid::new_v4(),
                severity: Severity::Info,
                message: "No observability components found in the architecture".to_string(),
                node_ids: vec![],
                edge_ids: vec![],
                rule: ValidationRule::MissingObservability,
            }]
        }
    }

    fn check_missing_security(diagram: &Diagram) -> Vec<ValidationWarning> {
        let has_sec = diagram
            .nodes
            .iter()
            .any(|n| matches!(n.node_type, NodeType::Security(_)));

        if has_sec {
            vec![]
        } else {
            vec![ValidationWarning {
                id: Uuid::new_v4(),
                severity: Severity::Info,
                message: "No security components found in the architecture".to_string(),
                node_ids: vec![],
                edge_ids: vec![],
                rule: ValidationRule::MissingSecurity,
            }]
        }
    }

    fn check_database_without_backup(diagram: &Diagram) -> Vec<ValidationWarning> {
        let data_nodes: Vec<&crate::entities::node::Node> = diagram
            .nodes
            .iter()
            .filter(|n| matches!(n.node_type, NodeType::Data(_)))
            .collect();

        // Check if data node has a sibling of same type or a DataFlow to Storage
        let storage_ids: HashSet<Uuid> = diagram
            .nodes
            .iter()
            .filter(|n| matches!(n.node_type, NodeType::Storage(_)))
            .map(|n| n.id)
            .collect();

        let has_dataflow_to_storage: HashSet<Uuid> = diagram
            .edges
            .iter()
            .filter(|e| {
                matches!(e.edge_type, EdgeType::DataFlow) && storage_ids.contains(&e.target_id)
            })
            .map(|e| e.source_id)
            .collect();

        data_nodes
            .iter()
            .filter(|n| {
                // Check no sibling of same type
                let same_type_count = data_nodes
                    .iter()
                    .filter(|other| {
                        format!("{:?}", other.node_type) == format!("{:?}", n.node_type)
                    })
                    .count();
                same_type_count <= 1 && !has_dataflow_to_storage.contains(&n.id)
            })
            .map(|n| ValidationWarning {
                id: Uuid::new_v4(),
                severity: Severity::Warning,
                message: format!(
                    "Database '{}' has no backup or replication strategy",
                    n.label
                ),
                node_ids: vec![n.id],
                edge_ids: vec![],
                rule: ValidationRule::DatabaseWithoutBackup,
            })
            .collect()
    }

    fn check_sync_chain_too_deep(diagram: &Diagram) -> Vec<ValidationWarning> {
        // Build adjacency list for synchronous edges
        let mut adj: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        for edge in &diagram.edges {
            if matches!(edge.edge_type, EdgeType::Synchronous) {
                adj.entry(edge.source_id)
                    .or_default()
                    .push(edge.target_id);
            }
        }

        // Find longest path using DFS with memoization
        let node_ids: Vec<Uuid> = diagram.nodes.iter().map(|n| n.id).collect();
        let mut max_depth = 0;
        let mut memo: HashMap<Uuid, usize> = HashMap::new();

        fn longest_path(
            node: Uuid,
            adj: &HashMap<Uuid, Vec<Uuid>>,
            memo: &mut HashMap<Uuid, usize>,
            visiting: &mut HashSet<Uuid>,
        ) -> usize {
            if let Some(&cached) = memo.get(&node) {
                return cached;
            }
            if !visiting.insert(node) {
                return 0; // cycle, stop
            }

            let depth = if let Some(neighbors) = adj.get(&node) {
                neighbors
                    .iter()
                    .map(|&next| 1 + longest_path(next, adj, memo, visiting))
                    .max()
                    .unwrap_or(0)
            } else {
                0
            };

            visiting.remove(&node);
            memo.insert(node, depth);
            depth
        }

        for &node_id in &node_ids {
            let depth = longest_path(node_id, &adj, &mut memo, &mut HashSet::new());
            if depth > max_depth {
                max_depth = depth;
            }
        }

        if max_depth > 4 {
            vec![ValidationWarning {
                id: Uuid::new_v4(),
                severity: Severity::Warning,
                message: format!(
                    "Synchronous call chain is {} hops deep (recommended max: 4)",
                    max_depth
                ),
                node_ids: vec![],
                edge_ids: vec![],
                rule: ValidationRule::SyncChainTooDeep,
            }]
        } else {
            vec![]
        }
    }

    fn check_message_queue_without_dlq(diagram: &Diagram) -> Vec<ValidationWarning> {
        let mq_nodes: Vec<&crate::entities::node::Node> = diagram
            .nodes
            .iter()
            .filter(|n| {
                matches!(
                    n.node_type,
                    NodeType::Messaging(crate::entities::node::MessagingComponent::MessageQueue)
                )
            })
            .collect();

        // For each MQ, check if it has a connected MQ or a node with "DLQ"/"dead letter" in the label
        let dlq_or_mq_ids: HashSet<Uuid> = diagram
            .nodes
            .iter()
            .filter(|n| {
                let is_mq = matches!(
                    n.node_type,
                    NodeType::Messaging(crate::entities::node::MessagingComponent::MessageQueue)
                );
                let label_lower = n.label.to_lowercase();
                is_mq || label_lower.contains("dlq") || label_lower.contains("dead letter")
            })
            .map(|n| n.id)
            .collect();

        mq_nodes
            .iter()
            .filter(|n| {
                // Check if this MQ is connected to another MQ or DLQ-labeled node
                let has_dlq_connection = diagram.edges.iter().any(|e| {
                    (e.source_id == n.id && dlq_or_mq_ids.contains(&e.target_id) && e.target_id != n.id)
                        || (e.target_id == n.id
                            && dlq_or_mq_ids.contains(&e.source_id)
                            && e.source_id != n.id)
                });
                !has_dlq_connection
            })
            .map(|n| ValidationWarning {
                id: Uuid::new_v4(),
                severity: Severity::Warning,
                message: format!(
                    "Message queue '{}' has no dead letter queue configured",
                    n.label
                ),
                node_ids: vec![n.id],
                edge_ids: vec![],
                rule: ValidationRule::MessageQueueWithoutDlq,
            })
            .collect()
    }
}
