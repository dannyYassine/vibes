import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiFacade, ChatMessage } from '../../application/facades/ai.facade';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-container">
      <div class="chat-header">AI Assistant</div>
      <div class="messages">
        @for (msg of messages$ | async; track $index) {
          <div class="message" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
            <span class="role">{{ msg.role === 'user' ? 'You' : 'AI' }}</span>
            <span class="content">{{ msg.content }}</span>
          </div>
        }
        @if (loading$ | async) {
          <div class="message assistant">
            <span class="role">AI</span>
            <span class="content loading">Generating...</span>
          </div>
        }
      </div>
      <div class="input-area">
        <input
          type="text"
          [(ngModel)]="prompt"
          (keydown.enter)="onSubmit()"
          placeholder="Describe your architecture..."
          [disabled]="!!(loading$ | async)"
        />
        <button (click)="onSubmit()" [disabled]="!prompt.trim() || !!(loading$ | async)">
          Generate
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #1e1e2e;
      color: #cdd6f4;
      border-bottom: 1px solid #313244;
    }
    .chat-header {
      padding: 12px 16px;
      font-weight: 600;
      font-size: 14px;
      border-bottom: 1px solid #313244;
      color: #cba6f7;
    }
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .message {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
    }
    .message.user {
      background: #313244;
      align-self: flex-end;
      max-width: 85%;
    }
    .message.assistant {
      background: #181825;
      align-self: flex-start;
      max-width: 85%;
    }
    .role {
      font-size: 11px;
      font-weight: 600;
      color: #a6adc8;
    }
    .content {
      word-break: break-word;
    }
    .content.loading {
      color: #a6adc8;
      font-style: italic;
    }
    .input-area {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid #313244;
    }
    input {
      flex: 1;
      background: #313244;
      border: 1px solid #45475a;
      border-radius: 6px;
      padding: 8px 12px;
      color: #cdd6f4;
      font-size: 13px;
      outline: none;
    }
    input:focus {
      border-color: #cba6f7;
    }
    input::placeholder {
      color: #6c7086;
    }
    button {
      background: #cba6f7;
      color: #1e1e2e;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background: #b4befe;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
})
export class ChatComponent {
  prompt = '';
  messages$: Observable<ChatMessage[]>;
  loading$: Observable<boolean>;

  constructor(private aiFacade: AiFacade) {
    this.messages$ = this.aiFacade.messages$;
    this.loading$ = this.aiFacade.loading$;
  }

  onSubmit(): void {
    const prompt = this.prompt.trim();
    if (!prompt) return;
    this.prompt = '';
    this.aiFacade.generateDiagram(prompt);
  }
}
