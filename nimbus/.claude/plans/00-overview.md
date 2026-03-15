# Nimbus — Product Overview

## Vision

Nimbus is an AI-powered system design tool. Users describe their architecture in natural language — whether it's a monolith, a distributed system, or a microservices architecture — and Nimbus generates an interactive visual diagram. Diagrams are **cloud-agnostic by default**, using generic architectural concepts (load balancer, compute, database, message queue, etc.). With one click, users can translate the entire diagram into provider-specific services for AWS, GCP, or Azure, and export the result as Terraform.

## Goals

1. **Natural language → architecture diagram**: Users describe any system design (monolith, distributed, microservices, event-driven, serverless) and get a visual diagram using generic, cloud-agnostic components.
2. **Cloud provider translation**: A single button translates generic components into concrete AWS, GCP, or Azure services (e.g., "Load Balancer" → ALB / Cloud Load Balancing / Azure LB).
3. **Interactive canvas**: Drag-drop nodes, draw connections, resize groups, snap-to-grid — a first-class diagramming experience.
4. **AI-assisted refinement**: Users can select components and ask the AI to modify, expand, or explain parts of the architecture.
5. **Terraform export**: Export the provider-specific diagram as Terraform HCL, ready to apply.
6. **System design education**: The AI explains trade-offs, suggests patterns, and helps users understand architectural decisions.

## User Stories

### MVP
- As a user, I can describe a system architecture in natural language and see a cloud-agnostic diagram generated.
- As a user, I can drag and reposition nodes on the canvas.
- As a user, I can add, remove, and edit nodes and connections manually.
- As a user, I can save and load diagrams.
- As a user, I can export the diagram as a PNG image.

### Post-MVP
- As a user, I can press a button to translate my generic diagram into AWS, GCP, or Azure-specific services.
- As a user, I can export the provider-specific diagram as Terraform HCL.
- As a user, I can select a subset of nodes and ask the AI to modify or expand them.
- As a user, I can switch between cloud providers and compare the mapped services.
- As a user, I can see cost estimates for the architecture per cloud provider.
- As a user, I can collaborate on diagrams in real-time with others.
- As a user, I can version my diagrams and compare changes.

## High-Level Summary

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| Frontend | Angular + TypeScript | Canvas UI, diagram interaction, state management |
| Backend | Rust (Axum) | API server, AI orchestration, persistence, business logic |
| AI | Claude API | Natural language → diagram, on-demand modifications, validation fixes |
| Storage | PostgreSQL | Diagrams, users, versions |
| Cache | Redis (optional) | Session management, rate limiting |

The system follows clean architecture on both frontend and backend. The Angular frontend communicates with the Rust backend via REST APIs. The backend handles AI integration, translating natural language into structured diagram data using **generic architectural components**. Cloud-specific translation and Terraform generation are separate domain services that map the generic model to provider-specific resources.
