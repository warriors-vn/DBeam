import type { AiAction, AiContextSnapshot, AiProviderId } from "@/types/desktop";

export interface AiPromptRequest {
  prompt: string;
  context: AiContextSnapshot;
}

export interface AiStreamChunk {
  type: "delta" | "actions" | "done";
  content?: string;
  actions?: AiAction[];
}

export interface AiProvider {
  id: AiProviderId;
  label: string;
  stream(request: AiPromptRequest): AsyncGenerator<AiStreamChunk, void, void>;
}
