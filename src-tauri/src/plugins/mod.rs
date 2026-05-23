use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginDescriptor {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub hooks: Vec<String>,
}

pub fn default_plugins() -> Vec<PluginDescriptor> {
    vec![
        PluginDescriptor {
            id: "redis-viewer".to_string(),
            name: "Redis Viewer".to_string(),
            enabled: false,
            hooks: vec!["sidebar".to_string(), "command".to_string()],
        },
        PluginDescriptor {
            id: "telemetry-inspector".to_string(),
            name: "Telemetry Inspector".to_string(),
            enabled: true,
            hooks: vec!["telemetry".to_string(), "command".to_string()],
        },
    ]
}

