use crate::entities::cloud_catalog::lookup_mapping;
use crate::entities::diagram::{CloudProvider, Diagram};
use crate::entities::node::{NodeType, ProviderMapping, ProviderMappings};

pub struct TranslationService;

impl TranslationService {
    pub fn translate(diagram: &Diagram, active_provider: CloudProvider) -> Diagram {
        let mut diagram = diagram.clone();
        for node in &mut diagram.nodes {
            if matches!(node.node_type, NodeType::Group(_)) {
                continue;
            }
            let mappings = node.provider_mappings.get_or_insert(ProviderMappings {
                aws: None,
                gcp: None,
                azure: None,
            });
            for provider in [CloudProvider::Aws, CloudProvider::Gcp, CloudProvider::Azure] {
                if let Some(catalog_entry) = lookup_mapping(&node.node_type, &provider) {
                    let pm = ProviderMapping {
                        service_name: catalog_entry.display_name.clone(),
                        icon_key: catalog_entry.icon_key.clone(),
                        config: catalog_entry.default_config.clone(),
                        terraform_resource_type: Some(
                            catalog_entry.terraform_resource_type.clone(),
                        ),
                    };
                    match provider {
                        CloudProvider::Aws => mappings.aws = Some(pm),
                        CloudProvider::Gcp => mappings.gcp = Some(pm),
                        CloudProvider::Azure => mappings.azure = Some(pm),
                    }
                }
            }
        }
        diagram.active_provider = Some(active_provider);
        diagram
    }

    pub fn clear_translation(diagram: &Diagram) -> Diagram {
        let mut diagram = diagram.clone();
        diagram.active_provider = None;
        diagram
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::node::*;
    use crate::test_helpers::*;

    #[test]
    fn translate_populates_provider_mappings() {
        let node = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "App");
        let diagram = make_diagram(vec![node], vec![]);
        let result = TranslationService::translate(&diagram, CloudProvider::Aws);

        let n = &result.nodes[0];
        let mappings = n.provider_mappings.as_ref().unwrap();
        assert!(mappings.aws.is_some());
        assert!(mappings.gcp.is_some());
        assert!(mappings.azure.is_some());
    }

    #[test]
    fn translate_sets_active_provider() {
        let node = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "App");
        let diagram = make_diagram(vec![node], vec![]);
        let result = TranslationService::translate(&diagram, CloudProvider::Aws);
        assert_eq!(result.active_provider, Some(CloudProvider::Aws));
    }

    #[test]
    fn translate_skips_group_nodes() {
        let group = make_node(NodeType::Group(GroupType::NetworkBoundary), "VPC");
        let app = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "App");
        let diagram = make_diagram(vec![group, app], vec![]);
        let result = TranslationService::translate(&diagram, CloudProvider::Gcp);

        let group_node = result.nodes.iter().find(|n| n.label == "VPC").unwrap();
        assert!(group_node.provider_mappings.is_none());

        let app_node = result.nodes.iter().find(|n| n.label == "App").unwrap();
        assert!(app_node.provider_mappings.is_some());
    }

    #[test]
    fn translate_preserves_diagram_data() {
        let n1 = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "App");
        let n2 = make_node(NodeType::Data(DataComponent::RelationalDb), "DB");
        let edge = crate::test_helpers::make_edge(n1.id, n2.id, crate::entities::edge::EdgeType::Synchronous);
        let mut diagram = make_diagram(vec![n1, n2], vec![edge]);
        diagram.name = "My Architecture".to_string();

        let result = TranslationService::translate(&diagram, CloudProvider::Azure);
        assert_eq!(result.name, "My Architecture");
        assert_eq!(result.nodes.len(), 2);
        assert_eq!(result.edges.len(), 1);
    }

    #[test]
    fn clear_translation_removes_active_provider() {
        let node = make_node(NodeType::Compute(ComputeComponent::ApplicationServer), "App");
        let diagram = make_diagram(vec![node], vec![]);
        let translated = TranslationService::translate(&diagram, CloudProvider::Aws);
        assert_eq!(translated.active_provider, Some(CloudProvider::Aws));

        let cleared = TranslationService::clear_translation(&translated);
        assert_eq!(cleared.active_provider, None);
    }
}
