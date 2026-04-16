---
type: community
cohesion: 0.40
members: 5
---

# Main Application Server

**Cohesion:** 0.40 - moderately connected
**Members:** 5 nodes

## Members
- [[AppState]] - code - backend/src/main.rs
- [[health()]] - code - backend/src/main.rs
- [[main()]] - code - src-tauri/src/main.rs
- [[main.rs]] - code - backend/src/main.rs
- [[main.rs_1]] - code - src-tauri/src/main.rs

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Main_Application_Server
SORT file.name ASC
```
