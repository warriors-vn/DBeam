use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderConfig {
    pub id: String,
    pub label: String,
    pub local: bool,
    pub streaming: bool,
}

pub fn default_ai_providers() -> Vec<AiProviderConfig> {
    vec![
        AiProviderConfig {
            id: "openai".to_string(),
            label: "OpenAI".to_string(),
            local: false,
            streaming: true,
        },
        AiProviderConfig {
            id: "claude".to_string(),
            label: "Claude".to_string(),
            local: false,
            streaming: true,
        },
        AiProviderConfig {
            id: "ollama".to_string(),
            label: "Ollama".to_string(),
            local: true,
            streaming: true,
        },
    ]
}

