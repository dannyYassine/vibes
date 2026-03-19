# Nimbus

A cloud architecture design tool for building and visualizing infrastructure diagrams.

## Architecture

![Architecture Diagram](docs/architecture.png)

The application features an interactive canvas where users can design cloud infrastructure diagrams with support for:

- **Service Library** — drag-and-drop AWS components (Web API Server, SQS Queues, ECS Workers, RDS Databases, S3 Storage, ElastiCache)
- **Visual Connections** — define data flows between services with labeled edges (e.g., Tweet Events, User Queries, Cache Operations)
- **AI Assistant** — describe modifications in natural language and have the diagram updated automatically
- **Export Options** — export diagrams as PNG, JSON, Terraform, or Docker Compose
- **Validation** — validate architecture configurations

## Getting Started

### Prerequisites

- Node.js
- Docker (optional, for docker-compose setup)

### Running with Docker

```bash
docker-compose up
```

### Running Manually

**Backend:**

```bash
cd backend
npm install
npm start
```

**Frontend:**

```bash
cd frontend
npm install
npm start
```
