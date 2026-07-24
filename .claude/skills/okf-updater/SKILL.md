---
name: okf-updater
description: >
  Auto-updates .okf/ knowledge docs after codebase changes.
  Maps code changes to feature directories, shared models, or architecture docs.
  Regenerates YAML frontmatter + body per OKF format spec.
  Trigger: "update okf", "sync .okf", "refresh docs", "okf sync", after code edit.
---

## Trigger

Invoke when:
- User says "update okf", "sync .okf", "refresh docs", "okf sync"
- Model detects codebase change and user confirms "Update .okf docs?"

## Detection Map

### Code Path → .okf/ Target

| Source path pattern | .okf/ target | Scope |
|---|---|---|
| `online_budget/usecases/\<feature\>/*.py` | `features/\<feature\>/use-case.md` | Feature-local |
| `online_budget/interfaces/api/\<feature\>/*.py` | `features/\<feature\>/endpoint.md` | Feature-local |
| `online_budget/interfaces/jobs/*.py` | `features/\<feature\>/job.md` | Feature-local |
| `online_budget/events/*.py` | `features/\<feature\>/external-communications.md` | Feature-local |
| `online_budget/emails/*.py` | `features/\<feature\>/external-communications.md` | Feature-local |
| `online_budget/notifications/*.py` | `features/\<feature\>/external-communications.md` | Feature-local |
| `online_budget/domain/*.py` | `shared/data-models/\<entity\>.md` | Cross-feature |
| `online_budget/services/**/*.py` | `shared/references/\<service\>.md` | Cross-feature |
| `online_budget/infrastructure/**/*.py` | `shared/references/\<impl\>.md` | Cross-feature |
| `opencode.json`, `pyproject.toml`, `docker-compose.yml`, `Makefile` | `architecture/\<layer\>.md` | Project-level |
| Unmatched path | Run Novel Pattern Protocol (see below) | — |

### Feature Heuristic

Resolve feature name from file path using substring matching:

| Path contains | Feature directory |
|---|---|
| `sync`, `rbc`, `scraper` | `transaction-sync` |
| `categoriz`, `ml`, `classify` | `categorization-engine` |
| `review`, `approve`, `queue` | `review-queue` |
| `dashboard`, `report`, `summary` | `dashboard-reports` |
| Unmatched | Infer from code structure (see Novel Pattern Protocol) |

### Novel Pattern Protocol

When a changed file does not match any existing Detection Map pattern, do not skip it. Instead:

1. **Read the file** — understand its code structure: imports, class hierarchy, decorators, method signatures, docstrings
2. **Classify by code patterns**:

| If code looks like | .okf/ type | Template |
|---|---|---|
| Has `execute(dto)` or similar run method, calls ports/repos | Use Case | `use-case.md` |
| Has HTTP method handler (`get`, `post`, `put`, `delete`), extends Django `View` | API Endpoint | `endpoint.md` |
| Has `@schedule`, `@cron`, `async_task`, Q2 schedule registration | Job | `job.md` |
| Has event class, `send_email`, `dispatch`, webhook handler | External Communication | `external-communication.md` |
| Has dataclass, `@dataclass`, Django `Model`, Pydantic model, typed fields | Domain Entity | `data-model.md` |
| Has abstract/ABC class, wraps external API, integrates 3rd-party service | Reference | `reference.md` |
| Registers routes, config, DI wiring, Docker/CI config | Architecture | `architecture.md` |
| None of the above cleanly match | Reference (most generic type) | `reference.md` |

3. **Determine feature membership**: Look at sibling files in the same directory. If siblings match a known feature, join it. If the directory has no known siblings, it may be a new feature.

4. **For a new feature**: Create `features/<new-feature>/` dir with `index.md` + appropriate child docs based on what files exist. Check if a new requirement doc is needed. Ask user for feature name if unclear.

5. **Extend the map**: Add a new row to the Detection Map section in this SKILL.md so future runs match automatically. Format:
   ```
   | `<path pattern>` | `<target pattern>` | `Feature-local` |
   ```
   Place the new row in the correct scope group (feature-local, shared, architecture).

## Workflow

### Step 1: Detect Changes

```
git diff HEAD --name-only
```

Filter to files under `online_budget/`, `opencode.json`, `pyproject.toml`, etc.

### Step 2: Map to .okf/ Targets

For each changed file:
1. Match path against Detection Map patterns
2. If matched → resolve feature name via Feature Heuristic
3. If unmatched → run Novel Pattern Protocol (classify, feature, extend map)
4. Collect set of .okf/ files to update
5. Separate into: feature-local, shared, architecture

### Step 3: Read Existing .okf/ Doc (if present)

Read current file. Preserve:
- Existing YAML frontmatter values (update `timestamp` to now)
- Existing body content as base, merge new code-derived data
- Existing cross-references (add new ones, keep old)

If doc doesn't exist: generate from template.

### Step 4: Generate Doc Body

Per-type rules below. Read source code for: class/function signatures, fields, docstrings, routes, dependencies.

### Step 5: Update Parent Index Files

- New feature dir → add link in `features/index.md`
- New shared model → add link in `shared/data-models/index.md`
- New requirement → add link in `requirements/index.md`
- Architecture change → verify `architecture/index.md` links

### Step 6: Update log.md

Format:
```
## YYYY-MM-DD

### Step {N}: {description}

* **Created**: {path} — {reason}
* **Updated**: {path} — {reason}
* **Deleted**: {path} — {reason}
```

### Step 7: Validate

Run validation checks (see Validation section below).

## Per-Type Rules

### 1. Architecture Doc

```
---
type: Architecture
title: {Layer Name}
description: {from docstring or purpose}
tags: [architecture, {layer-name}]
timestamp: {now}
---

# {Title}

## Location
{source dir path relative to project root}

## Dependency Rule
{what this layer may import / depends on}

## Sub-packages
{bullet list of subdirectories and key files}

## Key Design Decisions
{from docstrings, comments, or PR descriptions}
```

### 2. Requirement Doc

```
---
type: Requirement
title: {ShortName}
description: {one-line user-facing need}
tags: [requirement, {domain}]
timestamp: {now}
---

# {Title}

## Description
{full requirement statement}

## Acceptance Criteria
{numbered list of pass/fail conditions}

## Priority
{critical | high | medium | low}

## Stakeholder
{who requested this}

## Features
- [{Feature Name}](/features/{feature-dir}/index.md)
```

### 3. Feature Index Doc

```
---
type: Feature
title: {FeatureName}
description: {one-line feature purpose}
tags: [feature, {domain}]
timestamp: {now}
---

# {Title}

## Fulfills Requirements
- [{Requirement Name}](/requirements/{requirement}.md)

## Contents
- [Use Case](use-case.md)
- [Endpoint](endpoint.md)  (if exists)
- [Job](job.md)  (if exists)
- [External Communications](external-communications.md)  (if exists)

## Shared Models Used
- [{Model}](/shared/data-models/{model}.md)

## References
- [{Ref}](/shared/references/{ref}.md)
```

### 4. Use Case Doc

```
---
type: Use Case
title: {UseCaseName}
description: {from class docstring or module docstring}
tags: [usecase, {domain}]
timestamp: {now}
---

# {Title}

## Input
{input DTO class, fields}

## Flow
{numbered steps from execute() method or similar}

## Output
{result type / return value}

## Data Models
- [{Model}](/shared/data-models/{model}.md)

## See Also
- [{Other Feature}](/features/{feature-dir}/index.md) (chained features)
```

### 5. Endpoint Doc

```
---
type: API Endpoint
title: {EndpointName}
description: {from view docstring}
tags: [api, {resource}]
timestamp: {now}
---

# {Title}

## Route
{HTTP_METHOD} {/path} → {ViewClass}

## Auth
{auth mixins, decorators, or permission classes}

## Flow
{numbered steps from view method}

## Response
{response shape / status codes}

## Links
- [{Use Case}](../use-case.md)
```

### 6. Job Doc

```
---
type: Job
title: {JobName}
description: {from job docstring}
tags: [job, scheduler]
timestamp: {now}
---

# {Title}

## Source
{path to job class file}

## Schedule
{cron expression or interval}

## Functions
{bullet list of methods / tasks with descriptions}

## Error Handling
{retry policy, DLQ, alert behavior}

## Links
- [{Use Case}](../use-case.md)
- [{External Communications}](../external-communications.md)
```

### 7. External Communication Doc

```
---
type: External Communication
title: {CommunicationName}
description: {from class/docstring}
tags: [external-comm, {event|email|webhook|notification}]
timestamp: {now}
---

# {Title}

## Direction
{inbound | outbound | bidirectional}

## Trigger / Source
{what initiates this — event class, webhook endpoint, cron, user action}

## Schema / Payload
| Field | Type | Description |
|---|---|---|
{from dataclass/pydantic fields or email template vars}

## Handlers / Consumers
{list of listeners, subscribers, senders}

## Error / Retry
{retry policy, DLQ, fallback behavior}

## Links
- [{Use Case}](../use-case.md)
- [{Job}](../job.md)
```

### 8. Data Model Doc

```
---
type: Domain Entity
title: {EntityName}
description: {from class or module docstring}
tags: [domain, {entity-name}]
timestamp: {now}
---

# {Title}

## Fields
| Field | Type | Notes |
|---|---|---|
{from dataclass fields or Django model fields}

## Domain File
{path to Python file}

## ORM Schema
| Column | Type | Constraints |
|---|---|---|
{from Django model Meta / SQL schema}

## Used By
- [{Feature}](/features/{feature-dir}/index.md)
```

### 9. Reference Doc

```
---
type: Reference
title: {ServiceName}
description: {from module docstring}
tags: [reference, {service-name}]
timestamp: {now}
---

# {Title}

## Source
{path}

## Details
{flow / expected headers / key design / implementation details}

## Used By
- [{Feature}](/features/{feature-dir}/index.md)
```

## Link Conventions

- Feature-local docs link to siblings via relative path: `[Use Case](use-case.md)`
- Feature docs link upward to requirements: `/requirements/{req}.md`
- Feature docs link outward to shared: `/shared/data-models/{model}.md`
- Architecture docs link to features: `/features/{feature}/index.md`
- Shared docs link to features: `/features/{feature}/index.md`

Use bundle-relative paths starting with `/` for cross-boundary links (stable under move). Use relative `./` for sibling links inside same dir.

## Blast Radius Rules

| Change scope | Files to update | Cascade |
|---|---|---|
| Feature-local (use case, endpoint, job, event) | 1 doc in feature dir | No cascade outside feature |
| Shared data model | 1 doc in `shared/data-models/` | All feature index docs that reference it (update timestamp only) |
| Shared reference | 1 doc in `shared/references/` | Same as above |
| Architecture | 1 doc in `architecture/` | No cascade |
| New feature | New dir + all child docs + `features/index.md` | New requirement link if applicable |
| New pattern (unmatched file type) | Classify via Novel Pattern Protocol, create doc + extend Detection Map | Add pattern row to this SKILL.md |
| New requirement | 1 doc in `requirements/` + `requirements/index.md` | Feature index link |
| Deleted code | Mark doc `status: deprecated` + update `timestamp` | Flag for removal in log.md |

## GitHub SPEC Link

Full OKF specification (Google Knowledge Catalog):
https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md

Reference for conformance:
- Every non-index .md file MUST have parseable YAML frontmatter
- `type` field MUST be non-empty
- Cross-references MUST be bundle-relative paths
- Index files MUST NOT have frontmatter
- `log.md` uses reverse-chronological `## YYYY-MM-DD` headings

## v0.1 → v0.2 Field Mapping

| v0.1 | v0.2 replacement | Migration |
|---|---|---|
| `timestamp` | `generated: { by, at }` | Keep timestamp, add generated with `by: human:agent` or `by: okf-updater/v1` |
| (none) | `verified` | Optional, add when human confirms |
| (none) | `status` | Add `status: stable` as default |
| (none) | `stale_after` | Optional, add for time-sensitive docs |
| (none) | `sources` | Optional, add for externally-derived docs |

Current `okf_version: "0.1"` in `index.md` — upgrade to `"0.2"` when ready.

## Validation

After all writes, verify:

1. Every `.md` under `.okf/` except `index.md` and `log.md` has parseable YAML frontmatter
2. Every frontmatter has non-empty `type`
3. Every feature index links to its requirement (if declared)
4. Every shared model has at least one "Used By" link (or warn orphan)
5. Every cross-ref link resolves (file exists at path)
6. `log.md` has entry for this update
7. No stale docs for deleted code — if found, set `status: deprecated`