import { Todo } from "./Todo";
import type { TodoDataSource } from "../data/TodoDataSource";
import type { TodoDto } from "../data/TodoDto";

export class TodoNotFoundError extends Error {
  constructor(id: string) {
    super(`Todo ${id} not found`);
    this.name = "TodoNotFoundError";
  }
}

export class TodoRepository {
  constructor(private readonly dataSource: TodoDataSource) {}

  async findAll(): Promise<Todo[]> {
    const dtos = await this.dataSource.fetchTodos();
    return dtos.map((dto) => this.toEntity(dto));
  }

  async create(title: string): Promise<Todo> {
    const dto = await this.dataSource.createTodo({ title });
    return this.toEntity(dto);
  }

  async complete(id: string): Promise<Todo> {
    const dto = await this.dataSource.completeTodo(id, { completed: true });
    return this.toEntity(dto);
  }

  async delete(id: string): Promise<void> {
    await this.dataSource.deleteTodo(id);
  }

  private toEntity(dto: TodoDto): Todo {
    return new Todo({
      id: dto.id,
      title: dto.title,
      completed: dto.completed,
      createdAt: new Date(dto.created_at),
    });
  }
}