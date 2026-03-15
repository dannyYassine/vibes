use async_trait::async_trait;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use nimbus_domain::entities::diagram::{
    CloudProvider, Diagram, DiagramListItem, Viewport,
};
use nimbus_domain::entities::edge::{Edge, EdgeProperties, EdgeType};
use nimbus_domain::entities::node::{
    ComputeComponent, Node, NodeProperties, NodeType, Position, ProviderMappings, Size,
};
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;

pub struct PostgresDiagramRepo {
    pool: PgPool,
}

impl PostgresDiagramRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl DiagramRepository for PostgresDiagramRepo {
    async fn list(&self) -> Result<Vec<DiagramListItem>, DomainError> {
        let rows = sqlx::query(
            r#"
            SELECT d.id, d.name, d.description, d.active_provider, d.updated_at,
                   COUNT(n.id) as node_count
            FROM diagrams d
            LEFT JOIN nodes n ON n.diagram_id = d.id
            GROUP BY d.id
            ORDER BY d.updated_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::PersistenceError(e.to_string()))?;

        let items = rows
            .into_iter()
            .map(|r| DiagramListItem {
                id: r.get("id"),
                name: r.get("name"),
                description: r.get("description"),
                node_count: r.get::<i64, _>("node_count"),
                active_provider: r
                    .get::<Option<String>, _>("active_provider")
                    .and_then(|s| parse_cloud_provider(&s)),
                updated_at: r.get("updated_at"),
            })
            .collect();

        Ok(items)
    }

    async fn get(&self, id: Uuid) -> Result<Diagram, DomainError> {
        let diagram_row = sqlx::query(
            "SELECT id, name, description, viewport, active_provider, created_at, updated_at FROM diagrams WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::PersistenceError(e.to_string()))?
        .ok_or_else(|| DomainError::NotFound(format!("Diagram {id}")))?;

        let node_rows = sqlx::query(
            "SELECT id, node_type, label, position_x, position_y, width, height, properties, parent_id, provider_mappings FROM nodes WHERE diagram_id = $1",
        )
        .bind(id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::PersistenceError(e.to_string()))?;

        let edge_rows = sqlx::query(
            "SELECT id, source_id, target_id, edge_type, label, properties FROM edges WHERE diagram_id = $1",
        )
        .bind(id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::PersistenceError(e.to_string()))?;

        let nodes: Vec<Node> = node_rows
            .into_iter()
            .map(|r| {
                let node_type_val: serde_json::Value = r.get("node_type");
                let node_type: NodeType = serde_json::from_value(node_type_val)
                    .unwrap_or(NodeType::Compute(ComputeComponent::ApplicationServer));

                let props_val: serde_json::Value = r.get("properties");
                let properties: NodeProperties =
                    serde_json::from_value(props_val).unwrap_or(NodeProperties {
                        config: serde_json::Value::Object(Default::default()),
                        style: None,
                    });

                let pm_val: Option<serde_json::Value> = r.get("provider_mappings");
                let provider_mappings: Option<ProviderMappings> =
                    pm_val.and_then(|v| serde_json::from_value(v).ok());

                Node {
                    id: r.get("id"),
                    node_type,
                    label: r.get("label"),
                    position: Position {
                        x: r.get("position_x"),
                        y: r.get("position_y"),
                    },
                    size: Size {
                        width: r.get("width"),
                        height: r.get("height"),
                    },
                    properties,
                    parent_id: r.get("parent_id"),
                    provider_mappings,
                }
            })
            .collect();

        let edges: Vec<Edge> = edge_rows
            .into_iter()
            .map(|r| {
                let edge_type_str: String = r.get("edge_type");
                let edge_type = parse_edge_type(&edge_type_str);

                let props_val: serde_json::Value = r.get("properties");
                let properties: EdgeProperties =
                    serde_json::from_value(props_val).unwrap_or(EdgeProperties {
                        protocol: None,
                        port: None,
                        bidirectional: false,
                        communication_pattern: None,
                        style: None,
                    });

                Edge {
                    id: r.get("id"),
                    source_id: r.get("source_id"),
                    target_id: r.get("target_id"),
                    edge_type,
                    label: r.get("label"),
                    properties,
                }
            })
            .collect();

        let viewport_val: serde_json::Value = diagram_row.get("viewport");
        let viewport: Viewport = serde_json::from_value(viewport_val).unwrap_or(Viewport {
            x: 0.0,
            y: 0.0,
            zoom: 1.0,
        });

        Ok(Diagram {
            id: diagram_row.get("id"),
            name: diagram_row.get("name"),
            description: diagram_row.get("description"),
            nodes,
            edges,
            viewport,
            active_provider: diagram_row
                .get::<Option<String>, _>("active_provider")
                .and_then(|s| parse_cloud_provider(&s)),
            created_at: diagram_row.get("created_at"),
            updated_at: diagram_row.get("updated_at"),
        })
    }

    async fn create(&self, name: &str, description: Option<&str>) -> Result<Diagram, DomainError> {
        let row = sqlx::query(
            "INSERT INTO diagrams (name, description) VALUES ($1, $2) RETURNING id, created_at, updated_at",
        )
        .bind(name)
        .bind(description)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::PersistenceError(e.to_string()))?;

        Ok(Diagram {
            id: row.get("id"),
            name: name.to_string(),
            description: description.map(String::from),
            nodes: vec![],
            edges: vec![],
            viewport: Viewport {
                x: 0.0,
                y: 0.0,
                zoom: 1.0,
            },
            active_provider: None,
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    async fn update(&self, id: Uuid, diagram: &Diagram) -> Result<Diagram, DomainError> {
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| DomainError::PersistenceError(e.to_string()))?;

        let active_provider_str = diagram.active_provider.map(|p| match p {
            CloudProvider::Aws => "Aws",
            CloudProvider::Gcp => "Gcp",
            CloudProvider::Azure => "Azure",
        });

        let viewport_json = serde_json::to_value(&diagram.viewport)
            .map_err(|e| DomainError::PersistenceError(e.to_string()))?;

        sqlx::query(
            "UPDATE diagrams SET name = $2, description = $3, viewport = $4, active_provider = $5, updated_at = NOW() WHERE id = $1",
        )
        .bind(id)
        .bind(&diagram.name)
        .bind(&diagram.description)
        .bind(&viewport_json)
        .bind(active_provider_str)
        .execute(&mut *tx)
        .await
        .map_err(|e| DomainError::PersistenceError(e.to_string()))?;

        sqlx::query("DELETE FROM edges WHERE diagram_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await
            .map_err(|e| DomainError::PersistenceError(e.to_string()))?;

        sqlx::query("DELETE FROM nodes WHERE diagram_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await
            .map_err(|e| DomainError::PersistenceError(e.to_string()))?;

        for node in &diagram.nodes {
            let node_type_json = serde_json::to_value(&node.node_type)
                .map_err(|e| DomainError::PersistenceError(e.to_string()))?;
            let properties_json = serde_json::to_value(&node.properties)
                .map_err(|e| DomainError::PersistenceError(e.to_string()))?;
            let provider_mappings_json = node
                .provider_mappings
                .as_ref()
                .map(|pm| serde_json::to_value(pm))
                .transpose()
                .map_err(|e| DomainError::PersistenceError(e.to_string()))?;

            sqlx::query(
                "INSERT INTO nodes (id, diagram_id, node_type, label, position_x, position_y, width, height, properties, parent_id, provider_mappings) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
            )
            .bind(node.id)
            .bind(id)
            .bind(&node_type_json)
            .bind(&node.label)
            .bind(node.position.x)
            .bind(node.position.y)
            .bind(node.size.width)
            .bind(node.size.height)
            .bind(&properties_json)
            .bind(node.parent_id)
            .bind(&provider_mappings_json)
            .execute(&mut *tx)
            .await
            .map_err(|e| DomainError::PersistenceError(e.to_string()))?;
        }

        for edge in &diagram.edges {
            let edge_type_str = match edge.edge_type {
                EdgeType::Synchronous => "Synchronous",
                EdgeType::Asynchronous => "Asynchronous",
                EdgeType::DataFlow => "DataFlow",
                EdgeType::Dependency => "Dependency",
            };
            let properties_json = serde_json::to_value(&edge.properties)
                .map_err(|e| DomainError::PersistenceError(e.to_string()))?;

            sqlx::query(
                "INSERT INTO edges (id, diagram_id, source_id, target_id, edge_type, label, properties) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            )
            .bind(edge.id)
            .bind(id)
            .bind(edge.source_id)
            .bind(edge.target_id)
            .bind(edge_type_str)
            .bind(&edge.label)
            .bind(&properties_json)
            .execute(&mut *tx)
            .await
            .map_err(|e| DomainError::PersistenceError(e.to_string()))?;
        }

        tx.commit()
            .await
            .map_err(|e| DomainError::PersistenceError(e.to_string()))?;

        self.get(id).await
    }

    async fn delete(&self, id: Uuid) -> Result<(), DomainError> {
        let result = sqlx::query("DELETE FROM diagrams WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::PersistenceError(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(DomainError::NotFound(format!("Diagram {id}")));
        }

        Ok(())
    }
}

fn parse_cloud_provider(s: &str) -> Option<CloudProvider> {
    match s {
        "Aws" => Some(CloudProvider::Aws),
        "Gcp" => Some(CloudProvider::Gcp),
        "Azure" => Some(CloudProvider::Azure),
        _ => None,
    }
}

fn parse_edge_type(s: &str) -> EdgeType {
    match s {
        "Asynchronous" => EdgeType::Asynchronous,
        "DataFlow" => EdgeType::DataFlow,
        "Dependency" => EdgeType::Dependency,
        _ => EdgeType::Synchronous,
    }
}
