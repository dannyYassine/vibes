use super::node::NodeType;

pub struct DockerServiceMapping {
    pub generic_type: NodeType,
    pub image: String,
    pub default_ports: Vec<String>,
    pub environment: Vec<(String, String)>,
    pub volumes: Vec<String>,
    pub is_placeholder: bool,
}

pub fn docker_catalog() -> Vec<DockerServiceMapping> {
    Vec::new()
}
