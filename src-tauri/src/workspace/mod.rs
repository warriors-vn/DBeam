use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceCatalogMeta {
    pub version: u32,
    pub storage: String,
    pub collaborative_ready: bool,
}

pub fn workspace_catalog_meta() -> WorkspaceCatalogMeta {
    WorkspaceCatalogMeta {
        version: 1,
        storage: "sqlite-ready".to_string(),
        collaborative_ready: true,
    }
}

