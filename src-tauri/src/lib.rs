pub mod ai;
pub mod commands;
pub mod db;
pub mod models;
pub mod plugins;
pub mod security;
pub mod services;
pub mod state;
pub mod telemetry;
pub mod utils;
pub mod workspace;

use tauri::Manager;

use crate::commands::{
    connect_connection, desktop_health, disconnect_connection, execute_query, export_query_result,
    get_connection, list_columns, list_connections, list_databases, list_query_history,
    list_tables, open_query_window, remove_connection, save_connection, test_connection,
};
use crate::state::AppState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            app.manage(AppState::new(app_data_dir));

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            desktop_health,
            list_connections,
            get_connection,
            save_connection,
            remove_connection,
            test_connection,
            connect_connection,
            disconnect_connection,
            list_databases,
            list_tables,
            list_columns,
            execute_query,
            list_query_history,
            export_query_result,
            open_query_window,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run DBeam desktop runtime");
}

