use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DatabaseEngine {
    Mysql,
    Postgresql,
    Mongodb,
    Redis,
}

impl Default for DatabaseEngine {
    fn default() -> Self {
        Self::Mysql
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeHealth {
    pub ok: bool,
    pub name: String,
    pub version: String,
    pub platform: String,
    pub native: bool,
    pub uptime_sec: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionSummary {
    pub id: String,
    pub name: String,
    pub engine: DatabaseEngine,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub database: String,
    pub ssl: bool,
    pub color: Option<String>,
    pub group: Option<String>,
    pub tags: Vec<String>,
    pub favorite: bool,
    pub auto_reconnect: bool,
    pub created_at: i64,
    pub last_used_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionDetails {
    #[serde(flatten)]
    pub summary: ConnectionSummary,
    pub password: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionInput {
    pub id: Option<String>,
    pub name: String,
    pub engine: DatabaseEngine,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub database: String,
    pub ssl: bool,
    pub color: Option<String>,
    pub group: Option<String>,
    pub tags: Vec<String>,
    pub favorite: bool,
    pub auto_reconnect: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionSession {
    pub connection_id: String,
    pub name: String,
    pub engine: DatabaseEngine,
    pub connected_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestConnectionResult {
    pub ok: bool,
    pub latency_ms: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryColumn {
    pub name: String,
    pub r#type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResult {
    pub columns: Vec<QueryColumn>,
    pub rows: Vec<Vec<Value>>,
    pub row_count: usize,
    pub affected: Option<u64>,
    pub duration_ms: u128,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    pub name: String,
    pub kind: String,
    pub rows: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnReference {
    pub table: String,
    pub column: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub r#type: String,
    pub nullable: bool,
    pub default: Option<String>,
    pub pk: bool,
    pub fk: Option<ColumnReference>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryHistoryEntry {
    pub id: String,
    pub connection_id: String,
    pub sql: String,
    pub ran_at: i64,
    pub duration_ms: u128,
    pub row_count: usize,
    pub ok: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionsPayload {
    pub connections: Vec<ConnectionSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabasesPayload {
    pub databases: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TablesPayload {
    pub tables: Vec<TableInfo>,
    pub procedures: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnsPayload {
    pub columns: Vec<ColumnInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryPayload {
    pub history: Vec<QueryHistoryEntry>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DesktopEvent<TPayload: Serialize> {
    pub r#type: String,
    pub payload: TPayload,
    pub ts: i64,
}

