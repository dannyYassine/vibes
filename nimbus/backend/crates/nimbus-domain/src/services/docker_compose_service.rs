use crate::entities::diagram::Diagram;
use crate::entities::docker_catalog::lookup_docker_mapping;
use crate::entities::node::NodeType;
use crate::errors::DomainError;

pub struct DockerComposeService;

impl DockerComposeService {
    pub fn generate(diagram: &Diagram) -> Result<String, DomainError> {
        let mut yaml = String::from("version: \"3.8\"\n\nservices:\n");

        // Build edge map: target_id -> list of source service names
        let mut depends_on_map: std::collections::HashMap<uuid::Uuid, Vec<String>> =
            std::collections::HashMap::new();
        let mut node_service_names: std::collections::HashMap<uuid::Uuid, String> =
            std::collections::HashMap::new();

        // First pass: build service name map
        let mut name_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
        for node in &diagram.nodes {
            if matches!(node.node_type, NodeType::Group(_)) {
                continue;
            }
            let mut name = sanitize_service_name(&node.label);
            let count = name_counts.entry(name.clone()).or_insert(0);
            if *count > 0 {
                name = format!("{}-{}", name, count);
            }
            *name_counts.get_mut(&sanitize_service_name(&node.label)).unwrap() += 1;
            node_service_names.insert(node.id, name);
        }

        // Build depends_on from edges
        for edge in &diagram.edges {
            if let (Some(source_name), true) = (
                node_service_names.get(&edge.source_id).cloned(),
                node_service_names.contains_key(&edge.target_id),
            ) {
                depends_on_map
                    .entry(edge.target_id)
                    .or_default()
                    .push(source_name);
            }
        }

        // Collect group nodes for networks
        let mut group_nodes: Vec<(&uuid::Uuid, &str)> = Vec::new();
        let mut node_networks: std::collections::HashMap<uuid::Uuid, String> =
            std::collections::HashMap::new();

        for node in &diagram.nodes {
            if matches!(node.node_type, NodeType::Group(_)) {
                let network_name = sanitize_service_name(&node.label);
                group_nodes.push((&node.id, &node.label));
                // Assign children to this network
                for child in &diagram.nodes {
                    if child.parent_id.as_ref() == Some(&node.id) {
                        node_networks.insert(child.id, network_name.clone());
                    }
                }
            }
        }

        // Generate service entries
        for node in &diagram.nodes {
            if matches!(node.node_type, NodeType::Group(_)) {
                continue;
            }

            let service_name = node_service_names.get(&node.id).unwrap();
            let mapping = lookup_docker_mapping(&node.node_type);

            yaml.push_str(&format!("  {}:\n", service_name));

            if let Some(m) = mapping {
                yaml.push_str(&format!("    image: {}\n", m.image));

                if !m.default_ports.is_empty() {
                    yaml.push_str("    ports:\n");
                    for port in &m.default_ports {
                        yaml.push_str(&format!("      - \"{}\"\n", port));
                    }
                }

                if !m.environment.is_empty() {
                    yaml.push_str("    environment:\n");
                    for (key, val) in &m.environment {
                        yaml.push_str(&format!("      - {}={}\n", key, val));
                    }
                }

                if !m.volumes.is_empty() {
                    yaml.push_str("    volumes:\n");
                    for vol in &m.volumes {
                        yaml.push_str(&format!("      - {}\n", vol));
                    }
                }
            } else {
                yaml.push_str("    image: alpine:latest\n");
            }

            // depends_on
            if let Some(deps) = depends_on_map.get(&node.id) {
                yaml.push_str("    depends_on:\n");
                for dep in deps {
                    yaml.push_str(&format!("      - {}\n", dep));
                }
            }

            // networks
            if let Some(network) = node_networks.get(&node.id) {
                yaml.push_str("    networks:\n");
                yaml.push_str(&format!("      - {}\n", network));
            }

            yaml.push('\n');
        }

        // Networks section
        if !group_nodes.is_empty() {
            yaml.push_str("networks:\n");
            for (_id, label) in &group_nodes {
                let network_name = sanitize_service_name(label);
                yaml.push_str(&format!("  {}:\n    driver: bridge\n", network_name));
            }
        }

        // Volumes section: collect unique named volumes
        let mut named_volumes: Vec<String> = Vec::new();
        for node in &diagram.nodes {
            if matches!(node.node_type, NodeType::Group(_)) {
                continue;
            }
            if let Some(m) = lookup_docker_mapping(&node.node_type) {
                for vol in &m.volumes {
                    if let Some(name) = vol.split(':').next() {
                        if !name.starts_with('/') && !name.starts_with('.') && !named_volumes.contains(&name.to_string()) {
                            named_volumes.push(name.to_string());
                        }
                    }
                }
            }
        }

        if !named_volumes.is_empty() {
            yaml.push_str("\nvolumes:\n");
            for vol in &named_volumes {
                yaml.push_str(&format!("  {}:\n", vol));
            }
        }

        Ok(yaml)
    }
}

fn sanitize_service_name(label: &str) -> String {
    let mut result: String = label
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect();

    // Deduplicate hyphens
    while result.contains("--") {
        result = result.replace("--", "-");
    }

    // Strip leading/trailing hyphens
    result = result.trim_matches('-').to_string();

    if result.is_empty() {
        "service".to_string()
    } else {
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::diagram::{Diagram, Viewport};
    use crate::entities::edge::{Edge, EdgeProperties, EdgeType};
    use crate::entities::node::*;
    use chrono::Utc;
    use uuid::Uuid;

    fn test_diagram() -> Diagram {
        let web_id = Uuid::new_v4();
        let db_id = Uuid::new_v4();
        let group_id = Uuid::new_v4();

        Diagram {
            id: Uuid::new_v4(),
            name: "Test".to_string(),
            description: None,
            nodes: vec![
                Node {
                    id: group_id,
                    node_type: NodeType::Group(GroupType::ServiceCluster),
                    label: "Backend".to_string(),
                    position: Position { x: 0.0, y: 0.0 },
                    size: Size { width: 400.0, height: 300.0 },
                    properties: NodeProperties { config: serde_json::json!({}), style: None },
                    parent_id: None,
                    provider_mappings: None,
                },
                Node {
                    id: web_id,
                    node_type: NodeType::Compute(ComputeComponent::ApplicationServer),
                    label: "Web Server".to_string(),
                    position: Position { x: 50.0, y: 50.0 },
                    size: Size { width: 180.0, height: 48.0 },
                    properties: NodeProperties { config: serde_json::json!({}), style: None },
                    parent_id: Some(group_id),
                    provider_mappings: None,
                },
                Node {
                    id: db_id,
                    node_type: NodeType::Data(DataComponent::RelationalDb),
                    label: "Database".to_string(),
                    position: Position { x: 50.0, y: 150.0 },
                    size: Size { width: 180.0, height: 48.0 },
                    properties: NodeProperties { config: serde_json::json!({}), style: None },
                    parent_id: Some(group_id),
                    provider_mappings: None,
                },
            ],
            edges: vec![Edge {
                id: Uuid::new_v4(),
                source_id: web_id,
                target_id: db_id,
                edge_type: EdgeType::Synchronous,
                label: None,
                properties: EdgeProperties {
                    protocol: None,
                    port: None,
                    bidirectional: false,
                    communication_pattern: None,
                    style: None,
                },
            }],
            viewport: Viewport { x: 0.0, y: 0.0, zoom: 1.0 },
            active_provider: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn generates_services() {
        let diagram = test_diagram();
        let yaml = DockerComposeService::generate(&diagram).unwrap();
        assert!(yaml.contains("web-server:"));
        assert!(yaml.contains("database:"));
        assert!(yaml.contains("image: node:20-alpine"));
        assert!(yaml.contains("image: postgres:16-alpine"));
    }

    #[test]
    fn generates_depends_on() {
        let diagram = test_diagram();
        let yaml = DockerComposeService::generate(&diagram).unwrap();
        // database depends_on web-server (edge: web -> db)
        assert!(yaml.contains("depends_on:"));
        assert!(yaml.contains("web-server"));
    }

    #[test]
    fn generates_networks_from_groups() {
        let diagram = test_diagram();
        let yaml = DockerComposeService::generate(&diagram).unwrap();
        assert!(yaml.contains("networks:"));
        assert!(yaml.contains("backend:"));
    }

    #[test]
    fn generates_ports_and_env() {
        let diagram = test_diagram();
        let yaml = DockerComposeService::generate(&diagram).unwrap();
        assert!(yaml.contains("5432:5432"));
        assert!(yaml.contains("POSTGRES_PASSWORD"));
    }

    #[test]
    fn generates_volumes() {
        let diagram = test_diagram();
        let yaml = DockerComposeService::generate(&diagram).unwrap();
        assert!(yaml.contains("volumes:"));
        assert!(yaml.contains("pgdata"));
    }

    #[test]
    fn performance_100_nodes() {
        let mut diagram = test_diagram();
        for i in 0..100 {
            diagram.nodes.push(Node {
                id: Uuid::new_v4(),
                node_type: NodeType::Compute(ComputeComponent::ApplicationServer),
                label: format!("Service {}", i),
                position: Position { x: i as f64 * 10.0, y: 0.0 },
                size: Size { width: 180.0, height: 48.0 },
                properties: NodeProperties { config: serde_json::json!({}), style: None },
                parent_id: None,
                provider_mappings: None,
            });
        }

        let start = std::time::Instant::now();
        let result = DockerComposeService::generate(&diagram);
        let elapsed = start.elapsed();

        assert!(result.is_ok());
        assert!(elapsed.as_secs() < 1, "Docker Compose generation took {:?}", elapsed);
    }
}
