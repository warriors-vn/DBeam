use anyhow::{anyhow, Result};
use serde_json::Value;
use sqlx::mysql::{MySqlPool, MySqlPoolOptions, MySqlRow};
use sqlx::{Column, Row, TypeInfo, ValueRef};
use std::collections::HashMap;
use std::time::{Duration, Instant};

use crate::models::{
    ColumnInfo, ColumnReference, ConnectionDetails, ConnectionInput, QueryColumn, QueryResult, TableInfo,
};

pub async fn test_connection(input: &ConnectionInput) -> Result<()> {
    let pool = MySqlPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&connection_uri(
            &input.username,
            &input.password,
            &input.host,
            input.port,
            &input.database,
        ))
        .await?;

    sqlx::query("SELECT 1").execute(&pool).await?;
    pool.close().await;
    Ok(())
}

pub async fn connect_pool(connection: &ConnectionDetails) -> Result<MySqlPool> {
    Ok(MySqlPoolOptions::new()
        .max_connections(8)
        .min_connections(1)
        .acquire_timeout(Duration::from_secs(10))
        .idle_timeout(Duration::from_secs(60))
        .connect(&connection_uri(
            &connection.summary.username,
            connection.password.as_deref().unwrap_or_default(),
            &connection.summary.host,
            connection.summary.port,
            &connection.summary.database,
        ))
        .await?)
}

pub async fn list_databases(pool: &MySqlPool) -> Result<Vec<String>> {
    let rows = sqlx::query("SHOW DATABASES").fetch_all(pool).await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>(0).ok())
        .collect())
}

pub async fn list_tables(pool: &MySqlPool, database: &str) -> Result<(Vec<TableInfo>, Vec<String>)> {
    let table_rows = sqlx::query(
        r#"
        SELECT TABLE_NAME as name, TABLE_TYPE as kind, COALESCE(TABLE_ROWS, 0) as row_estimate
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME
        "#,
    )
    .bind(database)
    .fetch_all(pool)
    .await?;

    let procedure_rows = sqlx::query(
        r#"
        SELECT ROUTINE_NAME
        FROM information_schema.ROUTINES
        WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'
        ORDER BY ROUTINE_NAME
        "#,
    )
    .bind(database)
    .fetch_all(pool)
    .await?;

    let tables = table_rows
        .into_iter()
        .map(|row| TableInfo {
            name: row.try_get("name").unwrap_or_default(),
            kind: match row.try_get::<String, _>("kind").unwrap_or_default().as_str() {
                "VIEW" => "view".to_string(),
                _ => "table".to_string(),
            },
            rows: row.try_get::<i64, _>("row_estimate").unwrap_or_default().max(0) as u64,
        })
        .collect::<Vec<_>>();

    let procedures = procedure_rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>(0).ok())
        .collect::<Vec<_>>();

    Ok((tables, procedures))
}

pub async fn list_columns(pool: &MySqlPool, database: &str, table: &str) -> Result<Vec<ColumnInfo>> {
    let column_rows = sqlx::query(
        r#"
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
        "#,
    )
    .bind(database)
    .bind(table)
    .fetch_all(pool)
    .await?;

    let fk_rows = sqlx::query(
        r#"
        SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
        "#,
    )
    .bind(database)
    .bind(table)
    .fetch_all(pool)
    .await?;

    let fk_map = fk_rows
        .into_iter()
        .filter_map(|row| {
            let column_name = row.try_get::<String, _>("COLUMN_NAME").ok()?;
            let table = row.try_get::<String, _>("REFERENCED_TABLE_NAME").ok()?;
            let column = row.try_get::<String, _>("REFERENCED_COLUMN_NAME").ok()?;
            Some((column_name, ColumnReference { table, column }))
        })
        .collect::<HashMap<_, _>>();

    Ok(column_rows
        .into_iter()
        .map(|row| {
            let name = row.try_get::<String, _>("COLUMN_NAME").unwrap_or_default();
            ColumnInfo {
                name: name.clone(),
                r#type: row.try_get("COLUMN_TYPE").unwrap_or_default(),
                nullable: row
                    .try_get::<String, _>("IS_NULLABLE")
                    .map(|value| value == "YES")
                    .unwrap_or(false),
                default: row.try_get("COLUMN_DEFAULT").ok(),
                pk: row
                    .try_get::<String, _>("COLUMN_KEY")
                    .map(|value| value == "PRI")
                    .unwrap_or(false),
                fk: fk_map.get(&name).cloned(),
            }
        })
        .collect())
}

pub async fn execute_query(pool: &MySqlPool, sql: &str) -> Result<QueryResult> {
    let started = Instant::now();

    if returns_rows(sql) {
        let rows = sqlx::query(sql).fetch_all(pool).await?;
        let columns = rows
            .first()
            .map(|row| {
                row.columns()
                    .iter()
                    .map(|column| QueryColumn {
                        name: column.name().to_string(),
                        r#type: column.type_info().name().to_string(),
                    })
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();

        let values = rows
            .iter()
            .map(row_to_json)
            .collect::<Result<Vec<_>>>()?;

        return Ok(QueryResult {
            columns,
            row_count: values.len(),
            rows: values,
            affected: None,
            duration_ms: started.elapsed().as_millis(),
            message: None,
        });
    }

    let result = sqlx::query(sql).execute(pool).await?;
    Ok(QueryResult {
        columns: vec![],
        rows: vec![],
        row_count: 0,
        affected: Some(result.rows_affected()),
        duration_ms: started.elapsed().as_millis(),
        message: Some("OK".to_string()),
    })
}

fn row_to_json(row: &MySqlRow) -> Result<Vec<Value>> {
    row.columns()
        .iter()
        .enumerate()
        .map(|(index, column)| column_value(row, index, column.type_info().name()))
        .collect()
}

fn column_value(row: &MySqlRow, index: usize, type_name: &str) -> Result<Value> {
    let raw = row.try_get_raw(index)?;
    if raw.is_null() {
        return Ok(Value::Null);
    }

    let normalized = type_name.to_ascii_lowercase();

    if normalized.contains("int") {
        if let Ok(value) = row.try_get::<i64, _>(index) {
            return Ok(Value::from(value));
        }
        if let Ok(value) = row.try_get::<u64, _>(index) {
            return Ok(Value::from(value));
        }
    }

    if normalized.contains("float") || normalized.contains("double") || normalized.contains("decimal") {
        if let Ok(value) = row.try_get::<f64, _>(index) {
            return Ok(Value::from(value));
        }
    }

    if normalized == "bool" || normalized.contains("tinyint(1)") {
        if let Ok(value) = row.try_get::<bool, _>(index) {
            return Ok(Value::from(value));
        }
    }

    if normalized.contains("json") {
        if let Ok(value) = row.try_get::<String, _>(index) {
            return Ok(serde_json::from_str(&value).unwrap_or(Value::String(value)));
        }
    }

    if let Ok(value) = row.try_get::<String, _>(index) {
        return Ok(Value::String(value));
    }

    if let Ok(value) = row.try_get::<Vec<u8>, _>(index) {
        return Ok(Value::String(String::from_utf8_lossy(&value).to_string()));
    }

    Err(anyhow!("unsupported MySQL column type: {type_name}"))
}

fn returns_rows(sql: &str) -> bool {
    let normalized = sql.trim_start().to_ascii_lowercase();
    ["select", "show", "describe", "desc", "explain", "with"]
        .iter()
        .any(|prefix| normalized.starts_with(prefix))
}

fn connection_uri(username: &str, password: &str, host: &str, port: u16, database: &str) -> String {
    let auth = format!(
        "{}:{}",
        urlencoding::encode(username),
        urlencoding::encode(password)
    );

    if database.trim().is_empty() {
        format!("mysql://{auth}@{host}:{port}")
    } else {
        format!(
            "mysql://{auth}@{host}:{port}/{}",
            urlencoding::encode(database.trim())
        )
    }
}

