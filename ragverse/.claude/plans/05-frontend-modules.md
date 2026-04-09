# RagVerse — Frontend Modules

> This file repurposes the mobile-modules slot for frontend Angular module documentation.

## Angular 19 Module Organization

RagVerse uses Angular 19 standalone components (no NgModules). Features are organized by domain and lazy-loaded via the router.

---

## Route Configuration

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', redirectTo: '/chat', pathMatch: 'full' },
  {
    path: 'auth',
    children: [
      { path: 'login', loadComponent: () => import('./presentation/pages/auth/login/login.component') },
      { path: 'register', loadComponent: () => import('./presentation/pages/auth/register/register.component') },
    ]
  },
  {
    path: '',
    canActivate: [authGuard],
    component: MainLayoutComponent,
    children: [
      { path: 'documents', loadComponent: () => import('./presentation/pages/documents/documents-page/documents-page.component') },
      { path: 'chat', loadComponent: () => import('./presentation/pages/chat/chat-page/chat-page.component') },
      { path: 'chat/:conversationId', loadComponent: () => import('./presentation/pages/chat/chat-page/chat-page.component') },
    ]
  },
  { path: '**', redirectTo: '/chat' }
];
```

---

## Feature Breakdown

### Auth Feature

| Component | Responsibility |
|-----------|---------------|
| LoginComponent | Login form, calls AuthFacade.login() |
| RegisterComponent | Registration form, calls AuthFacade.register() |

**Services:** AuthFacade, AuthStore, AuthApiService, AuthGuard, AuthInterceptor

### Documents Feature

| Component | Responsibility |
|-----------|---------------|
| DocumentsPageComponent | Container: orchestrates upload + list |
| DocumentUploadComponent | Drag-drop zone, file selection, triggers upload |
| WebsiteIndexFormComponent | URL input, depth selector, triggers website indexing |
| ChunkConfigComponent | Auto/custom toggle, chunk size/overlap/strategy inputs |
| DocumentListComponent | Table of documents with status, actions |
| DocumentStatusComponent | Status chip/badge with appropriate color |

**Services:** DocumentFacade, DocumentStore, DocumentApiService

### Chat Feature

| Component | Responsibility |
|-----------|---------------|
| ChatPageComponent | Container: sidebar + chat view + source panel |
| ConversationListComponent | Left sidebar: list conversations, create new, delete |
| ChatViewComponent | Main area: message list + auto-scroll |
| MessageBubbleComponent | Single message: user (right) or assistant (left) |
| ChatInputComponent | Bottom input bar: text area + send button |
| SourcePanelComponent | Right sidebar: source chunks for selected message |
| CitationComponent | Inline [n] citation chip, expandable |
| EmptyStateComponent | Greeting + suggested prompts for new conversations |

**Services:** ChatFacade, ChatStore, ConversationApiService, MessageApiService

---

## State Management (Signal-based Stores)

Each store is an injectable service using Angular signals:

```typescript
@Injectable({ providedIn: 'root' })
export class ChatStore {
  // State
  conversations = signal<Conversation[]>([]);
  activeConversation = signal<Conversation | null>(null);
  messages = signal<Message[]>([]);
  isStreaming = signal(false);
  streamingContent = signal('');

  // Computed
  sortedConversations = computed(() =>
    this.conversations().sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  );
}
```

Facades coordinate between stores and API services, keeping components thin.
