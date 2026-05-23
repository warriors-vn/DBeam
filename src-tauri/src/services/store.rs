use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::fs;
use uuid::Uuid;

use crate::models::{ConnectionInput, ConnectionSummary, QueryHistoryEntry};

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoreCatalog {
    connections: Vec<ConnectionSummary>,
    history: Vec<QueryHistoryEntry>,
}

#[derive(Clone)]
pub struct DesktopStore {
    path: PathBuf,
}

impl DesktopStore {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    async fn ensure_parent_dir(&self) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)
                .await
                .with_context(|| format!("failed to create store directory: {}", parent.display()))?;
        }

        Ok(())
    }

    async fn load_catalog(&self) -> Result<StoreCatalog> {
        self.ensure_parent_dir().await?;

        if !self.path.exists() {
            let catalog = StoreCatalog::default();
            self.save_catalog(&catalog).await?;
            return Ok(catalog);
        }

        let bytes = fs::read(&self.path)
            .await
            .with_context(|| format!("failed to read store file: {}", self.path.display()))?;

        if bytes.is_empty() {
            return Ok(StoreCatalog::default());
        }

        Ok(serde_json::from_slice(&bytes).context("failed to decode desktop store JSON")?)
    }

    async fn save_catalog(&self, catalog: &StoreCatalog) -> Result<()> {
        self.ensure_parent_dir().await?;
        fs::write(&self.path, serde_json::to_vec_pretty(catalog)?)
            .await
            .with_context(|| format!("failed to write store file: {}", self.path.display()))?;
        Ok(())
    }

    pub async fn list_connections(&self) -> Result<Vec<ConnectionSummary>> {
        Ok(self.load_catalog().await?.connections)
    }

    pub async fn get_connection(&self, id: &str) -> Result<Option<ConnectionSummary>> {
        Ok(self
            .load_catalog()
            .await?
            .connections
            .into_iter()
            .find(|connection| connection.id == id))
    }

    pub async fn upsert_connection(&self, input: &ConnectionInput) -> Result<ConnectionSummary> {
        let mut catalog = self.load_catalog().await?;
        let existing = catalog
            .connections
            .iter()
            .find(|connection| input.id.as_deref() == Some(connection.id.as_str()))
            .cloned();

        let row = ConnectionSummary {
            id: existing
                .as_ref()
                .map(|connection| connection.id.clone())
                .or_else(|| input.id.clone())
                .unwrap_or_else(|| Uuid::new_v4().to_string()),
            name: input.name.trim().to_string(),
            engine: input.engine.clone(),
            host: input.host.trim().to_string(),
            port: input.port,
            username: input.username.trim().to_string(),
            database: input.database.trim().to_string(),
            ssl: input.ssl,
            color: input.color.clone(),
            group: input.group.as_ref().map(|group| group.trim().to_string()),
            tags: input.tags.clone(),
            favorite: input.favorite,
            auto_reconnect: input.auto_reconnect,
            created_at: existing.as_ref().map(|connection| connection.created_at).unwrap_or_else(now_ts),
            last_used_at: existing.as_ref().and_then(|connection| connection.last_used_at),
        };

        catalog.connections.retain(|connection| connection.id != row.id);
        catalog.connections.insert(0, row.clone());
        self.save_catalog(&catalog).await?;
        Ok(row)
    }

    pub async fn remove_connection(&self, id: &str) -> Result<()> {
        let mut catalog = self.load_catalog().await?;
        catalog.connections.retain(|connection| connection.id != id);
        self.save_catalog(&catalog).await
    }

    pub async fn touch_connection(&self, id: &str) -> Result<()> {
        let mut catalog = self.load_catalog().await?;
        if let Some(connection) = catalog.connections.iter_mut().find(|connection| connection.id == id) {
            connection.last_used_at = Some(now_ts());
        }
        self.save_catalog(&catalog).await
    }

    pub async fn add_history(&self, entry: QueryHistoryEntry) -> Result<()> {
        let mut catalog = self.load_catalog().await?;
        catalog.history.insert(0, entry);
        catalog.history.truncate(500);
        self.save_catalog(&catalog).await
    }

    pub async fn history(&self, connection_id: Option<&str>) -> Result<Vec<QueryHistoryEntry>> {
        let mut history = self.load_catalog().await?.history;
        if let Some(connection_id) = connection_id {
            history.retain(|entry| entry.connection_id == connection_id);
        }
        Ok(history)
    }
}

fn now_ts() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}

