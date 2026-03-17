use std::collections::HashMap;
use std::sync::LazyLock;

use serde_json::json;

use super::diagram::CloudProvider;
use super::node::{
    CachingComponent, ComputeComponent, DataComponent, MessagingComponent, NetworkingComponent,
    NodeType, ObservabilityComponent, SecurityComponent, StorageComponent,
};

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

static CATALOG_MAP: LazyLock<HashMap<(NodeType, CloudProvider), usize>> = LazyLock::new(|| {
    let catalog = cloud_catalog();
    let mut map = HashMap::with_capacity(catalog.len());
    for (i, entry) in catalog.iter().enumerate() {
        map.insert((entry.generic_type.clone(), entry.provider), i);
    }
    map
});

static CATALOG: LazyLock<Vec<CloudServiceMapping>> = LazyLock::new(cloud_catalog);

pub fn lookup_mapping(node_type: &NodeType, provider: &CloudProvider) -> Option<&'static CloudServiceMapping> {
    CATALOG_MAP
        .get(&(node_type.clone(), *provider))
        .map(|&i| &CATALOG[i])
}

fn m(
    generic_type: NodeType,
    provider: CloudProvider,
    service_name: &str,
    display_name: &str,
    icon_key: &str,
    terraform_resource_type: &str,
) -> CloudServiceMapping {
    CloudServiceMapping {
        generic_type,
        provider,
        service_name: service_name.to_string(),
        display_name: display_name.to_string(),
        icon_key: icon_key.to_string(),
        terraform_resource_type: terraform_resource_type.to_string(),
        default_config: json!({}),
        priority: 1,
    }
}

pub fn cloud_catalog() -> Vec<CloudServiceMapping> {
    use CloudProvider::*;
    use ComputeComponent::*;
    use NetworkingComponent::*;
    use DataComponent::*;
    use CachingComponent::*;
    use MessagingComponent::*;
    use StorageComponent::*;
    use SecurityComponent::*;
    use ObservabilityComponent::*;

    vec![
        // Compute::ApplicationServer
        m(NodeType::Compute(ApplicationServer), Aws, "Elastic Beanstalk", "Elastic Beanstalk", "aws-elastic-beanstalk", "aws_elastic_beanstalk_environment"),
        m(NodeType::Compute(ApplicationServer), Gcp, "App Engine", "App Engine", "gcp-app-engine", "google_app_engine_application"),
        m(NodeType::Compute(ApplicationServer), Azure, "App Service", "App Service", "azure-app-service", "azurerm_app_service"),
        // Compute::Worker
        m(NodeType::Compute(Worker), Aws, "ECS Service", "ECS Service", "aws-ecs", "aws_ecs_service"),
        m(NodeType::Compute(Worker), Gcp, "Cloud Run Jobs", "Cloud Run Jobs", "gcp-cloud-run", "google_cloud_run_v2_job"),
        m(NodeType::Compute(Worker), Azure, "Container Instances", "Container Instances", "azure-container-instances", "azurerm_container_group"),
        // Compute::Function
        m(NodeType::Compute(Function), Aws, "Lambda", "Lambda", "aws-lambda", "aws_lambda_function"),
        m(NodeType::Compute(Function), Gcp, "Cloud Functions", "Cloud Functions", "gcp-cloud-functions", "google_cloudfunctions2_function"),
        m(NodeType::Compute(Function), Azure, "Azure Functions", "Azure Functions", "azure-functions", "azurerm_function_app"),
        // Compute::Container
        m(NodeType::Compute(Container), Aws, "ECS/Fargate", "ECS/Fargate", "aws-ecs", "aws_ecs_task_definition"),
        m(NodeType::Compute(Container), Gcp, "Cloud Run", "Cloud Run", "gcp-cloud-run", "google_cloud_run_v2_service"),
        m(NodeType::Compute(Container), Azure, "Container Apps", "Container Apps", "azure-container-apps", "azurerm_container_app"),
        // Compute::VirtualMachine
        m(NodeType::Compute(VirtualMachine), Aws, "EC2", "EC2", "aws-ec2", "aws_instance"),
        m(NodeType::Compute(VirtualMachine), Gcp, "Compute Engine", "Compute Engine", "gcp-compute-engine", "google_compute_instance"),
        m(NodeType::Compute(VirtualMachine), Azure, "Virtual Machines", "Virtual Machines", "azure-virtual-machines", "azurerm_virtual_machine"),
        // Compute::Scheduler
        m(NodeType::Compute(Scheduler), Aws, "EventBridge Scheduler", "EventBridge Scheduler", "aws-eventbridge", "aws_scheduler_schedule"),
        m(NodeType::Compute(Scheduler), Gcp, "Cloud Scheduler", "Cloud Scheduler", "gcp-cloud-scheduler", "google_cloud_scheduler_job"),
        m(NodeType::Compute(Scheduler), Azure, "Logic Apps", "Logic Apps", "azure-logic-apps", "azurerm_logic_app_workflow"),
        // Networking::LoadBalancer
        m(NodeType::Networking(LoadBalancer), Aws, "ALB", "ALB", "aws-alb", "aws_lb"),
        m(NodeType::Networking(LoadBalancer), Gcp, "Cloud Load Balancing", "Cloud Load Balancing", "gcp-load-balancing", "google_compute_url_map"),
        m(NodeType::Networking(LoadBalancer), Azure, "Azure Load Balancer", "Azure Load Balancer", "azure-load-balancer", "azurerm_lb"),
        // Networking::ApiGateway
        m(NodeType::Networking(ApiGateway), Aws, "API Gateway", "API Gateway", "aws-api-gateway", "aws_apigatewayv2_api"),
        m(NodeType::Networking(ApiGateway), Gcp, "API Gateway", "API Gateway", "gcp-api-gateway", "google_api_gateway_api"),
        m(NodeType::Networking(ApiGateway), Azure, "API Management", "API Management", "azure-api-management", "azurerm_api_management"),
        // Networking::Cdn
        m(NodeType::Networking(Cdn), Aws, "CloudFront", "CloudFront", "aws-cloudfront", "aws_cloudfront_distribution"),
        m(NodeType::Networking(Cdn), Gcp, "Cloud CDN", "Cloud CDN", "gcp-cloud-cdn", "google_compute_backend_bucket"),
        m(NodeType::Networking(Cdn), Azure, "Azure CDN", "Azure CDN", "azure-cdn", "azurerm_cdn_profile"),
        // Networking::Dns
        m(NodeType::Networking(Dns), Aws, "Route 53", "Route 53", "aws-route53", "aws_route53_zone"),
        m(NodeType::Networking(Dns), Gcp, "Cloud DNS", "Cloud DNS", "gcp-cloud-dns", "google_dns_managed_zone"),
        m(NodeType::Networking(Dns), Azure, "Azure DNS", "Azure DNS", "azure-dns", "azurerm_dns_zone"),
        // Networking::Firewall
        m(NodeType::Networking(Firewall), Aws, "Network Firewall", "Network Firewall", "aws-network-firewall", "aws_networkfirewall_firewall"),
        m(NodeType::Networking(Firewall), Gcp, "Cloud Firewall", "Cloud Firewall", "gcp-cloud-firewall", "google_compute_firewall"),
        m(NodeType::Networking(Firewall), Azure, "Azure Firewall", "Azure Firewall", "azure-firewall", "azurerm_firewall"),
        // Networking::Vpn
        m(NodeType::Networking(Vpn), Aws, "VPN Gateway", "VPN Gateway", "aws-vpn", "aws_vpn_gateway"),
        m(NodeType::Networking(Vpn), Gcp, "Cloud VPN", "Cloud VPN", "gcp-cloud-vpn", "google_compute_vpn_gateway"),
        m(NodeType::Networking(Vpn), Azure, "VPN Gateway", "VPN Gateway", "azure-vpn-gateway", "azurerm_vpn_gateway"),
        // Networking::ServiceMesh
        m(NodeType::Networking(ServiceMesh), Aws, "App Mesh", "App Mesh", "aws-app-mesh", "aws_appmesh_mesh"),
        m(NodeType::Networking(ServiceMesh), Gcp, "Traffic Director", "Traffic Director", "gcp-traffic-director", "google_compute_url_map"),
        m(NodeType::Networking(ServiceMesh), Azure, "Open Service Mesh", "Open Service Mesh", "azure-service-mesh", "azurerm_kubernetes_cluster"),
        // Networking::ReverseProxy
        m(NodeType::Networking(ReverseProxy), Aws, "ALB", "ALB", "aws-alb", "aws_lb"),
        m(NodeType::Networking(ReverseProxy), Gcp, "Cloud Load Balancing", "Cloud Load Balancing", "gcp-load-balancing", "google_compute_url_map"),
        m(NodeType::Networking(ReverseProxy), Azure, "Application Gateway", "Application Gateway", "azure-application-gateway", "azurerm_application_gateway"),
        // Data::RelationalDb
        m(NodeType::Data(RelationalDb), Aws, "RDS", "RDS", "aws-rds", "aws_db_instance"),
        m(NodeType::Data(RelationalDb), Gcp, "Cloud SQL", "Cloud SQL", "gcp-cloud-sql", "google_sql_database_instance"),
        m(NodeType::Data(RelationalDb), Azure, "Azure SQL Database", "Azure SQL Database", "azure-sql-database", "azurerm_mssql_database"),
        // Data::DocumentDb
        m(NodeType::Data(DocumentDb), Aws, "DynamoDB", "DynamoDB", "aws-dynamodb", "aws_dynamodb_table"),
        m(NodeType::Data(DocumentDb), Gcp, "Firestore", "Firestore", "gcp-firestore", "google_firestore_database"),
        m(NodeType::Data(DocumentDb), Azure, "Cosmos DB", "Cosmos DB", "azure-cosmos-db", "azurerm_cosmosdb_account"),
        // Data::KeyValueStore
        m(NodeType::Data(KeyValueStore), Aws, "DynamoDB", "DynamoDB", "aws-dynamodb", "aws_dynamodb_table"),
        m(NodeType::Data(KeyValueStore), Gcp, "Memorystore", "Memorystore", "gcp-memorystore", "google_redis_instance"),
        m(NodeType::Data(KeyValueStore), Azure, "Azure Cache for Redis", "Azure Cache for Redis", "azure-cache-redis", "azurerm_redis_cache"),
        // Data::GraphDb
        m(NodeType::Data(GraphDb), Aws, "Neptune", "Neptune", "aws-neptune", "aws_neptune_cluster"),
        m(NodeType::Data(GraphDb), Gcp, "JanusGraph on GCE", "JanusGraph on GCE", "gcp-compute-engine", "google_compute_instance"),
        m(NodeType::Data(GraphDb), Azure, "Cosmos DB (Gremlin)", "Cosmos DB (Gremlin)", "azure-cosmos-db", "azurerm_cosmosdb_gremlin_database"),
        // Data::DataWarehouse
        m(NodeType::Data(DataWarehouse), Aws, "Redshift", "Redshift", "aws-redshift", "aws_redshift_cluster"),
        m(NodeType::Data(DataWarehouse), Gcp, "BigQuery", "BigQuery", "gcp-bigquery", "google_bigquery_dataset"),
        m(NodeType::Data(DataWarehouse), Azure, "Synapse Analytics", "Synapse Analytics", "azure-synapse", "azurerm_synapse_workspace"),
        // Data::SearchEngine
        m(NodeType::Data(SearchEngine), Aws, "OpenSearch", "OpenSearch", "aws-opensearch", "aws_opensearch_domain"),
        m(NodeType::Data(SearchEngine), Gcp, "Elastic Cloud", "Elastic Cloud", "gcp-elastic-cloud", "google_compute_instance"),
        m(NodeType::Data(SearchEngine), Azure, "Azure AI Search", "Azure AI Search", "azure-ai-search", "azurerm_search_service"),
        // Data::TimeSeriesDb
        m(NodeType::Data(TimeSeriesDb), Aws, "Timestream", "Timestream", "aws-timestream", "aws_timestreamwrite_database"),
        m(NodeType::Data(TimeSeriesDb), Gcp, "Bigtable", "Bigtable", "gcp-bigtable", "google_bigtable_instance"),
        m(NodeType::Data(TimeSeriesDb), Azure, "Azure Data Explorer", "Azure Data Explorer", "azure-data-explorer", "azurerm_kusto_cluster"),
        // Caching::Cache
        m(NodeType::Caching(Cache), Aws, "ElastiCache", "ElastiCache", "aws-elasticache", "aws_elasticache_cluster"),
        m(NodeType::Caching(Cache), Gcp, "Memorystore", "Memorystore", "gcp-memorystore", "google_redis_instance"),
        m(NodeType::Caching(Cache), Azure, "Azure Cache for Redis", "Azure Cache for Redis", "azure-cache-redis", "azurerm_redis_cache"),
        // Caching::SessionStore
        m(NodeType::Caching(SessionStore), Aws, "ElastiCache Redis", "ElastiCache Redis", "aws-elasticache", "aws_elasticache_replication_group"),
        m(NodeType::Caching(SessionStore), Gcp, "Memorystore Redis", "Memorystore Redis", "gcp-memorystore", "google_redis_instance"),
        m(NodeType::Caching(SessionStore), Azure, "Azure Cache for Redis", "Azure Cache for Redis", "azure-cache-redis", "azurerm_redis_cache"),
        // Messaging::MessageQueue
        m(NodeType::Messaging(MessageQueue), Aws, "SQS", "SQS", "aws-sqs", "aws_sqs_queue"),
        m(NodeType::Messaging(MessageQueue), Gcp, "Cloud Tasks", "Cloud Tasks", "gcp-cloud-tasks", "google_cloud_tasks_queue"),
        m(NodeType::Messaging(MessageQueue), Azure, "Azure Queue Storage", "Azure Queue Storage", "azure-queue-storage", "azurerm_storage_queue"),
        // Messaging::EventBus
        m(NodeType::Messaging(EventBus), Aws, "EventBridge", "EventBridge", "aws-eventbridge", "aws_cloudwatch_event_bus"),
        m(NodeType::Messaging(EventBus), Gcp, "Eventarc", "Eventarc", "gcp-eventarc", "google_eventarc_trigger"),
        m(NodeType::Messaging(EventBus), Azure, "Event Grid", "Event Grid", "azure-event-grid", "azurerm_eventgrid_topic"),
        // Messaging::PubSub
        m(NodeType::Messaging(PubSub), Aws, "SNS", "SNS", "aws-sns", "aws_sns_topic"),
        m(NodeType::Messaging(PubSub), Gcp, "Pub/Sub", "Pub/Sub", "gcp-pubsub", "google_pubsub_topic"),
        m(NodeType::Messaging(PubSub), Azure, "Service Bus Topics", "Service Bus Topics", "azure-service-bus", "azurerm_servicebus_topic"),
        // Messaging::StreamProcessor
        m(NodeType::Messaging(StreamProcessor), Aws, "Kinesis", "Kinesis", "aws-kinesis", "aws_kinesis_stream"),
        m(NodeType::Messaging(StreamProcessor), Gcp, "Dataflow", "Dataflow", "gcp-dataflow", "google_dataflow_job"),
        m(NodeType::Messaging(StreamProcessor), Azure, "Stream Analytics", "Stream Analytics", "azure-stream-analytics", "azurerm_stream_analytics_job"),
        // Messaging::JobBroker
        m(NodeType::Messaging(JobBroker), Aws, "Step Functions", "Step Functions", "aws-step-functions", "aws_sfn_state_machine"),
        m(NodeType::Messaging(JobBroker), Gcp, "Cloud Workflows", "Cloud Workflows", "gcp-cloud-workflows", "google_workflows_workflow"),
        m(NodeType::Messaging(JobBroker), Azure, "Durable Functions", "Durable Functions", "azure-functions", "azurerm_function_app"),
        // Storage::ObjectStorage
        m(NodeType::Storage(ObjectStorage), Aws, "S3", "S3", "aws-s3", "aws_s3_bucket"),
        m(NodeType::Storage(ObjectStorage), Gcp, "Cloud Storage", "Cloud Storage", "gcp-cloud-storage", "google_storage_bucket"),
        m(NodeType::Storage(ObjectStorage), Azure, "Blob Storage", "Blob Storage", "azure-blob-storage", "azurerm_storage_container"),
        // Storage::BlockStorage
        m(NodeType::Storage(BlockStorage), Aws, "EBS", "EBS", "aws-ebs", "aws_ebs_volume"),
        m(NodeType::Storage(BlockStorage), Gcp, "Persistent Disk", "Persistent Disk", "gcp-persistent-disk", "google_compute_disk"),
        m(NodeType::Storage(BlockStorage), Azure, "Managed Disks", "Managed Disks", "azure-managed-disks", "azurerm_managed_disk"),
        // Storage::FileStorage
        m(NodeType::Storage(FileStorage), Aws, "EFS", "EFS", "aws-efs", "aws_efs_file_system"),
        m(NodeType::Storage(FileStorage), Gcp, "Filestore", "Filestore", "gcp-filestore", "google_filestore_instance"),
        m(NodeType::Storage(FileStorage), Azure, "Azure Files", "Azure Files", "azure-files", "azurerm_storage_share"),
        // Security::IdentityProvider
        m(NodeType::Security(IdentityProvider), Aws, "Cognito", "Cognito", "aws-cognito", "aws_cognito_user_pool"),
        m(NodeType::Security(IdentityProvider), Gcp, "Identity Platform", "Identity Platform", "gcp-identity-platform", "google_identity_platform_config"),
        m(NodeType::Security(IdentityProvider), Azure, "Azure AD B2C", "Azure AD B2C", "azure-ad-b2c", "azurerm_aadb2c_directory"),
        // Security::SecretManager
        m(NodeType::Security(SecretManager), Aws, "Secrets Manager", "Secrets Manager", "aws-secrets-manager", "aws_secretsmanager_secret"),
        m(NodeType::Security(SecretManager), Gcp, "Secret Manager", "Secret Manager", "gcp-secret-manager", "google_secret_manager_secret"),
        m(NodeType::Security(SecretManager), Azure, "Key Vault", "Key Vault", "azure-key-vault", "azurerm_key_vault"),
        // Security::CertificateManager
        m(NodeType::Security(CertificateManager), Aws, "ACM", "ACM", "aws-acm", "aws_acm_certificate"),
        m(NodeType::Security(CertificateManager), Gcp, "Certificate Manager", "Certificate Manager", "gcp-certificate-manager", "google_certificate_manager_certificate"),
        m(NodeType::Security(CertificateManager), Azure, "App Service Certificates", "App Service Certificates", "azure-app-service-certs", "azurerm_app_service_certificate"),
        // Security::Waf
        m(NodeType::Security(Waf), Aws, "WAF", "WAF", "aws-waf", "aws_wafv2_web_acl"),
        m(NodeType::Security(Waf), Gcp, "Cloud Armor", "Cloud Armor", "gcp-cloud-armor", "google_compute_security_policy"),
        m(NodeType::Security(Waf), Azure, "Azure WAF", "Azure WAF", "azure-waf", "azurerm_web_application_firewall_policy"),
        // Observability::Logging
        m(NodeType::Observability(Logging), Aws, "CloudWatch Logs", "CloudWatch Logs", "aws-cloudwatch", "aws_cloudwatch_log_group"),
        m(NodeType::Observability(Logging), Gcp, "Cloud Logging", "Cloud Logging", "gcp-cloud-logging", "google_logging_project_sink"),
        m(NodeType::Observability(Logging), Azure, "Azure Monitor Logs", "Azure Monitor Logs", "azure-monitor", "azurerm_log_analytics_workspace"),
        // Observability::Monitoring
        m(NodeType::Observability(Monitoring), Aws, "CloudWatch", "CloudWatch", "aws-cloudwatch", "aws_cloudwatch_dashboard"),
        m(NodeType::Observability(Monitoring), Gcp, "Cloud Monitoring", "Cloud Monitoring", "gcp-cloud-monitoring", "google_monitoring_dashboard"),
        m(NodeType::Observability(Monitoring), Azure, "Azure Monitor", "Azure Monitor", "azure-monitor", "azurerm_monitor_diagnostic_setting"),
        // Observability::Tracing
        m(NodeType::Observability(Tracing), Aws, "X-Ray", "X-Ray", "aws-xray", "aws_xray_sampling_rule"),
        m(NodeType::Observability(Tracing), Gcp, "Cloud Trace", "Cloud Trace", "gcp-cloud-trace", "google_project_service"),
        m(NodeType::Observability(Tracing), Azure, "Application Insights", "Application Insights", "azure-app-insights", "azurerm_application_insights"),
        // Observability::Alerting
        m(NodeType::Observability(Alerting), Aws, "CloudWatch Alarms", "CloudWatch Alarms", "aws-cloudwatch", "aws_cloudwatch_metric_alarm"),
        m(NodeType::Observability(Alerting), Gcp, "Cloud Alerting", "Cloud Alerting", "gcp-cloud-monitoring", "google_monitoring_alert_policy"),
        m(NodeType::Observability(Alerting), Azure, "Azure Monitor Alerts", "Azure Monitor Alerts", "azure-monitor", "azurerm_monitor_metric_alert"),
    ]
}
