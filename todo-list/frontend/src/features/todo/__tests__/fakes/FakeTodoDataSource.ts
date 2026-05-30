import type { TodoDto } from "../../data/TodoDto";

export class FakeTodoDataSource {
  private store = new Map<string, TodoDto>();
  private callCounts = {
    fetchTodos: 0,
    createTodo: 0,
    completeTodo: 0,
    deleteTodo: 0,
  };

  async fetchTodos(): Promise<TodoDto[]> {
    this.callCounts.fetchTodos++;
    return Array.from(this.store.values()).map((dto) => structuredClone(dto));
  }

  async createTodo(payload: { title: string }): Promise<TodoDto> {
    this.callCounts.createTodo++;
    const dto: TodoDto = {
      id: `auto-${this.callCounts.createTodo}`,
      title: payload.title,
      completed: false,
      created_at: "2026-05-28T00:00:00.000Z",
    };
    this.store.set(dto.id, dto);
    return structuredClone(dto);
  }

  async completeTodo(id: string, _payload: { completed: boolean }): Promise<TodoDto> {
    this.callCounts.completeTodo++;
    const existing = this.store.get(id);
    if (!existing) {
      const err = new Error("Not found") as Error & { status: number };
      err.status = 404;
      throw err;
    }
    const updated: TodoDto = { ...existing, completed: true };
    this.store.set(id, updated);
    return structuredClone(updated);
  }

  async deleteTodo(id: string): Promise<void> {
    this.callCounts.deleteTodo++;
    if (!this.store.has(id)) {
      const err = new Error("Not found") as Error & { status: number };
      err.status = 404;
      throw err;
    }
    this.store.delete(id);
  }

  seed(dtos: TodoDto[]): this {
    for (const dto of dtos) {
      this.store.set(dto.id, structuredClone(dto));
    }
    return this;
  }

  clear(): this {
    this.store.clear();
    this.callCounts = {
      fetchTodos: 0,
      createTodo: 0,
      completeTodo: 0,
      deleteTodo: 0,
    };
    return this;
  }

  getCallCount(method: keyof FakeTodoDataSource["callCounts"]): number {
    return this.callCounts[method];
  }
}