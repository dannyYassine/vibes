use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationResult {
    pub valid: bool,
    pub warnings: Vec<ValidationWarning>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationWarning {
    pub id: Uuid,
    pub severity: Severity,
    pub message: String,
    pub node_ids: Vec<Uuid>,
    pub edge_ids: Vec<Uuid>,
    pub rule: ValidationRule,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Severity {
    Error,
    Warning,
    Info,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ValidationRule {
    OrphanNode,
    SingleTargetLb,
    InvalidContainment,
    CircularSyncDependency,
    SinglePointOfFailure,
    MissingObservability,
    MissingSecurity,
    DatabaseWithoutBackup,
    SyncChainTooDeep,
    MessageQueueWithoutDlq,
}
