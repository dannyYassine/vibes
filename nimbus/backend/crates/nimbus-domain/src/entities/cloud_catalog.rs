use super::diagram::CloudProvider;
use super::node::NodeType;

pub struct CloudServiceMapping {
    pub generic_type: NodeType,
    pub provider: CloudProvider,
    pub service_name: String,
    pub display_name: String,
    pub icon_key: String,
    pub terraform_resource_type: String,
    pub default_config: serde_json::Value,
    pub priority: u8,
}

pub fn cloud_catalog() -> Vec<CloudServiceMapping> {
    Vec::new()
}
