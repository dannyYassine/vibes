# RagVerse — Features

## Page 1: Document Indexing

### File Upload
- Drag-and-drop zone + file browser button
- Supported formats: PDF, DOCX, TXT, CSV, HTML, Markdown, and other LangChain-supported types
- Show file name, size, and type after selection
- Multiple file upload support

### Website Indexing
- URL input field with validation
- Crawl depth selector (1–3 levels, default 1)
- Optional title field (auto-generated from page title if empty)

### Chunking Configuration
- **Auto mode** (default): RecursiveCharacterTextSplitter, chunk_size=1000, chunk_overlap=200
- **Custom mode**: Toggle to reveal settings
  - Chunk size (number input, 100–4000)
  - Chunk overlap (number input, 0–500)
  - Strategy selector: recursive, character, token

### Document List
- Table/list of all indexed documents
- Columns: title, type (file/website), status, chunk count, date
- Status indicators: pending (grey), processing (amber/animated), completed (green), failed (red)
- Delete action per document
- Click to view chunks (preview)

### Status & Progress
- Real-time status updates via polling
- Error messages displayed for failed indexing

---

## Page 2: Conversations

### Conversation Sidebar (Left)
- List of all conversations, sorted by most recent
- Create new conversation button
- Click to switch between conversations
- Delete conversation (with confirmation)
- Rename conversation (inline edit)

### Empty State (New Conversation)
- Greeting: "Hi there, [username]. What would you like to know?"
- 3–4 suggested prompt cards (contextual to indexed documents)
- Centered layout, inspired by inspo_1.png

### Chat View
- User messages: right-aligned bubbles
- Assistant messages: left-aligned, with markdown rendering
- Streaming: tokens appear as they arrive
- Auto-scroll to bottom on new messages
- Inline citations: `[1]`, `[2]` rendered as clickable chips
  - Click to expand: shows source chunk preview, document title, relevance score

### Source Panel (Right Sidebar)
- Collapsible panel (toggle button)
- Shows all source chunks used for the current/selected assistant message
- Each source card: document title, chunk preview, relevance score, metadata (page number, URL)
- Click source to see full chunk content

### Chat Input Bar
- Fixed at bottom of chat area
- Text input with send button
- Keyboard shortcut: Enter to send, Shift+Enter for newline

---

## Auth Pages

### Login
- Username + password fields
- Link to register page
- Error display for invalid credentials

### Register
- Username + email + password + confirm password
- Link to login page
- Validation feedback

---

## Navigation

- Top nav bar with app name "RagVerse"
- Two main nav items: "Documents" and "Chat"
- User menu (top right): username display, logout
