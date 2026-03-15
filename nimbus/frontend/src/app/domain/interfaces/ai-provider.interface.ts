export interface GenerateEvent {
  eventType: string;
  data: unknown;
}

export interface AiProvider {
  generate(prompt: string): AsyncIterable<GenerateEvent>;
  modify(diagramId: string, prompt: string, selectedNodeIds: string[]): AsyncIterable<GenerateEvent>;
}
