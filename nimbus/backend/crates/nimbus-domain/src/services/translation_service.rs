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
