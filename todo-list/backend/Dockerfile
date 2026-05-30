FROM rust:1-slim

RUN cargo install cargo-watch

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
RUN mkdir -p src migrations && \
    echo "fn main() {}" > src/main.rs && \
    echo "-- placeholder" > migrations/001_create_todos.sql && \
    cargo fetch

COPY . .

ENV BIND_ADDRESS=0.0.0.0:3000

CMD ["cargo", "watch", "-x", "run"]
