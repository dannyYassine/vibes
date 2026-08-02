# OKF Format Specification (v0.1 + v0.2)

Reference: https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md

## Bundle Structure

```
path/to/.okf/
  index.md              # Bundle root. MAY carry okf_version in frontmatter.
  log.md                # Update history. Reverse-chronological ## YYYY-MM-DD entries.
  <section>/            # Concept group (archictecture, features, shared, requirements).
    index.md            # Directory listing. NO frontmatter.
    <concept>.md        # Leaf document. MUST have YAML frontmatter with non-empty type.
```

## Reserved Filenames

| Filename | Purpose | Frontmatter |
|---|---|---|
| `index.md` | Directory listing, progressive disclosure | NOT allowed (except bundle root MAY carry `okf_version`) |
| `log.md` | Update history | NOT allowed |

## Frontmatter Fields — Required

| Field | Always? | Type | Description |
|---|---|---|---|
| `okf_version` | bundle-root index.md only | string | e.g. "0.1" or "0.2" |
| `type` | Every leaf .md | string | Concept classifier. Not registered centrally. |

## Frontmatter Fields — Recommended (v0.1)

| Field | Type | Description |
|---|---|---|
| `title` | string | Human-readable display name |
| `description` | string | One-sentence summary |
| `tags` | list | Lowercase, hyphenated, YAML list `[tag1, tag2]` |
| `timestamp` | ISO 8601 | When doc was created/updated. Format: `YYYY-MM-DDTHH:MM:SSZ` |
| `modules` | list | Feature module directory names under `modules/` that this doc narrates (e.g. `chat`). Required on code-narrating docs. |

## Frontmatter Fields — Extended (v0.2)

| Field | Type | Description |
|---|---|---|
| `generated` | `{ by: <actor>, at: <ISO 8601> }` | Who wrote this and when. Supersedes `timestamp`. |
| `verified` | `[{ by: <actor>, at: <ISO 8601> }]` | Who confirmed content against sources. |
| `status` | `draft | stable | deprecated` | Lifecycle stage. Default: stable. |
| `stale_after` | `YYYY-MM-DD` | Absolute expiry date. |
| `sources` | `[{ id, resource, title, ... }]` | Materials the concept derives from. |

### Actor Convention

| Format | Example |
|---|---|
| `<producer>/<version>` | `okf-updater/v1`, `reference_agent/gemini-2.5-pro` |
| `human:<id>` | `human:ahormati` |
| `process:<id>` | `process:finance-nightly` |

## Cross-Reference Links

- Bundle-relative (recommended): `/section/file.md`
- Relative: `./sibling.md` or `../other.md`
- Broken links tolerated (may represent not-yet-written knowledge)

## Index Files

No frontmatter. Markdown body with section headings and bullet links:

```
# Section Title
* [Concept](concept.md) — description from frontmatter
```

## Log Files

No frontmatter. Reverse-chronological date entries:

```
## YYYY-MM-DD
* **Update**: path — reason
```

## Tags

Lowercase, hyphenated. In YAML list syntax:

```yaml
tags: [architecture, domain, usecase, api, job, external-comm, reference, requirement, feature]
```

## Observed Project-Specific Conventions

| Convention | Rule |
|---|---|
| File extension | `.md` only |
| Filename case | `kebab-case.md` |
| Frontmatter field order | `type`, `title`, `description`, `tags`, `timestamp`, `modules`, then optional v0.2 fields |
| Timestamp format | `YYYY-MM-DDTHH:MM:SSZ` (ISO 8601, UTC) |
| Cross-references within feature dir | Relative `[doc](doc.md)` |
| Cross-references across boundaries | Bundle-relative `/section/file.md` |
| Section structure | Requirements → Features (with internal docs) → Shared → Architecture |