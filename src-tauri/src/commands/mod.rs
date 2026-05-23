use anyhow::{anyhow, Result};
use serde_json::json;
use std::path::PathBuf;
use std::time::Instant;
use tauri::{AppHandle, State, WebviewUrl, WebviewWindowBuilder};
use uuid::Uuid;

use crate::db::mysql;
use crate::models::{
    ColumnInfo, ColumnsPayload, ConnectionDetails, ConnectionInput, ConnectionSession, ConnectionsPayload,
    DatabasesPayload, HistoryPayload, QueryHistoryEntry, QueryResult, RuntimeHealth, TablesPayload,
    TestConnectionResult,
};
use crate::security::keychain;
use crate::state::{ActiveConnection, AppState};
use crate::utils::{emit_event, export_query_result as write_export, now_ts};

pub type CommandResult<T> = std::result::Result<T, String>;

#[tauri::command]
pub async fn desktop_health(state: State<'_, AppState>) -> CommandResult<RuntimeHealth> {
    Ok(RuntimeHealth {
        ok: true,
        name: "dbeam-desktop".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        platform: std::env::consts::OS.to_string(),
        native: true,
        uptime_sec: state.uptime_sec(),
    })
}

#[tauri::command]
pub async fn list_connections(state: State<'_, AppState>) -> CommandResult<ConnectionsPayload> {
    Ok(ConnectionsPayload {
        connections: state.store.list_connections().await.map_err(map_error)?,
    })
}

#[tauri::command]
pub async fn get_connection(id: String, state: State<'_, AppState>) -> CommandResult<ConnectionDetails> {
    let summary = state
        .store
        .get_connection(&id)
        .await
        .map_err(map_error)?
        .ok_or_else(|| format!("connection not found: {id}"))?;

    let password = keychain::get_password(&id).map_err(map_error)?;
    Ok(ConnectionDetails { summary, password })
}

#[tauri::command]
pub async fn save_connection(input: ConnectionInput, state: State<'_, AppState>) -> CommandResult<crate::models::ConnectionSummary> {
    let saved = state.store.upsert_connection(&input).await.map_err(map_error)?;
    keychain::set_password(&saved.id, &input.password).map_err(map_error)?;
    Ok(saved)
}

#[tauri::command]
pub async fn remove_connection(id: String, app: AppHandle, state: State<'_, AppState>) -> CommandResult<()> {
    if let Some(active) = state.remove_session(&id) {
        active.pool.close().await;
        emit_event(&app, "connection.closed", json!({ "connectionId": id }))
            .map_err(map_error)?;
    }

    state.store.remove_connection(&id).await.map_err(map_error)?;
    keychain::delete_password(&id).map_err(map_error)?;
    Ok(())
}

#[tauri::command]
pub async fn test_connection(input: ConnectionInput) -> CommandResult<TestConnectionResult> {
    let started = Instant::now();
    mysql::test_connection(&input).await.map_err(map_error)?;
    Ok(TestConnectionResult {
        ok: true,
        latency_ms: started.elapsed().as_millis(),
    })
}

#[tauri::command]
pub async fn connect_connection(id: String, app: AppHandle, state: State<'_, AppState>) -> CommandResult<ConnectionSession> {
    let summary = state
        .store
        .get_connection(&id)
        .await
        .map_err(map_error)?
        .ok_or_else(|| format!("connection not found: {id}"))?;

    let password = keychain::get_password(&id)
        .map_err(map_error)?
        .ok_or_else(|| format!("no password found for connection: {id}"))?;

    let details = ConnectionDetails {
        summary: summary.clone(),
        password: Some(password),
    };

    let pool = mysql::connect_pool(&details).await.map_err(map_error)?;
    state.store.touch_connection(&id).await.map_err(map_error)?;

    if let Some(previous) = state.insert_session(
        id.clone(),
        ActiveConnection {
            summary: summary.clone(),
            pool: pool.clone(),
        },
    ) {
        previous.pool.close().await;
    }

    let session = ConnectionSession {
        connection_id: id.clone(),
        name: summary.name.clone(),
        engine: summary.engine.clone(),
        connected_at: now_ts(),
    };

    emit_event(
        &app,
        "connection.opened",
        json!({
            "connectionId": session.connection_id,
            "name": session.name,
            "engine": summary.engine,
        }),
    )
    .map_err(map_error)?;

    Ok(session)
}

#[tauri::command]
pub async fn disconnect_connection(id: String, app: AppHandle, state: State<'_, AppState>) -> CommandResult<()> {
    if let Some(active) = state.remove_session(&id) {
        active.pool.close().await;
    }

    emit_event(&app, "connection.closed", json!({ "connectionId": id }))
        .map_err(map_error)?;
    Ok(())
}

#[tauri::command]
pub async fn list_databases(connection_id: String, state: State<'_, AppState>) -> CommandResult<DatabasesPayload> {
    let pool = get_pool(&state, &connection_id).map_err(map_error)?;
    Ok(DatabasesPayload {
        databases: mysql::list_databases(&pool).await.map_err(map_error)?,
    })
}

#[tauri::command]
pub async fn list_tables(
    connection_id: String,
    database: String,
    state: State<'_, AppState>,
) -> CommandResult<TablesPayload> {
    let pool = get_pool(&state, &connection_id).map_err(map_error)?;
    let (tables, procedures) = mysql::list_tables(&pool, &database).await.map_err(map_error)?;
    Ok(TablesPayload { tables, procedures })
}

#[tauri::command]
pub async fn list_columns(
    connection_id: String,
    database: String,
    table: String,
    state: State<'_, AppState>,
) -> CommandResult<ColumnsPayload> {
    let pool = get_pool(&state, &connection_id).map_err(map_error)?;
    let columns: Vec<ColumnInfo> = mysql::list_columns(&pool, &database, &table)
        .await
        .map_err(map_error)?;
    Ok(ColumnsPayload { columns })
}

#[tauri::command]
pub async fn execute_query(
    connection_id: String,
    sql: String,
    tab_id: Option<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> CommandResult<QueryResult> {
    let pool = get_pool(&state, &connection_id).map_err(map_error)?;
    let query_id = Uuid::new_v4().to_string();

    emit_event(
        &app,
        "query.started",
        json!({
            "id": query_id,
            "connectionId": connection_id,
            "tabId": tab_id,
            "sql": sql,
        }),
    )
    .map_err(map_error)?;

    match mysql::execute_query(&pool, &sql).await {
        Ok(result) => {
            state
                .store
                .add_history(QueryHistoryEntry {
                    id: query_id.clone(),
                    connection_id: connection_id.clone(),
                    sql: sql.clone(),
                    ran_at: now_ts(),
                    duration_ms: result.duration_ms,
                    row_count: result.row_count,
                    ok: true,
                })
                .await
                .map_err(map_error)?;

            emit_event(
                &app,
                "query.completed",
                json!({
                    "id": query_id,
                    "durationMs": result.duration_ms,
                    "rowCount": result.row_count,
                }),
            )
            .map_err(map_error)?;

            Ok(result)
        }
        Err(error) => {
            state
                .store
                .add_history(QueryHistoryEntry {
                    id: query_id.clone(),
                    connection_id,
                    sql,
                    ran_at: now_ts(),
                    duration_ms: 0,
                    row_count: 0,
                    ok: false,
                })
                .await
                .map_err(map_error)?;

            emit_event(
                &app,
                "query.failed",
                json!({
                    "id": query_id,
                    "message": error.to_string(),
                }),
            )
            .map_err(map_error)?;

            Err(map_error(error))
        }
    }
}

#[tauri::command]
pub async fn list_query_history(
    connection_id: Option<String>,
    state: State<'_, AppState>,
) -> CommandResult<HistoryPayload> {
    Ok(HistoryPayload {
        history: state
            .store
            .history(connection_id.as_deref())
            .await
            .map_err(map_error)?,
    })
}

#[tauri::command]
pub async fn export_query_result(
    result: QueryResult,
    format: String,
    path: Option<String>,
) -> CommandResult<()> {
    let path = path.ok_or_else(|| "export path is required".to_string())?;
    write_export(&result, &format, PathBuf::from(path).as_path())
        .await
        .map_err(map_error)
}

#[tauri::command]
pub async fn open_query_window(app: AppHandle, sql: Option<String>) -> CommandResult<()> {
    let label = format!("query-{}", Uuid::new_v4());
    let route = match sql {
        Some(sql) if !sql.trim().is_empty() => format!("index.html?sql={}", urlencoding::encode(&sql)),
        _ => "index.html".to_string(),
    };

    let window = WebviewWindowBuilder::new(&app, label, WebviewUrl::App(route.into()))
        .title("DBeam Query")
        .inner_size(1240.0, 820.0)
        .min_inner_size(960.0, 640.0)
        .decorations(false)
        .transparent(true)
        .build()
        .map_err(map_error)?;

    window.show().map_err(map_error)?;
    Ok(())
}

fn get_pool(state: &AppState, connection_id: &str) -> Result<sqlx::mysql::MySqlPool> {
    state
        .get_session(connection_id)
        .map(|active| active.pool)
        .ok_or_else(|| anyhow!("no active native session for connection: {connection_id}"))
}

fn map_error(error: impl Into<anyhow::Error>) -> String {
    let error = error.into();
    format!("{error:#}")
}


