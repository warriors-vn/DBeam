use anyhow::{anyhow, Result};
use serde::Serialize;
use serde_json::Value;
use std::path::Path;
use tauri::{AppHandle, Emitter};
use tokio::fs;

use crate::models::{DesktopEvent, QueryResult};

pub fn now_ts() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}

pub fn emit_event<T>(app: &AppHandle, kind: &str, payload: T) -> Result<()>
where
    T: Serialize,
{
    app.emit(
        "desktop://event",
        DesktopEvent {
            r#type: kind.to_string(),
            payload,
            ts: now_ts(),
        },
    )?;

    Ok(())
}

pub async fn export_query_result(result: &QueryResult, format: &str, path: &Path) -> Result<()> {
    let body = match format {
        "json" => serde_json::to_string_pretty(result)?,
        "csv" => {
            let header = result
                .columns
                .iter()
                .map(|column| escape_csv(&column.name))
                .collect::<Vec<_>>()
                .join(",");

            let rows = result
                .rows
                .iter()
                .map(|row| row.iter().map(value_to_csv).collect::<Vec<_>>().join(","))
                .collect::<Vec<_>>()
                .join("\n");

            if rows.is_empty() {
                header
            } else {
                format!("{header}\n{rows}")
            }
        }
        other => return Err(anyhow!("unsupported export format: {other}")),
    };

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await?;
    }

    fs::write(path, body).await?;
    Ok(())
}

fn value_to_csv(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::String(inner) => escape_csv(inner),
        Value::Bool(inner) => escape_csv(&inner.to_string()),
        Value::Number(inner) => escape_csv(&inner.to_string()),
        Value::Array(_) | Value::Object(_) => escape_csv(&value.to_string()),
    }
}

fn escape_csv(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

