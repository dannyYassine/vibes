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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::edge::EdgeType;
    use crate::entities::node::*;
    use crate::test_helpers::*;

    // --- OrphanNode ---

    #[test]
    fn orphan_node_detected() {
        let n = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "Lonely");
        let diagram = make_diagram(vec![n], vec![]);
        let result = ValidationService::validate(&diagram);
        assert!(result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::OrphanNode)));
    }

    #[test]
    fn connected_node_ok() {
        let n1 = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "A");
        let n2 = make_node(NodeType::Compute(ComputeComponent::Worker), "B");
        let edge = make_edge(n1.id, n2.id, EdgeType::Synchronous);
        let diagram = make_diagram(vec![n1, n2], vec![edge]);
        let result = ValidationService::validate(&diagram);
        assert!(!result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::OrphanNode)));
    }

    #[test]
    fn group_node_not_flagged() {
        let n = make_node(NodeType::Group(GroupType::NetworkBoundary), "VPC");
        let diagram = make_diagram(vec![n], vec![]);
        let result = ValidationService::validate(&diagram);
        assert!(!result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::OrphanNode)));
    }

    // --- SingleTargetLb ---

    #[test]
    fn lb_one_target_warns() {
        let lb = make_node(NodeType::Networking(NetworkingComponent::LoadBalancer), "LB");
        let srv = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "Srv");
        let edge = make_edge(lb.id, srv.id, EdgeType::Synchronous);
        let diagram = make_diagram(vec![lb, srv], vec![edge]);
        let result = ValidationService::validate(&diagram);
        assert!(result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::SingleTargetLb)));
    }

    #[test]
    fn lb_multiple_targets_ok() {
        let lb = make_node(NodeType::Networking(NetworkingComponent::LoadBalancer), "LB");
        let s1 = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "S1");
        let s2 = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "S2");
        let e1 = make_edge(lb.id, s1.id, EdgeType::Synchronous);
        let e2 = make_edge(lb.id, s2.id, EdgeType::Synchronous);
        let diagram = make_diagram(vec![lb, s1, s2], vec![e1, e2]);
        let result = ValidationService::validate(&diagram);
        assert!(!result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::SingleTargetLb)));
    }

    // --- InvalidContainment ---

    #[test]
    fn nonexistent_parent_errors() {
        let mut n = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "Child");
        n.parent_id = Some(Uuid::new_v4()); // nonexistent
        let diagram = make_diagram(vec![n], vec![]);
        let result = ValidationService::validate(&diagram);
        assert!(result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::InvalidContainment) && matches!(w.severity, Severity::Error)));
    }

    #[test]
    fn non_group_parent_errors() {
        let parent = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "Parent");
        let mut child = make_node(NodeType::Compute(ComputeComponent::Worker), "Child");
        child.parent_id = Some(parent.id);
        let diagram = make_diagram(vec![parent, child], vec![]);
        let result = ValidationService::validate(&diagram);
        assert!(result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::InvalidContainment)));
    }

    #[test]
    fn valid_group_parent_ok() {
        let group = make_node(NodeType::Group(GroupType::NetworkBoundary), "VPC");
        let mut child = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "App");
        child.parent_id = Some(group.id);
        let diagram = make_diagram(vec![group, child], vec![]);
        let result = ValidationService::validate(&diagram);
        assert!(!result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::InvalidContainment)));
    }

    #[test]
    fn circular_nesting_detected() {
        let mut g1 = make_node(NodeType::Group(GroupType::NetworkBoundary), "G1");
        let mut g2 = make_node(NodeType::Group(GroupType::NetworkBoundary), "G2");
        g1.parent_id = Some(g2.id);
        g2.parent_id = Some(g1.id);
        let diagram = make_diagram(vec![g1, g2], vec![]);
        let result = ValidationService::validate(&diagram);
        assert!(result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::InvalidContainment)));
    }

    // --- CircularSyncDependency ---

    #[test]
    fn sync_cycle_detected() {
        let a = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "A");
        let b = make_node(NodeType::Compute(ComputeComponent::Worker), "B");
        let e1 = make_edge(a.id, b.id, EdgeType::Synchronous);
        let e2 = make_edge(b.id, a.id, EdgeType::Synchronous);
        let diagram = make_diagram(vec![a, b], vec![e1, e2]);
        let result = ValidationService::validate(&diagram);
        assert!(result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::CircularSyncDependency)));
    }

    #[test]
    fn async_cycle_ignored() {
        let a = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "A");
        let b = make_node(NodeType::Compute(ComputeComponent::Worker), "B");
        let e1 = make_edge(a.id, b.id, EdgeType::Asynchronous);
        let e2 = make_edge(b.id, a.id, EdgeType::Asynchronous);
        let diagram = make_diagram(vec![a, b], vec![e1, e2]);
        let result = ValidationService::validate(&diagram);
        assert!(!result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::CircularSyncDependency)));
    }

    #[test]
    fn no_cycle_ok() {
        let a = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "A");
        let b = make_node(NodeType::Compute(ComputeComponent::Worker), "B");
        let e = make_edge(a.id, b.id, EdgeType::Synchronous);
        let diagram = make_diagram(vec![a, b], vec![e]);
        let result = ValidationService::validate(&diagram);
        assert!(!result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::CircularSyncDependency)));
    }

    // --- SinglePointOfFailure ---

    #[test]
    fn spof_3_incoming_warns() {
        let target = make_node(NodeType::Data(DataComponent::RelationalDb), "DB");
        let s1 = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "S1");
        let s2 = make_node(NodeType::Compute(ComputeComponent::Worker), "S2");
        let s3 = make_node(NodeType::Compute(ComputeComponent::Function), "S3");
        let e1 = make_edge(s1.id, target.id, EdgeType::Synchronous);
        let e2 = make_edge(s2.id, target.id, EdgeType::Synchronous);
        let e3 = make_edge(s3.id, target.id, EdgeType::Synchronous);
        let diagram = make_diagram(vec![target, s1, s2, s3], vec![e1, e2, e3]);
        let result = ValidationService::validate(&diagram);
        assert!(result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::SinglePointOfFailure)));
    }

    #[test]
    fn redundant_nodes_ok() {
        // Two DB nodes of same type = redundant, so no SPOF even with 3 incoming
        let db1 = make_node(NodeType::Data(DataComponent::RelationalDb), "DB1");
        let db2 = make_node(NodeType::Data(DataComponent::RelationalDb), "DB2");
        let s1 = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "S1");
        let s2 = make_node(NodeType::Compute(ComputeComponent::Worker), "S2");
        let s3 = make_node(NodeType::Compute(ComputeComponent::Function), "S3");
        let e1 = make_edge(s1.id, db1.id, EdgeType::Synchronous);
        let e2 = make_edge(s2.id, db1.id, EdgeType::Synchronous);
        let e3 = make_edge(s3.id, db1.id, EdgeType::Synchronous);
        let diagram = make_diagram(vec![db1, db2, s1, s2, s3], vec![e1, e2, e3]);
        let result = ValidationService::validate(&diagram);
        assert!(!result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::SinglePointOfFailure)));
    }

    // --- MissingObservability ---

    #[test]
    fn no_observability_warns() {
        let n = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "App");
        let n2 = make_node(NodeType::Compute(ComputeComponent::Worker), "W");
        let e = make_edge(n.id, n2.id, EdgeType::Synchronous);
        let diagram = make_diagram(vec![n, n2], vec![e]);
        let result = ValidationService::validate(&diagram);
        assert!(result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::MissingObservability)));
    }

    #[test]
    fn has_observability_ok() {
        let n = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "App");
        let obs = make_node(NodeType::Observability(ObservabilityComponent::Logging), "Logs");
        let e = make_edge(n.id, obs.id, EdgeType::Synchronous);
        let diagram = make_diagram(vec![n, obs], vec![e]);
        let result = ValidationService::validate(&diagram);
        assert!(!result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::MissingObservability)));
    }

    // --- MissingSecurity ---

    #[test]
    fn no_security_warns() {
        let n = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "App");
        let n2 = make_node(NodeType::Compute(ComputeComponent::Worker), "W");
        let e = make_edge(n.id, n2.id, EdgeType::Synchronous);
        let diagram = make_diagram(vec![n, n2], vec![e]);
        let result = ValidationService::validate(&diagram);
        assert!(result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::MissingSecurity)));
    }

    #[test]
    fn has_security_ok() {
        let n = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "App");
        let sec = make_node(NodeType::Security(SecurityComponent::IdentityProvider), "Auth");
        let e = make_edge(n.id, sec.id, EdgeType::Synchronous);
        let diagram = make_diagram(vec![n, sec], vec![e]);
        let result = ValidationService::validate(&diagram);
        assert!(!result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::MissingSecurity)));
    }

    // --- DatabaseWithoutBackup ---

    #[test]
    fn single_db_warns() {
        let db = make_node(NodeType::Data(DataComponent::RelationalDb), "DB");
        let app = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "App");
        let e = make_edge(app.id, db.id, EdgeType::Synchronous);
        let diagram = make_diagram(vec![db, app], vec![e]);
        let result = ValidationService::validate(&diagram);
        assert!(result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::DatabaseWithoutBackup)));
    }

    #[test]
    fn db_with_storage_ok() {
        let db = make_node(NodeType::Data(DataComponent::RelationalDb), "DB");
        let storage = make_node(NodeType::Storage(StorageComponent::ObjectStorage), "S3");
        let app = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "App");
        let e1 = make_edge(app.id, db.id, EdgeType::Synchronous);
        let e2 = make_edge(db.id, storage.id, EdgeType::DataFlow);
        let diagram = make_diagram(vec![db, storage, app], vec![e1, e2]);
        let result = ValidationService::validate(&diagram);
        assert!(!result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::DatabaseWithoutBackup)));
    }

    #[test]
    fn db_with_sibling_ok() {
        let db1 = make_node(NodeType::Data(DataComponent::RelationalDb), "Primary");
        let db2 = make_node(NodeType::Data(DataComponent::RelationalDb), "Replica");
        let app = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "App");
        let e1 = make_edge(app.id, db1.id, EdgeType::Synchronous);
        let e2 = make_edge(db1.id, db2.id, EdgeType::DataFlow);
        let diagram = make_diagram(vec![db1, db2, app], vec![e1, e2]);
        let result = ValidationService::validate(&diagram);
        assert!(!result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::DatabaseWithoutBackup)));
    }

    // --- SyncChainTooDeep ---

    #[test]
    fn chain_5_warns() {
        let nodes: Vec<_> = (0..6)
            .map(|i| make_node(NodeType::Compute(ComputeComponent::ApplicationServer), &format!("N{}", i)))
            .collect();
        let edges: Vec<_> = nodes.windows(2)
            .map(|w| make_edge(w[0].id, w[1].id, EdgeType::Synchronous))
            .collect();
        let diagram = make_diagram(nodes, edges);
        let result = ValidationService::validate(&diagram);
        assert!(result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::SyncChainTooDeep)));
    }

    #[test]
    fn chain_4_ok() {
        let nodes: Vec<_> = (0..5)
            .map(|i| make_node(NodeType::Compute(ComputeComponent::ApplicationServer), &format!("N{}", i)))
            .collect();
        let edges: Vec<_> = nodes.windows(2)
            .map(|w| make_edge(w[0].id, w[1].id, EdgeType::Synchronous))
            .collect();
        let diagram = make_diagram(nodes, edges);
        let result = ValidationService::validate(&diagram);
        assert!(!result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::SyncChainTooDeep)));
    }

    // --- MessageQueueWithoutDlq ---

    #[test]
    fn mq_no_dlq_warns() {
        let mq = make_node(NodeType::Messaging(MessagingComponent::MessageQueue), "MainQ");
        let app = make_node(NodeType::Compute(ComputeComponent::Worker), "Worker");
        let e = make_edge(mq.id, app.id, EdgeType::Asynchronous);
        let diagram = make_diagram(vec![mq, app], vec![e]);
        let result = ValidationService::validate(&diagram);
        assert!(result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::MessageQueueWithoutDlq)));
    }

    #[test]
    fn mq_connected_to_mq_ok() {
        let mq = make_node(NodeType::Messaging(MessagingComponent::MessageQueue), "MainQ");
        let main_q_id = mq.id;
        let dlq = make_node(NodeType::Messaging(MessagingComponent::MessageQueue), "DLQ");
        let app = make_node(NodeType::Compute(ComputeComponent::Worker), "Worker");
        let e1 = make_edge(mq.id, app.id, EdgeType::Asynchronous);
        let e2 = make_edge(mq.id, dlq.id, EdgeType::Asynchronous);
        let diagram = make_diagram(vec![mq, dlq, app], vec![e1, e2]);
        let result = ValidationService::validate(&diagram);
        // MainQ is connected to DLQ so should not warn for MainQ
        let mq_warnings: Vec<_> = result.warnings.iter()
            .filter(|w| matches!(w.rule, ValidationRule::MessageQueueWithoutDlq))
            .collect();
        // DLQ itself may warn since it's not connected to another MQ, but MainQ should not
        assert!(!mq_warnings.iter().any(|w| w.node_ids.contains(&main_q_id)));
    }

    // --- Top-level validate ---

    #[test]
    fn empty_diagram_has_info_warnings() {
        let diagram = make_diagram(vec![], vec![]);
        let result = ValidationService::validate(&diagram);
        // Empty diagram should have MissingObservability + MissingSecurity (Info severity)
        assert!(result.valid); // Info doesn't make it invalid
        assert!(result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::MissingObservability)));
        assert!(result.warnings.iter().any(|w| matches!(w.rule, ValidationRule::MissingSecurity)));
    }

    #[test]
    fn errors_make_invalid() {
        let mut n = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "Orphan");
        n.parent_id = Some(Uuid::new_v4()); // nonexistent parent = Error
        let diagram = make_diagram(vec![n], vec![]);
        let result = ValidationService::validate(&diagram);
        assert!(!result.valid);
    }
}
