use serde::Serialize;

use crate::entities::diagram::{CloudProvider, Diagram};
use crate::entities::node::NodeType;
use crate::errors::DomainError;

#[derive(Debug, Clone, Serialize)]
pub struct TerraformFiles {
    pub providers_tf: String,
    pub main_tf: String,
    pub variables_tf: String,
    pub outputs_tf: String,
}

pub struct TerraformService;

impl TerraformService {
    pub fn generate(diagram: &Diagram) -> Result<TerraformFiles, DomainError> {
        let provider = diagram.active_provider.ok_or_else(|| {
            DomainError::Validation(
                "Diagram must have an active cloud provider to export Terraform".to_string(),
            )
        })?;

        let providers_tf = Self::generate_providers(&provider);
        let variables_tf = Self::generate_variables(&provider, &diagram.name);
        let (main_tf, outputs_tf) = Self::generate_resources(diagram, &provider);

        Ok(TerraformFiles {
            providers_tf,
            main_tf,
            variables_tf,
            outputs_tf,
        })
    }

    fn generate_providers(provider: &CloudProvider) -> String {
        let mut out = String::from("terraform {\n  required_providers {\n");
        match provider {
            CloudProvider::Aws => {
                out.push_str("    aws = {\n      source  = \"hashicorp/aws\"\n      version = \"~> 5.0\"\n    }\n");
            }
            CloudProvider::Gcp => {
                out.push_str("    google = {\n      source  = \"hashicorp/google\"\n      version = \"~> 5.0\"\n    }\n");
            }
            CloudProvider::Azure => {
                out.push_str("    azurerm = {\n      source  = \"hashicorp/azurerm\"\n      version = \"~> 3.0\"\n    }\n");
            }
        }
        out.push_str("  }\n}\n\n");

        match provider {
            CloudProvider::Aws => {
                out.push_str("provider \"aws\" {\n  region = var.region\n}\n");
            }
            CloudProvider::Gcp => {
                out.push_str("provider \"google\" {\n  project = var.project_name\n  region  = var.region\n}\n");
            }
            CloudProvider::Azure => {
                out.push_str("provider \"azurerm\" {\n  features {}\n}\n");
            }
        }
        out
    }

    fn generate_variables(provider: &CloudProvider, diagram_name: &str) -> String {
        let default_region = match provider {
            CloudProvider::Aws => "us-east-1",
            CloudProvider::Gcp => "us-central1",
            CloudProvider::Azure => "eastus",
        };

        let sanitized_name = sanitize_resource_name(diagram_name);

        format!(
            "variable \"region\" {{\n  description = \"Cloud region\"\n  type        = string\n  default     = \"{default_region}\"\n}}\n\nvariable \"project_name\" {{\n  description = \"Project name\"\n  type        = string\n  default     = \"{sanitized_name}\"\n}}\n"
        )
    }

    fn generate_resources(diagram: &Diagram, provider: &CloudProvider) -> (String, String) {
        let mut main_tf = String::new();
        let mut outputs_tf = String::new();
        let mut name_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();

        for node in &diagram.nodes {
            if matches!(node.node_type, NodeType::Group(_)) {
                continue;
            }

            let provider_key = match provider {
                CloudProvider::Aws => &node.provider_mappings.as_ref().and_then(|pm| pm.aws.as_ref()),
                CloudProvider::Gcp => &node.provider_mappings.as_ref().and_then(|pm| pm.gcp.as_ref()),
                CloudProvider::Azure => &node.provider_mappings.as_ref().and_then(|pm| pm.azure.as_ref()),
            };

            let terraform_type = match provider_key {
                Some(mapping) => mapping.terraform_resource_type.as_deref().unwrap_or("null_resource"),
                None => "null_resource",
            };

            let mut resource_name = sanitize_resource_name(&node.label);
            let count = name_counts.entry(resource_name.clone()).or_insert(0);
            if *count > 0 {
                resource_name = format!("{}_{}", resource_name, count);
            }
            *name_counts.get_mut(&sanitize_resource_name(&node.label)).unwrap() += 1;

            // Resource block
            main_tf.push_str(&format!(
                "resource \"{}\" \"{}\" {{\n  # {}\n  tags = {{\n    Name    = \"{}\"\n    Project = var.project_name\n  }}\n}}\n\n",
                terraform_type, resource_name, node.label, node.label
            ));

            // Output block
            outputs_tf.push_str(&format!(
                "output \"{}_id\" {{\n  description = \"ID of {}\"\n  value       = {}.{}.id\n}}\n\n",
                resource_name, node.label, terraform_type, resource_name
            ));
        }

        (main_tf, outputs_tf)
    }
}

pub fn sanitize_resource_name(label: &str) -> String {
    let mut result: String = label
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect();

    // Strip leading digits/underscores
    while result.starts_with(|c: char| c.is_ascii_digit() || c == '_') {
        result.remove(0);
    }

    // Deduplicate underscores
    while result.contains("__") {
        result = result.replace("__", "_");
    }

    // Strip trailing underscores
    while result.ends_with('_') {
        result.pop();
    }

    if result.is_empty() {
        "resource".to_string()
    } else {
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::diagram::{Diagram, Viewport};
    use crate::entities::node::*;
    use chrono::Utc;
    use uuid::Uuid;

    fn test_diagram(provider: Option<CloudProvider>) -> Diagram {
        Diagram {
            id: Uuid::new_v4(),
            name: "Test Project".to_string(),
            description: None,
            nodes: vec![
                Node {
                    id: Uuid::new_v4(),
                    node_type: NodeType::Compute(ComputeComponent::ApplicationServer),
                    label: "Web Server".to_string(),
                    position: Position { x: 0.0, y: 0.0 },
                    size: Size { width: 180.0, height: 48.0 },
                    properties: NodeProperties { config: serde_json::json!({}), style: None },
                    parent_id: None,
                    provider_mappings: Some(ProviderMappings {
                        aws: Some(ProviderMapping {
                            service_name: "EC2".to_string(),
                            icon_key: "aws-ec2".to_string(),
                            config: serde_json::json!({}),
                            terraform_resource_type: Some("aws_instance".to_string()),
                        }),
                        gcp: None,
                        azure: None,
                    }),
                },
            ],
            edges: vec![],
            viewport: Viewport { x: 0.0, y: 0.0, zoom: 1.0 },
            active_provider: provider,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn errors_without_provider() {
        let diagram = test_diagram(None);
        let result = TerraformService::generate(&diagram);
        assert!(result.is_err());
    }

    #[test]
    fn generates_aws_provider_block() {
        let diagram = test_diagram(Some(CloudProvider::Aws));
        let files = TerraformService::generate(&diagram).unwrap();
        assert!(files.providers_tf.contains("hashicorp/aws"));
        assert!(files.providers_tf.contains("provider \"aws\""));
    }

    #[test]
    fn generates_resources() {
        let diagram = test_diagram(Some(CloudProvider::Aws));
        let files = TerraformService::generate(&diagram).unwrap();
        assert!(files.main_tf.contains("aws_instance"));
        assert!(files.main_tf.contains("web_server"));
        assert!(files.outputs_tf.contains("web_server_id"));
    }

    #[test]
    fn generates_variables_with_defaults() {
        let diagram = test_diagram(Some(CloudProvider::Aws));
        let files = TerraformService::generate(&diagram).unwrap();
        assert!(files.variables_tf.contains("us-east-1"));
        assert!(files.variables_tf.contains("test_project"));
    }

    #[test]
    fn sanitize_names() {
        assert_eq!(sanitize_resource_name("My Web Server!"), "my_web_server");
        assert_eq!(sanitize_resource_name("123start"), "start");
        assert_eq!(sanitize_resource_name("hello--world"), "hello_world");
        assert_eq!(sanitize_resource_name(""), "resource");
    }

    #[test]
    fn performance_100_nodes() {
        let mut diagram = test_diagram(Some(CloudProvider::Aws));
        // Add 100+ nodes
        for i in 0..100 {
            diagram.nodes.push(Node {
                id: Uuid::new_v4(),
                node_type: NodeType::Compute(ComputeComponent::ApplicationServer),
                label: format!("Service {}", i),
                position: Position { x: i as f64 * 10.0, y: 0.0 },
                size: Size { width: 180.0, height: 48.0 },
                properties: NodeProperties { config: serde_json::json!({}), style: None },
                parent_id: None,
                provider_mappings: Some(ProviderMappings {
                    aws: Some(ProviderMapping {
                        service_name: "EC2".to_string(),
                        icon_key: "aws-ec2".to_string(),
                        config: serde_json::json!({}),
                        terraform_resource_type: Some("aws_instance".to_string()),
                    }),
                    gcp: None,
                    azure: None,
                }),
            });
        }

        let start = std::time::Instant::now();
        let result = TerraformService::generate(&diagram);
        let elapsed = start.elapsed();

        assert!(result.is_ok());
        assert!(elapsed.as_secs() < 1, "Terraform generation took {:?}", elapsed);
    }
}
