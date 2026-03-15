CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE diagrams (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name             VARCHAR(255) NOT NULL,
    description      TEXT,
    viewport         JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
    active_provider  VARCHAR(10),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE nodes (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagram_id        UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
    node_type         JSONB NOT NULL,
    label             VARCHAR(255) NOT NULL,
    position_x        DOUBLE PRECISION NOT NULL,
    position_y        DOUBLE PRECISION NOT NULL,
    width             DOUBLE PRECISION NOT NULL DEFAULT 120,
    height            DOUBLE PRECISION NOT NULL DEFAULT 80,
    properties        JSONB NOT NULL DEFAULT '{}',
    parent_id         UUID REFERENCES nodes(id) ON DELETE SET NULL,
    provider_mappings JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE edges (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagram_id  UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
    source_id   UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_id   UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    edge_type   VARCHAR(50) NOT NULL DEFAULT 'Synchronous',
    label       VARCHAR(255),
    properties  JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nodes_diagram_id ON nodes(diagram_id);
CREATE INDEX idx_edges_diagram_id ON edges(diagram_id);
CREATE INDEX idx_edges_source_id ON edges(source_id);
CREATE INDEX idx_edges_target_id ON edges(target_id);
CREATE INDEX idx_nodes_parent_id ON nodes(parent_id);
