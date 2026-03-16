import { Injectable } from '@angular/core';
import { GenerateEvent } from '../../domain/interfaces/ai-provider.interface';

@Injectable({ providedIn: 'root' })
export class SseClient {
  async *post(url: string, body: unknown, signal?: AbortSignal): AsyncGenerator<GenerateEvent> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(`SSE request failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEventType = '';
    let currentData = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop()!; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentData = line.slice(5).trim();
          } else if (line === '') {
            // Blank line = end of event
            if (currentEventType && currentData) {
              try {
                const data = JSON.parse(currentData);
                yield { eventType: currentEventType, data };
              } catch {
                yield { eventType: currentEventType, data: currentData };
              }
            }
            currentEventType = '';
            currentData = '';
          }
        }
      }

      // Process any remaining buffered data
      if (currentEventType && currentData) {
        try {
          const data = JSON.parse(currentData);
          yield { eventType: currentEventType, data };
        } catch {
          yield { eventType: currentEventType, data: currentData };
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
