use std::collections::HashMap;
use std::sync::LazyLock;

use super::node::{
    CachingComponent, ComputeComponent, DataComponent, MessagingComponent, NetworkingComponent,
    NodeType, ObservabilityComponent, SecurityComponent, StorageComponent,
};

pub struct DockerServiceMapping {
    pub generic_type: NodeType,
    pub image: String,
    pub default_ports: Vec<String>,
    pub environment: Vec<(String, String)>,
    pub volumes: Vec<String>,
    pub is_placeholder: bool,
}

static CATALOG: LazyLock<Vec<DockerServiceMapping>> = LazyLock::new(docker_catalog);

static CATALOG_MAP: LazyLock<HashMap<NodeType, usize>> = LazyLock::new(|| {
    let catalog = &*CATALOG;
    let mut map = HashMap::with_capacity(catalog.len());
    for (i, entry) in catalog.iter().enumerate() {
        map.insert(entry.generic_type.clone(), i);
    }
    map
});

pub fn lookup_docker_mapping(node_type: &NodeType) -> Option<&'static DockerServiceMapping> {
    CATALOG_MAP.get(node_type).map(|&i| &CATALOG[i])
}

fn d(
    generic_type: NodeType,
    image: &str,
    ports: &[&str],
    env: &[(&str, &str)],
    volumes: &[&str],
    is_placeholder: bool,
) -> DockerServiceMapping {
    DockerServiceMapping {
        generic_type,
        image: image.to_string(),
        default_ports: ports.iter().map(|s| s.to_string()).collect(),
        environment: env.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect(),
        volumes: volumes.iter().map(|s| s.to_string()).collect(),
        is_placeholder,
    }
}

fn docker_catalog() -> Vec<DockerServiceMapping> {
    vec![
        // Compute
        d(NodeType::Compute(ComputeComponent::ApplicationServer), "node:20-alpine", &["3000:3000"], &[], &[], false),
        d(NodeType::Compute(ComputeComponent::Worker), "node:20-alpine", &[], &[], &[], false),
        d(NodeType::Compute(ComputeComponent::Function), "openfaas/classic-watchdog:latest", &["8080:8080"], &[("fprocess", "./handler")], &[], false),
        d(NodeType::Compute(ComputeComponent::Container), "docker:dind", &["2376:2376"], &[("DOCKER_TLS_CERTDIR", "")], &["/var/run/docker.sock:/var/run/docker.sock"], false),
        d(NodeType::Compute(ComputeComponent::VirtualMachine), "alpine:latest", &[], &[], &[], true),
        d(NodeType::Compute(ComputeComponent::Scheduler), "mcuadros/ofelia:latest", &[], &[], &["/var/run/docker.sock:/var/run/docker.sock"], false),
        // Networking
        d(NodeType::Networking(NetworkingComponent::LoadBalancer), "nginx:alpine", &["80:80", "443:443"], &[], &[], false),
        d(NodeType::Networking(NetworkingComponent::ApiGateway), "kong:latest", &["8000:8000", "8443:8443"], &[("KONG_DATABASE", "off"), ("KONG_PROXY_ACCESS_LOG", "/dev/stdout")], &[], false),
        d(NodeType::Networking(NetworkingComponent::Cdn), "nginx:alpine", &["80:80"], &[], &[], true),
        d(NodeType::Networking(NetworkingComponent::Dns), "coredns/coredns:latest", &["53:53/udp", "53:53/tcp"], &[], &[], false),
        d(NodeType::Networking(NetworkingComponent::Firewall), "alpine:latest", &[], &[], &[], true),
        d(NodeType::Networking(NetworkingComponent::Vpn), "kylemanna/openvpn:latest", &["1194:1194/udp"], &[], &[], false),
        d(NodeType::Networking(NetworkingComponent::ServiceMesh), "envoyproxy/envoy:v1.28-latest", &["9901:9901", "10000:10000"], &[], &[], false),
        d(NodeType::Networking(NetworkingComponent::ReverseProxy), "traefik:v3.0", &["80:80", "8080:8080"], &[], &[], false),
        // Data
        d(NodeType::Data(DataComponent::RelationalDb), "postgres:16-alpine", &["5432:5432"], &[("POSTGRES_PASSWORD", "changeme"), ("POSTGRES_DB", "app")], &["pgdata:/var/lib/postgresql/data"], false),
        d(NodeType::Data(DataComponent::DocumentDb), "mongo:7", &["27017:27017"], &[], &["mongodata:/data/db"], false),
        d(NodeType::Data(DataComponent::KeyValueStore), "redis:7-alpine", &["6379:6379"], &[], &[], false),
        d(NodeType::Data(DataComponent::GraphDb), "neo4j:5", &["7474:7474", "7687:7687"], &[("NEO4J_AUTH", "neo4j/changeme")], &["neo4jdata:/data"], false),
        d(NodeType::Data(DataComponent::DataWarehouse), "clickhouse/clickhouse-server:latest", &["8123:8123", "9000:9000"], &[], &["chdata:/var/lib/clickhouse"], false),
        d(NodeType::Data(DataComponent::SearchEngine), "elasticsearch:8.12.0", &["9200:9200"], &[("discovery.type", "single-node"), ("xpack.security.enabled", "false")], &["esdata:/usr/share/elasticsearch/data"], false),
        d(NodeType::Data(DataComponent::TimeSeriesDb), "timescale/timescaledb:latest-pg16", &["5432:5432"], &[("POSTGRES_PASSWORD", "changeme")], &["tsdata:/var/lib/postgresql/data"], false),
        // Caching
        d(NodeType::Caching(CachingComponent::Cache), "redis:7-alpine", &["6379:6379"], &[], &[], false),
        d(NodeType::Caching(CachingComponent::SessionStore), "redis:7-alpine", &["6380:6379"], &[], &[], false),
        // Messaging
        d(NodeType::Messaging(MessagingComponent::MessageQueue), "rabbitmq:3-management-alpine", &["5672:5672", "15672:15672"], &[], &[], false),
        d(NodeType::Messaging(MessagingComponent::EventBus), "nats:latest", &["4222:4222", "8222:8222"], &[], &[], false),
        d(NodeType::Messaging(MessagingComponent::PubSub), "nats:latest", &["4222:4222"], &[], &[], false),
        d(NodeType::Messaging(MessagingComponent::StreamProcessor), "apache/kafka:latest", &["9092:9092"], &[("KAFKA_NODE_ID", "1"), ("KAFKA_PROCESS_ROLES", "broker,controller"), ("KAFKA_CONTROLLER_QUORUM_VOTERS", "1@localhost:9093"), ("KAFKA_LISTENERS", "PLAINTEXT://:9092,CONTROLLER://:9093")], &[], false),
        d(NodeType::Messaging(MessagingComponent::JobBroker), "redis:7-alpine", &["6379:6379"], &[], &[], true),
        // Storage
        d(NodeType::Storage(StorageComponent::ObjectStorage), "minio/minio:latest", &["9000:9000", "9001:9001"], &[("MINIO_ROOT_USER", "minioadmin"), ("MINIO_ROOT_PASSWORD", "minioadmin")], &["miniodata:/data"], false),
        d(NodeType::Storage(StorageComponent::BlockStorage), "alpine:latest", &[], &[], &[], true),
        d(NodeType::Storage(StorageComponent::FileStorage), "itsthenetwork/nfs-server-alpine:latest", &["2049:2049"], &[("SHARED_DIRECTORY", "/data")], &["nfsdata:/data"], false),
        // Security
        d(NodeType::Security(SecurityComponent::IdentityProvider), "keycloak/keycloak:latest", &["8080:8080"], &[("KEYCLOAK_ADMIN", "admin"), ("KEYCLOAK_ADMIN_PASSWORD", "admin")], &[], false),
        d(NodeType::Security(SecurityComponent::SecretManager), "hashicorp/vault:latest", &["8200:8200"], &[("VAULT_DEV_ROOT_TOKEN_ID", "dev-token")], &[], false),
        d(NodeType::Security(SecurityComponent::CertificateManager), "smallstep/step-ca:latest", &["9000:9000"], &[], &[], false),
        d(NodeType::Security(SecurityComponent::Waf), "owasp/modsecurity-crs:nginx-alpine", &["80:80"], &[], &[], false),
        // Observability
        d(NodeType::Observability(ObservabilityComponent::Logging), "grafana/loki:latest", &["3100:3100"], &[], &[], false),
        d(NodeType::Observability(ObservabilityComponent::Monitoring), "prom/prometheus:latest", &["9090:9090"], &[], &["promdata:/prometheus"], false),
        d(NodeType::Observability(ObservabilityComponent::Tracing), "jaegertracing/all-in-one:latest", &["16686:16686", "4317:4317"], &[], &[], false),
        d(NodeType::Observability(ObservabilityComponent::Alerting), "prom/alertmanager:latest", &["9093:9093"], &[], &[], false),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::node::*;

    #[test]
    fn all_non_group_node_types_have_mapping() {
        let all_types: Vec<NodeType> = vec![
            NodeType::Compute(ComputeComponent::ApplicationServer),
            NodeType::Compute(ComputeComponent::Worker),
            NodeType::Compute(ComputeComponent::Function),
            NodeType::Compute(ComputeComponent::Container),
            NodeType::Compute(ComputeComponent::VirtualMachine),
            NodeType::Compute(ComputeComponent::Scheduler),
            NodeType::Networking(NetworkingComponent::LoadBalancer),
            NodeType::Networking(NetworkingComponent::ApiGateway),
            NodeType::Networking(NetworkingComponent::Cdn),
            NodeType::Networking(NetworkingComponent::Dns),
            NodeType::Networking(NetworkingComponent::Firewall),
            NodeType::Networking(NetworkingComponent::Vpn),
            NodeType::Networking(NetworkingComponent::ServiceMesh),
            NodeType::Networking(NetworkingComponent::ReverseProxy),
            NodeType::Data(DataComponent::RelationalDb),
            NodeType::Data(DataComponent::DocumentDb),
            NodeType::Data(DataComponent::KeyValueStore),
            NodeType::Data(DataComponent::GraphDb),
            NodeType::Data(DataComponent::DataWarehouse),
            NodeType::Data(DataComponent::SearchEngine),
            NodeType::Data(DataComponent::TimeSeriesDb),
            NodeType::Caching(CachingComponent::Cache),
            NodeType::Caching(CachingComponent::SessionStore),
            NodeType::Messaging(MessagingComponent::MessageQueue),
            NodeType::Messaging(MessagingComponent::EventBus),
            NodeType::Messaging(MessagingComponent::PubSub),
            NodeType::Messaging(MessagingComponent::StreamProcessor),
            NodeType::Messaging(MessagingComponent::JobBroker),
            NodeType::Storage(StorageComponent::ObjectStorage),
            NodeType::Storage(StorageComponent::BlockStorage),
            NodeType::Storage(StorageComponent::FileStorage),
            NodeType::Security(SecurityComponent::IdentityProvider),
            NodeType::Security(SecurityComponent::SecretManager),
            NodeType::Security(SecurityComponent::CertificateManager),
            NodeType::Security(SecurityComponent::Waf),
            NodeType::Observability(ObservabilityComponent::Logging),
            NodeType::Observability(ObservabilityComponent::Monitoring),
            NodeType::Observability(ObservabilityComponent::Tracing),
            NodeType::Observability(ObservabilityComponent::Alerting),
        ];

        for nt in &all_types {
            assert!(
                lookup_docker_mapping(nt).is_some(),
                "Missing docker mapping for {:?}",
                nt
            );
        }
    }

    #[test]
    fn spot_check_images() {
        let m = lookup_docker_mapping(&NodeType::Data(DataComponent::RelationalDb)).unwrap();
        assert_eq!(m.image, "postgres:16-alpine");
        assert!(m.default_ports.contains(&"5432:5432".to_string()));

        let m = lookup_docker_mapping(&NodeType::Messaging(MessagingComponent::MessageQueue)).unwrap();
        assert_eq!(m.image, "rabbitmq:3-management-alpine");

        let m = lookup_docker_mapping(&NodeType::Observability(ObservabilityComponent::Monitoring)).unwrap();
        assert_eq!(m.image, "prom/prometheus:latest");
    }
}
