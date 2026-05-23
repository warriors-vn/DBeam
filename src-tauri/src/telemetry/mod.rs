use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TelemetryConfig {
    pub slow_query_threshold_ms: u64,
    pub retain_events: usize,
}

pub fn default_telemetry_config() -> TelemetryConfig {
    TelemetryConfig {
        slow_query_threshold_ms: 1_200,
        retain_events: 1_000,
    }
}

