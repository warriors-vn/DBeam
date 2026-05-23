use parking_lot::RwLock;
use sqlx::mysql::MySqlPool;
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::Instant;

use crate::models::ConnectionSummary;
use crate::services::store::DesktopStore;

#[derive(Clone)]
pub struct ActiveConnection {
    pub summary: ConnectionSummary,
    pub pool: MySqlPool,
}

pub struct AppState {
    started_at: Instant,
    pub store: DesktopStore,
    sessions: RwLock<HashMap<String, ActiveConnection>>,
}

impl AppState {
    pub fn new(app_data_dir: PathBuf) -> Self {
        Self {
            started_at: Instant::now(),
            store: DesktopStore::new(app_data_dir.join("desktop-store.json")),
            sessions: RwLock::new(HashMap::new()),
        }
    }

    pub fn uptime_sec(&self) -> u64 {
        self.started_at.elapsed().as_secs()
    }

    pub fn get_session(&self, connection_id: &str) -> Option<ActiveConnection> {
        self.sessions.read().get(connection_id).cloned()
    }

    pub fn insert_session(&self, connection_id: String, connection: ActiveConnection) -> Option<ActiveConnection> {
        self.sessions.write().insert(connection_id, connection)
    }

    pub fn remove_session(&self, connection_id: &str) -> Option<ActiveConnection> {
        self.sessions.write().remove(connection_id)
    }
}

