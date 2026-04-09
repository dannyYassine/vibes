# RagVerse — UI Component Specifications

## Navbar

- Height: 56px, white background, 1px bottom border (#E5E7EB)
- Left: App name "RagVerse" in 600 weight, primary color
- Center: Nav links — "Documents" | "Chat" (active state: primary color underline)
- Right: Username display + logout icon button

## Login / Register Pages

- Centered card (400px max-width), white surface, subtle border
- Form fields: Angular Material `mat-form-field` with outline appearance
- Primary button: filled, full width
- Link to alternate page below the form
- Minimal — no illustrations, no extra text

## Documents Page

### Upload Section

- **File Upload Zone**
  - Dashed 2px border (#E5E7EB), rounded corners (12px)
  - Height: 180px, centered content
  - Icon: upload cloud icon (Material Icons)
  - Text: "Drop files here or click to browse"
  - Subtext: "PDF, DOCX, TXT, CSV, HTML, MD"
  - Hover/dragover: border color changes to primary, light purple background
  - After file selected: show file name + size + remove button

- **Website Index Section**
  - Below upload zone (or as a tab)
  - URL input field + crawl depth dropdown (1, 2, 3) + "Index" button
  - Optional title field

- **Chunk Config** (shared by both upload and website)
  - Toggle: "Auto" (default) | "Custom"
  - Custom reveals: chunk size input, overlap input, strategy dropdown
  - Compact layout, inline with upload zone

### Document List

- `mat-table` or clean custom table
- Columns: Title | Type | Status | Chunks | Date | Actions
- Type: file type icon or chip
- Status: colored chip (DocumentStatusComponent)
- Actions: delete icon button with confirm dialog
- Empty state: "No documents yet. Upload files or index websites to get started."

## Chat Page — 3 Column Layout

### Left: Conversation List (260px)

- Header: "Conversations" + "New" icon button
- List items: conversation title + relative time
- Active item: primary color left border + light background
- Hover: subtle background
- Right-click or menu button: rename, delete
- Scrollable, sorted by most recent

### Center: Chat Area (flex-grow)

#### Empty State

- Vertically centered content
- Greeting: "Hi there, **{username}**" (24px, 600 weight)
- Subtitle: "What would you like to know?" (16px, secondary text)
- 4 prompt suggestion cards in a row
  - Each card: white surface, border, rounded (8px), padding 16px
  - Icon + short text (e.g., "Summarize my documents")
  - Hover: subtle shadow or border color change
  - Click: sends as message
- Input bar centered below

#### Message List

- Scrollable area, padding 24px
- **User messages**: right-aligned, primary background (light purple #F3F0FF), dark text, rounded (12px), max-width 70%
- **Assistant messages**: left-aligned, light grey background (#F9FAFB), dark text, rounded (12px), max-width 70%
  - Markdown rendered (headings, lists, code blocks, bold, italic)
  - Inline citations: `[1]` rendered as small purple chips
    - Click: expands to show source preview below the citation
  - Streaming: tokens appear with a subtle cursor/blinking indicator

#### Input Bar

- Fixed at bottom of chat area, 16px padding
- White surface, 1px border, rounded (24px full-round)
- Text area (auto-grow, max 4 lines)
- Send button: primary color circle, right side
- Placeholder: "Ask anything about your documents..."
- Keyboard: Enter to send, Shift+Enter for newline
- Disabled state while streaming (with stop button option)

### Right: Source Panel (320px, collapsible)

- Toggle button in the chat area header (icon: sidebar/panel icon)
- Header: "Sources" with close button
- List of source cards for the selected assistant message
- Each card:
  - Document title (bold, truncated)
  - Relevance score as percentage badge
  - Content preview (3-4 lines, truncated)
  - Metadata: page number, source URL if website
  - Click: expand to full chunk content
- Empty state: "Select a message to view sources"
- Smooth slide-in/out animation (200ms)

## Shared Components

### Loading Spinner

- Angular Material `mat-spinner` (indeterminate), small (24px)
- Used inline in buttons, status indicators

### Confirm Dialog

- Angular Material `mat-dialog`
- Title + message + Cancel/Confirm buttons
- Used for delete actions (documents, conversations)

### Status Chip (DocumentStatusComponent)

- `mat-chip` variant
- Colors: pending=#9CA3AF, processing=#F59E0B (with pulse animation), completed=#22C55E, failed=#EF4444
- Icon + text label

## Responsive Behavior

- **< 1024px**: Source panel hidden by default (toggle opens as overlay)
- **< 768px**: Conversation sidebar becomes a drawer (hamburger toggle)
- **< 480px**: Full-width message bubbles, smaller prompt cards stack vertically
