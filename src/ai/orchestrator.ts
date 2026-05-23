import { mockAiProvider } from "./mock-provider";
import type { AiPromptRequest, AiProvider } from "./providers";

const providers: Record<string, AiProvider> = {
  [mockAiProvider.id]: mockAiProvider,
};

export function getAiProvider(providerId: string): AiProvider {
  return providers[providerId] ?? mockAiProvider;
}

export function streamAiReply(providerId: string, request: AiPromptRequest) {
  return getAiProvider(providerId).stream(request);
}
